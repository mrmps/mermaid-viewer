"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Check,
  Bot,
  ChevronsLeft,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  FlaskConical,
  HelpCircle,
  Home,
  Maximize2,
  Menu,
  MessageSquare,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Redo2,
  RefreshCcw,
  Save,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { BoardShareButton } from "@/components/board-share-button";
import { DiagramChatPanel } from "@/components/chat-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useHistoryEntries } from "@/components/history-tracker";
import { CopyImageButton } from "@/components/copy-image-button";
import { ExcalidrawButton } from "@/components/excalidraw-button";
import { LookPicker } from "@/components/look-picker";
import { MermaidPreview } from "@/components/mermaid-preview";
import { ModeToggle } from "@/components/mode-toggle";
import { RendererPicker } from "@/components/renderer-picker";
import { ThemePicker } from "@/components/theme-picker";
import { useMediaQuery } from "@/lib/use-media-query";
import {
  addBoardPage,
  addDiagramToBoardDocument,
  deleteBoardPage,
  getActiveBoardPage,
  normalizeBoardDocument,
  removeBoardItem,
  selectBoardPage,
  updateBoardItem,
  type BoardDocument,
  type BoardItem,
  type BoardLook,
  type BoardPage,
  type BoardRenderer,
} from "@/lib/board-state";

type Interaction =
  | {
      type: "pan";
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
    }
  | {
      type: "pending-drag";
      itemId: string;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
    }
  | {
      type: "drag";
      itemId: string;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
    }
  | {
      type: "resize";
      itemId: string;
      corner: "nw" | "ne" | "sw" | "se";
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      startWidth: number;
      startHeight: number;
    };

type ApiDiagram = {
  id: string;
  title: string;
  content: string;
  version?: number;
};

type ReactGrabWindow = Window & {
  __REACT_GRAB__?: {
    deactivate?: () => void;
    setEnabled?: (enabled: boolean) => void;
  };
  __REACT_GRAB_DISABLED__?: boolean;
};

type BoardWorkspaceProps = {
  initialBoard: BoardDocument;
  boardId?: string;
  editId?: string;
  title?: string;
  readOnly?: boolean;
};

const MIN_ITEM_WIDTH = 320;
const MIN_ITEM_HEIGHT = 260;
const MAX_ITEM_WIDTH = 1400;
const MAX_ITEM_HEIGHT = 1200;
const MAX_UNDO_STEPS = 50;
const DRAG_START_DISTANCE = 4;
const DEFAULT_DIAGRAM_SOURCE =
  "flowchart TD\n  Start[Start] --> Next[Next step]";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseDiagramId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/(?:d|api\/d)\/([^/?#]+)/);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // Plain IDs are expected here.
  }

  return trimmed.replace(/^\/?d\//, "").split(/[?#]/)[0];
}

function parseEditIdFromHref(value: string | undefined) {
  if (!value) return null;
  const read = (pathname: string) => {
    const [, route, editId] = pathname.split("/");
    return route === "e" && editId ? decodeURIComponent(editId) : null;
  };

  try {
    const url = new URL(value, "http://merm.local");
    return read(url.pathname);
  } catch {
    return read(value.split(/[?#]/, 1)[0]);
  }
}

function getDiagramEditId(item: BoardItem | null | undefined) {
  return item?.diagramEditId ?? parseEditIdFromHref(item?.editHref);
}

function BoardBetaBadge() {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-md border border-foreground/10 bg-foreground/[0.035] px-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.02em] text-muted-foreground">
      <FlaskConical className="size-3" />
      Beta
    </span>
  );
}

function pageBounds(page: BoardPage) {
  if (page.items.length === 0) return null;

  const minX = Math.min(...page.items.map((item) => item.x));
  const minY = Math.min(...page.items.map((item) => item.y));
  const maxX = Math.max(...page.items.map((item) => item.x + item.width));
  const maxY = Math.max(...page.items.map((item) => item.y + item.height));

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function serializeBoardState(board: BoardDocument) {
  return {
    version: 1 as const,
    activePageId: board.activePageId,
    pages: board.pages.map((page) => ({
      id: page.id,
      name: page.name,
      items: page.items.map((item) => ({
        id: item.id,
        kind: "diagram" as const,
        diagramId: item.diagramId,
        diagramEditId: item.diagramEditId,
        title: item.title,
        content: item.content,
        href: item.href,
        editHref: item.editHref,
        version: item.version,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        renderer: item.renderer,
        theme: item.theme,
        look: item.look,
        updatedAt: item.updatedAt,
      })),
    })),
  };
}

export function BoardWorkspace({
  initialBoard,
  boardId,
  editId,
  title = "board",
  readOnly = false,
}: BoardWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const historyEntries = useHistoryEntries();
  const viewportRef = useRef<HTMLDivElement>(null);
  const fittedPageRef = useRef<string | null>(null);
  const addParamRef = useRef<string | null>(null);
  const focusParamRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSelectedPageRef = useRef<string | null>(null);
  const [board, setBoard] = useState<BoardDocument>(initialBoard);
  const [boardTitle, setBoardTitle] = useState(title);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    () => getActiveBoardPage(initialBoard)?.items[0]?.id ?? null
  );
  const [toolPanel, setToolPanel] = useState<"source" | "chat" | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAddingDiagram, setIsAddingDiagram] = useState(false);
  const [refreshingItemId, setRefreshingItemId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [undoStack, setUndoStack] = useState<BoardDocument[]>([]);
  const [redoStack, setRedoStack] = useState<BoardDocument[]>([]);
  const [view, setView] = useState({ x: 72, y: 72, scale: 0.9 });
  const canEdit = !readOnly;
  const workspaceInitial = (boardTitle.trim()[0] ?? "M").toUpperCase();

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousWorkspaceFlag = root.dataset.boardWorkspace;
    const previousRootOverflow = root.style.overflow;
    const previousRootOverscrollBehavior = root.style.overscrollBehavior;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const grabWindow = window as ReactGrabWindow;
    const previousDisabled = grabWindow.__REACT_GRAB_DISABLED__;

    root.dataset.boardWorkspace = "true";
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    grabWindow.__REACT_GRAB_DISABLED__ = true;
    grabWindow.__REACT_GRAB__?.deactivate?.();
    grabWindow.__REACT_GRAB__?.setEnabled?.(false);

    return () => {
      if (previousWorkspaceFlag === undefined) {
        delete root.dataset.boardWorkspace;
      } else {
        root.dataset.boardWorkspace = previousWorkspaceFlag;
      }
      root.style.overflow = previousRootOverflow;
      root.style.overscrollBehavior = previousRootOverscrollBehavior;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;

      if (previousDisabled === undefined) {
        delete grabWindow.__REACT_GRAB_DISABLED__;
      } else {
        grabWindow.__REACT_GRAB_DISABLED__ = previousDisabled;
      }

      if (!previousDisabled) {
        grabWindow.__REACT_GRAB__?.setEnabled?.(true);
      }
    };
  }, []);

  useEffect(() => {
    setBoard(initialBoard);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedItemId(getActiveBoardPage(initialBoard)?.items[0]?.id ?? null);
    fittedPageRef.current = null;
    autoSelectedPageRef.current = null;
  }, [initialBoard]);

  useEffect(() => {
    setBoardTitle(title);
    setIsTitleEditing(false);
  }, [title]);

  const activePage = useMemo(
    () => (board ? getActiveBoardPage(board) : null),
    [board]
  );
  const selectedItem = useMemo(
    () =>
      activePage?.items.find((item) => item.id === selectedItemId) ?? null,
    [activePage, selectedItemId]
  );
  const selectedDiagramEditId = useMemo(
    () => getDiagramEditId(selectedItem),
    [selectedItem]
  );
  const sidebarQuery = sidebarSearch.trim().toLowerCase();
  const sidebarPages = useMemo(
    () =>
      sidebarQuery
        ? board.pages.filter((page) =>
            page.name.toLowerCase().includes(sidebarQuery)
          )
        : board.pages,
    [board.pages, sidebarQuery]
  );
  const sidebarItems = useMemo(
    () =>
      sidebarQuery
        ? (activePage?.items ?? []).filter((item) =>
            item.title.toLowerCase().includes(sidebarQuery)
          )
        : activePage?.items ?? [],
    [activePage, sidebarQuery]
  );
  const sidebarHistoryEntries = useMemo(
    () =>
      historyEntries
        .filter((entry) =>
          sidebarQuery
            ? entry.title.toLowerCase().includes(sidebarQuery)
            : true
        )
        .slice(0, 12),
    [historyEntries, sidebarQuery]
  );

  useEffect(() => {
    if (!activePage || autoSelectedPageRef.current === activePage.id) return;
    autoSelectedPageRef.current = activePage.id;
    setSelectedItemId(activePage.items[0]?.id ?? null);
  }, [activePage]);

  useEffect(() => {
    if (!selectedItem) setToolPanel(null);
  }, [selectedItem]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    if (media.matches) setSidebarOpen(false);

    const closeSidebarOnCompact = (event: MediaQueryListEvent) => {
      if (event.matches) setSidebarOpen(false);
    };

    media.addEventListener("change", closeSidebarOnCompact);
    return () => media.removeEventListener("change", closeSidebarOnCompact);
  }, []);

  function isCompactViewport() {
    return window.matchMedia("(max-width: 767px)").matches;
  }

  function showItemSettings(itemId: string) {
    setSelectedItemId(itemId);
    if (isCompactViewport()) setSidebarOpen(false);
  }

  function toggleToolPanel(panel: "source" | "chat") {
    if (toolPanel !== panel && isCompactViewport()) setSidebarOpen(false);
    setToolPanel((current) => (current === panel ? null : panel));
  }

  function toggleSidebar() {
    const nextSidebarOpen = !sidebarOpen;
    if (nextSidebarOpen && isCompactViewport()) setToolPanel(null);
    setSidebarOpen(nextSidebarOpen);
  }

  const scheduleRemoteSave = useCallback(
    (next: BoardDocument) => {
      if (!boardId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      setSaveState("saving");
      saveTimerRef.current = setTimeout(() => {
        void fetch(`/api/b/${encodeURIComponent(boardId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            editId,
            state: serializeBoardState(next),
          }),
        })
          .then((response) => {
            setSaveState(response.ok ? "saved" : "error");
          })
          .catch(() => setSaveState("error"));
      }, 250);
    },
    [boardId, editId]
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    []
  );

  const persistBoard = useCallback(
    (next: BoardDocument) => {
      if (readOnly) return;
      if (boardId) {
        scheduleRemoteSave(next);
      } else {
        setSaveState("error");
      }
    },
    [boardId, readOnly, scheduleRemoteSave]
  );

  const saveBoardTitle = useCallback(
    async (value: string) => {
      const nextTitle = value.trim() || "Untitled workspace";
      const previousTitle = boardTitle;
      setBoardTitle(nextTitle);
      setIsTitleEditing(false);

      if (readOnly || !boardId) return;
      if (nextTitle === previousTitle) return;

      setSaveState("saving");
      try {
        const response = await fetch(`/api/b/${encodeURIComponent(boardId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ editId, title: nextTitle }),
        });
        setSaveState(response.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    },
    [boardId, boardTitle, editId, readOnly]
  );

  const commitBoard = useCallback(
    (
      updater: (current: BoardDocument) => BoardDocument,
      options: { recordHistory?: boolean } = {}
    ) => {
      setBoard((current) => {
        const next = updater(current);
        if (next === current) return current;

        if (!readOnly && options.recordHistory !== false) {
          setUndoStack((stack) => [
            ...stack.slice(-(MAX_UNDO_STEPS - 1)),
            current,
          ]);
          setRedoStack([]);
        }

        persistBoard(next);
        return next;
      });
    },
    [persistBoard, readOnly]
  );

  const acceptRemoteBoard = useCallback(
    (
      rawState: unknown,
      options: { itemId?: string | null; recordHistory?: boolean } = {}
    ) => {
      const next = normalizeBoardDocument(rawState);

      if (!readOnly && options.recordHistory !== false) {
        setUndoStack((stack) => [
          ...stack.slice(-(MAX_UNDO_STEPS - 1)),
          board,
        ]);
        setRedoStack([]);
      }

      fittedPageRef.current = null;
      autoSelectedPageRef.current = next.activePageId;
      setBoard(next);
      setSelectedItemId(
        options.itemId ?? getActiveBoardPage(next)?.items.at(-1)?.id ?? null
      );
      setSaveState("saved");
    },
    [board, readOnly]
  );

  const captureUndoCheckpoint = useCallback(() => {
    if (readOnly) return;
    setUndoStack((stack) => [
      ...stack.slice(-(MAX_UNDO_STEPS - 1)),
      board,
    ]);
    setRedoStack([]);
  }, [board, readOnly]);

  const undoBoard = useCallback(() => {
    if (readOnly || undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [
      ...stack.slice(-(MAX_UNDO_STEPS - 1)),
      board,
    ]);
    fittedPageRef.current = null;
    setSelectedItemId(null);
    setBoard(previous);
    persistBoard(previous);
  }, [board, persistBoard, readOnly, undoStack]);

  const redoBoard = useCallback(() => {
    if (readOnly || redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [
      ...stack.slice(-(MAX_UNDO_STEPS - 1)),
      board,
    ]);
    fittedPageRef.current = null;
    setSelectedItemId(null);
    setBoard(next);
    persistBoard(next);
  }, [board, persistBoard, readOnly, redoStack]);

  const fitPage = useCallback((page: BoardPage | null | undefined) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (!page || page.items.length === 0) {
      setView({ x: 72, y: 72, scale: 1 });
      return;
    }

    const bounds = pageBounds(page);
    if (!bounds) return;

    const rect = viewport.getBoundingClientRect();
    const reservedLeft = window.innerWidth >= 768 ? 424 : 0;
    const reservedTop = 104;
    const availableWidth = Math.max(320, rect.width - reservedLeft);
    const availableHeight = Math.max(260, rect.height - reservedTop);
    const padding = 120;
    const nextScale = clamp(
      Math.min(
        (availableWidth - padding) / bounds.width,
        (availableHeight - padding) / bounds.height,
        1.1
      ),
      0.18,
      1.1
    );

    setView({
      scale: nextScale,
      x:
        reservedLeft +
        (availableWidth - bounds.width * nextScale) / 2 -
        bounds.minX * nextScale,
      y:
        reservedTop +
        (availableHeight - bounds.height * nextScale) / 2 -
        bounds.minY * nextScale,
    });
  }, []);

  const keepSelectedItemInZoomSafeArea = useCallback(
    (next: { x: number; y: number; scale: number }) => {
      if (!selectedItem) return next;

      const sidebarWidth =
        sidebarOpen && window.innerWidth >= 768
          ? Math.min(336, window.innerWidth - 24) + 36
          : 24;
      const safeLeft = sidebarWidth;
      const safeTop = 88;
      const left = selectedItem.x * next.scale + next.x;
      const top = selectedItem.y * next.scale + next.y;

      return {
        ...next,
        x: left < safeLeft ? next.x + safeLeft - left : next.x,
        y: top < safeTop ? next.y + safeTop - top : next.y,
      };
    },
    [selectedItem, sidebarOpen]
  );

  const zoomBy = useCallback((factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const pointerX = rect.width / 2;
    const pointerY = rect.height / 2;

    setView((current) => {
      const worldX = (pointerX - current.x) / current.scale;
      const worldY = (pointerY - current.y) / current.scale;
      const scale = clamp(current.scale * factor, 0.16, 2.4);

      return keepSelectedItemInZoomSafeArea({
        scale,
        x: pointerX - worldX * scale,
        y: pointerY - worldY * scale,
      });
    });
  }, [keepSelectedItemInZoomSafeArea]);

  const resetZoom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const pointerX = rect.width / 2;
    const pointerY = rect.height / 2;

    setView((current) => {
      const worldX = (pointerX - current.x) / current.scale;
      const worldY = (pointerY - current.y) / current.scale;

      return keepSelectedItemInZoomSafeArea({
        scale: 1,
        x: pointerX - worldX,
        y: pointerY - worldY,
      });
    });
  }, [keepSelectedItemInZoomSafeArea]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;

      const isZoomIn = key === "+" || key === "=";
      const isZoomOut = key === "-" || key === "_";
      const isZoomReset = key === "0";

      if (isZoomIn || isZoomOut || isZoomReset) {
        event.preventDefault();
        event.stopPropagation();
        if (isZoomReset) {
          resetZoom();
        } else {
          zoomBy(isZoomIn ? 1.15 : 0.85);
        }
        return;
      }

      if (!canEdit) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;

      const isUndo = key === "z" && !event.shiftKey;
      const isRedo = (key === "z" && event.shiftKey) || key === "y";

      if (!isUndo && !isRedo) return;
      event.preventDefault();
      if (isRedo) {
        redoBoard();
      } else {
        undoBoard();
      }
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [canEdit, redoBoard, resetZoom, undoBoard, zoomBy]);

  useEffect(() => {
    if (!activePage || fittedPageRef.current === activePage.id) return;
    fittedPageRef.current = activePage.id;
    requestAnimationFrame(() => fitPage(activePage));
  }, [activePage, fitPage]);

  const addDiagramById = useCallback(
    async (rawId: string) => {
      const id = parseDiagramId(rawId);
      if (!id) return;

      setAddError(null);
      setIsAddingDiagram(true);
      setSaveState("saving");

      try {
        if (boardId && activePage) {
          const response = await fetch(`/api/b/${encodeURIComponent(boardId)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              editId,
              diagramId: id,
              pageId: activePage.id,
            }),
          });

          if (!response.ok) {
            setAddError(
              response.status === 404
                ? "Diagram not found"
                : "Could not add diagram"
            );
            setSaveState("error");
            return;
          }

          const data = (await response.json()) as {
            state: unknown;
            itemId?: string | null;
          };
          acceptRemoteBoard(data.state, { itemId: data.itemId });
          return;
        }

        const response = await fetch(`/api/d/${encodeURIComponent(id)}`);

        if (!response.ok) {
          setAddError("Diagram not found");
          setSaveState("error");
          return;
        }

        const data = (await response.json()) as ApiDiagram;
        let itemId: string | null = null;

        commitBoard((current) => {
          const result = addDiagramToBoardDocument(current, {
            diagramId: data.id,
            title: data.title,
            content: data.content,
            href: `/d/${data.id}?v=${data.version ?? 1}`,
            version: data.version ?? 1,
          });
          itemId = result.itemId;
          return result.document;
        });

        if (itemId) setSelectedItemId(itemId);
      } catch {
        setAddError("Could not add diagram");
        setSaveState("error");
      } finally {
        setIsAddingDiagram(false);
      }
    },
    [acceptRemoteBoard, activePage, boardId, commitBoard, editId]
  );

  const createDiagramOnBoard = useCallback(
    async () => {
      if (!boardId || !activePage) {
        setAddError("Create a workspace before adding a new card");
        return;
      }

      setAddError(null);
      setIsAddingDiagram(true);
      setSaveState("saving");

      try {
        const response = await fetch(`/api/b/${encodeURIComponent(boardId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            editId,
            pageId: activePage.id,
            title: `Diagram ${activePage.items.length + 1}`,
            content: DEFAULT_DIAGRAM_SOURCE,
            width: 760,
            height: 480,
          }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;
          setAddError(data?.message ?? "Could not create diagram");
          setSaveState("error");
          return;
        }

        const data = (await response.json()) as {
          state: unknown;
          itemId?: string | null;
        };
        acceptRemoteBoard(data.state, { itemId: data.itemId });
      } catch {
        setAddError("Could not create diagram");
        setSaveState("error");
      } finally {
        setIsAddingDiagram(false);
      }
    },
    [
      acceptRemoteBoard,
      activePage,
      boardId,
      editId,
    ]
  );

  const saveItemSource = useCallback(
    async (item: BoardItem, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) throw new Error("Mermaid source is required");

      const itemEditId = getDiagramEditId(item);
      let version = item.version;

      setSaveState("saving");

      if (itemEditId) {
        const response = await fetch(
          `/api/d/${encodeURIComponent(item.diagramId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: trimmed, editId: itemEditId }),
          }
        );

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;
          setSaveState("error");
          throw new Error(data?.message ?? "Could not save source");
        }

        const data = (await response.json()) as { version?: number };
        version = data.version ?? version;
      }

      commitBoard((current) =>
        updateBoardItem(current, item.id, {
          content: trimmed,
          href: `/d/${item.diagramId}?v=${version ?? 1}`,
          diagramEditId: itemEditId ?? item.diagramEditId,
          version,
          updatedAt: new Date().toISOString(),
        })
      );
    },
    [commitBoard]
  );

  const applyChatUpdate = useCallback(
    (item: BoardItem, updates: { content: string; title?: string }) => {
      commitBoard((current) =>
        updateBoardItem(current, item.id, {
          content: updates.content,
          title: updates.title?.trim() || item.title,
          updatedAt: new Date().toISOString(),
        })
      );
    },
    [commitBoard]
  );

  const applyChatResult = useCallback(
    (
      item: BoardItem,
      itemEditId: string | null,
      result: { version: number; title?: string }
    ) => {
      commitBoard(
        (current) =>
          updateBoardItem(current, item.id, {
            href: `/d/${item.diagramId}?v=${result.version}`,
            diagramEditId: itemEditId ?? item.diagramEditId,
            title: result.title?.trim() || item.title,
            version: result.version,
            updatedAt: new Date().toISOString(),
          }),
        { recordHistory: false }
      );
    },
    [commitBoard]
  );

  const addParam = searchParams.get("add");
  const focusParam = searchParams.get("focus");
  useEffect(() => {
    if (!addParam || addParamRef.current === addParam) return;
    addParamRef.current = addParam;
    if (canEdit) {
      void addDiagramById(addParam).then(() => router.replace(pathname));
    }
  }, [addDiagramById, addParam, canEdit, pathname, router]);

  useEffect(() => {
    if (!focusParam || focusParamRef.current === focusParam) return;

    const page = board.pages.find((candidate) =>
      candidate.items.some(
        (item) => item.diagramId === focusParam || item.id === focusParam
      )
    );
    const item = page?.items.find(
      (candidate) =>
        candidate.diagramId === focusParam || candidate.id === focusParam
    );

    if (!page || !item) return;

    focusParamRef.current = focusParam;
    autoSelectedPageRef.current = page.id;
    setSelectedItemId(item.id);

    if (page.id !== board.activePageId) {
      fittedPageRef.current = null;
      commitBoard(
        (current) => selectBoardPage(current, page.id),
        { recordHistory: false }
      );
    } else {
      requestAnimationFrame(() => fitPage(page));
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("focus");
    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    window.history.replaceState(null, "", next);
  }, [board, commitBoard, fitPage, focusParam, pathname, searchParams]);

  const refreshItem = useCallback(
    async (item: BoardItem) => {
      setRefreshingItemId(item.id);
      try {
        const response = await fetch(
          `/api/d/${encodeURIComponent(item.diagramId)}`
        );
        if (!response.ok) return;
        const data = (await response.json()) as ApiDiagram;
        commitBoard((current) =>
          updateBoardItem(current, item.id, {
            title: data.title,
            content: data.content,
            href: `/d/${data.id}?v=${data.version ?? 1}`,
            version: data.version ?? 1,
            updatedAt: new Date().toISOString(),
          })
        );
      } finally {
        setRefreshingItemId(null);
      }
    },
    [commitBoard]
  );

  useEffect(() => {
    if (!interaction) return;
    const activeInteraction = interaction;

    function onPointerMove(event: PointerEvent) {
      event.preventDefault();
      document.getSelection()?.removeAllRanges();

      if (activeInteraction.type === "pan") {
        setView((current) => ({
          ...current,
          x: activeInteraction.startX + event.clientX - activeInteraction.startClientX,
          y: activeInteraction.startY + event.clientY - activeInteraction.startClientY,
        }));
        return;
      }

      const dx = (event.clientX - activeInteraction.startClientX) / view.scale;
      const dy = (event.clientY - activeInteraction.startClientY) / view.scale;

      if (activeInteraction.type === "pending-drag") {
        const clientDx = event.clientX - activeInteraction.startClientX;
        const clientDy = event.clientY - activeInteraction.startClientY;
        if (Math.hypot(clientDx, clientDy) < DRAG_START_DISTANCE) return;

        captureUndoCheckpoint();
        setInteraction({
          ...activeInteraction,
          type: "drag",
        });
        commitBoard(
          (current) =>
            updateBoardItem(current, activeInteraction.itemId, {
              x: activeInteraction.startX + dx,
              y: activeInteraction.startY + dy,
            }),
          { recordHistory: false }
        );
        return;
      }

      if (activeInteraction.type === "drag") {
        commitBoard(
          (current) =>
            updateBoardItem(current, activeInteraction.itemId, {
              x: activeInteraction.startX + dx,
              y: activeInteraction.startY + dy,
            }),
          { recordHistory: false }
        );
        return;
      }

      const isWest = activeInteraction.corner.includes("w");
      const isNorth = activeInteraction.corner.includes("n");
      let nextX = activeInteraction.startX;
      let nextY = activeInteraction.startY;
      let nextWidth = activeInteraction.startWidth + (isWest ? -dx : dx);
      let nextHeight = activeInteraction.startHeight + (isNorth ? -dy : dy);

      if (isWest) nextX = activeInteraction.startX + dx;
      if (isNorth) nextY = activeInteraction.startY + dy;

      if (nextWidth < MIN_ITEM_WIDTH) {
        if (isWest) nextX = activeInteraction.startX + activeInteraction.startWidth - MIN_ITEM_WIDTH;
        nextWidth = MIN_ITEM_WIDTH;
      }
      if (nextHeight < MIN_ITEM_HEIGHT) {
        if (isNorth) nextY = activeInteraction.startY + activeInteraction.startHeight - MIN_ITEM_HEIGHT;
        nextHeight = MIN_ITEM_HEIGHT;
      }

      if (nextWidth > MAX_ITEM_WIDTH) {
        if (isWest) nextX = activeInteraction.startX + activeInteraction.startWidth - MAX_ITEM_WIDTH;
        nextWidth = MAX_ITEM_WIDTH;
      }
      if (nextHeight > MAX_ITEM_HEIGHT) {
        if (isNorth) nextY = activeInteraction.startY + activeInteraction.startHeight - MAX_ITEM_HEIGHT;
        nextHeight = MAX_ITEM_HEIGHT;
      }

      commitBoard(
        (current) =>
          updateBoardItem(current, activeInteraction.itemId, {
            x: nextX,
            y: nextY,
            width: nextWidth,
            height: nextHeight,
          }),
        { recordHistory: false }
      );
    }

    function onPointerUp() {
      setInteraction(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [captureUndoCheckpoint, commitBoard, interaction, view.scale]);

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();

    if (event.metaKey || event.ctrlKey) {
      const rect = event.currentTarget.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const worldX = (pointerX - view.x) / view.scale;
      const worldY = (pointerY - view.y) / view.scale;
      const scale = clamp(view.scale * Math.exp(-event.deltaY * 0.001), 0.16, 2.4);

      setView(keepSelectedItemInZoomSafeArea({
        scale,
        x: pointerX - worldX * scale,
        y: pointerY - worldY * scale,
      }));
      return;
    }

    setView((current) => ({
      ...current,
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }));
  }

  function handleChromeWheelCapture(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.metaKey && !event.ctrlKey) return;
    const target = event.target as HTMLElement;
    if (!target.closest("[data-board-control]")) return;

    event.preventDefault();
    event.stopPropagation();
  }

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    if ((event.target as HTMLElement).closest("[data-board-item]")) return;

    event.preventDefault();
    setSelectedItemId(null);
    setInteraction({
      type: "pan",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: view.x,
      startY: view.y,
    });
  }

  if (!board || !activePage) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-foreground">
        <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="relative isolate h-dvh select-none overflow-hidden bg-[var(--board-canvas)] text-foreground"
      onWheelCapture={handleChromeWheelCapture}
    >
      <main
        className={`absolute inset-0 overflow-hidden ${
          interaction?.type === "pan" ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={startPan}
        onWheel={handleWheel}
        ref={viewportRef}
      >
        <div aria-hidden="true" className="board-canvas absolute inset-0" />
        <div
          className="absolute left-0 top-0"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {activePage.items.map((item) => (
            <BoardDiagramCard
              canEdit={canEdit}
              isSelected={selectedItemId === item.id}
              item={item}
              key={item.id}
              onResizeStart={(event, corner) => {
                if (!canEdit) return;
                event.preventDefault();
                event.stopPropagation();
                captureUndoCheckpoint();
                showItemSettings(item.id);
                setInteraction({
                  type: "resize",
                  itemId: item.id,
                  corner,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  startX: item.x,
                  startY: item.y,
                  startWidth: item.width,
                  startHeight: item.height,
                });
              }}
              onSelect={() => showItemSettings(item.id)}
              onStartDrag={(event) => {
                if (!canEdit) return;
                if (event.button !== 0) return;
                const target = event.target as HTMLElement;
                if (target.closest("[data-board-control]")) return;
                event.preventDefault();
                event.stopPropagation();
                showItemSettings(item.id);
                setInteraction({
                  type: "pending-drag",
                  itemId: item.id,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  startX: item.x,
                  startY: item.y,
                });
              }}
              onTitleChange={(title) =>
                commitBoard((current) => updateBoardItem(current, item.id, { title }))
              }
            />
          ))}
        </div>

        {activePage.items.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
            <div className="board-floating-surface pointer-events-auto w-full max-w-sm rounded-lg border p-3 backdrop-blur-md">
              <div className="mb-3">
                <p className="text-sm font-semibold text-foreground">
                  {activePage.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Add the first diagram to this workspace.
                </p>
              </div>
              {canEdit ? (
                <Button
                  className="w-full"
                  disabled={isAddingDiagram}
                  onClick={() => void createDiagramOnBoard()}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  <Plus data-icon="inline-start" />
                  New diagram
                </Button>
              ) : null}
              {addError ? (
                <p className="mt-2 text-xs text-destructive">{addError}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>

      <div className="pointer-events-none fixed left-4 top-[calc(env(safe-area-inset-top)+14px)] z-30">
        <button
          aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          aria-pressed={sidebarOpen}
          className={`board-floating-surface pointer-events-auto inline-flex size-9 items-center justify-center rounded-lg border text-muted-foreground backdrop-blur-md hover:text-foreground active:scale-[0.96] ${
            sidebarOpen ? "bg-muted text-foreground ring-1 ring-border/70" : ""
          }`}
          onClick={toggleSidebar}
          type="button"
        >
          <Menu className="size-4" />
        </button>
      </div>

      {selectedItem && canEdit ? (
        <div className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+68px)] z-20 flex justify-start md:inset-x-0 md:top-[calc(env(safe-area-inset-top)+14px)] md:justify-center md:px-20">
          <BoardStyleControls
            activeToolPanel={toolPanel}
            canChat={Boolean(selectedDiagramEditId)}
            isRefreshing={refreshingItemId === selectedItem.id}
            item={selectedItem}
            onOpenDiagram={() => {
              window.open(selectedItem.editHref ?? selectedItem.href, "_blank");
            }}
            onOpenChat={() => toggleToolPanel("chat")}
            onOpenSource={() => toggleToolPanel("source")}
            onRefresh={() => void refreshItem(selectedItem)}
            onRemove={() =>
              commitBoard((current) =>
                removeBoardItem(current, selectedItem.id)
              )
            }
            onStyleChange={(updates) =>
              commitBoard((current) =>
                updateBoardItem(current, selectedItem.id, updates)
              )
            }
          />
        </div>
      ) : null}

      <div className="pointer-events-none fixed right-4 top-[calc(env(safe-area-inset-top)+14px)] z-20 flex items-center gap-2">
        <div className="board-floating-surface pointer-events-auto flex items-center gap-1 rounded-lg border p-1 backdrop-blur-md">
          {boardId ? (
            <Link
              aria-label="Open share view"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]"
              href={`/b/${boardId}`}
            >
              <ExternalLink className="size-4" />
            </Link>
          ) : null}
          <ModeToggle />
          {boardId ? (
            <BoardShareButton
              boardId={boardId}
              editId={editId}
              title={boardTitle}
            />
          ) : null}
          {boardId && canEdit && saveState === "error" ? (
            <span className="hidden px-2 text-xs text-destructive md:inline">
              Save failed
            </span>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-20 flex items-center justify-between gap-1 min-[360px]:gap-2 md:inset-x-auto md:left-4 md:bottom-[calc(env(safe-area-inset-bottom)+16px)] md:justify-start">
        <div className="board-floating-surface pointer-events-auto flex items-center gap-0.5 rounded-lg border p-1 backdrop-blur-md">
          <Button
            aria-label="Zoom out"
            onClick={() => zoomBy(0.85)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Minus />
          </Button>
          <span className="w-10 text-center text-xs font-medium tabular-nums text-foreground min-[360px]:w-12">
            {Math.round(view.scale * 100)}%
          </span>
          <Button
            aria-label="Zoom in"
            onClick={() => zoomBy(1.15)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Plus />
          </Button>
          <Button
            aria-label="Fit to page"
            className="max-[340px]:hidden"
            onClick={() => fitPage(activePage)}
            size="icon-sm"
            title="Fit to page"
            type="button"
            variant="ghost"
          >
            <Maximize2 />
          </Button>
        </div>

        {canEdit ? (
          <div className="board-floating-surface pointer-events-auto flex items-center gap-0.5 rounded-lg border p-1 backdrop-blur-md">
            <Button
              className="px-2 min-[390px]:px-2.5"
              disabled={isAddingDiagram}
              onClick={() => void createDiagramOnBoard()}
              size="sm"
              type="button"
              variant="secondary"
            >
              <Plus data-icon="inline-start" />
              <span className="hidden min-[390px]:inline">New</span>
            </Button>
            <Button
              aria-label="Undo"
              disabled={undoStack.length === 0}
              onClick={undoBoard}
              size="icon-sm"
              title="Undo"
              type="button"
              variant="ghost"
            >
              <Undo2 />
            </Button>
            <Button
              aria-label="Redo"
              disabled={redoStack.length === 0}
              onClick={redoBoard}
              size="icon-sm"
              title="Redo"
              type="button"
              variant="ghost"
            >
              <Redo2 />
            </Button>
          </div>
        ) : null}
        <BoardHelpButton />
      </div>

      {selectedItem && toolPanel ? (
        <BoardToolPanel
          activePanel={toolPanel}
          canEdit={canEdit}
          diagramEditId={selectedDiagramEditId}
          item={selectedItem}
          onChatUpdate={(updates) => applyChatUpdate(selectedItem, updates)}
          onChatResult={(result) =>
            applyChatResult(selectedItem, selectedDiagramEditId, result)
          }
          onClose={() => setToolPanel(null)}
          onSaveSource={(content) => saveItemSource(selectedItem, content)}
          onSelectPanel={setToolPanel}
        />
      ) : null}

      {sidebarOpen ? (
        <>
          <button
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-30 bg-background/35 backdrop-blur-[1px] md:hidden"
            onClick={() => setSidebarOpen(false)}
            type="button"
          />
          <aside
            className="board-notion-sidebar fixed inset-y-0 left-0 z-40 flex w-[min(22rem,calc(100vw-2.25rem))] flex-col border-r backdrop-blur-xl md:top-0 md:w-[22rem]"
            data-board-control
          >
            <div className="flex h-[54px] shrink-0 items-center gap-3 px-4">
              <div className="board-notion-avatar relative flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
                {workspaceInitial}
                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[#ff6b5f] ring-2 ring-[#202020]" />
              </div>
              {isTitleEditing && canEdit ? (
                <input
                  aria-label="Workspace title"
                  autoFocus
                  className="h-8 min-w-0 flex-1 select-text rounded-md border border-white/10 bg-white/10 px-2 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-white/25 focus:ring-3 focus:ring-white/10"
                  defaultValue={boardTitle}
                  onBlur={(event) => void saveBoardTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      event.currentTarget.value = boardTitle;
                      setIsTitleEditing(false);
                    }
                  }}
                />
              ) : (
                <button
                  className={`flex min-w-0 flex-1 items-center gap-1 rounded-md py-1 text-left text-[15px] font-semibold text-white ${
                    canEdit ? "hover:text-white/85" : "cursor-default"
                  }`}
                  disabled={!canEdit}
                  onClick={() => setIsTitleEditing(true)}
                  type="button"
                >
                  <span className="min-w-0 truncate">{boardTitle}</span>
                  {canEdit ? (
                    <Pencil className="size-3.5 shrink-0 text-white/45" />
                  ) : null}
                </button>
              )}
              <button
                aria-label="Hide sidebar"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-white/55 hover:bg-white/10 hover:text-white active:scale-[0.96]"
                onClick={() => setSidebarOpen(false)}
                type="button"
              >
                <ChevronsLeft className="size-5" />
              </button>
            </div>

            <div className="px-3 pb-3">
              <div className="mb-2 flex items-center gap-2">
                <Link
                  className="board-notion-row-active flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full px-3 text-[15px] font-semibold"
                  href={boardId ? `/b/${boardId}` : "/"}
                >
                  <Home className="size-5 shrink-0" />
                  <span className="truncate">Home</span>
                </Link>
                <button
                  aria-label="Open AI panel"
                  className="board-notion-row flex size-9 shrink-0 items-center justify-center rounded-md disabled:opacity-35"
                  disabled={!selectedDiagramEditId}
                  onClick={() => {
                    if (!selectedDiagramEditId) return;
                    toggleToolPanel("chat");
                    if (isCompactViewport()) setSidebarOpen(false);
                  }}
                  type="button"
                >
                  <MessageSquare className="size-5" />
                </button>
                <button
                  aria-label="Open source panel"
                  className="board-notion-row flex size-9 shrink-0 items-center justify-center rounded-md disabled:opacity-35"
                  disabled={!selectedItem}
                  onClick={() => {
                    if (!selectedItem) return;
                    toggleToolPanel("source");
                    if (isCompactViewport()) setSidebarOpen(false);
                  }}
                  type="button"
                >
                  <Code2 className="size-5" />
                </button>
              </div>

              <label className="board-notion-row flex h-8 items-center gap-2 rounded-md px-2">
                <Search className="size-4 shrink-0 text-current" />
                <input
                  aria-label="Search board"
                  className="min-w-0 flex-1 select-text bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/38"
                  onChange={(event) => setSidebarSearch(event.target.value)}
                  placeholder="Search"
                  value={sidebarSearch}
                />
              </label>
            </div>

            <div className="board-mobile-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-24">
              <section className="mb-5">
                <div className="mb-1 flex h-7 items-center justify-between px-1">
                  <span className="board-notion-section text-[0.72rem] font-semibold uppercase tracking-[0.04em]">
                    Pages
                  </span>
                  <button
                    aria-label="Add page"
                    className="board-notion-row inline-flex size-7 items-center justify-center rounded-md disabled:opacity-35"
                    disabled={!canEdit}
                    onClick={() => {
                      fittedPageRef.current = null;
                      commitBoard(addBoardPage);
                    }}
                    type="button"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {sidebarPages.map((page) => (
                    <button
                      aria-pressed={page.id === board.activePageId}
                      className={`group flex h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-[15px] ${
                        page.id === board.activePageId
                          ? "board-notion-row-active"
                          : "board-notion-row"
                      }`}
                      key={page.id}
                      onClick={() => {
                        fittedPageRef.current = null;
                        commitBoard(
                          (current) => selectBoardPage(current, page.id),
                          { recordHistory: false }
                        );
                        if (isCompactViewport()) setSidebarOpen(false);
                      }}
                      type="button"
                    >
                      <FileText className="size-4 shrink-0 opacity-75" />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {page.name}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums opacity-65">
                        {page.items.length}
                      </span>
                    </button>
                  ))}
                  {sidebarPages.length === 0 ? (
                    <p className="board-notion-muted px-2 py-1 text-sm">
                      No pages found.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="mb-5">
                <div className="mb-1 px-1 text-[0.72rem] font-semibold uppercase tracking-[0.04em] board-notion-section">
                  Diagrams
                </div>
                <div className="space-y-1">
                  {sidebarItems.map((item) => (
                    <button
                      aria-pressed={item.id === selectedItemId}
                      className={`group flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[15px] ${
                        item.id === selectedItemId
                          ? "board-notion-row-active"
                          : "board-notion-row"
                      }`}
                      key={item.id}
                      onClick={() => {
                        showItemSettings(item.id);
                      }}
                      type="button"
                    >
                      <FileText className="size-4 shrink-0 opacity-75" />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {item.title}
                      </span>
                    </button>
                  ))}
                  {sidebarItems.length === 0 ? (
                    <p className="board-notion-muted px-2 py-1 text-sm">
                      No diagrams found.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="mb-5">
                <div className="mb-1 px-1 text-[0.72rem] font-semibold uppercase tracking-[0.04em] board-notion-section">
                  History
                </div>
                <div className="space-y-1">
                  {sidebarHistoryEntries.map((entry) => (
                    <Link
                      className="board-notion-row group flex h-8 items-center gap-2 rounded-md px-2 text-left text-[15px]"
                      href={entry.href}
                      key={entry.id}
                    >
                      <FileText className="size-4 shrink-0 opacity-75" />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {entry.title}
                      </span>
                      <ExternalLink className="size-3 shrink-0 opacity-0 transition group-hover:opacity-60" />
                    </Link>
                  ))}
                  {sidebarHistoryEntries.length === 0 ? (
                    <p className="board-notion-muted px-2 py-1 text-sm">
                      {sidebarQuery ? "No history found." : "No local history yet."}
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="mb-5">
                <div className="mb-1 px-1 text-[0.72rem] font-semibold uppercase tracking-[0.04em] board-notion-section">
                  Workspace
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-2 text-sm font-semibold text-white">
                    <span className="truncate">
                      {activePage.items.length} diagram
                      {activePage.items.length === 1 ? "" : "s"}
                    </span>
                    {canEdit && board.pages.length > 1 ? (
                      <button
                        aria-label="Delete current page"
                        className="inline-flex size-7 items-center justify-center rounded-md text-[#ff8a80] hover:bg-[#ff6b5f]/15 active:scale-[0.96]"
                        onClick={() => {
                          fittedPageRef.current = null;
                          commitBoard((current) =>
                            deleteBoardPage(current, activePage.id)
                          );
                        }}
                        type="button"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
                  <p className="board-notion-muted mt-1 text-xs leading-5">
                    Canvas pages, Mermaid cards, and agent edits live in this board.
                  </p>
                </div>
              </section>
            </div>

            <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[#202020]/95 p-3 backdrop-blur-xl">
              {addError ? (
                <p className="mb-2 rounded-md bg-[#ff6b5f]/10 px-2 py-1.5 text-xs text-[#ff8a80]">
                  {addError}
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <button
                  className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-[15px] font-semibold text-white hover:bg-white/14 active:scale-[0.98] disabled:opacity-45"
                  disabled={!canEdit || isAddingDiagram}
                  onClick={() => void createDiagramOnBoard()}
                  type="button"
                >
                  <Plus className="size-5 shrink-0" />
                  <span className="truncate">New diagram</span>
                </button>
                <button
                  aria-label="Add page"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/14 active:scale-[0.96] disabled:opacity-45"
                  disabled={!canEdit}
                  onClick={() => {
                    fittedPageRef.current = null;
                    commitBoard(addBoardPage);
                  }}
                  type="button"
                >
                  <FileText className="size-5" />
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

function BoardHelpButton() {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const trigger = (
    <button
      aria-label="Workspace help"
      className="board-floating-surface pointer-events-auto flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold text-muted-foreground backdrop-blur-md hover:text-foreground active:scale-[0.96]"
      onClick={() => setOpen(true)}
      type="button"
    >
      <span className="hidden min-[390px]:inline">Beta</span>
      <HelpCircle className="size-4" />
    </button>
  );

  const content = <BoardHelpContent />;

  if (isDesktop) {
    return (
      <>
        {trigger}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg" showCloseButton={false}>
            <button
              aria-label="Close help"
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/35 active:scale-[0.96]"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="size-4" />
            </button>
            <DialogHeader>
              <div className="mb-1">
                <BoardBetaBadge />
              </div>
              <DialogTitle>Mermaid workspace beta</DialogTitle>
              <DialogDescription>
                A shared canvas for related Mermaid diagrams.
              </DialogDescription>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <div className="mx-auto mb-1 sm:mx-0">
              <BoardBetaBadge />
            </div>
            <DrawerTitle>Mermaid workspace beta</DrawerTitle>
            <DrawerDescription>
              A shared canvas for related Mermaid diagrams.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">{content}</div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function BoardHelpContent() {
  const items = [
    {
      icon: <HelpCircle className="size-4" />,
      title: "What this is",
      body: "A workspace is a single board with pages. Diagrams stay as movable, resizable cards so related system views can live together.",
    },
    {
      icon: <Share2 className="size-4" />,
      title: "Share with agents",
      body: "Use Connect AI agent > Copy agent prompt. It includes the board link, edit access, API endpoints, and the rule to place new cards without overlap.",
    },
    {
      icon: <Bot className="size-4" />,
      title: "How agents should work",
      body: "Agents should read the board state first, add or update diagrams through the board API, and keep everything on this shared surface.",
    },
    {
      icon: <FlaskConical className="size-4" />,
      title: "Beta expectations",
      body: "The board model, agent workflow, and mobile editing tools are still evolving. Assume diagrams autosave unless a save error appears.",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-foreground/10 bg-foreground/[0.035] p-3">
        <p className="text-sm font-semibold text-foreground">
          One board, many diagrams.
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Think of this like a lightweight Excalidraw surface for Mermaid. The
          board is the primitive; individual diagrams are objects inside it.
        </p>
      </div>

      <div className="grid gap-2">
        {items.map((item) => (
          <div
            className="flex gap-3 rounded-lg border border-border/70 p-3"
            key={item.title}
          >
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {item.title}
              </p>
              <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                {item.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardToolPanel({
  activePanel,
  canEdit,
  diagramEditId,
  item,
  onChatResult,
  onChatUpdate,
  onClose,
  onSaveSource,
  onSelectPanel,
}: {
  activePanel: "source" | "chat";
  canEdit: boolean;
  diagramEditId: string | null;
  item: BoardItem;
  onChatResult: (result: { version: number; title?: string }) => void;
  onChatUpdate: (updates: { content: string; title?: string }) => void;
  onClose: () => void;
  onSaveSource: (content: string) => Promise<void>;
  onSelectPanel: (panel: "source" | "chat") => void;
}) {
  if (activePanel === "chat") {
    if (diagramEditId) {
      return (
        <DiagramChatPanel
          className="fixed inset-0 z-40 flex flex-col bg-[var(--diagram-chat-sidebar-bg)] backdrop-blur-xl animate-in slide-in-from-right-2 duration-200 md:inset-y-0 md:left-auto md:right-0 md:w-[400px] lg:w-[420px] md:shrink-0 md:border-l md:border-[var(--diagram-chat-frame-border)]"
          content={item.content}
          diagramId={item.diagramId}
          editId={diagramEditId}
          key={item.id}
          onClose={onClose}
          onOptimisticUpdate={onChatUpdate}
          onToolResult={onChatResult}
          open
        />
      );
    }

    return (
      <aside
        className="fixed inset-0 z-40 flex flex-col bg-[var(--diagram-chat-sidebar-bg)] backdrop-blur-xl md:inset-y-0 md:left-auto md:right-0 md:w-[400px] lg:w-[420px] md:border-l md:border-[var(--diagram-chat-frame-border)]"
        data-board-control
      >
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <MessageSquare className="size-3.5 text-muted-foreground" />
            <p className="truncate text-sm font-semibold">AI unavailable</p>
          </div>
          <button
            aria-label="Close panel"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="max-w-[28ch] text-sm text-muted-foreground text-pretty">
            This card does not have edit access, so AI cannot update it.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="board-floating-surface pointer-events-auto fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-30 flex h-[min(72dvh,38rem)] flex-col overflow-hidden rounded-lg border backdrop-blur-md md:inset-x-auto md:bottom-auto md:right-4 md:top-[calc(env(safe-area-inset-top)+64px)] md:h-[calc(100dvh-92px)] md:w-[28rem]"
      data-board-control
    >
      <BoardSourceEditor
        canEdit={canEdit}
        item={item}
        onClose={onClose}
        onSaveSource={onSaveSource}
        onSelectChat={diagramEditId ? () => onSelectPanel("chat") : undefined}
      />
    </aside>
  );
}

function BoardSourceEditor({
  canEdit,
  item,
  onClose,
  onSaveSource,
  onSelectChat,
}: {
  canEdit: boolean;
  item: BoardItem;
  onClose: () => void;
  onSaveSource: (content: string) => Promise<void>;
  onSelectChat?: () => void;
}) {
  const [draft, setDraft] = useState(item.content);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasChanges = draft !== item.content;

  useEffect(() => {
    setDraft(item.content);
    setError(null);
  }, [item.content, item.id]);

  async function copySource() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function saveSource() {
    if (!hasChanges || saving) return;
    setSaving(true);
    setError(null);

    try {
      await onSaveSource(draft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save source");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Code2 className="size-3.5 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Mermaid source</p>
            <p className="truncate text-xs text-muted-foreground">
              {item.title}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onSelectChat ? (
            <button
              className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={onSelectChat}
              type="button"
            >
              <Sparkles className="size-3.5" />
              AI
            </button>
          ) : null}
          <button
            aria-label="Close source editor"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-3">
        <textarea
          aria-label="Mermaid diagram source"
          className="h-full w-full resize-none select-text rounded-md border border-border bg-muted/45 p-3 font-mono text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring focus:ring-3 focus:ring-ring/20"
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          readOnly={!canEdit}
          spellCheck={false}
          value={draft}
        />
      </div>

      {error ? (
        <div className="mx-3 mb-2 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex shrink-0 items-center gap-2 border-t border-border/60 p-3">
        <Button
          onClick={() => void copySource()}
          size="sm"
          type="button"
          variant="outline"
        >
          {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        {canEdit ? (
          <Button
            disabled={!hasChanges || saving}
            onClick={() => void saveSource()}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Save data-icon="inline-start" />
            {saving ? "Saving" : "Save"}
          </Button>
        ) : null}
        {hasChanges ? (
          <button
            className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setDraft(item.content)}
            type="button"
          >
            Revert
          </button>
        ) : (
          <span className="ml-auto text-xs text-muted-foreground">
            Board undo keeps edits reversible.
          </span>
        )}
      </div>
    </div>
  );
}

function BoardDiagramCard({
  canEdit,
  item,
  isSelected,
  onResizeStart,
  onSelect,
  onStartDrag,
  onTitleChange,
}: {
  canEdit: boolean;
  item: BoardItem;
  isSelected: boolean;
  onResizeStart: (
    event: ReactPointerEvent<HTMLDivElement>,
    corner: "nw" | "ne" | "sw" | "se"
  ) => void;
  onSelect: () => void;
  onStartDrag: (event: ReactPointerEvent<HTMLElement>) => void;
  onTitleChange: (title: string) => void;
}) {
  return (
    <article
      className={`board-diagram-card absolute overflow-visible rounded-lg border bg-white text-zinc-950 ${
        isSelected
          ? "board-selected-card"
          : "border-transparent"
      } ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
      data-board-item
      data-board-selected={isSelected ? "true" : undefined}
      onClick={(event) => {
        if (event.button !== 0) return;
        onSelect();
      }}
      onPointerDown={(event) => {
        if (event.button === 0) onSelect();
        if (canEdit) onStartDrag(event);
      }}
      style={{
        transform: `translate(${item.x}px, ${item.y}px)`,
        width: item.width,
        height: item.height,
      }}
    >
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-white">
        <div
          className={`flex h-10 items-center gap-2 border-b px-2 ${
            isSelected
              ? "board-selected-header"
              : "border-zinc-200 bg-white"
          }`}
        >
          <input
            aria-label="Diagram title"
            className="min-w-0 flex-1 select-text bg-transparent text-sm font-semibold text-zinc-900 outline-none"
            data-board-control
            defaultValue={item.title}
            disabled={!canEdit}
            key={item.title}
            onBlur={(event) => {
              const next = event.target.value.trim();
              if (next && next !== item.title) onTitleChange(next);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                event.currentTarget.value = item.title;
                event.currentTarget.blur();
              }
            }}
          />
        </div>

        <div
          className={`min-h-0 flex-1 p-3 ${
            isSelected ? "board-selected-body" : "bg-white"
          }`}
        >
          <MermaidPreview
            content={item.content}
            look={item.look}
            renderer={item.renderer}
            theme={item.theme}
            uiMode="light"
          />
        </div>
      </div>

      {isSelected && canEdit ? (
        <>
          <ResizeHandle corner="nw" onPointerDown={onResizeStart} />
          <ResizeHandle corner="ne" onPointerDown={onResizeStart} />
          <ResizeHandle corner="sw" onPointerDown={onResizeStart} />
          <ResizeHandle corner="se" onPointerDown={onResizeStart} />
        </>
      ) : null}
    </article>
  );
}

function BoardStyleControls({
  activeToolPanel,
  canChat,
  isRefreshing,
  item,
  onOpenDiagram,
  onOpenChat,
  onOpenSource,
  onRefresh,
  onRemove,
  onStyleChange,
}: {
  activeToolPanel: "source" | "chat" | null;
  canChat: boolean;
  isRefreshing: boolean;
  item: BoardItem;
  onOpenDiagram: () => void;
  onOpenChat: () => void;
  onOpenSource: () => void;
  onRefresh: () => void;
  onRemove: () => void;
  onStyleChange: (
    updates: Partial<Pick<BoardItem, "renderer" | "theme" | "look">>
  ) => void;
}) {
  function setRenderer(renderer: BoardRenderer) {
    onStyleChange({
      renderer,
      theme: renderer === "beautiful" ? "zinc" : "auto",
      look: renderer === "beautiful" ? "classic" : item.look,
    });
  }

  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  return (
    <>
      <div
        className="board-floating-surface pointer-events-auto flex w-full max-w-full items-center gap-1 rounded-xl border p-1.5 backdrop-blur-md md:hidden"
        data-board-control
        data-board-settings
      >
        <span className="hidden shrink-0 rounded-md bg-muted/70 px-1.5 py-1 font-mono text-[0.6875rem] text-muted-foreground tabular-nums min-[360px]:inline-flex">
          {Math.round(item.width)}px
        </span>
        <div className="min-w-0 flex-1">
          <RendererPicker current={item.renderer} onSelectRenderer={setRenderer} />
        </div>
        <Button
          aria-label="Open source"
          aria-pressed={activeToolPanel === "source"}
          onClick={onOpenSource}
          size="icon-sm"
          type="button"
          variant={activeToolPanel === "source" ? "secondary" : "ghost"}
        >
          <Code2 />
        </Button>
        {canChat ? (
          <Button
            aria-label="Open AI"
            aria-pressed={activeToolPanel === "chat"}
            onClick={onOpenChat}
            size="icon-sm"
            type="button"
            variant={activeToolPanel === "chat" ? "secondary" : "ghost"}
          >
            <Sparkles />
          </Button>
        ) : null}
        <Button
          aria-expanded={mobileMoreOpen}
          aria-label="More board controls"
          onClick={() => setMobileMoreOpen((current) => !current)}
          size="icon-sm"
          type="button"
          variant={mobileMoreOpen ? "secondary" : "ghost"}
        >
          <MoreHorizontal />
        </Button>
      </div>

      {mobileMoreOpen ? (
        <div
          className="board-floating-surface pointer-events-auto fixed inset-x-3 top-[calc(env(safe-area-inset-top)+122px)] z-30 grid gap-3 rounded-xl border p-3 backdrop-blur-md md:hidden"
          data-board-control
        >
          {item.renderer === "mermaid" ? (
            <div className="grid gap-1.5">
              <span className="px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Look
              </span>
              <LookPicker
                current={item.look}
                onSelectLook={(look) => onStyleChange({ look: look as BoardLook })}
              />
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <span className="px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              Theme
            </span>
            <ThemePicker
              current={item.theme}
              onSelectTheme={(theme) => onStyleChange({ theme })}
              renderer={item.renderer}
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              aria-label="Refresh diagram"
              onClick={onRefresh}
              size="sm"
              title="Refresh diagram"
              type="button"
              variant="ghost"
            >
              <RefreshCcw
                className={isRefreshing ? "animate-spin" : ""}
                data-icon="inline-start"
              />
              Refresh
            </Button>
            <Button
              aria-label="Open diagram"
              onClick={onOpenDiagram}
              size="sm"
              title="Open diagram"
              type="button"
              variant="ghost"
            >
              <ExternalLink data-icon="inline-start" />
              Open
            </Button>
            <Button
              aria-label="Remove diagram"
              onClick={onRemove}
              size="sm"
              title="Remove diagram"
              type="button"
              variant="destructive"
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <CopyImageButton
              content={item.content}
              look={item.look}
              renderer={item.renderer}
              theme={item.theme}
            />
            <ExcalidrawButton content={item.content} />
          </div>
        </div>
      ) : null}

      <div
        className="board-floating-surface pointer-events-auto hidden max-w-[min(72rem,calc(100vw-24rem))] flex-wrap items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 backdrop-blur-md md:flex"
        data-board-control
        data-board-settings
      >
        <span className="shrink-0 px-1.5 text-xs font-semibold text-muted-foreground">
          Style
        </span>
        <span className="shrink-0 rounded-md bg-muted/70 px-1.5 py-1 font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
          {Math.round(item.width)}px
        </span>
        <RendererPicker current={item.renderer} onSelectRenderer={setRenderer} />
        {item.renderer === "mermaid" ? (
          <LookPicker
            current={item.look}
            onSelectLook={(look) => onStyleChange({ look: look as BoardLook })}
          />
        ) : null}
        <ThemePicker
          current={item.theme}
          onSelectTheme={(theme) => onStyleChange({ theme })}
          renderer={item.renderer}
        />
        <div className="h-5 w-px shrink-0 bg-border/70" />
        <Button
          aria-pressed={activeToolPanel === "source"}
          onClick={onOpenSource}
          size="sm"
          type="button"
          variant={activeToolPanel === "source" ? "secondary" : "ghost"}
        >
          <Code2 data-icon="inline-start" />
          Source
        </Button>
        {canChat ? (
          <Button
            aria-pressed={activeToolPanel === "chat"}
            onClick={onOpenChat}
            size="sm"
            type="button"
            variant={activeToolPanel === "chat" ? "secondary" : "ghost"}
          >
            <Sparkles data-icon="inline-start" />
            AI
          </Button>
        ) : null}
        <Button
          aria-label="Refresh diagram"
          onClick={onRefresh}
          size="icon-sm"
          title="Refresh diagram"
          type="button"
          variant="ghost"
        >
          <RefreshCcw className={isRefreshing ? "animate-spin" : ""} />
        </Button>
        <Button
          aria-label="Open diagram"
          onClick={onOpenDiagram}
          size="icon-sm"
          title="Open diagram"
          type="button"
          variant="ghost"
        >
          <ExternalLink />
        </Button>
        <Button
          aria-label="Remove diagram"
          onClick={onRemove}
          size="icon-sm"
          title="Remove diagram"
          type="button"
          variant="destructive"
        >
          <Trash2 />
        </Button>
        <div className="h-5 w-px shrink-0 bg-border/70" />
        <CopyImageButton
          content={item.content}
          look={item.look}
          renderer={item.renderer}
          theme={item.theme}
        />
        <ExcalidrawButton content={item.content} />
      </div>
    </>
  );
}

function ResizeHandle({
  corner,
  onPointerDown,
}: {
  corner: "nw" | "ne" | "sw" | "se";
  onPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    corner: "nw" | "ne" | "sw" | "se"
  ) => void;
}) {
  const position = {
    nw: "-left-2 -top-2 cursor-nwse-resize",
    ne: "-right-2 -top-2 cursor-nesw-resize",
    sw: "-bottom-2 -left-2 cursor-nesw-resize",
    se: "-bottom-2 -right-2 cursor-nwse-resize",
  }[corner];

  return (
    <div
      className={`board-resize-handle absolute size-4 rounded-full ${position}`}
      onPointerDown={(event) => onPointerDown(event, corner)}
    />
  );
}
