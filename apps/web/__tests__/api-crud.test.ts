import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB layer
const mockCreateDiagram = vi.fn();
const mockGetDiagram = vi.fn();
const mockAddVersion = vi.fn();
const mockUpdateTitle = vi.fn();
const mockDeleteDiagram = vi.fn();
const mockValidateMermaid = vi.fn();

vi.mock("@mermaid-viewer/db", () => ({
  createDiagram: (...args: unknown[]) => mockCreateDiagram(...args),
  getDiagram: (...args: unknown[]) => mockGetDiagram(...args),
  addVersion: (...args: unknown[]) => mockAddVersion(...args),
  updateTitle: (...args: unknown[]) => mockUpdateTitle(...args),
  deleteDiagram: (...args: unknown[]) => mockDeleteDiagram(...args),
}));

vi.mock("@/lib/mermaid-parse", () => ({
  validateMermaid: (...args: unknown[]) => mockValidateMermaid(...args),
}));

vi.mock("@/lib/utils", () => ({
  getBaseUrl: () => "https://merm.sh",
  cn: (...args: unknown[]) => args.join(" "),
  formatRelative: () => "just now",
}));

import { NextRequest } from "next/server";

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "https://merm.sh"), init);
}

describe("POST /api/d — Create diagram", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockValidateMermaid.mockResolvedValue(null);
    mockCreateDiagram.mockResolvedValue({
      id: "abc123",
      editId: "edit456",
      secret: "secret789",
      version: 1,
    });
    const mod = await import("../app/api/d/route");
    POST = mod.POST;
  });

  it("creates a diagram with JSON body", async () => {
    const req = makeRequest("/api/d", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "graph TD; A-->B", title: "Test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("abc123");
    expect(json.editId).toBe("edit456");
    expect(json.secret).toBe("secret789");
    expect(json.version).toBe(1);
    expect(json.url).toBe("https://merm.sh/d/abc123");
    expect(json.editUrl).toBe("https://merm.sh/e/edit456");
  });

  it("creates a diagram with plain text body", async () => {
    const req = makeRequest("/api/d", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "graph TD; A-->B",
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockCreateDiagram).toHaveBeenCalledWith({
      content: "graph TD; A-->B",
      title: undefined,
    });
  });

  it("rejects empty content", async () => {
    const req = makeRequest("/api/d", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("content_required");
  });

  it("rejects invalid mermaid syntax", async () => {
    mockValidateMermaid.mockResolvedValue("Parse error at line 1");

    const req = makeRequest("/api/d", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "not valid mermaid" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_syntax");
  });
});

describe("GET /api/d/[id] — Fetch diagram", () => {
  let GET: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../app/api/d/[id]/route");
    GET = mod.GET;
  });

  it("returns diagram with all versions", async () => {
    mockGetDiagram.mockResolvedValue({
      diagram: { id: "abc", title: "Test" },
      currentVersion: { version: 2, content: "graph TD; A-->B-->C", createdAt: new Date("2025-01-01") },
      allVersions: [
        { version: 1, content: "graph TD; A-->B", createdAt: new Date("2024-12-01") },
        { version: 2, content: "graph TD; A-->B-->C", createdAt: new Date("2025-01-01") },
      ],
    });

    const req = makeRequest("/api/d/abc");
    const res = await GET(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("abc");
    expect(json.version).toBe(2);
    expect(json.versions).toHaveLength(2);
  });

  it("returns 404 for nonexistent diagram", async () => {
    mockGetDiagram.mockResolvedValue(null);

    const req = makeRequest("/api/d/nonexistent");
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("fetches a specific version via ?v=N", async () => {
    mockGetDiagram.mockResolvedValue({
      diagram: { id: "abc", title: "Test" },
      currentVersion: { version: 1, content: "graph TD; A-->B", createdAt: new Date() },
      allVersions: [{ version: 1, content: "graph TD; A-->B", createdAt: new Date() }],
    });

    const req = makeRequest("/api/d/abc?v=1");
    const res = await GET(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(200);
    expect(mockGetDiagram).toHaveBeenCalledWith({ id: "abc", version: 1 });
  });
});

describe("PUT /api/d/[id] — Update diagram", () => {
  let PUT: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockValidateMermaid.mockResolvedValue(null);
    mockAddVersion.mockResolvedValue({ version: 2 });
    const mod = await import("../app/api/d/[id]/route");
    PUT = mod.PUT;
  });

  it("updates with Bearer auth header", async () => {
    const req = makeRequest("/api/d/abc", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer mysecret",
      },
      body: JSON.stringify({ content: "graph TD; A-->B-->C" }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(200);
    expect(mockAddVersion).toHaveBeenCalledWith({
      diagramId: "abc",
      secret: "mysecret",
      editId: undefined,
      content: "graph TD; A-->B-->C",
      title: undefined,
    });
  });

  it("updates with editId in body", async () => {
    const req = makeRequest("/api/d/abc", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "graph TD; A-->B", editId: "edit123" }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(200);
  });

  it("rejects without auth", async () => {
    const req = makeRequest("/api/d/abc", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "graph TD; A-->B" }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(401);
  });

  it("rejects empty content", async () => {
    const req = makeRequest("/api/d/abc", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer mysecret",
      },
      body: JSON.stringify({ content: "" }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when diagram not found", async () => {
    mockAddVersion.mockResolvedValue({ error: "not_found" });

    const req = makeRequest("/api/d/missing", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer mysecret",
      },
      body: JSON.stringify({ content: "graph TD; A-->B" }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns 401 for invalid secret", async () => {
    mockAddVersion.mockResolvedValue({ error: "unauthorized" });

    const req = makeRequest("/api/d/abc", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer wrong",
      },
      body: JSON.stringify({ content: "graph TD; A-->B" }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/d/[id] — Delete diagram", () => {
  let DELETE: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDeleteDiagram.mockResolvedValue({ id: "abc" });
    const mod = await import("../app/api/d/[id]/route");
    DELETE = mod.DELETE;
  });

  it("deletes with Bearer auth", async () => {
    const req = makeRequest("/api/d/abc", {
      method: "DELETE",
      headers: { Authorization: "Bearer mysecret" },
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
  });

  it("deletes with editId in body", async () => {
    const req = makeRequest("/api/d/abc", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editId: "edit123" }),
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(200);
  });

  it("rejects without auth", async () => {
    const req = makeRequest("/api/d/abc", {
      method: "DELETE",
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(401);
  });
});
