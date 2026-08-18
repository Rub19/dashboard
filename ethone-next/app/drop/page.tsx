"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchWorker, uploadPublic } from "@/lib/api";
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

type Drop = {
  title: string;
  description?: string;
  visibility: string;
  maxFiles?: number;
  maxSize?: number;
  fileCount?: number;
  expiresAt?: string;
};

function DropContent() {
  const i18n = useI18n();
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const [password, setPassword] = useState(searchParams.get("password") || "");
  const [drop, setDrop] = useState<Drop | null>(null);
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
        else setError(i18n("dropNotFound"));
      })
      .catch((err) => setError(String(err.message || err)))
      .finally(() => setLoading(false));
  }, [resolveUrl, slug, i18n]);

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
      setSuccess(i18n("uploadedFile").replace("{{name}}", file.name));
      fetchWorker(resolveUrl).then((res) => res?.data?.drop && setDrop(res.data.drop));
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setUploading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  }

  if (!slug) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:hidden]">
        <Card3D>
          <p className="text-sm text-[var(--muted)]">{i18n("noDropLink")}</p>
        </Card3D>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:hidden]">
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg space-y-4">
        <Card3D>
          <h1 className="mb-4 flex flex-wrap items-center gap-2 break-words text-xl font-bold">
            <Icon name="inbox" className="h-6 w-6 text-emerald-400" />
            {drop?.title || i18n("drop")}
          </h1>
          {drop?.description && <p className="break-words text-sm text-[var(--muted)]">{drop.description}</p>}

          {drop?.visibility === "password" && (
            <div className="mb-4 space-y-2">
              <label className="text-sm font-medium">{i18n("password")}</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={i18n("enterPassword")}
                  aria-label={i18n("enterPassword")}
                  className="min-w-0 flex-1"
                />
                <button
                  type="button"
                  onClick={() => { setDrop(null); setError(null); }}
                  className="rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
                >
                  {i18n("unlock")}
                </button>
              </div>
            </div>
          )}

          {loading && <p className="break-words text-sm text-[var(--muted)]">{i18n("loading")}</p>}
          {error && <p className="break-words text-sm text-red-400">{error}</p>}
          {success && <p className="break-words text-sm text-emerald-400">{success}</p>}

          {drop && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2 text-xs text-[var(--muted)] sm:grid-cols-2 sm:gap-4">
                <div className="rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-2 text-center">
                  <p className="text-lg font-bold text-[var(--foreground)]">{drop.fileCount || 0}</p>
                  <p>{i18n("files")}</p>
                </div>
                <div className="rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-2 text-center">
                  <p className="text-lg font-bold text-[var(--foreground)]">{drop.maxFiles || "∞"}</p>
                  <p>{i18n("maxFiles")}</p>
                </div>
              </div>

              <div className="break-words text-xs text-[var(--muted)]">
                {drop.maxSize ? `${i18n("maxSize")}: ${formatBytes(drop.maxSize)}` : null}
                {drop.expiresAt ? ` · ${i18n("expiresAt")}: ${new Date(drop.expiresAt).toLocaleString()}` : null}
              </div>

              <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--panel-radius)] border-2 border-dashed border-[var(--panel-border)] p-8 text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]">
                <Icon name="upload-cloud" className="h-8 w-8" />
                <span className="text-sm font-medium">{i18n("dropFilesHere")}</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => e.target.files && Array.from(e.target.files).forEach(upload)}
                />
              </label>
              {uploading && <p className="text-sm text-[var(--muted)]">{i18n("uploading")}</p>}

              <button
                type="button"
                onClick={copyLink}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)]"
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

export default function DropPage() {
  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <Suspense fallback={<div className="flex h-full min-h-0 w-full items-center justify-center overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:hidden]"><Card3D><p className="text-sm text-[var(--muted)]">Loading...</p></Card3D></div>}>
        <DropContent />
      </Suspense>
    </div>
  );
}
