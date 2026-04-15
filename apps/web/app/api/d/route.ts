import { createDiagram } from "@mermaid-viewer/db";
import { validateMermaid } from "@/lib/mermaid-parse";
import { getMermaidValidationErrorResponse } from "@/lib/mermaid-validation-response";
import { prepareMermaidSource } from "@/lib/mermaid-source";
import { baseUrl } from "@/lib/env";
import {
  pickFormat,
  urlCreateResponse,
  urlErrorResponse,
} from "@/lib/url-create-response";
import { NextRequest } from "next/server";
import { z } from "zod";

const createDiagramSchema = z.object({
  content: z.string(),
  title: z.string().optional(),
});

/**
 * GET fallback for URL-only agents that naturally guess /api/d?content=...
 * instead of the /c/<path> form. Same create pipeline, same response shape.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const content = params.get("content");
  const title = params.get("title") ?? undefined;
  const format = pickFormat(
    request.headers.get("accept"),
    params.get("format")
  );

  if (!content?.trim()) {
    return urlErrorResponse(
      format,
      400,
      "content_required",
      "Pass ?content=<url-encoded-mermaid> to create a diagram via GET, or POST to this endpoint with a JSON body. You can also use GET /c/<url-encoded-mermaid> (content in the path)."
    );
  }

  const prepared = prepareMermaidSource(content.trim());
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

  const result = await createDiagram({ content: prepared, title });
  return urlCreateResponse({
    result,
    format,
    origin: "c",
    validationSkippedReason,
  });
}

export async function POST(request: NextRequest) {
  let content: string;
  let title: string | undefined;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return Response.json(
        { error: "bad_request", message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = createDiagramSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json(
        {
          error: "bad_request",
          message: "Invalid request body",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    content = parsed.data.content;
    title = parsed.data.title;
  } else {
    content = await request.text();
  }

  if (!content?.trim()) {
    return Response.json(
      { error: "content_required", message: "Missing required field: \"content\". Send JSON with {\"content\": \"graph TD; A-->B\", \"title\": \"optional\"} or plain text with Content-Type: text/plain." },
      { status: 400 }
    );
  }

  const prepared = prepareMermaidSource(content.trim());

  const validation = await validateMermaid(prepared);
  if (!validation.ok) {
    return getMermaidValidationErrorResponse(validation);
  }

  const result = await createDiagram({ content: prepared, title });

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
