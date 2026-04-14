// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { sanitizeSvg } from "@/lib/mermaid-client";

/** Wrap content in a minimal SVG + foreignObject shell */
function svgWith(html: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="100" height="100"><div xmlns="http://www.w3.org/1999/xhtml">${html}</div></foreignObject></svg>`;
}

describe("sanitizeSvg", () => {
  // ── <br> handling (the bug) ────────────────────────────────────
  it("handles bare <br> tags without producing parseerror", () => {
    const input = svgWith("<p>Line 1<br>Line 2</p>");
    const result = sanitizeSvg(input);
    expect(result).not.toContain("parsererror");
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
  });

  it("handles bare <hr> tags without producing parseerror", () => {
    const input = svgWith("<p>Above<hr>Below</p>");
    const result = sanitizeSvg(input);
    expect(result).not.toContain("parsererror");
  });

  it("preserves already-valid self-closing <br/>", () => {
    const input = svgWith("<p>Line 1<br/>Line 2</p>");
    const result = sanitizeSvg(input);
    expect(result).not.toContain("parsererror");
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
  });

  it("preserves <br /> with space before slash (old regex corrupted this to <br //>)", () => {
    const input = svgWith("<p>Line 1<br />Line 2</p>");
    const result = sanitizeSvg(input);
    expect(result).not.toContain("parsererror");
    expect(result).not.toContain("<br //>");
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
  });

  // ── Security: script stripping ─────────────────────────────────
  it("strips <script> tags", () => {
    const input = svgWith('<p>safe</p><script>alert("xss")</script>');
    const result = sanitizeSvg(input);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
    expect(result).toContain("safe");
  });

  it("strips on* event handlers", () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)" width="10" height="10"/></svg>`;
    const result = sanitizeSvg(input);
    expect(result).not.toContain("onclick");
    expect(result).toContain("rect");
  });

  it("strips javascript: hrefs", () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>click</text></a></svg>`;
    const result = sanitizeSvg(input);
    expect(result).not.toContain("javascript:");
  });

  // ── Structural preservation ────────────────────────────────────
  it("preserves foreignObject and its HTML content", () => {
    const input = svgWith("<p>Hello <strong>world</strong></p>");
    const result = sanitizeSvg(input);
    expect(result).toContain("foreignObject");
    expect(result).toContain("Hello");
    expect(result).toContain("world");
  });

  it("passes through valid SVG without mangling it", () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100" fill="#ccc"/><text x="50" y="50">Hello</text></svg>`;
    const result = sanitizeSvg(input);
    expect(result).toContain("viewBox");
    expect(result).toContain("rect");
    expect(result).toContain("Hello");
    expect(result).toContain('fill=');
  });

  it("preserves SVG-specific attributes like viewBox, transform, marker-end", () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g transform="translate(10,10)"><line x1="0" y1="0" x2="100" y2="100" marker-end="url(#arrow)"/></g></svg>`;
    const result = sanitizeSvg(input);
    expect(result).toContain("viewBox");
    expect(result).toContain("transform");
    expect(result).toContain("marker-end");
  });
});
