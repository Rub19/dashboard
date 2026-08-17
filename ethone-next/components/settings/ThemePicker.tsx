"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { THEMES } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import type { ThemeMode } from "@/lib/settings";

const THEME_LABELS: Record<ThemeMode, string> = {
  default: "Aura ETHONE",
  boreal: "Boréale",
  cyberpunk: "Cyberpunk",
  eclipse: "Éclipse",
  emerald: "Émeraude",
  night: "Nuit",
  graphite: "Graphite",
  day: "Jour",
  auto: "Auto",
  midnight: "Minuit",
  obsidian: "Obsidienne",
  aurora: "Aurore",
  minimal: "Minimal",
  focus: "Focus",
  glass: "Verre",
  oled: "OLED",
};

type ThemePickerProps = {
  themes: ThemeMode[];
  value: ThemeMode;
  onChange: (theme: ThemeMode) => void;
  showMore?: boolean;
};

export default function ThemePicker({ themes, value, onChange, showMore = true }: ThemePickerProps) {
  const i18n = useI18n();

  const featured = useMemo(
    () => themes.filter((t) => ["default", "cyberpunk", "obsidian", "minimal", "aurora"].includes(t)),
    [themes]
  );
  const more = useMemo(() => themes.filter((t) => !featured.includes(t)), [themes, featured]);

  function themeLabel(id: ThemeMode) {
    return i18n(`theme${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof typeof THEME_LABELS) || THEME_LABELS[id];
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {featured.map((id) => (
          <ThemeCard key={id} id={id} selected={value === id} onClick={() => onChange(id)} label={themeLabel(id)} />
        ))}
      </div>

      {showMore && more.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {more.map((id) => (
            <ThemeCard key={id} id={id} selected={value === id} onClick={() => onChange(id)} label={themeLabel(id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeCard({
  id,
  selected,
  onClick,
  label,
}: {
  id: ThemeMode;
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  const theme = THEMES[id];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-150 ${
        selected
          ? "bg-[var(--panel-bg)]"
          : "bg-zinc-950/60 border-white/[0.08] hover:border-white/20"
      }`}
      style={{
        borderColor: selected ? "var(--accent-color, var(--accent, #a855f7))" : undefined,
        boxShadow: selected ? "0 0 16px var(--accent-glow, rgba(168, 85, 247, 0.25))" : undefined,
      }}
    >
      <div
        className="mb-3 h-16 w-full overflow-hidden rounded-xl border shadow-inner"
        style={{
          background: `linear-gradient(135deg, ${theme.background}, ${theme.background}00)`,
          borderColor: selected ? "var(--accent-color, var(--accent, #a855f7))" : `${theme.accent}40`,
        }}
      >
        <div className="flex h-full items-end gap-2 p-2">
          <span
            className="h-6 w-6 rounded-full shadow-lg"
            style={{ backgroundColor: theme.accent, boxShadow: `0 0 12px ${theme.accent}80` }}
          />
          <span className="h-2 w-12 rounded-lg opacity-60" style={{ backgroundColor: theme.foreground }} />
          <span className="h-2 w-8 rounded-lg opacity-40" style={{ backgroundColor: theme.foreground }} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="block text-xs font-medium" style={{ color: theme.foreground }}>
            {label}
          </span>
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full ring-1 ring-white/10"
              style={{ backgroundColor: theme.background }}
              title="Fond"
            />
            <span
              className="h-2.5 w-2.5 rounded-full ring-1 ring-white/10"
              style={{ backgroundColor: theme.foreground }}
              title="Texte"
            />
            <span
              className="h-2.5 w-2.5 rounded-full ring-1 ring-white/10"
              style={{ backgroundColor: theme.accent }}
              title="Accent"
            />
          </div>
        </div>
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <CheckCircle2
                className="h-5 w-5"
                style={{ color: "var(--accent-color, var(--accent, #a855f7))" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}
