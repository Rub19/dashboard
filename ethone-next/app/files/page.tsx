"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorker } from "@/lib/hooks/useWorker";
import { useI18n } from "@/lib/hooks/useI18n";
import { useDriveFiles } from "@/lib/hooks/useDriveFiles";
import { buildAuthUrl } from "@/lib/oauth";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
;

function formatBytes(bytes = 0) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

type CloudFile = {
  id?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  isFavorite?: boolean;
};

type DisplayFile = CloudFile & {
  source: "worker" | "google";
  webViewLink?: string;
  modifiedAt?: string;
};

export default function FilesPage() {
  const { data, loading: workerLoading, error: workerError } = useWorker<{
    data: { files: CloudFile[] };
  }>("/api/cloud/files");
  const i18n = useI18n();
  const [clientId, setClientId] = useState("");
  const { files: driveFiles, loading: driveLoading, error: driveError } = useDriveFiles(clientId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setClientId(localStorage.getItem("ethone:clientId:google-drive") || "");
  }, []);

  const files = useMemo<DisplayFile[]>(() => {
    const workerFiles = data?.data?.files || [];
    const all: DisplayFile[] = workerFiles.map((f) => ({ ...f, source: "worker" as const }));
    all.push(...driveFiles.map((f) => ({ ...f, source: "google" as const })));
    return all.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [data, driveFiles]);

  const loading = workerLoading || driveLoading;
  const error = workerError || driveError;

  function connectDrive() {
    const id = prompt(i18n("clientId"));
    if (!id) return;
    localStorage.setItem("ethone:clientId:google-drive", id);
    setClientId(id);
    window.location.href = buildAuthUrl("google-drive", id, { provider: "google-drive", clientId: id });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("filesTitle")}</h1>
        {!clientId ? (
          <button
            type="button"
            onClick={connectDrive}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--surface-raised)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)]/20"
          >
            <Icon name="cloud" className="h-3 w-3" />
            {i18n("connectDrive")}
          </button>
        ) : (
          <span className="text-xs text-emerald-400">{i18n("googleDrive")} {i18n("connected")}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <Icon name="hard-drive" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{loading ? "-" : files.length}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("totalFiles")}</p>
            </div>
          </div>
        </Card3D>
      </div>

      {error && (
        <Card3D>
          <p className="text-sm text-red-400">{error.message}</p>
        </Card3D>
      )}

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <Card3D>
            <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--border)]" />
          </Card3D>
        ) : files.length === 0 ? (
          <Card3D>
            <p className="text-sm text-[var(--muted)]">{i18n("noFiles")}</p>
          </Card3D>
        ) : (
          files.slice(0, 20).map((file, i) => (
            <Card3D key={file.id || i}>
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    file.source === "google"
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-[var(--surface-raised)] text-[var(--muted)]"
                  }`}
                >
                  {file.mimeType === "application/vnd.google-apps.folder" ? (
                    <Icon name="folder" className="h-5 w-5" />
                  ) : (
                    <Icon name="file-text" className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {formatBytes(file.size)} · {file.mimeType || "-"}
                    {file.source === "google" && ` · ${i18n("googleDrive")}`}
                  </p>
                </div>
                {file.source === "worker" && file.isFavorite && <Icon name="heart" className="h-4 w-4 text-red-400" />}
                {file.webViewLink && (
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[var(--muted)] hover:text-[var(--accent)]"
                    aria-label={i18n("googleDrive")}
                  >
                    <Icon name="external-link" className="h-4 w-4" />
                  </a>
                )}
              </div>
            </Card3D>
          ))
        )}
      </div>
    </div>
  );
}
