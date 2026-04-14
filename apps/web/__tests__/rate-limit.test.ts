import { describe, it, expect, vi, beforeEach } from "vitest";

// Test rate limiter with no Redis (permissive mode)
vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

describe("Rate limiter (no Redis — permissive fallback)", () => {
  let checkRateLimit: typeof import("../lib/rate-limit").checkRateLimit;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../lib/rate-limit");
    checkRateLimit = mod.checkRateLimit;
  });

  it("allows read requests without Redis", async () => {
    const result = await checkRateLimit("127.0.0.1", "read");
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(999);
  });

  it("allows write requests without Redis", async () => {
    const result = await checkRateLimit("127.0.0.1", "write");
    expect(result.limited).toBe(false);
  });

  it("allows chat requests without Redis", async () => {
    const result = await checkRateLimit("127.0.0.1", "chat");
    expect(result.limited).toBe(false);
  });
});
