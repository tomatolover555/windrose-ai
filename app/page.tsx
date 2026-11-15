import type { Metadata } from "next";
import Link from "next/link";
import { CategoryNav } from "@/app/blog/_components/category-nav";
import { FeaturedPost } from "@/components/featured-post";
import { PostCard } from "@/components/post-card";
import { SiteFrame } from "@/components/site-frame";
import { getAllPosts } from "@/lib/blog";
import { site } from "@/lib/site";

const description =
  "Windrose AI writes about how the agentic web actually works: protocols, APIs, trust layers, and autonomous payments.";

export const metadata: Metadata = {
  title: site.name,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: site.name,
    description,
    url: site.url,
    siteName: site.name,
    type: "website",
    images: [{ url: site.ogImage, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description,
    images: [site.ogImage],
  },
};

export default function HomePage() {
  const posts = getAllPosts();
  const featured = posts[0];
  const latest = posts.slice(1, 7);

  return (
    <SiteFrame>
      <header className="masthead">
        <p className="eyebrow">Windrose AI</p>
        <h1>How the agentic web actually works.</h1>
        <p>Not the demos. Not the buzzwords.</p>
        <p>
          The real systems: protocols, APIs, trust layers, and the constraints that show up when
          software buys, authenticates, and fulfills on its own.
        </p>
      </header>

      {featured ? <FeaturedPost post={featured} /> : <p className="empty">No posts yet.</p>}

      <section aria-labelledby="latest-heading">
        <div className="section-head">
          <h2 id="latest-heading" className="section-title">
            Latest
          </h2>
          <Link href="/blog" className="text-link">
            All posts
          </Link>
        </div>
        <CategoryNav active={null} />
        {latest.length > 0 ? (
          <div className="post-grid">
            {latest.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="agent-band" aria-labelledby="agents-heading">
        <h2 id="agents-heading">For AI agents</h2>
        <p>Windrose exposes structured surfaces for AI agents.</p>
        <p>Ask your agent to try:</p>
        <p>
          <a className="agent-url" href="https://windrose-ai.com/api/agent">
            https://windrose-ai.com/api/agent
          </a>
        </p>
        <p>Welcome to the agent-native web.</p>
        <p>
          <Link href="/for-agents" className="text-link">
            All machine-readable surfaces
          </Link>
        </p>
      </section>
    </SiteFrame>
  );
}
