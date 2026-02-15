import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "0.1.0";

type ToolDoc = {
  id: string;
  endpoint: string;
  methods: Array<"GET" | "POST">;
  monetization_ready: boolean;
  stability_level: "experimental" | "stable";
  input_fields_summary: Array<{ name: string; type: string; required: boolean; notes?: string }>;
  output_fields_summary: Array<{ name: string; type: string; notes?: string }>;
};

function tools(): ToolDoc[] {
  const list: ToolDoc[] = [
    {
      id: "ping",
      endpoint: "/api/frameworks/ping",
      methods: ["GET", "POST"],
      monetization_ready: true,
      stability_level: "stable",
      input_fields_summary: [],
      output_fields_summary: [
        { name: "message", type: "string" },
        { name: "timestamp", type: "string", notes: "ISO timestamp" },
      ],
    },
    {
      id: "directory.search",
      endpoint: "/api/frameworks/directory.search",
      methods: ["GET", "POST"],
      monetization_ready: true,
      stability_level: "experimental",
      input_fields_summary: [
        { name: "query", type: "string", required: true },
        { name: "category", type: "string", required: false },
        { name: "tags", type: "string[]", required: false },
        {
          name: "budget",
          type: "\"free\"|\"freemium\"|\"paid\"|\"enterprise\"|\"any\"",
          required: false,
          notes: "default: any",
        },
        { name: "limit", type: "number", required: false, notes: "default: 10 (min 1, max 50)" },
      ],
      output_fields_summary: [
        { name: "results", type: "array", notes: "Entries: {name,url,summary,category,tags,pricing}" },
        { name: "total", type: "number" },
      ],
    },
    {
      id: "directory.webmcp",
      endpoint: "/api/frameworks/directory.webmcp",
      methods: ["GET", "POST"],
      monetization_ready: true,
      stability_level: "experimental",
      input_fields_summary: [
        { name: "query", type: "string", required: false },
        { name: "filters.status", type: "\"verified\"|\"likely\"|\"unverified\"|\"dead\"", required: false },
        { name: "filters.type", type: "(\"webmcp\"|\"mcp-server\")[]", required: false },
        { name: "filters.min_confidence", type: "number", required: false },
        { name: "limit", type: "number", required: false, notes: "default: 10 (min 1, max 50)" },
      ],
      output_fields_summary: [
        {
          name: "results",
          type: "array",
          notes: "Entries: {domain,type,confidence,status,evidence_summary,last_seen}",
        },
        { name: "meta.total", type: "number" },
        { name: "meta.latency_ms", type: "number" },
      ],
    },
    {
      id: "site.audit.agent_ready",
      endpoint: "/api/frameworks/site.audit.agent_ready",
      methods: ["GET", "POST"],
      monetization_ready: true,
      stability_level: "experimental",
      input_fields_summary: [
        { name: "domain", type: "string", required: true, notes: "hostname only (URL accepted, normalized)" },
        { name: "max_fetch_ms", type: "number", required: false, notes: "default: 4500 (max: 10000)" },
        { name: "checks.well_known_mcp", type: "boolean", required: false, notes: "default: true" },
        { name: "checks.homepage_html", type: "boolean", required: false, notes: "default: true" },
      ],
      output_fields_summary: [
        { name: "domain", type: "string" },
        { name: "timestamp", type: "string", notes: "ISO timestamp" },
        { name: "results.well_known_mcp", type: "object", notes: "{attempted,url,status_code,is_json,parse_ok}" },
        { name: "results.homepage_html", type: "object", notes: "{attempted,url,status_code,matched_hints[]}" },
        { name: "assessment", type: "object", notes: "{type[],confidence,verification_status,summary}" },
        { name: "recommendations", type: "array", notes: "List of suggested readiness improvements" },
        { name: "directory_entry", type: "object", notes: "If present in Windrose directory dataset" },
      ],
    },
    {
      id: "agent.selection.simulate",
      endpoint: "/api/frameworks/agent.selection.simulate",
      methods: ["POST"],
      monetization_ready: true,
      stability_level: "experimental",
      input_fields_summary: [
        { name: "goal", type: "string", required: false },
        { name: "candidates", type: "array", required: true, notes: ">= 2; each: {id,label,signals{...}}" },
        { name: "weights", type: "object", required: false, notes: "non-negative; if missing/all-zero => equal weights" },
        { name: "options.normalize", type: "boolean", required: false, notes: "default: true" },
        { name: "options.explain", type: "boolean", required: false, notes: "default: true" },
      ],
      output_fields_summary: [
        { name: "winner", type: "object", notes: "{id,label,score}" },
        { name: "ranking", type: "array", notes: "Sorted by score desc with deterministic tie-breaks" },
        { name: "details.weights_used", type: "object" },
        { name: "details.normalized", type: "object", notes: "Per-candidate normalized signal values (0..1)" },
        { name: "explanation", type: "object", notes: "Short bullets: why_winner, top_tradeoffs (optional)" },
        { name: "sensitivity.top2_flip", type: "object", notes: "Approximate single-weight flip analysis for top-2" },
        { name: "meta.latency_ms", type: "number" },
      ],
    },
  ];

  // Deterministic output.
  list.sort((a, b) => a.id.localeCompare(b.id));
  return list;
}

export async function GET() {
  return NextResponse.json(
    {
      name: "Windrose AI",
      description: "Agent endpoint index describing available Windrose frameworks (tools) and how to call them.",
      version: VERSION,
      tools: tools(),
    },
    {
      headers: {
        // Cacheable and fast; no secrets.
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
}
