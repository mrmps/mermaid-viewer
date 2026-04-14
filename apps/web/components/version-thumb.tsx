"use client";

import { useEffect, useRef } from "react";
import { renderMermaid, type MermaidTheme, type MermaidLook } from "@/lib/mermaid-client";

export function VersionThumb({
  content,
  id,
  theme,
  look = "classic",
}: {
  content: string;
  id: string;
  theme: MermaidTheme;
  look?: MermaidLook;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);

  useEffect(() => {
    const currentRender = ++renderIdRef.current;

    renderMermaid(content, theme, look)
      .then((svg) => {
        if (currentRender !== renderIdRef.current) return;
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.removeAttribute("style");
            svgEl.style.width = "100%";
            svgEl.style.height = "100%";
          }
        }
      })
      .catch(() => {
        if (currentRender !== renderIdRef.current) return;
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<div class="flex items-center justify-center h-full text-red-400/70 text-[10px] font-medium">Parse error</div>';
        }
      });
  }, [content, id, theme, look]);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-[16/10] rounded-lg overflow-hidden flex items-center justify-center bg-background"
    >
      <div className="w-3 h-3 rounded-full animate-spin border-2 border-border border-t-muted-foreground" role="status" aria-label="Loading preview" />
    </div>
  );
}
