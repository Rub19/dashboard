"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plug } from "lucide-react";
import { fetchWorker } from "@/lib/api";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useProviderCredentials } from "@/lib/hooks/useProviderCredentials";
import { INTEGRATIONS } from "@/lib/integrations";
import { isConfigured, pingIntegration, type PingResult } from "@/lib/connection-config";
import SystemHealthBanner from "@/components/SystemHealthBanner";
import CategoryTabs from "@/components/CategoryTabs";
import ConnectionCard from "@/components/ConnectionCard";
import DiscordConfig from "@/components/DiscordConfig";
import SpotifyConfig from "@/components/SpotifyConfig";

function clientIdFromStorage(provider: string): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(`ethone:clientId:${provider}`) || "";
  } catch {
    return "";
  }
}

export default function IntegrationsSettings() {
  const [filter, setFilter] = useState("all");
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [clientIds, setClientIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Record<string, PingResult>>({});
  const [testingAll, setTestingAll] = useState(false);

  const i18n = useI18n();
  const { settings } = useSettings();
  const credentials = useProviderCredentials();
  const searchParams = useSearchParams();
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    const service = searchParams?.get("service");
    if (!service) return;
    const integration = INTEGRATIONS.find((i) => i.id === service);
    if (!integration) return;
    setHighlighted(service);
    if (integration.category) {
      setFilter(integration.category);
    }
    window.setTimeout(() => {
      const el = document.getElementById(service);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);
    const timer = window.setTimeout(() => setHighlighted(null), 3500);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

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
    try {
      localStorage.setItem(`ethone:clientId:${id}`, value);
    } catch {}
  }, []);

  const renderCard = (integration: (typeof INTEGRATIONS)[number]) => {
    const isHighlighted = highlighted === integration.id;
    const card =
      integration.id === "discord" ? (
        <DiscordConfig />
      ) : integration.id === "spotify" ? (
        <SpotifyConfig />
      ) : (
        <ConnectionCard
          integration={integration}
          clientId={clientIds[integration.id] || ""}
          onClientIdChange={handleClientIdChange}
          credentialConnected={credentials.connected}
          oauthConnected={connected}
          credentials={credentials}
          health={health[integration.id]}
          onTest={testOne}
        />
      );

    return (
      <div
        key={integration.id}
        id={integration.id}
        data-service={integration.id}
        className={`scroll-mt-6 h-full rounded-2xl transition-shadow ${
          isHighlighted
            ? "ring-2 ring-emerald-500/50 ring-offset-0"
            : "ring-0 ring-transparent"
        }`}
      >
        {card}
      </div>
    );
  };

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4 space-y-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-white">{i18n("connectionsTitle")}</h1>
          <p className="text-sm text-zinc-400">{i18n("connectionsDescription")}</p>
        </div>

        <SystemHealthBanner
        configuredMap={configuredMap}
        health={health}
        testing={testingAll}
        onTestAll={testAll}
      />

        <CategoryTabs active={filter} onChange={setFilter} />
      </div>

      <div className="min-h-0 w-full flex-1 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:hidden] space-y-4">
      {(loading || credentials.loading) && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 text-sm text-zinc-400 backdrop-blur-2xl">
          <Plug className="h-5 w-5 animate-spin" />
          {i18n("loading")}
        </div>
      )}

      <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((integration) => renderCard(integration))}
      </motion.div>

      <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 text-sm text-zinc-400 backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4" />
          <p>{i18n("oauthInfo")}</p>
        </div>
      </div>
      </div>
    </div>
  );
}
