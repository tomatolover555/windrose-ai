import Link from "next/link";
import { PostCover } from "@/components/post-cover";
import { categoryLabel, formatPostDate, type Post } from "@/lib/blog";

export function PostCard({
  post,
  heading = "h3",
  compact = false,
}: {
  post: Post;
  heading?: "h2" | "h3";
  compact?: boolean;
}) {
  const TitleTag = heading;

  return (
    <article className="post-card">
      <Link href={`/blog/${post.slug}`} className="post-card-link">
        <div className="cover-frame">
          <PostCover slug={post.slug} category={post.category} title={post.title} />
        </div>
        <div className="post-card-body">
          <p className="meta">
            <span className="cat">{categoryLabel(post.category)}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          </p>
          <TitleTag className="post-card-title">{post.title}</TitleTag>
          {compact ? null : <p className="excerpt">{post.summary}</p>}
          <p className="meta read-time">{post.reading_time_minutes} min read</p>
        </div>
      </Link>
    </article>
  );
}
