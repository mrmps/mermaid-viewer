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
    <div className="min-h-screen bg-[var(--diagram-chat-page-bg)] px-4 py-8 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[712px] flex-col justify-center gap-4">
        <div className="flex flex-col items-center gap-2 pb-1 text-center">
          <h1 className="text-[22px] font-medium text-foreground">
            Create a diagram
          </h1>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Describe what you need and AI will generate a Mermaid diagram.
          </p>
        </div>

        <div className="w-full">
          <CreateChat />
        </div>

        <Link
          href="/"
          className="self-center text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
