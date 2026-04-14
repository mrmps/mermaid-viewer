"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useChatPanel } from "./diagram-layout";
import { INITIAL_CHAT_KEY } from "./create-chat";
import spinners from "unicode-animations";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import {
  ArrowUp,
  Square,
  Trash2,
  X,
  Workflow,
  GitBranch,
  PieChart,
  Check,
  AlertCircle,
} from "lucide-react";

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 0C12 0 14.5 8.5 12 12C9.5 8.5 12 0 12 0ZM12 24C12 24 9.5 15.5 12 12C14.5 15.5 12 24 12 24ZM0 12C0 12 8.5 9.5 12 12C8.5 14.5 0 12 0 12ZM24 12C24 12 15.5 14.5 12 12C15.5 9.5 24 12 24 12Z" />
    </svg>
  );
}
import { cn } from "@/lib/utils";

function UnicodeSpinner({
  name = "braille",
  className,
}: {
  name?: keyof typeof spinners;
  className?: string;
}) {
  const [frame, setFrame] = useState(0);
  const s = spinners[name];
  useEffect(() => {
    const timer = setInterval(
      () => setFrame((f) => (f + 1) % s.frames.length),
      s.interval
    );
    return () => clearInterval(timer);
  }, [name, s]);
  return (
    <span
      className={cn("font-mono inline-block text-muted-foreground", className)}
    >
      {s.frames[frame]}
    </span>
  );
}

function ChatLoader() {
  return (
    <div className="flex items-center gap-2 py-1">
      <UnicodeSpinner name="braille" className="text-sm text-primary" />
      <span className="text-[11px] text-muted-foreground/70">Thinking...</span>
    </div>
  );
}

const SUGGESTIONS = [
  { text: "Convert to a sequence diagram", icon: Workflow },
  { text: "Add a new branch to the flowchart", icon: GitBranch },
  { text: "Turn this into a pie chart", icon: PieChart },
];

type ToolPart = Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;

function ToolStatus({ part }: { part: ToolPart }) {
  if (part.state === "output-available") {
    const output = part.output as { success?: boolean; version?: number };
    if (output.success) {
      return (
        <div className="flex items-center gap-2 px-2.5 py-2 my-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20">
          <div className="size-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="size-2.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            Updated to v{output.version}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-2.5 py-2 my-2 rounded-lg bg-destructive/10 border border-destructive/20">
        <AlertCircle className="size-3 text-destructive" />
        <span className="text-[11px] text-destructive">Update failed</span>
      </div>
    );
  }

  if (part.state === "output-error" || part.state === "output-denied") {
    return (
      <div className="flex items-center gap-2 px-2.5 py-2 my-2 rounded-lg bg-destructive/10 border border-destructive/20">
        <AlertCircle className="size-3 text-destructive" />
        <span className="text-[11px] text-destructive">Update failed</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2.5 py-2 my-2 rounded-lg bg-muted/60 border border-border/40">
      <UnicodeSpinner name="breathe" className="text-xs text-primary" />
      <span className="text-[11px] text-muted-foreground">
        Updating diagram...
      </span>
    </div>
  );
}

function hasContent(message: UIMessage): boolean {
  return message.parts.some(
    (p) => (p.type === "text" && !!p.text) || p.type.startsWith("tool-")
  );
}

export function ChatToggle() {
  const { open, toggle } = useChatPanel();
  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer",
        "transition-all duration-150 active:scale-[0.96]",
        open
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
      )}
    >
      <SparkleIcon className="size-3" />
      <span>AI</span>
    </button>
  );
}

export function ChatPanel({
  content,
  diagramId,
  editId,
}: {
  content: string;
  diagramId: string;
  editId: string;
}) {
  const { open, close } = useChatPanel();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [currentContent, setCurrentContent] = useState(content);

  useEffect(() => {
    setCurrentContent(content);
  }, [content]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    []
  );

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport,
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === "update_diagram") {
        const args = toolCall.input as { content: string; summary: string };
        setCurrentContent(args.content);
        setTimeout(() => {
          router.refresh();
        }, 500);
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  const lastMessage = messages.at(-1);
  const showPendingLoader = isLoading && lastMessage?.role !== "assistant";

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const timer = setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const initialMessage = sessionStorage.getItem(INITIAL_CHAT_KEY);
    if (!initialMessage) return;

    sessionStorage.removeItem(INITIAL_CHAT_KEY);

    sendMessage(
      { text: initialMessage },
      { body: { diagramId, editId, currentContent } }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const getRequestBody = useCallback(
    () => ({
      diagramId,
      editId,
      currentContent,
    }),
    [diagramId, editId, currentContent]
  );

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;
    sendMessage(
      { text: input.trim() },
      {
        body: getRequestBody(),
      }
    );
    setInput("");
  }, [getRequestBody, input, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleSuggestion = useCallback(
    (text: string) => {
      sendMessage(
        { text },
        {
          body: getRequestBody(),
        }
      );
    },
    [getRequestBody, sendMessage]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const adjustTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    adjustTextarea();
  }, [input, adjustTextarea]);

  if (!open) return null;

  return (
    <div className="w-80 shrink-0 flex flex-col bg-background/80 backdrop-blur-xl border-l border-border/60 animate-in slide-in-from-right-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-11 shrink-0 border-b border-border/40">
        <div className="flex items-center gap-2">
          <SparkleIcon className="size-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground/80">
            AI Assistant
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="size-7 flex items-center justify-center rounded-md transition-colors cursor-pointer text-muted-foreground/60 hover:text-foreground hover:bg-muted/60"
              title="Clear chat"
            >
              <Trash2 className="size-3" />
            </button>
          )}
          <button
            onClick={close}
            className="size-7 flex items-center justify-center rounded-md transition-colors cursor-pointer text-muted-foreground/60 hover:text-foreground hover:bg-muted/60"
            title="Close"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="h-full overflow-y-auto overscroll-contain"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-6 gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="size-9 rounded-xl bg-primary/10 dark:bg-primary/5 flex items-center justify-center">
                  <SparkleIcon className="size-4 text-primary" />
                </div>
                <p className="text-[11px] text-muted-foreground/70 max-w-[200px] leading-relaxed">
                  Ask me to modify your diagram — change styles, add nodes, or
                  transform it entirely.
                </p>
              </div>
              <div className="w-full space-y-1.5">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSuggestion(s.text)}
                    className={cn(
                      "flex w-full items-center gap-2.5 text-left group/suggestion",
                      "px-3 py-2.5 rounded-xl",
                      "bg-muted/40 dark:bg-muted/20",
                      "text-[12px] text-muted-foreground",
                      "hover:bg-muted/70 dark:hover:bg-muted/40 hover:text-foreground",
                      "active:scale-[0.98]",
                      "transition-all duration-150 cursor-pointer"
                    )}
                  >
                    <div className="size-6 rounded-lg bg-background dark:bg-muted/40 border border-border/40 flex items-center justify-center shrink-0 group-hover/suggestion:border-border/60 transition-colors">
                      <s.icon className="size-3 text-muted-foreground/50 group-hover/suggestion:text-foreground/70 transition-colors" />
                    </div>
                    <span className="leading-snug">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-3 py-4 space-y-4">
              {messages.map((message, index) => {
                const isLast = index === messages.length - 1;

                return (
                  <div key={message.id}>
                    {message.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%]">
                          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3.5 py-2">
                            <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap break-words">
                              {message.parts
                                .filter(
                                  (
                                    p
                                  ): p is { type: "text"; text: string } =>
                                    p.type === "text" && !!p.text
                                )
                                .map((p) => p.text)
                                .join("")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[92%]">
                        {!hasContent(message) && isLoading && isLast ? (
                          <ChatLoader />
                        ) : (
                          <>
                            {message.parts.map((part, i) => {
                              if (part.type === "text" && part.text) {
                                const isStreamingText =
                                  isLoading &&
                                  isLast &&
                                  part.state !== "done";
                                return (
                                  <Streamdown
                                    key={i}
                                    plugins={{ code }}
                                    isAnimating={isStreamingText}
                                    caret={
                                      isStreamingText ? "block" : undefined
                                    }
                                    className="text-xs leading-relaxed text-foreground break-words [&_pre]:text-[11px] [&_p]:my-1"
                                  >
                                    {part.text}
                                  </Streamdown>
                                );
                              }
                              if (part.type.startsWith("tool-")) {
                                return (
                                  <ToolStatus
                                    key={(part as ToolPart).toolCallId}
                                    part={part as ToolPart}
                                  />
                                );
                              }
                              return null;
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {showPendingLoader && (
                <div className="px-0.5">
                  <ChatLoader />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className={cn(
            "relative rounded-xl overflow-hidden cursor-text",
            "bg-muted/50 dark:bg-muted/30",
            "border border-border/50",
            "focus-within:border-border focus-within:bg-muted/70 dark:focus-within:bg-muted/40",
            "transition-all duration-200",
            "shadow-sm"
          )}
          onClick={() => textareaRef.current?.focus()}
        >
          <div className="flex flex-col gap-1 p-2.5">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe changes..."
              rows={1}
              className={cn(
                "w-full resize-none border-none bg-transparent px-1 py-0.5",
                "text-[13px] leading-5",
                "text-foreground placeholder:text-muted-foreground/40",
                "focus:outline-none"
              )}
              style={{ minHeight: "20px", maxHeight: "120px" }}
            />
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] text-muted-foreground/30 select-none leading-none">
                {typeof navigator !== "undefined" &&
                navigator?.platform?.includes("Mac")
                  ? "⌘"
                  : "Ctrl"}
                ↵
              </span>
              {isLoading ? (
                <button
                  type="button"
                  onClick={stop}
                  className="size-6 flex items-center justify-center rounded-lg bg-foreground text-background hover:bg-foreground/80 transition-colors cursor-pointer"
                >
                  <Square className="size-2.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className={cn(
                    "size-6 flex items-center justify-center rounded-lg shrink-0",
                    "transition-all duration-150 cursor-pointer",
                    input.trim()
                      ? "bg-foreground text-background hover:bg-foreground/80"
                      : "bg-muted-foreground/10 text-muted-foreground/30 pointer-events-none"
                  )}
                >
                  <ArrowUp className="size-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
