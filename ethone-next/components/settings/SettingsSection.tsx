"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";

function SettingsSection({
  id,
  label,
  icon,
  children,
  modifiedCount,
  visible = true,
}: {
  id: string;
  label: string;
  icon: string;
  children: React.ReactNode;
  modifiedCount?: number;
  visible?: boolean;
}) {
  if (!visible) return null;

  return (
    <motion.div
      data-section={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--text-primary)]/[0.03] shadow-sm backdrop-blur-[var(--panel-blur)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            <Icon name={icon} className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{label}</h2>
        </div>
        {modifiedCount ? (
          <span className="rounded-lg bg-[var(--accent-primary)]/10 px-2.5 py-1 text-[10px] font-medium text-[var(--accent-primary)]">
            {modifiedCount} modifié{modifiedCount > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">{children}</div>
    </motion.div>
  );
}

export default memo(SettingsSection);
