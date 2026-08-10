"use client";

import { useWorker } from "@/lib/hooks/useWorker";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";

type SecurityEvent = {
  id?: string;
  type?: string;
  action?: string;
  created_at?: string;
  at?: string;
  ip?: string;
  status?: string;
};

export default function SecurityPage() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { data, loading } = useWorker<{ data: SecurityEvent[] }>("/api/auth/security-events");
  const events = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("securityTitle")}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="shield" className="h-8 w-8 text-violet-400" />
            <div>
              <p className="text-sm text-[var(--muted)]">{i18n("auth")}</p>
              <p className="font-medium">{i18n("otpPasskeys")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="lock" className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-sm text-[var(--muted)]">{i18n("encryption")}</p>
              <p className="font-medium">{i18n("tlsJwt")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="smartphone" className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-sm text-[var(--muted)]">{i18n("devices")}</p>
              <p className="font-medium">{i18n("manageSessions")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="history" className="h-8 w-8 text-sky-400" />
            <div>
              <p className="text-sm text-[var(--muted)]">{i18n("history")}</p>
              <p className="font-medium">{loading ? "-" : events.length} {i18n(events.length > 1 ? "events" : "event")}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <h2 className="text-lg font-semibold">{i18n("securityEvents")}</h2>
      <div className="space-y-3">
        {loading ? (
          <Card3D>
            <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--border)]" />
          </Card3D>
        ) : events.length === 0 ? (
          <Card3D>
            <p className="text-sm text-[var(--muted)]">{i18n("noSecurityEvents")}</p>
          </Card3D>
        ) : (
          events.slice(0, 20).map((event, i) => (
            <Card3D key={event.id || i}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{event.type || event.action || i18n("event")}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{new Date(event.created_at || event.at || "").toLocaleString(settings.language)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                  {event.ip || event.status || "-"}
                </span>
              </div>
            </Card3D>
          ))
        )}
      </div>
    </div>
  );
}
