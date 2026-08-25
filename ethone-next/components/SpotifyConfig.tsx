"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plug, RefreshCw, Unlink } from "lucide-react";
import { useIntegrationStore } from "@/lib/hooks/useIntegrationStore";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { fetchWorker } from "@/lib/api";
import { pingIntegration, type PingResult } from "@/lib/connection-config";
import { integrationById } from "@/lib/integrations";
import { getIntegrationConfig } from "@/lib/integrations.config";
import { startOAuthConnect } from "@/lib/oauth";
import Input from "@/components/Input";
import SecureInput from "@/components/ui/SecureInput";

const PROVIDER = "spotify";
const FIELD = "spotifyUserId";
const SETTINGS_KEY = "liveSpotifyClientId";

export default function SpotifyConfig() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { settings, update } = useSettings();
  const { setField, getField } = useIntegrationStore();
  const config = useMemo(() => getIntegrationConfig(PROVIDER), []);

  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState<PingResult | undefined>();
  const [rawValue, setRawValue] = useState("");
  const [clientSecret, setClientSecret] = useState((getField(PROVIDER, "clientSecret") as string) || "");
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [origin, setOrigin] = useState("");
  const [oauthConnected, setOauthConnected] = useState(false);
  const [checking, setChecking] = useState(true);

  const integration = useMemo(() => integrationById(PROVIDER), []);
  const storedValue = getField(PROVIDER, FIELD);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const settingsValue = settings[SETTINGS_KEY] as string | undefined;
    if (storedValue) {
      setRawValue(storedValue);
    } else if (settingsValue) {
      setRawValue(settingsValue);
      setField(PROVIDER, FIELD, settingsValue);
    }
  }, [storedValue, settings, setField]);

  useEffect(() => {
    setChecking(true);
    fetchWorker("/api/connections")
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const map: Record<string, boolean> = {};
        rows.forEach((row: { provider: string; connected: boolean }) => {
          map[row.provider] = row.connected;
        });
        setOauthConnected(!!map[PROVIDER]);
      })
      .catch(() => setOauthConnected(false))
      .finally(() => setChecking(false));
  }, []);

  const isConnected = oauthConnected;

  const status: PingResult["status"] = useMemo(() => {
    if (health) return health.status;
    if (isConnected) return "connected";
    return "unconfigured";
  }, [health, isConnected]);

  const statusText = useMemo(() => {
    if (status === "connected") return i18n("connected", "Connecté");
    if (status === "error") return i18n("error", "Erreur");
    return i18n("notConfigured", "Non connecté");
  }, [status, i18n]);

  const statusClass =
    status === "connected"
      ? "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20"
      : status === "error"
        ? "bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30"
        : "bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)] border border-[var(--text-primary)]/[0.08]";

  async function handleConnect() {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      showError(i18n("clientIdRequired", "Client ID requis"));
      return;
    }
    setSubmitting(true);
    try {
      setField(PROVIDER, FIELD, trimmed);
      update({ [SETTINGS_KEY]: trimmed, liveNowPlayingSource: "spotify" } as Partial<typeof settings>);
      try {
        localStorage.setItem(`ethone:clientId:${PROVIDER}`, trimmed);
      } catch {}
      if (clientSecret.trim()) {
        setField(PROVIDER, "clientSecret", clientSecret.trim());
      }
      success(i18n("connecting", "Connexion..."));
      window.location.href = await startOAuthConnect(PROVIDER, trimmed, { provider: PROVIDER, clientId: trimmed });
    } catch (err) {
      showError(err instanceof Error ? err.message : i18n("error", "Erreur"));
      setSubmitting(false);
    }
  }

  async function handleTest() {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    setTesting(true);
    try {
      const clientIds = { [PROVIDER]: trimmed };
      const result = await pingIntegration(
        integration!,
        { ...settings, [SETTINGS_KEY]: trimmed },
        clientIds,
        {},
        { [PROVIDER]: isConnected }
      );
      setHealth(result);
      if (result.ok) {
        update({ [SETTINGS_KEY]: trimmed, liveNowPlayingSource: "spotify" } as Partial<typeof settings>);
        success(i18n("connected", "Connecté"));
      } else {
        showError(result.error || i18n("error", "Erreur"));
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : i18n("error", "Erreur"));
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm(`${i18n("disconnect", "Déconnecter")} Spotify ?`)) return;
    setSubmitting(true);
    try {
      await fetchWorker(`/api/${PROVIDER}/oauth/disconnect`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : i18n("error", "Erreur"));
    } finally {
      setRawValue("");
      setClientSecret("");
      setField(PROVIDER, FIELD, "");
      setField(PROVIDER, "clientSecret", "");
      update({ [SETTINGS_KEY]: "", liveNowPlayingSource: "lanyard" } as Partial<typeof settings>);
      try {
        localStorage.removeItem(`ethone:clientId:${PROVIDER}`);
      } catch {}
      setHealth(undefined);
      setOauthConnected(false);
      setSubmitting(false);
      success(i18n("disconnectSuccess", "Déconnecté"));
    }
  }

  if (!integration) return null;

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">Spotify</h3>
          <p className="text-xs text-[var(--text-muted)]">{i18n("descSpotify")}</p>
        </div>
        <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>{statusText}</span>
      </div>

      {!isConnected && (
        <>
          <SecureInput
            value={rawValue}
            onChange={setRawValue}
            label={config?.idLabel || i18n("clientId")}
            placeholder={config?.idPlaceholder || "xxxxxxxxxxxxxxxxxxxx"}
            disabled={submitting || testing || checking}
          />

          {config?.requiresClientSecret && (
            <Input
              type={showClientSecret ? "text" : "password"}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              aria-label={config?.secretLabel || i18n("clientSecret")}
              placeholder={config?.secretPlaceholder || i18n("clientSecret")}
              inputSize="compact"
              inputClassName="text-xs"
              className="w-full"
              right={
                <button
                  type="button"
                  onClick={() => setShowClientSecret((v) => !v)}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showClientSecret ? i18n("hide") : i18n("show")}
                </button>
              }
            />
          )}

          {config?.requiresRedirectUri && origin && (
            <div className="rounded-xl border border-white/10 bg-[var(--text-primary)]/[0.03] p-2.5">
              <p className="text-[11px] font-medium text-[var(--text-primary)]">{i18n("redirectUri")}</p>
              <code className="mt-1 block break-all rounded-lg bg-[var(--background)] px-2 py-1 text-[10px] text-[var(--text-muted)]">
                {`${origin}${config.callbackPath}`}
              </code>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        {!isConnected ? (
          <>
            <button
              type="button"
              onClick={handleConnect}
              disabled={!rawValue.trim() || submitting || testing || checking}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3 py-2 text-sm font-bold text-[var(--accent-contrast)] shadow-md shadow-[var(--accent-primary)]/20 transition hover:bg-[var(--accent-primary)] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              {submitting ? i18n("connecting") : i18n("connect", "Connecter")}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={!rawValue.trim() || testing}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {testing ? i18n("testingInProgress") : i18n("testConnection")}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {testing ? i18n("testingInProgress") : i18n("testConnection")}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={submitting}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--danger)]/20 px-3 py-2 text-sm font-medium text-[var(--danger)] transition hover:border-[var(--danger)]/40 hover:bg-[var(--danger)]/10 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
              {submitting ? i18n("disconnecting") : i18n("disconnect", "Déconnecter")}
            </button>
          </>
        )}
      </div>

      {!!health?.data && (
        <pre className="max-h-40 overflow-auto rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 p-3 font-mono text-[10px] text-[var(--text-primary)]">
          {JSON.stringify(health.data as Record<string, unknown>, null, 2)}
        </pre>
      )}
    </div>
  );
}
