"use client";

import { createContext, useContext, useState } from "react";
import { useQueryState, parseAsBoolean } from "nuqs";

const SourceContext = createContext({ open: false, toggle: () => {} });

export function SourceProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SourceContext value={{ open, toggle: () => setOpen((o) => !o) }}>
      {children}
    </SourceContext>
  );
}

export function useSourcePanel() {
  return useContext(SourceContext);
}

const ChatContext = createContext({
  open: false,
  toggle: () => {},
  close: () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useQueryState(
    "chat",
    parseAsBoolean.withDefault(false)
  );

  return (
    <ChatContext
      value={{
        open: chatOpen,
        toggle: () => setChatOpen((prev) => !prev),
        close: () => setChatOpen(null),
      }}
    >
      {children}
    </ChatContext>
  );
}

export function useChatPanel() {
  return useContext(ChatContext);
}
