"use client";

import { useMemo } from "react";
import { Sparkles, Check, Heart, Shield, Bell, Zap, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/SettingsProvider";
import { PRESET_THEMES, type PremiumThemeId } from "@/lib/theme-tokens";

export type LiveThemePreviewProps = {
  themeId?: string;
  accentHex?: string;
  className?: string;
};

export default function LiveThemePreview({ themeId, accentHex, className }: LiveThemePreviewProps) {
  const { settings } = useSettings();

  const activeThemeId = (themeId || settings.theme) as PremiumThemeId;
  const themeDef = PRESET_THEMES[activeThemeId] || PRESET_THEMES.obsidian;
  const activeAccent = accentHex || settings.customAccent || themeDef.accentPrimary;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-[var(--panel-border)]/70 p-5 shadow-2xl backdrop-blur-2xl transition-all duration-300 select-none",
        className
      )}
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        boxShadow: "0 12px 36px -8px var(--glow-color)",
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[var(--panel-border)]/50 pb-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-lg shadow-xs"
            style={{ backgroundColor: "var(--accent-primary)", color: "var(--accent-contrast)" }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold text-[var(--text-primary)]">
            Aperçu Direct du Theme Engine
          </span>
        </div>

        <span
          className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{
            backgroundColor: "var(--accent-soft)",
            color: "var(--accent-primary)",
            borderColor: "var(--border-active)",
          }}
        >
          {themeDef.label}
        </span>
      </div>

      {/* Main Preview Playground */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column: Buttons & Form */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex-1 rounded-xl py-2 px-3 text-xs font-bold shadow-sm transition-all hover:opacity-90 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: "var(--accent-primary)",
                color: "var(--accent-contrast)",
              }}
            >
              Bouton Accent Principal
            </button>

            <button
              type="button"
              className="rounded-xl border py-2 px-3 text-xs font-semibold transition-all hover:bg-white/5 active:scale-95 cursor-pointer"
              style={{
                borderColor: "var(--border-subtle)",
                backgroundColor: "var(--bg-surface-elevated)",
                color: "var(--text-primary)",
              }}
            >
              Secondaire
            </button>
          </div>

          {/* Sample Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              readOnly
              value="Champ textuel avec halo dynamique..."
              className="w-full rounded-xl border py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] focus:outline-none"
              style={{
                backgroundColor: "var(--bg-input)",
                borderColor: "var(--border-subtle)",
              }}
            />
          </div>
        </div>

        {/* Right column: Cards & Status Badges */}
        <div className="space-y-3">
          <div
            className="rounded-2xl border p-3"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" style={{ color: "var(--accent-primary)" }} />
                Surface Bento Card
              </span>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--accent-primary)" }} />
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-muted)] leading-relaxed">
              La hiérarchie de contraste et les bordures s'adaptent instantanément à votre teinte.
            </p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              Succès
            </span>
            <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              Alerte
            </span>
            <span
              className="rounded-md border px-2 py-0.5 text-[10px] font-bold"
              style={{
                borderColor: "var(--border-active)",
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent-primary)",
              }}
            >
              Accent Actif
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
