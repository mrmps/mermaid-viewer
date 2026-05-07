import { createBoard } from "@mermaid-viewer/db";
import { baseUrl } from "@/lib/env";
import { z } from "zod";

const createBoardSchema = z.object({
  title: z.string().optional(),
  diagramId: z.string().optional(),
});

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      { error: "bad_request", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = createBoardSchema.safeParse(rawBody);
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

  const result = await createBoard(parsed.data);

  return Response.json(
    {
      id: result.id,
      editId: result.editId,
      url: `${baseUrl}/b/${result.id}`,
      editUrl: `${baseUrl}/be/${result.editId}`,
      secret: result.secret,
    },
    { status: 201 }
  );
}
