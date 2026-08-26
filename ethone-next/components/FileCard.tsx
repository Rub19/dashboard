"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { formatBytes, mimeIcon } from "@/lib/files";
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
    return new Date(raw).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return raw;
  }
}

export default function FileCard({
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
  const iconName = mimeIcon(file.mimeType, file.isFolder);

  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");
  const isAudio = file.mimeType.startsWith("audio/");
  const isVisual = isImage || isVideo || isAudio;

  const actionIcon = (name: string, label: string, onClick: () => void, variant: "default" | "danger" = "default") => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={label}
      data-tooltip={label}
      className={cn(
        "rounded p-1.5 transition-colors hover:bg-[var(--panel-bg)]",
        variant === "danger" ? "text-[var(--danger)]" : "text-[var(--text-muted)]",
      )}
    >
      <Icon name={name} className="h-4 w-4" />
    </button>
  );

  const gridMedia = (
    <div
      className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-[var(--bg-main)] p-3"
      style={{ aspectRatio: "4/3" }}
    >
      {isVisual && (file.thumbnailLink || file.iconUrl) ? (
        <SafeImage
          candidates={[file.thumbnailLink, file.iconUrl]}
          alt={file.name}
          size={256}
          className="h-full w-full object-cover"
          iconClassName="h-8 w-8 text-[var(--accent-primary)]"
          loading="lazy"
          fallback="none"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
          <Icon name={iconName} className="h-12 w-12" />
          <span className="text-[9px] uppercase tracking-wider opacity-60">{file.mimeType || "—"}</span>
        </div>
      )}
      {file.isFavorite && (
        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--panel-bg)]/80 backdrop-blur-sm">
          <Icon name="heart" className="h-3.5 w-3.5 text-[var(--danger)]" />
        </div>
      )}
    </div>
  );

  const gridContent = (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)] shadow-sm transition-all duration-150 hover:border-[var(--accent-primary)]/30 hover:shadow-md">
      {gridMedia}
      <div className="flex flex-1 flex-col justify-between p-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium text-[var(--text-primary)]" title={file.name}>
            {file.name}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {file.isFolder
              ? i18n("folder")
              : `${formatBytes(file.size)} · ${formatDateShort(file.updatedAt)}`}
          </p>
        </div>
        <div className="mt-2 flex items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          {actionIcon(file.isFavorite ? "heart" : "heart-off", file.isFavorite ? i18n("removeFromFavorites") : i18n("addToFavorites"), onFavorite)}
          {!file.isFolder && clientId && actionIcon("download", i18n("download"), onDownload)}
          {trashed
            ? actionIcon("rotate-ccw", i18n("restore"), onRestore)
            : actionIcon("trash-2", i18n("trash"), onTrash)}
          {trashed && actionIcon("trash", i18n("delete"), onDelete, "danger")}
        </div>
      </div>
    </div>
  );

  const listContent = (
    <>
      <Checkbox
        checked={selected ?? false}
        onCheckedChange={onToggle ?? (() => {})}
        aria-label={i18n("select")}
        onClick={(e) => e.stopPropagation()}
      />
      <button type="button" onClick={onOpen} className="focus:outline-none">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--bg-main)] text-[var(--text-muted)]">
          <SafeImage
            candidates={[file.thumbnailLink, file.iconUrl]}
            alt={file.name}
            size={40}
            className="h-full w-full object-contain p-1"
            iconClassName="h-5 w-5"
            loading="lazy"
            fallback="none"
          />
        </div>
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left focus:outline-none">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]" title={file.name}>
          {file.name}
        </p>
        <p className="truncate text-[11px] text-[var(--text-muted)] sm:hidden">
          {file.isFolder ? i18n("folder") : `${formatBytes(file.size)} · ${formatDateShort(file.updatedAt)}`}
        </p>
      </button>
      {!file.isFolder ? (
        <>
          <span className="hidden truncate text-right text-xs text-[var(--text-muted)] sm:block">{formatBytes(file.size)}</span>
          <span className="hidden truncate text-right text-xs text-[var(--text-muted)] sm:block">{formatDateShort(file.updatedAt)}</span>
        </>
      ) : (
        <>
          <span className="hidden text-right text-xs text-[var(--text-muted)] sm:block">—</span>
          <span className="hidden text-right text-xs text-[var(--text-muted)] sm:block">—</span>
        </>
      )}
      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-0.5">
        {actionIcon(file.isFavorite ? "heart" : "heart-off", file.isFavorite ? i18n("removeFromFavorites") : i18n("addToFavorites"), onFavorite)}
        {!file.isFolder && clientId && actionIcon("download", i18n("download"), onDownload)}
        {trashed
          ? actionIcon("rotate-ccw", i18n("restore"), onRestore)
          : actionIcon("trash-2", i18n("trash"), onTrash)}
        {trashed && actionIcon("trash", i18n("delete"), onDelete, "danger")}
      </div>
    </>
  );

  return (
    <div
      data-haptic
      onClick={isGrid ? onOpen : undefined}
      className={cn(
        "group select-none transition-[border-color,box-shadow,background-color] duration-150",
        isGrid
          ? "h-full cursor-pointer"
          : "grid cursor-pointer grid-cols-[1.5rem_2.5rem_minmax(0,1fr)_4rem] items-center gap-3 rounded-xl border-b border-[var(--panel-border)]/[0.08] px-3 py-2.5 last:border-b-0 hover:bg-[var(--panel-bg)]/[0.4] sm:grid-cols-[1.5rem_2.5rem_minmax(0,1fr)_6rem_6rem_7rem]",
        selected && "bg-[var(--accent-primary)]/5 hover:bg-[var(--accent-primary)]/10",
      )}
    >
      {isGrid ? gridContent : listContent}
    </div>
  );
}
