"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import BrandMark from "@/components/BrandMark";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AuthBackdrop from "@/components/auth/AuthBackdrop";
import { EASE_SNAP } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";

/** Full-screen frame shared by every auth route: living backdrop, a slim top
 * bar (brand + locale) and a single centered column for the card. */
export default function AuthScreen({ children }: { children: ReactNode }) {
  const { reduced } = useMotionPref();

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-[var(--bg-main)] text-[var(--text-primary)] selection:bg-[var(--accent-primary)]/30 selection:text-[var(--text-primary)]">
      <AuthBackdrop />

      <motion.header
        initial={reduced ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_SNAP, delay: 0.5 }}
        className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8"
      >
        <div className="flex select-none items-center gap-2.5">
          <BrandMark size={22} />
          <span className="font-mono text-sm font-bold tracking-[0.2em] text-[var(--text-primary)]">ETHONE</span>
        </div>
        <LanguageSwitcher />
      </motion.header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16 pt-2 sm:pb-20">
        {children}
      </main>
    </div>
  );
}
