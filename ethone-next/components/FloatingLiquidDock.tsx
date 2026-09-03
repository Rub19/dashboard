"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import BrandMark from "@/components/BrandMark";
import { NAVIGATION_ITEMS, isActiveRoute } from "@/lib/navigation";
import { hapticLightImpact, hapticMediumImpact } from "@/lib/haptics";
import { useAnimatedSidebar } from "@/components/motion/animated-sidebar";
import {
  MoreHorizontal,
  Search,
  Sparkles,
  Timer,
  Folder,
  Activity,
  Home,
  Brain,
  SlidersHorizontal,
  X,
  ChevronRight,
  Palette,
  CheckCircle2,
  Calendar,
  FileText,
  Mail,
  Blocks,
  Plug,
  Layers,
  CloudSun,
  Users,
  Settings,
  User,
} from "lucide-react";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useFocus } from "@/components/FocusProvider";
import { useSettings } from "@/components/SettingsProvider";
import { PREMIUM_THEMES, resolvePremiumTheme } from "@/lib/theme-engine";
import { cn } from "@/lib/utils";

const VISIBLE_MOBILE_IDS = ["home", "brain", "focus", "activity", "files"];

const APP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  brain: Brain,
  focus: Timer,
  activity: Activity,
  files: Folder,
  notes: FileText,
  tasks: CheckCircle2,
  calendar: Calendar,
  mail: Mail,
  plugins: Blocks,
  connections: Plug,
  spaces: Layers,
  flows: Sparkles,
  weather: CloudSun,
  team: Users,
  settings: Settings,
  profile: User,
};

export default function FloatingLiquidDock() {
  const pathname = usePathname() ?? "/";
  const i18n = useI18n();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pressedId, setPressedId] = useState<string | null>(null);
  const { setOpen: setCommandOpen } = useCommandPalette();
  const focus = useFocus();
  const { settings, update: updateSettings } = useSettings();

  let animatedSidebar: ReturnType<typeof useAnimatedSidebar> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    animatedSidebar = useAnimatedSidebar();
  } catch {}

  const isMenuOpen = sheetOpen || Boolean(animatedSidebar?.openMobile);

  useEffect(() => {
    function onCloseDrawer() {
      setSheetOpen(false);
      animatedSidebar?.setOpenMobile(false);
    }
    window.addEventListener("v8:request-close-drawer", onCloseDrawer);
    return () => window.removeEventListener("v8:request-close-drawer", onCloseDrawer);
  }, [animatedSidebar]);

  const allItems = useMemo(
    () =>
      NAVIGATION_ITEMS.map((item) => ({
        ...item,
        label: i18n(item.label) || item.label,
      })),
    [i18n]
  );

  const visibleItems = useMemo(
    () =>
      VISIBLE_MOBILE_IDS.map((id) =>
        allItems.find((item) => item.id === id)
      ).filter(Boolean) as typeof allItems,
    [allItems]
  );

  const moreItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allItems
      .filter((item) => !VISIBLE_MOBILE_IDS.includes(item.id))
      .filter((item) => {
        if (!q) return true;
        return (
          item.label.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
        );
      });
  }, [allItems, searchQuery]);

  const onTabPress = useCallback(
    async (id: string) => {
      setPressedId(id);
      await hapticLightImpact();
      setTimeout(() => setPressedId(null), 120);
    },
    []
  );

  const onMenuPress = useCallback(async () => {
    await hapticMediumImpact();
    setSheetOpen(true);
  }, []);

  function handleSheetDragEnd(_event: unknown, info: PanInfo) {
    if (info.offset.y > 100 || info.velocity.y > 600) {
      setSheetOpen(false);
    }
  }

  const handleNextTheme = () => {
    const resolved = resolvePremiumTheme(settings.theme);
    const currentIndex = PREMIUM_THEMES.indexOf(resolved);
    const next = PREMIUM_THEMES[(currentIndex + 1) % PREMIUM_THEMES.length];
    updateSettings({ theme: next });
    hapticLightImpact();
  };

  return (
    <>
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav
        data-zen-hidden
        data-liquid-dock
        aria-label="Navigation principale mobile"
        className={cn(
          "fixed bottom-3 left-1/2 z-[var(--z-dock)] flex h-[62px] w-[94%] max-w-[420px] -translate-x-1/2 flex-row items-center justify-around rounded-2xl border border-[var(--panel-border)]/80 bg-[#0a0c12]/90 px-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-2xl md:hidden transition-all duration-200 select-none pb-[env(safe-area-inset-bottom)]",
          isMenuOpen
            ? "opacity-0 pointer-events-none translate-y-8"
            : "opacity-100 translate-y-0"
        )}
      >
        {visibleItems.map((item) => {
          const isActive = isActiveRoute(pathname, item.href);
          const IconComp = APP_ICONS[item.id] || Icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              onPointerDown={() => onTabPress(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex h-[48px] min-w-[50px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium touch-manipulation transition-colors",
                isActive
                  ? "text-[var(--accent-primary)] font-bold"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="liquidDockActivePill"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 35,
                  }}
                  className="absolute inset-0 -z-10 rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_rgba(var(--accent-rgb),0.25)]"
                />
              )}
              <IconComp className={cn("h-5 w-5", isActive ? "stroke-[2.4]" : "stroke-[1.8]")} />
              <span className="max-w-[3.8rem] truncate leading-tight">
                {item.label}
              </span>
              {pressedId === item.id && (
                <motion.span
                  initial={{ opacity: 0.4, scale: 0.8 }}
                  animate={{ opacity: 0, scale: 1.3 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 rounded-xl bg-[var(--accent-primary)]/20"
                />
              )}
            </Link>
          );
        })}

        {/* MORE / PLUS MENU BUTTON */}
        <button
          type="button"
          onClick={onMenuPress}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-label="Plus d'applications"
          className={cn(
            "relative flex h-[48px] min-w-[50px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium text-zinc-400 hover:text-white touch-manipulation transition-colors",
            sheetOpen ? "text-[var(--accent-primary)] font-bold" : ""
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="max-w-[3.8rem] truncate leading-tight">Plus</span>
        </button>
      </nav>

      {/* MOBILE "MORE" BOTTOM SHEET */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md md:hidden"
              onClick={() => setSheetOpen(false)}
              aria-hidden="true"
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.6 }}
              onDragEnd={handleSheetDragEnd}
              className="fixed bottom-0 inset-x-0 z-[101] flex max-h-[88dvh] flex-col rounded-t-[28px] border-t border-[var(--panel-border)] bg-[#0b0d14] shadow-2xl md:hidden overflow-hidden pb-[calc(env(safe-area-inset-bottom)+1rem)]"
              role="dialog"
              aria-modal="true"
              aria-label="Menu des applications ETHONE"
            >
              {/* Drag Pill Handle */}
              <div className="flex w-full items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                <div className="h-1.5 w-12 rounded-full bg-zinc-700/80" />
              </div>

              {/* Sheet Header */}
              <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-zinc-800/60">
                <div className="flex items-center gap-2.5">
                  <BrandMark size={24} />
                  <span className="text-sm font-bold tracking-tight text-white">
                    Toutes les Applications
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-1.5 text-zinc-400 hover:text-white"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Quick Search */}
              <div className="px-5 pt-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher une application, un outil..."
                    className="w-full rounded-xl border border-zinc-800 bg-black/60 pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              </div>

              {/* Apps Grid */}
              <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-none space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {moreItems.map((item) => {
                    const isActive = isActiveRoute(pathname, item.href);
                    const IconComp = APP_ICONS[item.id] || Icon;

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 text-center transition-all touch-manipulation active:scale-95",
                          isActive
                            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]"
                            : "border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/60"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl",
                            isActive
                              ? "bg-[var(--accent-primary)] text-black"
                              : "bg-zinc-800 text-zinc-300"
                          )}
                        >
                          <IconComp className="h-5 w-5" />
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-200 truncate w-full">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                {/* Quick System Actions Bar */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">
                    Actions Rapides
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSheetOpen(false);
                        setCommandOpen(true);
                      }}
                      className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-left text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                    >
                      <Search className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="truncate">Spotlight (Recherche)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSheetOpen(false);
                        if (focus.state.phase === "idle") focus.start("pomodoro");
                        else focus.stop();
                      }}
                      className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-left text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                    >
                      <Timer className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="truncate">
                        {focus.state.phase === "idle" ? "Lancer Focus" : "Arrêter Focus"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextTheme}
                      className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-left text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                    >
                      <Palette className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span className="truncate">Changer Thème</span>
                    </button>

                    <Link
                      href="/settings"
                      onClick={() => setSheetOpen(false)}
                      className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-left text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                    >
                      <SlidersHorizontal className="h-4 w-4 text-purple-400 shrink-0" />
                      <span className="truncate">Paramètres OS</span>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

