import { describe, expect, it } from "vitest";
import { prepareMermaidSource } from "@/lib/mermaid-source";

describe("prepareMermaidSource", () => {
  it("moves a leading bare title into frontmatter and preserves init directives", () => {
    const input = `%%{init: {'theme': 'base'}}%%
title: Edge Computing Architecture
architecture-beta
  group cloud(cloud)[Cloudflare Global Network]
    service gateway(internet)[User Request] in cloud`;

    const result = prepareMermaidSource(input, { look: "classic" });

    expect(result).toContain('title: "Edge Computing Architecture"');
    expect(result).toContain("config:");
    expect(result).toContain("  look: classic");
    expect(result).toContain("%%{init: {'theme': 'base'}}%%");
    expect(result).toContain("architecture-beta");
    expect(result).not.toContain("\ntitle: Edge Computing Architecture\narchitecture-beta");
  });
});
