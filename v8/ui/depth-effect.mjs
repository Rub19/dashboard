const TILT_MAX = 12;
const SELECTOR = [
  ".v8-depth", ".v8-card", ".v8-surface", ".v8-note-card", ".v8-profile-card",
  ".v8-widget", ".v8-bills-widget", ".v8-continuity", ".v8-home-brain",
  ".v8-brain-context", ".v8-command-dialog", ".v8-panel",
  ".v8-control-center-window", ".v8-dock-editor", ".v8-personalize",
  ".v8-empty-state", ".v8-focus-popover", ".v8-dynamic-island",
  ".v8-briefing-signal", ".v8-tile", ".v8-select-list", ".v8-menu",
  ".v8-toast", ".v8-home-live-grid > section > article"
].join(", ");

function setTilt(element, event) {
  const rect = element.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const tiltY = (x - 0.5) * TILT_MAX;
  const tiltX = (0.5 - y) * TILT_MAX;
  element.style.setProperty("--v8-tilt-x", `${tiltX.toFixed(2)}deg`);
  element.style.setProperty("--v8-tilt-y", `${tiltY.toFixed(2)}deg`);
}

function resetTilt(element) {
  element.style.setProperty("--v8-tilt-x", "0deg");
  element.style.setProperty("--v8-tilt-y", "0deg");
}

export function attachDepthEffect(root = globalThis.document) {
  if (!root) return () => {};
  const isTouch = globalThis.matchMedia?.("(pointer: coarse)").matches === true;
  if (isTouch) return () => {};
  const onMove = (event) => {
    const card = event.target?.closest?.(SELECTOR);
    if (!card) return;
    setTilt(card, event);
  };
  const onLeave = (event) => {
    const card = event.target?.closest?.(SELECTOR);
    if (!card) return;
    resetTilt(card);
  };
  root.addEventListener("mousemove", onMove, { passive: true });
  root.addEventListener("mouseout", onLeave, { passive: true });
  return () => {
    root.removeEventListener("mousemove", onMove);
    root.removeEventListener("mouseout", onLeave);
  };
}
