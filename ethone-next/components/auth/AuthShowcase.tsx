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
      <motion.h2
        variants={revealUp}
        className="text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)] xl:text-[3.5rem] 2xl:text-[3.75rem]"
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

      <motion.p variants={revealUp} className="mt-5 max-w-[32rem] text-[17px] leading-relaxed text-[var(--text-muted)]">
        {i18n("loginHeroDescription", "Notes, tâches, calendrier, finances, musique, fichiers et IA locale réunis dans un système fluide et instantané.")}
      </motion.p>

      {/* Modules: one panel, cells separated by hairlines */}
      <motion.div
        variants={revealUp}
        className="mt-9 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] shadow-[0_24px_60px_-36px_rgb(0_0_0/0.7)]"
      >
        <motion.ul variants={choreography} className="grid grid-cols-3 gap-px bg-[var(--panel-border)]">
          {MODULES.map(({ icon: Icon, key, fallback }) => (
            <motion.li
              key={key}
              variants={staggerItem}
              className="group flex flex-col items-start gap-3.5 px-5 py-5 transition-colors duration-300"
              style={{ background: "color-mix(in srgb, var(--bg-card, var(--bg-main)) 85%, var(--bg-main))" }}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.05] text-[var(--text-muted)] transition-[color,background-color] duration-300 group-hover:border-[var(--accent-primary)]/30 group-hover:bg-[var(--accent-primary)]/10 group-hover:text-[var(--accent-primary)]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="truncate text-[15px] font-medium text-[var(--text-primary)]/85 transition-colors duration-300 group-hover:text-[var(--text-primary)]">
                {i18n(key, fallback)}
              </span>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>
    </motion.section>
  );
}
