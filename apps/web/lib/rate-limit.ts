import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type Tier = "read" | "write" | "chat";

/**
 * Shared Redis-backed rate limiter that works across all Vercel instances.
 * Falls back to permissive (no limiting) if UPSTASH_REDIS_REST_URL is not set,
 * so local dev and preview deploys without Redis aren't blocked.
 */

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function createLimiter(limit: number, window: `${number} ${"s" | "m" | "h"}`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: "rl",
  });
}

// Generous reads, moderate writes, strict chat (costs money)
const limiters: Record<Tier, Ratelimit | null> = {
  read: createLimiter(120, "60 s"),
  write: createLimiter(30, "60 s"),
  chat: createLimiter(10, "60 s"),
};

// Absolute ceiling per IP across all tiers
const globalLimiter = createLimiter(300, "60 s");

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfter: number;
}

export async function checkRateLimit(
  ip: string,
  tier: Tier
): Promise<RateLimitResult> {
  // No Redis configured — allow everything (local dev, preview deploys)
  if (!redis) {
    return { limited: false, remaining: 999, retryAfter: 0 };
  }

  // Global check first
  const global = await globalLimiter!.limit(`global:${ip}`);
  if (!global.success) {
    return {
      limited: true,
      remaining: 0,
      retryAfter: Math.ceil((global.reset - Date.now()) / 1000),
    };
  }

  // Tier-specific check
  const limiter = limiters[tier];
  if (!limiter) {
    return { limited: false, remaining: 999, retryAfter: 0 };
  }

  const result = await limiter.limit(`${tier}:${ip}`);
  if (!result.success) {
    return {
      limited: true,
      remaining: 0,
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    };
  }

  return {
    limited: false,
    remaining: result.remaining,
    retryAfter: 0,
  };
}
