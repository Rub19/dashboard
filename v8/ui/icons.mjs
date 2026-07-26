export function refreshIcons() {
  const api = globalThis.lucide;
  if (!api || typeof api.createIcons !== "function") return false;
  if (!globalThis.document?.querySelector?.("i[data-lucide]")) return false;
  try {
    api.createIcons({
      attrs: {
        width: "20",
        height: "20",
        "stroke-width": "1.8"
      }
    });
    return true;
  } catch {
    return false;
  }
}
