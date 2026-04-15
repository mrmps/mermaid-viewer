import type mermaidType from "mermaid";
import { prepareMermaidSource } from "@/lib/mermaid-source";

export type MermaidValidationResult =
  | { ok: true }
  | { ok: false; kind: "syntax" | "unavailable"; message: string };

const SERVER_DOM_GLOBALS = [
  "window",
  "document",
  "navigator",
  "Document",
  "Element",
  "HTMLElement",
  "Node",
  "SVGElement",
  "DOMParser",
  "MutationObserver",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
] as const;

function installGlobal(name: string, value: unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  if (descriptor && !descriptor.configurable && !descriptor.writable && !descriptor.set) {
    return;
  }

  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}

function snapshotGlobals() {
  return new Map(
    SERVER_DOM_GLOBALS.map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
}

function restoreGlobals(
  snapshot: Map<(typeof SERVER_DOM_GLOBALS)[number], PropertyDescriptor | undefined>,
) {
  for (const name of SERVER_DOM_GLOBALS) {
    const descriptor = snapshot.get(name);
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      delete (globalThis as Record<string, unknown>)[name];
    }
  }
}

let serverDomLock: Promise<void> = Promise.resolve();

async function withServerDomLock<T>(operation: () => Promise<T>) {
  const previous = serverDomLock;
  let releaseLock!: () => void;
  serverDomLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  await previous;

  try {
    return await operation();
  } finally {
    releaseLock();
  }
}

async function withServerDomEnvironment<T>(operation: () => Promise<T>) {
  return withServerDomLock(async () => {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      return operation();
    }

    const snapshot = snapshotGlobals();
    try {
      const { JSDOM } = await import("jsdom");
      const dom = new JSDOM("<!doctype html><html><body></body></html>", {
        pretendToBeVisual: true,
        url: "https://merm.sh",
      });

      installGlobal("window", dom.window);
      installGlobal("document", dom.window.document);
      installGlobal("navigator", dom.window.navigator);
      installGlobal("Document", dom.window.Document);
      installGlobal("Element", dom.window.Element);
      installGlobal("HTMLElement", dom.window.HTMLElement);
      installGlobal("Node", dom.window.Node);
      installGlobal("SVGElement", dom.window.SVGElement);
      installGlobal("DOMParser", dom.window.DOMParser);
      installGlobal("MutationObserver", dom.window.MutationObserver);
      installGlobal(
        "getComputedStyle",
        dom.window.getComputedStyle.bind(dom.window),
      );
      installGlobal(
        "requestAnimationFrame",
        dom.window.requestAnimationFrame.bind(dom.window),
      );
      installGlobal(
        "cancelAnimationFrame",
        dom.window.cancelAnimationFrame.bind(dom.window),
      );

      return await operation();
    } finally {
      restoreGlobals(snapshot);
    }
  });
}

/**
 * Upstream mermaid.parse silently accepts malformed node shapes like
 * `X[/label]` (parallelogram opener without the matching `/]`) when they
 * appear inside a `subgraph ... end` block — the renderer then fails.
 * This scan rejects those before we hand content to mermaid.
 */
function preValidateNodeShapes(
  content: string,
): { ok: true } | { ok: false; message: string } {
  const lines = content.split(/\r?\n/);
  const PATTERN = /\[([\\/])([^\]\n]*)\]/g;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("%%")) continue;
    PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PATTERN.exec(line)) !== null) {
      const [, opener, inner] = match;
      const lastChar = inner.at(-1);
      if (lastChar !== "/" && lastChar !== "\\") {
        return {
          ok: false,
          message: `Parsing failed on line ${i + 1}: malformed node shape '[${opener}${inner}]'. A '[${opener}' opener must be closed with '/]' or '\\]'.`,
        };
      }
    }
  }
  return { ok: true };
}

/**
 * Validate Mermaid syntax server-side and fail closed when the parser
 * cannot initialize, so the API never stores content it couldn't verify.
 */
export async function validateMermaid(
  content: string,
): Promise<MermaidValidationResult> {
  const prepared = prepareMermaidSource(content);

  const shapeCheck = preValidateNodeShapes(prepared);
  if (!shapeCheck.ok) {
    return { ok: false, kind: "syntax", message: shapeCheck.message };
  }

  try {
    await withServerDomEnvironment(async () => {
      const mermaid: typeof mermaidType = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, securityLevel: "antiscript" });
      await mermaid.parse(prepared);
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("is not a function") || msg.includes("DOMPurify")) {
      return {
        ok: false,
        kind: "unavailable",
        message: `Mermaid validation is unavailable: ${msg}`,
      };
    }

    if (msg.includes("Mermaid validation is unavailable")) {
      return {
        ok: false,
        kind: "unavailable",
        message: msg,
      };
    }

    return {
      ok: false,
      kind: "syntax",
      message: msg,
    };
  }
}
