"use client";

import { useId, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Moon, Sun, Sparkles, Palette } from "lucide-react";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon as IconifyIcon } from "@iconify/react";
import { useSettings } from "@/components/SettingsProvider";
import { useSettingsForm } from "./SettingsFormContext";
import Switch from "@/components/Switch";
import Select from "@/components/ui/Select";
import Slider from "@/components/ui/Slider";
import Tooltip from "@/components/Tooltip";
import { THEMES, ACCENTS } from "@/components/SettingsProvider";
import { type Settings, type ThemeMode, DEFAULTS } from "@/lib/settings";

const THEME_ORDER: ThemeMode[] = [
  "default",
  "cyberpunk",
  "obsidian",
  "minimal",
  "aurora",
  "boreal",
  "eclipse",
  "emerald",
  "night",
  "graphite",
  "day",
  "auto",
  "midnight",
  "focus",
  "glass",
  "oled",
];

const FEATURED_THEMES: ThemeMode[] = ["default", "cyberpunk", "obsidian", "minimal", "aurora"];
const MORE_THEMES: ThemeMode[] = THEME_ORDER.filter((t) => !FEATURED_THEMES.includes(t));

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

const ACCENT_COLORS = [
  { id: "violet", label: "Violet" },
  { id: "mint", label: "Menthe" },
  { id: "sky", label: "Ciel" },
  { id: "amber", label: "Ambre" },
  { id: "rose", label: "Rose" },
  { id: "teal", label: "Turquoise" },
  { id: "coral", label: "Corail" },
  { id: "custom", label: "Personnalisé" },
] as const;

const PACKS = [
  { id: "lucide", label: "Lucide" },
  { id: "phosphor", label: "Phosphor" },
  { id: "tabler", label: "Tabler" },
  { id: "heroicons", label: "Heroicons" },
  { id: "radix", label: "Radix" },
] as const;

const WALLPAPERS = [
  { id: "none", label: "wallpaperNone" },
  { id: "aurora", label: "wallpaperAurora" },
  { id: "nebula", label: "wallpaperNebula" },
  { id: "mesh", label: "wallpaperMesh" },
  { id: "noise", label: "wallpaperNoise" },
  { id: "grain", label: "wallpaperGrain" },
  { id: "mineral", label: "wallpaperMineral" },
] as const;

const AURAS = [
  { id: "classic", label: "auraClassic" },
  { id: "boreal", label: "auraBoreal" },
  { id: "cyberpunk", label: "auraCyberpunk" },
  { id: "eclipse", label: "auraEclipse" },
  { id: "emerald", label: "auraEmerald" },
  { id: "mineral", label: "auraMineral" },
] as const;

const BACKGROUNDS = [
  { id: "solid", label: "backgroundSolid" },
  { id: "gradient", label: "backgroundGradient" },
  { id: "mesh", label: "backgroundMesh" },
  { id: "aurora", label: "backgroundAurora" },
] as const;

const SHADOWS = [
  { id: "none", label: "shadowNone" },
  { id: "sm", label: "shadowSm" },
  { id: "md", label: "shadowMd" },
  { id: "glow", label: "shadowGlow" },
] as const;

const ICON_PACK_SAMPLE = "smile";

function getSampleIcon(pack: string) {
  const color = "#a1a1aa";
  switch (pack) {
    case "lucide":
      return { icon: `lucide:${ICON_PACK_SAMPLE}`, color };
    case "phosphor":
      return { icon: `ph:smiley`, color };
    case "tabler":
      return { icon: `tabler:mood-smile`, color };
    case "heroicons":
      return { icon: `heroicons:face-smile`, color };
    case "radix":
      return { icon: `radix-icons:face`, color };
    default:
      return { icon: `lucide:${ICON_PACK_SAMPLE}`, color };
  }
}

function themeLabel(i18n: ReturnType<typeof useI18n>, id: ThemeMode) {
  return i18n(`theme${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof typeof THEME_LABELS) || THEME_LABELS[id];
}

function isDirty(key: keyof Settings, value: unknown) {
  return JSON.stringify(value) !== JSON.stringify(DEFAULTS[key]);
}

export default function AppearanceSettings() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const form = useSettingsForm();
  const [moreThemesOpen, setMoreThemesOpen] = useState(false);
  const colorInputId = useId();

  const handleChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    form.updateInstant(key, value);
    update({ [key]: value } as Partial<Settings>);
  };

  const modifiedCount = useMemo(() => {
    const keys: (keyof Settings)[] = [
      "darkMode",
      "theme",
      "iconPack",
      "accentColor",
      "customAccent",
      "wallpaper",
      "aura",
      "glassEnabled",
      "cardTilt",
      "shadow",
      "backgroundEffect",
      "backgroundSpeed",
    ];
    return keys.filter((k) => isDirty(k, settings[k])).length;
  }, [settings]);

  const currentTheme = settings.theme;
  const currentAccent = settings.accentColor;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--muted)]">{i18n("appearanceDescription")}</p>
        <AnimatePresence>
          {modifiedCount > 0 && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-[10px] font-medium text-emerald-400"
            >
              {modifiedCount} {i18n("modified")}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Thèmes */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{i18n("theme")}</h3>
          <p className="text-xs text-[var(--muted)]">{i18n("themeDescription")}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {FEATURED_THEMES.map((id) => {
            const theme = THEMES[id];
            const selected = currentTheme === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleChange("theme", id)}
                className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition-all ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-2 ring-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--accent)]/50"
                }`}
              >
                <div
                  className="mb-3 h-16 w-full overflow-hidden rounded-xl border shadow-inner"
                  style={{
                    background: `linear-gradient(135deg, ${theme.background}, ${theme.background}00)`,
                    borderColor: `${theme.accent}40`,
                  }}
                >
                  <div className="flex h-full items-end gap-2 p-2">
                    <span
                      className="h-6 w-6 rounded-full shadow-lg"
                      style={{ backgroundColor: theme.accent, boxShadow: `0 0 12px ${theme.accent}80` }}
                    />
                    <span className="h-2 w-12 rounded-full opacity-60" style={{ backgroundColor: theme.foreground }} />
                    <span className="h-2 w-8 rounded-full opacity-40" style={{ backgroundColor: theme.foreground }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--foreground)]">{themeLabel(i18n, id)}</span>
                  {selected && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMoreThemesOpen(!moreThemesOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)]/50"
          >
            <span className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-[var(--muted)]" />
              {i18n("moreThemes")}
            </span>
            <Icon name={moreThemesOpen ? "chevronUp" : "chevronDown"} className="h-4 w-4 text-[var(--muted)]" />
          </button>
          <AnimatePresence>
            {moreThemesOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="mt-2 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {MORE_THEMES.map((id) => {
                    const theme = THEMES[id];
                    const selected = currentTheme === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleChange("theme", id)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                          selected
                            ? "border-[var(--accent)] bg-[var(--accent)]/10"
                            : "border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--accent)]/50"
                        }`}
                      >
                        <span
                          className="h-5 w-5 flex-shrink-0 rounded-full border"
                          style={{
                            backgroundColor: theme.background,
                            borderColor: theme.accent,
                            boxShadow: `inset 0 0 0 2px ${theme.accent}40`,
                          }}
                        />
                        <span className="truncate text-[var(--foreground)]">{themeLabel(i18n, id)}</span>
                        {selected && <Check className="ml-auto h-3.5 w-3.5 text-[var(--accent)]" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Couleur d'accent */}
      <SettingRow label={i18n("accentColor")} description={i18n("accentColorDescription")}>
        <div className="flex flex-wrap items-center gap-3">
          {ACCENT_COLORS.map((color) => {
            if (color.id === "custom") {
              return (
                <Tooltip key={color.id} label={i18n(color.id)}>
                  <label
                    className={`relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${
                      currentAccent === "custom"
                        ? "border-white shadow-[0_0_12px_rgba(255,255,255,0.35)]"
                        : "border-[var(--border)] hover:border-white/50"
                    }`}
                    style={{ background: settings.customAccent }}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-white/80" />
                    <input
                      id={colorInputId}
                      type="color"
                      value={settings.customAccent}
                      onChange={(e) => {
                        handleChange("customAccent", e.target.value);
                        handleChange("accentColor", "custom");
                      }}
                      className="sr-only"
                      aria-label={i18n("customAccent")}
                    />
                  </label>
                </Tooltip>
              );
            }
            const hex = ACCENTS[color.id] || "#8b5cf6";
            const selected = currentAccent === color.id;
            return (
              <Tooltip key={color.id} label={i18n(color.id)}>
                <button
                  type="button"
                  onClick={() => handleChange("accentColor", color.id)}
                  className={`relative h-7 w-7 rounded-full transition-all hover:scale-110 active:scale-95 ${
                    selected
                      ? "ring-2 ring-white shadow-[0_0_12px_rgba(255,255,255,0.35)]"
                      : "ring-1 ring-white/10 hover:ring-white/40"
                  }`}
                  style={{ backgroundColor: hex }}
                  aria-label={i18n(color.id)}
                >
                  {selected && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </SettingRow>

      {/* Pack d'icônes */}
      <SettingRow label={i18n("iconPack")} description={i18n("iconPackDescription")}>
        <div className="flex items-center gap-1 rounded-xl bg-[var(--surface-raised)] p-1">
          {PACKS.map((pack) => {
            const active = settings.iconPack === pack.id;
            const sample = getSampleIcon(pack.id);
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => handleChange("iconPack", pack.id)}
                className="relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors"
              >
                {active && (
                  <motion.div
                    layoutId="activeIconPack"
                    className="absolute inset-0 rounded-lg bg-[var(--accent)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 ${active ? "text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
                  <IconifyIcon icon={sample.icon} className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{pack.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </SettingRow>

      {/* Mode sombre */}
      <SettingRow label={i18n("darkMode")} description={i18n("darkModeDescription")}>
        <div className="flex items-center gap-3">
          <Sun className="h-4 w-4 text-[var(--muted)]" />
          <Switch checked={settings.darkMode} onChange={(v) => handleChange("darkMode", v)} labels={false} size="md" />
          <Moon className="h-4 w-4 text-[var(--foreground)]" />
        </div>
      </SettingRow>

      {/* Effets */}
      <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/40 p-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{i18n("effects")}</h3>

        <SettingRow label={i18n("glassmorphism")} description={i18n("glassmorphismDescription")}>
          <Switch checked={settings.glassEnabled} onChange={(v) => handleChange("glassEnabled", v)} labels={false} size="sm" />
        </SettingRow>

        <SettingRow label={i18n("cardTilt3d")} description={i18n("cardTilt3dDescription")}>
          <Switch checked={settings.cardTilt} onChange={(v) => handleChange("cardTilt", v)} labels={false} size="sm" />
        </SettingRow>

        <SettingRow label={i18n("shadow")} description={i18n("shadowDescription")}>
          <Select
            value={settings.shadow}
            onChange={(v) => handleChange("shadow", v as Settings["shadow"])}
            options={SHADOWS.map((s) => ({ id: s.id, label: i18n(s.label) }))}
            aria-label={i18n("shadow")}
          />
        </SettingRow>

        <SettingRow label={i18n("background")} description={i18n("backgroundDescription")}>
          <Select
            value={settings.backgroundEffect}
            onChange={(v) => handleChange("backgroundEffect", v as Settings["backgroundEffect"])}
            options={BACKGROUNDS.map((b) => ({ id: b.id, label: i18n(b.label) }))}
            aria-label={i18n("background")}
          />
        </SettingRow>

        <SettingRow label={i18n("backgroundSpeed")} description={i18n("backgroundSpeedDescription")}>
          <div className="w-40">
            <Slider
              value={settings.backgroundSpeed}
              onChange={(v) => handleChange("backgroundSpeed", v)}
              min={0}
              max={100}
              step={1}
              unit="%"
              showValue
              aria-label={i18n("backgroundSpeed")}
            />
          </div>
        </SettingRow>

        <SettingRow label={i18n("wallpaper")} description={i18n("wallpaperDescription")}>
          <Select
            value={settings.wallpaper}
            onChange={(v) => handleChange("wallpaper", v as Settings["wallpaper"])}
            options={WALLPAPERS.map((w) => ({ id: w.id, label: i18n(w.label) }))}
            aria-label={i18n("wallpaper")}
          />
        </SettingRow>

        <SettingRow label={i18n("aura")} description={i18n("auraDescription")}>
          <Select
            value={settings.aura}
            onChange={(v) => handleChange("aura", v as Settings["aura"])}
            options={AURAS.map((a) => ({ id: a.id, label: i18n(a.label) }))}
            aria-label={i18n("aura")}
          />
        </SettingRow>
      </section>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-[var(--foreground)]">{label}</h4>
        {description && <p className="text-xs text-[var(--muted)]">{description}</p>}
      </div>
      <div className="flex items-center justify-end">{children}</div>
    </div>
  );
}
