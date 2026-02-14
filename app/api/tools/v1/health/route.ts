import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    project: "windrose-ai",
    version: "0.1.0",
  });
}
