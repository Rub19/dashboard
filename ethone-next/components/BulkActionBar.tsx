"use client";

import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";

export default function BulkActionBar({
  count,
  onDone,
  onUndone,
  onDelete,
  onFavorite,
  onClear,
  children,
}: {
  count: number;
  onDone?: () => void;
  onUndone?: () => void;
  onDelete?: () => void;
  onFavorite?: () => void;
  onClear: () => void;
  children?: React.ReactNode;
}) {
  const i18n = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--panel-radius)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-lg">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
          {count}
        </span>
        <span>{i18n(count === 1 ? "oneSelected" : "manySelected")}</span>
      </div>
      <div className="flex items-center gap-2">
        {onDone && (
          <button type="button" onClick={onDone} className="flex items-center gap-1.5 rounded-[var(--panel-radius)] bg-[var(--surface)] px-3 py-1.5 text-xs hover:bg-[var(--accent)]/10">
            <Icon name="circle-check" className="h-3.5 w-3.5" /> {i18n("markDone")}
          </button>
        )}
        {onUndone && (
          <button type="button" onClick={onUndone} className="flex items-center gap-1.5 rounded-[var(--panel-radius)] bg-[var(--surface)] px-3 py-1.5 text-xs hover:bg-[var(--accent)]/10">
            <Icon name="circle" className="h-3.5 w-3.5" /> {i18n("markUndone")}
          </button>
        )}
        {onFavorite && (
          <button type="button" onClick={onFavorite} className="flex items-center gap-1.5 rounded-[var(--panel-radius)] bg-[var(--surface)] px-3 py-1.5 text-xs hover:bg-[var(--accent)]/10">
            <Icon name="heart" className="h-3.5 w-3.5" /> {i18n("favorite")}
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={onDelete} className="flex items-center gap-1.5 rounded-[var(--panel-radius)] bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20">
            <Icon name="trash-2" className="h-3.5 w-3.5" /> {i18n("delete")}
          </button>
        )}
        {children}
        <button type="button" onClick={onClear} className="rounded-[var(--panel-radius)] px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface)]">
          {i18n("cancel")}
        </button>
      </div>
    </div>
  );
}
