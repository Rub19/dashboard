"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { choreography, revealUp } from "@/lib/motion-variants";
import { EASE_SNAP, SPRING_SWAP } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import BrandMark from "@/components/BrandMark";
import { Check } from "@/components/icons/ph";
import { cn } from "@/lib/utils";

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
  className?: string;
}

const tint = (token: string, pct: number) => `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;

/** Shared focal composition for every auth screen: a living brand orb, an
 * animated headline, then a glass card with a travelling light on its border,
 * a cursor spotlight and height that glides between steps. */
export default function AuthCardShell({ icon, title, subtitle, children, below, success, shakeKey, className }: AuthCardShellProps) {
  const { reduced } = useMotionPref();
  const shake = useAnimationControls();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shakeKey || reduced) return;
    shake.start({ x: [0, -9, 8, -5, 3, 0], transition: { duration: 0.42, ease: "easeOut" } });
  }, [shakeKey, reduced, shake]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const light = success ? "--success" : "--accent-primary";

  return (
    <motion.div
      variants={choreography}
      initial={reduced ? "animate" : "initial"}
      animate="animate"
      className="flex w-full max-w-[420px] flex-col items-center"
    >
      {/* Brand orb */}
      <motion.div
        variants={{
          initial: { opacity: 0, scale: 0.6, filter: "blur(10px)" },
          animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE_SNAP } },
        }}
        className="relative mb-7 h-[72px] w-[72px]"
      >
        <motion.div
          aria-hidden
          className="absolute -inset-5 rounded-full blur-2xl transition-[background] duration-500"
          style={{ background: tint(light, 38) }}
          animate={reduced ? undefined : { opacity: [0.55, 1, 0.55], scale: [0.92, 1.05, 0.92] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(from 0deg, transparent 0deg, var(${light}) 90deg, transparent 200deg, ${tint(light, 50)} 290deg, transparent 360deg)` }}
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: success ? 1.6 : 5, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-[2px] flex items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--bg-card,var(--bg-main))] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={success ? "ok" : "brand"}
              initial={{ opacity: 0, scale: 0.4, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.4, rotate: 45 }}
              transition={SPRING_SWAP}
              className="flex items-center justify-center"
            >
              {success ? <Check className="h-8 w-8 text-[var(--success)]" /> : icon ?? <BrandMark size={34} />}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Headline — re-reveals whenever the step changes */}
      <motion.div variants={revealUp} className="mb-7 min-h-[4.5rem] w-full px-2 text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={title + (subtitle ?? "")} variants={revealUp} initial="initial" animate="animate" exit="exit">
            <h1 className="text-balance text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2rem]">
              {title}
            </h1>
            {subtitle && <p className="mx-auto mt-2 max-w-[34ch] text-pretty text-sm leading-relaxed text-[var(--text-muted)]">{subtitle}</p>}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Card */}
      <motion.div variants={revealUp} className="w-full">
        <motion.div animate={shake}>
          <div
            ref={cardRef}
            onPointerMove={onPointerMove}
            className="group/card relative overflow-hidden rounded-[calc(var(--panel-radius)+1px)] p-px shadow-[var(--panel-shadow)]"
            style={{ background: "var(--panel-border)" }}
          >
            {/* Travelling light along the border */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2"
              style={{ background: `conic-gradient(from 0deg, transparent 0deg 290deg, var(${light}) 345deg, transparent 360deg)` }}
              animate={reduced ? undefined : { rotate: 360 }}
              transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            />
            <div
              className={cn(
                "relative overflow-hidden rounded-[var(--panel-radius)] backdrop-blur-2xl",
                className,
              )}
              style={{ background: "color-mix(in srgb, var(--bg-card, var(--bg-main)) 92%, transparent)" }}
            >
              {/* Cursor spotlight */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
                style={{ background: `radial-gradient(380px circle at var(--mx, 50%) var(--my, 0%), ${tint("--accent-primary", 9)}, transparent 65%)` }}
              />
              {/* Top sheen */}
              <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--text-primary)]/25 to-transparent" />
              <AutoHeight reduced={reduced}>
                <div className="relative p-6 sm:p-8">{children}</div>
              </AutoHeight>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {below && (
        <motion.div variants={revealUp} className="mt-6 w-full text-center text-sm">
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
