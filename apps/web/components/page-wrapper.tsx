"use client";

import { useState, type ReactNode } from "react";
import { HumanMachineToggle } from "./human-machine-toggle";
import { MachineView } from "./machine-view";

export function PageWrapper({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"human" | "machine">("human");

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <HumanMachineToggle mode={mode} onChange={setMode} />
      </div>
      {mode === "human" ? children : <MachineView />}
    </>
  );
}
