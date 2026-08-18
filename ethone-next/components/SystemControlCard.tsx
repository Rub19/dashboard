"use client";

import { useSettings, THEMES } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import BentoCard from "@/components/BentoCard";
import { type SessionMode } from "@/lib/settings";

const STATUSES: {
  id: "online" | "focus" | "busy" | "invisible";
  icon: string;
  label: string;
  classes: { text: string; bg: string; ring: string };
}[] = [
  {
    id: "online",
    icon: "circle",
    label: "statusOnline",
    classes: { text: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-400/40" },
  },
  {
    id: "focus",
    icon: "target",
    label: "statusFocus",
    classes: { text: "text-sky-400", bg: "bg-sky-500/10", ring: "ring-sky-400/40" },
  },
  {
    id: "busy",
    icon: "minus-circle",
    label: "statusBusy",
    classes: { text: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-400/40" },
  },
  {
    id: "invisible",
    icon: "eye-off",
    label: "statusInvisible",
    classes: { text: "text-violet-400", bg: "bg-violet-500/10", ring: "ring-violet-400/40" },
  },
];

const AURAS = ["classic", "boreal", "cyberpunk", "eclipse", "emerald", "mineral"] as const;

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
    const nextIndex = (currentIndex + delta + SESSION_MODES.length) % SESSION_MODES.length;
    update({ sessionMode: SESSION_MODES[nextIndex].id });
  }

  return (
    <BentoCard title={i18n("system")} icon="sliders-horizontal" className={className} scrollable={scrollable}>
      <div className="flex h-full min-h-0 flex-col justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--muted)]">{i18n("presence")}</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUSES.map((s) => {
              const active = settings.status === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => update({ status: s.id })}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] px-2 py-2 text-xs font-medium transition-all ${
                    active ? `${s.classes.bg} ${s.classes.text} ring-1 ${s.classes.ring}` : "bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon name={s.icon} className="h-3.5 w-3.5" />
                  {i18n(s.label)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--muted)]">{i18n("aura")}</p>
          <div className="-m-1 flex flex-wrap gap-2 p-1">
            {AURAS.map((aura) => {
              const active = settings.aura === aura;
              const key = `aura${aura.charAt(0).toUpperCase()}${aura.slice(1)}`;
              const theme = THEMES[aura as keyof typeof THEMES] || THEMES.default;
              return (
                <button
                  key={aura}
                  type="button"
                  onClick={() => update({ aura })}
                  title={i18n(key)}
                  style={{ backgroundColor: theme.background }}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] transition-all hover:scale-105 ${
                    active ? "ring-2 ring-inset ring-[var(--accent)]" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: theme.accent }}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[var(--muted)]">{i18n("sessionMode")}</p>
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-1">
            <button
              type="button"
              onClick={() => cycle(-1)}
              title={i18n("previous")}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <Icon name="chevron-left" className="h-3.5 w-3.5" />
            </button>
            <div className="flex flex-1 items-center justify-center gap-1.5 text-xs font-medium text-white">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
              {i18n(activeMode.label)}
            </div>
            <button
              type="button"
              onClick={() => cycle(1)}
              title={i18n("next")}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
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
