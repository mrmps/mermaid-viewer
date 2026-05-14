"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "@/components/icons/mingcute";
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
      className="linear-item-card group flex min-h-0 flex-col overflow-hidden rounded-lg border"
    >
      <div className="linear-preview-surface relative flex h-40 items-center justify-center overflow-hidden border-b">
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-4 animate-spin rounded-full border-2 border-border border-t-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">
              Parse error
            </span>
          </div>
        )}
        <div
          ref={containerRef}
          className={`flex size-full items-center justify-center overflow-hidden transition-opacity duration-150 ${loading ? "opacity-0" : "opacity-100"}`}
        />
      </div>

      <div className="flex min-h-[4.5rem] flex-col justify-between gap-2 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {entry.title}
          </span>
          <span className="shrink-0 text-muted-foreground/0 transition-colors duration-150 group-hover:text-muted-foreground">
            <ChevronRight className="size-4" />
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="linear-item-chip inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[0.7rem] font-medium">
            {diagramType(entry.content)}
          </span>
          <span
            className="min-w-0 truncate text-xs tabular-nums text-muted-foreground"
            suppressHydrationWarning
          >
            {formatRelative(entry.timestamp)}
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
