"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { type ThemeMode } from "@/lib/settings";
import {
  PREMIUM_THEMES,
  THEME_DEFINITIONS,
  applyTheme,
  resolvePremiumTheme,
} from "@/lib/theme-engine";

type PremiumThemePickerProps = {
  value: ThemeMode;
  onChange: (theme: ThemeMode) => void;
};

export default function PremiumThemePicker({ value, onChange }: PremiumThemePickerProps) {
  const resolvedValue = useMemo(() => resolvePremiumTheme(value), [value]);

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {PREMIUM_THEMES.map((id) => {
        const def = THEME_DEFINITIONS[id];
        const selected = resolvedValue === id;

        return (
          <motion.button
            key={id}
            type="button"
            onClick={() => {
              applyTheme(id);
              onChange(id);
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--border-active)] focus:ring-offset-2 focus:ring-offset-[var(--bg-main)] ${
              selected
                ? "ring-1 ring-[var(--accent-primary)] shadow-[0_0_18px_var(--glow-color)]"
                : "hover:shadow-[0_0_14px_var(--glow-color)]"
            }`}
            style={{
              backgroundColor: def.bgMain,
              borderColor: selected ? def.borderActive : def.borderSubtle,
              color: def.textPrimary,
            }}
            aria-pressed={selected}
          >
            {selected && (
              <span className="absolute right-1.5 top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full"
                style={{ backgroundColor: def.accentPrimary, color: def.bgMain }}>
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            )}

            <div className="p-2">
              {/* Miniature dashboard */}
              <div
                className="mb-2 aspect-[16/9] w-full overflow-hidden rounded-lg border"
                style={{ borderColor: def.borderSubtle, backgroundColor: def.bgMain }}
              >
                <div className="flex h-full w-full">
                  {/* Sidebar */}
                  <div
                    className="h-full w-1/4 border-r"
                    style={{ borderColor: def.borderSubtle, backgroundColor: def.bgSidebar }}
                  >
                    <div className="mt-2 ml-2 h-1.5 w-4 rounded-full" style={{ backgroundColor: def.accentPrimary }} />
                    <div className="mt-1.5 ml-2 h-1 w-6 rounded-full" style={{ backgroundColor: def.borderActive }} />
                  </div>
                  {/* Content */}
                  <div className="flex h-full flex-1 flex-col" style={{ backgroundColor: def.bgSurface }}>
                    {/* Top bar */}
                    <div
                      className="flex h-1/5 w-full items-center gap-2 border-b px-2"
                      style={{ borderColor: def.borderSubtle, backgroundColor: def.bgSidebar }}
                    >
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: def.accentPrimary }} />
                      <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: def.borderActive }} />
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

              {/* Color pastilles */}
              <div className="mb-1.5 flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: def.accentPrimary }}
                />
                <span
                  className="h-2 w-2 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: def.accentSecondary }}
                />
                <span
                  className="h-2 w-2 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: def.textMuted }}
                />
              </div>

              <h4 className="text-xs font-semibold" style={{ color: def.textPrimary }}>
                {def.label}
              </h4>
              <p className="mt-0.5 text-[10px] leading-tight" style={{ color: def.textMuted }}>
                {def.description}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
