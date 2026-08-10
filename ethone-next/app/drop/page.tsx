"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchWorker, uploadPublic } from "@/lib/api";
import { Icon } from "@/lib/icons";
import Card3D from "@/components/Card3D";

function formatBytes(bytes = 0) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function DropContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const [password, setPassword] = useState(searchParams.get("password") || "");
  const [drop, setDrop] = useState<{ title: string; description?: string; visibility: string; maxFiles?: number; maxSize?: number; fileCount?: number; expiresAt?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const resolveUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (slug) p.set("slug", slug);
    if (password) p.set("password", password);
    return `/api/cloud/drops/resolve?${p.toString()}`;
  }, [slug, password]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetchWorker(resolveUrl)
      .then((res) => {
        if (res?.data?.drop) setDrop(res.data.drop);
        else setError("Drop not found");
      })
      .catch((err) => setError(String(err.message || err)))
      .finally(() => setLoading(false));
  }, [resolveUrl, slug]);

  async function upload(file: File) {
    if (!slug) return;
    setUploading(true);
    setSuccess(null);
    setError(null);
    try {
      const p = new URLSearchParams();
      p.set("slug", slug);
      if (password) p.set("password", password);
      await uploadPublic(`/api/cloud/drops/upload?${p.toString()}`, file);
      setSuccess(`Uploaded ${file.name}`);
      fetchWorker(resolveUrl).then((res) => res?.data?.drop && setDrop(res.data.drop));
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setUploading(false);
    }
  }

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card3D>
          <p className="text-sm text-[var(--muted)]">No drop link provided.</p>
        </Card3D>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Card3D>
          <h1 className="flex items-center gap-2 text-xl font-bold">
          <Icon name="inbox" className="h-6 w-6 text-emerald-400" />
          {drop?.title || "Drop"}
        </h1>
        {drop?.description && <p className="text-sm text-[var(--muted)]">{drop.description}</p>}

        {drop?.visibility === "password" && (
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
                onClick={() => { setDrop(null); setError(null); }}
                className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
              >
                Unlock
              </button>
            </div>
          </div>
        )}

        {loading && <p className="text-sm text-[var(--muted)]">Loading...</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-400">{success}</p>}

        {drop && (
          <div className="space-y-4">
            <div className="text-xs text-[var(--muted)]">
              {drop.maxFiles ? `Files: ${drop.fileCount || 0} / ${drop.maxFiles}` : `Files: ${drop.fileCount || 0}`}
              {drop.maxSize ? ` · Max size: ${formatBytes(drop.maxSize)}` : null}
              {drop.expiresAt ? ` · Expires: ${new Date(drop.expiresAt).toLocaleString()}` : null}
            </div>
            <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] p-8 text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]">
              <Icon name="upload-cloud" className="h-8 w-8" />
              <span className="text-sm font-medium">Drop files here</span>
              <input
                type="file"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(e) => e.target.files && Array.from(e.target.files).forEach(upload)}
              />
            </label>
            {uploading && <p className="text-sm text-[var(--muted)]">Uploading...</p>}
          </div>
        )}
        </Card3D>
      </div>
    </div>
  );
}

export default function DropPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-6"><Card3D><p className="text-sm text-[var(--muted)]">Loading...</p></Card3D></div>}>
      <DropContent />
    </Suspense>
  );
}
