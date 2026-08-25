"use client";

import { memo, useCallback } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import BentoCard from "@/components/BentoCard";
import { cn } from "@/lib/utils";
import { hapticSelectionTick, hapticMediumImpact } from "@/lib/haptics";
import { setNativePresence } from "@/lib/apple";
import { type SessionMode, USER_STATUS_CONFIG } from "@/lib/settings";
import PresenceGlyph from "@/components/icons/PresenceGlyph";

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

const SystemControlCard = memo(function SystemControlCard({ className = "", scrollable = true }: { className?: string; scrollable?: boolean }) {
  const i18n = useI18n();
  const { settings, update } = useSettings();

  const activeModeIndex = SESSION_MODES.findIndex((m) => m.id === settings.sessionMode);
  const currentIndex = activeModeIndex >= 0 ? activeModeIndex : 0;
  const activeMode = SESSION_MODES[currentIndex];

  const cycle = useCallback((delta: number) => {
    hapticMediumImpact();
    const nextIndex = (currentIndex + delta + SESSION_MODES.length) % SESSION_MODES.length;
    update({ sessionMode: SESSION_MODES[nextIndex].id });
  }, [currentIndex, update]);

  return (
    <BentoCard title={i18n("system")} icon="sliders-horizontal" className={cn("h-full", className)} scrollable={scrollable}>
      <div className="flex flex-1 flex-col justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-muted)]">{i18n("presence")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(USER_STATUS_CONFIG).map(([id, config]) => {
              const active = settings.status === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    hapticMediumImpact();
                    update({ status: id as keyof typeof USER_STATUS_CONFIG });
                    void setNativePresence(config.presence);
                  }}
                  aria-pressed={active}
                  className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[var(--text-primary)]/[0.08] px-2.5 py-2 text-[11px] font-medium transition-all duration-150 active:scale-95 ${
                    active
                      ? `${config.bg} ${config.text} ring-1 ${config.ring} shadow-sm`
                      : "bg-[var(--text-primary)]/[0.02] text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/20"
                  }`}
                >
                  <PresenceGlyph status={id as keyof typeof USER_STATUS_CONFIG} className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-center leading-tight whitespace-normal">{i18n(config.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-muted)]">{i18n("aura")}</p>
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
                  aria-label={i18n(key)}
                  style={{ backgroundColor: palette.background }}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--text-primary)]/[0.08] transition-all duration-150 hover:scale-110 active:scale-95 sm:h-8 sm:w-8 ${
                    active ? "ring-2 ring-inset ring-[var(--accent-primary)] shadow-sm" : "opacity-70 hover:opacity-100 hover:border-[var(--accent-primary)]/40"
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
          <p className="text-xs font-medium text-[var(--text-muted)]">{i18n("sessionMode")}</p>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.02] p-1">
            <button
              type="button"
              onClick={() => cycle(-1)}
              title={i18n("previous")}
              aria-label={i18n("previous")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-all duration-150 hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] active:scale-90 sm:h-7 sm:w-7"
            >
              <Icon name="chevron-left" className="h-3.5 w-3.5" />
            </button>
            <div className="flex flex-1 items-center justify-center gap-1.5 px-1 text-center text-xs font-medium text-[var(--text-primary)]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden="true" />
              <span>{i18n(activeMode.label)}</span>
            </div>
            <button
              type="button"
              onClick={() => cycle(1)}
              title={i18n("next")}
              aria-label={i18n("next")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-all duration-150 hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] active:scale-90 sm:h-7 sm:w-7"
            >
              <Icon name="chevron-right" className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="px-1 text-[11px] leading-relaxed text-[var(--text-muted)]">{i18n(activeMode.copy)}</p>
        </div>
      </div>
    </BentoCard>
  );
});

export default SystemControlCard;
