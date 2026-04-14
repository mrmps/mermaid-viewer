import type { Metadata } from "next";
import Link from "next/link";
import { CreateChat } from "@/components/create-chat";

export const metadata: Metadata = {
  title: "Create a Diagram",
  description:
    "Describe a Mermaid diagram in plain language and let AI create it for you.",
  robots: { index: true, follow: true },
};

export default function ChatPage() {
  return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="flex flex-col items-center gap-4 w-full max-w-[712px]">
        <div className="flex flex-col items-center gap-2 pb-2">
          <h1 className="text-xl font-medium text-foreground">
            Create a diagram
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            Describe what you need and AI will generate a Mermaid diagram.
          </p>
        </div>

        <div className="w-full">
          <CreateChat />
        </div>

        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
