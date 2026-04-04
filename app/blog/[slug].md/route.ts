import { NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blog";

export async function GET(
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx: unknown
) {
  // Extract slug from URL pathname: /blog/<slug>.md
  const pathname = new URL(req.url).pathname;
  // pathname is e.g. /blog/my-post.md — strip prefix and .md suffix
  const slug = pathname.replace(/^\/blog\//, "").replace(/\.md$/, "");
  const post = getPostBySlug(slug);

  if (!post) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(post.rawContent, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-Type": "agent-readable-post",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
