import type { EnrichedBoardState } from "@mermaid-viewer/db";
import type { BoardDocument, BoardItem } from "@/lib/board-state";

export function toBoardDocument(state: EnrichedBoardState): BoardDocument {
  return {
    version: 1,
    activePageId: state.activePageId,
    pages: state.pages.map((page) => ({
      id: page.id,
      name: page.name,
      items: page.items
        .filter((item) => (item.kind ?? "diagram") !== "diagram" || item.content)
        .map((item) => ({
          id: item.id,
          kind: item.kind ?? "diagram",
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
          renderer: item.renderer ?? "beautiful",
          theme: item.theme ?? "zinc",
          look: item.look ?? "classic",
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

export function findBoardItem(
  document: BoardDocument,
  itemId: string
): { item: BoardItem; pageId: string; pageName: string } | null {
  for (const page of document.pages) {
    const item = page.items.find((candidate) => candidate.id === itemId);
    if (item) {
      return { item, pageId: page.id, pageName: page.name };
    }
  }

  return null;
}
