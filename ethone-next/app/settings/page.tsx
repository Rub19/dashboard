"use client";

import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import Card3D from "@/components/Card3D";
import { subscribePush, unsubscribePush } from "@/lib/push";
import { Icon } from "@/lib/icons";

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm text-[var(--foreground)]">{label}</span>
      <button
        type="button"
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
    { id: "compact", label: "Compact" },
    { id: "normal", label: "Normal" },
    { id: "airy", label: "Aéré" },
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

  const sections = [
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
                {i18n(`theme${theme.id.charAt(0).toUpperCase() + theme.id.slice(1)}`)}
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
                {i18n(`density${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}`)}
              </button>
            ))}
          </div>
          <Range label={i18n("listDensity")} value={settings.density} onChange={(v) => update({ density: v })} />
          <Range label={i18n("cardRadius")} value={settings.radius} onChange={(v) => update({ radius: v })} />
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
          <Range label={i18n("dockRadius")} value={settings.dockRadius} onChange={(v) => update({ dockRadius: v })} />
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
        </div>
      ),
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
