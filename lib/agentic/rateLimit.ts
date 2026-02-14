import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

declare global {
  var __windroseUpstashRedis: Redis | undefined;
  var __windroseFrameworkRatelimit: Ratelimit | undefined;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!globalThis.__windroseUpstashRedis) {
    globalThis.__windroseUpstashRedis = new Redis({ url, token });
  }
  return globalThis.__windroseUpstashRedis;
}

export type RateLimitResult = {
  limited: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
};

export async function checkFrameworkRateLimit(identifier: string): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    // If Redis isn’t configured, don’t block requests (keep infra usable in dev).
    return { limited: false, limit: 0, remaining: 0, resetMs: Date.now() };
  }

  if (!globalThis.__windroseFrameworkRatelimit) {
    globalThis.__windroseFrameworkRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
      prefix: "windrose:ratelimit",
    });
  }

  const res = await globalThis.__windroseFrameworkRatelimit.limit(identifier);
  return {
    limited: !res.success,
    limit: res.limit,
    remaining: res.remaining,
    resetMs: res.reset,
  };
}

