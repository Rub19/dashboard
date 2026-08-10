"use client";

import { useState } from "react";
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
  Moon,
} from "lucide-react";

type Section = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
};

function Toggle({ label, defaultChecked = false }: { label: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm text-[var(--foreground)]">{label}</span>
      <button
        type="button"
        onClick={() => setChecked(!checked)}
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

export default function SettingsPage() {
  const [density, setDensity] = useState(50);
  const [fontSize, setFontSize] = useState(100);

  const sections: Section[] = [
    {
      id: "appearance",
      label: "Apparence",
      icon: Palette,
      children: (
        <div className="space-y-4">
          <Toggle label="Mode sombre" defaultChecked />
          <div className="grid grid-cols-4 gap-2">
            {["Boréale", "Cyberpunk", "Éclipse", "Émeraude"].map((theme) => (
              <button
                key={theme}
                type="button"
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-3 text-xs font-medium transition-colors hover:border-[var(--accent)]"
              >
                {theme}
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
          <Range label="Taille du texte" value={fontSize} onChange={setFontSize} />
          <Range label="Interligne" value={density} onChange={setDensity} />
        </div>
      ),
    },
    {
      id: "density",
      label: "Density Engine",
      icon: Gauge,
      children: (
        <div className="space-y-4">
          <Range label="Densité des listes" value={density} onChange={setDensity} />
          <Range label="Padding des cartes" value={fontSize} onChange={setFontSize} />
        </div>
      ),
    },
    {
      id: "sound",
      label: "Son",
      icon: Volume2,
      children: (
        <div className="space-y-4">
          <Toggle label="Volume général" defaultChecked />
          <Toggle label="Notifications sonores" />
          <Toggle label="Effets sonores" defaultChecked />
        </div>
      ),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      children: (
        <div className="space-y-4">
          <Toggle label="Notifications mail" defaultChecked />
          <Toggle label="Notifications tracker" />
          <Toggle label="Alertes sécurité" defaultChecked />
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
          <button
            type="button"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm transition-colors hover:border-[var(--accent)]"
          >
            Gérer les appareils
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
          <Toggle label="Passkeys activés" />
          <Toggle label="Vérification OTP à chaque connexion" defaultChecked />
        </div>
      ),
    },
    {
      id: "language",
      label: "Langue & région",
      icon: Globe,
      children: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {["Français", "English", "Español", "Deutsch"].map((lang) => (
              <button
                key={lang}
                type="button"
                className={`rounded-xl border border-[var(--border)] px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
                  lang === "Français" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-raised)]"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
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
