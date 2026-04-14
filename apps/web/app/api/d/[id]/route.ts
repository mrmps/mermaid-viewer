import { getDiagram, addVersion } from "@mermaid-viewer/db";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const v = request.nextUrl.searchParams.get("v");
  const version = v ? parseInt(v, 10) : undefined;

  const data = await getDiagram({ id, version });

  if (!data) {
    return Response.json(
      { error: "not_found", message: "Diagram not found" },
      { status: 404 }
    );
  }

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const baseUrl = `${proto}://${host}`;

  return Response.json({
    id: data.diagram.id,
    title: data.diagram.title,
    version: data.currentVersion.version,
    content: data.currentVersion.content,
    createdAt: data.currentVersion.createdAt,
    versions: data.allVersions.map((v) => ({
      version: v.version,
      content: v.content,
      createdAt: v.createdAt,
    })),
    skill: `${baseUrl}/api/d/${data.diagram.id}/skill`,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let content: string;
  let secret: string | undefined;
  let editId: string | undefined;
  let title: string | undefined;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    content = body.content;
    secret = body.secret;
    editId = body.editId;
    title = body.title;
  } else {
    content = await request.text();
  }

  // Secret from Authorization header takes precedence
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    secret = authHeader.slice(7);
  }

  if (!content?.trim()) {
    return Response.json(
      { error: "content_required", message: "Request body must contain mermaid diagram content" },
      { status: 400 }
    );
  }

  if (!secret && !editId) {
    return Response.json(
      { error: "unauthorized", message: "Secret is required. Provide via Authorization: Bearer <secret> header or in JSON body." },
      { status: 401 }
    );
  }

  const result = await addVersion({
    diagramId: id,
    secret,
    editId,
    content: content.trim(),
    title,
  });

  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 401;
    return Response.json(
      { error: result.error, message: result.error === "not_found" ? "Diagram not found" : "Invalid secret" },
      { status }
    );
  }

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const baseUrl = `${proto}://${host}`;

  return Response.json({
    id,
    url: `${baseUrl}/d/${id}`,
    version: result.version,
    skill: `${baseUrl}/api/d/${id}/skill`,
  });
}
