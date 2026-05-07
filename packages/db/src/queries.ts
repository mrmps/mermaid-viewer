import { eq, and, asc, desc, count, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";
import { boards, diagrams, versions, type StoredBoardState } from "./schema";

type DiagramRow = typeof diagrams.$inferSelect;
type BoardRow = typeof boards.$inferSelect;

export type EnrichedBoardItem = StoredBoardState["pages"][number]["items"][number] & {
  title: string;
  content: string;
  href: string;
  editHref: string;
  version: number;
  updatedAt?: string;
};

export type EnrichedBoardState = {
  version: 1;
  activePageId: string;
  pages: Array<{
    id: string;
    name: string;
    items: EnrichedBoardItem[];
  }>;
};

const BOARD_ITEM_WIDTH = 640;
const BOARD_ITEM_HEIGHT = 420;
const BOARD_GAP_X = 80;
const BOARD_GAP_Y = 56;
const BOARD_ITEMS_PER_ROW = 3;

type BoardRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function isAuthorized(
  diagram: DiagramRow,
  opts: { secret?: string; editId?: string }
): boolean {
  return (
    (!!opts.secret && diagram.secret === opts.secret) ||
    (!!opts.editId && diagram.editId === opts.editId)
  );
}

function isBoardAuthorized(
  board: BoardRow,
  opts: { secret?: string; editId?: string }
): boolean {
  return (
    (!!opts.secret && board.secret === opts.secret) ||
    (!!opts.editId && board.editId === opts.editId)
  );
}

function createDefaultBoardState(): StoredBoardState {
  const pageId = nanoid(10);

  return {
    version: 1,
    activePageId: pageId,
    pages: [{ id: pageId, name: "Page 1", items: [] }],
  };
}

function normalizeBoardState(value: unknown): StoredBoardState {
  if (!value || typeof value !== "object") {
    return createDefaultBoardState();
  }

  const raw = value as Partial<StoredBoardState>;
  const pages: StoredBoardState["pages"] = [];

  if (Array.isArray(raw.pages)) {
    raw.pages.forEach((page, index) => {
      if (!page || typeof page !== "object") return;

      const pageValue = page as StoredBoardState["pages"][number];
      const items: StoredBoardState["pages"][number]["items"] = [];

      if (Array.isArray(pageValue.items)) {
        pageValue.items.forEach((item) => {
          if (!item || typeof item !== "object") return;
          const diagramId =
            typeof item.diagramId === "string" ? item.diagramId : "";
          if (!diagramId) return;

            items.push({
              id: typeof item.id === "string" && item.id ? item.id : nanoid(10),
              kind: "diagram",
              diagramId,
              title:
                typeof item.title === "string" && item.title.trim()
                  ? item.title
                  : undefined,
              content:
                typeof item.content === "string" && item.content
                  ? item.content
                  : undefined,
              href:
                typeof item.href === "string" && item.href ? item.href : undefined,
              editHref:
                typeof item.editHref === "string" && item.editHref
                  ? item.editHref
                  : undefined,
              version:
                typeof item.version === "number" && Number.isFinite(item.version)
                  ? item.version
                  : undefined,
              x:
                typeof item.x === "number" && Number.isFinite(item.x)
                  ? item.x
                  : 0,
            y:
              typeof item.y === "number" && Number.isFinite(item.y)
                ? item.y
                : 0,
            width:
              typeof item.width === "number" && Number.isFinite(item.width)
                ? Math.max(320, item.width)
                : BOARD_ITEM_WIDTH,
            height:
              typeof item.height === "number" && Number.isFinite(item.height)
                ? Math.max(260, item.height)
                : BOARD_ITEM_HEIGHT,
            renderer: item.renderer === "mermaid" ? "mermaid" : "beautiful",
            theme:
              typeof item.theme === "string" && item.theme
                ? item.theme
                : item.renderer === "mermaid"
                  ? "auto"
                  : "zinc",
            look:
              item.look === "handDrawn" || item.look === "neo"
                ? item.look
                : "classic",
            updatedAt:
              typeof item.updatedAt === "string" && item.updatedAt
                ? item.updatedAt
                : undefined,
          });
        });
      }

      pages.push({
        id:
          typeof pageValue.id === "string" && pageValue.id
            ? pageValue.id
            : nanoid(10),
        name:
          typeof pageValue.name === "string" && pageValue.name.trim()
            ? pageValue.name
            : `Page ${index + 1}`,
        items,
      });
    });
  }

  const state =
    pages.length > 0 ? { version: 1 as const, pages } : createDefaultBoardState();
  const activePageId = pages.some((page) => page.id === raw.activePageId)
    ? (raw.activePageId as string)
    : state.pages[0].id;

  return { ...state, activePageId };
}

function rectsOverlap(a: BoardRect, b: BoardRect, gapX = 0, gapY = gapX) {
  return !(
    a.x + a.width + gapX <= b.x ||
    b.x + b.width + gapX <= a.x ||
    a.y + a.height + gapY <= b.y ||
    b.y + b.height + gapY <= a.y
  );
}

function getBoardItemSize(opts: { width?: number; height?: number }) {
  return {
    width:
      typeof opts.width === "number" && Number.isFinite(opts.width)
        ? Math.max(320, opts.width)
        : BOARD_ITEM_WIDTH,
    height:
      typeof opts.height === "number" && Number.isFinite(opts.height)
        ? Math.max(260, opts.height)
        : BOARD_ITEM_HEIGHT,
  };
}

function findOpenBoardPosition(
  items: StoredBoardState["pages"][number]["items"],
  size: { width?: number; height?: number } = {},
  preferred?: { x?: number; y?: number }
) {
  const { width, height } = getBoardItemSize(size);

  function isOpen(x: number, y: number) {
    const candidate = { x, y, width, height };
    return items.every(
      (item) => !rectsOverlap(candidate, item, BOARD_GAP_X, BOARD_GAP_Y)
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

  for (let index = 0; index <= items.length + BOARD_ITEMS_PER_ROW; index += 1) {
    xCandidates.add((index % BOARD_ITEMS_PER_ROW) * (width + BOARD_GAP_X));
    yCandidates.add(Math.floor(index / BOARD_ITEMS_PER_ROW) * (height + BOARD_GAP_Y));
  }

  for (const item of items) {
    xCandidates.add(item.x + item.width + BOARD_GAP_X);
    yCandidates.add(item.y + item.height + BOARD_GAP_Y);
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
      : Math.max(...items.map((item) => item.y + item.height + BOARD_GAP_Y));

  return { x: 0, y: bottom };
}

function getBoardDiagramIds(state: StoredBoardState) {
  return [...new Set(state.pages.flatMap((page) => page.items.map((item) => item.diagramId)))];
}

async function enrichBoardState(state: StoredBoardState): Promise<EnrichedBoardState> {
  const diagramIds = getBoardDiagramIds(state);

  const rows =
    diagramIds.length > 0
      ? await db
          .select({
            id: diagrams.id,
            editId: diagrams.editId,
            title: diagrams.title,
            version: diagrams.currentVersion,
            updatedAt: diagrams.updatedAt,
            content: versions.content,
          })
          .from(diagrams)
          .innerJoin(
            versions,
            and(
              eq(versions.diagramId, diagrams.id),
              eq(versions.version, diagrams.currentVersion)
            )
          )
          .where(inArray(diagrams.id, diagramIds))
      : [];

  const diagramsById = new Map(rows.map((row) => [row.id, row]));

  return {
    ...state,
    pages: state.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => {
        const diagram = diagramsById.get(item.diagramId);
        const version = item.version ?? diagram?.version ?? 1;
        return {
          ...item,
          title: item.title || diagram?.title || "Untitled",
          content: item.content || diagram?.content || "",
          href:
            item.href ??
            (diagram
              ? `/d/${item.diagramId}?v=${version}`
              : `/d/${item.diagramId}`),
          editHref:
            item.editHref ??
            (diagram
              ? `/e/${diagram.editId}?v=${version}`
              : `/d/${item.diagramId}`),
          version,
          updatedAt: item.updatedAt ?? diagram?.updatedAt?.toISOString(),
        };
      }),
    })),
  };
}

async function getDiagramCurrentContent(diagram: DiagramRow) {
  const currentVersion = await db.query.versions.findFirst({
    where: and(
      eq(versions.diagramId, diagram.id),
      eq(versions.version, diagram.currentVersion)
    ),
  });

  return currentVersion?.content ?? "";
}

export async function createDiagram(opts: {
  content: string;
  title?: string;
  primaryBoard?: boolean;
}) {
  const id = nanoid(10);
  const editId = nanoid(10);
  const secret = nanoid(24);
  const createPrimaryBoard = opts.primaryBoard !== false;
  const boardId = createPrimaryBoard ? nanoid(10) : null;
  const boardEditId = createPrimaryBoard ? nanoid(10) : null;
  const boardSecret = createPrimaryBoard ? nanoid(24) : null;
  const pageId = createPrimaryBoard ? nanoid(10) : null;
  const itemId = createPrimaryBoard ? nanoid(10) : null;
  const title = opts.title ?? "Untitled";

  await db.insert(diagrams).values({
    id,
    editId,
    title,
    secret,
    primaryBoardId: boardId,
    currentVersion: 1,
  });

  await db.insert(versions).values({
    diagramId: id,
    version: 1,
    content: opts.content,
  });

  if (createPrimaryBoard && boardId && boardEditId && boardSecret && pageId && itemId) {
    await db.insert(boards).values({
      id: boardId,
      editId: boardEditId,
      title,
      secret: boardSecret,
      state: {
        version: 1,
        activePageId: pageId,
        pages: [
          {
            id: pageId,
            name: "Page 1",
            items: [
              {
                id: itemId,
                kind: "diagram",
                diagramId: id,
                title,
                content: opts.content,
                href: `/d/${id}?v=1`,
                editHref: `/e/${editId}?v=1`,
                version: 1,
                x: 0,
                y: 0,
                width: BOARD_ITEM_WIDTH,
                height: BOARD_ITEM_HEIGHT,
                renderer: "beautiful",
                theme: "zinc",
                look: "classic",
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
    });
  }

  return {
    id,
    editId,
    secret,
    version: 1,
    boardId,
    boardEditId,
    boardSecret,
  };
}

export async function addVersion(opts: {
  diagramId: string;
  secret?: string;
  editId?: string;
  content: string;
  title?: string;
}) {
  const diagram = await db.query.diagrams.findFirst({
    where: eq(diagrams.id, opts.diagramId),
  });

  if (!diagram) return { error: "not_found" as const };
  if (!isAuthorized(diagram, opts)) return { error: "unauthorized" as const };

  const newVersion = diagram.currentVersion + 1;

  await db.insert(versions).values({
    diagramId: opts.diagramId,
    version: newVersion,
    content: opts.content,
  });

  const updateFields: Record<string, unknown> = {
    currentVersion: newVersion,
    updatedAt: new Date(),
  };
  if (opts.title) updateFields.title = opts.title;

  await db
    .update(diagrams)
    .set(updateFields)
    .where(eq(diagrams.id, opts.diagramId));

  return { version: newVersion };
}

export async function deleteDiagram(opts: {
  diagramId: string;
  secret?: string;
  editId?: string;
}) {
  const diagram = await db.query.diagrams.findFirst({
    where: eq(diagrams.id, opts.diagramId),
  });

  if (!diagram) return { error: "not_found" as const };
  if (!isAuthorized(diagram, opts)) return { error: "unauthorized" as const };

  await db.delete(versions).where(eq(versions.diagramId, opts.diagramId));
  await db.delete(diagrams).where(eq(diagrams.id, opts.diagramId));

  return { id: opts.diagramId };
}

export async function getDiagram(opts: { id: string; version?: number }) {
  const diagram = await db.query.diagrams.findFirst({
    where: eq(diagrams.id, opts.id),
  });

  if (!diagram) return null;

  const allVersions = await db.query.versions.findMany({
    where: eq(versions.diagramId, opts.id),
    orderBy: [asc(versions.version)],
  });

  const targetVersion = opts.version ?? diagram.currentVersion;
  const currentVersionData = allVersions.find((v) => v.version === targetVersion);

  if (!currentVersionData) return null;

  return {
    diagram,
    currentVersion: currentVersionData,
    allVersions,
  };
}

export async function getDiagramByEditId(opts: { editId: string; version?: number }) {
  const diagram = await db.query.diagrams.findFirst({
    where: eq(diagrams.editId, opts.editId),
  });

  if (!diagram) return null;

  const allVersions = await db.query.versions.findMany({
    where: eq(versions.diagramId, diagram.id),
    orderBy: [asc(versions.version)],
  });

  const targetVersion = opts.version ?? diagram.currentVersion;
  const currentVersionData = allVersions.find((v) => v.version === targetVersion);

  if (!currentVersionData) return null;

  return {
    diagram,
    currentVersion: currentVersionData,
    allVersions,
  };
}

export async function updateTitle(opts: {
  diagramId: string;
  secret?: string;
  editId?: string;
  title: string;
}) {
  const diagram = await db.query.diagrams.findFirst({
    where: eq(diagrams.id, opts.diagramId),
  });

  if (!diagram) return { error: "not_found" as const };
  if (!isAuthorized(diagram, opts)) return { error: "unauthorized" as const };

  await db
    .update(diagrams)
    .set({ title: opts.title, updatedAt: new Date() })
    .where(eq(diagrams.id, opts.diagramId));

  return { title: opts.title };
}

export async function getDiagramCount() {
  const [result] = await db.select({ count: count() }).from(diagrams);
  return result.count;
}

export async function getRecentDiagrams(limit = 3) {
  return db.query.diagrams.findMany({
    limit,
    orderBy: [desc(diagrams.updatedAt)],
    columns: { id: true, title: true, updatedAt: true },
  });
}

export async function getRecentDiagramsWithContent(limit = 50) {
  const rows = await db
    .select({
      id: diagrams.id,
      title: diagrams.title,
      updatedAt: diagrams.updatedAt,
      content: versions.content,
    })
    .from(diagrams)
    .innerJoin(
      versions,
      and(
        eq(versions.diagramId, diagrams.id),
        eq(versions.version, diagrams.currentVersion)
      )
    )
    .orderBy(desc(diagrams.updatedAt))
    .limit(limit);

  return rows;
}

export async function createBoard(opts: {
  title?: string;
  diagramId?: string;
}) {
  const id = nanoid(10);
  const editId = nanoid(10);
  const secret = nanoid(24);
  let state = createDefaultBoardState();

  if (opts.diagramId) {
    const diagram = await db.query.diagrams.findFirst({
      where: eq(diagrams.id, opts.diagramId),
    });

    if (diagram) {
      const content = await getDiagramCurrentContent(diagram);
      const page = state.pages[0];
      page.items.push({
        id: nanoid(10),
        kind: "diagram",
        diagramId: diagram.id,
        title: diagram.title,
        content,
        href: `/d/${diagram.id}?v=${diagram.currentVersion}`,
        editHref: `/e/${diagram.editId}?v=${diagram.currentVersion}`,
        version: diagram.currentVersion,
        x: 0,
        y: 0,
        width: BOARD_ITEM_WIDTH,
        height: BOARD_ITEM_HEIGHT,
        renderer: "beautiful",
        theme: "zinc",
        look: "classic",
        updatedAt: diagram.updatedAt.toISOString(),
      });
    }
  }

  await db.insert(boards).values({
    id,
    editId,
    title: opts.title ?? "Untitled workspace",
    secret,
    state,
  });

  if (opts.diagramId) {
    const diagram = await db.query.diagrams.findFirst({
      where: eq(diagrams.id, opts.diagramId),
    });

    if (diagram && diagram.primaryBoardId !== id) {
      await db
        .update(diagrams)
        .set({ primaryBoardId: id, updatedAt: new Date() })
        .where(eq(diagrams.id, diagram.id));
    }
  }

  return { id, editId, secret };
}

export async function getBoard(opts: { id: string }) {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, opts.id),
  });

  if (!board) return null;

  const state = normalizeBoardState(board.state);
  const enrichedState = await enrichBoardState(state);

  return { board, state: enrichedState };
}

export async function getBoardByEditId(opts: { editId: string }) {
  const board = await db.query.boards.findFirst({
    where: eq(boards.editId, opts.editId),
  });

  if (!board) return null;

  const state = normalizeBoardState(board.state);
  const enrichedState = await enrichBoardState(state);

  return { board, state: enrichedState };
}

export async function addDiagramToBoard(opts: {
  boardId: string;
  secret?: string;
  editId?: string;
  diagramId: string;
  pageId?: string;
  pageName?: string;
  title?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, opts.boardId),
  });

  if (!board) return { error: "not_found" as const };
  if (!isBoardAuthorized(board, opts)) {
    return { error: "unauthorized" as const };
  }

  const diagram = await db.query.diagrams.findFirst({
    where: eq(diagrams.id, opts.diagramId),
  });

  if (!diagram) return { error: "diagram_not_found" as const };
  const content = await getDiagramCurrentContent(diagram);
  const href = `/d/${diagram.id}?v=${diagram.currentVersion}`;
  const editHref = `/e/${diagram.editId}?v=${diagram.currentVersion}`;
  const updatedAt = diagram.updatedAt.toISOString();

  const state = normalizeBoardState(board.state);
  let targetPage = opts.pageId
    ? state.pages.find((page) => page.id === opts.pageId)
    : undefined;

  if (!targetPage && opts.pageName?.trim()) {
    targetPage = state.pages.find(
      (page) => page.name.toLowerCase() === opts.pageName?.trim().toLowerCase()
    );
  }

  if (!targetPage && opts.pageName?.trim()) {
    targetPage = {
      id: nanoid(10),
      name: opts.pageName.trim(),
      items: [],
    };
    state.pages.push(targetPage);
  }

  targetPage ??=
    state.pages.find((page) => page.id === state.activePageId) ?? state.pages[0];
  const existing = targetPage.items.find((item) => item.diagramId === diagram.id);
  let itemId: string;

  if (existing) {
    itemId = existing.id;
    existing.title = opts.title ?? diagram.title;
    existing.content = content;
    existing.href = href;
    existing.editHref = editHref;
    existing.version = diagram.currentVersion;
    existing.updatedAt = updatedAt;
  } else {
    const size = getBoardItemSize(opts);
    const position = findOpenBoardPosition(targetPage.items, size, {
      x: opts.x,
      y: opts.y,
    });
    itemId = nanoid(10);
    targetPage.items.push({
      id: itemId,
      kind: "diagram",
      diagramId: diagram.id,
      title: opts.title ?? diagram.title,
      content,
      href,
      editHref,
      version: diagram.currentVersion,
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      renderer: "beautiful",
      theme: "zinc",
      look: "classic",
      updatedAt,
    });
  }

  state.activePageId = targetPage.id;

  await db
    .update(boards)
    .set({ state, updatedAt: new Date() })
    .where(eq(boards.id, opts.boardId));

  if (diagram.primaryBoardId !== opts.boardId) {
    await db
      .update(diagrams)
      .set({ primaryBoardId: opts.boardId, updatedAt: new Date() })
      .where(eq(diagrams.id, diagram.id));
  }

  const item = targetPage.items.find((candidate) => candidate.id === itemId);

  return {
    itemId,
    pageId: targetPage.id,
    x: item?.x ?? 0,
    y: item?.y ?? 0,
    width: item?.width ?? BOARD_ITEM_WIDTH,
    height: item?.height ?? BOARD_ITEM_HEIGHT,
  };
}

export async function updateBoard(opts: {
  boardId: string;
  secret?: string;
  editId?: string;
  title?: string;
  state?: StoredBoardState;
}) {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, opts.boardId),
  });

  if (!board) return { error: "not_found" as const };
  if (!isBoardAuthorized(board, opts)) {
    return { error: "unauthorized" as const };
  }

  const updateFields: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (opts.title?.trim()) {
    updateFields.title = opts.title.trim();
  }

  if (opts.state) {
    updateFields.state = normalizeBoardState(opts.state);
  }

  await db.update(boards).set(updateFields).where(eq(boards.id, opts.boardId));

  return { id: opts.boardId };
}
