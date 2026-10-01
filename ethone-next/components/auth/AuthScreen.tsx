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

// Header, main and footer share one container so their edges line up.
const CONTAINER = "mx-auto w-full max-w-[1120px] px-5 sm:px-8 2xl:max-w-[1200px]";
const FOCUS = "rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-main)]";

/** Full-screen frame shared by every auth route: backdrop, header (brand +
 * tagline + locale), the brand column beside the card on desktop, footer. */
export default function AuthScreen({ children }: { children: ReactNode }) {
  const { reduced } = useMotionPref();
  const i18n = useI18n();
  const fadeIn = (delay: number) => ({
    initial: reduced ? false : { opacity: 0, y: -6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE_SNAP, delay },
  });

  return (
    // body is h-dvh + overflow-hidden (app shell), so this screen scrolls itself;
    // the backdrop stays put behind the scroller.
    <div className="relative h-dvh w-full overflow-hidden bg-[var(--bg-main)] text-[var(--text-primary)] selection:bg-[var(--accent-primary)]/30 selection:text-[var(--text-primary)]">
      <AuthBackdrop />
      <div className="relative z-10 flex h-full flex-col overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:thin]">
      <motion.header {...fadeIn(0.15)} className={`relative z-20 flex items-center justify-between py-5 ${CONTAINER}`}>
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/login" aria-label="ETHONE" className={`group flex shrink-0 select-none items-center gap-3 ${FOCUS}`}>
            <span className="grid h-9 w-9 place-items-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] transition-colors duration-200 group-hover:border-[var(--text-primary)]/20">
              <BrandMark size={20} />
            </span>
            <span className="text-[15px] font-semibold tracking-[0.22em] text-[var(--text-primary)]">ETHONE</span>
          </Link>
          <span aria-hidden className="hidden h-4 w-px bg-[var(--panel-border)] md:block" />
          <span className="hidden truncate text-[13px] text-[var(--text-muted)] md:block">
            {i18n("loginHeroBadge", "Environnement personnel unifié")}
          </span>
        </div>
        <LanguageSwitcher />
      </motion.header>

      <main
        className={`relative z-10 grid flex-1 grid-cols-[minmax(0,1fr)] items-center gap-12 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] xl:gap-16 2xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)] ${CONTAINER}`}
      >
        <AuthShowcase />
        <div className="flex w-full justify-center lg:justify-end">{children}</div>
      </main>

      <motion.footer
        {...fadeIn(0.6)}
        className={`relative z-20 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-6 py-6 text-xs text-[var(--text-muted)] ${CONTAINER}`}
      >
        <span className="whitespace-nowrap">© {new Date().getFullYear()} ETHONE</span>
        <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1.5 text-right">
          {[
            ["/terms", i18n("termsLinkText", "Conditions d'utilisation")],
            ["/privacy", i18n("privacyLinkText", "Politique de confidentialité")],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-200 hover:text-[var(--text-primary)] hover:decoration-[var(--text-primary)]/30 ${FOCUS}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </motion.footer>
      </div>
    </div>
  );
}
