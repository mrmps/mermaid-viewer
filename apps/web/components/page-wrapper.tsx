"use client";

import { useState, type ReactNode } from "react";
import { HumanMachineToggle } from "./human-machine-toggle";
import { MachineView } from "./machine-view";
import { ModeToggle } from "./mode-toggle";

export function PageWrapper({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"human" | "machine">("human");

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1">
        <ModeToggle />
        <HumanMachineToggle mode={mode} onChange={setMode} />
      </div>
      {mode === "human" ? children : <MachineView />}
    </>
  );
}
