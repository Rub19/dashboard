"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWorker, uploadWorker } from "../api";
import { activityJournal } from "@/lib/activity-journal";
import { useCloudCache } from "./useCloudCache";
import { useLivePoll } from "./useLivePoll";

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

import { supabase } from "@/lib/supabase";

function getLocalFiles(userId?: string): CloudFile[] {
  if (typeof window === "undefined") return [];
  const key = userId ? `ethone:local:cloud-files-v2:${userId}` : "ethone:local:cloud-files-v2:guest";
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalFiles(files: CloudFile[], userId?: string) {
  if (typeof window === "undefined") return;
  const key = userId ? `ethone:local:cloud-files-v2:${userId}` : "ethone:local:cloud-files-v2:guest";
  try {
    localStorage.setItem(key, JSON.stringify(files));
  } catch {}
}

export function useCloudFiles(clientId?: string) {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data?.session?.user?.id);
    });
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id);
    });
    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  const [files, setFiles] = useState<CloudFile[]>(() => getLocalFiles());

  useEffect(() => {
    setFiles(getLocalFiles(currentUserId));
  }, [currentUserId]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [trashed, setTrashed] = useState(false);
  const [favorites, setFavorites] = useState(false);
  const [query, setQuery] = useState("");
  const { cache } = useCloudCache();
  const [cacheLoaded, setCacheLoaded] = useState(false);

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
    try {
      const res = await fetchWorker(`/api/cloud/files?${params}`);
      const list = Array.isArray(res?.data?.files) ? res.data.files : [];
      setFiles(list);
      saveLocalFiles(list);
      setError(null);
      if (cache && !query.trim() && !trashed && !favorites) {
        await cache.setFiles(list as Record<string, unknown>[]);
      }
    } catch (err) {
      const local = getLocalFiles();
      if (local && local.length > 0) {
        setFiles(local);
      } else if (cache && !query.trim() && !trashed) {
        try {
          const cached = await (favorites ? cache.getFavorites() : cache.getFiles());
          if (cached && cached.length > 0) {
            setFiles(cached as CloudFile[]);
          }
        } catch {}
      }
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      if (!msg.includes("auth") && !msg.includes("session") && !msg.includes("401")) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setLoading(false);
    }
  }, [params, cache, query, trashed, favorites]);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWorker("/api/cloud/files/favorites");
      const list = Array.isArray(res?.data) ? res.data : [];
      setFiles(list);
      saveLocalFiles(list);
      setError(null);
      if (cache) {
        await cache.setFavorites(list as Record<string, unknown>[]);
      }
    } catch (err) {
      const local = getLocalFiles();
      if (local && local.length > 0) {
        setFiles(local.filter((f) => f.isFavorite));
      } else if (cache) {
        try {
          const cached = await cache.getFavorites();
          if (cached && cached.length > 0) {
            setFiles(cached as CloudFile[]);
          }
        } catch {}
      }
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      if (!msg.includes("auth") && !msg.includes("session") && !msg.includes("401")) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setLoading(false);
    }
  }, [cache]);

  const reload = useCallback(() => {
    if (favorites) return fetchFavorites();
    return fetchList();
  }, [favorites, fetchFavorites, fetchList]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      if (cache && !cacheLoaded && !query.trim() && !trashed) {
        const cached = await (favorites ? cache.getFavorites() : cache.getFiles());
        if (cached?.length) {
          setFiles(cached as CloudFile[]);
        }
        setCacheLoaded(true);
      }
      await reload();
    }
    init();
  }, [reload, cache, cacheLoaded, query, trashed, favorites]);

  useLivePoll(reload, { minGapMs: 10000 });

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

  async function syncWithDrive(filesToSync?: CloudFile[]) {
    if (!clientId) return null;
    let files = filesToSync;
    if (!files) {
      const listRes = await fetchWorker(`/api/google-drive/files?clientId=${encodeURIComponent(clientId)}&pageSize=200`);
      const raw = Array.isArray(listRes?.data?.files) ? listRes.data.files : [];
      files = raw.map((f: Record<string, unknown>) => ({
        driveFileId: String(f.id || ""),
        driveParentId: Array.isArray(f.parents) && f.parents.length ? String(f.parents[0]) : null,
        name: String(f.name || ""),
        mimeType: String(f.mimeType || "application/octet-stream"),
        isFolder: Boolean(f.isFolder),
        size: Number(f.size) || 0,
        webViewLink: f.webViewLink ? String(f.webViewLink) : undefined,
        thumbnailLink: f.thumbnailLink ? String(f.thumbnailLink) : undefined,
        iconUrl: f.iconUrl ? String(f.iconUrl) : undefined,
        md5Checksum: f.md5Checksum ? String(f.md5Checksum) : undefined,
        trashed: Boolean(f.trashed),
        createdAt: f.createdTime ? String(f.createdTime) : undefined,
        date: f.modifiedTime ? String(f.modifiedTime) : undefined,
      })) as CloudFile[];
    }
    const res = await fetchWorker("/api/cloud/files/sync", {
      method: "POST",
      body: JSON.stringify({ clientId, files }),
    });
    await reload();
    return res?.data;
  }

  async function updateFile(driveFileId: string, patch: { name?: string; parentId?: string | null; trashed?: boolean; tags?: string[]; brainSummary?: string }) {
    setFiles((prev) => {
      const next = prev.map((f) => (f.driveFileId === driveFileId ? { ...f, ...patch } : f));
      saveLocalFiles(next);
      return next;
    });
    try {
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
    } catch {}
    await reload();
  }

  async function renameFile(driveFileId: string, name: string) {
    return updateFile(driveFileId, { name });
  }

  async function moveFile(driveFileId: string, newParentId: string | null, currentParentId?: string | null) {
    setFiles((prev) => {
      const next = prev.map((f) => (f.driveFileId === driveFileId ? { ...f, parentId: newParentId, driveParentId: newParentId } : f));
      saveLocalFiles(next);
      return next;
    });
    const addParents = newParentId ? [newParentId] : [];
    const removeParents = currentParentId ? [currentParentId] : [];
    try {
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
    } catch {}
    await reload();
  }

  async function trashFile(driveFileId: string) {
    setFiles((prev) => {
      const next = prev.map((f) => (f.driveFileId === driveFileId ? { ...f, trashed: true } : f));
      saveLocalFiles(next);
      return next;
    });
    try {
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
    } catch {}
    await reload();
  }

  async function restoreFile(driveFileId: string) {
    setFiles((prev) => {
      const next = prev.map((f) => (f.driveFileId === driveFileId ? { ...f, trashed: false } : f));
      saveLocalFiles(next);
      return next;
    });
    try {
      await fetchWorker(`/api/cloud/file?driveFileId=${encodeURIComponent(driveFileId)}`, {
        method: "PATCH",
        body: JSON.stringify({ trashed: false }),
      });
    } catch {}
    await reload();
  }

  async function deleteFile(driveFileId: string) {
    setFiles((prev) => {
      const next = prev.filter((f) => f.driveFileId !== driveFileId);
      saveLocalFiles(next);
      return next;
    });
    try {
      if (clientId) {
        await fetchWorker(`/api/google-drive/files/delete?clientId=${encodeURIComponent(clientId)}&fileId=${encodeURIComponent(driveFileId)}`, {
          method: "DELETE",
        });
      }
      await fetchWorker(`/api/cloud/file?driveFileId=${encodeURIComponent(driveFileId)}`, {
        method: "PATCH",
        body: JSON.stringify({ trashed: true }),
      });
    } catch {}
  }

  async function favoriteFile(driveFileId: string, favorite: boolean) {
    setFiles((prev) => {
      const next = prev.map((f) => (f.driveFileId === driveFileId ? { ...f, isFavorite: favorite } : f));
      saveLocalFiles(next);
      return next;
    });
    try {
      await fetchWorker(`/api/cloud/file/favorite?driveFileId=${encodeURIComponent(driveFileId)}`, {
        method: "POST",
        body: JSON.stringify({ favorite }),
      });
    } catch {}
    await reload();
  }

  async function createFolder(name: string, parentId?: string | null) {
    const newFolder: CloudFile = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      driveFileId: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      mimeType: "application/vnd.google-apps.folder",
      isFolder: true,
      size: 0,
      parentId: parentId || null,
      driveParentId: parentId || null,
      trashed: false,
      tags: ["folder"],
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setFiles((prev) => {
      const next = [newFolder, ...prev];
      saveLocalFiles(next);
      return next;
    });
    activityJournal.capture("v8.files.create", { ok: true, name });
    if (clientId) {
      try {
        const res = await fetchWorker("/api/google-drive/folders", {
          method: "POST",
          body: JSON.stringify({ clientId, name, parentId: parentId || null }),
        });
        if (res?.data?.folder) {
          await syncWithDrive();
          return res.data.folder;
        }
      } catch {}
    }
    return newFolder;
  }

  async function uploadFile(file: File, parentId?: string | null) {
    const newFile: CloudFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      driveFileId: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      isFolder: false,
      size: file.size,
      parentId: parentId || null,
      driveParentId: parentId || null,
      trashed: false,
      tags: ["upload"],
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setFiles((prev) => {
      const next = [newFile, ...prev];
      saveLocalFiles(next);
      return next;
    });
    activityJournal.capture("v8.files.create", { ok: true, name: file.name });
    if (clientId) {
      try {
        const res = await uploadWorker("/api/google-drive/upload", file, { clientId, parentId: parentId || undefined });
        await syncWithDrive();
        return res?.data || newFile;
      } catch {}
    }
    return newFile;
  }

  async function createLink(url: string, title?: string, targetParentId?: string | null) {
    const parent = targetParentId !== undefined ? targetParentId : parentId;
    let fallbackTitle = title?.trim();
    if (!fallbackTitle) {
      try {
        fallbackTitle = new URL(url).hostname;
      } catch {
        fallbackTitle = url;
      }
    }
    const linkFile: CloudFile = {
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      driveFileId: `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: fallbackTitle || "Lien web",
      mimeType: "text/uri-list",
      isFolder: false,
      size: 0,
      webViewLink: url,
      parentId: parent || null,
      driveParentId: parent || null,
      trashed: false,
      tags: ["link"],
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (clientId) {
      try {
        await fetchWorker("/api/cloud/files/sync", {
          method: "POST",
          body: JSON.stringify({ clientId, files: [linkFile] }),
        });
      } catch {}
    }

    setFiles((prev) => [linkFile, ...prev]);
    if (cache) {
      const current = await cache.getFiles();
      await cache.setFiles([linkFile, ...(current || [])] as Record<string, unknown>[]);
    }
    activityJournal.capture("v8.files.create", { ok: true, name: linkFile.name, link: url });
    await reload();
    return linkFile;
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
    createLink,
  };
}
