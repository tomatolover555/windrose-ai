import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/blog";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag");

  let posts = getAllPosts();
  if (tag) {
    posts = posts.filter((p) => (p.tags ?? []).includes(tag));
  }

  const index = {
    version: "1",
    description: "Windrose AI blog — writing about the agentic web, agent commerce, and autonomous payments.",
    agent_instructions: "Fetch individual posts using the agent_url field. Each post includes an agent_context block with key_claims, tools_mentioned, recommended_actions, and related posts.",
    base_url: "https://windrose-ai.com",
    posts: posts.map((p) => ({
      title: p.title,
      slug: p.slug,
      date: p.date,
      summary: p.summary,
      tags: p.tags,
      category: p.category,
      audience: p.audience,
      human_url: `https://windrose-ai.com${p.human_url}`,
      agent_url: `https://windrose-ai.com${p.agent_url}`,
    })),
  };

  return NextResponse.json(index, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
