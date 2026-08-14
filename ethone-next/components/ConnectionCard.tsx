"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Unlink,
  Plug,
  Save,
} from "lucide-react";
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
      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
      : integration.status === "api"
        ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
        : integration.status === "local" || integration.status === "feed"
          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20";

  const statusClass =
    status === "connected"
      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      : status === "error"
        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
        : "bg-zinc-800 text-zinc-400";

  const [publicValues, setPublicValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    publicFields.forEach((f) => {
      const v = settings[f.key];
      map[f.label] = typeof v === "string" ? v : "";
    });
    return map;
  });

  useEffect(() => {
    const map: Record<string, string> = {};
    publicFields.forEach((f) => {
      const v = settings[f.key];
      map[f.label] = typeof v === "string" ? v : "";
    });
    setPublicValues(map);
  }, [publicFields, settings]);

  const [credValues, setCredValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    credentialFields.forEach((f) => {
      map[f.label] = "";
    });
    return map;
  });

  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [rawOpen, setRawOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openGuideField, setOpenGuideField] = useState<string | null>(null);

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
      setCredValues((prev) => {
        const next = { ...prev };
        credentialFields.forEach((f) => (next[f.label] = ""));
        return next;
      });
      success(i18n("disconnectSuccess"));
    } catch {
      showError(i18n("error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSave() {
    setSubmitting(true);
    try {
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

  function toggleGuide(fieldKey: string) {
    setOpenGuideField((prev) => (prev === fieldKey ? null : fieldKey));
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted/60 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-white/5 bg-surface/60 p-5 shadow-2xl backdrop-blur-2xl transition hover:border-purple-500/20 hover:shadow-[0_0_40px_-12px_rgba(139,92,246,0.12)]"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-accent/[0.03] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-raised shadow-inner">
          <ServiceIcon id={integration.id} icon={integration.icon} className="h-5 w-5" colored />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{integration.name}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${methodClass}`}>
              {i18n(methodKey)}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted">{i18n(integration.description)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>
          {statusText}
        </span>
      </div>

      {isOauth && !isConnected && (
        <div className="flex flex-col gap-2">
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
                className="flex items-center gap-1.5 text-xs text-purple-400 transition-colors hover:text-purple-300"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                {openGuideField === "oauth" ? "Masquer le guide" : "Comment obtenir ce Client ID ?"}
              </button>
              <AnimatePresence initial={false}>
                {openGuideField === "oauth" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    layout
                    className="overflow-hidden"
                  >
                    <GuidePanel guide={guide} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            type="button"
            onClick={handleConnect}
            disabled={!clientId.trim() || !OAUTH_PROVIDERS[integration.id] || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-500 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            {i18n("connect")}
          </button>
        </div>
      )}

      {isOauth && isConnected && (
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          <Unlink className="h-4 w-4" />
          {i18n("disconnect")}
        </button>
      )}

      {hasInputs && (
        <div className="flex flex-col gap-2">
          {publicFields.map((f) =>
            f.options ? (
              <Select
                key={f.label}
                value={publicValues[f.label] || ""}
                onChange={(value) => setPublicValues((v) => ({ ...v, [f.label]: value }))}
                options={f.options.map((o) => ({ id: o, label: o }))}
                aria-label={i18n(f.label)}
                className="w-full"
              />
            ) : (
              <input
                key={f.label}
                type={f.type || "text"}
                value={publicValues[f.label] || ""}
                onChange={(e) => setPublicValues((v) => ({ ...v, [f.label]: e.target.value }))}
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
            return (
              <div key={f.label} className="flex flex-col">
                <div className="relative">
                  <input
                    type={isPassword && !visible ? "password" : "text"}
                    value={credValues[f.label] || ""}
                    onChange={(e) => setCredValues((v) => ({ ...v, [f.label]: e.target.value }))}
                    aria-label={i18n(f.label)}
                    placeholder={i18n(f.label)}
                    className={`${inputClass} pr-10`}
                  />
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => ({ ...s, [f.key]: !s[f.key] }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted transition hover:text-foreground"
                      aria-label={visible ? i18n("hide") : i18n("show")}
                      tabIndex={-1}
                    >
                      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>

                {guide && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleGuide(f.key)}
                      aria-expanded={fieldGuideOpen}
                      className="mt-1.5 flex w-fit items-center gap-1.5 text-xs text-purple-400 transition-colors hover:text-purple-300"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      {fieldGuideOpen ? "Masquer le guide" : "Comment obtenir cette clé ?"}
                    </button>
                    <AnimatePresence initial={false}>
                      {fieldGuideOpen && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
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

          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-500 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {i18n("save")}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              <Unlink className="h-4 w-4" />
              {i18n("disconnect")}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setRawOpen((v) => !v)}
        className="mt-auto flex w-full items-center justify-between rounded-xl border border-white/5 bg-surface-raised/50 px-3 py-2 text-sm text-muted transition hover:border-accent/20 hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          {rawOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {i18n(rawOpen ? "hideRaw" : "showRaw")}
        </span>
        {health?.ms ? <span className="text-[10px] uppercase tracking-wider">{health.ms}ms</span> : null}
      </button>

      <AnimatePresence initial={false}>
        {rawOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            layout
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/5 bg-black/30 p-3">
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
                    <span className="ml-auto text-muted">{health.ms}ms</span>
                  </div>
                  {health.data ? (
                    <pre className="max-h-48 overflow-auto rounded-xl bg-surface p-3 font-mono text-[10px] leading-relaxed text-foreground">
                      {JSON.stringify(health.data, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted">{i18n("noData")}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {i18n("testingInProgress")}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
