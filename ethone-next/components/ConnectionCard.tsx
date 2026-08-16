"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Plug,
  PlugZap,
  RefreshCw,
  Save,
  Trash2,
  Unlink,
} from "lucide-react";
import { useIntegrationStore } from "@/lib/hooks/useIntegrationStore";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import { buildAuthUrl, PROVIDERS as OAUTH_PROVIDERS } from "@/lib/oauth";
import { getConnectionGuide, type ConnectionGuide } from "@/config/connectionsGuide";
import type { Integration } from "@/lib/integrations";
import type { Settings } from "@/lib/settings";
import type { ProviderCredential } from "@/lib/hooks/useProviderCredentials";
import {
  CREDENTIAL_FIELDS,
  isConfigured,
  PUBLIC_FIELDS,
  type PingResult,
  getServiceMethodKey,
} from "@/lib/connection-config";
import ServiceIcon from "@/components/ServiceIcon";
import Select from "@/components/ui/Select";

export type CredentialsApi = {
  save: (provider: string, credential: ProviderCredential) => Promise<unknown>;
  remove: (provider: string) => Promise<void>;
};

export default function ConnectionCard({
  integration,
  clientId,
  onClientIdChange,
  credentialConnected,
  oauthConnected,
  credentials,
  health,
  onTest,
}: {
  integration: Integration;
  clientId: string;
  onClientIdChange: (id: string, value: string) => void;
  credentialConnected: Record<string, boolean>;
  oauthConnected: Record<string, boolean>;
  credentials: CredentialsApi;
  health?: PingResult;
  onTest?: (id: string) => void;
}) {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { success, error: showError } = useToast();
  const { values: integrationValues, setField, setFields } = useIntegrationStore();

  const guide = useMemo<ConnectionGuide | undefined>(() => getConnectionGuide(integration.id), [integration.id]);

  const publicFields = useMemo(() => PUBLIC_FIELDS[integration.id] || [], [integration.id]);
  const credentialFields = useMemo(() => CREDENTIAL_FIELDS[integration.id] || [], [integration.id]);
  const hasInputs = publicFields.length > 0 || credentialFields.length > 0;
  const isOauth = integration.status === "oauth" && !hasInputs;

  const isConnected = isConfigured(integration, settings, credentialConnected, oauthConnected);

  const status: PingResult["status"] = health
    ? health.status
    : isConnected
      ? "connected"
      : integration.status === "restricted" || integration.status === "limited"
        ? "unconfigured"
        : "unconfigured";

  const statusText =
    status === "connected"
      ? i18n("connected")
      : status === "error"
        ? i18n("error")
        : integration.status === "restricted" || integration.status === "limited"
          ? i18n(integration.status)
          : i18n("notConfigured");

  const methodKey = getServiceMethodKey(integration.status);
  const methodClass =
    integration.status === "oauth"
      ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
      : integration.status === "api"
        ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
        : integration.status === "local" || integration.status === "feed"
          ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
          : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

  const statusClass =
    status === "connected"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : status === "error"
        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
        : "bg-white/[0.03] text-zinc-500 border-white/[0.06]";

  const storeValues = useMemo(() => integrationValues[integration.id] || {}, [integrationValues, integration.id]);

  const [publicValues, setPublicValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    publicFields.forEach((f) => {
      const fromStore = storeValues[f.key as string];
      const fromSettings = settings[f.key as string];
      map[f.label] = typeof fromStore === "string" ? fromStore : typeof fromSettings === "string" ? fromSettings : "";
    });
    return map;
  });

  useEffect(() => {
    setPublicValues((prev) => {
      const map = { ...prev };
      publicFields.forEach((f) => {
        const fromStore = storeValues[f.key as string];
        const fromSettings = settings[f.key as string];
        const next = typeof fromStore === "string" ? fromStore : typeof fromSettings === "string" ? fromSettings : "";
        if (!prev[f.label] && next) map[f.label] = next;
      });
      return map;
    });
  }, [publicFields, settings, storeValues]);

  const [credValues, setCredValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    credentialFields.forEach((f) => {
      const fromStore = storeValues[f.key as string];
      map[f.label] = typeof fromStore === "string" ? fromStore : "";
    });
    return map;
  });

  useEffect(() => {
    setCredValues((prev) => {
      const map = { ...prev };
      credentialFields.forEach((f) => {
        const fromStore = storeValues[f.key as string];
        const next = typeof fromStore === "string" ? fromStore : "";
        if (!prev[f.label] && next) map[f.label] = next;
      });
      return map;
    });
  }, [credentialFields, storeValues]);

  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [rawOpen, setRawOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openGuideField, setOpenGuideField] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (rawOpen && onTest) onTest(integration.id);
  }, [rawOpen, onTest, integration.id]);

  async function handleConnect() {
    const trimmed = clientId.trim();
    if (!trimmed) return;
    if (!OAUTH_PROVIDERS[integration.id]) {
      showError(i18n("error"));
      return;
    }
    setSubmitting(true);
    try {
      if (integration.id === "spotify") update({ liveSpotifyClientId: trimmed });
      if (integration.id === "youtube") update({ liveYoutubeClientId: trimmed });
      if (integration.id === "reddit") update({ liveRedditClientId: trimmed });
      if (integration.id === "google-calendar") update({ calendarClientId: trimmed });
      if (integration.id === "google-drive") update({ driveClientId: trimmed });
      try {
        localStorage.setItem(`ethone:clientId:${integration.id}`, trimmed);
      } catch {}
      success(i18n("connectSuccess"));
      window.location.href = buildAuthUrl(integration.id, trimmed, { provider: integration.id, clientId: trimmed });
    } catch {
      showError(i18n("error"));
      setSubmitting(false);
    }
  }

  async function handleDisconnect() {
    setSubmitting(true);
    try {
      if (isOauth) {
        await fetchWorker(`/api/${integration.id}/oauth/disconnect`, {
          method: "POST",
          body: JSON.stringify({}),
        });
      } else {
        if (credentialFields.length > 0) {
          await credentials.remove(integration.id);
        }
        if (publicFields.length > 0) {
          const patch: Partial<Settings> = {};
          publicFields.forEach((f) => {
            (patch as Record<string, unknown>)[f.key as string] = "";
          });
          update(patch);
        }
      }
      setPublicValues((prev) => {
        const next = { ...prev };
        publicFields.forEach((f) => (next[f.label] = ""));
        return next;
      });
      setCredValues((prev) => {
        const next = { ...prev };
        credentialFields.forEach((f) => (next[f.label] = ""));
        return next;
      });
      setFields(integration.id, {});
      if (integration.id === "spotify") {
        try { localStorage.removeItem(`ethone:clientId:${integration.id}`); } catch {}
      }
      success(i18n("disconnectSuccess"));
    } catch {
      showError(i18n("error"));
    } finally {
      setSubmitting(false);
    }
  }

  function syncPublicStore() {
    const fields: Record<string, string> = {};
    publicFields.forEach((f) => {
      const v = publicValues[f.label];
      if (v !== undefined) fields[f.key as string] = v;
    });
    if (Object.keys(fields).length > 0) setFields(integration.id, fields);
  }

  function syncCredStore() {
    const fields: Record<string, string> = {};
    credentialFields.forEach((f) => {
      const v = credValues[f.label];
      if (v !== undefined) fields[f.key as string] = v;
    });
    if (Object.keys(fields).length > 0) setFields(integration.id, fields);
  }

  async function handleSave() {
    setSubmitting(true);
    try {
      syncPublicStore();
      syncCredStore();

      if (publicFields.length > 0) {
        const patch: Partial<Settings> = {};
        publicFields.forEach((f) => {
          (patch as Record<string, unknown>)[f.key as string] = publicValues[f.label] || "";
        });
        update(patch);
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
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTest() {
    if (onTest) await onTest(integration.id);
  }

  async function handleCopy(value: string, key: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      success(i18n("copied"));
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  }

  function updatePublicValue(label: string, value: string) {
    setPublicValues((v) => ({ ...v, [label]: value }));
    const field = publicFields.find((f) => f.label === label);
    if (field) setField(integration.id, field.key as string, value);
  }

  function updateCredValue(label: string, value: string) {
    setCredValues((v) => ({ ...v, [label]: value }));
    const field = credentialFields.find((f) => f.label === label);
    if (field) setField(integration.id, field.key as string, value);
  }

  function toggleGuide(fieldKey: string) {
    setOpenGuideField((prev) => (prev === fieldKey ? null : fieldKey));
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-white/20";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" as const }}
      className="group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 shadow-xl backdrop-blur-2xl transition hover:border-white/15"
    >
      {/* Header */}
      <div>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
              <ServiceIcon id={integration.id} icon={integration.icon} className="h-5 w-5" colored />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{integration.name}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${methodClass}`}>
                  {i18n(methodKey)}
                </span>
              </div>
              <p className="truncate text-xs text-zinc-400">{i18n(integration.description)}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>{statusText}</span>
        </div>

        {/* OAuth connect */}
        {isOauth && !isConnected && (
          <div className="flex flex-col gap-2.5">
            <input
              type="text"
              value={clientId}
              onChange={(e) => onClientIdChange(integration.id, e.target.value)}
              aria-label={i18n("clientId")}
              placeholder={i18n("clientId")}
              className={inputClass}
            />

            {guide && (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleGuide("oauth")}
                  aria-expanded={openGuideField === "oauth"}
                  className="flex w-fit items-center gap-1.5 text-[11px] text-zinc-400 transition-colors hover:text-zinc-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {openGuideField === "oauth" ? "Masquer le guide" : "Comment obtenir ce Client ID ?"}
                </button>
                <AnimatePresence initial={false}>
                  {openGuideField === "oauth" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, ease: "easeOut" as const }}
                      layout
                      className="overflow-hidden"
                    >
                      <GuidePanel guide={guide} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleConnect}
                disabled={!clientId.trim() || !OAUTH_PROVIDERS[integration.id] || submitting}
                style={{
                  background: "var(--accent-color, #10b981)",
                  color: "#09090b",
                  boxShadow: "0 0 16px var(--accent-glow, rgba(16,185,129,0.25))",
                }}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
                <span>{i18n("connect")}</span>
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={submitting || !onTest}
                className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 px-2 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="truncate">{i18n("testConnection")}</span>
              </button>
            </div>
          </div>
        )}

        {/* OAuth disconnect */}
        {isOauth && isConnected && (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              style={{
                background: "var(--accent-color, #10b981)",
                color: "#09090b",
                boxShadow: "0 0 16px var(--accent-glow, rgba(16,185,129,0.25))",
              }}
              className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span className="truncate">{i18n("save")}</span>
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={submitting || !onTest}
              className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 px-2 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="truncate">{i18n("testConnection")}</span>
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={submitting}
              className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 py-2 px-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="truncate">{i18n("disconnect")}</span>
            </button>
          </div>
        )}

        {/* Inputs */}
        {hasInputs && (
          <div className="flex flex-col gap-2.5">
            {publicFields.map((f) =>
              f.options ? (
                <Select
                  key={f.label}
                  value={publicValues[f.label] || ""}
                  onChange={(value) => updatePublicValue(f.label, value)}
                  options={f.options.map((o) => ({ id: o, label: o }))}
                  aria-label={i18n(f.label)}
                  className="w-full"
                />
              ) : (
                <input
                  key={f.label}
                  type={f.type || "text"}
                  value={publicValues[f.label] || ""}
                  onChange={(e) => updatePublicValue(f.label, e.target.value)}
                  aria-label={i18n(f.label)}
                  placeholder={i18n(f.label)}
                  className={inputClass}
                />
              )
            )}

            {credentialFields.map((f) => {
              const isPassword = f.type === "password";
              const visible = showPassword[f.key];
              const fieldGuideOpen = openGuideField === f.key;
              const value = credValues[f.label] || "";
              return (
                <div key={f.label} className="flex flex-col">
                  <label className="mb-1 text-[11px] font-medium text-zinc-400">
                    {i18n(f.label)}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={isPassword && !visible ? "password" : "text"}
                      value={value}
                      onChange={(e) => updateCredValue(f.label, e.target.value)}
                      aria-label={i18n(f.label)}
                      placeholder={i18n(f.label)}
                      className={`${inputClass} pr-16`}
                    />
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(value, f.key)}
                        className="text-zinc-500 transition hover:text-zinc-200"
                        aria-label={i18n("copy")}
                        tabIndex={-1}
                      >
                        {copied === f.key ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      {isPassword && (
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => ({ ...s, [f.key]: !s[f.key] }))}
                          className="text-zinc-500 transition hover:text-zinc-200"
                          aria-label={visible ? i18n("hide") : i18n("show")}
                          tabIndex={-1}
                        >
                          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {guide && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleGuide(f.key)}
                        aria-expanded={fieldGuideOpen}
                        className="mt-1.5 flex w-fit items-center gap-1.5 text-[11px] text-zinc-400 transition-colors hover:text-zinc-200"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {fieldGuideOpen ? "Masquer le guide" : "Comment obtenir cette clé ?"}
                      </button>
                      <AnimatePresence initial={false}>
                        {fieldGuideOpen && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15, ease: "easeOut" as const }}
                            layout
                            className="overflow-hidden"
                          >
                            <GuidePanel guide={guide} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              );
            })}

            {/* Input actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                style={{
                  background: "var(--accent-color, #10b981)",
                  color: "#09090b",
                  boxShadow: "0 0 16px var(--accent-glow, rgba(16,185,129,0.25))",
                }}
                className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span className="truncate">{i18n("save")}</span>
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={submitting || !onTest}
                className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 px-2 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="truncate">{i18n("testConnection")}</span>
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={submitting}
                className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 py-2 px-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
              >
                <Unlink className="h-3.5 w-3.5" />
                <span className="truncate">{i18n("disconnect")}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Raw data accordion */}
      <div className="mt-4 pt-3 border-t border-white/[0.04]">
        <button
          type="button"
          onClick={() => setRawOpen((v) => !v)}
          className="flex w-full items-center justify-between text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            {rawOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {i18n(rawOpen ? "hideRaw" : "showRaw")}
          </span>
          {health?.ms ? (
            <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
              {health.ms} ms
            </span>
          ) : null}
        </button>

        <AnimatePresence initial={false}>
          {rawOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" as const }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                {health ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      {health.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-400" />
                      )}
                      <span className={health.ok ? "text-emerald-400" : "text-rose-400"}>
                        {health.ok ? i18n("connected") : health.error || i18n("connectionError")}
                      </span>
                      <span className="ml-auto text-zinc-500">{health.ms}ms</span>
                    </div>
                    {health.data ? (
                      <pre className="max-h-48 overflow-auto rounded-lg bg-zinc-950 p-3 font-mono text-[10px] leading-relaxed text-zinc-300">
                        {JSON.stringify(health.data, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-xs text-zinc-500">{i18n("noData")}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {i18n("testingInProgress")}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function GuidePanel({ guide }: { guide: ConnectionGuide }) {
  return (
    <div className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5">
      <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-medium text-zinc-200">Comment obtenir cette clé ?</span>
        <a
          href={guide.keyGuide.dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-color)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--accent-color)] transition-colors duration-150 hover:bg-[var(--accent-color)]/20"
        >
          {guide.keyGuide.linkText}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <ol className="list-decimal space-y-1.5 pl-4">
        {guide.keyGuide.steps.map((step, index) => (
          <li key={index} className="text-xs leading-relaxed text-zinc-400">
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
