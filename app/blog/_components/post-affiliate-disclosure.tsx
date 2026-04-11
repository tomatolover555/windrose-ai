import Link from "next/link";

export function PostAffiliateDisclosure() {
  return (
    <p
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: "0.78rem",
        lineHeight: "1.6",
        color: "#6b7f96",
        margin: "0 0 1.5rem",
      }}
    >
      This post may contain affiliate links. If you purchase through them, Windrose AI may earn a
      commission at no extra cost to you. See our{" "}
      <Link
        href="/blog/affiliate-disclosure"
        style={{ color: "#1b3a6b", textDecoration: "underline" }}
      >
        Affiliate Disclosure
      </Link>
      .
    </p>
  );
}
