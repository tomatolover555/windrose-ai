import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type Status = "verified" | "likely" | "unverified" | "dead";
type VerificationStatus = "unverified" | "verified" | "revoked";
type ItemType = "webmcp" | "mcp-server";
type Proof = { type: string; url: string; last_success: string };

type DirectoryItem = {
  domain: string;
  type: ItemType[];
  confidence: number;
  status: Status;
  verification_status?: VerificationStatus;
  last_seen: string;
  proof?: Proof[];
};

type DirectoryFile = { updated_at: string; items: DirectoryItem[] };

const STATUS_ORDER: Record<Status, number> = {
  verified: 0,
  likely: 1,
  unverified: 2,
  dead: 3,
};

async function loadDirectory(): Promise<DirectoryFile> {
  const filePath = path.join(process.cwd(), "data", "webmcp_directory.json");
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as DirectoryFile;
}

function clampLimit(v: string | null): number {
  const n = v ? Number(v) : 50;
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(200, Math.floor(n)));
}

function proofSummary(item: DirectoryItem): string[] {
  const types = new Set((item.proof ?? []).map((p) => String(p.type)));
  return Array.from(types).sort();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = clampLimit(url.searchParams.get("limit"));

  const data = await loadDirectory();

  // Snapshot is focused: verified first, then likely.
  const filtered = data.items.filter((i) => i.status === "verified" || i.status === "likely");

  filtered.sort((a, b) => {
    const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (so !== 0) return so;
    const cd = b.confidence - a.confidence;
    if (cd !== 0) return cd;
    const ld = String(b.last_seen).localeCompare(String(a.last_seen));
    if (ld !== 0) return ld;
    return a.domain.localeCompare(b.domain);
  });

  const results = filtered.slice(0, limit).map((i) => ({
    domain: i.domain,
    type: i.type,
    verification_status: i.verification_status ?? "unverified",
    confidence: i.confidence,
    last_seen: i.last_seen,
    proof_summary: proofSummary(i),
  }));

  return NextResponse.json(
    {
      updated_at: data.updated_at,
      results,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

