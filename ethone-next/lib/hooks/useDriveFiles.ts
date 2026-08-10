"use client";

import { useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";

type GoogleDriveFile = {
  id?: string;
  name?: string;
  title?: string;
  size?: number;
  fileSize?: number;
  mimeType?: string;
  modifiedTime?: string;
  modifiedAt?: string;
  webViewLink?: string;
};

export type DriveFile = {
  id: string;
  name: string;
  size: number;
  mimeType?: string;
  modifiedAt?: string;
  webViewLink?: string;
  source: "google";
};

export function useDriveFiles(clientId?: string) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!clientId) {
      setFiles([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchWorker(`/api/google-drive/files?clientId=${encodeURIComponent(clientId)}`)
      .then((res) => {
        if (cancelled) return;
        const data = (res?.data?.files || res?.files || []) as GoogleDriveFile[];
        setFiles(
          data.map((f) => ({
            id: f.id || `${Date.now()}-${Math.random()}`,
            name: f.name || f.title || "Fichier",
            size: f.size ?? f.fileSize ?? 0,
            mimeType: f.mimeType,
            modifiedAt: f.modifiedTime || f.modifiedAt,
            webViewLink: f.webViewLink,
            source: "google" as const,
          }))
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return { files, loading, error };
}
