"use client";

import { useMemo, useRef, useState, useEffect, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Sparkles,
  Layers,
  LayoutGrid,
  Activity,
  Workflow,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  Radio,
  Brain as BrainIcon,
  Maximize2,
} from "lucide-react";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useWindowManager } from "./WindowManagerProvider";
import { useLayer } from "./LayerProvider";
import { useSettings, useActiveProfile } from "@/components/SettingsProvider";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useBrain } from "@/lib/hooks/useBrain";
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
  },
  {
    id: "focus",
    name: "Focus",
    icon: "focus",
    flow: "Deep Work",
    description: "Concentration maximale, réduction des bruits et minuterie pomodoro.",
    steps: ["Choisir", "Concentrer", "Terminer"],
    widgets: ["tasks", "calendar", "brain", "notes"],
  },
  {
    id: "studio",
    name: "Studio",
    icon: "sparkles",
    flow: "Création",
    description: "Espace créatif pour explorer, relier des idées et concevoir des projets.",
    steps: ["Explorer", "Relier", "Publier"],
    widgets: ["notes", "files", "brain", "calendar"],
  },
];

const STATUS_DOT: Record<string, string> = {
  connected: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
  loading: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
  empty: "bg-zinc-500",
  error: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
};

function SectionHeader({
  title,
  count,
  icon: IconComp,
}: {
  title: string;
  count?: number;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      {IconComp && <IconComp className="h-4 w-4 text-[var(--accent-primary)]" />}
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
        {title}
      </h3>
      {count !== undefined && (
        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-white/10 bg-white/5 px-1.5 text-[10px] font-bold text-[var(--text-muted)]">
          {count}
        </span>
      )}
    </div>
  );
}

export function MissionControl() {
  const { missionControl, setMissionControl } = useWindowManager();

  useEffect(() => {
    if (!missionControl) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "F2") {
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
  const { settings } = useSettings();
  const { activeProfile } = useActiveProfile();
  const { windows, setMissionControl, focusWindow, closeWindow, openWindow } = useWindowManager();
  const { records } = useLiveData();
  const brain = useBrain();
  const [query, setQuery] = useState("");
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-2xl"
    >
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex h-full max-h-[92vh] w-full max-w-7xl flex-col rounded-3xl border border-white/10 bg-[#080c14]/95 shadow-[0_25px_80px_rgba(0,0,0,0.85)] backdrop-blur-3xl overflow-hidden"
      >
        {/* Glow ambient background accents */}
        <div className="pointer-events-none absolute -top-32 left-1/4 h-80 w-80 rounded-full bg-[var(--accent-primary)]/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-sky-500/10 blur-[100px]" />

        {/* Top Header Row */}
        <div className="relative z-10 flex flex-col gap-4 border-b border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-primary)]">
                  {i18n("missionNavigationSystem", "Navigation Système")}
                </span>
                <span className="text-white/20">•</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)]">
                  <Sparkles className="h-3 w-3" />
                  {activeWorkspace.name} ({activeWorkspace.flow})
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Mission Control
              </h2>
            </div>

            {/* Quick Action Chips & Close Button */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/50 backdrop-blur-md">
                F2
              </span>
              <span className="hidden sm:inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/50 backdrop-blur-md">
                ESC
              </span>
              <button
                type="button"
                onClick={() => setMissionControl(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une fenêtre, un espace, un dashboard..."
              autoFocus
              className="w-full rounded-2xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-white/40 shadow-inner backdrop-blur-md focus:border-[var(--accent-primary)] focus:bg-black/60 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Scrollable Main Content Container */}
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto os-scroll p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            {/* Left Column: Spaces, Flows, Open Windows */}
            <div className="space-y-6">
              {/* Spaces Section */}
              <section>
                <SectionHeader title="Espaces de Travail" count={WORKSPACES.length} icon={Layers} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {WORKSPACES.map((w) => {
                    const isActive = w.id === activeWorkspace.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => navigateAndClose("/spaces")}
                        className={cn(
                          "group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer shadow-sm active:scale-98",
                          isActive
                            ? "border-[var(--accent-primary)]/70 bg-[var(--accent-primary)]/10 shadow-[0_0_20px_rgba(0,0,0,0.4)]"
                            : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl border shadow-xs transition-transform group-hover:scale-105",
                            isActive
                              ? "border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                              : "border-white/10 bg-white/5 text-white/70"
                          )}>
                            <Icon name={w.icon} className="h-5 w-5" />
                          </div>
                          {isActive && (
                            <span className="rounded-full border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                              Actif
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-white/40">
                            {w.flow}
                          </span>
                          <span className="block text-sm font-bold text-white mt-0.5">
                            {w.name}
                          </span>
                          <p className="mt-1 text-xs text-white/50 line-clamp-2 leading-relaxed">
                            {w.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Flows Section */}
              <section>
                <SectionHeader title="Workflows & Flows" count={WORKSPACES.length} icon={Workflow} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {WORKSPACES.map((w) => {
                    const isActive = w.id === activeWorkspace.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => navigateAndClose("/flows")}
                        className={cn(
                          "group flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer shadow-sm active:scale-98",
                          isActive
                            ? "border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                        )}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70">
                            <Icon name="workflow" className="h-4 w-4 text-[var(--accent-primary)]" />
                          </div>
                          <div>
                            <span className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                              {w.name}
                            </span>
                            <span className="block text-xs font-bold text-white">
                              {w.flow}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                          {w.steps.map((step, i) => (
                            <span
                              key={i}
                              className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-medium text-white/70"
                            >
                              {i + 1}. {step}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Open Windows (Exposé Grid) */}
              <section>
                <SectionHeader title="Fenêtres Ouvertes" count={windows.length} icon={Maximize2} />
                {windows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-white/40">
                    <LayoutGrid className="h-9 w-9 opacity-40 text-white/50" />
                    <div>
                      <p className="text-sm font-semibold text-white/60">Aucune fenêtre ouverte</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        Cliquez sur une application dans la liste de droite pour l&apos;ouvrir.
                      </p>
                    </div>
                  </div>
                ) : filteredWindows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/40">
                    <Search className="h-6 w-6 opacity-40" />
                    <p className="text-xs">Aucune fenêtre ne correspond à votre recherche.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredWindows.map((win) => (
                      <div key={win.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => {
                            focusWindow(win.id);
                            setMissionControl(false);
                          }}
                          className="flex aspect-video w-full flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition-all hover:border-[var(--accent-primary)]/60 hover:bg-white/[0.07] hover:scale-[1.02] active:scale-98 cursor-pointer shadow-lg backdrop-blur-md"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-6">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[var(--accent-primary)]">
                              <Icon name={routeIcon(win.route)} className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-white">{win.title}</p>
                              <p className="truncate text-[10px] text-white/40">{win.route}</p>
                            </div>
                          </div>

                          {/* Mini Window Content Mockup */}
                          <div className="h-14 w-full rounded-xl border border-white/5 bg-black/40 p-2 opacity-50 flex flex-col justify-around">
                            <div className="h-1.5 w-1/3 rounded bg-[var(--accent-primary)]/40" />
                            <div className="h-1.5 w-2/3 rounded bg-white/20" />
                            <div className="h-1.5 w-1/2 rounded bg-white/10" />
                          </div>
                        </button>

                        {/* Close Window Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeWindow(win.id);
                          }}
                          className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-black/70 text-white/60 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm"
                          title="Fermer la fenêtre"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Applications & Quick Launcher */}
            <div className="space-y-6">
              {/* Dashboards Launcher */}
              <section>
                <SectionHeader title="Dashboards & Apps" count={filteredRoutes.length} icon={LayoutGrid} />
                <div className="flex flex-col gap-1.5 max-h-[440px] overflow-y-auto os-scroll pr-1">
                  {filteredRoutes.map((r) => {
                    const isCurrent = pathname === r.route;
                    const label = i18n(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleOpenApp(r.route, label)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all duration-150 cursor-pointer shadow-xs active:scale-98",
                          isCurrent
                            ? "border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/10 text-white"
                            : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.06] text-white/70 hover:text-white"
                        )}
                      >
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                          isCurrent
                            ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                            : "border-white/10 bg-white/5 text-white/60 group-hover:text-white"
                        )}>
                          <Icon name={r.icon} className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold truncate">{label}</span>
                          <span className="block text-[10px] text-white/40 truncate">{r.route}</span>
                        </div>

                        {isCurrent ? (
                          <CheckCircle2 className="h-4 w-4 text-[var(--accent-primary)] shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Live Widgets Status */}
              <section>
                <SectionHeader title="Connecteurs Live" count={liveCards.length} icon={Radio} />
                <div className="grid grid-cols-1 gap-2">
                  {liveCards.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => navigateAndClose("/connections")}
                      className="group flex w-full items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-2 text-left hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer"
                    >
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[record.status] || "bg-zinc-500")} />
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-white truncate">
                          {record.title || record.label}
                        </span>
                        <span className="block text-[10px] text-white/40 truncate">
                          {record.subtitle || record.source}
                        </span>
                      </div>
                      <ExternalLink className="h-3 w-3 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default MissionControl;
