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

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const VISIBLE_MOBILE_IDS = ["home", "notes", "tasks", "calendar"];

export default function FloatingLiquidDock() {
  const pathname = usePathname() ?? "/";
  const i18n = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pressedId, setPressedId] = useState<string | null>(null);

  useEffect(() => {
    function onCloseDrawer() {
      setDrawerOpen(false);
    }
    window.addEventListener("v8:request-close-drawer", onCloseDrawer);
    return () => window.removeEventListener("v8:request-close-drawer", onCloseDrawer);
  }, []);

  const allItems = useMemo(
    () => NAVIGATION_ITEMS.map((item) => ({ ...item, label: i18n(item.label) })),
    [i18n]
  );
  const visibleItems = useMemo(
    () => allItems.filter((item) => VISIBLE_MOBILE_IDS.includes(item.id)),
    [allItems]
  );

  const onTabPress = useCallback(
    async (id: string) => {
      setPressedId(id);
      await hapticLightImpact();
      setTimeout(() => setPressedId(null), 120);
    },
    []
  );

  const onMenuPress = useCallback(async () => {
    setDrawerOpen(true);
    await hapticMediumImpact();
  }, []);

  function handleDrawerDragEnd(_event: unknown, info: PanInfo) {
    const threshold = 80;
    const velocity = 500;
    if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      setDrawerOpen(false);
    }
  }

  return (
    <>
      <nav
        data-zen-hidden
        data-liquid-dock
        className="fixed bottom-5 left-1/2 z-[var(--z-dock)] flex h-[64px] w-[92%] max-w-[390px] -translate-x-1/2 flex-row items-center justify-around rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]/80 pb-[env(safe-area-inset-bottom)] px-2 shadow-2xl backdrop-blur-2xl md:hidden"
      >
        {visibleItems.map((item) => {
          const isActive = isActiveRoute(pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              onPointerDown={() => onTabPress(item.id)}
              aria-current={isActive ? "page" : undefined}
              className="relative flex h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-medium touch-manipulation"
            >
              {isActive && (
                <motion.div
                  layoutId="liquidDockPill"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 32,
                    mass: 0.8,
                  }}
                  className="absolute inset-0 -z-10 rounded-2xl bg-[var(--accent-primary)]/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]"
                />
              )}
              <Icon
                name={item.icon}
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive
                    ? "text-[var(--accent-primary)]"
                    : "text-[var(--text-muted)]"
                )}
              />
              <span
                className={cn(
                  "max-w-[3.5rem] truncate",
                  isActive
                    ? "text-[var(--accent-primary)]"
                    : "text-[var(--text-muted)]"
                )}
              >
                {item.label}
              </span>
              {pressedId === item.id && (
                <motion.span
                  initial={{ opacity: 0.35, scale: 0.8 }}
                  animate={{ opacity: 0, scale: 1.4 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 rounded-2xl bg-[var(--accent-primary)]/20"
                />
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMenuPress}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          className="relative flex h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-medium text-[var(--text-muted)] transition-colors touch-manipulation"
        >
          <Icon name="menu" className="h-5 w-5" />
          <span className="max-w-[3.5rem] truncate">{i18n("menu")}</span>
        </button>
      </nav>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[60] bg-[var(--panel-bg)]/60 backdrop-blur-sm md:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: "easeOut" as const }}
              drag="x"
              dragConstraints={{ left: -340, right: 0 }}
              dragElastic={0.05}
              onDragEnd={handleDrawerDragEnd}
              className="fixed left-0 top-0 z-[60] h-dvh w-[min(85vw,320px)] overflow-y-auto overscroll-contain border-r border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-2xl no-scrollbar md:hidden backdrop-blur-[var(--panel-blur)]"
              role="dialog"
              aria-label={i18n("navigation")}
            >
              <div className="mb-6 flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <BrandMark size={28} />
                  <span className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                    ETHONE
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={i18n("close")}
                  className="flex h-10 w-10 items-center justify-center rounded-[var(--panel-radius)] text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-1 pb-6">
                {allItems.map((item) => {
                  const isActive = isActiveRoute(pathname, item.href);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-[var(--panel-radius)] px-3 py-3.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "text-[var(--text-primary)] hover:bg-[var(--panel-bg)]"
                      )}
                    >
                      <Icon name={item.icon} className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
