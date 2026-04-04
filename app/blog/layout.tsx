import Link from "next/link";

function CompassRose() {
  return (
    <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer gold ring */}
      <circle cx="20" cy="20" r="17" stroke="#b8941e" strokeWidth="1.5" fill="none" />
      {/* Gold intercardinal star (NE/SE/SW/NW) — shorter points */}
      <polygon
        points="27.8,12.2 24,20 27.8,27.8 20,24 12.2,27.8 16,20 12.2,12.2 20,16"
        fill="#b8941e"
      />
      {/* Cream cardinal star (N/S/E/W) — long points */}
      <polygon
        points="20,3 23,17 37,20 23,23 20,37 17,23 3,20 17,17"
        fill="#f0e8d4"
      />
      {/* Center dot */}
      <circle cx="20" cy="20" r="2.5" fill="#f0e8d4" />
    </svg>
  );
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f8f6f0" }}>
      {/* Navy masthead with SVG logo */}
      <header style={{ backgroundColor: "#1b3a6b" }}>
        <div className="max-w-[680px] mx-auto px-6 py-4">
          <Link
            href="/blog"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}
          >
            <CompassRose />
            <span style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "1.35rem",
              fontWeight: "700",
              color: "#f0e8d4",
              letterSpacing: "-0.01em",
              lineHeight: "1",
            }}>
              Windrose AI
            </span>
          </Link>
        </div>
      </header>

      {/* Gold accent line */}
      <div style={{ height: "3px", backgroundColor: "#b8941e" }} />

      {/* Main content */}
      <main className="flex-1 max-w-[680px] mx-auto w-full px-6 py-10">
        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px dotted #ccc8bf", marginTop: "3rem" }}>
        <div className="max-w-[680px] mx-auto px-6 py-6" />
      </footer>
    </div>
  );
}
