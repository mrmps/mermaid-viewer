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
import { addVersion, getDiagram } from "@mermaid-viewer/db";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const updateDiagramSchema = z.object({
  content: z.string().describe("The complete updated Mermaid diagram code"),
  summary: z.string().describe("A brief one-line summary of what was changed"),
});
const updateDiagramOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    version: z.number(),
  }),
  z.object({
    success: z.literal(false),
    error: z.enum(["not_found", "unauthorized"]).optional(),
  }),
]);

type UpdateDiagramInput = z.infer<typeof updateDiagramSchema>;
type UpdateDiagramOutput = z.infer<typeof updateDiagramOutputSchema>;
type ChatUIMessage = UIMessage<
  unknown,
  never,
  {
    update_diagram: {
      input: UpdateDiagramInput;
      output: UpdateDiagramOutput;
    };
  }
>;

const updateDiagramDescription =
  "Update the Mermaid diagram with new content. Use this when the user asks to modify, change, add to, or create a new version of the diagram.";

const validationTools = {
  update_diagram: tool({
    description: updateDiagramDescription,
    inputSchema: zodSchema(updateDiagramSchema),
    outputSchema: zodSchema(updateDiagramOutputSchema),
  }),
};

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json(
      {
        error: "misconfigured",
        message: "Chat is not configured on this deployment",
      },
      { status: 503 }
    );
  }

  const MAX_MESSAGES = 50;
  const MAX_BODY_SIZE = 128_000; // ~128KB

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_SIZE) {
    return Response.json(
      { error: "payload_too_large", message: "Request body exceeds 128KB limit." },
      { status: 413 }
    );
  }

  const body = JSON.parse(rawBody);
  const {
    messages: rawMessages,
    diagramId,
    editId,
    currentContent,
  }: {
    messages: ChatUIMessage[];
    diagramId: string;
    editId: string;
    currentContent: string;
  } = body;

  if (!diagramId || !editId) {
    return Response.json(
      { error: "unauthorized", message: "Edit access required" },
      { status: 401 }
    );
  }

  if (!Array.isArray(rawMessages) || rawMessages.length > MAX_MESSAGES) {
    return Response.json(
      { error: "bad_request", message: `Messages must be an array with at most ${MAX_MESSAGES} entries.` },
      { status: 400 }
    );
  }

  // Fetch version history from DB — cap to last 10 versions to keep prompt size reasonable
  const diagramData = await getDiagram({ id: diagramId });
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

  const validatedMessages = await validateUIMessages<ChatUIMessage>({
    messages: rawMessages,
    tools: validationTools,
  });

  const messages = await convertToModelMessages(validatedMessages);

  const result = streamText({
    model: openrouter.chat("openrouter/auto"),
    abortSignal: req.signal,
    system: `You are a Mermaid diagram assistant. You help users create, modify, and improve Mermaid diagrams through conversation.

## Current Diagram
\`\`\`mermaid
${currentContent}
\`\`\`
${versionHistoryBlock}
## Guidelines
- ALWAYS use the update_diagram tool when creating, modifying, or changing diagram content. Never output raw Mermaid code in your response text — always call the tool instead.
- Always output the FULL diagram content when updating, not just the changed parts.
- Keep the existing diagram structure unless the user asks to change it.
- You can explain what you changed after calling the tool.
- If the user asks a question about the diagram without requesting changes, just answer without calling the tool.
- When the user asks to restore a previous version (e.g. "restore v3"), find that version in the version history and call update_diagram with its content.
- Support all Mermaid diagram types: flowchart, sequence, class, state, ER, gantt, pie, mindmap, timeline, etc.
- Write clean, well-formatted Mermaid syntax.
- Be concise in your responses.`,
    messages,
    tools: {
      update_diagram: tool({
        description: updateDiagramDescription,
        inputSchema: zodSchema(updateDiagramSchema),
        outputSchema: zodSchema(updateDiagramOutputSchema),
        execute: async ({ content }: UpdateDiagramInput) => {
          const result = await addVersion({
            diagramId,
            editId,
            content,
          });

          if ("error" in result) {
            return { success: false as const, error: result.error };
          }

          return { success: true as const, version: result.version };
        },
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
