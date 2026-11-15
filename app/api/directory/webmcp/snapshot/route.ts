import { NextResponse } from "next/server";
import snapshot from "@/lib/generated/webmcp-snapshot.json";

export const runtime = "nodejs";

type VerificationStatus = "unverified" | "verified" | "revoked";
type ItemType = "webmcp" | "mcp-server";

type SnapshotResult = {
  domain: string;
  type: ItemType[];
  verification_status: VerificationStatus;
  confidence: number;
  last_seen: string;
  proof_summary: string[];
};

function clampLimit(v: string | null): number {
  const n = v ? Number(v) : 50;
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(200, Math.floor(n)));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = clampLimit(url.searchParams.get("limit"));
  const results = (snapshot.results as SnapshotResult[]).slice(0, limit);

  return NextResponse.json(
    {
      updated_at: snapshot.updated_at,
      results,
    },
    {
      headers: {
        // Vercel may normalize Cache-Control; provide CDN-specific header explicitly.
        "Cache-Control": "public, max-age=60",
        "CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
