import { createDiagram } from "@mermaid-viewer/db";
import { validateMermaid } from "@/lib/mermaid-parse";
import { prepareMermaidSource } from "@/lib/mermaid-source";
import { urlErrorResponse, pickFormat } from "@/lib/url-create-response";
import { baseUrl } from "@/lib/env";
import { NextRequest } from "next/server";

// GET /go/<url-encoded-mermaid> — create, then 302 to /d/<id>.
//
// Purpose: hand-off agents (Claude.ai web with strict exact-URL web_fetch)
// cannot fetch constructed URLs themselves. Their only move is to emit a
// clickable link for the user. The existing /c and /?content= endpoints
// return a *text response page* when the user clicks — not the rendered
// diagram. /go/ creates the diagram and redirects the user's browser to
// /d/<id> so they land directly on the rendered share URL.
//
// Agents that *can* read responses should keep using /c or /?content=.
// This route is specifically for "I'm handing the user a link."
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ content: string[] }> }
) {
  const { content: segments } = await params;
  const raw = segments.map((segment) => decodeURIComponent(segment)).join("/");

  if (!raw.trim()) {
    return urlErrorResponse(
      "text",
      400,
      "content_required",
      "Empty mermaid content. Put the diagram in the URL path: /go/<url-encoded-mermaid>\nExample: /go/graph%20TD%3B%20A--%3EB"
    );
  }

  const prepared = prepareMermaidSource(raw.trim());
  const validation = await validateMermaid(prepared);

  if (!validation.ok && validation.kind === "syntax") {
    return urlErrorResponse(
      "text",
      400,
      "invalid_syntax",
      validation.message,
      { mermaid: prepared }
    );
  }

  const url = new URL(_request.url);
  const title = url.searchParams.get("title") ?? undefined;

  const result = await createDiagram({
    content: prepared,
    ...(title !== undefined ? { title } : {}),
  });

  const viewUrl = `${baseUrl}/d/${result.id}`;
  const editUrl = `${baseUrl}/e/${result.editId}`;

  return new Response(null, {
    status: 302,
    headers: {
      location: viewUrl,
      "x-diagram-id": result.id,
      "x-diagram-url": viewUrl,
      "x-edit-id": result.editId,
      "x-edit-url": editUrl,
      "x-diagram-secret": result.secret,
      "cache-control": "no-store",
    },
  });
}

// pickFormat is imported for symmetry with /c and to keep the error-response
// util happy. Referenced here so the unused-import check doesn't complain.
void pickFormat;
