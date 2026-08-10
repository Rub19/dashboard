"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import {
  Music,
  MessageSquare,
  Gamepad2,
  Briefcase,
  Code,
  HeartPulse,
  Brain,
  Blocks,
} from "lucide-react";

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  media: Music,
  social: MessageSquare,
  gaming: Gamepad2,
  productivity: Briefcase,
  development: Code,
  health: HeartPulse,
  ai: Brain,
};

const INTEGRATIONS = [
  { id: "spotify", name: "Spotify", category: "media", description: "Lecture, historique et playlists", status: "oauth" },
  { id: "discord", name: "Discord", category: "social", description: "Présence, activité et serveurs autorisés", status: "oauth" },
  { id: "steam", name: "Steam", category: "gaming", description: "Jeux, succès et temps de jeu", status: "api" },
  { id: "riot", name: "Riot Games", category: "gaming", description: "Valorant, League of Legends et TFT", status: "api" },
  { id: "google-calendar", name: "Google Calendar", category: "productivity", description: "Agenda et prochains événements", status: "oauth" },
  { id: "google-drive", name: "Google Drive", category: "productivity", description: "Fichiers et activité récente", status: "oauth" },
  { id: "notion", name: "Notion", category: "productivity", description: "Pages et bases autorisées", status: "oauth" },
  { id: "todoist", name: "Todoist", category: "productivity", description: "Tâches et projets", status: "oauth" },
  { id: "github", name: "GitHub", category: "development", description: "Commits, Pull Requests et Issues", status: "oauth" },
  { id: "openai", name: "OpenAI", category: "ai", description: "Modèles et exécutions via un relais sécurisé", status: "api" },
];

const CATEGORIES = [
  { id: "all", label: "Toutes", icon: Blocks },
  { id: "media", label: "Médias", icon: Music },
  { id: "social", label: "Social", icon: MessageSquare },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "productivity", label: "Productivité", icon: Briefcase },
  { id: "development", label: "Développement", icon: Code },
  { id: "health", label: "Santé", icon: HeartPulse },
  { id: "ai", label: "IA", icon: Brain },
];

export default function ConnectionsPage() {
  const [filter, setFilter] = useState("all");
  const filtered =
    filter === "all" ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === filter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Connexions</h1>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === cat.id
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((integration) => {
          const Icon = icons[integration.category] || Blocks;
          return (
            <Card3D key={integration.id}>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)] text-[var(--muted)]">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{integration.name}</p>
                  <p className="text-xs text-[var(--muted)]">{integration.description}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    integration.status === "oauth"
                      ? "bg-violet-500/10 text-violet-400"
                      : "bg-sky-500/10 text-sky-400"
                  }`}
                >
                  {integration.status}
                </span>
              </div>
            </Card3D>
          );
        })}
      </div>
    </div>
  );
}
