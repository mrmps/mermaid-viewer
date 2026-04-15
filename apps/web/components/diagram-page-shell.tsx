"use client";

import { useCallback, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MermaidRenderer } from "@/components/mermaid-renderer";
import { VersionPanel } from "@/components/version-panel";
import { ThemePicker } from "@/components/theme-picker";
import { ExcalidrawButton } from "@/components/excalidraw-button";
import { CopyImageButton } from "@/components/copy-image-button";
import { DeleteDiagramButton } from "@/components/delete-diagram-button";
import { ShareButton } from "@/components/share-modal";
import { HistoryTracker } from "@/components/history-tracker";
import { ModeToggle } from "@/components/mode-toggle";
import { SourcePanel, SourceToggle } from "@/components/source-panel";
import { ChatPanel, ChatToggle } from "@/components/chat-panel";
import { LookPicker } from "@/components/look-picker";
import {
  LOOKS,
  THEMES,
  type MermaidLook,
  type MermaidTheme,
} from "@/lib/mermaid-client";

type DiagramVersion = {
  version: number;
  content: string;
  createdAt: string;
};

type DiagramPageShellProps = {
  diagramId: string;
  title: string;
  versions: DiagramVersion[];
  initialTheme: MermaidTheme;
  initialLook: MermaidLook;
  editId?: string;
};

const THEME_IDS = new Set(THEMES.map((theme) => theme.id));
const LOOK_IDS = new Set(LOOKS.map((look) => look.id));

export function DiagramPageShell({
  diagramId,
  title,
  versions,
  initialTheme,
  initialLook,
  editId,
}: DiagramPageShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const versionsByNumber = useMemo(
    () => new Map(versions.map((version) => [version.version, version])),
    [versions]
  );

  const latestVersion = versions[versions.length - 1];
  const theme = getTheme(searchParams.get("theme"), initialTheme);
  const look = getLook(searchParams.get("look"), initialLook);
  const selectedVersion = getVersion(
    searchParams.get("v"),
    versionsByNumber,
    latestVersion
  );

  const updateSearch = useCallback(
    (
      key: string,
      value: string | null,
      mode: "push" | "replace" = "push"
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }

      const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;

      if (mode === "replace") {
        window.history.replaceState(null, "", next);
      } else {
        window.history.pushState(null, "", next);
      }
    },
    [pathname, searchParams]
  );

  const [currentTitle, setCurrentTitle] = useState(title);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const saveTitle = useCallback(
    async (newTitle: string) => {
      const trimmed = newTitle.trim() || "Untitled";
      setCurrentTitle(trimmed);
      setIsEditing(false);
      if (trimmed === title) return;
      await fetch(`/api/d/${diagramId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed, editId }),
      });
    },
    [diagramId, editId, title]
  );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <HistoryTracker id={diagramId} title={currentTitle} />

      <header className="flex items-center justify-between gap-2 px-3 md:px-4 h-12 shrink-0 backdrop-blur-md border-b border-border bg-background">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Link
            href="/"
            className="text-xs font-bold transition-colors shrink-0 text-muted-foreground"
          >
            merm.sh
          </Link>
          <span className="text-muted-foreground/50">/</span>
          {isEditing ? (
            <input
              ref={inputRef}
              defaultValue={currentTitle === "Untitled" ? "" : currentTitle}
              placeholder="Diagram name…"
              className="text-sm font-semibold bg-transparent border-b border-foreground/20 outline-none min-w-0 max-w-[200px] focus:border-foreground/50 placeholder:text-muted-foreground/50 placeholder:italic"
              autoFocus
              onBlur={(e) => saveTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle(e.currentTarget.value);
                if (e.key === "Escape") {
                  e.currentTarget.value = currentTitle;
                  setIsEditing(false);
                }
              }}
            />
          ) : (
            <h1
              className={`text-sm truncate ${
                editId
                  ? "font-semibold cursor-text rounded px-1.5 -mx-1.5 py-0.5 -my-0.5 hover:bg-muted transition-colors group/title"
                  : "font-semibold"
              } ${currentTitle === "Untitled" && editId ? "text-muted-foreground italic" : ""}`}
              onClick={editId ? () => setIsEditing(true) : undefined}
            >
              {currentTitle === "Untitled" && editId ? "Click to name…" : currentTitle}
              {editId && (
                <svg
                  className="inline-block ml-1.5 w-3 h-3 opacity-0 group-hover/title:opacity-50 transition-opacity shrink-0"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L3.463 11.098a.25.25 0 00-.064.108l-.631 2.208 2.208-.63a.25.25 0 00.108-.064l8.61-8.61a.25.25 0 000-.354l-1.086-1.086z" />
                </svg>
              )}
            </h1>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 text-secondary-foreground bg-secondary tabular-nums">
            v{selectedVersion.version}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2">
            <LookPicker
              current={look}
              onSelectLook={(nextLook) =>
                updateSearch(
                  "look",
                  nextLook === "classic" ? null : nextLook,
                  "replace"
                )
              }
            />
            <div className="w-px h-5 bg-border" />
            <ThemePicker
              current={theme}
              onSelectTheme={(nextTheme) =>
                updateSearch(
                  "theme",
                  nextTheme === "auto" ? null : nextTheme,
                  "replace"
                )
              }
            />
            <div className="w-px h-5 bg-border" />
          </div>
          <ModeToggle />
          <div className="hidden md:flex items-center gap-2">
            <div className="w-px h-5 bg-border" />
            <SourceToggle />
          </div>
          {editId ? <ChatToggle /> : null}
          <div className="hidden md:flex items-center gap-2">
            <CopyImageButton content={selectedVersion.content} theme={theme} look={look} />
            <ExcalidrawButton content={selectedVersion.content} />
          </div>
          <ShareButton
            diagramId={diagramId}
            editId={editId}
            title={currentTitle}
          />
          {editId ? (
            <div className="hidden md:flex">
              <DeleteDiagramButton
                diagramId={diagramId}
                editId={editId}
                title={currentTitle}
              />
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <VersionPanel
          versions={versions}
          currentVersion={selectedVersion.version}
          diagramId={diagramId}
          theme={theme}
          look={look}
          onSelectVersion={(version) =>
            updateSearch(
              "v",
              version === latestVersion.version ? null : String(version)
            )
          }
        />

        <main className="flex-1 min-w-0 overflow-hidden">
          <MermaidRenderer
            content={selectedVersion.content}
            theme={theme}
            look={look}
          />
        </main>

        <SourcePanel
          key={selectedVersion.version}
          content={selectedVersion.content}
          diagramId={diagramId}
          editId={editId}
        />

        {editId ? (
          <ChatPanel
            content={selectedVersion.content}
            diagramId={diagramId}
            editId={editId}
          />
        ) : null}
      </div>
    </div>
  );
}

function getTheme(
  value: string | null,
  fallback: MermaidTheme
): MermaidTheme {
  if (value && THEME_IDS.has(value as MermaidTheme)) {
    return value as MermaidTheme;
  }

  return fallback;
}

function getLook(
  value: string | null,
  fallback: MermaidLook
): MermaidLook {
  if (value && LOOK_IDS.has(value as MermaidLook)) {
    return value as MermaidLook;
  }

  return fallback;
}

function getVersion(
  value: string | null,
  versionsByNumber: Map<number, DiagramVersion>,
  fallback: DiagramVersion
) {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;

  return versionsByNumber.get(parsed) ?? fallback;
}
