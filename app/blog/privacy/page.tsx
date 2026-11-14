import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/app/blog/_components/static-page";
import { site } from "@/lib/site";

const description =
  "Privacy notice for Windrose AI: cookies, Google Analytics, advertising, affiliate links, and the experimental agent API. No postal address is published.";

export const metadata: Metadata = {
  title: `Privacy — ${site.name}`,
  description,
  alternates: { canonical: `${site.url}/blog/privacy` },
  openGraph: {
    title: "Privacy",
    description,
    url: `${site.url}/blog/privacy`,
    siteName: site.name,
    type: "website",
    images: [{ url: site.ogImage, alt: site.name }],
  },
};

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy" description={description} path="/blog/privacy">
      <p>
        This notice describes the Windrose AI website at {site.url}. The publisher does not publish
        a personal name, email address, phone number, or postal address for privacy requests.
      </p>

      <h2>Cookies</h2>
      <p>
        The blog loads Google Analytics 4, measurement ID <code>{site.gaMeasurementId}</code>. Google
        may set cookies such as <code>_ga</code> and <code>_ga_BXKR6NMBT7</code> to distinguish
        browsers and to remember that you have been counted. Those cookies are not required to read
        the site.
      </p>
      <p>
        You can block cookies for this domain in your browser, or use{" "}
        <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener noreferrer">
          Google’s Analytics opt-out
        </a>
        . The site does not run a cookie-consent banner. Analytics is loaded on pages of this
        website, including the blog.
      </p>

      <h2>Analytics</h2>
      <p>
        Google Analytics is used to see which pages are read and what kind of device opened them.
        That can include a truncated IP address, browser and device data, and the page URL, under
        Google’s terms. Windrose does not sell that information and does not operate a reader
        account system on the blog.
      </p>

      <h2>Advertising</h2>
      <p>
        The blog does not currently load a display-ad network and does not set advertising cookies
        of its own. If advertising is added later, this page will name the network before those
        tags are installed.
      </p>

      <h2>Affiliates</h2>
      <p>
        Some future links may be affiliate links. A click can send you to another site, and that
        site may set its own cookies. Windrose only links a program after a tracking URL is entered
        in the affiliate config. Until then, no affiliate URL is published. Details are on the{" "}
        <Link href="/blog/affiliate-disclosure">affiliate disclosure</Link> page. Affiliate links
        that are published use <code>rel=&quot;sponsored nofollow&quot;</code>.
      </p>

      <h2>Agent API</h2>
      <p>
        The experimental agent API on this domain is separate from the essays. Requests may be
        logged with a timestamp, the route, and technical metadata such as IP address and user agent,
        so the service can be rate-limited and debugged. Those logs are operational. They are not a
        reader profile for the blog.
      </p>

      <h2>What this site does not collect on the blog</h2>
      <p>
        The blog has no account signup, no comment form, and no contact form. Do not send personal
        data expecting it to be stored or answered. There is no published mailbox for access or
        deletion requests. Blocking cookies and analytics, as described above, is the control
        available on these pages.
      </p>
    </StaticPage>
  );
}
