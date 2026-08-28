"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plug, RefreshCcw, Zap, Search } from "lucide-react";
import { fetchWorker } from "@/lib/api";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useProviderCredentials } from "@/lib/hooks/useProviderCredentials";
import { INTEGRATIONS, INTEGRATION_CATEGORIES } from "@/lib/integrations";
import { isConfigured, pingIntegration, type PingResult } from "@/lib/connection-config";
import { getIntegrationConfig } from "@/lib/integrations.config";
import CategoryTabs from "@/components/CategoryTabs";
import MyConnectionsRow from "@/components/MyConnectionsRow";
import ConnectionCard from "@/components/ConnectionCard";
import BrainIntegrationsHub from "@/components/connections/BrainIntegrationsHub";
import Input from "@/components/ui/Input";
import { EmptyState } from "@/components/ui";
import { ErrorState } from "@/components/ui";
import { cn } from "@/lib/utils";

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
  const { settings, update } = useSettings();
  const { success: toastSuccess } = useToast();
  const credentials = useProviderCredentials();
  const searchParams = useSearchParams();

  useEffect(() => {
    const service = searchParams?.get("service");
    if (!service) return;
    const integration = INTEGRATIONS.find((i) => i.id === service);
    setSearch("");
    if (!integration) {
      setFilter("all");
      return;
    }
    setFilter(integration.category || "all");
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
      .catch(() => {
        setConnected({});
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
    let list = INTEGRATIONS;

    if (filter === "connected") {
      list = list.filter((i) => configuredMap[i.id]);
    } else if (filter !== "all") {
      list = list.filter((i) => i.category === filter);
    }

    if (q) {
      list = list.filter((i) => {
        const config = getIntegrationConfig(i.id);
        const haystack = [
          i.name,
          i.id,
          i.description,
          i.category,
          config?.badge || "",
          config?.description || "",
        ].join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }
    return list;
  }, [filter, search, configuredMap]);

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

  const handleDisconnect = useCallback(
    async (id: string) => {
      // 1. Remove from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem(`ethone:connected:${id}`);
        localStorage.removeItem(`ethone:token:${id}`);
        localStorage.removeItem(`ethone:clientId:${id}`);
        localStorage.removeItem(`ethone:pub:${id}`);
        localStorage.removeItem(`ethone:cred:${id}`);
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith(`ethone:pub:${id}:`) || key.startsWith(`ethone:cred:${id}:`)) {
            localStorage.removeItem(key);
          }
        });
      }

      // 2. Remove credentials
      await credentials.remove(id).catch(() => {});

      // 3. Clear settings keys
      const settingsPatch: Record<string, string> = {};
      if (id === "spotify") {
        settingsPatch.liveSpotifyClientId = "";
        settingsPatch.liveNowPlayingSource = "none";
      } else if (id === "discord") {
        settingsPatch.liveLanyardUserId = "";
      } else if (id === "youtube") {
        settingsPatch.liveYoutubeClientId = "";
      } else if (id === "reddit") {
        settingsPatch.liveRedditClientId = "";
      } else if (id === "google-calendar") {
        settingsPatch.calendarClientId = "";
      } else if (id === "google-drive") {
        settingsPatch.driveClientId = "";
      } else if (id === "steam") {
        settingsPatch.liveSteamId = "";
        settingsPatch.liveSteamAppId = "";
      } else if (id === "lastfm") {
        settingsPatch.liveLastfmUsername = "";
      } else if (id === "twitch") {
        settingsPatch.liveTwitchLogin = "";
      } else if (id === "minecraft") {
        settingsPatch.liveMinecraftUsername = "";
      } else if (id === "weather") {
        settingsPatch.liveWeatherCity = "";
      } else if (id === "bluesky") {
        settingsPatch.liveBlueskyHandle = "";
      } else if (id === "riot") {
        settingsPatch.liveTrackerRiotName = "";
        settingsPatch.liveTrackerRiotTag = "";
      }
      if (Object.keys(settingsPatch).length > 0) {
        update(settingsPatch as never);
      }

      // 4. Update local component state
      setConnected((prev) => ({ ...prev, [id]: false }));
      setClientIds((prev) => ({ ...prev, [id]: "" }));
      setHealth((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      // 5. Tell worker to revoke / delete connection
      void fetchWorker("/api/connections/disconnect", {
        method: "POST",
        body: JSON.stringify({ provider: id }),
      }).catch(() => {});

      // 6. Broadcast event for other components and hooks
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("v8:connection-updated", {
            detail: { provider: id, connected: false },
          })
        );
      }

      const integration = INTEGRATIONS.find((i) => i.id === id);
      toastSuccess(`Déconnecté de ${integration?.name || id}`);
    },
    [credentials, update, toastSuccess]
  );

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-transparent">
      {/* Top Header Bar */}
      <div className="shrink-0 border-b border-[var(--panel-border)]/60 bg-[var(--panel-bg)]/40 px-6 py-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] shadow-sm">
              <Plug className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[var(--text-primary)]">
                  Connexions & Intégrations
                </h1>
                <span className="rounded-full bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 px-2 py-0.2 text-[10px] font-bold text-[var(--accent-primary)]">
                  {myConnections.length} / {INTEGRATIONS.length} connectés
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Connectez vos services préférés à l&apos;écosystème ETHONE OS & Brain
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Bar in Header */}
            <div className="relative min-w-[200px] sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une intégration..."
                className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none backdrop-blur-md"
              />
            </div>

            <button
              type="button"
              onClick={testAll}
              disabled={testingAll}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-bold text-[var(--accent-contrast)] shadow-md hover:scale-105 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Zap className={cn("h-3.5 w-3.5", testingAll && "animate-spin")} />
              <span>{testingAll ? "Test global en cours..." : "Tester toutes"}</span>
            </button>
            {(search || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="flex items-center gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              >
                <RefreshCcw className="h-3 w-3" />
                <span>Effacer filtres</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto os-scroll p-4 sm:p-6 space-y-6">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {/* Brain Ecosystem Hub */}
          <BrainIntegrationsHub
            connectedCount={myConnections.length}
            totalCount={INTEGRATIONS.length}
            configuredMap={configuredMap}
          />

          {/* Active Connections Carousel */}
          {myConnections.length > 0 && (
            <MyConnectionsRow
              integrations={myConnections}
              configuredMap={configuredMap}
              health={health}
              onSelect={(id) => {
                setSearch(id);
              }}
            />
          )}

          {/* Filter Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <CategoryTabs active={filter} onChange={setFilter} />
          </div>


          {/* Empty State or Cards Grid */}
          {!loading && filtered.length === 0 ? (
            <EmptyState
              title="Aucune intégration trouvée"
              description="Aucun service ne correspond à vos critères de recherche."
              icon="search-x"
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] shadow-sm"
                >
                  Réinitialiser la recherche
                </button>
              }
            />
          ) : (
            <motion.div
              layout="position"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((integration) => (
                  <motion.div
                    key={integration.id}
                    layout="position"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
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
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
