import { NextResponse } from "next/server";
import { checkFrameworkRateLimit } from "@/lib/agentic/rateLimit";
import { logFrameworkExecution } from "@/lib/agentic/logger";

export const runtime = "nodejs";

const BASE_URL = "https://windrose-ai.com";

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

export async function GET(req: Request): Promise<Response> {
  const start = Date.now();
  const ip = getClientIp(req) ?? "unknown";

  const rl = await checkFrameworkRateLimit(`ip:${ip}:world:map`);
  if (rl.limited) {
    const retryAfterSeconds = Math.max(0, Math.ceil((rl.resetMs - Date.now()) / 1000));
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
        },
      },
    );
  }

  const body = {
    world: {
      id: "windrose-world",
      version: "0.1",
      theme: "decision-physics",
      dimensions: [
        { id: "trust", description: "evidence-based confidence" },
        { id: "availability", description: "can the surface be reached" },
      ],
      worlds: [
        { id: "balanced", weights: { trust_score: 0.7, availability: 0.3 } },
        { id: "trust_dominant", weights: { trust_score: 0.9, availability: 0.1 } },
      ],
      entities: {
        a: { domain: "windrose-ai.com", label: "Windrose" },
        b_candidates: [
          { domain: "vercel.com", label: "Vercel" },
          { domain: "github.com", label: "GitHub" },
          { domain: "example.com", label: "Example" },
        ],
      },
    },
    paths: {
      experience: `${BASE_URL}/api/world/experience`,
      reflect: `${BASE_URL}/api/world/reflect`,
    },
  };

  const latencyMs = Date.now() - start;
  await logFrameworkExecution({
    timestamp: new Date().toISOString(),
    framework_id: "world.map",
    input: null,
    output: body,
    latency_ms: latencyMs,
    user_agent: req.headers.get("user-agent"),
    ip: ip === "unknown" ? null : ip,
  });

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=60",
      "CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
