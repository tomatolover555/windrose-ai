import fs from "node:fs/promises";
import path from "node:path";
import type { JsonValue } from "@/lib/agentic/types";

export type FrameworkLogRecord = {
  timestamp: string;
  framework_id: string;
  input: JsonValue | null;
  output: JsonValue | null;
  latency_ms: number;
  user_agent: string | null;
  ip: string | null;
};

declare global {
  // In-memory ring buffer fallback (useful when filesystem is ephemeral, e.g. serverless).
  var __windroseFrameworkLogBuffer: FrameworkLogRecord[] | undefined;
}

function getMemoryBuffer(): FrameworkLogRecord[] {
  if (!globalThis.__windroseFrameworkLogBuffer) {
    globalThis.__windroseFrameworkLogBuffer = [];
  }
  return globalThis.__windroseFrameworkLogBuffer;
}

function getLogFilePath(): string {
  // Vercel functions have a read-only filesystem except for /tmp.
  // We keep the logical path /data/logs/... but map it to /tmp in production.
  const baseDir = process.env.VERCEL
    ? path.join("/tmp", "data", "logs")
    : path.join(process.cwd(), "data", "logs");
  return path.join(baseDir, "framework-log.jsonl");
}

export async function logFrameworkExecution(record: FrameworkLogRecord): Promise<void> {
  // Always keep a small in-memory tail for fast dashboard reads and as a fallback.
  const buf = getMemoryBuffer();
  buf.push(record);
  if (buf.length > 1000) buf.splice(0, buf.length - 1000);

  const filePath = getLogFilePath();
  const dir = path.dirname(filePath);

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
  } catch {
    // Best-effort logging: never fail the framework request.
  }
}

export async function readFrameworkLogs(limit: number): Promise<FrameworkLogRecord[]> {
  const filePath = getLogFilePath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const tail = lines.slice(Math.max(0, lines.length - limit));
    const records: FrameworkLogRecord[] = [];
    for (const line of tail) {
      try {
        records.push(JSON.parse(line) as FrameworkLogRecord);
      } catch {
        // skip malformed line
      }
    }
    return records.reverse(); // newest first
  } catch {
    // Fallback to in-memory logs if file reads are unavailable.
    return getMemoryBuffer().slice(-limit).reverse();
  }
}
