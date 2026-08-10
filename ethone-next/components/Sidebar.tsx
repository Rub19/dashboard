"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();
  const i18n = useI18n();
  const { settings } = useSettings();

  const navItems = [
    { id: "home", label: i18n("home"), href: "/", icon: "home" },
    { id: "notes", label: i18n("notes"), href: "/notes/", icon: "notes" },
    { id: "tasks", label: i18n("tasks"), href: "/tasks/", icon: "tasks" },
    { id: "calendar", label: i18n("calendar"), href: "/calendar/", icon: "calendar" },
    { id: "files", label: i18n("files"), href: "/files/", icon: "files" },
    { id: "bills", label: i18n("bills"), href: "/bills/", icon: "bills" },
    { id: "activity", label: i18n("activity"), href: "/activity/", icon: "activity" },
    { id: "interactions", label: i18n("interactions"), href: "/interactions/", icon: "interactions" },
    { id: "connections", label: i18n("connections"), href: "/connections/", icon: "connections" },
    { id: "plugins", label: i18n("plugins"), href: "/plugins/", icon: "plugins" },
    { id: "spaces", label: i18n("spaces"), href: "/spaces/", icon: "spaces" },
    { id: "flows", label: i18n("flowsTitle"), href: "/flows/", icon: "flows" },
    { id: "brain", label: i18n("brain"), href: "/brain/", icon: "brain" },
    { id: "focus", label: i18n("focus"), href: "/focus/", icon: "focus" },
    { id: "team", label: i18n("team"), href: "/team/", icon: "team" },
    { id: "mail", label: i18n("mail"), href: "/mail/", icon: "mail" },
    { id: "settings", label: i18n("settings"), href: "/settings/", icon: "settings" },
  ];

  if (settings.layoutPreset === "dock-only" || settings.layoutPreset === "minimal" || !settings.sidebarVisible) return null;

  return (
    <motion.aside
      initial={false}
      animate={{ width: expanded ? 240 : 72 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-[var(--border)] md:flex ${
        settings.glassEnabled ? "bg-[var(--surface)]/80 backdrop-blur-xl" : "bg-[var(--surface)]"
      }`}
    >
      <div className="flex h-16 items-center px-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
          aria-label={expanded ? "Réduire" : "Étendre"}
          data-tooltip={expanded ? undefined : "Menu"}
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="ml-3 text-lg font-semibold tracking-tight text-[var(--foreground)]"
            >
              Ethone.dev
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setExpanded(false)}
              aria-label={item.label}
              data-tooltip={expanded ? undefined : item.label}
              className={`group relative flex h-11 items-center rounded-xl transition-all duration-300 ${
                isActive
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
              } ${expanded ? "px-3" : "justify-center"}`}
            >
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
        })}
      </nav>
    </motion.aside>
  );
}
