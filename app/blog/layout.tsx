import Link from "next/link";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f8f6f0" }}>
      {/* Navy masthead */}
      <header style={{ backgroundColor: "#1b3a6b" }}>
        <div className="max-w-[680px] mx-auto px-6 py-5 flex justify-end">
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
        <div className="max-w-[680px] mx-auto px-6 py-6" />
      </footer>
    </div>
  );
}
