import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createDiagram, getDiagram, addVersion } from "@mermaid-viewer/db";
import { z } from "zod";

function getBaseUrl(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? "mermaidsh.com";
  if (host === "mermaidsh.com") return "https://mermaidsh.com";
  return `${proto}://${host}`;
}

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
      description: `Create a new versioned Mermaid diagram hosted on ${baseUrl}. Returns a shareable URL and an edit secret. IMPORTANT: save the secret — you need it to push updates later. Always send the diagram URL to the user so they can view it in the browser.`,
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
      },
      outputSchema: {
        id: z.string().describe("Unique diagram ID"),
        url: z.string().describe("Shareable URL to view the rendered diagram"),
        editUrl: z
          .string()
          .describe("URL with edit secret for browser-based editing"),
        secret: z
          .string()
          .describe(
            "Edit secret — save this to push updates. Only returned on create.",
          ),
        version: z.number().describe("Version number (starts at 1)"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ content, title }) => {
      try {
        const result = await withRetry(() => createDiagram({ content, title }));
        const data = {
          id: result.id,
          url: `${baseUrl}/d/${result.id}`,
          editUrl: `${baseUrl}/e/${result.editId}`,
          secret: result.secret,
          version: result.version,
        };
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
  const server = createMcpServer(getBaseUrl(request));
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

  const baseUrl = getBaseUrl(request);
  return Response.json(
    {
      name: "mermaid-viewer",
      version: "1.0.0",
      protocol: "MCP Streamable HTTP",
      protocolVersion: "2025-03-26",
      description:
        "Create, update, and fetch versioned Mermaid diagrams. Every update creates a new version — nothing is overwritten. Add this URL as a remote MCP server in your client.",
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
