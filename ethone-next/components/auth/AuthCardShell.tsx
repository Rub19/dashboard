"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { choreography, revealUp } from "@/lib/motion-variants";
import { EASE_SNAP, SPRING_SWAP } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import BrandMark from "@/components/BrandMark";
import LightBorder from "@/components/ui/LightBorder";
import { Icon } from "@/lib/icons";

interface AuthCardShellProps {
  /** Replaces the brand mark in the header tile (e.g. a shield on MFA). */
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Rendered under the card, outside the glass (mode switch, back link). */
  below?: ReactNode;
  /** Header tile turns into a check and the border light switches to --success. */
  success?: boolean;
  /** Each new non-empty value shakes the card once (pass the error string). */
  shakeKey?: string | null;
}

/** The auth card: icon tile + step headline, then the form in a glass
 * surface with a travelling border light and a height that glides between steps. */
export default function AuthCardShell({ icon, title, subtitle, children, below, success, shakeKey }: AuthCardShellProps) {
  const { reduced } = useMotionPref();
  const shake = useAnimationControls();

  useEffect(() => {
    if (!shakeKey || reduced) return;
    shake.start({ x: [0, -10, 9, -6, 3, 0], transition: { duration: 0.42, ease: "easeOut" } });
  }, [shakeKey, reduced, shake]);

  return (
    <motion.div
      variants={choreography}
      initial={reduced ? "animate" : "initial"}
      animate="animate"
      className="w-full max-w-[440px] 2xl:max-w-[460px]"
    >
      <motion.div variants={revealUp} className="relative">
        {/* Grounding: soft contact shadow below, faint light pooled behind */}
        <div aria-hidden className="pointer-events-none absolute -bottom-12 left-1/2 h-24 w-[85%] -translate-x-1/2" style={{ background: "radial-gradient(closest-side, rgb(0 0 0 / 0.45), transparent)" }} />
        <div aria-hidden className="pointer-events-none absolute -inset-x-16 -inset-y-12" style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--accent-primary) 7%, transparent), transparent)" }} />
        <motion.div animate={shake} className="relative">
          <LightBorder
            light={success ? "--success" : "--accent-primary"}
            speed={9}
            className="shadow-[0_40px_90px_-40px_rgb(0_0_0/0.75),0_12px_30px_-18px_rgb(0_0_0/0.5)]"
            innerClassName="backdrop-blur-2xl"
          >
            <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[var(--text-primary)]/30 to-transparent" />

            {/* Header */}
            <div className="flex items-start gap-4 px-6 pb-5 pt-6 sm:px-8 sm:pt-7">
              <div
                className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[var(--inset-radius)] border transition-colors duration-500"
                style={{
                  borderColor: success ? "color-mix(in srgb, var(--success) 40%, transparent)" : "var(--panel-border)",
                  background: success ? "color-mix(in srgb, var(--success) 12%, transparent)" : "color-mix(in srgb, var(--text-primary) 4%, transparent)",
                }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={success ? "ok" : "brand"}
                    initial={{ opacity: 0, scale: 0.4, rotate: -45 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.4, rotate: 45 }}
                    transition={SPRING_SWAP}
                    className="grid place-items-center"
                  >
                    {success ? <Icon name="check" pack="lucide" className="h-6 w-6 !text-[var(--success)]" /> : icon ?? <BrandMark size={24} />}
                  </motion.span>
                </AnimatePresence>
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={title + (subtitle ?? "")} variants={revealUp} initial="initial" animate="animate" exit="exit">
                    <h1 className="text-balance text-[1.6rem] font-semibold leading-tight tracking-[-0.025em] text-[var(--text-primary)] 2xl:text-[1.8rem]">
                      {title}
                    </h1>
                    {subtitle && <p className="mt-1.5 text-pretty text-[15px] leading-relaxed text-[var(--text-muted)]">{subtitle}</p>}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div aria-hidden className="mx-6 h-px bg-gradient-to-r from-transparent via-[var(--panel-border)] to-transparent sm:mx-8" />

            <AutoHeight reduced={reduced}>
              <div className="relative px-6 pb-7 pt-5 sm:px-8">{children}</div>
            </AutoHeight>
          </LightBorder>
        </motion.div>
      </motion.div>

      {below && (
        <motion.div variants={revealUp} className="mt-6 w-full text-center text-[15px]">
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
