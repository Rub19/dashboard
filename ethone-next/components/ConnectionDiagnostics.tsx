"use client";

import { useMemo } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useProviderCredentials } from "@/lib/hooks/useProviderCredentials";
import { Icon } from "@/lib/icons";

export default function ConnectionDiagnostics() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { connected } = useProviderCredentials();

  const checks = useMemo(() => {
    const list: { label: string; ok: boolean; hint: string }[] = [];

    if (!settings.liveWeatherCity) list.push({ label: "Weather", ok: false, hint: i18n("missingCity") });
    else list.push({ label: "Weather", ok: true, hint: settings.liveWeatherCity });

    list.push({ label: "Spotify", ok: !!connected.spotify, hint: connected.spotify ? i18n("connected") : i18n("missingOAuth") });
    list.push({ label: "GitHub", ok: !!connected.github, hint: connected.github ? i18n("connected") : i18n("missingOAuth") });
    list.push({ label: "Google", ok: !!(connected["google-drive"] || connected["google-calendar"]), hint: (connected["google-drive"] || connected["google-calendar"]) ? i18n("connected") : i18n("missingOAuth") });
    list.push({ label: "Discord", ok: !!connected.discord, hint: connected.discord ? i18n("connected") : i18n("missingOAuth") });

    const driveOk = !!settings.driveClientId || !!(connected["google-drive"] || connected["google-calendar"]);
    list.push({ label: i18n("filesTitle"), ok: driveOk, hint: driveOk ? i18n("configured") : i18n("missingDriveClientId") });

    const brainOk = settings.brainEnabled && Object.values(settings.brainPermissions).some(Boolean);
    list.push({ label: "Brain", ok: brainOk, hint: brainOk ? i18n("enabled") : i18n("disabled") });

    return list;
  }, [connected, settings, i18n]);

  const ok = checks.filter((c) => c.ok).length;

  return (
    <Card3D>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{i18n("diagnosticsTitle")}</h2>
        <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${ok === checks.length ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
          {ok}/{checks.length}
        </span>
      </div>
      <div className="space-y-2">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 backdrop-blur-[var(--panel-blur)]">
            <Icon name={c.ok ? "circle-check" : "alert-circle"} className={`h-5 w-5 ${c.ok ? "text-emerald-400" : "text-amber-400"}`} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{c.label}</p>
              <p className="text-xs text-[var(--muted)]">{c.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </Card3D>
  );
}
