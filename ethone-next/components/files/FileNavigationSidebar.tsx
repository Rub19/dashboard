"use client";

import { useMemo } from "react";
import {
  Home,
  Folder,
  Clock,
  Star,
  Share2,
  Briefcase,
  Cloud,
  Trash2,
  HardDrive,
  RefreshCw,
  Plus,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes, FILE_CATEGORIES, type FileCategory } from "@/lib/files";
import type { CloudFile, Quota } from "@/lib/hooks/useCloudFiles";

export type FileSection =
  | "home"
  | "files"
  | "recent"
  | "favorites"
  | "shared"
  | "workspaces"
  | "drive"
  | "trash";

export type FileNavigationSidebarProps = {
  activeSection: FileSection;
  onSelectSection: (section: FileSection) => void;
  selectedCategory: FileCategory;
  onSelectCategory: (cat: FileCategory) => void;
  files: CloudFile[];
  quota: Quota | null;
  clientId?: string;
  onOpenUpload: () => void;
  onNewFolder: () => void;
  onSyncDrive?: () => void;
  syncingDrive?: boolean;
};

export default function FileNavigationSidebar({
  activeSection,
  onSelectSection,
  selectedCategory,
  onSelectCategory,
  files,
  quota,
  clientId,
  onOpenUpload,
  onNewFolder,
  onSyncDrive,
  syncingDrive,
}: FileNavigationSidebarProps) {
  const trashedCount = useMemo(() => files.filter((f) => f.trashed).length, [files]);
  const favoritesCount = useMemo(() => files.filter((f) => !f.trashed && f.isFavorite).length, [files]);

  // Aggregate ETHONE storage size from non-trashed files
  const ethoneBytes = useMemo(() => {
    return files
      .filter((f) => !f.trashed && !f.isFolder)
      .reduce((acc, f) => acc + (f.size || 0), 0);
  }, [files]);

  const SECTIONS = [
    { id: "home" as const, label: "Accueil", icon: Home },
    { id: "files" as const, label: "Mes Fichiers", icon: Folder },
    { id: "recent" as const, label: "Récents", icon: Clock },
    { id: "favorites" as const, label: "Favoris", icon: Star, count: favoritesCount },
    { id: "shared" as const, label: "Partagés", icon: Share2 },
    { id: "workspaces" as const, label: "Workspaces", icon: Briefcase },
    { id: "drive" as const, label: "Google Drive", icon: Cloud, badge: clientId ? "Connecté" : undefined },
    { id: "trash" as const, label: "Corbeille", icon: Trash2, count: trashedCount },
  ];

  return (
    <div className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--panel-border)]/70 bg-[var(--panel-bg)]/80 backdrop-blur-xl p-3 select-none">
      {/* Action Buttons */}
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--panel-border)]/60">
        <button
          type="button"
          onClick={onOpenUpload}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3 py-2 text-xs font-bold text-[var(--accent-contrast)] shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Importer</span>
        </button>
        <button
          type="button"
          onClick={onNewFolder}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 active:scale-95 transition-all cursor-pointer shadow-xs"
          title="Nouveau dossier"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Main Navigation Links */}
      <div className="mt-3 flex-1 overflow-y-auto os-scroll pr-1 space-y-1">
        <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Navigation
        </p>

        {SECTIONS.map((sec) => {
          const IconComp = sec.icon;
          const active = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onSelectSection(sec.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer",
                active
                  ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold border border-[var(--accent-primary)]/30 shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/40"
              )}
            >
              <div className="flex items-center gap-2.5 truncate">
                <IconComp className={cn("h-4 w-4 shrink-0", active ? "text-[var(--accent-primary)]" : "opacity-70")} />
                <span className="truncate">{sec.label}</span>
              </div>

              {sec.badge && (
                <span className="rounded-md bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-300">
                  {sec.badge}
                </span>
              )}

              {typeof sec.count === "number" && sec.count > 0 && (
                <span className="rounded-full bg-[var(--surface-raised)] px-1.5 py-0.2 font-mono text-[10px] font-bold text-[var(--text-muted)]">
                  {sec.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Category Filters */}
        <div className="pt-4">
          <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Catégories
          </p>
          <div className="space-y-0.5">
            {FILE_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all cursor-pointer",
                    active
                      ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/30"
                  )}
                >
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Storage Breakdown Widget */}
      <div className="mt-3 border-t border-[var(--panel-border)]/60 pt-3 text-xs space-y-2.5">
        <div className="flex items-center justify-between text-[var(--text-muted)]">
          <span className="text-[10px] font-bold uppercase tracking-wider">Stockage</span>
          {clientId && onSyncDrive && (
            <button
              type="button"
              onClick={onSyncDrive}
              disabled={syncingDrive}
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer disabled:opacity-50"
              title="Synchroniser Google Drive"
            >
              <RefreshCw className={cn("h-3 w-3", syncingDrive && "animate-spin")} />
              <span>Synchro</span>
            </button>
          )}
        </div>

        {/* ETHONE Local/Cloud usage */}
        <div className="rounded-xl border border-[var(--panel-border)]/50 bg-[var(--surface-raised)]/40 p-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
              <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
              ETHONE
            </span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              {formatBytes(ethoneBytes)}
            </span>
          </div>
        </div>

        {/* Google Drive Quota if connected */}
        {quota && quota.total > 0 && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-blue-300">
                <Cloud className="h-3.5 w-3.5 text-blue-400" />
                Drive
              </span>
              <span className="font-mono text-[11px] text-zinc-400">
                {formatBytes(quota.used)} / {formatBytes(quota.total)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-blue-950/60">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(100, Math.round((quota.used / quota.total) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
