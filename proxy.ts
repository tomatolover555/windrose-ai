import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/dashboard", "/blog/:slug*.md", "/blog/page/:path*"],
};

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim() || null;

  const headerToken = req.headers.get("x-admin-token");
  if (headerToken) return headerToken.trim() || null;

  const qp = req.nextUrl.searchParams.get("token");
  if (qp) return qp.trim() || null;

  return null;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const paginationMatch = pathname.match(/^\/blog\/page\/(\d+)$/);
  if (paginationMatch) {
    const page = paginationMatch[1];
    return NextResponse.rewrite(new URL(`/blog/p/${page}`, req.url));
  }

  // Rewrite /blog/<slug>.md -> /api/blog-markdown/<slug>
  const mdMatch = pathname.match(/^\/blog\/(.+)\.md$/);
  if (mdMatch) {
    const slug = mdMatch[1];
    return NextResponse.rewrite(new URL(`/api/blog-markdown/${slug}`, req.url));
  }

  // Dashboard auth
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return new NextResponse("Unauthorized", { status: 401 });

  const token = extractToken(req);
  if (token !== expected) return new NextResponse("Unauthorized", { status: 401 });

  return NextResponse.next();
}
