import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "0.1.0";

type ToolDoc = {
  id: string;
  endpoint: string;
  methods: Array<"GET" | "POST">;
  input_fields_summary: Array<{ name: string; type: string; required: boolean; notes?: string }>;
  output_fields_summary: Array<{ name: string; type: string; notes?: string }>;
};

function tools(): ToolDoc[] {
  const list: ToolDoc[] = [
    {
      id: "ping",
      endpoint: "/api/frameworks/ping",
      methods: ["GET", "POST"],
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

