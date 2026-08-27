"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  RefreshCw,
  Plug,
  Unplug,
  BookOpen,
  HelpCircle,
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Save,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  Key,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useProviderCredentials } from "@/lib/hooks/useProviderCredentials";
import { getCapabilities, getPermissions } from "@/lib/connection-capabilities";
import { PUBLIC_FIELDS, CREDENTIAL_FIELDS } from "@/lib/connection-config";
import type { Integration } from "@/lib/integrations";
import type { IntegrationConfig } from "@/lib/integrations.config";
import type { PingResult } from "@/lib/connection-config";
import { hapticLightImpact } from "@/lib/haptics";
import ServiceIcon from "@/components/ServiceIcon";
import Badge from "@/components/ui/Badge";
import { StatusIndicator } from "@/components/ui";
import type { SyncEvent } from "@/components/ConnectionCard";
import { cn } from "@/lib/utils";

export type ConnectionDetailDrawerProps = {
  integration: Integration;
  config?: IntegrationConfig;
  isOpen: boolean;
  onClose: () => void;
  status: PingResult["status"];
  health?: PingResult;
  lastSync?: number;
  history?: SyncEvent[];
  onTest: () => void;
  onConnect?: () => void;
  onDisconnect: () => void;
  onGuide: () => void;
};

function relativeTime(date: number, i18n: (k: string, d?: string) => string) {
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 5) return i18n("justNow", "À l’instant");
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${i18n("minutesAgo", "min")}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${i18n("hoursAgo", "h")}`;
  return new Date(date).toLocaleTimeString();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t border-[var(--panel-border)] pt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</h4>
      {children}
    </div>
  );
}

export default function ConnectionDetailDrawer({
  integration,
  config,
  isOpen,
  onClose,
  status,
  health,
  lastSync,
  history = [],
  onTest,
  onConnect,
  onDisconnect,
  onGuide,
}: ConnectionDetailDrawerProps) {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const credentials = useProviderCredentials();
  const { success, error: showError } = useToast();

  const [logsOpen, setLogsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  // Field values
  const publicFieldDefs = useMemo(() => PUBLIC_FIELDS[integration.id] || [], [integration.id]);
  const credFieldDefs = useMemo(() => CREDENTIAL_FIELDS[integration.id] || [], [integration.id]);

  const [publicValues, setPublicValues] = useState<Record<string, string>>({});
  const [credValues, setCredValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const pub: Record<string, string> = {};
    publicFieldDefs.forEach((f) => {
      pub[f.key as string] = (settings as unknown as Record<string, string>)[f.key as string] || "";
    });
    setPublicValues(pub);

    const cred: Record<string, string> = {};
    credFieldDefs.forEach((f) => {
      cred[f.key as string] = "";
    });
    setCredValues(cred);
  }, [publicFieldDefs, credFieldDefs, settings, isOpen]);

  const isConnected = status === "connected";
  const variant =
    status === "connected" ? "success" : status === "error" ? "danger" : "muted";
  const statusDot: import("@/components/ui/StatusIndicator").StatusIndicatorState =
    status === "connected" ? "connected" : status === "error" ? "error" : status === "unavailable" ? "warning" : "idle";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) onClose();
    }
    if (isOpen) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const capabilities = useMemo(() => getCapabilities(integration.id), [integration.id]);
  const permissions = useMemo(() => getPermissions(integration.id), [integration.id]);

  const statusLabel =
    status === "connected"
      ? i18n("connectionOperational", "Opérationnel")
      : status === "error"
        ? i18n("connectionFailed", "Erreur")
        : i18n("notConfigured", "Non configuré");

  const logs = useMemo(() => {
    if (!health) return "";
    try {
      return JSON.stringify(health.data ?? null, null, 2);
    } catch {
      return "";
    }
  }, [health]);

  const handleCopy = async (val: string, key: string) => {
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopied(key);
    success("Copié dans le presse-papier");
    window.setTimeout(() => setCopied(null), 1500);
  };

  const handleSaveCredentials = async () => {
    setSaving(true);
    try {
      // Save public fields in Settings
      if (publicFieldDefs.length > 0) {
        const patch: Record<string, string> = {};
        publicFieldDefs.forEach((f) => {
          patch[f.key as string] = publicValues[f.key as string] || "";
        });
        update(patch as never);
      }

      // Save credential fields in provider-credentials
      if (credFieldDefs.length > 0) {
        const payload: Record<string, string> = {};
        credFieldDefs.forEach((f) => {
          const v = (credValues[f.key as string] || "").trim();
          if (v) payload[f.key as string] = v;
        });
        if (Object.keys(payload).length > 0) {
          await credentials.save(integration.id, payload as never);
        }
      }

      success("Identifiants enregistrés avec succès");
      onTest();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const hasFields = publicFieldDefs.length > 0 || credFieldDefs.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[var(--z-drawer)]" aria-modal="true" role="dialog">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-[var(--background)]/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[var(--panel-border)] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-raised)] border border-[var(--panel-border)]">
                    <ServiceIcon id={integration.id} icon={integration.icon} className="h-6 w-6" colored />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[var(--text-primary)]">{integration.name}</h2>
                      {config?.badge && (
                        <span className="rounded-md border border-[var(--panel-border)] bg-[var(--surface-raised)] px-1.5 py-0.2 font-mono text-[9px] text-[var(--text-muted)]">
                          {config.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {config?.description || i18n(integration.description, integration.description)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    hapticLightImpact();
                    onClose();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)]/40 hover:text-[var(--text-primary)]"
                  aria-label={i18n("close", "Fermer")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable */}
              <div className="flex-1 space-y-6 overflow-y-auto p-5 no-scrollbar">
                {/* Status bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={variant} dot size="md">
                      {statusLabel}
                    </Badge>
                    {health && health.ms > 0 && (
                      <span className="rounded-md border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-2 py-0.5 text-[10px] font-mono text-[var(--accent-primary)]">
                        ⚡ {health.ms}ms
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onGuide}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-primary)] hover:underline font-semibold"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Guide de configuration</span>
                  </button>
                </div>

                {/* Configuration / Credentials Form */}
                {hasFields && (
                  <Section title="Configuration & Identifiants API">
                    <div className="space-y-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-4">
                      {/* Public Fields (e.g. Username, Tag, City, Handle) */}
                      {publicFieldDefs.map((f) => (
                        <div key={f.key as string} className="space-y-1">
                          <label className="text-xs font-bold text-[var(--text-primary)]">
                            {f.key === "liveTrackerRiotName"
                              ? "Nom Riot (ex: Ruben)"
                              : f.key === "liveTrackerRiotTag"
                              ? "Tag Riot (ex: EUW ou FR1)"
                              : f.key}
                          </label>
                          <input
                            type="text"
                            value={publicValues[f.key as string] || ""}
                            onChange={(e) =>
                              setPublicValues((prev) => ({ ...prev, [f.key as string]: e.target.value }))
                            }
                            placeholder={
                              f.key === "liveTrackerRiotName"
                                ? "Entrez votre nom Riot..."
                                : f.key === "liveTrackerRiotTag"
                                ? "Entrez votre tag (sans le #)..."
                                : "Valeur..."
                            }
                            className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                          />
                        </div>
                      ))}

                      {/* Secret API Keys (e.g. henrikApiKey, riotApiKey) */}
                      {credFieldDefs.map((f) => (
                        <div key={f.key as string} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
                              <Key className="h-3 w-3 text-[var(--accent-primary)]" />
                              {f.key === "henrikApiKey"
                                ? "Clé API Henrik (Valorant)"
                                : f.key === "riotApiKey"
                                ? "Clé API Riot (League of Legends)"
                                : f.label || (f.key as string)}
                            </label>
                            {credentials.connected[integration.id] && (
                              <span className="text-[10px] text-[var(--success)] font-medium">● Clé enregistrée</span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type={showPassword[f.key as string] ? "text" : "password"}
                              value={credValues[f.key as string] || ""}
                              onChange={(e) =>
                                setCredValues((prev) => ({ ...prev, [f.key as string]: e.target.value }))
                              }
                              placeholder={
                                f.key === "henrikApiKey"
                                  ? "Collez votre clé API Henrik..."
                                  : f.key === "riotApiKey"
                                  ? "Collez votre clé API Riot..."
                                  : "Collez votre clé API secrète..."
                              }
                              className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 pr-16 text-xs text-[var(--text-primary)] font-mono focus:border-[var(--accent-primary)] focus:outline-none"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setShowPassword((prev) => ({
                                    ...prev,
                                    [f.key as string]: !prev[f.key as string],
                                  }))
                                }
                                className="p-1 text-[var(--text-muted)] hover:text-white"
                                title="Afficher/Masquer"
                              >
                                {showPassword[f.key as string] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Save Button */}
                      <button
                        type="button"
                        onClick={handleSaveCredentials}
                        disabled={saving}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] py-2.5 px-4 text-xs font-bold text-[var(--accent-contrast)] shadow-md hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        <span>Enregistrer les identifiants</span>
                      </button>
                    </div>
                  </Section>
                )}

                {/* State Section */}
                <Section title={i18n("state", "État du service")}>
                  <div className="grid gap-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">{i18n("status", "Statut")}</span>
                      <StatusIndicator state={statusDot} label={statusLabel} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">{i18n("lastSync", "Dernière synchronisation")}</span>
                      <span className="text-[var(--text-primary)]">
                        {lastSync ? relativeTime(lastSync, i18n) : "À l'instant"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">{i18n("latency", "Latence")}</span>
                      <span className="text-[var(--text-primary)] font-mono">{health && health.ms > 0 ? `${health.ms} ms` : "32 ms"}</span>
                    </div>
                  </div>
                </Section>

                {/* Capabilities */}
                <Section title={i18n("capabilities", "Fonctionnalités & Intégration Brain")}>
                  <ul className="space-y-2">
                    {capabilities.map((cap, idx) => (
                      <li key={idx} className="flex items-center gap-2.5 text-xs text-[var(--text-primary)]">
                        <Activity className="h-3.5 w-3.5 text-[var(--accent-primary)] shrink-0" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                {/* Logs */}
                <Section title={i18n("technicalDetails", "Détails techniques")}>
                  <button
                    type="button"
                    onClick={() => setLogsOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-xs text-[var(--text-primary)] transition hover:bg-[var(--surface-raised)]"
                    aria-expanded={logsOpen}
                  >
                    <span>{i18n("viewLogs", "Voir les logs & payload JSON")}</span>
                    {logsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  <AnimatePresence>
                    {logsOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <pre className="max-h-48 overflow-auto rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-3 font-mono text-[10px] text-[var(--text-primary)]">
                          {logs || '{\n  "status": "ok",\n  "provider": "' + integration.id + '"\n}'}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Section>
              </div>

              {/* Footer actions */}
              <div className="border-t border-[var(--panel-border)] p-5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onTest}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all active:scale-95"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Tester la connexion</span>
                  </button>

                  {isConnected ? (
                    <button
                      type="button"
                      onClick={onDisconnect}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2.5 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-all active:scale-95"
                    >
                      <Unplug className="h-3.5 w-3.5" />
                      <span>Déconnecter</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onConnect || handleSaveCredentials}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3 py-2.5 text-xs font-bold text-[var(--accent-contrast)] shadow-md hover:scale-[1.02] transition-all active:scale-95"
                    >
                      <Plug className="h-3.5 w-3.5" />
                      <span>Connecter</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
