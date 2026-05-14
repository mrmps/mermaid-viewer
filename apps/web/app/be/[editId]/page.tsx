import { getBoardByEditId } from "@mermaid-viewer/db";
import { notFound } from "next/navigation";
import { BoardWorkspace } from "@/components/board-workspace";
import { toBoardDocument } from "@/lib/board-document";
import type { Metadata } from "next";

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
