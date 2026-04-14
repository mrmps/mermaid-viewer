import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock env
vi.mock("@/lib/env", () => ({
  environment: {
    UPSTASH_REDIS_REST_URL: "https://fake-redis.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "fake-token",
  },
}));

// Mock Upstash Redis/Ratelimit
const mockLimit = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: class FakeRedis {
    constructor() {}
  },
}));

vi.mock("@upstash/ratelimit", () => {
  class FakeRatelimit {
    constructor() {}
    limit = mockLimit;
    static slidingWindow() {
      return {};
    }
  }
  return { Ratelimit: FakeRatelimit };
});

describe("Rate limiter", () => {
  let checkRateLimit: typeof import("../lib/rate-limit").checkRateLimit;

  beforeEach(async () => {
    mockLimit.mockReset();
    vi.resetModules();

    // Re-apply mocks for fresh module import
    vi.doMock("@/lib/env", () => ({
      environment: {
        UPSTASH_REDIS_REST_URL: "https://fake-redis.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "fake-token",
      },
    }));
    vi.doMock("@upstash/redis", () => ({
      Redis: class FakeRedis {
        constructor() {}
      },
    }));
    vi.doMock("@upstash/ratelimit", () => {
      class FakeRatelimit {
        constructor() {}
        limit = mockLimit;
        static slidingWindow() {
          return {};
        }
      }
      return { Ratelimit: FakeRatelimit };
    });

    const mod = await import("../lib/rate-limit");
    checkRateLimit = mod.checkRateLimit;
  });

  it("allows requests when under limit", async () => {
    mockLimit.mockResolvedValue({ success: true, remaining: 99, reset: Date.now() + 60000 });

    const result = await checkRateLimit("127.0.0.1", "read");
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(99);
  });

  it("blocks requests when rate limited", async () => {
    const resetTime = Date.now() + 30000;
    mockLimit
      .mockResolvedValueOnce({ success: true, remaining: 200, reset: resetTime }) // global passes
      .mockResolvedValueOnce({ success: false, remaining: 0, reset: resetTime }); // tier fails

    const result = await checkRateLimit("127.0.0.1", "write");
    expect(result.limited).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("blocks on global limit before checking tier", async () => {
    const resetTime = Date.now() + 30000;
    mockLimit.mockResolvedValueOnce({ success: false, remaining: 0, reset: resetTime });

    const result = await checkRateLimit("127.0.0.1", "chat");
    expect(result.limited).toBe(true);
    expect(mockLimit).toHaveBeenCalledTimes(1);
  });
});
