import { Redis } from "@upstash/redis";
import type { AgenticContext, AgenticFrameworkDefinition, AgenticResult, JsonValue } from "@/lib/agentic/types";
import { siteAuditAgentReadyFramework } from "@/lib/agentic/runtime/siteAuditAgentReady";
import { agentSelectionSimulateFramework } from "@/lib/agentic/runtime/agentSelectionSimulate";
import { reportAgentSelectionV1Framework } from "@/lib/agentic/runtime/reportAgentSelectionV1";

class FrameworkHttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

type ScenarioId = "default_consumer" | "risk_averse" | "speed_first" | "custom";

const SCENARIOS: Record<Exclude<ScenarioId, "custom">, Record<string, number>> = {
  default_consumer: { price: 0.45, trust_score: 0.3, latency_ms: 0.15, refund_policy: 0.1 },
  risk_averse: { price: 0.2, trust_score: 0.55, latency_ms: 0.15, refund_policy: 0.1 },
  speed_first: { price: 0.25, trust_score: 0.25, latency_ms: 0.4, refund_policy: 0.1 },
};

type Input = {
  goal?: string;
  scenario: ScenarioId;
  custom_weights: Record<string, number> | null;
  domains: {
    a: { domain: string; label?: string };
    b: { domain: string; label?: string };
  };
  options?: {
    max_fetch_ms?: number;
    checks?: { well_known_mcp?: boolean; homepage_html?: boolean };
  };
};

declare global {
  var __windroseRunnerAuditCache: Map<string, { expiresAt: number; value: unknown }> | undefined;
  var __windroseRunnerRedis: Redis | undefined;
}

function getMemoryCache(): Map<string, { expiresAt: number; value: unknown }> {
  if (!globalThis.__windroseRunnerAuditCache) {
    globalThis.__windroseRunnerAuditCache = new Map();
  }
  return globalThis.__windroseRunnerAuditCache;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!globalThis.__windroseRunnerRedis) {
    globalThis.__windroseRunnerRedis = new Redis({ url, token });
  }
  return globalThis.__windroseRunnerRedis;
}

function asObject(v: JsonValue | null): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function parseWeights(obj: unknown, codePrefix: string): Record<string, number> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new FrameworkHttpError(400, "invalid_weights", `${codePrefix} must be an object`);
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (!isFiniteNumber(v) || v < 0) {
      throw new FrameworkHttpError(400, "invalid_weights", `${codePrefix}.${k} must be a non-negative number`);
    }
    out[k] = v;
  }
  if (Object.keys(out).length === 0) {
    throw new FrameworkHttpError(400, "invalid_weights", `${codePrefix} must not be empty`);
  }
  return out;
}

function parseInput(input: JsonValue | null): Input {
  const obj = asObject(input);
  if (!obj) throw new FrameworkHttpError(400, "invalid_input", "body must be a JSON object");

  const scenario = obj.scenario as unknown;
  if (scenario !== "default_consumer" && scenario !== "risk_averse" && scenario !== "speed_first" && scenario !== "custom") {
    throw new FrameworkHttpError(400, "invalid_scenario", "scenario must be one of: default_consumer, risk_averse, speed_first, custom");
  }

  const domainsObj = obj.domains as unknown;
  if (!domainsObj || typeof domainsObj !== "object" || Array.isArray(domainsObj)) {
    throw new FrameworkHttpError(400, "invalid_domains", "domains must be an object");
  }
  const aObj = (domainsObj as Record<string, unknown>).a as unknown;
  const bObj = (domainsObj as Record<string, unknown>).b as unknown;
  if (!aObj || typeof aObj !== "object" || Array.isArray(aObj) || !bObj || typeof bObj !== "object" || Array.isArray(bObj)) {
    throw new FrameworkHttpError(400, "invalid_domains", "domains.a and domains.b must be objects");
  }
  const aDomain = typeof (aObj as Record<string, unknown>).domain === "string" ? ((aObj as Record<string, unknown>).domain as string) : "";
  const bDomain = typeof (bObj as Record<string, unknown>).domain === "string" ? ((bObj as Record<string, unknown>).domain as string) : "";
  if (!aDomain || !bDomain) {
    throw new FrameworkHttpError(400, "invalid_domains", "domains.a.domain and domains.b.domain are required");
  }

  const goal = typeof obj.goal === "string" ? (obj.goal as string) : undefined;
  const aLabel = typeof (aObj as Record<string, unknown>).label === "string" ? ((aObj as Record<string, unknown>).label as string) : undefined;
  const bLabel = typeof (bObj as Record<string, unknown>).label === "string" ? ((bObj as Record<string, unknown>).label as string) : undefined;

  const optionsObj =
    obj.options && typeof obj.options === "object" && !Array.isArray(obj.options)
      ? (obj.options as Record<string, unknown>)
      : null;

  const maxFetchRaw = optionsObj && isFiniteNumber(optionsObj.max_fetch_ms) ? (optionsObj.max_fetch_ms as number) : undefined;
  const max_fetch_ms = maxFetchRaw !== undefined ? Math.max(500, Math.min(10000, Math.floor(maxFetchRaw))) : 4500;

  const checksObj =
    optionsObj?.checks && typeof optionsObj.checks === "object" && !Array.isArray(optionsObj.checks)
      ? (optionsObj.checks as Record<string, unknown>)
      : null;
  const well_known_mcp = typeof checksObj?.well_known_mcp === "boolean" ? (checksObj.well_known_mcp as boolean) : true;
  const homepage_html = typeof checksObj?.homepage_html === "boolean" ? (checksObj.homepage_html as boolean) : true;

  let custom_weights: Record<string, number> | null = null;
  if (scenario === "custom") {
    const customObj =
      obj.custom && typeof obj.custom === "object" && !Array.isArray(obj.custom) ? (obj.custom as Record<string, unknown>) : null;
    const weights = customObj?.weights;
    if (!weights) throw new FrameworkHttpError(400, "missing_custom_weights", "custom.weights is required when scenario=custom");
    custom_weights = parseWeights(weights, "custom.weights");
  }

  return {
    goal,
    scenario,
    custom_weights,
    domains: { a: { domain: aDomain, label: aLabel }, b: { domain: bDomain, label: bLabel } },
    options: { max_fetch_ms, checks: { well_known_mcp, homepage_html } },
  };
}

function cacheKey(domain: string, opts: { max_fetch_ms: number; checks: { well_known_mcp: boolean; homepage_html: boolean } }): string {
  const wk = opts.checks.well_known_mcp ? "1" : "0";
  const hh = opts.checks.homepage_html ? "1" : "0";
  return `windrose:audit:v1:${domain}:max${opts.max_fetch_ms}:wk${wk}:hh${hh}`;
}

async function getCachedAudit(key: string): Promise<unknown | null> {
  const mem = getMemoryCache();
  const m = mem.get(key);
  if (m && m.expiresAt > Date.now()) return m.value;

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

async function setCachedAudit(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const mem = getMemoryCache();
  mem.set(key, { expiresAt: Date.now() + ttlSeconds * 1000, value });

  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch {
    // best effort
  }
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

function deriveWeights(scenario: ScenarioId, custom: Record<string, number> | null): Record<string, number> {
  const base = scenario === "custom" ? (custom ?? {}) : SCENARIOS[scenario as Exclude<ScenarioId, "custom">];
  // Add a small availability weight derived from trust_score weight to ensure availability affects ranking.
  const trust = isFiniteNumber(base.trust_score) ? base.trust_score : 0.25;
  const availability = Math.max(0.05, Math.min(0.2, Number((trust * 0.25).toFixed(6))));
  return { ...base, availability };
}

export const reportAgentSelectionRunFramework: AgenticFrameworkDefinition = {
  id: "report.agent_selection.run",
  name: "Agent Selection Report Runner",
  description:
    "One-call runner: audits two domains, simulates selection with a scenario preset, then formats a report (no UI).",
  enabled: true,
  async handler(context: AgenticContext): Promise<AgenticResult> {
    const input = parseInput(context.input);

    const opts = input.options ?? { max_fetch_ms: 4500, checks: { well_known_mcp: true, homepage_html: true } };
    const checks = opts.checks ?? { well_known_mcp: true, homepage_html: true };
    const auditInput = (domain: string): JsonValue => ({
      domain,
      max_fetch_ms: opts.max_fetch_ms ?? 4500,
      checks: { well_known_mcp: Boolean(checks.well_known_mcp), homepage_html: Boolean(checks.homepage_html) },
    });

    const aKey = cacheKey(input.domains.a.domain, {
      max_fetch_ms: opts.max_fetch_ms ?? 4500,
      checks: { well_known_mcp: Boolean(checks.well_known_mcp), homepage_html: Boolean(checks.homepage_html) },
    });
    const bKey = cacheKey(input.domains.b.domain, {
      max_fetch_ms: opts.max_fetch_ms ?? 4500,
      checks: { well_known_mcp: Boolean(checks.well_known_mcp), homepage_html: Boolean(checks.homepage_html) },
    });

    const cachedA = await getCachedAudit(aKey);
    const cachedB = await getCachedAudit(bKey);

    const auditA =
      cachedA ??
      (await siteAuditAgentReadyFramework.handler({
        requestId: `${context.requestId}:audit:a`,
        input: auditInput(input.domains.a.domain),
        ip: context.ip,
        userAgent: context.userAgent,
      }));

    const auditB =
      cachedB ??
      (await siteAuditAgentReadyFramework.handler({
        requestId: `${context.requestId}:audit:b`,
        input: auditInput(input.domains.b.domain),
        ip: context.ip,
        userAgent: context.userAgent,
      }));

    // Cache for a short period to reduce repeated external fetches.
    if (!cachedA) await setCachedAudit(aKey, auditA, 300);
    if (!cachedB) await setCachedAudit(bKey, auditB, 300);

    const sigA = extractSignalsFromAudit(auditA);
    const sigB = extractSignalsFromAudit(auditB);

    const weights = deriveWeights(input.scenario, input.custom_weights);

    const labelA = input.domains.a.label ?? input.domains.a.domain;
    const labelB = input.domains.b.label ?? input.domains.b.domain;

    const candA: JsonValue = {
      id: "a",
      label: labelA,
      signals: {
        ...(sigA.trust_score !== undefined ? { trust_score: sigA.trust_score } : {}),
        availability: sigA.availability,
      },
    };
    const candB: JsonValue = {
      id: "b",
      label: labelB,
      signals: {
        ...(sigB.trust_score !== undefined ? { trust_score: sigB.trust_score } : {}),
        availability: sigB.availability,
      },
    };

    const simInput: JsonValue = {
      goal: input.goal ?? null,
      candidates: [candA, candB],
      weights,
      options: { normalize: true, explain: true },
    };

    const simOutput = await agentSelectionSimulateFramework.handler({
      requestId: `${context.requestId}:simulate`,
      input: simInput,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    const reportInput: JsonValue = {
      goal: input.goal ?? null,
      scenario: {
        name: input.scenario,
        weights,
      },
      subjects: {
        a: { id: "a", label: labelA, domain: input.domains.a.domain },
        b: { id: "b", label: labelB, domain: input.domains.b.domain },
      },
      audit: { a: auditA as unknown as JsonValue, b: auditB as unknown as JsonValue },
      simulation: { input: simInput, output: simOutput as unknown as JsonValue },
    };

    const report = await reportAgentSelectionV1Framework.handler({
      requestId: `${context.requestId}:report`,
      input: reportInput,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return {
      report: report as unknown as JsonValue,
      inputs: {
        scenario: input.scenario,
        domains: {
          a: { domain: input.domains.a.domain, label: input.domains.a.label ?? null },
          b: { domain: input.domains.b.domain, label: input.domains.b.label ?? null },
        },
      },
    };
  },
};
