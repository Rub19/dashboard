"use client";

import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";

export type SettingsSidebarSection = {
  id: string;
  label?: string;
  labelKey?: string;
  icon: string;
  badge?: number;
};

type SettingsSidebarProps = {
  sections: SettingsSidebarSection[];
  activeId: string;
  onChange: (id: string) => void;
};

export default function SettingsSidebar({ sections, activeId, onChange }: SettingsSidebarProps) {
  const i18n = useI18n();

  function scrollToSection(id: string) {
    const el = document.querySelector(`[data-section="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    onChange(id);
  }

  return (
    <nav className="flex flex-col gap-1">
      {sections.map((section) => {
        const isActive = activeId === section.id;
        const label = section.label || (section.labelKey ? i18n(section.labelKey) : section.id);
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollToSection(section.id)}
            className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors"
          >
            {isActive && (
              <motion.div
                layoutId="activeSettingsTab"
                className="absolute inset-0 rounded-xl border border-white/10"
                style={{
                  background: "var(--accent-muted, rgba(168, 85, 247, 0.12))",
                  boxShadow: "0 0 16px var(--accent-glow, rgba(168, 85, 247, 0.2))",
                }}
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] transition-colors group-hover:bg-white/[0.06]">
              <Icon
                name={section.icon}
                className="h-4 w-4"
                style={{ color: isActive ? "var(--accent-color, var(--accent, #a855f7))" : undefined }}
              />
            </span>
            <span
              className="relative z-10 flex-1 truncate transition-colors"
              style={{ color: isActive ? "#ffffff" : "#a1a1aa" }}
            >
              {label}
            </span>
            {section.badge ? (
              <span
                className="relative z-10 rounded-full px-1.5 py-0.5 text-[10px] font-mono"
                style={{
                  background: "var(--accent-muted, rgba(168, 85, 247, 0.15))",
                  color: "var(--accent-color, var(--accent, #a855f7))",
                }}
              >
                {section.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
