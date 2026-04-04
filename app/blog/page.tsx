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
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          The Agentic Web
        </h1>
        <p className="text-lg text-gray-500">
          Writing about agent commerce, autonomous payments, and what the web looks like when AI agents become dominant users of it.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-400">No posts yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {posts.map((post) => (
            <article key={post.slug} className="py-8 first:pt-0">
              <div className="flex items-center gap-3 mb-2 text-sm text-gray-400">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <span>·</span>
                <span>{post.reading_time_minutes} min read</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-gray-600 transition-colors"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="text-gray-500 mb-3 leading-relaxed">{post.summary}</p>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
