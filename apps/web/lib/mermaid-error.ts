export interface MermaidRenderError {
  message: string;
  line: number | null;
  column: number | null;
}

export class MermaidRenderFailure extends Error {
  readonly line: number | null;
  readonly column: number | null;

  constructor(parsed: MermaidRenderError) {
    super(parsed.message);
    this.name = "MermaidRenderFailure";
    this.line = parsed.line;
    this.column = parsed.column;
  }
}

const FALLBACK_MESSAGE = "Syntax error — check your diagram code";

export function parseMermaidError(err: unknown): MermaidRenderError {
  const raw = err instanceof Error ? err.message : String(err);

  let line: number | null = null;
  let column: number | null = null;

  const lineColMatch = raw.match(/line\s+(\d+)(?::|\s*column\s*)(\d+)/i);
  if (lineColMatch) {
    line = parseInt(lineColMatch[1], 10);
    column = parseInt(lineColMatch[2], 10);
  }

  if (line === null) {
    const lineMatch = raw.match(/(?:on |at )line\s+(\d+)/i);
    if (lineMatch) line = parseInt(lineMatch[1], 10);
  }

  if (line === null) {
    const altLineMatch = raw.match(/line:\s*(\d+)/i);
    if (altLineMatch) line = parseInt(altLineMatch[1], 10);
  }

  if (line === null && /unknown diagram/i.test(raw)) line = 1;

  let message = raw
    .replace(/^Error:\s+/i, "")
    .replace(/\nSyntax error in text[\s\S]*/i, "")
    .replace(/^Syntax error in text[\s\S]*/i, "Syntax error")
    .replace(/💣\s*/g, "")
    .replace(/\n[ \t]*-+\^[^\n]*\n?/g, "\n")
    .replace(/\n\.{3}.*\n[-^]+\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!message || message.length < 3) message = FALLBACK_MESSAGE;

  return { message, line, column };
}
