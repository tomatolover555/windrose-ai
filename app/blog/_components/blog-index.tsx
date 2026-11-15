import Link from "next/link";
import { CategoryNav } from "@/app/blog/_components/category-nav";
import { FeaturedPost } from "@/components/featured-post";
import { PostCard } from "@/components/post-card";
import type { Post } from "@/lib/blog";

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
  const feature = currentPage === 1 && posts.length > 0 ? posts[0] : null;
  const gridPosts = feature ? posts.slice(1) : posts;

  return (
    <div>
      {showSiteIntro ? (
        <header className="index-intro">
          <p className="eyebrow">Journal</p>
          <h1 className="page-title">Blog</h1>
          <p>Windrose AI writes about how the agentic web actually works.</p>
          <p>Not the demos. Not the buzzwords.</p>
          <p>
            The real systems: protocols, APIs, trust layers, and the constraints that show up when
            software buys, authenticates, and fulfills on its own.
          </p>
        </header>
      ) : title ? (
        <header className="index-intro">
          <h1 className="page-title">{title}</h1>
          {lede ? <p>{lede}</p> : null}
        </header>
      ) : (
        <h1 className="page-title">Blog</h1>
      )}

      <CategoryNav active={activeCategory} />

      {posts.length === 0 ? <p className="empty">No posts yet.</p> : null}

      {feature ? <FeaturedPost post={feature} /> : null}

      {gridPosts.length > 0 ? (
        <section aria-labelledby="more-posts">
          {feature ? (
            <div className="section-head">
              <h2 id="more-posts" className="section-title">
                More posts
              </h2>
            </div>
          ) : (
            <h2 id="more-posts" className="sr-only">
              Posts
            </h2>
          )}
          <div className="post-grid">
            {gridPosts.map((post) => (
              <PostCard key={post.slug} post={post} heading={feature ? "h3" : "h2"} />
            ))}
          </div>
        </section>
      ) : null}

      {totalPages > 1 ? (
        <nav className="pager" aria-label="Pagination">
          <div>
            {hasPrevious ? (
              <Link href={getPageHref(currentPage - 1)} rel="prev">
                Previous
              </Link>
            ) : null}
          </div>
          <div>
            Page {currentPage} of {totalPages}
          </div>
          <div>
            {hasNext ? (
              <Link href={getPageHref(currentPage + 1)} rel="next">
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
