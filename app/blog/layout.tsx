import Link from "next/link";

function CompassRose() {
  return (
    <svg width="38" height="38" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Gold outer ring */}
      <circle cx="22" cy="22" r="17" stroke="#b8941e" strokeWidth="1.2" fill="none" />

      {/* Small outward spike diamonds at cardinal positions */}
      <polygon points="22,1.5 23.2,5 22,4.2 20.8,5"   fill="#b8941e" /> {/* N */}
      <polygon points="22,42.5 23.2,39 22,39.8 20.8,39" fill="#b8941e" /> {/* S */}
      <polygon points="42.5,22 39,23.2 39.8,22 39,20.8" fill="#b8941e" /> {/* E */}
      <polygon points="1.5,22 5,23.2 4.2,22 5,20.8"   fill="#b8941e" /> {/* W */}

      {/* Dots on ring at intercardinal positions */}
      <circle cx="34" cy="10" r="1.3" fill="#b8941e" /> {/* NE */}
      <circle cx="34" cy="34" r="1.3" fill="#b8941e" /> {/* SE */}
      <circle cx="10" cy="34" r="1.3" fill="#b8941e" /> {/* SW */}
      <circle cx="10" cy="10" r="1.3" fill="#b8941e" /> {/* NW */}

      {/* Gold intercardinal star (shorter diagonal points) */}
      <polygon
        points="29.5,14.5 27.5,22 29.5,29.5 22,27.5 14.5,29.5 16.5,22 14.5,14.5 22,16.5"
        fill="#b8941e"
      />

      {/* Cream cardinal star (elongated N/S/E/W points) */}
      <polygon
        points="22,3 25.5,18.5 40,22 25.5,25.5 22,41 18.5,25.5 4,22 18.5,18.5"
        fill="#f0e8d4"
      />

      {/* Center dot */}
      <circle cx="22" cy="22" r="2.5" fill="#f0e8d4" />
    </svg>
  );
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f8f6f0" }}>
      {/* Navy masthead */}
      <header style={{ backgroundColor: "#1b3a6b" }}>
        <div className="max-w-[680px] mx-auto px-6 py-4">
          <Link
            href="/blog"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.65rem", textDecoration: "none" }}
          >
            <CompassRose />
            <span style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "1.4rem",
              fontWeight: "400",
              color: "#f0e8d4",
              letterSpacing: "0.01em",
              lineHeight: "1",
            }}>
              windrose ai
            </span>
          </Link>
        </div>
      </header>

      {/* Gold accent line */}
      <div style={{ height: "3px", backgroundColor: "#b8941e" }} />

      <main className="flex-1 max-w-[680px] mx-auto w-full px-6 py-10">
        {children}
      </main>

      <footer style={{ borderTop: "1px dotted #ccc8bf", marginTop: "3rem" }}>
        <div className="max-w-[680px] mx-auto px-6 py-6">
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "0.95rem",
              color: "#5a5a52",
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span>© 2026 Windrose AI</span>
            <Link href="/blog" style={{ color: "#1b3a6b", textDecoration: "none" }}>
              Blog
            </Link>
            <Link
              href="/blog/affiliate-disclosure"
              style={{ color: "#1b3a6b", textDecoration: "none" }}
            >
              Affiliate Disclosure
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
