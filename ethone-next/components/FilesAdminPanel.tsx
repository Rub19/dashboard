"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { formatBytes } from "@/lib/files";

type Share = { id: string; slug: string; fileName?: string; visibility?: string; expiresAt?: string; downloadCount?: number };
type Drop = { id: string; slug: string; title?: string; visibility?: string; expiresAt?: string; fileCount?: number };
type Dashboard = {
  totalFiles: number;
  totalSize: number;
  folders: number;
  favorites: number;
  activeShares: number;
  expiredShares: number;
  activeDrops: number;
  expiredDrops: number;
  topFiles: { id?: string; name?: string; size: number }[];
};

export default function FilesAdminPanel() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const [tab, setTab] = useState<"shares" | "drops" | "stats">("stats");
  const [shares, setShares] = useState<Share[]>([]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [s, d, dash] = await Promise.all([
        fetchWorker("/api/cloud/shares"),
        fetchWorker("/api/cloud/drops"),
        fetchWorker("/api/cloud/dashboard"),
      ]);
      setShares((s?.data?.shares as Share[]) || []);
      setDrops((d?.data?.drops as Drop[]) || []);
      setDashboard(dash?.data as Dashboard);
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

  async function cleanup() {
    setCleaning(true);
    try {
      const res = await fetchWorker("/api/cloud/cleanup", { method: "POST" });
      success(`${i18n("cleanedUp")}: ${res?.data?.revokedShares ?? 0} / ${res?.data?.revokedDrops ?? 0}`);
      load();
    } catch {
      showError(i18n("error"));
    } finally {
      setCleaning(false);
    }
  }

  const expiredCount = (dashboard?.expiredShares || 0) + (dashboard?.expiredDrops || 0);

  const items = tab === "shares" ? shares : tab === "drops" ? drops : [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
        <button type="button" onClick={() => setTab("stats")} className={`flex-1 rounded-xl py-1.5 text-sm font-medium transition-colors ${tab === "stats" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}>{i18n("dashboard")}</button>
        <button type="button" onClick={() => setTab("shares")} className={`flex-1 rounded-xl py-1.5 text-sm font-medium transition-colors ${tab === "shares" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}>{i18n("shares")} ({shares.length})</button>
        <button type="button" onClick={() => setTab("drops")} className={`flex-1 rounded-xl py-1.5 text-sm font-medium transition-colors ${tab === "drops" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}>{i18n("drops")} ({drops.length})</button>
      </div>

      {loading ? (
        <Card3D><div className="h-4 w-1/3 animate-pulse rounded bg-[var(--border)]" /></Card3D>
      ) : tab === "stats" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card3D>
              <p className="text-xs text-[var(--muted)]">{i18n("totalFiles")}</p>
              <p className="text-2xl font-bold">{dashboard?.totalFiles ?? "-"}</p>
            </Card3D>
            <Card3D>
              <p className="text-xs text-[var(--muted)]">{i18n("storageUsed")}</p>
              <p className="text-2xl font-bold">{dashboard ? formatBytes(dashboard.totalSize) : "-"}</p>
            </Card3D>
            <Card3D>
              <p className="text-xs text-[var(--muted)]">{i18n("folders")}</p>
              <p className="text-2xl font-bold">{dashboard?.folders ?? "-"}</p>
            </Card3D>
            <Card3D>
              <p className="text-xs text-[var(--muted)]">{i18n("favorites")}</p>
              <p className="text-2xl font-bold">{dashboard?.favorites ?? "-"}</p>
            </Card3D>
            <Card3D>
              <p className="text-xs text-[var(--muted)]">{i18n("shares")}</p>
              <p className="text-2xl font-bold">{dashboard?.activeShares ?? "-"}</p>
            </Card3D>
            <Card3D>
              <p className="text-xs text-[var(--muted)]">{i18n("expiredShares")}</p>
              <p className="text-2xl font-bold text-amber-400">{dashboard?.expiredShares ?? "-"}</p>
            </Card3D>
            <Card3D>
              <p className="text-xs text-[var(--muted)]">{i18n("drops")}</p>
              <p className="text-2xl font-bold">{dashboard?.activeDrops ?? "-"}</p>
            </Card3D>
            <Card3D>
              <p className="text-xs text-[var(--muted)]">{i18n("expiredDrops")}</p>
              <p className="text-2xl font-bold text-amber-400">{dashboard?.expiredDrops ?? "-"}</p>
            </Card3D>
          </div>

          {expiredCount > 0 && (
            <button
              type="button"
              onClick={cleanup}
              disabled={cleaning}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            >
              <Icon name="trash-2" className="h-4 w-4" />
              {cleaning ? i18n("cleaning") : i18n("cleanupExpired")}
            </button>
          )}

          <Card3D>
            <p className="mb-2 text-sm font-medium">{i18n("topFiles")}</p>
            {dashboard?.topFiles?.length ? (
              <div className="space-y-2">
                {dashboard.topFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="min-w-0 truncate">{f.name}</span>
                    <span className="text-xs text-[var(--muted)]">{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">{i18n("noFiles")}</p>
            )}
          </Card3D>
        </div>
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
