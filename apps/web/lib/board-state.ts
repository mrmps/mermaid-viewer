export type BoardRenderer = "beautiful" | "mermaid";
export type BoardLook = "classic" | "handDrawn" | "neo";

export type BoardItem = {
  id: string;
  kind?: "diagram";
  diagramId: string;
  title: string;
  content: string;
  href: string;
  editHref?: string;
  version?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  renderer: BoardRenderer;
  theme: string;
  look: BoardLook;
  updatedAt?: string;
};

export type BoardPage = {
  id: string;
  name: string;
  items: BoardItem[];
};

export type BoardDocument = {
  version: 1;
  activePageId: string;
  pages: BoardPage[];
};

export type BoardDiagramInput = {
  diagramId: string;
  title?: string;
  content: string;
  href?: string;
  editHref?: string;
  version?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  renderer?: BoardRenderer;
  theme?: string;
  look?: BoardLook;
  updatedAt?: string;
};

const DEFAULT_ITEM_WIDTH = 640;
const DEFAULT_ITEM_HEIGHT = 420;
const ITEM_GAP_X = 80;
const ITEM_GAP_Y = 56;
const ITEMS_PER_ROW = 3;

type BoardRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export function createDefaultBoardDocument(): BoardDocument {
  const pageId = createId("page");

  return {
    version: 1,
    activePageId: pageId,
    pages: [{ id: pageId, name: "Page 1", items: [] }],
  };
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeItem(value: unknown): BoardItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<BoardItem>;
  const diagramId = normalizeString(item.diagramId, "");
  const content = normalizeString(item.content, "");

  if (!diagramId || !content) return null;

  return {
    id: normalizeString(item.id, createId("item")),
    kind: "diagram",
    diagramId,
    title: normalizeString(item.title, "Untitled"),
    content,
    href: normalizeString(item.href, `/d/${diagramId}`),
    editHref: normalizeString(item.editHref, normalizeString(item.href, `/d/${diagramId}`)),
    version: normalizeNumber(item.version, 1),
    x: normalizeNumber(item.x, 0),
    y: normalizeNumber(item.y, 0),
    width: Math.max(320, normalizeNumber(item.width, DEFAULT_ITEM_WIDTH)),
    height: Math.max(260, normalizeNumber(item.height, DEFAULT_ITEM_HEIGHT)),
    renderer: item.renderer === "mermaid" ? "mermaid" : "beautiful",
    theme: normalizeString(item.theme, item.renderer === "mermaid" ? "auto" : "zinc"),
    look:
      item.look === "handDrawn" || item.look === "neo" ? item.look : "classic",
    updatedAt: normalizeString(item.updatedAt, new Date().toISOString()),
  };
}

export function normalizeBoardDocument(value: unknown): BoardDocument {
  if (!value || typeof value !== "object") {
    return createDefaultBoardDocument();
  }

  const maybeDocument = value as Partial<BoardDocument>;
  const pages = Array.isArray(maybeDocument.pages)
    ? maybeDocument.pages
        .map((pageValue, index) => {
          if (!pageValue || typeof pageValue !== "object") return null;
          const page = pageValue as Partial<BoardPage>;
          const items = Array.isArray(page.items)
            ? page.items
                .map(normalizeItem)
                .filter((item): item is BoardItem => Boolean(item))
            : [];

          return {
            id: normalizeString(page.id, createId("page")),
            name: normalizeString(page.name, `Page ${index + 1}`),
            items,
          };
        })
        .filter((page): page is BoardPage => Boolean(page))
    : [];

  const document =
    pages.length > 0 ? { version: 1 as const, pages } : createDefaultBoardDocument();
  const activePageId = pages.some((page) => page.id === maybeDocument.activePageId)
    ? (maybeDocument.activePageId as string)
    : document.pages[0].id;

  return { ...document, activePageId };
}

export function getActiveBoardPage(document: BoardDocument) {
  return (
    document.pages.find((page) => page.id === document.activePageId) ??
    document.pages[0]
  );
}

function rectsOverlap(a: BoardRect, b: BoardRect, gapX = 0, gapY = gapX) {
  return !(
    a.x + a.width + gapX <= b.x ||
    b.x + b.width + gapX <= a.x ||
    a.y + a.height + gapY <= b.y ||
    b.y + b.height + gapY <= a.y
  );
}

export function findOpenBoardPosition(
  items: BoardItem[],
  size: { width?: number; height?: number } = {},
  preferred?: { x?: number; y?: number }
) {
  const width = Math.max(320, size.width ?? DEFAULT_ITEM_WIDTH);
  const height = Math.max(260, size.height ?? DEFAULT_ITEM_HEIGHT);

  function isOpen(x: number, y: number) {
    const candidate = { x, y, width, height };
    return items.every(
      (item) => !rectsOverlap(candidate, item, ITEM_GAP_X, ITEM_GAP_Y)
    );
  }

  if (
    typeof preferred?.x === "number" &&
    Number.isFinite(preferred.x) &&
    typeof preferred?.y === "number" &&
    Number.isFinite(preferred.y) &&
    isOpen(preferred.x, preferred.y)
  ) {
    return { x: preferred.x, y: preferred.y };
  }

  const xCandidates = new Set<number>([0]);
  const yCandidates = new Set<number>([0]);

  for (let index = 0; index <= items.length + ITEMS_PER_ROW; index += 1) {
    xCandidates.add((index % ITEMS_PER_ROW) * (width + ITEM_GAP_X));
    yCandidates.add(Math.floor(index / ITEMS_PER_ROW) * (height + ITEM_GAP_Y));
  }

  for (const item of items) {
    xCandidates.add(item.x + item.width + ITEM_GAP_X);
    yCandidates.add(item.y + item.height + ITEM_GAP_Y);
  }

  const xs = [...xCandidates].filter(Number.isFinite).sort((a, b) => a - b);
  const ys = [...yCandidates].filter(Number.isFinite).sort((a, b) => a - b);

  for (const y of ys) {
    for (const x of xs) {
      if (isOpen(x, y)) return { x, y };
    }
  }

  const bottom =
    items.length === 0
      ? 0
      : Math.max(...items.map((item) => item.y + item.height + ITEM_GAP_Y));

  return { x: 0, y: bottom };
}

export function nextBoardItemPosition(items: BoardItem[]) {
  return findOpenBoardPosition(items, {
    width: DEFAULT_ITEM_WIDTH,
    height: DEFAULT_ITEM_HEIGHT,
  });
}

function getBoardItemSize(input: BoardDiagramInput) {
  return {
    width: Math.max(320, normalizeNumber(input.width, DEFAULT_ITEM_WIDTH)),
    height: Math.max(260, normalizeNumber(input.height, DEFAULT_ITEM_HEIGHT)),
  };
}

export function addDiagramToBoardDocument(
  document: BoardDocument,
  input: BoardDiagramInput,
  pageId = document.activePageId
) {
  const targetPage = document.pages.find((page) => page.id === pageId);
  if (!targetPage) {
    return { document, itemId: null, added: false };
  }

  const title = input.title?.trim() || "Untitled";
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  let itemId: string | null = null;
  let added = false;

  const pages = document.pages.map((page) => {
    if (page.id !== targetPage.id) return page;

    const existing = page.items.find((item) => item.diagramId === input.diagramId);

    if (existing) {
      itemId = existing.id;
      return {
        ...page,
        items: page.items.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                title,
                content: input.content,
                href: input.href ?? item.href,
                editHref: input.editHref ?? item.editHref,
                version: input.version ?? item.version,
                renderer: input.renderer ?? item.renderer,
                theme: input.theme ?? item.theme,
                look: input.look ?? item.look,
                updatedAt,
              }
            : item
        ),
      };
    }

    added = true;
    const size = getBoardItemSize(input);
    const position = findOpenBoardPosition(page.items, size, {
      x: input.x,
      y: input.y,
    });
    const nextItem: BoardItem = {
      id: createId("item"),
      kind: "diagram",
      diagramId: input.diagramId,
      title,
      content: input.content,
      href: input.href ?? `/d/${input.diagramId}`,
      editHref: input.editHref ?? input.href ?? `/d/${input.diagramId}`,
      version: input.version ?? 1,
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      renderer: input.renderer ?? "beautiful",
      theme: input.theme ?? "zinc",
      look: input.look ?? "classic",
      updatedAt,
    };
    itemId = nextItem.id;
    return { ...page, items: [...page.items, nextItem] };
  });

  return {
    document: { ...document, activePageId: targetPage.id, pages },
    itemId,
    added,
  };
}

export function addBoardPage(document: BoardDocument) {
  const page = {
    id: createId("page"),
    name: `Page ${document.pages.length + 1}`,
    items: [],
  };

  return {
    ...document,
    activePageId: page.id,
    pages: [...document.pages, page],
  };
}

export function renameBoardPage(
  document: BoardDocument,
  pageId: string,
  name: string
) {
  const trimmed = name.trim();
  if (!trimmed) return document;

  return {
    ...document,
    pages: document.pages.map((page) =>
      page.id === pageId ? { ...page, name: trimmed } : page
    ),
  };
}

export function deleteBoardPage(document: BoardDocument, pageId: string) {
  if (document.pages.length <= 1) return document;

  const nextPages = document.pages.filter((page) => page.id !== pageId);
  const activePageId =
    document.activePageId === pageId
      ? nextPages[Math.max(0, document.pages.findIndex((p) => p.id === pageId) - 1)]
          ?.id ?? nextPages[0].id
      : document.activePageId;

  return { ...document, activePageId, pages: nextPages };
}

export function selectBoardPage(document: BoardDocument, pageId: string) {
  if (!document.pages.some((page) => page.id === pageId)) return document;
  return { ...document, activePageId: pageId };
}

export function updateBoardItem(
  document: BoardDocument,
  itemId: string,
  updates: Partial<
    Pick<
      BoardItem,
      | "x"
      | "y"
      | "width"
      | "height"
      | "title"
      | "content"
      | "href"
      | "editHref"
      | "version"
      | "updatedAt"
      | "renderer"
      | "theme"
      | "look"
    >
  >
) {
  return {
    ...document,
    pages: document.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    })),
  };
}

export function removeBoardItem(document: BoardDocument, itemId: string) {
  return {
    ...document,
    pages: document.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== itemId),
    })),
  };
}
