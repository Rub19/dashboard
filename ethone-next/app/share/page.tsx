"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchWorker, WORKER_URL } from "@/lib/api";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import Card3D from "@/components/Card3D";
import Input from "@/components/Input";

function formatBytes(bytes = 0) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

type ShareData = {
  share: { visibility: string; expiresAt?: string; maxDownloads?: number; downloadCount?: number };
  file: { name: string; size: number; mimeType: string };
};

function ShareContent() {
  const i18n = useI18n();
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const [password, setPassword] = useState(searchParams.get("password") || "");
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const workerUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (slug) p.set("slug", slug);
    if (password) p.set("password", password);
    return `/api/cloud/shares/resolve?${p.toString()}`;
  }, [slug, password]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetchWorker(workerUrl)
      .then((res) => {
        if (res?.data) setData(res.data);
        else setError(i18n("shareNotFound"));
      })
      .catch((err) => setError(String(err.message || err)))
      .finally(() => setLoading(false));
  }, [workerUrl, slug, i18n]);

  function download() {
    const p = new URLSearchParams();
    if (slug) p.set("slug", slug);
    if (password) p.set("password", password);
    window.open(`${WORKER_URL}/api/cloud/shares/download?${p.toString()}`, "_blank");
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  }

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card3D>
          <p className="text-sm text-[var(--muted)]">{i18n("noShareLink")}</p>
        </Card3D>
      </div>
    );
  }

  const downloads = data?.share?.downloadCount || 0;
  const maxDownloads = data?.share?.maxDownloads;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Card3D>
          <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Icon name="share-2" className="h-6 w-6 text-violet-400" />
            {i18n("sharedFile")}
          </h1>

          {data?.share?.visibility === "password" && (
            <div className="mb-4 space-y-2">
              <label className="text-sm font-medium">{i18n("password")}</label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={i18n("enterPassword")}
                  className="min-w-0 flex-1"
                />
                <button
                  type="button"
                  onClick={() => { setData(null); setError(null); }}
                  className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
                >
                  {i18n("unlock")}
                </button>
              </div>
            </div>
          )}

          {loading && <p className="text-sm text-[var(--muted)]">{i18n("loading")}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          {data && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                  <Icon name="file-text" className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-medium">{data.file.name}</p>
                  <p className="text-xs text-[var(--muted)]">{formatBytes(data.file.size)} · {data.file.mimeType}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                <div className="rounded-xl bg-[var(--surface)] p-2 text-center">
                  <p className="text-lg font-bold text-[var(--foreground)]">{downloads}</p>
                  <p>{i18n("downloads")}</p>
                </div>
                {maxDownloads !== undefined && (
                  <div className="rounded-xl bg-[var(--surface)] p-2 text-center">
                    <p className="text-lg font-bold text-[var(--foreground)]">{maxDownloads}</p>
                    <p>{i18n("maxDownloads")}</p>
                  </div>
                )}
              </div>

              {data.share.expiresAt && (
                <p className="text-xs text-[var(--muted)]">{i18n("expiresAt")}: {new Date(data.share.expiresAt).toLocaleString()}</p>
              )}

              <button
                type="button"
                onClick={download}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                <Icon name="download" className="h-4 w-4" /> {i18n("download")}
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]"
              >
                <Icon name="copy" className="h-4 w-4" /> {i18n("copyLink")}
              </button>
            </div>
          )}
        </Card3D>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-6"><Card3D><p className="text-sm text-[var(--muted)]">Loading...</p></Card3D></div>}>
      <ShareContent />
    </Suspense>
  );
}
