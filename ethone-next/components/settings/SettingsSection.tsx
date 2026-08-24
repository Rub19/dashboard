"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<string, { border: string; iconBg: string; iconText: string; badge: string }> = {
  profile: { border: "border-indigo-500/20", iconBg: "bg-indigo-500/10", iconText: "text-indigo-400", badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  appearance: { border: "border-pink-500/20", iconBg: "bg-pink-500/10", iconText: "text-pink-400", badge: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  audio: { border: "border-amber-500/20", iconBg: "bg-amber-500/10", iconText: "text-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  workspace: { border: "border-sky-500/20", iconBg: "bg-sky-500/10", iconText: "text-sky-400", badge: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  language: { border: "border-emerald-500/20", iconBg: "bg-emerald-500/10", iconText: "text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  notifications: { border: "border-rose-500/20", iconBg: "bg-rose-500/10", iconText: "text-rose-400", badge: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  security: { border: "border-slate-500/20", iconBg: "bg-slate-500/10", iconText: "text-slate-400", badge: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  advanced: { border: "border-violet-500/20", iconBg: "bg-violet-500/10", iconText: "text-violet-400", badge: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
};

function SettingsSection({
  id,
  label,
  icon,
  category,
  children,
  modifiedCount,
  visible = true,
}: {
  id: string;
  label: string;
  icon: string;
  category?: string;
  children: React.ReactNode;
  modifiedCount?: number;
  visible?: boolean;
}) {
  if (!visible) return null;

  const style = (category && CATEGORY_STYLES[category]) || { border: "border-white/10", iconBg: "bg-[var(--accent)]/10", iconText: "text-[var(--accent)]", badge: "bg-[var(--accent)]/10 text-[var(--accent)]" };

  return (
    <motion.div
      data-section={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("overflow-hidden rounded-2xl border bg-white/[0.03] shadow-sm backdrop-blur-[var(--panel-blur)]", style.border)}
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-[var(--panel-radius)]", style.iconBg, style.iconText)}>
            <Icon name={icon} className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{label}</h2>
        </div>
        {modifiedCount ? (
          <span className={cn("rounded-lg px-2.5 py-1 text-[10px] font-medium", style.badge)}>
            {modifiedCount} modifié{modifiedCount > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
      <div className="divide-y divide-[var(--border-5)]">{children}</div>
    </motion.div>
  );
}

export default memo(SettingsSection);
