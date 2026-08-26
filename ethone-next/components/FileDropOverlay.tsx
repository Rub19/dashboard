"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Upload, File } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";

function formatDragSize(bytes = 0) {
  if (bytes === 0) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export type FileDropOverlayProps = {
  onDrop: (files: File[]) => void;
  disabled?: boolean;
};

export default function FileDropOverlay({ onDrop, disabled }: FileDropOverlayProps) {
  const i18n = useI18n();
  const reduce = useReducedMotion() ?? false;
  const [dragging, setDragging] = useState(false);
  const [meta, setMeta] = useState<{ name: string; size?: number } | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    if (disabled) return;

    function firstItem(items: DataTransferItemList | null) {
      if (!items || !items.length) return null;
      const file = items[0].getAsFile?.();
      if (file) return { name: file.name, size: file.size };
      return { name: items[0].type ? items[0].type : i18n("file") };
    }

    function handleDragEnter(e: DragEvent) {
      e.preventDefault();
      counter.current += 1;
      setDragging(true);
      setMeta(firstItem(e.dataTransfer?.items || null));
    }

    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      if (!dragging) setDragging(true);
    }

    function handleDragLeave(e: DragEvent) {
      e.preventDefault();
      counter.current = Math.max(0, counter.current - 1);
      if (counter.current === 0) {
        setDragging(false);
        setMeta(null);
      }
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      counter.current = 0;
      setDragging(false);
      setMeta(null);
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length) onDrop(files);
    }

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [disabled, dragging, i18n, onDrop]);

  return (
    <AnimatePresence>
      {dragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--background)]/70 p-6 backdrop-blur-md"
          onClick={() => setDragging(false)}
          onDragEnter={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => { counter.current = 0; setDragging(false); setMeta(null); }}
          onDrop={(e) => {
            e.preventDefault();
            counter.current = 0;
            setDragging(false);
            setMeta(null);
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length) onDrop(files);
          }}
          aria-hidden="true"
        >
          <motion.div
            animate={{
              scale: 1,
              boxShadow: [
                "0 0 0 rgba(0,0,0,0)",
                "0 0 60px var(--glow-color)",
                "0 0 0 rgba(0,0,0,0)",
              ],
            }}
            initial={{ scale: 0.96, boxShadow: "0 0 0 rgba(0,0,0,0)" }}
            exit={{ scale: 0.96, boxShadow: "0 0 0 rgba(0,0,0,0)" }}
            transition={{
              scale: reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 26 },
              boxShadow: reduce ? { duration: 0 } : { repeat: Infinity, duration: 2.2, ease: "easeInOut" },
            }}
            className="flex h-[min(80vh,480px)] w-[min(92vw,680px)] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--accent-primary)]/[0.4] bg-[var(--panel-bg)]/[0.85] p-10 text-center"
          >
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
              <Upload className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {i18n("dropToUpload", "Relâchez pour téléverser")}
            </h3>
            {meta && (
              <div className="mt-3 flex items-center gap-2 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-4 py-1.5 text-[var(--accent-primary)]">
                <File className="h-3.5 w-3.5" />
                <span className="text-[11px] font-mono font-medium">
                  {meta.name}
                  {meta.size ? ` • ${formatDragSize(meta.size)}` : ""}
                </span>
              </div>
            )}
            <p className="mt-4 max-w-sm text-xs text-[var(--text-muted)]">
              {i18n("dropHint", "Déposez vos fichiers n’importe où sur la page.")}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
