"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCloudFiles, type CloudFile } from "@/lib/hooks/useCloudFiles";
import { useUserState } from "@/lib/hooks/useUserState";
import { useShares } from "@/lib/hooks/useShares";
import { useDrops } from "@/lib/hooks/useDrops";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
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
import FileAddModal, { type TabId } from "@/components/FileAddModal";
import FilePreview from "@/components/FilePreview";
import FileCard from "@/components/FileCard";
import FileDropOverlay from "@/components/FileDropOverlay";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useSettings } from "@/components/SettingsProvider";
import FileNavigationSidebar, { type FileSection } from "@/components/files/FileNavigationSidebar";
import FileInspector from "@/components/files/FileInspector";
import {
  Folder,
  FolderPlus,
  Plus,
  Cloud,
  Search,
  Sparkles,
  Brain,
  Clock,
  Star,
  Trash2,
  Grid2X2,
  List as ListIcon,
  RefreshCw,
  UploadCloud,
  ChevronRight,
  HardDrive,
  CheckSquare,
  Square,
  ArrowUpDown,
  Filter,
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

type Modal =
  | { type: "share"; file: CloudFile }
  | { type: "rename"; file: CloudFile }
  | { type: "move"; file: CloudFile }
  | null;

export default function FilesPage() {
  const i18n = useI18n();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { settings } = useSettings();
  const { success, error: toastError } = useToast();
  const [storedClientId] = useUserState<string>("clientId:google-drive", "");
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
    uploadFile,
    syncWithDrive,
  } = useCloudFiles(clientId || undefined);

  const { create: createShare } = useShares();
  const [activeSection, setActiveSection] = useState<FileSection>("home");
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>("all");
  const [modal, setModal] = useState<Modal>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<TabId>("upload");
  const [inspectedFile, setInspectedFile] = useState<CloudFile | null>(null);
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<"name" | "size" | "date" | "type">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [selectMode, setSelectMode] = useState(false);

  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    try {
      const saved = localStorage.getItem("ethone.files.viewMode");
      return saved === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ethone.files.viewMode", viewMode);
    } catch {}
  }, [viewMode]);

  // Command Center and Hotkeys listeners
  useEffect(() => {
    function handleTriggerUpload() {
      setAddTab("upload");
      setAddOpen(true);
    }
    function handleCreateFolder() {
      const name = prompt("Nom du nouveau dossier :");
      if (name?.trim()) {
        createFolder(name.trim(), parentId);
        success("Dossier créé");
      }
    }

    window.addEventListener("v8:trigger-upload", handleTriggerUpload);
    window.addEventListener("v8:create-folder", handleCreateFolder);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (query) setQuery("");
        else if (addOpen) setAddOpen(false);
        else if (inspectedFile) setInspectedFile(null);
        else if (previewFile) setPreviewFile(null);
        else if (modal) setModal(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        e.preventDefault();
        handleTriggerUpload();
      }
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("v8:trigger-upload", handleTriggerUpload);
      window.removeEventListener("v8:create-folder", handleCreateFolder);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [addOpen, inspectedFile, previewFile, modal, query, setQuery, createFolder, parentId, success]);

  // Sync section selection with query parameters / hooks
  const handleSelectSection = useCallback((sec: FileSection) => {
    setActiveSection(sec);
    if (sec === "trash") {
      setTrashed(true);
      setFavorites(false);
      setParentId(null);
    } else if (sec === "favorites") {
      setTrashed(false);
      setFavorites(true);
      setParentId(null);
    } else {
      setTrashed(false);
      setFavorites(false);
      if (sec !== "files") setParentId(null);
    }
  }, [setTrashed, setFavorites, setParentId]);

  // Filtered files calculation
  const filteredFiles = useMemo(() => {
    let list = [...files];

    // Section filter
    if (activeSection === "trash" || trashed) {
      list = list.filter((f) => f.trashed);
    } else {
      list = list.filter((f) => !f.trashed);

      if (activeSection === "favorites" || favorites) {
        list = list.filter((f) => f.isFavorite);
      } else if (activeSection === "recent") {
        list = list.filter((f) => !f.isFolder);
      } else if (activeSection === "drive") {
        list = list.filter((f) => !!f.driveFileId);
      } else if (activeSection === "files" && parentId) {
        list = list.filter((f) => f.driveParentId === parentId || f.parentId === parentId);
      } else if (activeSection === "files" && !parentId) {
        list = list.filter((f) => !f.driveParentId && !f.parentId);
      }
    }

    // Category filter
    if (selectedCategory !== "all") {
      list = list.filter((f) => !f.isFolder && getFileCategory(f) === selectedCategory);
    }

    // Tokenized search
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      const isFromDrive = q.includes("from:drive");
      const isFromEthone = q.includes("from:ethone");
      const cleanQ = q.replace(/from:w+/g, "").trim();

      list = list.filter((f) => {
        if (isFromDrive && !f.driveFileId) return false;
        if (isFromEthone && f.driveFileId) return false;
        if (!cleanQ) return true;

        const name = f.name.toLowerCase();
        const ext = cleanQ.startsWith(".") ? cleanQ.slice(1) : cleanQ;
        const nameMatch = name.includes(cleanQ) || name.endsWith(`.${ext}`);
        const mimeMatch = (f.mimeType || "").toLowerCase().includes(cleanQ);
        const tagMatch = f.tags?.some((t) => t.toLowerCase().includes(cleanQ));
        return nameMatch || mimeMatch || tagMatch;
      });
    }

    return sortFiles(list, sort, sortDirection);
  }, [
    files,
    activeSection,
    trashed,
    favorites,
    parentId,
    selectedCategory,
    query,
    sort,
    sortDirection,
  ]);

  // Separate folders and files for clean hierarchical view
  const currentFolders = useMemo(
    () => filteredFiles.filter((f) => f.isFolder),
    [filteredFiles]
  );
  const currentFiles = useMemo(
    () => filteredFiles.filter((f) => !f.isFolder),
    [filteredFiles]
  );

  // Recent files shelf for Home view
  const recentFiles = useMemo(() => {
    return [...files]
      .filter((f) => !f.isFolder && !f.trashed)
      .sort((a, b) => {
        const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tB - tA;
      })
      .slice(0, 6);
  }, [files]);

  // Starred files shelf for Home view
  const favoriteFiles = useMemo(() => {
    return files.filter((f) => !f.trashed && f.isFavorite).slice(0, 6);
  }, [files]);

  const { selected, selectedItems, hasSelection, isAllSelected, toggle, selectAll, clear, isSelected } =
    useSelection<CloudFile>(filteredFiles);

  const path = useMemo(() => folderPath(files, parentId), [files, parentId]);

  async function handleSyncDrive() {
    if (!clientId) return;
    setSyncingDrive(true);
    try {
      await syncWithDrive();
      success("Google Drive synchronisé avec succès");
    } catch (e) {
      toastError("Erreur lors de la synchronisation");
    } finally {
      setSyncingDrive(false);
    }
  }

  function handleFileOpen(file: CloudFile) {
    if (file.isFolder) {
      setParentId(file.driveFileId);
      setActiveSection("files");
    } else {
      setInspectedFile(file);
    }
  }

  function handleQuickPreview(file: CloudFile) {
    setPreviewFile(file);
  }

  async function handleBulkDelete() {
    if (!confirm(`Voulez-vous supprimer les ${selectedItems.length} fichier(s) sélectionnés ?`)) return;
    for (const f of selectedItems) {
      await trashFile(f.driveFileId);
    }
    clear();
    success(`${selectedItems.length} fichier(s) mis à la corbeille`);
  }

  async function handleBulkFavorite() {
    for (const f of selectedItems) {
      await favoriteFile(f.driveFileId, true);
    }
    clear();
    success(`${selectedItems.length} fichier(s) ajoutés aux favoris`);
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* 1. Left Navigation Sidebar */}
      {!isMobile && (
        <FileNavigationSidebar
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          files={files}
          quota={quota}
          clientId={clientId}
          onOpenUpload={() => {
            setAddTab("upload");
            setAddOpen(true);
          }}
          onNewFolder={() => {
            const name = prompt("Nom du dossier :");
            if (name?.trim()) {
              createFolder(name.trim(), parentId);
              success("Dossier créé");
            }
          }}
          onSyncDrive={handleSyncDrive}
          syncingDrive={syncingDrive}
        />
      )}

      {/* 2. Central File Explorer Workspace */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Explorer Header & Toolbar */}
        <div className="flex flex-col gap-3 border-b border-[var(--panel-border)]/60 bg-[var(--panel-bg)]/60 p-4 backdrop-blur-md">
          {/* Breadcrumbs and Top Actions */}
          <div className="flex items-center justify-between gap-3">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold text-[var(--text-muted)] no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setParentId(null);
                  setActiveSection("files");
                }}
                className={cn(
                  "hover:text-[var(--text-primary)] transition-colors cursor-pointer",
                  !parentId && activeSection === "files" && "text-[var(--accent-primary)] font-bold"
                )}
              >
                Fichiers
              </button>

              {path.map((folder, idx) => (
                <div key={folder.driveFileId} className="flex items-center gap-1.5">
                  <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                  <button
                    type="button"
                    onClick={() => setParentId(folder.driveFileId)}
                    className={cn(
                      "hover:text-[var(--text-primary)] transition-colors truncate max-w-[120px] cursor-pointer",
                      idx === path.length - 1 && "text-[var(--accent-primary)] font-bold"
                    )}
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>

            {/* View Mode & Selection Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setSelectMode(!selectMode)}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-all cursor-pointer",
                  selectMode
                    ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                    : "border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-white"
                )}
                title="Mode sélection"
              >
                {selectMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Sélection</span>
              </button>

              <div className="flex items-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-all cursor-pointer",
                    viewMode === "grid"
                      ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-xs"
                      : "text-[var(--text-muted)] hover:text-white"
                  )}
                  title="Grille"
                >
                  <Grid2X2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-all cursor-pointer",
                    viewMode === "list"
                      ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-xs"
                      : "text-[var(--text-muted)] hover:text-white"
                  )}
                  title="Liste"
                >
                  <ListIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => reload()}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-white transition-all cursor-pointer shadow-xs"
                title="Rafraîchir"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-[var(--accent-primary)]")} />
              </button>
            </div>
          </div>

          {/* Search bar & Sort Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher par nom, extension (ex: pdf, *.png), ou filtre (from:drive)..."
                className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="h-8 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 px-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
              >
                <option value="date">Date</option>
                <option value="name">Nom</option>
                <option value="size">Taille</option>
                <option value="type">Type</option>
              </select>

              <button
                type="button"
                onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-white transition-all cursor-pointer"
                title={sortDirection === "asc" ? "Ordre croissant" : "Ordre décroissant"}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto os-scroll p-4 space-y-6">
          {/* HOME VIEW: Executive Dashboard */}
          {activeSection === "home" && !query && (
            <div className="space-y-6">
              {/* Storage Overview Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-emerald-400" />
                      Stockage ETHONE Cloud
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">Fichiers stockés localement et synchronisés</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {formatBytes(files.filter((f) => !f.trashed && !f.isFolder).reduce((acc, f) => acc + (f.size || 0), 0))}
                  </span>
                </div>

                {quota && quota.total > 0 && (
                  <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-blue-300 flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-blue-400" />
                        Quota Google Drive
                      </p>
                      <span className="font-mono text-xs font-bold text-blue-300">
                        {formatBytes(quota.used)} / {formatBytes(quota.total)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-950/60">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.min(100, Math.round((quota.used / quota.total) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Files Shelf */}
              {recentFiles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[var(--accent-primary)]" />
                      Fichiers récents
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveSection("recent")}
                      className="text-xs text-[var(--accent-primary)] hover:underline cursor-pointer"
                    >
                      Voir tout
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {recentFiles.map((file) => (
                      <FileCard
                        key={file.driveFileId}
                        file={file}
                        viewMode="grid"
                        onOpen={() => handleFileOpen(file)}
                        onDownload={() => window.open(file.webViewLink || "#", "_blank")}
                        onFavorite={() => favoriteFile(file.driveFileId, !file.isFavorite)}
                        onTrash={() => trashFile(file.driveFileId)}
                        onDelete={() => deleteFile(file.driveFileId)}
                        onRestore={() => restoreFile(file.driveFileId)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Starred / Favorites Shelf */}
              {favoriteFiles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-400" />
                      Fichiers favoris
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveSection("favorites")}
                      className="text-xs text-[var(--accent-primary)] hover:underline cursor-pointer"
                    >
                      Voir tout
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {favoriteFiles.map((file) => (
                      <FileCard
                        key={file.driveFileId}
                        file={file}
                        viewMode="grid"
                        onOpen={() => handleFileOpen(file)}
                        onDownload={() => window.open(file.webViewLink || "#", "_blank")}
                        onFavorite={() => favoriteFile(file.driveFileId, !file.isFavorite)}
                        onTrash={() => trashFile(file.driveFileId)}
                        onDelete={() => deleteFile(file.driveFileId)}
                        onRestore={() => restoreFile(file.driveFileId)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FOLDERS & FILES BROWSING VIEW */}
          {(activeSection !== "home" || query) && (
            <div className="space-y-5">
              {/* Subfolders Grid */}
              {currentFolders.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">
                    Dossiers ({currentFolders.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {currentFolders.map((folder) => (
                      <FileCard
                        key={folder.driveFileId}
                        file={folder}
                        viewMode="grid"
                        onOpen={() => handleFileOpen(folder)}
                        onDownload={() => {}}
                        onFavorite={() => favoriteFile(folder.driveFileId, !folder.isFavorite)}
                        onTrash={() => trashFile(folder.driveFileId)}
                        onDelete={() => deleteFile(folder.driveFileId)}
                        onRestore={() => restoreFile(folder.driveFileId)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Files Grid / List */}
              {currentFiles.length > 0 ? (
                <div>
                  <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">
                    Documents ({currentFiles.length})
                  </h4>
                  <div
                    className={cn(
                      viewMode === "grid"
                        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
                        : "flex flex-col gap-1.5"
                    )}
                  >
                    {currentFiles.map((file) => (
                      <FileCard
                        key={file.driveFileId}
                        file={file}
                        viewMode={viewMode}
                        selected={selectMode ? isSelected(file.driveFileId) : undefined}
                        onToggle={selectMode ? () => toggle(file.driveFileId) : undefined}
                        onOpen={() => handleFileOpen(file)}
                        onDownload={() => window.open(file.webViewLink || "#", "_blank")}
                        onFavorite={() => favoriteFile(file.driveFileId, !file.isFavorite)}
                        onTrash={() => trashFile(file.driveFileId)}
                        onDelete={() => deleteFile(file.driveFileId)}
                        onRestore={() => restoreFile(file.driveFileId)}
                      />
                    ))}
                  </div>
                </div>
              ) : currentFolders.length === 0 ? (
                <EmptyState
                  icon="folder"
                  title="Aucun document trouvé"
                  description="Ce dossier est vide ou aucun fichier ne correspond à vos filtres."
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setAddTab("upload");
                        setAddOpen(true);
                      }}
                      leftIcon={<UploadCloud className="h-4 w-4" />}
                    >
                      Importer un fichier
                    </Button>
                  }
                />
              ) : null}
            </div>
          )}
        </div>

        {/* Floating Bulk Action Bar */}
        {selectMode && hasSelection && (
          <BulkActionBar
            count={selectedItems.length}
            onClear={clear}
            onDelete={handleBulkDelete}
            onFavorite={handleBulkFavorite}
          />
        )}
      </div>

      {/* 3. Right Quick Inspector Pane (Collapsible) */}
      {inspectedFile && (
        <div className="w-80 shrink-0 hidden md:block">
          <FileInspector
            file={inspectedFile}
            onClose={() => setInspectedFile(null)}
            clientId={clientId}
            onDownload={(f) => window.open(f.webViewLink || "#", "_blank")}
            onShare={(f) => setModal({ type: "share", file: f })}
            onRename={(f) => {
              setForm({ name: f.name });
              setModal({ type: "rename", file: f });
            }}
            onMove={(f) => setModal({ type: "move", file: f })}
            onFavorite={(f) => favoriteFile(f.driveFileId, !f.isFavorite)}
            onTrash={(f) => {
              trashFile(f.driveFileId);
              setInspectedFile(null);
            }}
            onDelete={(f) => {
              deleteFile(f.driveFileId);
              setInspectedFile(null);
            }}
            onRestore={(f) => restoreFile(f.driveFileId)}
          />
        </div>
      )}

      {/* Mobile Slide-Over Inspector */}
      {isMobile && inspectedFile && (
        <Modal isOpen={true} onClose={() => setInspectedFile(null)} title="Détails du fichier">
          <FileInspector
            file={inspectedFile}
            onClose={() => setInspectedFile(null)}
            clientId={clientId}
            onDownload={(f) => window.open(f.webViewLink || "#", "_blank")}
            onShare={(f) => setModal({ type: "share", file: f })}
            onRename={(f) => {
              setForm({ name: f.name });
              setModal({ type: "rename", file: f });
            }}
            onMove={(f) => setModal({ type: "move", file: f })}
            onFavorite={(f) => favoriteFile(f.driveFileId, !f.isFavorite)}
            onTrash={(f) => {
              trashFile(f.driveFileId);
              setInspectedFile(null);
            }}
            onDelete={(f) => {
              deleteFile(f.driveFileId);
              setInspectedFile(null);
            }}
            onRestore={(f) => restoreFile(f.driveFileId)}
          />
        </Modal>
      )}

      {/* Add / Upload Modal */}
      <FileAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        initialTab={addTab}
        parentId={parentId}
        onUploadComplete={() => {
          reload();
          setAddOpen(false);
        }}
        onCreateFolder={async (name) => {
          await createFolder(name, parentId);
          success("Dossier créé");
        }}
        onConnectDrive={() => {
          const id = prompt("Entrez votre Client ID Google Drive :");
          if (id?.trim()) {
            localStorage.setItem("ethone:clientId:google-drive", id.trim());
            reload();
          }
        }}
      />

      {/* Full Preview Modal */}
      {previewFile && (
        <FilePreview
          open={true}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
          clientId={clientId}
          onDownload={() => window.open(previewFile.webViewLink || "#", "_blank")}
          onShare={() => setModal({ type: "share", file: previewFile })}
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

      {/* Rename Dialog */}
      {modal?.type === "rename" && (
        <Modal
          isOpen={true}
          onClose={() => setModal(null)}
          title="Renommer le fichier"
        >
          <div className="space-y-4 p-2">
            <input
              type="text"
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setModal(null)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  if (form.name?.trim()) {
                    await renameFile(modal.file.driveFileId, form.name.trim());
                    success("Fichier renommé");
                    setModal(null);
                  }
                }}
              >
                Confirmer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Drag & Drop Fullscreen Overlay */}
      <FileDropOverlay
        onDrop={(dropped) => {
          for (const f of dropped) {
            uploadFile(f, parentId);
          }
          success(`${dropped.length} fichier(s) importé(s)`);
        }}
      />
    </div>
  );
}
