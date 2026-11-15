import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/app/blog/_components/static-page";
import { AFFILIATE_LINK_REL, loadAffiliatePrograms } from "@/lib/affiliates";
import { site } from "@/lib/site";

export const dynamic = "force-static";

const description =
  "Which affiliate programs Windrose AI is enrolled in, which links are published, and how editorial choices stay independent of commissions.";

export const metadata: Metadata = {
  title: `Affiliate disclosure — ${site.name}`,
  description,
  alternates: { canonical: `${site.url}/blog/affiliate-disclosure` },
  openGraph: {
    title: "Affiliate disclosure",
    description,
    url: `${site.url}/blog/affiliate-disclosure`,
    siteName: site.name,
    type: "website",
    images: [{ url: site.ogImage, alt: site.name }],
  },
};

export default function AffiliateDisclosurePage() {
  const programs = loadAffiliatePrograms();
  const linked = programs.filter((program) => program.status === "active" && program.url.startsWith("https://"));
  const pending = programs.filter((program) => !linked.includes(program));

  return (
    <StaticPage title="Affiliate disclosure" description={description} path="/blog/affiliate-disclosure">
      <p>
        Windrose AI sometimes recommends tools. When a recommendation is also an enrolled affiliate
        program, the link is marked and uses <code>rel=&quot;{AFFILIATE_LINK_REL}&quot;</code>. A
        purchase or signup through that link may earn the publication a commission, at no extra
        price to you.
      </p>

      <h2>Programs</h2>
      {linked.length === 0 ? (
        <p>No affiliate tracking URL is published on this site right now.</p>
      ) : (
        <ul>
          {linked.map((program) => (
            <li key={program.id}>
              <a href={program.url} rel={AFFILIATE_LINK_REL}>
                {program.name}
              </a>
              {program.network ? ` via ${program.network}` : ""}
            </li>
          ))}
        </ul>
      )}
      {pending.length > 0 ? (
        <>
          <p>Approved, but not linked until a tracking URL is added to the affiliate config:</p>
          <ul>
            {pending.map((program) => (
              <li key={program.id}>
                <strong>{program.name}</strong>
                {program.network ? ` via ${program.network}` : ""}.{" "}
                {program.note ?? "Tracking URL not published."}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2>What is not an affiliate link</h2>
      <p>
        A mention of a company, a link to documentation, or a citation is not an affiliate link
        unless it is one of the enrolled URLs above. Placeholder and example referral URLs are not
        used.
      </p>

      <h2>Editorial independence</h2>
      <p>
        A commission does not decide what gets published or how a product is described. The blog
        can write about competitors, free tools, and products with no affiliate program. Sponsored
        or paid placement, if it ever happens, will be labeled on that page. Ordinary posts are not
        paid placement.
      </p>

      <h2>Not professional advice</h2>
      <p>
        Posts are information for builders. Evaluate any product yourself before you depend on it.
      </p>

      <p>
        Questions about this policy are covered on the <Link href="/blog/contact">contact</Link> and{" "}
        <Link href="/blog/privacy">privacy</Link> pages. Those pages do not publish a personal email
        address.
      </p>
    </StaticPage>
  );
}
