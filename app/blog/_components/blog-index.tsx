import Link from "next/link";
import { Post } from "@/lib/blog";

type BlogIndexProps = {
  posts: Post[];
  currentPage: number;
  totalPages: number;
};

function getPageHref(page: number): string {
  return page === 1 ? "/blog" : `/blog/page/${page}`;
}

export function BlogIndex({ posts, currentPage, totalPages }: BlogIndexProps) {
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div>
      <div
        style={{
          marginBottom: "1.75rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px dotted #ccc8bf",
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "1rem",
            lineHeight: "1.7",
            color: "#3a3a3a",
          }}
        >
          <p style={{ margin: "0 0 0.9rem 0" }}>Windrose AI is about how the agentic web actually works.</p>
          <p style={{ margin: "0 0 0.9rem 0" }}>Not the demos. Not the buzzwords.</p>
          <p style={{ margin: "0 0 0.9rem 0" }}>
            The real systems - protocols, APIs, trust layers, and the messy constraints that show
            up in production when software is used by agents instead of humans.
          </p>
          <p style={{ margin: 0 }}>
            If you&apos;re building or reasoning about these systems, this is where the details
            matter.
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        <p style={{ color: "#6b7f96" }}>No posts yet.</p>
      ) : (
        <div>
          {posts.map((post, index) => (
            <div key={post.slug}>
              {index > 0 && (
                <hr style={{ border: "none", borderTop: "1px dotted #ccc8bf", margin: "0" }} />
              )}

              <article style={{ padding: "1.75rem 0" }}>
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

          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                borderTop: "1px dotted #ccc8bf",
                marginTop: "0.5rem",
                paddingTop: "1.25rem",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontSize: "0.85rem",
                color: "#6b7f96",
              }}
            >
              <div>
                {hasPrevious ? (
                  <Link
                    href={getPageHref(currentPage - 1)}
                    rel="prev"
                    style={{ color: "#1b3a6b", textDecoration: "none" }}
                  >
                    ← Previous
                  </Link>
                ) : null}
              </div>
              <div>
                Page {currentPage} of {totalPages}
              </div>
              <div>
                {hasNext ? (
                  <Link
                    href={getPageHref(currentPage + 1)}
                    rel="next"
                    style={{ color: "#1b3a6b", textDecoration: "none" }}
                  >
                    Next →
                  </Link>
                ) : null}
              </div>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
