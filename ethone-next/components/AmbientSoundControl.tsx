"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { useSound } from "@/lib/sound";
import { useSettings } from "@/components/SettingsProvider";
import { cn } from "@/lib/utils";
import type { SoundAmbient } from "@/lib/settings";

const AMBIENT_SOUNDS = ["none", "rain", "wind", "ocean", "fireplace", "forest", "cafe", "night", "pink", "brown", "white", "drone"] as const;

const AMBIENT_ICONS: Record<string, string> = {
  none: "volume-x",
  rain: "cloud-rain",
  wind: "wind",
  ocean: "waves",
  fireplace: "flame",
  forest: "trees",
  cafe: "coffee",
  night: "moon",
  pink: "sparkles",
  brown: "coffee",
  white: "wind",
  drone: "disc",
};

const AMBIENT_LABELS: Record<string, string> = {
  none: "Aucun",
  rain: "Pluie",
  wind: "Vent",
  ocean: "Océan",
  fireplace: "Cheminée",
  forest: "Forêt",
  cafe: "Café",
  night: "Nuit",
  pink: "Rose",
  brown: "Brun",
  white: "Blanc",
  drone: "Drone",
};

export type AmbientSoundControlProps = {
  value?: string;
  onChange?: (value: string) => void;
  compact?: boolean;
};

function SoundWave({ active, reduced }: { active: boolean; reduced?: boolean }) {
  if (!active) return null;
  return (
    <div className="mt-1.5 flex h-2.5 items-end gap-px">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-0.5 rounded-full bg-[var(--accent-primary)]"
          animate={reduced ? { height: 6 } : { height: [4, 10, 6, 12, 6, 4] }}
          transition={
            reduced
              ? { duration: 0 }
              : {
                  duration: 1.2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: i * 0.12,
                  ease: "easeInOut",
                }
          }
          style={{ originY: 1 }}
        />
      ))}
    </div>
  );
}

export default function AmbientSoundControl({ value, onChange, compact }: AmbientSoundControlProps) {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { playAmbient, stopAmbient, ambientSound } = useSound();
  const reducedMotion = !!settings.reducedMotion;

  const current = (value ?? ambientSound) || "none";

  function toggle(id: string) {
    if (id === current) {
      if (onChange) onChange("none");
      else stopAmbient();
    } else {
      if (onChange) onChange(id);
      else playAmbient(id as SoundAmbient);
    }
  }

  return (
    <div
      className={cn(
        "flex w-full gap-2",
        compact ? "overflow-x-auto no-scrollbar" : "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"
      )}
    >
      {AMBIENT_SOUNDS.map((id) => {
        const active = current === id;
        const label = i18n(`ambientSound${id.charAt(0).toUpperCase() + id.slice(1)}`, AMBIENT_LABELS[id] ?? id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            className={cn(
              "group relative flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all active:scale-95",
              compact ? "min-w-[4.5rem] flex-1" : "",
              active
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shadow-[0_0_12px_-4px_var(--accent-primary)]"
                : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)]"
            )}
            title={label}
            aria-pressed={active}
          >
            <Icon
              name={AMBIENT_ICONS[id] || "disc"}
              className={cn("h-5 w-5 transition-transform group-hover:scale-110", active ? "text-[var(--accent-primary)]" : "")}
            />
            <span className="mt-1.5 text-[10px] font-medium">{label}</span>
            <SoundWave active={active} reduced={reducedMotion} />
            {active && !compact && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_6px_var(--accent-primary)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
