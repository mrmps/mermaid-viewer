"use client";

import { LOOKS, type MermaidLook } from "@/lib/mermaid-client";

const icons: Record<MermaidLook, React.ReactNode> = {
  classic: (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  handDrawn: (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
      <path d="M3 3c1.5-.3 8.5-.5 10 .5s.8 8.5-.2 9.5-8.5.8-9.5-.2-.8-8-.3-9.8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5.5 8.2c1.5-1 3.5-.8 5 .1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  neo: (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
      <rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

export function LookPicker(props: {
  current: MermaidLook;
  onSelectLook: (look: MermaidLook) => void;
}) {
  const { current, onSelectLook } = props;

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-muted/60 p-0.5">
      {LOOKS.map((l) => (
        <button
          key={l.id}
          onClick={() => onSelectLook(l.id)}
          aria-label={l.label}
          aria-pressed={current === l.id}
          title={l.label}
          className={`flex h-7 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[calc(var(--radius-md)-0.125rem)] px-2 text-xs font-medium active:scale-[0.97] min-[360px]:px-2.5 ${
            current === l.id
              ? "bg-background text-foreground ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {icons[l.id]}
          <span className="hidden min-[360px]:inline">{l.label}</span>
        </button>
      ))}
    </div>
  );
}
