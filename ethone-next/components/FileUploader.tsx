"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, X } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { getToken, WORKER_URL } from "@/lib/api";
import type { UploadTask, UploadStatus } from "@/lib/upload";
import DropZone from "@/components/DropZone";
import UploadItem from "@/components/UploadItem";

let idCounter = 0;

export default function FileUploader({
  clientId,
  parentId,
  onAllComplete,
  onFileUploaded,
}: {
  clientId?: string;
  parentId?: string | null;
  onAllComplete?: () => void;
  onFileUploaded?: (file: File) => void;
}) {
  const i18n = useI18n();
  const [queue, setQueue] = useState<UploadTask[]>([]);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const completedRef = useRef(false);

  const total = queue.length;
  const completed = queue.filter((t) => t.status === "success").length;
  const hasActive = queue.some((t) => t.status === "uploading" || t.status === "pending");

  const startUpload = useCallback(
    (task: UploadTask) => {
      if (!clientId) return;
      const start = performance.now();
      const id = task.id;
      const xhr = new XMLHttpRequest();

      setQueue((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: "uploading" as UploadStatus, startTime: start, loaded: 0, progress: 0, speed: 0, secondsLeft: 0, error: undefined, xhr }
            : t
        )
      );

      getToken().then((token) => {
        xhr.open("POST", `${WORKER_URL}/api/google-drive/upload`);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("x-ethone-client-id", clientId);
        xhr.setRequestHeader("x-ethone-file-name", task.file.name);
        xhr.setRequestHeader("x-ethone-file-mime", task.file.type || "application/octet-stream");
        xhr.setRequestHeader("x-ethone-file-size", String(task.file.size));
        if (parentId) xhr.setRequestHeader("x-ethone-file-parent", parentId);

        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          const now = performance.now();
          const elapsed = Math.max(0.001, (now - start) / 1000);
          const loaded = e.loaded;
          const totalBytes = e.total || task.file.size;
          const progress = totalBytes ? Math.round((loaded / totalBytes) * 100) : 0;
          const speed = loaded / elapsed;
          const secondsLeft = speed > 0 ? (totalBytes - loaded) / speed : 0;

          setQueue((prev) =>
            prev.map((t) =>
              t.id === id
                ? { ...t, loaded, total: totalBytes, progress, speed, secondsLeft }
                : t
            )
          );
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const text = xhr.responseText;
              const data = text ? JSON.parse(text) : null;
              if (data?.file) {
                setQueue((prev) => prev.map((t) => (t.id === id ? { ...t, status: "success", progress: 100 } : t)));
                onFileUploaded?.(task.file);
              } else {
                setQueue((prev) =>
                  prev.map((t) => (t.id === id ? { ...t, status: "error", error: i18n("uploadFailed") } : t))
                );
              }
            } catch {
              setQueue((prev) =>
                prev.map((t) => (t.id === id ? { ...t, status: "error", error: i18n("uploadFailed") } : t))
              );
            }
          } else {
            setQueue((prev) =>
              prev.map((t) => (t.id === id ? { ...t, status: "error", error: `Worker ${xhr.status}` } : t))
            );
          }
        };

        xhr.onerror = () =>
          setQueue((prev) => prev.map((t) => (t.id === id ? { ...t, status: "error", error: i18n("error") } : t)));

        xhr.ontimeout = () =>
          setQueue((prev) => prev.map((t) => (t.id === id ? { ...t, status: "error", error: i18n("error") } : t)));

        xhr.onabort = () =>
          setQueue((prev) => prev.map((t) => (t.id === id ? { ...t, status: "error", error: i18n("cancel") } : t)));

        xhr.send(task.file);
      });
    },
    [clientId, parentId, i18n, onFileUploaded]
  );

  const addFiles = useCallback(
    (files: File[], replace?: string | null) => {
      if (!clientId) return;
      if (replace) {
        const file = files[0];
        if (!file) return;
        setQueue((prev) => {
          const next = prev.map((t) =>
            t.id === replace
              ? {
                  ...t,
                  file,
                  status: "pending" as UploadStatus,
                  loaded: 0,
                  total: file.size,
                  progress: 0,
                  speed: 0,
                  secondsLeft: 0,
                  error: undefined,
                  xhr: undefined,
                }
              : t
          );
          return next;
        });
        setReplaceId(null);
        setTimeout(() => {
          setQueue((prev) => {
            const task = prev.find((t) => t.id === replace);
            if (task) startUpload(task);
            return prev;
          });
        }, 0);
        return;
      }

      const newTasks: UploadTask[] = files.map((file) => ({
        id: `upload-${++idCounter}-${Date.now()}`,
        file,
        status: "pending",
        loaded: 0,
        total: file.size,
        progress: 0,
        speed: 0,
        secondsLeft: 0,
        startTime: 0,
      }));

      setQueue((prev) => [...prev, ...newTasks]);
      newTasks.forEach((task) => setTimeout(() => startUpload(task), 0));
    },
    [clientId, startUpload]
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) addFiles(files, replaceId);
    e.target.value = "";
  }

  function retry(id: string) {
    setQueue((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: "pending", loaded: 0, progress: 0, speed: 0, secondsLeft: 0, error: undefined, xhr: undefined }
          : t
      )
    );
    setTimeout(() => {
      setQueue((prev) => {
        const task = prev.find((t) => t.id === id);
        if (task) startUpload(task);
        return prev;
      });
    }, 0);
  }

  function remove(id: string) {
    setQueue((prev) => {
      const task = prev.find((t) => t.id === id);
      if (task?.xhr) {
        try {
          task.xhr.abort();
        } catch {}
      }
      return prev.filter((t) => t.id !== id);
    });
  }

  function replace(id: string) {
    setReplaceId(id);
    inputRef.current?.click();
  }

  useEffect(() => {
    if (queue.length === 0) {
      completedRef.current = false;
      return;
    }
    const allDone = queue.every((t) => t.status === "success" || t.status === "error");
    if (allDone && !completedRef.current) {
      completedRef.current = true;
      onAllComplete?.();
    }
  }, [queue, onAllComplete]);

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
        aria-label={i18n("uploadFile")}
      />
      <DropZone
        onFiles={addFiles}
        onClick={() => inputRef.current?.click()}
        disabled={!clientId}
      />

      {queue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-surface/60 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <UploadCloud className="h-4 w-4 text-accent" />
              <span>
                {i18n("upload")} {total} {i18n("files")} — {completed} / {total} {i18n("completed")}
              </span>
            </div>
            {hasActive && (
              <span className="text-xs text-muted">
                {queue.filter((t) => t.status === "uploading").length} {i18n("uploading")}
              </span>
            )}
          </div>

          <div className="grid gap-3">
            <AnimatePresence initial={false} mode="popLayout">
              {queue.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <UploadItem
                    task={task}
                    onRetry={() => retry(task.id)}
                    onRemove={() => remove(task.id)}
                    onReplace={() => replace(task.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setQueue([])}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface-raised hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              {i18n("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
