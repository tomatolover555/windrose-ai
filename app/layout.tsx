import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://windrose-ai.com"),
  title: "Windrose AI",
  description: "Thinking about the agentic web.",
  openGraph: {
    title: "Windrose AI",
    description: "Thinking about the agentic web.",
    url: "https://windrose-ai.com",
    siteName: "Windrose AI",
    images: [{ url: "https://windrose-ai.com/logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Windrose AI",
    description: "Thinking about the agentic web.",
    images: ["https://windrose-ai.com/logo.png"],
  },
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta {...({
          name: "impact-site-verification",
          value: "9e24e876-72a0-40ae-8f22-a1e0b7e2c7b1",
        } as any)} />
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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-BXKR6NMBT7"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-BXKR6NMBT7');`}
        </Script>
        {children}
      </body>
    </html>
  );
}
