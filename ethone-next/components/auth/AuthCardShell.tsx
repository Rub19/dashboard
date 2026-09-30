"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cardEnter } from "@/lib/motion-variants";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import BrandMark from "@/components/BrandMark";
import { cn } from "@/lib/utils";

interface AuthCardShellProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

/** Shared glass-card shell for every auth screen (login, MFA verify,
 * password recovery/reset) — icon/title/subtitle header, themed glass panel,
 * consistent entrance motion. Replaces the hand-rolled card each page used
 * to duplicate on its own. */
export default function AuthCardShell({ icon, title, subtitle, children, className }: AuthCardShellProps) {
  const { reduced } = useMotionPref();

  return (
    <div className="relative w-full max-w-[440px]">
      <motion.div
        variants={cardEnter}
        initial={reduced ? "animate" : "initial"}
        animate="animate"
        className={cn(
          "relative overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)]",
          "bg-[var(--bg-card,#13161E)]/90 p-6 sm:p-9 shadow-[var(--panel-shadow)] backdrop-blur-2xl",
          className,
        )}
      >
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.04] shadow-lg">
            {icon ?? <BrandMark size={36} />}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{title}</h1>
            {subtitle && <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">{subtitle}</p>}
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </motion.div>
    </div>
  );
}
