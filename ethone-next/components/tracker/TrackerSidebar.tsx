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
  Trophy,
  Gamepad2,
} from "@/components/icons/ph";
import BrandMark from "@/components/BrandMark";
import GameBrandIcon from "@/components/GameBrandIcon";
import { useSettings } from "@/components/SettingsProvider";
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

function getTrackerGroups(isEn: boolean): TrackerSidebarGroup[] {
  return [
    {
      id: "riot",
      label: "Riot Games",
      items: [
        {
          id: "riot-home",
          label: "Hub",
          href: "/tracker",
          renderIcon: (colored) => (
            <Gamepad2
              className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-rose-400")}
            />
          ),
        },
        {
          id: "live",
          label: isEn ? "Live Match" : "Partie en direct",
          href: "/tracker?tab=live",
          renderIcon: (colored) => (
            <Flame
              className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-rose-400")}
            />
          ),
          badge: "WIP",
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
          id: "vct",
          label: "VCT & Pick'ems",
          href: "/tracker?tab=vct",
          renderIcon: (colored) => (
            <Trophy
              className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-amber-400")}
            />
          ),
          badge: "Live",
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
              className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-purple-400")}
            />
          ),
        },
      ],
    },
    {
      id: "coaching",
      label: isEn ? "Coaching & AI" : "Coaching & IA",
      items: [
        {
          id: "coach",
          label: isEn ? "Tactical AI Coach" : "Coach IA Tactique",
          href: "/tracker?tab=coach",
          renderIcon: (colored) => (
            <Brain
              className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-purple-400")}
            />
          ),
          badge: isEn ? "AI" : "IA",
        },
        {
          id: "telemetry",
          label: isEn ? "Combat Telemetry" : "Télémétrie de Combat",
          href: "/tracker?tab=telemetry",
          renderIcon: (colored) => (
            <Target
              className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-cyan-400")}
            />
          ),
        },
        {
          id: "training",
          label: isEn ? "Training Plan" : "Plan d'Entraînement",
          href: "/tracker?tab=training",
          renderIcon: (colored) => (
            <Activity
              className={cn("h-[20px] w-[20px] transition-transform duration-200 group-hover:scale-110", colored && "text-emerald-400")}
            />
          ),
        },
      ],
    },
  ];
}

const TrackerSidebarBrand = memo(function TrackerSidebarBrand() {
  const { collapsed } = useAnimatedSidebarPanel();
  return (
    <Link
      href="/tracker"
      className={cn(
        "flex h-10 items-center gap-2.5 text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] transition-transform active:scale-95",
        collapsed && "justify-center"
      )}
      aria-label="ETHONE COACH"
    >
      <BrandMark size={32} className="shrink-0 drop-shadow-md" />
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
            ETHONE COACH
          </span>
        </div>
        <span className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
          VALORANT & LOL
        </span>
      </motion.div>
    </Link>
  );
});

const TrackerSidebarProfile = memo(function TrackerSidebarProfile({
  collapsed,
  isEn = true,
}: {
  collapsed: boolean;
  isEn?: boolean;
}) {
  const router = useRouter();
  const [riotName, setRiotName] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ethone:tracker:riot_name");
      if (stored && stored !== "Rub19") setRiotName(stored);
    }
  }, []);

  const label = riotName || (isEn ? "Tracker Profile" : "Profil Tracker");

  return (
    <button
      type="button"
      onClick={() => router.push("/tracker")}
      className={cn(
        "group mb-1 flex w-full items-center gap-2.5 rounded-xl border border-transparent transition-colors hover:bg-[var(--menu-hover)] cursor-pointer",
        collapsed ? "justify-center p-1.5" : "p-2"
      )}
      title={`${isEn ? "Tracker Profile" : "Profil Tracker"} : ${label}`}
      aria-label={`${isEn ? "Tracker Profile" : "Profil Tracker"} : ${label}`}
    >
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--inset-radius)] border border-rose-500/30 bg-rose-500/15 text-rose-400 font-bold text-xs",
          collapsed ? "h-9 w-9" : "h-8 w-8"
        )}
      >
        <User className="h-4 w-4" />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--background)]",
            riotName ? "bg-emerald-400" : "bg-neutral-500"
          )}
          aria-hidden="true"
        />
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
        <div className="truncate font-bold">{riotName || (isEn ? "No profile" : "Aucun profil")}</div>
        <div className="text-[9px] font-mono text-[var(--text-muted)] truncate">
          {riotName ? (isEn ? "Riot Games · Connected" : "Riot Games · Connecté") : (isEn ? "Not connected" : "Non connecté")}
        </div>
      </motion.div>
    </button>
  );
});

const TrackerSidebarFooter = memo(function TrackerSidebarFooter({ isEn = true }: { isEn?: boolean }) {
  const { setOpen } = useAnimatedSidebar();
  const { collapsed } = useAnimatedSidebarPanel();
  const { settings, update } = useSettings();

  return (
    <div className="flex flex-col gap-3">
      <TrackerSidebarProfile collapsed={collapsed} isEn={isEn} />

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
  isEn = true,
}: {
  currentTab: string | null;
  pathname: string;
  onSelect: (href: string) => void;
  isEn?: boolean;
}) {
  const { collapsed } = useAnimatedSidebarPanel();
  const { settings } = useSettings();
  const showIcons = settings.sidebarIcons || collapsed;
  const groups = useMemo(() => getTrackerGroups(isEn), [isEn]);

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
      return false;
    },
    [pathname, currentTab]
  );

  return (
    <div className="flex flex-col">
      {groups.map((group, groupIndex) => (
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

  const [trackerLang, setTrackerLang] = useState<"en" | "fr">(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("ethone:tracker:language");
        if (stored === "fr" || stored === "en") return stored;
      } catch {}
    }
    return "en";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onLangChange = (e: Event) => {
      const customEvt = e as CustomEvent<{ lang?: "en" | "fr" }>;
      if (customEvt.detail?.lang) {
        setTrackerLang(customEvt.detail.lang);
      }
    };
    window.addEventListener("ethone:tracker:lang-change", onLangChange);
    return () => window.removeEventListener("ethone:tracker:lang-change", onLangChange);
  }, []);

  const isEn = trackerLang === "en";

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
            isEn={isEn}
          />
        </AnimatedSidebarContent>

        <AnimatedSidebarFooter className="mb-3 border-t border-[var(--panel-border)] pt-3">
          <TrackerSidebarFooter isEn={isEn} />
        </AnimatedSidebarFooter>

        <AnimatedSidebarRail />
      </AnimatedSidebar>
    </div>
  );
}
