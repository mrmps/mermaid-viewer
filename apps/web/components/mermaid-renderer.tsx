"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  TransformWrapper,
  TransformComponent,
  useControls,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { renderMermaid, type MermaidTheme } from "@/lib/mermaid-client";

const btnStyle: React.CSSProperties = {
  background: "color-mix(in oklch, var(--bg-surface) 85%, transparent)",
  color: "var(--text-secondary)",
  border: "1px solid var(--border)",
};

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-1 z-10">
      <button onClick={() => zoomIn()} aria-label="Zoom in" className="w-8 h-8 rounded-lg text-base font-mono flex items-center justify-center backdrop-blur-md cursor-pointer transition-colors" style={btnStyle}>+</button>
      <button onClick={() => zoomOut()} aria-label="Zoom out" className="w-8 h-8 rounded-lg text-base font-mono flex items-center justify-center backdrop-blur-md cursor-pointer transition-colors" style={btnStyle}>−</button>
      <button onClick={() => resetTransform()} aria-label="Fit to screen" className="h-8 px-3 rounded-lg text-xs flex items-center justify-center backdrop-blur-md cursor-pointer transition-colors" style={btnStyle}>Fit</button>
    </div>
  );
}

export function MermaidRenderer({
  content,
  theme,
}: {
  content: string;
  theme: MermaidTheme;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uiMode, setUiMode] = useState("dark");
  const renderIdRef = useRef(0);

  // Watch for light/dark mode changes so diagram re-renders with correct palette
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const mode = document.documentElement.classList.contains("dark") ? "dark" : "light";
      setUiMode(mode);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    setUiMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const currentRender = ++renderIdRef.current;

    setLoading(true);
    setError(null);

    renderMermaid(content, theme)
      .then((svg) => {
        if (currentRender !== renderIdRef.current) return;
        if (!containerRef.current || !wrapperRef.current) return;

        containerRef.current.innerHTML = svg;
        const svgEl = containerRef.current.querySelector("svg");
        if (!svgEl) return;

        svgEl.removeAttribute("style");

        // Read the natural viewBox dimensions
        const vb = svgEl.getAttribute("viewBox");
        if (vb) {
          const parts = vb.split(/[\s,]+/).map(Number);
          const svgW = parts[2];
          const svgH = parts[3];
          const wrapW = wrapperRef.current!.clientWidth;
          const wrapH = wrapperRef.current!.clientHeight;

          // Fit the SVG to fill ~85% of the container
          const scaleX = (wrapW * 0.85) / svgW;
          const scaleY = (wrapH * 0.85) / svgH;
          const fitScale = Math.min(scaleX, scaleY, 3);

          const displayW = Math.round(svgW * fitScale);
          const displayH = Math.round(svgH * fitScale);

          svgEl.setAttribute("width", String(displayW));
          svgEl.setAttribute("height", String(displayH));
        }

        setLoading(false);

        // Center after a brief delay to let the DOM update
        requestAnimationFrame(() => {
          transformRef.current?.centerView(1, 0);
        });
      })
      .catch((e) => {
        if (currentRender !== renderIdRef.current) return;
        setError(e instanceof Error ? e.message : "Failed to render diagram");
        setLoading(false);
      });
  }, [content, theme, uiMode]);

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full p-8">
        <div className="p-6 rounded-xl max-w-lg" role="alert" style={{ background: "color-mix(in oklch, var(--bg-surface) 90%, red)", border: "1px solid color-mix(in oklch, var(--border) 70%, red)", color: "var(--text-primary)" }}>
          <p className="font-semibold mb-2">Render Error</p>
          <pre className="text-sm whitespace-pre-wrap font-mono" style={{ color: "var(--text-secondary)" }}>{error}</pre>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full h-full" style={{ background: "var(--bg-canvas)" }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10" role="status" aria-label="Loading diagram">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ background: "var(--text-muted)" }} />
            <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ background: "var(--text-muted)" }} />
            <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--text-muted)" }} />
          </div>
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
            className={`transition-opacity duration-300 ${loading ? "opacity-0" : "opacity-100"}`}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
