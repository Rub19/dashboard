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
  HelpCircle,
  Loader2,
  LogOut,
  Plug,
  PlugZap,
  RefreshCw,
  Save,
  Unlink,
} from "lucide-react";
import { useIntegrationStore } from "@/lib/hooks/useIntegrationStore";
import { useI18n } from "@/lib/hooks/useI18n";
import { useGitHubStatus } from "@/lib/hooks/useGitHubStatus";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import { startOAuthConnect, PROVIDERS as OAUTH_PROVIDERS } from "@/lib/oauth";
import { getConnectionGuide, type ConnectionGuide } from "@/config/connectionsGuide";
import { getIntegrationConfig, type IntegrationConfig } from "@/lib/integrations.config";
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
import { TiltCard } from "@/components/ui/TiltCard";

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
  const gitHubStatus = useGitHubStatus(integration.id === "github");

  const guide = useMemo<ConnectionGuide | undefined>(() => getConnectionGuide(integration.id), [integration.id]);
  const config = useMemo<IntegrationConfig | undefined>(() => getIntegrationConfig(integration.id), [integration.id]);

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
      ? i18n("connected", "Connecté")
      : status === "error"
        ? i18n("error", "Erreur")
        : integration.status === "restricted" || integration.status === "limited"
          ? i18n(integration.status, integration.status)
          : i18n("notConfigured", "Non connecté");

  const methodKey = config ? config.category : getServiceMethodKey(integration.status);
  const methodClass = config
    ? config.category === "oauth"
      ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
      : config.category === "api_key"
        ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
        : "bg-amber-500/10 text-amber-300 border-amber-500/20"
    : integration.status === "oauth"
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
        : "bg-white/[0.04] text-zinc-400 border-white/[0.08]";

  const storeValues = useMemo(() => integrationValues[integration.id] || {}, [integrationValues, integration.id]);

  const [publicValues, setPublicValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    publicFields.forEach((f) => {
      const fromStore = storeValues[f.key as string];
      const fromSettings = (settings as Record<string, unknown>)[f.key as string];
      map[f.label] = typeof fromStore === "string" ? fromStore : typeof fromSettings === "string" ? fromSettings : "";
    });
    return map;
  });

  useEffect(() => {
    setPublicValues((prev) => {
      const map = { ...prev };
      publicFields.forEach((f) => {
        const fromStore = storeValues[f.key as string];
        const fromSettings = (settings as Record<string, unknown>)[f.key as string];
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
  const [clientSecret, setClientSecret] = useState((storeValues.clientSecret as string) || "");
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (rawOpen && onTest) onTest(integration.id);
  }, [rawOpen, onTest, integration.id]);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

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
      if (clientSecret.trim()) {
        setField(integration.id, "clientSecret", clientSecret.trim());
      }
      success(i18n("connectSuccess"));
      window.location.href = await startOAuthConnect(integration.id, trimmed, { provider: integration.id, clientId: trimmed });
    } catch (err) {
      showError(err instanceof Error ? err.message : i18n("error"));
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
    } catch (err) {
      showError(err instanceof Error ? err.message : i18n("error"));
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
    } catch (err) {
      showError(err instanceof Error ? err.message : i18n("error"));
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
    } catch (err) {
      showError(err instanceof Error ? err.message : i18n("error"));
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
    "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30";

  return (
    <TiltCard
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" as const }}
      className="group flex h-full flex-col justify-between border border-white/[0.08] bg-zinc-950/70 p-5 shadow-xl backdrop-blur-2xl transition hover:border-white/15"
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
                <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${methodClass}`}>
                  {config ? config.badge : i18n(methodKey)}
                </span>
              </div>
              <p className="truncate text-xs text-zinc-400">{config?.description || i18n(integration.description)}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>{statusText}</span>
        </div>

        {integration.id === "github" && gitHubStatus && gitHubStatus.indicator !== "none" && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span className="min-w-0 flex-1">
              {i18n("githubServiceDisruption", "GitHub rencontre actuellement des perturbations")}
              {gitHubStatus.description ? ` : ${gitHubStatus.description}` : ""}
            </span>
          </div>
        )}

        {/* OAuth connect */}
        {isOauth && !isConnected && (
          <div className="flex flex-col gap-2.5">
            <input
              type="text"
              value={clientId}
              onChange={(e) => onClientIdChange(integration.id, e.target.value)}
              aria-label={config ? config.idLabel : i18n("clientId")}
              placeholder={config ? config.idPlaceholder : i18n("clientId")}
              className={inputClass}
            />

            {config?.requiresClientSecret && (
              <div className="relative">
                <input
                type={showClientSecret ? "text" : "password"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                aria-label={config.secretLabel || i18n("clientSecret")}
                placeholder={config.secretPlaceholder || i18n("clientSecret")}
                className={`${inputClass} pr-16`}
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopy(clientSecret, "clientSecret")}
                  className="text-zinc-500 transition hover:text-zinc-200"
                  aria-label={i18n("copy")}
                  tabIndex={-1}
                >
                  {copied === "clientSecret" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClientSecret((v) => !v)}
                  className="text-zinc-500 transition hover:text-zinc-200"
                  aria-label={showClientSecret ? i18n("hide") : i18n("show")}
                  tabIndex={-1}
                >
                  {showClientSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            )}

            {config?.requiresRedirectUri && origin && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                <p className="text-[11px] font-medium text-zinc-300">{i18n("redirectUri")}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg bg-zinc-950 px-2 py-1 text-[10px] text-zinc-400">
                    {`${origin}${config.callbackPath}`}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${origin}${config.callbackPath}`, "redirectUri")}
                    className="text-zinc-500 transition hover:text-zinc-200"
                    aria-label={i18n("copy")}
                  >
                    {copied === "redirectUri" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {config ? (
              <ConfigGuidePanel
                config={config}
                origin={origin}
                isOpen={showConfigGuide}
                onToggle={() => setShowConfigGuide((v) => !v)}
                copied={copied}
                onCopy={handleCopy}
              />
            ) : guide ? (
              <FieldGuide
                guide={guide}
                isOpen={openGuideField === "oauth"}
                onToggle={() => toggleGuide("oauth")}
                label={i18n("clientId") || "Client ID"}
              />
            ) : null}

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleConnect}
                disabled={!clientId.trim() || !OAUTH_PROVIDERS[integration.id] || submitting}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 px-3 text-xs font-bold text-zinc-950 shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-95 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
                <span>{i18n("connect", "Connecter")}</span>
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
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={submitting || !onTest}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 px-2 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="truncate">{i18n("testConnection")}</span>
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={submitting}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 px-3 py-2 text-xs font-medium text-rose-400 transition-all hover:border-rose-500/40 hover:bg-rose-500/10 disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="truncate">{i18n("disconnect", "Déconnecter")}</span>
            </button>
          </div>
        )}

        {/* Inputs */}
        {hasInputs && (
          <div className="flex flex-col gap-2.5">
            {config && (
              <ConfigGuidePanel
                config={config}
                origin={origin}
                isOpen={showConfigGuide}
                onToggle={() => setShowConfigGuide((v) => !v)}
                copied={copied}
                onCopy={handleCopy}
              />
            )}

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
                <FieldInput
                  key={f.label}
                  field={f}
                  value={publicValues[f.label] || ""}
                  onChange={(value) => updatePublicValue(f.label, value)}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((s) => ({ ...s, [f.key]: !s[f.key] }))}
                  onCopy={handleCopy}
                  copied={copied}
                  guide={guide}
                  isOpen={openGuideField === f.key}
                  onToggle={() => toggleGuide(f.key)}
                  inputClass={inputClass}
                  i18n={i18n}
                />
              )
            )}

            {credentialFields.map((f) => (
              <FieldInput
                key={f.label}
                field={f}
                value={credValues[f.label] || ""}
                onChange={(value) => updateCredValue(f.label, value)}
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword((s) => ({ ...s, [f.key]: !s[f.key] }))}
                onCopy={handleCopy}
                copied={copied}
                guide={guide}
                isOpen={openGuideField === f.key}
                onToggle={() => toggleGuide(f.key)}
                inputClass={inputClass}
                i18n={i18n}
              />
            ))}

            {/* Input actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
                  isConnected
                    ? "col-span-1 bg-purple-600 text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500"
                    : "col-span-2 bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400"
                }`}
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isConnected ? (
                  <Save className="h-3.5 w-3.5" />
                ) : (
                  <Plug className="h-3.5 w-3.5" />
                )}
                <span className="truncate">{isConnected ? i18n("save", "Sauvegarder") : i18n("connect", "Connecter")}</span>
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
              {isConnected && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={submitting}
                  className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 px-2 py-2 text-xs font-medium text-rose-400 transition-all hover:border-rose-500/40 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  <span className="truncate">{i18n("disconnect", "Déconnecter")}</span>
                </button>
              )}
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
                      {health.status === "connected" || health.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-400" />
                      )}
                      <span className={health.ok ? "text-emerald-400" : "text-rose-400"}>
                        {health.status === "unconfigured"
                          ? i18n("notConfigured") || "Non configuré"
                          : health.ok
                            ? i18n("connected")
                            : health.error || i18n("connectionError")}
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
    </TiltCard>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  showPassword,
  onTogglePassword,
  onCopy,
  copied,
  guide,
  isOpen,
  onToggle,
  inputClass,
  i18n,
}: {
  field: { label: string; placeholder?: string; type?: string; key: string };
  value: string;
  onChange: (value: string) => void;
  showPassword: Record<string, boolean>;
  onTogglePassword: () => void;
  onCopy: (value: string, key: string) => void;
  copied: string | null;
  guide: ConnectionGuide | undefined;
  isOpen: boolean;
  onToggle: () => void;
  inputClass: string;
  i18n: (key: string) => string;
}) {
  const isPassword = field.type === "password";
  const visible = showPassword[field.key];
  const label = i18n(field.label);

  return (
    <div key={field.label} className="flex flex-col">
      <label className="mb-1 text-[11px] font-medium text-zinc-400">{label}</label>
      <div className="relative flex items-center">
        <input
          type={isPassword && !visible ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          placeholder={i18n(field.placeholder || field.label)}
          className={`${inputClass} pr-16`}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <button
            type="button"
            onClick={() => onCopy(value, field.key)}
            className="text-zinc-500 transition hover:text-zinc-200"
            aria-label={i18n("copy")}
            tabIndex={-1}
          >
            {copied === field.key ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {isPassword && (
            <button
              type="button"
              onClick={onTogglePassword}
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
        <FieldGuide
          guide={guide}
          isOpen={isOpen}
          onToggle={onToggle}
          label={label}
        />
      )}
    </div>
  );
}

function FieldGuide({
  guide,
  isOpen,
  onToggle,
  label,
}: {
  guide: ConnectionGuide;
  isOpen: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="mt-1.5 flex w-fit items-center gap-1.5 text-[11px] text-purple-400 transition-colors hover:text-purple-300"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        {isOpen ? "Masquer le guide" : `Comment obtenir ${label} ?`}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" as const }}
            className="overflow-hidden"
          >
            <GuidePanel guide={guide} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfigGuidePanel({
  config,
  origin,
  isOpen,
  onToggle,
  copied,
  onCopy,
}: {
  config: IntegrationConfig;
  origin: string;
  isOpen: boolean;
  onToggle: () => void;
  copied: string | null;
  onCopy: (value: string, key: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <a
          href={config.developerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-all hover:bg-purple-500/30"
        >
          {config.developerButtonLabel}
          <ExternalLink className="h-3 w-3" />
        </a>
        {config.docsUrl && (
          <a
            href={config.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-500/20 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-500/30"
          >
            Documentation
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-fit items-center gap-1.5 text-[11px] text-purple-400 transition-colors hover:text-purple-300"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        {isOpen ? "Masquer le guide" : "Guide pas-à-pas"}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" as const }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl border border-purple-500/20 bg-purple-500/[0.06] p-3.5">
              <ol className="list-decimal space-y-2 pl-4">
                {config.steps.map((step, idx) => {
                  const copyValue =
                    step.copyValueType === "callback"
                      ? `${origin}${config.callbackPath}`
                      : step.copyValueType === "homepage"
                        ? `${origin}/`
                        : "";
                  const copyKey = `${config.id}-${step.copyValueType}-${idx}`;
                  return (
                    <li key={idx} className="text-xs leading-relaxed text-zinc-300">
                      <p className="font-medium text-purple-200">{step.title}</p>
                      <p className="text-zinc-400">{step.description}</p>
                      {copyValue && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <code className="flex-1 truncate rounded-lg bg-zinc-950 px-2 py-1 text-[10px] text-zinc-400">{copyValue}</code>
                          <button
                            type="button"
                            onClick={() => onCopy(copyValue, copyKey)}
                            className="text-zinc-500 transition hover:text-zinc-200"
                            aria-label="Copier"
                          >
                            {copied === copyKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GuidePanel({ guide }: { guide: ConnectionGuide }) {
  return (
    <div className="mt-2 rounded-xl border border-purple-500/20 bg-purple-500/[0.06] p-3.5">
      <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-medium text-purple-200">Comment obtenir cette clé ?</span>
        <a
          href={guide.keyGuide.dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-all hover:bg-purple-500/30"
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
