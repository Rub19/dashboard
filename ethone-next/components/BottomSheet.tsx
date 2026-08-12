"use client";

import { useRef, type ReactNode } from "react";
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
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = title ? "ethone-bottom-sheet-title" : undefined;

  useLayer(open, onClose, {
    boundary: panelRef,
    kind: "dialog",
    modal: true,
    trapFocus: true,
    closeOnEscape: true,
    closeOnOutside: true,
    closeOnResize: true,
    closeOnScroll: true,
    initialFocus: true,
  });

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (!draggable) return;
    const threshold = 80;
    const velocity = 500;
    const shouldClose =
      position === "bottom"
        ? info.offset.y > threshold || info.velocity.y > velocity
        : Math.abs(info.offset.y) > threshold || info.velocity.y > velocity;
    if (shouldClose) {
      onClose();
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
            animate={isCenter ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
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
                  onClick={() => onClose()}
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
