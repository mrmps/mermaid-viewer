import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MermaidValidationResult } from "@/lib/mermaid-parse";

const mockCreateDiagram = vi.fn();
const mockValidateMermaid = vi.fn();

vi.mock("@mermaid-viewer/db", () => ({
  createDiagram: (...args: unknown[]) => mockCreateDiagram(...args),
  addVersion: vi.fn(),
  getDiagramByEditId: vi.fn(),
  getDiagram: vi.fn(),
  updateTitle: vi.fn(),
  deleteDiagram: vi.fn(),
}));

vi.mock("@/lib/mermaid-parse", () => ({
  validateMermaid: (...args: unknown[]) => mockValidateMermaid(...args),
}));

vi.mock("@/lib/env", () => ({
  baseUrl: "https://merm.sh",
  environment: { OPENROUTER_API_KEY: "test-key" },
}));

import { NextRequest } from "next/server";

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(
    new URL(url, "https://merm.sh"),
    init as ConstructorParameters<typeof NextRequest>[1]
  );
}

const OK_VALIDATION: MermaidValidationResult = { ok: true };
const SYNTAX_FAIL: MermaidValidationResult = {
  ok: false,
  kind: "syntax",
  message: "No diagram type detected",
};

describe("GET /go/<mermaid> — create-and-redirect for hand-off agents", () => {
  let GET: (
    req: NextRequest,
    ctx: { params: Promise<{ content: string[] }> }
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreateDiagram.mockResolvedValue({
      id: "abc",
      editId: "edt",
      secret: "sec",
      version: 1,
    });
    ({ GET } = await import("@/app/go/[...content]/route"));
  });

  it("creates a diagram and 302-redirects to /d/<id>", async () => {
    mockValidateMermaid.mockResolvedValue(OK_VALIDATION);
    const res = await GET(
      makeRequest("https://merm.sh/go/graph%20TD%3B%20A--%3EB"),
      { params: Promise.resolve({ content: ["graph%20TD%3B%20A--%3EB"] }) }
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://merm.sh/d/abc");
    expect(mockCreateDiagram).toHaveBeenCalledOnce();
  });

  it("exposes edit metadata in headers for agents that follow redirects and read headers", async () => {
    mockValidateMermaid.mockResolvedValue(OK_VALIDATION);
    const res = await GET(
      makeRequest("https://merm.sh/go/graph%20TD%3B%20A--%3EB"),
      { params: Promise.resolve({ content: ["graph%20TD%3B%20A--%3EB"] }) }
    );
    expect(res.headers.get("x-diagram-id")).toBe("abc");
    expect(res.headers.get("x-diagram-url")).toBe("https://merm.sh/d/abc");
    expect(res.headers.get("x-edit-id")).toBe("edt");
    expect(res.headers.get("x-edit-url")).toBe("https://merm.sh/e/edt");
    expect(res.headers.get("x-diagram-secret")).toBe("sec");
  });

  it("rejects invalid syntax with 400 instead of redirecting", async () => {
    mockValidateMermaid.mockResolvedValue(SYNTAX_FAIL);
    const res = await GET(
      makeRequest("https://merm.sh/go/not%20mermaid"),
      { params: Promise.resolve({ content: ["not%20mermaid"] }) }
    );
    expect(res.status).toBe(400);
    expect(res.headers.get("location")).toBeNull();
    expect(mockCreateDiagram).not.toHaveBeenCalled();
  });

  it("rejects empty content with 400", async () => {
    const res = await GET(makeRequest("https://merm.sh/go/"), {
      params: Promise.resolve({ content: [] }),
    });
    expect(res.status).toBe(400);
    expect(mockCreateDiagram).not.toHaveBeenCalled();
  });

  it("preserves ?title when provided", async () => {
    mockValidateMermaid.mockResolvedValue(OK_VALIDATION);
    await GET(
      makeRequest("https://merm.sh/go/graph%20TD%3B%20A--%3EB?title=My%20Diagram"),
      { params: Promise.resolve({ content: ["graph%20TD%3B%20A--%3EB"] }) }
    );
    expect(mockCreateDiagram).toHaveBeenCalledWith({
      content: expect.any(String),
      title: "My Diagram",
    });
  });
});
