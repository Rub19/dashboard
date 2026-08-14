"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { NAVIGATION_ITEMS } from "@/lib/navigation";

const VISIBLE_MOBILE_IDS = ["home", "notes", "tasks", "calendar", "files"];

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default function MobileNav() {
  const pathname = usePathname();
  const i18n = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = NAVIGATION_ITEMS.map((item) => ({ ...item, label: i18n(item.label) }));
  const visibleItems = items.filter((item) => VISIBLE_MOBILE_IDS.includes(item.id));
  const moreItems = items.filter((item) => !VISIBLE_MOBILE_IDS.includes(item.id));

  const moreActive = moreItems.some((item) => pathname === item.href || pathname.startsWith(item.href));

  return (
    <>
      <nav
        data-zen-hidden
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 pb-safe backdrop-blur-xl md:hidden"
      >
        <div className="flex items-center justify-around gap-1 px-2 py-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                data-haptic
                className="relative flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1 text-[10px] font-medium transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileNavPill"
                    initial={false}
                    transition={{ type: "spring", damping: 22, stiffness: 200 }}
                    className="absolute inset-0 -z-10 rounded-2xl bg-[var(--accent)]/10"
                  />
                )}
                <Icon
                  name={item.icon}
                  className={cn("h-5 w-5", isActive ? "text-[var(--accent)]" : "text-[var(--muted)]")}
                />
                <span className={cn("max-w-[3.5rem] truncate", isActive ? "text-[var(--foreground)]" : "text-[var(--muted)]")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            data-haptic
            className="relative flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1 text-[10px] font-medium transition-colors"
          >
            {moreActive && (
              <motion.div
                layoutId="mobileNavPill"
                initial={false}
                transition={{ type: "spring", damping: 22, stiffness: 200 }}
                className="absolute inset-0 -z-10 rounded-2xl bg-[var(--accent)]/10"
              />
            )}
            <Icon name="more-horizontal" className={cn("h-5 w-5", moreActive ? "text-[var(--accent)]" : "text-[var(--muted)]")} />
            <span className={cn("max-w-[3.5rem] truncate", moreActive ? "text-[var(--foreground)]" : "text-[var(--muted)]")}>
              {i18n("more")}
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
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border border-white/10 bg-[var(--surface)] p-4 shadow-2xl md:hidden"
              role="dialog"
              aria-label={i18n("navigation")}
            >
              <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" />
              <div className="grid grid-cols-4 gap-3 pb-safe">
                {items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-2xl p-3 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "text-[var(--muted)] hover:bg-[var(--surface-raised)]"
                      )}
                    >
                      <Icon name={item.icon} className="h-6 w-6" />
                      <span className="w-full truncate text-center">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
