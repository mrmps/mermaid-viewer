// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  SANITIZED_UI_CSP,
  buildSanitizedUiDocument,
  sanitizeUiHtml,
} from "@/lib/sanitized-ui";

describe("sanitized website UI", () => {
  it("strips executable HTML and unsafe navigation URLs", () => {
    const result = sanitizeUiHtml(`
      <main onclick="alert(1)">
        <script>alert("xss")</script>
        <a href="javascript:alert(1)" ping="https://example.com">open</a>
        <iframe srcdoc="<script>alert(1)</script>"></iframe>
        <img src="data:image/png;base64,aaa" onerror="alert(1)">
      </main>
    `);

    expect(result).toContain("<main");
    expect(result).toContain("open");
    expect(result).toContain("data:image/png");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("ping=");
    expect(result).not.toContain("<iframe");
  });

  it("keeps CSS but removes network-capable CSS", () => {
    const result = sanitizeUiHtml(`
      <style>
        @import url("https://evil.example/style.css");
        .hero { background-image: url("https://evil.example/track.png"); color: red; }
      </style>
      <div style="background:url(https://evil.example/track.png); color: blue">Hero</div>
    `);

    expect(result).toContain("color: red");
    expect(result).toContain("color: blue");
    expect(result).not.toContain("@import");
    expect(result).not.toContain("https://evil.example");
    expect(result).not.toContain("url(");
  });

  it("wraps UI in a locked-down iframe document", () => {
    const result = buildSanitizedUiDocument("<main>Hello</main>", "Launch");

    expect(result).toContain(`Content-Security-Policy" content="${SANITIZED_UI_CSP}`);
    expect(result).toContain("<title>Launch</title>");
    expect(result).toContain("<main>Hello</main>");
    expect(result).toContain("script-src 'none'");
    expect(result).toContain("connect-src 'none'");
  });
});
