"use client";

import { useEffect, useMemo, useState } from "react";
import Card3D from "@/components/Card3D";
import { fetchWorker } from "@/lib/api";
import { useI18n } from "@/lib/hooks/useI18n";
import { buildAuthUrl, PROVIDERS as OAUTH_PROVIDERS } from "@/lib/oauth";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";
import { useSettings } from "@/components/SettingsProvider";
import type { Settings } from "@/lib/settings";
import { useProviderCredentials } from "@/lib/hooks/useProviderCredentials";
import type { ProviderCredential } from "@/lib/hooks/useProviderCredentials";
import ConnectionDiagnostics from "@/components/ConnectionDiagnostics";
import ConnectionInspector, { type InspectorIntegration } from "@/components/ConnectionInspector";

const categoryIcons: Record<string, string> = {
  media: "music",
  social: "message-square",
  gaming: "gamepad-2",
  productivity: "briefcase",
  development: "code",
  health: "heart-pulse",
  ai: "brain",
};

const INTEGRATIONS: { id: string; name: string; category: string; description: string; status: string }[] = [
  { id: "spotify", name: "Spotify", category: "media", description: "descSpotify", status: "oauth" },
  { id: "plex", name: "Plex", category: "media", description: "descPlex", status: "api" },
  { id: "jellyfin", name: "Jellyfin", category: "media", description: "descJellyfin", status: "local" },
  { id: "emby", name: "Emby", category: "media", description: "descEmby", status: "local" },
  { id: "youtube", name: "YouTube", category: "media", description: "descYoutube", status: "oauth" },
  { id: "twitch", name: "Twitch", category: "media", description: "descTwitch", status: "oauth" },
  { id: "lastfm", name: "Last.fm", category: "media", description: "descLastfm", status: "api" },
  { id: "discord", name: "Discord", category: "social", description: "descDiscord", status: "oauth" },
  { id: "reddit", name: "Reddit", category: "social", description: "descReddit", status: "oauth" },
  { id: "bluesky", name: "Bluesky", category: "social", description: "descBluesky", status: "api" },
  { id: "steam", name: "Steam", category: "gaming", description: "descSteam", status: "api" },
  { id: "riot", name: "Riot Games", category: "gaming", description: "descRiot", status: "api" },
  { id: "minecraft", name: "Minecraft", category: "gaming", description: "descMinecraft", status: "oauth" },
  { id: "tracker", name: "Tracker.gg", category: "gaming", description: "descTracker", status: "restricted" },
  { id: "google-calendar", name: "Google Calendar", category: "productivity", description: "descGoogleCalendar", status: "oauth" },
  { id: "google-drive", name: "Google Drive", category: "productivity", description: "descGoogleDrive", status: "oauth" },
  { id: "notion", name: "Notion", category: "productivity", description: "descNotion", status: "oauth" },
  { id: "todoist", name: "Todoist", category: "productivity", description: "descTodoist", status: "oauth" },
  { id: "linear", name: "Linear", category: "productivity", description: "descLinear", status: "oauth" },
  { id: "clickup", name: "ClickUp", category: "productivity", description: "descClickUp", status: "oauth" },
  { id: "jira", name: "Jira", category: "productivity", description: "descJira", status: "oauth" },
  { id: "email", name: "Email", category: "productivity", description: "descEmail", status: "oauth" },
  { id: "rss", name: "RSS", category: "productivity", description: "descRss", status: "feed" },
  { id: "weather", name: "Météo", category: "productivity", description: "descWeather", status: "api" },
  { id: "github", name: "GitHub", category: "development", description: "descGithub", status: "oauth" },
  { id: "gitlab", name: "GitLab", category: "development", description: "descGitLab", status: "oauth" },
  { id: "obsidian", name: "Obsidian", category: "development", description: "descObsidian", status: "local" },
  { id: "vscode", name: "VS Code", category: "development", description: "descVscode", status: "local" },
  { id: "fitbit", name: "Fitbit", category: "health", description: "descFitbit", status: "oauth" },
  { id: "lm-studio", name: "LM Studio", category: "ai", description: "descLmStudio", status: "local" },
  { id: "ollama", name: "Ollama", category: "ai", description: "descOllama", status: "local" },
  { id: "openai", name: "OpenAI", category: "ai", description: "descOpenai", status: "api" },
  { id: "anthropic", name: "Anthropic", category: "ai", description: "descAnthropic", status: "api" },
  { id: "gemini", name: "Gemini", category: "ai", description: "descGemini", status: "api" },
  { id: "groq", name: "Groq", category: "ai", description: "descGroq", status: "api" },
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

type PublicFieldDef = {
  key: keyof Settings;
  label: string;
  type?: string;
  options?: string[];
};

type CredentialFieldDef = {
  key: keyof ProviderCredential;
  label: string;
  type?: string;
};

const PUBLIC_FIELDS: Record<string, PublicFieldDef[]> = {
  discord: [{ key: "liveLanyardUserId", label: "liveLanyardUserId" }],
  steam: [{ key: "liveSteamId", label: "liveSteamId" }],
  lastfm: [{ key: "liveLastfmUsername", label: "liveLastfmUsername" }],
  twitch: [{ key: "liveTwitchLogin", label: "liveTwitchLogin" }],
  riot: [
    { key: "liveTrackerRiotName", label: "liveTrackerRiotName" },
    { key: "liveTrackerRiotTag", label: "liveTrackerRiotTag" },
  ],
  tracker: [
    { key: "liveTrackerApexPlatform", label: "liveTrackerApexPlatform", options: ["origin", "xbl", "psn"] },
    { key: "liveTrackerApexIdentifier", label: "liveTrackerApexIdentifier" },
  ],
  weather: [{ key: "liveWeatherCity", label: "liveWeatherCity" }],
  rss: [{ key: "liveRssUrl", label: "liveRssUrl" }],
  minecraft: [{ key: "liveMinecraftUsername", label: "liveMinecraftUsername" }],
  bluesky: [{ key: "liveBlueskyHandle", label: "liveBlueskyHandle" }],
  "lm-studio": [{ key: "liveLmStudioUrl", label: "liveLmStudioUrl" }],
  ollama: [{ key: "liveOllamaUrl", label: "liveOllamaUrl" }],
};

const CREDENTIAL_FIELDS: Record<string, CredentialFieldDef[]> = {
  steam: [{ key: "apiKey", label: "apiKey", type: "password" }],
  lastfm: [{ key: "apiKey", label: "apiKey", type: "password" }],
  twitch: [
    { key: "clientId", label: "clientId" },
    { key: "clientSecret", label: "clientSecret", type: "password" },
  ],
  riot: [
    { key: "henrikApiKey", label: "henrikApiKey", type: "password" },
    { key: "riotApiKey", label: "riotApiKey", type: "password" },
  ],
  tracker: [{ key: "apiKey", label: "apiKey", type: "password" }],
  openai: [{ key: "apiKey", label: "apiKey", type: "password" }],
  anthropic: [{ key: "apiKey", label: "apiKey", type: "password" }],
  gemini: [{ key: "apiKey", label: "apiKey", type: "password" }],
  groq: [{ key: "apiKey", label: "apiKey", type: "password" }],
  plex: [
    { key: "url", label: "URL Plex (optionnel)" },
    { key: "apiKey", label: "Token Plex", type: "password" },
  ],
  jellyfin: [
    { key: "url", label: "URL Jellyfin" },
    { key: "apiKey", label: "Clé API Jellyfin", type: "password" },
  ],
  emby: [
    { key: "url", label: "URL Emby" },
    { key: "apiKey", label: "Clé API Emby", type: "password" },
  ],
  linear: [{ key: "apiKey", label: "Token personnel Linear", type: "password" }],
  clickup: [{ key: "apiKey", label: "Token personnel ClickUp", type: "password" }],
  jira: [
    { key: "domain", label: "Domaine (ex: mondomaine.atlassian.net)" },
    { key: "email", label: "Email Atlassian" },
    { key: "apiKey", label: "Token API Jira", type: "password" },
  ],
  gitlab: [{ key: "apiKey", label: "Token personnel GitLab", type: "password" }],
  obsidian: [
    { key: "url", label: "URL API locale (ex: http://localhost:27123)" },
    { key: "apiKey", label: "Token Obsidian", type: "password" },
  ],
  vscode: [
    { key: "url", label: "URL VS Code Server / locale" },
    { key: "apiKey", label: "Token (optionnel)", type: "password" },
  ],
  fitbit: [{ key: "apiKey", label: "Token Fitbit", type: "password" }],
};

function isApiConfigured(
  integration: { id: string },
  settings: Settings,
  credentialConnected: Record<string, boolean>
): boolean {
  const publicFields = PUBLIC_FIELDS[integration.id] || [];
  const credentialFields = CREDENTIAL_FIELDS[integration.id] || [];
  const hasPublic = publicFields.length > 0
    ? publicFields.every((f) => {
        const value = settings[f.key];
        return typeof value === "string" && value.trim().length > 0;
      })
    : true;
  const hasCredential = credentialFields.length > 0
    ? credentialConnected[integration.id] === true
    : true;
  return hasPublic && hasCredential;
}

function isConfigured(
  integration: { id: string; status: string },
  settings: Settings,
  credentialConnected: Record<string, boolean>,
  oauthConnected: Record<string, boolean>
): boolean {
  if (integration.status === "restricted" || integration.status === "limited") return false;
  const publicFields = PUBLIC_FIELDS[integration.id] || [];
  const credentialFields = CREDENTIAL_FIELDS[integration.id] || [];
  if (publicFields.length === 0 && credentialFields.length === 0) {
    if (integration.status === "oauth") return oauthConnected[integration.id] === true;
    return false;
  }
  return isApiConfigured(integration, settings, credentialConnected);
}

const statusClasses: Record<string, string> = {
  oauth: "bg-violet-500/10 text-violet-400",
  api: "bg-sky-500/10 text-sky-400",
  local: "bg-amber-500/10 text-amber-400",
  feed: "bg-amber-500/10 text-amber-400",
  restricted: "bg-zinc-500/10 text-zinc-400",
  limited: "bg-zinc-500/10 text-zinc-400",
};

export default function ConnectionsPage() {
  const [filter, setFilter] = useState("all");
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [clientIds, setClientIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const i18n = useI18n();
  const [inspected, setInspected] = useState<InspectorIntegration | null>(null);
  const { success, error: showError } = useToast();
  const { settings, update: updateSettings } = useSettings();
  const credentials = useProviderCredentials();

  useEffect(() => {
    setClientIds((prev) => ({
      ...prev,
      spotify: settings.liveSpotifyClientId || prev.spotify || "",
      youtube: settings.liveYoutubeClientId || prev.youtube || "",
      reddit: settings.liveRedditClientId || prev.reddit || "",
      "google-calendar": settings.calendarClientId || prev["google-calendar"] || "",
      "google-drive": settings.driveClientId || prev["google-drive"] || "",
    }));
  }, [settings.liveSpotifyClientId, settings.liveYoutubeClientId, settings.liveRedditClientId, settings.calendarClientId, settings.driveClientId]);

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

      <ConnectionDiagnostics />

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

      {(loading || credentials.loading) && (
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
          const isConnected = isConfigured(integration, settings, credentials.connected, connected);
          const clientId = clientIds[integration.id] || "";
          const publicFields = PUBLIC_FIELDS[integration.id] || [];
          const credentialFields = CREDENTIAL_FIELDS[integration.id] || [];
          const hasInputs = publicFields.length > 0 || credentialFields.length > 0;
          const isOauth = integration.status === "oauth" && !hasInputs;

          function handleConnect() {
            const trimmed = clientId.trim();
            if (!trimmed) return;
            if (!OAUTH_PROVIDERS[integration.id]) {
              showError(i18n("error"));
              return;
            }
            if (integration.id === "spotify") updateSettings({ liveSpotifyClientId: trimmed });
            if (integration.id === "youtube") updateSettings({ liveYoutubeClientId: trimmed });
            if (integration.id === "reddit") updateSettings({ liveRedditClientId: trimmed });
            if (integration.id === "google-calendar") updateSettings({ calendarClientId: trimmed });
            if (integration.id === "google-drive") updateSettings({ driveClientId: trimmed });
            success(i18n("connectSuccess"));
            window.location.href = buildAuthUrl(integration.id, trimmed, { provider: integration.id, clientId: trimmed });
          }

          async function handleDisconnect() {
            try {
              if (isOauth) {
                await fetchWorker(`/api/${integration.id}/oauth/disconnect`, {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                setConnected((c) => ({ ...c, [integration.id]: false }));
              } else {
                if (credentialFields.length > 0) {
                  await credentials.remove(integration.id);
                }
                if (publicFields.length > 0) {
                  const patch: Partial<Settings> = {};
                  publicFields.forEach((f) => {
                    (patch as Record<string, unknown>)[f.key as string] = "";
                  });
                  updateSettings(patch);
                }
              }
              success(i18n("disconnectSuccess"));
            } catch {
              showError(i18n("error"));
            }
          }

          async function handleSave(values: Record<string, string>, credValues: Record<string, string>) {
            try {
              if (publicFields.length > 0) {
                const patch: Partial<Settings> = {};
                publicFields.forEach((f) => {
                  (patch as Record<string, unknown>)[f.key as string] = values[f.label] || "";
                });
                updateSettings(patch);
              }

              if (credentialFields.length > 0) {
                const credential: ProviderCredential = {};
                credentialFields.forEach((f) => {
                  const v = (credValues[f.label] || "").trim();
                  if (v) (credential as Record<string, unknown>)[f.key as string] = v;
                });
                if (Object.keys(credential).length > 0) {
                  await credentials.save(integration.id, credential);
                }
              }

              success(i18n("saved"));
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
                    isConnected ? "bg-emerald-500/10 text-emerald-400" : statusClasses[integration.status]
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
                    aria-label={i18n("clientId")}
                    placeholder={i18n("clientId")}
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

              <button
                type="button"
                onClick={() => setInspected(integration)}
                className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
              >
                {i18n("inspect")}
              </button>

              {hasInputs && (
                <IntegrationInputs
                  publicFields={publicFields}
                  credentialFields={credentialFields}
                  settings={settings}
                  i18n={i18n}
                  onSave={handleSave}
                  onDisconnect={handleDisconnect}
                />
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

      {inspected && (
        <ConnectionInspector
          integration={inspected}
          isOpen={!!inspected}
          onClose={() => setInspected(null)}
          connected={isConfigured(inspected, settings, credentials.connected, connected)}
        />
      )}
    </div>
  );
}

function IntegrationInputs({
  publicFields,
  credentialFields,
  settings,
  i18n,
  onSave,
  onDisconnect,
}: {
  publicFields: PublicFieldDef[];
  credentialFields: CredentialFieldDef[];
  settings: Settings;
  i18n: (key: string) => string;
  onSave: (values: Record<string, string>, credValues: Record<string, string>) => void;
  onDisconnect: () => void;
}) {
  const publicInitial = useMemo(() => {
    const map: Record<string, string> = {};
    publicFields.forEach((f) => {
      const v = settings[f.key];
      map[f.label] = typeof v === "string" ? v : "";
    });
    return map;
  }, [publicFields, settings]);

  const [values, setValues] = useState(publicInitial);
  const [credValues, setCredValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    credentialFields.forEach((f) => {
      map[f.label] = "";
    });
    return map;
  });

  useEffect(() => {
    setValues(publicInitial);
  }, [publicInitial]);

  const hasCred = credentialFields.length > 0;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {publicFields.map((f) =>
        f.options ? (
          <select
            key={f.label}
            value={values[f.label] || ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.label]: e.target.value }))}
            aria-label={i18n(f.label)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            {f.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <input
            key={f.label}
            type={f.type || "text"}
            value={values[f.label] || ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.label]: e.target.value }))}
            aria-label={i18n(f.label)}
            placeholder={i18n(f.label)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          />
        )
      )}

      {hasCred &&
        credentialFields.map((f) => (
          <input
            key={f.label}
            type={f.type || "text"}
            value={credValues[f.label] || ""}
            onChange={(e) => setCredValues((v) => ({ ...v, [f.label]: e.target.value }))}
            aria-label={i18n(f.label)}
            placeholder={i18n(f.label)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          />
        ))}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(values, credValues)}
          className="flex-1 rounded-lg bg-[var(--accent)] px-2 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          {i18n("save")}
        </button>
        <button
          type="button"
          onClick={onDisconnect}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          {i18n("disconnect")}
        </button>
      </div>
    </div>
  );
}
