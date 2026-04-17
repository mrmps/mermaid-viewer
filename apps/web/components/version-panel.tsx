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
    <div className="hidden md:flex w-52 shrink-0 flex-col overflow-y-auto bg-background border-r border-border">
      <div className="sticky top-0 z-10 px-3 py-2.5 bg-background border-b border-border/50">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Versions
        </span>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {[...versions].reverse().map((v) => {
          const active = v.version === currentVersion;
          return (
            <button
              key={v.version}
              onClick={() => onSelectVersion(v.version)}
              className={`group text-left rounded-xl overflow-hidden transition-[background-color,box-shadow] duration-150 cursor-pointer ${active ? "bg-accent ring-2 ring-accent" : "bg-secondary ring-1 ring-border/50"}`}
            >
              <div className="p-1.5">
                <VersionThumb content={v.content} id={`${diagramId}-${v.version}`} renderer={renderer} theme={theme} look={look} />
              </div>
              <div className="px-2.5 pb-2 flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${active ? "text-primary" : "text-secondary-foreground"}`}
                >
                  v{v.version}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
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

