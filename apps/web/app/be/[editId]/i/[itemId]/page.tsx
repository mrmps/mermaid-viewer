import { getBoardByEditId } from "@mermaid-viewer/db";
import { notFound } from "next/navigation";
import { BoardItemPage } from "@/components/board-item-page";
import { findBoardItem, toBoardDocument } from "@/lib/board-document";
import type { Metadata } from "next";

type Params = Promise<{ editId: string; itemId: string }>;

async function getItemData(params: Params) {
  const { editId, itemId } = await params;
  const data = await getBoardByEditId({ editId });
  if (!data) return null;

  const document = toBoardDocument(data.state);
  const match = findBoardItem(document, itemId);
  if (!match) return null;

  return { board: data.board, editId, match };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const data = await getItemData(params);

  if (!data) {
    return {
      title: "Artifact Not Found",
      description: "This board artifact does not exist or has been removed.",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Edit ${data.match.item.title} | ${data.board.title} | merm.sh`,
    description: `Board artifact from ${data.board.title}.`,
    robots: { index: false, follow: false },
  };
}

export default async function BoardItemEditPage({
  params,
}: {
  params: Params;
}) {
  const data = await getItemData(params);
  if (!data) notFound();

  return (
    <BoardItemPage
      boardHref={`/be/${data.editId}?focus=${data.match.item.id}`}
      boardTitle={data.board.title}
      editHref={`/be/${data.editId}?focus=${data.match.item.id}`}
      item={data.match.item}
      pageName={data.match.pageName}
    />
  );
}
