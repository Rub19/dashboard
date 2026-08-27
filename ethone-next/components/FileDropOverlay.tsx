"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { UploadCloud, File, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { formatBytes, getFileExtension } from "@/lib/files";

export type FileDropOverlayProps = {
  onDrop: (files: File[]) => void;
  disabled?: boolean;
};

export default function FileDropOverlay({ onDrop, disabled }: FileDropOverlayProps) {
  const i18n = useI18n();
  const reduce = useReducedMotion() ?? false;
  const [dragging, setDragging] = useState(false);
  const [fileCount, setFileCount] = useState(1);
  const [meta, setMeta] = useState<{ name: string; size?: number; type?: string } | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    if (disabled) return;

    function extractMeta(items: DataTransferItemList | null) {
      if (!items || !items.length) return null;
      setFileCount(items.length);
      const file = items[0].getAsFile?.();
      if (file) return { name: file.name, size: file.size, type: file.type };
      return { name: items[0].type || i18n("file", "Fichier") };
    }

    function handleDragEnter(e: DragEvent) {
      e.preventDefault();
      // Ensure drag contains files
      if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes("Files")) {
        counter.current += 1;
        setDragging(true);
        setMeta(extractMeta(e.dataTransfer?.items || null));
      }
    }

    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
      if (!dragging && e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes("Files")) {
        setDragging(true);
      }
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
          className="fixed inset-0 z-[var(--z-modal)] pointer-events-auto flex items-center justify-center bg-[var(--background)]/70 p-6 backdrop-blur-2xl"
          onClick={() => setDragging(false)}
          onDragEnter={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => {
            counter.current = 0;
            setDragging(false);
            setMeta(null);
          }}
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
          {/* Animated Edge Glow Around Screen Borders */}
          <div className="pointer-events-none absolute inset-0 rounded-none border-[3px] border-[var(--accent-primary)]/40 shadow-[inset_0_0_80px_var(--glow-color),0_0_40px_var(--glow-color)] animate-pulse" />

          {/* Central Modal Drop Zone */}
          <motion.div
            animate={{
              scale: 1,
              y: 0,
            }}
            initial={{ scale: 0.94, y: 12 }}
            exit={{ scale: 0.94, y: 12 }}
            transition={{
              type: "spring",
              stiffness: 350,
              damping: 28,
            }}
            className="relative flex h-[min(65vh,380px)] w-[min(90vw,540px)] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[var(--accent-primary)] bg-[var(--panel-bg)]/[0.95] p-8 text-center shadow-2xl backdrop-blur-3xl"
          >
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-[0_0_30px_var(--glow-color)]">
              <UploadCloud className="h-10 w-10 animate-bounce" />
            </div>

            <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              {i18n("dropToUpload", "Déposez vos fichiers pour téléverser")}
            </h3>

            {meta && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-4 py-1.5 text-[var(--accent-primary)] shadow-sm">
                <File className="h-3.5 w-3.5" />
                <span className="max-w-[260px] truncate text-xs font-mono font-medium">
                  {meta.name}
                  {meta.size ? ` • ${formatBytes(meta.size)}` : ""}
                </span>
                {fileCount > 1 && (
                  <span className="rounded-full bg-[var(--accent-primary)] px-1.5 py-0.2 text-[10px] font-bold text-white">
                    +{fileCount - 1}
                  </span>
                )}
              </div>
            )}

            <p className="mt-3 max-w-xs text-xs text-[var(--text-muted)]">
              {i18n("dropHint", "Relâchez n'importe où sur l'écran pour démarrer l'importation.")}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

