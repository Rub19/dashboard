"use client";

import { useRouter } from "next/navigation";
import {
  X,
  Download,
  Share2,
  Pencil,
  FolderInput,
  Star,
  Trash2,
  RotateCcw,
  Sparkles,
  Brain,
  ExternalLink,
  HardDrive,
  Cloud,
  FileText,
  Clock,
  Calendar,
  Layers,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { formatBytes, getFileExtension, getFileCategory } from "@/lib/files";
import SafeImage from "@/components/SafeImage";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { CloudFile } from "@/lib/hooks/useCloudFiles";

export type FileInspectorProps = {
  file: CloudFile | null;
  onClose: () => void;
  clientId?: string;
  onDownload: (file: CloudFile) => void;
  onShare: (file: CloudFile) => void;
  onRename: (file: CloudFile) => void;
  onMove: (file: CloudFile) => void;
  onFavorite: (file: CloudFile) => void;
  onTrash: (file: CloudFile) => void;
  onDelete: (file: CloudFile) => void;
  onRestore: (file: CloudFile) => void;
};

export default function FileInspector({
  file,
  onClose,
  clientId,
  onDownload,
  onShare,
  onRename,
  onMove,
  onFavorite,
  onTrash,
  onDelete,
  onRestore,
}: FileInspectorProps) {
  const router = useRouter();

  if (!file) return null;

  const isGoogleDrive = !!file.driveFileId && !!clientId;
  const ext = getFileExtension(file.name);
  const category = getFileCategory(file);
  const isImage = category === "images";

  function askBrain(prompt: string) {
    router.push(`/brain/?q=${encodeURIComponent(prompt)}`);
  }

  return (
    <div className="flex h-full w-full flex-col border-l border-[var(--panel-border)]/70 bg-[var(--panel-bg)]/95 backdrop-blur-xl p-4 overflow-y-auto os-scroll select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onFavorite(file)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl border transition-all cursor-pointer",
              file.isFavorite
                ? "border-[var(--warning)]/40 bg-[var(--warning)]/15 text-[var(--warning)]"
                : "border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--warning)]"
            )}
            title={file.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Star className={cn("h-4 w-4", file.isFavorite && "fill-[var(--warning)]")} />
          </button>

          <span
            className={cn(
              "flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium",
              isGoogleDrive
                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                : "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/25"
            )}
          >
            {isGoogleDrive ? <Cloud className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />}
            {isGoogleDrive ? "Google Drive" : "ETHONE Cloud"}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title="Fermer l'inspecteur"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Preview Box */}
      <div className="mt-4 flex flex-col items-center">
        <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/50 p-2 shadow-inner">
          {isImage && (file.thumbnailLink || file.webViewLink) ? (
            <SafeImage
              candidates={[file.thumbnailLink, file.webViewLink, file.iconUrl].filter(Boolean) as string[]}
              alt={file.name}
              size={400}
              className="h-full w-full object-contain rounded-xl"
              iconClassName="h-10 w-10 text-[var(--accent-primary)]"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 shadow-md">
                <FileText className="h-7 w-7" />
              </div>
              <span className="rounded-md border border-[var(--panel-border)] bg-[var(--surface-2)]/50 px-2 py-0.5 text-[10px] uppercase font-medium text-[var(--text-muted)]">
                {ext || "Fichier"}
              </span>
            </div>
          )}
        </div>

        <h3 className="mt-3 text-center text-xs font-bold text-[var(--text-primary)] break-words px-2 max-w-full">
          {file.name}
        </h3>
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
          {file.isFolder ? "Dossier" : formatBytes(file.size)}
        </p>
      </div>

      {/* Brain AI Intelligence Actions */}
      <div className="mt-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-2)]/40 p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
          <Brain className="h-4 w-4 text-[var(--accent-primary)]" />
          <span>ETHONE Brain</span>
        </div>
        <p className="mt-1 text-[11px] text-[var(--text-muted)] leading-relaxed">
          Analysez ou résumez instantanément ce document avec l'IA.
        </p>

        <div className="mt-2.5 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => askBrain(`Résume en 3 points essentiels le document "${file.name}".`)}
            className="flex items-center justify-between rounded-xl bg-[var(--accent-primary)] px-2.5 py-1.5 text-xs font-medium text-[var(--accent-contrast)] transition-[filter] hover:brightness-110 cursor-pointer"
          >
            <span>Résumer ce document</span>
            <Sparkles className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => askBrain(`Explique-moi les concepts clés contenus dans "${file.name}".`)}
            className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            <span>Poser une question à Brain</span>
            <ExternalLink className="h-3 w-3 text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {!file.isFolder && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onDownload(file)}
            leftIcon={<Download className="h-3.5 w-3.5" />}
            className="flex-1 text-xs"
          >
            Télécharger
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onRename(file)}
          leftIcon={<Pencil className="h-3.5 w-3.5" />}
          className="flex-1 text-xs"
        >
          Renommer
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onMove(file)}
          leftIcon={<FolderInput className="h-3.5 w-3.5" />}
          className="flex-1 text-xs"
        >
          Déplacer
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onShare(file)}
          leftIcon={<Share2 className="h-3.5 w-3.5" />}
          className="flex-1 text-xs"
        >
          Partager
        </Button>
      </div>

      {/* Detailed Metadata Fields */}
      <div className="mt-5 space-y-2 border-t border-[var(--panel-border)]/60 pt-4 text-xs">
        <h4 className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider">
          Informations détaillées
        </h4>

        <div className="flex items-center justify-between py-1 border-b border-[var(--panel-border)] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Type MIME
          </span>
          <span className="font-mono text-[11px] text-[var(--text-primary)] truncate max-w-[160px]">
            {file.mimeType || "Inconnu"}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-[var(--panel-border)] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Modifié le
          </span>
          <span className="text-[11px] text-[var(--text-primary)]">
            {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-[var(--panel-border)] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Ajouté le
          </span>
          <span className="text-[11px] text-[var(--text-primary)]">
            {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 text-[var(--text-muted)]">
          <span>Identifiant</span>
          <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">
            {file.driveFileId || file.id}
          </span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-auto pt-6">
        {file.trashed ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onRestore(file)}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              className="flex-1"
            >
              Restaurer
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => onDelete(file)}
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              className="flex-1"
            >
              Supprimer
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="danger"
            onClick={() => onTrash(file)}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            className="w-full text-xs"
          >
            Mettre à la corbeille
          </Button>
        )}
      </div>
    </div>
  );
}
