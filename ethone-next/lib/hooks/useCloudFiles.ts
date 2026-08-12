"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWorker, uploadWorker } from "../api";
import { activityJournal } from "@/lib/activity-journal";

export type CloudFile = {
  id: string;
  driveFileId: string;
  parentId: string | null;
  driveParentId: string | null;
  name: string;
  mimeType: string;
  isFolder: boolean;
  size: number;
  webViewLink?: string;
  thumbnailLink?: string;
  iconUrl?: string;
  trashed: boolean;
  tags: string[];
  brainSummary?: string;
  createdAt?: string;
  updatedAt?: string;
  isFavorite: boolean;
};

export type Quota = {
  used: number;
  total: number;
};

export function useCloudFiles(clientId?: string) {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [trashed, setTrashed] = useState(false);
  const [favorites, setFavorites] = useState(false);
  const [query, setQuery] = useState("");

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (parentId) p.set("parentId", parentId);
    if (trashed) p.set("trashed", "true");
    if (query) p.set("q", query);
    p.set("limit", "100");
    return p.toString();
  }, [parentId, trashed, query]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker(`/api/cloud/files?${params}`);
      const list = Array.isArray(res?.data?.files) ? res.data.files : [];
      setFiles(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [params]);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker("/api/cloud/files/favorites");
      const list = Array.isArray(res?.data) ? res.data : [];
      setFiles(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(() => {
    if (favorites) return fetchFavorites();
    return fetchList();
  }, [favorites, fetchFavorites, fetchList]);

  useEffect(() => {
    reload();
  }, [reload]);

  const fetchQuota = useCallback(async () => {
    if (!clientId) return;
    try {
      const res = await fetchWorker(`/api/google-drive/quota?clientId=${encodeURIComponent(clientId)}`);
      const data = res?.data || res;
      if (data && typeof data.used === "number" && typeof data.total === "number") {
        setQuota({ used: data.used, total: data.total });
      }
    } catch {
      setQuota(null);
    }
  }, [clientId]);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  async function syncWithDrive(filesToSync: CloudFile[] = []) {
    if (!clientId) return null;
    const res = await fetchWorker("/api/cloud/files/sync", {
      method: "POST",
      body: JSON.stringify({ clientId, files: filesToSync }),
    });
    await reload();
    return res?.data;
  }

  async function updateFile(driveFileId: string, patch: { name?: string; parentId?: string | null; trashed?: boolean; tags?: string[]; brainSummary?: string }) {
    await fetchWorker(`/api/cloud/file?driveFileId=${encodeURIComponent(driveFileId)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (clientId && patch.name) {
      await fetchWorker("/api/google-drive/files/update", {
        method: "PATCH",
        body: JSON.stringify({ clientId, fileId: driveFileId, name: patch.name, addParents: [], removeParents: [] }),
      });
    }
    await reload();
  }

  async function renameFile(driveFileId: string, name: string) {
    return updateFile(driveFileId, { name });
  }

  async function moveFile(driveFileId: string, newParentId: string | null, currentParentId?: string | null) {
    const addParents = newParentId ? [newParentId] : [];
    const removeParents = currentParentId ? [currentParentId] : [];
    if (clientId) {
      await fetchWorker("/api/google-drive/files/update", {
        method: "PATCH",
        body: JSON.stringify({ clientId, fileId: driveFileId, addParents, removeParents }),
      });
    }
    await fetchWorker(`/api/cloud/file?driveFileId=${encodeURIComponent(driveFileId)}`, {
      method: "PATCH",
      body: JSON.stringify({ parentId: newParentId }),
    });
    await reload();
  }

  async function trashFile(driveFileId: string) {
    if (clientId) {
      await fetchWorker("/api/google-drive/files/trash", {
        method: "POST",
        body: JSON.stringify({ clientId, fileId: driveFileId }),
      });
    }
    await fetchWorker(`/api/cloud/file?driveFileId=${encodeURIComponent(driveFileId)}`, {
      method: "PATCH",
      body: JSON.stringify({ trashed: true }),
    });
    await reload();
  }

  async function restoreFile(driveFileId: string) {
    await fetchWorker(`/api/cloud/file?driveFileId=${encodeURIComponent(driveFileId)}`, {
      method: "PATCH",
      body: JSON.stringify({ trashed: false }),
    });
    await reload();
  }

  async function deleteFile(driveFileId: string) {
    if (clientId) {
      await fetchWorker(`/api/google-drive/files/delete?clientId=${encodeURIComponent(clientId)}&fileId=${encodeURIComponent(driveFileId)}`, {
        method: "DELETE",
      });
    }
    await fetchWorker(`/api/cloud/file?driveFileId=${encodeURIComponent(driveFileId)}`, {
      method: "PATCH",
      body: JSON.stringify({ trashed: true }),
    });
    setFiles((prev) => prev.filter((f) => f.driveFileId !== driveFileId));
  }

  async function favoriteFile(driveFileId: string, favorite: boolean) {
    await fetchWorker(`/api/cloud/file/favorite?driveFileId=${encodeURIComponent(driveFileId)}`, {
      method: "POST",
      body: JSON.stringify({ favorite }),
    });
    await reload();
  }

  async function createFolder(name: string, parentId?: string | null) {
    if (!clientId) return null;
    const res = await fetchWorker("/api/google-drive/folders", {
      method: "POST",
      body: JSON.stringify({ clientId, name, parentId: parentId || null }),
    });
    activityJournal.capture("v8.files.create", { ok: !!res?.data?.folder, name });
    await syncWithDrive();
    return res?.data?.folder;
  }

  async function uploadFile(file: File, parentId?: string | null) {
    if (!clientId) return null;
    const res = await uploadWorker("/api/google-drive/upload", file, { clientId, parentId: parentId || undefined });
    activityJournal.capture("v8.files.create", { ok: !!res?.data, name: file.name });
    await syncWithDrive();
    return res?.data;
  }

  const visibleFiles = useMemo(() => {
    if (favorites) return files;
    let list = files;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    return list;
  }, [files, favorites, query]);

  return {
    files: visibleFiles,
    allFiles: files,
    loading,
    error,
    quota,
    parentId,
    setParentId,
    trashed,
    setTrashed,
    favorites,
    setFavorites,
    query,
    setQuery,
    reload,
    syncWithDrive,
    renameFile,
    moveFile,
    trashFile,
    restoreFile,
    deleteFile,
    favoriteFile,
    createFolder,
    uploadFile,
  };
}
