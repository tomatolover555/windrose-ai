import type { ReactNode } from "react";
import Link from "next/link";
import { CompassMark } from "@/components/compass-mark";
import { SiteNav } from "@/components/site-nav";
import { author } from "@/lib/site";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/blog/about", label: "About" },
  { href: "/blog/contact", label: "Contact" },
  { href: "/blog/privacy", label: "Privacy" },
  { href: "/blog/affiliate-disclosure", label: "Affiliate disclosure" },
  { href: "/for-agents", label: "For agents" },
  { href: "/feed.xml", label: "RSS" },
] as const;

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="site">
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-shell site-header-bar">
          <Link href="/" className="brand">
            <CompassMark />
            <span className="brand-name">
              Windrose <span className="brand-ai">AI</span>
            </span>
          </Link>
          <SiteNav />
        </div>
      </header>
      <div className="site-rule" />
      <main id="content" className="site-shell site-main">
        {children}
      </main>
      <footer className="site-footer">
        <div className="site-shell site-footer-inner">
          <p className="footer-author">{author.name}</p>
          <nav aria-label="Footer">
            <ul className="footer-nav">
              {FOOTER_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="footer-copy">© 2026 Windrose AI</p>
        </div>
      </footer>
    </div>
  );
}
