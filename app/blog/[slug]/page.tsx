import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog";

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} — Windrose AI`,
    description: post.summary,
    alternates: { canonical: post.canonical },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const metaSans: React.CSSProperties = {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "0.7rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "#6b7f96",
  };

  return (
    <article>
      {/* Meta line */}
      <div style={{ ...metaSans, display: "flex", alignItems: "center", flexWrap: "wrap" as const, gap: "0.5em", marginBottom: "1rem" }}>
        <time dateTime={post.date}>
          {new Date(post.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        <span style={{ color: "#b8941e" }}>★</span>
        <span>{post.reading_time_minutes} min read</span>
        <span style={{ color: "#b8941e" }}>★</span>
        <Link
          href={post.agent_url}
          title="Agent-readable markdown"
          style={{ color: "#6b7f96", textDecoration: "none", letterSpacing: "0.1em" }}
        >
          For AI agents ↗
        </Link>
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontWeight: "700",
          fontSize: "2rem",
          lineHeight: "1.2",
          color: "#1b3a6b",
          marginBottom: "0.85rem",
          letterSpacing: "-0.01em",
        }}
      >
        {post.title}
      </h1>

      {/* Summary lede — italic, set apart with dotted rule below */}
      <p
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          fontSize: "1.1rem",
          lineHeight: "1.65",
          color: "#4a4a4a",
          marginBottom: "1.75rem",
          paddingBottom: "1.75rem",
          borderBottom: "1px dotted #ccc8bf",
        }}
      >
        {post.summary}
      </p>

      {/* Body */}
      <div className="prose prose-windrose max-w-none">
        <MDXRemote source={post.content} />
      </div>

      {/* Post footer */}
      <div
        style={{
          marginTop: "3rem",
          paddingTop: "1.25rem",
          borderTop: "1px dotted #ccc8bf",
        }}
      >
        {/* Tags */}
        {post.tags.length > 0 && (
          <div
            style={{
              ...metaSans,
              color: "#6b7f96",
              marginBottom: "1rem",
            }}
          >
            {post.tags.join("  ·  ")}
          </div>
        )}

        {/* Affiliate disclosure */}
        {post.affiliate_links.length > 0 && (
          <p
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: "0.75rem",
              color: "#6b7f96",
              marginBottom: "1.25rem",
            }}
          >
            This post contains affiliate links. Windrose may earn a commission if you purchase through them.
          </p>
        )}
      </div>

      {/* Back link */}
      <div style={{ marginTop: "0.5rem" }}>
        <Link
          href="/blog"
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: "0.8rem",
            color: "#6b7f96",
            textDecoration: "none",
          }}
        >
          ← All posts
        </Link>
      </div>
    </article>
  );
}
