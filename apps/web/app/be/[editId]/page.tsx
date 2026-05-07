import { getBoardByEditId, type EnrichedBoardState } from "@mermaid-viewer/db";
import { notFound } from "next/navigation";
import { BoardWorkspace } from "@/components/board-workspace";
import type { BoardDocument } from "@/lib/board-state";
import type { Metadata } from "next";

function toBoardDocument(state: EnrichedBoardState): BoardDocument {
  return {
    version: 1,
    activePageId: state.activePageId,
    pages: state.pages.map((page) => ({
      id: page.id,
      name: page.name,
      items: page.items
        .filter((item) => item.content)
        .map((item) => ({
          id: item.id,
          kind: "diagram",
          diagramId: item.diagramId,
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
          updatedAt: item.updatedAt,
        })),
    })),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ editId: string }>;
}): Promise<Metadata> {
  const { editId } = await params;
  const data = await getBoardByEditId({ editId });

  if (!data) {
    return {
      title: "Board Not Found",
      description: "This board does not exist or has been removed.",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Edit ${data.board.title} | merm.sh`,
    description: "Edit a Mermaid diagram board.",
    robots: { index: false, follow: false },
  };
}

export default async function BoardEditPage({
  params,
}: {
  params: Promise<{ editId: string }>;
}) {
  const { editId } = await params;
  const data = await getBoardByEditId({ editId });
  if (!data) notFound();

  return (
    <BoardWorkspace
      boardId={data.board.id}
      editId={editId}
      initialBoard={toBoardDocument(data.state)}
      title={data.board.title}
    />
  );
}
