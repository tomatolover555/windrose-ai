import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/app/blog/_components/static-page";
import { author, site } from "@/lib/site";

const description = `${author.name} is the byline for the Windrose AI blog, which covers agentic commerce, payments, and machine-readable services.`;

export const metadata: Metadata = {
  title: `About — ${site.name}`,
  description,
  alternates: { canonical: `${site.url}/blog/about` },
  openGraph: {
    title: "About",
    description,
    url: `${site.url}/blog/about`,
    siteName: site.name,
    type: "website",
    images: [{ url: site.ogImage, alt: site.name }],
  },
};

export default function AboutPage() {
  return (
    <StaticPage title="About" description={description} path="/blog/about" pageType="AboutPage">
      <p>{author.bio}</p>
      <p>
        The blog is a record of how agents discover services, get permission to act, and pay. It is
        written for people building those systems. Posts are published about once a week.
      </p>
      <p>
        {author.name} is a pen name for the publication, not a personal byline. The name and short
        biography are a single setting in the site config, so they can be replaced together.
      </p>
      <p>
        The same domain also publishes{" "}
        <Link href="/for-agents">machine-readable surfaces for AI agents</Link>, including an
        experimental <Link href="/api/agent">agent API</Link> and a WebMCP directory. Those
        surfaces are separate from the essays.
      </p>
      <p>
        The blog may later be supported by advertising and by affiliate programs that have actually
        been enrolled. Enrolled links are labeled and use <code>rel=&quot;sponsored nofollow&quot;</code>.
        Read the <Link href="/blog/affiliate-disclosure">affiliate disclosure</Link> and the{" "}
        <Link href="/blog/privacy">privacy notice</Link> for the current state.
      </p>
    </StaticPage>
  );
}
