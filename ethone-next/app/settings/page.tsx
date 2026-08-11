"use client";

import { useSettings } from "@/components/SettingsProvider";
import type { BrainPermissions, BrainMemoryCategories } from "@/lib/settings";
import { useI18n } from "@/lib/hooks/useI18n";
import Card3D from "@/components/Card3D";
import LiveSettings from "@/components/LiveSettings";
import { subscribePush, unsubscribePush } from "@/lib/push";
import { Icon } from "@/lib/icons";
import { PRESETS } from "@/lib/presets";

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm text-[var(--foreground)]">{label}</span>
      <button
        type="button"
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--border)]"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </label>
  );
}

function Range({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-[var(--muted)]">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}

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
];

const NAV_ITEMS = [
  { id: "home", label: "Accueil" },
  { id: "notes", label: "Notes" },
  { id: "tasks", label: "Tâches" },
  { id: "calendar", label: "Agenda" },
  { id: "files", label: "Fichiers" },
  { id: "bills", label: "Factures" },
  { id: "activity", label: "Activité" },
  { id: "interactions", label: "Interactions" },
  { id: "connections", label: "Connexions" },
  { id: "plugins", label: "Plugins" },
  { id: "spaces", label: "Spaces" },
  { id: "flows", label: "Flows" },
  { id: "brain", label: "Brain" },
  { id: "focus", label: "Focus" },
  { id: "team", label: "Équipe" },
  { id: "mail", label: "Mail" },
  { id: "settings", label: "Paramètres" },
];

export default function SettingsPage() {
  const { settings, update } = useSettings();
  const i18n = useI18n();

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
    { id: "solid", label: "Uni" },
    { id: "gradient", label: "Dégradé" },
    { id: "mesh", label: "Mesh" },
    { id: "aurora", label: "Aurora" },
  ] as const;

  const LAYOUTS = [
    { id: "default", label: "Défaut" },
    { id: "minimal", label: "Minimal" },
    { id: "dock-only", label: "Dock" },
    { id: "sidebar-only", label: "Sidebar" },
  ] as const;

  const ACCENT_COLORS = [
    { id: "violet", label: i18n("accentViolet") },
    { id: "mint", label: i18n("accentMint") },
    { id: "sky", label: i18n("accentSky") },
    { id: "amber", label: i18n("accentAmber") },
    { id: "rose", label: i18n("accentRose") },
    { id: "teal", label: i18n("accentTeal") },
    { id: "coral", label: i18n("accentCoral") },
    { id: "custom", label: i18n("accentCustom") },
  ] as const;

  const WALLPAPERS = [
    { id: "none", label: i18n("wallpaperNone") },
    { id: "aurora", label: i18n("wallpaperAurora") },
    { id: "nebula", label: i18n("wallpaperNebula") },
    { id: "mesh", label: i18n("wallpaperMesh") },
    { id: "noise", label: i18n("wallpaperNoise") },
  ] as const;

  const FONTS = [
    { id: "sans", label: i18n("fontSans") },
    { id: "outfit", label: i18n("fontOutfit") },
    { id: "mono", label: i18n("fontMono") },
    { id: "serif", label: i18n("fontSerif") },
  ] as const;

  const RADIUS_STYLES = [
    { id: "rounded", label: "Arrondi" },
    { id: "soft", label: "Doux" },
    { id: "sharp", label: "Net" },
  ] as const;

  const DOCK_SCALES = [
    { id: "compact", label: "Compact" },
    { id: "normal", label: "Normal" },
    { id: "large", label: "Large" },
  ] as const;

  const DOCK_ALIGNS = [
    { id: "center", label: "Centre" },
    { id: "left", label: "Gauche" },
    { id: "right", label: "Droite" },
    { id: "stretch", label: "Étiré" },
  ] as const;

  const DOCK_GLASS = [
    { id: "default", label: "Défaut" },
    { id: "ultra", label: "Ultra" },
    { id: "opaque", label: "Opaque" },
  ] as const;

  const UI_ANIMATION_STYLES = [
    { id: "smooth", label: "Fluide" },
    { id: "snappy", label: "Rapide" },
    { id: "reduced", label: "Réduit" },
  ] as const;

  const PERFORMANCE_MODES = [
    { id: "normal", label: i18n("performanceNormal") },
    { id: "low", label: i18n("performanceLow") },
  ] as const;

  const STATUSES = [
    { id: "online", label: i18n("statusOnline") },
    { id: "busy", label: i18n("statusBusy") },
    { id: "focus", label: i18n("statusFocus") },
    { id: "away", label: i18n("statusAway") },
    { id: "invisible", label: i18n("statusInvisible") },
  ] as const;

  const BRAIN_PERMISSIONS: { id: keyof BrainPermissions; label: string }[] = [
    { id: "notes", label: i18n("permNotes") },
    { id: "tasks", label: i18n("permTasks") },
    { id: "calendar", label: i18n("permCalendar") },
    { id: "connections", label: i18n("permConnections") },
    { id: "gaming", label: i18n("permGaming") },
    { id: "activity", label: i18n("permActivity") },
    { id: "files", label: i18n("permFiles") },
    { id: "profile", label: i18n("permProfile") },
    { id: "settings", label: i18n("permSettings") },
    { id: "mail", label: i18n("permMail") },
  ];

  const BRAIN_MEMORY: { id: keyof BrainMemoryCategories; label: string }[] = [
    { id: "interface", label: i18n("memInterface") },
    { id: "habits", label: i18n("memHabits") },
    { id: "widgets", label: i18n("memWidgets") },
    { id: "schedules", label: i18n("memSchedules") },
    { id: "taskTypes", label: i18n("memTaskTypes") },
    { id: "spaces", label: i18n("memSpaces") },
    { id: "flows", label: i18n("memFlows") },
    { id: "goals", label: i18n("memGoals") },
  ];

  const sections = [
    {
      id: "presets",
      label: "Presets",
      icon: "layers",
      children: (
        <div className="space-y-4">
          <p className="text-xs text-[var(--muted)]">Appliquer une ambiance prédéfinie en un clic.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => update({ ...preset.settings })}
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
      ),
    },
    {
      id: "appearance",
      label: i18n("appearance"),
      icon: "palette",
      children: (
        <div className="space-y-4">
          <Toggle label={i18n("darkMode")} checked={settings.darkMode} onChange={(v) => update({ darkMode: v })} />
          <p className="text-xs text-[var(--muted)]">{i18n("iconPack")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => update({ iconPack: pack.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.iconPack === pack.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {pack.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => update({ theme: theme.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-3 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.theme === theme.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {theme.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">{i18n("accentColor")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => update({ accentColor: c.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.accentColor === c.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {settings.accentColor === "custom" && (
            <label className="flex items-center gap-3">
              <span className="text-sm text-[var(--foreground)]">{i18n("customAccent")}</span>
              <input
                type="color"
                value={settings.customAccent}
                onChange={(e) => update({ customAccent: e.target.value })}
                className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </label>
          )}
          <p className="text-xs text-[var(--muted)]">{i18n("wallpaper")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {WALLPAPERS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => update({ wallpaper: w.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.wallpaper === w.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "typography",
      label: i18n("typography"),
      icon: "type",
      children: (
        <div className="space-y-4">
          <Range label={i18n("fontSize")} value={settings.fontSize} onChange={(v) => update({ fontSize: v })} />
          <p className="text-xs text-[var(--muted)]">{i18n("fontFamily")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => update({ fontFamily: f.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.fontFamily === f.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "density",
      label: i18n("density"),
      icon: "gauge",
      children: (
        <div className="space-y-4">
          <p className="text-xs text-[var(--muted)]">{i18n("densityMode")}</p>
          <div className="grid grid-cols-3 gap-2">
            {DENSITY_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => update({ densityMode: mode.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.densityMode === mode.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <Range label={i18n("listDensity")} value={settings.density} onChange={(v) => update({ density: v })} />
          <Range label={i18n("cardRadius")} value={settings.radius} onChange={(v) => update({ radius: v })} />
          <p className="text-xs text-[var(--muted)]">Style de radius</p>
          <div className="grid grid-cols-3 gap-2">
            {RADIUS_STYLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => update({ radiusStyle: r.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.radiusStyle === r.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Toggle label={i18n("glassmorphism")} checked={settings.glassEnabled} onChange={(v) => update({ glassEnabled: v })} />
          <Toggle label={i18n("cardTilt3d")} checked={settings.cardTilt} onChange={(v) => update({ cardTilt: v })} />
          <p className="text-xs text-[var(--muted)]">{i18n("shadow")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["none", "sm", "md", "glow"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => update({ shadow: s })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.shadow === s ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {i18n(`shadow${s.charAt(0).toUpperCase() + s.slice(1)}`)}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">{i18n("background")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                onClick={() => update({ backgroundEffect: bg.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.backgroundEffect === bg.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {i18n(`background${bg.id.charAt(0).toUpperCase() + bg.id.slice(1)}`)}
              </button>
            ))}
          </div>
          <Range label={i18n("backgroundSpeed")} value={settings.backgroundSpeed} onChange={(v) => update({ backgroundSpeed: v })} />
          <p className="text-xs text-[var(--muted)]">{i18n("layout")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => update({ layoutPreset: l.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.layoutPreset === l.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {i18n(`layout${l.id.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("")}`)}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">Style d’animations</p>
          <div className="grid grid-cols-3 gap-2">
            {UI_ANIMATION_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => update({ uiAnimations: s.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.uiAnimations === s.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Toggle label="Lueur UI" checked={settings.uiGlow} onChange={(v) => update({ uiGlow: v })} />
            <Toggle label="Spotlight" checked={settings.spotlightEnabled} onChange={(v) => update({ spotlightEnabled: v })} />
            <Toggle label="Effets sonores" checked={settings.uiSoundFeedback} onChange={(v) => update({ uiSoundFeedback: v })} />
            <Toggle label="Ambiance" checked={settings.ambientEffectsEnabled} onChange={(v) => update({ ambientEffectsEnabled: v })} />
            <Toggle label="Flou interface" checked={settings.interfaceBlurEnabled} onChange={(v) => update({ interfaceBlurEnabled: v })} />
          </div>
          <Range label={i18n("dockRadius")} value={settings.dockRadius} onChange={(v) => update({ dockRadius: v })} />
          <div className="border-t border-[var(--border)] pt-4">
            <Toggle label={i18n("reducedMotion")} checked={settings.reducedMotion} onChange={(v) => update({ reducedMotion: v })} />
          </div>
          <Toggle label={i18n("haptics")} checked={settings.haptics} onChange={(v) => update({ haptics: v })} />
          <Toggle label={i18n("lowData")} checked={settings.lowData} onChange={(v) => update({ lowData: v })} />
          <p className="text-xs text-[var(--muted)]">{i18n("performanceMode")}</p>
          <div className="grid grid-cols-2 gap-2">
            {PERFORMANCE_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => update({ performanceMode: m.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.performanceMode === m.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">{i18n("status")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => update({ status: s.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.status === s.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "dock",
      label: i18n("dock"),
      icon: "dock",
      children: (
        <div className="space-y-4">
          <Toggle label={i18n("dockVisible")} checked={settings.dockVisible} onChange={(v) => update({ dockVisible: v })} />
          <Toggle label="Masquage auto" checked={settings.dockAutoHide} onChange={(v) => update({ dockAutoHide: v })} />
          <Toggle label="Magnification" checked={settings.dockMagnify} onChange={(v) => update({ dockMagnify: v })} />
          <p className="text-xs text-[var(--muted)]">Taille du dock</p>
          <div className="grid grid-cols-3 gap-2">
            {DOCK_SCALES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => update({ dockScale: s.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.dockScale === s.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">Alignement</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DOCK_ALIGNS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => update({ dockAlign: a.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.dockAlign === a.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">Verre du dock</p>
          <div className="grid grid-cols-3 gap-2">
            {DOCK_GLASS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => update({ dockGlass: g.id })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.dockGlass === g.id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">{i18n("dockItems")}:</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {NAV_ITEMS.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.dockItems.includes(item.id)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...settings.dockItems, item.id]
                      : settings.dockItems.filter((id) => id !== item.id);
                    update({ dockItems: next });
                  }}
                  className="accent-[var(--accent)]"
                />
                {i18n(item.id)}
              </label>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "sound",
      label: i18n("sound"),
      icon: "volume",
      children: (
        <div className="space-y-4">
          <Toggle label={i18n("masterVolume")} checked={settings.masterVolume} onChange={(v) => update({ masterVolume: v })} />
          <Toggle label={i18n("soundEffects")} checked={settings.soundEffects} onChange={(v) => update({ soundEffects: v })} />
          <Range label={i18n("soundVolume")} value={settings.soundVolume} onChange={(v) => update({ soundVolume: v })} />
          <p className="text-xs text-[var(--muted)]">{i18n("soundPack")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["none", "minimal", "mechanical", "liquid"] as const).map((pack) => (
              <button
                key={pack}
                type="button"
                onClick={() => update({ soundPack: pack })}
                className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  settings.soundPack === pack ? "border-[var(--accent)] text-[var(--accent)]" : ""
                }`}
              >
                {i18n(`soundPack${pack.charAt(0).toUpperCase() + pack.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "notifications",
      label: i18n("notifications"),
      icon: "bell",
      children: (
        <div className="space-y-4">
          <Toggle label={i18n("notifications")} checked={settings.notifications} onChange={(v) => update({ notifications: v })} />
          <Toggle label={i18n("pushNotifications")} checked={settings.pushNotifications} onChange={async (v) => {
            update({ pushNotifications: v });
            try {
              if (v) await subscribePush();
              else await unsubscribePush();
            } catch (err) {
              console.error("Push toggle error:", err);
              update({ pushNotifications: !v });
            }
          }} />
          <Toggle label={i18n("mailNotifications")} checked={settings.mailNotifications} onChange={(v) => update({ mailNotifications: v })} />
          <Toggle label={i18n("trackerNotifications")} checked={settings.trackerNotifications} onChange={(v) => update({ trackerNotifications: v })} />
          <Toggle label={i18n("securityAlerts")} checked={settings.securityAlerts} onChange={(v) => update({ securityAlerts: v })} />
          <Toggle label={i18n("brain")} checked={settings.brainEnabled} onChange={(v) => update({ brainEnabled: v })} />
          <Toggle label={i18n("liveOverlay")} checked={settings.liveOverlay} onChange={(v) => update({ liveOverlay: v })} />
          <p className="text-xs text-[var(--muted)]">{i18n("brainPermissions")}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BRAIN_PERMISSIONS.map((p) => (
              <Toggle
                key={p.id}
                label={p.label}
                checked={settings.brainPermissions[p.id]}
                onChange={(v) =>
                  update({
                    brainPermissions: { ...settings.brainPermissions, [p.id]: v } as BrainPermissions,
                  })
                }
              />
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">{i18n("brainMemoryCategories")}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BRAIN_MEMORY.map((m) => (
              <Toggle
                key={m.id}
                label={m.label}
                checked={settings.brainMemoryCategories[m.id]}
                onChange={(v) =>
                  update({
                    brainMemoryCategories: { ...settings.brainMemoryCategories, [m.id]: v } as BrainMemoryCategories,
                  })
                }
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "live",
      label: i18n("liveIntegrations"),
      icon: "plug",
      children: <LiveSettings />,
    },
    {
      id: "account",
      label: i18n("account"),
      icon: "user",
      children: (
        <div className="space-y-4">
          <button
            type="button"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm transition-colors hover:border-[var(--accent)]"
          >
            {i18n("modifyEmail")}
          </button>
        </div>
      ),
    },
    {
      id: "security",
      label: i18n("security"),
      icon: "shield",
      children: (
        <div className="space-y-4">
          <Toggle label={i18n("otpRequired")} checked={true} onChange={() => {}} />
        </div>
      ),
    },
    {
      id: "language",
      label: i18n("language"),
      icon: "globe",
      children: (
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => update({ language: lang.id })}
              className={`rounded-xl border border-[var(--border)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                settings.language === lang.id ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-raised)]"
              }`}
            >
              {i18n(`lang${lang.id.charAt(0).toUpperCase() + lang.id.slice(1)}`)}
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("settingsTitle")}</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <Card3D key={section.id}>
            <div className="mb-4 flex items-center gap-2">
              <Icon name={section.icon} className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">{section.label}</h2>
            </div>
            {section.children}
          </Card3D>
        ))}
      </div>
    </div>
  );
}
