"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import Button from "@/components/ui/Button";

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "danger" | "primary";
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  hideFooter?: boolean;
  hideCloseButton?: boolean;
  position?: "center" | "bottom" | "top";
  fullScreen?: boolean;
  className?: string;
  contentClassName?: string;
};

const sizeMap = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

const positionOuter = {
  center: "items-center",
  bottom: "items-end",
  top: "items-start pt-[15vh]",
};

const positionInner = {
  center: "rounded-2xl",
  bottom: "rounded-t-2xl sm:rounded-2xl",
  top: "rounded-2xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  variant = "primary",
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onConfirm,
  confirmDisabled = false,
  hideFooter = false,
  hideCloseButton = false,
  position = "center",
  fullScreen = false,
  className = "",
  contentClassName = "",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className={`fixed inset-0 z-50 flex justify-center bg-black/70 p-4 backdrop-blur-md ${positionOuter[position]}`}
        >
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
            className={`relative w-full overflow-hidden border border-white/10 bg-zinc-950/90 p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl ${positionInner[position]} ${fullScreen ? "h-[calc(100dvh-2rem)] sm:h-auto sm:max-h-[90vh]" : ""} ${fullScreen ? "w-full sm:max-w-6xl" : sizeMap[size]} ${className}`}
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-purple-500/5 blur-3xl"
              aria-hidden="true"
            />

            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/5 hover:text-[var(--text-primary)]"
                aria-label={cancelLabel}
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <h2
              id={titleId}
              className="pr-6 text-lg font-semibold text-zinc-100"
            >
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-xs text-zinc-400">{description}</p>
            )}

            <div className={`mt-4 text-sm text-zinc-300 ${contentClassName}`}>{children}</div>

            {!hideFooter && (
              <div className="mt-6 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={onClose}
                  className="text-sm"
                >
                  {cancelLabel}
                </Button>

                {onConfirm && (
                  <Button
                    type="button"
                    variant={variant === "danger" ? "danger" : "primary"}
                    size="md"
                    disabled={confirmDisabled}
                    onClick={onConfirm}
                    className="text-sm"
                  >
                    {confirmLabel}
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
