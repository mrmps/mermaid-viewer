"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  TransformWrapper,
  TransformComponent,
  useControls,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import {
  renderMermaid,
  renderBeautifulSync,
  loadBeautifulMermaid,
  fixSvgTextContrast,
  type MermaidTheme,
  type MermaidLook,
  type DiagramRenderer,
  type BeautifulTheme,
} from "@/lib/mermaid-client";
import { MermaidRenderFailure } from "@/lib/mermaid-error";

const btnClass = "bg-muted/85 text-secondary-foreground border border-border";

function getInitialUIMode(): "dark" | "light" {
  if (typeof document === "undefined") {
    return "dark";
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-1 z-10">
      <button onClick={() => zoomIn()} aria-label="Zoom in" className={`w-10 h-10 rounded-lg text-base font-mono flex items-center justify-center backdrop-blur-md cursor-pointer transition-[background-color,border-color] duration-150 active:scale-[0.96] ${btnClass}`}>+</button>
      <button onClick={() => zoomOut()} aria-label="Zoom out" className={`w-10 h-10 rounded-lg text-base font-mono flex items-center justify-center backdrop-blur-md cursor-pointer transition-[background-color,border-color] duration-150 active:scale-[0.96] ${btnClass}`}>−</button>
      <button onClick={() => resetTransform()} aria-label="Fit to screen" className={`h-10 px-3 rounded-lg text-xs flex items-center justify-center backdrop-blur-md cursor-pointer transition-[background-color,border-color] duration-150 active:scale-[0.96] ${btnClass}`}>Fit</button>
    </div>
  );
}

/**
 * Post-process an SVG element in the DOM: fit to container + center view.
 */
function fitAndCenter(
  svgEl: SVGElement,
  wrapperEl: HTMLDivElement,
  transformRef: React.RefObject<ReactZoomPanPinchRef | null>,
) {
  const vb = svgEl.getAttribute("viewBox");
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number);
    const svgW = parts[2];
    const svgH = parts[3];
    const wrapW = wrapperEl.clientWidth;
    const wrapH = wrapperEl.clientHeight;

    const scaleX = (wrapW * 0.85) / svgW;
    const scaleY = (wrapH * 0.85) / svgH;
    const fitScale = Math.min(scaleX, scaleY, 3);

    svgEl.setAttribute("width", String(Math.round(svgW * fitScale)));
    svgEl.setAttribute("height", String(Math.round(svgH * fitScale)));
  }

  requestAnimationFrame(() => {
    transformRef.current?.centerView(1, 0);
  });
}

export function MermaidRenderer({
  content,
  renderer = "beautiful",
  theme,
  look = "classic",
}: {
  content: string;
  renderer?: DiagramRenderer;
  theme: string;
  look?: MermaidLook;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const [uiMode, setUiMode] = useState<"dark" | "light">(getInitialUIMode);
  const [bmReady, setBmReady] = useState(false);
  const renderIdRef = useRef(0);

  // Watch for light/dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setUiMode(getInitialUIMode());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Preload beautiful-mermaid module on mount
  useEffect(() => {
    loadBeautifulMermaid().then(() => setBmReady(true));
  }, []);

  // ── Beautiful path: sync render via useMemo (per README recommendation) ──
  // renderMermaidSVG is synchronous — no flash, no loading state.
  // beautiful-mermaid generates safe SVGs, so no HTML sanitizer needed.
  const beautifulResult = useMemo(() => {
    if (renderer !== "beautiful" || !bmReady) return null;

    try {
      const svg = renderBeautifulSync(content, theme as BeautifulTheme, uiMode);
      if (svg) return { svg, error: null };
      return null; // module not loaded yet
    } catch (e) {
      // Unsupported diagram type — will fall back to classic
      return { svg: null, error: e };
    }
  }, [renderer, bmReady, content, theme, uiMode]);

  // Inject beautiful SVG into DOM after sync render
  useLayoutEffect(() => {
    if (renderer !== "beautiful" || !beautifulResult?.svg) return;
    if (!containerRef.current || !wrapperRef.current) return;

    containerRef.current.innerHTML = beautifulResult.svg;
    const svgEl = containerRef.current.querySelector("svg");
    if (!svgEl) return;

    // beautiful-mermaid sets CSS custom properties on the SVG root — keep them intact
    fitAndCenter(svgEl, wrapperRef.current, transformRef);
  }, [renderer, beautifulResult?.svg]);

  // ── Classic mermaid.js path: async render via useEffect ──
  const needsClassicFallback =
    renderer === "mermaid" ||
    (renderer === "beautiful" && bmReady && beautifulResult?.error) ||
    (renderer === "beautiful" && bmReady && !beautifulResult);

  const classicTheme = renderer === "mermaid" ? (theme as MermaidTheme) : "auto";
  const classicLook = renderer === "mermaid" ? look : "classic";
  const classicKey = needsClassicFallback
    ? `classic::${content}::${classicTheme}::${classicLook}::${uiMode}`
    : null;

  const [classicState, setClassicState] = useState<{
    key: string;
    status: "ready" | "error";
    error?: string;
    errorLine?: number | null;
    errorColumn?: number | null;
  } | null>(null);

  useEffect(() => {
    if (!needsClassicFallback || !classicKey) return;
    const currentRender = ++renderIdRef.current;

    renderMermaid(content, classicTheme, classicLook)
      .then((svg) => {
        if (currentRender !== renderIdRef.current) return;
        if (!containerRef.current || !wrapperRef.current) return;

        containerRef.current.innerHTML = svg;
        const svgEl = containerRef.current.querySelector("svg");
        if (!svgEl) return;

        svgEl.removeAttribute("style");
        fixSvgTextContrast(svgEl as SVGSVGElement);
        fitAndCenter(svgEl, wrapperRef.current!, transformRef);
        setClassicState({ key: classicKey, status: "ready" });
      })
      .catch((e) => {
        if (currentRender !== renderIdRef.current) return;
        const failure = e instanceof MermaidRenderFailure ? e : null;
        setClassicState({
          key: classicKey,
          status: "error",
          error: failure?.message ?? (e instanceof Error ? e.message : "Failed to render diagram"),
          errorLine: failure?.line ?? null,
          errorColumn: failure?.column ?? null,
        });
      });
  }, [needsClassicFallback, classicKey, content, classicTheme, classicLook]);

  // ── Determine visible state ──
  const classicSettled = classicState?.key === classicKey;
  const isClassicLoading = needsClassicFallback && !classicSettled;
  const isModuleLoading = renderer === "beautiful" && !bmReady;
  const loading = isModuleLoading || isClassicLoading;

  const errorState =
    needsClassicFallback && classicSettled && classicState?.status === "error"
      ? classicState
      : null;

  if (errorState) {
    const locationLabel =
      errorState.errorLine != null
        ? errorState.errorColumn != null
          ? `Line ${errorState.errorLine}, column ${errorState.errorColumn}`
          : `Line ${errorState.errorLine}`
        : null;
    return (
      <div className="flex items-center justify-center w-full h-full p-8">
        <div className="p-6 rounded-xl max-w-lg bg-destructive/10 border border-destructive/30 text-foreground" role="alert">
          <p className="font-semibold mb-2">Render Error</p>
          {locationLabel && (
            <p className="text-xs font-mono text-muted-foreground mb-2">{locationLabel}</p>
          )}
          <pre className="text-sm whitespace-pre-wrap font-mono text-secondary-foreground">{errorState.error}</pre>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full h-full bg-background">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10" role="status" aria-label="Loading diagram">
          <div className="w-4 h-4 rounded-full animate-spin border-2 border-muted-foreground/20 border-t-muted-foreground" />
          <span className="sr-only">Loading diagram...</span>
        </div>
      )}
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.1}
        maxScale={8}
        centerOnInit
        limitToBounds={false}
        wheel={{ step: 0.04 }}
        doubleClick={{ mode: "reset" }}
      >
        <ZoomControls />
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
        >
          <div
            ref={containerRef}
            className={`transition-[opacity] duration-150 ${loading ? "opacity-0" : "opacity-100"}`}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
