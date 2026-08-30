"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  formatBytes,
  sortFiles,
  getFileCategory,
  FILE_CATEGORIES,
  type FileCategory,
} from "@/lib/files";
import FilesAdminPanel from "@/components/FilesAdminPanel";
import FileAddModal, { type TabId } from "@/components/FileAddModal";
import FilePreview from "@/components/FilePreview";
import FileCard from "@/components/FileCard";
import FileDropOverlay from "@/components/FileDropOverlay";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import FileUploadZone from "@/components/FileUploadZone";
import { useSettings } from "@/components/SettingsProvider";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Folder,
  FolderPlus,
  Plus,
  Cloud,
  CloudOff,
  Search,
  Sparkles,
  Brain,
  Clock,
  Heart,
  Trash2,
  Copy,
  SlidersHorizontal,
  Grid2X2,
  List as ListIcon,
  RefreshCw,
  Shield,
  UploadCloud,
  Inbox,
  ArrowUpDown,
  X,
  ChevronRight,
  HardDrive,
  ExternalLink,
} from "lucide-react";

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
  const { settings } = useSettings();
  const { success, error: toastError } = useToast();
  const [storedClientId, setClientId] = useUserState<string>("clientId:google-drive", "");
  const clientId = settings.driveClientId || storedClientId;
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
    createLink,
  } = useCloudFiles(clientId || undefined);

  const { create: createShare } = useShares();
  const { create: createDrop } = useDrops();

  const [modal, setModal] = useState<Modal>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<TabId>("upload");
  const [adminOpen, setAdminOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sort, setSort] = useState<"name" | "size" | "date" | "type">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [viewTab, setViewTab] = useState<"all" | "folders" | "recent" | "favorites" | "trash">("all");
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    try {
      const saved = localStorage.getItem("ethone.files.viewMode");
      return saved === "grid" ? "grid" : "list";
    } catch {
      return "grid";
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
        } else if (modal) {
          setModal(null);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        e.preventDefault();
        setAddTab("upload");
        setAddOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [query, setQuery, addOpen, previewFile, modal]);

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
    let list = [...files];

    // Filter by tab
    if (viewTab === "trash" || trashed) {
      list = list.filter((f) => f.trashed);
    } else {
      list = list.filter((f) => !f.trashed);

      if (viewTab === "favorites" || favorites) {
        list = list.filter((f) => f.isFavorite);
      } else if (viewTab === "folders") {
        list = list.filter((f) => f.isFolder);
      } else if (viewTab === "recent") {
        list = list.filter((f) => !f.isFolder);
      }
    }

    // Folder navigation hierarchy (if not in search, favorites or trash)
    if (!query.trim() && viewTab !== "favorites" && viewTab !== "trash" && viewTab !== "recent") {
      if (parentId) {
        list = list.filter(
          (f) => (f.driveParentId || null) === parentId || (f.driveFileId === parentId && f.isFolder)
        );
      } else if (viewTab !== "folders") {
        list = list.filter((f) => !f.driveParentId);
      }
    }

    // Category filter
    if (selectedCategory !== "all") {
      list = list.filter((f) => !f.isFolder && getFileCategory(f) === selectedCategory);
    }

    // Search query matching
    if (query.trim()) {
      const q = query.toLowerCase();
      const ext = q.startsWith(".") ? q.slice(1) : q;
      list = list.filter((f) => {
        const name = f.name.toLowerCase();
        const mime = (f.mimeType || "").toLowerCase();
        const extMatch = name.includes(q) || name.endsWith(`.${ext}`);
        const mimeMatch = mime.includes(q);
        const summaryMatch = (f.brainSummary || "").toLowerCase().includes(q);
        const tagsMatch = f.tags?.some((t) => t.toLowerCase().includes(q));
        return extMatch || mimeMatch || summaryMatch || tagsMatch;
      });
    }

    // Duplicates filter
    if (showDuplicates) {
      list = list.filter((f) => !f.isFolder && duplicateIds.has(f.driveFileId));
    }

    return sortFiles(list, sort, sortDirection);
  }, [
    files,
    viewTab,
    trashed,
    favorites,
    parentId,
    selectedCategory,
    query,
    showDuplicates,
    duplicateIds,
    sort,
    sortDirection,
  ]);

  function getFileTime(file: CloudFile) {
    const raw = file.updatedAt || file.createdAt || 0;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  const recentFiles = useMemo(() => {
    if (query || viewTab !== "all" || parentId || selectedCategory !== "all") return [];
    return [...files]
      .filter((f) => !f.isFolder && !f.trashed)
      .sort((a, b) => getFileTime(b) - getFileTime(a))
      .slice(0, 4);
  }, [files, query, viewTab, parentId, selectedCategory]);

  const brainPicks = useMemo(() => {
    if (query || viewTab !== "all" || parentId || selectedCategory !== "all") return [];
    return [...files]
      .filter((f) => !f.isFolder && !f.trashed && f.brainSummary?.trim())
      .sort((a, b) => getFileTime(b) - getFileTime(a))
      .slice(0, 4);
  }, [files, query, viewTab, parentId, selectedCategory]);

  const { selected, selectedItems, hasSelection, isAllSelected, toggle, selectAll, clear, isSelected } =
    useSelection<CloudFile>(filteredFiles);

  const path = useMemo(() => folderPath(files, parentId), [files, parentId]);

  const previewLocation = useMemo(() => {
    if (!previewFile) return "";
    const parts = [i18n("filesTitle", "Fichiers")];
    const current = path.map((p) => p.name);
    if (previewFile.driveParentId) {
      const parent = files.find((f) => f.driveFileId === previewFile.driveParentId);
      if (parent) current.push(parent.name);
    }
    return [...parts, ...current].join(" / ");
  }, [previewFile, files, path, i18n]);

  const quotaPercent = quota && quota.total ? Math.min(100, Math.round((quota.used / quota.total) * 100)) : 0;

  function connectDrive() {
    const id = prompt(i18n("clientId", "Entrez votre Client ID Google Drive :"));
    if (!id) return;
    setClientId(id);
    success(i18n("driveConnected", "Google Drive configuré avec succès"));
  }

  async function handleCreateFolder(name: string) {
    try {
      await createFolder(name, parentId);
      success(i18n("createFolder", "Dossier créé avec succès"));
      await reload();
    } catch (err) {
      toastError(String(err));
    }
  }

  async function handleCreateLink(url: string, title?: string) {
    try {
      await createLink(url, title, parentId);
      success("Lien ajouté", title || url);
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
      success(i18n("rename", "Élément renommé"));
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
      success(i18n("move", "Fichier déplacé"));
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
        success(`Lien de partage copié : ${link}`);
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
        success(`Lien Drop créé : ${link}`);
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
      const res = await fetchWorker(
        `/api/google-drive/download?clientId=${encodeURIComponent(clientId)}&fileId=${encodeURIComponent(file.driveFileId)}`
      );
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
      success(i18n("trash", "Éléments déplacés dans la corbeille"));
    } catch (err) {
      toastError(String(err));
    }
  }

  async function bulkDelete() {
    try {
      await Promise.all(selectedItems.map((f) => deleteFile(f.driveFileId)));
      clear();
      success(i18n("deleted", "Éléments supprimés définitivement"));
    } catch (err) {
      toastError(String(err));
    }
  }

  async function bulkFavorite() {
    try {
      await Promise.all(selectedItems.map((f) => favoriteFile(f.driveFileId, !f.isFavorite)));
      clear();
      success(i18n("saved", "Favoris mis à jour"));
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
    } else if (file.webViewLink && (file.mimeType.includes("url") || file.mimeType.includes("uri-list") || file.name.endsWith(".url") || file.webViewLink.startsWith("http"))) {
      window.open(file.webViewLink, "_blank", "noopener,noreferrer");
    } else {
      setPreviewFile(file);
    }
  }

  function fileContextItems(file: CloudFile) {
    return [
      {
        id: "open",
        label: file.isFolder ? i18n("open", "Ouvrir") : i18n("preview", "Aperçu"),
        icon: file.isFolder ? "folder" : "image",
        onClick: () => openFile(file),
      },
      { id: "share", label: i18n("share", "Partager"), icon: "share-2", onClick: () => openShare(file) },
      {
        id: "rename",
        label: i18n("rename", "Renommer"),
        icon: "pencil",
        onClick: () => {
          setForm({ name: file.name });
          setModal({ type: "rename", file });
        },
      },
      { id: "move", label: i18n("move", "Déplacer"), icon: "folder-plus", onClick: () => setModal({ type: "move", file }) },
      {
        id: "favorite",
        label: file.isFavorite ? i18n("removeFromFavorites", "Retirer des favoris") : i18n("addToFavorites", "Ajouter aux favoris"),
        icon: file.isFavorite ? "heart-off" : "heart",
        onClick: () => favoriteFile(file.driveFileId, !file.isFavorite),
      },
      {
        id: "copy-name",
        label: i18n("copyName", "Copier le nom"),
        icon: "copy",
        onClick: () => navigator.clipboard.writeText(file.name).then(() => success(i18n("copied", "Copié"))).catch(() => {}),
      },
      ...(file.webViewLink
        ? [
            {
              id: "copy-link",
              label: i18n("copyLink", "Copier le lien"),
              icon: "link",
              onClick: () =>
                navigator.clipboard.writeText(file.webViewLink || "").then(() => success(i18n("copied", "Lien copié"))).catch(() => {}),
            },
          ]
        : []),
      { id: "sep", label: "", separator: true },
      ...(viewTab === "trash" || trashed
        ? [
            { id: "restore", label: i18n("restore", "Restaurer"), icon: "rotate-ccw", onClick: () => restoreFile(file.driveFileId) },
            { id: "delete", label: i18n("delete", "Supprimer définitivement"), icon: "trash-2", danger: true, onClick: () => deleteFile(file.driveFileId) },
          ]
        : [
            { id: "trash", label: i18n("trash", "Mettre à la corbeille"), icon: "trash-2", danger: true, onClick: () => trashFile(file.driveFileId) },
          ]),
    ];
  }

  const hasActiveFilters =
    query.trim().length > 0 ||
    selectedCategory !== "all" ||
    showDuplicates ||
    parentId !== null;

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      {/* Header Bar */}
      <div className="shrink-0 mb-3 rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.45] p-3.5 shadow-sm backdrop-blur-[var(--panel-blur)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {/* Title & Drive status badge */}
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                {i18n("filesTitle", "Fichiers")}
              </h1>
              <button
                type="button"
                onClick={connectDrive}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-all hover:scale-105",
                  clientId
                    ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
                    : "border-[var(--panel-border)]/[0.2] bg-[var(--panel-bg)]/[0.5] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", clientId ? "bg-[var(--success)]" : "bg-[var(--text-muted)]")} />
                {clientId ? "Google Drive connecté" : "Connecter un Drive"}
              </button>

              {/* Storage Quota widget */}
              {quota && quota.total > 0 && (
                <div className="hidden items-center gap-2 rounded-xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.3] px-2.5 py-1 text-[10px] sm:inline-flex">
                  <HardDrive className="h-3 w-3 text-[var(--text-muted)]" />
                  <span className="font-mono text-[var(--text-muted)]">
                    {formatBytes(quota.used)} / {formatBytes(quota.total)}
                  </span>
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--panel-border)]/[0.3]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        quotaPercent >= 90 ? "bg-[var(--danger)]" : "bg-[var(--accent-primary)]"
                      )}
                      style={{ width: `${quotaPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Breadcrumb navigation */}
            <nav aria-label="Breadcrumb" className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <button
                type="button"
                onClick={() => setParentId(null)}
                className={cn(
                  "flex items-center gap-1 transition-colors hover:text-[var(--text-primary)]",
                  !parentId && "font-semibold text-[var(--accent-primary)]"
                )}
              >
                <Folder className="h-3.5 w-3.5" />
                <span>Racine</span>
              </button>
              {path.map((folder) => (
                <span key={folder.driveFileId} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 opacity-40" />
                  <button
                    type="button"
                    onClick={() => setParentId(folder.driveFileId)}
                    className={cn(
                      "transition-colors hover:text-[var(--text-primary)]",
                      folder.driveFileId === parentId ? "font-semibold text-[var(--accent-primary)]" : ""
                    )}
                  >
                    {folder.name}
                  </button>
                </span>
              ))}
            </nav>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setAddTab("upload");
                setAddOpen(true);
              }}
              leftIcon={<Plus className="h-4 w-4" />}
              className="shadow-sm shadow-[var(--accent-primary)]/20"
            >
              {i18n("add", "Ajouter")}
            </Button>

            {clientId && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAddTab("folder");
                  setAddOpen(true);
                }}
                leftIcon={<FolderPlus className="h-4 w-4" />}
              >
                Nouveau dossier
              </Button>
            )}

            {clientId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setForm({ visibility: "public" });
                  setModal({ type: "drop" });
                }}
                leftIcon={<Inbox className="h-4 w-4" />}
              >
                {i18n("createDrop", "Drop")}
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAdminOpen(true)}
              leftIcon={<Shield className="h-4 w-4" />}
            >
              {i18n("admin", "Admin")}
            </Button>

            <button
              type="button"
              onClick={reload}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.4] text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
              aria-label={i18n("refresh", "Actualiser")}
              title={i18n("refresh", "Actualiser")}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-[var(--accent-primary)]")} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Toolbar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--panel-border)]/[0.1] pt-3">
          {/* Main View Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.3] p-1">
            {[
              { id: "all", label: "Tous", icon: "folder" },
              { id: "folders", label: "Dossiers", icon: "folder" },
              { id: "recent", label: "Récents", icon: "history" },
              { id: "favorites", label: "Favoris", icon: "heart" },
              { id: "trash", label: "Corbeille", icon: "trash-2" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setViewTab(t.id as typeof viewTab);
                  setTrashed(t.id === "trash");
                  setFavorites(t.id === "favorites");
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                  viewTab === t.id
                    ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-semibold shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon name={t.icon} className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Search, Sort, View Controls */}
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Input
                ref={searchRef}
                type="search"
                icon="search"
                clearable
                aria-label={i18n("searchFiles", "Rechercher dans les fichiers")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher... (Ctrl+K)"
                className="w-full text-xs"
              />
            </div>

            {/* Sort Select */}
            <Select
              value={sort}
              onChange={(value) => setSort(value as typeof sort)}
              options={[
                { id: "date", label: "Date de modif." },
                { id: "name", label: "Nom (A-Z)" },
                { id: "size", label: "Taille" },
                { id: "type", label: "Type" },
              ]}
              aria-label={i18n("sortBy", "Trier par")}
              className="min-w-0 text-xs"
            />

            {/* Sort direction toggle */}
            <button
              type="button"
              onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.3] text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
              title={sortDirection === "asc" ? "Ordre croissant" : "Ordre décroissant"}
            >
              <ArrowUpDown className={cn("h-3.5 w-3.5 transition-transform", sortDirection === "desc" && "rotate-180")} />
            </button>

            {/* Duplicates badge toggle if any */}
            {duplicateCount > 0 && (
              <button
                type="button"
                onClick={() => setShowDuplicates((s) => !s)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  showDuplicates
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                    : "border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.3] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
                title="Afficher uniquement les doublons détectés"
              >
                <Copy className="h-3 w-3" />
                <span>{duplicateCount} doublons</span>
              </button>
            )}

            {/* Grid / List View Toggle */}
            <div className="flex items-center gap-0.5 rounded-xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.3] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-lg p-1.5 transition-colors",
                  viewMode === "grid"
                    ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
                )}
                aria-label="Vue Grille"
                title="Vue Grille"
              >
                <Grid2X2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-lg p-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
                )}
                aria-label="Vue Liste"
                title="Vue Liste"
              >
                <ListIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Chips Bar */}
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto os-scroll pb-1">
          {FILE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all",
                selectedCategory === cat.id
                  ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-semibold shadow-sm"
                  : "border-transparent bg-[var(--panel-bg)]/[0.25] text-[var(--text-muted)] hover:bg-[var(--panel-bg)]/[0.5] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon name={cat.icon} className="h-3 w-3" />
              <span>{cat.label}</span>
            </button>
          ))}

          {/* Reset filter button if any filter active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedCategory("all");
                setShowDuplicates(false);
                setParentId(null);
              }}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--danger)]/20 bg-[var(--danger)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--danger)] transition-all hover:bg-[var(--danger)]/20"
            >
              <X className="h-3 w-3" />
              <span>Réinitialiser filtres</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Explorer Content Area */}
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6 p-1">
        {/* Storage Quota Warning banner if >= 90% */}
        {quota && quotaPercent >= 90 && (
          <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3.5 text-xs text-[var(--danger)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span>
                <strong>Attention :</strong> Espace de stockage presque saturé ({quotaPercent}% utilisé — {formatBytes(quota.used)} / {formatBytes(quota.total)}).
              </span>
            </div>
            <Button size="sm" variant="danger" onClick={() => setViewTab("trash")}>
              Vider la corbeille
            </Button>
          </div>
        )}

        {/* Smart Section: Récemment utilisés */}
        {recentFiles.length > 0 && (
          <section className="space-y-2.5" aria-label="Récents">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Récemment consultés
                </h2>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">{recentFiles.length} fichiers</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {recentFiles.map((file) => (
                <ContextMenu key={`recent-${file.id}`} items={fileContextItems(file)}>
                  <FileCard
                    file={file}
                    viewMode="grid"
                    trashed={trashed}
                    clientId={clientId}
                    onOpen={() => openFile(file)}
                    onDownload={() => downloadDriveFile(file)}
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

        {/* Smart Section: Suggestions ETHONE Brain */}
        {brainPicks.length > 0 && (
          <section className="space-y-2.5" aria-label="Suggestions Brain">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Suggestions ETHONE Brain
                </h2>
              </div>
              <span className="rounded-md border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--accent-primary)]">
                IA analysée
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {brainPicks.map((file) => (
                <ContextMenu key={`brain-${file.id}`} items={fileContextItems(file)}>
                  <FileCard
                    file={file}
                    viewMode="grid"
                    trashed={trashed}
                    clientId={clientId}
                    onOpen={() => openFile(file)}
                    onDownload={() => downloadDriveFile(file)}
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

        {/* Multi-Selection Bulk Action Bar */}
        {hasSelection && (
          <BulkActionBar
            count={selected.size}
            onFavorite={trashed ? undefined : bulkFavorite}
            onDelete={trashed ? bulkDelete : bulkTrash}
            onClear={clear}
          />
        )}

        {/* Select All Checkbox & Count info */}
        {!loading && filteredFiles.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={(checked) => (checked ? selectAll() : clear())}
              label={
                <span className="text-xs text-[var(--text-muted)]">
                  Tout sélectionner ({filteredFiles.length} élément{filteredFiles.length > 1 ? "s" : ""})
                </span>
              }
            />
            <span className="text-[11px] text-[var(--text-muted)]">
              {selected.size > 0 && `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`}
            </span>
          </div>
        )}

        {/* Error notification (only if drive is connected and real error occurs) */}
        {error && clientId && (
          <EmptyState
            icon="alert-circle"
            title={i18n("error", "Erreur de chargement")}
            description={error.message}
            action={
              <Button size="sm" onClick={reload} leftIcon={<RefreshCw className="h-4 w-4" />}>
                {i18n("retry", "Réessayer")}
              </Button>
            }
          />
        )}

        {/* List View Table Header */}
        {viewMode === "list" && !loading && filteredFiles.length > 0 && (
          <div className="sticky top-0 z-10 hidden rounded-xl border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.7] px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] backdrop-blur-xl sm:grid sm:grid-cols-[1.5rem_2.5rem_minmax(0,1fr)_6rem_6rem_7rem] sm:items-center sm:gap-3">
            <span />
            <span />
            <span>Nom de l&apos;élément</span>
            <span className="text-right">Taille</span>
            <span className="text-right">Modifié le</span>
            <span className="text-right">Actions</span>
          </div>
        )}

        {/* Main Items Grid / List Container */}
        <div
          className={cn(
            "grid gap-2.5",
            viewMode === "list"
              ? "grid-cols-1"
              : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 auto-rows-fr"
          )}
        >
          {loading ? (
            <>
              {[...Array(viewMode === "list" ? 6 : 10)].map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.3] p-3 shadow-sm"
                >
                  <div
                    className={cn(
                      "animate-pulse",
                      viewMode === "grid"
                        ? "flex flex-col items-center gap-3"
                        : "flex items-center gap-3"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-xl bg-[var(--text-primary)]/[0.08]",
                        viewMode === "grid" ? "h-24 w-full" : "h-9 w-9 shrink-0"
                      )}
                    />
                    <div className="w-full space-y-1.5">
                      <div className="h-3.5 w-3/4 rounded bg-[var(--text-primary)]/[0.08]" />
                      <div className="h-2.5 w-1/2 rounded bg-[var(--text-primary)]/[0.08]" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : filteredFiles.length === 0 ? (
            error && clientId ? null : !clientId ? (
              <div className="col-span-full">
                <EmptyState
                  icon="cloud"
                  title="Connectez un Drive pour commencer"
                  description="Reliez votre Google Drive pour gérer, prévisualiser, synchroniser et partager vos fichiers en toute fluidité."
                  action={
                    <Button onClick={connectDrive} leftIcon={<Cloud className="h-4 w-4" />}>
                      Connecter Google Drive
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="col-span-full flex min-h-[40vh] flex-col items-center justify-center p-4">
                <div className="w-full max-w-lg rounded-3xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.3] p-8 text-center shadow-xl backdrop-blur-2xl">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shadow-md">
                    <Icon
                      name={
                        trashed
                          ? "trash-2"
                          : showDuplicates
                          ? "copy"
                          : viewTab === "folders"
                          ? "folder"
                          : viewTab === "favorites"
                          ? "heart"
                          : "cloud-upload"
                      }
                      className="h-8 w-8"
                    />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
                    {showDuplicates
                      ? "Aucun doublon détecté"
                      : viewTab === "folders"
                      ? "Aucun dossier trouvé"
                      : viewTab === "favorites"
                      ? "Aucun fichier favori"
                      : viewTab === "trash"
                      ? "La corbeille est vide"
                      : query
                      ? "Aucun résultat de recherche"
                      : "Aucun fichier dans cet emplacement"}
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--text-muted)]">
                    {query
                      ? "Essayez d'ajuster votre recherche ou de retirer certains filtres."
                      : "Déposez un fichier directement ou cliquez sur le bouton ci-dessous pour ajouter du contenu."}
                  </p>
                  <div className="mt-6 space-y-3">
                    <FileUploadZone
                      compact
                      onFiles={(files) => {
                        setAddTab("upload");
                        setDroppedFiles(files);
                        setAddOpen(true);
                      }}
                      onClick={() => {
                        setAddTab("upload");
                        setAddOpen(true);
                      }}
                    />
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          setAddTab("folder");
                          setAddOpen(true);
                        }}
                        leftIcon={<FolderPlus className="h-4 w-4" />}
                      >
                        Nouveau dossier
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setAddTab("link");
                          setAddOpen(true);
                        }}
                        leftIcon={<ExternalLink className="h-4 w-4" />}
                      >
                        Ajouter un lien
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            filteredFiles.map((file, i) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: Math.min(i * 0.015, 0.2) }}
                className="h-full"
              >
                <ContextMenu items={fileContextItems(file)}>
                  <FileCard
                    file={file}
                    viewMode={viewMode}
                    selected={isSelected(file.id)}
                    trashed={trashed || viewTab === "trash"}
                    clientId={clientId}
                    onToggle={() => toggle(file.id)}
                    onOpen={() => openFile(file)}
                    onDownload={() => downloadDriveFile(file)}
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

      {/* Global Modals */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={
          modal?.type === "rename"
            ? i18n("renameFile", "Renommer")
            : modal?.type === "move"
            ? i18n("moveTo", "Déplacer vers")
            : modal?.type === "share"
            ? i18n("shareFile", "Partager le fichier")
            : modal?.type === "drop"
            ? i18n("createDrop", "Créer un espace Drop")
            : ""
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
              aria-label="Nouveau nom"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModal(null)}>
                {i18n("cancel", "Annuler")}
              </Button>
              <Button type="submit" disabled={submitting || !form.name?.trim()}>
                {i18n("save", "Enregistrer")}
              </Button>
            </div>
          </form>
        )}

        {modal?.type === "move" && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              Choisissez le dossier de destination pour <strong>{modal.file.name}</strong> :
            </p>
            <div className="max-h-60 space-y-1 overflow-auto os-scroll rounded-xl border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.3] p-2">
              <button
                type="button"
                onClick={() => handleMove(null)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]"
              >
                <Folder className="h-4 w-4 text-[var(--accent-primary)]" />
                <span>Racine (Tous les fichiers)</span>
              </button>
              {moveTargets.map((folder) => (
                <button
                  key={folder.driveFileId}
                  type="button"
                  onClick={() => handleMove(folder.driveFileId)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]"
                >
                  <Folder className="h-4 w-4 text-[var(--accent-primary)]" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setModal(null)}>
                {i18n("cancel", "Annuler")}
              </Button>
            </div>
          </div>
        )}

        {modal?.type === "share" && (
          <form onSubmit={handleShare} className="space-y-4">
            <p className="text-xs font-medium text-[var(--text-primary)]">{modal?.file?.name}</p>
            <Select
              value={form.visibility || "public"}
              onChange={(value) => setForm({ ...form, visibility: value })}
              options={[
                { id: "public", label: i18n("public", "Public (Lien ouvert)") },
                { id: "password", label: i18n("password", "Protégé par mot de passe") },
              ]}
              aria-label={i18n("visibility", "Visibilité")}
              className="w-full"
            />
            {form.visibility === "password" && (
              <Input
                type="password"
                value={form.password || ""}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mot de passe requis"
              />
            )}
            <Input
              type="datetime-local"
              value={form.expiresAt || ""}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              inputSize="compact"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModal(null)}>
                {i18n("cancel", "Annuler")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {i18n("shareThis", "Générer le lien")}
              </Button>
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
              placeholder={i18n("title", "Titre du Drop")}
            />
            <Input
              type="text"
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={i18n("description", "Description")}
            />
            <Select
              value={form.visibility || "public"}
              onChange={(value) => setForm({ ...form, visibility: value })}
              options={[
                { id: "public", label: i18n("public", "Public") },
                { id: "password", label: i18n("password", "Protégé par mot de passe") },
              ]}
              aria-label={i18n("visibility", "Visibilité")}
              className="w-full"
            />
            {form.visibility === "password" && (
              <Input
                type="password"
                value={form.password || ""}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={i18n("password", "Mot de passe")}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModal(null)}>
                {i18n("cancel", "Annuler")}
              </Button>
              <Button type="submit" disabled={submitting || !form.title?.trim()}>
                {i18n("create", "Créer")}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Screen File Drop Overlay */}
      {clientId && (
        <FileDropOverlay
          onDrop={(files) => {
            setAddTab("upload");
            setDroppedFiles(files);
            setAddOpen(true);
          }}
          disabled={!clientId}
        />
      )}

      {/* Slide-over Quick Preview Drawer */}
      {previewFile && (
        <FilePreview
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
          clientId={clientId || undefined}
          location={previewLocation}
          trashed={trashed || viewTab === "trash"}
          onDownload={() => downloadDriveFile(previewFile)}
          onShare={() => openShare(previewFile)}
          onRename={() => {
            setForm({ name: previewFile.name });
            setModal({ type: "rename", file: previewFile });
          }}
          onMove={() => setModal({ type: "move", file: previewFile })}
          onFavorite={() => favoriteFile(previewFile.driveFileId, !previewFile.isFavorite)}
          onTrash={() => trashFile(previewFile.driveFileId)}
          onDelete={() => deleteFile(previewFile.driveFileId)}
          onRestore={() => restoreFile(previewFile.driveFileId)}
        />
      )}

      {/* Add Content Modal */}
      <FileAddModal
        open={addOpen}
        initialTab={addTab}
        onClose={() => {
          setAddOpen(false);
          setDroppedFiles([]);
        }}
        clientId={clientId}
        parentId={parentId}
        initialFiles={droppedFiles}
        onUploadComplete={() => {
          setDroppedFiles([]);
          success(i18n("uploadFile", "Téléversement terminé"));
          reload();
        }}
        onCreateFolder={handleCreateFolder}
        onCreateLink={handleCreateLink}
        onConnectDrive={connectDrive}
      />

      {/* Admin Panel Modal */}
      <Modal
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        title={i18n("filesAdminPanel", "Administration des Fichiers")}
        size="lg"
        hideFooter
      >
        <FilesAdminPanel />
      </Modal>
    </div>
  );
}

