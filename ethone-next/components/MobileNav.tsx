"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";

export default function MobileNav() {
  const pathname = usePathname();
  const i18n = useI18n();

  const items = [
    { id: "home", label: i18n("home"), href: "/", icon: "home" },
    { id: "notes", label: i18n("notes"), href: "/notes/", icon: "notes" },
    { id: "tasks", label: i18n("tasks"), href: "/tasks/", icon: "tasks" },
    { id: "calendar", label: i18n("calendar"), href: "/calendar/", icon: "calendar" },
    { id: "mail", label: i18n("mail"), href: "/mail/", icon: "mail" },
    { id: "settings", label: i18n("settings"), href: "/settings/", icon: "settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] px-2 pb-safe md:hidden">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
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
              <Icon name={item.icon} className="h-5 w-5" />
              <span className="max-w-[3.5rem] truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
