"use client";

import { THEMES, type MermaidTheme } from "@/lib/mermaid-client";

export function ThemePicker(props: {
  current: MermaidTheme;
  onSelectTheme: (theme: MermaidTheme) => void;
}) {
  const { current, onSelectTheme } = props;

  return (
    <div className="flex items-center gap-1">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelectTheme(t.id)}
          aria-label={t.label}
          aria-pressed={current === t.id}
          className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-[border-color,transform] duration-150 active:scale-[0.96] ${
            current === t.id
              ? "border-white scale-110"
              : "border-neutral-600 hover:border-neutral-400 hover:scale-105"
          }`}
          style={{ backgroundColor: t.dot }}
        />
      ))}
    </div>
  );
}
