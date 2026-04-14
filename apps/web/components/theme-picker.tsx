"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { THEMES, type MermaidTheme } from "@/lib/mermaid-client";

export function ThemePicker({
  current,
  diagramId,
}: {
  current: MermaidTheme;
  diagramId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectTheme(theme: MermaidTheme) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("theme", theme);
    router.push(`/d/${diagramId}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => selectTheme(t.id)}
          aria-label={t.label}
          aria-pressed={current === t.id}
          className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
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
