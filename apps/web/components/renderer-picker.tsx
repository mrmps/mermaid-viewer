"use client";

import { RENDERERS, type DiagramRenderer } from "@/lib/mermaid-client";

export function RendererPicker(props: {
  current: DiagramRenderer;
  onSelectRenderer: (renderer: DiagramRenderer) => void;
}) {
  const { current, onSelectRenderer } = props;

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-muted/60 p-0.5">
      {RENDERERS.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelectRenderer(r.id)}
          aria-label={r.label}
          aria-pressed={current === r.id}
          className={`flex h-7 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[calc(var(--radius-md)-0.125rem)] px-2 text-xs font-medium active:scale-[0.97] min-[340px]:px-2.5 ${
            current === r.id
              ? "bg-background text-foreground ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="hidden min-[340px]:inline">{r.label}</span>
          <span className="min-[340px]:hidden">{r.label.slice(0, 1)}</span>
        </button>
      ))}
    </div>
  );
}
