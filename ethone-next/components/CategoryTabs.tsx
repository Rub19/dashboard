"use client";

import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Blocks, BriefcaseBusiness, Brain, Code2, Gamepad2, HeartPulse, MessageSquare, Music, Plug } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { INTEGRATION_CATEGORIES, INTEGRATIONS } from "@/lib/integrations";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <Blocks className="h-3.5 w-3.5" />,
  media: <Music className="h-3.5 w-3.5" />,
  social: <MessageSquare className="h-3.5 w-3.5" />,
  gaming: <Gamepad2 className="h-3.5 w-3.5" />,
  productivity: <BriefcaseBusiness className="h-3.5 w-3.5" />,
  development: <Code2 className="h-3.5 w-3.5" />,
  health: <HeartPulse className="h-3.5 w-3.5" />,
  ai: <Brain className="h-3.5 w-3.5" />,
};

function countByCategory(id: string) {
  if (id === "all") return INTEGRATIONS.length;
  return INTEGRATIONS.filter((i) => i.category === id).length;
}

export default function CategoryTabs({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  const i18n = useI18n();
  const tabsRef = useRef<HTMLDivElement>(null);

  const tabs = useMemo(() => INTEGRATION_CATEGORIES, []);

  return (
    <div
      ref={tabsRef}
      role="tablist"
      aria-label={i18n("categories", "Catégories")}
      className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
    >
      {tabs.map((cat) => {
        const isActive = active === cat.id;
        const count = countByCategory(cat.id);
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(cat.id)}
            className={cn(
              "group relative flex min-h-[40px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-all",
              isActive
                ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                : "border-transparent bg-[var(--panel-bg)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]/40 hover:text-[var(--text-primary)]"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeCategoryPill"
                className="absolute inset-0 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5"
                style={{ zIndex: -1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className={cn("transition-colors", isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]")}>
              {CATEGORY_ICONS[cat.id] || <Plug className="h-3.5 w-3.5" />}
            </span>
            <span>{i18n(cat.id, cat.label)}</span>
            <span
              className={cn(
                "ml-0.5 flex h-4 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                isActive ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]" : "bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)]"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
