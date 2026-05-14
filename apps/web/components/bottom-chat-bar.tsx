"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowUp, Plus } from "@/components/icons/mingcute";
import { cn } from "@/lib/utils";

type BottomChatBarProps = {
  className?: string;
  disabled?: boolean;
  onSubmit: (message: string) => void | boolean;
  placeholder?: string;
};

export function BottomChatBar({
  className,
  disabled = false,
  onSubmit,
  placeholder = "Message merm.sh",
}: BottomChatBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");

  const submit = useCallback(() => {
    const message = input.trim();
    if (!message || disabled) return;

    const submitted = onSubmit(message);
    if (submitted !== false) {
      setInput("");
    }
  }, [disabled, input, onSubmit]);

  return (
    <form
      aria-label="Open chat"
      className={cn("bottom-chatbar", className)}
      onClick={() => inputRef.current?.focus()}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <button
        aria-label="Add files and more"
        className="bottom-chatbar-icon"
        disabled={disabled}
        type="button"
      >
        <Plus className="size-5" />
      </button>

      <input
        aria-label="Chat prompt"
        autoComplete="off"
        className="bottom-chatbar-input"
        disabled={disabled}
        onChange={(event) => setInput(event.target.value)}
        placeholder={placeholder}
        ref={inputRef}
        type="text"
        value={input}
      />

      <button
        aria-label="Open chat"
        className="bottom-chatbar-send"
        data-active={input.trim() ? "true" : "false"}
        disabled={disabled || !input.trim()}
        type="submit"
      >
        <ArrowUp className="size-5" />
      </button>
    </form>
  );
}
