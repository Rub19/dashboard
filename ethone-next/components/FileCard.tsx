"use client";

import { memo } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { formatBytes, mimeIcon, getFileExtension, getFileCategory } from "@/lib/files";
import { useI18n } from "@/lib/hooks/useI18n";
import SafeImage from "@/components/SafeImage";
import type { CloudFile } from "@/lib/hooks/useCloudFiles";

export type FileViewMode = "list" | "grid";

export type FileCardProps = {
  file: CloudFile;
  viewMode?: FileViewMode;
  selected?: boolean;
  trashed?: boolean;
  clientId?: string;
  onToggle?: () => void;
  onOpen: () => void;
  onDownload: () => void;
  onFavorite: () => void;
  onTrash: () => void;
  onDelete: () => void;
  onRestore: () => void;
};

function formatDateShort(raw?: string) {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "—";
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    }
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return raw;
  }
}

function FileCardComponent({
  file,
  viewMode = "list",
  selected,
  trashed,
  clientId,
  onToggle,
  onOpen,
  onDownload,
  onFavorite,
  onTrash,
  onDelete,
  onRestore,
}: FileCardProps) {
  const i18n = useI18n();
  const isGrid = viewMode === "grid";
  const ext = getFileExtension(file.name);
  const category = getFileCategory(file);
  const iconName = mimeIcon(file.mimeType, file.isFolder, file.name);

  const isImage = file.mimeType?.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
  const isVideo = file.mimeType?.startsWith("video/") || ["mp4", "webm", "mov"].includes(ext);
  const isAudio = file.mimeType?.startsWith("audio/") || ["mp3", "wav", "ogg"].includes(ext);
  const isVisual = isImage || isVideo || isAudio;

  const actionButton = (
    name: string,
    label: string,
    onClick: () => void,
    variant: "default" | "danger" | "favorite" = "default"
  ) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg border border-transparent transition-all duration-150 active:scale-95",
        variant === "default" && "text-[var(--text-muted)] hover:border-[var(--panel-border)]/[0.2] hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]",
        variant === "danger" && "text-[var(--danger)] hover:border-[var(--danger)]/30 hover:bg-[var(--danger)]/15",
        variant === "favorite" && "text-[var(--warning)] hover:border-[var(--warning)]/30 hover:bg-[var(--warning)]/15",
      )}
    >
      <Icon name={name} className="h-3.5 w-3.5" />
    </button>
  );

  const gridMedia = (
    <div
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden rounded-2xl transition-all duration-200",
        file.isFolder
          ? "bg-[var(--accent-primary)]/[0.04] p-4 text-[var(--accent-primary)]"
          : "bg-[var(--bg-main)]/[0.8] p-3 text-[var(--text-muted)]"
      )}
      style={{ aspectRatio: "16/10" }}
    >
      {isVisual && (file.thumbnailLink || file.iconUrl) ? (
        <SafeImage
          candidates={[file.thumbnailLink, file.iconUrl]}
          alt={file.name}
          size={320}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          iconClassName="h-10 w-10 text-[var(--accent-primary)]"
          loading="lazy"
          fallback="none"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-200",
              file.isFolder
                ? "border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shadow-sm group-hover:scale-105"
                : "border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.5] text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]"
            )}
          >
            <Icon name={iconName} className={cn("transition-transform", file.isFolder ? "h-7 w-7" : "h-6 w-6")} />
          </div>
          {ext && !file.isFolder && (
            <span className="rounded-md border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.6] px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {ext}
            </span>
          )}
        </div>
      )}

      {/* Floating badges on media */}
      <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <div
          className={cn(
            "transition-opacity duration-150",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
          )}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--panel-bg)]/[0.85] shadow-sm backdrop-blur-md">
            <Checkbox
              checked={selected ?? false}
              onCheckedChange={onToggle ?? (() => {})}
              aria-label={i18n("select")}
            />
          </div>
        </div>
      </div>

      <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
        {file.brainSummary && (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--panel-bg)]/[0.85] text-[var(--accent-primary)] shadow-sm backdrop-blur-md"
            title={`Résumé Brain : ${file.brainSummary}`}
          >
            <Icon name="brain" className="h-3.5 w-3.5" />
          </div>
        )}
        {file.isFavorite && (
          <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--danger)]/20 bg-[var(--panel-bg)]/[0.85] text-[var(--danger)] shadow-sm backdrop-blur-md">
            <Icon name="heart" className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </div>
  );

  const gridContent = (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-2xl border p-2.5 transition-all duration-200",
        selected
          ? "border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/[0.07] shadow-[0_0_20px_var(--glow-color)]"
          : "border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.45] hover:border-[var(--accent-primary)]/35 hover:bg-[var(--panel-bg)]/[0.7] hover:shadow-lg"
      )}
    >
      {gridMedia}
      <div className="flex flex-1 flex-col justify-between pt-2.5">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-1.5">
            <p
              className="line-clamp-1 text-xs font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors"
              title={file.name}
            >
              {file.name}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
            <span>{file.isFolder ? i18n("folder", "Dossier") : formatBytes(file.size)}</span>
            <span className="opacity-40">•</span>
            <span>{formatDateShort(file.updatedAt || file.createdAt)}</span>
          </div>
        </div>

        {/* Action bar visible on hover */}
        <div
          className="mt-2.5 flex items-center justify-between border-t border-[var(--panel-border)]/[0.08] pt-1.5 opacity-40 transition-opacity duration-150 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-0.5">
            {actionButton(
              file.isFavorite ? "heart" : "heart-off",
              file.isFavorite ? i18n("removeFromFavorites") : i18n("addToFavorites"),
              onFavorite,
              file.isFavorite ? "favorite" : "default"
            )}
            {!file.isFolder && clientId && actionButton("download", i18n("download"), onDownload)}
            {trashed
              ? actionButton("rotate-ccw", i18n("restore"), onRestore)
              : actionButton("trash-2", i18n("trash"), onTrash)}
            {trashed && actionButton("trash", i18n("delete"), onDelete, "danger")}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
          >
            {file.isFolder ? i18n("open", "Ouvrir") : i18n("preview", "Aperçu")}
            <Icon name="arrow-right" className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );

  const listContent = (
    <div
      className={cn(
        "grid grid-cols-[1.5rem_2.5rem_minmax(0,1fr)_4.5rem] sm:grid-cols-[1.5rem_2.5rem_minmax(0,1fr)_6rem_6rem_7rem] items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-all duration-150",
        selected
          ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/[0.08]"
          : "hover:border-[var(--panel-border)]/[0.12] hover:bg-[var(--panel-bg)]/[0.6]"
      )}
    >
      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
        <Checkbox
          checked={selected ?? false}
          onCheckedChange={onToggle ?? (() => {})}
          aria-label={i18n("select")}
        />
      </div>

      <button type="button" onClick={onOpen} className="focus:outline-none flex justify-center">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-colors",
            file.isFolder
              ? "border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
              : "border-[var(--panel-border)]/[0.1] bg-[var(--bg-main)]/[0.7] text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]"
          )}
        >
          {isVisual && (file.thumbnailLink || file.iconUrl) ? (
            <SafeImage
              candidates={[file.thumbnailLink, file.iconUrl]}
              alt={file.name}
              size={48}
              className="h-full w-full object-cover"
              iconClassName="h-4 w-4"
              loading="lazy"
              fallback="none"
            />
          ) : (
            <Icon name={iconName} className="h-4 w-4" />
          )}
        </div>
      </button>

      <button type="button" onClick={onOpen} className="min-w-0 text-left focus:outline-none">
        <div className="flex items-center gap-2">
          <p
            className="truncate text-xs font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors"
            title={file.name}
          >
            {file.name}
          </p>
          {file.brainSummary && (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-1.5 py-0.2 text-[9px] font-medium text-[var(--accent-primary)]"
              title={file.brainSummary}
            >
              <Icon name="brain" className="h-2.5 w-2.5" />
              Brain
            </span>
          )}
          {file.isFavorite && (
            <Icon name="heart" className="h-3 w-3 shrink-0 text-[var(--danger)] fill-current" />
          )}
        </div>
        <p className="truncate text-[10px] text-[var(--text-muted)] sm:hidden">
          {file.isFolder ? i18n("folder") : `${formatBytes(file.size)} • ${formatDateShort(file.updatedAt || file.createdAt)}`}
        </p>
      </button>

      {!file.isFolder ? (
        <>
          <span className="hidden truncate text-right font-mono text-xs text-[var(--text-muted)] sm:block">
            {formatBytes(file.size)}
          </span>
          <span className="hidden truncate text-right text-xs text-[var(--text-muted)] sm:block">
            {formatDateShort(file.updatedAt || file.createdAt)}
          </span>
        </>
      ) : (
        <>
          <span className="hidden text-right text-xs font-medium text-[var(--accent-primary)]/70 sm:block">
            —
          </span>
          <span className="hidden text-right text-xs text-[var(--text-muted)] sm:block">
            {formatDateShort(file.updatedAt || file.createdAt)}
          </span>
        </>
      )}

      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-0.5">
        {actionButton(
          file.isFavorite ? "heart" : "heart-off",
          file.isFavorite ? i18n("removeFromFavorites") : i18n("addToFavorites"),
          onFavorite,
          file.isFavorite ? "favorite" : "default"
        )}
        {!file.isFolder && clientId && actionButton("download", i18n("download"), onDownload)}
        {trashed
          ? actionButton("rotate-ccw", i18n("restore"), onRestore)
          : actionButton("trash-2", i18n("trash"), onTrash)}
        {trashed && actionButton("trash", i18n("delete"), onDelete, "danger")}
      </div>
    </div>
  );

  return (
    <div
      data-haptic
      onClick={isGrid ? onOpen : undefined}
      onDoubleClick={(e) => {
        e.preventDefault();
        onOpen();
      }}
      className={cn(
        "group select-none",
        isGrid ? "h-full cursor-pointer" : "cursor-pointer"
      )}
    >
      {isGrid ? gridContent : listContent}
    </div>
  );
}

export default memo(FileCardComponent);

