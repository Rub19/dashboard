"use client";

import { useSettings } from "@/components/SettingsProvider";
import Card3D from "@/components/Card3D";
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
];

const LANGUAGES = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
];

export default function SettingsPage() {
  const { settings, update } = useSettings();

  const sections = [
    {
      id: "appearance",
      label: "Apparence",
      icon: Palette,
      children: (
        <div className="space-y-4">
          <Toggle label="Mode sombre" checked={settings.darkMode} onChange={(v) => update({ darkMode: v })} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => update({ theme: theme.id as any })}
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
      label: "Typographie",
      icon: Type,
      children: (
        <div className="space-y-4">
          <Range label="Taille du texte" value={settings.fontSize} onChange={(v) => update({ fontSize: v })} />
        </div>
      ),
    },
    {
      id: "density",
      label: "Density Engine",
      icon: Gauge,
      children: (
        <div className="space-y-4">
          <Range label="Densité des listes" value={settings.density} onChange={(v) => update({ density: v })} />
        </div>
      ),
    },
    {
      id: "sound",
      label: "Son",
      icon: Volume2,
      children: (
        <div className="space-y-4">
          <Toggle label="Volume général" checked={settings.masterVolume} onChange={(v) => update({ masterVolume: v })} />
          <Toggle label="Effets sonores" checked={settings.soundEffects} onChange={(v) => update({ soundEffects: v })} />
        </div>
      ),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      children: (
        <div className="space-y-4">
          <Toggle label="Notifications" checked={settings.notifications} onChange={(v) => update({ notifications: v })} />
          <Toggle label="Notifications mail" checked={settings.mailNotifications} onChange={(v) => update({ mailNotifications: v })} />
          <Toggle label="Notifications tracker" checked={settings.trackerNotifications} onChange={(v) => update({ trackerNotifications: v })} />
          <Toggle label="Alertes sécurité" checked={settings.securityAlerts} onChange={(v) => update({ securityAlerts: v })} />
        </div>
      ),
    },
    {
      id: "account",
      label: "Compte",
      icon: User,
      children: (
        <div className="space-y-4">
          <button
            type="button"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm transition-colors hover:border-[var(--accent)]"
          >
            Modifier l’email
          </button>
        </div>
      ),
    },
    {
      id: "security",
      label: "Sécurité",
      icon: Shield,
      children: (
        <div className="space-y-4">
          <Toggle label="Vérification OTP à chaque connexion" checked={true} onChange={() => {}} />
        </div>
      ),
    },
    {
      id: "language",
      label: "Langue",
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
      <h1 className="text-2xl font-bold">Réglages</h1>
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
