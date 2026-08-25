"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, Plug, Unplug, BookOpen, HelpCircle, Activity, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { getCapabilities, getPermissions } from "@/lib/connection-capabilities";
import type { Integration } from "@/lib/integrations";
import type { IntegrationConfig } from "@/lib/integrations.config";
import type { PingResult } from "@/lib/connection-config";
import { hapticLightImpact } from "@/lib/haptics";
import ServiceIcon from "@/components/ServiceIcon";
import Badge from "@/components/ui/Badge";
import { StatusIndicator } from "@/components/ui";
import type { SyncEvent } from "@/components/ConnectionCard";

export type ConnectionDetailDrawerProps = {
  integration: Integration;
  config?: IntegrationConfig;
  isOpen: boolean;
  onClose: () => void;
  status: PingResult["status"];
  health?: PingResult;
  lastSync?: number;
  history: SyncEvent[];
  onTest: () => void;
  onConnect: () => void;
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
  history,
  onTest,
  onConnect,
  onDisconnect,
  onGuide,
}: ConnectionDetailDrawerProps) {
  const i18n = useI18n();
  const [logsOpen, setLogsOpen] = useState(false);

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
            className="absolute inset-0 bg-[var(--background)]/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-2xl backdrop-blur-[var(--panel-blur)]"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[var(--panel-border)] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--text-primary)]/[0.04]">
                    <ServiceIcon id={integration.id} icon={integration.icon} className="h-6 w-6" colored />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">{integration.name}</h2>
                    <p className="text-xs text-[var(--text-muted)]">
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)]/40 hover:text-[var(--text-primary)]"
                  aria-label={i18n("close", "Fermer")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable */}
              <div className="flex-1 space-y-6 overflow-y-auto p-5 no-scrollbar">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <Badge variant={variant} dot size="md">
                    {statusLabel}
                  </Badge>
                  {health && health.ms > 0 && (
                    <span className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">
                      {health.ms}ms
                    </span>
                  )}
                </div>

                <Section title={i18n("state", "État")}>
                  <div className="grid gap-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">{i18n("status", "Statut")}</span>
                      <StatusIndicator state={statusDot} label={statusLabel} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">{i18n("lastSync", "Dernière synchronisation")}</span>
                      <span className="text-[var(--text-primary)]">
                        {lastSync ? relativeTime(lastSync, i18n) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">{i18n("nextSync", "Prochaine synchronisation")}</span>
                      <span className="text-[var(--text-primary)]">{i18n("automatic", "Automatique")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">{i18n("latency", "Latence")}</span>
                      <span className="text-[var(--text-primary)]">{health && health.ms > 0 ? `${health.ms} ms` : "—"}</span>
                    </div>
                  </div>
                </Section>

                {/* Capabilities */}
                <Section title={i18n("capabilities", "Fonctionnalités")}>
                  <ul className="space-y-1.5">
                    {capabilities.map((cap, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                        <Activity className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                        {cap}
                      </li>
                    ))}
                  </ul>
                </Section>

                {/* Permissions */}
                <Section title={i18n("permissions", "Permissions")}>
                  <ul className="space-y-1.5">
                    {permissions.map((perm, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                        <span className="h-3.5 w-3.5 rounded-full border border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]" />
                        {perm}
                      </li>
                    ))}
                  </ul>
                </Section>

                {/* History */}
                <Section title={i18n("recentActivity", "Activité récente")}>
                  {history.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">{i18n("noActivity", "Aucune activité")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {history.slice(-8).map((event, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs">
                          <Badge
                            variant={
                              event.type === "synced" ? "success" : event.type === "error" ? "danger" : "default"
                            }
                            size="sm"
                          >
                            {event.type}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-[var(--text-primary)]">{event.message || event.type}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{relativeTime(event.at, i18n)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                {/* Logs */}
                <Section title={i18n("technicalDetails", "Détails techniques")}>
                  <button
                    type="button"
                    onClick={() => setLogsOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2.5 text-xs text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]/40"
                    aria-expanded={logsOpen}
                  >
                    <span>{i18n("viewLogs", "Voir les logs")}</span>
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
                        <pre className="max-h-48 overflow-auto rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 p-3 font-mono text-[10px] text-[var(--text-primary)]">
                          {logs || i18n("noData", "Aucune donnée")}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Section>

                {/* Links */}
                <Section title={i18n("documentation", "Documentation")}>
                  <div className="flex flex-wrap gap-2">
                    {config?.docsUrl && (
                      <a
                        href={config.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]/40"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        {i18n("documentation", "Documentation")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {config?.developerUrl && (
                      <a
                        href={config.developerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/20"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {i18n("developerPortal", "Portail développeur")}
                      </a>
                    )}
                    {config && (
                      <button
                        type="button"
                        onClick={onGuide}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]/40"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                        {i18n("setupGuide", "Guide pas-à-pas")}
                      </button>
                    )}
                  </div>
                </Section>
              </div>

              {/* Footer actions */}
              <div className="border-t border-[var(--panel-border)] p-5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onTest}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]/40"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {i18n("testConnection", "Tester")}
                  </button>

                  {isConnected ? (
                    <button
                      type="button"
                      onClick={onDisconnect}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 px-3 py-2.5 text-xs font-medium text-[var(--danger)] transition hover:bg-[var(--danger)]/20"
                    >
                      <Unplug className="h-3.5 w-3.5" />
                      {i18n("disconnect", "Déconnecter")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onConnect}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3 py-2.5 text-xs font-bold text-[var(--accent-contrast)] transition hover:bg-[var(--accent-primary)]/90"
                    >
                      <Plug className="h-3.5 w-3.5" />
                      {i18n("connect", "Connecter")}
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
