"use client";

import { useState, useCallback, useMemo } from "react";
import { Activity, Radio, ShieldCheck, Wifi, RefreshCw } from "@/components/icons/ph";
import { useSettings } from "@/components/SettingsProvider";
import { getTrackerI18n } from "@/lib/i18n-tracker";
import { cn } from "@/lib/utils";
import type { ValorantAccountProfile } from "@/lib/valorant-provider";
import type { ValorantMatch } from "@/lib/valorant-tracker";

export interface ValorantLiveMatchViewProps {
  riotName: string;
  riotTag: string;
  valorantProfile: ValorantAccountProfile | null;
  valorantMatches: ValorantMatch[];
  lang?: string;
}

export default function ValorantLiveMatchView({
  riotName,
  riotTag,
  valorantProfile,
  lang,
}: ValorantLiveMatchViewProps) {
  const { settings } = useSettings();
  const effectiveLang =
    lang ||
    (typeof window !== "undefined"
      ? localStorage.getItem("ethone:tracker:language")
      : null) ||
    "en";
  const tr = useMemo(() => getTrackerI18n(effectiveLang), [effectiveLang]);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const playerName = valorantProfile?.name || riotName || "";
  const playerTag = valorantProfile?.tag || riotTag || "";
  const fullRiotId = playerTag ? `${playerName}#${playerTag}` : playerName;

  const handleCheckLive = useCallback(() => {
    setChecking(true);
    setCheckMessage(null);
    setTimeout(() => {
      setChecking(false);
      setCheckMessage(
        settings.language?.startsWith("en")
          ? "No active match detected. Launch VALORANT and join a match to activate real-time telemetry."
          : "Aucune partie en cours détectée. Lancez VALORANT et rejoignez un match pour activer la télémétrie en temps réel."
      );
    }, 750);
  }, [settings.language]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-5 backdrop-blur-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-medium text-neutral-300 uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Live Telemetry · {tr.beta}
              </span>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-mono text-neutral-400">
                {tr.liveLocalVanguardTitle}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-white uppercase tracking-wide">
              {tr.liveHeaderTitle}
            </h2>
            <p className="text-xs text-neutral-400">
              {fullRiotId ? (
                <>{tr.liveSubtitleWithId} <strong className="text-white font-medium">{fullRiotId}</strong>.</>
              ) : (
                <>{tr.liveSubtitleGeneric}</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCheckLive}
              disabled={checking}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-medium text-black hover:bg-neutral-200 active:scale-[0.98] transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-black", checking && "animate-spin")} />
              <span>{checking ? tr.liveCheckingBtn : tr.liveCheckBtn}</span>
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-neutral-300">
            <Radio className="h-6 w-6 text-neutral-300" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-sm font-semibold text-white">
              {tr.liveNoSessionTitle}
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {tr.liveNoSessionDesc}
            </p>
          </div>

          {checkMessage && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-neutral-300">
              <Activity className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>{checkMessage}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-white">
            <Wifi className="h-4 w-4 text-neutral-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider">{tr.liveLocalVanguardTitle}</h4>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {tr.liveLocalVanguardDesc}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-white">
            <Activity className="h-4 w-4 text-neutral-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider">{tr.liveRealRoundTitle}</h4>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {tr.liveRealRoundDesc}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-white">
            <ShieldCheck className="h-4 w-4 text-neutral-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider">{tr.liveFairPlayTitle}</h4>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {tr.liveFairPlayDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
