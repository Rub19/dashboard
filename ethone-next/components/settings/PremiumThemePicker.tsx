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
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5">
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
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            className={`group relative overflow-hidden rounded-xl border text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--border-active)] focus:ring-offset-2 focus:ring-offset-[var(--bg-main)] ${
              selected
                ? "ring-1 ring-[var(--accent-primary)] shadow-[0_0_12px_var(--glow-color)]"
                : "hover:shadow-[0_0_8px_var(--glow-color)]"
            }`}
            style={{
              backgroundColor: def.bgMain,
              borderColor: selected ? def.borderActive : def.borderSubtle,
              color: def.textPrimary,
            }}
            aria-pressed={selected}
          >
            {selected && (
              <span className="absolute right-1 top-1 z-10 flex h-3 w-3 items-center justify-center rounded-full"
                style={{ backgroundColor: def.accentPrimary, color: def.bgMain }}>
                <Check className="h-2 w-2" strokeWidth={3} />
              </span>
            )}

            <div className="p-1.5">
              {/* Miniature dashboard */}
              <div
                className="mb-1.5 aspect-[2/1] w-full overflow-hidden rounded-md border"
                style={{ borderColor: def.borderSubtle, backgroundColor: def.bgMain }}
              >
                <div className="flex h-full w-full">
                  {/* Sidebar */}
                  <div
                    className="h-full w-1/5 border-r"
                    style={{ borderColor: def.borderSubtle, backgroundColor: def.bgSidebar }}
                  >
                    <div className="mt-1.5 ml-1.5 h-1 w-3 rounded-full" style={{ backgroundColor: def.accentPrimary }} />
                    <div className="mt-1 ml-1.5 h-0.5 w-4 rounded-full" style={{ backgroundColor: def.borderActive }} />
                  </div>
                  {/* Content */}
                  <div className="flex h-full flex-1 flex-col" style={{ backgroundColor: def.bgSurface }}>
                    {/* Top bar */}
                    <div
                      className="flex h-1/5 w-full items-center gap-1 border-b px-1.5"
                      style={{ borderColor: def.borderSubtle, backgroundColor: def.bgSidebar }}
                    >
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: def.accentPrimary }} />
                      <div className="h-1 w-8 rounded-full" style={{ backgroundColor: def.borderActive }} />
                    </div>
                    {/* Pane */}
                    <div className="flex-1 p-1.5">
                      <div
                        className="mb-1 h-1/3 w-3/4 rounded-sm"
                        style={{ backgroundColor: def.borderSubtle }}
                      />
                      <div
                        className="h-1/4 w-1/2 rounded-sm"
                        style={{ backgroundColor: def.borderActive }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Color pastilles */}
              <div className="mb-1 flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: def.accentPrimary }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: def.accentSecondary }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: def.textMuted }}
                />
              </div>

              <h4 className="text-[10px] font-semibold leading-tight" style={{ color: def.textPrimary }}>
                {def.label}
              </h4>
              <p className="mt-0.5 line-clamp-2 text-[9px] leading-tight" style={{ color: def.textMuted }}>
                {def.description}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
