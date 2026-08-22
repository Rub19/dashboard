"use client";

import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import BentoCard from "@/components/BentoCard";
import { cn } from "@/lib/utils";
import { hapticSelectionTick, hapticMediumImpact } from "@/lib/haptics";
import { type SessionMode, USER_STATUS_CONFIG } from "@/lib/settings";

const AURAS = ["classic", "boreal", "cyberpunk", "eclipse", "emerald", "mineral"] as const;

const AURA_COLORS: Record<string, { background: string; accent: string }> = {
  classic: { background: "#0a0a0a", accent: "#8b5cf6" },
  boreal: { background: "#081016", accent: "#06b6d4" },
  cyberpunk: { background: "#0f0514", accent: "#f43f5e" },
  eclipse: { background: "#050505", accent: "#d4af37" },
  emerald: { background: "#05140f", accent: "#10b981" },
  mineral: { background: "#0a0a0a", accent: "#38bdf8" },
};

const SESSION_MODES: { id: SessionMode; icon: string; label: string; copy: string }[] = [
  { id: "default", icon: "circle", label: "sessionModeDefault", copy: "sessionModeDefaultCopy" },
  { id: "focus", icon: "target", label: "sessionModeFocus", copy: "sessionModeFocusCopy" },
  { id: "intense", icon: "zap", label: "sessionModeIntense", copy: "sessionModeIntenseCopy" },
  { id: "zen", icon: "coffee", label: "sessionModeZen", copy: "sessionModeZenCopy" },
  { id: "night", icon: "moon", label: "sessionModeNight", copy: "sessionModeNightCopy" },
];

export default function SystemControlCard({ className = "", scrollable = true }: { className?: string; scrollable?: boolean }) {
  const i18n = useI18n();
  const { settings, update } = useSettings();

  const activeModeIndex = SESSION_MODES.findIndex((m) => m.id === settings.sessionMode);
  const currentIndex = activeModeIndex >= 0 ? activeModeIndex : 0;
  const activeMode = SESSION_MODES[currentIndex];

  function cycle(delta: number) {
    hapticMediumImpact();
    const nextIndex = (currentIndex + delta + SESSION_MODES.length) % SESSION_MODES.length;
    update({ sessionMode: SESSION_MODES[nextIndex].id });
  }

  return (
    <BentoCard title={i18n("system")} icon="sliders-horizontal" className={cn("h-full", className)} scrollable={scrollable}>
      <div className="flex flex-1 flex-col justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--muted)]">{i18n("presence")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(USER_STATUS_CONFIG).map(([id, config]) => {
              const active = settings.status === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { hapticMediumImpact(); update({ status: id as keyof typeof USER_STATUS_CONFIG }); }}
                  className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[var(--text-primary)]/[0.08] px-2 py-2 text-[10px] font-medium transition-all ${
                    active ? `${config.bg} ${config.text} ring-1 ${config.ring}` : "bg-[var(--text-primary)]/[0.02] text-[var(--muted)] hover:bg-[var(--text-primary)]/[0.04]"
                  }`}
                >
                  <Icon name={config.icon} className="h-3.5 w-3.5" />
                  {i18n(config.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--muted)]">{i18n("aura")}</p>
          <div className="-m-1 flex flex-wrap items-center justify-center gap-2 p-1 sm:justify-start">
            {AURAS.map((aura) => {
              const active = settings.aura === aura;
              const key = `aura${aura.charAt(0).toUpperCase()}${aura.slice(1)}`;
              const palette = AURA_COLORS[aura] || AURA_COLORS.classic;
              return (
                <button
                  key={aura}
                  type="button"
                  onClick={() => { hapticSelectionTick(); update({ aura }); }}
                  title={i18n(key)}
                  style={{ backgroundColor: palette.background }}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--text-primary)]/[0.08] transition-all hover:scale-105 sm:h-8 sm:w-8 ${
                    active ? "ring-2 ring-inset ring-[var(--accent-primary)]" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: palette.accent }}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[var(--muted)]">{i18n("sessionMode")}</p>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.02] p-1">
            <button
              type="button"
              onClick={() => cycle(-1)}
              title={i18n("previous")}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)] sm:h-7 sm:w-7"
            >
              <Icon name="chevron-left" className="h-3.5 w-3.5" />
            </button>
            <div className="flex flex-1 items-center justify-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
              {i18n(activeMode.label)}
            </div>
            <button
              type="button"
              onClick={() => cycle(1)}
              title={i18n("next")}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)] sm:h-7 sm:w-7"
            >
              <Icon name="chevron-right" className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="px-1 text-[10px] text-[var(--muted)]">{i18n(activeMode.copy)}</p>
        </div>
      </div>
    </BentoCard>
  );
}
