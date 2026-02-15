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

type Candidate = {
  id: string;
  label: string;
  signals: Record<string, number | boolean>;
};

type Options = {
  normalize?: boolean;
  explain?: boolean;
};

type Input = {
  goal?: string;
  candidates: Candidate[];
  weights?: Record<string, number>;
  options?: Options;
};

const LOWER_IS_BETTER = new Set<string>(["price", "latency_ms"]);
const HIGHER_IS_BETTER = new Set<string>(["trust_score"]);

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function asObject(input: JsonValue | null): Record<string, unknown> | null {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : null;
}

function parseInput(input: JsonValue | null): Input {
  const obj = asObject(input);
  if (!obj) throw new FrameworkHttpError(400, "invalid_input", "body must be a JSON object");

  const goal = typeof obj.goal === "string" ? obj.goal : undefined;

  if (!Array.isArray(obj.candidates)) {
    throw new FrameworkHttpError(400, "invalid_candidates", "candidates must be an array");
  }
  if (obj.candidates.length < 2) {
    throw new FrameworkHttpError(400, "invalid_candidates", "candidates length must be >= 2");
  }

  const candidates: Candidate[] = obj.candidates.map((c, idx) => {
    const co = c && typeof c === "object" && !Array.isArray(c) ? (c as Record<string, unknown>) : null;
    if (!co) throw new FrameworkHttpError(400, "invalid_candidate", `candidate[${idx}] must be an object`);
    const id = typeof co.id === "string" ? co.id : "";
    const label = typeof co.label === "string" ? co.label : "";
    const sigObj =
      co.signals && typeof co.signals === "object" && !Array.isArray(co.signals)
        ? (co.signals as Record<string, unknown>)
        : null;
    if (!id) throw new FrameworkHttpError(400, "invalid_candidate", `candidate[${idx}].id is required`);
    if (!label) throw new FrameworkHttpError(400, "invalid_candidate", `candidate[${idx}].label is required`);
    if (!sigObj) throw new FrameworkHttpError(400, "invalid_candidate", `candidate[${idx}].signals is required`);

    const signals: Record<string, number | boolean> = {};
    for (const [k, v] of Object.entries(sigObj)) {
      if (typeof v === "boolean") {
        signals[k] = v;
      } else if (isFiniteNumber(v)) {
        signals[k] = v;
      } else {
        throw new FrameworkHttpError(
          400,
          "invalid_signal_value",
          `candidate[${idx}].signals.${k} must be boolean or finite number`,
        );
      }
    }

    return { id, label, signals };
  });

  // Basic duplicate ID guard to keep output deterministic.
  const ids = candidates.map((c) => c.id);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new FrameworkHttpError(400, "duplicate_candidate_id", "candidate ids must be unique");
  }

  let weights: Record<string, number> | undefined;
  if (obj.weights !== undefined) {
    const wo = obj.weights && typeof obj.weights === "object" && !Array.isArray(obj.weights) ? obj.weights : null;
    if (!wo) throw new FrameworkHttpError(400, "invalid_weights", "weights must be an object");
    weights = {};
    for (const [k, v] of Object.entries(wo as Record<string, unknown>)) {
      if (!isFiniteNumber(v) || v < 0) {
        throw new FrameworkHttpError(400, "invalid_weights", `weights.${k} must be a non-negative number`);
      }
      weights[k] = v;
    }
  }

  const optObj =
    obj.options && typeof obj.options === "object" && !Array.isArray(obj.options)
      ? (obj.options as Record<string, unknown>)
      : null;

  const options: Options = {
    normalize: typeof optObj?.normalize === "boolean" ? (optObj.normalize as boolean) : true,
    explain: typeof optObj?.explain === "boolean" ? (optObj.explain as boolean) : true,
  };

  return { goal, candidates, weights, options };
}

function unionSignalKeys(candidates: Candidate[]): string[] {
  const set = new Set<string>();
  for (const c of candidates) {
    for (const k of Object.keys(c.signals)) set.add(k);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function normalizeSignals(
  candidates: Candidate[],
  keys: string[],
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};

  for (const c of candidates) out[c.id] = {};

  for (const key of keys) {
    const values: Array<number | null> = candidates.map((c) => {
      const v = c.signals[key];
      if (typeof v === "boolean") return v ? 1 : 0;
      if (typeof v === "number") return v;
      return null;
    });

    const present = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const min = present.length > 0 ? Math.min(...present) : 0;
    const max = present.length > 0 ? Math.max(...present) : 0;
    const span = max - min;

    for (let i = 0; i < candidates.length; i++) {
      const raw = values[i];
      // Missing -> neutral 0.5 (deterministic, avoids penalizing sparse signals too harshly).
      let n = raw === null ? 0.5 : span === 0 ? 0.5 : (raw - min) / span;

      if (LOWER_IS_BETTER.has(key)) n = 1 - n;
      // Explicit set for higher-is-better kept as-is; anything else is treated as higher-is-better by default.
      if (HIGHER_IS_BETTER.has(key)) n = n;

      // Clamp for safety.
      if (!Number.isFinite(n)) n = 0.5;
      n = Math.max(0, Math.min(1, n));
      out[candidates[i]!.id]![key] = n;
    }
  }

  return out;
}

function weightsUsed(inputWeights: Record<string, number> | undefined, keys: string[]): Record<string, number> {
  if (!inputWeights) {
    const w: Record<string, number> = {};
    for (const k of keys) w[k] = 1;
    return w;
  }

  let sum = 0;
  for (const v of Object.values(inputWeights)) sum += v;
  if (sum <= 0) {
    const w: Record<string, number> = {};
    for (const k of keys) w[k] = 1;
    return w;
  }

  // Only use keys explicitly provided; missing keys default to 0.
  const w: Record<string, number> = {};
  for (const k of keys) w[k] = isFiniteNumber(inputWeights[k]) ? inputWeights[k]! : 0;
  return w;
}

function scoreCandidates(
  candidates: Candidate[],
  keys: string[],
  normalized: Record<string, Record<string, number>>,
  weights: Record<string, number>,
): Array<{ id: string; label: string; score: number }> {
  const sumW = keys.reduce((acc, k) => acc + (weights[k] ?? 0), 0);
  const denom = sumW > 0 ? sumW : 1;

  return candidates.map((c) => {
    let num = 0;
    for (const k of keys) {
      const w = weights[k] ?? 0;
      const v = normalized[c.id]?.[k] ?? 0.5;
      num += w * v;
    }
    const score = num / denom;
    return { id: c.id, label: c.label, score: Number(score.toFixed(6)) };
  });
}

function rawNumberOrNull(c: Candidate, key: string): number | null {
  const v = c.signals[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function sortRanking(
  ranking: Array<{ id: string; label: string; score: number }>,
  candidatesById: Map<string, Candidate>,
): Array<{ id: string; label: string; score: number }> {
  return ranking.slice().sort((a, b) => {
    const sd = b.score - a.score;
    if (sd !== 0) return sd;

    const ca = candidatesById.get(a.id);
    const cb = candidatesById.get(b.id);

    const ta = ca ? rawNumberOrNull(ca, "trust_score") : null;
    const tb = cb ? rawNumberOrNull(cb, "trust_score") : null;
    if (ta !== null && tb !== null && ta !== tb) return tb - ta;
    if (ta !== null && tb === null) return -1;
    if (ta === null && tb !== null) return 1;

    const pa = ca ? rawNumberOrNull(ca, "price") : null;
    const pb = cb ? rawNumberOrNull(cb, "price") : null;
    if (pa !== null && pb !== null && pa !== pb) return pa - pb;
    if (pa !== null && pb === null) return -1;
    if (pa === null && pb !== null) return 1;

    return a.id.localeCompare(b.id);
  });
}

function buildExplanation(
  explain: boolean,
  keys: string[],
  weights: Record<string, number>,
  normalized: Record<string, Record<string, number>>,
  winnerId: string,
  runnerUpId: string | null,
): { why_winner: string[]; top_tradeoffs: string[] } | null {
  if (!explain) return null;

  const diffs = keys
    .map((k) => {
      const w = weights[k] ?? 0;
      const a = normalized[winnerId]?.[k] ?? 0.5;
      const b = runnerUpId ? (normalized[runnerUpId]?.[k] ?? 0.5) : 0.5;
      const d = a - b;
      const influence = Math.abs(d) * w;
      return { k, d, influence, a, b, w };
    })
    .sort((x, y) => y.influence - x.influence || x.k.localeCompare(y.k));

  const top = diffs.filter((x) => x.w > 0).slice(0, 3);
  const why = top.map((x) => {
    const dir = x.d >= 0 ? "stronger" : "weaker";
    return `Signal ${x.k} was ${dir} for the winner (normalized ${x.a.toFixed(2)} vs ${x.b.toFixed(2)}) with weight ${x.w}.`;
  });

  const tradeoffs = diffs
    .filter((x) => x.w > 0 && x.d < 0)
    .slice(0, 3)
    .map((x) => `Winner trades off on ${x.k} (normalized ${x.a.toFixed(2)} vs ${x.b.toFixed(2)}).`);

  const why_winner = why.length > 0 ? why : ["Winner had the highest weighted normalized score."];
  const top_tradeoffs = tradeoffs.length > 0 ? tradeoffs : ["No major tradeoffs vs the runner-up under current weights."];

  return { why_winner: why_winner.slice(0, 6), top_tradeoffs: top_tradeoffs.slice(0, 6) };
}

function buildSensitivity(
  keys: string[],
  weights: Record<string, number>,
  normalized: Record<string, Record<string, number>>,
  top1: string,
  top2: string,
): {
  top2_flip: { signals_ranked_by_influence: Array<{ signal: string; delta_needed_in_weight: number }>; note: string };
} {
  const sumW = keys.reduce((acc, k) => acc + (weights[k] ?? 0), 0);
  const denom = sumW > 0 ? sumW : 1;

  // Numerator difference between #1 and #2.
  let numDiff = 0;
  for (const k of keys) {
    const w = weights[k] ?? 0;
    const a = normalized[top1]?.[k] ?? 0.5;
    const b = normalized[top2]?.[k] ?? 0.5;
    numDiff += w * (a - b);
  }
  const scoreDiff = numDiff / denom;

  const ranked = keys
    .map((k) => {
      const a = normalized[top1]?.[k] ?? 0.5;
      const b = normalized[top2]?.[k] ?? 0.5;
      const d = a - b;
      // Only consider signals where #2 is better (d < 0): increasing weight could flip.
      if (d >= 0) return null;
      const delta = numDiff > 0 ? numDiff / (-d) : 0;
      const deltaNeeded = Number(delta.toFixed(6));
      return { signal: k, delta_needed_in_weight: deltaNeeded };
    })
    .filter((x): x is { signal: string; delta_needed_in_weight: number } => Boolean(x))
    .sort((a, b) => a.delta_needed_in_weight - b.delta_needed_in_weight || a.signal.localeCompare(b.signal))
    .slice(0, 5);

  return {
    top2_flip: {
      signals_ranked_by_influence: ranked,
      note: `Approximate: compares only top-2. Current score gap is ${scoreDiff.toFixed(6)}; estimates ignore denominator effects.`,
    },
  };
}

export const agentSelectionSimulateFramework: AgenticFrameworkDefinition = {
  id: "agent.selection.simulate",
  name: "Decision Simulator",
  description:
    "Deterministic simulation of agent selection from structured candidates + weights (no ML, no external fetch).",
  enabled: true,
  async handler(context): Promise<AgenticResult> {
    const input = parseInput(context.input);

    const goal = input.goal ?? null;
    const candidates = input.candidates;
    const keys = unionSignalKeys(candidates);
    if (keys.length === 0) {
      throw new FrameworkHttpError(400, "invalid_signals", "at least one signal key is required across candidates");
    }

    const opts = input.options ?? { normalize: true, explain: true };
    if (!opts.normalize) {
      // Kept as a future escape hatch; for v0.1 we only support normalized comparisons.
      throw new FrameworkHttpError(400, "unsupported_option", "options.normalize=false is not supported");
    }

    const normalized = normalizeSignals(candidates, keys);
    const wUsed = weightsUsed(input.weights, keys);

    // Validate weights are not all zero after mapping.
    const sumW = keys.reduce((acc, k) => acc + (wUsed[k] ?? 0), 0);
    if (sumW <= 0) {
      throw new FrameworkHttpError(400, "invalid_weights", "weights must have a positive sum");
    }

    const scored = scoreCandidates(candidates, keys, normalized, wUsed);
    const byId = new Map(candidates.map((c) => [c.id, c] as const));
    const ranking = sortRanking(scored, byId);

    const winner = ranking[0]!;
    const runnerUp = ranking.length > 1 ? ranking[1] : null;

    const explanation = buildExplanation(
      Boolean(opts.explain),
      keys,
      wUsed,
      normalized,
      winner.id,
      runnerUp?.id ?? null,
    );

    const sensitivity =
      runnerUp?.id
        ? buildSensitivity(keys, wUsed, normalized, winner.id, runnerUp.id)
        : {
            top2_flip: {
              signals_ranked_by_influence: [],
              note: "Not available: fewer than 2 candidates.",
            },
          };

    // Deterministic key ordering for weights_used and normalized.
    const weightsUsedSorted: Record<string, number> = {};
    for (const k of keys) weightsUsedSorted[k] = Number((wUsed[k] ?? 0).toFixed(6));

    const normalizedSorted: Record<string, Record<string, number>> = {};
    for (const c of candidates.slice().sort((a, b) => a.id.localeCompare(b.id))) {
      const row: Record<string, number> = {};
      for (const k of keys) row[k] = Number((normalized[c.id]?.[k] ?? 0.5).toFixed(6));
      normalizedSorted[c.id] = row;
    }

    const out: AgenticResult = {
      goal,
      winner,
      ranking,
      details: {
        weights_used: weightsUsedSorted,
        normalized: normalizedSorted,
      },
      sensitivity,
      meta: {
        version: "0.1.0",
        scoring_model_id: "weighted-normalized-v1",
        normalization_enabled: true,
      },
    };

    if (explanation) out.explanation = explanation as unknown as JsonValue;

    return out;
  },
};
