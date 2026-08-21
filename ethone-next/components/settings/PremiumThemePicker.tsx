"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, CloudOff, Cloud } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useSyncStore } from "@/lib/stores/sync";
import { type ThemeMode } from "@/lib/settings";
import {
  PREMIUM_THEMES,
  THEME_DEFINITIONS,
  resolvePremiumTheme,
} from "@/lib/theme-engine";
import { transitionTheme } from "@/lib/theme-transition";

type PremiumThemePickerProps = {
  value: ThemeMode;
  onChange: (theme: ThemeMode) => void;
};

export default function PremiumThemePicker({ value, onChange }: PremiumThemePickerProps) {
  const { settings } = useSettings();
  const resolvedValue = useMemo(() => resolvePremiumTheme(value), [value]);
  const syncStatus = useSyncStore((s) => s.status);

  const handleSelect = (id: string) => {
    if (id === resolvedValue) return;
    transitionTheme(id, (themeId) => onChange(themeId as ThemeMode), {
      accentColor: settings.accentColor,
      customAccent: settings.customAccent,
      reducedMotion: settings.reducedMotion,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PREMIUM_THEMES.map((id) => {
          const def = THEME_DEFINITIONS[id];
          const selected = resolvedValue === id;

          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`group relative overflow-hidden rounded-2xl border-2 text-left transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--border-active)] focus:ring-offset-2 focus:ring-offset-[var(--bg-main)] ${
                selected
                  ? "border-[var(--accent-primary)] shadow-[0_0_24px_var(--glow-color)]"
                  : "border-transparent hover:shadow-[0_0_16px_var(--glow-color)]"
              }`}
              style={{
                backgroundColor: def.bgMain,
                color: def.textPrimary,
              }}
              aria-pressed={selected}
            >
              {/* Selected checkmark */}
              <AnimatePresence>
                {selected && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: def.accentPrimary, color: def.bgMain }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Subtle accent glow wash */}
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${def.accentPrimary}, transparent 60%)`,
                }}
              />

              <div className="relative p-3">
                {/* Dashboard miniature */}
                <div
                  className="mb-3 aspect-[16/10] w-full overflow-hidden rounded-xl border"
                  style={{ borderColor: def.borderSubtle, backgroundColor: def.bgMain }}
                >
                  <div className="flex h-full w-full">
                    {/* Sidebar */}
                    <div
                      className="h-full w-1/4 border-r"
                      style={{ borderColor: def.borderSubtle, backgroundColor: def.bgSidebar }}
                    >
                      <div className="mt-2 ml-2 h-1.5 w-5 rounded-full" style={{ backgroundColor: def.accentPrimary }} />
                      <div className="mt-2 ml-2 h-1 w-8 rounded-full" style={{ backgroundColor: def.borderActive }} />
                      <div className="mt-1.5 ml-2 h-1 w-6 rounded-full" style={{ backgroundColor: def.borderSubtle }} />
                    </div>
                    {/* Content */}
                    <div className="flex h-full flex-1 flex-col" style={{ backgroundColor: def.bgSurface }}>
                      {/* Top bar */}
                      <div
                        className="flex h-1/5 w-full items-center gap-1.5 border-b px-2"
                        style={{ borderColor: def.borderSubtle, backgroundColor: def.bgSidebar }}
                      >
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: def.accentPrimary }} />
                        <div className="h-1 w-10 rounded-full" style={{ backgroundColor: def.borderActive }} />
                      </div>
                      {/* Pane */}
                      <div className="flex-1 p-2">
                        <div
                          className="mb-2 h-1/3 w-3/4 rounded-md"
                          style={{ backgroundColor: def.borderSubtle }}
                        />
                        <div
                          className="h-1/4 w-1/2 rounded-md"
                          style={{ backgroundColor: def.borderActive }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Color chips */}
                <div className="mb-2 flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-white/20"
                    style={{ backgroundColor: def.accentPrimary }}
                  />
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-white/20"
                    style={{ backgroundColor: def.accentSecondary }}
                  />
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-white/20"
                    style={{ backgroundColor: def.textMuted }}
                  />
                </div>

                <h4 className="text-xs font-semibold leading-tight" style={{ color: def.textPrimary }}>
                  {def.label}
                </h4>
                <p className="mt-1 line-clamp-2 text-[10px] leading-tight" style={{ color: def.textMuted }}>
                  {def.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
        {syncStatus === "syncing" ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Synchronisation Supabase...</span>
          </>
        ) : syncStatus === "error" ? (
          <>
            <CloudOff className="h-3 w-3" />
            <span>Sauvegarde locale uniquement</span>
          </>
        ) : syncStatus === "offline" ? (
          <>
            <CloudOff className="h-3 w-3" />
            <span>Hors ligne</span>
          </>
        ) : (
          <>
            <Cloud className="h-3 w-3" />
            <span>Sauvegardé via Supabase</span>
          </>
        )}
      </div>
    </div>
  );
}
