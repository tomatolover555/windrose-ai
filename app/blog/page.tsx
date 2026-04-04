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
                    style={{ color: "#1b3a6b", textDecoration: "none" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#b8941e")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#1b3a6b")}
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
