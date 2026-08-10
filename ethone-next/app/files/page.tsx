"use client";

import { useWorker } from "@/lib/hooks/useWorker";
import { useI18n } from "@/lib/hooks/useI18n";
import Card3D from "@/components/Card3D";
import { FileText, Folder, Heart, HardDrive } from "lucide-react";

function formatBytes(bytes = 0) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function FilesPage() {
  const { data, loading, error } = useWorker<{ data: { files: any[] } }>("/api/cloud/files");
  const i18n = useI18n();
  const files = data?.data?.files || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("files")}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <HardDrive className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{loading ? "-" : files.length}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("files")}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <Card3D>
            <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--border)]" />
          </Card3D>
        ) : error ? (
          <Card3D>
            <p className="text-sm text-red-400">{error.message}</p>
          </Card3D>
        ) : files.length === 0 ? (
          <Card3D>
            <p className="text-sm text-[var(--muted)]">Aucun fichier dans le cloud.</p>
          </Card3D>
        ) : (
          files.slice(0, 20).map((file: any, i) => (
            <Card3D key={file.id || i}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)] text-[var(--muted)]">
                  {file.mimeType === "application/vnd.google-apps.folder" ? (
                    <Folder className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {formatBytes(file.size)} · {file.mimeType}
                  </p>
                </div>
                {file.isFavorite && <Heart className="h-4 w-4 text-red-400" />}
              </div>
            </Card3D>
          ))
        )}
      </div>
    </div>
  );
}
