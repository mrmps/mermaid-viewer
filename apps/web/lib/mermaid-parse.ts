import type mermaidType from "mermaid";

let mermaidInstance: typeof mermaidType | null = null;

async function getMermaid() {
  if (!mermaidInstance) {
    mermaidInstance = (await import("mermaid")).default;
    mermaidInstance.initialize({ startOnLoad: false });
  }
  return mermaidInstance;
}

/**
 * Validate mermaid syntax server-side. Returns null if valid,
 * or the error message string if invalid.
 */
export async function validateMermaid(content: string): Promise<string | null> {
  const mermaid = await getMermaid();
  try {
    await mermaid.parse(content);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
