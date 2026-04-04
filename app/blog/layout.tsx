import Link from "next/link";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f8f6f0" }}>
      {/* Navy masthead */}
      <header style={{ backgroundColor: "#1b3a6b" }}>
        <div className="max-w-[680px] mx-auto px-6 py-5 flex items-baseline justify-between">
          <Link
            href="/blog"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: "700",
              fontSize: "1.5rem",
              color: "#ffffff",
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
          >
            The Agentic Web
          </Link>
          <Link
            href="/"
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: "0.65rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#b8941e",
              textDecoration: "none",
            }}
          >
            Windrose
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
        <div
          className="max-w-[680px] mx-auto px-6 py-8"
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: "0.75rem",
            color: "#6b7f96",
            letterSpacing: "0.02em",
          }}
        >
          Windrose AI — thinking about the agentic web.
        </div>
      </footer>
    </div>
  );
}
