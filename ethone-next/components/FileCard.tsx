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
    return new Date(raw).toLocaleDateString(undefined, { day: "numeric", month: "short" });
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

  const imageFallback = (
    <div className="flex h-full w-full items-center justify-center rounded-[var(--panel-radius)] bg-[var(--panel-bg)] text-[var(--text-muted)]">
      <Icon name={iconName} className={cn("transition-transform", isGrid ? "h-9 w-9" : "h-5 w-5")} />
    </div>
  );

  const iconPreview = (
    <div className={cn(
      "relative shrink-0 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]",
      isGrid ? "h-24 w-24" : "h-10 w-10",
    )}>
      {isGrid ? (
        <SafeImage
          candidates={[file.thumbnailLink, file.iconUrl]}
          alt={file.name}
          size={96}
          className="h-full w-full object-contain p-2"
          iconClassName="h-9 w-9 text-[var(--text-muted)]"
          loading="lazy"
          fallback="none"
        />
      ) : (
        <>
          {file.thumbnailLink || file.iconUrl ? (
            <SafeImage
              candidates={[file.thumbnailLink, file.iconUrl]}
              alt={file.name}
              size={40}
              className="h-full w-full object-contain p-1"
              iconClassName="h-5 w-5 text-[var(--text-muted)]"
              loading="lazy"
              fallback="none"
            />
          ) : imageFallback}
        </>
      )}
    </div>
  );

  const actions = (
    <div
      className={cn(
        "flex items-center gap-0.5",
        isGrid ? "w-full justify-center pt-2" : "justify-end",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label={file.isFavorite ? i18n("removeFromFavorites") : i18n("addToFavorites")}
        data-tooltip={file.isFavorite ? i18n("removeFromFavorites") : i18n("addToFavorites")}
        data-haptic
        onClick={(e) => { e.stopPropagation(); onFavorite(); }}
        className={cn(
          "rounded p-1.5 transition-colors hover:bg-[var(--panel-bg)]",
          file.isFavorite ? "text-[var(--danger)]" : "text-[var(--text-muted)]",
        )}
      >
        <Icon name={file.isFavorite ? "heart" : "heart-off"} className="h-4 w-4" />
      </button>

      {!file.isFolder && clientId && (
        <button
          type="button"
          aria-label={i18n("download")}
          data-tooltip={i18n("download")}
          data-haptic
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)]"
        >
          <Icon name="download" className="h-4 w-4" />
        </button>
      )}

      {trashed ? (
        <button
          type="button"
          aria-label={i18n("restore")}
          data-tooltip={i18n("restore")}
          data-haptic
          onClick={(e) => { e.stopPropagation(); onRestore(); }}
          className="rounded p-1.5 text-[var(--success)] transition-colors hover:bg-[var(--success)]/10"
        >
          <Icon name="rotate-ccw" className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          aria-label={i18n("trash")}
          data-tooltip={i18n("trash")}
          data-haptic
          onClick={(e) => { e.stopPropagation(); onTrash(); }}
          className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--danger)]"
        >
          <Icon name="trash-2" className="h-4 w-4" />
        </button>
      )}

      {trashed && (
        <button
          type="button"
          aria-label={i18n("delete")}
          data-tooltip={i18n("delete")}
          data-haptic
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="rounded p-1.5 text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10"
        >
          <Icon name="trash" className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div
      data-haptic
      className={cn(
        "group h-full min-w-0 overflow-hidden rounded-2xl border bg-[var(--panel-bg)] p-[var(--panel-padding)] shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-[var(--accent-primary)]/30 hover:shadow-md",
        selected
          ? "border-[var(--accent-primary)]/50 ring-1 ring-[var(--accent-primary)]/20"
          : "border-[var(--panel-border)]/[0.12]",
      )}
    >
      <div
        className={cn(
          "flex h-full min-w-0",
          isGrid ? "flex-col items-center justify-between text-center" : "flex-col items-start gap-3 sm:flex-row sm:items-center",
        )}
      >
        {!isGrid && (
          <Checkbox
            checked={selected ?? false}
            onCheckedChange={onToggle ?? (() => {})}
            aria-label={i18n("select")}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "flex min-w-0 text-left focus:outline-none",
            isGrid ? "w-full flex-col items-center gap-3" : "flex-1 items-center gap-3",
          )}
        >
          {iconPreview}
          <div className="min-w-0 flex-1">
            <p className={cn("font-medium text-[var(--text-primary)]", isGrid ? "line-clamp-2 text-sm" : "truncate")} title={file.name}>
              {file.name}
            </p>
            <p className="truncate text-[11px] text-[var(--text-muted)]">
              {file.isFolder
                ? i18n("folder")
                : `${formatBytes(file.size)} · ${formatDateShort(file.updatedAt)}`}
            </p>
          </div>
        </button>

        {actions}
      </div>
    </div>
  );
}
