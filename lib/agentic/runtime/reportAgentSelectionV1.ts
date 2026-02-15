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

type Subject = { id: string; label: string; domain?: string | null };

type AuditLike = {
  domain?: string;
  results?: {
    well_known_mcp?: { parse_ok?: boolean | null; attempted?: boolean | null };
    homepage_html?: { matched_hints?: string[] | null; attempted?: boolean | null };
  };
  assessment?: { verification_status?: string; confidence?: number };
};

type SimulationOutputLike = {
  winner?: { id?: string; label?: string; score?: number };
  ranking?: Array<{ id?: string; label?: string; score?: number }>;
  details?: {
    weights_used?: Record<string, number>;
    normalized?: Record<string, Record<string, number>>;
  };
  sensitivity?: {
    top2_flip?: {
      signals_ranked_by_influence?: Array<{ signal?: string; delta_needed_in_weight?: number }>;
      note?: string;
    };
  };
};

type Input = {
  goal?: string;
  scenario?: { name?: string; weights?: Record<string, number> };
  subjects?: { a?: Subject; b?: Subject };
  audit?: { a?: AuditLike; b?: AuditLike };
  simulation?: { input?: JsonValue; output?: SimulationOutputLike };
};

function asObject(v: JsonValue | null): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function parseSubject(v: unknown): Subject | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const rec = v as Record<string, unknown>;
  const id = typeof rec.id === "string" ? rec.id : "";
  const label = typeof rec.label === "string" ? rec.label : "";
  const domain = typeof rec.domain === "string" ? rec.domain : null;
  if (!id || !label) return null;
  return { id, label, domain };
}

function parseInput(input: JsonValue | null): Input {
  const obj = asObject(input);
  if (!obj) throw new FrameworkHttpError(400, "invalid_input", "body must be a JSON object");

  const goal = typeof obj.goal === "string" ? obj.goal : undefined;

  const scenarioObj =
    obj.scenario && typeof obj.scenario === "object" && !Array.isArray(obj.scenario)
      ? (obj.scenario as Record<string, unknown>)
      : null;
  const scenarioName = typeof scenarioObj?.name === "string" ? (scenarioObj.name as string) : undefined;
  const scenarioWeights =
    scenarioObj?.weights && typeof scenarioObj.weights === "object" && !Array.isArray(scenarioObj.weights)
      ? (scenarioObj.weights as Record<string, unknown>)
      : undefined;
  const weights: Record<string, number> | undefined = scenarioWeights
    ? Object.fromEntries(
        Object.entries(scenarioWeights).map(([k, v]) => {
          if (!isFiniteNumber(v) || v < 0) {
            throw new FrameworkHttpError(400, "invalid_weights", `scenario.weights.${k} must be non-negative`);
          }
          return [k, v];
        }),
      )
    : undefined;

  const subjectsObj =
    obj.subjects && typeof obj.subjects === "object" && !Array.isArray(obj.subjects)
      ? (obj.subjects as Record<string, unknown>)
      : null;
  const subjects: { a?: Subject; b?: Subject } = {};
  const subjA = parseSubject(subjectsObj?.a);
  const subjB = parseSubject(subjectsObj?.b);
  if (subjA) subjects.a = subjA;
  if (subjB) subjects.b = subjB;

  const auditObj =
    obj.audit && typeof obj.audit === "object" && !Array.isArray(obj.audit)
      ? (obj.audit as Record<string, unknown>)
      : null;
  const auditA = auditObj?.a as unknown;
  const auditB = auditObj?.b as unknown;
  if (!auditA || !auditB) throw new FrameworkHttpError(400, "missing_audit", "audit.a and audit.b are required");

  const simulationObj =
    obj.simulation && typeof obj.simulation === "object" && !Array.isArray(obj.simulation)
      ? (obj.simulation as Record<string, unknown>)
      : null;
  const simOut = simulationObj?.output as unknown;
  if (!simOut) throw new FrameworkHttpError(400, "missing_simulation_output", "simulation.output is required");

  return {
    goal,
    scenario: { name: scenarioName, weights },
    subjects,
    audit: { a: auditA as AuditLike, b: auditB as AuditLike },
    simulation: { input: (simulationObj?.input as JsonValue) ?? null, output: simOut as SimulationOutputLike },
  };
}

function uniqSorted(xs: string[]): string[] {
  return Array.from(new Set(xs.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function auditSummary(audit: AuditLike): {
  verification_status: string;
  confidence: number;
  proof_types: string[];
  key_hints: string[];
} {
  const verification_status = typeof audit.assessment?.verification_status === "string" ? audit.assessment.verification_status : "unverified";
  const confidence = isFiniteNumber(audit.assessment?.confidence) ? (audit.assessment!.confidence as number) : 0;

  const proofTypes: string[] = [];
  const parseOk = Boolean(audit.results?.well_known_mcp?.parse_ok);
  if (parseOk) proofTypes.push("well_known");

  const hints = Array.isArray(audit.results?.homepage_html?.matched_hints)
    ? audit.results!.homepage_html!.matched_hints!
    : [];
  if (hints.length > 0) proofTypes.push("homepage_hints");

  return {
    verification_status,
    confidence: Math.max(0, Math.min(100, Math.floor(confidence))),
    proof_types: uniqSorted(proofTypes),
    key_hints: uniqSorted(hints.map(String)).slice(0, 10),
  };
}

function computeTopDrivers(sim: SimulationOutputLike, winnerId: string, loserId: string): Array<{
  signal: string;
  winner_advantage: number;
  note: string;
}> {
  const weights = sim.details?.weights_used ?? {};
  const normalized = sim.details?.normalized ?? {};
  const wRow = normalized[winnerId] ?? {};
  const lRow = normalized[loserId] ?? {};

  const keys = uniqSorted([...Object.keys(weights), ...Object.keys(wRow), ...Object.keys(lRow)]);
  const drivers = keys
    .map((k) => {
      const w = isFiniteNumber(weights[k]) ? (weights[k] as number) : 0;
      const a = isFiniteNumber(wRow[k]) ? (wRow[k] as number) : 0.5;
      const b = isFiniteNumber(lRow[k]) ? (lRow[k] as number) : 0.5;
      const delta = a - b;
      const contribDelta = w * delta;
      return { k, contribDelta, delta };
    })
    .filter((x) => x.contribDelta !== 0)
    .sort((a, b) => Math.abs(b.contribDelta) - Math.abs(a.contribDelta) || a.k.localeCompare(b.k))
    .slice(0, 3)
    .map((x) => ({
      signal: x.k,
      winner_advantage: Number(x.contribDelta.toFixed(6)),
      note: "normalized contribution difference",
    }));

  return drivers;
}

function recommendationsFrom(
  auditWinner: ReturnType<typeof auditSummary>,
  auditLoser: ReturnType<typeof auditSummary>,
  simDrivers: Array<{ signal: string; winner_advantage: number }>,
): Array<{
  title: string;
  applies_to: "winner" | "loser" | "both";
  why_it_matters: string;
  what_to_change: string;
  expected_impact: "high" | "medium" | "low";
  maps_to_signal: string[];
}> {
  const recs: Array<{
    title: string;
    applies_to: "winner" | "loser" | "both";
    why_it_matters: string;
    what_to_change: string;
    expected_impact: "high" | "medium" | "low";
    maps_to_signal: string[];
  }> = [];

  // Evidence-based recommendations (primarily for the loser).
  const loserHasWellKnown = auditLoser.proof_types.includes("well_known");
  const loserHasModelContext = auditLoser.key_hints.includes("navigator.modelContext");
  if (!loserHasWellKnown) {
    recs.push({
      title: "Publish MCP discovery manifest",
      applies_to: "loser",
      why_it_matters: "A well-known MCP manifest provides a machine-readable trust and capability anchor.",
      what_to_change: "Serve JSON at /.well-known/mcp.json and keep it stable.",
      expected_impact: "high",
      maps_to_signal: ["trust_score", "availability", "discoverability"],
    });
  }
  if (!loserHasModelContext) {
    recs.push({
      title: "Expose an agent-facing capability index",
      applies_to: "loser",
      why_it_matters: "Agents choose faster when tools and inputs/outputs are discoverable.",
      what_to_change: "Add an /api/agent-style index and a /api/context surface for key routes.",
      expected_impact: "medium",
      maps_to_signal: ["trust_score", "availability", "discoverability"],
    });
  }

  // Trust gap style recommendation if the simulation suggests trust_score is a major driver.
  const trustDriver = simDrivers.find((d) => d.signal === "trust_score");
  if (trustDriver && trustDriver.winner_advantage > 0) {
    recs.push({
      title: "Publish structured trust signals",
      applies_to: "loser",
      why_it_matters: "If trust is a key driver, transparent guarantees and uptime/SLA reduce decision friction.",
      what_to_change: "Publish refund policy, uptime/SLA, and support expectations in a structured, machine-readable way.",
      expected_impact: "medium",
      maps_to_signal: ["trust_score", "refund_policy", "availability"],
    });
  }

  // If winner is missing strong evidence too, recommend both.
  const winnerHasWellKnown = auditWinner.proof_types.includes("well_known");
  const winnerHasModelContext = auditWinner.key_hints.includes("navigator.modelContext");
  if (!winnerHasWellKnown && !winnerHasModelContext) {
    recs.push({
      title: "Add basic agent readiness signals",
      applies_to: "both",
      why_it_matters: "Without a manifest or WebMCP hints, agents have little to verify or integrate.",
      what_to_change: "Add either a well-known manifest or clear WebMCP integration hints + a capability index.",
      expected_impact: "high",
      maps_to_signal: ["discoverability", "trust_score"],
    });
  }

  // Deterministic ordering.
  recs.sort((a, b) => {
    const ap = a.applies_to.localeCompare(b.applies_to);
    if (ap !== 0) return ap;
    return a.title.localeCompare(b.title);
  });

  return recs.slice(0, 6);
}

export const reportAgentSelectionV1Framework: AgenticFrameworkDefinition = {
  id: "report.agent_selection.v1",
  name: "Agent Selection Report (v1)",
  description: "Deterministic formatter for audit + simulation inputs into a structured selection report (no fetch).",
  enabled: true,
  async handler(context): Promise<AgenticResult> {
    const input = parseInput(context.input);

    const sim = input.simulation?.output as SimulationOutputLike;
    const winnerId = typeof sim.winner?.id === "string" ? sim.winner.id : null;
    if (!winnerId) throw new FrameworkHttpError(400, "invalid_simulation_output", "simulation.output.winner.id is required");

    const ranking = Array.isArray(sim.ranking) ? sim.ranking : [];
    const loserId = ranking.find((r) => r && typeof r.id === "string" && r.id !== winnerId)?.id ?? null;
    if (!loserId) throw new FrameworkHttpError(400, "invalid_simulation_output", "simulation.output.ranking must include at least two candidates");

    const subjA = input.subjects?.a;
    const subjB = input.subjects?.b;
    const subjectsById = new Map<string, Subject>();
    if (subjA?.id) subjectsById.set(subjA.id, subjA);
    if (subjB?.id) subjectsById.set(subjB.id, subjB);

    const winnerSubj: Subject = subjectsById.get(winnerId) ?? { id: winnerId, label: sim.winner?.label ?? winnerId, domain: null };
    const loserSubj: Subject = subjectsById.get(loserId) ?? { id: loserId, label: ranking.find((r) => r.id === loserId)?.label ?? loserId, domain: null };

    const auditA = input.audit!.a!;
    const auditB = input.audit!.b!;
    const auditASummary = auditSummary(auditA);
    const auditBSummary = auditSummary(auditB);

    // Map audits to winner/loser when possible; fallback is deterministic.
    const winnerAuditSummary =
      winnerId === subjA?.id ? auditASummary : winnerId === subjB?.id ? auditBSummary : auditASummary;
    const loserAuditSummary =
      loserId === subjA?.id ? auditASummary : loserId === subjB?.id ? auditBSummary : auditBSummary;

    const weightsUsed = sim.details?.weights_used ?? input.scenario?.weights ?? {};
    const weightsSorted: Record<string, number> = {};
    for (const k of uniqSorted(Object.keys(weightsUsed))) {
      const v = weightsUsed[k];
      if (isFiniteNumber(v)) weightsSorted[k] = Number(v.toFixed(6));
    }

    const winnerScore = isFiniteNumber(sim.winner?.score) ? (sim.winner!.score as number) : null;
    const loserScore = isFiniteNumber(ranking.find((r) => r.id === loserId)?.score)
      ? (ranking.find((r) => r.id === loserId)!.score as number)
      : null;

    const topDrivers = computeTopDrivers(sim, winnerId, loserId);
    const tradeoffs: string[] = [];
    for (const d of topDrivers) {
      if (d.winner_advantage < 0) tradeoffs.push(`Winner is weaker on ${d.signal} under current weights.`);
    }

    const exec: string[] = [];
    exec.push(`Winner: ${winnerSubj.label} (${winnerSubj.id}).`);
    if (winnerScore !== null && loserScore !== null) {
      exec.push(`Simulated scores: winner ${winnerScore.toFixed(3)} vs loser ${loserScore.toFixed(3)}.`);
    }
    if (topDrivers.length > 0) {
      exec.push(`Top drivers: ${topDrivers.map((d) => d.signal).join(", ")}.`);
    }
    exec.push(
      `Audit: winner ${winnerAuditSummary.verification_status} (${winnerAuditSummary.confidence}/100), loser ${loserAuditSummary.verification_status} (${loserAuditSummary.confidence}/100).`,
    );
    if (!loserAuditSummary.proof_types.includes("well_known")) {
      exec.push("Loser is missing a strong MCP manifest signal (/.well-known/mcp.json).");
    }
    const executive_summary = exec.slice(0, 6);

    const recs = recommendationsFrom(winnerAuditSummary, loserAuditSummary, topDrivers);

    const nextSteps = uniqSorted([
      "Re-run the audit after changes to validate verification signals.",
      "Align weights with the real selection goal (cost vs trust vs latency).",
      "Publish machine-readable trust and capability signals to reduce agent uncertainty.",
    ]).slice(0, 5);

    const report: AgenticResult = {
      report_version: "v1",
      created_at: null,
      goal: input.goal ?? null,
      scenario: {
        name: input.scenario?.name ?? null,
        weights: weightsSorted,
      },
      subjects: {
        winner: {
          id: winnerSubj.id,
          label: winnerSubj.label,
          domain: winnerSubj.domain ?? null,
        },
        loser: {
          id: loserSubj.id,
          label: loserSubj.label,
          domain: loserSubj.domain ?? null,
        },
      },
      executive_summary,
      evidence: {
        audit_summary: {
          a: auditASummary,
          b: auditBSummary,
        },
        simulation_summary: {
          winner_score: winnerScore !== null ? Number(winnerScore.toFixed(6)) : null,
          loser_score: loserScore !== null ? Number(loserScore.toFixed(6)) : null,
          top_drivers: topDrivers,
          top_tradeoffs: tradeoffs.length > 0 ? tradeoffs.slice(0, 3) : ["No major tradeoffs surfaced in the top drivers."],
          sensitivity: sim.sensitivity?.top2_flip ?? { signals_ranked_by_influence: [], note: "Not available." },
        },
      },
      recommendations: recs,
      next_steps: nextSteps,
    };

    return report;
  },
};
