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
  ChevronDown,
  Square,
  Trash2,
  X,
  Workflow,
  GitBranch,
  PieChart,
  Check,
  AlertCircle,
} from "@/components/icons/mingcute";
import {
  createTextOnlyUserMessage,
  getChatErrorMessage,
  getChatRequestTooLargeError,
} from "@/lib/chat-limits";

function Logo({
  className,
  neutral = false,
}: {
  className?: string;
  neutral?: boolean;
}) {
  if (neutral) {
    return (
      <svg viewBox="0 0 32 32" fill="none" className={className}>
        <path d="M16 3L29 16L16 29L3 16Z" fill="currentColor" />
        <path
          d="M16 3L29 16L16 29L3 16Z"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="1"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M16 3L29 16L16 29L3 16Z" fill="currentColor" />
      <path
        d="M16 3L29 16L16 29L3 16Z"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1"
      />
    </svg>
  );
}
import { cn } from "@/lib/utils";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

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

function AssistantHeader({ neutralBrand = false }: { neutralBrand?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 pb-1.5">
      <Logo
        className={cn(
          "size-4",
          neutralBrand ? "text-foreground" : "text-[var(--diagram-chat-primary)]"
        )}
        neutral={neutralBrand}
      />
      <span className="rounded-md py-1 text-[11px] font-medium uppercase text-muted-foreground">
        merm.sh
      </span>
    </div>
  );
}

function PendingAssistant({
  label = "Thinking",
  neutralBrand = false,
}: {
  label?: string;
  neutralBrand?: boolean;
}) {
  return (
    <div className="flex w-full flex-col">
      <AssistantHeader neutralBrand={neutralBrand} />
      <div className="flex w-full">
        <div
          className="inline-flex items-center gap-1.5 pl-0.5 text-[14px] text-foreground/55"
          aria-live="polite"
        >
          <span className="leading-none">{label}</span>
          <span className="inline-flex items-center gap-1">
            <TypingDot delay="0ms" />
            <TypingDot delay="160ms" />
            <TypingDot delay="320ms" />
          </span>
        </div>
      </div>
    </div>
  );
}

function TypingDot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block size-1.5 rounded-full bg-foreground/35 animate-pulse"
      style={{ animationDelay: delay, animationDuration: "1.2s" }}
    />
  );
}

const SUGGESTIONS = [
  { text: "Convert to a sequence diagram", icon: Workflow },
  { text: "Add a new branch to the flowchart", icon: GitBranch },
  { text: "Turn this into a pie chart", icon: PieChart },
];

const CANVAS_SUGGESTIONS = [
  { text: "Improve this selected card", icon: Workflow },
  { text: "Add a supporting diagram card", icon: GitBranch },
  { text: "Publish a markdown summary card", icon: PieChart },
];

type ToolPart = Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;
type BoardChatContext = {
  boardId: string;
  editId: string;
  itemId?: string;
  itemKind?: string;
  boardTitle?: string;
  itemTitle?: string;
};
type ChatToolResult = {
  version?: number;
  title?: string;
  itemId?: string;
  boardUpdated?: boolean;
  label?: string;
  state?: unknown;
  toolName?: string;
};
type ChatOptimisticUpdate = {
  content: string;
  title?: string;
  itemId?: string;
};

function ToolStatus({ part }: { part: ToolPart }) {
  if (part.state === "output-available") {
    const output = part.output as {
      success?: boolean;
      version?: number;
      label?: string;
    };
    if (output.success) {
      const label =
        output.label ??
        (typeof output.version === "number"
          ? `Updated to v${output.version}`
          : "Applied change");
      return (
        <div className="flex items-center gap-2 px-2.5 py-2 my-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20">
          <div className="size-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="size-2.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            {label}
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
      <Logo className="size-3" />
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
  return (
    <DiagramChatPanel
      content={content}
      diagramId={diagramId}
      editId={editId}
      onClose={close}
      open={open}
    />
  );
}

export function DiagramChatPanel({
  className,
  content,
  diagramId,
  editId,
  boardContext,
  onClose,
  onOptimisticUpdate,
  onToolResult,
  open,
  neutralBrand = false,
}: {
  className?: string;
  content: string;
  diagramId?: string;
  editId?: string;
  boardContext?: BoardChatContext;
  onClose: () => void;
  onOptimisticUpdate?: (updates: ChatOptimisticUpdate) => void;
  onToolResult?: (result: ChatToolResult) => void;
  open: boolean;
  neutralBrand?: boolean;
}) {
  const router = useRouter();
  const boardContextBoardId = boardContext?.boardId;
  const boardContextEditId = boardContext?.editId;
  const boardContextItemId = boardContext?.itemId;
  const boardContextItemKind = boardContext?.itemKind;
  const boardContextBoardTitle = boardContext?.boardTitle;
  const boardContextItemTitle = boardContext?.itemTitle;
  const boardChatBody = useMemo(
    () =>
      boardContextBoardId && boardContextEditId
        ? {
            boardId: boardContextBoardId,
            boardEditId: boardContextEditId,
            boardItemId: boardContextItemId,
            boardItemKind: boardContextItemKind,
            boardTitle: boardContextBoardTitle,
            boardItemTitle: boardContextItemTitle,
          }
        : null,
    [
      boardContextBoardId,
      boardContextEditId,
      boardContextItemId,
      boardContextItemKind,
      boardContextBoardTitle,
      boardContextItemTitle,
    ]
  );
  const initialMessageConsumedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const appliedToolResultsRef = useRef(new Set<string>());
  const [input, setInput] = useState("");
  const [currentContent, setCurrentContent] = useState(content);
  const [localError, setLocalError] = useState<string | null>(null);
  const [scrolledUp, setScrolledUp] = useState(false);

  useEffect(() => {
    setCurrentContent(content);
  }, [content]);

  const getRequestBody = useCallback(
    () => ({
      diagramId,
      editId,
      currentContent,
      ...(boardChatBody ?? {}),
    }),
    [boardChatBody, diagramId, editId, currentContent]
  );
  const lastSubmittedBodyRef = useRef<ReturnType<typeof getRequestBody> | null>(
    null
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: getRequestBody,
        prepareSendMessagesRequest: ({
          api,
          body,
          credentials,
          headers,
          id,
          messageId,
          messages,
          trigger,
        }) => {
          const requestBody = {
            ...body,
            id,
            messages,
            trigger,
            messageId,
          };

          const tooLarge = getChatRequestTooLargeError(requestBody);
          if (tooLarge) {
            throw new Error(tooLarge.message);
          }

          return {
            api,
            body: requestBody,
            credentials,
            headers,
          };
        },
      }),
    [getRequestBody]
  );

  const {
    id: chatId,
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    error,
    clearError,
  } = useChat({
    transport,
    onToolCall: ({ toolCall }) => {
      if (
        toolCall.toolName === "update_diagram" ||
        toolCall.toolName === "update_selected_card"
      ) {
        const args = toolCall.input as {
          content: string;
          summary: string;
          title?: string;
        };
        setCurrentContent(args.content);
        onOptimisticUpdate?.({
          content: args.content,
          title: args.title,
          itemId: lastSubmittedBodyRef.current?.boardItemId,
        });
        if (!onOptimisticUpdate) {
          setTimeout(() => {
            router.refresh();
          }, 500);
        }
      }
    },
    onError: () => {
      /* errors are displayed via the status */
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  const errorMessage =
    localError ??
    getChatErrorMessage(error) ??
    (status === "error" ? "Something went wrong. Please try again." : undefined);
  const lastMessage = messages.at(-1);
  const showPendingLoader = isLoading && lastMessage?.role !== "assistant";
  const isCanvasChat = Boolean(boardContext);
  const suggestions = isCanvasChat ? CANVAS_SUGGESTIONS : SUGGESTIONS;
  const assistantTitle = isCanvasChat ? "Canvas assistant" : "Diagram assistant";
  const emptyTitle = isCanvasChat ? "What should change on the canvas?" : "What should change?";
  const emptyDescription = isCanvasChat
    ? "Edit the selected card, add a diagram, or publish an artifact."
    : "Start with a focused edit, or ask for a full rewrite.";
  const pendingLabel = isCanvasChat ? "Reading canvas" : "Reading diagram";

  useEffect(() => {
    if (!onToolResult) return;

    for (const message of messages) {
      for (const part of message.parts) {
        if (!part.type.startsWith("tool-")) continue;
        const toolPart = part as ToolPart;

        if (
          toolPart.state !== "output-available" ||
          appliedToolResultsRef.current.has(toolPart.toolCallId)
        ) {
          continue;
        }

        const output = toolPart.output as {
          success?: boolean;
          version?: number;
          title?: string;
          itemId?: string;
          boardUpdated?: boolean;
          label?: string;
          state?: unknown;
        };
        if (!output.success) continue;

        appliedToolResultsRef.current.add(toolPart.toolCallId);
        onToolResult({
          version: output.version,
          title: output.title,
          itemId: output.itemId,
          boardUpdated: output.boardUpdated,
          label: output.label,
          state: output.state,
          toolName: toolPart.type.slice("tool-".length),
        });
      }
    }
  }, [messages, onToolResult]);

  const validateRequestSize = useCallback(
    (nextMessages: UIMessage[]) => {
      const requestBody = {
        ...getRequestBody(),
        id: chatId,
        messages: nextMessages,
        trigger: "submit-message" as const,
        messageId: undefined,
      };

      return getChatRequestTooLargeError(requestBody);
    },
    [chatId, getRequestBody]
  );

  const sendTextMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return false;

      const tooLarge = validateRequestSize([
        ...messages,
        createTextOnlyUserMessage(trimmed),
      ]);

      if (tooLarge) {
        clearError();
        setLocalError(tooLarge.message);
        return false;
      }

      clearError();
      setLocalError(null);
      const requestBody = getRequestBody();
      lastSubmittedBodyRef.current = requestBody;
      void sendMessage(
        { text: trimmed },
        {
          body: requestBody,
        }
      );
      return true;
    },
    [
      clearError,
      getRequestBody,
      isLoading,
      messages,
      sendMessage,
      validateRequestSize,
    ]
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const timer = setTimeout(() => {
      container.scrollTop = container.scrollHeight;
      setScrolledUp(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      initialMessageConsumedRef.current = false;
      return;
    }

    if (initialMessageConsumedRef.current) return;

    const initialMessage = sessionStorage.getItem(INITIAL_CHAT_KEY);
    if (!initialMessage) {
      initialMessageConsumedRef.current = true;
      return;
    }

    initialMessageConsumedRef.current = true;
    sessionStorage.removeItem(INITIAL_CHAT_KEY);

    if (!sendTextMessage(initialMessage)) {
      setInput(initialMessage);
    }
  }, [open, sendTextMessage]);

  const handleSubmit = useCallback(() => {
    if (sendTextMessage(input)) {
      setInput("");
    }
  }, [input, sendTextMessage]);

  const insertLineBreak = useCallback(() => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? input.length;
    const end = textarea?.selectionEnd ?? input.length;
    const nextInput = `${input.slice(0, start)}\n${input.slice(end)}`;

    setInput(nextInput);
    requestAnimationFrame(() => {
      const nextTextarea = textareaRef.current;
      if (!nextTextarea) return;

      const caret = start + 1;
      nextTextarea.setSelectionRange(caret, caret);
    });
  }, [input]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter" || e.nativeEvent.isComposing) return;

      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        insertLineBreak();
        return;
      }

      if (e.shiftKey || e.altKey) return;

      e.preventDefault();
      handleSubmit();
    },
    [handleSubmit, insertLineBreak]
  );

  const handleSuggestion = useCallback(
    (text: string) => {
      sendTextMessage(text);
    },
    [sendTextMessage]
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

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setScrolledUp(distanceFromBottom > 96);
  }, []);

  const jumpToLatest = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    setScrolledUp(false);
  }, []);

  if (!open) return null;

  return (
    <div className={className ?? "fixed inset-0 z-40 flex flex-col bg-[var(--diagram-chat-sidebar-bg)] backdrop-blur-xl animate-in slide-in-from-right-2 duration-200 md:static md:z-auto md:w-[400px] lg:w-[420px] md:shrink-0 md:border-l md:border-[var(--diagram-chat-frame-border)]"}>
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--diagram-chat-frame-border)] bg-[var(--diagram-chat-sidebar-bg)] px-3">
        <div className="flex items-center gap-2">
          <Logo
            className={cn(
              "size-4",
              neutralBrand ? "text-foreground" : "text-[var(--diagram-chat-primary)]"
            )}
            neutral={neutralBrand}
          />
          <span className="text-[13px] font-semibold text-foreground/90">
            {assistantTitle}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground"
              title="Clear chat"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground"
            title="Close"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-[var(--diagram-chat-sidebar-bg)] to-transparent"
        />
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto overscroll-contain"
        >
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-[23rem] flex-col justify-center px-4 py-6">
              <div className="mb-5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--diagram-chat-card-bg)] shadow-[inset_0_0_0_0.5px_var(--diagram-chat-frame-border)]">
                    <Logo
                      className={cn(
                        "size-4",
                        neutralBrand ? "text-foreground" : "text-[var(--diagram-chat-primary)]"
                      )}
                      neutral={neutralBrand}
                    />
                  </div>
                  <h2 className="text-[15px] font-medium text-foreground">
                    {emptyTitle}
                  </h2>
                </div>
                <p className="pl-10 text-[13px] leading-5 text-muted-foreground">
                  {emptyDescription}
                </p>
              </div>
              <div className="w-full space-y-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSuggestion(s.text)}
                    className={cn(
                      "group/suggestion flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left",
                      "text-[13px] text-muted-foreground",
                      "transition-all duration-150 hover:bg-muted/60 hover:text-foreground active:scale-[0.99]",
                      isLoading && "pointer-events-none opacity-50"
                    )}
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--diagram-chat-card-bg)] text-muted-foreground/70 shadow-[inset_0_0_0_0.5px_var(--diagram-chat-frame-border)] transition-colors group-hover/suggestion:text-foreground">
                      <s.icon className="size-3.5" />
                    </div>
                    <span className="leading-snug">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-4 px-4 py-5">
              {messages.map((message, index) => {
                const isLast = index === messages.length - 1;

                return (
                  <div key={`${message.id}-${index}`}>
                    {message.role === "user" ? (
                      <div className="flex w-full justify-end">
                        <div className="max-w-[78%] md:max-w-[72%]">
                          <div className="rounded-md bg-secondary/80 px-2.5 py-2 text-secondary-foreground">
                            <p className="whitespace-pre-wrap break-words text-[15px] leading-6">
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
                      <div className="flex w-full flex-col">
                        {!hasContent(message) && isLoading && isLast ? (
                          <PendingAssistant neutralBrand={neutralBrand} />
                        ) : (
                          <>
                            <AssistantHeader neutralBrand={neutralBrand} />
                            <div className="max-w-2xl flex-1 overflow-hidden pl-0.5">
                              <div className="flex flex-col gap-2.5">
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
                                        className="diagram-chat-md break-words"
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
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {showPendingLoader && (
                <PendingAssistant
                  label={pendingLabel}
                  neutralBrand={neutralBrand}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={jumpToLatest}
          aria-label="Jump to latest message"
          aria-hidden={!scrolledUp}
          tabIndex={scrolledUp ? 0 : -1}
          className={cn(
            "absolute bottom-24 left-1/2 z-20 inline-flex h-7 -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--diagram-chat-frame-border)] bg-[var(--diagram-chat-sidebar-bg)] px-2.5 text-[12px] font-medium text-foreground shadow-[0_3px_6px_-2px_rgba(0,0,0,0.05),0_1px_1px_rgba(0,0,0,0.06)] transition-all",
            scrolledUp
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-1 opacity-0"
          )}
        >
          <ChevronDown className="size-3.5 text-muted-foreground" />
          Latest
        </button>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-[var(--diagram-chat-frame-border)] bg-[var(--diagram-chat-sidebar-bg)] p-3">
        {errorMessage && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive">
            <AlertCircle className="mt-0.5 size-3 shrink-0" />
            <p className="text-[11px] leading-relaxed">{errorMessage}</p>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="diagram-chatbar-frame cursor-text p-3"
          onClick={() => textareaRef.current?.focus()}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              if (localError) {
                setLocalError(null);
              }
              setInput(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isLoading
                ? "Waiting for response..."
                : isCanvasChat
                  ? "Describe canvas changes..."
                  : "Describe changes..."
            }
            disabled={isLoading}
            rows={1}
            className={cn(
              "diagram-chatbar-textarea",
              isLoading && "cursor-not-allowed opacity-50"
            )}
            style={{ minHeight: "24px", maxHeight: "120px" }}
          />
          <div className="flex items-end justify-between gap-2 pt-2">
            <KbdGroup
              aria-label="Enter to send message"
              className="diagram-chatbar-pill select-none"
            >
              <Kbd>↵</Kbd>
            </KbdGroup>
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className="diagram-chatbar-send"
                data-active="true"
                aria-label="Stop response"
              >
                <Square className="size-2.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="diagram-chatbar-send shrink-0"
                data-active={input.trim() ? "true" : "false"}
                aria-label="Send message"
              >
                <ArrowUp className="size-3.5" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
