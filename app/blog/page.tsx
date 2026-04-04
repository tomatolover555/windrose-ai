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
        <p style={{ color: "#888480" }}>No posts yet.</p>
      ) : (
        <div>
          {posts.map((post, index) => (
            <article
              key={post.slug}
              style={{
                paddingTop: index === 0 ? "0" : "2rem",
                paddingBottom: "2rem",
                borderBottom: "1px solid #d4cfc8",
              }}
            >
              {/* Date — small uppercase above title, DF style */}
              <div
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontSize: "0.7rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#888480",
                  marginBottom: "0.4rem",
                }}
              >
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <span style={{ margin: "0 0.5em" }}>·</span>
                <span>{post.reading_time_minutes} min</span>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontWeight: "700",
                  fontSize: "1.35rem",
                  lineHeight: "1.35",
                  color: "#1c1c1e",
                  marginBottom: "0.5rem",
                }}
              >
                <Link
                  href={`/blog/${post.slug}`}
                  style={{ color: "#1c1c1e", textDecoration: "none" }}
                  className="hover:text-[#c8590a] transition-colors"
                >
                  {post.title}
                </Link>
              </h2>

              {/* Summary */}
              <p
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "1rem",
                  lineHeight: "1.65",
                  color: "#444240",
                  margin: "0",
                }}
              >
                {post.summary}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
