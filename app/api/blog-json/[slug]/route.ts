import { NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blog";

function normalizeRelatedSlug(value: string): string {
  return value
    .trim()
    .replace(/^\/blog\//, "")
    .replace(/\.(mdx|md)$/, "");
}

function parseHeadings(content: string) {
  return content
    .split("\n")
    .map((line) => line.match(/^(#{1,6})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      level: match[1].length,
      text: match[2]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_`#>~-]/g, "")
        .trim(),
    }))
    .filter((heading) => heading.text.length > 0);
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

  const relatedPosts = [...new Set((post.agent_context?.related ?? []).map(normalizeRelatedSlug))]
    .filter((relatedSlug) => relatedSlug && relatedSlug !== post.slug)
    .map((relatedSlug) => {
      const relatedPost = getPostBySlug(relatedSlug);
      return {
        title: relatedPost?.title ?? null,
        slug: relatedSlug,
        url: `https://windrose-ai.com/blog/${relatedSlug}`,
      };
    });

  return NextResponse.json(
    {
      format: "post-json-v1",
      site: "Windrose AI",
      title: post.title,
      slug: post.slug,
      url: `https://windrose-ai.com${post.human_url}`,
      canonicalUrl: post.canonical,
      publishedAt: post.date,
      updatedAt: post.updated ?? null,
      summary: post.summary,
      contentMarkdown: post.content,
      headings: parseHeadings(post.content),
      tags: post.tags ?? [],
      category: post.category ?? null,
      postType: post.postType ?? null,
      commercialIntent: post.commercialIntent === true ? true : null,
      hasAffiliateLinks: post.hasAffiliateLinks === true,
      affiliatePrograms: post.affiliatePrograms ?? [],
      eligibleModules: post.eligibleModules ?? [],
      relatedPosts,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
