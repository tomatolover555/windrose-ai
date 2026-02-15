import fs from "node:fs/promises";
import path from "node:path";

type EvidenceKind = "github_hit" | "well_known_mcp_json" | "heuristic_html";
type Status = "verified" | "likely" | "unverified" | "dead";
type ItemType = "webmcp" | "mcp-server";
type VerificationStatus = "unverified" | "verified" | "revoked";
type VerificationMethod = "well_known" | "modelContext_detected" | "manual" | null;

type Proof = {
  type: "well_known" | "homepage";
  url: string;
  last_success: string;
};

type Evidence = {
  kind: EvidenceKind;
  detail: string;
  url?: string;
};

type DirectoryItem = {
  domain: string;
  name?: string;
  type: ItemType[];
  confidence: number;
  status: Status;
  verification_status?: VerificationStatus;
  verification_method?: VerificationMethod;
  proof?: Proof[];
  last_verified_success?: string | null;
  fail_streak?: number;
  evidence: Evidence[];
  last_checked: string;
  last_seen: string;
  sponsored?: boolean;
  verification_available?: boolean;
  notes?: string;
};

type DirectoryFile = {
  updated_at: string;
  items: DirectoryItem[];
};

const MAX_DOMAINS_PER_RUN = 200;
const REQUEST_TIMEOUT_MS = 4500;
const MIN_REQUEST_INTERVAL_MS = 1000;

const DATASET_PATH = path.join(process.cwd(), "data", "webmcp_directory.json");
const SEEDS_PATH = path.join(process.cwd(), "data", "webmcp_seeds.json");

const QUERIES = [
  "\"navigator.modelContext\"",
  "\"webmcp\"",
  "\"@mcp-b/react-webmcp\"",
  "\"mcp-ui-webmcp\"",
];

let lastFetchAt = 0;
async function throttledFetch(input: string, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, MIN_REQUEST_INTERVAL_MS - (now - lastFetchAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetchAt = Date.now();

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(t);
  }
}

function isoNow(): string {
  return new Date().toISOString();
}

function normalizeDomain(d: string): string {
  return d
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function extractDomains(text: string): string[] {
  const domains = new Set<string>();

  // URLs
  const urlRe = /\bhttps?:\/\/[^\s)<>"']+/gi;
  for (const m of text.match(urlRe) ?? []) {
    try {
      const u = new URL(m);
      const host = normalizeDomain(u.host);
      if (host && host !== "github.com" && host !== "raw.githubusercontent.com") domains.add(host);
    } catch {
      // ignore
    }
  }

  // Bare domains
  const bareRe = /\b([a-z0-9-]+\.)+[a-z]{2,}\b/gi;
  for (const m of text.match(bareRe) ?? []) {
    const host = normalizeDomain(m);
    if (host && host !== "github.com" && host !== "raw.githubusercontent.com") domains.add(host);
  }

  return Array.from(domains);
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function getFailStreak(prev: DirectoryItem | undefined): number {
  if (typeof prev?.fail_streak === "number" && Number.isFinite(prev.fail_streak)) return prev.fail_streak;
  const m = prev?.notes?.match(/fail_streak:(\d+)/);
  return m ? Number(m[1]) : 0;
}

function stripFailStreak(notes: string | undefined): string | undefined {
  const base = (notes ?? "").replace(/(?:^|\s)fail_streak:\d+/g, "").trim();
  return base || undefined;
}

function evidenceKinds(evidence: Evidence[]): Set<EvidenceKind> {
  return new Set(evidence.map((e) => e.kind));
}

function mergeEvidence(existing: Evidence[], add: Evidence[]): Evidence[] {
  const seen = new Set(existing.map((e) => `${e.kind}|${e.detail}|${e.url ?? ""}`));
  const out = [...existing];
  for (const e of add) {
    const key = `${e.kind}|${e.detail}|${e.url ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

function computeConfidence(evidence: Evidence[], htmlSignals: { modelContext: boolean; other: boolean }): number {
  let score = 0;
  for (const e of evidence) {
    if (e.kind === "well_known_mcp_json") score += 70;
    if (e.kind === "github_hit") score += 30;
    if (e.kind === "heuristic_html") {
      // weight handled via signals
    }
  }
  if (htmlSignals.modelContext) score += 60;
  if (htmlSignals.other) score += 25;
  return Math.min(100, score);
}

function statusFromConfidence(conf: number, strong: boolean, failStreak: number): Status {
  if (failStreak >= 3) return "dead";
  if (conf >= 80 && strong) return "verified";
  if (conf >= 50) return "likely";
  return "unverified";
}

function verificationStatusFrom(
  prev: DirectoryItem | undefined,
  strongSuccess: boolean,
  confidence: number,
  failStreak: number,
): VerificationStatus {
  const wasVerified = prev?.verification_status === "verified";
  if (strongSuccess && confidence >= 80) return "verified";
  if (wasVerified && failStreak >= 5 && !strongSuccess) return "revoked";
  if (prev?.verification_status === "revoked" && strongSuccess && confidence >= 80) return "verified";
  return prev?.verification_status ?? "unverified";
}

function verificationMethodFrom(prev: DirectoryItem | undefined, wkOk: boolean, modelContext: boolean): VerificationMethod {
  if (wkOk) return "well_known";
  if (modelContext) return "modelContext_detected";
  return prev?.verification_method ?? null;
}

function upsertProof(proof: Proof[] | undefined, next: Proof): Proof[] {
  const list = proof ? [...proof] : [];
  const idx = list.findIndex((p) => p.type === next.type && p.url === next.url);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  // deterministic
  list.sort((a, b) => a.type.localeCompare(b.type) || a.url.localeCompare(b.url));
  return list;
}

type GithubCodeSearchItem = {
  repository?: {
    full_name?: string;
    html_url?: string;
  };
};

async function githubCodeSearch(
  query: string,
  token: string | undefined,
): Promise<GithubCodeSearchItem[]> {
  const q = encodeURIComponent(query);
  const url = `https://api.github.com/search/code?q=${q}&per_page=20`;
  const res = await throttledFetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "User-Agent": "windrose-ai-webmcp-scanner",
    },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { items?: GithubCodeSearchItem[] };
  return json.items ?? [];
}

async function githubReadme(owner: string, repo: string, token: string | undefined): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/readme`;
  const res = await throttledFetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "User-Agent": "windrose-ai-webmcp-scanner",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { content?: string; encoding?: string };
  if (!json.content || json.encoding !== "base64") return null;
  const buf = Buffer.from(json.content.replace(/\n/g, ""), "base64");
  return buf.toString("utf8");
}

async function stageCandidates(): Promise<Map<string, Evidence[]>> {
  const token = process.env.GITHUB_TOKEN;
  const candidates = new Map<string, Evidence[]>();

  // Seeds
  const seeds = await readJsonFile<string[]>(SEEDS_PATH, []);
  for (const s of seeds) {
    const d = normalizeDomain(s);
    if (!d) continue;
    candidates.set(d, []);
  }

  // GitHub search (best-effort, limited)
  const repoSet = new Map<string, { owner: string; repo: string; htmlUrl?: string }>();

  for (const q of QUERIES) {
    const items = await githubCodeSearch(q, token);
    for (const it of items) {
      const r = it.repository;
      if (!r?.full_name) continue;
      const [owner, repo] = String(r.full_name).split("/");
      if (!owner || !repo) continue;
      repoSet.set(r.full_name, { owner, repo, htmlUrl: r.html_url });
    }
  }

  const repos = Array.from(repoSet.entries()).slice(0, 25);
  for (const [fullName, info] of repos) {
    const ev: Evidence = { kind: "github_hit", detail: `repo: ${fullName}`, url: info.htmlUrl };

    // Add any domains we can infer from repository homepage (if present in search payload)
    // Note: code search payload may not include `homepage`. We'll rely on README parsing.
    const readme = await githubReadme(info.owner, info.repo, token);
    if (!readme) continue;
    const domains = extractDomains(readme);
    for (const d of domains) {
      const existing = candidates.get(d) ?? [];
      candidates.set(d, mergeEvidence(existing, [ev]));
    }
  }

  return candidates;
}

async function checkWellKnown(domain: string): Promise<{ ok: boolean; evidence: Evidence[]; url: string }> {
  const url = `https://${domain}/.well-known/mcp.json`;
  const res = await throttledFetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return { ok: false, evidence: [], url };
  try {
    const json = (await res.json()) as unknown;
    if (json && typeof json === "object") {
      return {
        ok: true,
        evidence: [{ kind: "well_known_mcp_json", detail: "found .well-known/mcp.json", url }],
        url,
      };
    }
  } catch {
    // ignore
  }
  return { ok: false, evidence: [], url };
}

async function checkHomepage(domain: string): Promise<{
  ok: boolean;
  modelContext: boolean;
  other: boolean;
  evidence: Evidence[];
  url: string;
}> {
  const url = `https://${domain}/`;
  const res = await throttledFetch(url, { headers: { Accept: "text/html,*/*" } });
  if (!res.ok) return { ok: false, modelContext: false, other: false, evidence: [], url };
  const html = await res.text();
  const lc = html.toLowerCase();
  const modelContext = lc.includes("navigator.modelcontext");
  const other =
    lc.includes("registertool") ||
    lc.includes("providecontext") ||
    lc.includes("mcp-b") ||
    lc.includes("react-webmcp") ||
    lc.includes("webmcp");

  const hits = modelContext || other;
  return {
    ok: true,
    modelContext,
    other,
    evidence: hits ? [{ kind: "heuristic_html", detail: "heuristic match in homepage html", url }] : [],
    url,
  };
}

function computeTypes(evidence: Evidence[], htmlSignals: { modelContext: boolean; other: boolean }): ItemType[] {
  const kinds = evidenceKinds(evidence);
  const types = new Set<ItemType>();
  if (kinds.has("well_known_mcp_json")) types.add("mcp-server");
  if (htmlSignals.modelContext || htmlSignals.other) types.add("webmcp");
  return Array.from(types);
}

async function main() {
  const existing = await readJsonFile<DirectoryFile>(DATASET_PATH, {
    updated_at: isoNow(),
    items: [],
  });
  const existingMap = new Map(existing.items.map((i) => [normalizeDomain(i.domain), i]));

  const candidates = await stageCandidates();
  const domains = Array.from(candidates.keys())
    .map(normalizeDomain)
    .filter(Boolean)
    .sort()
    .slice(0, MAX_DOMAINS_PER_RUN);

  console.log(`Candidates: ${domains.length}`);

  const updatedItems: DirectoryItem[] = [];
  for (const domain of domains) {
    const prev = existingMap.get(domain);
    const nowIso = isoNow();

    const evFromDiscovery = candidates.get(domain) ?? [];

    let wkOk = false;
    let wkEv: Evidence[] = [];
    let wkUrl = `https://${domain}/.well-known/mcp.json`;
    let homeOk = false;
    let modelContext = false;
    let other = false;
    let homeEv: Evidence[] = [];
    let homeUrl = `https://${domain}/`;

    try {
      const wk = await checkWellKnown(domain);
      wkOk = wk.ok;
      wkEv = wk.evidence;
      wkUrl = wk.url;
    } catch {
      wkOk = false;
      wkEv = [];
    }

    try {
      const h = await checkHomepage(domain);
      homeOk = h.ok;
      modelContext = h.modelContext;
      other = h.other;
      homeEv = h.evidence;
      homeUrl = h.url;
    } catch {
      homeOk = false;
      homeEv = [];
    }

    const evidence = mergeEvidence(prev?.evidence ?? [], mergeEvidence(evFromDiscovery, mergeEvidence(wkEv, homeEv)));
    const htmlSignals = { modelContext, other };
    const confidence = computeConfidence(evidence, htmlSignals);
    const strongEvidence = wkOk || modelContext;
    const successSeen = wkOk || modelContext || other;

    const prevFail = getFailStreak(prev);
    // Monitoring semantics:
    // - Reset streak on strong success
    // - Increment streak when both checks fail (timeouts/non-200/etc.)
    const strongSuccess = wkOk || modelContext;
    const checkFailed = !wkOk && !homeOk;
    const failStreak = strongSuccess ? 0 : checkFailed ? prevFail + 1 : prevFail;

    const status = statusFromConfidence(confidence, strongEvidence, failStreak);
    const type = computeTypes(evidence, htmlSignals);

    const lastSeen = successSeen ? nowIso : prev?.last_seen ?? nowIso;

    const verification_status = verificationStatusFrom(prev, strongSuccess, confidence, failStreak);
    const verification_method = verificationMethodFrom(prev, wkOk, modelContext);

    let proof = prev?.proof ?? [];
    if (wkOk) proof = upsertProof(proof, { type: "well_known", url: wkUrl, last_success: nowIso });
    if (modelContext) proof = upsertProof(proof, { type: "homepage", url: homeUrl, last_success: nowIso });

    const last_verified_success = strongSuccess ? nowIso : prev?.last_verified_success ?? null;

    updatedItems.push({
      domain,
      name: prev?.name ?? domain,
      type: type.length > 0 ? type : prev?.type ?? [],
      confidence,
      status,
      verification_status,
      verification_method,
      proof,
      last_verified_success,
      fail_streak: failStreak,
      evidence,
      last_checked: nowIso,
      last_seen: lastSeen,
      sponsored: prev?.sponsored ?? false,
      verification_available: prev?.verification_available ?? true,
      notes: stripFailStreak(prev?.notes),
    });
  }

  // Keep previous items that weren't checked this run (so dataset grows over time).
  const checked = new Set(domains);
  for (const item of existing.items) {
    const d = normalizeDomain(item.domain);
    if (!checked.has(d)) updatedItems.push(item);
  }

  // Deterministic order for file stability.
  updatedItems.sort((a, b) => a.domain.localeCompare(b.domain));

  const out: DirectoryFile = {
    updated_at: isoNow(),
    items: updatedItems,
  };

  await writeJsonFile(DATASET_PATH, out);
  console.log(`Wrote: ${DATASET_PATH} (items=${out.items.length})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
