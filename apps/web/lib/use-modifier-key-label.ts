"use client";

import { useSyncExternalStore } from "react";
import { getModifierKeyLabel } from "@/lib/modifier-key";

const subscribe = () => () => {};

export function useModifierKeyLabel() {
  return useSyncExternalStore(
    subscribe,
    () => getModifierKeyLabel(navigator.platform),
    () => "Ctrl",
  );
}
