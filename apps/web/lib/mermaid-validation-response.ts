import type { MermaidValidationResult } from "@/lib/mermaid-parse";

export function getMermaidValidationErrorResponse(
  result: Extract<MermaidValidationResult, { ok: false }>,
) {
  if (result.kind === "syntax") {
    return Response.json(
      { error: "invalid_syntax", message: result.message },
      { status: 400 },
    );
  }

  return Response.json(
    {
      error: "validation_unavailable",
      message: "Mermaid validation is temporarily unavailable. The diagram was not saved.",
      details: result.message,
    },
    { status: 503 },
  );
}
