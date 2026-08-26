"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useCloudFiles, type CloudFile } from "@/lib/hooks/useCloudFiles";
import { useUserState } from "@/lib/hooks/useUserState";
import { useShares } from "@/lib/hooks/useShares";
import { useDrops } from "@/lib/hooks/useDrops";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";
import Modal from "@/components/ui/Modal";
import TabList from "@/components/tabs/TabList";
import ContextMenu from "@/components/ContextMenu";
import { useSelection } from "@/lib/hooks/useSelection";
import BulkActionBar from "@/components/BulkActionBar";
import { formatBytes, sortFiles } from "@/lib/files";
import FilesAdminPanel from "@/components/FilesAdminPanel";
import FileAddModal from "@/components/FileAddModal";
import FilePreview from "@/components/FilePreview";
import FileCard from "@/components/FileCard";
import FileDropOverlay from "@/components/FileDropOverlay";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";

function folderPath(files: CloudFile[], folderId: string | null) {
  const path: CloudFile[] = [];
  const seen = new Set<string>();
  let cursor = folderId;
  while (cursor) {
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const folder = files.find((f) => f.driveFileId === cursor && f.isFolder);
    if (!folder) break;
    path.unshift(folder);
    cursor = folder.driveParentId;
  }
  return path;
}

function descendantFolderIds(files: CloudFile[], folderId: string) {
  const ids = new Set<string>();
  const queue = [folderId];
  while (queue.length) {
    const current = queue.shift()!;
    files.forEach((f) => {
      if (f.isFolder && f.driveParentId === current && !ids.has(f.driveFileId)) {
        ids.add(f.driveFileId);
        queue.push(f.driveFileId);
      }
    });
  }
  return ids;
}

type Modal =
  | { type: "share"; file: CloudFile }
  | { type: "drop" }
  | { type: "rename"; file: CloudFile }
  | { type: "move"; file: CloudFile }
  | null;

export default function FilesPage() {
  const i18n = useI18n();
  const { success, error: toastError } = useToast();
  const [clientId, setClientId] = useUserState<string>("clientId:google-drive", "");
  const {
    files,
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
    renameFile,
    moveFile,
    trashFile,
    restoreFile,
    deleteFile,
    favoriteFile,
    createFolder,
  } = useCloudFiles(clientId || undefined);

  const { create: createShare } = useShares();
  const { create: createDrop } = useDrops();

  const [modal, setModal] = useState<Modal>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sort, setSort] = useState<"name" | "size" | "date" | "type">("name");
  const [showFolders, setShowFolders] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    try {
      const saved = localStorage.getItem("ethone.files.viewMode");
      return saved === "grid" ? "grid" : "list";
    } catch {
      return "list";
    }
  });
  const [showDuplicates, setShowDuplicates] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("ethone.files.viewMode", viewMode);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (query) {
          e.preventDefault();
          setQuery("");
          searchRef.current?.blur();
        } else if (addOpen) {
          setAddOpen(false);
        } else if (previewFile) {
          setPreviewFile(null);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        e.preventDefault();
        setAddOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [query, setQuery, addOpen, setAddOpen, previewFile, setPreviewFile]);

  const { duplicateIds, duplicateCount } = useMemo(() => {
    const groups = new Map<string, CloudFile[]>();
    for (const file of files) {
      if (file.isFolder) continue;
      const key = `${file.name}|${file.size}`;
      const group = groups.get(key) || [];
      group.push(file);
      groups.set(key, group);
    }
    const dups: CloudFile[] = [];
    for (const [, group] of groups) {
      if (group.length > 1) dups.push(...group);
    }
    const ids = new Set(dups.map((f) => f.driveFileId));
    return { duplicateIds: ids, duplicateCount: dups.length };
  }, [files]);

  const filteredFiles = useMemo(() => {
    if (favorites) return sortFiles(files, sort);
    let list = files.filter((f) => {
      if (showFolders) return f.isFolder && (trashed ? f.trashed : !f.trashed);
      return f.isFolder || (trashed ? f.trashed : !f.trashed);
    });
    if (parentId) {
      list = list.filter((f) => (f.driveParentId || null) === parentId || (f.driveFileId === parentId && f.isFolder));
    } else {
      list = list.filter((f) => !f.driveParentId);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (showDuplicates) {
      list = list.filter((f) => !f.isFolder && duplicateIds.has(f.driveFileId));
    }
    return sortFiles(list, sort);
  }, [files, favorites, showFolders, parentId, trashed, query, sort, showDuplicates, duplicateIds]);

  function getFileTime(file: CloudFile) {
    const raw = file.updatedAt || file.createdAt || 0;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  const recentFiles = useMemo(() => {
    if (query || favorites || trashed || showFolders || parentId) return [];
    return [...files]
      .filter((f) => !f.isFolder && !f.trashed)
      .sort((a, b) => getFileTime(b) - getFileTime(a))
      .slice(0, 5);
  }, [files, query, favorites, trashed, showFolders, parentId]);

  const brainPicks = useMemo(() => {
    if (query || favorites || trashed || showFolders || parentId) return [];
    return [...files]
      .filter((f) => !f.isFolder && !f.trashed && f.brainSummary?.trim())
      .sort((a, b) => getFileTime(b) - getFileTime(a))
      .slice(0, 5);
  }, [files, query, favorites, trashed, showFolders, parentId]);

  const { selected, selectedItems, hasSelection, isAllSelected, toggle, selectAll, clear, isSelected } = useSelection<CloudFile>(filteredFiles);

  const path = useMemo(() => folderPath(files, parentId), [files, parentId]);

  const previewLocation = useMemo(() => {
    if (!previewFile) return "";
    const parts = [i18n("filesTitle")];
    const current = path.map((p) => p.name);
    if (previewFile.driveParentId) {
      const parent = files.find((f) => f.driveFileId === previewFile.driveParentId);
      if (parent) current.push(parent.name);
    }
    return [...parts, ...current].join(" / ");
  }, [previewFile, files, path, i18n]);

  const quotaPercent = quota && quota.total ? Math.min(100, Math.round((quota.used / quota.total) * 100)) : 0;

  function connectDrive() {
    const id = prompt(i18n("clientId"));
    if (!id) return;
    setClientId(id);
  }

  async function handleCreateFolder(name: string) {
    if (!clientId) return;
    try {
      await createFolder(name, parentId);
      success(i18n("createFolder"));
      await reload();
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!modal || modal.type !== "rename" || !form.name) return;
    setSubmitting(true);
    try {
      await renameFile(modal.file.driveFileId, form.name);
      setModal(null);
      setForm({});
      success(i18n("rename"));
      await reload();
    } catch (err) {
      toastError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMove(targetId: string | null) {
    if (!modal || modal.type !== "move") return;
    setSubmitting(true);
    try {
      await moveFile(modal.file.driveFileId, targetId, modal.file.driveParentId);
      setModal(null);
      success(i18n("move"));
      await reload();
    } catch (err) {
      toastError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    if (!modal || modal.type !== "share") return;
    setSubmitting(true);
    try {
      const share = await createShare({
        fileId: modal.file.id,
        visibility: (form.visibility as "public" | "private" | "password") || "public",
        password: form.password || undefined,
        expiresAt: form.expiresAt || undefined,
        maxDownloads: form.maxDownloads ? Number(form.maxDownloads) : undefined,
      });
      if (share?.slug) {
        const link = `${window.location.origin}/share/${share.slug}`;
        await navigator.clipboard.writeText(link).catch(() => {});
        success(`${i18n("shareThis")}: ${link}`);
      }
      setModal(null);
      setForm({});
    } catch (err) {
      toastError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDrop(e: React.FormEvent) {
    e.preventDefault();
    if (!modal || modal.type !== "drop" || !form.title) return;
    setSubmitting(true);
    try {
      const drop = await createDrop({
        title: form.title,
        description: form.description,
        visibility: (form.visibility as "public" | "password") || "public",
        password: form.password || undefined,
        expiresAt: form.expiresAt || undefined,
        maxFiles: form.maxFiles ? Number(form.maxFiles) : undefined,
        maxSize: form.maxSize ? Number(form.maxSize) : undefined,
      });
      if (drop?.slug) {
        const link = `${window.location.origin}/drop/${drop.slug}`;
        await navigator.clipboard.writeText(link).catch(() => {});
        success(`${i18n("drop")}: ${link}`);
      }
      setModal(null);
      setForm({});
    } catch (err) {
      toastError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadDriveFile(file: CloudFile) {
    if (!clientId) return;
    try {
      const res = await fetchWorker(`/api/google-drive/download?clientId=${encodeURIComponent(clientId)}&fileId=${encodeURIComponent(file.driveFileId)}`);
      if (res?.data?.url) {
        window.open(res.data.url, "_blank");
      } else if (res?.data) {
        const blob = await (await fetch(res.data)).blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
      }
    } catch (err) {
      toastError(String(err));
    }
  }

  async function bulkTrash() {
    try {
      await Promise.all(selectedItems.map((f) => trashFile(f.driveFileId)));
      clear();
      success(i18n("trash"));
    } catch (err) {
      toastError(String(err));
    }
  }

  async function bulkDelete() {
    try {
      await Promise.all(selectedItems.map((f) => deleteFile(f.driveFileId)));
      clear();
      success(i18n("deleted"));
    } catch (err) {
      toastError(String(err));
    }
  }

  async function bulkFavorite() {
    try {
      await Promise.all(selectedItems.map((f) => favoriteFile(f.driveFileId, !f.isFavorite)));
      clear();
      success(i18n("saved"));
    } catch (err) {
      toastError(String(err));
    }
  }

  const moveTargets = useMemo(() => {
    if (!modal || modal.type !== "move" || modal.file.isFolder) return [];
    const blocked = descendantFolderIds(files, modal.file.driveFileId);
    return files.filter((f) => f.isFolder && f.driveFileId !== modal.file.driveFileId && !blocked.has(f.driveFileId));
  }, [files, modal]);

  function openShare(file: CloudFile) {
    setForm({ visibility: "public" });
    setModal({ type: "share", file });
  }

  function openFile(file: CloudFile) {
    if (file.isFolder) {
      setParentId(file.driveFileId);
    } else {
      setPreviewFile(file);
    }
  }

  function fileContextItems(file: CloudFile) {
    return [
      { id: "open", label: file.isFolder ? i18n("open") : i18n("preview", "Aperçu"), icon: file.isFolder ? "folder-open" : "eye", onClick: () => openFile(file) },
      { id: "share", label: i18n("share"), icon: "share-2", onClick: () => openShare(file) },
      { id: "rename", label: i18n("rename"), icon: "pencil", onClick: () => { setForm({ name: file.name }); setModal({ type: "rename", file }); } },
      { id: "move", label: i18n("move"), icon: "folder-input", onClick: () => setModal({ type: "move", file }) },
      { id: "favorite", label: file.isFavorite ? i18n("removeFromFavorites") : i18n("addToFavorites"), icon: file.isFavorite ? "heart-off" : "heart", onClick: () => favoriteFile(file.driveFileId, !file.isFavorite) },
      { id: "copy-name", label: i18n("copyName"), icon: "copy", onClick: () => navigator.clipboard.writeText(file.name).then(() => success(i18n("copied"))).catch(() => {}) },
      ...(file.webViewLink
        ? [{ id: "copy-link", label: i18n("copyLink", "Copier le lien"), icon: "link", onClick: () => navigator.clipboard.writeText(file.webViewLink || "").then(() => success(i18n("copied"))).catch(() => {}) }]
        : []),
      { id: "sep", label: "", separator: true },
      ...(trashed
        ? [
            { id: "restore", label: i18n("restore"), icon: "rotate-ccw", onClick: () => restoreFile(file.driveFileId) },
            { id: "delete", label: i18n("delete"), icon: "trash", danger: true, onClick: () => deleteFile(file.driveFileId) },
          ]
        : [
            { id: "trash", label: i18n("trash"), icon: "trash-2", danger: true, onClick: () => trashFile(file.driveFileId) },
          ]),
    ];
  }

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4 flex flex-col gap-3 rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.25] p-3 shadow-sm backdrop-blur-[var(--panel-blur)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            <Icon name="files" className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">{i18n("filesTitle")}</h1>
            <p className="text-[10px] text-[var(--text-muted)]">
              {clientId ? i18n("driveConnected", "Google Drive connecté") : i18n("noDriveConnected", "Aucun Drive connecté")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            leftIcon={<Icon name="plus" className="h-4 w-4" />}
          >
            {i18n("add", "Ajouter")}
          </Button>
          {clientId && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setForm({ visibility: "public" }); setModal({ type: "drop" }); }}
              leftIcon={<Icon name="inbox" className="h-4 w-4" />}
            >
              {i18n("createDrop")}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAdminOpen(true)}
            leftIcon={<Icon name="shield" className="h-4 w-4" />}
          >
            {i18n("admin")}
          </Button>
          <button
            type="button"
            onClick={reload}
            className="rounded-[var(--panel-radius)] p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
            aria-label={i18n("refresh")}
          >
            <Icon name="refresh-cw" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6">
      {quota && (
        <div className="rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)] p-3 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">{i18n("storageUsed")}</span>
              <span className="font-medium">{formatBytes(quota.used)} / {formatBytes(quota.total)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-xl bg-[var(--text-primary)]/[0.08]">
              <div className="h-full rounded-xl bg-[var(--accent-primary)]" style={{ width: `${quotaPercent}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabList
          tabs={[
            { id: "all", label: i18n("all"), content: null },
            { id: "folders", label: i18n("folders"), content: null },
            { id: "favorites", label: i18n("favorites"), content: null },
            { id: "trash", label: i18n("trash"), content: null },
          ]}
          activeId={showFolders ? "folders" : favorites ? "favorites" : trashed ? "trash" : "all"}
          onSelect={(id) => {
            setShowFolders(id === "folders");
            setFavorites(id === "favorites");
            setTrashed(id === "trash");
          }}
        />
        <Input
          ref={searchRef}
          type="search"
          icon="search"
          clearable
          aria-label={i18n("searchFiles")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={i18n("searchFiles")}
          className="min-w-0 flex-1"
        />
        <Select
          value={sort}
          onChange={(value) => setSort(value as typeof sort)}
          options={[
            { id: "name", label: i18n("sortByName") },
            { id: "size", label: i18n("sortBySize") },
            { id: "date", label: i18n("sortByDate") },
            { id: "type", label: i18n("sortByType") },
          ]}
          aria-label={i18n("sortBy")}
          className="min-w-0"
        />
        {duplicateCount > 0 && (
          <button
            type="button"
            onClick={() => setShowDuplicates((s) => !s)}
            className={cn(
              "rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors",
              showDuplicates
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                : "border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.25] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            )}
            aria-label={i18n("duplicates", "Doublons")}
            title={i18n("duplicates", "Doublons")}
          >
            <Icon name="copy" className="mr-1.5 inline h-3.5 w-3.5" />
            {duplicateCount} {i18n("duplicates", "doublons")}
          </button>
        )}

        <div className="flex items-center gap-1 rounded-xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.25] p-1">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              viewMode === "list" ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--panel-bg)]",
            )}
            aria-label={i18n("listView", "List")}
            title={i18n("listView", "List")}
          >
            <Icon name="list" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              viewMode === "grid" ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--panel-bg)]",
            )}
            aria-label={i18n("gridView", "Grid")}
            title={i18n("gridView", "Grid")}
          >
            <Icon name="grid-2x2" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(parentId !== null || query || showFolders || favorites || trashed || sort !== "name" || showDuplicates) && (
          <>
            {parentId !== null && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setParentId(null)}
                rightIcon={<Icon name="x" className="h-3 w-3" />}
              >
                {i18n("folder")}: {files.find((f) => f.driveFileId === parentId)?.name || "..."}
              </Button>
            )}
            {query && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setQuery("")}
                rightIcon={<Icon name="x" className="h-3 w-3" />}
              >
                {i18n("search")}: {query}
              </Button>
            )}
            {showFolders && (
              <Button size="sm" variant="secondary" onClick={() => setShowFolders(false)} rightIcon={<Icon name="x" className="h-3 w-3" />}>
                {i18n("folders")}
              </Button>
            )}
            {favorites && (
              <Button size="sm" variant="secondary" onClick={() => setFavorites(false)} rightIcon={<Icon name="x" className="h-3 w-3" />}>
                {i18n("favorites")}
              </Button>
            )}
            {trashed && (
              <Button size="sm" variant="secondary" onClick={() => setTrashed(false)} rightIcon={<Icon name="x" className="h-3 w-3" />}>
                {i18n("trash")}
              </Button>
            )}
            {sort !== "name" && (
              <Button size="sm" variant="secondary" onClick={() => setSort("name")} rightIcon={<Icon name="x" className="h-3 w-3" />}>
                {i18n("sortBy")}: {i18n(sort)}
              </Button>
            )}
            {showDuplicates && (
              <Button size="sm" variant="secondary" onClick={() => setShowDuplicates(false)} rightIcon={<Icon name="x" className="h-3 w-3" />}>
                {i18n("duplicates", "Doublons")}
              </Button>
            )}
          </>
        )}
      </div>

      {recentFiles.length > 0 && (
        <section className="space-y-2" aria-label={i18n("recent", "Récents")}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{i18n("recent", "Récemment utilisés")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {recentFiles.map((file) => (
              <ContextMenu key={`recent-${file.id}`} items={fileContextItems(file)}>
                <FileCard
                  file={file}
                  viewMode="grid"
                  trashed={trashed}
                  clientId={clientId}
                  onOpen={() => openFile(file)}
                  onDownload={() => downloadDriveFile(file)}
                  onShare={() => openShare(file)}
                  onRename={() => { setForm({ name: file.name }); setModal({ type: "rename", file }); }}
                  onMove={() => setModal({ type: "move", file })}
                  onFavorite={() => favoriteFile(file.driveFileId, !file.isFavorite)}
                  onTrash={() => trashFile(file.driveFileId)}
                  onDelete={() => deleteFile(file.driveFileId)}
                  onRestore={() => restoreFile(file.driveFileId)}
                />
              </ContextMenu>
            ))}
          </div>
        </section>
      )}

      {brainPicks.length > 0 && (
        <section className="space-y-2" aria-label={i18n("brainPicks", "Suggestions Brain")}>
          <div className="flex items-center gap-2">
            <Icon name="brain" className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{i18n("brainPicks", "Suggestions Brain")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {brainPicks.map((file) => (
              <ContextMenu key={`brain-${file.id}`} items={fileContextItems(file)}>
                <FileCard
                  file={file}
                  viewMode="grid"
                  trashed={trashed}
                  clientId={clientId}
                  onOpen={() => openFile(file)}
                  onDownload={() => downloadDriveFile(file)}
                  onShare={() => openShare(file)}
                  onRename={() => { setForm({ name: file.name }); setModal({ type: "rename", file }); }}
                  onMove={() => setModal({ type: "move", file })}
                  onFavorite={() => favoriteFile(file.driveFileId, !file.isFavorite)}
                  onTrash={() => trashFile(file.driveFileId)}
                  onDelete={() => deleteFile(file.driveFileId)}
                  onRestore={() => restoreFile(file.driveFileId)}
                />
              </ContextMenu>
            ))}
          </div>
        </section>
      )}

      {hasSelection && (
        <BulkActionBar
          count={selected.size}
          onFavorite={trashed ? undefined : bulkFavorite}
          onDelete={trashed ? bulkDelete : bulkTrash}
          onClear={clear}
        />
      )}

      {!loading && filteredFiles.length > 0 && (
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={(checked) => (checked ? selectAll() : clear())}
          label={i18n("selectAll")}
          className="text-sm text-[var(--muted)]"
        />
      )}

      {parentId !== null && (
        <nav aria-label={i18n("folders")} className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <button type="button" onClick={() => setParentId(null)} className="hover:text-[var(--foreground)]">{i18n("filesTitle")}</button>
          {path.map((folder) => (
            <span key={folder.driveFileId} className="flex items-center gap-2">
              <Icon name="chevron-right" className="h-3 w-3" />
              <button
                type="button"
                onClick={() => setParentId(folder.driveFileId)}
                className="hover:text-[var(--foreground)]"
              >
                {folder.name}
              </button>
            </span>
          ))}
          <Icon name="chevron-right" className="h-3 w-3" />
          <span className="text-[var(--foreground)]">{files.find((f) => f.driveFileId === parentId)?.name}</span>
        </nav>
      )}

      {error && (
        <EmptyState
          icon="alert-circle"
          title={i18n("error", "Erreur")}
          description={error.message}
          action={
            <Button size="sm" onClick={reload} leftIcon={<Icon name="refresh-cw" className="h-4 w-4" />}>
              {i18n("retry")}
            </Button>
          }
        />
      )}

      <div className={cn("grid gap-3", viewMode === "list" ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-fr")}>
        {loading ? (
          <>
            {[...Array(viewMode === "list" ? 4 : 8)].map((_, i) => (
              <div
                key={i}
                className="h-full min-w-0 overflow-hidden rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)] p-[var(--panel-padding)] shadow-sm"
              >
                <div className={cn("h-full animate-pulse", viewMode === "grid" ? "flex flex-col items-center justify-center gap-2" : "flex items-center gap-3")}>
                  <div className={cn("shrink-0 rounded-[var(--panel-radius)] bg-[var(--text-primary)]/[0.08]", viewMode === "grid" ? "h-14 w-14" : "h-10 w-10")} />
                  <div className="space-y-2">
                    <div className="h-3.5 w-32 rounded bg-[var(--text-primary)]/[0.08]" />
                    <div className="h-2.5 w-20 rounded bg-[var(--text-primary)]/[0.08]" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : filteredFiles.length === 0 ? (
          <EmptyState
            className="col-span-full"
            icon={trashed ? "trash-2" : showDuplicates ? "copy" : showFolders ? "folder" : "inbox"}
            title={i18n("noFiles")}
            description={showDuplicates ? i18n("noDuplicates", "Aucun doublon détecté") : i18n("noFilesDescription", "Aucun fichier à afficher")}
            action={
              !clientId ? (
                <Button size="sm" variant="secondary" onClick={connectDrive} leftIcon={<Icon name="cloud" className="h-4 w-4" />}>
                  {i18n("connectDrive")}
                </Button>
              ) : (
                <Button size="sm" onClick={() => setAddOpen(true)} leftIcon={<Icon name="plus" className="h-4 w-4" />}>
                  {i18n("add", "Ajouter")}
                </Button>
              )
            }
          />
        ) : (
          filteredFiles.map((file, i) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: i * 0.02 }}
              className="h-full"
            >
            <ContextMenu items={fileContextItems(file)}>
              <FileCard
                file={file}
                viewMode={viewMode}
                selected={isSelected(file.id)}
                trashed={trashed}
                clientId={clientId}
                onToggle={() => toggle(file.id)}
                onOpen={() => openFile(file)}
                onDownload={() => downloadDriveFile(file)}
                onShare={() => openShare(file)}
                onRename={() => { setForm({ name: file.name }); setModal({ type: "rename", file }); }}
                onMove={() => setModal({ type: "move", file })}
                onFavorite={() => favoriteFile(file.driveFileId, !file.isFavorite)}
                onTrash={() => trashFile(file.driveFileId)}
                onDelete={() => deleteFile(file.driveFileId)}
                onRestore={() => restoreFile(file.driveFileId)}
              />
            </ContextMenu>
            </motion.div>
          ))
        )}
      </div>
      </div>

      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={
          modal?.type === "rename" ? i18n("renameFile") :
          modal?.type === "move" ? i18n("moveTo") :
          modal?.type === "share" ? i18n("shareFile") :
          modal?.type === "drop" ? i18n("createDrop") : ""
        }
        size="md"
        hideFooter
      >
            {modal?.type === "rename" && (
              <form onSubmit={handleRename} className="space-y-4">
                <Input
                  autoFocus
                  type="text"
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setModal(null)} className="rounded-[var(--panel-radius)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--panel-bg)]">{i18n("cancel")}</button>
                  <button type="submit" disabled={submitting} className="rounded-[var(--panel-radius)] bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-50">{i18n("save")}</button>
                </div>
              </form>
            )}

            {modal?.type === "move" && (
              <div className="space-y-4">
                <div className="max-h-60 space-y-1 overflow-auto">
                  <button
                    type="button"
                    onClick={() => handleMove(null)}
                    className="w-full rounded-[var(--panel-radius)] px-3 py-2 text-left text-sm hover:bg-[var(--panel-bg)]"
                  >
                    {i18n("filesTitle")}
                  </button>
                  {moveTargets.map((folder) => (
                    <button
                      key={folder.driveFileId}
                      type="button"
                      onClick={() => handleMove(folder.driveFileId)}
                      className="flex w-full items-center gap-2 rounded-[var(--panel-radius)] px-3 py-2 text-left text-sm hover:bg-[var(--panel-bg)]"
                    >
                      <Icon name="folder" className="h-4 w-4" /> {folder.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {modal?.type === "share" && (
              <form onSubmit={handleShare} className="space-y-4">
                <p className="text-sm text-[var(--muted)]">{modal?.file?.name}</p>
                <Select
                  value={form.visibility || "public"}
                  onChange={(value) => setForm({ ...form, visibility: value })}
                  options={[
                    { id: "public", label: i18n("public") },
                    { id: "private", label: i18n("private") },
                    { id: "password", label: i18n("password") },
                  ]}
                  aria-label={i18n("visibility")}
                  className="w-full"
                />
                {form.visibility === "password" && (
                  <Input
                    type="password"
                    value={form.password || ""}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={i18n("password")}
                  />
                )}
                <Input
                  type="datetime-local"
                  value={form.expiresAt || ""}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  inputSize="compact"
                />
                <Input
                  type="number"
                  value={form.maxDownloads || ""}
                  onChange={(e) => setForm({ ...form, maxDownloads: e.target.value })}
                  placeholder={i18n("maxDownloads")}
                  inputSize="compact"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setModal(null)} className="rounded-[var(--panel-radius)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--panel-bg)]">{i18n("cancel")}</button>
                  <button type="submit" disabled={submitting} className="rounded-[var(--panel-radius)] bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-50">{i18n("shareThis")}</button>
                </div>
              </form>
            )}

            {modal?.type === "drop" && (
              <form onSubmit={handleDrop} className="space-y-4">
                <Input
                  autoFocus
                  type="text"
                  value={form.title || ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={i18n("title")}
                />
                <Input
                  type="text"
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={i18n("description")}
                />
                <Select
                  value={form.visibility || "public"}
                  onChange={(value) => setForm({ ...form, visibility: value })}
                  options={[
                    { id: "public", label: i18n("public") },
                    { id: "password", label: i18n("password") },
                  ]}
                  aria-label={i18n("visibility")}
                  className="w-full"
                />
                {form.visibility === "password" && (
                  <Input
                    type="password"
                    value={form.password || ""}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={i18n("password")}
                  />
                )}
                <Input
                  type="datetime-local"
                  value={form.expiresAt || ""}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  inputSize="compact"
                />
                <Input
                  type="number"
                  value={form.maxFiles || ""}
                  onChange={(e) => setForm({ ...form, maxFiles: e.target.value })}
                  placeholder={i18n("maxFiles")}
                  inputSize="compact"
                />
                <Input
                  type="number"
                  value={form.maxSize || ""}
                  onChange={(e) => setForm({ ...form, maxSize: e.target.value })}
                  placeholder={i18n("maxSize")}
                  inputSize="compact"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setModal(null)} className="rounded-[var(--panel-radius)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--panel-bg)]">{i18n("cancel")}</button>
                  <button type="submit" disabled={submitting} className="rounded-[var(--panel-radius)] bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-50">{i18n("create")}</button>
                </div>
              </form>
            )}
      </Modal>

      {clientId && (
        <FileDropOverlay
          onDrop={(files) => { setDroppedFiles(files); setAddOpen(true); }}
          disabled={!clientId}
        />
      )}

      {previewFile && (
        <FilePreview
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
          clientId={clientId || undefined}
          location={previewLocation}
          trashed={trashed}
          onDownload={() => downloadDriveFile(previewFile)}
          onShare={() => openShare(previewFile)}
          onRename={() => { setForm({ name: previewFile.name }); setModal({ type: "rename", file: previewFile }); }}
          onMove={() => setModal({ type: "move", file: previewFile })}
          onFavorite={() => favoriteFile(previewFile.driveFileId, !previewFile.isFavorite)}
          onTrash={() => trashFile(previewFile.driveFileId)}
          onDelete={() => deleteFile(previewFile.driveFileId)}
          onRestore={() => restoreFile(previewFile.driveFileId)}
        />
      )}

      <FileAddModal
        open={addOpen}
        onClose={() => { setAddOpen(false); setDroppedFiles([]); }}
        clientId={clientId}
        parentId={parentId}
        initialFiles={droppedFiles}
        onUploadComplete={() => { setDroppedFiles([]); success(i18n("uploadFile")); reload(); }}
        onCreateFolder={handleCreateFolder}
        onConnectDrive={connectDrive}
      />

      <Modal
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        title={i18n("filesAdminPanel")}
        size="lg"
        hideFooter
      >
        <FilesAdminPanel />
      </Modal>
    </div>
  );
}
