"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NextImage from "next/image";
import {
  RefreshCcw,
  Trash2,
  Replace,
  CheckCircle2,
  AlertCircle,
  File as FileIcon,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { formatBytes, mimeIcon } from "@/lib/files";
import { formatSpeed, formatTimeLeft, fileExtension } from "@/lib/upload";
import type { UploadTask } from "@/lib/upload";

export type UploadQueueListProps = {
  tasks: UploadTask[];
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onReplace: (id: string) => void;
};

function QueueItem({
  task,
  onRetry,
  onRemove,
  onReplace,
}: {
  task: UploadTask;
  onRetry: () => void;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const i18n = useI18n();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<string | null>(null);
  const isImage = task.file.type.startsWith("image/");

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(task.file);
      setObjectUrl(url);
      const img = document.createElement("img");
      img.onload = () => setDimensions(`${img.naturalWidth} × ${img.naturalHeight}`);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [isImage, task.file]);

  const progress = useMemo(() => {
    if (task.status === "success") return 100;
    return Math.min(100, Math.round((task.loaded / (task.total || task.file.size)) * 100));
  }, [task]);

  const isUploading = task.status === "uploading";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-zinc-950/80 p-4 shadow-md backdrop-blur-xl transition-colors ${
        task.status === "error"
          ? "border-rose-500/30 bg-rose-500/[0.04]"
          : "border-[var(--text-primary)]/[0.08]"
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div className="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[var(--text-primary)]/[0.04]">
          {isImage && objectUrl ? (
            <NextImage
              src={objectUrl}
              alt={task.file.name}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
              <Icon name={mimeIcon(task.file.type, false)} className="h-6 w-6" />
            </div>
          )}
          <span className="absolute bottom-0 left-0 rounded-tr-md bg-[--accent-primary] px-1.5 py-0.5 text-[9px] font-bold text-[var(--text-primary)]">
            {fileExtension(task.file)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{task.file.name}</p>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                {formatBytes(task.file.size)}
                {dimensions ? ` • ${dimensions}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {task.status === "error" && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex items-center gap-1 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-2 py-1 text-[10px] font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/20"
                  aria-label={i18n("retry")}
                >
                  <RefreshCcw className="h-3 w-3" />
                  {i18n("resume") || "Reprendre"}
                </button>
              )}

              {task.status === "success" && (
                <button
                  type="button"
                  onClick={onReplace}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
                  aria-label={i18n("replace")}
                >
                  <Replace className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onRemove}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                aria-label={i18n("remove")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isUploading && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-end justify-between">
                <span className="text-lg font-mono font-bold text-[--accent-primary]">{progress}%</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {formatTimeLeft(task.secondsLeft)}s restantes • {formatSpeed(task.speed)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <motion.div
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="h-full rounded-full bg-[--accent-primary]"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>{formatBytes(task.loaded)} / {formatBytes(task.total || task.file.size)}</span>
                <span>{formatBytes(task.total || task.file.size)}</span>
              </div>
            </div>
          )}

          {task.status === "success" && (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-lg border border-[--accent-primary] bg-[--accent-primary] px-2 py-0.5 text-[10px] font-semibold text-[--accent-primary]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {i18n("uploadedInstant") || "Téléversé à l’instant"}
              </span>
            </div>
          )}

          {task.status === "error" && (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {task.error || i18n("uploadFailed") || "Échec de connexion — Fichier conservé"}
              </span>
            </div>
          )}

          {task.status === "pending" && (
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <FileIcon className="h-3.5 w-3.5" />
              En attente
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UploadQueueList({
  tasks,
  onRetry,
  onRemove,
  onReplace,
}: UploadQueueListProps) {
  const completed = tasks.filter((t) => t.status === "success").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl v8-panel px-4 py-3 backdrop-blur-2xl">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
          <span className="text-[--accent-primary]">File d&apos;attente</span>
          <span className="text-[var(--text-muted)]">— {completed} / {tasks.length} terminé{tasks.length > 1 ? "s" : ""}</span>
        </div>
        {tasks.some((t) => t.status === "uploading") && (
          <span className="text-xs text-[--accent-primary]">
            {tasks.filter((t) => t.status === "uploading").length} en cours
          </span>
        )}
      </div>

      <div className="grid gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <QueueItem
                task={task}
                onRetry={() => onRetry(task.id)}
                onRemove={() => onRemove(task.id)}
                onReplace={() => onReplace(task.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
