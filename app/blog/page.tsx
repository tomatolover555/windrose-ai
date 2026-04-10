import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export const metadata = {
  title: "Blog — Windrose AI",
  description: "Writing about the agentic web, agent commerce, and autonomous payments.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div>
      <div
        style={{
          marginBottom: "1.75rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px dotted #ccc8bf",
        }}
      >
        <p
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "1rem",
            lineHeight: "1.7",
            color: "#3a3a3a",
            margin: 0,
          }}
        >
          Windrose AI covers the agentic web: the protocols, APIs, trust layers, and commercial
          systems that make software usable by AI agents. These posts stay focused on how the stack
          actually works in production, not just the buzzwords around it.
        </p>
      </div>
      {posts.length === 0 ? (
        <p style={{ color: "#6b7f96" }}>No posts yet.</p>
      ) : (
        <div>
          {posts.map((post, index) => (
            <div key={post.slug}>
              {/* Dotted separator between posts, DF-style */}
              {index > 0 && (
                <hr style={{ border: "none", borderTop: "1px dotted #ccc8bf", margin: "0" }} />
              )}

              <article style={{ padding: "1.75rem 0" }}>
                {/* Date + read time */}
                <div
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#6b7f96",
                    marginBottom: "0.35rem",
                  }}
                >
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <span style={{ margin: "0 0.5em", color: "#b8941e" }}>★</span>
                  <span>{post.reading_time_minutes} min read</span>
                </div>

                {/* Title */}
                <h2
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontWeight: "700",
                    fontSize: "1.3rem",
                    lineHeight: "1.3",
                    color: "#1b3a6b",
                    marginBottom: "0.5rem",
                  }}
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-[#b8941e] transition-colors"
                    style={{ color: "#1b3a6b", textDecoration: "none" }}
                  >
                    {post.title}
                  </Link>
                </h2>

                {/* Summary */}
                <p
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: "0.975rem",
                    lineHeight: "1.65",
                    color: "#3a3a3a",
                    margin: "0",
                  }}
                >
                  {post.summary}
                </p>
              </article>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
