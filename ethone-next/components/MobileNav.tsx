"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, NotebookPen, CircleCheck, CalendarDays, Mail, Settings } from "lucide-react";

const items = [
  { id: "home", label: "Accueil", href: "/", icon: Home },
  { id: "notes", label: "Notes", href: "/notes/", icon: NotebookPen },
  { id: "tasks", label: "Tâches", href: "/tasks/", icon: CircleCheck },
  { id: "calendar", label: "Agenda", href: "/calendar/", icon: CalendarDays },
  { id: "mail", label: "Mail", href: "/mail/", icon: Mail },
  { id: "settings", label: "Réglages", href: "/settings/", icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] px-2 pb-safe md:hidden">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] transition-colors ${
                isActive
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted)]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-[3.5rem] truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
