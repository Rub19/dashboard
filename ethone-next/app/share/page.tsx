"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchWorker, WORKER_URL } from "@/lib/api";
import { Icon } from "@/lib/icons";
import Card3D from "@/components/Card3D";

function formatBytes(bytes = 0) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function ShareContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const [password, setPassword] = useState(searchParams.get("password") || "");
  const [data, setData] = useState<{ share: { visibility: string; expiresAt?: string; maxDownloads?: number; downloadCount?: number }; file: { name: string; size: number; mimeType: string } } | null>(null);
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
        else setError("Share not found");
      })
      .catch((err) => setError(String(err.message || err)))
      .finally(() => setLoading(false));
  }, [workerUrl, slug]);

  function download() {
    const p = new URLSearchParams();
    if (slug) p.set("slug", slug);
    if (password) p.set("password", password);
    window.open(`${WORKER_URL}/api/cloud/shares/download?${p.toString()}`, "_blank");
  }

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card3D>
          <p className="text-sm text-[var(--muted)]">No share link provided.</p>
        </Card3D>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Card3D>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Icon name="share-2" className="h-6 w-6 text-violet-400" />
            Shared file
          </h1>

        {data?.share?.visibility === "password" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => { setData(null); setError(null); }}
                className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
              >
                Unlock
              </button>
            </div>
          </div>
        )}

        {loading && <p className="text-sm text-[var(--muted)]">Loading...</p>}
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
            {data.share.expiresAt && (
              <p className="text-xs text-[var(--muted)]">Expires: {new Date(data.share.expiresAt).toLocaleString()}</p>
            )}
            <button
              type="button"
              onClick={download}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              <Icon name="download" className="h-4 w-4" /> Download
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
