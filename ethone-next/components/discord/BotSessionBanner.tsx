"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SPRING_LAYOUT } from "@/lib/ease";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

/**
 * Les pages Discord parlent au bot avec son propre cookie de session (7 jours), distinct de la connexion au site.
 * Quand il expire, chaque requête reçoit 401 et les pages se croyaient « hors ligne ». Ce bandeau le détecte une
 * fois et propose de se reconnecter. La page /discord gère déjà ce cas elle-même.
 */
export default function BotSessionBanner() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [expired, setExpired] = useState(false);
  const isHub = pathname === "/discord" || pathname === "/discord/";

  useEffect(() => {
    if (!BOT_API_URL || isHub) return;
    let cancelled = false;
    fetch(`${BOT_API_URL}/api/auth/me`, { credentials: "include" })
      .then((r) => {
        if (!cancelled) setExpired(r.status === 401);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isHub]);

  const loginHref =
    typeof window !== "undefined"
      ? `${BOT_API_URL}/api/auth/login?return_to=${encodeURIComponent(window.location.href)}`
      : "#";

  return (
    <AnimatePresence>
      {expired && !isHub && (
        <motion.div
          role="status"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
          transition={SPRING_LAYOUT}
          className="fixed left-1/2 top-3 z-[60] flex w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2.5 text-xs shadow-2xl backdrop-blur-[var(--panel-blur)]"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--warning)]" />
          <span className="min-w-0 flex-1 text-[var(--text-primary)]">
            Ta session avec le bot a expiré : les modules ne peuvent plus lire ni enregistrer.
          </span>
          <a
            href={loginHref}
            className="shrink-0 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 font-semibold text-[var(--accent-contrast)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.97]"
          >
            Se reconnecter
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
