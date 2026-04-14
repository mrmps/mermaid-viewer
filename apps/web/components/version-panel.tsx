"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { VersionThumb } from "./version-thumb";
import type { MermaidTheme } from "@/lib/mermaid-client";

type Version = {
  version: number;
  content: string;
  createdAt: string;
};

export function VersionPanel({
  versions,
  currentVersion,
  diagramId,
  theme,
}: {
  versions: Version[];
  currentVersion: number;
  diagramId: string;
  theme: MermaidTheme;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectVersion(v: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("v", String(v));
    router.push(`/d/${diagramId}?${params.toString()}`);
  }

  return (
    <div className="w-52 shrink-0 flex flex-col overflow-y-auto" style={{ background: "var(--bg-app)", borderRight: "1px solid var(--border)" }}>
      <div className="sticky top-0 z-10 px-3 py-2.5" style={{ background: "var(--bg-app)", borderBottom: "1px solid var(--border-subtle)" }}>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Versions
        </span>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {[...versions].reverse().map((v) => {
          const active = v.version === currentVersion;
          return (
            <button
              key={v.version}
              onClick={() => selectVersion(v.version)}
              className="group text-left rounded-xl overflow-hidden transition-all cursor-pointer"
              style={{
                background: active ? "var(--accent-soft)" : "var(--bg-surface)",
                boxShadow: active ? "0 0 0 2px var(--accent)" : `0 0 0 1px var(--border-subtle)`,
              }}
            >
              <div className="p-1.5">
                <VersionThumb content={v.content} id={`${diagramId}-${v.version}`} theme={theme} />
              </div>
              <div className="px-2.5 pb-2 flex items-center justify-between">
                <span
                  className="text-xs font-medium"
                  style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }}
                >
                  v{v.version}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {formatRelative(v.createdAt)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
