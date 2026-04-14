export function getModifierKeyLabel(platform?: string | null) {
  if (!platform) {
    return "Ctrl";
  }

  return /(mac|iphone|ipad|ipod)/i.test(platform) ? "⌘" : "Ctrl";
}
