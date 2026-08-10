"use client";

import { useEffect, useState } from "react";
import Card3D from "@/components/Card3D";
import { fetchWorker } from "@/lib/api";
import { useI18n } from "@/lib/hooks/useI18n";
import { buildAuthUrl } from "@/lib/oauth";
import {
  Music,
  MessageSquare,
  Gamepad2,
  Briefcase,
  Code,
  HeartPulse,
  Brain,
  Blocks,
  Loader2,
  Plug,
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
  { id: "discord", name: "Discord", category: "social", description: "Présence, activité et serveurs autorisés", status: "api" },
  { id: "steam", name: "Steam", category: "gaming", description: "Jeux, succès et temps de jeu", status: "api" },
  { id: "riot", name: "Riot Games", category: "gaming", description: "Valorant, League of Legends et TFT", status: "api" },
  { id: "google-calendar", name: "Google Calendar", category: "productivity", description: "Agenda et prochains événements", status: "oauth" },
  { id: "google-drive", name: "Google Drive", category: "productivity", description: "Fichiers et activité récente", status: "oauth" },
  { id: "notion", name: "Notion", category: "productivity", description: "Pages et bases autorisées", status: "oauth" },
  { id: "todoist", name: "Todoist", category: "productivity", description: "Tâches et projets", status: "oauth" },
  { id: "github", name: "GitHub", category: "development", description: "Commits, Pull Requests et Issues", status: "oauth" },
  { id: "youtube", name: "YouTube", category: "media", description: "Abonnements et dernières vidéos", status: "oauth" },
  { id: "reddit", name: "Reddit", category: "social", description: "Activité et subreddits", status: "oauth" },
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
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [clientIds, setClientIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const i18n = useI18n();

  useEffect(() => {
    fetchWorker("/api/connections")
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const map: Record<string, boolean> = {};
        rows.forEach((row: { provider: string; connected: boolean }) => {
          map[row.provider] = row.connected;
        });
        setConnected(map);
      })
      .catch(() => setConnected({}))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all" ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === filter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("connections")}</h1>

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

      {loading && (
        <Card3D>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
            <p className="text-sm text-[var(--muted)]">Chargement des connexions…</p>
          </div>
        </Card3D>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((integration) => {
          const Icon = icons[integration.category] || Blocks;
          const isConnected = connected[integration.id] === true;
          const isOauth = integration.status === "oauth";
          const clientId = clientIds[integration.id] || "";

          function handleConnect() {
            if (!clientId.trim()) return;
            window.location.href = buildAuthUrl(integration.id, clientId.trim(), { provider: integration.id, clientId: clientId.trim() });
          }

          async function handleDisconnect() {
            try {
              await fetchWorker(`/api/${integration.id}/oauth/disconnect`, { method: "POST", body: JSON.stringify({}) });
              setConnected((c) => ({ ...c, [integration.id]: false }));
            } catch {}
          }

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
                    isConnected
                      ? "bg-emerald-500/10 text-emerald-400"
                      : isOauth
                        ? "bg-violet-500/10 text-violet-400"
                        : "bg-sky-500/10 text-sky-400"
                  }`}
                >
                  {isConnected ? "connecté" : integration.status}
                </span>
              </div>
              {isOauth && !isConnected && (
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientIds((c) => ({ ...c, [integration.id]: e.target.value }))}
                    placeholder="Client ID"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={!clientId.trim()}
                    className="w-full rounded-lg bg-[var(--accent)] px-2 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    Connecter
                  </button>
                </div>
              )}
              {isOauth && isConnected && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  Déconnecter
                </button>
              )}
            </Card3D>
          );
        })}
      </div>

      <Card3D>
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Plug className="h-4 w-4" />
          <p>Les connexions OAuth s’activent depuis les widgets du tableau de bord.</p>
        </div>
      </Card3D>
    </div>
  );
}
