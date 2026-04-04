import Link from "next/link";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Windrose
          </Link>
          <Link href="/blog" className="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors">
            Blog
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        {children}
      </main>
      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-2xl mx-auto px-6 py-8 text-sm text-gray-400">
          <p>Windrose AI — thinking about the agentic web.</p>
        </div>
      </footer>
    </div>
  );
}
