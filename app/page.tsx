import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export default function HomePage() {
  const recentPosts = getAllPosts().slice(0, 3);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Windrose AI</h1>
        <p className="text-gray-500">
          Exposing structured surfaces for the agentic web.{" "}
          <code className="text-sm bg-gray-50 px-1.5 py-0.5 rounded text-gray-600">
            GET /api/agent
          </code>
        </p>
      </div>

      {recentPosts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              Latest writing
            </h2>
            <Link href="/blog" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              All posts →
            </Link>
          </div>
          <div className="space-y-6">
            {recentPosts.map((post) => (
              <div key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-gray-900 font-medium hover:text-gray-600 transition-colors"
                >
                  {post.title}
                </Link>
                <p className="text-sm text-gray-400 mt-0.5">{post.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
