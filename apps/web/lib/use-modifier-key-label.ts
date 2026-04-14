"use client";

import { useEffect, useState } from "react";
import { getModifierKeyLabel } from "@/lib/modifier-key";

export function useModifierKeyLabel() {
  const [label, setLabel] = useState("Ctrl");

  useEffect(() => {
    setLabel(getModifierKeyLabel(navigator.platform));
  }, []);

  return label;
}
