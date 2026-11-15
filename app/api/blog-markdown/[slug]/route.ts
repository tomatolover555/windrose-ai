import { NextResponse } from "next/server";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
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
