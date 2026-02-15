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

  const rl = await checkFrameworkRateLimit(`ip:${ip}:world:reflect`);
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
    reflection: {
      learned: [
        "Outcomes depend on evaluation physics, not just facts.",
        "Changing weights can reverse winners.",
        "In agent-driven markets, you compete inside someone else's scoring world.",
      ],
      open_questions: [
        "Which world will dominate in your category?",
        "What signals will agents treat as trust?",
        "How do we resist manipulation while staying useful?",
      ],
    },
    invitation: {
      contribute: `${BASE_URL}/api/submit-webmcp-site`,
      try_a_report: {
        method: "POST",
        url: `${BASE_URL}/api/frameworks/report.agent_selection.run`,
        body_example: {
          scenario: "risk_averse",
          domains: {
            a: { domain: "windrose-ai.com", label: "Windrose" },
            b: { domain: "vercel.com", label: "Vercel" },
          },
        },
      },
    },
  };

  const latencyMs = Date.now() - start;
  await logFrameworkExecution({
    timestamp: new Date().toISOString(),
    framework_id: "world.reflect",
    input: null,
    output: body,
    latency_ms: latencyMs,
    user_agent: req.headers.get("user-agent"),
    ip: ip === "unknown" ? null : ip,
  });

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=60",
      "CDN-Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
  });
}
