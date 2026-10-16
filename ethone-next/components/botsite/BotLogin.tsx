"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { signInWithOAuth } from "@/lib/auth";
import { markLoginEntry } from "@/lib/login-entry";
import { EASE_SNAP } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { LanguageSelect } from "./BotLanding";
import { BOT_LANG_KEY, detectBotLang, type BotLang } from "./botLandingI18n";

const DASHBOARD_URL = "/discord";
const THEME_KEY = "ethone-bot-login-theme";

const COPY: Record<BotLang, { badge: string; title: string; text: string; back: string; cardTitle: string; cardText: string; cta: string; loading: string; error: string; language: string; theme: string }> = {
  fr: {
    badge: "Accès sécurisé",
    title: "Configurer Etho, serveur par serveur.",
    text: "La connexion Discord sert uniquement à identifier ton compte et les serveurs que tu peux réellement gérer.",
    back: "Retour à l'accueil",
    cardTitle: "Connexion",
    cardText: "Ouvre ton espace Etho avec Discord.",
    cta: "Se connecter avec Discord",
    loading: "Redirection vers Discord…",
    error: "La connexion n'a pas pu démarrer. Réessaie.",
    language: "Langue",
    theme: "Changer de thème",
  },
  en: {
    badge: "Secure access",
    title: "Set up Etho, server by server.",
    text: "Discord sign-in is only used to identify your account and the servers you can actually manage.",
    back: "Back to home",
    cardTitle: "Sign in",
    cardText: "Open your Etho space with Discord.",
    cta: "Sign in with Discord",
    loading: "Redirecting to Discord…",
    error: "Sign-in could not start. Try again.",
    language: "Language",
    theme: "Toggle theme",
  },
  es: {
    badge: "Acceso seguro",
    title: "Configura Etho, servidor por servidor.",
    text: "La conexión con Discord solo sirve para identificar tu cuenta y los servidores que realmente puedes gestionar.",
    back: "Volver al inicio",
    cardTitle: "Conexión",
    cardText: "Abre tu espacio Etho con Discord.",
    cta: "Conectarse con Discord",
    loading: "Redirigiendo a Discord…",
    error: "No se pudo iniciar la conexión. Inténtalo de nuevo.",
    language: "Idioma",
    theme: "Cambiar tema",
  },
  de: {
    badge: "Sicherer Zugang",
    title: "Etho einrichten, Server für Server.",
    text: "Die Discord-Anmeldung dient nur dazu, dein Konto und die Server zu erkennen, die du wirklich verwalten kannst.",
    back: "Zurück zur Startseite",
    cardTitle: "Anmeldung",
    cardText: "Öffne deinen Etho-Bereich mit Discord.",
    cta: "Mit Discord anmelden",
    loading: "Weiterleitung zu Discord…",
    error: "Die Anmeldung konnte nicht starten. Versuche es erneut.",
    language: "Sprache",
    theme: "Design wechseln",
  },
};

function DiscordGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function BotLogin() {
  const router = useRouter();
  const { reduced } = useMotionPref();
  const [lang, setLang] = useState<BotLang>("fr");
  const [light, setLight] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const c = COPY[lang];

  useEffect(() => {
    setLang(detectBotLang());
    try {
      setLight(localStorage.getItem(THEME_KEY) === "light");
    } catch {}
    void supabase.auth.getSession().then(({ data }) => {
      const hasDiscord =
        localStorage.getItem("ethone:connected:discord") === "true" ||
        localStorage.getItem("ethone:discord:profile") != null ||
        data.session?.user?.app_metadata?.provider === "discord";
      if (data.session && hasDiscord) router.replace(DASHBOARD_URL);
      else setChecking(false);
    }).catch(() => setChecking(false));
  }, [router]);

  const changeLang = (l: BotLang) => {
    setLang(l);
    try {
      localStorage.setItem(BOT_LANG_KEY, l);
    } catch {}
  };

  const toggleTheme = () => {
    setLight((v) => {
      try {
        localStorage.setItem(THEME_KEY, v ? "dark" : "light");
      } catch {}
      return !v;
    });
  };

  const connect = async () => {
    setPending(true);
    setFailed(false);
    try {
      markLoginEntry("bot");
      const { ok, url } = await signInWithOAuth("discord", `${window.location.origin}${DASHBOARD_URL}`);
      if (ok && url) {
        window.location.href = url;
        return;
      }
    } catch {}
    setPending(false);
    setFailed(true);
  };

  const t = light
    ? { page: "bg-[#f5f7f8] text-zinc-900", muted: "text-zinc-500", line: "border-zinc-200", card: "border-zinc-200 bg-white shadow-[0_20px_50px_-30px_rgba(0,0,0,0.25)]", chip: "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100" }
    : { page: "bg-[#07080d] text-white", muted: "text-zinc-400", line: "border-white/[0.07]", card: "border-white/[0.08] bg-white/[0.03] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]", chip: "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]" };

  const enter = (delay: number) =>
    reduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: EASE_SNAP, delay } };

  return (
    <div className={`flex min-h-dvh flex-col ${t.page} transition-colors duration-300`}>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 sm:px-8">
        <header className={`flex items-center justify-between border-b py-5 ${t.line}`}>
          <a href="/bot" className="flex items-center gap-2.5">
            <Image src="/icons/ethone-icon-192.png" alt="Etho" width={32} height={32} unoptimized className="h-8 w-8 rounded-xl ring-1 ring-white/10" />
            <span className="text-sm font-bold tracking-tight">Etho</span>
          </a>
          <div className="flex items-center gap-2">
            <LanguageSelect lang={lang} onChange={changeLang} label={c.language} />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={c.theme}
              title={c.theme}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border transition-colors ${t.chip}`}
            >
              {light ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <main className="flex flex-1 items-center py-16">
          <div className="grid w-full grid-cols-1 items-center gap-10 md:grid-cols-[1.2fr_1fr] md:gap-16">
            <div>
              <motion.p {...enter(0)} className="flex items-center gap-1.5 text-xs font-semibold text-[#92C8D2]">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.9-4.9 1.4 1.4-6.3 6.3z" />
                </svg>
                {c.badge}
              </motion.p>
              <motion.h1 {...enter(0.05)} className="mt-4 max-w-md text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
                {c.title}
              </motion.h1>
              <motion.p {...enter(0.1)} className={`mt-5 max-w-md text-sm leading-relaxed ${t.muted}`}>
                {c.text}
              </motion.p>
              <motion.a {...enter(0.15)} href="/bot" className={`mt-6 inline-flex items-center gap-1.5 text-xs font-medium ${t.muted} transition-colors hover:text-[#92C8D2]`}>
                <span aria-hidden="true">←</span> {c.back}
              </motion.a>
            </div>

            <motion.div {...enter(0.12)} className={`rounded-2xl border p-5 ${t.card}`}>
              <p className="text-sm font-semibold">{c.cardTitle}</p>
              <p className={`mt-1.5 text-xs ${t.muted}`}>{c.cardText}</p>
              <div className={`my-5 border-t ${t.line}`} />
              <button
                type="button"
                onClick={connect}
                disabled={pending || checking}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#92C8D2] text-sm font-bold text-[#07080d] transition-[transform,filter] duration-150 hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
              >
                <DiscordGlyph className="h-4 w-4" />
                {pending ? c.loading : c.cta}
              </button>
              {failed && <p className="mt-3 text-xs text-red-400">{c.error}</p>}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
