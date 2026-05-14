"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  Tldraw,
  createShapeId,
  useEditor,
  type Editor,
  type JsonValue,
  type TLBaseShape,
  type TLComponents,
  type TLShape,
  type TLShapeId,
} from "tldraw";
import {
  Check,
  ArrowRight,
  Bot,
  BringToFront,
  Brush,
  ChevronsLeft,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  HelpCircle,
  ImageIcon,
  Layers3,
  Maximize2,
  Menu,
  MessageSquare,
  Minus,
  MoreHorizontal,
  Pencil,
  PenLine,
  Plus,
  Presentation,
  Redo2,
  RefreshCcw,
  Save,
  Search,
  SendToBack,
  Share2,
  Sparkles,
  Square,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from "@/components/icons/mingcute";
import { BoardShareButton } from "@/components/board-share-button";
import { BottomChatBar } from "@/components/bottom-chat-bar";
import { DiagramChatPanel } from "@/components/chat-panel";
import { INITIAL_CHAT_KEY } from "@/components/create-chat";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerDescription,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useHistoryEntries } from "@/components/history-tracker";
import { CopyImageButton } from "@/components/copy-image-button";
import { ExcalidrawButton } from "@/components/excalidraw-button";
import { LookPicker } from "@/components/look-picker";
import { MarkdownReport } from "@/components/markdown-report";
import { MermaidPreview } from "@/components/mermaid-preview";
import { ModeToggle } from "@/components/mode-toggle";
import { RendererPicker } from "@/components/renderer-picker";
import { SanitizedUiFrame } from "@/components/sanitized-ui-frame";
import {
  SlideArtifactFrame,
  slidesForItem,
} from "@/components/slide-artifact-frame";
import { ThemePicker } from "@/components/theme-picker";
import { hasHtmlContent } from "@/lib/sanitized-ui";
import {
  inferMarkdownTitle,
  titleFromMarkdownFilename,
} from "@/lib/markdown-document";
import { useMediaQuery } from "@/lib/use-media-query";
import {
  addBoardPage,
  addArtifactToBoardDocument,
  addDiagramToBoardDocument,
  deleteBoardPage,
  getActiveBoardPage,
  moveBoardItemLayer,
  normalizeBoardDocument,
  removeBoardItem,
  selectBoardPage,
  updateBoardItem,
  type BoardDocument,
  type BoardItem,
  type BoardItemKind,
  type BoardLook,
  type BoardPage,
  type BoardRenderer,
  type BoardSlide,
} from "@/lib/board-state";
import { cn } from "@/lib/utils";

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
const MAX_ITEM_WIDTH = 1920;
const MAX_ITEM_HEIGHT = 1600;
const MAX_UNDO_STEPS = 50;
const BOARD_DRAG_START_DISTANCE_SQUARED = 9;
const BOARD_ARTIFACT_SHAPE_TYPE = "board-artifact" as const;
const TLDRAW_LICENSE_KEY = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;
const BOARD_TLDRAW_COMPONENTS: TLComponents = {
  ActionsMenu: null,
  DebugMenu: null,
  DebugPanel: null,
  HelpMenu: null,
  MainMenu: null,
  Minimap: null,
  NavigationPanel: null,
  PageMenu: null,
  QuickActions: null,
  SharePanel: null,
  StylePanel: null,
  Toolbar: null,
};

type BoardArtifactShape = TLBaseShape<
  typeof BOARD_ARTIFACT_SHAPE_TYPE,
  {
    w: number;
    h: number;
    item: JsonValue;
  }
>;

declare module "tldraw" {
  interface TLGlobalShapePropsMap {
    [BOARD_ARTIFACT_SHAPE_TYPE]: BoardArtifactShape["props"];
  }
}

type BoardTldrawContextValue = {
  boardId?: string;
  canEdit: boolean;
  editId?: string;
  interactiveWebsiteItemId: string | null;
  selectedItemId: string | null;
  onActivateContent: (itemId: string | null) => void;
  onCaptureUndoCheckpoint: () => void;
  onContentChange: (itemId: string, content: string) => void;
  onSelectItem: (itemId: string | null) => void;
  onTitleChange: (itemId: string, title: string) => void;
};

const BoardTldrawContext = createContext<BoardTldrawContextValue | null>(null);

function useBoardTldrawContext() {
  const value = useContext(BoardTldrawContext);
  if (!value) {
    throw new Error("Board tldraw context is missing");
  }
  return value;
}

function createPlaceholderBoardItem(): BoardItem {
  return {
    id: "item_placeholder",
    kind: "text",
    title: "Untitled",
    content: "",
    x: 0,
    y: 0,
    width: 640,
    height: 420,
    renderer: "beautiful",
    theme: "default",
    look: "classic",
  };
}

function toShapeBoardItem(item: BoardItem): BoardItem {
  return JSON.parse(JSON.stringify(item)) as BoardItem;
}

function getBoardArtifactShapeId(itemId: string): TLShapeId {
  return createShapeId(`board-${itemId.replace(/[^a-zA-Z0-9_-]/g, "_")}`);
}

function isBoardArtifactShape(shape: TLShape): shape is BoardArtifactShape {
  return shape.type === BOARD_ARTIFACT_SHAPE_TYPE;
}

function getBoardItemFromShape(shape: BoardArtifactShape): BoardItem {
  return shape.props.item as BoardItem;
}

function boardArtifactShapeFromItem(item: BoardItem) {
  return {
    id: getBoardArtifactShapeId(item.id),
    type: BOARD_ARTIFACT_SHAPE_TYPE,
    x: item.x,
    y: item.y,
    props: {
      w: clamp(item.width, MIN_ITEM_WIDTH, MAX_ITEM_WIDTH),
      h: clamp(item.height, MIN_ITEM_HEIGHT, MAX_ITEM_HEIGHT),
      item: toShapeBoardItem(item),
    },
  } satisfies Partial<BoardArtifactShape> & Pick<BoardArtifactShape, "id" | "type">;
}

class BoardArtifactShapeUtil extends BaseBoxShapeUtil<BoardArtifactShape> {
  static override type = BOARD_ARTIFACT_SHAPE_TYPE;
  static override props = {
    w: T.number,
    h: T.number,
    item: T.jsonValue,
  };

  override getDefaultProps(): BoardArtifactShape["props"] {
    return {
      w: 640,
      h: 420,
      item: createPlaceholderBoardItem(),
    };
  }

  override component(shape: BoardArtifactShape) {
    return <BoardTldrawArtifactShape shape={shape} />;
  }

  override getIndicatorPath(shape: BoardArtifactShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}

const BOARD_TLDRAW_SHAPE_UTILS = [BoardArtifactShapeUtil];

function BoardTldrawArtifactShape({ shape }: { shape: BoardArtifactShape }) {
  const editor = useEditor();
  const context = useBoardTldrawContext();
  const item = getBoardItemFromShape(shape);
  const itemPageHref =
    getBoardItemPageHref({
      boardId: context.boardId,
      canEdit: context.canEdit,
      editId: context.editId,
      item,
    }) ?? undefined;

  return (
    <HTMLContainer
      className="board-tldraw-artifact"
      style={{
        height: shape.props.h,
        pointerEvents: "all",
        width: shape.props.w,
      }}
    >
      <BoardDiagramCard
        canEdit={context.canEdit}
        isContentInteractive={context.interactiveWebsiteItemId === item.id}
        isSelected={context.selectedItemId === item.id}
        item={item}
        itemPageHref={itemPageHref}
        onActivateContent={() => context.onActivateContent(item.id)}
        onCardPointerDown={(event) => {
          const target = event.target as HTMLElement;

          if (event.button === 0) {
            context.onSelectItem(item.id);
          }

          if (target.closest("[data-board-control]")) {
            editor.markEventAsHandled(event);
            return;
          }

          if (!target.closest("[data-board-content-activator]")) {
            context.onActivateContent(null);
          }

          const currentShape = editor.getShape<BoardArtifactShape>(shape.id);
          if (!context.canEdit || !currentShape || event.button !== 0) return;
          const dragShape = currentShape;

          editor.markEventAsHandled(event);
          event.preventDefault();
          event.stopPropagation();

          editor.setCurrentTool("select");
          editor.setSelectedShapes([shape.id]);

          const cardElement = event.currentTarget;
          const ownerDocument = cardElement.ownerDocument;
          const ownerWindow = ownerDocument.defaultView ?? window;
          const pointerId = event.pointerId;
          const startScreenPoint = { x: event.clientX, y: event.clientY };
          const startPagePoint = editor.screenToPage(startScreenPoint);
          const startShapePoint = { x: dragShape.x, y: dragShape.y };
          let didDrag = false;
          let capturedUndo = false;

          try {
            cardElement.setPointerCapture(pointerId);
          } catch {
            // The document-level listeners below still cover this gesture.
          }

          function cleanup(pointerEvent: PointerEvent) {
            if (pointerEvent.pointerId !== pointerId) return;
            editor.markEventAsHandled(pointerEvent);
            ownerDocument.removeEventListener("pointermove", onPointerMove, {
              capture: true,
            });
            ownerDocument.removeEventListener("pointerup", cleanup, {
              capture: true,
            });
            ownerDocument.removeEventListener("pointercancel", cleanup, {
              capture: true,
            });

            try {
              cardElement.releasePointerCapture(pointerId);
            } catch {
              // The pointer may already be released after cancellation.
            }

            if (didDrag) {
              cardElement.dataset.boardDragged = "true";
              ownerWindow.setTimeout(() => {
                if (cardElement.dataset.boardDragged === "true") {
                  delete cardElement.dataset.boardDragged;
                }
              }, 160);
            }
          }

          function onPointerMove(pointerEvent: PointerEvent) {
            if (pointerEvent.pointerId !== pointerId) return;
            editor.markEventAsHandled(pointerEvent);

            const screenDx = pointerEvent.clientX - startScreenPoint.x;
            const screenDy = pointerEvent.clientY - startScreenPoint.y;
            const distanceSquared = screenDx * screenDx + screenDy * screenDy;
            if (!didDrag && distanceSquared < BOARD_DRAG_START_DISTANCE_SQUARED) {
              return;
            }

            if (!capturedUndo) {
              context.onCaptureUndoCheckpoint();
              context.onActivateContent(null);
              capturedUndo = true;
            }
            didDrag = true;

            const pagePoint = editor.screenToPage({
              x: pointerEvent.clientX,
              y: pointerEvent.clientY,
            });
            editor.updateShapes<BoardArtifactShape>([
              {
                id: dragShape.id,
                type: dragShape.type,
                x: startShapePoint.x + pagePoint.x - startPagePoint.x,
                y: startShapePoint.y + pagePoint.y - startPagePoint.y,
              },
            ]);
          }

          ownerDocument.addEventListener("pointermove", onPointerMove, {
            capture: true,
          });
          ownerDocument.addEventListener("pointerup", cleanup, {
            capture: true,
          });
          ownerDocument.addEventListener("pointercancel", cleanup, {
            capture: true,
          });
        }}
        onContentChange={(content) => context.onContentChange(item.id, content)}
        onTitleChange={(title) => context.onTitleChange(item.id, title)}
      />
    </HTMLContainer>
  );
}

type BoardTldrawCanvasProps = {
  activePage: BoardPage;
  boardId?: string;
  canEdit: boolean;
  editId?: string;
  interactiveWebsiteItemId: string | null;
  onActivateContent: (itemId: string | null) => void;
  onBoardItemsChange: (
    updater: (current: BoardDocument) => BoardDocument
  ) => void;
  onCameraZoomChange: (zoom: number) => void;
  onCaptureUndoCheckpoint: () => void;
  onContentChange: (itemId: string, content: string) => void;
  onEditorChange: (editor: Editor | null) => void;
  onSelectItem: (itemId: string | null) => void;
  onTitleChange: (itemId: string, title: string) => void;
  readOnly: boolean;
  selectedItemId: string | null;
};

function BoardTldrawCanvas({
  activePage,
  boardId,
  canEdit,
  editId,
  interactiveWebsiteItemId,
  onActivateContent,
  onBoardItemsChange,
  onCameraZoomChange,
  onCaptureUndoCheckpoint,
  onContentChange,
  onEditorChange,
  onSelectItem,
  onTitleChange,
  readOnly,
  selectedItemId,
}: BoardTldrawCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const syncingFromBoardRef = useRef(false);
  const lastOrderKeyRef = useRef<string | null>(null);
  const callbacksRef = useRef({
    activePageId: activePage.id,
    onBoardItemsChange,
    onCameraZoomChange,
    onSelectItem,
  });

  useEffect(() => {
    callbacksRef.current = {
      activePageId: activePage.id,
      onBoardItemsChange,
      onCameraZoomChange,
      onSelectItem,
    };
  }, [activePage.id, onBoardItemsChange, onCameraZoomChange, onSelectItem]);

  const contextValue = useMemo<BoardTldrawContextValue>(
    () => ({
      boardId,
      canEdit,
      editId,
      interactiveWebsiteItemId,
      selectedItemId,
      onActivateContent,
      onCaptureUndoCheckpoint,
      onContentChange,
      onSelectItem,
      onTitleChange,
    }),
    [
      boardId,
      canEdit,
      editId,
      interactiveWebsiteItemId,
      onActivateContent,
      onCaptureUndoCheckpoint,
      onContentChange,
      onSelectItem,
      onTitleChange,
      selectedItemId,
    ]
  );

  useEffect(() => {
    return () => {
      onEditorChange(null);
    };
  }, [onEditorChange]);

  useEffect(() => {
    if (!editor) return;
    editor.run(() => {
      editor.updateInstanceState({ isReadonly: readOnly });
    }, { history: "ignore" });
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;

    const orderKey = `${activePage.id}:${activePage.items
      .map((item) => item.id)
      .join(",")}`;
    const shouldReplaceShapes = lastOrderKeyRef.current !== orderKey;
    lastOrderKeyRef.current = orderKey;
    syncingFromBoardRef.current = true;

    editor.run(() => {
      const currentShapes = editor
        .getCurrentPageShapesSorted()
        .filter(isBoardArtifactShape);

      if (shouldReplaceShapes) {
        if (currentShapes.length > 0) {
          editor.deleteShapes(currentShapes);
        }
        if (activePage.items.length > 0) {
          editor.createShapes<BoardArtifactShape>(
            activePage.items.map(boardArtifactShapeFromItem)
          );
        }
      } else {
        const currentIds = new Set(currentShapes.map((shape) => shape.id));
        const nextShapeIds = new Set(
          activePage.items.map((item) => getBoardArtifactShapeId(item.id))
        );
        const shapesToDelete = currentShapes.filter(
          (shape) => !nextShapeIds.has(shape.id)
        );
        if (shapesToDelete.length > 0) {
          editor.deleteShapes(shapesToDelete);
        }

        const shapesToCreate = activePage.items
          .filter((item) => !currentIds.has(getBoardArtifactShapeId(item.id)))
          .map(boardArtifactShapeFromItem);
        if (shapesToCreate.length > 0) {
          editor.createShapes<BoardArtifactShape>(shapesToCreate);
        }

        const shapesToUpdate = activePage.items
          .filter((item) => currentIds.has(getBoardArtifactShapeId(item.id)))
          .map(boardArtifactShapeFromItem);
        if (shapesToUpdate.length > 0) {
          editor.updateShapes<BoardArtifactShape>(shapesToUpdate);
        }
      }

      const selectedShapeId = selectedItemId
        ? getBoardArtifactShapeId(selectedItemId)
        : null;
      if (selectedShapeId && editor.getShape(selectedShapeId)) {
        editor.setSelectedShapes([selectedShapeId]);
      } else {
        editor.setSelectedShapes([]);
      }
    }, { history: "ignore" });

    requestAnimationFrame(() => {
      syncingFromBoardRef.current = false;
      callbacksRef.current.onCameraZoomChange(editor.getCamera().z);
    });
  }, [activePage, editor, selectedItemId]);

  useEffect(() => {
    if (!editor) return;

    return editor.store.listen(
      () => {
        callbacksRef.current.onCameraZoomChange(editor.getCamera().z);
        if (syncingFromBoardRef.current) return;

        const shapes = editor
          .getCurrentPageShapesSorted()
          .filter(isBoardArtifactShape);
        const shapeByItemId = new Map(
          shapes.map((shape) => [getBoardItemFromShape(shape).id, shape])
        );
        const selectedShape = editor
          .getSelectedShapeIds()
          .map((shapeId) => editor.getShape(shapeId))
          .find((shape): shape is BoardArtifactShape =>
            Boolean(shape && isBoardArtifactShape(shape))
          );

        callbacksRef.current.onSelectItem(
          selectedShape ? getBoardItemFromShape(selectedShape).id : null
        );
        if (readOnly) return;

        callbacksRef.current.onBoardItemsChange((current) => {
          const page = current.pages.find(
            (candidate) => candidate.id === callbacksRef.current.activePageId
          );
          if (!page) return current;

          let changed = false;
          const nextItems = page.items.flatMap((item) => {
            const shape = shapeByItemId.get(item.id);
            if (!shape) {
              changed = true;
              return [];
            }

            const x = roundBoardCoordinate(shape.x);
            const y = roundBoardCoordinate(shape.y);
            const width = roundBoardCoordinate(
              clamp(shape.props.w, MIN_ITEM_WIDTH, MAX_ITEM_WIDTH)
            );
            const height = roundBoardCoordinate(
              clamp(shape.props.h, MIN_ITEM_HEIGHT, MAX_ITEM_HEIGHT)
            );

            if (
              item.x === x &&
              item.y === y &&
              item.width === width &&
              item.height === height
            ) {
              return [item];
            }

            changed = true;
            return [{ ...item, x, y, width, height }];
          });

          if (!changed) return current;
          return {
            ...current,
            pages: current.pages.map((candidate) =>
              candidate.id === page.id
                ? { ...candidate, items: nextItems }
                : candidate
            ),
          };
        });
      },
      { source: "all", scope: "all" }
    );
  }, [editor, readOnly]);

  return (
    <BoardTldrawContext.Provider value={contextValue}>
      <div className="board-tldraw-canvas h-full w-full">
        <Tldraw
          components={BOARD_TLDRAW_COMPONENTS}
          hideUi
          licenseKey={TLDRAW_LICENSE_KEY}
          onMount={(mountedEditor) => {
            setEditor(mountedEditor);
            onEditorChange(mountedEditor);
            onCameraZoomChange(mountedEditor.getCamera().z);
          }}
          shapeUtils={BOARD_TLDRAW_SHAPE_UTILS}
        />
      </div>
    </BoardTldrawContext.Provider>
  );
}

type BoardPrimitiveKind = Exclude<BoardItemKind, "drawing">;

type BoardPrimitiveDraft = {
  kind: BoardPrimitiveKind;
  title: string;
  content: string;
  ui?: string;
  url?: string;
  imageUrl?: string;
  accent?: string;
  author?: string;
  slides?: BoardSlide[];
  width: number;
  height: number;
};

const WEBSITE_STARTER_UI = `<main class="shell">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f7f6f2; color: #18181b; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .shell { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; padding: 28px; }
    nav { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 700; color: #52525b; }
    .mark { display: inline-flex; align-items: center; gap: 10px; color: #18181b; }
    .mark::before { content: ""; width: 28px; height: 28px; border-radius: 8px; background: #1f6397; box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.28); }
    section { align-self: center; display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 0.72fr); gap: 40px; align-items: center; padding: 48px 0 18px; }
    h1 { margin: 0; max-width: 760px; font-size: clamp(48px, 8vw, 104px); line-height: 0.92; letter-spacing: 0; }
    p { margin: 22px 0 0; max-width: 560px; color: #52525b; font-size: 18px; line-height: 1.65; }
    .panel { border: 1px solid rgb(24 24 27 / 0.10); border-radius: 20px; background: #ffffff; padding: 18px; box-shadow: 0 22px 54px -42px rgb(24 24 27 / 0.35); }
    .row { display: flex; justify-content: space-between; gap: 18px; border-bottom: 1px solid rgb(24 24 27 / 0.08); padding: 16px 2px; font-size: 14px; font-weight: 700; }
    .row:last-child { border-bottom: 0; }
    .muted { color: #71717a; font-weight: 600; }
    .cta { margin-top: 30px; display: inline-flex; align-items: center; border-radius: 999px; background: #18181b; color: white; padding: 12px 18px; font-size: 14px; font-weight: 800; text-decoration: none; }
    @media (max-width: 760px) { .shell { padding: 20px; } section { grid-template-columns: 1fr; gap: 28px; } h1 { font-size: 56px; } }
  </style>
  <nav><span class="mark">Canvas Site</span><span>Preview</span></nav>
  <section>
    <div>
      <h1>One sharp product story.</h1>
      <p>A static website draft generated inside the canvas. Replace this with the product, campaign, or prototype you want to share.</p>
      <a class="cta" href="#">Review draft</a>
    </div>
    <aside class="panel">
      <div class="row"><span>Hero</span><span class="muted">Ready</span></div>
      <div class="row"><span>Feature blocks</span><span class="muted">3 sections</span></div>
      <div class="row"><span>Publish path</span><span class="muted">Canvas URL</span></div>
    </aside>
  </section>
</main>`;

const PRIMITIVE_DRAFTS: Record<BoardPrimitiveKind, BoardPrimitiveDraft> = {
  diagram: {
    kind: "diagram",
    title: "System Flow",
    content:
      "flowchart TD\n  Idea[Idea] --> Canvas[Canvas]\n  Canvas --> Artifact[Artifact]\n  Artifact --> Share[Shareable output]",
    accent: "#1f6397",
    width: 640,
    height: 420,
  },
  website: {
    kind: "website",
    title: "Website Draft",
    content: "A static website draft generated inside the canvas.",
    ui: WEBSITE_STARTER_UI,
    url: "draft.local",
    accent: "#1f6397",
    width: 1120,
    height: 760,
  },
  slides: {
    kind: "slides",
    title: "Narrative Deck",
    content: "A concise presentation outline.",
    accent: "#1f6397",
    width: 960,
    height: 600,
    slides: [
      {
        eyebrow: "01",
        title: "Thesis",
        body: "The canvas is the shared surface where every artifact stays inspectable.",
        accent: "#1f6397",
      },
      {
        eyebrow: "02",
        title: "Primitives",
        bullets: ["Diagram", "Website", "Slides", "Document", "Image"],
        accent: "#1f6397",
      },
      {
        eyebrow: "03",
        title: "Publish",
        body: "Open the canvas or a single artifact as the final shareable object.",
        accent: "#1f6397",
      },
    ],
  },
  markdown: {
    kind: "markdown",
    title: "Working Doc",
    content:
      "# Working Doc\n\n## Context\nCapture the idea, constraints, and decisions here.\n\n## Next steps\n- Add supporting artifacts\n- Link source material\n- Decide what to publish",
    accent: "#52525b",
    width: 980,
    height: 620,
  },
  image: {
    kind: "image",
    title: "Image Reference",
    content: "Drop a source image URL into the card source or ask an agent to add one.",
    accent: "#334155",
    width: 560,
    height: 420,
  },
  text: {
    kind: "text",
    title: "Note",
    content: "A sharp note belongs here.",
    accent: "#fde68a",
    author: "Canvas note",
    width: 420,
    height: 300,
  },
};

const PRIMITIVE_COPY: Record<
  BoardPrimitiveKind,
  { label: string; noun: string; description: string }
> = {
  diagram: {
    label: "Diagram",
    noun: "flow",
    description: "Mermaid systems, flows, and maps",
  },
  website: {
    label: "Website",
    noun: "site",
    description: "Static HTML/CSS page preview",
  },
  slides: {
    label: "Slides",
    noun: "deck",
    description: "A focused presentation artifact",
  },
  markdown: {
    label: "Doc",
    noun: "doc",
    description: "Markdown notes and specs",
  },
  image: {
    label: "Image",
    noun: "reference",
    description: "Visual references and mockups",
  },
  text: {
    label: "Note",
    noun: "note",
    description: "Short written cards",
  },
};

const PRIMITIVE_KINDS: BoardPrimitiveKind[] = [
  "diagram",
  "website",
  "slides",
  "markdown",
  "image",
  "text",
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundBoardCoordinate(value: number) {
  return Math.round(value * 100) / 100;
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
  if (!item || (item.kind ?? "diagram") !== "diagram") return null;
  return item.diagramEditId ?? parseEditIdFromHref(item.editHref);
}

function getKindLabel(kind: BoardItemKind | undefined) {
  switch (kind ?? "diagram") {
    case "diagram":
      return "Diagram";
    case "website":
      return "Website";
    case "slides":
      return "Slides";
    case "markdown":
      return "Markdown";
    case "image":
      return "Image";
    case "text":
      return "Text";
    case "drawing":
      return "Drawing";
  }
}

function getKindIcon(kind: BoardItemKind | undefined, className = "size-4") {
  switch (kind ?? "diagram") {
    case "diagram":
      return <FileText className={className} />;
    case "website":
      return <Globe2 className={className} />;
    case "slides":
      return <Presentation className={className} />;
    case "markdown":
      return <FileText className={className} />;
    case "image":
      return <ImageIcon className={className} />;
    case "text":
      return <Type className={className} />;
    case "drawing":
      return <Brush className={className} />;
  }
}

function getBoardItemBodyClass(kind: BoardItemKind | undefined) {
  switch (kind ?? "diagram") {
    case "website":
    case "slides":
    case "markdown":
      return "p-0";
    case "drawing":
      return "p-2";
    case "diagram":
    case "image":
    case "text":
      return "p-3";
  }
}

function getKindSizePresets(kind: BoardItemKind | undefined) {
  switch (kind ?? "diagram") {
    case "website":
      return [
        { label: "Desktop", width: 1280, height: 820 },
        { label: "Wide", width: 1440, height: 900 },
        { label: "Tablet", width: 840, height: 720 },
      ];
    case "markdown":
      return [
        { label: "Page", width: 780, height: 980 },
        { label: "Spec", width: 920, height: 1100 },
        { label: "Wide", width: 1080, height: 860 },
      ];
    case "slides":
      return [
        { label: "16:9", width: 960, height: 600 },
        { label: "Present", width: 1280, height: 760 },
        { label: "Compact", width: 760, height: 500 },
      ];
    case "drawing":
      return [
        { label: "Board", width: 900, height: 620 },
        { label: "Wide", width: 1200, height: 720 },
        { label: "Small", width: 640, height: 420 },
      ];
    case "diagram":
      return [
        { label: "Default", width: 640, height: 420 },
        { label: "Wide", width: 960, height: 560 },
        { label: "Large", width: 1120, height: 720 },
      ];
    case "image":
      return [
        { label: "Frame", width: 720, height: 520 },
        { label: "Wide", width: 960, height: 560 },
        { label: "Square", width: 640, height: 640 },
      ];
    case "text":
      return [
        { label: "Note", width: 420, height: 300 },
        { label: "Tall", width: 420, height: 520 },
        { label: "Wide", width: 640, height: 320 },
      ];
  }
}

function getBoardItemPageHref({
  boardId,
  canEdit,
  editId,
  item,
}: {
  boardId?: string;
  canEdit: boolean;
  editId?: string;
  item: BoardItem;
}) {
  if (boardId) {
    return canEdit && editId
      ? `/be/${encodeURIComponent(editId)}/i/${encodeURIComponent(item.id)}`
      : `/b/${encodeURIComponent(boardId)}/i/${encodeURIComponent(item.id)}`;
  }

  if ((item.kind ?? "diagram") === "diagram") {
    return item.editHref ?? item.href;
  }

  return item.href ?? item.url;
}

function findBoardItemById(board: BoardDocument, itemId: string) {
  for (const page of board.pages) {
    const item = page.items.find((candidate) => candidate.id === itemId);
    if (item) return { page, item };
  }
  return null;
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
        kind: item.kind,
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
        url: item.url,
        imageUrl: item.imageUrl,
        accent: item.accent,
        author: item.author,
        slides: item.slides,
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
  const boardRootRef = useRef<HTMLDivElement>(null);
  const fittedPageRef = useRef<string | null>(null);
  const addParamRef = useRef<string | null>(null);
  const focusParamRef = useRef<string | null>(null);
  const chatParamRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSelectedPageRef = useRef<string | null>(null);
  const markdownUploadInputRef = useRef<HTMLInputElement>(null);
  const [board, setBoard] = useState<BoardDocument>(initialBoard);
  const [boardTitle, setBoardTitle] = useState(title);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    () => getActiveBoardPage(initialBoard)?.items[0]?.id ?? null
  );
  const [toolPanel, setToolPanel] = useState<"source" | "chat" | null>(null);
  const [chatPanelNonce, setChatPanelNonce] = useState(0);
  const [addError, setAddError] = useState<string | null>(null);
  const [refreshingItemId, setRefreshingItemId] = useState<string | null>(null);
  const [creatingPrimitive, setCreatingPrimitive] =
    useState<BoardPrimitiveKind | null>(null);
  const [uploadingMarkdown, setUploadingMarkdown] = useState(false);
  const [interactiveWebsiteItemId, setInteractiveWebsiteItemId] =
    useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [undoStack, setUndoStack] = useState<BoardDocument[]>([]);
  const [redoStack, setRedoStack] = useState<BoardDocument[]>([]);
  const [tldrawEditor, setTldrawEditor] = useState<Editor | null>(null);
  const [cameraZoom, setCameraZoom] = useState(1);
  const canEdit = !readOnly;
  const showCreateDock = useMediaQuery("(min-width: 768px)");

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
  const selectedItemLayerIndex = selectedItem
    ? (activePage?.items.findIndex((item) => item.id === selectedItem.id) ?? -1)
    : -1;
  const canSendSelectedToBack = selectedItemLayerIndex > 0;
  const canBringSelectedToFront = Boolean(
    activePage &&
      selectedItemLayerIndex >= 0 &&
      selectedItemLayerIndex < activePage.items.length - 1
  );
  const selectedDiagramEditId = useMemo(
    () =>
      canEdit ? getDiagramEditId(selectedItem) : null,
    [canEdit, selectedItem]
  );
  const toolPanelItem = selectedItem;
  const toolPanelDiagramEditId = selectedDiagramEditId;
  const chatSessionKey = "board";
  const toolPanelItemId = toolPanelItem?.id;
  const toolPanelItemKind = toolPanelItem?.kind;
  const toolPanelItemTitle = toolPanelItem?.title;
  const toolPanelBoardContext = useMemo(
    () =>
      boardId && editId
        ? {
            boardId,
            editId,
            boardTitle,
            ...(toolPanelItemId
              ? {
                  itemId: toolPanelItemId,
                  itemKind: toolPanelItemKind ?? "diagram",
                  itemTitle: toolPanelItemTitle,
                }
              : {}),
          }
        : undefined,
    [
      boardId,
      boardTitle,
      editId,
      toolPanelItemId,
      toolPanelItemKind,
      toolPanelItemTitle,
    ]
  );
  const canChatWithSelectedItem = Boolean(
    canEdit && selectedItem && (selectedDiagramEditId || (boardId && editId))
  );
  const canChatWithBoard = Boolean(canEdit && boardId && editId);
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
    if (!selectedItem && toolPanel === "source") setToolPanel(null);
  }, [selectedItem, toolPanel]);

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

  function openChatPanel({ reset = false }: { reset?: boolean } = {}) {
    if (!canChatWithBoard && !canChatWithSelectedItem) return false;

    if (isCompactViewport()) setSidebarOpen(false);
    setToolPanel("chat");
    if (reset) setChatPanelNonce((current) => current + 1);
    return true;
  }

  function closeToolPanel() {
    setToolPanel(null);
  }

  function showItemSettings(itemId: string) {
    setSelectedItemId(itemId);
    if (isCompactViewport()) setSidebarOpen(false);
  }

  function toggleToolPanel(panel: "source" | "chat") {
    if (toolPanel === panel) {
      closeToolPanel();
      return;
    }

    if (panel === "chat") {
      openChatPanel();
      return;
    }

    if (toolPanel !== panel && isCompactViewport()) setSidebarOpen(false);
    setToolPanel(panel);
  }

  function submitBottomChat(message: string) {
    sessionStorage.setItem(INITIAL_CHAT_KEY, message);
    const opened = openChatPanel({ reset: true });
    if (!opened) sessionStorage.removeItem(INITIAL_CHAT_KEY);
    return opened;
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
    if (!tldrawEditor) return;

    if (!page || page.items.length === 0) {
      tldrawEditor.resetZoom(undefined, { animation: { duration: 180 } });
      return;
    }

    requestAnimationFrame(() => {
      tldrawEditor.zoomToFit({ animation: { duration: 220 } });
    });
  }, [tldrawEditor]);

  const zoomBy = useCallback(
    (factor: number) => {
      if (!tldrawEditor) return;
      const camera = tldrawEditor.getCamera();
      tldrawEditor.setCamera(
        {
          ...camera,
          z: clamp(camera.z * factor, 0.16, 2.4),
        },
        { animation: { duration: 120 } }
      );
    },
    [tldrawEditor]
  );

  const resetZoom = useCallback(() => {
    tldrawEditor?.resetZoom(undefined, { animation: { duration: 160 } });
  }, [tldrawEditor]);

  useEffect(() => {
    const root = boardRootRef.current;
    if (!root) return;
    const boardRoot = root;

    function isBoardControlTarget(target: EventTarget | null) {
      return target instanceof Element && Boolean(target.closest("[data-board-control]"));
    }

    // tldraw and Excalidraw both keep zoom gestures on native non-passive
    // listeners. Our floating board chrome is outside tldraw's canvas listener,
    // so it needs the same browser-zoom shield.
    function onWheel(event: WheelEvent) {
      if (!(event.target instanceof Node) || !boardRoot.contains(event.target)) {
        return;
      }
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();
      if (isBoardControlTarget(event.target)) {
        event.stopImmediatePropagation();
      }
    }

    function onGesture(event: Event) {
      if (!(event.target instanceof Node) || !boardRoot.contains(event.target)) {
        return;
      }

      event.preventDefault();
      if (isBoardControlTarget(event.target)) {
        event.stopImmediatePropagation();
      }
    }

    root.addEventListener("wheel", onWheel, { capture: true, passive: false });
    document.addEventListener("gesturestart", onGesture, {
      capture: true,
      passive: false,
    });
    document.addEventListener("gesturechange", onGesture, {
      capture: true,
      passive: false,
    });
    document.addEventListener("gestureend", onGesture, {
      capture: true,
      passive: false,
    });

    return () => {
      root.removeEventListener("wheel", onWheel, { capture: true });
      document.removeEventListener("gesturestart", onGesture, { capture: true });
      document.removeEventListener("gesturechange", onGesture, { capture: true });
      document.removeEventListener("gestureend", onGesture, { capture: true });
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (key === "escape" && interactiveWebsiteItemId) {
        event.preventDefault();
        setInteractiveWebsiteItemId(null);
        return;
      }

      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;
      const target = event.target as HTMLElement | null;
      const isBoardControlTarget = Boolean(
        target?.closest("[data-board-control]")
      );

      const isZoomIn = key === "+" || key === "=";
      const isZoomOut = key === "-" || key === "_";
      const isZoomReset = key === "0";

      if (isZoomIn || isZoomOut || isZoomReset) {
        event.preventDefault();
        event.stopPropagation();
        if (isBoardControlTarget) return;
        if (isZoomReset) {
          resetZoom();
        } else {
          zoomBy(isZoomIn ? 1.15 : 0.85);
        }
        return;
      }

      if (!canEdit) return;

      if (
        target?.closest(
          "input, textarea, [contenteditable='true'], [data-board-control]"
        )
      ) {
        return;
      }

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
  }, [canEdit, interactiveWebsiteItemId, redoBoard, resetZoom, undoBoard, zoomBy]);

  useEffect(() => {
    if (!interactiveWebsiteItemId) return;
    if (selectedItemId === interactiveWebsiteItemId) return;
    setInteractiveWebsiteItemId(null);
  }, [interactiveWebsiteItemId, selectedItemId]);

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
      }
    },
    [acceptRemoteBoard, activePage, boardId, commitBoard, editId]
  );

  const createPrimitive = useCallback(
    async (kind: BoardPrimitiveKind) => {
      if (!canEdit || creatingPrimitive) return;

      const draft = PRIMITIVE_DRAFTS[kind];
      setAddError(null);
      setCreatingPrimitive(kind);
      setSaveState("saving");

      try {
        if (boardId && activePage) {
          const response = await fetch(`/api/b/${encodeURIComponent(boardId)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              kind === "diagram"
                ? {
                    editId,
                    title: draft.title,
                    content: draft.content,
                    pageId: activePage.id,
                    width: draft.width,
                    height: draft.height,
                  }
                : {
                    editId,
                    kind,
                    title: draft.title,
                    content: draft.content,
                    ui: draft.ui,
                    url: draft.url,
                    imageUrl: draft.imageUrl,
                    accent: draft.accent,
                    author: draft.author,
                    slides: draft.slides,
                    pageId: activePage.id,
                    width: draft.width,
                    height: draft.height,
                  }
            ),
          });

          if (!response.ok) {
            setAddError("Could not create artifact");
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

        if (kind === "diagram") {
          setAddError("Create a saved canvas before adding a diagram.");
          setSaveState("error");
          return;
        }

        let itemId: string | null = null;
        commitBoard((current) => {
          const result = addArtifactToBoardDocument(current, {
            kind: draft.kind as Exclude<BoardPrimitiveKind, "diagram">,
            title: draft.title,
            content: draft.content,
            url: draft.url,
            imageUrl: draft.imageUrl,
            accent: draft.accent,
            author: draft.author,
            slides: draft.slides,
            width: draft.width,
            height: draft.height,
          });
          itemId = result.itemId;
          return result.document;
        });
        if (itemId) setSelectedItemId(itemId);
      } catch {
        setAddError("Could not create artifact");
        setSaveState("error");
      } finally {
        setCreatingPrimitive(null);
      }
    },
    [
      acceptRemoteBoard,
      activePage,
      boardId,
      canEdit,
      commitBoard,
      creatingPrimitive,
      editId,
    ]
  );

  const importMarkdownFile = useCallback(
    async (file: File) => {
      if (!canEdit || uploadingMarkdown) return;

      setAddError(null);
      setUploadingMarkdown(true);
      setSaveState("saving");

      try {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Markdown files must be 5 MB or smaller.");
        }

        const content = await file.text();
        if (!content.trim()) {
          throw new Error("That markdown file is empty.");
        }

        const fallbackTitle = titleFromMarkdownFilename(file.name);
        const title = inferMarkdownTitle(content, fallbackTitle);
        const width = PRIMITIVE_DRAFTS.markdown.width;
        const height = PRIMITIVE_DRAFTS.markdown.height;

        if (boardId && activePage) {
          const response = await fetch(`/api/b/${encodeURIComponent(boardId)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              editId,
              kind: "markdown",
              title,
              content,
              pageId: activePage.id,
              width,
              height,
            }),
          });

          if (!response.ok) {
            throw new Error("Could not upload markdown");
          }

          const data = (await response.json()) as {
            state: unknown;
            itemId?: string | null;
          };
          acceptRemoteBoard(data.state, { itemId: data.itemId });
          return;
        }

        let itemId: string | null = null;
        commitBoard((current) => {
          const result = addArtifactToBoardDocument(current, {
            kind: "markdown",
            title,
            content,
            width,
            height,
          });
          itemId = result.itemId;
          return result.document;
        });
        if (itemId) setSelectedItemId(itemId);
        setSaveState("saved");
      } catch (cause) {
        setSaveState("error");
        setAddError(
          cause instanceof Error ? cause.message : "Could not upload markdown"
        );
      } finally {
        setUploadingMarkdown(false);
      }
    },
    [
      acceptRemoteBoard,
      activePage,
      boardId,
      canEdit,
      commitBoard,
      editId,
      uploadingMarkdown,
    ]
  );

  const openMarkdownUpload = useCallback(() => {
    if (!canEdit || uploadingMarkdown) return;
    markdownUploadInputRef.current?.click();
  }, [canEdit, uploadingMarkdown]);

  const handleMarkdownUploadChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) void importMarkdownFile(file);
    },
    [importMarkdownFile]
  );

  const saveItemSource = useCallback(
    async (item: BoardItem, content: string) => {
      const trimmed = content.trim();
      const kind = item.kind ?? "diagram";
      if (kind === "diagram" && !trimmed) {
        throw new Error("Mermaid source is required");
      }

      if (kind !== "diagram") {
        setSaveState("saving");
        commitBoard((current) =>
          updateBoardItem(current, item.id, {
            content,
            updatedAt: new Date().toISOString(),
          })
        );
        return;
      }

      const itemEditId = getDiagramEditId(item);
      let version = item.version;

      setSaveState("saving");

      if (itemEditId && item.diagramId) {
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
          href: item.diagramId
            ? `/d/${item.diagramId}?v=${version ?? 1}`
            : item.href,
          diagramEditId: itemEditId ?? item.diagramEditId,
          version,
          updatedAt: new Date().toISOString(),
        })
      );
    },
    [commitBoard]
  );

  const applyChatUpdate = useCallback(
    (itemId: string, updates: { content: string; title?: string }) => {
      commitBoard((current) => {
        const match = findBoardItemById(current, itemId);
        if (!match) return current;

        return updateBoardItem(current, itemId, {
          content: updates.content,
          title: updates.title?.trim() || match.item.title,
          updatedAt: new Date().toISOString(),
        });
      });
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
            href: item.diagramId
              ? `/d/${item.diagramId}?v=${result.version}`
              : item.href,
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
  const chatParam = searchParams.get("chat");
  useEffect(() => {
    if (!addParam || addParamRef.current === addParam) return;
    addParamRef.current = addParam;
    if (canEdit) {
      void addDiagramById(addParam).then(() => router.replace(pathname));
    }
  }, [addDiagramById, addParam, canEdit, pathname, router]);

  useEffect(() => {
    if (chatParam !== "true" || chatParamRef.current === chatParam) return;
    if (!canChatWithBoard) return;

    chatParamRef.current = chatParam;
    setSidebarOpen(false);
    setToolPanel("chat");

    const params = new URLSearchParams(searchParams.toString());
    params.delete("chat");
    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    window.history.replaceState(null, "", next);
  }, [
    canChatWithBoard,
    chatParam,
    pathname,
    searchParams,
  ]);

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
      if ((item.kind ?? "diagram") !== "diagram" || !item.diagramId) return;
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
      ref={boardRootRef}
    >
      <main className="absolute inset-0 overflow-hidden">
        <BoardTldrawCanvas
          activePage={activePage}
          boardId={boardId}
          canEdit={canEdit}
          editId={editId}
          interactiveWebsiteItemId={interactiveWebsiteItemId}
          onActivateContent={setInteractiveWebsiteItemId}
          onBoardItemsChange={(updater) =>
            commitBoard(updater, { recordHistory: false })
          }
          onCameraZoomChange={setCameraZoom}
          onCaptureUndoCheckpoint={captureUndoCheckpoint}
          onContentChange={(itemId, content) =>
            commitBoard((current) =>
              updateBoardItem(current, itemId, {
                content,
                updatedAt: new Date().toISOString(),
              })
            )
          }
          onEditorChange={setTldrawEditor}
          onSelectItem={(itemId) => {
            if (itemId) {
              showItemSettings(itemId);
            } else {
              setSelectedItemId(null);
            }
          }}
          onTitleChange={(itemId, title) =>
            commitBoard((current) => updateBoardItem(current, itemId, { title }))
          }
          readOnly={readOnly}
          selectedItemId={selectedItemId}
        />

        {activePage.items.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5">
            <EmptyCanvasState
              addError={addError}
              canEdit={canEdit}
              creatingKind={creatingPrimitive}
              onCreate={createPrimitive}
              onUploadMarkdown={openMarkdownUpload}
              pageName={activePage.name}
              uploadingMarkdown={uploadingMarkdown}
            />
          </div>
        ) : null}
      </main>

      {canEdit ? (
        <input
          accept=".md,.markdown,.mdown,.mkd,text/markdown,text/plain"
          className="hidden"
          onChange={handleMarkdownUploadChange}
          ref={markdownUploadInputRef}
          type="file"
        />
      ) : null}

      {canEdit && showCreateDock && !toolPanel && !sidebarOpen ? (
        <PrimitiveDock
          creatingKind={creatingPrimitive}
          onCreate={createPrimitive}
          onUploadMarkdown={openMarkdownUpload}
          uploadingMarkdown={uploadingMarkdown}
        />
      ) : null}

      {canChatWithBoard && toolPanel !== "chat" && !sidebarOpen ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-30 hidden justify-center px-3 md:flex"
          data-board-control
          data-board-floating="bottom-chat"
        >
          <BottomChatBar
            className="pointer-events-auto"
            onSubmit={submitBottomChat}
            placeholder="Ask AI to create on this canvas..."
          />
        </div>
      ) : null}

      {selectedItem && canEdit && !sidebarOpen ? (
        <BoardSelectionInspector
          canBringToFront={canBringSelectedToFront}
          canChat={canChatWithSelectedItem}
          canOpen={Boolean(
            getBoardItemPageHref({
              boardId,
              canEdit,
              editId,
              item: selectedItem,
            })
          )}
          canSendToBack={canSendSelectedToBack}
          item={selectedItem}
          onBringToFront={() =>
            commitBoard((current) =>
              moveBoardItemLayer(current, selectedItem.id, "front")
            )
          }
          onOpen={() => {
            const href = getBoardItemPageHref({
              boardId,
              canEdit,
              editId,
              item: selectedItem,
            });
            if (href && href !== "#") window.open(href, "_blank");
          }}
          onOpenChat={() => toggleToolPanel("chat")}
          onOpenSource={() => toggleToolPanel("source")}
          onRemove={() =>
            commitBoard((current) =>
              removeBoardItem(current, selectedItem.id)
            )
          }
          onSendToBack={() =>
            commitBoard((current) =>
              moveBoardItemLayer(current, selectedItem.id, "back")
            )
          }
          onSetSize={(width, height) =>
            commitBoard((current) =>
              updateBoardItem(current, selectedItem.id, {
                width: clamp(width, MIN_ITEM_WIDTH, MAX_ITEM_WIDTH),
                height: clamp(height, MIN_ITEM_HEIGHT, MAX_ITEM_HEIGHT),
              })
            )
          }
        />
      ) : null}

      <div
        className="pointer-events-none fixed left-4 top-[calc(env(safe-area-inset-top)+14px)] z-30"
        data-board-control
        data-board-floating="sidebar-toggle"
      >
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
        <div
          className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+68px)] z-20 flex justify-start md:inset-x-0 md:justify-center md:px-20"
          data-board-control
          data-board-floating="style-controls"
        >
          <BoardStyleControls
            activeToolPanel={toolPanel}
            canBringToFront={canBringSelectedToFront}
            canChat={canChatWithSelectedItem}
            canOpen={Boolean(
              getBoardItemPageHref({
                boardId,
                canEdit,
                editId,
                item: selectedItem,
              })
            )}
            canRefresh={Boolean(
              (selectedItem.kind ?? "diagram") === "diagram" &&
                selectedItem.diagramId &&
                selectedItem.href &&
                selectedItem.href !== "#"
            )}
            canSendToBack={canSendSelectedToBack}
            isRefreshing={refreshingItemId === selectedItem.id}
            item={selectedItem}
            onBringToFront={() =>
              commitBoard((current) =>
                moveBoardItemLayer(current, selectedItem.id, "front")
              )
            }
            onOpenDiagram={() => {
              const href = getBoardItemPageHref({
                boardId,
                canEdit,
                editId,
                item: selectedItem,
              });
              if (href && href !== "#") window.open(href, "_blank");
            }}
            onOpenChat={() => toggleToolPanel("chat")}
            onOpenSource={() => toggleToolPanel("source")}
            onRefresh={() => void refreshItem(selectedItem)}
            onRemove={() =>
              commitBoard((current) =>
                removeBoardItem(current, selectedItem.id)
              )
            }
            onSendToBack={() =>
              commitBoard((current) =>
                moveBoardItemLayer(current, selectedItem.id, "back")
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

      <div
        className="pointer-events-none fixed right-4 top-[calc(env(safe-area-inset-top)+14px)] z-20 flex items-center gap-2"
        data-board-control
        data-board-floating="top-actions"
      >
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

      <div
        className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-20 flex items-center justify-between gap-1 min-[360px]:gap-2 md:inset-x-auto md:left-4 md:bottom-[calc(env(safe-area-inset-bottom)+16px)] md:justify-start"
        data-board-control
        data-board-floating="bottom-controls"
      >
        <div
          className="board-floating-surface pointer-events-auto flex items-center gap-0.5 rounded-lg border p-1 backdrop-blur-md"
          data-board-floating="zoom-controls"
        >
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
            {Math.round(cameraZoom * 100)}%
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

        {canEdit && (undoStack.length > 0 || redoStack.length > 0) ? (
          <div className="board-floating-surface pointer-events-auto flex items-center gap-0.5 rounded-lg border p-1 backdrop-blur-md">
            {undoStack.length > 0 ? (
              <Button
                aria-label="Undo"
                onClick={undoBoard}
                size="icon-sm"
                title="Undo"
                type="button"
                variant="ghost"
              >
                <Undo2 />
              </Button>
            ) : null}
            {redoStack.length > 0 ? (
              <Button
                aria-label="Redo"
                onClick={redoBoard}
                size="icon-sm"
                title="Redo"
                type="button"
                variant="ghost"
              >
                <Redo2 />
              </Button>
            ) : null}
          </div>
        ) : null}
        <BoardHelpButton />
      </div>

      {toolPanel && (selectedItem || (toolPanel === "chat" && canChatWithBoard)) ? (
        <BoardToolPanel
          activePanel={toolPanel}
          boardContext={toolPanelBoardContext}
          canEdit={canEdit}
          chatPanelNonce={chatPanelNonce}
          chatSessionKey={chatSessionKey}
          diagramEditId={toolPanelDiagramEditId}
          item={toolPanelItem}
          onChatUpdate={(updates) => {
            const itemId = updates.itemId ?? toolPanelItem?.id;
            if (itemId) applyChatUpdate(itemId, updates);
          }}
          onChatResult={(result) => {
            if (result.state) {
              acceptRemoteBoard(result.state, {
                itemId: result.itemId ?? toolPanelItem?.id,
                recordHistory: false,
              });
              return;
            }
            if (typeof result.version === "number" && toolPanelItem) {
              applyChatResult(toolPanelItem, toolPanelDiagramEditId, {
                version: result.version,
                title: result.title,
              });
            }
          }}
          onClose={closeToolPanel}
          onSaveSource={(content) =>
            toolPanelItem ? saveItemSource(toolPanelItem, content) : Promise.resolve()
          }
          onSelectPanel={(panel) => {
            if (panel === "chat") {
              openChatPanel();
              return;
            }
            setToolPanel(panel);
          }}
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
            <div className="flex h-[54px] shrink-0 items-center gap-2 px-4">
              {isTitleEditing && canEdit ? (
                <input
                  aria-label="Workspace title"
                  autoFocus
                  className="board-notion-input h-8 min-w-0 flex-1 select-text rounded-md border px-2 text-[15px] font-semibold outline-none"
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
              ) : canEdit ? (
                <button
                  className="board-notion-title flex min-w-0 flex-1 items-center gap-1 rounded-md py-1 text-left text-[15px] font-semibold"
                  onClick={() => setIsTitleEditing(true)}
                  type="button"
                >
                  <span className="min-w-0 truncate">{boardTitle}</span>
                  <Pencil className="board-notion-title-icon size-3.5 shrink-0" />
                </button>
              ) : (
                <div className="board-notion-title min-w-0 flex-1 rounded-md py-1 text-[15px] font-semibold">
                  <span className="block min-w-0 truncate">{boardTitle}</span>
                </div>
              )}
              <button
                aria-label="Hide sidebar"
                className="board-notion-close inline-flex size-8 shrink-0 items-center justify-center rounded-md active:scale-[0.96]"
                onClick={() => setSidebarOpen(false)}
                type="button"
              >
                <ChevronsLeft className="size-5" />
              </button>
            </div>

            <div className="px-3 pb-3">
              <div className="mb-3 space-y-1">
                {canEdit && boardId ? (
                  <Link
                    className="board-notion-row flex h-9 min-w-0 items-center gap-2 rounded-md px-2.5 text-[15px] font-semibold"
                    href={`/b/${boardId}`}
                    onClick={() => {
                      if (isCompactViewport()) setSidebarOpen(false);
                    }}
                  >
                    <ExternalLink className="size-4 shrink-0 opacity-75" />
                    <span className="truncate">Public view</span>
                  </Link>
                ) : null}
                {selectedItem ? (
                  <>
                    {canChatWithSelectedItem ? (
                      <button
                        className="board-notion-row flex h-9 w-full min-w-0 items-center gap-2 rounded-md px-2.5 text-left text-[15px] font-semibold"
                        onClick={() => {
                          toggleToolPanel("chat");
                          if (isCompactViewport()) setSidebarOpen(false);
                        }}
                        type="button"
                      >
                        <Sparkles className="size-4 shrink-0 opacity-80" />
                        <span className="truncate">
                          Ask AI about selected card
                        </span>
                      </button>
                    ) : null}
                    <button
                      className="board-notion-row flex h-9 w-full min-w-0 items-center gap-2 rounded-md px-2.5 text-left text-[15px] font-semibold"
                      onClick={() => {
                        toggleToolPanel("source");
                        if (isCompactViewport()) setSidebarOpen(false);
                      }}
                      type="button"
                    >
                      <Code2 className="size-4 shrink-0 opacity-80" />
                      <span className="truncate">
                        {canEdit ? "Edit selected source" : "View selected source"}
                      </span>
                    </button>
                  </>
                ) : (
                  <p className="board-notion-muted px-2.5 py-1 text-xs leading-5">
                    Select a card to inspect its source or ask an agent to
                    revise it.
                  </p>
                )}
              </div>

              <label className="board-notion-row flex h-8 items-center gap-2 rounded-md px-2">
                <Search className="size-4 shrink-0 text-current" />
                <input
                  aria-label="Search board"
                  className="min-w-0 flex-1 select-text bg-transparent text-sm font-medium text-current outline-none placeholder:text-current/45"
                  onChange={(event) => setSidebarSearch(event.target.value)}
                  placeholder="Search"
                  value={sidebarSearch}
                />
              </label>
            </div>

            <div className="board-mobile-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-24">
              <section className="mb-5">
                <div className="mb-1 flex h-7 items-center justify-between px-1">
                  <span className="board-notion-section text-[0.72rem] font-semibold uppercase">
                    Pages
                  </span>
                  {canEdit ? (
                    <button
                      aria-label="Add page"
                      className="board-notion-row inline-flex size-7 items-center justify-center rounded-md"
                      onClick={() => {
                        fittedPageRef.current = null;
                        commitBoard(addBoardPage);
                      }}
                      type="button"
                    >
                      <Plus className="size-4" />
                    </button>
                  ) : null}
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
                <div className="board-notion-section mb-1 px-1 text-[0.72rem] font-semibold uppercase">
                  Artifacts
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
                      {getKindIcon(item.kind, "size-4 shrink-0 opacity-75")}
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {item.title}
                      </span>
                    </button>
                  ))}
                  {sidebarItems.length === 0 ? (
                    <p className="board-notion-muted px-2 py-1 text-sm">
                      No artifacts found.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="mb-5">
                <div className="board-notion-section mb-1 px-1 text-[0.72rem] font-semibold uppercase">
                  Recent diagrams
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
                <div className="board-notion-section mb-1 px-1 text-[0.72rem] font-semibold uppercase">
                  Workspace
                </div>
                <div className="board-notion-card rounded-xl border p-3">
                  <div className="board-notion-card-title flex items-center justify-between gap-2 text-sm font-semibold">
                    <span className="truncate">
                      {activePage.items.length} artifact
                      {activePage.items.length === 1 ? "" : "s"}
                    </span>
                    {canEdit && board.pages.length > 1 ? (
                      <button
                        aria-label="Delete current page"
                        className="board-notion-danger inline-flex size-7 items-center justify-center rounded-md active:scale-[0.96]"
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
                    Canvas pages, mixed artifact cards, and agent edits live in
                    this board.
                  </p>
                </div>
              </section>
            </div>

            <div className="board-notion-footer absolute inset-x-0 bottom-0 border-t p-3 backdrop-blur-xl">
              {addError ? (
                <p className="board-notion-error mb-2 rounded-md px-2 py-1.5 text-xs">
                  {addError}
                </p>
              ) : null}
              <div className="board-notion-footer-card rounded-lg border px-3 py-2">
                <p className="board-notion-footer-title text-xs font-semibold uppercase">
                  Agent workflow
                </p>
                <p className="board-notion-footer-text mt-1 text-xs leading-5">
                  Use Share to copy the agent prompt. Agents should read the
                  board first, then add or update cards through the board API.
                </p>
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
      className="board-floating-surface pointer-events-auto flex size-9 items-center justify-center rounded-lg border text-muted-foreground backdrop-blur-md hover:text-foreground active:scale-[0.96]"
      data-board-control
      onClick={() => setOpen(true)}
      type="button"
    >
      <HelpCircle className="size-4" />
    </button>
  );

  const content = <BoardHelpContent />;

  if (isDesktop) {
    return (
      <>
        {trigger}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogPopup className="sm:max-w-lg" showCloseButton={false}>
            <Button
              aria-label="Close help"
              className="absolute right-3 top-3"
              onClick={() => setOpen(false)}
              size="icon"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
            <DialogHeader>
              <DialogTitle>Workspace guide</DialogTitle>
              <DialogDescription>
                How agents should use this shared board.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel>{content}</DialogPanel>
          </DialogPopup>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerPopup showBar>
          <DrawerHeader>
            <DrawerTitle>Workspace guide</DrawerTitle>
            <DrawerDescription>
              How agents should use this shared board.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerPanel>{content}</DrawerPanel>
        </DrawerPopup>
      </Drawer>
    </>
  );
}

function PrimitiveDock({
  creatingKind,
  onCreate,
  onUploadMarkdown,
  uploadingMarkdown,
}: {
  creatingKind: BoardPrimitiveKind | null;
  onCreate: (kind: BoardPrimitiveKind) => void | Promise<void>;
  onUploadMarkdown: () => void;
  uploadingMarkdown: boolean;
}) {
  return (
    <div
      className="pointer-events-none fixed right-4 top-[calc(env(safe-area-inset-top)+68px)] z-20 hidden justify-end md:flex"
      data-board-control
      data-board-floating="create-dock"
    >
      <div className="board-primitive-dock pointer-events-auto flex max-h-[calc(100dvh-9rem)] w-[7.5rem] max-w-full flex-col gap-1.5 overflow-y-auto rounded-xl border p-2 backdrop-blur-md">
        <div className="flex h-7 w-full items-center px-2 text-[0.62rem] font-semibold uppercase text-muted-foreground">
          Create
        </div>
        <div className="h-px w-full shrink-0 bg-border/70" />
        {PRIMITIVE_KINDS.map((kind) => (
          <PrimitiveDockButton
            creating={creatingKind === kind}
            disabled={Boolean(creatingKind) || uploadingMarkdown}
            key={kind}
            kind={kind}
            onCreate={onCreate}
          />
        ))}
        <PrimitiveUploadDockButton
          disabled={Boolean(creatingKind)}
          onUpload={onUploadMarkdown}
          uploading={uploadingMarkdown}
        />
      </div>
    </div>
  );
}

function PrimitiveUploadDockButton({
  disabled,
  onUpload,
  uploading,
}: {
  disabled: boolean;
  onUpload: () => void;
  uploading: boolean;
}) {
  return (
    <button
      aria-label="Upload Markdown"
      className="board-primitive-button flex h-9 w-full shrink-0 items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled || uploading}
      onClick={onUpload}
      title="Upload Markdown"
      type="button"
    >
      {uploading ? (
        <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-current/20 border-t-current" />
      ) : (
        <Upload className="size-4 shrink-0" />
      )}
      <span className="min-w-0 truncate">Upload MD</span>
    </button>
  );
}

function PrimitiveDockButton({
  creating,
  disabled,
  kind,
  onCreate,
}: {
  creating: boolean;
  disabled: boolean;
  kind: BoardPrimitiveKind;
  onCreate: (kind: BoardPrimitiveKind) => void | Promise<void>;
}) {
  const copy = PRIMITIVE_COPY[kind];

  return (
    <button
      aria-label={`Create ${copy.label}`}
      className="board-primitive-button flex h-9 w-full shrink-0 items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled}
      onClick={() => void onCreate(kind)}
      title={`Create ${copy.label}`}
      type="button"
    >
      {creating ? (
        <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-current/20 border-t-current" />
      ) : (
        getKindIcon(kind, "size-4 shrink-0")
      )}
      <span className="min-w-0 truncate">{copy.label}</span>
    </button>
  );
}

function BoardSelectionInspector({
  canBringToFront,
  canChat,
  canOpen,
  canSendToBack,
  item,
  onBringToFront,
  onOpen,
  onOpenChat,
  onOpenSource,
  onRemove,
  onSendToBack,
  onSetSize,
}: {
  canBringToFront: boolean;
  canChat: boolean;
  canOpen: boolean;
  canSendToBack: boolean;
  item: BoardItem;
  onBringToFront: () => void;
  onOpen: () => void;
  onOpenChat: () => void;
  onOpenSource: () => void;
  onRemove: () => void;
  onSendToBack: () => void;
  onSetSize: (width: number, height: number) => void;
}) {
  const presets = getKindSizePresets(item.kind);

  return (
    <div
      className="pointer-events-none fixed left-4 top-[calc(env(safe-area-inset-top)+66px)] z-20 hidden w-[19rem] md:block"
      data-board-control
      data-board-floating="selection-inspector"
    >
      <div className="board-floating-surface pointer-events-auto rounded-xl border p-2 shadow-lg backdrop-blur-md">
        <div className="flex items-start gap-2 px-1.5 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {getKindIcon(item.kind, "size-4")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {getKindLabel(item.kind)} · {Math.round(item.width)} ×{" "}
              {Math.round(item.height)}
            </p>
          </div>
        </div>

        <div className="my-1 h-px bg-border/70" />

        <div className="grid grid-cols-3 gap-1 p-1">
          <Button
            aria-label="Open source"
            className="justify-center"
            onClick={onOpenSource}
            size="sm"
            title="Open source"
            variant="ghost"
          >
            <Code2 />
            Source
          </Button>
          {canChat ? (
            <Button
              aria-label="Open AI"
              className="justify-center"
              onClick={onOpenChat}
              size="sm"
              title="Open AI"
              variant="ghost"
            >
              <Bot />
              AI
            </Button>
          ) : null}
          {canOpen ? (
            <Button
              aria-label="Open artifact"
              className="justify-center"
              onClick={onOpen}
              size="sm"
              title="Open artifact"
              variant="ghost"
            >
              <ExternalLink />
              Open
            </Button>
          ) : null}
        </div>

        <div className="px-1 py-1">
          <p className="px-1 text-[0.68rem] font-semibold uppercase text-muted-foreground">
            Size
          </p>
          <div className="mt-1 grid grid-cols-3 gap-1">
            {presets.map((preset) => (
              <button
                className="rounded-md border border-border/70 px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                key={preset.label}
                onClick={() => onSetSize(preset.width, preset.height)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="my-1 h-px bg-border/70" />

        <div className="grid grid-cols-2 gap-1 p-1">
          <Button
            aria-label="Send to back"
            disabled={!canSendToBack}
            onClick={onSendToBack}
            size="sm"
            title="Send to back"
            variant="ghost"
          >
            <SendToBack />
            Back
          </Button>
          <Button
            aria-label="Bring to front"
            disabled={!canBringToFront}
            onClick={onBringToFront}
            size="sm"
            title="Bring to front"
            variant="ghost"
          >
            <BringToFront />
            Front
          </Button>
        </div>

        <Button
          aria-label="Delete selected artifact"
          className="mt-1 w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
          size="sm"
          title="Delete selected artifact"
          variant="ghost"
        >
          <Trash2 />
          Delete artifact
        </Button>
      </div>
    </div>
  );
}

function EmptyCanvasState({
  addError,
  canEdit,
  creatingKind,
  onCreate,
  onUploadMarkdown,
  pageName,
  uploadingMarkdown,
}: {
  addError: string | null;
  canEdit: boolean;
  creatingKind: BoardPrimitiveKind | null;
  onCreate: (kind: BoardPrimitiveKind) => void | Promise<void>;
  onUploadMarkdown: () => void;
  pageName: string;
  uploadingMarkdown: boolean;
}) {
  return (
    <div
      className="pointer-events-auto w-full max-w-4xl text-center"
      data-board-control
    >
      <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border border-border/65 bg-background/80 text-muted-foreground shadow-sm">
        <Layers3 className="size-6" />
      </div>
      <p className="text-sm font-semibold text-muted-foreground">{pageName}</p>
      <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-semibold text-foreground text-balance">
        Start with a primitive, then let the canvas become the deliverable
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground text-pretty">
        Create a diagram, website, deck, document, image, or note. Every object
        keeps the same canvas chrome, source panel, AI path, and shareable item
        page.
      </p>
      <div className="mt-6 flex justify-center">
        <button
          className="board-empty-primitive inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55"
          disabled={!canEdit || Boolean(creatingKind) || uploadingMarkdown}
          onClick={onUploadMarkdown}
          type="button"
        >
          {uploadingMarkdown ? (
            <span className="size-4 animate-spin rounded-full border-2 border-current/20 border-t-current" />
          ) : (
            <Upload className="size-4" />
          )}
          Upload markdown
        </button>
      </div>
      <div className="mx-auto mt-7 grid max-w-3xl gap-2 text-left sm:grid-cols-2 lg:grid-cols-4">
        {PRIMITIVE_KINDS.map((kind) => {
          const copy = PRIMITIVE_COPY[kind];
          return (
            <button
              aria-label={`Create ${copy.label}`}
              className="board-empty-primitive min-h-24 rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-55"
              disabled={!canEdit || Boolean(creatingKind) || uploadingMarkdown}
              key={kind}
              onClick={() => void onCreate(kind)}
              type="button"
            >
              <span className="mb-3 flex size-8 items-center justify-center rounded-lg">
                {creatingKind === kind ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-current/20 border-t-current" />
                ) : (
                  getKindIcon(kind, "size-4")
                )}
              </span>
              <span className="block text-sm font-semibold">{copy.label}</span>
              <span className="mt-1 block text-xs leading-5">
                {copy.description}
              </span>
            </button>
          );
        })}
      </div>
      {addError ? (
        <p className="mt-4 text-xs text-destructive">{addError}</p>
      ) : null}
    </div>
  );
}

function BoardHelpContent() {
  const items = [
    {
      icon: <HelpCircle className="size-4" />,
      title: "What this is",
      body: "A canvas has pages. Diagrams, websites, decks, documents, images, and notes stay as movable artifact cards.",
    },
    {
      icon: <Share2 className="size-4" />,
      title: "Share with agents",
      body: "Use Connect AI agent > Copy agent prompt. It includes the board link, edit access, API endpoints, and the rule to place new cards without overlap.",
    },
    {
      icon: <Bot className="size-4" />,
      title: "How agents should work",
      body: "Agents should read the board state first, publish artifacts through the board API, and keep everything on this shared surface.",
    },
    {
      icon: <Layers3 className="size-4" />,
      title: "Shared board model",
      body: "The canvas autosaves page layout, artifact content, and style so the canvas can become the deliverable.",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-foreground/10 bg-foreground/[0.035] p-3">
        <p className="text-sm font-semibold text-foreground">
          One canvas, every artifact.
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Think of this like a lightweight infinite canvas for agents and humans.
          The canvas is the primitive; every output is an object inside it.
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
  boardContext,
  canEdit,
  chatPanelNonce,
  chatSessionKey,
  diagramEditId,
  item,
  onChatResult,
  onChatUpdate,
  onClose,
  onSaveSource,
  onSelectPanel,
}: {
  activePanel: "source" | "chat";
  boardContext?: {
    boardId: string;
    editId: string;
    itemId?: string;
    itemKind?: string;
    boardTitle?: string;
    itemTitle?: string;
  };
  canEdit: boolean;
  chatPanelNonce: number;
  chatSessionKey: string;
  diagramEditId: string | null;
  item: BoardItem | null;
  onChatResult: (result: {
    version?: number;
    title?: string;
    itemId?: string;
    boardUpdated?: boolean;
    label?: string;
    state?: unknown;
    toolName?: string;
  }) => void;
  onChatUpdate: (updates: {
    content: string;
    title?: string;
    itemId?: string;
  }) => void;
  onClose: () => void;
  onSaveSource: (content: string) => Promise<void>;
  onSelectPanel: (panel: "source" | "chat") => void;
}) {
  if (activePanel === "chat") {
    if ((diagramEditId && item?.diagramId) || boardContext) {
      return (
        <div
          className="contents"
          data-board-control
          data-board-floating="chat-panel"
        >
          <DiagramChatPanel
            className="fixed inset-0 z-40 flex flex-col bg-[var(--diagram-chat-sidebar-bg)] backdrop-blur-xl animate-in slide-in-from-right-2 duration-200 md:inset-y-0 md:left-auto md:right-0 md:w-[400px] lg:w-[420px] md:shrink-0 md:border-l md:border-[var(--diagram-chat-frame-border)]"
            boardContext={boardContext}
            content={item?.content ?? ""}
            diagramId={item?.diagramId}
            editId={diagramEditId ?? undefined}
            key={`${chatSessionKey}:${chatPanelNonce}`}
            onClose={onClose}
            onOptimisticUpdate={onChatUpdate}
            onToolResult={onChatResult}
            open
          />
        </div>
      );
    }

    return (
      <aside
        className="fixed inset-0 z-40 flex flex-col bg-[var(--diagram-chat-sidebar-bg)] backdrop-blur-xl md:inset-y-0 md:left-auto md:right-0 md:w-[400px] lg:w-[420px] md:border-l md:border-[var(--diagram-chat-frame-border)]"
        data-board-control
        data-board-floating="chat-unavailable-panel"
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

  if (!item) return null;

  return (
    <aside
      className="board-floating-surface pointer-events-auto fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-30 flex h-[min(72dvh,38rem)] flex-col overflow-hidden rounded-lg border backdrop-blur-md md:inset-x-auto md:bottom-auto md:right-4 md:top-[calc(env(safe-area-inset-top)+64px)] md:h-[calc(100dvh-92px)] md:w-[28rem]"
      data-board-control
      data-board-floating="source-panel"
    >
      <BoardSourceEditor
        canEdit={canEdit}
        item={item}
        onClose={onClose}
        onSaveSource={onSaveSource}
        onSelectChat={
          diagramEditId || boardContext ? () => onSelectPanel("chat") : undefined
        }
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
  const sourceLabel =
    (item.kind ?? "diagram") === "diagram"
      ? "Mermaid source"
      : `${getKindLabel(item.kind)} content`;

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
            <p className="truncate text-sm font-semibold">{sourceLabel}</p>
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
          aria-label={sourceLabel}
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
  itemPageHref,
  isContentInteractive,
  isSelected,
  onActivateContent,
  onCardPointerDown,
  onContentChange,
  onTitleChange,
}: {
  canEdit: boolean;
  item: BoardItem;
  itemPageHref?: string;
  isContentInteractive: boolean;
  isSelected: boolean;
  onActivateContent: () => void;
  onCardPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
}) {
  const isMarkdown = (item.kind ?? "diagram") === "markdown";

  return (
    <article
      className={cn(
        "board-diagram-card board-artifact-card h-full w-full overflow-visible rounded-lg border text-zinc-950",
        isSelected ? "board-selected-card" : "border-transparent",
        canEdit ? "cursor-grab active:cursor-grabbing" : ""
      )}
      data-board-item
      data-board-selected={isSelected ? "true" : undefined}
      onPointerDown={onCardPointerDown}
      style={{
        touchAction: canEdit ? "none" : "auto",
      }}
    >
      <div className="board-artifact-frame flex h-full w-full flex-col overflow-hidden rounded-lg">
        {isMarkdown ? null : (
          <div
            className={`board-artifact-header flex h-10 items-center gap-2 border-b px-2 ${
              isSelected
                ? "board-selected-header"
                : ""
            }`}
            data-board-drag-handle
          >
            <input
              aria-label={`${getKindLabel(item.kind)} title`}
              className="board-artifact-title-input min-w-0 flex-1 select-text bg-transparent text-sm font-semibold outline-none"
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
            <span className="board-artifact-kind-chip inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase text-zinc-500">
              {getKindIcon(item.kind, "size-3")}
              {getKindLabel(item.kind)}
            </span>
          </div>
        )}

        <div
          className={`board-artifact-body min-h-0 flex-1 ${getBoardItemBodyClass(item.kind)} ${
            isSelected ? "board-selected-body" : ""
          }`}
        >
          <BoardArtifactPreview
            canEdit={canEdit}
            isContentInteractive={isContentInteractive}
            isSelected={isSelected}
            item={item}
            itemPageHref={itemPageHref}
            onActivateContent={onActivateContent}
            onContentChange={onContentChange}
            onTitleChange={onTitleChange}
          />
        </div>
      </div>
    </article>
  );
}

function BoardArtifactPreview({
  canEdit,
  isContentInteractive,
  isSelected,
  item,
  itemPageHref,
  onActivateContent,
  onContentChange,
  onTitleChange,
}: {
  canEdit: boolean;
  isContentInteractive: boolean;
  isSelected: boolean;
  item: BoardItem;
  itemPageHref?: string;
  onActivateContent: () => void;
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
}) {
  const kind = item.kind ?? "diagram";

  if (kind === "diagram") {
    return (
      <MermaidPreview
        content={item.content}
        look={item.look}
        renderer={item.renderer}
        theme={item.theme}
        uiMode="light"
      />
    );
  }

  if (kind === "website") {
    return (
      <WebsitePreview
        canEdit={canEdit}
        isContentInteractive={isContentInteractive}
        item={item}
        onActivateContent={onActivateContent}
      />
    );
  }
  if (kind === "slides") return <SlidesPreview item={item} />;
  if (kind === "markdown") {
    return (
      <MarkdownPreview
        canEdit={canEdit}
        item={item}
        itemPageHref={itemPageHref}
        onTitleChange={onTitleChange}
      />
    );
  }
  if (kind === "image") return <ImagePreview item={item} />;
  if (kind === "drawing") {
    return (
      <DrawingPreview
        canEdit={canEdit}
        content={item.content}
        isSelected={isSelected}
        key={item.content}
        onChange={onContentChange}
      />
    );
  }

  return <TextPreview item={item} />;
}

function WebsitePreview({
  canEdit,
  isContentInteractive,
  item,
  onActivateContent,
}: {
  canEdit: boolean;
  isContentInteractive: boolean;
  item: BoardItem;
  onActivateContent: () => void;
}) {
  const accent = item.accent ?? "#111827";
  const host = item.url
    ? item.url.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : "draft.local";
  const hasCustomUi = hasHtmlContent(item.content);
  const iframeCanReceivePointer = !canEdit || isContentInteractive;

  return (
    <div className="board-preview-browser flex h-full min-h-0 flex-col overflow-hidden rounded-md border text-zinc-950">
      <div className="board-preview-browser-bar flex h-9 shrink-0 items-center gap-2 border-b px-3">
        <div className="flex gap-1">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="min-w-0 flex-1 truncate rounded-md bg-zinc-100 px-2.5 py-1 text-[0.7rem] font-medium text-zinc-500">
          {host}
        </div>
      </div>
      {hasCustomUi ? (
        <div className="relative min-h-0 flex-1">
          <SanitizedUiFrame
            className={`h-full w-full border-0 bg-white ${
              iframeCanReceivePointer ? "" : "pointer-events-none"
            }`}
            content={item.content}
            title={item.title}
          />
          {canEdit && !isContentInteractive ? (
            <div
              aria-label="Interact with website preview"
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
              data-board-content-activator
              onClick={(event) => {
                const card = event.currentTarget.closest("[data-board-item]");
                if (
                  card instanceof HTMLElement &&
                  card.dataset.boardDragged === "true"
                ) {
                  return;
                }
                onActivateContent();
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onActivateContent();
              }}
              role="button"
              tabIndex={0}
            />
          ) : null}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="board-preview-shell flex min-h-full flex-col overflow-hidden rounded-md border">
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-200 px-4 text-[0.68rem] font-semibold uppercase text-zinc-500">
              <span className="min-w-0 truncate">{item.title}</span>
              <span className="shrink-0">Preview</span>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-[1.15fr_0.85fr] gap-4 p-5">
              <div className="flex min-w-0 flex-col justify-end">
                <div
                  className="mb-4 h-1 w-14 rounded-full"
                  style={{ backgroundColor: accent }}
                />
                <p className="mb-3 max-w-[18rem] text-3xl font-semibold leading-none">
                  {item.title}
                </p>
                <p className="line-clamp-4 text-sm leading-6 text-zinc-600">
                  {item.content}
                </p>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-md bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white">
                    Ship
                  </span>
                  <span className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    Review
                  </span>
                </div>
              </div>
              <div className="grid min-h-0 content-end gap-2">
                {[0, 1, 2].map((index) => (
                  <div
                    className="rounded-md border border-zinc-200 bg-white p-3"
                    key={index}
                  >
                    <div className="mb-2 h-2 w-16 rounded-full bg-zinc-300" />
                    <div className="h-2 rounded-full bg-zinc-200" />
                    <div className="mt-1.5 h-2 w-2/3 rounded-full bg-zinc-100" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SlidesPreview({ item }: { item: BoardItem }) {
  const [index, setIndex] = useState(0);
  const slides = slidesForItem(item);
  const accent = item.accent ?? "#2563eb";
  const slide = slides[index] ?? slides[0];

  function moveSlide(delta: number) {
    setIndex((current) => (current + delta + slides.length) % slides.length);
  }

  return (
    <div className="relative flex h-full overflow-hidden rounded-md bg-[#08090b] text-white">
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <article className="relative flex min-h-0 flex-1 items-center justify-center">
          <SlideArtifactFrame
            accent={accent}
            deckTitle={item.title}
            index={index}
            slide={slide}
            slideCount={slides.length}
            variant="preview"
          />
        </article>
        {slides.length > 1 ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <Button
              aria-label="Previous slide"
              data-board-control
              onClick={() => moveSlide(-1)}
              size="icon-sm"
              variant="secondary"
            >
              <ArrowRight className="rotate-180" />
            </Button>
            <div className="flex min-w-0 flex-1 justify-center gap-1.5">
              {slides.map((candidate, candidateIndex) => (
                <button
                  aria-label={`Go to slide ${candidateIndex + 1}`}
                  aria-pressed={candidateIndex === index}
                  className={`h-1.5 rounded-full transition-[width,background-color] ${
                    candidateIndex === index ? "w-8 bg-white" : "w-3 bg-white/28"
                  }`}
                  data-board-control
                  key={`${candidate.title}-${candidateIndex}`}
                  onClick={() => setIndex(candidateIndex)}
                  type="button"
                />
              ))}
            </div>
            <Button
              aria-label="Next slide"
              data-board-control
              onClick={() => moveSlide(1)}
              size="icon-sm"
              variant="secondary"
            >
              <ArrowRight />
            </Button>
          </div>
        ) : null}
      </div>
      <div className="hidden w-40 shrink-0 border-l border-white/10 bg-white/[0.035] p-2 md:grid md:content-start md:gap-2">
        {slides.map((candidate, candidateIndex) => (
          <button
            aria-pressed={candidateIndex === index}
            className={`rounded-md border p-2 text-left ${
              candidateIndex === index
                ? "border-white/30 bg-white/12 text-white"
                : "border-white/10 bg-white/[0.035] text-white/62 hover:bg-white/[0.08] hover:text-white"
            }`}
            data-board-control
            key={`${candidate.title}-${candidateIndex}`}
            onClick={() => setIndex(candidateIndex)}
            type="button"
          >
            <p className="mb-1 text-[0.65rem] font-bold uppercase opacity-55">
              {`${candidateIndex + 1}`.padStart(2, "0")}
            </p>
            <p className="line-clamp-2 text-xs font-semibold">
              {candidate.title}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function MarkdownPreview({
  canEdit,
  item,
  itemPageHref,
  onTitleChange,
}: {
  canEdit: boolean;
  item: BoardItem;
  itemPageHref?: string;
  onTitleChange: (title: string) => void;
}) {
  return (
    <div className="h-full bg-[#f4f0ea] p-0 text-zinc-950">
      <MarkdownReport
        canEditTitle={canEdit}
        className="rounded-lg border-0"
        content={item.content}
        href={itemPageHref}
        onTitleChange={onTitleChange}
        preview
        title={item.title}
      />
    </div>
  );
}

function ImagePreview({ item }: { item: BoardItem }) {
  return (
    <div className="relative h-full overflow-hidden rounded-md bg-zinc-950 text-white">
      <div
        className="h-full w-full bg-cover bg-center"
        role={item.imageUrl ? "img" : undefined}
        aria-label={item.imageUrl ? item.title : undefined}
        style={{
          backgroundColor: item.imageUrl ? undefined : (item.accent ?? "#18181b"),
          backgroundImage: item.imageUrl ? `url("${item.imageUrl}")` : undefined,
        }}
      />
      <div className="absolute inset-x-0 bottom-0 bg-zinc-950/82 p-4">
        <p className="text-lg font-semibold leading-tight">{item.title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/72">
          {item.content}
        </p>
      </div>
    </div>
  );
}

function TextPreview({ item }: { item: BoardItem }) {
  return (
    <div
      className="flex h-full flex-col justify-between overflow-hidden rounded-md border border-zinc-950/10 p-5 text-zinc-950"
      style={{
        backgroundColor: item.accent ?? "#fde68a",
      }}
    >
      <StickyNote className="size-6 opacity-45" />
      <p className="text-2xl font-semibold leading-tight">
        {item.content}
      </p>
      <p className="text-xs font-bold uppercase text-zinc-700/60">
        {item.author ?? "Team note"}
      </p>
    </div>
  );
}

type DrawingPoint = [number, number];
type DrawingTool = "select" | "pen" | "rectangle" | "ellipse" | "line" | "arrow";
type DrawingElementType = "freedraw" | "rectangle" | "ellipse" | "line" | "arrow";

type DrawingElement = {
  id: string;
  type: DrawingElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: DrawingPoint[];
  stroke: string;
  fill: string;
  strokeWidth: number;
};

type DrawingScene = {
  version: 2;
  elements: DrawingElement[];
};

const DRAWING_TOOLS: DrawingTool[] = [
  "select",
  "pen",
  "rectangle",
  "ellipse",
  "line",
  "arrow",
];
const DRAWING_COLORS = ["#18181b", "#1f6397", "#dc2626", "#16a34a"];
const DRAWING_WIDTHS = [3, 6, 10];

function createDrawingElementId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `draw_${crypto.randomUUID()}`;
  }
  return `draw_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function normalizeDrawingPoint(value: unknown): DrawingPoint | null {
  if (
    !Array.isArray(value) ||
    typeof value[0] !== "number" ||
    typeof value[1] !== "number" ||
    !Number.isFinite(value[0]) ||
    !Number.isFinite(value[1])
  ) {
    return null;
  }

  return [value[0], value[1]];
}

function boundsForPoints(points: DrawingPoint[]) {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function normalizeDrawingElement(value: unknown): DrawingElement | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<DrawingElement>;
  const type = candidate.type;
  if (
    type !== "freedraw" &&
    type !== "rectangle" &&
    type !== "ellipse" &&
    type !== "line" &&
    type !== "arrow"
  ) {
    return null;
  }

  const x =
    typeof candidate.x === "number" && Number.isFinite(candidate.x)
      ? candidate.x
      : 0;
  const y =
    typeof candidate.y === "number" && Number.isFinite(candidate.y)
      ? candidate.y
      : 0;
  const width =
    typeof candidate.width === "number" && Number.isFinite(candidate.width)
      ? candidate.width
      : 0;
  const height =
    typeof candidate.height === "number" && Number.isFinite(candidate.height)
      ? candidate.height
      : 0;
  const points = Array.isArray(candidate.points)
    ? candidate.points
        .map(normalizeDrawingPoint)
        .filter((point): point is DrawingPoint => Boolean(point))
    : undefined;

  return {
    id: typeof candidate.id === "string" ? candidate.id : createDrawingElementId(),
    type,
    x,
    y,
    width,
    height,
    points,
    stroke: typeof candidate.stroke === "string" ? candidate.stroke : "#18181b",
    fill: typeof candidate.fill === "string" ? candidate.fill : "transparent",
    strokeWidth:
      typeof candidate.strokeWidth === "number" &&
      Number.isFinite(candidate.strokeWidth)
        ? candidate.strokeWidth
        : 6,
  };
}

function parseDrawingScene(content: string): DrawingScene {
  try {
    const value = JSON.parse(content);

    if (Array.isArray(value)) {
      const elements = value.flatMap((stroke): DrawingElement[] => {
        if (!Array.isArray(stroke)) return [];
        const points = stroke
          .map(normalizeDrawingPoint)
          .filter((point): point is DrawingPoint => Boolean(point));
        if (points.length === 0) return [];
        return [
          {
            id: createDrawingElementId(),
            type: "freedraw",
            ...boundsForPoints(points),
            points,
            stroke: "#18181b",
            fill: "transparent",
            strokeWidth: 8,
          },
        ];
      });
      return { version: 2, elements };
    }

    if (value && typeof value === "object") {
      const elements = Array.isArray((value as { elements?: unknown }).elements)
        ? (value as { elements: unknown[] }).elements
            .map(normalizeDrawingElement)
            .filter((element): element is DrawingElement => Boolean(element))
        : [];
      return { version: 2, elements };
    }
  } catch {
    return { version: 2, elements: [] };
  }

  return { version: 2, elements: [] };
}

function elementBounds(element: DrawingElement) {
  if (element.type === "freedraw" && element.points?.length) {
    return boundsForPoints(element.points);
  }

  if (element.type === "line" || element.type === "arrow") {
    const x2 = element.x + element.width;
    const y2 = element.y + element.height;
    return {
      x: Math.min(element.x, x2),
      y: Math.min(element.y, y2),
      width: Math.max(1, Math.abs(element.width)),
      height: Math.max(1, Math.abs(element.height)),
    };
  }

  return {
    x: Math.min(element.x, element.x + element.width),
    y: Math.min(element.y, element.y + element.height),
    width: Math.max(1, Math.abs(element.width)),
    height: Math.max(1, Math.abs(element.height)),
  };
}

function isPointInDrawingElement(point: DrawingPoint, element: DrawingElement) {
  const bounds = elementBounds(element);
  const padding = Math.max(12, element.strokeWidth * 2);

  return (
    point[0] >= bounds.x - padding &&
    point[0] <= bounds.x + bounds.width + padding &&
    point[1] >= bounds.y - padding &&
    point[1] <= bounds.y + bounds.height + padding
  );
}

function createShapeElement({
  end,
  fill,
  start,
  stroke,
  strokeWidth,
  tool,
}: {
  end: DrawingPoint;
  fill: string;
  start: DrawingPoint;
  stroke: string;
  strokeWidth: number;
  tool: Exclude<DrawingTool, "select" | "pen">;
}): DrawingElement {
  if (tool === "line" || tool === "arrow") {
    return {
      id: createDrawingElementId(),
      type: tool,
      x: start[0],
      y: start[1],
      width: end[0] - start[0],
      height: end[1] - start[1],
      stroke,
      fill: "transparent",
      strokeWidth,
    };
  }

  return {
    id: createDrawingElementId(),
    type: tool,
    x: Math.min(start[0], end[0]),
    y: Math.min(start[1], end[1]),
    width: Math.abs(end[0] - start[0]),
    height: Math.abs(end[1] - start[1]),
    stroke,
    fill,
    strokeWidth,
  };
}

function isDrawableElement(element: DrawingElement) {
  if (element.type === "freedraw") return (element.points?.length ?? 0) > 1;
  const bounds = elementBounds(element);
  return bounds.width > 4 || bounds.height > 4;
}

function arrowHeadPoints(element: DrawingElement) {
  const end: DrawingPoint = [
    element.x + element.width,
    element.y + element.height,
  ];
  const angle = Math.atan2(element.height, element.width);
  const length = Math.max(16, element.strokeWidth * 3);
  const wing = length * 0.55;
  const left: DrawingPoint = [
    end[0] - Math.cos(angle) * length + Math.cos(angle + Math.PI / 2) * wing,
    end[1] - Math.sin(angle) * length + Math.sin(angle + Math.PI / 2) * wing,
  ];
  const right: DrawingPoint = [
    end[0] - Math.cos(angle) * length + Math.cos(angle - Math.PI / 2) * wing,
    end[1] - Math.sin(angle) * length + Math.sin(angle - Math.PI / 2) * wing,
  ];

  return [end, left, right].map((point) => point.join(",")).join(" ");
}

function renderDrawingElement(element: DrawingElement) {
  const common = {
    stroke: element.stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: element.strokeWidth,
  };

  if (element.type === "freedraw") {
    return (
      <polyline
        fill="none"
        key={element.id}
        points={(element.points ?? []).map((point) => point.join(",")).join(" ")}
        {...common}
      />
    );
  }

  if (element.type === "rectangle") {
    const bounds = elementBounds(element);
    return (
      <rect
        fill={element.fill}
        height={bounds.height}
        key={element.id}
        rx={12}
        width={bounds.width}
        x={bounds.x}
        y={bounds.y}
        {...common}
      />
    );
  }

  if (element.type === "ellipse") {
    const bounds = elementBounds(element);
    return (
      <ellipse
        cx={bounds.x + bounds.width / 2}
        cy={bounds.y + bounds.height / 2}
        fill={element.fill}
        key={element.id}
        rx={bounds.width / 2}
        ry={bounds.height / 2}
        {...common}
      />
    );
  }

  return (
    <g key={element.id}>
      <line
        fill="none"
        x1={element.x}
        x2={element.x + element.width}
        y1={element.y}
        y2={element.y + element.height}
        {...common}
      />
      {element.type === "arrow" ? (
        <polygon fill={element.stroke} points={arrowHeadPoints(element)} />
      ) : null}
    </g>
  );
}

function DrawingToolIcon({ tool }: { tool: DrawingTool }) {
  if (tool === "select") return <Pencil className="size-4" />;
  if (tool === "pen") return <PenLine className="size-4" />;
  if (tool === "rectangle") return <Square className="size-4" />;
  if (tool === "ellipse") {
    return <span className="size-4 rounded-full border-2 border-current" />;
  }
  if (tool === "line") return <Minus className="size-4" />;
  return <ArrowRight className="size-4" />;
}

function DrawingToolButton({
  active,
  label,
  onClick,
  tool,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  tool: DrawingTool;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`flex size-8 items-center justify-center rounded-md border ${
        active
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
      }`}
      onClick={onClick}
      title={label}
      type="button"
    >
      <DrawingToolIcon tool={tool} />
    </button>
  );
}

function DrawingPreview({
  canEdit,
  content,
  isSelected,
  onChange,
}: {
  canEdit: boolean;
  content: string;
  isSelected: boolean;
  onChange: (content: string) => void;
}) {
  const initialScene = parseDrawingScene(content);
  const [scene, setScene] = useState<DrawingScene>(initialScene);
  const [tool, setTool] = useState<DrawingTool>("pen");
  const [stroke, setStroke] = useState(DRAWING_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [draftElement, setDraftElement] = useState<DrawingElement | null>(null);
  const sceneRef = useRef<DrawingScene>(initialScene);
  const draftRef = useRef<DrawingElement | null>(null);
  const startPointRef = useRef<DrawingPoint | null>(null);
  const drawingRef = useRef(false);

  function pointForEvent(event: ReactPointerEvent<SVGSVGElement>): DrawingPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) / rect.width) * 1000,
      ((event.clientY - rect.top) / rect.height) * 600,
    ];
  }

  function updateDraft(next: DrawingElement | null) {
    draftRef.current = next;
    setDraftElement(next);
  }

  function commitScene(next: DrawingScene) {
    sceneRef.current = next;
    setScene(next);
    onChange(JSON.stringify(next));
  }

  function finishDraft() {
    const finalElement = draftRef.current;
    drawingRef.current = false;
    startPointRef.current = null;
    updateDraft(null);

    if (!finalElement || !isDrawableElement(finalElement)) return;

    const next = {
      version: 2 as const,
      elements: [...sceneRef.current.elements, finalElement],
    };
    commitScene(next);
    setSelectedElementId(finalElement.id);
  }

  function deleteSelectedElement() {
    if (!selectedElementId) return;
    const next = {
      version: 2 as const,
      elements: sceneRef.current.elements.filter(
        (element) => element.id !== selectedElementId
      ),
    };
    commitScene(next);
    setSelectedElementId(null);
  }

  const selectedElement = scene.elements.find(
    (element) => element.id === selectedElementId
  );

  return (
    <div className="relative h-full overflow-hidden rounded-md border border-zinc-200 bg-[#fbfaf6]">
      {canEdit && isSelected ? (
        <div
          className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1 rounded-lg border border-zinc-200 bg-white/92 p-1 shadow-sm"
          data-board-control
        >
          {DRAWING_TOOLS.map((candidate) => (
            <DrawingToolButton
              active={tool === candidate}
              key={candidate}
              label={
                candidate === "select"
                  ? "Select"
                  : candidate === "pen"
                    ? "Pen"
                    : candidate === "rectangle"
                      ? "Rectangle"
                      : candidate === "ellipse"
                        ? "Ellipse"
                        : candidate === "line"
                          ? "Line"
                          : "Arrow"
              }
              onClick={() => setTool(candidate)}
              tool={candidate}
            />
          ))}
          <div className="mx-1 h-6 w-px bg-zinc-200" />
          {DRAWING_COLORS.map((color) => (
            <button
              aria-label={`Use ${color}`}
              aria-pressed={stroke === color}
              className={`size-6 rounded-full border ${
                stroke === color ? "border-zinc-950" : "border-zinc-200"
              }`}
              key={color}
              onClick={() => setStroke(color)}
              style={{ background: color }}
              type="button"
            />
          ))}
          <div className="mx-1 h-6 w-px bg-zinc-200" />
          {DRAWING_WIDTHS.map((width) => (
            <button
              aria-label={`Stroke ${width}`}
              aria-pressed={strokeWidth === width}
              className={`flex size-7 items-center justify-center rounded-md border ${
                strokeWidth === width
                  ? "border-zinc-950 bg-zinc-100"
                  : "border-zinc-200 bg-white"
              }`}
              key={width}
              onClick={() => setStrokeWidth(width)}
              type="button"
            >
              <span
                className="rounded-full bg-zinc-950"
                style={{ height: width, width: 16 }}
              />
            </button>
          ))}
          {selectedElement ? (
            <>
              <div className="mx-1 h-6 w-px bg-zinc-200" />
              <button
                aria-label="Delete selected shape"
                className="flex size-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-red-50 hover:text-red-700"
                onClick={deleteSelectedElement}
                type="button"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      <svg
        className={`h-full w-full ${
          canEdit && isSelected
            ? tool === "select"
              ? "cursor-default"
              : "cursor-crosshair"
            : ""
        }`}
        data-board-control
        onPointerCancel={(event) => {
          if (!drawingRef.current) return;
          drawingRef.current = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
          startPointRef.current = null;
          updateDraft(null);
        }}
        onPointerDown={(event) => {
          if (!canEdit || !isSelected) return;
          event.preventDefault();
          event.stopPropagation();
          const point = pointForEvent(event);

          if (tool === "select") {
            const hit =
              [...sceneRef.current.elements]
                .reverse()
                .find((element) => isPointInDrawingElement(point, element)) ??
              null;
            setSelectedElementId(hit?.id ?? null);
            return;
          }

          event.currentTarget.setPointerCapture(event.pointerId);
          drawingRef.current = true;
          startPointRef.current = point;
          setSelectedElementId(null);

          if (tool === "pen") {
            updateDraft({
              id: createDrawingElementId(),
              type: "freedraw",
              x: point[0],
              y: point[1],
              width: 1,
              height: 1,
              points: [point],
              stroke,
              fill: "transparent",
              strokeWidth,
            });
            return;
          }

          updateDraft(
            createShapeElement({
              end: point,
              fill: "transparent",
              start: point,
              stroke,
              strokeWidth,
              tool,
            })
          );
        }}
        onPointerMove={(event) => {
          if (!drawingRef.current) return;
          event.preventDefault();
          event.stopPropagation();
          const point = pointForEvent(event);
          const startPoint = startPointRef.current;
          const draft = draftRef.current;
          if (!startPoint || !draft) return;

          if (draft.type === "freedraw") {
            const points = [...(draft.points ?? []), point];
            updateDraft({
              ...draft,
              ...boundsForPoints(points),
              points,
            });
            return;
          }

          updateDraft(
            createShapeElement({
              end: point,
              fill: draft.fill,
              start: startPoint,
              stroke: draft.stroke,
              strokeWidth: draft.strokeWidth,
              tool: draft.type,
            })
          );
        }}
        onPointerUp={(event) => {
          if (!drawingRef.current) return;
          event.preventDefault();
          event.stopPropagation();
          drawingRef.current = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
          finishDraft();
        }}
        viewBox="0 0 1000 600"
      >
        <defs>
          <pattern height="40" id="drawing-grid" patternUnits="userSpaceOnUse" width="40">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e7e5df" strokeWidth="1" />
          </pattern>
        </defs>
        <rect fill="url(#drawing-grid)" height="600" width="1000" />
        {scene.elements.map((element) => renderDrawingElement(element))}
        {draftElement ? renderDrawingElement(draftElement) : null}
        {selectedElement ? (
          <rect
            fill="none"
            pointerEvents="none"
            stroke="#1f6397"
            strokeDasharray="8 8"
            strokeWidth="3"
            {...elementBounds(selectedElement)}
          />
        ) : null}
      </svg>
      {!isSelected ? (
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/80 px-2 py-1 text-[0.68rem] font-semibold uppercase text-zinc-500 shadow-sm">
          Drawing
        </div>
      ) : null}
    </div>
  );
}

function BoardStyleControls({
  activeToolPanel,
  canBringToFront,
  canChat,
  canOpen,
  canRefresh,
  canSendToBack,
  isRefreshing,
  item,
  onBringToFront,
  onOpenDiagram,
  onOpenChat,
  onOpenSource,
  onRefresh,
  onRemove,
  onSendToBack,
  onStyleChange,
}: {
  activeToolPanel: "source" | "chat" | null;
  canBringToFront: boolean;
  canChat: boolean;
  canOpen: boolean;
  canRefresh: boolean;
  canSendToBack: boolean;
  isRefreshing: boolean;
  item: BoardItem;
  onBringToFront: () => void;
  onOpenDiagram: () => void;
  onOpenChat: () => void;
  onOpenSource: () => void;
  onRefresh: () => void;
  onRemove: () => void;
  onSendToBack: () => void;
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
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(false);
  const isDiagram = (item.kind ?? "diagram") === "diagram";

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
          {isDiagram ? (
            <RendererPicker current={item.renderer} onSelectRenderer={setRenderer} />
          ) : (
            <span className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-md bg-muted px-2 text-xs font-semibold text-muted-foreground">
              {getKindIcon(item.kind, "size-3.5 shrink-0")}
              <span className="truncate">{getKindLabel(item.kind)}</span>
            </span>
          )}
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
          {isDiagram && item.renderer === "mermaid" ? (
            <div className="grid gap-1.5">
              <span className="px-1 text-[0.6875rem] font-semibold uppercase text-muted-foreground">
                Look
              </span>
              <LookPicker
                current={item.look}
                onSelectLook={(look) => onStyleChange({ look: look as BoardLook })}
              />
            </div>
          ) : null}
          {isDiagram ? (
            <div className="grid gap-1.5">
              <span className="px-1 text-[0.6875rem] font-semibold uppercase text-muted-foreground">
                Theme
              </span>
              <ThemePicker
                current={item.theme}
                onSelectTheme={(theme) => onStyleChange({ theme })}
                renderer={item.renderer}
              />
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <span className="px-1 text-[0.6875rem] font-semibold uppercase text-muted-foreground">
              Layer
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                aria-label="Send to back"
                disabled={!canSendToBack}
                onClick={onSendToBack}
                size="sm"
                title="Send to back"
                type="button"
                variant="ghost"
              >
                <SendToBack data-icon="inline-start" />
                Back
              </Button>
              <Button
                aria-label="Bring to front"
                disabled={!canBringToFront}
                onClick={onBringToFront}
                size="sm"
                title="Bring to front"
                type="button"
                variant="ghost"
              >
                <BringToFront data-icon="inline-start" />
                Front
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 min-[390px]:grid-cols-3">
            {canRefresh ? (
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
            ) : null}
            {canOpen ? (
              <Button
                aria-label="Open artifact"
                onClick={onOpenDiagram}
                size="sm"
                title="Open artifact"
                type="button"
                variant="ghost"
              >
                <ExternalLink data-icon="inline-start" />
                Open
              </Button>
            ) : null}
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
          {isDiagram ? (
            <div className="grid grid-cols-2 gap-1.5">
              <CopyImageButton
                content={item.content}
                look={item.look}
                renderer={item.renderer}
                theme={item.theme}
              />
              <ExcalidrawButton content={item.content} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className="board-floating-surface pointer-events-auto hidden max-w-[min(34rem,calc(100vw-2rem))] items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 backdrop-blur-md md:flex"
        data-board-control
        data-board-settings
      >
        <span className="inline-flex shrink-0 items-center gap-1.5 px-1.5 text-xs font-semibold text-muted-foreground">
          {getKindIcon(item.kind, "size-3.5")}
          {getKindLabel(item.kind)}
        </span>
        <span className="shrink-0 rounded-md bg-muted/70 px-1.5 py-1 font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
          {Math.round(item.width)}px
        </span>
        {isDiagram ? (
          <RendererPicker current={item.renderer} onSelectRenderer={setRenderer} />
        ) : null}
        <div className="mx-0.5 h-5 w-px shrink-0 bg-border/70" />
        <Button
          aria-label="Open source"
          aria-pressed={activeToolPanel === "source"}
          onClick={onOpenSource}
          size="sm"
          title="Open source"
          type="button"
          variant={activeToolPanel === "source" ? "secondary" : "ghost"}
        >
          <Code2 data-icon="inline-start" />
          Source
        </Button>
        {canChat ? (
          <Button
            aria-label="Open AI"
            aria-pressed={activeToolPanel === "chat"}
            onClick={onOpenChat}
            size="sm"
            title="Open AI"
            type="button"
            variant={activeToolPanel === "chat" ? "secondary" : "ghost"}
          >
            <Sparkles data-icon="inline-start" />
            AI
          </Button>
        ) : null}
        <Button
          aria-expanded={desktopMoreOpen}
          aria-label="More board controls"
          onClick={() => setDesktopMoreOpen((current) => !current)}
          size="icon-sm"
          title="More board controls"
          type="button"
          variant={desktopMoreOpen ? "secondary" : "ghost"}
        >
          <MoreHorizontal />
        </Button>
      </div>

      {desktopMoreOpen ? (
        <div
          className="board-floating-surface pointer-events-auto fixed left-1/2 top-[calc(env(safe-area-inset-top)+116px)] z-30 hidden w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border p-1.5 shadow-2xl backdrop-blur-md md:block"
          data-board-control
        >
          {isDiagram ? (
            <div className="px-2 py-1.5">
              <div className="mb-1.5 text-[0.6875rem] font-semibold uppercase text-muted-foreground">
                Theme
              </div>
              <ThemePicker
                current={item.theme}
                onSelectTheme={(theme) => onStyleChange({ theme })}
                renderer={item.renderer}
              />
              {item.renderer === "mermaid" ? (
                <div className="mt-2">
                  <div className="mb-1.5 text-[0.6875rem] font-semibold uppercase text-muted-foreground">
                    Look
                  </div>
                  <LookPicker
                    current={item.look}
                    onSelectLook={(look) => onStyleChange({ look: look as BoardLook })}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="my-1 h-px bg-border/70" />
          <div className="grid gap-0.5 p-1">
            <div className="grid grid-cols-2 gap-0.5">
              <Button
                aria-label="Send to back"
                className="justify-start"
                disabled={!canSendToBack}
                onClick={onSendToBack}
                size="sm"
                title="Send to back"
                type="button"
                variant="ghost"
              >
                <SendToBack data-icon="inline-start" />
                Back
              </Button>
              <Button
                aria-label="Bring to front"
                className="justify-start"
                disabled={!canBringToFront}
                onClick={onBringToFront}
                size="sm"
                title="Bring to front"
                type="button"
                variant="ghost"
              >
                <BringToFront data-icon="inline-start" />
                Front
              </Button>
            </div>
            {canRefresh ? (
              <Button
                aria-label="Refresh diagram"
                className="justify-start"
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
            ) : null}
            {canOpen ? (
              <Button
                aria-label="Open artifact"
                className="justify-start"
                onClick={onOpenDiagram}
                size="sm"
                title="Open artifact"
                type="button"
                variant="ghost"
              >
                <ExternalLink data-icon="inline-start" />
                Open
              </Button>
            ) : null}
            <Button
              aria-label="Remove diagram"
              className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onRemove}
              size="sm"
              title="Remove diagram"
              type="button"
              variant="ghost"
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
          {isDiagram ? (
            <>
              <div className="my-1 h-px bg-border/70" />
              <div className="grid gap-1 p-1 [&_[data-slot=button]]:h-8 [&_[data-slot=button]]:w-full [&_[data-slot=button]]:justify-start">
                <CopyImageButton
                  content={item.content}
                  look={item.look}
                  renderer={item.renderer}
                  theme={item.theme}
                />
                <ExcalidrawButton content={item.content} />
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
