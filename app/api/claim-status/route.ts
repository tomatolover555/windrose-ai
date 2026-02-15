import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import fs from "node:fs/promises";
import path from "node:path";
import type { WebmcpClaimRecord } from "@/app/api/submit-webmcp-site/route";

export const runtime = "nodejs";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function loadFromFile(claimId: string): Promise<WebmcpClaimRecord | null> {
  const filePath = path.join(process.cwd(), "data", "webmcp_submissions.json");
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const items = JSON.parse(raw) as WebmcpClaimRecord[];
    return items.find((x) => x.claim_id === claimId) ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const claimId = url.searchParams.get("claim_id") ?? "";
  if (!isUuid(claimId)) {
    return NextResponse.json({ error: "invalid_claim_id" }, { status: 400 });
  }

  let record: WebmcpClaimRecord | null = null;
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get<string>(`windrose:webmcp_claim:${claimId}`);
      if (raw) {
        record = JSON.parse(raw) as WebmcpClaimRecord;
      } else {
        // Fallback: scan recent submissions list for the claim_id.
        const rows = await redis.lrange<string>("windrose:webmcp_submissions", 0, 999);
        for (const row of rows) {
          try {
            const parsed = JSON.parse(row) as WebmcpClaimRecord;
            if (parsed.claim_id === claimId) {
              record = parsed;
              break;
            }
          } catch {
            // ignore malformed row
          }
        }
      }
    } catch {
      record = null;
    }
  } else {
    record = await loadFromFile(claimId);
  }

  if (!record) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Do not expose IP/user agent or any internal metadata.
  return NextResponse.json(
    {
      claim_id: record.claim_id,
      domain: record.domain,
      status: record.status,
      created_at: record.created_at,
      updated_at: record.updated_at,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=600",
      },
    },
  );
}
