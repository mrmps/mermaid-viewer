"use client";

import {
  THEMES,
  BEAUTIFUL_THEMES,
  type DiagramRenderer,
} from "@/lib/mermaid-client";

export function ThemePicker(props: {
  renderer: DiagramRenderer;
  current: string;
  onSelectTheme: (theme: string) => void;
}) {
  const { renderer, current, onSelectTheme } = props;

  const themes =
    renderer === "beautiful"
      ? BEAUTIFUL_THEMES
      : THEMES;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelectTheme(t.id)}
          aria-label={t.label}
          aria-pressed={current === t.id}
          className={`size-6 shrink-0 cursor-pointer rounded-full border border-background ring-1 active:scale-[0.96] sm:size-7 ${
            current === t.id
              ? "scale-105 ring-foreground"
              : "ring-border hover:ring-foreground/40"
          }`}
          style={{ backgroundColor: t.dot }}
        />
      ))}
    </div>
  );
}
