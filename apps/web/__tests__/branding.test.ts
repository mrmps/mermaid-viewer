import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const WEB_DIR = join(__dirname, "..");

function readSource(relativePath: string): string {
  return readFileSync(join(WEB_DIR, relativePath), "utf-8");
}

describe("Branding consistency", () => {
  const userFacingFiles = [
    "app/layout.tsx",
    "app/page.tsx",
    "app/d/[id]/page.tsx",
    "app/e/[editId]/page.tsx",
    "app/diagrams/page.tsx",
    "app/docs/route.ts",
    "app/opengraph-image.tsx",
    "app/d/[id]/opengraph-image.tsx",
    "components/diagram-page-shell.tsx",
    "lib/openapi.ts",
    "lib/machine-content.ts",
    "app/api/install/route.ts",
  ];

  it("no user-facing file contains 'mermaidsh.com' (old domain)", () => {
    for (const file of userFacingFiles) {
      const content = readSource(file);
      const matches = content.match(/mermaidsh\.com/g);
      expect(matches, `${file} still references mermaidsh.com`).toBeNull();
    }
  });

  it("metadata titles use 'merm.sh' brand", () => {
    const layout = readSource("app/layout.tsx");
    expect(layout).toContain('merm.sh — Versioned Mermaid Diagrams');
  });

  it("OG images use 'merm.sh' brand", () => {
    const og = readSource("app/opengraph-image.tsx");
    expect(og).toContain("merm.sh");
    expect(og).not.toMatch(/mermaid-viewer/);
  });

  it("header shows 'merm.sh' brand", () => {
    const shell = readSource("components/diagram-page-shell.tsx");
    expect(shell).toContain("merm.sh");
  });

  it("default base URL in env.ts is merm.sh", () => {
    const envFile = readSource("lib/env.ts");
    expect(envFile).toContain('https://merm.sh');
  });
});

describe("Secret not leaked to client", () => {
  it("edit page does not pass secret prop to DiagramPageShell", () => {
    const editPage = readSource("app/e/[editId]/page.tsx");
    // Should NOT pass secret={diagram.secret} to the client component
    expect(editPage).not.toMatch(/secret=\{diagram\.secret\}/);
  });

  it("DiagramPageShell does not accept secret prop", () => {
    const shell = readSource("components/diagram-page-shell.tsx");
    // The type should not include secret
    const typeBlock = shell.match(/type DiagramPageShellProps[\s\S]*?\};/);
    expect(typeBlock).toBeTruthy();
    expect(typeBlock![0]).not.toContain("secret");
  });

  it("ShareButton does not accept secret prop", () => {
    const share = readSource("components/share-modal.tsx");
    // The exported ShareButton should use editId not secret for auth
    expect(share).not.toMatch(/secret\?: string;\n\s*title: string;\n\}\)/);
  });
});
