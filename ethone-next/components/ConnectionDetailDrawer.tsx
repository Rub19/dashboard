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
  Shield,
  Radio,
  CheckCircle2,
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
  const [discordMode, setDiscordMode] = useState<"lanyard" | "oauth">("lanyard");

  // Field definitions
  const publicFieldDefs = useMemo(() => PUBLIC_FIELDS[integration.id] || [], [integration.id]);
  const credFieldDefs = useMemo(() => CREDENTIAL_FIELDS[integration.id] || [], [integration.id]);

  const [publicValues, setPublicValues] = useState<Record<string, string>>({});
  const [credValues, setCredValues] = useState<Record<string, string>>({});

  // Restore values on open
  useEffect(() => {
    if (!isOpen) return;

    const pub: Record<string, string> = {};
    publicFieldDefs.forEach((f) => {
      const stored = (settings as unknown as Record<string, string>)[f.key as string] || "";
      pub[f.key as string] = stored;
    });
    setPublicValues(pub);

    const cred: Record<string, string> = {};
    credFieldDefs.forEach((f) => {
      let saved = "";
      if (typeof window !== "undefined") {
        saved = localStorage.getItem(`ethone:cred:${integration.id}:${String(f.key)}`) || "";
      }
      cred[f.key as string] = saved;
    });
    setCredValues(cred);
  }, [publicFieldDefs, credFieldDefs, settings, integration.id, isOpen]);

  const isConnected = status === "connected";
  const variant =
    status === "connected" ? "success" : status === "error" ? "danger" : "muted";

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

        if (Object.keys(payload).length > 0) {
          await credentials.save(integration.id, payload as never);
        }
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] overflow-hidden" aria-modal="true" role="dialog">
          {/* Backdrop with strong blur and dimming */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Drawer Sliding from Right with Top Priority Z-Index */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed right-0 top-0 bottom-0 h-full w-full max-w-xl border-l border-[var(--panel-border)] bg-[var(--panel-bg)]/98 shadow-2xl backdrop-blur-2xl flex flex-col z-[1001] overflow-hidden"
          >
            {/* Header: Fixed at top of drawer with safe spacing */}
            <div className="flex shrink-0 items-start justify-between border-b border-[var(--panel-border)] px-5 py-4 bg-black/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-raised)] border border-[var(--panel-border)] shadow-sm">
                  <ServiceIcon id={integration.id} icon={integration.icon} className="h-6 w-6" colored />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--text-primary)] truncate">{integration.name}</h2>
                    {config?.badge && (
                      <span className="rounded-md border border-[var(--panel-border)] bg-[var(--surface-raised)] px-1.5 py-0.2 font-mono text-[9px] text-[var(--text-muted)]">
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)]/40 hover:text-[var(--text-primary)] cursor-pointer"
                aria-label={i18n("close", "Fermer")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 space-y-6 overflow-y-auto p-5 os-scroll">
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
                  <HelpCircle className="h-3.5 w-3.5" />
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
                  <div className="space-y-3.5 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-4">
                    {/* Public Fields */}
                    {publicFieldDefs.map((f) => (
                      <div key={String(f.key)} className="space-y-1">
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
                            placeholder={f.key === "liveLanyardUserId" ? "Ex: 123456789012345678" : `Entrez ${i18n(f.label, f.label)}...`}
                            className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                          />
                        )}
                      </div>
                    ))}

                    {/* Credential Fields (API Keys) */}
                    {credFieldDefs.map((f) => {
                      const isPwd = f.type === "password";
                      const show = showPassword[f.key as string];
                      const hasSavedKey = Boolean(credValues[f.key as string]?.trim());

                      return (
                        <div key={String(f.key)} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                              <Key className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                              <span>{i18n(f.label, f.label)}</span>
                              {hasSavedKey && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Enregistrée
                                </span>
                              )}
                            </label>
                            {f.portalUrl && (
                              <a
                                href={f.portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-primary)] hover:underline hover:opacity-90 transition-all bg-[var(--accent-primary)]/10 px-2 py-0.5 rounded-lg border border-[var(--accent-primary)]/20 cursor-pointer"
                              >
                                <span>{f.portalLabel || "Obtenir la clé"}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type={isPwd && !show ? "password" : "text"}
                              value={credValues[f.key as string] || ""}
                              onChange={(e) =>
                                setCredValues((p) => ({ ...p, [f.key as string]: e.target.value }))
                              }
                              placeholder={`Collez votre ${i18n(f.label, f.label)}...`}
                              className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] py-2 pl-3 pr-9 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                            />
                            {isPwd && (
                              <button
                                type="button"
                                onClick={() =>
                                  setShowPassword((p) => ({ ...p, [f.key as string]: !show }))
                                }
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                              >
                                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleSaveCredentials}
                      disabled={saving}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] py-2.5 px-3 text-xs font-bold text-[var(--accent-contrast)] shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>{saving ? "Enregistrement..." : "Enregistrer les identifiants"}</span>
                    </button>
                  </div>
                </Section>
              )}

              {/* Status Section */}
              <Section title="État du service">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3">
                    <span className="text-[var(--text-muted)] block text-[10px]">Statut</span>
                    <span className="font-semibold text-[var(--text-primary)] mt-0.5 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          status === "connected"
                            ? "bg-emerald-400"
                            : status === "error"
                            ? "bg-rose-400"
                            : "bg-zinc-500"
                        )}
                      />
                      {statusLabel}
                    </span>
                  </div>
                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3">
                    <span className="text-[var(--text-muted)] block text-[10px]">Dernière synchronisation</span>
                    <span className="font-semibold text-[var(--text-primary)] mt-0.5 block">
                      {lastSync ? relativeTime(lastSync, i18n) : "À l'instant"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3">
                    <span className="text-[var(--text-muted)] block text-[10px]">Latence</span>
                    <span className="font-mono font-semibold text-[var(--text-primary)] mt-0.5 block">
                      {health ? `${health.ms} ms` : "—"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3">
                    <span className="text-[var(--text-muted)] block text-[10px]">Intégration Brain</span>
                    <span className="font-semibold text-emerald-400 mt-0.5 block">
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

            {/* Bottom Actions Bar: Always fixed at bottom of drawer */}
            <div className="border-t border-[var(--panel-border)] px-5 py-4 bg-black/50 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onTest}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Tester la connexion</span>
              </button>

              {isConnected ? (
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Unplug className="h-3.5 w-3.5" />
                  <span>Déconnecter</span>
                </button>
              ) : (
                onConnect && (
                  <button
                    type="button"
                    onClick={onConnect}
                    className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-xs font-bold text-[var(--accent-contrast)] shadow-md hover:opacity-90 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plug className="h-3.5 w-3.5" />
                    <span>Connecter</span>
                  </button>
                )
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
