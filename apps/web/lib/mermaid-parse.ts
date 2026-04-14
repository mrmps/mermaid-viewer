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

async function withServerDomEnvironment<T>(operation: () => Promise<T>) {
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
}

/**
 * Validate Mermaid syntax server-side and fail closed when the parser
 * cannot initialize, so the API never stores content it couldn't verify.
 */
export async function validateMermaid(
  content: string,
): Promise<MermaidValidationResult> {
  try {
    await withServerDomEnvironment(async () => {
      const mermaid: typeof mermaidType = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, securityLevel: "antiscript" });
      await mermaid.parse(prepareMermaidSource(content));
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
