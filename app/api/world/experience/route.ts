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

const WORLDS = [
  { id: "balanced", weights: { trust_score: 0.7, availability: 0.3 } },
  { id: "trust_dominant", weights: { trust_score: 0.9, availability: 0.1 } },
] as const;

type WorldRun = {
  world_id: string;
  weights: Record<string, number>;
  winner: { id: "a" | "b"; label: string; score: number };
  ranking: Array<{ id: "a" | "b"; label: string; score: number }>;
  _diff: number;
};

type Attempt = {
  b: { domain: string; label: string };
  world_runs: [WorldRun, WorldRun];
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

function extractSignalsFromAudit(audit: unknown): { trust_score?: number; availability: boolean } {
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
  const homepage =
    results?.homepage_html && typeof results.homepage_html === "object" && !Array.isArray(results.homepage_html)
      ? (results.homepage_html as Record<string, unknown>)
      : null;
  const status = homepage?.status_code;
  const availability = status === 200;
  return { trust_score, availability };
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

function parseSimOutput(out: AgenticResult): { winner: WorldRun["winner"]; ranking: WorldRun["ranking"]; diff: number } {
  const winnerRaw = out.winner as unknown;
  const rankingRaw = out.ranking as unknown;

  if (!winnerRaw || typeof winnerRaw !== "object" || Array.isArray(winnerRaw)) {
    throw new Error("invalid_sim_output");
  }
  const w = winnerRaw as Record<string, unknown>;
  const winnerId = w.id === "a" || w.id === "b" ? (w.id as "a" | "b") : null;
  const winnerLabel = typeof w.label === "string" ? w.label : null;
  const winnerScore = isFiniteNumber(w.score) ? (w.score as number) : null;
  if (!winnerId || !winnerLabel || winnerScore === null) throw new Error("invalid_sim_output");

  const ranking: WorldRun["ranking"] = [];
  if (Array.isArray(rankingRaw)) {
    for (const item of rankingRaw) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const r = item as Record<string, unknown>;
      const id = r.id === "a" || r.id === "b" ? (r.id as "a" | "b") : null;
      const label = typeof r.label === "string" ? r.label : null;
      const score = isFiniteNumber(r.score) ? (r.score as number) : null;
      if (!id || !label || score === null) continue;
      ranking.push({ id, label, score });
    }
  }

  // Ensure top-2 present.
  if (ranking.length < 2) {
    const wItem = { id: winnerId, label: winnerLabel, score: winnerScore };
    const otherId: "a" | "b" = winnerId === "a" ? "b" : "a";
    ranking.length = 0;
    ranking.push(wItem);
    ranking.push({ id: otherId, label: otherId, score: otherId === "a" ? 0 : 0 });
  }

  const scoreA = ranking.find((x) => x.id === "a")?.score ?? 0;
  const scoreB = ranking.find((x) => x.id === "b")?.score ?? 0;
  const diff = scoreA - scoreB;

  return { winner: { id: winnerId, label: winnerLabel, score: winnerScore }, ranking: ranking.slice(0, 2), diff };
}

async function runWorld(
  worldId: string,
  weights: Record<string, number>,
  labels: { a: string; b: string },
  signals: { a: { trust_score?: number; availability: boolean }; b: { trust_score?: number; availability: boolean } },
): Promise<WorldRun> {
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
    input: {
      goal: null,
      candidates,
      weights,
      options: { normalize: true, explain: true },
    } as unknown as JsonValue,
    ip: null,
    userAgent: null,
  });

  const parsed = parseSimOutput(simOut);
  return { world_id: worldId, weights, winner: parsed.winner, ranking: parsed.ranking, _diff: parsed.diff };
}

export async function GET(req: Request): Promise<Response> {
  const start = Date.now();
  const ip = getClientIp(req) ?? "unknown";

  const rl = await checkFrameworkRateLimit(`ip:${ip}:world:experience`);
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

  try {
    const startIdx = pickStartIndex();
    const attempts: Attempt[] = [];

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

      const run1 = await runWorld(WORLDS[0].id, WORLDS[0].weights as unknown as Record<string, number>, labels, {
        a: sigA,
        b: sigB,
      });
      const run2 = await runWorld(WORLDS[1].id, WORLDS[1].weights as unknown as Record<string, number>, labels, {
        a: sigA,
        b: sigB,
      });

      const flipped = run1.winner.id !== run2.winner.id;
      const divergence = Math.abs(run1._diff - run2._diff);
      attempts.push({ b, world_runs: [run1, run2], flipped, divergence });
      if (flipped) break;
    }

    const chosen =
      attempts.find((a) => a.flipped) ?? attempts.slice().sort((x, y) => y.divergence - x.divergence)[0]!;

    output = {
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
        one_liner: chosen.flipped
          ? "Same surface. Different physics. Different fate."
          : "The physics shifted. The verdict held.",
        ...(chosen.flipped ? {} : { note: "No flip found today." }),
      },
      next: { reflect: `${BASE_URL}/api/world/reflect` },
    };
  } catch (err) {
    const meta = getHttpErrorMeta(err);
    status = meta?.status && meta.status >= 400 && meta.status <= 599 ? meta.status : 500;
    output = {
      error: meta?.code ?? "world_experience_failed",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }

  const body = output ?? { error: "world_experience_failed" };
  const latencyMs = Date.now() - start;
  await logFrameworkExecution({
    timestamp: new Date().toISOString(),
    framework_id: "world.experience",
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
