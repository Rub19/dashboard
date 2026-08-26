"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { getToken, WORKER_URL } from "@/lib/api";
import type { UploadTask, UploadStatus } from "@/lib/upload";
import { UPLOAD_CHUNK_SIZE } from "@/lib/upload";
import FileUploadZone from "@/components/FileUploadZone";
import UploadQueueList from "@/components/UploadQueueList";

let idCounter = 0;

export default function FileUploader({
  clientId,
  parentId,
  onAllComplete,
  onFileUploaded,
  initialFiles,
}: {
  clientId?: string;
  parentId?: string | null;
  onAllComplete?: () => void;
  onFileUploaded?: (file: File) => void;
  initialFiles?: File[];
}) {
  const i18n = useI18n();
  const [queue, setQueue] = useState<UploadTask[]>([]);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const completedRef = useRef(false);
  const abortControllers = useRef(new Map<string, AbortController>());

  const startUpload = useCallback(
    async (initialTask: UploadTask) => {
      if (!clientId) return;

      const { id, file } = initialTask;
      const total = file.size;

      const token = await getToken();
      if (!token) {
        setQueue((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: "error" as UploadStatus, error: i18n("uploadFailed") } : t
          )
        );
        return;
      }

      const controller = new AbortController();
      abortControllers.current.set(id, controller);

      setQueue((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: "uploading" as UploadStatus, startTime: performance.now(), error: undefined, xhr: undefined }
            : t
        )
      );

      let uploadedBytes = initialTask.uploadedBytes || 0;
      let uploadToken = initialTask.uploadToken || "";
      let activeXhr: XMLHttpRequest | undefined;

      controller.signal.addEventListener("abort", () => {
        if (activeXhr) {
          try {
            activeXhr.abort();
          } catch {}
        }
      });

      const updateTask = (patch: Partial<UploadTask>) =>
        setQueue((prev) => {
          if (!prev.find((t) => t.id === id)) return prev;
          return prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
        });

      try {
        while (uploadedBytes < total) {
          if (controller.signal.aborted) return;

          const chunkStart = uploadedBytes;
          const chunkSize = Math.min(UPLOAD_CHUNK_SIZE, total - uploadedBytes);
          const chunkEnd = chunkStart + chunkSize - 1;
          const chunk = file.slice(chunkStart, chunkStart + chunkSize);

          const result = await new Promise<{
            complete: boolean;
            file?: unknown;
            uploaded?: number;
            total?: number;
            token?: string;
          }>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            activeXhr = xhr;

            updateTask({ xhr });

            xhr.open("POST", `${WORKER_URL}/api/google-drive/upload/chunk`);
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            xhr.setRequestHeader("x-ethone-client-id", clientId);
            xhr.setRequestHeader("x-ethone-file-name", file.name);
            xhr.setRequestHeader("x-ethone-file-mime", file.type || "application/octet-stream");
            xhr.setRequestHeader("x-ethone-file-size", String(total));
            if (uploadToken) xhr.setRequestHeader("x-ethone-upload-token", uploadToken);
            if (parentId) xhr.setRequestHeader("x-ethone-file-parent", parentId);
            xhr.setRequestHeader("Content-Range", `bytes ${chunkStart}-${chunkEnd}/${total}`);

            const chunkSendStart = performance.now();

            xhr.upload.onprogress = (e) => {
              if (!e.lengthComputable) return;
              const now = performance.now();
              const currentLoaded = chunkStart + e.loaded;
              const elapsed = Math.max(0.001, (now - chunkSendStart) / 1000);
              const speed = e.loaded / elapsed;
              const secondsLeft = speed > 0 ? (total - currentLoaded) / speed : 0;
              const progress = Math.min(100, Math.round((currentLoaded / total) * 100));
              updateTask({ loaded: currentLoaded, total, progress, speed, secondsLeft });
            };

            xhr.onload = () => {
              activeXhr = undefined;
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
                  if (xhr.status === 200 && data?.data?.file) {
                    resolve({ complete: true, file: data.data.file });
                  } else if ((xhr.status === 202 || data?.data?.status === "incomplete") && data?.data?.token) {
                    resolve({
                      complete: false,
                      uploaded: data.data.uploaded,
                      total: data.data.total,
                      token: data.data.token,
                    });
                  } else {
                    reject(new Error(i18n("uploadFailed")));
                  }
                } catch {
                  reject(new Error(i18n("uploadFailed")));
                }
              } else {
                let message = `Worker ${xhr.status}`;
                try {
                  const data = JSON.parse(xhr.responseText);
                  if (data?.error?.message) message = data.error.message;
                  else if (data?.error?.code) message = data.error.code;
                } catch {}
                reject(new Error(message));
              }
            };

            xhr.onerror = () => {
              activeXhr = undefined;
              reject(new Error(i18n("error")));
            };

            xhr.ontimeout = () => {
              activeXhr = undefined;
              reject(new Error(i18n("error")));
            };

            xhr.onabort = () => {
              activeXhr = undefined;
              reject(new Error(i18n("cancel")));
            };

            xhr.send(chunk);
          });

          if (result.complete) {
            updateTask({
              status: "success" as UploadStatus,
              progress: 100,
              loaded: total,
              uploadedBytes: total,
              uploadToken: "",
              xhr: undefined,
            });
            onFileUploaded?.(file);
            break;
          }

          const nextOffset = Number(result.uploaded);
          const nextToken = String(result.token);
          if (!Number.isSafeInteger(nextOffset) || nextOffset <= uploadedBytes || !nextToken) {
            throw new Error(i18n("uploadFailed"));
          }

          uploadedBytes = nextOffset;
          uploadToken = nextToken;
          updateTask({
            uploadedBytes,
            uploadToken,
            loaded: uploadedBytes,
            total,
            progress: Math.min(100, Math.round((uploadedBytes / total) * 100)),
            xhr: undefined,
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : i18n("error");
        updateTask({
          status: "error" as UploadStatus,
          error: message,
          xhr: undefined,
          loaded: uploadedBytes,
          progress: Math.min(100, Math.round((uploadedBytes / total) * 100)),
        });
      } finally {
        abortControllers.current.delete(id);
      }
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
                  uploadedBytes: 0,
                  uploadToken: "",
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
        uploadedBytes: 0,
        uploadToken: "",
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
          ? {
              ...t,
              status: "pending" as UploadStatus,
              error: undefined,
              xhr: undefined,
            }
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
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(id);
    }
    setQueue((prev) => prev.filter((t) => t.id !== id));
  }

  function replace(id: string) {
    setReplaceId(id);
    inputRef.current?.click();
  }

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      addFiles(initialFiles);
    }
  }, [initialFiles, addFiles]);

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
      <FileUploadZone
        onFiles={addFiles}
        onClick={() => inputRef.current?.click()}
        disabled={!clientId}
      />

      {queue.length > 0 && (
        <div className="space-y-3">
          <UploadQueueList
            tasks={queue}
            onRetry={retry}
            onRemove={remove}
            onReplace={replace}
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setQueue([])}
              className="flex items-center gap-1.5 rounded-[var(--panel-radius)] px-3 py-2 text-xs font-medium text-muted transition hover:bg-[var(--panel-bg)] hover:text-foreground"
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
