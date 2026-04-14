"use client";

import { createContext, useContext, useState } from "react";

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
