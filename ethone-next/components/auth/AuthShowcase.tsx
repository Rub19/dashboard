"use client";

import { motion } from "framer-motion";
import { choreography, revealUp, staggerItem } from "@/lib/motion-variants";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { useI18n } from "@/lib/hooks/useI18n";
import BrandMark from "@/components/BrandMark";
import { StickyNote, ListChecks, CalendarDays, Wallet, Music2, Brain } from "@/components/icons/ph";

const MODULES = [
  { icon: StickyNote, key: "loginFeatureNotes", fallback: "Notes" },
  { icon: ListChecks, key: "loginFeatureTasks", fallback: "Tâches" },
  { icon: CalendarDays, key: "loginFeatureCalendar", fallback: "Calendrier" },
  { icon: Wallet, key: "loginFeatureFinances", fallback: "Finances" },
  { icon: Music2, key: "loginFeatureMusic", fallback: "Musique" },
  { icon: Brain, key: "loginFeatureLocalAi", fallback: "IA locale" },
] as const;

/** Desktop-only brand column beside the auth card: what ETHONE is, in one
 * headline, one sentence and the six modules it brings together. */
export default function AuthShowcase() {
  const i18n = useI18n();
  const { reduced } = useMotionPref();

  return (
    <motion.section
      variants={choreography}
      initial={reduced ? "animate" : "initial"}
      animate="animate"
      className="hidden max-w-[44rem] select-none lg:block"
    >
      <motion.div
        variants={revealUp}
        className="inline-flex items-center gap-2.5 rounded-full border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] py-1.5 pl-1.5 pr-4 text-[13px] text-[var(--text-muted)] backdrop-blur-md"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--text-primary)]/[0.06]">
          <BrandMark size={14} />
        </span>
        {i18n("loginHeroBadge", "Environnement personnel unifié")}
      </motion.div>

      <motion.h2
        variants={revealUp}
        className="mt-7 text-[3rem] font-semibold leading-[1.04] tracking-[-0.04em] text-[var(--text-primary)] xl:text-[3.3rem] 2xl:text-[3.8rem]"
      >
        {i18n("loginHeroHeadlineLine1", "Votre espace,")}
        <br />
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(100deg, var(--text-primary) 10%, var(--accent-primary) 120%)" }}
        >
          {i18n("loginHeroHeadlineLine2", "réinventé pour vous.")}
        </span>
      </motion.h2>

      <motion.p variants={revealUp} className="mt-6 max-w-[30rem] text-lg leading-relaxed text-[var(--text-muted)]">
        {i18n("loginHeroDescription", "Notes, tâches, calendrier, finances, musique, fichiers et IA locale réunis dans un système fluide et instantané.")}
      </motion.p>

      <motion.div variants={revealUp} className="mt-10 h-px w-full bg-gradient-to-r from-[var(--panel-border)] to-transparent" />

      <motion.ul variants={choreography} className="mt-8 grid grid-cols-3 gap-x-6 gap-y-5">
        {MODULES.map(({ icon: Icon, key, fallback }) => (
          <motion.li key={key} variants={staggerItem} className="group flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] text-[var(--text-muted)] transition-[color,border-color,transform] duration-300 [transition-timing-function:var(--ease-snap)] group-hover:-translate-y-0.5 group-hover:border-[var(--accent-primary)]/35 group-hover:text-[var(--accent-primary)]">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="text-[15px] font-medium text-[var(--text-primary)]/85">{i18n(key, fallback)}</span>
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  );
}
