"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import FlatCard from "@/components/FlatCard";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { PLUGINS, getPluginRecord } from "@/lib/plugins";
import { Search, Plug, Maximize2, Sparkles, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PluginsPage() {
  const i18n = useI18n();
  const { success } = useToast();
  const { records } = useLiveData();
  const { openWindow } = useWindowManager();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "Tous les modules" },
    { id: "connected", label: "Connectés" },
    { id: "media", label: "Médias & Streaming" },
    { id: "tools", label: "Outils & Productivité" },
  ];

  const filteredPlugins = useMemo(() => {
    const q = search.toLowerCase().trim();
    return PLUGINS.filter((p) => {
      const live = getPluginRecord(records, p);
      const isConnected = live?.status === "connected";

      if (activeCategory === "connected" && !isConnected) return false;
      if (activeCategory === "media" && !["spotify", "youtube", "twitch", "plex", "jellyfin"].includes(p.id)) return false;
      if (activeCategory === "tools" && ["spotify", "youtube", "twitch", "plex", "jellyfin"].includes(p.id)) return false;

      if (!q) return true;
      return p.label.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    });
  }, [search, activeCategory, records]);

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden p-3 sm:p-6 space-y-4">
      {/* Header & Search */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--panel-border)]/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {i18n("pluginsTitle", "Marketplace & Modules")}
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            {i18n("pluginsDescription", "Intégrez vos services favoris dans votre espace ETHONE unifié.")}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un module (Spotify, Discord...)"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </div>
      </div>

      {/* Category Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveCategory(c.id)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all touch-manipulation",
              activeCategory === c.id
                ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                : "border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll pr-1 pb-4">
        {filteredPlugins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-8 w-8 text-[var(--text-muted)] mb-2" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Aucun module trouvé</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Essayez avec un autre terme de recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPlugins.map((p) => {
              const live = getPluginRecord(records, p);
              const connected = live?.status === "connected";

              return (
                <FlatCard key={p.id}>
                  <div className="flex items-start justify-between gap-3 p-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--panel-bg)] text-[var(--accent-primary)] shadow-sm border border-[var(--panel-border)]/40">
                        <Icon name={p.icon} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">{p.label}</p>
                        <p className={cn("text-[10px] truncate mt-0.5 font-medium", connected ? "text-emerald-400" : "text-[var(--text-muted)]")}>
                          {connected ? live?.title || i18n("connected", "Connecté") : i18n("notConnected", "Non connecté")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={i18n("configure", "Configurer")}
                        onClick={() => router.push("/connections/")}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)]/60 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                        title="Configurer"
                      >
                        <Plug className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={i18n("open", "Ouvrir")}
                        onClick={() => {
                          openWindow(p.label, p.route);
                          success(i18n("open", "Ouvert"));
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)]/60 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                        title="Ouvrir dans une fenêtre"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </FlatCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
