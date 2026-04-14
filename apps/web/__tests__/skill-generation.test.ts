import { describe, it, expect } from "vitest";
import { generateSkillContent } from "../lib/skill";

describe("generateSkillContent", () => {
  const base = {
    id: "abc123",
    title: "Test Diagram",
    baseUrl: "https://merm.sh",
    content: "graph TD; A-->B",
    version: 1,
  };

  it("generates read-only skill without secret", () => {
    const skill = generateSkillContent(base);
    expect(skill).toContain("# Test Diagram");
    expect(skill).toContain("merm.sh/d/abc123");
    expect(skill).toContain("curl https://merm.sh/api/d/abc123");
    expect(skill).not.toContain("Push an update");
    expect(skill).not.toContain("Authorization");
  });

  it("generates read-write skill with secret", () => {
    const skill = generateSkillContent({ ...base, secret: "sk_test" });
    expect(skill).toContain("Push an update");
    expect(skill).toContain("Authorization: Bearer sk_test");
    expect(skill).toContain("curl -X PUT");
  });

  it("includes current content in skill", () => {
    const skill = generateSkillContent(base);
    expect(skill).toContain("```mermaid");
    expect(skill).toContain("graph TD; A-->B");
    expect(skill).toContain("v1");
  });

  it("escapes quotes in title for description", () => {
    const skill = generateSkillContent({ ...base, title: 'My "Diagram"' });
    expect(skill).toContain('My \\"Diagram\\"');
  });

  it("uses merm.sh branding in description", () => {
    const skill = generateSkillContent(base);
    expect(skill).toContain("merm.sh");
    expect(skill).not.toContain("mermaidsh");
  });
});
