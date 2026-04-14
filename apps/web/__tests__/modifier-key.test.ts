import { describe, expect, it } from "vitest";
import { getModifierKeyLabel } from "@/lib/modifier-key";

describe("getModifierKeyLabel", () => {
  it("defaults to Ctrl when no platform is available", () => {
    expect(getModifierKeyLabel()).toBe("Ctrl");
  });

  it("returns command for Apple platforms", () => {
    expect(getModifierKeyLabel("MacIntel")).toBe("⌘");
    expect(getModifierKeyLabel("iPhone")).toBe("⌘");
  });

  it("returns Ctrl for non-Apple platforms", () => {
    expect(getModifierKeyLabel("Win32")).toBe("Ctrl");
    expect(getModifierKeyLabel("Linux x86_64")).toBe("Ctrl");
  });
});
