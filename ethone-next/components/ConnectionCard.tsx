"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plug,
  PlugZap,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { startOAuthConnect, PROVIDERS as OAUTH_PROVIDERS } from "@/lib/oauth";
import { getIntegrationConfig } from "@/lib/integrations.config";
import type { Integration } from "@/lib/integrations";
import { isConfigured, type PingResult } from "@/lib/connection-config";
import ServiceIcon from "@/components/ServiceIcon";
import ConnectionGuideModal from "@/components/ConnectionGuideModal";
import ConnectionDetailDrawer from "@/components/ConnectionDetailDrawer";
import { cn } from "@/lib/utils";

export type SyncEvent = {
  type: "connected" | "disconnected" | "synced" | "error";
  at: number;
  message?: string;
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
  onDisconnect,
}: {
  integration: Integration;
  clientId: string;
  onClientIdChange: (id: string, value: string) => void;
  credentialConnected: Record<string, boolean>;
  oauthConnected: Record<string, boolean>;
  credentials: { save: (provider: string, cred: never) => Promise<unknown>; remove: (provider: string) => Promise<void> };
  health?: PingResult;
  onTest?: (id: string) => void;
  onDisconnect?: (id: string) => void;
}) {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { success, error: showError } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const config = useMemo(() => getIntegrationConfig(integration.id), [integration.id]);
  const isConnected = isConfigured(integration, settings, credentialConnected, oauthConnected);
  const isOauth = integration.status === "oauth";

  const handleQuickConnect = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!OAUTH_PROVIDERS[integration.id]) {
      setDrawerOpen(true);
      return;
    }
    const currentId =
      clientId ||
      (settings as unknown as Record<string, string>)[`${integration.id}ClientId`] ||
      (integration.id === "spotify" ? "6619fbf6315e4e68948dc08532251912" : "") ||
      (OAUTH_PROVIDERS[integration.id] ? "6619fbf6315e4e68948dc08532251912" : "");
    if (!currentId.trim()) {
      setDrawerOpen(true);
      return;
    }
    setConnecting(true);
    try {
      if (integration.id === "spotify") update({ liveSpotifyClientId: currentId, liveNowPlayingSource: "spotify" } as never);
      if (integration.id === "youtube") update({ liveYoutubeClientId: currentId } as never);
      if (integration.id === "google-calendar") update({ calendarClientId: currentId } as never);
      if (integration.id === "google-drive") update({ driveClientId: currentId } as never);
      const authUrl = await startOAuthConnect(integration.id, currentId, { provider: integration.id, clientId: currentId });
      window.location.href = authUrl;
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erreur de connexion");
      setConnecting(false);
    }
  };

  const handleTestPing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onTest) return;
    setTesting(true);
    try {
      await onTest(integration.id);
    } finally {
      setTesting(false);
    }
  };

  const statusLabel = isConnected
    ? "Connecté"
    : health?.status === "error"
    ? "Erreur"
    : "Non connecté";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        onClick={() => setDrawerOpen(true)}
        className={cn(
          "group relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all cursor-pointer shadow-lg backdrop-blur-2xl",
          isConnected
            ? "border-[var(--accent-primary)]/30 bg-gradient-to-b from-[var(--surface-raised)]/90 to-[var(--surface-raised)]/60 hover:border-[var(--accent-primary)]/60"
            : "border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/50 hover:border-[var(--panel-border)] hover:bg-[var(--surface-raised)]/70"
        )}
      >
        {/* Top Service Info */}
        <div>
          <div className="flex items-start justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] shadow-xs transition-transform group-hover:scale-105">
                <ServiceIcon id={integration.id} icon={integration.icon} className="h-6 w-6" colored />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">
                    {integration.name}
                  </h3>
                  {config?.badge && (
                    <span className="rounded-md border border-[var(--panel-border)] bg-[var(--surface-raised)] px-1.5 py-0.2 font-mono text-[9px] text-[var(--text-muted)]">
                      {config.badge}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
                  {config?.description || integration.description}
                </p>
              </div>
            </div>

            {/* Live Status Pill */}
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                isConnected
                  ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
                  : health?.status === "error"
                  ? "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]"
                  : "border-[var(--panel-border)] bg-[var(--surface-raised)]/80 text-[var(--text-muted)]"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isConnected
                    ? "bg-[var(--success)] animate-pulse"
                    : health?.status === "error"
                    ? "bg-[var(--danger)]"
                    : "bg-[var(--text-muted)]"
                )}
              />
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Bottom Health & Action Buttons */}
        <div className="mt-4 pt-3 border-t border-[var(--panel-border)]/50 flex items-center justify-between gap-2">
          {/* Latency badge if tested */}
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            {health?.ms ? (
              <span className="rounded-md border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--accent-primary)]">
                ⚡ {health.ms} ms
              </span>
            ) : isConnected ? (
              <span className="text-[10px] text-[var(--success)] font-medium">✓ Opérationnel</span>
            ) : (
              <span className="text-[10px] text-[var(--text-muted)]">Non configuré</span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleTestPing}
              disabled={testing}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all active:scale-95"
              title="Tester la connexion"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </button>

            {isConnected ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerOpen(true);
                }}
                className="flex items-center gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all active:scale-95"
              >
                <SlidersHorizontal className="h-3 w-3 text-[var(--accent-primary)]" />
                <span>Gérer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleQuickConnect}
                disabled={connecting}
                className="flex items-center gap-1 rounded-xl bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-bold text-[var(--accent-contrast)] shadow-sm hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
              >
                {connecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plug className="h-3 w-3" />}
                <span>Connecter</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Configuration & Detail Drawer */}
      <ConnectionDetailDrawer
        integration={integration}
        config={config}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        status={isConnected ? "connected" : health?.status || "unconfigured"}
        health={health}
        history={[]}
        onTest={() => onTest?.(integration.id)}
        onConnect={() => handleQuickConnect()}
        onDisconnect={() => onDisconnect?.(integration.id)}
        onGuide={() => setShowGuide(true)}
      />

      {/* Step by Step Guide Modal */}
      <ConnectionGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        integrationId={integration.id}
        origin={typeof window !== "undefined" ? window.location.origin : ""}
        copied={null}
        onCopy={() => {}}
      />
    </>
  );
}
