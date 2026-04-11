import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate Disclosure — Windrose AI",
  description:
    "Affiliate Disclosure for Windrose AI, including how affiliate links are used and how editorial independence is maintained.",
  alternates: {
    canonical: "https://windrose-ai.com/blog/affiliate-disclosure",
  },
};

export default function AffiliateDisclosurePage() {
  return (
    <article className="max-w-[680px] mx-auto">
      <h1
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontWeight: "700",
          fontSize: "2rem",
          lineHeight: "1.2",
          color: "#1b3a6b",
          marginBottom: "1.5rem",
          letterSpacing: "-0.01em",
        }}
      >
        Affiliate Disclosure
      </h1>

      <div
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "1rem",
          lineHeight: "1.7",
          color: "#3a3a3a",
        }}
      >
        <p style={{ margin: "0 0 1.25rem 0" }}>Windrose AI may participate in affiliate programs.</p>

        <p style={{ margin: "0 0 1.25rem 0" }}>
          This means that some links on this site may be affiliate links. If you click one of those
          links and later make a purchase or sign up for a service, Windrose AI may earn a
          commission at no additional cost to you.
        </p>

        <h2
          style={{
            fontSize: "1.35rem",
            lineHeight: "1.35",
            color: "#1b3a6b",
            margin: "2rem 0 0.75rem 0",
            fontWeight: 700,
          }}
        >
          Why this exists
        </h2>
        <p style={{ margin: "0 0 1.25rem 0" }}>
          Affiliate commissions can help support the operation of Windrose AI and the continued
          publication of free content about agents, tools, APIs, and the emerging agent-native web.
        </p>

        <h2
          style={{
            fontSize: "1.35rem",
            lineHeight: "1.35",
            color: "#1b3a6b",
            margin: "2rem 0 0.75rem 0",
            fontWeight: 700,
          }}
        >
          How we use affiliate links
        </h2>
        <p style={{ margin: "0 0 1.25rem 0" }}>
          We aim to include affiliate links only where they are contextually relevant and
          potentially useful to readers. Not every tool we mention will be an affiliate partner,
          and not every affiliate partner will be mentioned.
        </p>

        <h2
          style={{
            fontSize: "1.35rem",
            lineHeight: "1.35",
            color: "#1b3a6b",
            margin: "2rem 0 0.75rem 0",
            fontWeight: 700,
          }}
        >
          Editorial independence
        </h2>
        <p style={{ margin: "0 0 1.25rem 0" }}>
          The existence of an affiliate relationship does <strong>not</strong> determine what we
          write about or how we describe it. We may reference competing tools, non-affiliate tools,
          or open alternatives when they better serve the topic.
        </p>

        <h2
          style={{
            fontSize: "1.35rem",
            lineHeight: "1.35",
            color: "#1b3a6b",
            margin: "2rem 0 0.75rem 0",
            fontWeight: 700,
          }}
        >
          Not investment, legal, or professional advice
        </h2>
        <p style={{ margin: "0 0 1.25rem 0" }}>
          Content on Windrose AI is provided for informational and educational purposes only. You
          should evaluate any product, platform, or service independently before making a purchase
          or relying on it in production.
        </p>

        <h2
          style={{
            fontSize: "1.35rem",
            lineHeight: "1.35",
            color: "#1b3a6b",
            margin: "2rem 0 0.75rem 0",
            fontWeight: 700,
          }}
        >
          Sponsored content
        </h2>
        <p style={{ margin: "0 0 1.25rem 0" }}>
          Unless a page explicitly says otherwise, content on Windrose AI should not be treated as
          sponsored content or paid placement.
        </p>

        <h2
          style={{
            fontSize: "1.35rem",
            lineHeight: "1.35",
            color: "#1b3a6b",
            margin: "2rem 0 0.75rem 0",
            fontWeight: 700,
          }}
        >
          Contact
        </h2>
        <p style={{ margin: 0 }}>
          For general site information, please use the pages and navigation available on Windrose
          AI.
        </p>
      </div>
    </article>
  );
}
