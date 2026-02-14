import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/dashboard"],
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

export function middleware(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return new NextResponse("Unauthorized", { status: 401 });

  const token = extractToken(req);
  if (token !== expected) return new NextResponse("Unauthorized", { status: 401 });

  return NextResponse.next();
}

