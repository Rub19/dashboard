"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plug, RefreshCw, Save, Unlink } from "lucide-react";
import { useIntegrationStore } from "@/lib/hooks/useIntegrationStore";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { pingIntegration, type PingResult } from "@/lib/connection-config";
import { integrationById } from "@/lib/integrations";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { Icon } from "@/lib/icons";
import ClientImage from "@/components/ClientImage";
import SecureInput from "@/components/ui/SecureInput";

const PROVIDER = "discord";
const FIELD = "discordUserId";
const SETTINGS_KEY = "liveLanyardUserId";

const CONNECTION_ICONS: Record<string, string> = {
  "amazon-music": "amazon",
  "battlenet": "battledotnet",
  "bluesky": "bluesky",
  "domain": "globe",
  "epicgames": "epicgames",
  "github": "github",
  "playstation": "playstation",
  "reddit": "reddit",
  "spotify": "spotify",
  "steam": "steam",
  "tiktok": "tiktok",
  "twitch": "twitch",
  "twitter": "twitter",
  "xbox": "xbox",
  "youtube": "youtube",
};

function iconForConnection(type: string): { name: string; brand: boolean } {
  const name = CONNECTION_ICONS[type];
  if (!name) return { name: "link", brand: false };
  if (["globe"].includes(name)) return { name, brand: false };
  return { name, brand: true };
}

function initials(name?: string) {
  return (name || "?").slice(0, 1).toUpperCase();
}

function guildIconUrl(id?: string, icon?: string) {
  if (!id || !icon) return "";
  const ext = icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${encodeURIComponent(id)}/${encodeURIComponent(icon)}.${ext}?size=128`;
}

export default function DiscordConfig() {
  const i18n = useI18n();
  const { error: showError, notify } = useToast();
  const { settings, update } = useSettings();
  const { setField, getField } = useIntegrationStore();
  const { profile, loading, connect, disconnect, refresh } = useDiscordOAuth();

  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState<PingResult | undefined>();
  const [rawValue, setRawValue] = useState("");

  const integration = useMemo(() => integrationById(PROVIDER), []);
  const storedValue = getField(PROVIDER, FIELD);

  useEffect(() => {
    const settingsValue = settings[SETTINGS_KEY] as string | undefined;
    if (storedValue) {
      setRawValue(storedValue);
    } else if (settingsValue) {
      setRawValue(settingsValue);
      setField(PROVIDER, FIELD, settingsValue);
    }
  }, [storedValue, settings, setField]);

  const discordMode = (settings.discordMode as "lanyard" | "oauth2") || "lanyard";
  const isLanyard = discordMode === "lanyard";
  const isOAuth2 = discordMode === "oauth2";
  const isOAuthConnected = profile?.connected && isOAuth2;

  useEffect(() => {
    if (profile?.connected && discordMode !== "oauth2") {
      update({ discordMode: "oauth2" });
    }
  }, [profile?.connected, discordMode, update]);

  const status: PingResult["status"] = useMemo(() => {
    if (health) return health.status;
    if (isOAuth2) return isOAuthConnected ? "connected" : "unconfigured";
    return rawValue.trim().length > 0 ? "connected" : "unconfigured";
  }, [health, isOAuth2, isOAuthConnected, rawValue]);

  const statusText = useMemo(() => {
    if (status === "connected") return i18n("connected", "Connecté");
    if (status === "error") return i18n("error", "Erreur");
    return i18n("notConfigured", "Non connecté");
  }, [status, i18n]);

  const statusClass =
    status === "connected"
      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
      : status === "error"
        ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
        : "bg-white/[0.04] text-zinc-400 border border-white/[0.08]";

  function setMode(mode: "lanyard" | "oauth2") {
    update({ discordMode: mode });
  }

  async function handleSave() {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      setField(PROVIDER, FIELD, trimmed);
      update({ [SETTINGS_KEY]: trimmed } as Partial<typeof settings>);
      notify.sync(i18n("saved"));
    } catch {
      showError(i18n("error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTest() {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    setTesting(true);
    try {
      update({ [SETTINGS_KEY]: trimmed } as Partial<typeof settings>);
      const testSettings = { ...settings, [SETTINGS_KEY]: trimmed };
      const result = await pingIntegration(integration!, testSettings, {}, {}, {});
      setHealth(result);
      if (result.ok) {
        notify.discord();
      } else {
        showError(result.error || i18n("error"));
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : i18n("error"));
    } finally {
      setTesting(false);
    }
  }

  function handleLanyardDisconnect() {
    if (!window.confirm(`${i18n("disconnect")} Discord ?`)) return;
    setRawValue("");
    setField(PROVIDER, FIELD, "");
    update({ [SETTINGS_KEY]: "" } as Partial<typeof settings>);
    setHealth(undefined);
    notify.discordDisconnect();
  }

  async function handleOAuthDisconnect() {
    if (!window.confirm(`${i18n("disconnect")} Discord ?`)) return;
    await disconnect();
    notify.discordDisconnect();
  }

  async function handleOAuthRefresh() {
    await refresh();
  }

  if (!integration) return null;

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">Discord</h3>
          <p className="text-xs text-zinc-500">{i18n("descDiscord")}</p>
        </div>
        <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>{statusText}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
        <button
          type="button"
          onClick={() => setMode("lanyard")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            isLanyard ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Lanyard
        </button>
        <button
          type="button"
          onClick={() => setMode("oauth2")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            isOAuth2 ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          OAuth2
        </button>
      </div>

      {isLanyard ? (
        <>
          <SecureInput
            value={rawValue}
            onChange={setRawValue}
            label={i18n("liveLanyardUserId")}
            placeholder="123456789012345678"
            disabled={submitting || testing}
          />

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!rawValue.trim() || submitting || testing}
              className={`col-span-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-50 ${
                rawValue.trim()
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500"
                  : "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400"
              }`}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : rawValue.trim() ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plug className="h-4 w-4" />
              )}
              {submitting ? i18n("saving") : rawValue.trim() ? i18n("save", "Sauvegarder") : i18n("connect", "Connecter")}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={!rawValue.trim() || testing}
              className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {testing ? i18n("testingInProgress") : i18n("testConnection")}
            </button>
            {rawValue.trim() && (
              <button
                type="button"
                onClick={handleLanyardDisconnect}
                disabled={submitting}
                className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 px-3 py-2 text-sm font-medium text-rose-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 disabled:opacity-50"
              >
                <Unlink className="h-4 w-4" />
                {i18n("disconnect", "Déconnecter")}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          {isOAuthConnected ? (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <ClientImage
                  src={profile?.user?.avatarUrl}
                  alt={profile?.user?.globalName || profile?.user?.username || "Discord"}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                  fallback={
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-400">
                      {initials(profile?.user?.globalName || profile?.user?.username)}
                    </div>
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">
                    {profile?.user?.globalName || profile?.user?.username || "Discord"}
                  </p>
                  <p className="truncate text-xs text-zinc-400">@{profile?.user?.username}</p>
                  {profile?.user?.email && (
                    <p className="truncate text-xs text-zinc-500">{profile.user.email}</p>
                  )}
                </div>
              </div>

              {!!profile?.connections && profile.connections.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-400">Comptes liés</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.connections.map((c) => {
                      const icon = iconForConnection(c.type);
                      return (
                        <span
                          key={`${c.type}:${c.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-zinc-300"
                        >
                          <Icon pack={icon.brand ? "brand" : "lucide"} name={icon.name} className="h-3.5 w-3.5" />
                          {c.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {!!profile?.guilds && profile.guilds.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-400">Serveurs</p>
                  <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                    {profile.guilds.slice(0, 24).map((g) => (
                      <span
                        key={g.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-zinc-300"
                      >
                        <ClientImage
                          src={g.iconUrl || guildIconUrl(g.id, g.icon)}
                          alt=""
                          width={16}
                          height={16}
                          className="h-4 w-4 rounded"
                          fallback={
                            <span className="flex h-4 w-4 items-center justify-center rounded bg-zinc-700 text-[8px]">
                              {initials(g.name)}
                            </span>
                          }
                        />
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleOAuthRefresh}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Actualiser
                </button>
                <button
                  type="button"
                  onClick={handleOAuthDisconnect}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 px-3 py-2 text-sm font-medium text-rose-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <Unlink className="h-4 w-4" />
                  {i18n("disconnect", "Déconnecter")}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("oauth2");
                connect();
              }}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              Se connecter avec Discord
            </button>
          )}
        </div>
      )}

      {!!health?.data && isLanyard && (
        <pre className="max-h-40 overflow-auto rounded-xl bg-black/30 p-3 font-mono text-[10px] text-zinc-300">
          {JSON.stringify(health.data as Record<string, unknown>, null, 2)}
        </pre>
      )}
    </div>
  );
}
