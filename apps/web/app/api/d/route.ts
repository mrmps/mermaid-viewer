import { createDiagram } from "@mermaid-viewer/db";
import { validateMermaid } from "@/lib/mermaid-parse";
import { getMermaidValidationErrorResponse } from "@/lib/mermaid-validation-response";
import { prepareMermaidSource } from "@/lib/mermaid-source";
import { baseUrl } from "@/lib/env";
import { NextRequest } from "next/server";
import { z } from "zod";

const createDiagramSchema = z.object({
  content: z.string(),
  title: z.string().optional(),
});

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
