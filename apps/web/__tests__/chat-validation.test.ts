import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock env
vi.mock("@/lib/env", () => ({
  environment: {
    OPENROUTER_API_KEY: "test-key",
    NEXT_PUBLIC_BASE_URL: "https://merm.sh",
  },
}));

// Mock DB module
vi.mock("@mermaid-viewer/db", () => ({
  addVersion: vi.fn().mockResolvedValue({ version: 2 }),
  getDiagram: vi.fn().mockResolvedValue({
    diagram: { id: "test", title: "Test", currentVersion: 1 },
    currentVersion: { version: 1, content: "graph TD; A-->B", createdAt: new Date() },
    allVersions: [{ version: 1, content: "graph TD; A-->B", createdAt: new Date() }],
  }),
}));

// Mock OpenRouter
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
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import("../app/api/chat/route");
    POST = mod.POST;
  });

  it("rejects payloads larger than the chat request limit", async () => {
    const hugeContent = "x".repeat(1_100_000);
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
    expect(json.message).toContain("Chat request is too large");
    expect(json.message).toContain("1.0 MB");
  });

  it("accepts long requests that are well above the old limit", async () => {
    const longArticle = "x".repeat(200_000);
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            id: "msg-1",
            role: "user",
            parts: [{ type: "text", text: longArticle }],
          },
        ],
        diagramId: "test",
        editId: "edit",
        currentContent: "graph TD; A-->B",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
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
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({
      environment: {
        OPENROUTER_API_KEY: undefined,
        NEXT_PUBLIC_BASE_URL: "https://merm.sh",
      },
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
