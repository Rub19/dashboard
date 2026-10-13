"use client";

import { memo, useMemo, useRef, useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  PanelLeftClose,
  Image as ImageIcon,
  ImageOff,
  Palette,
  User,
  Swords,
  Key,
  Target,
} from "@/components/icons/ph";
import { ethoneIcon } from "@/components/EthoneIcon";
import GameBrandIcon from "@/components/GameBrandIcon";
import { useSettings } from "@/components/SettingsProvider";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { cn } from "@/lib/utils";
import {
  AnimatedSidebar,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarHeader,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarRail,
  useAnimatedSidebar,
  useAnimatedSidebarPanel,
} from "@/components/motion/animated-sidebar";

const BrainIcon = ethoneIcon("brain");
const NotesIcon = ethoneIcon("notes");
const TasksIcon = ethoneIcon("tasks");
const ScratchpadIcon = ethoneIcon("focus");
const GamesIcon = ethoneIcon("games");
const HomeIcon = ethoneIcon("home");
const SettingsIcon = ethoneIcon("settings");

interface TrackerSidebarItem {
  id: string;
  label: string;
  href: string;
  renderIcon: (colored: boolean) => React.ReactNode;
  badge?: string;
}

interface TrackerSidebarGroup {
  id: string;
  label: string;
  items: TrackerSidebarItem[];
}

const TRACKER_GROUPS: TrackerSidebarGroup[] = [
  {
    id: "riot",
    label: "Riot Games",
    items: [
      {
        id: "riot-home",
        label: "Riot Tracker",
        href: "/tracker",
        renderIcon: (colored) => (
          <GameBrandIcon
            name="Valorant"
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-rose-500")}
          />
        ),
        badge: "Hub",
      },
      {
        id: "valorant",
        label: "VALORANT",
        href: "/matches?tab=valorant",
        renderIcon: (colored) => (
          <GameBrandIcon
            name="Valorant"
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-rose-500")}
          />
        ),
      },
      {
        id: "lol",
        label: "League of Legends",
        href: "/matches?tab=lol",
        renderIcon: (colored) => (
          <GameBrandIcon
            name="League of Legends"
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-amber-500")}
          />
        ),
      },
      {
        id: "tft",
        label: "Teamfight Tactics",
        href: "/matches?tab=tft",
        renderIcon: (colored) => (
          <GameBrandIcon
            name="Teamfight Tactics"
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-yellow-400")}
          />
        ),
      },
      {
        id: "matches",
        label: "Matchs Directs",
        href: "/matches",
        renderIcon: (colored) => (
          <Swords
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-red-500")}
            strokeWidth={1.9}
          />
        ),
      },
      {
        id: "inventory",
        label: "Inventaire Skins",
        href: "/matches/inventory",
        renderIcon: (colored) => (
          <Key
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-rose-400")}
            strokeWidth={1.9}
          />
        ),
      },
    ],
  },
  {
    id: "trackers",
    label: "Trackers & Jeux",
    items: [
      {
        id: "trackergg",
        label: "Tracker GG",
        href: "/matches?tab=trackergg",
        renderIcon: (colored) => (
          <Target
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-cyan-400")}
            strokeWidth={1.9}
          />
        ),
      },
      {
        id: "apex",
        label: "Apex Legends",
        href: "/matches?tab=apex",
        renderIcon: (colored) => (
          <GameBrandIcon
            name="Apex Legends"
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-red-400")}
          />
        ),
      },
      {
        id: "games",
        label: "Jeux",
        href: "/games",
        renderIcon: (colored) => (
          <GamesIcon
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-purple-400")}
            strokeWidth={1.9}
          />
        ),
      },
    ],
  },
  {
    id: "workspace",
    label: "Espace & IA",
    items: [
      {
        id: "brain",
        label: "Brain IA",
        href: "/brain",
        renderIcon: (colored) => (
          <BrainIcon
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-pink-400")}
            strokeWidth={1.9}
          />
        ),
      },
      {
        id: "notes",
        label: "Notes",
        href: "/notes",
        renderIcon: (colored) => (
          <NotesIcon
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-amber-300")}
            strokeWidth={1.9}
          />
        ),
      },
      {
        id: "tasks",
        label: "Tâches",
        href: "/tasks",
        renderIcon: (colored) => (
          <TasksIcon
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-emerald-400")}
            strokeWidth={1.9}
          />
        ),
      },
      {
        id: "scratchpad",
        label: "Scratchpad",
        href: "/scratchpad",
        renderIcon: (colored) => (
          <ScratchpadIcon
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-orange-400")}
            strokeWidth={1.9}
          />
        ),
      },
    ],
  },
  {
    id: "system",
    label: "Système",
    items: [
      {
        id: "home",
        label: "ETHONE OS",
        href: "/",
        renderIcon: (colored) => (
          <HomeIcon
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-sky-400")}
            strokeWidth={1.9}
          />
        ),
      },
      {
        id: "settings",
        label: "Paramètres",
        href: "/settings",
        renderIcon: (colored) => (
          <SettingsIcon
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-slate-300")}
            strokeWidth={1.9}
          />
        ),
      },
    ],
  },
];

const TrackerSidebarBrand = memo(function TrackerSidebarBrand() {
  const { collapsed } = useAnimatedSidebarPanel();
  return (
    <Link
      href="/tracker"
      className={cn(
        "flex h-10 items-center gap-2.5 text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] transition-transform active:scale-95",
        collapsed && "justify-center"
      )}
      aria-label="RIOT TRACKER"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-md">
        <GameBrandIcon name="Valorant" className="h-4.5 w-4.5" />
      </div>
      <motion.div
        initial={false}
        animate={{
          opacity: collapsed ? 0 : 1,
          x: collapsed ? -6 : 0,
        }}
        transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
        className={cn(
          "flex flex-col min-w-0 leading-none",
          collapsed && "hidden"
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black tracking-wider text-[var(--text-primary)] uppercase">
            #RIOT TRACKER
          </span>
          <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.2 text-[8px] font-bold text-rose-300">
            LIVE
          </span>
        </div>
        <span className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
          ETHONE GAMING
        </span>
      </motion.div>
    </Link>
  );
});

const TrackerSidebarProfile = memo(function TrackerSidebarProfile({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const { displayName } = useUserIdentity();
  const [riotName, setRiotName] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ethone:tracker:riot_name");
      if (stored) setRiotName(stored);
    }
  }, []);

  const label = riotName || displayName || "Joueur";

  return (
    <button
      type="button"
      onClick={() => router.push("/tracker")}
      className={cn(
        "group mb-1 flex w-full items-center gap-2.5 rounded-xl border border-transparent transition-colors hover:bg-[var(--menu-hover)] cursor-pointer",
        collapsed ? "justify-center p-1.5" : "p-2"
      )}
      title={`Profil Tracker : ${label}`}
      aria-label={`Profil Tracker : ${label}`}
    >
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--inset-radius)] border border-rose-500/30 bg-rose-500/15 text-rose-400 font-bold text-xs",
          collapsed ? "h-9 w-9" : "h-8 w-8"
        )}
      >
        <User className="h-4 w-4" />
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--background)] bg-emerald-400" aria-hidden="true" />
      </div>
      <motion.div
        initial={false}
        animate={{
          opacity: collapsed ? 0 : 1,
          x: collapsed ? -6 : 0,
        }}
        transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
        className={cn(
          "min-w-0 flex-1 truncate text-[11px] font-semibold text-[var(--text-primary)] group-hover:text-rose-400 transition-colors text-left whitespace-nowrap",
          collapsed && "hidden"
        )}
      >
        <div className="truncate font-bold">{label}</div>
        <div className="text-[9px] font-mono text-[var(--text-muted)] truncate">Riot Games · Connecté</div>
      </motion.div>
    </button>
  );
});

const TrackerSidebarFooter = memo(function TrackerSidebarFooter() {
  const { setOpen } = useAnimatedSidebar();
  const { collapsed } = useAnimatedSidebarPanel();
  const { settings, update } = useSettings();

  return (
    <div className="flex flex-col gap-3">
      <TrackerSidebarProfile collapsed={collapsed} />

      <div
        className={cn(
          "flex gap-2",
          collapsed ? "flex-col items-center justify-center" : "flex-row items-center justify-between"
        )}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => update({ sidebarIcons: !settings.sidebarIcons })}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--inset-radius)] border-transparent bg-transparent text-[var(--text-muted)] transition-colors hover:border-[var(--panel-border)] hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] cursor-pointer"
            aria-label={settings.sidebarIcons ? "Masquer les icônes" : "Afficher les icônes"}
            title={settings.sidebarIcons ? "Masquer les icônes" : "Afficher les icônes"}
          >
            {settings.sidebarIcons ? (
              <ImageIcon className="h-4 w-4" strokeWidth={1.85} />
            ) : (
              <ImageOff className="h-4 w-4" strokeWidth={1.85} />
            )}
          </button>

          {settings.sidebarIcons && (
            <button
              type="button"
              onClick={() => update({ sidebarColoredIcons: !settings.sidebarColoredIcons })}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--inset-radius)] border-transparent bg-transparent transition-colors hover:border-[var(--panel-border)] hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] cursor-pointer",
                settings.sidebarColoredIcons ? "text-rose-400" : "text-[var(--text-muted)]"
              )}
              aria-pressed={settings.sidebarColoredIcons}
              aria-label={settings.sidebarColoredIcons ? "Icônes monochromes" : "Icônes en couleur"}
              title={settings.sidebarColoredIcons ? "Icônes monochromes" : "Icônes en couleur"}
            >
              <Palette className="h-4 w-4" strokeWidth={1.85} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--inset-radius)] border-transparent bg-transparent text-[var(--text-muted)] transition-colors hover:border-[var(--panel-border)] hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] cursor-pointer"
          aria-label="Réduire la barre latérale"
          title="Réduire la barre latérale"
        >
          <PanelLeftClose className="h-4 w-4" strokeWidth={1.85} />
        </button>
      </div>
    </div>
  );
});

export default function TrackerSidebar() {
  const router = useRouter();
  const pathname = usePathname() ?? "/tracker";
  const { setOpen } = useAnimatedSidebar();
  const { collapsed } = useAnimatedSidebarPanel();
  const { settings } = useSettings();

  const [currentSearch, setCurrentSearch] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentSearch(window.location.search);
      const onPopState = () => setCurrentSearch(window.location.search);
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    }
  }, [pathname]);

  const currentTab = useMemo(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(currentSearch);
      return sp.get("tab") || sp.get("game");
    }
    return null;
  }, [currentSearch]);

  const isItemActive = useCallback(
    (item: TrackerSidebarItem) => {
      if (item.id === "riot-home") {
        return pathname === "/tracker" && !currentTab;
      }
      if (item.id === "valorant") {
        return (pathname === "/matches" || pathname === "/tracker") && currentTab === "valorant";
      }
      if (item.id === "lol") {
        return (pathname === "/matches" || pathname === "/tracker") && currentTab === "lol";
      }
      if (item.id === "tft") {
        return (pathname === "/matches" || pathname === "/tracker") && currentTab === "tft";
      }
      if (item.id === "matches") {
        return pathname === "/matches" && !currentTab;
      }
      if (item.id === "inventory") {
        return pathname === "/matches/inventory";
      }
      if (item.id === "trackergg") {
        return pathname === "/matches" && currentTab === "trackergg";
      }
      if (item.id === "apex") {
        return pathname === "/matches" && currentTab === "apex";
      }
      if (item.id === "games") {
        return pathname === "/games" || pathname.startsWith("/games/");
      }
      if (item.id === "brain") {
        return pathname === "/brain" || pathname.startsWith("/brain/");
      }
      if (item.id === "notes") {
        return pathname === "/notes" || pathname.startsWith("/notes/");
      }
      if (item.id === "tasks") {
        return pathname === "/tasks" || pathname.startsWith("/tasks/");
      }
      if (item.id === "scratchpad") {
        return pathname === "/scratchpad" || pathname.startsWith("/scratchpad/");
      }
      if (item.id === "home") {
        return pathname === "/";
      }
      if (item.id === "settings") {
        return pathname === "/settings" || pathname.startsWith("/settings/");
      }
      return false;
    },
    [pathname, currentTab]
  );

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerEnter = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setOpen(true);
    }, 120);
  }, [setOpen]);

  const handlePointerLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, 180);
  }, [setOpen]);

  const showIcons = settings.sidebarIcons || collapsed;

  return (
    <div
      className="relative z-[var(--z-sidebar)] hidden h-full min-h-0 w-auto shrink-0 pointer-events-auto md:block will-change-transform"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <AnimatedSidebar
        collapsible="icon"
        variant="sidebar"
        ariaLabel="Navigation Tracker"
        className="h-full bg-transparent"
        panelClassName="h-full shrink-0 rounded-r-[var(--panel-radius)] border-r border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 pb-8 backdrop-blur-[var(--panel-blur)] pt-[calc(0.75rem+env(safe-area-inset-top))]"
      >
        <AnimatedSidebarHeader>
          <TrackerSidebarBrand />
        </AnimatedSidebarHeader>

        <AnimatedSidebarContent>
          <div className="flex flex-col">
            {TRACKER_GROUPS.map((group, groupIndex) => (
              <div key={group.id}>
                {groupIndex > 0 && (
                  collapsed ? (
                    <div className="ethone-nav-divider" />
                  ) : (
                    <p className="ethone-nav-label">{group.label}</p>
                  )
                )}
                <AnimatedSidebarMenu>
                  {group.items.map((item) => (
                    <AnimatedSidebarMenuItem key={item.id} className="group/item">
                      <AnimatedSidebarMenuButton
                        isActive={isItemActive(item)}
                        icon={showIcons ? item.renderIcon(settings.sidebarColoredIcons) : undefined}
                        badge={item.badge}
                        onSelect={() => {
                          router.push(item.href);
                          if (typeof window !== "undefined") {
                            setTimeout(() => {
                              setCurrentSearch(window.location.search);
                            }, 50);
                          }
                        }}
                      >
                        {item.label}
                      </AnimatedSidebarMenuButton>
                    </AnimatedSidebarMenuItem>
                  ))}
                </AnimatedSidebarMenu>
              </div>
            ))}
          </div>
        </AnimatedSidebarContent>

        <AnimatedSidebarFooter className="mb-3 border-t border-[var(--panel-border)] pt-3">
          <TrackerSidebarFooter />
        </AnimatedSidebarFooter>

        <AnimatedSidebarRail />
      </AnimatedSidebar>
    </div>
  );
}
