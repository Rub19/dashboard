"use client";

import { useEffect, useRef } from "react";

const TOUCH_QUERY = "(max-width: 820px), (pointer: coarse), (hover: none)";
const LONG_PRESS_SELECTOR = "[data-task-id], [data-file-entry], [data-profile-id]";
const EDITABLE_SELECTOR = "input:not([type='hidden']), textarea, select, [contenteditable='true']";

function exceedsTouchSlop(startX: number, startY: number, nextX: number, nextY: number, tolerance = 10) {
  return Math.hypot(nextX - startX, nextY - startY) > Math.max(0, tolerance);
}

function isVirtualKeyboardOpen(referenceHeight: number, currentHeight: number) {
  return referenceHeight > 0 && currentHeight > 0 && referenceHeight - currentHeight >= 96;
}

export function useTouchInteractions({ holdDelay = 520, movementTolerance = 10 } = {}) {
  const holdRef = useRef<{
    target: HTMLElement;
    pointerId: number;
    x: number;
    y: number;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const suppressClickRef = useRef<HTMLElement | null>(null);
  const activeFieldRef = useRef<HTMLElement | null>(null);
  const focusViewportHeightRef = useRef(0);
  const mediaRef = useRef<MediaQueryList | null>(null);
  const enabledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const media = window.matchMedia(TOUCH_QUERY);
    mediaRef.current = media;
    const visualViewport = window.visualViewport;

    function refreshMode() {
      enabledRef.current = media.matches;
      if (enabledRef.current) document.documentElement.dataset.touchUi = "active";
      else delete document.documentElement.dataset.touchUi;
    }

    function viewportHeight() {
      return Math.max(0, visualViewport?.height || window.innerHeight || 0);
    }

    function setKeyboardState(open: boolean) {
      if (open) document.documentElement.dataset.v8MobileKeyboard = "open";
      else delete document.documentElement.dataset.v8MobileKeyboard;
    }

    function refreshKeyboardState() {
      const currentHeight = viewportHeight();
      const field = activeFieldRef.current;
      if (!field) {
        focusViewportHeightRef.current = currentHeight;
        setKeyboardState(false);
        return;
      }
      if (!focusViewportHeightRef.current) focusViewportHeightRef.current = Math.max(currentHeight, window.innerHeight || 0);
      const open = enabledRef.current && isVirtualKeyboardOpen(focusViewportHeightRef.current, currentHeight);
      setKeyboardState(open);
    }

    function revealField() {
      const field = activeFieldRef.current;
      if (!enabledRef.current || !field?.isConnected) return;
      const rect = field.getBoundingClientRect();
      const top = (visualViewport?.offsetTop || 0) + 12;
      const bottom = top + (visualViewport?.height || window.innerHeight || 0) - 16;
      if (rect.top < top || rect.bottom > bottom) {
        field.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      }
    }

    function scheduleReveal() {
      requestAnimationFrame(revealField);
    }

    function clearHold() {
      if (holdRef.current?.timer) clearTimeout(holdRef.current.timer);
      const target = holdRef.current?.target;
      if (target) delete target.dataset.touchHold;
      holdRef.current = null;
    }

    function handleFocusIn(event: FocusEvent) {
      const field = (event.target as HTMLElement)?.closest?.(EDITABLE_SELECTOR) as HTMLElement | null;
      if (!field) return;
      activeFieldRef.current = field;
      focusViewportHeightRef.current = Math.max(viewportHeight(), window.innerHeight || 0, focusViewportHeightRef.current);
      refreshKeyboardState();
      scheduleReveal();
    }

    function handleFocusOut(event: FocusEvent) {
      if (event.target !== activeFieldRef.current) return;
      setTimeout(() => {
        const nextField = document.activeElement?.closest(EDITABLE_SELECTOR) as HTMLElement | null;
        activeFieldRef.current = nextField;
        if (nextField) {
          refreshKeyboardState();
          scheduleReveal();
          return;
        }
        focusViewportHeightRef.current = 0;
        setKeyboardState(false);
      }, 0);
    }

    function handlePointerDown(event: PointerEvent) {
      if (!enabledRef.current || event.button > 0 || event.isPrimary === false || event.pointerType === "mouse") return;
      const target = (event.target as HTMLElement)?.closest?.(LONG_PRESS_SELECTOR) as HTMLElement | null;
      if (!target || (event.target as HTMLElement)?.closest?.("button, input, textarea, select, a")) return;
      clearHold();
      holdRef.current = { target, pointerId: event.pointerId, x: event.clientX, y: event.clientY, timer: null };
      target.dataset.touchHold = "pending";
      holdRef.current.timer = setTimeout(() => {
        if (!holdRef.current || holdRef.current.target !== target) return;
        suppressClickRef.current = target;
        target.dataset.touchHold = "active";
        target.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            button: 2,
            clientX: holdRef.current.x,
            clientY: holdRef.current.y,
          })
        );
        clearHold();
        setTimeout(() => delete target.dataset.touchHold, 180);
      }, holdDelay);
    }

    function handlePointerMove(event: PointerEvent) {
      const hold = holdRef.current;
      if (!hold || event.pointerId !== hold.pointerId) return;
      if (exceedsTouchSlop(hold.x, hold.y, event.clientX, event.clientY, movementTolerance)) {
        clearHold();
      }
    }

    function handlePointerEnd(event: PointerEvent) {
      const hold = holdRef.current;
      if (hold && (event.pointerId == null || event.pointerId === hold.pointerId)) clearHold();
    }

    function handleClick(event: MouseEvent) {
      const target = suppressClickRef.current;
      if (!target || !target.contains?.(event.target as Node)) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = null;
    }

    function handleViewportChange() {
      refreshKeyboardState();
      scheduleReveal();
    }

    refreshMode();
    media.addEventListener("change", refreshMode);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("pointerup", handlePointerEnd, true);
    document.addEventListener("pointercancel", handlePointerEnd, true);
    document.addEventListener("click", handleClick, true);
    visualViewport?.addEventListener("resize", handleViewportChange);
    visualViewport?.addEventListener("scroll", handleViewportChange);

    return () => {
      clearHold();
      media.removeEventListener("change", refreshMode);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointerup", handlePointerEnd, true);
      document.removeEventListener("pointercancel", handlePointerEnd, true);
      document.removeEventListener("click", handleClick, true);
      visualViewport?.removeEventListener("resize", handleViewportChange);
      visualViewport?.removeEventListener("scroll", handleViewportChange);
      delete document.documentElement.dataset.touchUi;
      delete document.documentElement.dataset.v8MobileKeyboard;
    };
  }, [holdDelay, movementTolerance]);
}
