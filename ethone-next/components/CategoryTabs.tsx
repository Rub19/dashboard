"use client";

import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Blocks,
  BriefcaseBusiness,
  Brain,
  Code2,
  Gamepad2,
  HeartPulse,
  MessageSquare,
  Music,
  Plug,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { INTEGRATION_CATEGORIES, INTEGRATIONS } from "@/lib/integrations";
import { hapticLightImpact } from "@/lib/haptics";
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

export default function CategoryTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  const i18n = useI18n();
  const tabsRef = useRef<HTMLDivElement>(null);

  const tabs = useMemo(() => INTEGRATION_CATEGORIES, []);

  return (
    <div
      ref={tabsRef}
      role="tablist"
      aria-label={i18n("categories", "Catégories")}
      className="flex items-center gap-1.5 overflow-x-auto p-1.5 no-scrollbar rounded-2xl bg-black/40 border border-white/5 backdrop-blur-xl"
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
            onClick={() => {
              hapticLightImpact();
              onChange(cat.id);
            }}
            className={cn(
              "group relative flex min-h-[38px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold select-none cursor-pointer transition-colors duration-150",
              isActive
                ? "text-[var(--accent-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.03]"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeCategoryPill"
                className="absolute inset-0 rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 shadow-[0_0_15px_rgba(20,184,166,0.15)]"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 32,
                  mass: 0.8,
                }}
              />
            )}
            <span
              className={cn(
                "relative z-10 transition-colors duration-150",
                isActive
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
              )}
            >
              {CATEGORY_ICONS[cat.id] || <Plug className="h-3.5 w-3.5" />}
            </span>
            <span className="relative z-10">{i18n(cat.id, cat.label)}</span>
            <span
              className={cn(
                "relative z-10 ml-0.5 flex h-4 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold transition-colors duration-150",
                isActive
                  ? "bg-[var(--accent-primary)]/25 text-[var(--accent-primary)]"
                  : "bg-white/5 text-[var(--text-muted)] group-hover:text-zinc-300"
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
