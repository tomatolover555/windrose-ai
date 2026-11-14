import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/app/blog/_components/static-page";
import { site } from "@/lib/site";

const description =
  "How to reach Windrose AI. This publication does not publish a personal email address, phone number, or postal address.";

export const metadata: Metadata = {
  title: `Contact — ${site.name}`,
  description,
  alternates: { canonical: `${site.url}/blog/contact` },
  openGraph: {
    title: "Contact",
    description,
    url: `${site.url}/blog/contact`,
    siteName: site.name,
    type: "website",
    images: [{ url: site.ogImage, alt: site.name }],
  },
};

export default function ContactPage() {
  return (
    <StaticPage title="Contact" description={description} path="/blog/contact" pageType="ContactPage">
      <p>
        Windrose AI does not publish a personal email address, phone number, or postal address, and
        this blog has no contact form.
      </p>
      <p>
        Please do not send personal information to the site expecting a reply. There is no inbox
        attached to these pages.
      </p>
      <p>The pages that describe how the publication operates are:</p>
      <ul>
        <li>
          <Link href="/blog/about">About</Link> — what the blog covers and who the byline is.
        </li>
        <li>
          <Link href="/blog/privacy">Privacy</Link> — cookies, analytics, advertising, and affiliates.
        </li>
        <li>
          <Link href="/blog/affiliate-disclosure">Affiliate disclosure</Link> — which programs are
          enrolled, and which are not linked yet.
        </li>
      </ul>
    </StaticPage>
  );
}
