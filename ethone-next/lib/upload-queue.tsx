"use client";

import { createContext, useContext, useRef, useState } from "react";

export type UploadStatus = "queued" | "uploading" | "completed" | "error";

export type UploadItem = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
};

type UploadQueueContextValue = {
  items: UploadItem[];
  add: (files: File[], uploader: (file: File) => Promise<void>) => void;
  remove: (id: string) => void;
  retry: (id: string) => void;
  clearCompleted: () => void;
};

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);

let queueId = 0;

function useSetItems() {
  const [, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef<UploadItem[]>([]);

  function getItems() {
    return itemsRef.current;
  }

  function setNextItems(next: UploadItem[] | ((prev: UploadItem[]) => UploadItem[])) {
    itemsRef.current = typeof next === "function" ? next(itemsRef.current) : next;
    setItems(itemsRef.current);
  }

  return { itemsRef, setNextItems, getItems };
}

export function UploadQueueProvider({ children }: { children: React.ReactNode }) {
  const { itemsRef, setNextItems } = useSetItems();
  const handlers = useRef(new Map<string, (file: File) => Promise<void>>());

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setNextItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setNextItems((prev) => prev.filter((it) => it.id !== id));
    handlers.current.delete(id);
  }

  function startNext() {
    const next = itemsRef.current.find((it) => it.status === "queued");
    if (!next) return;
    const uploader = handlers.current.get(next.id);
    if (!uploader) return;
    const id = next.id;
    updateItem(id, { status: "uploading", progress: 0 });
    uploader(next.file)
      .then(() => updateItem(id, { status: "completed", progress: 100 }))
      .catch((err) =>
        updateItem(id, {
          status: "error",
          progress: 0,
          error: err instanceof Error ? err.message : "Upload failed",
        })
      )
      .finally(() => setTimeout(() => startNext(), 0));
  }

  function add(files: File[], uploader: (file: File) => Promise<void>) {
    const newItems: UploadItem[] = [];
    for (const file of files) {
      queueId += 1;
      const id = `up-${Date.now()}-${queueId}`;
      handlers.current.set(id, uploader);
      newItems.push({ id, file, status: "queued", progress: 0 });
    }
    setNextItems((prev) => [...prev, ...newItems]);
    setTimeout(() => startNext(), 0);
  }

  function remove(id: string) {
    removeItem(id);
  }

  function retry(id: string) {
    const item = itemsRef.current.find((it) => it.id === id);
    if (!item || !handlers.current.has(id)) return;
    updateItem(id, { status: "queued", progress: 0, error: undefined });
    setTimeout(() => startNext(), 0);
  }

  function clearCompleted() {
    setNextItems((prev) => prev.filter((it) => it.status !== "completed"));
  }

  const value: UploadQueueContextValue = {
    get items() {
      return itemsRef.current;
    },
    add,
    remove,
    retry,
    clearCompleted,
  };

  return <UploadQueueContext.Provider value={value}>{children}</UploadQueueContext.Provider>;
}

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) throw new Error("useUploadQueue must be used within UploadQueueProvider");
  return ctx;
}
