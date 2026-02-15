import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import type { WebmcpClaimRecord } from "@/app/api/submit-webmcp-site/route";

export const runtime = "nodejs";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function getUpstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

type UpstashPipelineResponse<T> = Array<{ result?: T; error?: string }>;

async function upstashPipeline<T>(commands: Array<[string, ...string[]]>): Promise<UpstashPipelineResponse<T> | null> {
  const cfg = getUpstashConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as UpstashPipelineResponse<T>;
  } catch {
    return null;
  }
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
  const cfg = getUpstashConfig();
  if (cfg) {
    const key = `windrose:webmcp_claim:${claimId}`;
    const getResp = await upstashPipeline<string>([["GET", key]]);
    const raw = getResp?.[0]?.result ?? null;
    if (raw) {
      try {
        record = JSON.parse(raw) as WebmcpClaimRecord;
      } catch {
        record = null;
      }
    }
    if (!record) {
      const listResp = await upstashPipeline<string[]>([["LRANGE", "windrose:webmcp_submissions", "0", "999"]]);
      const rows = listResp?.[0]?.result ?? [];
      if (Array.isArray(rows)) {
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
