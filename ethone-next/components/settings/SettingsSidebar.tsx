"use client";

import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";

export type SettingsSidebarSection = {
  id: string;
  labelKey: string;
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
    <nav className="flex flex-col gap-1 p-1 bg-zinc-950/60 border border-white/[0.06] rounded-2xl backdrop-blur-xl">
      {sections.map((section) => {
        const isActive = activeId === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollToSection(section.id)}
            className="relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors z-10 w-full text-left"
          >
            {isActive && (
              <motion.div
                layoutId="activeSettingsNavPill"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: "var(--accent-muted, rgba(168, 85, 247, 0.12))",
                  border: "1px solid var(--accent-border, rgba(168, 85, 247, 0.3))",
                  boxShadow: "0 0 12px var(--accent-glow, rgba(168, 85, 247, 0.15))",
                }}
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <Icon
              name={section.icon}
              className="h-4 w-4 relative z-10 shrink-0"
              style={{ color: isActive ? "var(--accent-color, var(--accent, #a855f7))" : undefined }}
            />
            <span
              className="relative z-10 truncate"
              style={{ color: isActive ? "#ffffff" : "#a1a1aa" }}
            >
              {i18n(section.labelKey)}
            </span>
            {section.badge ? (
              <span
                className="relative z-10 ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full"
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
