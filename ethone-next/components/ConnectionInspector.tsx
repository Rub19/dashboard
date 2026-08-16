"use client";

import { useEffect, useMemo, useState } from "react";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { fetchWorker } from "@/lib/api";
import { useI18n } from "@/lib/hooks/useI18n";

type Tab = "overview" | "setup" | "methods" | "diagnostics";

const SETUP_TEXT: Record<string, { needed: string[]; steps: string[] }> = {
  spotify: {
    needed: ["Spotify Developer account", "Client ID"],
    steps: ["Create an app in Spotify Developer Dashboard", "Add redirect URI https://yourdomain.com/api/spotify/callback", "Paste Client ID then connect."],
  },
  github: {
    needed: ["GitHub OAuth app", "Client ID and Secret"],
    steps: ["Create an OAuth app in GitHub Settings > Developer settings", "Set redirect URI to /api/github/callback", "Paste Client ID, Worker needs GITHUB_CLIENT_SECRET."],
  },
  "google-calendar": {
    needed: ["Google Cloud project", "OAuth client"],
    steps: ["Create OAuth 2.0 credentials in Google Cloud Console", "Add redirect URIs for /api/google-calendar/callback", "Paste Client ID, Worker needs GOOGLE_CLIENT_SECRET."],
  },
  "google-drive": {
    needed: ["Google Cloud project", "OAuth client"],
    steps: ["Create OAuth 2.0 credentials in Google Cloud Console", "Add redirect URIs for /api/google-drive/callback", "Paste Client ID, Worker needs GOOGLE_CLIENT_SECRET."],
  },
  youtube: {
    needed: ["Google Cloud project", "OAuth client"],
    steps: ["Use YouTube Data API v3 in Google Cloud", "Add redirect URI /api/youtube/callback", "Paste Client ID, Worker needs GOOGLE_CLIENT_SECRET."],
  },
  reddit: {
    needed: ["Reddit app"],
    steps: ["Create a web app in Reddit > app preferences", "Set redirect URI /api/reddit/callback", "Paste Client ID, Worker needs REDDIT_CLIENT_SECRET."],
  },
  twitch: {
    needed: ["Twitch Developer Console"],
    steps: ["Register an app at dev.twitch.tv", "Set redirect URI /api/twitch/callback", "Worker needs TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET."],
  },
  discord: {
    needed: ["Discord Developer Portal"],
    steps: ["Create an OAuth2 app in Discord Developer Portal", "Add redirect URI /api/discord/callback", "Paste Client ID and configure Lanyard user ID if needed."],
  },
  notion: {
    needed: ["Notion Integration"],
    steps: ["Create an integration in Notion > Integrations", "Share databases with the integration", "Connect and allow access."],
  },
  todoist: {
    needed: ["Todoist app"],
    steps: ["Create an app in Todoist App Management", "Set redirect URI /api/todoist/callback", "Worker needs TODOIST_CLIENT_SECRET."],
  },
  linear: {
    needed: ["Linear personal token"],
    steps: ["Go to Linear Settings > API > Create token", "Paste token in credential field."],
  },
  clickup: {
    needed: ["ClickUp personal token"],
    steps: ["Go to ClickUp Settings > Apps > Generate token", "Paste token in credential field."],
  },
  jira: {
    needed: ["Jira domain", "email", "API token"],
    steps: ["Generate an API token at https://id.atlassian.com", "Paste domain, email and token."],
  },
  gitlab: {
    needed: ["GitLab personal token"],
    steps: ["Go to GitLab > Preferences > Access Tokens", "Create token with read_user and read_api", "Paste token."],
  },
  steam: {
    needed: ["Steam Web API key"],
    steps: ["Get a Steam Web API key from https://steamcommunity.com/dev/apikey", "Paste key and Steam64 ID."],
  },
  lastfm: {
    needed: ["Last.fm API account"],
    steps: ["Create an API account at https://www.last.fm/api/account/create", "Paste API key and Last.fm username."],
  },
  weather: {
    needed: ["City name"],
    steps: ["Enter the city name in the public field. Worker fetches via Open-Meteo."],
  },
  rss: {
    needed: ["Feed URL"],
    steps: ["Paste the RSS/Atom feed URL."],
  },
  minecraft: {
    needed: ["Minecraft UUID or username"],
    steps: ["Enter the UUID or username. Worker will resolve profile."],
  },
  tracker: {
    needed: ["Tracker.gg API key", "Apex platform and identifier"],
    steps: ["Get a Tracker.gg API key", "Paste key, Apex platform and identifier."],
  },
  riot: {
    needed: ["Henrik API key or Riot API key"],
    steps: ["For Valorant: Henrik API key", "For LoL: Riot API key", "Enter Riot name and tag."],
  },
  openai: {
    needed: ["OpenAI API key"],
    steps: ["Create a secret key at https://platform.openai.com/api-keys", "Paste token."],
  },
  anthropic: {
    needed: ["Anthropic API key"],
    steps: ["Create a key at https://console.anthropic.com/", "Paste token."],
  },
  gemini: {
    needed: ["Google AI Studio API key"],
    steps: ["Create a key at https://aistudio.google.com/app/apikey", "Paste token."],
  },
  groq: {
    needed: ["Groq API key"],
    steps: ["Create a key at https://console.groq.com/keys", "Paste token."],
  },
};

const METHOD_TEXT: Record<string, string[]> = {
  spotify: ["GET /api/spotify/now", "POST /api/spotify/control", "GET /api/spotify/recent"],
  github: ["GET /api/github/events", "GET /api/github/profile"],
  "google-calendar": ["GET /api/calendar/events", "POST /api/calendar/events"],
  "google-drive": ["GET /api/cloud/files", "POST /api/cloud/shares"],
  youtube: ["GET /api/youtube/recent"],
  reddit: ["GET /api/reddit/inbox", "GET /api/reddit/submissions"],
  twitch: ["GET /api/twitch/streams"],
  discord: ["GET /api/discord/presence"],
  notion: ["GET /api/notion/pages"],
  todoist: ["GET /api/todoist/tasks"],
  linear: ["GET /api/linear/issues"],
  clickup: ["GET /api/clickup/tasks"],
  jira: ["GET /api/jira/issues"],
  gitlab: ["GET /api/gitlab/projects"],
  steam: ["GET /api/steam/profile", "GET /api/steam/games"],
  lastfm: ["GET /api/lastfm/recent"],
  weather: ["GET /api/weather"],
  rss: ["GET /api/rss"],
  minecraft: ["GET /api/minecraft/profile"],
  tracker: ["GET /api/tracker/apex-matches", "GET /api/tracker/valorant-matches"],
  riot: ["GET /api/tracker/valorant-matches", "GET /api/tracker/lol-matches"],
  openai: ["POST /api/brain/complete"],
  anthropic: ["POST /api/brain/complete"],
  gemini: ["POST /api/brain/complete"],
  groq: ["POST /api/brain/complete"],
};

function sectionFor(id: string) {
  const base = SETUP_TEXT[id];
  if (base) return base;
  return { needed: ["Credentials or OAuth"], steps: ["Check the settings for this provider."] };
}

function methodsFor(id: string) {
  return METHOD_TEXT[id] || ["No public routes documented."];
}

export type InspectorIntegration = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: string;
};

export default function ConnectionInspector({
  integration,
  isOpen,
  onClose,
  connected,
}: {
  integration: InspectorIntegration;
  isOpen: boolean;
  onClose: () => void;
  connected: boolean;
}) {
  const i18n = useI18n();
  const [tab, setTab] = useState<Tab>("overview");
  const [diagnostic, setDiagnostic] = useState<{ available: boolean; requiredBindings: number } | null>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDiagnosticLoading(true);
    fetchWorker(`/api/diagnostic?service=${encodeURIComponent(integration.id)}`)
      .then((res) => {
        const services = res?.data?.services;
        const row = Array.isArray(services) ? services[0] : null;
        setDiagnostic(row ? { available: !!row.available, requiredBindings: row.requiredBindings || 0 } : null);
      })
      .catch(() => setDiagnostic(null))
      .finally(() => setDiagnosticLoading(false));
  }, [isOpen, integration.id]);

  const setup = useMemo(() => sectionFor(integration.id), [integration.id]);
  const methods = useMemo(() => methodsFor(integration.id), [integration.id]);

  if (!isOpen) return null;

  const statusColor = connected
    ? "bg-emerald-500/10 text-emerald-400"
    : integration.status === "oauth" || integration.status === "api"
    ? "bg-sky-500/10 text-sky-400"
    : "bg-amber-500/10 text-amber-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`rounded-[var(--panel-radius)] px-2.5 py-1 text-xs font-semibold ${statusColor}`}>
              {connected ? i18n("connected") : i18n(integration.status)}
            </span>
            <h2 className="text-xl font-bold">{integration.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
            aria-label={i18n("close")}
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex gap-1 rounded-[var(--panel-radius)] border border-[var(--border)] bg-[var(--surface-raised)] p-1">
          {(["overview", "setup", "methods", "diagnostics"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-[var(--panel-radius)] py-1.5 text-xs font-medium transition-colors ${
                tab === t ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
              }`}
            >
              {i18n(t)}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {tab === "overview" && (
            <Card3D>
              <p className="text-sm font-medium">{integration.description}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{i18n("category")}: {integration.category}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("status")}: {integration.status}</p>
              {connected && (
                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
                  <Icon name="circle-check" className="h-4 w-4" />
                  <span>{i18n("connected")}</span>
                </div>
              )}
            </Card3D>
          )}

          {tab === "setup" && (
            <Card3D>
              <p className="mb-2 font-semibold">{i18n("setupRequirements")}</p>
              <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]">
                {setup.needed.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
              <p className="mb-2 font-semibold">{i18n("steps")}</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--foreground)]">
                {setup.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>

            </Card3D>
          )}

          {tab === "methods" && (
            <Card3D>
              <p className="mb-2 font-semibold">{i18n("availableRoutes")}</p>
              <div className="space-y-2">
                {methods.map((m, i) => (
                  <div key={i} className="rounded-[var(--panel-radius)] bg-[var(--surface-raised)] px-3 py-2 font-mono text-xs">
                    {m}
                  </div>
                ))}
              </div>
            </Card3D>
          )}

          {tab === "diagnostics" && (
            <Card3D>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">{i18n("workerDiagnostics")}</p>
                {diagnosticLoading && <Icon name="loader" className="h-4 w-4 animate-spin text-[var(--muted)]" />}
              </div>
              {diagnostic ? (
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <Icon name={diagnostic.available ? "circle-check" : "alert-circle"} className={`h-4 w-4 ${diagnostic.available ? "text-emerald-400" : "text-amber-400"}`} />
                    {diagnostic.available ? i18n("serviceAvailable") : i18n("serviceNotAvailable")}
                  </p>
                  <p className="text-[var(--muted)]">{i18n("requiredBindings")}: {diagnostic.requiredBindings}</p>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">{i18n("diagnosticUnavailable")}</p>
              )}
            </Card3D>
          )}
        </div>
      </div>
    </div>
  );
}
