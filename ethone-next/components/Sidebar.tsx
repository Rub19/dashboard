"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import BrandMark from "@/components/BrandMark";
import SidebarItem from "@/components/SidebarItem";
import { NAVIGATION_ITEMS, type NavigationItem, isActiveRoute } from "@/lib/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const i18n = useI18n();
  const { settings } = useSettings();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const expanded = hovered || focused;

  const navItems = useMemo(
    () => NAVIGATION_ITEMS.map((item: NavigationItem) => ({ ...item, label: i18n(item.label) })),
    [i18n]
  );

  if (settings.layoutPreset === "dock-only" || settings.layoutPreset === "minimal" || !settings.sidebarVisible) return null;

  const mainItems = navItems.filter((item) => item.id !== "settings");
  const bottomItems = [navItems.find((item) => item.id === "settings")].filter(Boolean) as NavigationItem[];

  const handleFocus = () => setFocused(true);

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setFocused(false);
    }
  };

  return (
    <motion.aside
      data-v8-rail
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
      initial={false}
      animate={{ width: expanded ? 256 : 64 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={`v8-rail fixed left-0 top-0 z-40 hidden h-dvh flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--surface)] shadow-2xl will-change-[width] md:flex ${
        settings.glassEnabled ? "bg-[var(--surface)]/90 backdrop-blur-xl" : "bg-[var(--surface)]"
      }`}
    >
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center px-3">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center !rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
          aria-label="Menu"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <span
          className="ml-3 flex items-center gap-2 overflow-hidden whitespace-nowrap text-lg font-semibold tracking-tight text-[var(--foreground)] transition-all duration-300 ease-out"
          style={{ maxWidth: expanded ? 160 : 0, opacity: expanded ? 1 : 0, transform: expanded ? "translateX(0)" : "translateX(8px)" }}
        >
          <BrandMark size={28} />
          ETHONE
        </span>
      </div>

      {/* Navigation scrollable */}
      <nav className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden px-2 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-full flex-col gap-1.5">
          {mainItems.map((item) => (
            <SidebarItem
              key={item.id}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={isActiveRoute(pathname ?? "/", item.href)}
              expanded={expanded}
            />
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="flex w-full shrink-0 flex-col gap-1.5 border-t border-[var(--border)] px-2 py-3">
        {bottomItems.map((item) => (
          <SidebarItem
            key={item.id}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={isActiveRoute(pathname ?? "/", item.href)}
            expanded={expanded}
          />
        ))}
      </div>
    </motion.aside>
  );
}
