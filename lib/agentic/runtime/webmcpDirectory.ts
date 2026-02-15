import fs from "node:fs/promises";
import path from "node:path";
import type { AgenticFrameworkDefinition, AgenticResult, JsonValue } from "@/lib/agentic/types";

type Status = "verified" | "likely" | "unverified" | "dead";
type ItemType = "webmcp" | "mcp-server";

type DirectoryItem = {
  domain: string;
  type: ItemType[];
  confidence: number;
  status: Status;
  evidence: Array<{ kind: string }>;
  last_seen: string;
};

type DirectoryFile = { updated_at: string; items: DirectoryItem[] };

type Input = {
  query?: string;
  filters?: {
    status?: Status;
    type?: ItemType[];
    min_confidence?: number;
  };
  limit?: number;
};

declare global {
  var __windroseWebmcpDirectory: DirectoryFile | undefined;
}

async function loadDirectory(): Promise<DirectoryFile> {
  if (globalThis.__windroseWebmcpDirectory) return globalThis.__windroseWebmcpDirectory;
  const filePath = path.join(process.cwd(), "data", "webmcp_directory.json");
  const raw = await fs.readFile(filePath, "utf8");
  const json = JSON.parse(raw) as DirectoryFile;
  globalThis.__windroseWebmcpDirectory = json;
  return json;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function parseInput(input: JsonValue | null): Input {
  const obj = (input && typeof input === "object" && !Array.isArray(input) ? input : null) as
    | Record<string, unknown>
    | null;

  const query = typeof obj?.query === "string" ? obj.query : undefined;
  const limitRaw = typeof obj?.limit === "number" ? obj.limit : undefined;
  const limit = limitRaw !== undefined ? Math.max(1, Math.min(50, Math.floor(limitRaw))) : 10;

  const filtersObj =
    obj?.filters && typeof obj.filters === "object" && !Array.isArray(obj.filters)
      ? (obj.filters as Record<string, unknown>)
      : null;

  const status =
    filtersObj?.status === "verified" ||
    filtersObj?.status === "likely" ||
    filtersObj?.status === "unverified" ||
    filtersObj?.status === "dead"
      ? (filtersObj.status as Status)
      : undefined;

  const type = Array.isArray(filtersObj?.type)
    ? (filtersObj?.type.filter((t) => t === "webmcp" || t === "mcp-server") as ItemType[])
    : undefined;

  const minConfidence =
    typeof filtersObj?.min_confidence === "number" ? filtersObj.min_confidence : undefined;

  return {
    query,
    limit,
    filters: {
      ...(status ? { status } : {}),
      ...(type && type.length > 0 ? { type } : {}),
      ...(typeof minConfidence === "number" ? { min_confidence: minConfidence } : {}),
    },
  };
}

const STATUS_ORDER: Record<Status, number> = {
  verified: 0,
  likely: 1,
  unverified: 2,
  dead: 3,
};

function summarizeEvidenceKinds(item: DirectoryItem): string[] {
  const kinds = new Set(item.evidence.map((e) => String(e.kind)));
  return Array.from(kinds).sort();
}

function score(item: DirectoryItem, q: string | undefined): number {
  if (!q) return 0;
  const nq = normalize(q);
  if (normalize(item.domain).includes(nq)) return 50;
  const evidenceText = summarizeEvidenceKinds(item).join(" ");
  if (normalize(evidenceText).includes(nq)) return 10;
  return 0;
}

export const webmcpDirectoryFramework: AgenticFrameworkDefinition = {
  id: "directory.webmcp",
  name: "WebMCP Directory",
  description: "Query the WebMCP/MCP-enabled website directory dataset.",
  enabled: true,
  async handler(context): Promise<AgenticResult> {
    const start = Date.now();
    const input = parseInput(context.input);
    const data = await loadDirectory();

    const q = input.query?.trim();
    const status = input.filters?.status;
    const types = input.filters?.type;
    const minConfidence = input.filters?.min_confidence ?? 0;
    const limit = input.limit ?? 10;

    let items = data.items.slice();

    if (status) items = items.filter((i) => i.status === status);
    if (types && types.length > 0) {
      const wanted = new Set(types);
      items = items.filter((i) => i.type.some((t) => wanted.has(t)));
    }
    items = items.filter((i) => i.confidence >= minConfidence);

    if (q) {
      items = items
        .map((i) => ({ i, s: score(i, q) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s || a.i.domain.localeCompare(b.i.domain))
        .map((x) => x.i);
    }

    // Deterministic sort:
    // status, confidence desc, last_seen desc
    items.sort((a, b) => {
      const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (so !== 0) return so;
      const cd = b.confidence - a.confidence;
      if (cd !== 0) return cd;
      const ld = String(b.last_seen).localeCompare(String(a.last_seen));
      if (ld !== 0) return ld;
      return a.domain.localeCompare(b.domain);
    });

    const total = items.length;
    const results = items.slice(0, limit).map((i) => ({
      domain: i.domain,
      type: i.type,
      confidence: i.confidence,
      status: i.status,
      evidence_summary: summarizeEvidenceKinds(i),
      last_seen: i.last_seen,
    }));

    return {
      results,
      meta: {
        total,
        latency_ms: Date.now() - start,
      },
    };
  },
};

