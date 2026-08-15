"use client";

import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";

export default function SettingsSection({
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
      className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <Icon name={icon} className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{label}</h2>
        </div>
        {modifiedCount ? (
          <span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[10px] font-medium text-[var(--accent)]">
            {modifiedCount} modifié{modifiedCount > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
      <div className="divide-y divide-[var(--border)]/40">{children}</div>
    </motion.div>
  );
}
