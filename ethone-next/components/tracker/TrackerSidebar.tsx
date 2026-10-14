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
  Target,
  Brain,
  Activity,
  Flame,
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
        label: "Hub Riot Games",
        href: "/tracker",
        renderIcon: (colored) => (
          <GameBrandIcon
            name="Valorant"
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-rose-500")}
          />
        ),
        badge: "Live",
      },
      {
        id: "live",
        label: "Partie en direct",
        href: "/tracker?tab=live",
        renderIcon: (colored) => (
          <Flame
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-rose-400")}
          />
        ),
        badge: "Bêta",
      },
      {
        id: "valorant",
        label: "VALORANT",
        href: "/tracker?tab=valorant",
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
        href: "/tracker?tab=lol",
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
        href: "/tracker?tab=tft",
        renderIcon: (colored) => (
          <GameBrandIcon
            name="Teamfight Tactics"
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-yellow-400")}
          />
        ),
      },
    ],
  },
  {
    id: "coaching",
    label: "Coaching & IA",
    items: [
      {
        id: "coach",
        label: "Coach IA Tactique",
        href: "/tracker?tab=coach",
        renderIcon: (colored) => (
          <Brain
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-purple-400")}
          />
        ),
        badge: "IA",
      },
      {
        id: "telemetry",
        label: "Télémétrie de Combat",
        href: "/tracker?tab=telemetry",
        renderIcon: (colored) => (
          <Target
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-cyan-400")}
          />
        ),
      },
      {
        id: "training",
        label: "Plan d'Entraînement",
        href: "/tracker?tab=training",
        renderIcon: (colored) => (
          <Activity
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-emerald-400")}
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
        id: "settings",
        label: "Paramètres",
        href: "/settings",
        renderIcon: (colored) => (
          <SettingsIcon
            className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-slate-300")}
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
      aria-label="RIOT TRACKER & COACH"
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
            #RIOT COACH
          </span>
          <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.2 text-[8px] font-bold text-rose-300">
            LIVE
          </span>
        </div>
        <span className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
          VALORANT & LOL
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
              <ImageIcon className="h-4 w-4" />
            ) : (
              <ImageOff className="h-4 w-4" />
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
              <Palette className="h-4 w-4" />
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
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

const TrackerSidebarNavList = memo(function TrackerSidebarNavList({
  currentTab,
  pathname,
  onSelect,
}: {
  currentTab: string | null;
  pathname: string;
  onSelect: (href: string) => void;
}) {
  const { collapsed } = useAnimatedSidebarPanel();
  const { settings } = useSettings();
  const showIcons = settings.sidebarIcons || collapsed;

  const isItemActive = useCallback(
    (item: TrackerSidebarItem) => {
      if (item.id === "riot-home") {
        return pathname === "/tracker" && (!currentTab || currentTab === "home");
      }
      if (item.id === "live") {
        return pathname === "/tracker" && currentTab === "live";
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
      if (item.id === "coach") {
        return pathname === "/tracker" && currentTab === "coach";
      }
      if (item.id === "telemetry") {
        return pathname === "/tracker" && currentTab === "telemetry";
      }
      if (item.id === "training") {
        return pathname === "/tracker" && currentTab === "training";
      }
      if (item.id === "settings") {
        return pathname === "/settings" || pathname.startsWith("/settings/");
      }
      return false;
    },
    [pathname, currentTab]
  );

  return (
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
                  onSelect={() => onSelect(item.href)}
                >
                  {item.label}
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
            ))}
          </AnimatedSidebarMenu>
        </div>
      ))}
    </div>
  );
});

export default function TrackerSidebar() {
  const router = useRouter();
  const pathname = usePathname() ?? "/tracker";
  const { setOpen } = useAnimatedSidebar();

  const [currentSearch, setCurrentSearch] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentSearch(window.location.search);
      const onPopState = () => setCurrentSearch(window.location.search);
      const onTabChange = (e: Event) => {
        const customEvt = e as CustomEvent<{ tab?: string }>;
        if (customEvt.detail?.tab) {
          setCurrentSearch(`?tab=${customEvt.detail.tab}`);
        } else {
          setCurrentSearch(window.location.search);
        }
      };
      window.addEventListener("popstate", onPopState);
      window.addEventListener("ethone:tracker:tab-change", onTabChange);
      return () => {
        window.removeEventListener("popstate", onPopState);
        window.removeEventListener("ethone:tracker:tab-change", onTabChange);
      };
    }
  }, [pathname]);

  const currentTab = useMemo(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(currentSearch);
      return sp.get("tab") || sp.get("game");
    }
    return null;
  }, [currentSearch]);

  const handleSelect = useCallback(
    (href: string) => {
      router.push(href);
      if (typeof window !== "undefined") {
        try {
          const url = new URL(href, window.location.origin);
          const tab = url.searchParams.get("tab") || url.searchParams.get("game");
          if (tab) {
            window.dispatchEvent(new CustomEvent("ethone:tracker:tab-change", { detail: { tab } }));
            setCurrentSearch(`?tab=${tab}`);
          } else {
            window.dispatchEvent(new CustomEvent("ethone:tracker:tab-change", { detail: { tab: "valorant" } }));
            setCurrentSearch("");
          }
        } catch {
          setCurrentSearch(window.location.search);
        }
        setTimeout(() => {
          setCurrentSearch(window.location.search);
        }, 50);
      }
    },
    [router]
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
          <TrackerSidebarNavList
            currentTab={currentTab}
            pathname={pathname}
            onSelect={handleSelect}
          />
        </AnimatedSidebarContent>

        <AnimatedSidebarFooter className="mb-3 border-t border-[var(--panel-border)] pt-3">
          <TrackerSidebarFooter />
        </AnimatedSidebarFooter>

        <AnimatedSidebarRail />
      </AnimatedSidebar>
    </div>
  );
}
