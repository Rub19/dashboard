"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { hapticMediumImpact } from "@/lib/haptics";

export default function PrivacyShield({ children }: { children: ReactNode }) {
  const i18n = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [taps, setTaps] = useState(0);

  useEffect(() => {
    function onTouch(e: TouchEvent) {
      if (e.touches.length !== 2 && e.changedTouches.length !== 2) return;
      const now = Date.now();
      if (now - lastTap > 500) {
        setTaps(1);
        setLastTap(now);
      } else {
        const nextTaps = taps + 1;
        if (nextTaps >= 2) {
          hapticMediumImpact();
          setEnabled((v) => !v);
          setTaps(0);
          setLastTap(0);
        } else {
          setTaps(nextTaps);
          setLastTap(now);
        }
      }
    }

    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => window.removeEventListener("touchstart", onTouch);
  }, [lastTap, taps]);

  return (
    <>
      {children}
      <AnimatePresence>
        {enabled && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-[14px]"
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
                {i18n("privacyShield") || "Mode discret activé"}
              </div>
            </motion.div>
            <button
              type="button"
              onClick={() => setEnabled(false)}
              className="fixed right-4 top-4 z-[101] rounded-full bg-white/10 p-2 text-white/70 backdrop-blur-md"
              aria-label={i18n("disablePrivacyShield")}
            >
              ✕
            </button>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
