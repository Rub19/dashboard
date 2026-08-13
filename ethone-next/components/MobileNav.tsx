"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { NAVIGATION_ITEMS, type NavigationItem } from "@/lib/navigation";

export default function MobileNav() {
  const pathname = usePathname();
  const i18n = useI18n();

  const items = NAVIGATION_ITEMS.map((item: NavigationItem) => ({ ...item, label: i18n(item.label) }));

  return (
    <nav data-zen-hidden className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] pb-safe md:hidden">
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none]">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              data-haptic
              className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] transition-colors ${
                isActive
                  ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-raised)]"
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
