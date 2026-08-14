"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSound } from "@/lib/sound";
import { Icon } from "@/lib/icons";
import { DEFAULTS } from "@/lib/settings";
import { subscribePush, unsubscribePush } from "@/lib/push";
import {
  BUILT_IN_PRESETS,
  applyPreset,
  extractPresetFromState,
  loadCustomPresets,
  saveCustomPresets,
  addCustomPreset,
  removeCustomPreset,
  sanitizePreset,
  type Preset,
} from "@/lib/presets";
import { AiProviderPanel } from "@/components/AiProviderPanel";
import LiveSettings from "@/components/LiveSettings";
import SettingsSection from "./SettingsSection";
import SettingField, { type FieldDef } from "./SettingField";
import { SwitchControl } from "./SettingControls";
import { useSettingsForm } from "./SettingsFormContext";
import { useModifiedCount } from "./useModifiedCount";
import AppearanceSettings from "./AppearanceSettings";

const THEMES = [
  { id: "default", label: "Aura ETHONE" },
  { id: "boreal", label: "Boréale" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "eclipse", label: "Éclipse" },
  { id: "emerald", label: "Émeraude" },
  { id: "night", label: "Nuit" },
  { id: "graphite", label: "Graphite" },
  { id: "day", label: "Jour" },
  { id: "auto", label: "Auto" },
  { id: "midnight", label: "Minuit" },
  { id: "obsidian", label: "Obsidienne" },
  { id: "aurora", label: "Aurore" },
  { id: "minimal", label: "Minimal" },
  { id: "focus", label: "Focus" },
  { id: "glass", label: "Verre" },
  { id: "oled", label: "OLED" },
] as const;

const LANGUAGES = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "de", label: "Deutsch" },
] as const;

const PACKS = [
  { id: "lucide", label: "Lucide" },
  { id: "phosphor", label: "Phosphor" },
  { id: "tabler", label: "Tabler" },
  { id: "heroicons", label: "Heroicons" },
  { id: "radix", label: "Radix" },
] as const;

const DENSITY_MODES = [
  { id: "spacious", label: "Spacieux" },
  { id: "comfortable", label: "Confortable" },
  { id: "compact", label: "Compact" },
  { id: "dense", label: "Dense" },
  { id: "ultra-compact", label: "Ultra-compact" },
  { id: "normal", label: "Normal" },
  { id: "airy", label: "Aéré" },
  { id: "ultra", label: "Ultra" },
  { id: "automatic", label: "Automatique" },
  { id: "custom", label: "Personnalisé" },
] as const;

const BACKGROUNDS = [
  { id: "solid", label: "backgroundSolid" },
  { id: "gradient", label: "backgroundGradient" },
  { id: "mesh", label: "backgroundMesh" },
  { id: "aurora", label: "backgroundAurora" },
] as const;

const LAYOUTS = [
  { id: "default", label: "layoutDefault" },
  { id: "minimal", label: "layoutMinimal" },
  { id: "dock-only", label: "layoutDockOnly" },
  { id: "sidebar-only", label: "layoutSidebarOnly" },
] as const;

const ACCENT_COLORS = [
  { id: "violet", label: "accentViolet" },
  { id: "mint", label: "accentMint" },
  { id: "sky", label: "accentSky" },
  { id: "amber", label: "accentAmber" },
  { id: "rose", label: "accentRose" },
  { id: "teal", label: "accentTeal" },
  { id: "coral", label: "accentCoral" },
  { id: "custom", label: "accentCustom" },
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

const FONTS = [
  { id: "inter", label: "Inter" },
  { id: "outfit", label: "Outfit" },
  { id: "jetbrains", label: "JetBrains Mono" },
  { id: "editorial", label: "Editorial Serif" },
  { id: "sans", label: "fontSans" },
  { id: "mono", label: "fontMono" },
  { id: "serif", label: "fontSerif" },
] as const;

const RADIUS_STYLES = [
  { id: "rounded", label: "Arrondi" },
  { id: "soft", label: "Doux" },
  { id: "sharp", label: "Net" },
] as const;

const ICON_RADIUSES = [
  { id: "square", label: "Carré" },
  { id: "rounded", label: "Arrondi" },
  { id: "circle", label: "Rond" },
  { id: "pill", label: "Pill" },
] as const;

const DOCK_SCALES = [
  { id: "compact", label: "dockScaleCompact" },
  { id: "normal", label: "dockScaleNormal" },
  { id: "large", label: "dockScaleLarge" },
] as const;

const DOCK_ALIGNS = [
  { id: "center", label: "dockAlignCenter" },
  { id: "left", label: "dockAlignLeft" },
  { id: "right", label: "dockAlignRight" },
  { id: "stretch", label: "dockAlignStretch" },
] as const;

const DOCK_GLASS = [
  { id: "vitrified", label: "dockGlassVitrified" },
  { id: "ultra-blur", label: "dockGlassUltraBlur" },
  { id: "sober", label: "dockGlassSober" },
] as const;

const UI_ANIMATION_STYLES = [
  { id: "smooth", label: "Fluide" },
  { id: "snappy", label: "Rapide" },
  { id: "reduced", label: "Réduit" },
] as const;

const PERFORMANCE_MODES = [
  { id: "normal", label: "performanceNormal" },
  { id: "low", label: "performanceLow" },
] as const;

const STATUSES = [
  { id: "online", label: "statusOnline" },
  { id: "busy", label: "statusBusy" },
  { id: "focus", label: "statusFocus" },
  { id: "away", label: "statusAway" },
  { id: "invisible", label: "statusInvisible" },
] as const;

const NAV_ITEMS = [
  { id: "home", label: "home" },
  { id: "notes", label: "notes" },
  { id: "tasks", label: "tasks" },
  { id: "calendar", label: "calendar" },
  { id: "files", label: "files" },
  { id: "bills", label: "bills" },
  { id: "activity", label: "activity" },
  { id: "interactions", label: "interactions" },
  { id: "connections", label: "connections" },
  { id: "plugins", label: "plugins" },
  { id: "spaces", label: "spaces" },
  { id: "flows", label: "flows" },
  { id: "brain", label: "brain" },
  { id: "focus", label: "focus" },
  { id: "team", label: "team" },
  { id: "mail", label: "mail" },
  { id: "weather", label: "weather" },
  { id: "settings", label: "settings" },
] as const;

const BRAIN_PERMISSION_IDS = [
  "notes",
  "tasks",
  "calendar",
  "connections",
  "gaming",
  "activity",
  "files",
  "profile",
  "settings",
  "mail",
] as const;

const BRAIN_MEMORY_IDS = [
  "interface",
  "habits",
  "widgets",
  "schedules",
  "taskTypes",
  "spaces",
  "flows",
  "goals",
] as const;

const SOUND_PACKS = [
  "ethone",
  "minimal",
  "classic",
  "apple-inspired",
  "cyber-pulse",
  "silent",
] as const;

const AMBIENT_TYPES = ["none", "pink", "brown", "white", "rain", "drone"] as const;

const SHADOWS = ["none", "sm", "md", "glow"] as const;

const DENSITY_CUSTOM_KEYS = [
  { key: "fontScale", min: 75, max: 125, unit: "" },
  { key: "lineHeight", min: 100, max: 200, unit: "" },
  { key: "cardPadding", min: 8, max: 32, unit: "px" },
  { key: "sectionGap", min: 8, max: 32, unit: "px" },
  { key: "controlHeight", min: 32, max: 56, unit: "px" },
  { key: "iconSize", min: 16, max: 28, unit: "px" },
  { key: "rowHeight", min: 32, max: 72, unit: "px" },
  { key: "toolbarHeight", min: 40, max: 72, unit: "px" },
] as const;

type SectionDef = {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
  fields: FieldDef[];
  children?: React.ReactNode;
  skipFields?: boolean;
};

function PresetsPanel() {
  const { settings, update, applyPreset: applyPresetFromProvider } = useSettings();
  const i18n = useI18n();
  const [customPresets, setCustomPresets] = useState<Preset[]>(() => loadCustomPresets());
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDescription, setNewPresetDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveCustomPresets(customPresets);
  }, [customPresets]);

  const showMessage = useCallback(
    (text: string) => {
      setMessage(text);
      window.setTimeout(() => setMessage(null), 3000);
    },
    [setMessage]
  );

  const handleApply = useCallback(
    (preset: Preset) => {
      const result = applyPresetFromProvider
        ? applyPresetFromProvider(preset)
        : applyPreset(preset, settings, update);
      if (result && "ok" in result && result.ok) {
        showMessage(i18n("presetApplied").replace("{{name}}", result.preset.name));
      } else {
        showMessage(i18n("presetApplyError"));
      }
    },
    [applyPresetFromProvider, settings, update, i18n, showMessage]
  );

  const handleExtract = useCallback(() => {
    const name = newPresetName.trim() || i18n("myPreset");
    const description = newPresetDescription.trim();
    const preset = extractPresetFromState(settings, name, description, "sparkles");
    setCustomPresets((prev) => addCustomPreset(prev, preset));
    setNewPresetName("");
    setNewPresetDescription("");
    showMessage(i18n("presetSaved"));
  }, [settings, newPresetName, newPresetDescription, i18n, showMessage]);

  const handleExport = useCallback(() => {
    const all = [...BUILT_IN_PRESETS, ...customPresets];
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ethone-presets-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [customPresets]);

  const handleImport = useCallback(
    (file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          const list = Array.isArray(parsed) ? parsed : [parsed];
          const valid = list.map((p) => sanitizePreset(p)).filter((p): p is Preset => p !== null);
          if (valid.length) {
            setCustomPresets((prev) => [...prev, ...valid]);
            showMessage(i18n("presetsImported").replace("{{count}}", String(valid.length)));
          } else {
            showMessage(i18n("presetImportError"));
          }
        } catch {
          showMessage(i18n("presetImportError"));
        }
      };
      reader.readAsText(file);
    },
    [showMessage, i18n]
  );

  return (
    <div className="space-y-4" data-section-match>
      <p className="text-xs text-[var(--muted)]">{i18n("presetsDescription")}</p>

      {message && (
        <div className="rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--foreground)]">
          {message}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--foreground)]">{i18n("builtInPresets")}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {BUILT_IN_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApply(preset)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-left transition-colors hover:border-[var(--accent)]"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon name={preset.icon} className="h-4 w-4 text-[var(--accent)]" />
                {preset.name}
              </div>
              <div className="mt-1 text-xs text-[var(--muted)]">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <p className="text-xs font-medium text-[var(--foreground)]">{i18n("saveCurrentAsPreset")}</p>
        <input
          type="text"
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          placeholder={i18n("presetNamePlaceholder")}
          aria-label={i18n("presetNamePlaceholder")}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <input
          type="text"
          value={newPresetDescription}
          onChange={(e) => setNewPresetDescription(e.target.value)}
          placeholder={i18n("presetDescriptionPlaceholder")}
          aria-label={i18n("presetDescriptionPlaceholder")}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <button
          type="button"
          onClick={handleExtract}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm transition-colors hover:border-[var(--accent)]"
        >
          {i18n("saveCurrentPreset")}
        </button>
      </div>

      {customPresets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--foreground)]">{i18n("customPresets")}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {customPresets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3"
              >
                <button
                  type="button"
                  onClick={() => handleApply(preset)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon name={preset.icon} className="h-4 w-4 text-[var(--accent)]" />
                    {preset.name}
                  </div>
                  {preset.description && (
                    <div className="mt-1 text-xs text-[var(--muted)]">{preset.description}</div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCustomPresets((prev) => removeCustomPreset(prev, preset.id))}
                  className="rounded p-1 text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
                  aria-label={i18n("delete")}
                >
                  <Icon name="trash-2" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm transition-colors hover:border-[var(--accent)]"
        >
          {i18n("exportPresets")}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm transition-colors hover:border-[var(--accent)]"
        >
          {i18n("importPresets")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={(e) => handleImport(e.target.files?.[0] || null)}
          aria-label={i18n("importPresets")}
          className="hidden"
        />
      </div>
    </div>
  );
}

function SoundPackPreview() {
  const { play } = useSound();
  const i18n = useI18n();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-section-match>
      {SOUND_PACKS.map((pack) => (
        <button
          key={pack}
          type="button"
          onClick={() => play("click", pack)}
          className="flex items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)]"
        >
          <Icon name="play" className="h-3 w-3" />
          {i18n("preview")}
        </button>
      ))}
    </div>
  );
}

function DensityCustomPanel({ fields }: { fields: FieldDef[] }) {
  const i18n = useI18n();
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3" data-section-match>
      <p className="text-xs font-medium text-[var(--accent)]">{i18n("densityEngineAdvanced")}</p>
      {fields.map((field) => (
        <SettingField key={field.key} field={field} />
      ))}
    </div>
  );
}

function RawSettingsPanel() {
  const { settings, update } = useSettings();
  const i18n = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showMessage = useCallback(
    (text: string) => {
      setMessage(text);
      window.setTimeout(() => setMessage(null), 3000);
    },
    [setMessage]
  );

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ethone-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  const handleImport = useCallback(
    (file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          if (!parsed || typeof parsed !== "object") throw new Error("Invalid settings");
          const known = Object.fromEntries(
            Object.entries(parsed as Record<string, unknown>).filter(([key]) => key in DEFAULTS)
          );
          if (Object.keys(known).length > 0) {
            update(known as Partial<typeof settings>);
            showMessage(i18n("saved"));
          } else {
            showMessage(i18n("error"));
          }
        } catch {
          showMessage(i18n("error"));
        }
      };
      reader.readAsText(file);
    },
    [update, i18n, showMessage]
  );

  return (
    <div className="space-y-3" data-section-match>
      {message && (
        <div className="rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--foreground)]">
          {message}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm transition-colors hover:border-[var(--accent)]"
        >
          {i18n("exportPresets")}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm transition-colors hover:border-[var(--accent)]"
        >
          {i18n("importPresets")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={(e) => handleImport(e.target.files?.[0] || null)}
          className="hidden"
        />
      </div>
    </div>
  );
}

function fieldKeys(fields: FieldDef[]): { key: string; path?: string }[] {
  return fields.map((f) => ({ key: f.key, path: f.path }));
}

export default function SettingsContent() {
  const { settings } = useSettings();
  const i18n = useI18n();
  const form = useSettingsForm();

  const makeOptions = useCallback(
    (list: { id: string; label: string }[], i18nKeys?: boolean): { id: string; label: string }[] => {
      return list.map((item) => ({
        id: item.id,
        label: i18nKeys ? i18n(item.label) : item.label,
      }));
    },
    [i18n]
  );

  const pushField = useMemo<FieldDef>(() => {
    return {
      key: "pushNotifications",
      label: i18n("pushNotifications"),
      type: "toggle",
      onAfterChange: async (value) => {
        try {
          if (value) await subscribePush();
          else await unsubscribePush();
        } catch (err) {
          console.error("Push toggle error:", err);
          form.updateInstant("pushNotifications", !value);
        }
      },
      keywords: ["notifications", "push", "navigateur"],
    };
  }, [i18n, form]);

  const densityCustomFields: FieldDef[] = useMemo(
    () =>
      DENSITY_CUSTOM_KEYS.map((item) => ({
        key: `densityCustom.${item.key}`,
        path: `densityCustom.${item.key}`,
        label: i18n(`density${item.key.charAt(0).toUpperCase() + item.key.slice(1)}`),
        type: "range",
        min: item.min,
        max: item.max,
        unit: item.unit,
        keywords: ["density", "personnalisé", item.key],
      })),
    [i18n]
  );

  const brainPermissionFields: FieldDef[] = useMemo(
    () =>
      BRAIN_PERMISSION_IDS.map((id) => ({
        key: `brainPermissions.${id}`,
        path: `brainPermissions.${id}`,
        label: i18n(`perm${id.charAt(0).toUpperCase() + id.slice(1)}`),
        type: "toggle",
        keywords: ["brain", "permissions", id],
      })),
    [i18n]
  );

  const brainMemoryFields: FieldDef[] = useMemo(
    () =>
      BRAIN_MEMORY_IDS.map((id) => ({
        key: `brainMemoryCategories.${id}`,
        path: `brainMemoryCategories.${id}`,
        label: i18n(`mem${id.charAt(0).toUpperCase() + id.slice(1)}`),
        type: "toggle",
        keywords: ["brain", "mémoire", id],
      })),
    [i18n]
  );

  const soundVolumeFields: FieldDef[] = useMemo(
    () =>
      ([
        { id: "notifications", label: i18n("notifications") },
        { id: "interface", label: i18n("interfaceVolume") },
        { id: "brain", label: i18n("brainVolume") },
        { id: "system", label: i18n("systemVolume") },
      ] as const).map((item) => ({
        key: `soundVolumes.${item.id}`,
        path: `soundVolumes.${item.id}`,
        label: item.label,
        type: "range",
        keywords: ["son", "volume", item.id],
      })),
    [i18n]
  );

  const appearanceFields: FieldDef[] = useMemo(
    () => [
      { key: "darkMode", label: i18n("darkMode"), type: "toggle", keywords: ["apparence", "sombre", "thème"] },
      {
        key: "theme",
        label: i18n("theme"),
        type: "button-grid",
        options: makeOptions([...THEMES]),
        cols: 2,
        keywords: ["apparence", "thème", "ambiance"],
      },
      {
        key: "iconPack",
        label: i18n("iconPack"),
        type: "button-grid",
        options: makeOptions([...PACKS]),
        cols: 3,
        keywords: ["apparence", "icônes", "pack"],
      },
      {
        key: "accentColor",
        label: i18n("accentColor"),
        type: "button-grid",
        options: makeOptions([...ACCENT_COLORS], true),
        cols: 4,
        keywords: ["apparence", "accent", "couleur"],
      },
      ...(settings.accentColor === "custom"
        ? [
            {
              key: "customAccent",
              label: i18n("customAccent"),
              type: "color" as const,
              keywords: ["apparence", "accent", "couleur", "personnalisé"],
            },
          ]
        : []),
      {
        key: "wallpaper",
        label: i18n("wallpaper"),
        type: "button-grid",
        options: makeOptions([...WALLPAPERS], true),
        cols: 3,
        keywords: ["apparence", "fond", "wallpaper"],
      },
      {
        key: "aura",
        label: i18n("aura"),
        type: "button-grid",
        options: makeOptions([...AURAS], true),
        cols: 3,
        keywords: ["apparence", "aura", "ambiance"],
      },
      { key: "glassEnabled", label: i18n("glassmorphism"), type: "toggle", keywords: ["apparence", "verre", "glass"] },
      { key: "cardTilt", label: i18n("cardTilt3d"), type: "toggle", keywords: ["apparence", "tilt", "3d", "cartes"] },
      {
        key: "shadow",
        label: i18n("shadow"),
        type: "button-grid",
        options: makeOptions(
          SHADOWS.map((s) => ({ id: s, label: `shadow${s.charAt(0).toUpperCase() + s.slice(1)}` })),
          true
        ),
        cols: 4,
        keywords: ["apparence", "ombre", "shadow"],
      },
      {
        key: "backgroundEffect",
        label: i18n("background"),
        type: "button-grid",
        options: makeOptions([...BACKGROUNDS], true),
        cols: 4,
        keywords: ["apparence", "fond", "arrière-plan"],
      },
      { key: "backgroundSpeed", label: i18n("backgroundSpeed"), type: "range", keywords: ["apparence", "fond", "vitesse"] },
    ],
    [i18n, makeOptions, settings.accentColor]
  );

  const typographyFields: FieldDef[] = useMemo(
    () => [
      { key: "fontSize", label: i18n("fontSize"), type: "range", keywords: ["typographie", "police", "taille"] },
      {
        key: "fontFamily",
        label: i18n("fontFamily"),
        type: "button-grid",
        options: makeOptions([...FONTS], true),
        cols: 4,
        keywords: ["typographie", "police", "font"],
      },
    ],
    [i18n, makeOptions]
  );

  const languageFields: FieldDef[] = useMemo(
    () => [
      {
        key: "language",
        label: i18n("language"),
        type: "button-grid",
        options: LANGUAGES.map((lang) => ({
          id: lang.id,
          label: i18n(`lang${lang.id.charAt(0).toUpperCase() + lang.id.slice(1)}`),
        })),
        cols: 2,
        keywords: ["langue", "language", "i18n"],
      },
    ],
    [i18n]
  );

  const densityFields: FieldDef[] = useMemo(
    () => [
      {
        key: "densityMode",
        label: i18n("densityMode"),
        type: "button-grid",
        options: makeOptions([...DENSITY_MODES]),
        cols: 3,
        keywords: ["density", "densité", "mode"],
      },
      { key: "density", label: i18n("listDensity"), type: "range", keywords: ["density", "densité", "listes"] },
      { key: "radius", label: i18n("cardRadius"), type: "range", keywords: ["density", "radius", "cartes"] },
      {
        key: "radiusStyle",
        label: "Style de radius",
        type: "button-grid",
        options: makeOptions([...RADIUS_STYLES]),
        cols: 3,
        keywords: ["density", "radius", "style"],
      },
      {
        key: "iconRadius",
        label: "Forme des icônes",
        type: "button-grid",
        options: makeOptions([...ICON_RADIUSES]),
        cols: 4,
        keywords: ["density", "icônes", "forme"],
      },
      {
        key: "layoutPreset",
        label: i18n("layout"),
        type: "button-grid",
        options: makeOptions([...LAYOUTS], true),
        cols: 4,
        keywords: ["density", "layout", "mise en page"],
      },
      {
        key: "uiAnimations",
        label: "Style d’animations",
        type: "button-grid",
        options: makeOptions([...UI_ANIMATION_STYLES]),
        cols: 3,
        keywords: ["density", "animations", "fluidité"],
      },
      { key: "uiGlow", label: "Lueur UI", type: "toggle", keywords: ["density", "lueur", "ui"] },
      { key: "spotlightEnabled", label: "Spotlight", type: "toggle", keywords: ["density", "spotlight"] },
      { key: "uiSoundFeedback", label: i18n("uiSoundFeedback"), type: "toggle", keywords: ["density", "son", "interface"] },
      { key: "ambientEffectsEnabled", label: "Ambiance", type: "toggle", keywords: ["density", "ambiance", "effets"] },
      { key: "interfaceBlurEnabled", label: "Flou interface", type: "toggle", keywords: ["density", "flou", "interface"] },
      { key: "dockRadius", label: i18n("dockRadius"), type: "range", keywords: ["density", "dock", "radius"] },
      { key: "reducedMotion", label: i18n("reducedMotion"), type: "toggle", keywords: ["density", "accessibilité", "animations"] },
      { key: "haptics", label: i18n("haptics"), type: "toggle", keywords: ["density", "haptiques", "vibrations"] },
      { key: "lowData", label: i18n("lowData"), type: "toggle", keywords: ["density", "données", "économie"] },
      {
        key: "performanceMode",
        label: i18n("performanceMode"),
        type: "button-grid",
        options: makeOptions([...PERFORMANCE_MODES], true),
        cols: 2,
        keywords: ["density", "performance", "économique"],
      },
    ],
    [i18n, makeOptions]
  );

  const accountFields: FieldDef[] = useMemo(
    () => [
      {
        key: "accountEmail",
        label: i18n("email"),
        type: "email",
        saveMode: "explicit",
        defaultValue: "",
        keywords: ["compte", "email", "identité"],
      },
      {
        key: "accountUsername",
        label: i18n("username"),
        type: "text",
        saveMode: "explicit",
        defaultValue: "",
        keywords: ["compte", "utilisateur", "pseudo", "identité"],
      },
      {
        key: "accountPassword",
        label: i18n("password"),
        type: "password",
        saveMode: "explicit",
        defaultValue: "",
        keywords: ["compte", "mot de passe", "sécurité"],
      },
      {
        key: "status",
        label: i18n("status"),
        type: "button-grid",
        options: makeOptions([...STATUSES], true),
        cols: 3,
        keywords: ["compte", "statut", "présence"],
      },
    ],
    [i18n, makeOptions]
  );

  const securityFields: FieldDef[] = useMemo(
    () => [
      { key: "securityAlerts", label: i18n("securityAlerts"), type: "toggle", keywords: ["sécurité", "alertes"] },
      {
        key: "otpRequired",
        label: i18n("otpRequired"),
        type: "custom",
        defaultValue: true,
        render: (value) => <SwitchControl checked={Boolean(value)} onChange={() => {}} />,
        keywords: ["sécurité", "otp", "2fa"],
      },
    ],
    [i18n]
  );

  const notificationsFields: FieldDef[] = useMemo(
    () => [
      { key: "notifications", label: i18n("notifications"), type: "toggle", keywords: ["notifications", "alertes"] },
      pushField,
      { key: "mailNotifications", label: i18n("mailNotifications"), type: "toggle", keywords: ["notifications", "mail"] },
      { key: "trackerNotifications", label: i18n("trackerNotifications"), type: "toggle", keywords: ["notifications", "tracker"] },
      { key: "liveOverlay", label: i18n("liveOverlay"), type: "toggle", keywords: ["notifications", "live", "overlay"] },
    ],
    [i18n, pushField]
  );

  const workspaceFields: FieldDef[] = useMemo(
    () => [
      { key: "brainEnabled", label: i18n("enableBrain"), type: "toggle", keywords: ["workspace", "brain", "ia"] },
      ...brainPermissionFields,
      ...brainMemoryFields,
      { key: "dockVisible", label: i18n("dockVisible"), type: "toggle", keywords: ["workspace", "dock", "visible"] },
      { key: "dockAutoHide", label: i18n("dockAutoHide"), type: "toggle", keywords: ["workspace", "dock", "auto"] },
      { key: "dockMagnify", label: i18n("dockMagnify"), type: "toggle", keywords: ["workspace", "dock", "magnify"] },
      {
        key: "dockScale",
        label: i18n("dockScale"),
        type: "button-grid",
        options: makeOptions([...DOCK_SCALES], true),
        cols: 3,
        keywords: ["workspace", "dock", "taille"],
      },
      {
        key: "dockAlign",
        label: i18n("dockAlign"),
        type: "button-grid",
        options: makeOptions([...DOCK_ALIGNS], true),
        cols: 4,
        keywords: ["workspace", "dock", "alignement"],
      },
      {
        key: "dockGlass",
        label: i18n("dockGlass"),
        type: "button-grid",
        options: makeOptions([...DOCK_GLASS], true),
        cols: 3,
        keywords: ["workspace", "dock", "verre"],
      },
      { key: "dockRadius", label: i18n("dockRadius"), type: "range", keywords: ["workspace", "dock", "radius"] },
      {
        key: "dockItems",
        label: i18n("dockItems"),
        type: "checkbox-list",
        options: NAV_ITEMS.map((item) => ({ id: item.id, label: i18n(item.label) })),
        keywords: ["workspace", "dock", "apps", "éléments"],
      },
    ],
    [i18n, makeOptions, brainPermissionFields, brainMemoryFields]
  );

  const soundFields: FieldDef[] = useMemo(
    () => [
      { key: "masterVolume", label: i18n("masterVolume"), type: "toggle", keywords: ["son", "volume", "général"] },
      { key: "soundEffects", label: i18n("soundEffects"), type: "toggle", keywords: ["son", "effets"] },
      { key: "mediaDucking", label: i18n("mediaDucking"), type: "toggle", keywords: ["son", "média", "baisse"] },
      { key: "soundVolume", label: i18n("soundVolume"), type: "range", keywords: ["son", "volume", "effets"] },
      { key: "soundSpatial", label: i18n("soundSpatial"), type: "toggle", keywords: ["son", "spatial", "audio"] },
      ...soundVolumeFields,
      {
        key: "soundPack",
        label: i18n("soundPack"),
        type: "button-grid",
        options: SOUND_PACKS.map((pack) => ({ id: pack, label: i18n(`soundPack${pack.charAt(0).toUpperCase() + pack.slice(1)}`) })),
        cols: 3,
        keywords: ["son", "pack", "thème sonore"],
      },
      {
        key: "ambientSound",
        label: i18n("ambientSound"),
        type: "button-grid",
        options: AMBIENT_TYPES.map((type) => ({ id: type, label: i18n(`ambientSound${type.charAt(0).toUpperCase() + type.slice(1)}`) })),
        cols: 3,
        keywords: ["son", "ambiance", "bruit"],
      },
    ],
    [i18n, soundVolumeFields]
  );

  const mainSections: SectionDef[] = useMemo(
    () => [
      { id: "appearance", label: i18n("appearance"), icon: "palette", keywords: ["préférences", "apparence"], fields: [], children: <AppearanceSettings /> },
      { id: "typography", label: i18n("typography"), icon: "type", keywords: ["préférences", "typographie"], fields: typographyFields },
      { id: "language", label: i18n("language"), icon: "globe", keywords: ["préférences", "langue"], fields: languageFields },
      { id: "density", label: i18n("density"), icon: "gauge", keywords: ["préférences", "density", "densité"], fields: densityFields },
      { id: "sound", label: i18n("sound"), icon: "volume", keywords: ["préférences", "son"], fields: soundFields },
      { id: "account", label: i18n("account"), icon: "user", keywords: ["compte", "profil", "identité"], fields: accountFields },
      { id: "security", label: i18n("security"), icon: "shield", keywords: ["sécurité", "2fa"], fields: securityFields },
      { id: "notifications", label: i18n("notifications"), icon: "bell", keywords: ["notifications"], fields: notificationsFields },
      { id: "workspace", label: i18n("workspace"), icon: "layout-grid", keywords: ["workspace", "intégrations", "dock", "brain"], fields: workspaceFields },
    ],
    [i18n, typographyFields, languageFields, densityFields, soundFields, accountFields, securityFields, notificationsFields, workspaceFields]
  );

  const advancedSections: SectionDef[] = useMemo(
    () => [
      { id: "presets", label: i18n("presets"), icon: "layers", keywords: ["presets", "export", "import"], fields: [], children: <PresetsPanel /> },
      { id: "ai", label: i18n("ai") || "IA", icon: "brain", keywords: ["ia", "providers", "intelligence"], fields: [], children: <AiProviderPanel /> },
      { id: "live", label: i18n("live"), icon: "plug", keywords: ["live", "intégrations", "spotify", "discord"], fields: [], children: <LiveSettings /> },
      ...(settings.densityMode === "custom"
        ? [
            {
              id: "density-custom",
              label: i18n("density"),
              icon: "gauge",
              keywords: ["density", "personnalisé", "avancé"],
              fields: densityCustomFields,
              skipFields: true,
              children: <DensityCustomPanel fields={densityCustomFields} />,
            },
          ]
        : []),
      {
        id: "sound-preview",
        label: i18n("soundPack"),
        icon: "play",
        keywords: ["son", "pack", "aperçu", "preview", "ethone", "minimal", "classic", "apple", "cyber"],
        fields: [],
        children: <SoundPackPreview />,
      },
      {
        id: "raw-export",
        label: "Export brut",
        icon: "share-2",
        keywords: ["export", "import", "json", "brut"],
        fields: [],
        children: <RawSettingsPanel />,
      },
    ],
    [i18n, settings.densityMode, densityCustomFields]
  );

  const modifiedCounts = {
    appearance: useModifiedCount(fieldKeys(appearanceFields)),
    typography: useModifiedCount(fieldKeys(typographyFields)),
    language: useModifiedCount(fieldKeys(languageFields)),
    density: useModifiedCount(fieldKeys(densityFields)),
    sound: useModifiedCount(fieldKeys(soundFields)),
    security: useModifiedCount(fieldKeys(securityFields)),
    notifications: useModifiedCount(fieldKeys(notificationsFields)),
    workspace: useModifiedCount(fieldKeys(workspaceFields)),
    densityCustom: useModifiedCount(fieldKeys(densityCustomFields)),
  };

  const accountModifiedCount = useMemo(
    () =>
      ["accountEmail", "accountUsername", "accountPassword"].filter(
        (key) => key in form.draft && form.draft[key] !== undefined && form.draft[key] !== ""
      ).length,
    [form.draft]
  );

  const sectionVisible = useCallback(
    (section: SectionDef) => {
      if (form.matchesSearch(section.label, section.keywords)) return true;
      return section.fields.some((field) => form.matchesSearch(field.label, field.keywords));
    },
    [form]
  );

  const visibleAdvancedSections = useMemo(
    () => advancedSections.filter(sectionVisible),
    [advancedSections, sectionVisible]
  );

  const advancedOpen =
    visibleAdvancedSections.length > 0 &&
    (form.showAdvanced || form.query.trim().length > 0);

  const advancedModifiedCount = useMemo(
    () =>
      visibleAdvancedSections.some((s) => s.id === "density-custom")
        ? modifiedCounts.densityCustom
        : 0,
    [visibleAdvancedSections, modifiedCounts.densityCustom]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {mainSections.map((section) => (
          <SettingsSection
            key={section.id}
            id={section.id}
            label={section.label}
            icon={section.icon}
            modifiedCount={
              section.id === "account"
                ? accountModifiedCount
                : (modifiedCounts as Record<string, number>)[section.id]
            }
            visible={sectionVisible(section)}
          >
            {section.fields.map((field) => (
              <SettingField key={field.key} field={field} />
            ))}
            {section.children}
          </SettingsSection>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {advancedOpen && (
          <motion.div
            key="advanced"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            layout
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="overflow-hidden"
          >
            <SettingsSection
              id="advanced"
              label="Paramètres avancés"
              icon="sliders-horizontal"
              modifiedCount={advancedModifiedCount}
              visible
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {visibleAdvancedSections.map((section) => (
                  <SettingsSection
                    key={section.id}
                    id={section.id}
                    label={section.label}
                    icon={section.icon}
                    modifiedCount={section.id === "density-custom" ? modifiedCounts.densityCustom : undefined}
                    visible
                  >
                    {!section.skipFields &&
                      section.fields.map((field) => (
                        <SettingField key={field.key} field={field} />
                      ))}
                    {section.children}
                  </SettingsSection>
                ))}
              </div>
            </SettingsSection>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
