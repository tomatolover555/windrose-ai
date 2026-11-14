import type { ReactNode } from "react";
import Link from "next/link";
import { author } from "@/lib/site";

function CompassRose() {
  return (
    <svg width="38" height="38" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <circle cx="22" cy="22" r="17" stroke="#b8941e" strokeWidth="1.2" fill="none" />
      <polygon points="22,1.5 23.2,5 22,4.2 20.8,5" fill="#b8941e" />
      <polygon points="22,42.5 23.2,39 22,39.8 20.8,39" fill="#b8941e" />
      <polygon points="42.5,22 39,23.2 39.8,22 39,20.8" fill="#b8941e" />
      <polygon points="1.5,22 5,23.2 4.2,22 5,20.8" fill="#b8941e" />
      <circle cx="34" cy="10" r="1.3" fill="#b8941e" />
      <circle cx="34" cy="34" r="1.3" fill="#b8941e" />
      <circle cx="10" cy="34" r="1.3" fill="#b8941e" />
      <circle cx="10" cy="10" r="1.3" fill="#b8941e" />
      <polygon points="29.5,14.5 27.5,22 29.5,29.5 22,27.5 14.5,29.5 16.5,22 14.5,14.5 22,16.5" fill="#b8941e" />
      <polygon points="22,3 25.5,18.5 40,22 25.5,25.5 22,41 18.5,25.5 4,22 18.5,18.5" fill="#f0e8d4" />
      <circle cx="22" cy="22" r="2.5" fill="#f0e8d4" />
    </svg>
  );
}

const headerLink = { color: "#f0e8d4", textDecoration: "none", fontSize: "0.95rem" } as const;

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#f8f6f0" }}>
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <header style={{ backgroundColor: "#1b3a6b" }}>
        <div className="blog-shell blog-header">
          <Link href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: "0.65rem", textDecoration: "none" }}>
            <CompassRose />
            <span
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "1.35rem",
                color: "#f0e8d4",
                lineHeight: 1,
              }}
            >
              windrose ai
            </span>
          </Link>
          <nav aria-label="Blog" className="blog-header-nav">
            <Link href="/blog" style={headerLink}>
              Blog
            </Link>
            <Link href="/blog/about" style={headerLink}>
              About
            </Link>
            <Link href="/feed.xml" style={headerLink}>
              RSS
            </Link>
          </nav>
        </div>
      </header>
      <div style={{ height: "3px", backgroundColor: "#b8941e" }} />
      <main id="content" className="blog-shell" style={{ flex: 1, paddingTop: "2.25rem", paddingBottom: "2.5rem" }}>
        {children}
      </main>
      <footer style={{ borderTop: "1px dotted #ccc8bf" }}>
        <div className="blog-shell" style={{ paddingTop: "1.25rem", paddingBottom: "1.75rem" }}>
          <p style={{ margin: "0 0 0.75rem", color: "#5a5a52" }}>{author.name}</p>
          <nav aria-label="Footer" className="blog-footer-nav">
            <Link href="/blog">Blog</Link>
            <Link href="/blog/about">About</Link>
            <Link href="/blog/contact">Contact</Link>
            <Link href="/blog/privacy">Privacy</Link>
            <Link href="/blog/affiliate-disclosure">Affiliate disclosure</Link>
            <Link href="/feed.xml">RSS</Link>
          </nav>
          <p style={{ margin: "0.9rem 0 0", color: "#6b7f96", fontSize: "0.9rem" }}>© 2026 Windrose AI</p>
        </div>
      </footer>
    </div>
  );
}
