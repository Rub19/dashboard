"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";

type Share = { id: string; slug: string; fileName?: string; visibility?: string; expiresAt?: string; downloadCount?: number };
type Drop = { id: string; slug: string; title?: string; visibility?: string; expiresAt?: string; fileCount?: number };

export default function FilesAdminPanel() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const [tab, setTab] = useState<"shares" | "drops">("shares");
  const [shares, setShares] = useState<Share[]>([]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        fetchWorker("/api/cloud/shares"),
        fetchWorker("/api/cloud/drops"),
      ]);
      setShares((s?.data?.shares as Share[]) || []);
      setDrops((d?.data?.drops as Drop[]) || []);
    } catch {
      showError(i18n("error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function revokeShare(id: string) {
    try {
      await fetchWorker("/api/cloud/shares/revoke", { method: "POST", body: JSON.stringify({ id }) });
      success(i18n("revoked"));
      load();
    } catch {
      showError(i18n("error"));
    }
  }

  async function revokeDrop(id: string) {
    try {
      await fetchWorker("/api/cloud/drops/revoke", { method: "POST", body: JSON.stringify({ id }) });
      success(i18n("revoked"));
      load();
    } catch {
      showError(i18n("error"));
    }
  }

  const items = tab === "shares" ? shares : drops;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
        <button
          type="button"
          onClick={() => setTab("shares")}
          className={`flex-1 rounded-xl py-1.5 text-sm font-medium transition-colors ${
            tab === "shares" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
          }`}
        >
          {i18n("shares")} ({shares.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("drops")}
          className={`flex-1 rounded-xl py-1.5 text-sm font-medium transition-colors ${
            tab === "drops" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
          }`}
        >
          {i18n("drops")} ({drops.length})
        </button>
      </div>

      {loading ? (
        <Card3D><div className="h-4 w-1/3 animate-pulse rounded bg-[var(--border)]" /></Card3D>
      ) : (
        <div className="space-y-3">
          {items.length === 0 ? (
            <Card3D>
              <p className="text-sm text-[var(--muted)]">{tab === "shares" ? i18n("noShares") : i18n("noDrops")}</p>
            </Card3D>
          ) : (
            items.map((item) => {
              const isShare = tab === "shares";
              const share = isShare ? (item as Share) : null;
              const drop = !isShare ? (item as Drop) : null;
              return (
                <Card3D key={item.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{share?.fileName || drop?.title || item.slug}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {i18n("visibility")}: {item.visibility}
                        {share ? ` · ${i18n("downloads")}: ${share.downloadCount || 0}` : ` · ${i18n("files")}: ${drop?.fileCount || 0}`}
                        {item.expiresAt ? ` · ${i18n("expiresAt")}: ${new Date(item.expiresAt).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => (isShare ? revokeShare(item.id) : revokeDrop(item.id))}
                      className="rounded p-1.5 text-[var(--muted)] hover:text-red-400"
                      aria-label={i18n("revoke")}
                    >
                      <Icon name="trash-2" className="h-4 w-4" />
                    </button>
                  </div>
                </Card3D>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
