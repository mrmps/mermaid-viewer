import {
  addArtifactToBoard,
  addDiagramToBoard,
  createDiagram,
  getBoard,
  updateBoard,
  type StoredBoardState,
} from "@mermaid-viewer/db";
import { baseUrl } from "@/lib/env";
import { validateMermaid } from "@/lib/mermaid-parse";
import { prepareMermaidSource } from "@/lib/mermaid-source";
import { getMermaidValidationErrorResponse } from "@/lib/mermaid-validation-response";
import { NextRequest } from "next/server";
import { z } from "zod";

const boardItemSchema = z.object({
  id: z.string(),
  kind: z
    .enum(["diagram", "website", "slides", "markdown", "image", "text", "drawing"])
    .optional(),
  diagramId: z.string().optional(),
  diagramEditId: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  href: z.string().optional(),
  editHref: z.string().optional(),
  version: z.number().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  renderer: z.enum(["beautiful", "mermaid"]).optional(),
  theme: z.string().optional(),
  look: z.enum(["classic", "handDrawn", "neo"]).optional(),
  url: z.string().optional(),
  imageUrl: z.string().optional(),
  accent: z.string().optional(),
  author: z.string().optional(),
  slides: z
    .array(
      z.object({
        eyebrow: z.string().optional(),
        title: z.string(),
        body: z.string().optional(),
        bullets: z.array(z.string()).optional(),
        accent: z.string().optional(),
      })
    )
    .optional(),
  updatedAt: z.string().optional(),
});

const boardStateSchema = z.object({
  version: z.literal(1),
  activePageId: z.string(),
  pages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      items: z.array(boardItemSchema),
    })
  ),
});

const patchBoardSchema = z.object({
  title: z.string().optional(),
  secret: z.string().optional(),
  editId: z.string().optional(),
  state: boardStateSchema.optional(),
});

const addItemSchema = z.object({
  secret: z.string().optional(),
  editId: z.string().optional(),
  kind: z
    .enum(["diagram", "website", "slides", "markdown", "image", "text"])
    .optional(),
  diagramId: z.string().optional(),
  content: z.string().optional(),
  ui: z.string().optional(),
  url: z.string().optional(),
  imageUrl: z.string().optional(),
  accent: z.string().optional(),
  author: z.string().optional(),
  slides: z
    .array(
      z.object({
        eyebrow: z.string().optional(),
        title: z.string(),
        body: z.string().optional(),
        bullets: z.array(z.string()).optional(),
        accent: z.string().optional(),
      })
    )
    .optional(),
  pageId: z.string().optional(),
  pageName: z.string().optional(),
  title: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
}).superRefine((value, context) => {
  if (value.kind && value.kind !== "diagram") return;
  if (value.diagramId?.trim() || value.content?.trim()) return;

  context.addIssue({
    code: "custom",
    message: "Provide either diagramId or content.",
    path: ["diagramId"],
  });
});

function boardResponse(
  data: NonNullable<Awaited<ReturnType<typeof getBoard>>>,
  opts: { includeEdit?: boolean } = {}
) {
  const response: {
    id: string;
    title: string;
    url: string;
    updatedAt: Date;
    state: typeof data.state;
    editId?: string;
    editUrl?: string;
  } = {
    id: data.board.id,
    title: data.board.title,
    url: `${baseUrl}/b/${data.board.id}`,
    updatedAt: data.board.updatedAt,
    state: data.state,
  };

  if (opts.includeEdit) {
    response.editId = data.board.editId;
    response.editUrl = `${baseUrl}/be/${data.board.editId}`;
  }

  return response;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getBoard({ id });

  if (!data) {
    return Response.json(
      { error: "not_found", message: "Board not found" },
      { status: 404 }
    );
  }

  return Response.json(boardResponse(data));
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

  const parsed = patchBoardSchema.safeParse(rawBody);
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

  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : parsed.data.secret;

  const result = await updateBoard({
    boardId: id,
    secret,
    editId: parsed.data.editId,
    title: parsed.data.title,
    state: parsed.data.state as StoredBoardState | undefined,
  });

  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 401;
    return Response.json(
      {
        error: result.error,
        message:
          result.error === "not_found" ? "Board not found" : "Invalid credentials",
      },
      { status }
    );
  }

  const data = await getBoard({ id });
  if (!data) {
    return Response.json(
      { error: "not_found", message: "Board not found" },
      { status: 404 }
    );
  }

  return Response.json(boardResponse(data, { includeEdit: true }));
}

export async function POST(
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

  const parsed = addItemSchema.safeParse(rawBody);
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

  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : parsed.data.secret;

  const kind = parsed.data.kind ?? "diagram";

  if (kind !== "diagram") {
    const artifactContent =
      kind === "website"
        ? parsed.data.ui ?? parsed.data.content
        : parsed.data.content;
    const result = await addArtifactToBoard({
      boardId: id,
      secret,
      editId: parsed.data.editId,
      kind,
      pageId: parsed.data.pageId,
      pageName: parsed.data.pageName,
      title: parsed.data.title,
      content: artifactContent,
      url: parsed.data.url,
      imageUrl: parsed.data.imageUrl,
      accent: parsed.data.accent,
      author: parsed.data.author,
      slides: parsed.data.slides,
      x: parsed.data.x,
      y: parsed.data.y,
      width: parsed.data.width,
      height: parsed.data.height,
    });

    if ("error" in result) {
      const status = result.error === "not_found" ? 404 : 401;
      return Response.json(
        {
          error: result.error,
          message:
            result.error === "not_found" ? "Board not found" : "Invalid credentials",
        },
        { status }
      );
    }

    const data = await getBoard({ id });
    if (!data) {
      return Response.json(
        { error: "not_found", message: "Board not found" },
        { status: 404 }
      );
    }

    return Response.json({
      ...boardResponse(data, { includeEdit: true }),
      itemId: result.itemId,
      itemUrl: `${baseUrl}/b/${id}/i/${result.itemId}`,
      editItemUrl: parsed.data.editId
        ? `${baseUrl}/be/${parsed.data.editId}/i/${result.itemId}`
        : undefined,
      placement: {
        pageId: result.pageId,
        x: result.x,
        y: result.y,
        width: result.width,
        height: result.height,
      },
    });
  }

  let diagramId = parsed.data.diagramId?.trim();

  if (!diagramId) {
    const prepared = prepareMermaidSource(parsed.data.content?.trim() ?? "");
    const validation = await validateMermaid(prepared);
    if (!validation.ok) {
      return getMermaidValidationErrorResponse(validation);
    }

    const created = await createDiagram({
      content: prepared,
      title: parsed.data.title,
      primaryBoard: false,
    });
    diagramId = created.id;
  }

  const result = await addDiagramToBoard({
    boardId: id,
    secret,
    editId: parsed.data.editId,
    diagramId,
    pageId: parsed.data.pageId,
    pageName: parsed.data.pageName,
    title: parsed.data.title,
    x: parsed.data.x,
    y: parsed.data.y,
    width: parsed.data.width,
    height: parsed.data.height,
  });

  if ("error" in result) {
    const status =
      result.error === "not_found" || result.error === "diagram_not_found"
        ? 404
        : 401;
    return Response.json(
      {
        error: result.error,
        message:
          result.error === "diagram_not_found"
            ? "Diagram not found"
            : result.error === "not_found"
              ? "Board not found"
              : "Invalid credentials",
      },
      { status }
    );
  }

  const data = await getBoard({ id });
  if (!data) {
    return Response.json(
      { error: "not_found", message: "Board not found" },
      { status: 404 }
    );
  }

  return Response.json({
    ...boardResponse(data, { includeEdit: true }),
    itemId: result.itemId,
    itemUrl: `${baseUrl}/b/${id}/i/${result.itemId}`,
    editItemUrl: parsed.data.editId
      ? `${baseUrl}/be/${parsed.data.editId}/i/${result.itemId}`
      : undefined,
    placement: {
      pageId: result.pageId,
      x: result.x,
      y: result.y,
      width: result.width,
      height: result.height,
    },
  });
}
