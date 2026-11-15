import Link from "next/link";
import { PostCover } from "@/components/post-cover";
import { categoryLabel, formatPostDate, type Post } from "@/lib/blog";

export function FeaturedPost({ post }: { post: Post }) {
  return (
    <article className="feature">
      <Link href={`/blog/${post.slug}`} className="feature-link">
        <div className="feature-copy">
          <p className="eyebrow">Featured</p>
          <p className="meta">
            <span className="cat">{categoryLabel(post.category)}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.reading_time_minutes} min read</span>
          </p>
          <h2 className="feature-title">{post.title}</h2>
          <p className="dek">{post.summary}</p>
        </div>
        <div className="feature-media">
          <PostCover slug={post.slug} category={post.category} title={post.title} crop="end" />
        </div>
      </Link>
    </article>
  );
}
