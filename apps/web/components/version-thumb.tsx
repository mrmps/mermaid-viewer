"use client";

import { useEffect, useRef } from "react";
import { renderMermaid, type MermaidTheme } from "@/lib/mermaid-client";

export function VersionThumb({
  content,
  id,
  theme,
}: {
  content: string;
  id: string;
  theme: MermaidTheme;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);

  useEffect(() => {
    const currentRender = ++renderIdRef.current;

    renderMermaid(content, theme)
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
  }, [content, id, theme]);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-[16/10] rounded-lg overflow-hidden flex items-center justify-center"
      style={{ background: "var(--bg-inset)" }}
    >
      <div className="w-3 h-3 rounded-full animate-spin" role="status" aria-label="Loading preview" style={{ border: "2px solid var(--border)", borderTopColor: "var(--text-muted)" }} />
    </div>
  );
}
