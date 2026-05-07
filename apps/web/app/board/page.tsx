import type { Metadata } from "next";
import { CreateBoardRedirect } from "@/components/create-board-redirect";

export const metadata: Metadata = {
  title: "New Mermaid workspace | merm.sh",
  description:
    "Create a named Mermaid workspace with draggable, resizable, and styleable diagram cards.",
  robots: { index: false, follow: false },
};

export default function BoardPage() {
  return <CreateBoardRedirect />;
}
