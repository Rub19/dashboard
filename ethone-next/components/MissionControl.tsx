"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Sparkles,
  Layers,
  LayoutGrid,
  Workflow,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  Radio,
  Maximize2,
  AppWindow,
  FileText,
  CheckSquare,
  Calendar,
  Mail,
  Flame,
  ArrowRight,
  Command,
  SlidersHorizontal,
} from "@/components/icons/ph";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useWindowManager } from "./WindowManagerProvider";
import { useLayer } from "./LayerProvider";
import { useActiveProfile } from "@/components/SettingsProvider";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { hapticLightImpact } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const ROUTE_ICONS: Record<string, string> = {
  "/": "home",
  "/notes": "notes",
  "/tasks": "tasks",
  "/calendar": "calendar",
  "/files": "files",
  "/bills": "bills",
  "/mail": "mail",
  "/brain": "brain",
  "/focus": "focus",
  "/spaces": "spaces",
  "/flows": "flows",
  "/interactions": "interactions",
  "/connections": "connections",
  "/activity": "activity",
  "/settings": "settings",
  "/system": "system",
  "/team": "team",
  "/profile": "user",
  "/plugins": "plugins",
  "/drop": "drop",
  "/rss": "rss",
};

function routeIcon(route: string) {
  return ROUTE_ICONS[route] || "scan-search";
}

const APP_ROUTES = Object.entries(ROUTE_ICONS).map(([route, icon]) => ({
  id: route === "/" ? "home" : route.replace(/^\/+/, ""),
  route,
  icon,
}));

type Workspace = {
  id: "personal" | "focus" | "studio";
  name: string;
  icon: string;
  flow: string;
  description: string;
  steps: string[];
  widgets: string[];
  color: string;
};

const WORKSPACES: Workspace[] = [
  {
    id: "personal",
    name: "Personnel",
    icon: "user",
    flow: "Essentiel",
    description: "Un environnement dédié aux tâches quotidiennes et à l'organisation personnelle.",
    steps: ["Capturer", "Organiser", "Exécuter"],
    widgets: ["notes", "tasks", "calendar", "brain"],
    color: "var(--accent-primary)",
  },
  {
    id: "focus",
    name: "Focus",
    icon: "focus",
    flow: "Deep Work",
    description: "Concentration maximale, réduction des bruits et minuterie pomodoro.",
    steps: ["Choisir", "Concentrer", "Terminer"],
    widgets: ["tasks", "calendar", "brain", "notes"],
    color: "var(--warning)",
  },
  {
    id: "studio",
    name: "Studio",
    icon: "sparkles",
    flow: "Création",
    description: "Espace créatif pour explorer, relier des idées et concevoir des projets.",
    steps: ["Explorer", "Relier", "Publier"],
    widgets: ["notes", "files", "brain", "calendar"],
    color: "var(--accent-secondary, #a855f7)",
  },
];

const STATUS_DOT: Record<string, string> = {
  connected: "bg-[var(--success)] shadow-[0_0_8px_var(--success)]",
  loading: "bg-[var(--warning)] animate-pulse",
  empty: "bg-[var(--text-muted)] opacity-50",
  error: "bg-[var(--danger)]",
};

type FilterCategory = "all" | "windows" | "spaces" | "flows" | "apps" | "live";

export function MissionControl() {
  const { missionControl, setMissionControl } = useWindowManager();

  useEffect(() => {
    if (!missionControl) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "F2" || e.key === "F3") {
        e.preventDefault();
        setMissionControl(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [missionControl, setMissionControl]);

  return (
    <AnimatePresence>
      {missionControl && <MissionControlHUD />}
    </AnimatePresence>
  );
}

function MissionControlHUD() {
  const i18n = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { activeProfile } = useActiveProfile();
  const { windows, setMissionControl, focusWindow, closeWindow, openWindow } = useWindowManager();
  const { records } = useLiveData();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useLayer(true, () => setMissionControl(false), {
    boundary: dialogRef,
    kind: "dialog",
    modal: true,
    trapFocus: true,
    closeOnEscape: true,
    closeOnOutside: true,
    closeOnResize: false,
    closeOnScroll: false,
    initialFocus: false,
  });

  const activeWorkspace = useMemo(
    () => WORKSPACES.find((w) => w.id === (activeProfile?.workspace || "personal")) || WORKSPACES[0],
    [activeProfile]
  );

  const liveCards = useMemo(() => records.slice(0, 6), [records]);

  const filteredWindows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return windows;
    return windows.filter(
      (w) => w.title.toLowerCase().includes(term) || w.route.toLowerCase().includes(term)
    );
  }, [windows, query]);

  const filteredRoutes = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return APP_ROUTES;
    return APP_ROUTES.filter(
      (r) =>
        r.id.toLowerCase().includes(term) ||
        r.route.toLowerCase().includes(term) ||
        i18n(r.id).toLowerCase().includes(term)
    );
  }, [query, i18n]);

  const filteredSpaces = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return WORKSPACES;
    return WORKSPACES.filter(
      (w) =>
        w.name.toLowerCase().includes(term) ||
        w.flow.toLowerCase().includes(term) ||
        w.description.toLowerCase().includes(term)
    );
  }, [query]);

  const filteredLive = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return liveCards;
    return liveCards.filter(
      (l) =>
        l.title?.toLowerCase().includes(term) ||
        l.label?.toLowerCase().includes(term) ||
        l.source?.toLowerCase().includes(term) ||
        l.subtitle?.toLowerCase().includes(term)
    );
  }, [liveCards, query]);

  function navigateAndClose(href: string) {
    hapticLightImpact();
    setMissionControl(false);
    router.push(href);
  }

  function handleOpenApp(route: string, label: string) {
    hapticLightImpact();
    setMissionControl(false);
    openWindow(label, route);
  }

  const quickLaunchItems = [
    { label: "Notes", route: "/notes", icon: FileText },
    { label: "Tâches", route: "/tasks", icon: CheckSquare },
    { label: "Calendrier", route: "/calendar", icon: Calendar },
    { label: "Mail", route: "/mail", icon: Mail },
    { label: "Focus", route: "/focus", icon: Flame },
    { label: "Système", route: "/system", icon: SlidersHorizontal },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/75 backdrop-blur-2xl select-none"
    >
      {/* Dynamic Ambient Glow Behind Modal */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[800px] rounded-full bg-[radial-gradient(ellipse,var(--accent-primary)/14,transparent_70%)] blur-3xl" />

      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="v8-panel relative flex h-full max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--surface-overlay)]/95 shadow-[0_30px_90px_rgba(0,0,0,0.65)] ring-1 ring-white/5"
      >
        {/* Top Header Row with System Info & Quick Shortcuts */}
        <div className="relative z-10 flex flex-col gap-4 border-b border-[var(--panel-border)] p-5 sm:p-6 bg-gradient-to-b from-[var(--surface-raised)]/40 to-transparent">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  {i18n("missionNavigationSystem", "Navigation Système")}
                </span>
                <span className="text-[var(--text-muted)]/50">•</span>
                <button
                  type="button"
                  onClick={() => navigateAndClose("/spaces")}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-all cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{activeWorkspace.name} ({activeWorkspace.flow})</span>
                  <ChevronRight className="h-3 w-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
                Mission Control
                <span className="text-xs font-normal text-[var(--text-muted)] border border-[var(--panel-border)] px-2 py-0.5 rounded-full bg-[var(--surface-2)]/50">
                  {windows.length} {windows.length > 1 ? "fenêtres" : "fenêtre"}
                </span>
              </h2>
            </div>

            {/* Quick Action Chips & Close Button */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-2)]/60 px-2.5 py-1 text-[11px] font-mono text-[var(--text-muted)] shadow-2xs">
                F2
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-2)]/60 px-2.5 py-1 text-[11px] font-mono text-[var(--text-muted)] shadow-2xs">
                ESC
              </span>
              <motion.button
                whileHover={{ rotate: 90, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setMissionControl(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-2)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/10 transition-colors cursor-pointer shadow-xs"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>
          </div>

          {/* Search Input Bar & Category Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une fenêtre, un espace, un workflow, un dashboard..."
                autoFocus
                className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-2)]/60 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all shadow-inner"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto os-scroll py-0.5">
              {[
                { id: "all", label: "Tout" },
                { id: "windows", label: `Fenêtres (${filteredWindows.length})` },
                { id: "spaces", label: "Espaces" },
                { id: "flows", label: "Workflows" },
                { id: "apps", label: `Apps (${filteredRoutes.length})` },
              ].map((tab) => {
                const isSelected = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      hapticLightImpact();
                      setSelectedCategory(tab.id as FilterCategory);
                    }}
                    className={cn(
                      "relative rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors shrink-0 cursor-pointer",
                      isSelected
                        ? "text-[var(--accent-primary)] font-semibold"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]/50"
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="active-mc-filter-tab"
                        className="absolute inset-0 rounded-lg bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 -z-10 shadow-xs"
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      />
                    )}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable Main Content Container */}
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto os-scroll p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            {/* Left Column: Spaces, Flows, Open Windows */}
            <div className="space-y-6">
              {/* Spaces Section */}
              {(selectedCategory === "all" || selectedCategory === "spaces") && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[var(--accent-primary)]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Espaces de Travail
                      </h3>
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--surface-2)] px-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                        {filteredSpaces.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateAndClose("/spaces")}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Gérer</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {filteredSpaces.map((w) => {
                      const isActive = w.id === activeWorkspace.id;
                      return (
                        <motion.button
                          key={w.id}
                          whileHover={{ y: -4, scale: 1.015 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          type="button"
                          onClick={() => navigateAndClose("/spaces")}
                          className={cn(
                            "group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer shadow-sm overflow-hidden",
                            isActive
                              ? "border-[var(--accent-primary)]/50 bg-gradient-to-br from-[var(--accent-primary)]/15 via-[var(--surface-2)]/60 to-[var(--surface-2)]/30 ring-1 ring-[var(--accent-primary)]/30 shadow-[0_4px_20px_-4px_rgba(var(--accent-rgb,236,72,153),0.2)]"
                              : "border-[var(--panel-border)] bg-[var(--surface-2)]/40 hover:border-[var(--panel-border)] hover:bg-[var(--surface-2)]"
                          )}
                        >
                          {isActive && (
                            <div className="absolute top-0 right-0 h-16 w-16 bg-[radial-gradient(ellipse_at_top_right,var(--accent-primary)/25,transparent_70%)] pointer-events-none" />
                          )}

                          <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
                            <div
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors shadow-xs",
                                isActive
                                  ? "border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                                  : "border-[var(--panel-border)] bg-[var(--surface-2)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                              )}
                            >
                              <Icon name={w.icon} className="h-5 w-5" />
                            </div>
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent-primary)] shadow-2xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                                Actif
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                                Basculer
                              </span>
                            )}
                          </div>

                          <div className="relative z-10">
                            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                              {w.flow}
                            </span>
                            <span className="block text-sm font-bold text-[var(--text-primary)] mt-0.5 group-hover:text-[var(--accent-primary)] transition-colors">
                              {w.name}
                            </span>
                            <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                              {w.description}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.section>
              )}

              {/* Workflows & Flows Section */}
              {(selectedCategory === "all" || selectedCategory === "flows") && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-[var(--accent-primary)]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Workflows & Flows
                      </h3>
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--surface-2)] px-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                        {WORKSPACES.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateAndClose("/flows")}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Tous les flows</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {WORKSPACES.map((w) => {
                      const isActive = w.id === activeWorkspace.id;
                      return (
                        <motion.button
                          key={w.id}
                          whileHover={{ y: -3, scale: 1.015 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          type="button"
                          onClick={() => navigateAndClose("/flows")}
                          className={cn(
                            "group flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer shadow-sm",
                            isActive
                              ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10"
                              : "border-[var(--panel-border)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)]"
                          )}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-2)] text-[var(--accent-primary)] group-hover:scale-105 transition-transform shadow-xs">
                              <Workflow className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider truncate">
                                {w.name}
                              </span>
                              <span className="block text-xs font-bold text-[var(--text-primary)] truncate">
                                {w.flow}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 pt-2.5 border-t border-[var(--panel-border)]/70">
                            {w.steps.map((step, i) => (
                              <div key={i} className="flex items-center gap-1 flex-1 min-w-0">
                                <span className="flex-1 truncate rounded-lg border border-[var(--panel-border)] bg-[var(--surface-2)]/70 px-1.5 py-1 text-[10px] font-medium text-[var(--text-muted)] text-center group-hover:border-[var(--accent-primary)]/30 group-hover:text-[var(--text-primary)] transition-colors">
                                  {step}
                                </span>
                                {i < w.steps.length - 1 && (
                                  <ArrowRight className="h-2.5 w-2.5 text-[var(--text-muted)]/40 shrink-0" />
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.section>
              )}

              {/* Open Windows (Exposé Grid) */}
              {(selectedCategory === "all" || selectedCategory === "windows") && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="h-4 w-4 text-[var(--accent-primary)]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Fenêtres Ouvertes
                      </h3>
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--surface-2)] px-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                        {windows.length}
                      </span>
                    </div>
                  </div>

                  {windows.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--surface-2)]/20 p-8 text-center text-[var(--text-muted)]"
                    >
                      <motion.div
                        animate={{ y: [-3, 3, -3] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-2)]/80 text-[var(--accent-primary)] shadow-inner"
                      >
                        <AppWindow className="h-7 w-7 opacity-80" />
                      </motion.div>

                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          Aucune fenêtre active en arrière-plan
                        </p>
                        <p className="text-xs text-[var(--text-muted)] max-w-md">
                          Ouvrez instantanément une application ci-dessous ou sélectionnez-en une dans la colonne de droite.
                        </p>
                      </div>

                      {/* Quick Launch Buttons */}
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        {quickLaunchItems.map((item) => {
                          const IconComponent = item.icon;
                          return (
                            <motion.button
                              key={item.route}
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              onClick={() => {
                                hapticLightImpact();
                                setMissionControl(false);
                                openWindow(item.label, item.route);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-2)]/70 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/15 hover:text-[var(--accent-primary)] transition-colors cursor-pointer shadow-xs"
                            >
                              <IconComponent className="h-3.5 w-3.5" />
                              <span>{item.label}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : filteredWindows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--panel-border)] p-8 text-center text-[var(--text-muted)] bg-[var(--surface-2)]/30">
                      <Search className="h-6 w-6 opacity-40" />
                      <p className="text-xs">Aucune fenêtre ne correspond à votre recherche.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredWindows.map((win) => (
                        <motion.div
                          key={win.id}
                          layout
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.92 }}
                          whileHover={{ y: -4, scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 350, damping: 26 }}
                          className="group relative rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-2)]/50 hover:border-[var(--accent-primary)]/50 hover:bg-[var(--surface-2)] transition-colors shadow-sm overflow-hidden flex flex-col justify-between"
                        >
                          {/* Window Top Chrome (macOS-style traffic dots) */}
                          <div className="flex items-center justify-between border-b border-[var(--panel-border)]/60 px-3 py-2 bg-[var(--surface-3)]/40">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                              <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
                              <span className="h-2 w-2 rounded-full bg-[#28c840]" />
                            </div>
                            <span className="text-[10px] font-mono text-[var(--text-muted)] truncate max-w-[120px]">
                              {win.route}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                closeWindow(win.id);
                              }}
                              className="flex h-5 w-5 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--danger)]/20 hover:text-[var(--danger)] transition-colors cursor-pointer"
                              title="Fermer la fenêtre"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Window Body & Preview */}
                          <button
                            type="button"
                            onClick={() => {
                              focusWindow(win.id);
                              setMissionControl(false);
                            }}
                            className="p-3.5 text-left w-full flex-1 flex flex-col justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                                <Icon name={routeIcon(win.route)} className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                                  {win.title}
                                </p>
                                <p className="truncate text-[10px] text-[var(--text-muted)]">
                                  Fenêtre active
                                </p>
                              </div>
                            </div>

                            {/* Mini UI Mockup */}
                            <div className="h-14 w-full rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/60 p-2.5 opacity-70 group-hover:opacity-100 transition-opacity flex flex-col justify-around">
                              <div className="h-1.5 w-2/5 rounded bg-[var(--accent-primary)]/50" />
                              <div className="h-1.5 w-4/5 rounded bg-[var(--text-muted)]/30" />
                              <div className="h-1.5 w-3/5 rounded bg-[var(--text-muted)]/20" />
                            </div>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.section>
              )}
            </div>

            {/* Right Column: Applications & Live Connectors */}
            <div className="space-y-6">
              {/* Dashboards & Apps Launcher */}
              {(selectedCategory === "all" || selectedCategory === "apps") && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-[var(--accent-primary)]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Dashboards & Apps
                      </h3>
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--surface-2)] px-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                        {filteredRoutes.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto os-scroll pr-1">
                    {filteredRoutes.map((r) => {
                      const isCurrent = pathname === r.route;
                      const label = i18n(r.id);
                      return (
                        <motion.button
                          key={r.id}
                          whileHover={{ x: 3 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => handleOpenApp(r.route, label)}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-all duration-150 cursor-pointer shadow-2xs",
                            isCurrent
                              ? "border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/15 text-[var(--text-primary)] font-semibold"
                              : "border-transparent hover:border-[var(--panel-border)] hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all",
                              isCurrent
                                ? "border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/25 text-[var(--accent-primary)] shadow-xs"
                                : "border-[var(--panel-border)] bg-[var(--surface-2)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:border-[var(--accent-primary)]/30"
                            )}
                          >
                            <Icon name={r.icon} className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className="block text-xs font-medium truncate group-hover:text-[var(--text-primary)]">
                              {label}
                            </span>
                            <span className="block text-[10px] text-[var(--text-muted)] truncate font-mono">
                              {r.route}
                            </span>
                          </div>

                          {isCurrent ? (
                            <CheckCircle2 className="h-4 w-4 text-[var(--accent-primary)] shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.section>
              )}

              {/* Connecteurs Live Status */}
              {(selectedCategory === "all" || selectedCategory === "live") && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-[var(--accent-primary)]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Connecteurs Live
                      </h3>
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--surface-2)] px-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                        {filteredLive.length}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {filteredLive.map((record) => (
                      <motion.button
                        key={record.id}
                        whileHover={{ scale: 1.015, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => navigateAndClose("/connections")}
                        className="group flex w-full items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-2)]/40 p-2.5 text-left hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-2)] transition-colors cursor-pointer shadow-2xs"
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 shrink-0 rounded-full",
                            STATUS_DOT[record.status] || "bg-[var(--text-muted)]/40"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                            {record.title || record.label}
                          </span>
                          <span className="block text-[10px] text-[var(--text-muted)] truncate">
                            {record.subtitle || record.source}
                          </span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </motion.button>
                    ))}
                  </div>
                </motion.section>
              )}
            </div>
          </div>
        </div>

        {/* Footer Bar with Quick Tips */}
        <div className="border-t border-[var(--panel-border)] px-6 py-3 bg-[var(--surface-raised)]/40 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Command className="h-3 w-3" />
              <span>Navigation au clavier activée</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>F2 / F3 : Basculer</span>
            <span>ESC : Quitter</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default MissionControl;
