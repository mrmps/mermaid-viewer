import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MermaidValidationResult } from "@/lib/mermaid-parse";

// Mock DB + validator — same pattern as api-crud.test.ts
const mockCreateDiagram = vi.fn();
const mockAddVersion = vi.fn();
const mockGetDiagramByEditId = vi.fn();
const mockValidateMermaid = vi.fn();

vi.mock("@mermaid-viewer/db", () => ({
  createDiagram: (...args: unknown[]) => mockCreateDiagram(...args),
  addVersion: (...args: unknown[]) => mockAddVersion(...args),
  getDiagramByEditId: (...args: unknown[]) => mockGetDiagramByEditId(...args),
  // Not used here but keep the surface stable
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
const UNAVAIL_VALIDATION: MermaidValidationResult = {
  ok: false,
  kind: "unavailable",
  message:
    "Mermaid validation is unavailable: __TURBOPACK__imported__module__$5b...addHook is not a function",
};
const SYNTAX_FAIL: MermaidValidationResult = {
  ok: false,
  kind: "syntax",
  message: "No diagram type detected",
};

describe("GET /c/<mermaid> — URL-only create", () => {
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
    ({ GET } = await import("@/app/c/[...content]/route"));
  });

  it("creates a diagram and returns plain-text body with View/Edit/Secret/Version", async () => {
    mockValidateMermaid.mockResolvedValue(OK_VALIDATION);
    const res = await GET(makeRequest("https://merm.sh/c/graph%20TD%3B%20A--%3EB"), {
      params: Promise.resolve({ content: ["graph%20TD%3B%20A--%3EB"] }),
    });
    expect(res.status).toBe(201);
    const body = await res.text();
    expect(body).toMatch(/Share URL[^:]*:\s+https:\/\/merm\.sh\/d\/abc/);
    expect(body).toMatch(/Edit URL[^:]*:\s+https:\/\/merm\.sh\/e\/edt/);
    expect(body).toMatch(/Secret[^:]*:\s+sec/);
    expect(body).toMatch(/Version:\s+1/);
    // Update hint should reference the real editId
    expect(body).toMatch(/\/u\/edt\//);
  });

  it("honors ?format=json for a structured response", async () => {
    mockValidateMermaid.mockResolvedValue(OK_VALIDATION);
    const res = await GET(
      makeRequest("https://merm.sh/c/graph%20TD%3B%20A--%3EB?format=json"),
      { params: Promise.resolve({ content: ["graph%20TD%3B%20A--%3EB"] }) }
    );
    const json = (await res.json()) as {
      id: string;
      editId: string;
      secret: string;
      url: string;
      editUrl: string;
      version: number;
    };
    expect(res.status).toBe(201);
    expect(json).toMatchObject({
      id: "abc",
      editId: "edt",
      secret: "sec",
      version: 1,
      url: "https://merm.sh/d/abc",
      editUrl: "https://merm.sh/e/edt",
    });
  });

  it("soft-fails when validation is unavailable (save with x-validation: skipped)", async () => {
    mockValidateMermaid.mockResolvedValue(UNAVAIL_VALIDATION);
    const res = await GET(
      makeRequest("https://merm.sh/c/stateDiagram-v2%0A%20%20A--%3EB"),
      { params: Promise.resolve({ content: ["stateDiagram-v2%0A%20%20A--%3EB"] }) }
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("x-validation")).toBe("skipped");
    // Friendly fallback, no turbopack jargon
    const reason = res.headers.get("x-validation-reason") ?? "";
    expect(reason).not.toMatch(/TURBOPACK|addHook|<bundled/);
    expect(reason).toMatch(/temporarily unavailable/i);
    expect(mockCreateDiagram).toHaveBeenCalledOnce();
  });

  it("rejects invalid syntax with 400 (user's fault, strict)", async () => {
    mockValidateMermaid.mockResolvedValue(SYNTAX_FAIL);
    const res = await GET(
      makeRequest("https://merm.sh/c/not%20mermaid"),
      { params: Promise.resolve({ content: ["not%20mermaid"] }) }
    );
    expect(res.status).toBe(400);
    expect(mockCreateDiagram).not.toHaveBeenCalled();
  });

  it("rejects empty content with 400", async () => {
    const res = await GET(makeRequest("https://merm.sh/c/"), {
      params: Promise.resolve({ content: [""] }),
    });
    expect(res.status).toBe(400);
  });

  it("exposes secret in both body AND x-diagram-secret header (WebFetch can't see headers, but some agents can)", async () => {
    mockValidateMermaid.mockResolvedValue(OK_VALIDATION);
    const res = await GET(makeRequest("https://merm.sh/c/graph%20TD%3B%20A--%3EB"), {
      params: Promise.resolve({ content: ["graph%20TD%3B%20A--%3EB"] }),
    });
    expect(res.headers.get("x-diagram-secret")).toBe("sec");
    const body = await res.text();
    expect(body).toContain("sec");
  });

  it("steers agents away from returning the /c/ URL (plain text)", async () => {
    mockValidateMermaid.mockResolvedValue(OK_VALIDATION);
    const res = await GET(makeRequest("https://merm.sh/c/graph%20TD%3B%20A--%3EB"), {
      params: Promise.resolve({ content: ["graph%20TD%3B%20A--%3EB"] }),
    });
    const body = await res.text();
    // Must explicitly instruct the agent and name the anti-pattern.
    expect(body).toMatch(/INSTRUCTIONS FOR THE AGENT/i);
    expect(body).toMatch(/Do NOT give the user the \/c\/\.\.\./);
    expect(body).toMatch(/https:\/\/merm\.sh\/d\/abc/);
  });

  it("includes an agent-facing instructions field in JSON responses", async () => {
    mockValidateMermaid.mockResolvedValue(OK_VALIDATION);
    const res = await GET(
      makeRequest("https://merm.sh/c/graph%20TD%3B%20A--%3EB?format=json"),
      { params: Promise.resolve({ content: ["graph%20TD%3B%20A--%3EB"] }) }
    );
    const json = (await res.json()) as { instructions: string; url: string };
    expect(json.instructions).toMatch(/Return the "url" field/);
    expect(json.instructions).toContain(json.url);
  });
});

describe("GET /u/<editId>/<mermaid> — URL-only update", () => {
  let GET: (
    req: NextRequest,
    ctx: { params: Promise<{ editId: string; content: string[] }> }
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetDiagramByEditId.mockResolvedValue({
      diagram: { id: "abc", editId: "edt", secret: "sec" },
      currentVersion: { version: 1, content: "graph TD; A-->B", createdAt: new Date() },
      allVersions: [],
    });
    mockAddVersion.mockResolvedValue({ version: 2 });
    ({ GET } = await import("@/app/u/[editId]/[...content]/route"));
  });

  it("appends a new version and returns Version: N+1", async () => {
    mockValidateMermaid.mockResolvedValue(OK_VALIDATION);
    const res = await GET(
      makeRequest("https://merm.sh/u/edt/graph%20TD%3B%20A--%3EB%3B%20B--%3EC"),
      {
        params: Promise.resolve({
          editId: "edt",
          content: ["graph%20TD%3B%20A--%3EB%3B%20B--%3EC"],
        }),
      }
    );
    expect(res.status).toBe(201);
    const body = await res.text();
    expect(body).toMatch(/already updated/i);
    expect(body).toMatch(/Version:\s+2/);
    expect(mockAddVersion).toHaveBeenCalledWith(
      expect.objectContaining({ editId: "edt", diagramId: "abc" })
    );
  });

  it("returns 404 for an unknown editId", async () => {
    mockGetDiagramByEditId.mockResolvedValueOnce(null);
    mockValidateMermaid.mockResolvedValue(OK_VALIDATION);
    const res = await GET(
      makeRequest("https://merm.sh/u/nope/graph%20TD%3B%20A--%3EB"),
      {
        params: Promise.resolve({
          editId: "nope",
          content: ["graph%20TD%3B%20A--%3EB"],
        }),
      }
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /api/d?content=... — query-style create fallback", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreateDiagram.mockResolvedValue({
      id: "qid",
      editId: "qedt",
      secret: "qsec",
      version: 1,
    });
    ({ GET } = await import("@/app/api/d/route"));
  });

  it("creates via ?content= and returns the standard response", async () => {
    mockValidateMermaid.mockResolvedValue(OK_VALIDATION);
    const res = await GET(
      makeRequest(
        "https://merm.sh/api/d?content=graph%20TD%3B%20A--%3EB&format=json"
      )
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as { id: string; version: number };
    expect(json.id).toBe("qid");
  });

  it("returns a 400 hint when ?content= is missing", async () => {
    const res = await GET(makeRequest("https://merm.sh/api/d"));
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toMatch(/\/c\//);
  });
});
