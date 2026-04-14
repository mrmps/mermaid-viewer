import type mermaidType from "mermaid";

let mermaidInstance: typeof mermaidType | null = null;
let initFailed = false;

async function getMermaid() {
  if (initFailed) return null;
  if (!mermaidInstance) {
    try {
      mermaidInstance = (await import("mermaid")).default;
      mermaidInstance.initialize({ startOnLoad: false, securityLevel: "loose" });
    } catch {
      initFailed = true;
      return null;
    }
  }
  return mermaidInstance;
}

/**
 * Validate mermaid syntax server-side. Returns null if valid,
 * or the error message string if invalid.
 * Skips validation gracefully if mermaid can't initialize (no DOM).
 */
export async function validateMermaid(content: string): Promise<string | null> {
  const mermaid = await getMermaid();
  if (!mermaid) return null; // can't validate without DOM — accept content
  try {
    await mermaid.parse(content);
    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // DOMPurify errors are environment issues, not syntax errors
    if (msg.includes("is not a function") || msg.includes("DOMPurify")) {
      return null;
    }
    return msg;
  }
}
