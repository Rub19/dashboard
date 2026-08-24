"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { formatBytes } from "@/lib/files";
import Input from "@/components/Input";
import Select from "@/components/ui/Select";

const STORAGE_CAP = 10 * 1024 * 1024 * 1024;

type Share = {
  id: string;
  slug: string;
  fileName?: string;
  visibility?: string;
  expiresAt?: string;
  downloadCount?: number;
};

type Drop = {
  id: string;
  slug: string;
  title?: string;
  visibility?: string;
  expiresAt?: string;
  fileCount?: number;
};

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

type Tab = "shares" | "drops" | "stats";

export default function FilesAdminPanel() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const [tab, setTab] = useState<Tab>("stats");
  const [shares, setShares] = useState<Share[]>([]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [cleaning, setCleaning] = useState(false);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<"all" | "public" | "private" | "unlisted">("all");

  async function load() {
    setLoading(true);
    setErrors([]);
    const nextShares: Share[] = [];
    const nextDrops: Drop[] = [];
    let nextDashboard: Dashboard | null = null;
    const nextErrors: string[] = [];

    try {
      const [s, d, dash] = await Promise.allSettled([
        fetchWorker("/api/cloud/shares"),
        fetchWorker("/api/cloud/drops"),
        fetchWorker("/api/cloud/dashboard"),
      ]);

      if (s.status === "fulfilled" && s.value?.data?.shares) {
        nextShares.push(...(s.value.data.shares as Share[]));
      } else if (s.status === "rejected") {
        nextErrors.push(i18n("shares"));
      }

      if (d.status === "fulfilled" && d.value?.data?.drops) {
        nextDrops.push(...(d.value.data.drops as Drop[]));
      } else if (d.status === "rejected") {
        nextErrors.push(i18n("drops"));
      }

      if (dash.status === "fulfilled" && dash.value?.data) {
        nextDashboard = dash.value.data as Dashboard;
      } else if (dash.status === "rejected") {
        nextErrors.push(i18n("dashboard"));
      }
    } catch {
      nextErrors.push(i18n("error"));
    } finally {
      setShares(nextShares);
      setDrops(nextDrops);
      setDashboard(nextDashboard);
      setErrors(nextErrors);
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
  const usagePct = Math.min(100, Math.round(((dashboard?.totalSize || 0) / STORAGE_CAP) * 100));

  const items = useMemo(() => {
    const baseItems = tab === "shares" ? shares : tab === "drops" ? drops : [];
    const q = search.toLowerCase().trim();
    return baseItems.filter((item) => {
      const isShare = tab === "shares";
      const share = isShare ? (item as Share) : null;
      const drop = !isShare ? (item as Drop) : null;
      const label = String(share?.fileName || drop?.title || item.slug || "").toLowerCase();
      const matchesSearch = !q || label.includes(q) || item.slug.toLowerCase().includes(q);
      const matchesVisibility = visibility === "all" || item.visibility === visibility;
      return matchesSearch && matchesVisibility;
    });
  }, [tab, shares, drops, search, visibility]);

  const stats = [
    { icon: "file", label: i18n("totalFiles"), value: dashboard?.totalFiles ?? "-" },
    { icon: "hard-drive", label: i18n("storageUsed"), value: dashboard ? formatBytes(dashboard.totalSize) : "-" },
    { icon: "folder", label: i18n("folders"), value: dashboard?.folders ?? "-" },
    { icon: "heart", label: i18n("favorites"), value: dashboard?.favorites ?? "-" },
    { icon: "share-2", label: i18n("shares"), value: dashboard?.activeShares ?? "-" },
    { icon: "inbox", label: i18n("drops"), value: dashboard?.activeDrops ?? "-" },
    { icon: "clock", label: i18n("expiredShares"), value: dashboard?.expiredShares ?? "-", warn: true },
    { icon: "clock", label: i18n("expiredDrops"), value: dashboard?.expiredDrops ?? "-", warn: true },
  ];

  const tabs: { id: Tab; label: string; icon: string; count: number }[] = [
    { id: "stats", label: i18n("dashboard"), icon: "layout-dashboard", count: 0 },
    { id: "shares", label: i18n("shares"), icon: "share-2", count: shares.length },
    { id: "drops", label: i18n("drops"), icon: "inbox", count: drops.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1 backdrop-blur-[var(--panel-blur)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--panel-radius)] py-2 text-xs font-medium transition-colors sm:text-sm ${
              tab === t.id ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon name={t.icon} className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label}</span>
            {t.count > 0 && <span className="ml-0.5 rounded-lg bg-white/20 px-1.5 py-0.5 text-[10px]">{t.count}</span>}
          </button>
        ))}
      </div>

      {errors.length > 0 && (
        <Card3D>
          <div className="flex items-start gap-2 text-sm text-red-400">
            <Icon name="alert-triangle" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {i18n("error")}: {errors.join(", ")}
            </p>
          </div>
        </Card3D>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card3D key={i}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-[var(--panel-radius)] bg-[var(--border)]" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--border)]" />
                  <div className="h-2.5 w-1/4 animate-pulse rounded bg-[var(--border)]" />
                </div>
              </div>
            </Card3D>
          ))}
        </div>
      ) : tab === "stats" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <Card3D key={s.label}>
                <div className="flex items-start justify-between">
                  <Icon name={s.icon} className="h-4 w-4 text-[var(--accent)]" />
                  <span className={`text-2xl font-bold ${s.warn ? "text-amber-400" : ""}`}>{s.value}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{s.label}</p>
              </Card3D>
            ))}
          </div>

          <Card3D>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">{i18n("storageUsed")}</span>
              <span className="font-medium">{dashboard ? formatBytes(dashboard.totalSize) : "-"} / {formatBytes(STORAGE_CAP)}</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-xl bg-[var(--panel-bg)]">
              <div
                className={`h-full rounded-xl ${usagePct > 90 ? "bg-red-400" : usagePct > 70 ? "bg-amber-400" : "bg-[--accent-primary]"}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] text-[var(--text-muted)]">{usagePct}%</p>
          </Card3D>

          {expiredCount > 0 && (
            <button
              type="button"
              onClick={cleanup}
              disabled={cleaning}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--panel-radius)] bg-[var(--danger)]/10 px-3 py-2 text-sm font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/20 disabled:opacity-50"
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
                    <span className="min-w-0 truncate">{f.name || "-"}</span>
                    <span className="text-xs text-[var(--text-muted)]">{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">{i18n("noFiles")}</p>
            )}
          </Card3D>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={i18n("search")}
              className="min-w-0 flex-1"
            />
            <Select
              value={visibility}
              onChange={(value) => setVisibility(value as typeof visibility)}
              options={[
                { id: "all", label: i18n("allVisibility") },
                { id: "public", label: i18n("public") },
                { id: "private", label: i18n("private") },
                { id: "unlisted", label: i18n("unlisted") },
              ]}
              aria-label={i18n("visibility")}
              className="min-w-[5rem]"
            />
          </div>

          {items.length === 0 ? (
            <Card3D>
              <p className="text-sm text-[var(--text-muted)]">{tab === "shares" ? i18n("noShares") : i18n("noDrops")}</p>
            </Card3D>
          ) : (
            items.map((item) => {
              const isShare = tab === "shares";
              const share = isShare ? (item as Share) : null;
              const drop = !isShare ? (item as Drop) : null;
              const label = share?.fileName || drop?.title || item.slug;
              return (
                <Card3D key={item.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{label}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {i18n("visibility")}: {item.visibility || "-"}
                        {share ? ` · ${i18n("downloads")}: ${share.downloadCount || 0}` : ` · ${i18n("files")}: ${drop?.fileCount || 0}`}
                        {item.expiresAt ? ` · ${i18n("expiresAt")}: ${new Date(item.expiresAt).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => (isShare ? revokeShare(item.id) : revokeDrop(item.id))}
                      className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)]"
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
