import { afterEach, describe, expect, it, vi } from "vitest";

const INVALID_ARCHITECTURE_DIAGRAM = `architecture-beta
  group cloud(cloud)[Cloudflare Global Network]
    service gateway(internet)[User Request] in cloud
    service worker(server)[Cloudflare Worker] in cloud
    service cache(database)[KV Storage / Cache] in cloud
    service durable(server)[Durable Objects] in cloud
    service r2(disk)[R2 Object Storage] in cloud
    service d1(database)[D1 SQL Database] in cloud

  group origin(cloud)[External Resources]
    service api(server)[External API] in origin
    service db(database)[Legacy DB] in origin

  gateway:R --> L:worker
  worker:R --> L:cache
  worker:B --> T:durable
  worker:B --> T:r2
  worker:B --> T:d1
  worker:R --> L:api
  worker:R --> L:db`;

const TITLED_ARCHITECTURE_DIAGRAM = `%%{init: {'theme': 'base'}}%%
title: Edge Computing Architecture
architecture-beta
  group cloud(cloud)[Cloudflare Global Network]
    service gateway(internet)[User Request] in cloud
    service worker(server)[Cloudflare Worker] in cloud
    service cache(database)[KV Cache] in cloud
    service durable(server)[Durable Objects] in cloud
    service r2(disk)[R2 Storage] in cloud
    service d1(database)[D1 Database] in cloud

  group origin(cloud)[External Resources]
    service api(server)[External API] in origin
    service db(database)[Legacy DB] in origin

  gateway:R --> L:worker
  worker:R --> L:cache
  worker:B --> T:durable
  worker:B --> T:r2
  worker:B --> T:d1
  worker:R --> L:api
  worker:R --> L:db`;

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("mermaid");
  for (const name of [
    "window",
    "document",
    "navigator",
    "Document",
    "Element",
    "HTMLElement",
    "Node",
    "SVGElement",
    "DOMParser",
    "MutationObserver",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame",
  ]) {
    delete (globalThis as Record<string, unknown>)[name];
  }
});

describe("validateMermaid", () => {
  it("rejects the architecture-beta sample that the renderer cannot parse", async () => {
    const { validateMermaid } = await import("../lib/mermaid-parse");

    const result = await validateMermaid(INVALID_ARCHITECTURE_DIAGRAM);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation failure");
    }
    expect(result.kind).toBe("syntax");
    expect(result.message).toContain("Parsing failed");
  });

  it("accepts a leading bare title by normalizing it into Mermaid frontmatter", async () => {
    const { validateMermaid } = await import("../lib/mermaid-parse");

    const result = await validateMermaid(TITLED_ARCHITECTURE_DIAGRAM);

    expect(result).toEqual({ ok: true });
  });

  it("creates a DOM fallback before initializing Mermaid on the server", async () => {
    const parse = vi.fn().mockResolvedValue(undefined);
    const initialize = vi.fn(() => {
      if (typeof document === "undefined" || typeof window === "undefined") {
        throw new Error("document is not defined");
      }
    });

    vi.doMock("mermaid", () => ({
      default: { initialize, parse },
    }));

    const { validateMermaid } = await import("../lib/mermaid-parse");

    const result = await validateMermaid("graph TD; A-->B");

    expect(result).toEqual({ ok: true });
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("fails closed when Mermaid cannot initialize", async () => {
    vi.doMock("mermaid", () => ({
      default: {
        initialize: () => {
          throw new Error("DOMPurify.sanitize is not a function");
        },
      },
    }));

    const { validateMermaid } = await import("../lib/mermaid-parse");

    const result = await validateMermaid("graph TD; A-->B");

    expect(result).toEqual({
      ok: false,
      kind: "unavailable",
      message: expect.stringContaining("Mermaid validation is unavailable"),
    });
  });
});
