import { createDiagram } from "@mermaid-viewer/db";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  let content: string;
  let title: string | undefined;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    content = body.content;
    title = body.title;
  } else {
    content = await request.text();
  }

  if (!content?.trim()) {
    return Response.json(
      { error: "content_required", message: "Request body must contain mermaid diagram content" },
      { status: 400 }
    );
  }

  const result = await createDiagram({ content: content.trim(), title });

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const baseUrl = `${proto}://${host}`;

  return Response.json(
    {
      id: result.id,
      url: `${baseUrl}/d/${result.id}`,
      editUrl: `${baseUrl}/d/${result.id}?secret=${result.secret}`,
      secret: result.secret,
      version: result.version,
    },
    { status: 201 }
  );
}
