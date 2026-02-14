import { NextResponse } from "next/server";
import { listFrameworks } from "@/lib/agentic/registry";

export const runtime = "nodejs";

export async function GET() {
  const frameworks = listFrameworks().map((f) => ({
    id: f.id,
    title: f.name,
    description: f.description,
    enabled: f.enabled,
  }));

  const enabledFrameworks = frameworks.filter((f) => f.enabled).map((f) => f.id);

  return NextResponse.json({
    frameworks,
    enabled_frameworks: enabledFrameworks,
    version: "0.1.0",
  });
}

