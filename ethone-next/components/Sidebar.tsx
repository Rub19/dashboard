"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { Icon } from "@/lib/icons";
import BrandMark from "@/components/BrandMark";
import SidebarItem from "@/components/SidebarItem";
import { NAVIGATION_ITEMS, type NavigationItem } from "@/lib/navigation";

export default function Sidebar() {
  const [expanded, setExpanded] = useLocalStorage<boolean>("ethone-rail-expanded", false);
  const pathname = usePathname();
  const i18n = useI18n();
  const { settings } = useSettings();

  const navItems = useMemo(
    () => NAVIGATION_ITEMS.map((item: NavigationItem) => ({ ...item, label: i18n(item.label) })),
    [i18n]
  );

  if (settings.layoutPreset === "dock-only" || settings.layoutPreset === "minimal" || !settings.sidebarVisible) return null;

  const mainItems = navItems.filter((item) => item.id !== "settings");
  const bottomItems = [navItems.find((item) => item.id === "settings")].filter(Boolean) as NavigationItem[];

  return (
    <motion.aside
      data-v8-rail
      initial={false}
      animate={{ width: expanded ? 240 : 72 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className={`v8-rail fixed left-0 top-0 z-40 hidden h-screen flex-col rounded-r-2xl border-r border-[var(--border)] md:flex ${
        settings.glassEnabled ? "bg-[var(--surface)]/80 backdrop-blur-xl" : "bg-[var(--surface)]"
      }`}
    >
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center px-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex h-10 w-10 shrink-0 items-center justify-center !rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
          aria-label={expanded ? "Réduire" : "Étendre"}
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

      {/* Navigation scrollable */}
      <nav className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden px-2 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-full flex-col items-center gap-1.5">
          {mainItems.map((item) => (
            <SidebarItem
              key={item.id}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname === item.href || pathname.startsWith(item.href)}
              tooltip={expanded ? undefined : item.label}
              onClick={() => setExpanded(false)}
            />
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="flex w-full shrink-0 flex-col items-center gap-1.5 border-t border-[var(--border)] px-2 py-3">
        {bottomItems.map((item) => (
          <SidebarItem
            key={item.id}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname === item.href || pathname.startsWith(item.href)}
            tooltip={expanded ? undefined : item.label}
            onClick={() => setExpanded(false)}
          />
        ))}
      </div>
    </motion.aside>
  );
}
