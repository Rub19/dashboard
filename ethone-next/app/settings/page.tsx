"use client";

import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import Card3D from "@/components/Card3D";
import { subscribePush, unsubscribePush } from "@/lib/push";
import {
  Palette,
  Type,
  Gauge,
  Volume2,
  Bell,
  User,
  Shield,
  Globe,
} from "lucide-react";

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

export default function SettingsPage() {
  const { settings, update } = useSettings();
  const i18n = useI18n();

  const sections = [
    {
      id: "appearance",
      label: i18n("appearance"),
      icon: Palette,
      children: (
        <div className="space-y-4">
          <Toggle label={i18n("darkMode")} checked={settings.darkMode} onChange={(v) => update({ darkMode: v })} />
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
        </div>
      ),
    },
    {
      id: "typography",
      label: i18n("typography"),
      icon: Type,
      children: (
        <div className="space-y-4">
          <Range label={i18n("fontSize")} value={settings.fontSize} onChange={(v) => update({ fontSize: v })} />
        </div>
      ),
    },
    {
      id: "density",
      label: i18n("density"),
      icon: Gauge,
      children: (
        <div className="space-y-4">
          <Range label={i18n("listDensity")} value={settings.density} onChange={(v) => update({ density: v })} />
          <Range label="Rayon des cartes" value={settings.radius} onChange={(v) => update({ radius: v })} />
          <Toggle label="Verre (glassmorphism)" checked={settings.glassEnabled} onChange={(v) => update({ glassEnabled: v })} />
          <Toggle label="Tilt 3D sur les cartes" checked={settings.cardTilt} onChange={(v) => update({ cardTilt: v })} />
        </div>
      ),
    },
    {
      id: "sound",
      label: i18n("sound"),
      icon: Volume2,
      children: (
        <div className="space-y-4">
          <Toggle label={i18n("masterVolume")} checked={settings.masterVolume} onChange={(v) => update({ masterVolume: v })} />
          <Toggle label={i18n("soundEffects")} checked={settings.soundEffects} onChange={(v) => update({ soundEffects: v })} />
        </div>
      ),
    },
    {
      id: "notifications",
      label: i18n("notifications"),
      icon: Bell,
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
      icon: User,
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
      icon: Shield,
      children: (
        <div className="space-y-4">
          <Toggle label="OTP à chaque connexion" checked={true} onChange={() => {}} />
        </div>
      ),
    },
    {
      id: "language",
      label: i18n("language"),
      icon: Globe,
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
              {lang.label}
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("settings")}</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card3D key={section.id}>
              <div className="mb-4 flex items-center gap-2">
                <Icon className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="font-semibold">{section.label}</h2>
              </div>
              {section.children}
            </Card3D>
          );
        })}
      </div>
    </div>
  );
}
