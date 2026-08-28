"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  RefreshCw,
  Plug,
  Unplug,
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
  Radio,
  CheckCircle2,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useProviderCredentials } from "@/lib/hooks/useProviderCredentials";
import { getCapabilities } from "@/lib/connection-capabilities";
import { PUBLIC_FIELDS, CREDENTIAL_FIELDS } from "@/lib/connection-config";
import type { Integration } from "@/lib/integrations";
import type { IntegrationConfig } from "@/lib/integrations.config";
import type { PingResult } from "@/lib/connection-config";
import { hapticLightImpact } from "@/lib/haptics";
import ServiceIcon from "@/components/ServiceIcon";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
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
  const [discordMode, setDiscordMode] = useState<"lanyard" | "oauth">("lanyard");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const publicFieldDefs = PUBLIC_FIELDS[integration.id] ?? [];
  const credFieldDefs = CREDENTIAL_FIELDS[integration.id] ?? [];

  const [publicValues, setPublicValues] = useState<Record<string, string>>({});
  const [credValues, setCredValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    // Load initial public values
    const initPublic: Record<string, string> = {};
    publicFieldDefs.forEach((f) => {
      const val = (settings as Record<string, unknown>)[f.key as string];
      if (typeof val === "string" || typeof val === "number") {
        initPublic[f.key as string] = String(val);
      } else if (typeof window !== "undefined") {
        const local = localStorage.getItem(`ethone:pub:${integration.id}:${String(f.key)}`);
        if (local) initPublic[f.key as string] = local;
      }
    });
    setPublicValues(initPublic);

    // Load credential values from localStorage if existing
    const initCreds: Record<string, string> = {};
    credFieldDefs.forEach((f) => {
      if (typeof window !== "undefined") {
        const local = localStorage.getItem(`ethone:cred:${integration.id}:${String(f.key)}`);
        if (local) initCreds[f.key as string] = local;
      }
    });
    setCredValues(initCreds);
  }, [isOpen, integration.id, settings]);

  const capabilities = useMemo(() => getCapabilities(integration.id), [integration.id]);

  const isConnected =
    status === "connected" ||
    !!credentials.connected[integration.id] ||
    (typeof window !== "undefined" &&
      localStorage.getItem(`ethone:connected:${integration.id}`) === "true");

  const variant: BadgeVariant =
    isConnected
      ? "success"
      : status === "error"
      ? "danger"
      : "muted";

  const statusLabel =
    isConnected
      ? i18n("connected", "Connecté")
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
    hapticLightImpact();
    try {
      // Save public fields in Settings and localStorage
      if (publicFieldDefs.length > 0) {
        const patch: Record<string, string> = {};
        publicFieldDefs.forEach((f) => {
          const v = publicValues[f.key as string] || "";
          patch[f.key as string] = v;
          if (typeof window !== "undefined") {
            localStorage.setItem(`ethone:pub:${integration.id}:${String(f.key)}`, v);
          }
        });
        update(patch as never);
      }

      // Save credential fields in provider-credentials & localStorage
      if (credFieldDefs.length > 0) {
        const payload: Record<string, string> = {};
        credFieldDefs.forEach((f) => {
          const v = (credValues[f.key as string] || "").trim();
          if (v) {
            payload[f.key as string] = v;
            if (typeof window !== "undefined") {
              localStorage.setItem(`ethone:cred:${integration.id}:${String(f.key)}`, v);
            }
          }
        });

        await credentials.save(integration.id, payload as never);
      }

      success("Identifiants enregistrés avec succès !");
      onTest();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const hasFields = publicFieldDefs.length > 0 || credFieldDefs.length > 0;

  if (!mounted || typeof document === "undefined" || !document.body) return null;

  const drawerContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] overflow-hidden" aria-modal="true" role="dialog">
          {/* Backdrop with dark blur and dimming */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Drawer Sliding from Right */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed right-0 top-0 bottom-0 h-full w-full max-w-xl border-l border-[var(--panel-border)] bg-[#090d14] shadow-2xl backdrop-blur-2xl flex flex-col z-[100000] overflow-hidden"
          >
            {/* Header: Safe top padding to clear topbar */}
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--panel-border)] px-6 py-5 bg-black/60 pt-[calc(1.25rem+env(safe-area-inset-top))]">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-raised)] border border-[var(--panel-border)] shadow-md">
                  <ServiceIcon id={integration.id} icon={integration.icon} className="h-6 w-6" colored />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-[var(--text-primary)] truncate">{integration.name}</h2>
                    {config?.badge && (
                      <span className="rounded-md border border-[var(--panel-border)] bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--text-muted)]">
                        {config.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label={i18n("close", "Fermer")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6 os-scroll">
              {/* Status & Quick Guide */}
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
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-primary)] hover:underline font-semibold cursor-pointer"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Guide de configuration</span>
                </button>
              </div>

              {/* Discord Mode Switch if Discord */}
              {integration.id === "discord" && (
                <div className="space-y-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Radio className="h-4 w-4" /> Mode de Connexion Discord
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscordMode("lanyard")}
                      className={cn(
                        "rounded-xl py-2 px-3 text-xs font-bold transition-all border text-center cursor-pointer",
                        discordMode === "lanyard"
                          ? "bg-indigo-600 border-indigo-400 text-white shadow-md"
                          : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                      )}
                    >
                      Lanyard (ID Discord)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscordMode("oauth")}
                      className={cn(
                        "rounded-xl py-2 px-3 text-xs font-bold transition-all border text-center cursor-pointer",
                        discordMode === "oauth"
                          ? "bg-indigo-600 border-indigo-400 text-white shadow-md"
                          : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                      )}
                    >
                      OAuth2 (Officiel)
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {discordMode === "lanyard"
                      ? "Synchronisation temps réel de votre statut, musique Spotify et jeu en cours via Lanyard sans permission invasive."
                      : "Connexion officielle Discord pour accéder à votre profil complet et serveurs."}
                  </p>
                </div>
              )}

              {/* Configuration / Credentials Form */}
              {hasFields && (integration.id !== "discord" || discordMode === "lanyard") && (
                <Section title="Configuration & Identifiants API">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSaveCredentials();
                    }}
                    className="space-y-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-4"
                  >
                    {/* Public Fields */}
                    {publicFieldDefs.map((f) => (
                      <div key={String(f.key)} className="space-y-1.5">
                        <label className="block text-xs font-semibold text-[var(--text-primary)]">
                          {i18n(f.label, f.label)}
                        </label>
                        {f.options && f.options.length > 0 ? (
                          <select
                            value={publicValues[f.key as string] || f.options[0]}
                            onChange={(e) =>
                              setPublicValues((p) => ({ ...p, [f.key as string]: e.target.value }))
                            }
                            className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                          >
                            {f.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={publicValues[f.key as string] || ""}
                            onChange={(e) =>
                              setPublicValues((p) => ({ ...p, [f.key as string]: e.target.value }))
                            }
                            placeholder={`Entrez ${f.label}...`}
                            className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                          />
                        )}
                      </div>
                    ))}

                    {/* Credential Fields */}
                    {credFieldDefs.map((f) => {
                      const isSecret = f.type === "password" || f.type === "token";
                      const show = !!showPassword[f.key as string];
                      const val = credValues[f.key as string] || "";
                      const hasLocal = typeof window !== "undefined" && !!localStorage.getItem(`ethone:cred:${integration.id}:${String(f.key)}`);
                      return (
                        <div key={String(f.key)} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                              <Key className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                              <span>{i18n(f.label, f.label)}</span>
                              {hasLocal && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.2 font-mono text-[9px] font-bold text-emerald-400">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Enregistrée
                                </span>
                              )}
                            </label>

                            {f.portalUrl && (
                              <a
                                href={f.portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-primary)] hover:underline"
                              >
                                <span>{f.portalLabel || `Obtenir clé ${integration.name}`}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>

                          <div className="relative">
                            <input
                              type={isSecret && !show ? "password" : "text"}
                              value={val}
                              onChange={(e) =>
                                setCredValues((p) => ({ ...p, [f.key as string]: e.target.value }))
                              }
                              placeholder={`Entrez ${f.label}...`}
                              className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-3.5 py-2.5 pr-20 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              {val && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(val, f.key as string)}
                                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
                                  title="Copier"
                                >
                                  {copied === f.key ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setShowPassword((p) => ({ ...p, [f.key as string]: !p[f.key as string] }))
                                }
                                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
                                title={show ? "Masquer" : "Afficher"}
                              >
                                {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Save Button */}
                    <button
                      type="submit"
                      disabled={saving}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>{saving ? "Enregistrement..." : "Enregistrer les identifiants"}</span>
                    </button>
                  </form>
                </Section>
              )}

              {/* Status Section */}
              <Section title="État du service">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3">
                    <span className="text-[10px] text-[var(--text-muted)]">Statut</span>
                    <div className="mt-1 flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          status === "connected"
                            ? "bg-emerald-400"
                            : status === "error"
                            ? "bg-rose-500"
                            : "bg-zinc-500"
                        )}
                      />
                      <span>{statusLabel}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3">
                    <span className="text-[10px] text-[var(--text-muted)]">Dernière synchronisation</span>
                    <span className="mt-1 block font-semibold text-[var(--text-primary)]">
                      {lastSync ? relativeTime(lastSync, i18n) : "—"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3">
                    <span className="text-[10px] text-[var(--text-muted)]">Latence</span>
                    <span className="mt-1 block font-mono font-semibold text-[var(--text-primary)]">
                      {health?.ms ? `${health.ms} ms` : "—"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3">
                    <span className="text-[10px] text-[var(--text-muted)]">Intégration Brain</span>
                    <span className="mt-1 block font-semibold text-emerald-400">
                      Active
                    </span>
                  </div>
                </div>
              </Section>

              {/* Capabilities */}
              {capabilities.length > 0 && (
                <Section title="Fonctionnalités & Intégration Brain">
                  <div className="space-y-1.5">
                    {capabilities.map((c) => (
                      <div
                        key={c}
                        className="flex items-center gap-2 text-xs text-[var(--text-primary)]"
                      >
                        <Activity className="h-3.5 w-3.5 text-[var(--accent-primary)] shrink-0" />
                        <span>{i18n(c, c)}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Technical logs */}
              {logs && (
                <Section title="Détails techniques">
                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] p-3">
                    <button
                      type="button"
                      onClick={() => setLogsOpen(!logsOpen)}
                      className="flex w-full items-center justify-between text-xs font-semibold text-[var(--text-primary)]"
                    >
                      <span>Voir les logs & payload JSON</span>
                      {logsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {logsOpen && (
                      <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-black/60 p-2 font-mono text-[10px] text-zinc-300 no-scrollbar">
                        {logs}
                      </pre>
                    )}
                  </div>
                </Section>
              )}
            </div>

            {/* Bottom Actions Bar: Fully visible above dock with safe bottom spacing */}
            <div className="border-t border-[var(--panel-border)] px-6 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] bg-[#070a10]/95 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0 shadow-2xl">
              <button
                type="button"
                onClick={onTest}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Tester la connexion</span>
              </button>

              {isConnected ? (
                <button
                  type="button"
                  onClick={() => {
                    hapticLightImpact();
                    onDisconnect();
                    onClose();
                  }}
                  className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Unplug className="h-3.5 w-3.5" />
                  <span>Déconnecter</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    hapticLightImpact();
                    if (integration.id === "discord") {
                      if (discordMode === "lanyard") {
                        await handleSaveCredentials();
                        if (typeof window !== "undefined") {
                          localStorage.setItem("ethone:connected:discord", "true");
                          window.dispatchEvent(
                            new CustomEvent("v8:connection-updated", {
                              detail: { provider: "discord", connected: true },
                            })
                          );
                        }
                        onTest();
                        onClose();
                        return;
                      } else {
                        onConnect?.();
                        return;
                      }
                    }

                    if (hasFields) {
                      await handleSaveCredentials();
                      if (typeof window !== "undefined") {
                        localStorage.setItem(`ethone:connected:${integration.id}`, "true");
                        window.dispatchEvent(
                          new CustomEvent("v8:connection-updated", {
                            detail: { provider: integration.id, connected: true },
                          })
                        );
                      }
                      onTest();
                    }

                    if (integration.status === "oauth") {
                      onConnect?.();
                    }
                  }}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-xs font-bold text-[var(--accent-contrast)] shadow-md hover:opacity-90 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                  <span>Connecter</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(drawerContent, document.body);
}
