import { createDiagram } from "@mermaid-viewer/db";
import { validateMermaid } from "@/lib/mermaid-parse";
import { prepareMermaidSource } from "@/lib/mermaid-source";
import {
  pickFormat,
  urlCreateResponse,
  urlErrorResponse,
} from "@/lib/url-create-response";
import { NextRequest } from "next/server";

/**
 * URL-only diagram creation for agents that can only make GET requests.
 *
 *   GET /c/<url-encoded-mermaid>?title=...&format=json
 *
 * Content negotiation: ?format=json OR Accept: application/json
 * Otherwise returns plain text with View/Edit/Secret lines.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ content: string[] }> }
) {
  const { content: segments } = await params;
  const raw = segments.map((segment) => decodeURIComponent(segment)).join("/");

  const title = request.nextUrl.searchParams.get("title") ?? undefined;
  const format = pickFormat(
    request.headers.get("accept"),
    request.nextUrl.searchParams.get("format")
  );

  if (!raw.trim()) {
    return urlErrorResponse(
      format,
      400,
      "content_required",
      "Empty mermaid content. Put the diagram in the URL path: /c/<url-encoded-mermaid>\nExample: /c/graph%20TD%3B%20A--%3EB"
    );
  }

  const prepared = prepareMermaidSource(raw.trim());
  const validation = await validateMermaid(prepared);

  // Syntax errors are the user's fault — reject.
  // "validation_unavailable" is our fault (server-side validator crashed) —
  // soft-fail and save anyway with a warning header. URL-only agents can't
  // easily retry, so failing closed on our bug is worse than saving.
  if (!validation.ok && validation.kind === "syntax") {
    return urlErrorResponse(
      format,
      400,
      "invalid_syntax",
      validation.message,
      { mermaid: prepared }
    );
  }

  const validationSkippedReason =
    !validation.ok ? validation.message : undefined;

  const result = await createDiagram({ content: prepared, title });

  return urlCreateResponse({
    result,
    format,
    origin: "c",
    validationSkippedReason,
  });
}
