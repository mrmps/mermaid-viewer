"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  renderMermaid,
  renderBeautifulSync,
  loadBeautifulMermaid,
  type MermaidTheme,
  type MermaidLook,
  type DiagramRenderer,
  type BeautifulTheme,
} from "@/lib/mermaid-client";

export function VersionThumb({
  content,
  id,
  renderer = "beautiful",
  theme,
  look = "classic",
}: {
  content: string;
  id: string;
  renderer?: DiagramRenderer;
  theme: string;
  look?: MermaidLook;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);
  const [bmReady, setBmReady] = useState(false);

  useEffect(() => {
    loadBeautifulMermaid().then(() => setBmReady(true));
  }, []);

  // Sync beautiful-mermaid render via useMemo
  const beautifulSvg = useMemo(() => {
    if (renderer !== "beautiful" || !bmReady) return null;
    try {
      return renderBeautifulSync(content, theme as BeautifulTheme);
    } catch {
      return null;
    }
  }, [renderer, bmReady, content, theme]);

  // Inject beautiful SVG
  useLayoutEffect(() => {
    if (!beautifulSvg || !containerRef.current) return;
    containerRef.current.innerHTML = beautifulSvg;
    const svgEl = containerRef.current.querySelector("svg");
    if (svgEl) {
      svgEl.style.width = "100%";
      svgEl.style.height = "100%";
    }
  }, [beautifulSvg]);

  // Classic fallback (async) — for classic renderer or unsupported diagram types
  const needsClassic =
    renderer === "mermaid" ||
    (renderer === "beautiful" && bmReady && !beautifulSvg);

  useEffect(() => {
    if (!needsClassic) return;
    const currentRender = ++renderIdRef.current;
    const classicTheme = renderer === "mermaid" ? (theme as MermaidTheme) : "auto";

    renderMermaid(content, classicTheme, look)
      .then((svg) => {
        if (currentRender !== renderIdRef.current) return;
        if (!containerRef.current) return;
        containerRef.current.innerHTML = svg;
        const svgEl = containerRef.current.querySelector("svg");
        if (svgEl) {
          svgEl.removeAttribute("style");
          svgEl.style.width = "100%";
          svgEl.style.height = "100%";
        }
      })
      .catch(() => {
        if (currentRender !== renderIdRef.current) return;
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<div class="flex items-center justify-center h-full text-red-400/70 text-[10px] font-medium">Parse error</div>';
        }
      });
  }, [needsClassic, renderer, content, id, theme, look]);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-[16/10] rounded-lg overflow-hidden flex items-center justify-center bg-background"
    >
      <div className="w-3 h-3 rounded-full animate-spin border-2 border-border border-t-muted-foreground" role="status" aria-label="Loading preview" />
    </div>
  );
}
