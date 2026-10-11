"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { SPRING_PILL } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type MobileTab<T extends string> = { id: T; label: string; icon?: ReactNode; badge?: number };

/**
 * Barre d'onglets du mobile : une page = un onglet visible à la fois, au lieu de tout empiler sur plusieurs écrans.
 * Collée en haut, défilable à l'horizontale ; l'onglet choisi reste toujours visible.
 */
export default function MobileTabs<T extends string>({ tabs, value, onChange, className, layoutId = "mobile-tab" }: { tabs: MobileTab<T>[]; value: T; onChange: (v: T) => void; className?: string; layoutId?: string }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bar.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [value]);
  return (
    <div
      ref={bar}
      role="tablist"
      className={cn(
        "sticky top-0 z-20 -mx-2 flex gap-1 overflow-x-auto border-b border-[var(--panel-border)] bg-[var(--background)]/90 px-2 py-2 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className="relative isolate flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold [-webkit-tap-highlight-color:transparent] active:scale-[0.97] transition-transform"
          >
            {on && <motion.span layoutId={layoutId} transition={SPRING_PILL} className="absolute inset-0 -z-10 rounded-full bg-[var(--surface-raised)] ring-1 ring-[var(--panel-border)]" />}
            {t.icon && <span className={on ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}>{t.icon}</span>}
            <span className={on ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>{t.label}</span>
            {!!t.badge && <span className="rounded-full bg-[var(--accent-primary)] px-1.5 text-[10px] font-bold leading-4 text-[var(--accent-contrast)]">{t.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
