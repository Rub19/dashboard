"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import Button from "@/components/ui/Button";
import SafeImage from "@/components/SafeImage";
import { formatBytes, mimeIcon } from "@/lib/files";
import type { CloudFile } from "@/lib/hooks/useCloudFiles";

function formatDate(raw?: string) {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
}

export type FilePreviewProps = {
  open: boolean;
  onClose: () => void;
  file: CloudFile | null;
  location?: string;
  onDownload: () => void;
  onShare: () => void;
  onRename: () => void;
  onMove: () => void;
  onFavorite: () => void;
  onTrash: () => void;
  onDelete: () => void;
  onRestore: () => void;
  trashed?: boolean;
};

export default function FilePreview({
  open,
  onClose,
  file,
  location,
  onDownload,
  onShare,
  onRename,
  onMove,
  onFavorite,
  onTrash,
  onDelete,
  onRestore,
  trashed,
}: FilePreviewProps) {
  const i18n = useI18n();
  const reduce = useReducedMotion() ?? false;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!file) return null;

  const isImage = file.mimeType.startsWith("image/");
  const icon = mimeIcon(file.mimeType, file.isFolder);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-[var(--background)]/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={
              reduce
                ? { duration: 0.15 }
                : { type: "spring", stiffness: 320, damping: 28 }
            }
            className="fixed right-0 top-0 z-[var(--z-modal)] h-full w-full border-l border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)] shadow-2xl shadow-black/20 backdrop-blur-2xl sm:w-[420px]"
            role="dialog"
            aria-modal="true"
            aria-label={i18n("filePreview", "Aperçu")}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)]/[0.12] px-4 py-3">
                <span className="text-sm font-semibold">{i18n("filePreview")}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  leftIcon={<X className="h-4 w-4" />}
                  aria-label={i18n("close")}
                >
                  {i18n("close")}
                </Button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto os-scroll p-5">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--bg-main)]">
                    {isImage && file.thumbnailLink ? (
                      <SafeImage
                        candidates={[file.thumbnailLink, file.webViewLink, file.iconUrl]}
                        alt={file.name}
                        size={256}
                        className="h-full w-full object-contain"
                        iconClassName="h-12 w-12 text-[var(--accent-primary)]"
                        loading="eager"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                        <Icon name={icon} className="h-14 w-14" />
                        <span className="text-[10px] uppercase tracking-wider">{file.mimeType || "-"}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full text-center">
                    <h2 className="break-words text-base font-semibold" title={file.name}>
                      {file.name}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {formatBytes(file.size)} · {file.mimeType || "-"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.4] p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--text-muted)]">{i18n("type", "Type")}</span>
                    <span className="text-right">{file.isFolder ? i18n("folder") : file.mimeType || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--text-muted)]">{i18n("size", "Taille")}</span>
                    <span className="text-right">{formatBytes(file.size)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--text-muted)]">{i18n("modified", "Modifié")}</span>
                    <span className="text-right">{formatDate(file.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--text-muted)]">{i18n("created", "Créé")}</span>
                    <span className="text-right">{formatDate(file.createdAt)}</span>
                  </div>
                  {location && (
                    <div className="flex justify-between gap-3">
                      <span className="text-[var(--text-muted)]">{i18n("location", "Emplacement")}</span>
                      <span className="truncate text-right">{location}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {!file.isFolder && (
                    <Button size="sm" variant="secondary" onClick={onDownload} leftIcon={<Icon name="download" className="h-4 w-4" />}>
                      {i18n("download")}
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={onShare} leftIcon={<Icon name="share-2" className="h-4 w-4" />}>
                    {i18n("share")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onRename} leftIcon={<Icon name="pencil" className="h-4 w-4" />}>
                    {i18n("rename")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onMove} leftIcon={<Icon name="folder-input" className="h-4 w-4" />}>
                    {i18n("move")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onFavorite}
                    leftIcon={<Icon name={file.isFavorite ? "heart" : "heart-off"} className="h-4 w-4" />}
                  >
                    {file.isFavorite ? i18n("removeFromFavorites") : i18n("addToFavorites")}
                  </Button>
                  {trashed ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={onRestore} leftIcon={<Icon name="rotate-ccw" className="h-4 w-4" />}>
                        {i18n("restore")}
                      </Button>
                      <Button size="sm" variant="danger" onClick={onDelete} leftIcon={<Icon name="trash" className="h-4 w-4" />}>
                        {i18n("delete")}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={onTrash} leftIcon={<Icon name="trash-2" className="h-4 w-4" />}>
                      {i18n("trash")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
