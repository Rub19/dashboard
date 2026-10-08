"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { SPRING_LAYOUT } from "@/lib/ease";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
/** Au-delà, on affiche la page même sans réponse du bot (bot éteint, réseau lent) : chaque module gère ce cas. */
const CHECK_TIMEOUT_MS = 2500;

type State = "checking" | "ok" | "expired";

/**
 * Les pages Discord parlent au bot avec sa propre session (cookie de 7 jours), distincte de la connexion au site.
 * Si elle a expiré, toutes les requêtes reçoivent 401 : au lieu d'afficher des modules vides, on demande tout de
 * suite de se reconnecter avec Discord, puis on revient sur la page ouverte.
 */
export default function BotSessionGate({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<State>(BOT_API_URL ? "checking" : "ok");

  useEffect(() => {
    if (!BOT_API_URL) return;
    let cancelled = false;
    const timer = window.setTimeout(() => !cancelled && setState((s) => (s === "checking" ? "ok" : s)), CHECK_TIMEOUT_MS);
    fetch(`${BOT_API_URL}/api/auth/me`, { credentials: "include" })
      .then((r) => !cancelled && setState(r.status === 401 ? "expired" : "ok"))
      .catch(() => !cancelled && setState("ok"));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (state === "checking") return <div className="min-h-screen bg-[var(--bg-main)]" aria-busy="true" />;
  if (state === "ok") return <>{children}</>;

  const loginHref = `${BOT_API_URL}/api/auth/login?return_to=${encodeURIComponent(window.location.href)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] px-4">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={SPRING_LAYOUT}
        className="w-full max-w-sm rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8 text-center shadow-2xl backdrop-blur-[var(--panel-blur)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bot-icons/a_logo.gif" alt="" width={56} height={56} className="mx-auto mb-5 h-14 w-14 rounded-2xl" />
        <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Connecte-toi avec Discord</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          Ta session avec le bot a expiré (elle dure 7 jours). Reconnecte-toi pour gérer tes serveurs ; tu reviendras
          ensuite sur cette page.
        </p>
        <a
          href={loginHref}
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#5865F2] px-4 py-3 text-sm font-semibold text-white transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98]"
        >
          Se connecter avec Discord
        </a>
        <Link
          href="/"
          className="mt-3 inline-block text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          Retour à ETHONE
        </Link>
      </motion.div>
    </main>
  );
}
