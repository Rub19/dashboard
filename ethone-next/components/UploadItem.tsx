"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { RefreshCcw, Replace, Trash2 } from "lucide-react";
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
  const isImage = task.file.type.startsWith("image/");

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(task.file);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [isImage, task.file]);

  const progress = useMemo(() => {
    if (task.status === "success") return 100;
    if (!task.total) return 0;
    return Math.min(100, Math.round((task.loaded / task.total) * 100));
  }, [task]);

  const trackColor =
    task.status === "success" ? "bg-emerald-500" : task.status === "error" ? "bg-rose-500" : "bg-accent";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-surface/60 p-4 shadow-xl backdrop-blur-xl">
      <div className="flex items-start gap-4">
        <div className="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-raised ring-1 ring-white/5">
          {isImage && objectUrl ? (
            <Image
              src={objectUrl}
              alt={task.file.name}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted">
              <Icon name={mimeIcon(task.file.type, false)} className="h-6 w-6" />
            </div>
          )}
          <span className="absolute bottom-0 left-0 rounded-tr-md bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white">
            {fileExtension(task.file)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{task.file.name}</p>
              <p className="text-xs text-muted">
                {formatBytes(task.file.size)} · {task.status === "uploading" ? formatSpeed(task.speed) : formatBytes(task.file.size)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {task.status === "error" && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-lg p-1.5 text-amber-400 transition hover:bg-amber-500/10"
                  aria-label={i18n("retry")}
                >
                  <RefreshCcw className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onReplace}
                className="rounded-lg p-1.5 text-muted transition hover:text-foreground hover:bg-surface-raised"
                aria-label={i18n("replace")}
              >
                <Replace className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="rounded-lg p-1.5 text-muted transition hover:text-rose-400 hover:bg-rose-500/10"
                aria-label={i18n("remove")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex h-2 overflow-hidden rounded-full bg-surface-raised ring-1 ring-white/5">
              <motion.div
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`h-full ${trackColor}`}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-medium ${
                  task.status === "success" ? "text-emerald-400" : task.status === "error" ? "text-rose-400" : "text-foreground"
                }`}
              >
                {task.status === "success"
                  ? i18n("uploadComplete")
                  : task.status === "error"
                    ? task.error || i18n("uploadFailed")
                    : `${progress}% · ${formatTimeLeft(task.secondsLeft)}${i18n("secondsLeft")}`}
              </span>
              <span className="text-muted">
                {task.status === "uploading" ? `${formatBytes(task.loaded)} / ${formatBytes(task.total)}` : task.status === "success" ? "100%" : `${progress}%`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
