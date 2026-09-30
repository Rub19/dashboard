"use client";

import { motion } from "framer-motion";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import BrandMark from "@/components/BrandMark";
import { Sparkles, StickyNote, ListChecks, CalendarDays, Wallet, Music2, Brain } from "@/components/icons/ph";
import { useI18n } from "@/lib/hooks/useI18n";

const HERO_FEATURES = [
  { icon: StickyNote, labelKey: "loginFeatureNotes", fallback: "Notes" },
  { icon: ListChecks, labelKey: "loginFeatureTasks", fallback: "Tâches" },
  { icon: CalendarDays, labelKey: "loginFeatureCalendar", fallback: "Calendrier" },
  { icon: Wallet, labelKey: "loginFeatureFinances", fallback: "Finances" },
  { icon: Music2, labelKey: "loginFeatureMusic", fallback: "Musique" },
  { icon: Brain, labelKey: "loginFeatureLocalAi", fallback: "IA locale" },
] as const;

/** Left-column decorative hero — desktop only. Pure extraction from the
 * login page's inline markup (no visual change), so a future background
 * treatment (e.g. the currently-unused LoginCosmicBackground) can be A/B'd
 * without touching the auth state machine. */
export default function AuthHeroPanel() {
  const i18n = useI18n();
  const { reduced } = useMotionPref();

  return (
    <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14 select-none">
      {/* Faint dot grid — gives the empty field some texture without competing with the text */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Ambient Radial Lighting — slow drifting glow instead of static, to fill the negative space with gentle motion */}
      <motion.div
        className="pointer-events-none absolute -left-20 -top-20 h-[36rem] w-[36rem] rounded-full bg-[var(--accent-primary,#C1234F)]/[0.05] blur-[140px]"
        animate={reduced ? undefined : { x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-20 -right-20 h-[36rem] w-[36rem] rounded-full bg-[var(--accent-secondary,#E03365)]/[0.04] blur-[140px]"
        animate={reduced ? undefined : { x: [0, -30, 0], y: [0, -40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute left-1/3 top-1/2 h-[26rem] w-[26rem] -translate-y-1/2 rounded-full bg-white/[0.02] blur-[130px]"
        animate={reduced ? undefined : { scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Brand Header */}
      <div className="z-10 flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-[var(--inset-radius)] bg-white/[0.04] border border-[var(--panel-border)] shadow-lg">
          <BrandMark size={28} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white font-mono">ETHONE</span>
          <span className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-primary,#C1234F)]">
            OS
          </span>
        </div>
      </div>

      {/* Main Hero Content */}
      <div className="z-10 max-w-lg space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-white/[0.03] px-3.5 py-1 text-[11px] font-medium tracking-wide text-zinc-300 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent-primary,#C1234F)]" />
          <span>{i18n("loginHeroBadge", "Environnement personnel unifié")}</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl xl:text-6xl leading-[1.1]">
          {i18n("loginHeroHeadlineLine1", "Votre espace,")} <br />
          <span className="bg-gradient-to-r from-[var(--accent-primary,#C1234F)] via-[#E03365] to-rose-400 bg-clip-text text-transparent">
            {i18n("loginHeroHeadlineLine2", "réinventé pour vous.")}
          </span>
        </h1>

        <p className="text-base text-zinc-400 font-light leading-relaxed">
          {i18n("loginHeroDescription", "Notes, tâches, calendrier, finances, musique, fichiers et IA locale réunis dans un système fluide et instantané.")}
        </p>

        <div className="grid grid-cols-3 gap-2.5 pt-2">
          {HERO_FEATURES.map(({ icon: Icon, labelKey, fallback }) => (
            <div
              key={labelKey}
              className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.03] px-3 py-2.5 backdrop-blur-md"
            >
              <Icon className="h-4 w-4 shrink-0 text-[var(--accent-primary,#C1234F)]" />
              <span className="truncate text-[12.5px] font-medium text-zinc-300">{i18n(labelKey, fallback)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* System Status Pill */}
      <div className="z-10 flex items-center gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_5px_var(--glow-color)]" />
          </span>
          <span className="font-mono text-[11px] text-zinc-300">{i18n("loginStatusOperational", "ETHONE Cloud & IA opérationnels")}</span>
        </div>
      </div>
    </div>
  );
}
