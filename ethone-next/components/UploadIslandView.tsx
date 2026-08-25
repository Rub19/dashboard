"use client";

import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useUploadQueue } from "@/lib/upload-queue";
import { cn } from "@/lib/utils";

function statusIcon(status: string) {
  switch (status) {
    case "uploading":
      return "spinner";
    case "completed":
      return "check";
    case "error":
      return "warning";
    default:
      return "hourglass";
  }
}

export default function UploadIslandView() {
  const i18n = useI18n();
  const { items, remove, retry, clearCompleted } = useUploadQueue();
  const uploading = items.filter((it) => it.status === "uploading" || it.status === "queued").length;
  const completed = items.filter((it) => it.status === "completed").length;
  const errors = items.filter((it) => it.status === "error").length;

  if (items.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-raised)]">
          <Icon name="upload-cloud" pack="phosphor" className="h-6 w-6 text-[var(--info)]" />
        </div>
        <p className="text-sm text-[var(--text-muted)]">{i18n("noUploads", "Aucun fichier en attente")}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between text-[var(--text-primary)]">
        <span className="text-sm font-medium">
          {uploading > 0
            ? `${uploading} ${i18n("uploadingFiles", "en cours")}`
            : `${completed} ${i18n("completedFiles", "terminé")}`}
        </span>
        {completed > 0 && (
          <button
            type="button"
            onClick={clearCompleted}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            {i18n("clearCompleted", "Effacer")}
          </button>
        )}
      </div>
      <div className="max-h-[180px] w-full space-y-2 overflow-y-auto pr-1">
        {items.map((it) => (
          <div
            key={it.id}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2",
              it.status === "error" && "border-red-400/30"
            )}
          >
            <Icon name={statusIcon(it.status)} pack="phosphor" className={cn("h-4 w-4 shrink-0", it.status === "uploading" && "animate-spin text-[var(--info)]", it.status === "completed" && "text-[var(--success)]", it.status === "error" && "text-red-400")} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--text-primary)]" title={it.file.name}>{it.file.name}</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {it.status === "error" ? it.error : `${Math.round(it.progress)}%`}
              </p>
            </div>
            {it.status === "error" && (
              <button type="button" onClick={() => retry(it.id)} className="shrink-0 rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)]" aria-label={i18n("retry", "Réessayer")}>
                <Icon name="arrow-clockwise" pack="phosphor" className="h-4 w-4" />
              </button>
            )}
            {it.status === "completed" && (
              <button type="button" onClick={() => remove(it.id)} className="shrink-0 rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)]" aria-label={i18n("remove", "Supprimer")}>
                <Icon name="x" pack="phosphor" className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {errors > 0 && (
        <p className="text-[10px] text-red-400">{errors} {i18n("uploadErrors", "erreur(s)")}</p>
      )}
    </div>
  );
}
