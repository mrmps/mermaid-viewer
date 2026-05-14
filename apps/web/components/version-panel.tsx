"use client";

import { VersionThumb } from "./version-thumb";
import { formatRelative } from "@/lib/utils";
import type { MermaidLook, DiagramRenderer } from "@/lib/mermaid-client";

type Version = {
  version: number;
  content: string;
  createdAt: string;
};

export function VersionPanel(props: {
  versions: Version[];
  currentVersion: number;
  diagramId: string;
  renderer?: DiagramRenderer;
  theme: string;
  look?: MermaidLook;
  onSelectVersion: (version: number) => void;
}) {
  const {
    versions,
    currentVersion,
    diagramId,
    renderer = "beautiful",
    theme,
    look = "classic",
    onSelectVersion,
  } = props;

  return (
    <div className="hidden w-56 shrink-0 flex-col overflow-y-auto border-r border-border bg-background md:flex">
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
          Versions
        </span>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {[...versions].reverse().map((v) => {
          const active = v.version === currentVersion;
          return (
            <button
              className={`linear-item-card group overflow-hidden rounded-lg border text-left ${
                active ? "linear-item-row-active" : ""
              }`}
              key={v.version}
              onClick={() => onSelectVersion(v.version)}
              type="button"
            >
              <div className="p-1.5 pb-0">
                <VersionThumb
                  content={v.content}
                  id={`${diagramId}-${v.version}`}
                  look={look}
                  renderer={renderer}
                  theme={theme}
                />
              </div>
              <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                <span
                  className={`text-xs font-semibold ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  v{v.version}
                </span>
                <span className="truncate text-[10px] tabular-nums text-muted-foreground">
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
