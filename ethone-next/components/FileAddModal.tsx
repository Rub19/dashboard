"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/Input";
import FileUploader from "@/components/FileUploader";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { cn } from "@/lib/utils";
import { UploadCloud, Link as LinkIcon, FolderPlus, Cloud, Check, ExternalLink, Globe } from "lucide-react";

export type TabId = "upload" | "link" | "drive" | "folder";

export type FileAddModalProps = {
  open: boolean;
  onClose: () => void;
  clientId?: string;
  parentId?: string | null;
  onUploadComplete: () => void;
  onCreateFolder: (name: string) => Promise<void> | void;
  onConnectDrive: () => void;
  loading?: boolean;
  initialFiles?: File[];
  initialTab?: TabId;
};

function normalizeLink(url: string) {
  const v = url.trim();
  if (!v) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v) || v.startsWith("//")) return v;
  if (!v.includes(".") && !v.includes("localhost")) return v;
  return `https://${v}`;
}

export default function FileAddModal({
  open,
  onClose,
  clientId,
  parentId,
  onUploadComplete,
  onCreateFolder,
  onConnectDrive,
  loading,
  initialFiles,
  initialTab = "upload",
}: FileAddModalProps) {
  const i18n = useI18n();
  const [tab, setTab] = useState<TabId>(initialFiles?.length ? "upload" : initialTab);
  const [folderName, setFolderName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!folderName.trim()) return;
    setBusy(true);
    try {
      await onCreateFolder(folderName.trim());
      setFolderName("");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeLink(linkUrl);
    if (!normalized) return;
    setBusy(true);
    try {
      await navigator.clipboard.writeText(normalized).catch(() => {});
      setLinkUrl("");
      setLinkTitle("");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const actions: { id: TabId; label: string; desc: string; icon: React.ReactNode }[] = [
    { id: "upload", label: i18n("importFile", "Téléverser"), desc: i18n("importFileDesc", "Depuis l'appareil"), icon: <UploadCloud className="h-5 w-5" /> },
    { id: "link", label: i18n("addLink", "Lien / URL"), desc: i18n("addLinkDesc", "Doc externe, web"), icon: <LinkIcon className="h-5 w-5" /> },
    { id: "folder", label: i18n("createFolder", "Nouveau dossier"), desc: i18n("createFolderDesc", "Organiser l'espace"), icon: <FolderPlus className="h-5 w-5" /> },
    { id: "drive", label: i18n("drive", "Google Drive"), desc: i18n("driveDesc", clientId ? "Connecté" : "Non relié"), icon: <Cloud className="h-5 w-5" /> },
  ];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={i18n("add", "Ajouter un élément")}
      size="md"
      hideFooter
      contentClassName="p-0"
    >
      <div className="p-5">
        {/* Modern Tab Selector Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setTab(a.id)}
              className={cn(
                "group relative flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 text-center transition-all duration-150 active:scale-98",
                tab === a.id
                  ? "border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/[0.1] text-[var(--accent-primary)] shadow-[0_0_20px_var(--glow-color)]"
                  : "border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.3] text-[var(--text-muted)] hover:border-[var(--panel-border)]/[0.25] hover:bg-[var(--panel-bg)]/[0.6] hover:text-[var(--text-primary)]"
              )}
            >
              <div className={cn("transition-transform group-hover:scale-110", tab === a.id && "text-[var(--accent-primary)]")}>
                {a.icon}
              </div>
              <span className="text-xs font-semibold">{a.label}</span>
              <span className="text-[10px] opacity-70">{a.desc}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Box */}
        <div className="mt-4 min-h-[220px] rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.2] p-5">
          {tab === "upload" && (
            <div className="space-y-4">
              {!clientId ? (
                <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--panel-border)]/[0.15] bg-[var(--panel-bg)]/[0.5] text-[var(--accent-primary)]">
                    <Cloud className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      {i18n("connectDriveToUpload", "Connexion Google Drive requise")}
                    </h4>
                    <p className="mt-1 max-w-xs text-xs text-[var(--text-muted)]">
                      Connectez votre compte pour téléverser, synchroniser et gérer vos fichiers dans ETHONE.
                    </p>
                  </div>
                  <Button size="sm" onClick={onConnectDrive} leftIcon={<Cloud className="h-4 w-4" />}>
                    {i18n("connectDrive", "Connecter Google Drive")}
                  </Button>
                </div>
              ) : (
                <FileUploader
                  clientId={clientId}
                  parentId={parentId}
                  initialFiles={initialFiles}
                  onAllComplete={() => {
                    onUploadComplete();
                    onClose();
                  }}
                />
              )}
            </div>
          )}

          {tab === "link" && (
            <form onSubmit={handleAddLink} className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  {i18n("addExternalLink", "Ajouter un lien ou document externe")}
                </h4>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Ajoutez un lien vers Figma, Notion, GitHub, Google Docs ou n&apos;importe quelle ressource web.
                </p>
              </div>
              <div className="space-y-2.5">
                <Input
                  autoFocus
                  type="text"
                  inputMode="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onBlur={() => setLinkUrl((v) => normalizeLink(v))}
                  placeholder="https://example.com/document..."
                  aria-label={i18n("url", "URL")}
                />
                <Input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Nom du raccourci (optionnel)"
                  aria-label="Nom"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onClose}>
                  {i18n("cancel", "Annuler")}
                </Button>
                <Button type="submit" disabled={!linkUrl.trim()} isLoading={busy}>
                  {i18n("save", "Ajouter")}
                </Button>
              </div>
            </form>
          )}

          {tab === "folder" && (
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  {i18n("createFolderTitle", "Créer un nouveau dossier")}
                </h4>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {parentId ? "Le dossier sera créé dans le sous-dossier actuel." : "Le dossier sera créé à la racine de vos fichiers."}
                </p>
              </div>
              <Input
                autoFocus
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Ex: Projets 2026, Factures, Documents..."
                aria-label={i18n("folderName", "Nom du dossier")}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onClose}>
                  {i18n("cancel", "Annuler")}
                </Button>
                <Button type="submit" disabled={!folderName.trim() || loading} isLoading={busy || loading}>
                  {i18n("create", "Créer le dossier")}
                </Button>
              </div>
            </form>
          )}

          {tab === "drive" && (
            <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
              <div className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl border transition-all",
                clientId
                  ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)] shadow-sm"
                  : "border-[var(--panel-border)]/[0.15] bg-[var(--panel-bg)]/[0.5] text-[var(--text-muted)]"
              )}>
                <Cloud className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  {clientId ? "Google Drive connecté" : "Google Drive non connecté"}
                </h4>
                <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
                  {clientId
                    ? "Votre espace est synchronisé avec votre compte Google Drive. Vos modifications s'enregistrent en temps réel."
                    : "Connectez votre compte Google Drive pour synchroniser automatiquement vos fichiers et dossiers."}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  onClick={clientId ? onClose : onConnectDrive}
                  leftIcon={clientId ? <Check className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                >
                  {clientId ? i18n("done", "Terminé") : i18n("connectDrive", "Connecter Google Drive")}
                </Button>
                {clientId && (
                  <Button
                    variant="ghost"
                    onClick={onConnectDrive}
                    className="text-xs text-[var(--text-muted)]"
                  >
                    Changer de compte
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

