"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Upload, File } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { formatBytes } from "@/lib/files";
import { cn } from "@/lib/utils";

export type FileUploadZoneProps = {
  onFiles: (files: File[]) => void;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
};

export default function FileUploadZone({
  onFiles,
  onClick,
  disabled,
  compact = false,
}: FileUploadZoneProps) {
  const i18n = useI18n();
  const [dragging, setDragging] = useState(false);
  const [dragMeta, setDragMeta] = useState<{ name: string; size?: number } | null>(null);
  const counter = useRef(0);

  function firstItem(items: DataTransferItemList | null) {
    if (!items || !items.length) return null;
    const file = items[0].getAsFile?.();
    if (file) return { name: file.name, size: file.size };
    return { name: items[0].type ? items[0].type : "fichier" };
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    if (disabled) return;
    counter.current += 1;
    setDragging(true);
    setDragMeta(firstItem(e.dataTransfer.items as unknown as DataTransferItemList));
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    counter.current = Math.max(0, counter.current - 1);
    if (counter.current === 0) {
      setDragging(false);
      setDragMeta(null);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!dragging && !disabled) {
      setDragging(true);
      setDragMeta(firstItem(e.dataTransfer.items as unknown as DataTransferItemList));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    counter.current = 0;
    setDragging(false);
    setDragMeta(null);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onFiles(files);
  }

  return (
    <motion.div
      onClick={disabled ? undefined : onClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      initial={{ boxShadow: "0 0 0 rgba(0,0,0,0)" }}
      animate={{
        scale: dragging ? 1.01 : 1,
        boxShadow: dragging ? "0 0 32px var(--glow-color)" : "0 0 0 rgba(0,0,0,0)",
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 transition-all duration-200 select-none",
        compact ? "min-h-[9rem] p-4" : "min-h-[12rem] p-8",
        dragging
          ? "border-solid border-[var(--accent-primary)] bg-[var(--accent-primary)]/[0.12]"
          : "border-dashed border-[var(--panel-border)]/[0.3] bg-[var(--panel-bg)]/[0.35] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--panel-bg)]/[0.6]",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <AnimatePresence mode="wait">
        {dragging ? (
          <motion.div
            key="dragging"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center gap-2.5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-sm">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Relâchez pour téléverser</h3>
            {dragMeta && (
              <div className="flex items-center gap-1.5 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-3 py-1 text-[var(--accent-primary)]">
                <File className="h-3 w-3" />
                <span className="max-w-[200px] truncate text-[11px] font-mono font-medium">
                  {dragMeta.name}
                  {dragMeta.size ? ` • ${formatBytes(dragMeta.size)}` : ""}
                </span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center gap-2.5 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--panel-border)]/[0.2] bg-[var(--panel-bg)] text-[var(--text-muted)] transition-all group-hover:scale-105 group-hover:border-[var(--accent-primary)]/30 group-hover:text-[var(--accent-primary)]">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                Glissez-déposez vos fichiers ici ou{" "}
                <span className="text-[var(--accent-primary)] underline underline-offset-2">parcourir</span>
              </h3>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Tous types de fichiers supportés (Images, PDF, Vidéos, Archives, Code)
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {disabled && (
        <span className="absolute bottom-2.5 text-[10px] text-[var(--text-muted)]">
          {i18n("connectDriveFirst", "Connectez d’abord un compte Drive")}
        </span>
      )}
    </motion.div>
  );
}

