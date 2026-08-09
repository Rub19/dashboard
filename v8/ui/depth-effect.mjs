const TILT_MAX = 0;
const SELECTOR = [".v8-depth"].join(", ");

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
