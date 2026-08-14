"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { Icon } from "@/lib/icons";
import Tooltip from "@/components/Tooltip";
import BrandMark from "@/components/BrandMark";
import { NAVIGATION_ITEMS, type NavigationItem } from "@/lib/navigation";

export default function Sidebar() {
  const [expanded, setExpanded] = useLocalStorage<boolean>("ethone-rail-expanded", false);
  const pathname = usePathname();
  const i18n = useI18n();
  const { settings } = useSettings();

  const navItems = NAVIGATION_ITEMS.map((item: NavigationItem) => ({ ...item, label: i18n(item.label) }));

  if (settings.layoutPreset === "dock-only" || settings.layoutPreset === "minimal" || !settings.sidebarVisible) return null;

  return (
    <motion.aside
      data-v8-rail
      initial={false}
      animate={{ width: expanded ? 240 : 72 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`v8-rail fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-[var(--border)] md:flex ${
        settings.glassEnabled ? "bg-[var(--surface)]/80 backdrop-blur-xl" : "bg-[var(--surface)]"
      }`}
    >
      <div className="flex h-16 items-center px-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="v8-icon-radius flex h-10 w-10 items-center justify-center text-[var(--muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
          aria-label={expanded ? "Réduire" : "Étendre"}
          data-tooltip={expanded ? undefined : "Menu"}
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="ml-3 flex items-center gap-2"
            >
              <BrandMark size={28} />
              <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">ETHONE</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const link = (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setExpanded(false)}
              aria-label={item.label}
              data-tooltip={expanded ? undefined : item.label}
              className={`v8-icon-radius group relative flex h-11 items-center transition-all duration-300 ${
                isActive
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
              } ${expanded ? "px-3" : "justify-center"}`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-pill"
                  className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.35)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon name={item.icon} className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="ml-3 overflow-hidden whitespace-nowrap text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
          return expanded ? link : <Tooltip key={item.id} label={item.label} position="right">{link}</Tooltip>;
        })}
      </nav>
    </motion.aside>
  );
}
