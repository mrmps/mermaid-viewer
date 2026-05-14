export type BoardRenderer = "beautiful" | "mermaid";
export type BoardLook = "classic" | "handDrawn" | "neo";
export type BoardItemKind =
  | "diagram"
  | "website"
  | "slides"
  | "markdown"
  | "image"
  | "text"
  | "drawing";

export type BoardSlide = {
  eyebrow?: string;
  title: string;
  body?: string;
  bullets?: string[];
  accent?: string;
};

export type BoardItem = {
  id: string;
  kind?: BoardItemKind;
  diagramId?: string;
  diagramEditId?: string;
  title: string;
  content: string;
  href?: string;
  editHref?: string;
  version?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  renderer: BoardRenderer;
  theme: string;
  look: BoardLook;
  url?: string;
  imageUrl?: string;
  accent?: string;
  author?: string;
  slides?: BoardSlide[];
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
  diagramEditId?: string;
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

export type BoardArtifactInput = {
  kind: Exclude<BoardItemKind, "diagram">;
  title?: string;
  content?: string;
  url?: string;
  imageUrl?: string;
  accent?: string;
  author?: string;
  slides?: BoardSlide[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
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

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function parseLegacyDiagramEditId(value: unknown) {
  if (typeof value !== "string") return undefined;
  const read = (pathname: string) => {
    const [, route, editId] = pathname.split("/");
    return route === "e" && editId ? decodeURIComponent(editId) : undefined;
  };
  try {
    const url = new URL(value, "https://merm.sh");
    return read(url.pathname);
  } catch {
    return read(value.split(/[?#]/, 1)[0]);
  }
}

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeKind(value: unknown): BoardItemKind {
  return value === "website" ||
    value === "slides" ||
    value === "markdown" ||
    value === "image" ||
    value === "text" ||
    value === "drawing"
    ? value
    : "diagram";
}

function getDefaultContent(kind: BoardItemKind) {
  switch (kind) {
    case "website":
      return "Product story, interaction notes, and launch sections live here.";
    case "slides":
      return "Narrative deck";
    case "markdown":
      return "# Working notes\n\n- Add context\n- Capture decisions\n- Link supporting cards";
    case "image":
      return "Image reference";
    case "text":
      return "Write a note...";
    case "drawing":
      return "{\"version\":2,\"elements\":[]}";
    case "diagram":
      return "";
  }
}

function normalizeSlides(value: unknown): BoardSlide[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const slides = value.flatMap((slideValue): BoardSlide[] => {
      if (!slideValue || typeof slideValue !== "object") return [];
      const slide = slideValue as Partial<BoardSlide>;
      const title = normalizeOptionalString(slide.title);
      if (!title) return [];

      const normalized: BoardSlide = {
        title,
      };
      const eyebrow = normalizeOptionalString(slide.eyebrow);
      const body = normalizeOptionalString(slide.body);
      const accent = normalizeOptionalString(slide.accent);
      const bullets = Array.isArray(slide.bullets)
        ? slide.bullets.filter(
            (bullet): bullet is string =>
              typeof bullet === "string" && Boolean(bullet.trim())
          )
        : undefined;
      if (eyebrow) normalized.eyebrow = eyebrow;
      if (body) normalized.body = body;
      if (accent) normalized.accent = accent;
      if (bullets?.length) normalized.bullets = bullets;

      return [normalized];
    });

  return slides.length > 0 ? slides : undefined;
}

function normalizeItem(value: unknown): BoardItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<BoardItem>;
  const kind = normalizeKind(item.kind);
  const diagramId = normalizeString(item.diagramId, "");
  const content = normalizeString(item.content, getDefaultContent(kind));

  if (kind === "diagram" && (!diagramId || !content)) return null;

  return {
    id: normalizeString(item.id, createId("item")),
    kind,
    diagramId:
      kind === "diagram" ? diagramId : normalizeOptionalString(item.diagramId),
    diagramEditId:
      kind === "diagram"
        ? normalizeOptionalString(item.diagramEditId) ??
          parseLegacyDiagramEditId(item.editHref)
        : undefined,
    title: normalizeString(item.title, "Untitled"),
    content,
    href:
      kind === "diagram"
        ? normalizeString(item.href, `/d/${diagramId}`)
        : normalizeOptionalString(item.href),
    editHref:
      kind === "diagram"
        ? normalizeString(
            item.editHref,
            normalizeString(item.href, `/d/${diagramId}`)
          )
        : normalizeOptionalString(item.editHref),
    version: normalizeNumber(item.version, 1),
    x: normalizeNumber(item.x, 0),
    y: normalizeNumber(item.y, 0),
    width: Math.max(320, normalizeNumber(item.width, DEFAULT_ITEM_WIDTH)),
    height: Math.max(260, normalizeNumber(item.height, DEFAULT_ITEM_HEIGHT)),
    renderer: item.renderer === "mermaid" ? "mermaid" : "beautiful",
    theme: normalizeString(item.theme, item.renderer === "mermaid" ? "auto" : "zinc"),
    look:
      item.look === "handDrawn" || item.look === "neo" ? item.look : "classic",
    url: normalizeOptionalString(item.url),
    imageUrl: normalizeOptionalString(item.imageUrl),
    accent: normalizeOptionalString(item.accent),
    author: normalizeOptionalString(item.author),
    slides: normalizeSlides(item.slides),
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

  const pages: BoardPage[] = document.pages.map((page) => {
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
                kind: "diagram" as const,
                diagramId: input.diagramId,
                diagramEditId: input.diagramEditId ?? item.diagramEditId,
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
      diagramEditId: input.diagramEditId,
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

export function addArtifactToBoardDocument(
  document: BoardDocument,
  input: BoardArtifactInput,
  pageId = document.activePageId
) {
  const targetPage = document.pages.find((page) => page.id === pageId);
  if (!targetPage) {
    return { document, itemId: null, added: false };
  }

  const kind = input.kind;
  const title = input.title?.trim() || artifactTitle(kind);
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  let itemId: string | null = null;
  const size = {
    width: Math.max(320, normalizeNumber(input.width, DEFAULT_ITEM_WIDTH)),
    height: Math.max(260, normalizeNumber(input.height, DEFAULT_ITEM_HEIGHT)),
  };

  const pages: BoardPage[] = document.pages.map((page) => {
    if (page.id !== targetPage.id) return page;

    const position = findOpenBoardPosition(page.items, size, {
      x: input.x,
      y: input.y,
    });
    const nextItem: BoardItem = {
      id: createId("item"),
      kind,
      title,
      content: input.content?.trim() || getDefaultContent(kind),
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      renderer: "beautiful",
      theme: "zinc",
      look: "classic",
      url: input.url?.trim() || undefined,
      imageUrl: input.imageUrl?.trim() || undefined,
      accent: input.accent?.trim() || undefined,
      author: input.author?.trim() || undefined,
      slides: input.slides,
      updatedAt,
    };
    itemId = nextItem.id;
    return { ...page, items: [...page.items, nextItem] };
  });

  return {
    document: { ...document, activePageId: targetPage.id, pages },
    itemId,
    added: true,
  };
}

function artifactTitle(kind: BoardItemKind) {
  switch (kind) {
    case "website":
      return "Website";
    case "slides":
      return "Slides";
    case "markdown":
      return "Markdown doc";
    case "image":
      return "Image";
    case "text":
      return "Text note";
    case "drawing":
      return "Drawing";
    case "diagram":
      return "Diagram";
  }
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
      | "diagramEditId"
      | "version"
      | "updatedAt"
      | "renderer"
      | "theme"
      | "look"
      | "url"
      | "imageUrl"
      | "accent"
      | "author"
      | "slides"
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

export function moveBoardItemLayer(
  document: BoardDocument,
  itemId: string,
  placement: "front" | "back"
) {
  let changed = false;
  const pages = document.pages.map((page) => {
    const index = page.items.findIndex((item) => item.id === itemId);
    if (index === -1) return page;
    if (placement === "front" && index === page.items.length - 1) return page;
    if (placement === "back" && index === 0) return page;

    const items = [...page.items];
    const [item] = items.splice(index, 1);
    if (!item) return page;

    changed = true;
    if (placement === "front") {
      items.push(item);
    } else {
      items.unshift(item);
    }

    return { ...page, items };
  });

  return changed ? { ...document, pages } : document;
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
