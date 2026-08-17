"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, UploadCloud } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";

export default function DropZone({
  onFiles,
  onClick,
  disabled,
  multiple = true,
}: {
  onFiles: (files: File[]) => void;
  onClick?: () => void;
  disabled?: boolean;
  multiple?: boolean;
}) {
  const i18n = useI18n();
  const [dragging, setDragging] = useState(false);
  const counter = useRef(0);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    if (disabled) return;
    counter.current += 1;
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    counter.current = Math.max(0, counter.current - 1);
    if (counter.current === 0) setDragging(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    counter.current = 0;
    setDragging(false);
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
      whileTap={disabled ? undefined : { scale: 0.99 }}
      animate={{
        scale: dragging ? 1.015 : 1,
        borderColor: dragging ? "var(--accent)" : "rgba(255,255,255,0.10)",
      }}
      transition={{ duration: 0.15, ease: "easeOut" as const }}
      className={`group relative flex min-h-[14rem] cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-8 text-center backdrop-blur-xl transition-colors ${
        dragging ? "border-solid border-accent bg-accent/5" : ""
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <motion.div
        animate={{ opacity: dragging ? 1 : 0, scale: dragging ? 1.1 : 0.95 }}
        transition={{ duration: 0.2 }}
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-radial from-accent/15 via-transparent to-transparent"
      />
      <motion.div
        animate={{
          y: dragging ? -4 : 0,
          scale: dragging ? 1.15 : 1,
        }}
        transition={{ duration: 0.15, ease: "easeOut" as const }}
        className="flex h-16 w-16 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--panel-bg)] shadow-inner ring-1 ring-white/5"
      >
        {dragging ? (
          <Upload className="h-7 w-7 text-accent" />
        ) : (
          <UploadCloud className="h-7 w-7 text-muted transition-colors group-hover:text-foreground" />
        )}
      </motion.div>
      <div className="space-y-1">
        <p className={`text-base font-medium transition-colors ${dragging ? "text-accent" : "text-foreground"}`}>
          {i18n(dragging ? "dropToUpload" : "dropFilesHere")}
        </p>
        <p className="text-sm text-muted">{i18n("orClickToBrowse")}</p>
      </div>
      <p className="text-xs text-muted/70">
        {multiple ? i18n("dropFilesHere") : i18n("dropHere")}
      </p>
    </motion.div>
  );
}
