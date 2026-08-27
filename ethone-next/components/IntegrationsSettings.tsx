"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plug, RefreshCcw, Zap } from "lucide-react";
import { fetchWorker } from "@/lib/api";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useProviderCredentials } from "@/lib/hooks/useProviderCredentials";
import { INTEGRATIONS, INTEGRATION_CATEGORIES } from "@/lib/integrations";
import { isConfigured, pingIntegration, type PingResult } from "@/lib/connection-config";
import { getIntegrationConfig } from "@/lib/integrations.config";
import SystemHealthBanner from "@/components/SystemHealthBanner";
import CategoryTabs from "@/components/CategoryTabs";
import MyConnectionsRow from "@/components/MyConnectionsRow";
import ConnectionCard from "@/components/ConnectionCard";
import DiscordConfig from "@/components/DiscordConfig";
import SpotifyConfig from "@/components/SpotifyConfig";
import Input from "@/components/ui/Input";
import { EmptyState } from "@/components/ui";
import { ErrorState } from "@/components/ui";


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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<string, PingResult>>({});
  const [testingAll, setTestingAll] = useState(false);
  const [search, setSearch] = useState("");

  const i18n = useI18n();
  const { settings } = useSettings();
  const credentials = useProviderCredentials();
  const searchParams = useSearchParams();
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    const service = searchParams?.get("service");
    if (!service) return;
    const integration = INTEGRATIONS.find((i) => i.id === service);
    setSearch("");
    if (!integration) {
      setFilter("all");
      return;
    }
    setHighlighted(service);
    setFilter(integration.category || "all");
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
    setFetchError(null);
    fetchWorker("/api/connections")
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const map: Record<string, boolean> = {};
        rows.forEach((row: { provider: string; connected: boolean }) => {
          map[row.provider] = row.connected;
        });
        setConnected(map);
      })
      .catch((err) => {
        setConnected({});
        setFetchError(err instanceof Error ? err.message : i18n("connectionError", "Impossible de récupérer les connexions"));
      })
      .finally(() => setLoading(false));
  }, [i18n]);

  const configuredMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    INTEGRATIONS.forEach((integration) => {
      map[integration.id] = isConfigured(integration, settings, credentials.connected, connected);
    });
    return map;
  }, [settings, credentials.connected, connected]);

  const myConnections = useMemo(
    () => INTEGRATIONS.filter((integration) => configuredMap[integration.id]),
    [configuredMap]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cat = INTEGRATION_CATEGORIES.find((c) => c.id === filter);
    let list = filter === "all" ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === filter);
    if (q) {
      list = list.filter((i) => {
        const config = getIntegrationConfig(i.id);
        const haystack = [
          i.name,
          i.id,
          i18n(i.description, i.description),
          i.category,
          cat?.label || "",
          config?.badge || "",
          config?.description || "",
          config?.name || "",
          config?.category || "",
          config?.developerButtonLabel || "",
          i.status,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    return list;
  }, [filter, search, i18n]);

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

  const handleDisconnect = useCallback((id: string) => {
    setConnected((prev) => ({ ...prev, [id]: false }));
    setClientIds((prev) => ({ ...prev, [id]: "" }));
    setSearch("");
    setFilter("all");
  }, []);

  const handleSelectMyConnection = useCallback((id: string) => {
    setFilter("all");
    setSearch("");
    setHighlighted(id);
    window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    window.setTimeout(() => setHighlighted(null), 3500);
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
          onDisconnect={handleDisconnect}
        />
      );

    return (
      <div
        key={integration.id}
        id={integration.id}
        data-service={integration.id}
        className={`scroll-mt-6 h-full rounded-2xl transition-shadow ${
          isHighlighted
            ? "ring-2 ring-[var(--accent-primary)] ring-offset-0"
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
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
              <Plug className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">{i18n("connectionsTitle", "Connexions")}</h1>
              <p className="text-xs text-[var(--text-muted)]">{i18n("connectionsDescription", "Gérez vos intégrations et connectez ETHONE à votre environnement numérique.")}</p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              onClick={testAll}
              disabled={testingAll}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-xs font-semibold text-[var(--accent-contrast)] shadow-sm shadow-[var(--accent-primary)]/20 transition hover:bg-[var(--accent-primary)]/90 disabled:opacity-50 sm:flex-none"
            >
              {testingAll ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              {i18n("testAllConnections", "Tester toutes")}
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]/40 sm:flex-none"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              {i18n("clearFilters", "Effacer")}
            </button>
          </div>
        </div>

        <SystemHealthBanner
          configuredMap={configuredMap}
          health={health}
          testing={testingAll}
          onTestAll={testAll}
        />

        <div className="flex flex-col gap-3">
          <Input
            icon="search"
            inputSize="compact"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={i18n("searchIntegration", "Rechercher une intégration…")}
            clearable
            className="w-full"
          />
          <CategoryTabs active={filter} onChange={setFilter} />
        </div>
      </div>

      <div className="min-h-0 w-full flex-1 space-y-4 overflow-y-auto p-6 pb-10 no-scrollbar">
        <MyConnectionsRow
          integrations={myConnections}
          configuredMap={configuredMap}
          health={health}
          onSelect={handleSelectMyConnection}
        />
      {(loading || credentials.loading) && (
        <div className="flex items-center gap-3 rounded-2xl v8-panel p-5 text-sm text-[var(--text-muted)] backdrop-blur-2xl">
          <Plug className="h-5 w-5 animate-spin" />
          {i18n("loading")}
        </div>
      )}

      {fetchError && (
        <ErrorState
          title={i18n("error", "Erreur")}
          description={fetchError}
          onRetry={() => {
            setFetchError(null);
            setConnected({});
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
              .catch(() => {})
              .finally(() => setLoading(false));
          }}
        />
      )}

      {!loading && !credentials.loading && filtered.length === 0 ? (
        <EmptyState
          title={i18n("noResults", "Aucun résultat")}
          description={i18n("noResultsDescription", "Aucune intégration ne correspond à votre recherche.")}
          icon="search-x"
          action={
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className="rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--accent-contrast)] transition hover:bg-[var(--accent-primary)]/90"
            >
              {i18n("clearFilters", "Effacer")}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((integration) => renderCard(integration))}
        </div>
      )}

      <div className="rounded-2xl v8-panel p-5 text-sm text-[var(--text-muted)] backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4" />
          <p>{i18n("oauthInfo")}</p>
        </div>
      </div>
      </div>
    </div>
  );
}
