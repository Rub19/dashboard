const TOUCH_QUERY = "(max-width: 820px), (pointer: coarse), (hover: none)";
const LONG_PRESS_SELECTOR = "[data-task-id], [data-file-entry], [data-profile-id]";
const EDITABLE_SELECTOR = "input:not([type='hidden']), textarea, select, [contenteditable='true']";

export function exceedsTouchSlop(startX, startY, nextX, nextY, tolerance = 10) {
  return Math.hypot(Number(nextX) - Number(startX), Number(nextY) - Number(startY)) > Math.max(0, Number(tolerance) || 0);
}

export function isVirtualKeyboardOpen(referenceHeight, currentHeight, hasActiveField, threshold = 96) {
  if (!hasActiveField) return false;
  const reference = Math.max(0, Number(referenceHeight) || 0);
  const current = Math.max(0, Number(currentHeight) || 0);
  return reference > 0 && current > 0 && reference - current >= Math.max(72, Number(threshold) || 96);
}

export function createTouchInteractionManager(options = {}) {
  const documentRef = options.document || globalThis.document;
  const runtime = options.runtime || globalThis;
  const holdDelay = Math.max(360, Number(options.holdDelay) || 520);
  const movementTolerance = Math.max(6, Number(options.movementTolerance) || 10);
  const media = runtime.matchMedia?.(TOUCH_QUERY) || { matches: false, addEventListener() {}, removeEventListener() {} };
  const visualViewport = runtime.visualViewport || null;
  let started = false;
  let enabled = false;
  let hold = null;
  let holdTimer = 0;
  let revealFrame = 0;
  let focusResetTimer = 0;
  let activeField = null;
  let focusViewportHeight = 0;
  let keyboardOpen = false;
  let suppressClickTarget = null;
  let longPressCount = 0;

  function viewportHeight() {
    return Math.max(0, Number(visualViewport?.height || runtime.innerHeight || 0));
  }

  function setKeyboardState(next) {
    keyboardOpen = Boolean(next);
    if (keyboardOpen) documentRef.documentElement.dataset.v8MobileKeyboard = "open";
    else delete documentRef.documentElement.dataset.v8MobileKeyboard;
  }

  function refreshKeyboardState() {
    const currentHeight = viewportHeight();
    if (!activeField) {
      focusViewportHeight = currentHeight;
      setKeyboardState(false);
      return false;
    }
    if (!focusViewportHeight) focusViewportHeight = Math.max(currentHeight, Number(runtime.innerHeight) || 0);
    const next = enabled && isVirtualKeyboardOpen(focusViewportHeight, currentHeight, true);
    setKeyboardState(next);
    return next;
  }

  function clearHold(state = "") {
    if (holdTimer) runtime.clearTimeout?.(holdTimer);
    holdTimer = 0;
    const target = hold?.target;
    hold = null;
    if (target) {
      if (state) target.dataset.touchHold = state;
      else delete target.dataset.touchHold;
      if (state) runtime.setTimeout?.(() => {
        if (target.dataset.touchHold === state) delete target.dataset.touchHold;
      }, 180);
    }
  }

  function refreshMode() {
    enabled = media.matches === true;
    if (enabled) documentRef.documentElement.dataset.touchUi = "active";
    else {
      delete documentRef.documentElement.dataset.touchUi;
      clearHold();
      setKeyboardState(false);
    }
  }

  function revealField() {
    revealFrame = 0;
    if (!enabled || !activeField?.isConnected) return;
    refreshKeyboardState();
    const rect = activeField.getBoundingClientRect?.();
    if (!rect) return;
    const top = Number(visualViewport?.offsetTop || 0) + 12;
    const bottom = top + Number(visualViewport?.height || runtime.innerHeight || 0) - 16;
    if (rect.top < top || rect.bottom > bottom) {
      activeField.scrollIntoView?.({ block: "center", inline: "nearest", behavior: "auto" });
    }
  }

  function scheduleReveal() {
    if (revealFrame) runtime.cancelAnimationFrame?.(revealFrame);
    revealFrame = runtime.requestAnimationFrame?.(revealField) || runtime.setTimeout?.(revealField, 16) || 0;
  }

  function handleViewportChange() {
    refreshKeyboardState();
    scheduleReveal();
  }

  function handleFocusIn(event) {
    const field = event.target?.closest?.(EDITABLE_SELECTOR);
    if (!field) return;
    if (focusResetTimer) runtime.clearTimeout?.(focusResetTimer);
    focusResetTimer = 0;
    activeField = field;
    focusViewportHeight = Math.max(viewportHeight(), Number(runtime.innerHeight) || 0, focusViewportHeight);
    refreshKeyboardState();
    scheduleReveal();
    runtime.setTimeout?.(scheduleReveal, 180);
  }

  function handleFocusOut(event) {
    if (event.target !== activeField) return;
    if (focusResetTimer) runtime.clearTimeout?.(focusResetTimer);
    focusResetTimer = runtime.setTimeout?.(() => {
      focusResetTimer = 0;
      const nextField = documentRef.activeElement?.closest?.(EDITABLE_SELECTOR) || null;
      activeField = nextField;
      if (nextField) {
        refreshKeyboardState();
        scheduleReveal();
        return;
      }
      focusViewportHeight = 0;
      setKeyboardState(false);
    }, 0) || 0;
  }

  function handlePointerDown(event) {
    if (!enabled || event.button > 0 || event.isPrimary === false || event.pointerType === "mouse") return;
    const target = event.target?.closest?.(LONG_PRESS_SELECTOR);
    if (!target || event.target?.closest?.("button, input, textarea, select, a")) return;
    clearHold();
    hold = { target, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    target.dataset.touchHold = "pending";
    holdTimer = runtime.setTimeout?.(() => {
      if (!hold || hold.target !== target) return;
      holdTimer = 0;
      suppressClickTarget = target;
      longPressCount += 1;
      target.dataset.touchHold = "active";
      const ContextEvent = runtime.MouseEvent || globalThis.MouseEvent;
      target.dispatchEvent?.(new ContextEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        button: 2,
        clientX: hold.x,
        clientY: hold.y
      }));
      hold = null;
      runtime.setTimeout?.(() => {
        if (target.dataset.touchHold === "active") delete target.dataset.touchHold;
      }, 180);
    }, holdDelay) || 0;
  }

  function handlePointerMove(event) {
    if (!hold || event.pointerId !== hold.pointerId) return;
    if (exceedsTouchSlop(hold.x, hold.y, event.clientX, event.clientY, movementTolerance)) clearHold();
  }

  function handlePointerEnd(event) {
    if (hold && (event.pointerId == null || event.pointerId === hold.pointerId)) clearHold();
  }

  function handleClick(event) {
    if (!suppressClickTarget || !suppressClickTarget.contains?.(event.target)) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
    suppressClickTarget = null;
  }

  function start() {
    if (started) return false;
    started = true;
    refreshMode();
    media.addEventListener?.("change", refreshMode);
    documentRef.addEventListener("focusin", handleFocusIn, true);
    documentRef.addEventListener("focusout", handleFocusOut, true);
    documentRef.addEventListener("pointerdown", handlePointerDown, true);
    documentRef.addEventListener("pointermove", handlePointerMove, true);
    documentRef.addEventListener("pointerup", handlePointerEnd, true);
    documentRef.addEventListener("pointercancel", handlePointerEnd, true);
    documentRef.addEventListener("click", handleClick, true);
    visualViewport?.addEventListener?.("resize", handleViewportChange);
    visualViewport?.addEventListener?.("scroll", handleViewportChange);
    return true;
  }

  function destroy() {
    if (!started) return false;
    started = false;
    clearHold();
    if (revealFrame) runtime.cancelAnimationFrame?.(revealFrame);
    if (focusResetTimer) runtime.clearTimeout?.(focusResetTimer);
    revealFrame = 0;
    focusResetTimer = 0;
    media.removeEventListener?.("change", refreshMode);
    documentRef.removeEventListener("focusin", handleFocusIn, true);
    documentRef.removeEventListener("focusout", handleFocusOut, true);
    documentRef.removeEventListener("pointerdown", handlePointerDown, true);
    documentRef.removeEventListener("pointermove", handlePointerMove, true);
    documentRef.removeEventListener("pointerup", handlePointerEnd, true);
    documentRef.removeEventListener("pointercancel", handlePointerEnd, true);
    documentRef.removeEventListener("click", handleClick, true);
    visualViewport?.removeEventListener?.("resize", handleViewportChange);
    visualViewport?.removeEventListener?.("scroll", handleViewportChange);
    delete documentRef.documentElement.dataset.touchUi;
    delete documentRef.documentElement.dataset.v8MobileKeyboard;
    activeField = null;
    focusViewportHeight = 0;
    keyboardOpen = false;
    suppressClickTarget = null;
    return true;
  }

  return Object.freeze({
    start,
    destroy,
    diagnostics: () => Object.freeze({ started, enabled, longPressCount, activeField: Boolean(activeField), keyboardOpen })
  });
}
