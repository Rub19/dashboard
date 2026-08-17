"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import NextImage from "next/image";
import { RefreshCcw, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { formatBytes, mimeIcon } from "@/lib/files";
import type { UploadTask } from "@/lib/upload";
import { formatSpeed, formatTimeLeft, fileExtension } from "@/lib/upload";

export default function UploadItem({
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
    if (!task.total) return 0;
    return Math.min(100, Math.round((task.loaded / task.total) * 100));
  }, [task]);

  const trackColor =
    task.status === "success" ? "bg-emerald-500" : task.status === "error" ? "bg-rose-500" : "bg-emerald-500 dark:bg-emerald-400";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-zinc-950/80 dark:shadow-md">
      <div className="flex items-center gap-3">
        {/* Thumbnail */}
        <div className="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200/60 bg-zinc-100/80 ring-1 ring-zinc-200/60 dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/5">
          {isImage && objectUrl ? (
            <NextImage src={objectUrl} alt={task.file.name} fill unoptimized className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-500">
              <Icon name={mimeIcon(task.file.type, false)} className="h-6 w-6" />
            </div>
          )}
          <span className="absolute bottom-0 left-0 rounded-tr-md bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            {fileExtension(task.file)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">{task.file.name}</p>
              <p className="text-[10px] text-zinc-500">
                {formatBytes(task.file.size)}
                {dimensions ? ` • ${dimensions}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {task.status === "error" && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex items-center gap-1 rounded-lg border border-rose-600/20 bg-rose-500/15 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/25 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
                  aria-label={i18n("retry")}
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  {i18n("retry")}
                </button>
              )}

              {task.status === "success" && (
                <button
                  type="button"
                  onClick={onReplace}
                  className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-950 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  aria-label={i18n("replace")}
                >
                  <RefreshCcw className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onRemove}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                aria-label={i18n("remove")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {task.status === "uploading" && (
            <div className="mt-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400">{progress}%</span>
                <span className="font-mono text-[10px] text-zinc-500">
                  {formatTimeLeft(task.secondsLeft)}s restantes • {formatSpeed(task.speed)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-xl bg-zinc-200 dark:bg-white/[0.06]">
                <motion.div
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className={`h-full rounded-xl ${trackColor}`}
                />
              </div>
            </div>
          )}

          {task.status === "success" && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-lg border border-emerald-600/20 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Téléversé à l&apos;instant
              </span>
            </div>
          )}

          {task.status === "error" && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-lg border border-rose-600/20 bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {task.error || i18n("uploadFailed")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
