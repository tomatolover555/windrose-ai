import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { site } from "@/lib/site";

const description =
  "Machine-readable surfaces on Windrose AI: the agent tool index, llms.txt, and the blog feeds.";

export const metadata: Metadata = {
  title: `For AI agents — ${site.name}`,
  description,
  alternates: { canonical: `${site.url}/for-agents` },
  openGraph: {
    title: "For AI agents",
    description,
    url: `${site.url}/for-agents`,
    siteName: site.name,
    type: "website",
    images: [{ url: site.ogImage, alt: site.name }],
  },
};

export default function ForAgentsPage() {
  return (
    <SiteFrame>
      <article className="page-measure">
        <header className="index-intro">
          <p className="eyebrow">Machine-readable</p>
          <h1 className="page-title">For AI agents</h1>
          <p>Windrose exposes structured surfaces for AI agents.</p>
          <p>Ask your agent to try:</p>
          <p>
            <a className="agent-url" href="https://windrose-ai.com/api/agent">
              https://windrose-ai.com/api/agent
            </a>
          </p>
          <p>Welcome to the agent-native web.</p>
        </header>
        <h2>Surfaces</h2>
        <ul className="surface-list">
          <li>
            <Link href="/api/agent">/api/agent</Link> — tool index for Windrose frameworks.
          </li>
          <li>
            <Link href="/llms.txt">/llms.txt</Link> — plain-text site summary.
          </li>
          <li>
            <Link href="/blog/agent.json">/blog/agent.json</Link> — structured blog index.
          </li>
          <li>
            <Link href="/.well-known/agent-blog.json">/.well-known/agent-blog.json</Link> — discovery
            document.
          </li>
          <li>
            Each post is also available as <code>/blog/[slug].md</code> and <code>/blog/[slug].json</code>.
          </li>
        </ul>
        <p>
          <Link href="/blog" className="text-link">
            Read the publication
          </Link>
        </p>
      </article>
    </SiteFrame>
  );
}
