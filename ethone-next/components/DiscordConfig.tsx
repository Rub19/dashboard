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
    if (profile?.connected && profile.user?.id && !settings.liveLanyardUserId) {
      update({ liveLanyardUserId: profile.user.id });
    }
  }, [profile?.connected, profile?.user?.id, discordMode, settings.liveLanyardUserId, update]);

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
      ? "bg-green-500/10 text-green-400 border border-green-500/20"
      : status === "error"
        ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
        : "bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)] border border-[var(--text-primary)]/[0.08]";

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
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">Discord</h3>
          <p className="text-xs text-[var(--text-muted)]">{i18n("descDiscord")}</p>
        </div>
        <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>{statusText}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.03] p-1">
        <button
          type="button"
          onClick={() => setMode("lanyard")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            isLanyard ? "bg-[var(--text-primary)]/10 text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          Lanyard
        </button>
        <button
          type="button"
          onClick={() => setMode("oauth2")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            isOAuth2 ? "bg-[var(--text-primary)]/10 text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
              className={`col-span-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-all disabled:opacity-50 ${
                rawValue.trim()
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-lg shadow-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]"
                  : "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md shadow-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]"
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
              className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {testing ? i18n("testingInProgress") : i18n("testConnection")}
            </button>
            {rawValue.trim() && (
              <button
                type="button"
                onClick={handleLanyardDisconnect}
                disabled={submitting}
                className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--danger)]/20 px-3 py-2 text-sm font-medium text-[var(--danger)] transition hover:border-[var(--danger)]/40 hover:bg-[var(--danger)]/10 disabled:opacity-50"
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
              <div className="flex items-center gap-3 rounded-xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.03] p-3">
                <ClientImage
                  src={profile?.user?.avatarUrl}
                  alt={profile?.user?.globalName || profile?.user?.username || "Discord"}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                  fallback={
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-[var(--text-muted)]">
                      {initials(profile?.user?.globalName || profile?.user?.username)}
                    </div>
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--text-primary)]">
                    {profile?.user?.globalName || profile?.user?.username || "Discord"}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">@{profile?.user?.username}</p>
                  {profile?.user?.email && (
                    <p className="truncate text-xs text-[var(--text-muted)]">{profile.user.email}</p>
                  )}
                </div>
              </div>

              {!!profile?.connections && profile.connections.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Comptes liés</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.connections.map((c) => {
                      const icon = iconForConnection(c.type);
                      return (
                        <span
                          key={`${c.type}:${c.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.03] px-2.5 py-1 text-[10px] text-[var(--text-primary)]"
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
                  <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Serveurs</p>
                  <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto no-scrollbar">
                    {profile.guilds.slice(0, 24).map((g) => (
                      <span
                        key={g.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.03] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                      >
                        <ClientImage
                          candidates={[g.iconUrl, guildIconUrl(g.id, g.icon)]}
                          alt=""
                          width={24}
                          height={24}
                          loading="eager"
                          className="h-6 w-6 rounded-md"
                          fallback={
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-700 text-[10px] font-semibold uppercase text-[var(--text-primary)]">
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
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Actualiser
                </button>
                <button
                  type="button"
                  onClick={handleOAuthDisconnect}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--danger)]/20 px-3 py-2 text-sm font-medium text-[var(--danger)] transition hover:border-[var(--danger)]/40 hover:bg-[var(--danger)]/10 disabled:opacity-50"
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
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3 py-2 text-sm font-bold text-[var(--accent-contrast)] shadow-lg shadow-[var(--accent-primary)]/20 transition hover:bg-[var(--accent-primary)] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              Se connecter avec Discord
            </button>
          )}
        </div>
      )}

      {!!health?.data && isLanyard && (
        <pre className="max-h-40 overflow-auto rounded-xl bg-black/30 p-3 font-mono text-[10px] text-[var(--text-primary)]">
          {JSON.stringify(health.data as Record<string, unknown>, null, 2)}
        </pre>
      )}
    </div>
  );
}
