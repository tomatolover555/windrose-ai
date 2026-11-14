import Link from "next/link";
import { AFFILIATE_LINK_REL, type AffiliateProgram } from "@/lib/affiliates";

export function PostAffiliateDisclosure() {
  return (
    <p className="blog-kicker" style={{ letterSpacing: "0.01em", textTransform: "none", lineHeight: 1.6, margin: "0 0 1.25rem" }}>
      This post contains affiliate links. If you buy through them, Windrose AI may earn a commission
      at no extra cost to you. Links use <code>rel=&quot;{AFFILIATE_LINK_REL}&quot;</code>. See the{" "}
      <Link href="/blog/affiliate-disclosure" style={{ color: "#1b3a6b" }}>
        affiliate disclosure
      </Link>
      .
    </p>
  );
}

export function AffiliateLinks({ programs }: { programs: AffiliateProgram[] }) {
  if (programs.length === 0) return null;

  return (
    <aside
      aria-label="Affiliate links"
      style={{
        margin: "0 0 1.75rem",
        padding: "0.9rem 1rem",
        border: "1px solid #ccc8bf",
        background: "#fffdf8",
      }}
    >
      <p className="blog-kicker" style={{ margin: "0 0 0.5rem" }}>
        Affiliate links
      </p>
      <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
        {programs.map((program) => (
          <li key={program.id} style={{ marginBottom: "0.35rem" }}>
            <a href={program.url} rel={AFFILIATE_LINK_REL}>
              {program.name}
            </a>
            {program.network ? <span style={{ color: "#6b7f96" }}> via {program.network}</span> : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}
