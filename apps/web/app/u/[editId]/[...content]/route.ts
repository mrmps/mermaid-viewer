import { addVersion, getDiagramByEditId } from "@mermaid-viewer/db";
import { validateMermaid } from "@/lib/mermaid-parse";
import { prepareMermaidSource } from "@/lib/mermaid-source";
import {
  pickFormat,
  urlCreateResponse,
  urlErrorResponse,
} from "@/lib/url-create-response";
import { NextRequest } from "next/server";

/**
 * URL-only diagram UPDATE for agents that can only make GET requests.
 *
 *   GET /u/<editId>/<url-encoded-mermaid>?title=...&format=json
 *
 * The editId is the URL-based write credential (same one used by /e/<editId>).
 * Agents that created a diagram via /c or /g receive the editId in the
 * response and can use it here to append a new version. Each call creates a
 * new version — nothing is ever overwritten.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ editId: string; content: string[] }> }
) {
  const { editId, content: segments } = await params;
  const raw = segments.map((s) => decodeURIComponent(s)).join("/");

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
      "Empty mermaid content. Usage: /u/<editId>/<url-encoded-new-mermaid>"
    );
  }

  const prepared = prepareMermaidSource(raw.trim());
  const validation = await validateMermaid(prepared);

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

  // Resolve editId → diagram id, then update via the existing addVersion path.
  const diagramData = await getDiagramByEditId({ editId });
  if (!diagramData) {
    return urlErrorResponse(
      format,
      404,
      "not_found",
      "No diagram matches that editId. Check the editId returned by /c or /g."
    );
  }

  const result = await addVersion({
    diagramId: diagramData.diagram.id,
    editId,
    content: prepared,
    title,
  });

  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 401;
    return urlErrorResponse(
      format,
      status,
      result.error ?? "update_failed",
      result.error === "not_found"
        ? "Diagram not found"
        : "Invalid editId — you don't have edit access."
    );
  }

  // Re-use the create response shape so agents see the same fields.
  // `secret` is the diagram-level secret; return it here too so the agent can
  // move to API-based updates later if needed.
  return urlCreateResponse({
    result: {
      id: diagramData.diagram.id,
      editId,
      secret: diagramData.diagram.secret,
      version: result.version,
    },
    format,
    origin: "u",
    validationSkippedReason,
  });
}
