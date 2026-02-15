import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import type { AgenticResult, JsonValue } from "@/lib/agentic/types";
import { siteAuditAgentReadyFramework } from "@/lib/agentic/runtime/siteAuditAgentReady";
import { agentSelectionSimulateFramework } from "@/lib/agentic/runtime/agentSelectionSimulate";
import { checkFrameworkRateLimit } from "@/lib/agentic/rateLimit";
import { logFrameworkExecution } from "@/lib/agentic/logger";

export const runtime = "nodejs";

const BASE_URL = "https://windrose-ai.com";

const A = { domain: "windrose-ai.com", label: "Windrose" } as const;
const B_CANDIDATES = [
  { domain: "vercel.com", label: "Vercel" },
  { domain: "github.com", label: "GitHub" },
  { domain: "example.com", label: "Example" },
] as const;

const WORLD_PRESETS = {
  balanced: { trust_score: 0.7, availability: 0.3 },
  trust_dominant: { trust_score: 0.9, availability: 0.1 },
  availability_dominant: { trust_score: 0.4, availability: 0.6 },
} as const;

type ExperienceId = 1 | 2 | 3;

type Ranked = { id: "a" | "b"; label: string; score: number };

type Experience1Run = {
  world_id: "balanced" | "trust_dominant";
  weights: Record<string, number>;
  winner: Ranked;
  ranking: Ranked[];
};

type Experience1Attempt = {
  b: { domain: string; label: string };
  world_runs: [Experience1Run, Experience1Run];
  flipped: boolean;
  divergence: number;
};

declare global {
  var __windroseWorldAuditCache: Map<string, { expiresAt: number; value: unknown }> | undefined;
  var __windroseWorldRedis: Redis | undefined;
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

function getMemoryCache(): Map<string, { expiresAt: number; value: unknown }> {
  if (!globalThis.__windroseWorldAuditCache) globalThis.__windroseWorldAuditCache = new Map();
  return globalThis.__windroseWorldAuditCache;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!globalThis.__windroseWorldRedis) globalThis.__windroseWorldRedis = new Redis({ url, token });
  return globalThis.__windroseWorldRedis;
}

function cacheKey(domain: string): string {
  return `windrose:world:audit:v1:${domain}`;
}

async function getCachedAudit(domain: string): Promise<unknown | null> {
  const key = cacheKey(domain);
  const mem = getMemoryCache();
  const hit = mem.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    mem.set(key, { expiresAt: Date.now() + 60_000, value: parsed });
    return parsed;
  } catch {
    return null;
  }
}

async function setCachedAudit(domain: string, value: unknown, ttlSeconds: number): Promise<void> {
  const key = cacheKey(domain);
  getMemoryCache().set(key, { expiresAt: Date.now() + ttlSeconds * 1000, value });
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch {
    // best-effort
  }
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function getHttpErrorMeta(err: unknown): { status: number; code?: string } | null {
  if (!err || typeof err !== "object") return null;
  const rec = err as Record<string, unknown>;
  const status = rec.status;
  const code = rec.code;
  if (typeof status === "number" && Number.isFinite(status)) {
    return { status, code: typeof code === "string" ? code : undefined };
  }
  return null;
}

function normalizeDomain(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const u = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    const host = u.hostname.toLowerCase().replace(/^www\\./, "");
    if (!host.includes(".")) return null;
    if (host.length > 255) return null;
    if (!/^[a-z0-9.-]+$/.test(host)) return null;
    if (/^\\d{1,3}(?:\\.\\d{1,3}){3}$/.test(host)) return null;
    if (host.endsWith(".local")) return null;
    return host;
  } catch {
    return null;
  }
}

function extractSignalsFromAudit(audit: unknown): { trust_score?: number; availability: boolean; hints: string[]; wellKnownOk: boolean } {
  const rec = audit && typeof audit === "object" && !Array.isArray(audit) ? (audit as Record<string, unknown>) : null;
  const assessment =
    rec?.assessment && typeof rec.assessment === "object" && !Array.isArray(rec.assessment)
      ? (rec.assessment as Record<string, unknown>)
      : null;
  const confRaw = assessment?.confidence;
  const trust_score = isFiniteNumber(confRaw) ? Math.max(0, Math.min(100, confRaw)) : undefined;

  const results =
    rec?.results && typeof rec.results === "object" && !Array.isArray(rec.results)
      ? (rec.results as Record<string, unknown>)
      : null;
  const wellKnown =
    results?.well_known_mcp && typeof results.well_known_mcp === "object" && !Array.isArray(results.well_known_mcp)
      ? (results.well_known_mcp as Record<string, unknown>)
      : null;
  const wellKnownOk = Boolean(wellKnown?.parse_ok);

  const homepage =
    results?.homepage_html && typeof results.homepage_html === "object" && !Array.isArray(results.homepage_html)
      ? (results.homepage_html as Record<string, unknown>)
      : null;
  const status = homepage?.status_code;
  const availability = status === 200;
  const hintsRaw = homepage?.matched_hints;
  const hints = Array.isArray(hintsRaw) ? hintsRaw.filter((h) => typeof h === "string").map(String) : [];
  hints.sort((a, b) => a.localeCompare(b));

  return { trust_score, availability, hints, wellKnownOk };
}

function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pickStartIndex(): number {
  const day = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  return fnv1a32(day) % B_CANDIDATES.length;
}

function parseSimOutput(out: AgenticResult): { winner: { id: "a" | "b"; label: string; score: number }; ranking: Array<{ id: "a" | "b"; label: string; score: number }> } {
  const winnerRaw = out.winner as unknown;
  const rankingRaw = out.ranking as unknown;
  if (!winnerRaw || typeof winnerRaw !== "object" || Array.isArray(winnerRaw)) throw new Error("invalid_sim_output");
  const w = winnerRaw as Record<string, unknown>;
  const id = w.id === "a" || w.id === "b" ? (w.id as "a" | "b") : null;
  const label = typeof w.label === "string" ? w.label : null;
  const score = isFiniteNumber(w.score) ? (w.score as number) : null;
  if (!id || !label || score === null) throw new Error("invalid_sim_output");

  const ranking: Array<{ id: "a" | "b"; label: string; score: number }> = [];
  if (Array.isArray(rankingRaw)) {
    for (const item of rankingRaw) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const r = item as Record<string, unknown>;
      const rid = r.id === "a" || r.id === "b" ? (r.id as "a" | "b") : null;
      const rlabel = typeof r.label === "string" ? r.label : null;
      const rscore = isFiniteNumber(r.score) ? (r.score as number) : null;
      if (!rid || !rlabel || rscore === null) continue;
      ranking.push({ id: rid, label: rlabel, score: rscore });
    }
  }
  return { winner: { id, label, score }, ranking: ranking.slice(0, 2) };
}

async function runSim(
  labels: { a: string; b: string },
  signals: { a: { trust_score?: number; availability: boolean }; b: { trust_score?: number; availability: boolean } },
  weights: Record<string, number>,
): Promise<{ winner: Ranked; ranking: Ranked[] }> {
  const candidates: JsonValue = [
    {
      id: "a",
      label: labels.a,
      signals: {
        ...(signals.a.trust_score !== undefined ? { trust_score: signals.a.trust_score } : {}),
        availability: signals.a.availability,
      },
    },
    {
      id: "b",
      label: labels.b,
      signals: {
        ...(signals.b.trust_score !== undefined ? { trust_score: signals.b.trust_score } : {}),
        availability: signals.b.availability,
      },
    },
  ];

  const simOut = await agentSelectionSimulateFramework.handler({
    requestId: crypto.randomUUID(),
    input: { goal: null, candidates, weights, options: { normalize: true, explain: true } } as unknown as JsonValue,
    ip: null,
    userAgent: null,
  });

  const parsed = parseSimOutput(simOut);
  return { winner: parsed.winner, ranking: parsed.ranking };
}

function parseExperienceIdFromUrl(url: URL): { id: ExperienceId | null; hadParam: boolean } {
  const raw = url.searchParams.get("id");
  if (raw === null) return { id: null, hadParam: false };
  if (raw === "1") return { id: 1, hadParam: true };
  if (raw === "2") return { id: 2, hadParam: true };
  if (raw === "3") return { id: 3, hadParam: true };
  return { id: null, hadParam: true };
}

async function experience1(): Promise<JsonValue> {
  const startIdx = pickStartIndex();
  const attempts: Experience1Attempt[] = [];

  for (let i = 0; i < Math.min(3, B_CANDIDATES.length); i++) {
    const b = B_CANDIDATES[(startIdx + i) % B_CANDIDATES.length]!;

    const cachedA = await getCachedAudit(A.domain);
    const cachedB = await getCachedAudit(b.domain);

    const auditA =
      cachedA ??
      (await siteAuditAgentReadyFramework.handler({
        requestId: crypto.randomUUID(),
        input: { domain: A.domain } as unknown as JsonValue,
        ip: null,
        userAgent: null,
      }));
    const auditB =
      cachedB ??
      (await siteAuditAgentReadyFramework.handler({
        requestId: crypto.randomUUID(),
        input: { domain: b.domain } as unknown as JsonValue,
        ip: null,
        userAgent: null,
      }));

    if (!cachedA) await setCachedAudit(A.domain, auditA, 300);
    if (!cachedB) await setCachedAudit(b.domain, auditB, 300);

    const sigA = extractSignalsFromAudit(auditA);
    const sigB = extractSignalsFromAudit(auditB);

    const labels = { a: A.label, b: b.label };
    const runBalanced = await runSim(labels, { a: sigA, b: sigB }, WORLD_PRESETS.balanced);
    const runTrust = await runSim(labels, { a: sigA, b: sigB }, WORLD_PRESETS.trust_dominant);

    const flipped = runBalanced.winner.id !== runTrust.winner.id;
    const divergence = Math.abs(runBalanced.winner.score - runTrust.winner.score);

    attempts.push({
      b,
      world_runs: [
        { world_id: "balanced", weights: WORLD_PRESETS.balanced, winner: runBalanced.winner, ranking: runBalanced.ranking },
        { world_id: "trust_dominant", weights: WORLD_PRESETS.trust_dominant, winner: runTrust.winner, ranking: runTrust.ranking },
      ],
      flipped,
      divergence,
    });
    if (flipped) break;
  }

  const chosen =
    attempts.find((a) => a.flipped) ?? attempts.slice().sort((x, y) => y.divergence - x.divergence)[0]!;

  return {
    entities: {
      a: { domain: A.domain, label: A.label },
      b: { domain: chosen.b.domain, label: chosen.b.label },
    },
    world_runs: chosen.world_runs.map((wr) => ({
      world_id: wr.world_id,
      weights: wr.weights,
      winner: wr.winner,
      ranking: wr.ranking,
    })),
    surprise: {
      winner_flipped: chosen.flipped,
      one_liner: chosen.flipped ? "Same surface. Different physics. Different fate." : "The physics shifted. The verdict held.",
      ...(chosen.flipped ? {} : { note: "No flip found today." }),
    },
    next: { reflect: `${BASE_URL}/api/world/reflect` },
  };
}

function compactXray(domain: string, audit: unknown): JsonValue {
  const rec = audit && typeof audit === "object" && !Array.isArray(audit) ? (audit as Record<string, unknown>) : null;
  const assessment =
    rec?.assessment && typeof rec.assessment === "object" && !Array.isArray(rec.assessment)
      ? (rec.assessment as Record<string, unknown>)
      : null;
  const verification_status =
    typeof assessment?.verification_status === "string" ? (assessment.verification_status as string) : "unverified";
  const confidence = isFiniteNumber(assessment?.confidence) ? Math.max(0, Math.min(100, Math.floor(assessment!.confidence as number))) : 0;

  const sig = extractSignalsFromAudit(audit);
  const proofTypes: string[] = [];
  if (sig.wellKnownOk) proofTypes.push("well_known_mcp_json");
  if (sig.hints.length > 0) proofTypes.push("homepage_hints");
  proofTypes.sort((a, b) => a.localeCompare(b));

  const recs: string[] = [];
  if (!sig.wellKnownOk) recs.push("Publish /.well-known/mcp.json.");
  if (!sig.hints.includes("navigator.modelContext")) recs.push("Expose an agent-facing capability index (like /api/agent).");
  if (!sig.availability) recs.push("Fix availability: ensure the homepage returns 200.");
  while (recs.length < 3) recs.push("Keep the surface stable: predictable URLs and machine-readable metadata.");

  return {
    entity: { domain },
    xray: {
      verification_status,
      confidence,
      proof_types: proofTypes,
      key_hints: sig.hints.slice(0, 5),
      recommendations: recs.slice(0, 3),
    },
    next: { reflect: `${BASE_URL}/api/world/reflect` },
  };
}

async function experience2(domain: string): Promise<JsonValue> {
  const cached = await getCachedAudit(domain);
  const audit =
    cached ??
    (await siteAuditAgentReadyFramework.handler({
      requestId: crypto.randomUUID(),
      input: { domain } as unknown as JsonValue,
      ip: null,
      userAgent: null,
    }));
  if (!cached) await setCachedAudit(domain, audit, 300);

  return compactXray(domain, audit);
}

async function experience3(body: JsonValue | null): Promise<JsonValue> {
  const obj = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  if (!obj) throw new Error("invalid_body");

  const aRaw = typeof obj.domain_a === "string" ? (obj.domain_a as string) : "";
  const bRaw = typeof obj.domain_b === "string" ? (obj.domain_b as string) : "";
  const worldRaw = typeof obj.world === "string" ? (obj.world as string) : "";

  const domainA = normalizeDomain(aRaw);
  const domainB = normalizeDomain(bRaw);
  if (!domainA) throw new Error("missing_domain_a");
  if (!domainB) throw new Error("missing_domain_b");
  if (worldRaw !== "balanced" && worldRaw !== "trust_dominant" && worldRaw !== "availability_dominant") {
    throw new Error("invalid_world");
  }

  const weights = WORLD_PRESETS[worldRaw];

  const cachedA = await getCachedAudit(domainA);
  const cachedB = await getCachedAudit(domainB);

  const auditA =
    cachedA ??
    (await siteAuditAgentReadyFramework.handler({
      requestId: crypto.randomUUID(),
      input: { domain: domainA } as unknown as JsonValue,
      ip: null,
      userAgent: null,
    }));
  const auditB =
    cachedB ??
    (await siteAuditAgentReadyFramework.handler({
      requestId: crypto.randomUUID(),
      input: { domain: domainB } as unknown as JsonValue,
      ip: null,
      userAgent: null,
    }));

  if (!cachedA) await setCachedAudit(domainA, auditA, 300);
  if (!cachedB) await setCachedAudit(domainB, auditB, 300);

  const sigA = extractSignalsFromAudit(auditA);
  const sigB = extractSignalsFromAudit(auditB);
  const labels = { a: domainA, b: domainB };

  const sim = await runSim(labels, { a: sigA, b: sigB }, weights);

  const whatChanged =
    worldRaw === "availability_dominant"
      ? "Availability dominates."
      : worldRaw === "trust_dominant"
        ? "Trust dominates."
        : "Balanced weights.";

  return {
    entities: { a: { domain: domainA, label: domainA }, b: { domain: domainB, label: domainB } },
    world: { id: worldRaw, weights },
    winner: sim.winner,
    ranking: sim.ranking,
    note: whatChanged,
    next: { reflect: `${BASE_URL}/api/world/reflect` },
  };
}

function mapBodyErrorToResponse(err: unknown): { status: number; body: Record<string, string> } {
  const msg = err instanceof Error ? err.message : "unknown";
  if (msg === "invalid_body") return { status: 400, body: { error: "invalid_body" } };
  if (msg === "missing_domain_a") return { status: 400, body: { error: "missing_domain_a" } };
  if (msg === "missing_domain_b") return { status: 400, body: { error: "missing_domain_b" } };
  if (msg === "invalid_world") return { status: 400, body: { error: "invalid_world" } };
  return { status: 500, body: { error: "world_dial_failed" } };
}

async function handle(req: Request): Promise<Response> {
  const start = Date.now();
  const url = new URL(req.url);
  const ip = getClientIp(req) ?? "unknown";

  const parsedId = parseExperienceIdFromUrl(url);
  if (parsedId.hadParam && parsedId.id === null) {
    return NextResponse.json({ error: "invalid_experience_id" }, { status: 400 });
  }
  // Backwards-compatible default: if no id is provided, treat as experience 1.
  const id: ExperienceId = parsedId.id ?? 1;

  const rl = await checkFrameworkRateLimit(`ip:${ip}:world:experience:${id}`);
  if (rl.limited) {
    const retryAfterSeconds = Math.max(0, Math.ceil((rl.resetMs - Date.now()) / 1000));
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
        },
      },
    );
  }

  let status = 200;
  let output: JsonValue | null = null;
  const frameworkId = `world.experience.${id}`;

  try {
    if (req.method === "GET") {
      if (id === 3) return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
      if (id === 1) {
        output = await experience1();
      } else {
        const domainParam = url.searchParams.get("domain");
        if (!domainParam) return NextResponse.json({ error: "missing_domain" }, { status: 400 });
        const domain = normalizeDomain(domainParam);
        if (!domain) return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
        output = await experience2(domain);
      }
    } else if (req.method === "POST") {
      if (id !== 3) return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
      let body: JsonValue | null = null;
      try {
        body = (await req.json()) as JsonValue;
      } catch {
        body = null;
      }
      output = await experience3(body);
    } else {
      return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
    }
  } catch (err) {
    const meta = getHttpErrorMeta(err);
    if (meta) {
      status = meta.status;
      output = { error: meta.code ?? "world_experience_failed", message: err instanceof Error ? err.message : "Unknown error" };
    } else {
      // Map known POST validation errors.
      if (id === 3) {
        const mapped = mapBodyErrorToResponse(err);
        status = mapped.status;
        output = mapped.body as unknown as JsonValue;
      } else {
        status = 500;
        output = { error: "world_experience_failed", message: err instanceof Error ? err.message : "Unknown error" };
      }
    }
  }

  const body = output ?? { error: "world_experience_failed" };
  const latencyMs = Date.now() - start;
  await logFrameworkExecution({
    timestamp: new Date().toISOString(),
    framework_id: frameworkId,
    input: null,
    output: body,
    latency_ms: latencyMs,
    user_agent: req.headers.get("user-agent"),
    ip: ip === "unknown" ? null : ip,
  });

  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}
