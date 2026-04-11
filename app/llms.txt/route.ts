import { NextResponse } from "next/server";

export async function GET() {
  const text = `# Windrose AI

Windrose AI is an experimental platform for the agentic web — exploring how AI agents interact with digital products, commerce, and information.

## Blog

Windrose publishes writing about the agentic web at /blog/.

Topics covered:
- What the agentic web is and why it matters
- How to build stores and products that serve AI agents
- The x402 payment protocol for autonomous agent transactions
- Agent discovery, authentication, and commerce patterns

Agent-readable blog index: https://windrose-ai.com/blog/agent.json
Each post has a machine-readable version at /blog/[slug].md
Each post also has a structured JSON version at /blog/[slug].json

## Agent API

The Windrose agent API is at /api/agent.
It exposes structured surfaces for agent interaction and discovery.

## Principles

- Machine-readable by default
- Agent-first design
- Structured data over prose where possible
`;

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
