import { getBoard } from "@mermaid-viewer/db";
import { notFound } from "next/navigation";
import { BoardWorkspace } from "@/components/board-workspace";
import { toBoardDocument } from "@/lib/board-document";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getBoard({ id });

  if (!data) {
    return {
      title: "Board Not Found",
      description: "This board does not exist or has been removed.",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${data.board.title} | merm.sh`,
    description: `Mermaid diagram board with ${data.state.pages.length} page${data.state.pages.length === 1 ? "" : "s"}.`,
    robots: { index: false, follow: false },
  };
}

export default async function BoardViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getBoard({ id });
  if (!data) notFound();

  return (
    <BoardWorkspace
      boardId={data.board.id}
      initialBoard={toBoardDocument(data.state)}
      readOnly
      title={data.board.title}
    />
  );
}
