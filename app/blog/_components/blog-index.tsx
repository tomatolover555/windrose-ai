import Link from "next/link";
import { CategoryNav } from "@/app/blog/_components/category-nav";
import { categoryLabel, categoryPath, formatPostDate, type Post } from "@/lib/blog";

type BlogIndexProps = {
  posts: Post[];
  currentPage: number;
  totalPages: number;
  activeCategory?: string | null;
  title?: string;
  lede?: string;
};

function getPageHref(page: number): string {
  return page === 1 ? "/blog" : `/blog/page/${page}`;
}

export function BlogIndex({
  posts,
  currentPage,
  totalPages,
  activeCategory = "all",
  title,
  lede,
}: BlogIndexProps) {
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const showSiteIntro = !title && currentPage === 1;

  return (
    <div>
      {title ? <h1 className="blog-title">{title}</h1> : null}
      {lede ? <p className="blog-lede">{lede}</p> : null}

      {showSiteIntro ? (
        <div className="blog-intro">
          <p>Windrose AI writes about how the agentic web actually works.</p>
          <p>Not the demos. Not the buzzwords.</p>
          <p>
            The real systems: protocols, APIs, trust layers, and the constraints that show up when
            software buys, authenticates, and fulfills on its own.
          </p>
        </div>
      ) : null}

      <CategoryNav active={activeCategory} />

      {posts.length === 0 ? (
        <p style={{ color: "#6b7f96" }}>No posts yet.</p>
      ) : (
        <div>
          {posts.map((post, index) => (
            <article
              key={post.slug}
              style={{
                padding: "1.5rem 0",
                borderTop: index === 0 ? "none" : "1px dotted #ccc8bf",
              }}
            >
              <p className="blog-kicker" style={{ margin: "0 0 0.4rem" }}>
                <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                <span aria-hidden="true" style={{ margin: "0 0.45em", color: "#b8941e" }}>
                  ★
                </span>
                <span>{post.reading_time_minutes} min read</span>
                <span aria-hidden="true" style={{ margin: "0 0.45em", color: "#b8941e" }}>
                  ★
                </span>
                <Link href={categoryPath(post.category)} style={{ color: "#1b3a6b" }}>
                  {categoryLabel(post.category)}
                </Link>
              </p>

              <h2 className="blog-post-title">
                <Link href={`/blog/${post.slug}`} style={{ color: "#1b3a6b", textDecoration: "none" }}>
                  {post.title}
                </Link>
              </h2>

              <p style={{ margin: 0, fontSize: "1.02rem", lineHeight: 1.65 }}>{post.summary}</p>
            </article>
          ))}

          {totalPages > 1 ? (
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
              }}
              className="blog-kicker"
            >
              <div>
                {hasPrevious ? (
                  <Link href={getPageHref(currentPage - 1)} rel="prev" style={{ color: "#1b3a6b" }}>
                    ← Previous
                  </Link>
                ) : null}
              </div>
              <div>
                Page {currentPage} of {totalPages}
              </div>
              <div>
                {hasNext ? (
                  <Link href={getPageHref(currentPage + 1)} rel="next" style={{ color: "#1b3a6b" }}>
                    Next →
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}
        </div>
      )}
    </div>
  );
}
