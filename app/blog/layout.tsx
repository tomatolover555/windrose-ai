import Link from "next/link";
import Image from "next/image";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f8f6f0" }}>
      {/* Logo header on cream background */}
      <header style={{ backgroundColor: "#f8f6f0", paddingTop: "1.25rem", paddingBottom: "1rem" }}>
        <div className="max-w-[680px] mx-auto px-6">
          <Link href="/blog" style={{ display: "inline-block", textDecoration: "none" }}>
            <Image
              src="/logo.png"
              alt="Windrose AI"
              width={150}
              height={56}
              style={{ display: "block" }}
              priority
            />
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
