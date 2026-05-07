import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  addDiagramToBoard,
  addVersion,
  createBoard,
  createDiagram,
  getBoard,
  getDiagram,
} from "@mermaid-viewer/db";
import { baseUrl } from "@/lib/env";
import { z } from "zod";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
};

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
    }
  }
  throw new Error("unreachable");
}

function createMcpServer(baseUrl: string) {
  const server = new McpServer({
    name: "mermaid-viewer",
    version: "1.0.0",
  });

  server.registerTool(
    "create_diagram",
    {
      title: "Create Mermaid Diagram",
      description: `Create a new versioned Mermaid diagram hosted on ${baseUrl}. New diagrams also get a one-item board because boards are the main workspace primitive. IMPORTANT: save the diagram secret to push content updates, and save the board secret to add related diagrams later. If the user is building a set of related diagrams, first create a board with create_board, then pass boardId and boardSecret here so the diagram appears on that board.`,
      inputSchema: {
        content: z
          .string()
          .min(1, "Content cannot be empty")
          .describe(
            "Mermaid diagram source code. Supports all diagram types: flowchart, sequence, class, ER, state, gantt, pie, etc. Example: 'graph TD; A[Start]-->B{Decision}; B-->|Yes|C[OK]; B-->|No|D[End]'",
          ),
        title: z
          .string()
          .optional()
          .describe(
            "Human-readable title for the diagram. Displayed in the viewer and used in the skill file.",
          ),
        boardId: z
          .string()
          .optional()
          .describe("Optional board ID to add this new diagram to."),
        boardSecret: z
          .string()
          .optional()
          .describe("Edit secret for boardId, returned by create_board."),
        pageId: z
          .string()
          .optional()
          .describe("Optional board page ID to place the diagram on."),
        pageName: z
          .string()
          .optional()
          .describe("Optional board page name. Created if it does not exist."),
        x: z
          .number()
          .optional()
          .describe(
            "Optional preferred board x coordinate. If it overlaps an existing card, merm.sh will move the card to the nearest open spot.",
          ),
        y: z
          .number()
          .optional()
          .describe(
            "Optional preferred board y coordinate. If it overlaps an existing card, merm.sh will move the card to the nearest open spot.",
          ),
        width: z
          .number()
          .optional()
          .describe("Optional board card width in pixels. Minimum 320."),
        height: z
          .number()
          .optional()
          .describe("Optional board card height in pixels. Minimum 260."),
      },
      outputSchema: {
        id: z.string().describe("Unique diagram ID"),
        url: z
          .string()
          .describe("Shareable board URL when available, otherwise diagram URL"),
        editUrl: z
          .string()
          .describe("Editable board URL when available, otherwise diagram URL"),
        diagramUrl: z.string().describe("Focused diagram URL"),
        secret: z
          .string()
          .describe(
            "Edit secret — save this to push updates. Only returned on create.",
          ),
        version: z.number().describe("Version number (starts at 1)"),
        boardUrl: z
          .string()
          .optional()
          .describe("Board URL when the diagram was added to a board."),
        boardEditUrl: z
          .string()
          .optional()
          .describe("Editable board URL when the diagram was added to a board."),
        boardId: z.string().optional().describe("Primary board ID for this diagram."),
        boardSecret: z
          .string()
          .optional()
          .describe("Primary board edit secret for this diagram."),
        boardItemId: z
          .string()
          .optional()
          .describe("Board card item ID when added to a board."),
        boardPageId: z
          .string()
          .optional()
          .describe("Board page ID when added to a board."),
        placement: z
          .object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
          })
          .optional()
          .describe("Actual board card bounds after non-overlap placement."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({
      content,
      title,
      boardId,
      boardSecret,
      pageId,
      pageName,
      x,
      y,
      width,
      height,
    }) => {
      try {
        const targetBoard =
          boardId && boardSecret
            ? await withRetry(() => getBoard({ id: boardId }))
            : null;

        if (boardId && (!targetBoard || targetBoard.board.secret !== boardSecret)) {
          return {
            content: [
              {
                type: "text" as const,
                text: targetBoard
                  ? "Error: Invalid board secret"
                  : "Error: Board not found",
              },
            ],
            isError: true,
          };
        }

        const result = await withRetry(() =>
          createDiagram({ content, title, primaryBoard: !targetBoard }),
        );
        const diagramUrl = `${baseUrl}/d/${result.id}`;
        const data: {
          id: string;
          url: string;
          editUrl: string;
          diagramUrl: string;
          secret: string;
          version: number;
          boardId?: string;
          boardSecret?: string;
          boardUrl?: string;
          boardEditUrl?: string;
          boardItemId?: string;
          boardPageId?: string;
          placement?: { x: number; y: number; width: number; height: number };
        } = {
          id: result.id,
          url: result.boardId ? `${baseUrl}/b/${result.boardId}` : diagramUrl,
          editUrl: result.boardEditId
            ? `${baseUrl}/be/${result.boardEditId}`
            : diagramUrl,
          diagramUrl,
          secret: result.secret,
          version: result.version,
        };
        if (result.boardId && result.boardSecret) {
          data.boardId = result.boardId;
          data.boardSecret = result.boardSecret;
          data.boardUrl = `${baseUrl}/b/${result.boardId}`;
          if (result.boardEditId) {
            data.boardEditUrl = `${baseUrl}/be/${result.boardEditId}`;
          }
        }

        if (targetBoard && boardId && boardSecret) {
          const boardResult = await withRetry(() =>
            addDiagramToBoard({
              boardId,
              secret: boardSecret,
              diagramId: result.id,
              pageId,
              pageName,
              title,
              x,
              y,
              width,
              height,
            }),
          );

          if ("error" in boardResult) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: Failed to add diagram to board (${boardResult.error})`,
                },
              ],
              isError: true,
            };
          }

          data.boardItemId = boardResult.itemId;
          data.boardPageId = boardResult.pageId;
          data.placement = {
            x: boardResult.x,
            y: boardResult.y,
            width: boardResult.width,
            height: boardResult.height,
          };
          const board = await withRetry(() => getBoard({ id: boardId }));
          if (board) {
            data.boardId = board.board.id;
            data.boardSecret = boardSecret;
            data.boardUrl = `${baseUrl}/b/${board.board.id}`;
            data.boardEditUrl = `${baseUrl}/be/${board.board.editId}`;
            data.url = data.boardUrl;
            data.editUrl = data.boardEditUrl;
          }
        }

        return {
          structuredContent: data,
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: "text" as const, text: "Error: Failed to create diagram. Please try again." }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "create_board",
    {
      title: "Create Mermaid Board",
      description:
        "Create a shareable Mermaid diagram board with pages and draggable/resizable diagram cards. Use this before creating several related diagrams so they land in one workspace.",
      inputSchema: {
        title: z
          .string()
          .optional()
          .describe("Human-readable board title, such as 'Auth Architecture'."),
        diagramId: z
          .string()
          .optional()
          .describe("Optional existing diagram ID to place on the first page."),
      },
      outputSchema: {
        id: z.string().describe("Unique board ID"),
        url: z.string().describe("Shareable board URL"),
        editUrl: z.string().describe("Editable board URL"),
        secret: z
          .string()
          .describe("Board edit secret. Save this to add diagrams later."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ title, diagramId }) => {
      try {
        const result = await withRetry(() => createBoard({ title, diagramId }));
        const data = {
          id: result.id,
          url: `${baseUrl}/b/${result.id}`,
          editUrl: `${baseUrl}/be/${result.editId}`,
          secret: result.secret,
        };
        return {
          structuredContent: data,
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: "text" as const, text: "Error: Failed to create board. Please try again." }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "add_diagram_to_board",
    {
      title: "Add Diagram To Board",
      description:
        "Place an existing Mermaid diagram onto a board page. Use this when a new diagram is relevant to a previous diagram and should appear in the same workspace.",
      inputSchema: {
        boardId: z.string().describe("Board ID from create_board"),
        boardSecret: z.string().describe("Board secret from create_board"),
        diagramId: z.string().describe("Existing diagram ID to place on the board"),
        pageId: z.string().optional().describe("Optional page ID"),
        pageName: z
          .string()
          .optional()
          .describe("Optional page name. Created if it does not exist."),
        title: z.string().optional().describe("Optional card title override"),
        x: z
          .number()
          .optional()
          .describe(
            "Optional preferred board x coordinate. If it overlaps an existing card, merm.sh moves it to the nearest open spot.",
          ),
        y: z
          .number()
          .optional()
          .describe(
            "Optional preferred board y coordinate. If it overlaps an existing card, merm.sh moves it to the nearest open spot.",
          ),
        width: z
          .number()
          .optional()
          .describe("Optional board card width in pixels. Minimum 320."),
        height: z
          .number()
          .optional()
          .describe("Optional board card height in pixels. Minimum 260."),
      },
      outputSchema: {
        boardId: z.string().describe("Board ID"),
        itemId: z.string().describe("Board card item ID"),
        pageId: z.string().describe("Page ID where the diagram was placed"),
        url: z.string().describe("Shareable board URL"),
        editUrl: z.string().describe("Editable board URL"),
        placement: z
          .object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
          })
          .describe("Actual board card bounds after non-overlap placement."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({
      boardId,
      boardSecret,
      diagramId,
      pageId,
      pageName,
      title,
      x,
      y,
      width,
      height,
    }) => {
      try {
        const result = await withRetry(() =>
          addDiagramToBoard({
            boardId,
            secret: boardSecret,
            diagramId,
            pageId,
            pageName,
            title,
            x,
            y,
            width,
            height,
          }),
        );

        if ("error" in result) {
          const message =
            result.error === "diagram_not_found"
              ? "Diagram not found"
              : result.error === "not_found"
                ? "Board not found"
                : "Invalid board secret";
          return {
            content: [{ type: "text" as const, text: `Error: ${message}` }],
            isError: true,
          };
        }

        const board = await withRetry(() => getBoard({ id: boardId }));
        if (!board) {
          return {
            content: [{ type: "text" as const, text: "Error: Board not found" }],
            isError: true,
          };
        }

        const data = {
          boardId,
          itemId: result.itemId,
          pageId: result.pageId,
          url: `${baseUrl}/b/${board.board.id}`,
          editUrl: `${baseUrl}/be/${board.board.editId}`,
          placement: {
            x: result.x,
            y: result.y,
            width: result.width,
            height: result.height,
          },
        };
        return {
          structuredContent: data,
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: "text" as const, text: "Error: Failed to add diagram to board. Please try again." }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "update_diagram",
    {
      title: "Update Mermaid Diagram",
      description:
        "Update an existing diagram with new Mermaid content. Creates a new version — previous versions are preserved and accessible via the version history. Requires the edit secret from when the diagram was created.",
      inputSchema: {
        id: z.string().describe("Diagram ID from the create response"),
        secret: z
          .string()
          .describe("Edit secret returned when the diagram was created"),
        content: z
          .string()
          .min(1, "Content cannot be empty")
          .describe(
            "New Mermaid diagram source code (replaces the current version)",
          ),
        title: z
          .string()
          .optional()
          .describe("New title (leave empty to keep the existing title)"),
      },
      outputSchema: {
        id: z.string().describe("Diagram ID"),
        url: z.string().describe("Shareable URL to view the rendered diagram"),
        version: z.number().describe("New version number after this update"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ id, secret, content, title }) => {
      try {
        const result = await withRetry(() =>
          addVersion({ diagramId: id, secret, content, title }),
        );
        if ("error" in result) {
          const message =
            result.error === "not_found" ? "Diagram not found" : "Invalid secret";
          return {
            content: [{ type: "text" as const, text: `Error: ${message}` }],
            isError: true,
          };
        }
        const data = {
          id,
          url: `${baseUrl}/d/${id}`,
          version: result.version,
        };
        return {
          structuredContent: data,
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: "text" as const, text: "Error: Failed to update diagram. Please try again." }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_diagram",
    {
      title: "Get Mermaid Diagram",
      description:
        "Fetch a diagram's current Mermaid source, metadata, and full version history. Use this to read an existing diagram before updating it or to check what version it's on.",
      inputSchema: {
        id: z.string().describe("Diagram ID"),
        version: z
          .number()
          .optional()
          .describe(
            "Specific version number to fetch. Omit to get the latest version.",
          ),
      },
      outputSchema: {
        id: z.string().describe("Diagram ID"),
        title: z.string().describe("Diagram title"),
        version: z.number().describe("Requested version number"),
        content: z.string().describe("Mermaid diagram source code for the requested version"),
        url: z.string().describe("Shareable URL to view the rendered diagram"),
        versions: z
          .array(
            z.object({
              version: z.number(),
              content: z.string(),
              createdAt: z.string(),
            }),
          )
          .describe("All versions with their content and timestamps"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id, version }) => {
      try {
        const data = await withRetry(() => getDiagram({ id, version }));
        if (!data) {
          return {
            content: [
              { type: "text" as const, text: "Error: Diagram not found" },
            ],
            isError: true,
          };
        }
        const result = {
          id: data.diagram.id,
          title: data.diagram.title,
          version: data.currentVersion.version,
          content: data.currentVersion.content,
          url: `${baseUrl}/d/${data.diagram.id}`,
          versions: data.allVersions.map((v) => ({
            version: v.version,
            content: v.content,
            createdAt: v.createdAt.toISOString(),
          })),
        };
        return {
          structuredContent: result,
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch {
        return {
          content: [{ type: "text" as const, text: "Error: Failed to fetch diagram. Please try again." }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_board",
    {
      title: "Get Mermaid Board",
      description:
        "Fetch a board's pages and diagrams. Use this before adding related diagrams when the user has already shared a board ID or URL.",
      inputSchema: {
        id: z.string().describe("Board ID"),
      },
      outputSchema: {
        id: z.string().describe("Board ID"),
        title: z.string().describe("Board title"),
        url: z.string().describe("Shareable board URL"),
        editUrl: z.string().describe("Editable board URL"),
        pages: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              diagrams: z.array(
                z.object({
                  itemId: z.string(),
                  diagramId: z.string(),
                  title: z.string(),
                  url: z.string(),
                  content: z.string(),
                  x: z.number(),
                  y: z.number(),
                  width: z.number(),
                  height: z.number(),
                }),
              ),
            }),
          )
          .describe("Board pages and diagram cards"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => {
      try {
        const board = await withRetry(() => getBoard({ id }));
        if (!board) {
          return {
            content: [{ type: "text" as const, text: "Error: Board not found" }],
            isError: true,
          };
        }

        const result = {
          id: board.board.id,
          title: board.board.title,
          url: `${baseUrl}/b/${board.board.id}`,
          editUrl: `${baseUrl}/be/${board.board.editId}`,
          pages: board.state.pages.map((page) => ({
            id: page.id,
            name: page.name,
            diagrams: page.items.map((item) => ({
              itemId: item.id,
              diagramId: item.diagramId,
              title: item.title,
              url: `${baseUrl}${item.href}`,
              content: item.content,
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
            })),
          })),
        };

        return {
          structuredContent: result,
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: "text" as const, text: "Error: Failed to fetch board. Please try again." }],
          isError: true,
        };
      }
    },
  );

  return server;
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function POST(request: Request) {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createMcpServer(baseUrl);
  await server.connect(transport);

  const response = await transport.handleRequest(request);
  await server.close();
  return withCors(response);
}

export async function GET(request: Request) {
  const accept = request.headers.get("accept") ?? "";

  if (accept.includes("text/event-stream") && !accept.includes("text/html")) {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  return Response.json(
    {
      name: "mermaid-viewer",
      version: "1.0.0",
      protocol: "MCP Streamable HTTP",
      protocolVersion: "2025-03-26",
      description:
        "Create, update, and fetch versioned Mermaid diagrams and multi-diagram boards. Every diagram update creates a new version — nothing is overwritten. Add this URL as a remote MCP server in your client.",
      url: `${baseUrl}/mcp`,
      skill: `${baseUrl}/skill.md`,
    },
    { headers: CORS_HEADERS },
  );
}

export async function DELETE() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
