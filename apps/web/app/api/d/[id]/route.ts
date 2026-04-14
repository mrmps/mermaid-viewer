import { getDiagram, addVersion, updateTitle, deleteDiagram } from "@mermaid-viewer/db";
import { validateMermaid } from "@/lib/mermaid-parse";
import { getMermaidValidationErrorResponse } from "@/lib/mermaid-validation-response";
import { prepareMermaidSource } from "@/lib/mermaid-source";
import { baseUrl } from "@/lib/env";
import { NextRequest } from "next/server";
import { z } from "zod";

const updateVersionSchema = z.object({
  content: z.string(),
  secret: z.string().optional(),
  editId: z.string().optional(),
  title: z.string().optional(),
});

const patchTitleSchema = z.object({
  title: z.string().optional(),
  secret: z.string().optional(),
  editId: z.string().optional(),
});

const deleteSchema = z.object({
  secret: z.string().optional(),
  editId: z.string().optional(),
});

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
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return Response.json(
        { error: "bad_request", message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = updateVersionSchema.safeParse(rawBody);
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
    secret = parsed.data.secret;
    editId = parsed.data.editId;
    title = parsed.data.title;
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
      { error: "content_required", message: "Missing required field: \"content\". Send JSON with {\"content\": \"<mermaid>\", \"secret\": \"<secret>\"} or plain text with Authorization: Bearer <secret> header." },
      { status: 400 }
    );
  }

  if (!secret && !editId) {
    return Response.json(
      { error: "unauthorized", message: "Secret is required. Provide via Authorization: Bearer <secret> header or in JSON body." },
      { status: 401 }
    );
  }

  const prepared = prepareMermaidSource(content.trim());

  const validation = await validateMermaid(prepared);
  if (!validation.ok) {
    return getMermaidValidationErrorResponse(validation);
  }

  const result = await addVersion({
    diagramId: id,
    secret,
    editId,
    content: prepared,
    title,
  });

  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 401;
    return Response.json(
      { error: result.error, message: result.error === "not_found" ? "Diagram not found" : "Invalid secret" },
      { status }
    );
  }

  return Response.json({
    id,
    url: `${baseUrl}/d/${id}`,
    version: result.version,
    skill: `${baseUrl}/api/d/${id}/skill`,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      { error: "bad_request", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = patchTitleSchema.safeParse(rawBody);
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

  const body = parsed.data;

  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : body.secret;
  const editId = body.editId;

  if (!secret && !editId) {
    return Response.json(
      { error: "unauthorized", message: "Secret or editId is required." },
      { status: 401 }
    );
  }

  if (!body.title?.trim()) {
    return Response.json(
      { error: "bad_request", message: "Title is required." },
      { status: 400 }
    );
  }

  const result = await updateTitle({
    diagramId: id,
    secret,
    editId,
    title: body.title.trim(),
  });

  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 401;
    return Response.json(
      {
        error: result.error,
        message:
          result.error === "not_found"
            ? "Diagram not found"
            : "Invalid credentials",
      },
      { status }
    );
  }

  return Response.json({ id, title: result.title });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let secret: string | undefined;
  let editId: string | undefined;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return Response.json(
        {
          error: "bad_request",
          message: "Invalid JSON body",
        },
        { status: 400 }
      );
    }

    const parsed = deleteSchema.safeParse(rawBody);
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

    secret = parsed.data.secret;
    editId = parsed.data.editId;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    secret = authHeader.slice(7);
  }

  if (!secret && !editId) {
    return Response.json(
      {
        error: "unauthorized",
        message:
          "Secret or editId is required. Provide Authorization: Bearer <secret> or a JSON body with secret/editId.",
      },
      { status: 401 }
    );
  }

  const result = await deleteDiagram({
    diagramId: id,
    secret,
    editId,
  });

  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 401;
    return Response.json(
      {
        error: result.error,
        message:
          result.error === "not_found"
            ? "Diagram not found"
            : "Invalid credentials",
      },
      { status }
    );
  }

  return Response.json({
    id,
    deleted: true,
  });
}
