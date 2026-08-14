"use client";

import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";
import { DEFAULTS } from "@/lib/settings";
import { getValueByPath } from "@/lib/object-path";
import { useSettingsForm } from "./SettingsFormContext";
import { Children, isValidElement, useEffect, useRef } from "react";

export default function SettingsSection({
  id,
  label,
  icon,
  children,
  modifiedCount,
}: {
  id: string;
  label: string;
  icon: string;
  children: React.ReactNode;
  modifiedCount?: number;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { query } = useSettingsForm();

  useEffect(() => {
    if (!query) return;
    const hasVisible = sectionRef.current?.querySelector('[data-setting-key]:not(.hidden)') != null;
    if (sectionRef.current) {
      sectionRef.current.style.display = hasVisible ? "" : "none";
    }
  }, [query, children]);

  return (
    <motion.div
      ref={sectionRef}
      data-section={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 backdrop-blur-sm sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <Icon name={icon} className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="font-semibold text-[var(--foreground)]">{label}</h2>
        </div>
        {modifiedCount ? (
          <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
            {modifiedCount} modifié{modifiedCount > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
      <div className="space-y-0">{children}</div>
    </motion.div>
  );
}

export function useSectionModifiedCount(
  settings: Record<string, unknown>[],
  keys: { settingKey: string; path?: string }[]
): number {
  const { settings: current } = useSettings();
  const src = current as Record<string, unknown>;
  const defaults = DEFAULTS as Record<string, unknown>;

  return settings.reduce((count, _, i) => {
    const { settingKey, path } = keys[i];
    const currentValue = path ? getValueByPath(src, path) : src[settingKey];
    const defaultValue = path ? getValueByPath(defaults, path) : defaults[settingKey];
    return JSON.stringify(currentValue) !== JSON.stringify(defaultValue) ? count + 1 : count;
  }, 0);
}
