import fs from "node:fs/promises";
import path from "node:path";
import dns from "node:dns/promises";
import type { AgenticFrameworkDefinition, AgenticResult, JsonValue } from "@/lib/agentic/types";

class FrameworkHttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

type AuditInput = {
  domain: string;
  max_fetch_ms?: number;
  checks?: {
    well_known_mcp?: boolean;
    homepage_html?: boolean;
  };
};

type WellKnownResult = {
  attempted: boolean;
  url: string;
  status_code: number | null;
  is_json: boolean;
  parse_ok: boolean;
};

type HomepageResult = {
  attempted: boolean;
  url: string;
  status_code: number | null;
  matched_hints: string[];
};

type DirectoryEntrySummary = {
  exists: boolean;
  status?: string;
  confidence?: number;
  last_seen?: string;
};

type Assessment = {
  type: Array<"webmcp" | "mcp-server">;
  confidence: number;
  verification_status: "unverified" | "verified" | "revoked";
  summary: string;
};

const DEFAULT_MAX_FETCH_MS = 4500;
const MAX_MAX_FETCH_MS = 10000;
const MAX_BYTES_JSON = 64 * 1024;
const MAX_BYTES_HTML = 256 * 1024;

const HTML_HINTS = [
  "navigator.modelContext",
  "registerTool",
  "provideContext",
  "mcp-b",
  "react-webmcp",
];

function normalizeDomain(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const u = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes(".")) return null;
    if (host.length > 255) return null;
    if (!/^[a-z0-9.-]+$/.test(host)) return null;
    // Disallow IP-literals (avoid SSRF to numeric/private addresses).
    if (/^\\d{1,3}(?:\\.\\d{1,3}){3}$/.test(host)) return null;
    if (host.endsWith(".local")) return null;
    return host;
  } catch {
    return null;
  }
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  // Carrier-grade NAT
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::1") return true;
  if (v.startsWith("fe80:")) return true; // link-local
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique local (fc00::/7)
  return false;
}

async function withTimeout<T>(p: Promise<T>, ms: number, code: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(code)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

async function resolveAndBlockPrivate(host: string, timeoutMs: number): Promise<void> {
  const [v4, v6] = await withTimeout(
    Promise.allSettled([dns.resolve4(host), dns.resolve6(host)]),
    timeoutMs,
    "dns_timeout",
  );

  const ips: string[] = [];
  if (v4.status === "fulfilled") ips.push(...v4.value);
  if (v6.status === "fulfilled") ips.push(...v6.value);

  if (ips.length === 0) throw new Error("unresolvable");
  for (const ip of ips) {
    if (ip.includes(".")) {
      if (isPrivateIpv4(ip)) throw new Error("private_ip");
    } else {
      if (isPrivateIpv6(ip)) throw new Error("private_ip");
    }
  }
}

async function readUpTo(res: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) return { text: "", truncated: false };
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    const nextTotal = total + value.byteLength;
    if (nextTotal > maxBytes) {
      const slice = value.slice(0, Math.max(0, maxBytes - total));
      if (slice.byteLength > 0) chunks.push(slice);
      truncated = true;
      try {
        reader.cancel();
      } catch {
        // ignore
      }
      break;
    }
    chunks.push(value);
    total = nextTotal;
  }
  const buf = Buffer.concat(chunks.map((u) => Buffer.from(u)));
  return { text: buf.toString("utf8"), truncated };
}

async function fetchWithTimeout(url: string, timeoutMs: number, accept: string): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      headers: { Accept: accept, "User-Agent": "windrose-agent-audit" },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

function computeConfidence(wellKnownOk: boolean, modelContextHit: boolean, otherHits: boolean): number {
  let score = 0;
  if (wellKnownOk) score += 70;
  if (modelContextHit) score += 60;
  if (otherHits) score += 25;
  return Math.min(100, score);
}

function verificationStatus(wellKnownOk: boolean, modelContextHit: boolean): "verified" | "unverified" {
  return wellKnownOk || modelContextHit ? "verified" : "unverified";
}

async function loadDirectoryEntry(domain: string): Promise<DirectoryEntrySummary> {
  const filePath = path.join(process.cwd(), "data", "webmcp_directory.json");
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const json = JSON.parse(raw) as { items?: unknown[] };
    const items = Array.isArray(json.items) ? json.items : [];
    const item = items.find((x) => {
      if (!x || typeof x !== "object") return false;
      const rec = x as Record<string, unknown>;
      return String(rec.domain ?? "").toLowerCase() === domain.toLowerCase();
    }) as Record<string, unknown> | undefined;
    if (!item) return { exists: false };
    return {
      exists: true,
      status: typeof item.status === "string" ? item.status : undefined,
      confidence: typeof item.confidence === "number" ? item.confidence : undefined,
      last_seen: typeof item.last_seen === "string" ? item.last_seen : undefined,
    };
  } catch {
    return { exists: false };
  }
}

function parseInput(input: JsonValue | null): AuditInput {
  const obj = (input && typeof input === "object" && !Array.isArray(input) ? input : null) as
    | Record<string, unknown>
    | null;
  const domainRaw = typeof obj?.domain === "string" ? obj.domain : "";
  const domain = normalizeDomain(domainRaw);
  if (!domain) throw new FrameworkHttpError(400, "invalid_domain", "domain must be a hostname");

  const maxFetchRaw = typeof obj?.max_fetch_ms === "number" ? obj.max_fetch_ms : undefined;
  const maxFetch =
    maxFetchRaw !== undefined
      ? Math.max(500, Math.min(MAX_MAX_FETCH_MS, Math.floor(maxFetchRaw)))
      : DEFAULT_MAX_FETCH_MS;

  const checksObj =
    obj?.checks && typeof obj.checks === "object" && !Array.isArray(obj.checks)
      ? (obj.checks as Record<string, unknown>)
      : null;
  const wellKnown = typeof checksObj?.well_known_mcp === "boolean" ? checksObj.well_known_mcp : true;
  const homepage = typeof checksObj?.homepage_html === "boolean" ? checksObj.homepage_html : true;

  return {
    domain,
    max_fetch_ms: maxFetch,
    checks: { well_known_mcp: wellKnown, homepage_html: homepage },
  };
}

export const siteAuditAgentReadyFramework: AgenticFrameworkDefinition = {
  id: "site.audit.agent_ready",
  name: "Agent Readiness Audit",
  description: "Lightweight audit of a domain for MCP/WebMCP readiness using deterministic checks.",
  enabled: true,
  async handler(context): Promise<AgenticResult> {
    const now = new Date().toISOString();
    const input = parseInput(context.input);

    // SSRF guard: block private/loopback by DNS resolution.
    try {
      await resolveAndBlockPrivate(input.domain, Math.min(1500, input.max_fetch_ms ?? DEFAULT_MAX_FETCH_MS));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      if (msg === "private_ip") {
        throw new FrameworkHttpError(400, "blocked_domain", "domain resolves to a private/loopback address");
      }
      if (msg === "unresolvable") {
        throw new FrameworkHttpError(400, "unresolvable_domain", "domain did not resolve");
      }
      if (msg === "dns_timeout") {
        throw new FrameworkHttpError(400, "dns_timeout", "dns lookup timed out");
      }
      throw e;
    }

    const checks = input.checks ?? { well_known_mcp: true, homepage_html: true };
    const maxFetch = input.max_fetch_ms ?? DEFAULT_MAX_FETCH_MS;

    const wellKnownUrl = `https://${input.domain}/.well-known/mcp.json`;
    const homeUrl = `https://${input.domain}/`;

    const wellKnownResult: WellKnownResult = {
      attempted: Boolean(checks.well_known_mcp),
      url: wellKnownUrl,
      status_code: null,
      is_json: false,
      parse_ok: false,
    };

    const homepageResult: HomepageResult = {
      attempted: Boolean(checks.homepage_html),
      url: homeUrl,
      status_code: null,
      matched_hints: [],
    };

    let wellKnownStrong = false;
    let modelContextHit = false;
    let otherHits = false;
    const type: Assessment["type"] = [];

    if (checks.well_known_mcp) {
      try {
        const res = await fetchWithTimeout(wellKnownUrl, maxFetch, "application/json");
        wellKnownResult.status_code = res.status;
        const ct = res.headers.get("content-type") ?? "";
        const looksJson = ct.toLowerCase().includes("application/json") || ct.toLowerCase().includes("+json");
        wellKnownResult.is_json = looksJson;
        const { text } = await readUpTo(res, MAX_BYTES_JSON);
        try {
          const parsed = JSON.parse(text) as unknown;
          if (parsed && typeof parsed === "object") {
            wellKnownResult.parse_ok = true;
            wellKnownStrong = true;
          }
        } catch {
          wellKnownResult.parse_ok = false;
        }
      } catch {
        // Best-effort: keep structured result without failing the whole framework.
        wellKnownResult.status_code = null;
        wellKnownResult.is_json = false;
        wellKnownResult.parse_ok = false;
      }
    }

    if (checks.homepage_html) {
      try {
        const res = await fetchWithTimeout(homeUrl, maxFetch, "text/html,*/*");
        homepageResult.status_code = res.status;
        const { text } = await readUpTo(res, MAX_BYTES_HTML);
        const lc = text.toLowerCase();
        const matched: string[] = [];
        for (const hint of HTML_HINTS) {
          if (lc.includes(hint.toLowerCase())) matched.push(hint);
        }
        matched.sort((a, b) => a.localeCompare(b));
        homepageResult.matched_hints = matched;

        modelContextHit = matched.includes("navigator.modelContext");
        otherHits = matched.some((h) => h !== "navigator.modelContext");
      } catch {
        homepageResult.status_code = null;
        homepageResult.matched_hints = [];
        modelContextHit = false;
        otherHits = false;
      }
    }

    if (wellKnownStrong) type.push("mcp-server");
    if (modelContextHit || otherHits) type.push("webmcp");

    const conf = computeConfidence(wellKnownStrong, modelContextHit, otherHits);
    const vStatus = verificationStatus(wellKnownStrong, modelContextHit);

    let summary = "No strong agent-readiness signals detected.";
    if (wellKnownStrong && modelContextHit) summary = "Strong MCP manifest and WebMCP hints detected.";
    else if (wellKnownStrong) summary = "Strong MCP manifest detected at /.well-known/mcp.json.";
    else if (modelContextHit) summary = "WebMCP hint detected: navigator.modelContext.";
    else if (otherHits) summary = "Some MCP/WebMCP-related hints detected in homepage HTML.";

    const assessment: Assessment = {
      type,
      confidence: conf,
      verification_status: vStatus,
      summary,
    };

    const recommendations = [
      {
        title: "Publish well-known MCP manifest",
        how: "Serve JSON at /.well-known/mcp.json",
        impact: "high",
      },
      {
        title: "Expose structured capability index",
        how: "Add an /api/agent-like index describing tools and how to call them",
        impact: "medium",
      },
    ];

    const directoryEntry = await loadDirectoryEntry(input.domain);

    return {
      domain: input.domain,
      timestamp: now,
      results: {
        well_known_mcp: wellKnownResult,
        homepage_html: homepageResult,
      },
      assessment,
      recommendations,
      directory_entry: directoryEntry,
    };
  },
};
