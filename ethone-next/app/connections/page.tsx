"use client";

import { useEffect, useState } from "react";
import Card3D from "@/components/Card3D";
import { fetchWorker } from "@/lib/api";
import { useI18n } from "@/lib/hooks/useI18n";
import { buildAuthUrl } from "@/lib/oauth";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";

const categoryIcons: Record<string, string> = {
  media: "music",
  social: "message-square",
  gaming: "gamepad-2",
  productivity: "briefcase",
  development: "code",
  health: "heart-pulse",
  ai: "brain",
};

const INTEGRATIONS = [
  { id: "spotify", name: "Spotify", category: "media", description: "descSpotify", status: "oauth" },
  { id: "discord", name: "Discord", category: "social", description: "descDiscord", status: "api" },
  { id: "steam", name: "Steam", category: "gaming", description: "descSteam", status: "api" },
  { id: "riot", name: "Riot Games", category: "gaming", description: "descRiot", status: "api" },
  { id: "google-calendar", name: "Google Calendar", category: "productivity", description: "descGoogleCalendar", status: "oauth" },
  { id: "google-drive", name: "Google Drive", category: "productivity", description: "descGoogleDrive", status: "oauth" },
  { id: "notion", name: "Notion", category: "productivity", description: "descNotion", status: "oauth" },
  { id: "todoist", name: "Todoist", category: "productivity", description: "descTodoist", status: "oauth" },
  { id: "github", name: "GitHub", category: "development", description: "descGithub", status: "oauth" },
  { id: "youtube", name: "YouTube", category: "media", description: "descYoutube", status: "oauth" },
  { id: "reddit", name: "Reddit", category: "social", description: "descReddit", status: "oauth" },
  { id: "openai", name: "OpenAI", category: "ai", description: "descOpenai", status: "api" },
  { id: "rss", name: "RSS", category: "media", description: "descRss", status: "api" },
  { id: "bluesky", name: "Bluesky", category: "social", description: "descBluesky", status: "comingSoon" },
  { id: "linear", name: "Linear", category: "productivity", description: "descLinear", status: "comingSoon" },
  { id: "plex", name: "Plex", category: "media", description: "descPlex", status: "comingSoon" },
];

const CATEGORIES = [
  { id: "all", label: "Toutes", icon: "blocks" },
  { id: "media", label: "Médias", icon: "music" },
  { id: "social", label: "Social", icon: "message-square" },
  { id: "gaming", label: "Gaming", icon: "gamepad-2" },
  { id: "productivity", label: "Productivité", icon: "briefcase" },
  { id: "development", label: "Développement", icon: "code" },
  { id: "health", label: "Santé", icon: "heart-pulse" },
  { id: "ai", label: "IA", icon: "brain" },
];

export default function ConnectionsPage() {
  const [filter, setFilter] = useState("all");
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [clientIds, setClientIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const i18n = useI18n();
  const { success, error: showError } = useToast();

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
      <h1 className="text-2xl font-bold">{i18n("connectionsTitle")}</h1>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === cat.id
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon name={cat.icon} className="h-3.5 w-3.5" />
            {i18n(cat.id)}
          </button>
        ))}
      </div>

      {loading && (
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="loader-2" className="h-5 w-5 animate-spin text-[var(--muted)]" />
            <p className="text-sm text-[var(--muted)]">{i18n("loading")}</p>
          </div>
        </Card3D>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((integration) => {
          const iconName = categoryIcons[integration.category] || "blocks";
          const isConnected = connected[integration.id] === true;
          const isOauth = integration.status === "oauth";
          const clientId = clientIds[integration.id] || "";

          function handleConnect() {
            if (!clientId.trim()) return;
            success(i18n("connectSuccess"));
            window.location.href = buildAuthUrl(integration.id, clientId.trim(), { provider: integration.id, clientId: clientId.trim() });
          }

          async function handleDisconnect() {
            try {
              await fetchWorker(`/api/${integration.id}/oauth/disconnect`, { method: "POST", body: JSON.stringify({}) });
              setConnected((c) => ({ ...c, [integration.id]: false }));
              success(i18n("disconnectSuccess"));
            } catch {
              showError(i18n("error"));
            }
          }

          return (
            <Card3D key={integration.id}>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)] text-[var(--muted)]">
                  <Icon name={iconName} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{integration.name}</p>
                  <p className="text-xs text-[var(--muted)]">{i18n(integration.description)}</p>
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
                  {isConnected ? i18n("connected") : i18n(integration.status)}
                </span>
              </div>
              {isOauth && !isConnected && (
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientIds((c) => ({ ...c, [integration.id]: e.target.value }))}
                    aria-label={i18n("clientId")} placeholder={i18n("clientId")}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={!clientId.trim()}
                    className="w-full rounded-lg bg-[var(--accent)] px-2 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {i18n("connect")}
                  </button>
                </div>
              )}
              {isOauth && isConnected && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  {i18n("disconnect")}
                </button>
              )}
            </Card3D>
          );
        })}
      </div>

      <Card3D>
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Icon name="plug" className="h-4 w-4" />
          <p>{i18n("oauthInfo")}</p>
        </div>
      </Card3D>
    </div>
  );
}
