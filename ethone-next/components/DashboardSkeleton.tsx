"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const WIDGET_COL_SPAN: Record<string, string> = {
  hero: "col-span-12 lg:col-span-8",
  system: "col-span-12 lg:col-span-4",
  daystream: "col-span-12 md:col-span-6 lg:col-span-4",
  productivity: "col-span-12 md:col-span-6 lg:col-span-4",
  recent: "col-span-12 lg:col-span-4",
  brain: "col-span-12 md:col-span-6 lg:col-span-6",
  bills: "col-span-12 md:col-span-6 lg:col-span-6",
  live: "col-span-12",
  connections: "col-span-12",
};

const SKELETON_WIDGETS = [
  { id: "hero", h: 2 },
  { id: "system", h: 1 },
  { id: "daystream", h: 1 },
  { id: "productivity", h: 1 },
  { id: "recent", h: 1 },
  { id: "brain", h: 1 },
  { id: "bills", h: 1 },
  { id: "connections", h: 1 },
  { id: "live", h: 2 },
];

const gridVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function DashboardSkeleton() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={gridVariants}
      data-home-skeleton
      className="grid w-full h-auto grid-cols-12 gap-3 pb-3"
    >
      {SKELETON_WIDGETS.map((w) => (
        <motion.div
          key={w.id}
          variants={itemVariants}
          className={cn(
            WIDGET_COL_SPAN[w.id],
            "min-w-0 flex min-h-[120px] flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-sm backdrop-blur-[var(--panel-blur)]",
            w.h === 2 ? "min-h-[220px]" : "",
          )}
        >
          <div className="flex h-full w-full animate-pulse flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[var(--text-primary)]/[0.08]" />
              <div className="h-3 w-20 rounded bg-[var(--text-primary)]/[0.08]" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-[var(--text-primary)]/[0.06]" />
              <div className="h-3 w-1/2 rounded bg-[var(--text-primary)]/[0.06]" />
              {w.h === 2 && (
                <>
                  <div className="h-3 w-2/3 rounded bg-[var(--text-primary)]/[0.06]" />
                  <div className="h-3 w-1/3 rounded bg-[var(--text-primary)]/[0.06]" />
                </>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
