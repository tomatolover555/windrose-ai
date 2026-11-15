"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/blog/about", label: "About" },
  { href: "/for-agents", label: "For agents" },
  { href: "/feed.xml", label: "RSS" },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/for-agents") return pathname === "/for-agents";
  if (href === "/blog/about") return pathname === "/blog/about";
  if (href === "/blog") {
    return pathname === "/blog" || (pathname.startsWith("/blog/") && pathname !== "/blog/about");
  }
  return false;
}

export function SiteNav() {
  const pathname = usePathname() || "";

  return (
    <nav aria-label="Primary">
      <ul className="site-nav">
        {LINKS.map((item) => {
          const current = isCurrent(pathname, item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={current ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
