"use client";

import { memo, useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
  const titleId = useId();
  const reduce = useReducedMotion();

  if (!visible) return null;

  return (
    <motion.div
      data-section={id}
      id={`section-${id}`}
      role="region"
      aria-labelledby={titleId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.2 }}
      className="overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border)] bg-[var(--surface)] shadow-sm backdrop-blur-[var(--panel-blur)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            <Icon name={icon} className="h-4 w-4" aria-hidden="true" />
          </div>
          <h2 id={titleId} className="text-sm font-semibold text-[var(--text-primary)]">
            {label}
          </h2>
        </div>
        {modifiedCount ? (
          <span
            className="rounded-lg bg-[var(--accent-primary)]/10 px-2.5 py-1 text-[10px] font-medium text-[var(--accent-primary)]"
            aria-label={`${modifiedCount} modification${modifiedCount > 1 ? "s" : ""}`}
          >
            {modifiedCount} modifié{modifiedCount > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">{children}</div>
    </motion.div>
  );
}

export default memo(SettingsSection);
