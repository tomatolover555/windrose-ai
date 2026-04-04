import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Windrose AI",
  description: "Thinking about the agentic web.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
