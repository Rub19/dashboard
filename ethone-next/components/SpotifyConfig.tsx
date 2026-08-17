"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Check, Unlink, Plug } from "lucide-react";
import { useIntegrationStore } from "@/lib/hooks/useIntegrationStore";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { pingIntegration, type PingResult } from "@/lib/connection-config";
import { integrationById } from "@/lib/integrations";
import SecureInput from "@/components/ui/SecureInput";

const PROVIDER = "spotify";
const FIELD = "spotifyUserId";
const SETTINGS_KEY = "liveSpotifyClientId";

export default function SpotifyConfig() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { settings, update } = useSettings();
  const { setField, getField } = useIntegrationStore();

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

  const status: PingResult["status"] = useMemo(() => {
    if (health) return health.status;
    if (rawValue.trim()) return "connected";
    return "unconfigured";
  }, [health, rawValue]);

  const statusText = useMemo(() => {
    if (status === "connected") return i18n("connected");
    if (status === "error") return i18n("error");
    return i18n("notConfigured");
  }, [status, i18n]);

  const statusClass =
    status === "connected"
      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
      : status === "error"
        ? "bg-red-500/15 text-red-300 border border-red-500/30"
        : "bg-zinc-800 text-zinc-400 border border-zinc-700";

  async function handleSave() {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      setField(PROVIDER, FIELD, trimmed);
      update({ [SETTINGS_KEY]: trimmed } as Partial<typeof settings>);
      success(i18n("saved"));
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
      const clientIds = { [PROVIDER]: trimmed };
      const result = await pingIntegration(
        integration!,
        { ...settings, [SETTINGS_KEY]: trimmed },
        clientIds,
        {},
        { [PROVIDER]: true }
      );
      setHealth(result);
      if (result.ok) {
        success(i18n("connected"));
      } else {
        showError(result.error || i18n("error"));
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : i18n("error"));
    } finally {
      setTesting(false);
    }
  }

  function handleDisconnect() {
    if (!window.confirm(`${i18n("disconnect")} Spotify ?`)) return;
    setRawValue("");
    setField(PROVIDER, FIELD, "");
    update({ [SETTINGS_KEY]: "" } as Partial<typeof settings>);
    setHealth(undefined);
    success(i18n("disconnectSuccess"));
  }

  if (!integration) return null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">Spotify</h3>
          <p className="text-xs text-zinc-500">{i18n("descSpotify")}</p>
        </div>
        <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>
          {statusText}
        </span>
      </div>

      <SecureInput
        value={rawValue}
        onChange={setRawValue}
        label={i18n("clientId")}
        placeholder="xxxxxxxxxxxxxxxxxxxx"
        disabled={submitting || testing}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!rawValue.trim() || submitting || testing}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-500 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {submitting ? i18n("saving") : i18n("save")}
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={!rawValue.trim() || testing}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] disabled:opacity-50"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
          {testing ? i18n("testingInProgress") : i18n("testConnection")}
        </button>
      </div>

      {rawValue.trim() && (
        <button
          type="button"
          onClick={handleDisconnect}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20"
        >
          <Unlink className="h-4 w-4" />
          {i18n("disconnect")}
        </button>
      )}

      {!!health?.data && (
        <pre className="max-h-40 overflow-auto rounded-xl bg-black/30 p-3 font-mono text-[10px] text-zinc-300">
          {JSON.stringify(health.data as Record<string, unknown>, null, 2)}
        </pre>
      )}
    </div>
  );
}
