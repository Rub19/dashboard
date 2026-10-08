"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import BrandMark from "./BrandMark";

const EASE = [0.16, 1, 0.3, 1] as const;
const WORD = "ETHONE".split("");

/**
 * Écran de démarrage. Le logo se matérialise (échelle + flou), le nom arrive lettre par lettre, la barre suit les
 * vraies étapes du démarrage (progress) et le libellé de l'étape change en fondu. À la sortie (AnimatePresence dans
 * BootProvider), l'écran s'efface en s'agrandissant légèrement pour dévoiler l'app.
 */
export default function Loading({ message = "Initialisation", progress }: { message?: string; progress?: number }) {
  const reduced = useReducedMotion();
  const hasProgress = typeof progress === "number";
  const pct = hasProgress ? Math.min(100, Math.max(0, progress)) : 0;

  return (
    <motion.div
      data-boot-splash=""
      className="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center overflow-hidden bg-[var(--bg-main)]"
      role="status"
      aria-live="polite"
      aria-label={message}
      data-v8-boot
      exit={reduced ? { opacity: 0, transition: { duration: 0.2 } } : { opacity: 0, scale: 1.04, filter: "blur(8px)", transition: { duration: 0.42, ease: EASE } }}
    >
      {/* Halo d'accent derrière le logo : apparaît une fois, ne boucle pas. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-[60%] rounded-full"
        style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--accent-primary) 18%, transparent), transparent)" }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
      />

      <div className="relative flex flex-col items-center">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.82, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ type: "spring", bounce: 0, duration: 0.7 }}
          className="relative"
        >
          <BrandMark size={76} />
          {/* Reflet qui balaie le logo une seule fois. */}
          {!reduced && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 1.1, duration: 0.3 }}
            >
              <motion.span
                className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                initial={{ x: "0%" }}
                animate={{ x: "320%" }}
                transition={{ delay: 0.45, duration: 0.8, ease: EASE }}
              />
            </motion.span>
          )}
        </motion.div>

        <div className="mt-6 flex items-center gap-2.5">
          <span className="flex text-[28px] font-semibold leading-none tracking-[-0.02em] text-[var(--text-primary)]" aria-label="ETHONE">
            {WORD.map((ch, i) => (
              <motion.span
                key={i}
                aria-hidden
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.18 + i * 0.045, duration: 0.5, ease: EASE }}
              >
                {ch}
              </motion.span>
            ))}
          </span>
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55, type: "spring", bounce: 0, duration: 0.45 }}
            className="rounded-md border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--text-muted)]"
          >
            OS
          </motion.span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45, ease: EASE }}
          className="mt-9 flex w-52 flex-col items-center gap-3"
        >
          <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-[var(--text-primary)]/10">
            {hasProgress ? (
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-primary)] shadow-[0_0_12px_var(--accent-primary)]"
                initial={{ width: "0%" }}
                animate={{ width: `${pct}%` }}
                // Ressort sans rebond : la barre rattrape chaque étape en douceur au lieu de sauter.
                transition={{ type: "spring", stiffness: 90, damping: 22, mass: 0.8 }}
              />
            ) : (
              <motion.div
                className="absolute inset-y-0 w-1/3 rounded-full bg-[var(--accent-primary)]"
                initial={{ x: "-110%" }}
                animate={{ x: "320%" }}
                transition={{ repeat: Infinity, duration: 1.3, ease: "easeInOut" }}
              />
            )}
          </div>
          <div className="relative h-4 w-full">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={message}
                initial={{ opacity: 0, y: 5, filter: "blur(3px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -5, filter: "blur(3px)" }}
                transition={{ duration: 0.25, ease: EASE }}
                className="absolute inset-x-0 text-center text-xs text-[var(--text-muted)]"
              >
                {message}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
