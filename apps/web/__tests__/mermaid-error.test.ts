import { describe, expect, it } from "vitest";
import { parseMermaidError } from "@/lib/mermaid-error";

describe("parseMermaidError", () => {
  it("extracts line from 'Parse error on line N'", () => {
    const result = parseMermaidError(new Error("Parse error on line 3:\n...\n^\nExpecting 'SEMI'"));
    expect(result.line).toBe(3);
  });

  it("extracts line from 'at line N'", () => {
    const result = parseMermaidError(new Error("Lexical error at line 7"));
    expect(result.line).toBe(7);
  });

  it("extracts line and column from 'line N column M'", () => {
    const result = parseMermaidError(new Error("Unexpected token at line 4 column 12"));
    expect(result.line).toBe(4);
    expect(result.column).toBe(12);
  });

  it("extracts line and column from 'line N:M' shorthand", () => {
    const result = parseMermaidError(new Error("Parse error line 5:9 — unexpected token"));
    expect(result.line).toBe(5);
    expect(result.column).toBe(9);
  });

  it("extracts line from 'line: N' fallback format", () => {
    const result = parseMermaidError(new Error("Diagram failed, line: 10"));
    expect(result.line).toBe(10);
  });

  it("defaults line to 1 for 'unknown diagram' errors", () => {
    const result = parseMermaidError(new Error("No diagram type detected, unknown diagram"));
    expect(result.line).toBe(1);
  });

  it("returns null line/column when no location can be found", () => {
    const result = parseMermaidError(new Error("Some generic failure"));
    expect(result.line).toBeNull();
    expect(result.column).toBeNull();
  });

  it("strips the 💣 emoji from messages", () => {
    const result = parseMermaidError(new Error("💣 Something went wrong"));
    expect(result.message).not.toContain("💣");
    expect(result.message).toContain("Something went wrong");
  });

  it("strips ASCII caret art from parser output", () => {
    const raw = `Parse error on line 2:
graph LR; A --X B
---------^
Expecting 'SEMI', got 'INVALID'`;
    const result = parseMermaidError(new Error(raw));
    expect(result.message).not.toMatch(/-{3,}\^/);
    expect(result.message).not.toContain("---------^");
  });

  it("strips trailing 'Syntax error in text' boilerplate", () => {
    const raw = `Parse error on line 1
Syntax error in text:
mermaid version 10.0.0`;
    const result = parseMermaidError(new Error(raw));
    expect(result.message).not.toContain("Syntax error in text");
    expect(result.message).not.toContain("mermaid version");
  });

  it("replaces standalone 'Syntax error in text...' with 'Syntax error'", () => {
    const result = parseMermaidError(new Error("Syntax error in text:\nmermaid version 10"));
    expect(result.message).toBe("Syntax error");
  });

  it("strips a leading 'Error: ' prefix", () => {
    const result = parseMermaidError(new Error("Error: Parse error on line 2"));
    expect(result.message).not.toMatch(/^Error:/i);
  });

  it("collapses triple-or-more newlines to double", () => {
    const result = parseMermaidError(new Error("first\n\n\n\nsecond"));
    expect(result.message).not.toContain("\n\n\n");
    expect(result.message).toContain("first\n\nsecond");
  });

  it("falls back to a friendly message when stripping leaves nothing", () => {
    const result = parseMermaidError(new Error("💣"));
    expect(result.message).toBe("Syntax error — check your diagram code");
  });

  it("accepts non-Error inputs by coercing to string", () => {
    const result = parseMermaidError("Parse error on line 6: bad");
    expect(result.line).toBe(6);
    expect(result.message).toContain("bad");
  });

  it("keeps a clean message intact", () => {
    const result = parseMermaidError(new Error("Unsupported markdown in node label"));
    expect(result.message).toBe("Unsupported markdown in node label");
  });
});
