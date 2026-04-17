"use client";

import { RENDERERS, type DiagramRenderer } from "@/lib/mermaid-client";

export function RendererPicker(props: {
  current: DiagramRenderer;
  onSelectRenderer: (renderer: DiagramRenderer) => void;
}) {
  const { current, onSelectRenderer } = props;

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
      {RENDERERS.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelectRenderer(r.id)}
          aria-label={r.label}
          aria-pressed={current === r.id}
          className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] font-medium cursor-pointer transition-all duration-150 active:scale-[0.97] ${
            current === r.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
