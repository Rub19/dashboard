"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  animate,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import FlagIcon, { LANGUAGE_LABELS } from "@/components/FlagIcon";
import VersionPill from "@/components/layout/VersionPill";
import { EASE_SNAP, SPRING_MOUSE } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { BOT_COPY, BOT_LANGS, BOT_LANG_KEY, detectBotLang, type BotLang } from "./botLandingI18n";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const BOT_CLIENT_ID = "1545139931154878464";
const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const SUPPORT_URL = "https://discord.gg/WvEcyBuP45";
const DASHBOARD_URL = "/discord";

interface PublicCommand {
  name: string;
  description: string;
  category: string;
  subcommands: Array<{ name: string; description: string }>;
}

interface PublicStats {
  guilds: number;
  members: number;
  commands: number;
}

const STATIC_FALLBACK_COMMANDS: PublicCommand[] = [
  { name: "shield", description: "Active ou consulte l'état du bouclier Owner pour restaurer vos rôles en cas de raid.", category: "Sécurité", subcommands: [{ name: "status", description: "Affiche l'état du bouclier" }, { name: "toggle", description: "Active ou coupe le bouclier" }] },
  { name: "automod", description: "Configure les filtres automatiques contre le spam, les raids et les pings massifs.", category: "Sécurité", subcommands: [{ name: "rules", description: "Liste les règles actives" }, { name: "action", description: "Définit la sanction automatique" }] },
  { name: "spotify", description: "Contrôle la lecture Spotify et diffuse votre titre dans votre salon vocal Discord.", category: "Spotify", subcommands: [{ name: "vc", description: "Rejoint le salon et diffuse le titre" }, { name: "nowplaying", description: "Affiche le titre en cours" }, { name: "like", description: "Ajoute aux favoris Spotify" }] },
  { name: "lastfm", description: "Affiche vos statistiques d'écoute Last.fm et votre titre en direct.", category: "Fun", subcommands: [{ name: "nowplaying", description: "Titre en cours" }, { name: "recent", description: "Récents scrobbles" }, { name: "topartists", description: "Top artistes" }, { name: "taste", description: "Comparateur de goûts" }, { name: "login", description: "Associer son compte" }] },
  { name: "lyrics", description: "Recherche les paroles complètes d'un morceau en direct avec synchronisation.", category: "Fun", subcommands: [] },
  { name: "quote", description: "Génère un visuel de citation stylisé aux couleurs de Discord.", category: "Fun", subcommands: [] },
  { name: "image", description: "Recherche des visuels et images haute résolution sur DuckDuckGo.", category: "Fun", subcommands: [] },
  { name: "reverseimage", description: "Recherche d'image inversée sur Google Lens, Bing, TinEye et SauceNAO.", category: "Fun", subcommands: [] },
  { name: "play", description: "Joue un titre ou une playlist musicale dans le salon vocal actuel.", category: "Musique", subcommands: [] },
  { name: "volume", description: "Ajuste le volume de diffusion du bot de 1% à 150%.", category: "Musique", subcommands: [] },
  { name: "rank", description: "Affiche votre niveau actuel, votre carte d'expérience et votre rang sur le serveur.", category: "Économie", subcommands: [] },
  { name: "leaderboard", description: "Affiche le classement des membres les plus actifs en texte et en vocal.", category: "Économie", subcommands: [] },
  { name: "ban", description: "Bannit un utilisateur avec motif et purge des messages récents.", category: "Modération", subcommands: [] },
  { name: "timeout", description: "Exclut temporairement un membre pour une durée déterminée.", category: "Modération", subcommands: [] },
  { name: "clear", description: "Supprime rapidement un nombre défini de messages dans le salon.", category: "Modération", subcommands: [] },
];

function useLiveData() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [commands, setCommands] = useState<PublicCommand[]>(STATIC_FALLBACK_COMMANDS);

  useEffect(() => {
    if (!BOT_API_URL) return;
    let cancelled = false;
    fetch(`${BOT_API_URL}/api/public/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.guilds === "number") setStats(data as PublicStats);
      })
      .catch(() => {});
    fetch(`${BOT_API_URL}/api/public/commands`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data.commands) && data.commands.length > 0) {
          setCommands(data.commands as PublicCommand[]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, commands };
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const numberFr = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function DiscordGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.07.07 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.3 18.3 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.7 19.7 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.1.245.198.372.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.8 19.8 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function Reveal({
  children,
  delay = 0,
  className = "",
  y = 20,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const { reduced } = useMotionPref();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.7, ease: EASE_SNAP, delay }}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#92C8D2]">
      <span className="h-px w-6 bg-gradient-to-r from-transparent to-[#92C8D2]" />
      {children}
    </p>
  );
}

function CountUp({ value, fallback = "0" }: { value?: number; fallback?: string }) {
  const { reduced } = useMotionPref();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || typeof value !== "number") return;
    if (reduced) {
      el.textContent = numberFr(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.5,
      ease: EASE_SNAP,
      onUpdate: (v) => {
        el.textContent = numberFr(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, value, reduced]);

  return <span ref={ref}>{typeof value === "number" ? numberFr(reduced ? value : 0) : fallback}</span>;
}

function DiscordChatSimulator() {
  const [activeTab, setActiveTab] = useState<"shield" | "spotify" | "fun" | "welcome">("shield");
  const [isPlaying, setIsPlaying] = useState(true);
  const [liked, setLiked] = useState(false);

  return (
    <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0c0d14]/95 p-1 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-black/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-2 font-mono text-xs font-semibold text-zinc-400"># général</span>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
          {(
            [
              ["shield", "🛡️ Anti-Raid"],
              ["spotify", "🎵 Spotify"],
              ["fun", "🎉 Fun"],
              ["welcome", "👋 Bienvenue"],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                activeTab === tab
                  ? "bg-[#92C8D2]/20 text-[#92C8D2] shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[300px] p-5 text-left text-sm font-sans">
        <AnimatePresence mode="wait">
          {activeTab === "shield" && (
            <motion.div
              key="shield"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3 opacity-70">
                <div className="h-9 w-9 shrink-0 rounded-full bg-red-950/80 p-1 text-center font-bold text-red-300">
                  ⚠️
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-red-300">AttaquantRaid</span>
                    <span className="text-[11px] text-zinc-500">Aujourd&apos;hui à 21:04</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-300">
                    @everyone REJOIGNEZ FREE NITRO ICI http://scam-link-fake.gg !!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/ethone-icon-192.png"
                  alt="Etho"
                  className="h-9 w-9 shrink-0 rounded-full ring-1 ring-emerald-400/40"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white">Etho</span>
                    <span className="rounded bg-[#5865f2] px-1.5 py-0.5 text-[9px] font-bold text-white">
                      APP
                    </span>
                    <span className="text-[11px] text-zinc-500">Aujourd&apos;hui à 21:04 (0.2s)</span>
                  </div>

                  <div className="mt-2 rounded-xl border-l-4 border-emerald-400 bg-emerald-950/20 p-3.5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300">
                        🛡️ Anti-Raid · Sanction Immédiate
                      </span>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        0.2s réaction
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                      Attaque neutralisée. Membre expulsé, messages récents purgés, salons sécurisés. Bouclier
                      Owner actif. Aucun rôle compromis.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                        ✓ Rôles protégés
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                        ✓ Salons verrouillés
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "spotify" && (
            <motion.div
              key="spotify"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/ethone-icon-192.png"
                  alt="Etho"
                  className="h-9 w-9 shrink-0 rounded-full ring-1 ring-emerald-400/40"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white">Etho</span>
                    <span className="rounded bg-[#5865f2] px-1.5 py-0.5 text-[9px] font-bold text-white">
                      APP
                    </span>
                    <span className="font-mono text-xs text-zinc-400">/spotify nowplaying</span>
                  </div>

                  <div className="mt-2 rounded-xl border-l-4 border-[#1DB954] bg-[#121b15]/90 p-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-bold text-[#1DB954]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#1DB954]" />
                        En direct sur Spotify
                      </span>
                      <div className="flex items-end gap-1">
                        {[0.6, 1.2, 0.4, 0.9, 0.7].map((h, i) => (
                          <motion.span
                            key={i}
                            className="w-1 rounded-full bg-[#1DB954]"
                            animate={{ height: isPlaying ? [4, 16 * h, 6] : 4 }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black ring-1 ring-white/10">
                        <motion.div
                          animate={{ rotate: isPlaying ? 360 : 0 }}
                          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                          className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-tr from-neutral-900 to-neutral-700"
                        >
                          <span className="h-4 w-4 rounded-full bg-[#1DB954]" />
                        </motion.div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">Starboy</p>
                        <p className="truncate text-xs text-zinc-400">The Weeknd, Daft Punk</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="font-mono text-[10px] text-zinc-500">1:42</span>
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-[45%] rounded-full bg-[#1DB954]" />
                          </div>
                          <span className="font-mono text-[10px] text-zinc-500">3:50</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
                      <button
                        type="button"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                      >
                        {isPlaying ? "⏸ Pause" : "▶ Lecture"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLiked(!liked)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                          liked ? "bg-pink-500/20 text-pink-300" : "bg-white/10 text-zinc-300 hover:bg-white/20"
                        }`}
                      >
                        {liked ? "❤️ Liké" : "🤍 Like"}
                      </button>
                      <span className="rounded-lg bg-[#1DB954]/20 px-2.5 py-1 text-xs font-semibold text-[#1DB954]">
                        🔊 Diffuser en vocal (/spotify vc)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "fun" && (
            <motion.div
              key="fun"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/ethone-icon-192.png"
                  alt="Etho"
                  className="h-9 w-9 shrink-0 rounded-full ring-1 ring-purple-400/40"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white">Etho</span>
                    <span className="rounded bg-[#5865f2] px-1.5 py-0.5 text-[9px] font-bold text-white">
                      APP
                    </span>
                    <span className="font-mono text-xs text-zinc-400">/lyrics query:FE!N Travis Scott</span>
                  </div>

                  <div className="mt-2 rounded-xl border-l-4 border-[#a78bfa] bg-[#161224]/90 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#c084fc]">
                        🎵 Paroles · FE!N — Travis Scott feat. Playboi Carti
                      </span>
                      <span className="rounded bg-[#a78bfa]/20 px-2 py-0.5 text-[10px] font-bold text-[#c084fc]">
                        LRCLib 3:11
                      </span>
                    </div>
                    <div className="mt-3 max-h-24 overflow-hidden rounded-lg bg-black/40 p-3 font-mono text-xs leading-relaxed text-zinc-300">
                      <p className="text-zinc-500">Just come outside for the night (yeah)</p>
                      <p className="text-white">Take your time, get your light (yeah)</p>
                      <p className="text-[#c084fc]">Johnny Dang, huh-uh</p>
                      <p className="text-zinc-500">I been in this room for too long...</p>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-md bg-white/[0.08] px-2.5 py-1 text-xs font-semibold text-zinc-300">
                        📋 Copier les paroles
                      </span>
                      <span className="rounded-md bg-white/[0.08] px-2.5 py-1 text-xs font-semibold text-zinc-300">
                        🔍 Voir sur Genius
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/ethone-icon-192.png"
                  alt="Etho"
                  className="h-9 w-9 shrink-0 rounded-full ring-1 ring-cyan-400/40"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white">Etho</span>
                    <span className="rounded bg-[#5865f2] px-1.5 py-0.5 text-[9px] font-bold text-white">
                      APP
                    </span>
                    <span className="text-[11px] text-zinc-500">Arrivée d&apos;un nouveau membre</span>
                  </div>

                  <div className="mt-2 rounded-xl border-l-4 border-[#38bdf8] bg-[#0c1926]/90 p-4">
                    <p className="text-sm font-bold text-white">Bienvenue sur le serveur, Alex ! 🎉</p>
                    <p className="mt-1 text-xs text-zinc-300">
                      Tu es le <span className="font-semibold text-[#38bdf8]">1 428e membre</span>. Prends tes rôles dans le salon dédié et profite de la communauté.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-md bg-[#38bdf8]/20 px-2 py-0.5 text-[11px] font-bold text-[#38bdf8]">
                        @Membre
                      </span>
                      <span className="rounded-md bg-[#38bdf8]/20 px-2 py-0.5 text-[11px] font-bold text-[#38bdf8]">
                        @AccèsGénéral
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LanguageSelect({
  lang,
  onChange,
  label,
}: {
  lang: BotLang;
  onChange: (l: BotLang) => void;
  label: string;
}) {
  const { reduced } = useMotionPref();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setOpen(false);
      } else if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-label={`${label} : ${LANGUAGE_LABELS[lang]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] pl-2 pr-3 text-xs font-semibold uppercase text-zinc-200 outline-none transition-colors hover:border-white/25 hover:text-white"
      >
        <span className="relative h-5 w-5 overflow-hidden rounded-full ring-1 ring-white/10">
          <FlagIcon
            code={lang}
            className="absolute left-1/2 top-1/2 h-5 w-8 max-w-none -translate-x-1/2 -translate-y-1/2"
          />
        </span>
        {lang}
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={label}
            initial={reduced ? false : { opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: EASE_SNAP }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-44 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-[#0e0f18]/95 p-1.5 shadow-2xl backdrop-blur-xl"
          >
            {BOT_LANGS.map((l) => (
              <li key={l} role="option" aria-selected={l === lang}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(l);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold ${
                    l === lang ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <FlagIcon code={l} className="h-3.5 w-5" />
                  <span>{LANGUAGE_LABELS[l]}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function RadarSweep() {
  const { reduced } = useMotionPref();
  return (
    <div className="relative mx-auto mt-6 h-40 w-40">
      <svg viewBox="0 0 160 160" className="h-full w-full" aria-hidden="true">
        <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(146,200,210,0.08)" strokeWidth="1" />
        <circle cx="80" cy="80" r="50" fill="none" stroke="rgba(146,200,210,0.06)" strokeWidth="0.5" />
        <circle cx="80" cy="80" r="30" fill="none" stroke="rgba(146,200,210,0.04)" strokeWidth="0.5" />
        <line x1="80" y1="10" x2="80" y2="150" stroke="rgba(146,200,210,0.05)" strokeWidth="0.5" />
        <line x1="10" y1="80" x2="150" y2="80" stroke="rgba(146,200,210,0.05)" strokeWidth="0.5" />
      </svg>
      {!reduced && (
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 160 160" className="h-full w-full" aria-hidden="true">
            <line x1="80" y1="80" x2="80" y2="12" stroke="#92C8D2" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <defs>
              <linearGradient id="radarFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#92C8D2" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#92C8D2" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M80,80 L80,12 A68,68 0 0,1 127,30 Z" fill="url(#radarFade)" />
          </svg>
        </motion.div>
      )}
      <div className="absolute left-[35%] top-[25%] h-2 w-2 rounded-full bg-[#92C8D2]/60" />
      <div className="absolute left-[60%] top-[40%] h-1.5 w-1.5 rounded-full bg-[#92C8D2]/40" />
      <motion.div
        className="absolute left-[25%] top-[65%] h-2.5 w-2.5 rounded-full bg-red-500"
        animate={reduced ? {} : { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
}

function WaveformBars() {
  const { reduced } = useMotionPref();
  const heights = [28, 48, 20, 56, 36, 64, 24, 52, 32, 60, 18, 44, 40, 56, 22, 50, 30, 58, 26, 46, 38, 62, 16, 42];
  return (
    <div className="mt-8 flex items-end justify-center gap-[3px]">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-[5px] rounded-full bg-gradient-to-t from-[#92C8D2]/30 to-[#92C8D2]/80"
          style={{ height: reduced ? h : 8 }}
          animate={reduced ? {} : { height: [8, h, h * 0.4, h * 0.9, 8] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function SpotifyRipple() {
  const { reduced } = useMotionPref();
  return (
    <div className="relative mt-6 flex items-center justify-center">
      <div className="relative h-32 w-32">
        {!reduced &&
          [0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-[#1DB954]/30"
              initial={{ scale: 0.5, opacity: 0.6 }}
              animate={{ scale: [0.5, 1.4], opacity: [0.6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
            />
          ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1DB954] shadow-lg shadow-[#1DB954]/30">
            <svg viewBox="0 0 24 24" fill="white" className="h-8 w-8" aria-hidden="true">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381C8.28 5.92 15.24 6.182 19.38 8.94c.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3l-.158-.12z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURE_ICONS: Record<string, ReactNode> = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  ),
  tts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
    </svg>
  ),
  levels: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m7 16 4-8 4 4 4-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  snipe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  giveaways: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <path d="M20 12v10H4V12" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="7" width="20" height="5" rx="1" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z" />
    </svg>
  ),
  games: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <path d="M6 12h4m-2-2v4" strokeLinecap="round" />
      <circle cx="17" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="14" r="1" fill="currentColor" />
      <rect x="2" y="6" width="20" height="12" rx="4" />
    </svg>
  ),
  autoResponders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10h8" strokeLinecap="round" />
      <path d="M8 14h4" strokeLinecap="round" />
    </svg>
  ),
  reminders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  counters: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  reactionRoles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" />
      <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" strokeWidth="2" />
      <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" strokeWidth="2" />
    </svg>
  ),
  lyrics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  translation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <path d="M5 8l6 6" strokeLinecap="round" />
      <path d="M4 6h8" strokeLinecap="round" />
      <path d="M8 4v2" strokeLinecap="round" />
      <path d="m14 14 2 4 2-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 18h4" strokeLinecap="round" />
    </svg>
  ),
};

const FEATURE_KEYS = [
  "search", "tts", "levels", "snipe", "giveaways", "games",
  "autoResponders", "reminders", "counters", "reactionRoles", "lyrics", "translation",
] as const;

const PLATFORM_CONFIGS = [
  {
    key: "spotify" as const,
    color: "#1DB954",
    bgGlow: "rgba(29, 185, 84, 0.15)",
    borderGlow: "rgba(29, 185, 84, 0.4)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-[#1DB954]" aria-hidden="true">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381C8.28 5.92 15.24 6.182 19.38 8.94c.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3l-.158-.12z" />
      </svg>
    ),
  },
  {
    key: "lastfm" as const,
    color: "#D51007",
    bgGlow: "rgba(213, 16, 7, 0.15)",
    borderGlow: "rgba(213, 16, 7, 0.4)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-[#D51007]" aria-hidden="true">
        <path d="M10.59 13.07c-.36-1.07-.88-1.93-1.57-2.57-.69-.64-1.54-.97-2.56-.97-1.19 0-2.17.43-2.93 1.29-.76.86-1.14 1.99-1.14 3.39 0 1.45.39 2.62 1.18 3.5.79.88 1.78 1.32 2.97 1.32 1.22 0 2.21-.49 2.97-1.46.76-.98 1.25-2.3 1.47-3.97l.18-1.35c.34-2.6 1.11-4.57 2.31-5.91 1.2-1.34 2.82-2.01 4.87-2.01 1.83 0 3.29.56 4.39 1.68 1.1 1.12 1.65 2.58 1.65 4.38 0 1.4-.38 2.58-1.14 3.55-.76.97-1.78 1.55-3.06 1.74l-.44.06c-.46.06-.79-.04-.99-.3-.2-.26-.2-.61 0-1.06l.16-.36c.65-1.43.98-2.67.98-3.71 0-1.11-.32-2-.97-2.67-.65-.67-1.52-1-2.62-1-1.34 0-2.37.51-3.1 1.54-.73 1.02-1.2 2.45-1.4 4.29l-.27 2.19c-.31 2.37-.99 4.2-2.04 5.5-1.05 1.3-2.48 1.95-4.29 1.95-1.94 0-3.56-.7-4.85-2.09C.63 18.35 0 16.53 0 14.39c0-2.22.66-4.06 1.98-5.52C3.3 7.41 4.99 6.68 7.05 6.68c1.55 0 2.89.44 4.02 1.32 1.13.88 1.91 2.1 2.34 3.66l.24 1.41h-3.06z" />
      </svg>
    ),
  },
  {
    key: "soundcloud" as const,
    color: "#FF5500",
    bgGlow: "rgba(255, 85, 0, 0.15)",
    borderGlow: "rgba(255, 85, 0, 0.4)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-[#FF5500]" aria-hidden="true">
        <path d="M1.5 14.25v2.25h1.5v-2.25H1.5zm2.25-1.5v5.25h1.5v-5.25h-1.5zm2.25-2.25v9.75h1.5v-9.75H6zm2.25 1.5v6.75h1.5V12h-1.5zm2.25-3.75v14.25h1.5V8.25h-1.5zm7.34 2.25c-.47 0-.91.07-1.34.2v9.3h6.75c1.79 0 3.25-1.46 3.25-3.25s-1.46-3.25-3.25-3.25h-.41c-.42-1.74-1.99-3-3.84-3h-.16z" />
      </svg>
    ),
  },
  {
    key: "tiktok" as const,
    color: "#00F2FE",
    bgGlow: "rgba(0, 242, 254, 0.15)",
    borderGlow: "rgba(0, 242, 254, 0.4)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-[#00F2FE]" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.41a6.33 6.33 0 0 0-.85-.06A6.34 6.34 0 0 0 3.14 15.7a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.28 8.28 0 0 0 4.88 1.56V6.86a4.85 4.85 0 0 1-1.11-.17z" />
      </svg>
    ),
  },
  {
    key: "pinterest" as const,
    color: "#E60023",
    bgGlow: "rgba(230, 0, 35, 0.15)",
    borderGlow: "rgba(230, 0, 35, 0.4)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-[#E60023]" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.42 7.63 11.1-.11-.94-.2-2.39.04-3.42.22-.93 1.43-6.07 1.43-6.07s-.36-.73-.36-1.81c0-1.7 0.99-2.97 2.21-2.97 1.04 0 1.55.78 1.55 1.72 0 1.05-.67 2.62-1.02 4.07-.29 1.22.61 2.22 1.82 2.22 2.18 0 3.86-2.3 3.86-5.63 0-2.94-2.11-5-5.13-5-3.49 0-5.54 2.62-5.54 5.33 0 1.05.41 2.18.91 2.79.1.12.11.23.08.36-.09.38-.3 1.22-.34 1.39-.06.23-.19.28-.43.17-1.61-.75-2.61-3.1-2.61-4.99 0-4.06 2.95-7.79 8.51-7.79 4.47 0 7.94 3.18 7.94 7.44 0 4.44-2.8 8.01-6.68 8.01-1.3 0-2.53-.68-2.95-1.48l-.8 3.07c-.29 1.12-1.08 2.53-1.61 3.39A12.02 12.02 0 0 0 12 24c6.63 0 12-5.37 12-12S18.63 0 12 0z" />
      </svg>
    ),
  },
  {
    key: "youtube" as const,
    color: "#FF0000",
    bgGlow: "rgba(255, 0, 0, 0.15)",
    borderGlow: "rgba(255, 0, 0, 0.4)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-[#FF0000]" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    key: "twitch" as const,
    color: "#9146FF",
    bgGlow: "rgba(145, 70, 255, 0.15)",
    borderGlow: "rgba(145, 70, 255, 0.4)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-[#9146FF]" aria-hidden="true">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
    ),
  },
];

export default function BotLanding() {
  const { reduced } = useMotionPref();
  const { stats, commands } = useLiveData();
  const [lang, setLang] = useState<BotLang>("fr");
  const c = BOT_COPY[lang];
  const scrollRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const { scrollY, scrollYProgress } = useScroll({ container: scrollRef });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 12));

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, SPRING_MOUSE);
  const smy = useSpring(my, SPRING_MOUSE);
  const lightX = useTransform(smx, (v) => v * 35);
  const lightY = useTransform([smy, scrollY], ([a, b]: number[]) => a * 25 + b * 0.2);

  useEffect(() => {
    setLang(detectBotLang());
  }, []);

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, mx, my]);

  const changeLang = (l: BotLang) => {
    setLang(l);
    try {
      localStorage.setItem(BOT_LANG_KEY, l);
    } catch {}
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    commands.forEach((cmd) => {
      if (cmd.category) set.add(cmd.category);
    });
    return ["all", ...Array.from(set)];
  }, [commands]);

  const filteredCommands = useMemo(() => {
    const q = fold(query.trim());
    return commands.filter((cmd) => {
      if (selectedCategory !== "all" && cmd.category !== selectedCategory) return false;
      if (!q) return true;
      const sub = cmd.subcommands.map((s) => `${s.name} ${s.description}`).join(" ");
      return fold(`${cmd.name} ${cmd.description} ${cmd.category} ${sub}`).includes(q);
    });
  }, [commands, query, selectedCategory]);

  const copyCommand = (name: string) => {
    const text = `/${name}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCmd(name);
      setTimeout(() => setCopiedCmd((prev) => (prev === name ? null : prev)), 2000);
    }
  };

  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <div
      ref={scrollRef}
      className="relative h-dvh w-full overflow-x-hidden overflow-y-auto bg-[#07080d] text-zinc-200 antialiased selection:bg-[#92C8D2]/30"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[1200px] overflow-hidden">
        <motion.div
          className="absolute -inset-x-[30%] -top-[30%] bottom-0"
          style={reduced ? undefined : { x: lightX, y: lightY }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: [
                "radial-gradient(40% 30% at 50% 12%, rgba(146, 200, 210, 0.18), transparent)",
                "radial-gradient(28% 24% at 20% 35%, rgba(99, 102, 241, 0.14), transparent)",
                "radial-gradient(28% 24% at 80% 38%, rgba(16, 185, 129, 0.12), transparent)",
              ].join(","),
            }}
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#07080d]" />
      </div>

      <motion.header
        initial={reduced ? false : { y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_SNAP }}
        className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-all duration-300 ${
          scrolled ? "border-white/[0.08] bg-[#07080d]/85 py-3" : "border-transparent bg-transparent py-5"
        }`}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6">
          <a href="/bot" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/ethone-icon-192.png"
              alt="Etho Logo"
              className="h-8 w-8 rounded-xl ring-1 ring-white/10"
            />
            <span className="font-extrabold tracking-tight text-white">ETHO</span>
            <span className="rounded-md bg-[#92C8D2]/20 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[#92C8D2]">
              BOT
            </span>
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            <a
              href="#security"
              onClick={scrollToSection("security")}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              {c.nav.security}
            </a>
            <a
              href="#music"
              onClick={scrollToSection("music")}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              {c.nav.music}
            </a>
            <a
              href="#platforms"
              onClick={scrollToSection("platforms")}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              {c.nav.platforms}
            </a>
            <a
              href="#features"
              onClick={scrollToSection("features")}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              {c.nav.features}
            </a>
            <a
              href="#steps"
              onClick={scrollToSection("steps")}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              {c.nav.steps}
            </a>
            <a
              href="#commandes"
              onClick={scrollToSection("commandes")}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              {c.nav.commands}
            </a>
            <a
              href="#faq"
              onClick={scrollToSection("faq")}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              {c.nav.faq}
            </a>
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              {c.nav.support}
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={DASHBOARD_URL}
              className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] sm:inline-flex"
            >
              {c.nav.dashboard}
            </Link>
            <a
              href={INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-white via-zinc-100 to-white px-4 py-2 text-xs font-bold text-black shadow-lg shadow-white/10 transition-transform hover:scale-105"
            >
              <DiscordGlyph className="h-4 w-4" />
              {c.nav.invite}
            </a>
            <LanguageSelect lang={lang} onChange={changeLang} label={c.nav.language} />
            <button
              type="button"
              aria-label={menuOpen ? c.nav.closeMenu : c.nav.openMenu}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-zinc-300 md:hidden"
            >
              <span className="text-base">{menuOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/[0.06] bg-[#07080d]/95 px-6 py-4 md:hidden"
            >
              <div className="flex flex-col gap-3">
                <a href="#security" onClick={scrollToSection("security")} className="text-sm font-medium text-zinc-300">{c.nav.security}</a>
                <a href="#music" onClick={scrollToSection("music")} className="text-sm font-medium text-zinc-300">{c.nav.music}</a>
                <a href="#platforms" onClick={scrollToSection("platforms")} className="text-sm font-medium text-zinc-300">{c.nav.platforms}</a>
                <a href="#features" onClick={scrollToSection("features")} className="text-sm font-medium text-zinc-300">{c.nav.features}</a>
                <a href="#steps" onClick={scrollToSection("steps")} className="text-sm font-medium text-zinc-300">{c.nav.steps}</a>
                <a href="#commandes" onClick={scrollToSection("commandes")} className="text-sm font-medium text-zinc-300">{c.nav.commands}</a>
                <a href="#faq" onClick={scrollToSection("faq")} className="text-sm font-medium text-zinc-300">{c.nav.faq}</a>
                <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-zinc-300">{c.nav.support}</a>
                <Link href={DASHBOARD_URL} className="text-sm font-medium text-[#92C8D2]">{c.nav.dashboard}</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          className="absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-[#92C8D2] via-indigo-400 to-emerald-400"
          style={{ scaleX: reduced ? 0 : progress }}
        />
      </motion.header>

      <main className="relative z-10">
        <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12 md:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-[#92C8D2] backdrop-blur-md"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {c.hero.badge}
              </motion.div>

              <motion.h1
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
              >
                {c.hero.titlePart1}{" "}
                <span className="bg-gradient-to-r from-[#92C8D2] via-white to-[#92C8D2] bg-clip-text text-transparent">
                  {c.hero.titleHighlight}
                </span>
              </motion.h1>

              <motion.p
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="mt-6 text-base leading-relaxed text-zinc-400 sm:text-lg"
              >
                {c.hero.subtitle}
              </motion.p>

              <motion.div
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <a
                  href={INVITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-black shadow-xl shadow-white/10 transition-all hover:-translate-y-0.5 hover:bg-zinc-100"
                >
                  <DiscordGlyph className="h-5 w-5" />
                  {c.hero.addBtn}
                </a>
                <Link
                  href={DASHBOARD_URL}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08]"
                >
                  {c.hero.dashboardBtn}
                </Link>
              </motion.div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {c.hero.highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs font-semibold text-zinc-300"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>

            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <DiscordChatSimulator />
            </motion.div>
          </div>
        </section>

        {stats && typeof stats.guilds === "number" && stats.guilds > 0 && (
          <section className="mx-auto w-full max-w-6xl px-6 pb-16">
            <Reveal>
              <div className="grid grid-cols-3 divide-x divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
                <div className="p-6 text-center">
                  <p className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    <CountUp value={stats.guilds} />
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">Servers</p>
                </div>
                <div className="p-6 text-center">
                  <p className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    <CountUp value={stats.members} />
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">Members</p>
                </div>
                <div className="p-6 text-center">
                  <p className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    <CountUp value={commands.length} />
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">Commands</p>
                </div>
              </div>
            </Reveal>
          </section>
        )}

        <section id="security" className="mx-auto w-full max-w-6xl px-6 py-24 scroll-mt-20">
          <Reveal className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#92C8D2]/10 ring-1 ring-[#92C8D2]/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="#92C8D2" strokeWidth="1.5" className="h-7 w-7" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {c.security.titlePart1}{" "}
              <span className="bg-gradient-to-r from-[#92C8D2] to-white bg-clip-text text-transparent">
                {c.security.titleHighlight}
              </span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-400">{c.security.subtitle}</p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            <Reveal>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-7 transition-all hover:border-[#92C8D2]/30">
                <h3 className="text-lg font-bold text-[#92C8D2]">{c.security.filters.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.security.filters.desc}</p>
                <div className="relative mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-6">
                  <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                    <svg viewBox="0 0 200 100" className="h-full w-full opacity-20" fill="none" stroke="#92C8D2" strokeWidth="0.5" strokeDasharray="4 4">
                      <line x1="50" y1="20" x2="150" y2="20" />
                      <line x1="50" y1="80" x2="150" y2="80" />
                      <line x1="50" y1="20" x2="50" y2="80" />
                      <line x1="150" y1="20" x2="150" y2="80" />
                      <line x1="100" y1="20" x2="100" y2="80" />
                    </svg>
                  </div>
                  <span className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-[#92C8D2]/20 bg-[#92C8D2]/10 px-3 py-1.5 text-xs font-semibold text-[#92C8D2]">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true"><path d="M4 9h8l-1 5H5L4 9zm1-2l1-5h6l1 5H5z" /></svg>
                    {c.security.filters.chips.links}
                  </span>
                  <span className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-[#92C8D2]/20 bg-[#92C8D2]/10 px-3 py-1.5 text-xs font-semibold text-[#92C8D2]">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true"><circle cx="8" cy="8" r="6" /></svg>
                    {c.security.filters.chips.mentions}
                  </span>
                  <span className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-[#92C8D2]/20 bg-[#92C8D2]/10 px-3 py-1.5 text-xs font-semibold text-[#92C8D2]">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true"><path d="M2 2h12v12H2z" opacity="0.5" /><path d="M5 5h6v6H5z" /></svg>
                    {c.security.filters.chips.spoilers}
                  </span>
                  <span className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-[#92C8D2]/20 bg-[#92C8D2]/10 px-3 py-1.5 text-xs font-semibold text-[#92C8D2]">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true"><rect x="2" y="4" width="12" height="8" rx="1" /><path d="M6 8l4-2v4z" /></svg>
                    {c.security.filters.chips.invites}
                  </span>
                </div>
                <div className="mt-6 flex justify-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-xs text-zinc-500">+</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="group relative flex h-full flex-col items-center overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-7 transition-all hover:border-[#92C8D2]/30">
                <div className="mt-4 mb-4 flex h-24 w-24 items-center justify-center">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-[#92C8D2]/10 ring-1 ring-[#92C8D2]/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#92C8D2" strokeWidth="1.5" className="h-10 w-10" aria-hidden="true">
                      <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2z" />
                      <path d="M15 14l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5L11.5 17l2.5-1 1-2z" />
                    </svg>
                    <div className="absolute -inset-3 rounded-3xl border border-dashed border-[#92C8D2]/20" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-[#92C8D2]">{c.security.permissions.title}</h3>
                <p className="mt-2 text-center text-sm leading-relaxed text-zinc-400">{c.security.permissions.desc}</p>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-7 transition-all hover:border-[#92C8D2]/30">
                <h3 className="text-lg font-bold text-[#92C8D2]">{c.security.antiNuke.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.security.antiNuke.desc}</p>
                <RadarSweep />
                <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-widest text-[#92C8D2]/60">
                  {c.security.antiNuke.scanning}
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-7 transition-all hover:border-[#92C8D2]/30">
                <h3 className="text-lg font-bold text-[#92C8D2]">{c.security.antiRaid.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.security.antiRaid.desc}</p>
                <div className="mt-6 flex flex-1 items-center justify-center">
                  <div className="relative h-28 w-24">
                    <div className="absolute inset-0 rounded-xl border border-dashed border-[#92C8D2]/20 bg-[#92C8D2]/5" />
                    <div className="absolute inset-2 flex flex-col items-center justify-center gap-2 rounded-lg bg-[#0c0d14]">
                      <div className="h-8 w-8 rounded-full border border-[#92C8D2]/30 bg-[#92C8D2]/10" />
                      <div className="h-1 w-10 rounded-full bg-[#92C8D2]/20" />
                      <div className="h-1 w-8 rounded-full bg-[#92C8D2]/10" />
                    </div>
                    <motion.div
                      className="absolute inset-x-0 top-0 h-px bg-[#92C8D2]/40"
                      animate={reduced ? {} : { top: ["0%", "100%", "0%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                </div>
                <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-widest text-emerald-400/80">
                  {c.security.antiRaid.verified}
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.25} className="mt-10 flex justify-center">
            <a
              href="#commandes"
              onClick={scrollToSection("commandes")}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-[#92C8D2]" aria-hidden="true"><path d="M2 3h12v2H2zM2 7h8v2H2zM2 11h10v2H2z" /></svg>
              {c.security.moreBtn}
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
            </a>
          </Reveal>
        </section>

        <section id="music" className="mx-auto w-full max-w-6xl px-6 py-24 scroll-mt-20">
          <Reveal className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#92C8D2]/10 ring-1 ring-[#92C8D2]/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="#92C8D2" strokeWidth="1.5" className="h-7 w-7" aria-hidden="true">
                <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {c.music.titlePart1}{" "}
              <span className="bg-gradient-to-r from-[#92C8D2] to-white bg-clip-text text-transparent">
                {c.music.titleHighlight}
              </span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-400">{c.music.subtitle}</p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            <Reveal className="sm:row-span-2">
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-7 transition-all hover:border-[#92C8D2]/30">
                <h3 className="text-lg font-bold text-[#92C8D2]">{c.music.filters.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.music.filters.desc}</p>
                <div className="mt-auto">
                  <p className="mb-1 text-right text-xs font-bold text-[#92C8D2]/70">{c.music.filters.label8D}</p>
                  <WaveformBars />
                  <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    {c.music.filters.status}
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-7 transition-all hover:border-[#92C8D2]/30">
                <h3 className="text-lg font-bold text-[#92C8D2]">{c.music.queue.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.music.queue.desc}</p>
                <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.08] bg-black/30 p-3">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>1 / 24</span>
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-zinc-500" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800">
                      <svg viewBox="0 0 16 16" fill="white" className="h-4 w-4" aria-hidden="true"><path d="M6 4l6 4-6 4z" /></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">POWER <span className="font-normal text-zinc-400">Kanye West</span></p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-[65%] rounded-full bg-[#92C8D2]" />
                        </div>
                        <span className="font-mono text-[10px] text-zinc-500">4:52</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-[#92C8D2]/60">
                  {c.music.queue.nowPlaying}
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-7 transition-all hover:border-[#1DB954]/30">
                <h3 className="text-lg font-bold text-[#1DB954]">{c.music.spotify.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.music.spotify.desc}</p>
                <SpotifyRipple />
                <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-widest text-[#1DB954]/60">
                  {c.music.spotify.status}
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2} className="mt-10 flex justify-center">
            <a
              href="#commandes"
              onClick={scrollToSection("commandes")}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-[#92C8D2]" aria-hidden="true"><path d="M2 3h12v2H2zM2 7h8v2H2zM2 11h10v2H2z" /></svg>
              {c.music.moreBtn}
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
            </a>
          </Reveal>
        </section>

        <section id="platforms" className="mx-auto w-full max-w-6xl px-6 py-24 scroll-mt-20">
          <Reveal className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#92C8D2]/10 ring-1 ring-[#92C8D2]/20 shadow-lg shadow-[#92C8D2]/5">
              <svg viewBox="0 0 24 24" fill="none" stroke="#92C8D2" strokeWidth="1.5" className="h-7 w-7" aria-hidden="true">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {c.platforms.titlePart1}{" "}
              <span className="bg-gradient-to-r from-[#92C8D2] via-white to-[#92C8D2] bg-clip-text text-transparent">
                {c.platforms.titleHighlight}
              </span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-400">{c.platforms.subtitle}</p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PLATFORM_CONFIGS.map((plat, i) => {
              const data = c.platforms.cards[plat.key];
              return (
                <Reveal key={plat.key} delay={i * 0.05}>
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d14]/90 p-6 shadow-xl backdrop-blur-xl transition-all hover:bg-[#0f101a]"
                    style={{
                      boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                      style={{ background: plat.bgGlow }}
                    />
                    <div>
                      <div className="flex items-center justify-between">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-black/40 shadow-inner"
                          style={{ borderColor: plat.borderGlow }}
                        >
                          {plat.icon}
                        </div>
                        <span
                          className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            borderColor: plat.borderGlow,
                            color: plat.color,
                            backgroundColor: plat.bgGlow,
                          }}
                        >
                          {data.tag}
                        </span>
                      </div>

                      <h3 className="mt-4 text-base font-bold text-white group-hover:text-white">{data.name}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{data.desc}</p>
                    </div>

                    <div className="mt-5 border-t border-white/[0.06] pt-3 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-zinc-500">Intégration native</span>
                      <span className="font-bold text-zinc-300 group-hover:text-white transition-colors flex items-center gap-1">
                        Connecté
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: plat.color }} />
                      </span>
                    </div>
                  </motion.div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-6 py-24 scroll-mt-20">
          <Reveal className="text-center">
            <div className="mx-auto mb-6 flex items-center justify-center gap-3" aria-hidden="true">
              {FEATURE_KEYS.slice(0, 7).map((k, i) => (
                <motion.div
                  key={k}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-zinc-500 ring-1 ring-white/[0.08]"
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                >
                  {FEATURE_ICONS[k]}
                </motion.div>
              ))}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {c.features.titlePart1}{" "}
              <span className="bg-gradient-to-r from-[#92C8D2] to-white bg-clip-text text-transparent">
                {c.features.titleHighlight}
              </span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-400">{c.features.subtitle}</p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_KEYS.map((key, i) => {
              const item = c.features.items[key];
              return (
                <Reveal key={key} delay={i * 0.04}>
                  <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d14]/90 p-6 transition-all hover:border-[#92C8D2]/25 hover:bg-[#0f101a]">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#92C8D2]/10 text-[#92C8D2] ring-1 ring-[#92C8D2]/20">
                      {FEATURE_ICONS[key]}
                    </div>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{item.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section id="steps" className="mx-auto w-full max-w-6xl px-6 py-20 scroll-mt-20">
          <Reveal className="text-center">
            <Eyebrow>{c.steps.eyebrow}</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {c.steps.titlePart1}{" "}
              <span className="bg-gradient-to-r from-[#92C8D2] to-white bg-clip-text text-transparent">
                {c.steps.titleHighlight}
              </span>
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {c.steps.items.map((st, i) => (
              <Reveal key={st.step} delay={i * 0.1}>
                <div className="relative h-full rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-7 transition-all hover:border-white/20">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#92C8D2]/20 to-indigo-500/20 text-base font-extrabold text-[#92C8D2] ring-1 ring-[#92C8D2]/30">
                    {st.step}
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-white">{st.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{st.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="commandes" className="mx-auto w-full max-w-6xl px-6 py-20 scroll-mt-20">
          <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>{c.commands.eyebrow}</Eyebrow>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{c.commands.title}</h2>
              <p className="mt-2 text-zinc-400">{c.commands.subtitle}</p>
            </div>
            <div className="w-full sm:w-80">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={c.commands.search}
                className="h-11 w-full rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:border-[#92C8D2]/60 focus:bg-white/[0.06]"
              />
            </div>
          </Reveal>

          <div className="mt-8 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? "bg-[#92C8D2] text-black shadow-md shadow-[#92C8D2]/20"
                    : "border border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white"
                }`}
              >
                {cat === "all" ? c.commands.all : cat}
              </button>
            ))}
          </div>

          {filteredCommands.length === 0 && (
            <p className="mt-12 text-center text-sm text-zinc-500">{c.commands.empty}</p>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCommands.map((cmd) => (
              <div
                key={cmd.name}
                className="group relative rounded-2xl border border-white/[0.08] bg-[#0c0d15] p-5 transition-all hover:border-[#92C8D2]/30 hover:bg-[#0f101a]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-white">/{cmd.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                      {cmd.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyCommand(cmd.name)}
                      title={c.commands.copy}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {copiedCmd === cmd.name ? c.commands.copied : c.commands.copy}
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-zinc-400">{cmd.description}</p>

                {cmd.subcommands.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/[0.05] pt-3">
                    {cmd.subcommands.map((s) => (
                      <span
                        key={s.name}
                        title={s.description}
                        className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-zinc-400"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto w-full max-w-4xl px-6 py-20 scroll-mt-20">
          <Reveal className="text-center">
            <Eyebrow>{c.faq.eyebrow}</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{c.faq.title}</h2>
            <p className="mt-2 text-zinc-400">{c.faq.subtitle}</p>
          </Reveal>

          <div className="mt-12 space-y-4">
            {c.faq.items.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <Reveal key={item.q} delay={idx * 0.05}>
                  <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d15] transition-all hover:border-white/15">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-white"
                    >
                      <span>{item.q}</span>
                      <span className="ml-4 text-base text-zinc-400">{isOpen ? "−" : "+"}</span>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="border-t border-white/[0.06] px-5 py-4 text-xs leading-relaxed text-zinc-400"
                        >
                          {item.a}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-[#92C8D2]/30 bg-gradient-to-b from-[#0e1622] via-[#0c0f18] to-[#07080d] p-10 text-center sm:p-16">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(50% 60% at 50% 0%, rgba(146, 200, 210, 0.25), transparent 70%)",
                }}
              />
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/ethone-icon-192.png"
                  alt="Etho"
                  className="mx-auto h-16 w-16 rounded-2xl shadow-2xl ring-1 ring-white/20"
                />
                <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                  {c.cta.title}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                  {c.cta.subtitle}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <a
                    href={INVITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-black shadow-xl shadow-white/10 transition-transform hover:scale-105"
                  >
                    <DiscordGlyph className="h-5 w-5" />
                    {c.cta.addBtn}
                  </a>
                  <Link
                    href={DASHBOARD_URL}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/[0.08]"
                  >
                    {c.cta.dashboardBtn}
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.07] bg-black/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-zinc-500 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image src="/icons/ethone-icon-192.png" alt="" width={20} height={20} className="h-5 w-5 rounded-md opacity-80" />
            <p>© {new Date().getFullYear()} Etho · {c.footer.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href={DASHBOARD_URL} className="transition-colors hover:text-white">
              {c.footer.dashboard}
            </Link>
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              {c.footer.support}
            </a>
            <a href="/terms" className="transition-colors hover:text-white">
              {c.footer.terms}
            </a>
            <a href="/privacy" className="transition-colors hover:text-white">
              {c.footer.privacy}
            </a>
            <VersionPill />
          </div>
        </div>
      </footer>
    </div>
  );
}
