"use client";

import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { hapticLightImpact } from "@/lib/haptics";

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  showHandle?: boolean;
  initialHeight?: string;
};

export default function Sheet({
  open,
  onOpenChange,
  title,
  children,
  className = "",
  showHandle = true,
  initialHeight = "50vh",
}: SheetProps) {
  const i18n = useI18n();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    const threshold = 80;
    const velocity = 500;
    if (info.offset.y > threshold || info.velocity.y > velocity) {
      onOpenChange(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={
              reduce
                ? { duration: 0.15 }
                : { type: "spring", damping: 26, stiffness: 320 }
            }
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={onDragEnd}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 rounded-t-[2rem] liquid-glass-sheet md:hidden",
              className
            )}
            style={{ maxHeight: initialHeight }}
            role="dialog"
            aria-modal="true"
          >
            {showHandle && (
              <div className="flex w-full justify-center pt-2 pb-1">
                <div className="h-1 w-10 rounded-full bg-[var(--text-primary)]/20" />
              </div>
            )}
            <div className="flex items-center justify-between border-b border-[var(--text-primary)]/[0.06] px-4 py-3">
              {title ? (
                <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => {
                  hapticLightImpact();
                  onOpenChange(false);
                }}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
                aria-label={i18n("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto os-scroll p-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
