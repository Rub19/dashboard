"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Blocks,
  Brain,
  BriefcaseBusiness,
  Code2,
  Gamepad2,
  HeartPulse,
  MessageSquare,
  Music,
  Plug,
} from "lucide-react";
import { fetchWorker } from "@/lib/api";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useProviderCredentials } from "@/lib/hooks/useProviderCredentials";
import { INTEGRATIONS, INTEGRATION_CATEGORIES } from "@/lib/integrations";
import { isConfigured, pingIntegration, type PingResult } from "@/lib/connection-config";
import DiagnosticPanel from "@/components/DiagnosticPanel";
import ConnectionCard from "@/components/ConnectionCard";
import type { ReactNode } from "react";

function clientIdFromStorage(provider: string): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(`ethone:clientId:${provider}`) || "";
  } catch {
    return "";
  }
}

const CATEGORY_ICONS: Record<string, ReactNode> = {
  all: <Blocks className="h-3.5 w-3.5" />,
  media: <Music className="h-3.5 w-3.5" />,
  social: <MessageSquare className="h-3.5 w-3.5" />,
  gaming: <Gamepad2 className="h-3.5 w-3.5" />,
  productivity: <BriefcaseBusiness className="h-3.5 w-3.5" />,
  development: <Code2 className="h-3.5 w-3.5" />,
  health: <HeartPulse className="h-3.5 w-3.5" />,
  ai: <Brain className="h-3.5 w-3.5" />,
};

export default function ConnectionsPage() {
  const [filter, setFilter] = useState("all");
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [clientIds, setClientIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Record<string, PingResult>>({});
  const [testingAll, setTestingAll] = useState(false);

  const i18n = useI18n();
  const { settings } = useSettings();
  const credentials = useProviderCredentials();

  useEffect(() => {
    setClientIds((prev) => ({
      ...prev,
      spotify: settings.liveSpotifyClientId || clientIdFromStorage("spotify") || prev.spotify || "",
      youtube: settings.liveYoutubeClientId || clientIdFromStorage("youtube") || prev.youtube || "",
      reddit: settings.liveRedditClientId || clientIdFromStorage("reddit") || prev.reddit || "",
      "google-calendar": settings.calendarClientId || clientIdFromStorage("google-calendar") || prev["google-calendar"] || "",
      "google-drive": settings.driveClientId || clientIdFromStorage("google-drive") || prev["google-drive"] || "",
    }));
  }, [settings.liveSpotifyClientId, settings.liveYoutubeClientId, settings.liveRedditClientId, settings.calendarClientId, settings.driveClientId]);

  useEffect(() => {
    setLoading(true);
    fetchWorker("/api/connections")
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const map: Record<string, boolean> = {};
        rows.forEach((row: { provider: string; connected: boolean }) => {
          map[row.provider] = row.connected;
        });
        setConnected(map);
      })
      .catch(() => setConnected({}))
      .finally(() => setLoading(false));
  }, []);

  const configuredMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    INTEGRATIONS.forEach((integration) => {
      map[integration.id] = isConfigured(integration, settings, credentials.connected, connected);
    });
    return map;
  }, [settings, credentials.connected, connected]);

  const filtered = useMemo(
    () => (filter === "all" ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === filter)),
    [filter]
  );

  const testOne = useCallback(
    async (id: string) => {
      const integration = INTEGRATIONS.find((i) => i.id === id);
      if (!integration) return;
      const result = await pingIntegration(integration, settings, clientIds, credentials.connected, connected);
      setHealth((prev) => ({ ...prev, [id]: result }));
    },
    [settings, clientIds, credentials.connected, connected]
  );

  const testAll = useCallback(async () => {
    setTestingAll(true);
    try {
      const results = await Promise.all(
        INTEGRATIONS.map(async (integration) => ({
          id: integration.id,
          result: await pingIntegration(integration, settings, clientIds, credentials.connected, connected),
        }))
      );
      const next: Record<string, PingResult> = {};
      results.forEach(({ id, result }) => {
        next[id] = result;
      });
      setHealth(next);
    } finally {
      setTestingAll(false);
    }
  }, [settings, clientIds, credentials.connected, connected]);

  const handleClientIdChange = useCallback((id: string, value: string) => {
    setClientIds((prev) => ({ ...prev, [id]: value }));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">{i18n("connectionsTitle")}</h1>
        <p className="text-sm text-muted">{i18n("connectionsDescription")}</p>
      </div>

      <DiagnosticPanel
        configuredMap={configuredMap}
        health={health}
        testing={testingAll}
        onTestAll={testAll}
      />

      <div className="flex flex-wrap gap-2">
        {INTEGRATION_CATEGORIES.map((cat) => (
          <motion.button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            layout
            whileTap={{ scale: 0.96 }}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition ${
              filter === cat.id
                ? "bg-accent text-white shadow-[0_0_20px_-4px_rgba(139,92,246,0.4)]"
                : "border border-[var(--panel-border)] bg-surface/60 text-muted hover:border-accent/30 hover:text-foreground"
            }`}
          >
            {CATEGORY_ICONS[cat.id] || <Plug className="h-3.5 w-3.5" />}
            {i18n(cat.id)}
          </motion.button>
        ))}
      </div>

      {(loading || credentials.loading) && (
        <div className="flex items-center gap-3 rounded-3xl border border-[var(--panel-border)] bg-surface/60 p-5 text-sm text-muted backdrop-blur-2xl">
          <Plug className="h-5 w-5 animate-spin" />
          {i18n("loading")}
        </div>
      )}

      <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((integration) => (
            <ConnectionCard
              key={integration.id}
              integration={integration}
              clientId={clientIds[integration.id] || ""}
              onClientIdChange={handleClientIdChange}
              credentialConnected={credentials.connected}
              oauthConnected={connected}
              credentials={credentials}
              health={health[integration.id]}
              onTest={testOne}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      <div className="rounded-3xl border border-[var(--panel-border)] bg-surface/60 p-5 text-sm text-muted backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4" />
          <p>{i18n("oauthInfo")}</p>
        </div>
      </div>
    </div>
  );
}
