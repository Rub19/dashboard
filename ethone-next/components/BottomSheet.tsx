"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLayer } from "@/components/LayerProvider";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";

export default function BottomSheet({
  open,
  onClose,
  children,
  title,
  position = "bottom",
  draggable = false,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  position?: "bottom" | "center";
  draggable?: boolean;
}) {
  const i18n = useI18n();
  useLayer(open, onClose);
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = title ? "ethone-bottom-sheet-title" : undefined;

  const restoreFocus = useCallback(() => {
    const target = previousFocus.current;
    if (target && typeof target.focus === "function") {
      target.focus({ preventScroll: true });
    }
    previousFocus.current = null;
  }, []);

  useEffect(() => {
    if (open) {
      setIsClosing(false);
      previousFocus.current = document.activeElement as HTMLElement;
    } else {
      const restoreTimer = setTimeout(restoreFocus, 220);
      return () => clearTimeout(restoreTimer);
    }
  }, [open, restoreFocus]);

  useEffect(() => {
    if (!open || !panelRef.current) return;

    const focusableSelector =
      'button:not(:disabled), [href]:not([aria-disabled="true"]), input:not(:disabled):not([aria-disabled="true"]), select:not(:disabled):not([aria-disabled="true"]), textarea:not(:disabled):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])';

    function getFocusable() {
      return Array.from(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter(
        (el) =>
        !el.hasAttribute("disabled") &&
        el.getAttribute("aria-disabled") !== "true" &&
        !el.closest?.("[inert]")
      );
    }

    const focusable = getFocusable();
    const firstFocusable = focusable[0] || panelRef.current;
    queueMicrotask(() => firstFocusable?.focus({ preventScroll: true }));

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !panelRef.current) return;

      const all = getFocusable();
      if (all.length === 0) {
        e.preventDefault();
        return;
      }

      const first = all[0];
      const last = all[all.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !panelRef.current.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !panelRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (!draggable) return;
    const threshold = 80;
    const velocity = 500;
    const shouldClose =
      position === "bottom"
        ? info.offset.y > threshold || info.velocity.y > velocity
        : Math.abs(info.offset.y) > threshold || info.velocity.y > velocity;
    if (shouldClose) {
      setIsClosing(true);
      setTimeout(onClose, 200);
    }
  }

  const isCenter = position === "center";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsClosing(true);
              setTimeout(onClose, 200);
            }}
            className="fixed inset-0 z-40 bg-black/50"
            aria-hidden="true"
            data-testid="bottom-sheet-backdrop"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={isCenter ? { opacity: 0, scale: 0.96, y: 20 } : { y: "100%" }}
            animate={
              isClosing
                ? isCenter
                  ? { opacity: 0, scale: 0.96, y: 20 }
                  : { y: "100%" }
                : isCenter
                ? { opacity: 1, scale: 1, y: 0 }
                : { y: 0 }
            }
            exit={isCenter ? { opacity: 0, scale: 0.96, y: 20 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onDragEnd={handleDragEnd}
            drag={draggable ? (isCenter ? true : "y") : false}
            dragConstraints={
              isCenter
                ? { left: -120, right: 120, top: -120, bottom: 120 }
                : { top: 0, bottom: 0 }
            }
            dragElastic={0.2}
            tabIndex={-1}
            className={`fixed z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl outline-none ${
              isCenter
                ? "left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl"
                : "bottom-0 left-0 right-0"
            }`}
          >
            {draggable && (
              <div className="flex items-center justify-center py-3 cursor-grab">
                <div className="h-1.5 w-12 rounded-full bg-[var(--border)]" />
              </div>
            )}

            {title && (
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <h3 id={titleId} className="text-lg font-semibold">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsClosing(true);
                    setTimeout(onClose, 200);
                  }}
                  className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
                  aria-label={i18n("close")}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className="p-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
