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

  return (
    <article>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4 text-sm text-gray-400">
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
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Agent-readable version"
          >
            For AI agents ↗
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
          {post.title}
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed">{post.summary}</p>
      </div>

      {/* Content */}
      <div className="prose prose-gray prose-lg max-w-none">
        <MDXRemote source={post.content} />
      </div>

      {/* Tags */}
      <div className="mt-10 pt-6 border-t border-gray-100">
        <div className="flex flex-wrap gap-2 mb-6">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Affiliate disclosure */}
        {post.affiliate_links.length > 0 && (
          <p className="text-xs text-gray-400">
            This post contains affiliate links. Windrose may earn a commission if you purchase through them.
          </p>
        )}
      </div>

      {/* Back link */}
      <div className="mt-8">
        <Link href="/blog" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← All posts
        </Link>
      </div>
    </article>
  );
}
