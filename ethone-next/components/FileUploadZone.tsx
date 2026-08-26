"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Upload, File } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";

function formatDragSize(bytes = 0) {
  if (bytes === 0) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export type FileUploadZoneProps = {
  onFiles: (files: File[]) => void;
  onClick?: () => void;
  disabled?: boolean;
};

export default function FileUploadZone({
  onFiles,
  onClick,
  disabled,
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
      animate={{
        scale: dragging ? 1.005 : 1,
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`group relative flex min-h-[12rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 p-8 text-center transition-colors duration-200 select-none ${
        dragging
          ? "border-solid border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
          : "border-dashed border-[var(--panel-border)]/[0.4] bg-[var(--panel-bg)]/[0.4] hover:border-[var(--text-primary)]/[0.3] hover:bg-[var(--panel-bg)]/[0.6]"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <AnimatePresence mode="wait">
        {dragging ? (
          <motion.div
            key="dragging"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
              <Upload className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Relâchez pour téléverser</h3>
            {dragMeta && (
              <div className="flex items-center gap-2 rounded-full border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-3 py-1 text-[var(--accent-primary)]">
                <File className="h-3.5 w-3.5" />
                <span className="text-[11px] font-mono font-medium">
                  {dragMeta.name}
                  {dragMeta.size ? ` • ${formatDragSize(dragMeta.size)}` : ""}
                </span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--panel-border)]/[0.2] bg-[var(--panel-bg)] text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent-primary)]">
              <UploadCloud className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              Glissez vos fichiers ici ou{" "}
              <span className="text-[var(--accent-primary)] underline underline-offset-2">parcourez</span>
            </h3>
            <p className="max-w-[18rem] text-[11px] text-[var(--text-muted)]">
              PNG, JPG, PDF, MP4 — jusqu&apos;à 50 Mo
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {disabled && (
        <span className="absolute bottom-3 text-[10px] text-[var(--text-muted)]">
          {i18n("connectDriveFirst") || "Connectez d’abord un Drive"}
        </span>
      )}
    </motion.div>
  );
}
