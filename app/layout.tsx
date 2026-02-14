import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Windrose AI",
  description: "Windrose AI infrastructure baseline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
