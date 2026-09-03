"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Sparkles,
  Brain,
  Blocks,
  Palette,
  LayoutGrid,
  Zap,
  Bot,
  Download,
  Heart,
  RefreshCw,
  SlidersHorizontal,
  X,
  CheckCircle2,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";
import {
  MARKETPLACE_ITEMS,
  getMarketplaceItem,
  type MarketplaceItem,
  type MarketplaceItemType,
  type VerificationTier,
} from "@/lib/marketplace/marketplace-registry";
import {
  evaluateBrainMatch,
  parseNaturalLanguageIntent,
  getCurrentDayPeriod,
  type BrainMatchResult,
} from "@/lib/marketplace/brain-recommendation-engine";
import { useMarketplaceStore } from "@/lib/marketplace/marketplace-store";
import MarketplaceHero from "@/components/marketplace/MarketplaceHero";
import MarketplaceCard from "@/components/marketplace/MarketplaceCard";
import MarketplaceItemModal from "@/components/marketplace/MarketplaceItemModal";
import MarketplaceWhyBrainDrawer from "@/components/marketplace/MarketplaceWhyBrainDrawer";
import MarketplaceUpdatesView from "@/components/marketplace/MarketplaceUpdatesView";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

type NavTab =
  | "discover"
  | "recommended"
  | "widget"
  | "theme"
  | "layout"
  | "automation"
  | "brain"
  | "installed"
  | "favorites"
  | "updates";

type SortOption = "recommended" | "popular" | "newest" | "rating";

export default function PluginsPage() {
  const i18n = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeWorkspace] = useLocalStorage<string>("ethone-active-workspace", "personal");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<NavTab>("discover");
  const [activeTier, setActiveTier] = useState<VerificationTier | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("recommended");

  // Selected item for modal & Why Brain drawer
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [whyBrainState, setWhyBrainState] = useState<{
    item: MarketplaceItem;
    match: BrainMatchResult;
  } | null>(null);

  const {
    installed,
    favorites,
    saved,
    updatesAvailable,
    isInstalled,
    isFavorite,
    isSaved,
    install,
    uninstall,
    toggleFavorite,
    toggleSaved,
    toggleEnabled,
    updateExtension,
    updateAll,
    rollback,
  } = useMarketplaceStore();

  // Connected integrations snapshot for Brain context
  const connectedServices = useMemo(() => {
    if (typeof window === "undefined") return ["spotify", "discord", "github"];
    const keys = ["spotify", "discord", "github", "riot", "valorant", "lol", "notion"];
    return keys.filter((k) => {
      return (
        Boolean(localStorage.getItem(`ethone:connected:${k}`)) ||
        Boolean(localStorage.getItem(`ethone:clientId:${k}`)) ||
        Boolean(localStorage.getItem(`ethone:token:${k}`))
      );
    });
  }, []);

  // Compute Brain recommendations across all items
  const recommendationsMap = useMemo(() => {
    const period = getCurrentDayPeriod();
    const map = new Map<string, BrainMatchResult>();

    for (const item of MARKETPLACE_ITEMS) {
      const match = evaluateBrainMatch(item, {
        workspace: activeWorkspace,
        period,
        connectedServices,
        installedItemIds: Object.keys(installed),
      });
      map.set(item.id, match);
    }
    return map;
  }, [activeWorkspace, connectedServices, installed]);

  // Natural language search intent detection
  const searchIntent = useMemo(() => {
    return parseNaturalLanguageIntent(search);
  }, [search]);

  // Filtered & Sorted items list
  const displayedItems = useMemo(() => {
    let list = [...MARKETPLACE_ITEMS];

    // 1. Tab filter
    if (activeTab === "recommended") {
      list = list.filter((item) => (recommendationsMap.get(item.id)?.score || 0) >= 90);
    } else if (
      activeTab === "widget" ||
      activeTab === "theme" ||
      activeTab === "layout" ||
      activeTab === "automation" ||
      activeTab === "brain"
    ) {
      list = list.filter((item) => item.type === activeTab);
    } else if (activeTab === "installed") {
      list = list.filter((item) => Boolean(installed[item.id]));
    } else if (activeTab === "favorites") {
      list = list.filter((item) => favorites.includes(item.id));
    }

    // 2. Verification tier filter
    if (activeTier !== "all") {
      list = list.filter((item) => item.verification === activeTier);
    }

    // 3. Search query / Intent filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((item) => {
        const matchesText =
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q));

        if (matchesText) return true;

        // Intent match bonus
        if (searchIntent.hasIntent) {
          if (searchIntent.targetCategory && item.category === searchIntent.targetCategory) return true;
          if (searchIntent.targetType && item.type === searchIntent.targetType) return true;
          if (searchIntent.suggestedTags.some((t) => item.tags.includes(t))) return true;
        }

        return false;
      });
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (sortBy === "recommended") {
        const scoreA = recommendationsMap.get(a.id)?.score || 0;
        const scoreB = recommendationsMap.get(b.id)?.score || 0;
        return scoreB - scoreA;
      }
      if (sortBy === "popular") {
        return b.installCount - a.installCount;
      }
      if (sortBy === "rating") {
        return b.rating - a.rating;
      }
      if (sortBy === "newest") {
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      }
      return 0;
    });

    return list;
  }, [
    activeTab,
    activeTier,
    search,
    searchIntent,
    sortBy,
    installed,
    favorites,
    recommendationsMap,
  ]);

  // Top recommendations for hero highlight
  const heroRecommendations = useMemo(() => {
    return MARKETPLACE_ITEMS.map((item) => ({
      item,
      match: recommendationsMap.get(item.id)!,
    }))
      .filter((entry) => entry.match && !installed[entry.item.id])
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 3);
  }, [recommendationsMap, installed]);

  // Updates list for Updates view
  const updatesList = useMemo(() => {
    return updatesAvailable
      .map((id) => {
        const item = getMarketplaceItem(id);
        const record = installed[id];
        if (!item || !record) return null;
        return { item, record };
      })
      .filter(Boolean) as Array<{
      item: MarketplaceItem;
      record: (typeof installed)[string];
    }>;
  }, [updatesAvailable, installed]);

  const navTabs: { id: NavTab; label: string; icon: any; count?: number }[] = [
    { id: "discover", label: "Découvrir", icon: Sparkles },
    { id: "recommended", label: "Recommandés", icon: Brain },
    { id: "widget", label: "Widgets", icon: Blocks },
    { id: "theme", label: "Thèmes", icon: Palette },
    { id: "layout", label: "Layouts", icon: LayoutGrid },
    { id: "automation", label: "Automatisations", icon: Zap },
    { id: "brain", label: "Brain Plugins", icon: Bot },
    { id: "installed", label: "Installés", icon: Download, count: Object.keys(installed).length },
    { id: "favorites", label: "Favoris", icon: Heart, count: favorites.length },
    {
      id: "updates",
      label: "Mises à jour",
      icon: RefreshCw,
      count: updatesAvailable.length > 0 ? updatesAvailable.length : undefined,
    },
  ];

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden p-3 sm:p-6 space-y-4">
      {/* Search Header Bar */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--panel-border)]/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <span>Marketplace & App Store ETHONE</span>
            <span className="rounded-full bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 px-2.5 py-0.5 text-[11px] font-bold text-[var(--accent-primary)]">
              Intelligence 2.0
            </span>
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Explorez, personnalisez et faites évoluer votre environnement de travail avec le moteur cognitif Brain.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (ex: 'setup gaming', GitHub, Pomodoro...)"
            className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/70 pl-10 pr-9 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none shadow-inner"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Natural Language Intent Detection Banner */}
      {searchIntent.hasIntent && (
        <div className="shrink-0 flex items-center justify-between gap-2 rounded-2xl border border-purple-500/30 bg-purple-950/25 px-4 py-2 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2 text-purple-200">
            <Brain className="h-4 w-4 text-purple-400 shrink-0" />
            <span>
              <strong>Intention Brain détectée :</strong> {searchIntent.intentLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-[11px] text-purple-300 hover:text-white underline cursor-pointer"
          >
            Effacer
          </button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {navTabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold transition-all touch-manipulation cursor-pointer",
                isActive
                  ? "bg-[var(--accent-primary)] text-white shadow-sm"
                  : "border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px]",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[var(--panel-border)] text-[var(--text-muted)]"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters & Sorting Sub-Bar */}
      {activeTab !== "updates" && (
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Verification Tiers */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: "all", label: "Tous" },
              { id: "verified", label: "Vérifiés ETHONE" },
              { id: "audited", label: "Sécurité Auditée" },
              { id: "optimized", label: "Optimisés" },
              { id: "trending", label: "Tendances" },
            ].map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setActiveTier(tier.id as any)}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer",
                  activeTier === tier.id
                    ? "bg-[var(--panel-border)] text-[var(--text-primary)] font-bold"
                    : "text-[var(--text-muted)] hover:text-white"
                )}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] font-medium">Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Trier par"
              className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none cursor-pointer"
            >
              <option value="recommended">🧠 Recommandé (Brain Match)</option>
              <option value="popular">🔥 Plus populaires</option>
              <option value="rating">★ Mieux notés</option>
              <option value="newest">⚡ Récents</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll pr-1 pb-6 space-y-6">
        {/* Render Updates View if in Updates tab */}
        {activeTab === "updates" ? (
          <MarketplaceUpdatesView
            updates={updatesList}
            onUpdateOne={updateExtension}
            onUpdateAll={updateAll}
            onRollback={rollback}
          />
        ) : (
          <>
            {/* Hero on Discover Tab */}
            {activeTab === "discover" && !search && (
              <MarketplaceHero
                workspace={activeWorkspace}
                recommendations={heroRecommendations}
                installedCount={Object.keys(installed).length}
                updatesCount={updatesAvailable.length}
                onSelectItem={(item) => setSelectedItem(item)}
                onViewBrainDrawer={(item, match) => setWhyBrainState({ item, match })}
              />
            )}

            {/* Grid of Items */}
            {displayedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-[var(--panel-border)]/40 bg-[var(--surface-raised)]/20 p-8">
                <Search className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Aucun module ne correspond à vos critères
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Essayez avec un autre mot-clé ou modifiez vos filtres de recherche.
                </p>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    Réinitialiser la recherche
                  </button>
                )}
              </div>
            ) : (
              <div>
                {activeTab === "discover" && !search && (
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
                    <span>Toutes les extensions & modules disponibles</span>
                  </h3>
                )}

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {displayedItems.map((item) => (
                    <MarketplaceCard
                      key={item.id}
                      item={item}
                      brainMatch={recommendationsMap.get(item.id)}
                      isInstalled={isInstalled(item.id)}
                      isFavorite={isFavorite(item.id)}
                      isSaved={isSaved(item.id)}
                      hasUpdate={updatesAvailable.includes(item.id)}
                      onSelect={(target) => setSelectedItem(target)}
                      onInstall={async (target) => {
                        await install(target);
                      }}
                      onUninstall={async (target) => {
                        await uninstall(target);
                      }}
                      onToggleFavorite={toggleFavorite}
                      onToggleSaved={toggleSaved}
                      onWhyBrain={(target, match) => setWhyBrainState({ item: target, match })}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Item Detail Modal */}
      <MarketplaceItemModal
        item={selectedItem}
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        brainMatch={selectedItem ? recommendationsMap.get(selectedItem.id) : undefined}
        isInstalled={selectedItem ? isInstalled(selectedItem.id) : false}
        hasUpdate={selectedItem ? updatesAvailable.includes(selectedItem.id) : false}
        onInstall={async (target, ws) => {
          await install(target, ws);
        }}
        onUninstall={async (target) => {
          if (selectedItem) await uninstall(selectedItem);
        }}
        onUpdate={async (id) => {
          await updateExtension(id);
        }}
      />

      {/* Why Brain Explanation Drawer */}
      <MarketplaceWhyBrainDrawer
        item={whyBrainState?.item || null}
        match={whyBrainState?.match || null}
        isOpen={Boolean(whyBrainState)}
        onClose={() => setWhyBrainState(null)}
      />
    </div>
  );
}
