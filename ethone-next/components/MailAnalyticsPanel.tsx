"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import Card3D from "@/components/Card3D";

const PERIODS = [7, 30, 90] as const;

type Sender = { email?: string; count?: number };
type Daily = { date?: string; count?: number; inbound?: number; outbound?: number };
type Analytics = {
  total?: number;
  inbound?: number;
  outbound?: number;
  unread?: number;
  topSenders?: Sender[];
  topLabels?: { label?: string; count?: number }[];
  daily?: Daily[];
};

export default function MailAnalyticsPanel({
  getAnalytics,
}: {
  getAnalytics: (period: number) => Promise<{ data?: Analytics }>;
}) {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { error: toastError } = useToast();
  const [period, setPeriod] = useState<number>(30);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAnalytics(period)
      .then((res) => {
        if (cancelled) return;
        setAnalytics(res?.data || null);
      })
      .catch((err) => toastError(String(err)))
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, [period, getAnalytics, toastError]);

  const daily = Array.isArray(analytics?.daily) ? analytics.daily : [];
  const topSenders = Array.isArray(analytics?.topSenders) ? analytics.topSenders : [];
  const topLabels = Array.isArray(analytics?.topLabels) ? analytics.topLabels : [];
  const dailyMax = Math.max(1, ...daily.map((d) => Math.max(d.count || 0, d.inbound || 0, d.outbound || 0)));
  const senderMax = Math.max(1, ...topSenders.map((s) => s.count || 0));
  const labelMax = Math.max(1, ...topLabels.map((l) => l.count || 0));

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(settings.language, { month: "short", day: "numeric" }),
    [settings.language]
  );

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-[var(--panel-radius)] px-3 py-1.5 text-xs font-medium transition-colors ${
              period === p
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--panel-bg)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {p} {i18n("days")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--muted)]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--panel-border)] border-t-[var(--accent)]" />
          {i18n("loading")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card3D>
              <div className="text-[var(--muted)]">{i18n("total")}</div>
              <div className="text-lg font-semibold">{Number(analytics?.total) || 0}</div>
            </Card3D>
            <Card3D>
              <div className="text-[var(--muted)]">{i18n("inbound")}</div>
              <div className="text-lg font-semibold">{Number(analytics?.inbound) || 0}</div>
            </Card3D>
            <Card3D>
              <div className="text-[var(--muted)]">{i18n("outbound")}</div>
              <div className="text-lg font-semibold">{Number(analytics?.outbound) || 0}</div>
            </Card3D>
            <Card3D>
              <div className="text-[var(--muted)]">{i18n("unread")}</div>
              <div className="text-lg font-semibold">{Number(analytics?.unread) || 0}</div>
            </Card3D>
          </div>

          {daily.length > 0 && (
            <Card3D>
              <p className="mb-2 font-medium">{i18n("activity")}</p>
              <div className="flex h-32 items-end gap-1 overflow-x-auto">
                {daily.map((d, i) => {
                  const count = d.count || 0;
                  const pct = Math.round((count / dailyMax) * 100);
                  const title = `${d.date ? dateFormatter.format(new Date(d.date)) : "?"}: ${count}`;
                  return (
                    <div key={i} className="group flex h-full flex-1 flex-col justify-end" title={title}>
                      <div
                        className="w-full rounded-t bg-[var(--accent)]/80 transition-colors duration-150 group-hover:bg-[var(--accent)]"
                        style={{ height: `${pct}%` }}
                      />
                      <span className="mt-1 text-[8px] text-[var(--muted)] truncate text-center">
                        {d.date ? new Date(d.date).getDate() : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card3D>
          )}

          {topSenders.length > 0 && (
            <Card3D>
              <p className="mb-2 font-medium">{i18n("from")}</p>
              <div className="space-y-2">
                {topSenders.map((s, i) => {
                  const pct = Math.round(((s.count || 0) / senderMax) * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="truncate">{s.email}</span>
                        <span className="text-[var(--muted)]">{s.count}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-bg)]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card3D>
          )}

          {topLabels.length > 0 && (
            <Card3D>
              <p className="mb-2 font-medium">{i18n("labels")}</p>
              <div className="space-y-2">
                {topLabels.map((l, i) => {
                  const pct = Math.round(((l.count || 0) / labelMax) * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="truncate">{l.label}</span>
                        <span className="text-[var(--muted)]">{l.count}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-bg)]">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card3D>
          )}
        </>
      )}
    </div>
  );
}
