import { NextResponse } from "next/server";

export async function GET() {
  const doc = {
    version: "1",
    name: "Windrose AI Blog",
    description: "A publication about the agentic web — agent commerce, autonomous payments, and what the internet looks like when AI agents become dominant users.",
    topics: [
      "agentic-web",
      "agent-commerce",
      "autonomous-payments",
      "x402-protocol",
      "agent-accessible-stores",
      "llm-agents",
    ],
    agent_index: "https://windrose-ai.com/blog/agent.json",
    agent_index_filtered_example: "https://windrose-ai.com/blog/agent.json?tag=autonomous-payments",
    post_format: "markdown-with-frontmatter",
    agent_context_block: true,
    human_base_url: "https://windrose-ai.com/blog",
    contact: "windrose-ai.com",
  };

  return NextResponse.json(doc, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
