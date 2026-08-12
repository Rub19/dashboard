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

let scheduledFrame = null;

function runScheduledRefresh() {
  scheduledFrame = null;
  refreshIcons();
}

export function scheduleIconRefresh() {
  if (scheduledFrame != null) return;
  const raf = globalThis.requestAnimationFrame;
  scheduledFrame = typeof raf === "function" ? raf(runScheduledRefresh) : globalThis.setTimeout(runScheduledRefresh, 16);
}
