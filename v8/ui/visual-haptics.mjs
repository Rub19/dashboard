const CONTROL_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  "[rôle='button']:not([aria-disabled='true'])",
  "[rôle='tab']:not([aria-disabled='true'])",
  "[rôle='option']:not([aria-disabled='true'])",
  "[rôle='switch']:not([aria-disabled='true'])",
  "[rôle='checkbox']:not([aria-disabled='true'])",
  "[rôle='radio']:not([aria-disabled='true'])",
  "[data-interactive]:not([aria-disabled='true'])",
  "[data-haptic]:not([aria-disabled='true'])"
].join(",");

const ACTIVATION_KEYS = new Set(["Enter", " "]);
const PHYSICS_PROFILE = "spring-friction-v1";

function setHapticState(target, state) {
  if (!target) return;
  if (state) target.setAttribute?.("data-haptic-state", state);
  else target.removeAttribute?.("data-haptic-state");
}

export function createVisualHaptics(options = {}) {
  const documentRef = options.document || globalThis.document;
  const runtime = options.runtime || globalThis;
  const releaseDuration = Math.max(1, Number(options.releaseDuration) || 240);
  const holdLimit = Math.max(releaseDuration, Number(options.holdLimit) || 1200);
  const motionPreference = runtime.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  let started = false;
  let activeTarget = null;
  let activeSource = "";
  let activeId = null;
  let holdTimer = null;
  const releaseTimers = new Map();
  let pressCount = 0;
  let releaseCount = 0;

  function clearHoldTimer() {
    if (holdTimer === null) return;
    runtime.clearTimeout?.(holdTimer);
    holdTimer = null;
  }

  function clearReleaseTimer(target) {
    const timer = releaseTimers.get(target);
    if (timer === undefined) return;
    runtime.clearTimeout?.(timer);
    releaseTimers.delete(target);
  }

  function clearActive() {
    clearHoldTimer();
    setHapticState(activeTarget, "");
    activeTarget = null;
    activeSource = "";
    activeId = null;
  }

  function findControl(event) {
    const target = event?.target?.closest?.(CONTROL_SELECTOR) || null;
    if (!target || target.disabled || target.getAttribute?.("aria-disabled") === "true") return null;
    if (target.closest?.("[inert]") || target.inert) return null;
    return target;
  }

  function release(source, id) {
    if (!activeTarget || activeSource !== source || (activeId !== null && id !== activeId)) return false;
    const releasedTarget = activeTarget;
    clearHoldTimer();
    activeTarget = null;
    activeSource = "";
    activeId = null;
    clearReleaseTimer(releasedTarget);
    setHapticState(releasedTarget, "released");
    releaseCount += 1;
    const timer = runtime.setTimeout?.(() => {
      releaseTimers.delete(releasedTarget);
      if (releasedTarget.getAttribute?.("data-haptic-state") === "released") setHapticState(releasedTarget, "");
    }, releaseDuration);
    if (timer !== undefined) releaseTimers.set(releasedTarget, timer);
    return true;
  }

  function press(target, source, id) {
    if (!started || !target || motionPreference?.matches) return false;
    clearActive();
    clearReleaseTimer(target);
    activeTarget = target;
    activeSource = source;
    activeId = id;
    setHapticState(target, "pressed");
    pressCount += 1;
    holdTimer = runtime.setTimeout?.(() => release(source, id), holdLimit) ?? null;
    return true;
  }

  function handlePointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.isPrimary === false) return;
    press(findControl(event), "pointer", event.pointerId ?? null);
  }

  function handlePointerEnd(event) {
    release("pointer", event.pointerId ?? null);
  }

  function handleKeyDown(event) {
    if (!ACTIVATION_KEYS.has(event.key) || event.repeat || event.isComposing) return;
    press(findControl(event), "keyboard", event.key);
  }

  function handleKeyUp(event) {
    if (ACTIVATION_KEYS.has(event.key)) release("keyboard", event.key);
  }

  function handleWindowBlur() {
    clearActive();
  }

  function start() {
    if (started || !documentRef?.addEventListener) return false;
    started = true;
    documentRef.addEventListener("pointerdown", handlePointerDown, true);
    documentRef.addEventListener("pointerup", handlePointerEnd, true);
    documentRef.addEventListener("pointercancel", handlePointerEnd, true);
    documentRef.addEventListener("keydown", handleKeyDown, true);
    documentRef.addEventListener("keyup", handleKeyUp, true);
    runtime.addEventListener?.("blur", handleWindowBlur);
    if (documentRef.documentElement?.dataset) {
      documentRef.documentElement.dataset.v8Haptics = "ready";
      documentRef.documentElement.dataset.v8Physics = PHYSICS_PROFILE;
    }
    return true;
  }

  function destroy() {
    if (!started) return false;
    started = false;
    documentRef.removeEventListener?.("pointerdown", handlePointerDown, true);
    documentRef.removeEventListener?.("pointerup", handlePointerEnd, true);
    documentRef.removeEventListener?.("pointercancel", handlePointerEnd, true);
    documentRef.removeEventListener?.("keydown", handleKeyDown, true);
    documentRef.removeEventListener?.("keyup", handleKeyUp, true);
    runtime.removeEventListener?.("blur", handleWindowBlur);
    clearActive();
    for (const [target, timer] of releaseTimers) {
      runtime.clearTimeout?.(timer);
      setHapticState(target, "");
    }
    releaseTimers.clear();
    if (documentRef.documentElement?.dataset) {
      delete documentRef.documentElement.dataset.v8Haptics;
      delete documentRef.documentElement.dataset.v8Physics;
    }
    return true;
  }

  return Object.freeze({
    start,
    destroy,
    diagnostics: () => Object.freeze({
      started,
      physics: PHYSICS_PROFILE,
      reducedMotion: Boolean(motionPreference?.matches),
      active: Boolean(activeTarget),
      presses: pressCount,
      releases: releaseCount,
      listeners: started ? 6 : 0,
      timers: (holdTimer === null ? 0 : 1) + releaseTimers.size
    })
  });
}
