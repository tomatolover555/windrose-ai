import { NextResponse } from "next/server";
import { getFramework } from "@/lib/agentic/registry";
import type { AgenticContext, JsonValue } from "@/lib/agentic/types";
import { logFrameworkExecution } from "@/lib/agentic/logger";
import { checkFrameworkRateLimit } from "@/lib/agentic/rateLimit";

export const runtime = "nodejs";

function getHttpErrorMeta(err: unknown): { status: number; code?: string } | null {
  if (!err || typeof err !== "object") return null;
  const rec = err as Record<string, unknown>;
  const status = rec.status;
  const code = rec.code;
  if (typeof status === "number" && Number.isFinite(status)) {
    return { status, code: typeof code === "string" ? code : undefined };
  }
  return null;
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

function getInputFromSearchParams(url: URL): JsonValue | null {
  const sp = url.searchParams;
  if (sp.size === 0) return null;

  const domain = sp.get("domain") ?? undefined;
  const maxFetchRaw = sp.get("max_fetch_ms");
  const max_fetch_ms = maxFetchRaw ? Number(maxFetchRaw) : undefined;
  const wellKnownRaw = sp.get("well_known_mcp");
  const homepageRaw = sp.get("homepage_html");
  const well_known_mcp = wellKnownRaw ? wellKnownRaw === "1" || wellKnownRaw === "true" : undefined;
  const homepage_html = homepageRaw ? homepageRaw === "1" || homepageRaw === "true" : undefined;

  const tagsRaw = sp.getAll("tags").flatMap((v) => v.split(","));
  const tags = tagsRaw.map((t) => t.trim()).filter(Boolean);

  const limitRaw = sp.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const budget = sp.get("budget") ?? undefined;
  const query = sp.get("query") ?? undefined;
  const category = sp.get("category") ?? undefined;

  const status = sp.get("status") ?? undefined;
  const minConfidenceRaw = sp.get("min_confidence");
  const minConfidence = minConfidenceRaw ? Number(minConfidenceRaw) : undefined;
  const typesRaw = sp.getAll("type").flatMap((v) => v.split(","));
  const types = typesRaw.map((t) => t.trim()).filter(Boolean);

  const filters: Record<string, JsonValue> = {};
  if (status) filters.status = status;
  if (Number.isFinite(minConfidence)) filters.min_confidence = minConfidence as number;
  if (types.length > 0) filters.type = types;

  const checks: Record<string, JsonValue> = {};
  if (typeof well_known_mcp === "boolean") checks.well_known_mcp = well_known_mcp;
  if (typeof homepage_html === "boolean") checks.homepage_html = homepage_html;

  return {
    ...(domain !== undefined ? { domain } : {}),
    ...(Number.isFinite(max_fetch_ms) ? { max_fetch_ms: max_fetch_ms as number } : {}),
    ...(query !== undefined ? { query } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(budget !== undefined ? { budget } : {}),
    ...(Number.isFinite(limit) ? { limit } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    ...(Object.keys(checks).length > 0 ? { checks } : {}),
  };
}

async function executeFramework(req: Request, frameworkId: string): Promise<Response> {
  const ip = getClientIp(req) ?? "unknown";
  const rateKey = `ip:${ip}:fw:${frameworkId}`;
  const rl = await checkFrameworkRateLimit(rateKey);
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

  const def = getFramework(frameworkId);
  if (!def) return new NextResponse("Not Found", { status: 404 });
  if (!def.enabled) return new NextResponse("Forbidden", { status: 403 });

  const requestId = crypto.randomUUID();
  const userAgent = req.headers.get("user-agent");
  const ipMaybe = ip === "unknown" ? null : ip;

  let input: JsonValue | null = null;
  if (req.method === "GET") {
    input = getInputFromSearchParams(new URL(req.url));
  } else {
    try {
      input = (await req.json()) as JsonValue;
    } catch {
      input = null;
    }
  }

  const context: AgenticContext = {
    requestId,
    input,
    ip: ipMaybe,
    userAgent,
  };

  const start = Date.now();
  let output: JsonValue | null = null;
  let status = 200;

  try {
    output = (await def.handler(context)) as unknown as JsonValue;
  } catch (err) {
    const meta = getHttpErrorMeta(err);
    const httpStatus = meta?.status ?? null;
    const code = meta?.code ?? null;

    status = httpStatus && httpStatus >= 400 && httpStatus <= 599 ? httpStatus : 500;
    output = {
      error: code ?? "framework_execution_failed",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }

  const latencyMs = Date.now() - start;

  await logFrameworkExecution({
    timestamp: new Date().toISOString(),
    framework_id: def.id,
    input,
    output,
    latency_ms: latencyMs,
    user_agent: userAgent,
    ip: ipMaybe,
  });

  return NextResponse.json(
    {
      request_id: requestId,
      framework_id: def.id,
      result: output,
      metadata: { latency_ms: latencyMs },
    },
    { status },
  );
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  return executeFramework(req, id);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  return executeFramework(req, id);
}
