"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { choreography, revealUp } from "@/lib/motion-variants";
import { EASE_SNAP, SPRING_SWAP } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import BrandMark from "@/components/BrandMark";
import LightBorder from "@/components/ui/LightBorder";
import { Check } from "@/components/icons/ph";

interface AuthCardShellProps {
  /** Replaces the brand mark inside the orb (e.g. a shield on MFA). */
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Rendered under the card, outside the glass (mode switch, back link). */
  below?: ReactNode;
  /** Orb turns into a check and the light switches to --success. */
  success?: boolean;
  /** Each new non-empty value shakes the card once (pass the error string). */
  shakeKey?: string | null;
}

/** Shared focal composition for every auth screen: a brand orb with a
 * turning ring, an animated headline, then the card with the travelling
 * light border and a height that glides between steps. */
export default function AuthCardShell({ icon, title, subtitle, children, below, success, shakeKey }: AuthCardShellProps) {
  const { reduced } = useMotionPref();
  const shake = useAnimationControls();

  useEffect(() => {
    if (!shakeKey || reduced) return;
    shake.start({ x: [0, -10, 9, -6, 3, 0], transition: { duration: 0.42, ease: "easeOut" } });
  }, [shakeKey, reduced, shake]);

  const light = success ? "--success" : "--accent-primary";

  return (
    <motion.div
      variants={choreography}
      initial={reduced ? "animate" : "initial"}
      animate="animate"
      className="flex w-full max-w-[480px] flex-col items-center 2xl:max-w-[540px]"
    >
      {/* Brand orb */}
      <motion.div
        variants={{
          initial: { opacity: 0, scale: 0.6, filter: "blur(10px)" },
          animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE_SNAP } },
        }}
        className="relative mb-6 h-20 w-20 2xl:mb-8 2xl:h-24 2xl:w-24"
      >
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(from 0deg, transparent 0deg, var(${light}) 90deg, transparent 200deg, color-mix(in srgb, var(${light}) 45%, transparent) 290deg, transparent 360deg)` }}
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: success ? 1.6 : 5, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-[2px] flex items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--bg-card,var(--bg-main))]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={success ? "ok" : "brand"}
              initial={{ opacity: 0, scale: 0.4, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.4, rotate: 45 }}
              transition={SPRING_SWAP}
              className="flex items-center justify-center"
            >
              {success ? <Check className="h-10 w-10 text-[var(--success)]" /> : icon ?? <BrandMark size={40} />}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Headline — re-reveals whenever the step changes */}
      <motion.div variants={revealUp} className="mb-7 min-h-[5rem] w-full px-2 text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={title + (subtitle ?? "")} variants={revealUp} initial="initial" animate="animate" exit="exit">
            <h1 className="text-balance text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.6rem] 2xl:text-[3rem]">
              {title}
            </h1>
            {subtitle && (
              <p className="mx-auto mt-3 max-w-[36ch] text-pretty text-base leading-relaxed text-[var(--text-muted)] 2xl:text-lg">{subtitle}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Card */}
      <motion.div variants={revealUp} className="w-full">
        <motion.div animate={shake}>
          <LightBorder light={light} className="shadow-[var(--panel-shadow)]" innerClassName="backdrop-blur-2xl">
            <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[var(--text-primary)]/25 to-transparent" />
            <AutoHeight reduced={reduced}>
              <div className="relative p-6 sm:p-8 2xl:p-10">{children}</div>
            </AutoHeight>
          </LightBorder>
        </motion.div>
      </motion.div>

      {below && (
        <motion.div variants={revealUp} className="mt-7 w-full text-center text-[15px]">
          {below}
        </motion.div>
      )}
    </motion.div>
  );
}

/** Animates its own height to whatever its content measures, so step swaps
 * glide instead of jumping. */
function AutoHeight({ children, reduced }: { children: ReactNode; reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={reduced ? { duration: 0 } : { duration: 0.4, ease: EASE_SNAP }}
      className="overflow-hidden"
    >
      <div ref={ref}>{children}</div>
    </motion.div>
  );
}
