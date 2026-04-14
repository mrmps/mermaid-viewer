import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB module before importing the route
vi.mock("@mermaid-viewer/db", () => ({
  addVersion: vi.fn().mockResolvedValue({ version: 2 }),
  getDiagram: vi.fn().mockResolvedValue({
    diagram: { id: "test", title: "Test", currentVersion: 1 },
    currentVersion: { version: 1, content: "graph TD; A-->B", createdAt: new Date() },
    allVersions: [{ version: 1, content: "graph TD; A-->B", createdAt: new Date() }],
  }),
}));

// Mock OpenRouter so we don't need a real API key
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => ({
    chat: () => ({}),
  }),
}));

vi.mock("ai", () => ({
  convertToModelMessages: vi.fn().mockResolvedValue([]),
  streamText: vi.fn().mockReturnValue({
    toUIMessageStreamResponse: () => new Response("ok"),
  }),
  tool: vi.fn().mockReturnValue({}),
  validateUIMessages: vi.fn().mockResolvedValue([]),
  zodSchema: vi.fn().mockReturnValue({}),
  stepCountIs: vi.fn().mockReturnValue(() => false),
}));

describe("POST /api/chat", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const mod = await import("../app/api/chat/route");
    POST = mod.POST;
  });

  it("rejects payloads larger than 128KB", async () => {
    const hugeContent = "x".repeat(200_000);
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [],
        diagramId: "test",
        editId: "edit",
        currentContent: hugeContent,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toBe("payload_too_large");
  });

  it("rejects more than 50 messages", async () => {
    const messages = Array.from({ length: 51 }, (_, i) => ({
      id: `msg-${i}`,
      role: "user",
      content: `message ${i}`,
    }));

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        diagramId: "test",
        editId: "edit",
        currentContent: "graph TD; A-->B",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("bad_request");
  });

  it("rejects requests without diagramId", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [],
        diagramId: "",
        editId: "edit",
        currentContent: "graph TD; A-->B",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("rejects requests without editId", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [],
        diagramId: "test",
        editId: "",
        currentContent: "graph TD; A-->B",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 503 when OPENROUTER_API_KEY is not set", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    // Re-import to pick up the new env
    vi.resetModules();

    // Re-mock dependencies for the fresh module
    vi.doMock("@mermaid-viewer/db", () => ({
      addVersion: vi.fn(),
      getDiagram: vi.fn(),
    }));
    vi.doMock("@ai-sdk/openai", () => ({
      createOpenAI: () => ({ chat: () => ({}) }),
    }));
    vi.doMock("ai", () => ({
      convertToModelMessages: vi.fn(),
      streamText: vi.fn(),
      tool: vi.fn(),
      validateUIMessages: vi.fn(),
      zodSchema: vi.fn(),
      stepCountIs: vi.fn(),
    }));

    const mod = await import("../app/api/chat/route");
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [],
        diagramId: "test",
        editId: "edit",
        currentContent: "graph TD; A-->B",
      }),
    });

    const res = await mod.POST(req);
    expect(res.status).toBe(503);
  });
});
