"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import BrandMark from "@/components/BrandMark";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AuthBackdrop from "@/components/auth/AuthBackdrop";
import AuthShowcase from "@/components/auth/AuthShowcase";
import { EASE_SNAP } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { useI18n } from "@/lib/hooks/useI18n";

/** Full-screen frame shared by every auth route: living backdrop, a slim
 * header (brand + locale), the brand column beside the card on desktop,
 * and a quiet legal footer. */
export default function AuthScreen({ children }: { children: ReactNode }) {
  const { reduced } = useMotionPref();
  const i18n = useI18n();
  const fadeIn = (delay: number) => ({
    initial: reduced ? false : { opacity: 0, y: -6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE_SNAP, delay },
  });

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-[var(--bg-main)] text-[var(--text-primary)] selection:bg-[var(--accent-primary)]/30 selection:text-[var(--text-primary)]">
      <AuthBackdrop />

      <motion.header {...fadeIn(0.15)} className="relative z-20 mx-auto flex w-full max-w-[1240px] 2xl:max-w-[1400px] items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
        <Link href="/login" className="group flex select-none items-center gap-3" aria-label="ETHONE">
          <span className="grid h-9 w-9 place-items-center rounded-[0.7rem] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] transition-colors group-hover:border-[var(--text-primary)]/20">
            <BrandMark size={20} />
          </span>
          <span className="text-[15px] font-semibold tracking-[0.24em] text-[var(--text-primary)]">ETHONE</span>
        </Link>
        <LanguageSwitcher />
      </motion.header>

      <main className="relative z-10 mx-auto grid w-full max-w-[1240px] 2xl:max-w-[1400px] flex-1 grid-cols-[minmax(0,1fr)] items-center gap-16 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] xl:gap-24 2xl:grid-cols-[minmax(0,1fr)_minmax(0,500px)]">
        <AuthShowcase />
        <div className="flex w-full justify-center lg:justify-end">{children}</div>
      </main>

      <motion.footer
        {...fadeIn(0.6)}
        className="relative z-20 mx-auto flex w-full max-w-[1240px] 2xl:max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-[var(--text-muted)] sm:px-8"
      >
        <span>© {new Date().getFullYear()} ETHONE</span>
        <nav className="flex items-center gap-5">
          <Link href="/terms" className="transition-colors hover:text-[var(--text-primary)]">
            {i18n("termsLinkText", "Conditions d'utilisation")}
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-[var(--text-primary)]">
            {i18n("privacyLinkText", "Politique de confidentialité")}
          </Link>
        </nav>
      </motion.footer>
    </div>
  );
}
