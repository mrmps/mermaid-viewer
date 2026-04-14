import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prepareMermaidSource } from "@/lib/mermaid-source";

const mockCreateDiagram = vi.fn();

vi.mock("@mermaid-viewer/db", () => ({
  createDiagram: (...args: unknown[]) => mockCreateDiagram(...args),
}));

vi.mock("@/lib/env", () => ({
  baseUrl: "https://merm.sh",
}));

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

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(
    new URL(url, "https://merm.sh"),
    init as ConstructorParameters<typeof NextRequest>[1],
  );
}

describe("POST /api/d validation integration", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../app/api/d/route");
    POST = mod.POST;
  });

  it("rejects the invalid architecture-beta sample before saving", async () => {
    const req = makeRequest("/api/d", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: INVALID_ARCHITECTURE_DIAGRAM }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(mockCreateDiagram).not.toHaveBeenCalled();

    const json = await res.json();
    expect(json.error).toBe("invalid_syntax");
    expect(json.message).toContain("Parsing failed");
  });

  it("accepts a bare top-level title when the diagram is otherwise valid", async () => {
    mockCreateDiagram.mockResolvedValue({
      id: "abc123",
      editId: "edit456",
      secret: "secret789",
      version: 1,
    });

    const req = makeRequest("/api/d", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: TITLED_ARCHITECTURE_DIAGRAM }),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockCreateDiagram).toHaveBeenCalledWith({
      content: prepareMermaidSource(TITLED_ARCHITECTURE_DIAGRAM),
      title: undefined,
    });
  });
});
