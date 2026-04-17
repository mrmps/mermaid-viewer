"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { renderBeautiful, renderMermaid } from "@/lib/mermaid-client";
import { formatRelative } from "@/lib/utils";
import type { DiagramEntry } from "./diagrams-list";

type RenderStatus = "idle" | "loading" | "ready" | "error";

export function DiagramCard({ entry }: { entry: DiagramEntry }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLAnchorElement>(null);
  const [visible, setVisible] = useState(false);
  const [renderState, setRenderState] = useState<{
    key: string;
    status: RenderStatus;
  }>({
    key: "",
    status: "idle",
  });
  const renderIdRef = useRef(0);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;

    const currentRender = ++renderIdRef.current;

    renderBeautiful(entry.content)
      .catch(() => renderMermaid(entry.content, "auto"))
      .then((svg) => {
        if (currentRender !== renderIdRef.current) return;
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.style.width = "100%";
            svgEl.style.height = "100%";
            svgEl.style.objectFit = "contain";
          }
        }
        setRenderState({ key: entry.content, status: "ready" });
      })
      .catch(() => {
        if (currentRender !== renderIdRef.current) return;
        if (containerRef.current) containerRef.current.innerHTML = "";
        setRenderState({ key: entry.content, status: "error" });
      });
  }, [visible, entry.content]);

  const status =
    !visible
      ? "idle"
      : renderState.key === entry.content
        ? renderState.status
        : "loading";
  const loading = status === "idle" || status === "loading";
  const error = status === "error";

  return (
    <Link
      ref={sentinelRef}
      href={entry.href}
      className="group flex items-center justify-center overflow-hidden rounded-2xl p-1 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)] dark:hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] transition-shadow duration-150"
    >
      <div className="flex flex-col w-full rounded-xl border border-border/60 bg-white dark:bg-[hsl(0_0%_1.2%)] overflow-hidden">
        {/* Preview area */}
        <div className="relative flex items-center justify-center h-40 overflow-hidden bg-muted/30">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full animate-spin border-2 border-border border-t-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Parse error</span>
            </div>
          )}
          <div
            ref={containerRef}
            className={`w-full h-full flex items-center justify-center overflow-hidden transition-opacity duration-150 ${loading ? "opacity-0" : "opacity-100"}`}
          />
        </div>

        {/* Footer */}
        <div className="flex flex-col justify-center px-4 pb-4 pt-0">
          <span className="flex items-center justify-between gap-1">
            <span className="text-sm font-medium text-foreground truncate flex-1">
              {entry.title}
            </span>
            <span className="text-muted-foreground/0 group-hover:text-muted-foreground shrink-0 transition-colors duration-150">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8.793 5.293a1 1 0 0 1 1.414 0l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 0 1-1.414-1.414L14.086 12 8.793 6.707a1 1 0 0 1 0-1.414Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </span>
          <span
            className="text-sm text-muted-foreground truncate"
            suppressHydrationWarning
          >
            {diagramType(entry.content)} &middot; {formatRelative(entry.timestamp)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function diagramType(content: string): string {
  const first = content.trimStart().split(/[\s{(\[]/)[0].toLowerCase();
  const types: Record<string, string> = {
    graph: "Flowchart",
    flowchart: "Flowchart",
    sequencediagram: "Sequence",
    sequence: "Sequence",
    classDiagram: "Class",
    classdiagram: "Class",
    statediagram: "State",
    erdiagram: "ER Diagram",
    gantt: "Gantt",
    pie: "Pie Chart",
    mindmap: "Mind Map",
    timeline: "Timeline",
    gitgraph: "Git Graph",
    journey: "User Journey",
    quadrantchart: "Quadrant",
    requirementdiagram: "Requirement",
    c4context: "C4 Context",
    sankey: "Sankey",
    block: "Block",
    xychart: "XY Chart",
  };
  return types[first] ?? "Diagram";
}

