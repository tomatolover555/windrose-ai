import { NextResponse } from "next/server";
import { getFramework } from "@/lib/agentic/registry";
import type { AgenticContext, JsonValue } from "@/lib/agentic/types";
import { logFrameworkExecution } from "@/lib/agentic/logger";

export const runtime = "nodejs";

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

async function executeFramework(req: Request, frameworkId: string): Promise<Response> {
  const def = getFramework(frameworkId);
  if (!def) return new NextResponse("Not Found", { status: 404 });
  if (!def.enabled) return new NextResponse("Forbidden", { status: 403 });

  const requestId = crypto.randomUUID();
  const userAgent = req.headers.get("user-agent");
  const ip = getClientIp(req);

  let input: JsonValue | null = null;
  if (req.method !== "GET") {
    try {
      input = (await req.json()) as JsonValue;
    } catch {
      input = null;
    }
  }

  const context: AgenticContext = {
    requestId,
    input,
    ip,
    userAgent,
  };

  const start = Date.now();
  let output: JsonValue | null = null;
  let status = 200;

  try {
    output = (await def.handler(context)) as unknown as JsonValue;
  } catch (err) {
    status = 500;
    output = {
      error: "framework_execution_failed",
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
    ip,
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

