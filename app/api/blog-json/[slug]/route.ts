import { NextResponse } from "next/server";
import { affiliateLinksForPost } from "@/lib/affiliates";
import { getPostBySlug, getRelatedPosts } from "@/lib/blog";
import { author } from "@/lib/site";

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

  const relatedPosts = getRelatedPosts(post).map((related) => ({
    title: related.title,
    slug: related.slug,
    url: `https://windrose-ai.com/blog/${related.slug}`,
  }));
  const affiliatePrograms = affiliateLinksForPost(post).map((program) => program.id);

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
      author: author.name,
      contentMarkdown: post.content,
      headings: parseHeadings(post.content),
      tags: post.tags ?? [],
      category: post.category ?? null,
      postType: post.postType ?? null,
      commercialIntent: post.commercialIntent === true ? true : null,
      hasAffiliateLinks: affiliatePrograms.length > 0,
      affiliatePrograms,
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
