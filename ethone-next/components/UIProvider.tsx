"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useNativeBehavior } from "@/lib/hooks/useNativeBehavior";
import { useTouchInteractions } from "@/lib/hooks/useTouchInteractions";

const CONTROL_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  "[role='button']:not([aria-disabled='true'])",
  "[role='tab']:not([aria-disabled='true'])",
  "[role='option']:not([aria-disabled='true'])",
  "[role='switch']:not([aria-disabled='true'])",
  "[role='checkbox']:not([aria-disabled='true'])",
  "[role='radio']:not([aria-disabled='true'])",
  "[data-interactive]:not([aria-disabled='true'])",
  "[data-haptic]:not([aria-disabled='true'])",
].join(",");

const TOOLTIP_TARGET = "[data-tooltip]";

const PLACEMENTS = ["top", "right", "bottom", "left"];

type TooltipState = {
  target: HTMLElement;
  label: string;
  placement: string;
  x: number;
  y: number;
} | null;

function findControl(event: Event) {
  const target = (event?.target as HTMLElement)?.closest?.(CONTROL_SELECTOR) as HTMLElement | null;
  if (!target) return null;
  if ((target as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).disabled) return null;
  if (target.getAttribute("aria-disabled") === "true") return null;
  if (target.closest?.("[inert]") || (target as unknown as { inert?: boolean }).inert) return null;
  return target;
}

function computeTooltipPosition(
  anchor: DOMRect,
  tooltip: DOMRect,
  preferred: string,
  gap = 8
) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 8;

  const pointFor = (p: string) => {
    const centerX = anchor.left + anchor.width / 2;
    const centerY = anchor.top + anchor.height / 2;
    if (p === "right") return { x: anchor.right + gap, y: centerY - tooltip.height / 2 };
    if (p === "bottom") return { x: centerX - tooltip.width / 2, y: anchor.bottom + gap };
    if (p === "left") return { x: anchor.left - tooltip.width - gap, y: centerY - tooltip.height / 2 };
    return { x: centerX - tooltip.width / 2, y: anchor.top - tooltip.height - gap };
  };

  const order = [
    preferred,
    { top: "bottom", right: "left", bottom: "top", left: "right" }[preferred] as string,
    ...PLACEMENTS.filter((p) => p !== preferred),
  ].filter((p, i, list) => list.indexOf(p) === i);

  for (const p of order) {
    const point = pointFor(p);
    if (
      point.x >= margin &&
      point.y >= margin &&
      point.x + tooltip.width <= vw - margin &&
      point.y + tooltip.height <= vh - margin
    ) {
      return { placement: p, x: point.x, y: point.y };
    }
  }

  const fallback = pointFor(preferred);
  return { placement: preferred, x: Math.max(margin, fallback.x), y: Math.max(margin, fallback.y) };
}

export default function UIProvider({ children }: { children: React.ReactNode }) {
  useNativeBehavior();
  useTouchInteractions();
  const haptics = useHaptics();
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTarget = useRef<HTMLElement | null>(null);
  const activeTarget = useRef<HTMLElement | null>(null);

  const clearShowTimer = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    showTimer.current = null;
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }, []);

  const hideTooltip = useCallback(
    (immediate = false) => {
      clearShowTimer();
      pendingTarget.current = null;
      activeTarget.current = null;
      if (immediate) {
        setTooltip(null);
        return;
      }
      clearHideTimer();
      hideTimer.current = setTimeout(() => {
        hideTimer.current = null;
        setTooltip(null);
      }, 120);
    },
    [clearShowTimer, clearHideTimer]
  );

  const showTooltip = useCallback(
    (target: HTMLElement) => {
      const label = String(target.dataset.tooltip || "").trim();
      if (!label) return;
      clearHideTimer();
      activeTarget.current = target;
      setTooltip({ target, label, placement: "top", x: -10000, y: -10000 });
    },
    [clearHideTimer]
  );

  useEffect(() => {
    if (!tooltip) return;
    const node = tooltipRef.current;
    const target = tooltip.target;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const anchor = target.getBoundingClientRect();
    const preferred = target.dataset.tooltipPosition || "top";
    const pos = computeTooltipPosition(anchor, rect, preferred);
    setTooltip((prev) => (prev ? { ...prev, ...pos } : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooltip?.label, tooltip?.target]);

  const requestShowTooltip = useCallback(
    (target: HTMLElement, immediate = false) => {
      if (!target || target === activeTarget.current || (target === pendingTarget.current && !immediate)) return;
      clearShowTimer();
      pendingTarget.current = target;
      if (immediate) showTooltip(target);
      else showTimer.current = setTimeout(() => showTooltip(target), 140);
    },
    [clearShowTimer, showTooltip]
  );

  const findTooltipTarget = useCallback((event: Event) => {
    return (event?.target as HTMLElement)?.closest?.(TOOLTIP_TARGET) as HTMLElement | null;
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = findControl(event);
      if (!target) return;
      haptics.press(target);
      haptics.light();
    }

    function onPointerUp() {
      haptics.release();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.isComposing) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = findControl(event) || (event.target as HTMLElement);
      if (!target) return;
      haptics.press(target);
      haptics.light();
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") return;
      haptics.release();
    }

    function onBlur() {
      haptics.release();
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerUp, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [haptics]);

  useEffect(() => {
    function onPointerOver(event: PointerEvent) {
      if (event.pointerType === "touch") return;
      const target = findTooltipTarget(event);
      if (!target) return;
      if (activeTarget.current && activeTarget.current !== target) hideTooltip(true);
      requestShowTooltip(target);
    }

    function onPointerOut(event: PointerEvent) {
      const target = findTooltipTarget(event);
      if (!target || target.contains(event.relatedTarget as Node)) return;
      hideTooltip();
    }

    function onFocusIn(event: FocusEvent) {
      const target = findTooltipTarget(event);
      if (target) requestShowTooltip(target, true);
    }

    function onFocusOut(event: FocusEvent) {
      const target = findTooltipTarget(event);
      if (target && target.contains(event.relatedTarget as Node)) return;
      hideTooltip(true);
    }

    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);

    return () => {
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, [findTooltipTarget, hideTooltip, requestShowTooltip]);

  return (
    <>
      {children}
      {tooltip && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className="ethone-tooltip"
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          {tooltip.label}
        </div>
      )}
    </>
  );
}
