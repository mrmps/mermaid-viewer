import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  tool,
  type UIMessage,
  validateUIMessages,
  zodSchema,
  stepCountIs,
} from "ai";
import { z } from "zod";
import {
  addArtifactToBoard,
  addDiagramToBoard,
  addVersion,
  createDiagram,
  getBoard,
  getDiagram,
  updateBoard,
  type StoredBoardItem,
  type StoredBoardItemKind,
  type StoredBoardSlide,
  type StoredBoardState,
} from "@mermaid-viewer/db";
import {
  getChatRequestTooLargeMessage,
  getCurrentContentTooLargeMessage,
  getUtf8ByteLength,
  MAX_CHAT_MESSAGES,
  MAX_CHAT_REQUEST_BYTES,
  MAX_CURRENT_CONTENT_BYTES,
} from "@/lib/chat-limits";
import { environment } from "@/lib/env";

const updateDiagramSchema = z.object({
  content: z.string().describe("The complete updated Mermaid diagram code"),
  summary: z.string().describe("A brief one-line summary of what was changed"),
  title: z
    .string()
    .optional()
    .describe(
      "New diagram title (3-6 words). Set this when the current title is 'Untitled' or when the user asks to rename. Omit to keep the existing title."
    ),
});

const boardArtifactKindSchema = z.enum([
  "website",
  "slides",
  "markdown",
  "image",
  "text",
]);

const boardSlideSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  body: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  accent: z.string().optional(),
});

const updateSelectedCardSchema = z.object({
  content: z.string().describe("The complete updated content for the selected canvas card"),
  summary: z.string().describe("A brief one-line summary of what was changed"),
  title: z
    .string()
    .optional()
    .describe("Optional new card title. Omit to keep the current title."),
});

const createDiagramOnBoardSchema = z.object({
  content: z.string().describe("The complete Mermaid diagram code"),
  title: z.string().describe("A concise title for the new diagram card"),
  pageName: z.string().optional().describe("Optional target page name"),
  x: z.number().optional().describe("Optional preferred board x coordinate"),
  y: z.number().optional().describe("Optional preferred board y coordinate"),
  width: z.number().optional().describe("Optional card width"),
  height: z.number().optional().describe("Optional card height"),
});

const publishArtifactToBoardSchema = z.object({
  kind: boardArtifactKindSchema,
  title: z.string().describe("A concise title for the artifact card"),
  content: z.string().optional().describe("Markdown, text, or generic artifact content"),
  ui: z.string().optional().describe("HTML/CSS for website cards"),
  url: z.string().optional().describe("Optional source URL"),
  imageUrl: z.string().optional().describe("Optional image URL for image cards"),
  accent: z.string().optional().describe("Optional accent color"),
  author: z.string().optional().describe("Optional author label"),
  slides: z.array(boardSlideSchema).optional().describe("Slides for slide deck cards"),
  pageName: z.string().optional().describe("Optional target page name"),
  x: z.number().optional().describe("Optional preferred board x coordinate"),
  y: z.number().optional().describe("Optional preferred board y coordinate"),
  width: z.number().optional().describe("Optional card width"),
  height: z.number().optional().describe("Optional card height"),
});

const updateDiagramOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    version: z.number().optional(),
    title: z.string().optional(),
    itemId: z.string().optional(),
    boardUpdated: z.boolean().optional(),
    label: z.string().optional(),
    state: z.unknown().optional(),
  }),
  z.object({
    success: z.literal(false),
    error: z
      .enum(["not_found", "unauthorized", "missing_board_context", "diagram_not_found"])
      .optional(),
  }),
]);

const boardToolOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    itemId: z.string().optional(),
    title: z.string().optional(),
    boardUpdated: z.boolean().optional(),
    label: z.string().optional(),
    state: z.unknown().optional(),
  }),
  z.object({
    success: z.literal(false),
    error: z
      .enum(["not_found", "unauthorized", "missing_board_context", "diagram_not_found"])
      .optional(),
  }),
]);

type UpdateDiagramInput = z.infer<typeof updateDiagramSchema>;
type UpdateDiagramOutput = z.infer<typeof updateDiagramOutputSchema>;
type UpdateSelectedCardInput = z.infer<typeof updateSelectedCardSchema>;
type CreateDiagramOnBoardInput = z.infer<typeof createDiagramOnBoardSchema>;
type PublishArtifactToBoardInput = z.infer<typeof publishArtifactToBoardSchema>;
type BoardToolOutput = z.infer<typeof boardToolOutputSchema>;
type ChatUIMessage = UIMessage<
  unknown,
  never,
  {
    update_diagram: {
      input: UpdateDiagramInput;
      output: UpdateDiagramOutput;
    };
    update_selected_card: {
      input: UpdateSelectedCardInput;
      output: BoardToolOutput;
    };
    create_diagram_on_board: {
      input: CreateDiagramOnBoardInput;
      output: BoardToolOutput;
    };
    publish_artifact_to_board: {
      input: PublishArtifactToBoardInput;
      output: BoardToolOutput;
    };
  }
>;

const updateDiagramDescription =
  "Update the Mermaid diagram with new content. Use this when the user asks to modify, change, add to, or create a new version of the diagram.";
const updateSelectedCardDescription =
  "Update the selected canvas card with new content. Use this for non-diagram cards or when only the board card should change.";
const createDiagramOnBoardDescription =
  "Create a new Mermaid diagram card on the current canvas board.";
const publishArtifactToBoardDescription =
  "Publish a non-Mermaid artifact card to the current canvas board, matching the board agent permissions.";

const validationTools = {
  update_diagram: tool<UpdateDiagramInput, UpdateDiagramOutput>({
    description: updateDiagramDescription,
    inputSchema: zodSchema(updateDiagramSchema),
    outputSchema: zodSchema(updateDiagramOutputSchema),
  }),
  update_selected_card: tool<UpdateSelectedCardInput, BoardToolOutput>({
    description: updateSelectedCardDescription,
    inputSchema: zodSchema(updateSelectedCardSchema),
    outputSchema: zodSchema(boardToolOutputSchema),
  }),
  create_diagram_on_board: tool<CreateDiagramOnBoardInput, BoardToolOutput>({
    description: createDiagramOnBoardDescription,
    inputSchema: zodSchema(createDiagramOnBoardSchema),
    outputSchema: zodSchema(boardToolOutputSchema),
  }),
  publish_artifact_to_board: tool<PublishArtifactToBoardInput, BoardToolOutput>({
    description: publishArtifactToBoardDescription,
    inputSchema: zodSchema(publishArtifactToBoardSchema),
    outputSchema: zodSchema(boardToolOutputSchema),
  }),
};

type BoardContext = {
  boardId: string;
  boardEditId: string;
  boardItemId?: string;
  boardItemKind?: StoredBoardItemKind;
  boardTitle?: string;
  boardItemTitle?: string;
};

function getBoardContext(input: {
  boardId?: string;
  boardEditId?: string;
  boardItemId?: string;
  boardItemKind?: StoredBoardItemKind;
  boardTitle?: string;
  boardItemTitle?: string;
}): BoardContext | null {
  if (!input.boardId?.trim() || !input.boardEditId?.trim()) return null;
  return {
    boardId: input.boardId.trim(),
    boardEditId: input.boardEditId.trim(),
    boardItemId: input.boardItemId?.trim() || undefined,
    boardItemKind: input.boardItemKind,
    boardTitle: input.boardTitle?.trim() || undefined,
    boardItemTitle: input.boardItemTitle?.trim() || undefined,
  };
}

function findBoardItem(state: StoredBoardState, itemId?: string) {
  if (!itemId) return null;
  for (const page of state.pages) {
    const item = page.items.find((candidate) => candidate.id === itemId);
    if (item) return { pageId: page.id, item };
  }
  return null;
}

function updateBoardItemState(
  state: StoredBoardState,
  itemId: string,
  updates: Partial<StoredBoardItem>
): StoredBoardState {
  return {
    ...state,
    pages: state.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    })),
  };
}

async function getAuthorizedBoard(context: BoardContext) {
  const data = await getBoard({ id: context.boardId });
  if (!data) return { error: "not_found" as const };
  if (data.board.editId !== context.boardEditId) {
    return { error: "unauthorized" as const };
  }
  return data;
}

async function updateCanvasItem(
  context: BoardContext,
  updates: Partial<StoredBoardItem>
): Promise<BoardToolOutput> {
  if (!context.boardItemId) {
    return { success: false as const, error: "missing_board_context" };
  }

  const data = await getAuthorizedBoard(context);
  if ("error" in data) return { success: false as const, error: data.error };

  const match = findBoardItem(data.state as StoredBoardState, context.boardItemId);
  if (!match) return { success: false as const, error: "not_found" };

  const nextState = updateBoardItemState(
    data.state as StoredBoardState,
    context.boardItemId,
    {
      ...updates,
      updatedAt: new Date().toISOString(),
    }
  );

  const result = await updateBoard({
    boardId: context.boardId,
    editId: context.boardEditId,
    state: nextState,
  });
  if ("error" in result) return { success: false as const, error: result.error };

  const updated = await getBoard({ id: context.boardId });
  return {
    success: true as const,
    itemId: context.boardItemId,
    title: updates.title,
    boardUpdated: true,
    label: "Updated card",
    state: updated?.state,
  };
}

async function getUpdatedBoardOutput(
  context: BoardContext,
  itemId: string,
  label: string
): Promise<BoardToolOutput> {
  const updated = await getBoard({ id: context.boardId });
  return {
    success: true as const,
    itemId,
    boardUpdated: true,
    label,
    state: updated?.state,
  };
}

export async function POST(req: Request) {
  if (!environment.OPENROUTER_API_KEY) {
    return Response.json(
      {
        error: "misconfigured",
        message: "Chat is not configured on this deployment",
      },
      { status: 503 }
    );
  }

  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: environment.OPENROUTER_API_KEY,
  });

  const rawBody = await req.text();
  const rawBodyBytes = getUtf8ByteLength(rawBody);
  if (rawBodyBytes > MAX_CHAT_REQUEST_BYTES) {
    return Response.json(
      {
        error: "payload_too_large",
        message: getChatRequestTooLargeMessage(rawBodyBytes),
      },
      { status: 413 }
    );
  }

  let body: {
    messages: ChatUIMessage[];
    diagramId?: string;
    editId?: string;
    currentContent: string;
    boardId?: string;
    boardEditId?: string;
    boardItemId?: string;
    boardItemKind?: StoredBoardItemKind;
    boardTitle?: string;
    boardItemTitle?: string;
  };

  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json(
      { error: "bad_request", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const {
    messages: rawMessages,
    diagramId,
    editId,
    currentContent,
    boardId,
    boardEditId,
    boardItemId,
    boardItemKind,
    boardTitle,
    boardItemTitle,
  } = body;

  const boardContext = getBoardContext({
    boardId,
    boardEditId: boardEditId ?? (!diagramId ? editId : undefined),
    boardItemId,
    boardItemKind,
    boardTitle,
    boardItemTitle,
  });
  const hasDiagramAccess = Boolean(diagramId && editId);

  if (!hasDiagramAccess && !boardContext) {
    return Response.json(
      { error: "unauthorized", message: "Edit access required" },
      { status: 401 }
    );
  }

  if (
    !Array.isArray(rawMessages) ||
    rawMessages.length === 0 ||
    rawMessages.length > MAX_CHAT_MESSAGES
  ) {
    return Response.json(
      {
        error: "bad_request",
        message: `Messages must be a non-empty array with at most ${MAX_CHAT_MESSAGES} entries.`,
      },
      { status: 400 }
    );
  }

  const currentContentBytes =
    typeof currentContent === "string" ? getUtf8ByteLength(currentContent) : 0;
  if (currentContentBytes > MAX_CURRENT_CONTENT_BYTES) {
    return Response.json(
      {
        error: "payload_too_large",
        message: getCurrentContentTooLargeMessage(currentContentBytes),
      },
      { status: 413 }
    );
  }

  let boardData: Awaited<ReturnType<typeof getBoard>> | null = null;
  let selectedBoardItem: StoredBoardItem | null = null;
  if (boardContext) {
    const authorizedBoard = await getAuthorizedBoard(boardContext);
    if ("error" in authorizedBoard) {
      const status = authorizedBoard.error === "not_found" ? 404 : 401;
      return Response.json(
        {
          error: authorizedBoard.error,
          message:
            authorizedBoard.error === "not_found"
              ? "Board not found"
              : "Invalid board credentials",
        },
        { status }
      );
    }

    boardData = authorizedBoard;
    selectedBoardItem =
      findBoardItem(boardData.state as StoredBoardState, boardContext.boardItemId)
        ?.item ?? null;
  }

  // Fetch version history from DB — cap to last 10 versions to keep prompt size reasonable
  const diagramData = diagramId ? await getDiagram({ id: diagramId }) : null;
  const hasSelectedCardContext = Boolean(boardContext?.boardItemId);
  const currentTitle =
    selectedBoardItem?.title ??
    boardItemTitle ??
    (boardContext ? boardData?.board.title : diagramData?.diagram.title) ??
    "Untitled";
  const currentKind =
    selectedBoardItem?.kind ?? boardItemKind ?? (boardContext ? undefined : "diagram");
  const isUntitled = currentTitle === "Untitled";
  const allVersions = diagramData
    ? diagramData.allVersions.map((v) => ({
        version: v.version,
        content: v.content,
        createdAt: v.createdAt.toISOString(),
      }))
    : [];
  const versionHistory = allVersions.slice(-10);

  const versionHistoryBlock =
    versionHistory.length > 0
      ? `\n\n## Version History${allVersions.length > versionHistory.length ? ` (showing last ${versionHistory.length} of ${allVersions.length})` : ""}\n\nThis diagram has ${allVersions.length} version(s). To restore a previous version, call update_diagram with that version's content.\n\n${versionHistory.map((v) => `### v${v.version} (${v.createdAt})\n\`\`\`mermaid\n${v.content}\n\`\`\``).join("\n\n")}`
      : "";

  let validatedMessages: ChatUIMessage[];
  try {
    validatedMessages = await validateUIMessages<ChatUIMessage>({
      messages: rawMessages,
      tools: validationTools,
    });
  } catch {
    return Response.json(
      { error: "bad_request", message: "Invalid chat message payload." },
      { status: 400 }
    );
  }

  const messages = await convertToModelMessages(validatedMessages);
  const currentContentLabel = boardContext
    ? hasSelectedCardContext
      ? "Selected Card Context"
      : "Canvas Context"
    : "Current Diagram";
  const currentContentLanguage =
    currentKind === "diagram"
      ? "mermaid"
      : currentKind === "website"
        ? "html"
        : currentKind === "markdown"
          ? "markdown"
          : "text";
  const canvasContextBlock = boardContext
    ? `\n\n## Current Canvas\nBoard: ${boardContext.boardTitle ?? boardData?.board.title ?? "Untitled workspace"}\nSelected card context: ${hasSelectedCardContext ? `${currentTitle} (${currentKind ?? "card"})` : "none"}\n\nThe selected card is context only; the chat session is independent from canvas selection and layout movement. Use update_selected_card only when the user clearly asks to modify the selected/current card. Otherwise create new Mermaid diagram cards or publish non-diagram artifact cards on the board. Use the canvas tools for board changes instead of saying you cannot edit the canvas.`
    : "";

  const result = streamText({
    model: openrouter.chat("openrouter/auto"),
    abortSignal: req.signal,
    system: `You are a Mermaid diagram assistant. You help users create, modify, and improve Mermaid diagrams through conversation.

## ${currentContentLabel}
Title: ${currentTitle}${isUntitled ? " (not yet named — pick a descriptive title on your next update)" : ""}

\`\`\`${currentContentLanguage}
${currentContent}
\`\`\`
${versionHistoryBlock}${canvasContextBlock}
## Guidelines
- Use the update_diagram tool when creating, modifying, or changing Mermaid diagram content. Never output raw Mermaid code in your response text when a tool call should update the product state.
- Always output the FULL diagram content when updating, not just the changed parts.
- Keep the existing diagram structure unless the user asks to change it.
- On a canvas board, selection is context only. Use update_selected_card for the selected/current non-diagram card only when the user clearly asks for that; otherwise use create_diagram_on_board for new Mermaid cards, and publish_artifact_to_board for website, slides, markdown, image, or text cards.
- Website artifact cards accept complete HTML/CSS in the ui field. Do not include scripts or event handlers.
- You can explain what you changed after calling the tool.
- If the user asks a question about the diagram without requesting changes, just answer without calling the tool.
- When the user asks to restore a previous version (e.g. "restore v3"), find that version in the version history and call update_diagram with its content.
- Support all Mermaid diagram types: flowchart, sequence, class, state, ER, gantt, pie, mindmap, timeline, etc.
- Write clean, well-formatted Mermaid syntax.
- Be concise in your responses.

## Naming
${
  isUntitled
    ? "- The diagram is currently 'Untitled'. Whenever you call update_diagram, include a concise, descriptive title (3-6 words, Title Case, no trailing punctuation) that reflects what the diagram depicts. Infer it from the diagram content and the user's intent — do not ask the user to name it."
    : "- The diagram already has a title. Only set the title field if the user explicitly asks to rename it, or if the diagram's subject has changed meaningfully."
}`,
    messages,
    tools: {
      update_diagram: tool<UpdateDiagramInput, UpdateDiagramOutput>({
        description: updateDiagramDescription,
        inputSchema: zodSchema(updateDiagramSchema),
        outputSchema: zodSchema(updateDiagramOutputSchema),
        execute: async ({ content, title }: UpdateDiagramInput) => {
          const trimmedTitle = title?.trim();
          let version: number | undefined;

          if (diagramId && editId) {
            const result = await addVersion({
              diagramId,
              editId,
              content,
              title: trimmedTitle || undefined,
            });

            if ("error" in result) {
              if (!boardContext) {
                return { success: false as const, error: result.error };
              }
            } else {
              version = result.version;
            }
          }

          if (boardContext?.boardItemId) {
            const boardResult = await updateCanvasItem(boardContext, {
              content,
              ...(diagramId && version
                ? {
                    href: `/d/${diagramId}?v=${version}`,
                    version,
                    diagramEditId: editId,
                  }
                : {}),
              ...(trimmedTitle ? { title: trimmedTitle } : {}),
            });

            if (!boardResult.success || !version) return boardResult;
            return {
              ...boardResult,
              version,
              label: `Updated to v${version}`,
              ...(trimmedTitle ? { title: trimmedTitle } : {}),
            };
          }

          if (!version) {
            return { success: false as const, error: "unauthorized" };
          }

          return {
            success: true as const,
            version,
            label: `Updated to v${version}`,
            ...(trimmedTitle ? { title: trimmedTitle } : {}),
          };
        },
      }),
      update_selected_card: tool({
        description: updateSelectedCardDescription,
        inputSchema: zodSchema(updateSelectedCardSchema),
        outputSchema: zodSchema(boardToolOutputSchema),
        execute: async ({ content, title }: UpdateSelectedCardInput) => {
          if (!boardContext) {
            return { success: false as const, error: "missing_board_context" };
          }
          const trimmedTitle = title?.trim();
          return updateCanvasItem(boardContext, {
            content,
            ...(trimmedTitle ? { title: trimmedTitle } : {}),
          });
        },
      }),
      create_diagram_on_board: tool({
        description: createDiagramOnBoardDescription,
        inputSchema: zodSchema(createDiagramOnBoardSchema),
        outputSchema: zodSchema(boardToolOutputSchema),
        execute: async ({
          content,
          title,
          pageName,
          x,
          y,
          width,
          height,
        }: CreateDiagramOnBoardInput) => {
          if (!boardContext) {
            return { success: false as const, error: "missing_board_context" };
          }

          const created = await createDiagram({
            content,
            title,
            primaryBoard: false,
          });
          const result = await addDiagramToBoard({
            boardId: boardContext.boardId,
            editId: boardContext.boardEditId,
            diagramId: created.id,
            pageName,
            title,
            x,
            y,
            width,
            height,
          });

          if ("error" in result) {
            return { success: false as const, error: result.error };
          }

          return getUpdatedBoardOutput(
            boardContext,
            result.itemId,
            "Added diagram"
          );
        },
      }),
      publish_artifact_to_board: tool({
        description: publishArtifactToBoardDescription,
        inputSchema: zodSchema(publishArtifactToBoardSchema),
        outputSchema: zodSchema(boardToolOutputSchema),
        execute: async ({
          kind,
          title,
          content,
          ui,
          url,
          imageUrl,
          accent,
          author,
          slides,
          pageName,
          x,
          y,
          width,
          height,
        }: PublishArtifactToBoardInput) => {
          if (!boardContext) {
            return { success: false as const, error: "missing_board_context" };
          }

          const result = await addArtifactToBoard({
            boardId: boardContext.boardId,
            editId: boardContext.boardEditId,
            kind,
            title,
            content: kind === "website" ? ui ?? content : content,
            url,
            imageUrl,
            accent,
            author,
            slides: slides as StoredBoardSlide[] | undefined,
            pageName,
            x,
            y,
            width,
            height,
          });

          if ("error" in result) {
            return { success: false as const, error: result.error };
          }

          return getUpdatedBoardOutput(
            boardContext,
            result.itemId,
            "Published artifact"
          );
        },
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
