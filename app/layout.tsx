import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Windrose AI",
  description: "Thinking about the agentic web.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Blog",
              name: "Windrose AI",
              description: "Thinking about the agentic web.",
              url: "https://windrose-ai.com",
              publisher: {
                "@type": "Organization",
                name: "Windrose AI",
                url: "https://windrose-ai.com",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
