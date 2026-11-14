import type { NextConfig } from "next";
import { POST_REDIRECTS } from "./lib/redirects";

const consolidatedPostRedirects = Object.entries(POST_REDIRECTS).flatMap(([from, to]) =>
  ["", ".md", ".json"].map((suffix) => ({
    source: `/blog/${from}${suffix}`,
    destination: `/blog/${to}${suffix}`,
    permanent: true,
  }))
);

const nextConfig: NextConfig = {
  async redirects() {
    return consolidatedPostRedirects;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https:",
              "style-src 'self' 'unsafe-inline' https:",
              "script-src 'self' 'unsafe-inline' https:",
              "connect-src 'self' https:",
              "frame-src 'self' https:",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
