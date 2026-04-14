import { createDiagram } from "@mermaid-viewer/db";
import { validateMermaid } from "@/lib/mermaid-parse";
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
      { error: "content_required", message: "Missing required field: \"content\". Send JSON with {\"content\": \"graph TD; A-->B\", \"title\": \"optional\"} or plain text with Content-Type: text/plain." },
      { status: 400 }
    );
  }

  const parseError = await validateMermaid(content.trim());
  if (parseError) {
    return Response.json(
      { error: "invalid_syntax", message: parseError },
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
      editId: result.editId,
      url: `${baseUrl}/d/${result.id}`,
      editUrl: `${baseUrl}/e/${result.editId}`,
      secret: result.secret,
      version: result.version,
      skill: `${baseUrl}/api/d/${result.id}/skill?secret=${result.secret}`,
    },
    { status: 201 }
  );
}
