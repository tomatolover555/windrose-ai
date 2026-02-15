import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ContextResponse = {
  title: string;
  purpose: string;
  key_actions: string[];
  relevant_tools: string[];
};

function getContext(path: string): ContextResponse | null {
  switch (path) {
    case "/":
      return {
        title: "Windrose AI",
        purpose:
          "Landing page for Windrose AI. Provides pointers to the canonical agent index and route context endpoint.",
        key_actions: [
          "Discover tools via /api/agent",
          "Call a tool via /api/frameworks/<id>",
          "Check service health via /api/tools/v1/health",
        ],
        relevant_tools: ["ping", "directory.search", "directory.webmcp"],
      };
    case "/dashboard":
      return {
        title: "Framework Activity Dashboard",
        purpose:
          "Protected dashboard listing recent framework executions. Requires ADMIN_TOKEN; does not expose logs via /api/context.",
        key_actions: [
          "If authorized, open /dashboard in a browser with token to view recent executions",
          "For programmatic usage, prefer /api/frameworks/<id> and inspect responses",
        ],
        relevant_tools: ["ping", "directory.search", "directory.webmcp"],
      };
    case "/webmcp-directory":
      return {
        title: "WebMCP Directory (Placeholder)",
        purpose:
          "Future human-readable listing of the WebMCP/MCP-enabled website directory. Phase 2; not implemented yet.",
        key_actions: [
          "Use the agent endpoint /api/frameworks/directory.webmcp to query the dataset",
          "Use /api/agent for the canonical tool index",
        ],
        relevant_tools: ["directory.webmcp"],
      };
    default:
      return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const requested = url.searchParams.get("path") ?? "/";
  const ctx = getContext(requested);
  if (!ctx) {
    return NextResponse.json(
      { error: "unknown_path" },
      {
        status: 404,
        headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400" },
      },
    );
  }

  return NextResponse.json(ctx, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}

