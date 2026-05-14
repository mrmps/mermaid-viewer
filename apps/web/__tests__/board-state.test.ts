import { describe, expect, it } from "vitest";
import {
  addBoardPage,
  addArtifactToBoardDocument,
  addDiagramToBoardDocument,
  createDefaultBoardDocument,
  deleteBoardPage,
  findOpenBoardPosition,
  getActiveBoardPage,
  moveBoardItemLayer,
  normalizeBoardDocument,
  removeBoardItem,
  renameBoardPage,
  updateBoardItem,
} from "@/lib/board-state";

describe("board-state", () => {
  it("creates a usable default board document", () => {
    const board = createDefaultBoardDocument();

    expect(board.version).toBe(1);
    expect(board.pages).toHaveLength(1);
    expect(getActiveBoardPage(board).name).toBe("Page 1");
  });

  it("places added diagrams in a grid and updates duplicates in place", () => {
    const board = createDefaultBoardDocument();
    const first = addDiagramToBoardDocument(board, {
      diagramId: "a",
      title: "First",
      content: "graph TD; A-->B",
    });
    const second = addDiagramToBoardDocument(first.document, {
      diagramId: "b",
      title: "Second",
      content: "graph TD; B-->C",
    });
    const updateFirst = addDiagramToBoardDocument(second.document, {
      diagramId: "a",
      title: "First Updated",
      content: "graph TD; A-->C",
    });

    const page = getActiveBoardPage(updateFirst.document);
    expect(page.items).toHaveLength(2);
    expect(page.items[0].title).toBe("First Updated");
    expect(page.items[0].content).toBe("graph TD; A-->C");
    expect(page.items[1].x).toBeGreaterThan(page.items[0].x);
  });

  it("keeps website UI payloads and multi-slide decks as board artifacts", () => {
    const board = createDefaultBoardDocument();
    const website = addArtifactToBoardDocument(board, {
      kind: "website",
      title: "Launch page",
      content: "<main><h1>Launch</h1></main>",
    });
    const slides = addArtifactToBoardDocument(website.document, {
      kind: "slides",
      title: "Pitch",
      slides: [
        { title: "Thesis", body: "One sharp point" },
        { title: "Proof", bullets: ["Fast", "Safe"] },
      ],
    });

    const page = getActiveBoardPage(slides.document);
    expect(page.items[0]).toMatchObject({
      kind: "website",
      title: "Launch page",
      content: "<main><h1>Launch</h1></main>",
    });
    expect(page.items[1].slides).toHaveLength(2);
    expect(page.items[1].slides?.[1].bullets).toEqual(["Fast", "Safe"]);
  });

  it("keeps generated image artifact data URLs", () => {
    const result = addArtifactToBoardDocument(createDefaultBoardDocument(), {
      kind: "image",
      title: "Generated board",
      content: "A bright strategy board",
      imageUrl: "data:image/png;base64,abc123",
    });

    expect(getActiveBoardPage(result.document).items[0]).toMatchObject({
      kind: "image",
      title: "Generated board",
      content: "A bright strategy board",
      imageUrl: "data:image/png;base64,abc123",
    });
  });

  it("moves automatic placements away from occupied rectangles", () => {
    const board = createDefaultBoardDocument();
    const first = addDiagramToBoardDocument(board, {
      diagramId: "a",
      title: "First",
      content: "graph TD; A-->B",
      x: 0,
      y: 0,
      width: 640,
      height: 420,
    });
    const second = addDiagramToBoardDocument(first.document, {
      diagramId: "b",
      title: "Second",
      content: "graph TD; B-->C",
      x: 0,
      y: 0,
      width: 640,
      height: 420,
    });

    const page = getActiveBoardPage(second.document);
    expect(page.items[1]).toMatchObject({ x: 720, y: 0 });
  });

  it("finds open spots on sparse boards", () => {
    const items = [
      {
        id: "a",
        diagramId: "a",
        title: "A",
        content: "graph TD; A",
        href: "/d/a",
        x: 0,
        y: 0,
        width: 720,
        height: 460,
        renderer: "beautiful" as const,
        theme: "zinc",
        look: "classic" as const,
      },
      {
        id: "b",
        diagramId: "b",
        title: "B",
        content: "graph TD; B",
        href: "/d/b",
        x: 800,
        y: 0,
        width: 640,
        height: 540,
        renderer: "beautiful" as const,
        theme: "zinc",
        look: "classic" as const,
      },
    ];
    const position = findOpenBoardPosition(
      items,
      { width: 640, height: 420 },
      { x: 0, y: 0 }
    );

    const candidate = { ...position, width: 640, height: 420 };
    for (const item of items) {
      expect(
        candidate.x + candidate.width + 80 <= item.x ||
          item.x + item.width + 80 <= candidate.x ||
          candidate.y + candidate.height + 56 <= item.y ||
          item.y + item.height + 56 <= candidate.y
      ).toBe(true);
    }
  });

  it("keeps one page after deleting another page", () => {
    const board = addBoardPage(createDefaultBoardDocument());
    const activePageId = board.activePageId;
    const next = deleteBoardPage(board, activePageId);

    expect(next.pages).toHaveLength(1);
    expect(next.activePageId).toBe(next.pages[0].id);
  });

  it("normalizes missing or corrupt board data", () => {
    const board = normalizeBoardDocument({
      pages: [
        {
          name: "",
          items: [
            {
              diagramId: "x",
              content: "graph TD; X-->Y",
              width: 20,
              height: 10,
            },
          ],
        },
      ],
      activePageId: "missing",
    });

    expect(board.activePageId).toBe(board.pages[0].id);
    expect(board.pages[0].name).toBe("Page 1");
    expect(board.pages[0].items[0].width).toBe(320);
    expect(board.pages[0].items[0].height).toBe(260);
  });

  it("updates, renames, and removes board content immutably", () => {
    const added = addDiagramToBoardDocument(createDefaultBoardDocument(), {
      diagramId: "a",
      title: "Original",
      content: "flowchart TD\n  A-->B",
    });
    const itemId = getActiveBoardPage(added.document).items[0].id;
    const renamed = renameBoardPage(
      added.document,
      added.document.activePageId,
      "Architecture"
    );
    const updated = updateBoardItem(renamed, itemId, {
      title: "Updated",
      x: 120,
      y: 80,
      width: 800,
      height: 520,
      renderer: "mermaid",
      theme: "dark",
      look: "handDrawn",
    });
    const removed = removeBoardItem(updated, itemId);

    expect(getActiveBoardPage(renamed).name).toBe("Architecture");
    expect(getActiveBoardPage(updated).items[0]).toMatchObject({
      title: "Updated",
      x: 120,
      y: 80,
      width: 800,
      height: 520,
      renderer: "mermaid",
      theme: "dark",
      look: "handDrawn",
    });
    expect(getActiveBoardPage(removed).items).toHaveLength(0);
    expect(getActiveBoardPage(added.document).items[0].title).toBe("Original");
  });

  it("moves items to the front and back of the page stack", () => {
    const first = addDiagramToBoardDocument(createDefaultBoardDocument(), {
      diagramId: "a",
      title: "A",
      content: "flowchart TD\n  A",
    });
    const second = addDiagramToBoardDocument(first.document, {
      diagramId: "b",
      title: "B",
      content: "flowchart TD\n  B",
    });
    const third = addDiagramToBoardDocument(second.document, {
      diagramId: "c",
      title: "C",
      content: "flowchart TD\n  C",
    });
    const itemIds = getActiveBoardPage(third.document).items.map(
      (item) => item.id
    );

    const movedFront = moveBoardItemLayer(third.document, itemIds[0], "front");
    expect(getActiveBoardPage(movedFront).items.map((item) => item.id)).toEqual([
      itemIds[1],
      itemIds[2],
      itemIds[0],
    ]);

    const movedBack = moveBoardItemLayer(movedFront, itemIds[2], "back");
    expect(getActiveBoardPage(movedBack).items.map((item) => item.id)).toEqual([
      itemIds[2],
      itemIds[1],
      itemIds[0],
    ]);
  });
});
