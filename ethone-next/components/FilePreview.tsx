"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, ExternalLink, Download, Share2, Pencil, FolderInput, Heart, RotateCcw, Trash2, Trash, Copy, Brain, FileCode, Tag } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { fetchWorker } from "@/lib/api";
import { Icon } from "@/lib/icons";
import Button from "@/components/ui/Button";
import SafeImage from "@/components/SafeImage";
import { formatBytes, mimeIcon, getFileExtension, getFileCategory } from "@/lib/files";
import { cn } from "@/lib/utils";
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
  const [copiedLink, setCopiedLink] = useState(false);

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
    const category = getFileCategory(file);
    const mime = (file.mimeType || "").toLowerCase();
    const ext = getFileExtension(file.name);
    const isTextType =
      category === "code" ||
      mime.startsWith("text/") ||
      ["txt", "md", "json", "js", "ts", "html", "css", "py", "sh", "sql", "csv", "yml", "yaml", "xml"].includes(ext);

    if (!isTextType) {
      setText(null);
      return;
    }
    let cancelled = false;
    setTextLoading(true);
    fetch(previewUrl)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) setText(t.length > 20000 ? `${t.slice(0, 20000)}\n\n/* ... Fichier volumineux tronqué pour l'aperçu */` : t);
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

  const ext = getFileExtension(file.name);
  const category = getFileCategory(file);
  const isImage = file.mimeType?.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "avif"].includes(ext);
  const isVideo = file.mimeType?.startsWith("video/") || ["mp4", "webm", "mkv", "mov"].includes(ext);
  const isAudio = file.mimeType?.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "m4a"].includes(ext);
  const isPDF = file.mimeType === "application/pdf" || ext === "pdf";
  const isCodeOrText =
    category === "code" ||
    file.mimeType?.startsWith("text/") ||
    ["txt", "md", "json", "js", "ts", "html", "css", "py", "sh", "sql", "csv", "yml", "yaml", "xml"].includes(ext);
  const icon = mimeIcon(file.mimeType, file.isFolder, file.name);

  function copyWebLink() {
    if (!file?.webViewLink) return;
    navigator.clipboard.writeText(file.webViewLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(() => {});
  }

  const renderMedia = () => {
    if (isImage && (previewUrl || file.thumbnailLink)) {
      return (
        <div className="relative flex h-full w-full items-center justify-center p-3">
          <SafeImage
            candidates={[previewUrl, file.thumbnailLink, file.webViewLink, file.iconUrl].filter(Boolean) as string[]}
            alt={file.name}
            size={800}
            className="h-full w-full max-h-[320px] object-contain rounded-xl"
            iconClassName="h-14 w-14 text-[var(--accent-primary)]"
            loading="eager"
          />
        </div>
      );
    }
    if (isVideo && previewUrl) {
      return (
        <div className="flex h-full w-full items-center justify-center p-2">
          <video
            src={previewUrl}
            controls
            playsInline
            className="max-h-[320px] w-full rounded-xl bg-black/90 shadow-md"
            aria-label={file.name}
          />
        </div>
      );
    }
    if (isAudio && previewUrl) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shadow-md">
            <Icon name="music" className="h-8 w-8" />
          </div>
          <p className="text-xs font-semibold text-[var(--text-primary)]">{file.name}</p>
          <audio src={previewUrl} controls className="w-full max-w-sm rounded-lg" aria-label={file.name} />
        </div>
      );
    }
    if (isPDF && previewUrl) {
      return (
        <div className="h-full w-full p-2">
          <iframe
            src={previewUrl}
            title={file.name}
            className="h-full min-h-[320px] w-full rounded-xl border border-[var(--panel-border)]/[0.12] bg-[var(--bg-main)]"
            allow="autoplay"
          />
        </div>
      );
    }
    if (isCodeOrText && (text || textLoading)) {
      if (textLoading) {
        return (
          <div className="flex h-full min-h-[220px] items-center justify-center text-[var(--text-muted)]">
            <Icon name="loader-2" className="h-6 w-6 animate-spin text-[var(--accent-primary)]" />
          </div>
        );
      }
      return (
        <div className="h-full w-full p-2">
          <pre className="max-h-[320px] w-full overflow-auto rounded-xl border border-[var(--panel-border)]/[0.12] bg-[var(--bg-main)]/[0.9] p-3 text-left font-mono text-[11px] leading-relaxed text-[var(--text-primary)] os-scroll selection:bg-[var(--accent-primary)]/20">
            {text}
          </pre>
        </div>
      );
    }
    if (file.webViewLink) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-[var(--text-muted)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--panel-border)]/[0.15] bg-[var(--panel-bg)]">
            <Icon name={icon} className="h-8 w-8 text-[var(--accent-primary)]" />
          </div>
          <span className="text-xs font-medium text-[var(--text-primary)]">{file.name}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.open(file.webViewLink, "_blank")}
            leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
          >
            {i18n("openInDrive", "Ouvrir dans Google Drive")}
          </Button>
        </div>
      );
    }
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-[var(--text-muted)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--panel-border)]/[0.15] bg-[var(--panel-bg)]">
          <Icon name={icon} className="h-8 w-8" />
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-[var(--text-primary)]">{file.name}</p>
          <span className="mt-1 inline-block rounded-md border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)] px-2 py-0.5 text-[9px] font-mono uppercase text-[var(--text-muted)]">
            {ext || file.mimeType || "Fichier"}
          </span>
        </div>
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
            className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-[var(--background)]/50 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 320, damping: 30 }}
            className="fixed right-0 top-0 z-[var(--z-modal)] flex h-full w-full flex-col border-l border-[var(--panel-border)]/[0.15] bg-[var(--panel-bg)]/[0.95] shadow-2xl shadow-black/40 backdrop-blur-3xl sm:w-[500px]"
            role="dialog"
            aria-modal="true"
            aria-label={i18n("filePreview", "Aperçu du fichier")}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)]/[0.12] px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)] uppercase">
                    {ext || (file.isFolder ? "Dossier" : "Fichier")}
                  </span>
                  <h2 className="truncate text-sm font-semibold tracking-tight text-[var(--text-primary)]" title={file.name}>
                    {file.name}
                  </h2>
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {formatBytes(file.size)} • {file.mimeType || "application/octet-stream"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.5] text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
                aria-label={i18n("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="min-h-0 flex-1 overflow-y-auto os-scroll space-y-4 p-5">
              {/* Media viewer box */}
              <div className="relative min-h-[200px] w-full overflow-hidden rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--bg-main)]/[0.6] shadow-inner">
                {renderMedia()}
              </div>

              {/* Brain Summary section if present */}
              {file.brainSummary && (
                <div className="rounded-2xl border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/[0.06] p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-primary)]">
                    <Brain className="h-4 w-4" />
                    <span>Résumé ETHONE Brain</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-primary)]">
                    {file.brainSummary}
                  </p>
                </div>
              )}

              {/* Tags section if present */}
              {file.tags && file.tags.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    <Tag className="h-3 w-3" />
                    <span>Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {file.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg border border-[var(--panel-border)]/[0.15] bg-[var(--panel-bg)] px-2 py-0.5 text-[11px] text-[var(--text-primary)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata Details Table */}
              <div className="space-y-2.5 rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.3] p-4 text-xs">
                <h3 className="font-semibold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">
                  Informations
                </h3>
                <div className="space-y-2 pt-1 divide-y divide-[var(--panel-border)]/[0.06]">
                  {[
                    { label: i18n("type", "Type"), value: file.isFolder ? i18n("folder") : file.mimeType || "—" },
                    { label: i18n("size", "Taille"), value: formatBytes(file.size) },
                    { label: i18n("modified", "Modifié le"), value: formatDate(file.updatedAt) },
                    { label: i18n("created", "Créé le"), value: formatDate(file.createdAt) },
                    ...(location ? [{ label: i18n("location", "Emplacement"), value: location }] : []),
                    ...(file.driveFileId ? [{ label: "Identifiant Cloud", value: file.driveFileId }] : []),
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3 pt-2 first:pt-0">
                      <span className="text-[var(--text-muted)]">{row.label}</span>
                      <span className="truncate text-right font-medium text-[var(--text-primary)]" title={String(row.value)}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="shrink-0 border-t border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.7] p-4 backdrop-blur-md">
              <div className="grid grid-cols-2 gap-2">
                {!file.isFolder && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onDownload}
                    leftIcon={<Download className="h-3.5 w-3.5" />}
                  >
                    {i18n("download", "Télécharger")}
                  </Button>
                )}
                {file.webViewLink && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={copyWebLink}
                    leftIcon={<Copy className="h-3.5 w-3.5" />}
                  >
                    {copiedLink ? i18n("copied", "Copié !") : i18n("copyLink", "Copier lien")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onShare}
                  leftIcon={<Share2 className="h-3.5 w-3.5" />}
                >
                  {i18n("share", "Partager")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onFavorite}
                  leftIcon={<Heart className={cn("h-3.5 w-3.5", file.isFavorite && "fill-current text-[var(--danger)]")} />}
                >
                  {file.isFavorite ? i18n("removeFromFavorites", "Favori") : i18n("addToFavorites", "Ajouter favori")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onRename}
                  leftIcon={<Pencil className="h-3.5 w-3.5" />}
                >
                  {i18n("rename", "Renommer")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onMove}
                  leftIcon={<FolderInput className="h-3.5 w-3.5" />}
                >
                  {i18n("move", "Déplacer")}
                </Button>
                {trashed ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onRestore}
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    >
                      {i18n("restore", "Restaurer")}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={onDelete}
                      leftIcon={<Trash className="h-3.5 w-3.5" />}
                    >
                      {i18n("delete", "Supprimer")}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onTrash}
                    leftIcon={<Trash2 className="h-3.5 w-3.5 text-[var(--danger)]" />}
                    className="text-[var(--danger)] hover:bg-[var(--danger)]/10"
                  >
                    {i18n("trash", "Mettre à la corbeille")}
                  </Button>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

