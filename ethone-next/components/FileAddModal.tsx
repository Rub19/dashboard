"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/Input";
import FileUploader from "@/components/FileUploader";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";

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

  const actions: { id: TabId; label: string; desc: string; icon: string }[] = [
    { id: "upload", label: i18n("importFile", "Importer"), desc: i18n("importFileDesc", "Depuis votre appareil"), icon: "upload" },
    { id: "link", label: i18n("addLink", "Lien"), desc: i18n("addLinkDesc", "Ajouter une URL"), icon: "link" },
    { id: "drive", label: i18n("drive", "Google Drive"), desc: i18n("driveDesc", "Connecter / vérifier"), icon: "cloud" },
    { id: "folder", label: i18n("createFolder", "Dossier"), desc: i18n("createFolderDesc", "Nouveau dossier"), icon: "folder-plus" },
  ];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={i18n("add", "Ajouter")}
      size="md"
      hideFooter
      contentClassName="p-0"
    >
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setTab(a.id)}
              className={`
                flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all
                ${tab === a.id
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                  : "border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.25] text-[var(--text-muted)] hover:bg-[var(--panel-bg)]/[0.4] hover:text-[var(--text-primary)]"}
              `}
            >
              <Icon name={a.icon} className="h-5 w-5" />
              <span className="text-xs font-medium">{a.label}</span>
              <span className="text-[10px] opacity-70">{a.desc}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-[180px] rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.2] p-4">
          {tab === "upload" && (
            <div className="space-y-3">
              {!clientId ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <Icon name="cloud" className="h-8 w-8 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-muted)]">{i18n("connectDriveToUpload", "Connectez Google Drive pour téléverser des fichiers.")}</p>
                  <Button size="sm" variant="secondary" onClick={onConnectDrive} leftIcon={<Icon name="cloud" className="h-4 w-4" />}>
                    {i18n("connectDrive", "Connecter Drive")}
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const normalized = normalizeLink(linkUrl);
                if (normalized) {
                  navigator.clipboard.writeText(normalized).catch(() => {});
                  setLinkUrl("");
                  onClose();
                }
              }}
              className="space-y-4"
            >
              <p className="text-sm text-[var(--text-muted)]">{i18n("addLinkHint", "Ajoutez un lien externe à votre espace.")}</p>
              <Input
                type="text"
                inputMode="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onBlur={() => setLinkUrl((v) => normalizeLink(v))}
                placeholder="https://..."
                aria-label={i18n("url")}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  {i18n("cancel")}
                </Button>
                <Button type="submit" disabled={!linkUrl.trim()} isLoading={busy}>
                  {i18n("save")}
                </Button>
              </div>
            </form>
          )}

          {tab === "drive" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <Icon name="cloud" className="h-10 w-10 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">
                {clientId
                  ? i18n("driveConnected", "Google Drive est connecté.")
                  : i18n("connectDriveToManage", "Connectez un compte Google Drive pour synchroniser vos fichiers.")}
              </p>
              <Button
                onClick={clientId ? onClose : onConnectDrive}
                leftIcon={<Icon name={clientId ? "check" : "cloud"} className="h-4 w-4" />}
              >
                {clientId ? i18n("done") : i18n("connectDrive")}
              </Button>
            </div>
          )}

          {tab === "folder" && (
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <Input
                autoFocus
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder={i18n("newFolder", "Nouveau dossier")}
                aria-label={i18n("folderName")}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  {i18n("cancel")}
                </Button>
                <Button type="submit" disabled={!folderName.trim() || loading} isLoading={busy || loading}>
                  {i18n("create")}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}
