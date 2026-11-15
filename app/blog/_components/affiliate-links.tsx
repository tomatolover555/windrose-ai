import Link from "next/link";
import { AFFILIATE_LINK_REL, type AffiliateProgram } from "@/lib/affiliates";

export function PostAffiliateDisclosure() {
  return (
    <p className="affiliate-note">
      This post contains affiliate links. If you buy through them, Windrose AI may earn a commission
      at no extra cost to you. Links use <code>rel=&quot;{AFFILIATE_LINK_REL}&quot;</code>. See the{" "}
      <Link href="/blog/affiliate-disclosure">affiliate disclosure</Link>.
    </p>
  );
}

export function AffiliateLinks({ programs }: { programs: AffiliateProgram[] }) {
  if (programs.length === 0) return null;

  return (
    <aside className="affiliate-box" aria-label="Affiliate links">
      <p>Affiliate links</p>
      <ul>
        {programs.map((program) => (
          <li key={program.id}>
            <a href={program.url} rel={AFFILIATE_LINK_REL}>
              {program.name}
            </a>
            {program.network ? <span> via {program.network}</span> : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}
