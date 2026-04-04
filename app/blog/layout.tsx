import Link from "next/link";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f9f6f1" }}>
      {/* Dark masthead */}
      <header style={{ backgroundColor: "#1c1c1e" }}>
        <div className="max-w-[680px] mx-auto px-6 py-5">
          <div className="flex items-baseline justify-between">
            <Link
              href="/blog"
              className="font-serif font-bold text-white hover:text-[#f9f6f1] transition-colors"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "1.5rem",
                textDecoration: "none",
              }}
            >
              The Agentic Web
            </Link>
            <Link
              href="/"
              className="font-sans text-[#888480] hover:text-white transition-colors"
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontSize: "0.7rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Windrose
            </Link>
          </div>
        </div>
      </header>

      {/* Thin ember accent line under masthead */}
      <div style={{ height: "3px", backgroundColor: "#c8590a" }} />

      {/* Main content */}
      <main className="flex-1 max-w-[680px] mx-auto w-full px-6 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer
        className="mt-16"
        style={{ borderTop: "1px solid #d4cfc8" }}
      >
        <div
          className="max-w-[680px] mx-auto px-6 py-8"
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: "0.8rem",
            color: "#888480",
          }}
        >
          <p>Windrose AI — thinking about the agentic web.</p>
        </div>
      </footer>
    </div>
  );
}
