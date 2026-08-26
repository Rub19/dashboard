"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { formatBytes, mimeIcon } from "@/lib/files";
import { useI18n } from "@/lib/hooks/useI18n";
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
  onShare: () => void;
  onRename: () => void;
  onMove: () => void;
  onFavorite: () => void;
  onTrash: () => void;
  onDelete: () => void;
  onRestore: () => void;
};

export default function FileCard({
  file,
  viewMode = "list",
  selected,
  trashed,
  clientId,
  onToggle,
  onOpen,
  onDownload,
  onShare,
  onRename,
  onMove,
  onFavorite,
  onTrash,
  onDelete,
  onRestore,
}: FileCardProps) {
  const i18n = useI18n();
  const isGrid = viewMode === "grid";

  const icon = (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--panel-bg)] text-[var(--text-muted)] transition-colors",
        isGrid ? "h-14 w-14" : "h-10 w-10",
      )}
    >
      <Icon
        name={mimeIcon(file.mimeType, file.isFolder)}
        className={cn(
          "transition-transform",
          isGrid ? "h-7 w-7" : "h-5 w-5",
        )}
      />
    </span>
  );

  const actions = (
    <div
      className={cn(
        "flex items-center gap-1",
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

      <button
        type="button"
        aria-label={i18n("share")}
        data-tooltip={i18n("share")}
        data-haptic
        onClick={(e) => { e.stopPropagation(); onShare(); }}
        className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)]"
      >
        <Icon name="share-2" className="h-4 w-4" />
      </button>

      <button
        type="button"
        aria-label={i18n("rename")}
        data-tooltip={i18n("rename")}
        data-haptic
        onClick={(e) => { e.stopPropagation(); onRename(); }}
        className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)]"
      >
        <Icon name="pencil" className="h-4 w-4" />
      </button>

      <button
        type="button"
        aria-label={i18n("move")}
        data-tooltip={i18n("move")}
        data-haptic
        onClick={(e) => { e.stopPropagation(); onMove(); }}
        className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)]"
      >
        <Icon name="folder-input" className="h-4 w-4" />
      </button>

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
      className={cn(
        "v8-card h-full min-w-0 overflow-hidden rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)] p-[var(--panel-padding)] shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-[var(--accent-primary)]/30 hover:shadow-md",
      )}
    >
      <div
        className={cn(
          "flex h-full min-w-0 transition-colors",
          isGrid ? "flex-col items-center justify-between p-1 text-center" : "flex-col items-start gap-3 sm:flex-row sm:items-center",
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
          data-haptic
          className={cn(
            "flex min-w-0 text-left focus:outline-none",
            isGrid ? "w-full flex-col items-center gap-2" : "flex-1 items-center gap-3",
          )}
        >
          {icon}
          <div className="min-w-0 flex-1">
            <p className={cn("font-medium", isGrid ? "line-clamp-2 text-sm" : "truncate")} title={file.name}>
              {file.name}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {file.isFolder ? i18n("folder") : `${formatBytes(file.size)} · ${file.mimeType || "-"}`}
            </p>
          </div>
        </button>

        {actions}
      </div>
    </div>
  );
}
