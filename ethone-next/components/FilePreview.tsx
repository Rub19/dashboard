"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { fetchWorker } from "@/lib/api";
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
  clientId?: string;
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
  clientId,
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !file || !clientId || file.isFolder) {
      setPreviewUrl(null);
      setText(null);
      return;
    }
    let cancelled = false;
    setText(null);
    fetchWorker(`/api/google-drive/download?clientId=${encodeURIComponent(clientId)}&fileId=${encodeURIComponent(file.driveFileId)}`)
      .then((res) => {
        if (cancelled) return;
        const url = res?.data?.url || (typeof res?.data === "string" ? res.data : null);
        setPreviewUrl(url || null);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      });
    return () => { cancelled = true; };
  }, [open, file, clientId]);

  useEffect(() => {
    if (!open || !previewUrl || !file || file.isFolder) return;
    const mime = file.mimeType || "";
    const isTextType =
      mime.startsWith("text/") ||
      mime.includes("json") ||
      mime.includes("javascript") ||
      mime.includes("xml") ||
      mime.includes("csv") ||
      mime.includes("markdown") ||
      mime.includes("typescript");
    if (!isTextType) {
      setText(null);
      return;
    }
    let cancelled = false;
    setTextLoading(true);
    fetch(previewUrl)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) setText(t.length > 8000 ? `${t.slice(0, 8000)}…` : t);
      })
      .catch(() => {
        if (!cancelled) setText(null);
      })
      .finally(() => {
        if (!cancelled) setTextLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, previewUrl, file]);

  if (!file) return null;

  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");
  const isAudio = file.mimeType.startsWith("audio/");
  const isPDF = file.mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isText =
    file.mimeType.startsWith("text/") ||
    file.mimeType.includes("json") ||
    file.mimeType.includes("javascript") ||
    file.mimeType.includes("xml") ||
    file.mimeType.includes("csv") ||
    file.mimeType.includes("markdown") ||
    file.mimeType.includes("typescript");
  const icon = mimeIcon(file.mimeType, file.isFolder);

  const renderMedia = () => {
    if (isImage && (previewUrl || file.thumbnailLink)) {
      return (
        <SafeImage
          candidates={[previewUrl, file.thumbnailLink, file.webViewLink, file.iconUrl].filter(Boolean) as string[]}
          alt={file.name}
          size={512}
          className="h-full w-full object-contain"
          iconClassName="h-12 w-12 text-[var(--accent-primary)]"
          loading="eager"
        />
      );
    }
    if (isVideo && previewUrl) {
      return <video src={previewUrl} controls className="h-full w-full rounded-2xl bg-black" aria-label={file.name} />;
    }
    if (isAudio && previewUrl) {
      return <audio src={previewUrl} controls className="w-full" aria-label={file.name} />;
    }
    if (isPDF && previewUrl) {
      return <iframe src={previewUrl} title={file.name} className="h-full w-full rounded-2xl border-0 bg-[var(--bg-main)]" allow="autoplay" />;
    }
    if (isText && (text || textLoading)) {
      if (textLoading) {
        return (
          <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
            <Icon name="loader-2" className="h-6 w-6 animate-spin" />
          </div>
        );
      }
      return (
        <pre className="h-full w-full overflow-auto rounded-2xl bg-[var(--bg-main)] p-4 text-left font-mono text-[11px] text-[var(--text-primary)]">
          {text}
        </pre>
      );
    }
    if (file.webViewLink) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
          <Icon name={icon} className="h-14 w-14" />
          <Button size="sm" variant="secondary" onClick={() => window.open(file.webViewLink, "_blank")} leftIcon={<Icon name="external-link" className="h-4 w-4" />}>
            {i18n("openInDrive", "Ouvrir dans Drive")}
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
        <Icon name={icon} className="h-14 w-14" />
        <span className="text-[10px] uppercase tracking-wider">{file.mimeType || "-"}</span>
      </div>
    );
  };

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
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 320, damping: 28 }}
            className="fixed right-0 top-0 z-[var(--z-modal)] h-full w-full border-l border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)] shadow-2xl shadow-black/20 backdrop-blur-2xl sm:w-[480px]"
            role="dialog"
            aria-modal="true"
            aria-label={i18n("filePreview", "Aperçu")}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)]/[0.12] px-4 py-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold" title={file.name}>{file.name}</h2>
                  <p className="text-[11px] text-[var(--text-muted)]">{formatBytes(file.size)} · {file.mimeType || "-"}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={onClose} leftIcon={<X className="h-4 w-4" />} aria-label={i18n("close")}>
                  {i18n("close")}
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto os-scroll p-4">
                <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--bg-main)] sm:h-72">
                  {renderMedia()}
                </div>

                <div className="mt-4 space-y-3 rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.4] p-4 text-sm">
                  {[
                    { label: i18n("type", "Type"), value: file.isFolder ? i18n("folder") : file.mimeType || "-" },
                    { label: i18n("size", "Taille"), value: formatBytes(file.size) },
                    { label: i18n("modified", "Modifié"), value: formatDate(file.updatedAt) },
                    { label: i18n("created", "Créé"), value: formatDate(file.createdAt) },
                    ...(location ? [{ label: i18n("location", "Emplacement"), value: location }] : []),
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between gap-3">
                      <span className="text-[var(--text-muted)]">{row.label}</span>
                      <span className="truncate text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="shrink-0 border-t border-[var(--panel-border)]/[0.12] p-4">
                <div className="grid grid-cols-2 gap-2">
                  {!file.isFolder && (
                    <Button size="sm" variant="secondary" onClick={onDownload} leftIcon={<Icon name="download" className="h-4 w-4" />}>
                      {i18n("download")}
                    </Button>
                  )}
                  {file.webViewLink && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigator.clipboard.writeText(file.webViewLink || "").catch(() => {})}
                      leftIcon={<Icon name="link" className="h-4 w-4" />}
                    >
                      {i18n("copyLink", "Copier le lien")}
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
                  <Button size="sm" variant="ghost" onClick={onFavorite} leftIcon={<Icon name={file.isFavorite ? "heart" : "heart-off"} className="h-4 w-4" />}>
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
