"use client";

import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Blocks, BriefcaseBusiness, Brain, Code2, Gamepad2, HeartPulse, MessageSquare, Music, Plug } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { INTEGRATION_CATEGORIES } from "@/lib/integrations";

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

export default function CategoryTabs({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  const i18n = useI18n();
  const tabsRef = useRef<HTMLDivElement>(null);

  const tabs = useMemo(() => INTEGRATION_CATEGORIES, []);

  return (
    <div
      ref={tabsRef}
      className="mb-5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
    >
      {tabs.map((cat) => {
        const isActive = active === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-[var(--text-primary)]/20 bg-[var(--text-primary)]/[0.08] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.03] hover:text-[var(--text-primary)]"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeCategoryPill"
                className="absolute inset-0 rounded-xl border border-[var(--accent-color)]/30 bg-[var(--accent-color)]/5"
                style={{ zIndex: -1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className={isActive ? "text-[var(--accent-color)]" : "text-[var(--text-muted)]"}>
              {CATEGORY_ICONS[cat.id] || <Plug className="h-3.5 w-3.5" />}
            </span>
            {i18n(cat.id)}
          </button>
        );
      })}
    </div>
  );
}
