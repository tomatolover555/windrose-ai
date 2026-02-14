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

function getUpstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function upstashCommand<T>(pathName: string): Promise<T | null> {
  const cfg = getUpstashConfig();
  if (!cfg) return null;

  try {
    const res = await fetch(`${cfg.url}/${pathName}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      // Avoid caching in edge/CDNs.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: T };
    return (json.result ?? null) as T | null;
  } catch {
    return null;
  }
}

async function upstashPipeline(commands: Array<[string, ...string[]]>): Promise<boolean> {
  const cfg = getUpstashConfig();
  if (!cfg) return false;

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
    return res.ok;
  } catch {
    return false;
  }
}

export async function logFrameworkExecution(record: FrameworkLogRecord): Promise<void> {
  // Always keep a small in-memory tail for fast dashboard reads and as a fallback.
  const buf = getMemoryBuffer();
  buf.push(record);
  if (buf.length > 1000) buf.splice(0, buf.length - 1000);

  // Prefer persistent storage when available (Upstash Redis via Vercel Integration).
  // This keeps the dashboard consistent across serverless instances.
  const serialized = JSON.stringify(record);
  void upstashPipeline([
    ["LPUSH", "windrose:framework_logs", serialized],
    ["LTRIM", "windrose:framework_logs", "0", "999"],
  ]);

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
  // Try persistent storage first (if configured).
  const upstash = getUpstashConfig();
  if (upstash) {
    const rows = await upstashCommand<string[]>(
      `LRANGE/windrose:framework_logs/0/${Math.max(0, limit - 1)}`,
    );
    if (rows && Array.isArray(rows)) {
      const parsed: FrameworkLogRecord[] = [];
      for (const row of rows) {
        try {
          parsed.push(JSON.parse(row) as FrameworkLogRecord);
        } catch {
          // skip malformed row
        }
      }
      return parsed;
    }
  }

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
