"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import BrandMark from "@/components/BrandMark";
import { NAVIGATION_ITEMS, isActiveRoute } from "@/lib/navigation";
import { hapticLightImpact, hapticMediumImpact } from "@/lib/haptics";

const VISIBLE_MOBILE_IDS = ["home", "notes", "tasks", "calendar"];

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default function MobileNav() {
  const pathname = usePathname();
  const i18n = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    function onCloseDrawer() {
      setDrawerOpen(false);
    }
    window.addEventListener("v8:request-close-drawer", onCloseDrawer);
    return () => window.removeEventListener("v8:request-close-drawer", onCloseDrawer);
  }, []);

  const items = NAVIGATION_ITEMS.map((item) => ({ ...item, label: i18n(item.label) }));
  const visibleItems = items.filter((item) => VISIBLE_MOBILE_IDS.includes(item.id));

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
        className={cn(
          "liquid-glass fixed bottom-4 left-1/2 z-50 mb-[env(safe-area-inset-bottom)] h-[64px] w-[92%] max-w-[380px] -translate-x-1/2 rounded-[28px] px-2 py-2 transition-transform md:hidden",
          drawerOpen ? "translate-y-[calc(100%+2rem)]" : "translate-y-0"
        )}
      >
        <div className="flex h-full w-full items-center justify-around gap-1 px-1">
          {visibleItems.map((item) => {
            const isActive = isActiveRoute(pathname ?? "/", item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                data-haptic
                onPointerDown={hapticLightImpact}
                className="relative flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-[var(--panel-radius)] px-2 py-1 text-[10px] font-medium transition-colors active:scale-[0.98] touch-manipulation"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileNavPill"
                    initial={false}
                    transition={{ duration: 0.2, ease: "easeOut" as const }}
                    className="liquid-glass-btn absolute left-1/2 top-1/2 -z-10 h-9 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  />
                )}
                <Icon
                  name={item.icon}
                  className={cn("h-5 w-5", isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}
                />
                <span className={cn("max-w-[3.5rem] truncate", isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            data-testid="mobile-nav-menu"
            onClick={() => { hapticMediumImpact(); setDrawerOpen(true); }}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            data-haptic
            className="relative flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-[var(--panel-radius)] px-2 py-1 text-[10px] font-medium transition-colors active:scale-[0.98] touch-manipulation"
          >
            <Icon name="menu" className="h-5 w-5 text-[var(--text-muted)]" />
            <span className="max-w-[3.5rem] truncate text-[var(--text-muted)]">
              {i18n("menu")}
            </span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-[var(--panel-bg)]/60 backdrop-blur-sm md:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.15, ease: "easeOut" as const }}
              drag="x"
              dragConstraints={{ left: -340, right: 0 }}
              dragElastic={0.05}
              onDragEnd={handleDrawerDragEnd}
              className="fixed left-0 top-0 z-50 h-dvh w-[min(85vw,320px)] overflow-y-auto overscroll-contain border-r border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-2xl no-scrollbar md:hidden backdrop-blur-[var(--panel-blur)]"
              role="dialog"
              aria-label={i18n("navigation")}
            >
              <div className="mb-6 flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <BrandMark size={28} />
                  <span className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">ETHONE</span>
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
                {items.map((item) => {
                  const isActive = isActiveRoute(pathname ?? "/", item.href);
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
