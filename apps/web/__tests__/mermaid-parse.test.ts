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

const PARALLELOGRAM_OPENER_DIAGRAM = `graph TB
    subgraph Sandbox["Agent Sandbox"]
        direction TB
        WS[/workspace dir<br/>File Sync Service]
        ENV[Env vars:<br/>SESSION_TOKEN]
    end`;

const SUBGRAPH_HIDES_LEX_ERROR = `graph TB
    subgraph Sandbox["Agent Sandbox"]
        AGENT[Agent Loop]
        WS[/workspace dir<br/>File Sync Service]
    end`;

const FULL_SUBMITTED_DIAGRAM = `graph TB
    subgraph Client["User / Client"]
        U[User Request]
    end

    subgraph Backend["Backend (ECS Fargate)"]
        API[REST API<br/>Agent Orchestrator]
    end

    subgraph Sandbox["Agent Sandbox — Unikraft micro-VM<br/>(Docker in dev/evals)"]
        direction TB
        AGENT[Agent Loop<br/>Python bytecode only]
        GW[Gateway Protocol<br/>ControlPlaneGateway]
        WS[/workspace dir<br/>File Sync Service]
        ENV[Env vars:<br/>SESSION_TOKEN<br/>CONTROL_PLANE_URL<br/>SESSION_ID<br/><i>stripped after boot</i>]
        AGENT --> GW
        AGENT --> WS
    end

    subgraph ControlPlane["Control Plane (stateless FastAPI)"]
        AUTH[Validate<br/>Bearer session_token]
        LLMProxy[LLM Proxy<br/>owns full history]
        PreSign[Presigned URL<br/>Generator]
        Bill[Cost caps<br/>+ Billing]
        DB[(Session DB<br/>+ Credentials)]
        AUTH --> LLMProxy
        AUTH --> PreSign
        AUTH --> Bill
        LLMProxy --> DB
    end

    U --> API
    API -->|provision VM| Sandbox
    GW -->|HTTPS| AUTH

    classDef danger fill:#fee,stroke:#c33,color:#000
    class Sandbox danger`;

describe("validateMermaid", () => {
  it("rejects the node-shape typo even when nested inside a subgraph (this is what prod misses)", async () => {
    const { validateMermaid } = await import("../lib/mermaid-parse");

    const result = await validateMermaid(SUBGRAPH_HIDES_LEX_ERROR);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.kind).toBe("syntax");
  });

  it("rejects the node-shape typo that breaks the renderer (WS[/...] without closing /])", async () => {
    const { validateMermaid } = await import("../lib/mermaid-parse");

    const result = await validateMermaid(PARALLELOGRAM_OPENER_DIAGRAM);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation failure");
    }
    expect(result.kind).toBe("syntax");
  });

  it("rejects the full submitted diagram that renders as Lexical error on line 14", async () => {
    const { validateMermaid } = await import("../lib/mermaid-parse");

    const result = await validateMermaid(FULL_SUBMITTED_DIAGRAM);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation failure");
    }
    expect(result.kind).toBe("syntax");
  });

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

  it("serializes concurrent validations while the temporary DOM is installed", async () => {
    let parseCalls = 0;
    let resolveFirstParse!: () => void;
    let signalFirstParseStarted!: () => void;
    const firstParseStarted = new Promise<void>((resolve) => {
      signalFirstParseStarted = resolve;
    });
    const firstParseReleased = new Promise<void>((resolve) => {
      resolveFirstParse = resolve;
    });

    vi.doMock("mermaid", () => ({
      default: {
        initialize: vi.fn(),
        parse: vi.fn(async () => {
          parseCalls += 1;

          if (parseCalls === 1) {
            signalFirstParseStarted();
            await firstParseReleased;
          }
        }),
      },
    }));

    const { validateMermaid } = await import("../lib/mermaid-parse");

    const firstValidation = validateMermaid("graph TD; A-->B");
    await firstParseStarted;

    const secondValidation = validateMermaid("graph TD; B-->C");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(parseCalls).toBe(1);

    resolveFirstParse();

    await expect(
      Promise.all([firstValidation, secondValidation]),
    ).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(parseCalls).toBe(2);
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
