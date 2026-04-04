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

const metaStyle: React.CSSProperties = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: "0.75rem",
  letterSpacing: "0.08em",
  color: "#888480",
};

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article>
      {/* Meta line */}
      <div style={{ ...metaStyle, textTransform: "uppercase", marginBottom: "1.25rem", display: "flex", gap: "0.6em", flexWrap: "wrap" as const, alignItems: "center" }}>
        <time dateTime={post.date}>
          {new Date(post.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        <span>·</span>
        <span>{post.reading_time_minutes} min read</span>
        <span>·</span>
        <Link
          href={post.agent_url}
          title="Agent-readable markdown"
          style={{ color: "#888480", textDecoration: "none", letterSpacing: "0.08em" }}
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
          lineHeight: "1.25",
          color: "#1c1c1e",
          marginBottom: "1rem",
        }}
      >
        {post.title}
      </h1>

      {/* Summary lede — italic, DF style */}
      <p
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          fontSize: "1.125rem",
          lineHeight: "1.65",
          color: "#444240",
          marginBottom: "2rem",
          paddingBottom: "2rem",
          borderBottom: "1px solid #d4cfc8",
        }}
      >
        {post.summary}
      </p>

      {/* Body content */}
      <div className="prose prose-windrose max-w-none">
        <MDXRemote source={post.content} />
      </div>

      {/* Footer rule + tags + disclosure */}
      <div
        style={{
          marginTop: "3rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid #d4cfc8",
        }}
      >
        {/* Tags — minimal, no pills */}
        {post.tags.length > 0 && (
          <div
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#888480",
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
              color: "#888480",
              marginBottom: "1.5rem",
            }}
          >
            This post contains affiliate links. Windrose may earn a commission if you purchase through them.
          </p>
        )}
      </div>

      {/* Back link */}
      <div style={{ marginTop: "1rem" }}>
        <Link
          href="/blog"
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: "0.8rem",
            color: "#888480",
            textDecoration: "none",
          }}
        >
          ← All posts
        </Link>
      </div>
    </article>
  );
}
