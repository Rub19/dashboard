"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSound } from "@/lib/sound";
import { Icon } from "@/lib/icons";
import { DEFAULTS, USER_STATUS_CONFIG } from "@/lib/settings";
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
import dynamic from "next/dynamic";
import AiProviderPanelSkeleton from "@/components/AiProviderPanelSkeleton";
import LiveSettingsSkeleton from "@/components/LiveSettingsSkeleton";
import IntegrationsSettingsSkeleton from "@/components/IntegrationsSettingsSkeleton";
import Input from "@/components/Input";

const AiProviderPanel = dynamic(() => import("@/components/AiProviderPanel").then((m) => m.AiProviderPanel), {
  ssr: false,
  loading: () => <AiProviderPanelSkeleton />,
});
const LiveSettings = dynamic(() => import("@/components/LiveSettings"), {
  ssr: false,
  loading: () => <LiveSettingsSkeleton />,
});
const IntegrationsSettings = dynamic(() => import("@/components/IntegrationsSettings"), {
  ssr: false,
  loading: () => <IntegrationsSettingsSkeleton />,
});
import SettingsSection from "./SettingsSection";
import SettingField, { type FieldDef } from "./SettingField";
import { SwitchControl } from "./SettingControls";
import { useSettingsForm } from "./SettingsFormContext";
import { useModifiedCount } from "./useModifiedCount";
import AppearanceSettings from "./AppearanceSettings";
import UserProfileCard from "./UserProfileCard";
import MaintenancePanel from "./MaintenancePanel";
import LanguageControl from "./LanguageControl";
import SoundPackControl from "./SoundPackControl";
import AmbientSoundControl from "@/components/AmbientSoundControl";
import SettingsOverview from "./SettingsOverview";
import SoundscapeMixer from "./SoundscapeMixer";
import DynamicIslandSettings from "./DynamicIslandSettings";
import DockSettings from "./DockSettings";
import ShortcutsSettings from "./ShortcutsSettings";
import PerformanceSettings from "./PerformanceSettings";
import PrivacySecuritySettings from "./PrivacySecuritySettings";
import { CATEGORY_ORDER, sectionCategory } from "./SettingsNavigation";

const THEMES = [
  { id: "obsidian", label: "Obsidienne" },
  { id: "cyber-neon", label: "Cyber Néon" },
  { id: "solar-eclipse", label: "Éclipse Solaire" },
  { id: "northern-aurora", label: "Aurore Boréale" },
  { id: "monochrome-studio", label: "Monochrome Studio" },
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

const BACKGROUND_QUALITY = [
  { id: "high", label: "Élevé" },
  { id: "balanced", label: "Équilibré" },
  { id: "low", label: "Économique" },
  { id: "static", label: "Statique" },
] as const;

const STATUSES = Object.entries(USER_STATUS_CONFIG).map(([id, config]) => ({
  id: id as keyof typeof USER_STATUS_CONFIG,
  label: config.labelKey,
}));

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

const SOUND_PACK_ICONS: Record<string, string> = {
  ethone: "music",
  minimal: "minus",
  classic: "disc",
  "apple-inspired": "heart",
  "cyber-pulse": "zap",
  silent: "volume-x",
};

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
  category: string;
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
      <p className="text-xs text-[var(--text-muted)]">{i18n("presetsDescription")}</p>

      {message && (
        <div className="rounded-[var(--panel-radius)] border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--text-primary)]">
          {message}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--text-primary)]">{i18n("builtInPresets")}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {BUILT_IN_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApply(preset)}
              className="min-h-[44px] rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-left transition-colors hover:border-[var(--accent-primary)] backdrop-blur-[var(--panel-blur)]"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon name={preset.icon} className="h-4 w-4 text-[var(--accent-primary)]" />
                {preset.name}
              </div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 backdrop-blur-[var(--panel-blur)]">
        <p className="text-xs font-medium text-[var(--text-primary)]">{i18n("saveCurrentAsPreset")}</p>
        <Input
          type="text"
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          placeholder={i18n("presetNamePlaceholder")}
          aria-label={i18n("presetNamePlaceholder")}
          inputSize="compact"
          className="w-full"
        />
        <Input
          type="text"
          value={newPresetDescription}
          onChange={(e) => setNewPresetDescription(e.target.value)}
          placeholder={i18n("presetDescriptionPlaceholder")}
          aria-label={i18n("presetDescriptionPlaceholder")}
          inputSize="compact"
          className="w-full"
        />
        <button
          type="button"
          onClick={handleExtract}
          className="min-h-[44px] w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm transition-colors hover:border-[var(--accent-primary)] backdrop-blur-[var(--panel-blur)]"
        >
          {i18n("saveCurrentPreset")}
        </button>
      </div>

      {customPresets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-primary)]">{i18n("customPresets")}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {customPresets.map((preset) => (
              <div
                key={preset.id}
                className="flex min-h-[44px] items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 backdrop-blur-[var(--panel-blur)]"
              >
                <button
                  type="button"
                  onClick={() => handleApply(preset)}
                  className="min-h-[44px] flex-1 text-left"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon name={preset.icon} className="h-4 w-4 text-[var(--accent-primary)]" />
                    {preset.name}
                  </div>
                  {preset.description && (
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{preset.description}</div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCustomPresets((prev) => removeCustomPreset(prev, preset.id))}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--accent-primary)]"
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
          className="min-h-[44px] flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm transition-colors hover:border-[var(--accent-primary)] backdrop-blur-[var(--panel-blur)]"
        >
          {i18n("exportPresets")}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="min-h-[44px] flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm transition-colors hover:border-[var(--accent-primary)] backdrop-blur-[var(--panel-blur)]"
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
  const { settings } = useSettings();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-section-match>
      {SOUND_PACKS.map((pack) => {
        const active = settings.soundPack === pack;
        return (
          <button
            key={pack}
            type="button"
            onClick={() => play("click", pack)}
            className={`group flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-[var(--panel-radius)] border p-2.5 text-[10px] font-medium transition-all active:scale-95 ${
              active
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shadow-[0_0_12px_-4px_var(--accent-primary)]"
                : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--text-primary)]/[0.03]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Icon name={SOUND_PACK_ICONS[pack] || "music"} className="h-4 w-4" />
              {i18n(`soundPack${pack.charAt(0).toUpperCase() + pack.slice(1)}`)}
            </span>
            <span className="flex items-center gap-1 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
              <Icon name="play" className="h-3 w-3" />
              {i18n("preview")}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DensityCustomPanel({ fields }: { fields: FieldDef[] }) {
  const i18n = useI18n();
  return (
    <div className="space-y-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 backdrop-blur-[var(--panel-blur)]" data-section-match>
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
        <div className="rounded-[var(--panel-radius)] border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--text-primary)]">
          {message}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleExport}
          className="group flex min-h-[44px] items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm font-medium transition-all hover:border-[var(--accent-primary)]/50 hover:bg-[var(--text-primary)]/[0.03] active:scale-95 backdrop-blur-[var(--panel-blur)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            <Icon name="download" className="h-4 w-4" />
          </span>
          {i18n("exportPresets")}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group flex min-h-[44px] items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm font-medium transition-all hover:border-[var(--accent-primary)]/50 hover:bg-[var(--text-primary)]/[0.03] active:scale-95 backdrop-blur-[var(--panel-blur)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            <Icon name="upload" className="h-4 w-4" />
          </span>
          {i18n("importPresets")}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={(e) => handleImport(e.target.files?.[0] || null)}
            className="hidden"
          />
        </button>
      </div>
    </div>
  );
}

function fieldKeys(fields: FieldDef[]): { key: string; path?: string }[] {
  return fields.map((f) => ({ key: f.key, path: f.path }));
}

export default function SettingsContent({
  contentRef,
  onCategoryChange,
}: {
  contentRef?: React.RefObject<HTMLDivElement | null>;
  onCategoryChange?: (category: string) => void;
}) {
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
      { key: "useMaterialYou", label: i18n("materialYou", "Material You"), type: "toggle", keywords: ["android", "monet", "dynamique", "material"] },
      {
        key: "theme",
        label: i18n("settingsTheme", "Thème d'affichage"),
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
        label: i18n("settingsAccentColor", "Couleur d'accentuation"),
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
        label: i18n("settingsLanguage", "Langue de l'interface"),
        type: "custom",
        description: i18n("settingsLanguageDesc", "Langue d'affichage de l'interface"),
        options: LANGUAGES.map((lang) => ({
          id: lang.id,
          label: i18n(`lang${lang.id.charAt(0).toUpperCase() + lang.id.slice(1)}`),
        })),
        render: (value, onChange, options) => (
          <LanguageControl
            value={String(value)}
            onChange={onChange}
            options={Array.isArray(options) ? options : []}
          />
        ),
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
      {
        key: "backgroundQuality",
        label: "Graphismes de l’arrière-plan",
        type: "button-grid",
        options: makeOptions([...BACKGROUND_QUALITY], false),
        cols: 4,
        keywords: ["arrière-plan", "performance", "gpu", "cosmic"],
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
        autoComplete: "off",
        keywords: ["compte", "email", "identité"],
      },
      {
        key: "accountUsername",
        label: i18n("username"),
        type: "text",
        saveMode: "explicit",
        defaultValue: "",
        autoComplete: "off",
        keywords: ["compte", "utilisateur", "pseudo", "identité"],
      },
      {
        key: "accountPassword",
        label: i18n("password"),
        type: "password",
        saveMode: "explicit",
        defaultValue: "",
        autoComplete: "new-password",
        keywords: ["compte", "mot de passe", "sécurité"],
      },
      {
        key: "status",
        label: i18n("status"),
        type: "button-grid",
        options: STATUSES.map((s) => ({
          id: s.id,
          label: i18n(s.label),
          icon: USER_STATUS_CONFIG[s.id].icon,
        })),
        cols: 5,
        keywords: ["compte", "statut", "présence"],
      },
    ],
    [i18n]
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
      { key: "soundEffects", label: i18n("settingsSounds", "Effets sonores"), type: "toggle", keywords: ["son", "effets"] },
      { key: "mediaDucking", label: i18n("mediaDucking"), type: "toggle", keywords: ["son", "média", "baisse"] },
      { key: "soundVolume", label: i18n("soundVolume"), type: "range", keywords: ["son", "volume", "effets"] },
      { key: "soundSpatial", label: i18n("soundSpatial"), type: "toggle", keywords: ["son", "spatial", "audio"] },
      ...soundVolumeFields,
      {
        key: "soundPack",
        label: i18n("soundPack"),
        type: "custom",
        description: i18n("soundPackDesc", "Pack de sons de l'interface"),
        options: SOUND_PACKS.map((pack) => ({ id: pack, label: i18n(`soundPack${pack.charAt(0).toUpperCase() + pack.slice(1)}`) })),
        render: (value, onChange, options) => (
          <SoundPackControl
            value={String(value)}
            onChange={onChange}
            options={Array.isArray(options) ? (options as { id: string; label: string }[]) : []}
          />
        ),
        keywords: ["son", "pack", "thème sonore"],
      },
      {
        key: "ambientSound",
        label: i18n("ambientSound"),
        type: "custom",
        keywords: ["son", "ambiance", "bruit"],
        render: (value, onChange) => (
          <AmbientSoundControl value={String(value)} onChange={onChange} />
        ),
      },
    ],
    [i18n, soundVolumeFields]
  );

  const mainSections: SectionDef[] = useMemo(
    () => [
      {
        id: "overview",
        label: "Vue d'ensemble",
        icon: "layout-dashboard",
        category: "general",
        keywords: ["général", "vue", "dashboard", "control center", "statut", "raccourcis"],
        fields: [],
        children: (
          <SettingsOverview
            onNavigate={(id) => {
              const el = categoryRefs.current[id];
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        ),
      },
      {
        id: "account",
        label: i18n("account"),
        icon: "user",
        category: "profile",
        keywords: ["compte", "profil", "identité", "avatar", "pseudo"],
        fields: accountFields,
        children: <UserProfileCard />,
      },
      {
        id: "appearance",
        label: i18n("appearance"),
        icon: "palette",
        category: "appearance",
        keywords: ["préférences", "apparence", "verre", "flou", "contraste"],
        fields: [],
        children: <AppearanceSettings />,
      },
      {
        id: "typography",
        label: i18n("typography"),
        icon: "type",
        category: "appearance",
        keywords: ["préférences", "typographie", "police", "taille"],
        fields: typographyFields,
      },
      {
        id: "density",
        label: i18n("density"),
        icon: "gauge",
        category: "appearance",
        keywords: ["préférences", "density", "densité", "espacement"],
        fields: densityFields,
      },
      {
        id: "themes",
        label: "Thèmes & Palettes",
        icon: "sparkles",
        category: "themes",
        keywords: ["thème", "obsidian", "cyber", "aurora", "couleurs", "accents"],
        fields: [],
        children: <AppearanceSettings />,
      },
      {
        id: "animations",
        label: "Animations & Transitions",
        icon: "zap",
        category: "animations",
        keywords: ["animations", "vitesse", "transitions", "motion", "ressorts"],
        fields: [
          {
            key: "uiAnimations",
            label: "Style d'animation",
            type: "button-grid",
            options: makeOptions([...UI_ANIMATION_STYLES], false),
            cols: 3,
            keywords: ["animation", "style", "fluide"],
          },
          {
            key: "reducedMotion",
            label: "Réduire les animations (prefers-reduced-motion)",
            type: "toggle",
            keywords: ["animation", "réduit", "accessibilité"],
          },
          {
            key: "spotlightEnabled",
            label: "Effet Spotlight au curseur",
            type: "toggle",
            keywords: ["animation", "spotlight", "glow"],
          },
          {
            key: "ambientEffectsEnabled",
            label: "Effets d'ambiance dynamiques",
            type: "toggle",
            keywords: ["animation", "ambiance", "auras"],
          },
        ],
      },
      {
        id: "sound",
        label: i18n("sound"),
        icon: "volume-2",
        category: "audio",
        keywords: ["préférences", "son", "volume", "haptique", "packs"],
        fields: soundFields,
      },
      {
        id: "soundscapes",
        label: "Soundscapes & Mixeur",
        icon: "cloud-rain",
        category: "soundscapes",
        keywords: ["soundscape", "ambiance", "pluie", "orage", "mixeur", "forêt", "océan", "bruit"],
        fields: [],
        children: <SoundscapeMixer />,
      },
      {
        id: "notifications",
        label: i18n("notifications"),
        icon: "bell",
        category: "notifications",
        keywords: ["notifications", "alertes", "push", "dnd"],
        fields: notificationsFields,
      },
      {
        id: "dynamic-island",
        label: "Dynamic Island",
        icon: "disc",
        category: "dynamic-island",
        keywords: ["dynamic island", "capsule", "preview", "simulateur", "spotify"],
        fields: [],
        children: <DynamicIslandSettings />,
      },
      {
        id: "dock",
        label: "Dock & Barre des tâches",
        icon: "credit-card",
        category: "dock",
        keywords: ["dock", "taille", "verre", "magnify", "icônes"],
        fields: [],
        children: <DockSettings />,
      },
      {
        id: "workspace",
        label: i18n("workspace"),
        icon: "layout-grid",
        category: "workspace",
        keywords: ["workspace", "intégrations", "dock", "brain", "grille"],
        fields: workspaceFields,
      },
      {
        id: "language",
        label: i18n("language"),
        icon: "globe",
        category: "language",
        keywords: ["préférences", "langue", "région", "date", "heure"],
        fields: languageFields,
      },
      {
        id: "integrations",
        label: i18n("connectionsTitle") || "Connexions",
        icon: "plug",
        category: "connections",
        keywords: ["intégrations", "connexions", "workspace", "discord", "spotify", "github"],
        fields: [],
        children: (
          <div className="h-[28rem] overflow-hidden rounded-[var(--panel-radius)]">
            <IntegrationsSettings />
          </div>
        ),
      },
      {
        id: "privacy",
        label: "Confidentialité & Données",
        icon: "eye-off",
        category: "privacy",
        keywords: ["confidentialité", "télémétrie", "données", "brain", "historique"],
        fields: [],
        children: <PrivacySecuritySettings />,
      },
      {
        id: "security",
        label: i18n("security"),
        icon: "shield",
        category: "security",
        keywords: ["sécurité", "2fa", "sessions", "mot de passe"],
        fields: securityFields,
        children: <PrivacySecuritySettings />,
      },
      {
        id: "sync",
        label: "Synchronisation Cloud",
        icon: "arrows-clockwise",
        category: "sync",
        keywords: ["sync", "synchronisation", "cloud", "supabase", "état"],
        fields: [],
        children: (
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center">
                  <Icon name="arrows-clockwise" className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">Supabase Cloud Sync</h4>
                  <p className="text-xs text-[var(--text-muted)]">Base de données temps réel connectée</p>
                </div>
              </div>
              <span className="rounded-full bg-[var(--success)]/20 px-2.5 py-1 text-xs font-bold text-[var(--success)]">
                🟢 Synchronisé
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Toutes vos notes, tâches, fichiers et préférences sont sauvegardés automatiquement et synchronisés instantanément sur tous vos appareils.
            </p>
          </div>
        ),
      },
      {
        id: "storage",
        label: "Stockage & Cache",
        icon: "hard-drive",
        category: "storage",
        keywords: ["stockage", "cache", "mémoire", "indexeddb"],
        fields: [],
        children: <PerformanceSettings />,
      },
      {
        id: "performance",
        label: "Performance & Diagnostic",
        icon: "cpu",
        category: "performance",
        keywords: ["performance", "diagnostic", "cpu", "mémoire", "fps", "batterie"],
        fields: [],
        children: <PerformanceSettings />,
      },
      {
        id: "accessibility",
        label: "Accessibilité",
        icon: "accessibility",
        category: "accessibility",
        keywords: ["accessibilité", "a11y", "contraste", "texte", "focus", "clavier"],
        fields: [
          {
            key: "reducedMotion",
            label: "Réduire les animations",
            type: "toggle",
            keywords: ["accessibilité", "motion", "mouvement"],
          },
          {
            key: "fontSize",
            label: "Taille du texte de l'interface (%)",
            type: "range",
            min: 80,
            max: 130,
            unit: "%",
            keywords: ["accessibilité", "texte", "taille"],
          },
          {
            key: "uiGlow",
            label: "Effets lumineux et halos (Glow)",
            type: "toggle",
            keywords: ["accessibilité", "glow", "lumière"],
          },
        ],
      },
      {
        id: "shortcuts",
        label: "Raccourcis clavier",
        icon: "keyboard",
        category: "shortcuts",
        keywords: ["raccourcis", "touches", "commandes", "clavier", "cheat sheet"],
        fields: [],
        children: <ShortcutsSettings />,
      },
      {
        id: "about",
        label: "À propos d'ETHONE OS",
        icon: "info",
        category: "about",
        keywords: ["version", "à propos", "ethone", "système", "crédits"],
        fields: [],
        children: (
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center font-bold text-xl ring-1 ring-[var(--accent-primary)]/30">
                E
              </div>
              <div>
                <h4 className="text-base font-bold text-[var(--text-primary)]">ETHONE OS Desktop & Web</h4>
                <p className="text-xs text-[var(--text-muted)]">Version 1.10.69 (Turbopack / Next.js 16.3.3)</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Système d&apos;exploitation web de productivité personnelle haute fidélité. Conçu pour la fluidité, le minimalisme sombre et la personnalisation intégrale.
            </p>
          </div>
        ),
      },
    ],
    [i18n, accountFields, appearanceFields, typographyFields, densityFields, soundFields, notificationsFields, workspaceFields, languageFields, securityFields, makeOptions]
  );

  const advancedSections: SectionDef[] = useMemo(
    () => [
      { id: "presets", label: i18n("presets"), icon: "layers", category: "advanced", keywords: ["presets", "export", "import"], fields: [], children: <PresetsPanel /> },
      { id: "ai", label: i18n("ai") || "IA", icon: "brain", category: "advanced", keywords: ["ia", "providers", "intelligence"], fields: [], children: <AiProviderPanel /> },
      { id: "live", label: i18n("live"), icon: "plug", category: "advanced", keywords: ["live", "intégrations", "spotify", "discord"], fields: [], children: <LiveSettings /> },
      ...(settings.densityMode === "custom"
        ? [
            {
              id: "density-custom",
              label: i18n("density"),
              icon: "gauge",
              category: "advanced",
              keywords: ["density", "personnalisé", "avancé"],
              fields: densityCustomFields,
              skipFields: true,
              children: <DensityCustomPanel fields={densityCustomFields} />,
            } as SectionDef,
          ]
        : []),
      {
        id: "sound-preview",
        label: i18n("soundPack"),
        icon: "play",
        category: "advanced",
        keywords: ["son", "pack", "aperçu", "preview", "ethone", "minimal", "classic", "apple", "cyber"],
        fields: [],
        children: <SoundPackPreview />,
      },
      {
        id: "raw-export",
        label: "Export brut",
        icon: "share-2",
        category: "advanced",
        keywords: ["export", "import", "json", "brut"],
        fields: [],
        children: <RawSettingsPanel />,
      },
      {
        id: "maintenance",
        label: i18n("maintenance") || "Maintenance",
        icon: "sliders-horizontal",
        category: "advanced",
        keywords: ["maintenance", "cache", "worker", "performance", "mémoire"],
        fields: [],
        children: <MaintenancePanel />,
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
    account: 0,
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

  const visibleMainSections = useMemo(
    () => (!form.query.trim() ? mainSections : mainSections.filter(sectionVisible)),
    [mainSections, sectionVisible, form.query]
  );

  const visibleAdvancedSections = useMemo(
    () => (!form.query.trim() ? advancedSections : advancedSections.filter(sectionVisible)),
    [advancedSections, sectionVisible, form.query]
  );

  const allVisibleSections = useMemo(
    () => [...visibleMainSections, ...visibleAdvancedSections],
    [visibleMainSections, visibleAdvancedSections]
  );

  const sectionsByCategory = useMemo(() => {
    const map = new Map<string, SectionDef[]>();
    for (const cat of CATEGORY_ORDER) {
      map.set(cat.id, []);
    }
    for (const section of allVisibleSections) {
      const cat = section.category || sectionCategory(section.id);
      const list = map.get(cat) || [];
      list.push(section);
      map.set(cat, list);
    }
    return map;
  }, [allVisibleSections]);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const previousQueryRef = useRef(form.query);

  useEffect(() => {
    const root = contentRef?.current;
    if (!root) return;
    let rafId: number | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible[0]) {
            const id = visible[0].target.getAttribute("data-category");
            if (id && onCategoryChange) onCategoryChange(id);
          }
        });
      },
      { root, rootMargin: "-10% 0px -60% 0px", threshold: 0 }
    );
    Object.values(categoryRefs.current).forEach((el) => el && observer.observe(el));
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [contentRef, onCategoryChange]);

  useEffect(() => {
    if (!form.query.trim()) {
      previousQueryRef.current = form.query;
      return;
    }
    if (previousQueryRef.current.trim()) {
      previousQueryRef.current = form.query;
      return;
    }
    previousQueryRef.current = form.query;
    const firstCategory = CATEGORY_ORDER.find((c) => (sectionsByCategory.get(c.id)?.length ?? 0) > 0);
    if (!firstCategory) return;
    const el = categoryRefs.current[firstCategory.id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [form.query, sectionsByCategory]);

  const renderSection = (section: SectionDef) => {
    const modifiedCount =
      section.id === "account"
        ? accountModifiedCount
        : section.id === "density-custom"
          ? modifiedCounts.densityCustom
          : (modifiedCounts as Record<string, number>)[section.id];

    return (
      <SettingsSection
        key={section.id}
        id={section.id}
        label={section.label}
        icon={section.icon}
        modifiedCount={modifiedCount}
        visible={!form.query.trim() ? true : sectionVisible(section)}
      >
        {section.id === "account" && section.children}
        {!section.skipFields &&
          section.fields.map((field) => <SettingField key={field.key} field={field} />)}
        {section.id !== "account" && section.children}
      </SettingsSection>
    );
  };

  return (
    <div className="w-full space-y-8 pb-24">
      {form.query.trim() && (
        <div
          className="flex items-center justify-between rounded-lg border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] px-3 py-2 text-xs text-[var(--text-muted)]"
          role="status"
          aria-live="polite"
        >
          <span>
            {allVisibleSections.length} {allVisibleSections.length <= 1 ? "résultat" : "résultats"} pour « {form.query} »
          </span>
          {allVisibleSections.length === 0 && (
            <span className="text-[var(--danger)]">Aucun paramètre trouvé.</span>
          )}
        </div>
      )}
      {CATEGORY_ORDER.map((category) => {
        const sections = sectionsByCategory.get(category.id) || [];
        if (sections.length === 0) return null;

        return (
          <div
            key={category.id}
            data-category={category.id}
            ref={(el) => { categoryRefs.current[category.id] = el; }}
            className="space-y-4 transform-gpu"
          >
            {category.id === "advanced" && (
              <h2 className="sticky top-0 z-10 -mx-1 mb-2 flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--text-primary)]/[0.06] bg-[var(--panel-bg)]/80 px-4 py-2 text-sm font-semibold text-[var(--text-primary)] backdrop-blur-[var(--panel-blur)]">
                <Icon name={category.icon} className="h-4 w-4 text-[var(--accent)]" />
                {category.label}
              </h2>
            )}
            {category.id !== "advanced" && (
              <h2 className="sr-only">{category.label}</h2>
            )}
            <div className="grid grid-cols-1 gap-4">
              {sections.map(renderSection)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
