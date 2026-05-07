"use client";

import { useEffect, useState } from "react";
import {
  fixSvgTextContrast,
  loadBeautifulMermaid,
  renderBeautifulSync,
  renderMermaid,
  type BeautifulTheme,
  type DiagramRenderer,
  type MermaidLook,
  type MermaidTheme,
} from "@/lib/mermaid-client";
import { MermaidRenderFailure } from "@/lib/mermaid-error";

type PreviewState =
  | { key: string; status: "loading" }
  | { key: string; status: "ready"; imageSrc: string }
  | { key: string; status: "error"; message: string; location: string | null };

function getInitialUIMode(forcedMode?: "dark" | "light"): "dark" | "light" {
  if (forcedMode) return forcedMode;
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function preparePreviewSvg(svg: SVGSVGElement, isClassic: boolean) {
  if (isClassic) {
    svg.removeAttribute("style");
  }

  fixSvgTextContrast(svg);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.maxWidth = "100%";
  svg.style.maxHeight = "100%";
  svg.style.display = "block";
}

function preparePreviewImageSource(svg: string, isClassic: boolean) {
  const doc = new DOMParser().parseFromString(svg, "text/html");
  const svgElement = doc.querySelector("svg");
  if (!svgElement) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  preparePreviewSvg(svgElement as unknown as SVGSVGElement, isClassic);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgElement.outerHTML)}`;
}

export function MermaidPreview({
  content,
  renderer = "beautiful",
  theme,
  look = "classic",
  uiMode: forcedUIMode,
}: {
  content: string;
  renderer?: DiagramRenderer;
  theme: string;
  look?: MermaidLook;
  uiMode?: "dark" | "light";
}) {
  const [detectedUIMode, setDetectedUIMode] =
    useState<"dark" | "light">(getInitialUIMode);
  const uiMode = forcedUIMode ?? detectedUIMode;
  const key = `${renderer}\u0000${theme}\u0000${look}\u0000${uiMode}\u0000${content}`;
  const [state, setState] = useState<PreviewState>({
    key,
    status: "loading",
  });

  useEffect(() => {
    if (forcedUIMode) return;

    const observer = new MutationObserver(() => {
      setDetectedUIMode(getInitialUIMode());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [forcedUIMode]);

  useEffect(() => {
    let cancelled = false;

    async function renderPreview() {
      setState({ key, status: "loading" });

      try {
        let svg: string | null = null;
        let isClassic = renderer === "mermaid";

        if (renderer === "beautiful") {
          await loadBeautifulMermaid();
          svg = renderBeautifulSync(content, theme as BeautifulTheme, uiMode);
          if (!svg) {
            isClassic = true;
            svg = await renderMermaid(content, "auto", "classic", uiMode);
          }
        } else {
          svg = await renderMermaid(content, theme as MermaidTheme, look, uiMode);
        }

        if (cancelled) return;

        setState({
          key,
          status: "ready",
          imageSrc: preparePreviewImageSource(svg, isClassic),
        });
      } catch (error) {
        if (cancelled) return;

        const failure = error instanceof MermaidRenderFailure ? error : null;
        const location =
          failure?.line != null
            ? failure.column != null
              ? `Line ${failure.line}, column ${failure.column}`
              : `Line ${failure.line}`
            : null;

        setState({
          key,
          status: "error",
          message:
            failure?.message ??
            (error instanceof Error ? error.message : "Failed to render diagram"),
          location,
        });
      }
    }

    renderPreview();

    return () => {
      cancelled = true;
    };
  }, [content, key, look, renderer, theme, uiMode]);

  const visibleState =
    state.key === key ? state : ({ key, status: "loading" } as const);

  if (visibleState.status === "error") {
    return (
      <div
        className="flex h-full w-full items-center justify-center p-4"
        role="alert"
      >
        <div className="max-h-full w-full overflow-auto rounded-md border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
          {visibleState.location ? (
            <div className="mb-1 font-mono text-[11px] text-destructive/80">
              {visibleState.location}
            </div>
          ) : null}
          <pre className="whitespace-pre-wrap font-mono">
            {visibleState.message}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {visibleState.status === "loading" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
        </div>
      ) : null}
      {visibleState.status === "ready" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
          src={visibleState.imageSrc}
        />
      ) : null}
    </div>
  );
}
