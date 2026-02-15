import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export type WebmcpClaimStatus = "pending" | "approved" | "rejected" | "revoked";

export type WebmcpClaimRecord = {
  claim_id: string;
  created_at: string;
  updated_at: string;
  status: WebmcpClaimStatus;
  domain: string;
  proof_url?: string;
  notes?: string;
  // Internal-only metadata (never returned from status API).
  ip: string | null;
  user_agent: string | null;
};

declare global {
  var __windroseSubmitRedis: Redis | undefined;
  var __windroseSubmitRatelimit: Ratelimit | undefined;
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

function normalizeDomain(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // Accept either a bare domain or a URL; normalize to hostname.
  try {
    const asUrl = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    const host = asUrl.hostname.toLowerCase().replace(/^www\./, "");
    // Basic sanity: must contain a dot, and only allowed chars.
    if (!host.includes(".")) return null;
    if (!/^[a-z0-9.-]+$/.test(host)) return null;
    if (host.length > 255) return null;
    return host;
  } catch {
    return null;
  }
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!globalThis.__windroseSubmitRedis) globalThis.__windroseSubmitRedis = new Redis({ url, token });
  return globalThis.__windroseSubmitRedis;
}

async function rateLimit(req: Request): Promise<{ limited: boolean; retryAfter: number }> {
  const redis = getRedis();
  if (!redis) return { limited: false, retryAfter: 0 };

  if (!globalThis.__windroseSubmitRatelimit) {
    globalThis.__windroseSubmitRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "windrose:ratelimit:submit",
    });
  }

  const ip = getClientIp(req) ?? "unknown";
  const res = await globalThis.__windroseSubmitRatelimit.limit(`ip:${ip}`);
  if (res.success) return { limited: false, retryAfter: 0 };

  const retryAfter = Math.max(0, Math.ceil((res.reset - Date.now()) / 1000));
  return { limited: true, retryAfter };
}

async function storeSubmission(sub: WebmcpClaimRecord): Promise<void> {
  const redis = getRedis();
  const serialized = JSON.stringify(sub);

  if (redis) {
    // Persistent on Vercel; keep a bounded list.
    await redis
      .pipeline()
      // Index
      .lpush("windrose:webmcp_submissions", serialized)
      .ltrim("windrose:webmcp_submissions", 0, 999)
      // Direct lookup by claim_id
      .set(`windrose:webmcp_claim:${sub.claim_id}`, serialized)
      .exec();
    return;
  }

  // Local/dev fallback: append into an untracked file for auditability during development.
  const filePath = path.join(process.cwd(), "data", "webmcp_submissions.json");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  let existing: WebmcpClaimRecord[] = [];
  try {
    existing = JSON.parse(await fs.readFile(filePath, "utf8")) as WebmcpClaimRecord[];
  } catch {
    existing = [];
  }
  existing.push(sub);
  await fs.writeFile(filePath, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
}

export async function POST(req: Request) {
  const rl = await rateLimit(req);
  if (rl.limited) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const obj =
    body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  const domainRaw = typeof obj?.domain === "string" ? obj.domain : "";
  const domain = normalizeDomain(domainRaw);
  if (!domain) return NextResponse.json({ error: "invalid_domain" }, { status: 400 });

  const proofUrl = typeof obj?.proof_url === "string" ? obj.proof_url.trim() : undefined;
  const notes = typeof obj?.notes === "string" ? obj.notes.trim().slice(0, 1000) : undefined;

  const now = new Date().toISOString();
  const claimId = crypto.randomUUID();

  const submission: WebmcpClaimRecord = {
    claim_id: claimId,
    created_at: now,
    updated_at: now,
    status: "pending",
    domain,
    ...(proofUrl ? { proof_url: proofUrl } : {}),
    ...(notes ? { notes } : {}),
    ip: getClientIp(req),
    user_agent: req.headers.get("user-agent"),
  };

  await storeSubmission(submission);

  return NextResponse.json({
    status: "received",
    claim_id: claimId,
    domain,
    queued: true,
  });
}
