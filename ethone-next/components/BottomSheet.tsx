"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function BottomSheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/50"
          aria-hidden="true"
        >
          <motion.div
            ref={panelRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-4 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--border)]" />
            {title && <h2 className="mb-3 text-lg font-semibold">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
