"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  NotebookPen,
  CircleCheck,
  CalendarDays,
  Folder,
  Activity,
  Flame,
  Plug,
  LayoutGrid,
  Workflow,
  Brain,
  Users,
  Mail,
  Settings,
  Menu,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { id: "home", label: "Accueil", href: "/", icon: Home },
  { id: "notes", label: "Notes", href: "/notes/", icon: NotebookPen },
  { id: "tasks", label: "Tâches", href: "/tasks/", icon: CircleCheck },
  { id: "calendar", label: "Calendrier", href: "/calendar/", icon: CalendarDays },
  { id: "files", label: "Fichiers", href: "/files/", icon: Folder },
  { id: "activity", label: "Activity", href: "/activity/", icon: Activity },
  { id: "interactions", label: "Interactions", href: "/interactions/", icon: Flame },
  { id: "connections", label: "Connections", href: "/connections/", icon: Plug },
  { id: "spaces", label: "Spaces", href: "/spaces/", icon: LayoutGrid },
  { id: "flows", label: "Flows", href: "/flows/", icon: Workflow },
  { id: "brain", label: "Brain", href: "/brain/", icon: Brain },
  { id: "team", label: "Équipe", href: "/team/", icon: Users },
  { id: "mail", label: "Mail", href: "/mail/", icon: Mail },
  { id: "settings", label: "Réglages", href: "/settings/", icon: Settings },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: expanded ? 240 : 72 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex"
    >
      <div className="flex h-16 items-center px-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
          aria-label={expanded ? "Réduire" : "Étendre"}
          data-tooltip={expanded ? undefined : "Menu"}
        >
          <Menu className="h-5 w-5" />
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
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setExpanded(false)}
              data-tooltip={expanded ? undefined : item.label}
              className={`group relative flex h-11 items-center rounded-xl transition-all duration-300 ${
                isActive
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
              } ${expanded ? "px-3" : "justify-center"}`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
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
