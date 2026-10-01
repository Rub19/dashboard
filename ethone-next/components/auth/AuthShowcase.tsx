"use client";

import { motion } from "framer-motion";
import { choreography, revealUp, staggerItem } from "@/lib/motion-variants";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { useI18n } from "@/lib/hooks/useI18n";
import { StickyNote, ListChecks, CalendarDays, Wallet, Music2, Brain } from "@/components/icons/ph";

const MODULES = [
  { icon: StickyNote, key: "loginFeatureNotes", fallback: "Notes" },
  { icon: ListChecks, key: "loginFeatureTasks", fallback: "Tâches" },
  { icon: CalendarDays, key: "loginFeatureCalendar", fallback: "Calendrier" },
  { icon: Wallet, key: "loginFeatureFinances", fallback: "Finances" },
  { icon: Music2, key: "loginFeatureMusic", fallback: "Musique" },
  { icon: Brain, key: "loginFeatureLocalAi", fallback: "IA locale" },
] as const;

/** Desktop-only brand column beside the auth card: one headline, one
 * sentence, and the six modules presented as a single connected panel. */
export default function AuthShowcase() {
  const i18n = useI18n();
  const { reduced } = useMotionPref();

  return (
    <motion.section
      variants={choreography}
      initial={reduced ? "animate" : "initial"}
      animate="animate"
      className="hidden w-full select-none lg:block"
    >
      <motion.span
        aria-hidden
        variants={{ initial: { scaleX: 0, opacity: 0 }, animate: { scaleX: 1, opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } } }}
        className="mb-6 block h-[3px] w-12 origin-left rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary)]/0"
      />
      <motion.h2
        variants={revealUp}
        className="text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)] xl:text-[3.25rem] 2xl:text-[3.6rem]"
      >
        {i18n("loginHeroHeadlineLine1", "Votre espace,")}
        <br />
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(100deg, var(--text-primary) 10%, var(--accent-primary) 130%)" }}
        >
          {i18n("loginHeroHeadlineLine2", "réinventé pour vous.")}
        </span>
      </motion.h2>

      <motion.p variants={revealUp} className="mt-5 max-w-[27rem] text-[16.5px] leading-relaxed text-[var(--text-muted)]">
        {i18n("loginHeroDescription", "Notes, tâches, calendrier, finances, musique, fichiers et IA locale réunis dans un système fluide et instantané.")}
      </motion.p>

      {/* Modules: an open list continuing the text, introduced by a fading hairline */}
      <motion.div variants={revealUp} className="mt-9 h-px w-full max-w-[30rem] bg-gradient-to-r from-[var(--panel-border)] via-[var(--panel-border)] to-transparent" />
      <motion.ul variants={choreography} className="mt-6 grid max-w-[30rem] grid-cols-3 gap-x-4 gap-y-3">
        {MODULES.map(({ icon: Icon, key, fallback }) => (
          <motion.li key={key} variants={staggerItem}>
            <span className="group -ml-1.5 flex cursor-default items-center gap-2.5 rounded-[var(--inset-radius)] py-1.5 pl-1.5 pr-2 transition-colors duration-300 hover:bg-[var(--text-primary)]/[0.04]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[calc(var(--inset-radius)-2px)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] text-[var(--text-muted)] transition-[color,border-color,background-color,transform] duration-300 [transition-timing-function:var(--ease-snap)] group-hover:-translate-y-px group-hover:border-[var(--accent-primary)]/30 group-hover:bg-[var(--accent-primary)]/10 group-hover:text-[var(--accent-primary)]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate text-[14px] font-medium text-[var(--text-primary)]/80 transition-[color,transform] duration-300 [transition-timing-function:var(--ease-snap)] group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]">
                {i18n(key, fallback)}
              </span>
            </span>
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  );
}
