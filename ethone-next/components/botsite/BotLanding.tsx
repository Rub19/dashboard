"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
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
import FlagIcon, { LANGUAGE_LABELS } from "@/components/FlagIcon";
import { EASE_SNAP, SPRING_MOUSE, SPRING_PILL } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { BOT_COPY, BOT_LANGS, BOT_LANG_KEY, detectBotLang, type BotCopy, type BotLang } from "./botLandingI18n";

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

const PARTNER_SERVERS = [
  { name: "Lofi Beats ☕", members: "14,820", tag: "Partenaire", icon: "☕" },
  { name: "Nexus Esport 🏆", members: "32,450", tag: "Vérifié", icon: "🏆" },
  { name: "Pixel Haven 🎮", members: "19,110", tag: "Communauté", icon: "🎮" },
  { name: "Vocal Lounge 🎙️", members: "8,940", tag: "Communauté", icon: "🎙️" },
  { name: "Studio 404 🎧", members: "24,670", tag: "Partenaire", icon: "🎧" },
  { name: "Midnight Devs 💻", members: "11,530", tag: "Vérifié", icon: "💻" },
  { name: "Anime Horizon 🌸", members: "45,200", tag: "Partenaire", icon: "🌸" },
  { name: "Chilled Guild ❄️", members: "16,800", tag: "Communauté", icon: "❄️" },
];

const STATIC_FALLBACK_COMMANDS: PublicCommand[] = [
  { name: "shield", description: "Active ou consulte l'état du bouclier Owner pour restaurer vos rôles en cas de raid.", category: "Sécurité", subcommands: [{ name: "status", description: "Affiche l'état du bouclier" }, { name: "toggle", description: "Active ou coupe le bouclier" }] },
  { name: "automod", description: "Configure les filtres automatiques contre le spam, les raids et les pings massifs.", category: "Sécurité", subcommands: [{ name: "rules", description: "Liste les règles actives" }, { name: "action", description: "Définit la sanction automatique" }] },
  { name: "spotify", description: "Contrôle la lecture Spotify et diffuse votre titre dans votre salon vocal Discord.", category: "Spotify", subcommands: [{ name: "vc", description: "Rejoint le salon et diffuse le titre" }, { name: "nowplaying", description: "Affiche le titre en cours" }, { name: "like", description: "Ajoute aux favoris Spotify" }] },
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
                    <span className="text-[11px] text-zinc-500">Aujourd'hui à 21:04</span>
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
                    <span className="text-[11px] text-zinc-500">Aujourd'hui à 21:04 (0.2s)</span>
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
                    <span className="text-[11px] text-zinc-500">Arrivée d'un nouveau membre</span>
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

  const [shieldActive, setShieldActive] = useState(true);
  const [automodActive, setAutomodActive] = useState(true);
  const [spotifyBridgeActive, setSpotifyBridgeActive] = useState(true);
  const [antiNukeActive, setAntiNukeActive] = useState(true);

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
              href="#bento"
              onClick={scrollToSection("bento")}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              {c.nav.features}
            </a>
            <a
              href="#steps"
              onClick={scrollToSection("steps")}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              Prise en main
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
            <a
              href={DASHBOARD_URL}
              className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] sm:inline-flex"
            >
              {c.nav.dashboard}
            </a>
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
                <a
                  href="#bento"
                  onClick={scrollToSection("bento")}
                  className="text-sm font-medium text-zinc-300"
                >
                  {c.nav.features}
                </a>
                <a
                  href="#steps"
                  onClick={scrollToSection("steps")}
                  className="text-sm font-medium text-zinc-300"
                >
                  Prise en main
                </a>
                <a
                  href="#commandes"
                  onClick={scrollToSection("commandes")}
                  className="text-sm font-medium text-zinc-300"
                >
                  {c.nav.commands}
                </a>
                <a
                  href="#faq"
                  onClick={scrollToSection("faq")}
                  className="text-sm font-medium text-zinc-300"
                >
                  {c.nav.faq}
                </a>
                <a
                  href={SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-zinc-300"
                >
                  {c.nav.support}
                </a>
                <a href={DASHBOARD_URL} className="text-sm font-medium text-[#92C8D2]">
                  {c.nav.dashboard}
                </a>
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
                {stats ? c.hero.badgeActive(stats.guilds, numberFr(stats.members)) : c.hero.badgeDefault}
              </motion.div>

              <motion.h1
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
              >
                Le bot Discord tout-en-un,{" "}
                <span className="bg-gradient-to-r from-[#92C8D2] via-white to-[#92C8D2] bg-clip-text text-transparent">
                  pensé pour ta communauté
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
                  {c.hero.add}
                </a>
                <a
                  href={DASHBOARD_URL}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08]"
                >
                  {c.hero.openDashboard}
                </a>
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

        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <Reveal>
            <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl sm:grid-cols-4 sm:divide-y-0">
              <div className="p-6 text-center">
                <p className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  <CountUp value={stats?.guilds} fallback="350+" />
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">
                  {stats && stats.guilds > 1 ? c.stats.servers[1] : c.stats.servers[0]}
                </p>
              </div>
              <div className="p-6 text-center">
                <p className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  <CountUp value={stats?.members} fallback="24.5k" />
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">{c.stats.members}</p>
              </div>
              <div className="p-6 text-center">
                <p className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  <CountUp value={commands.length} fallback="68+" />
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">{c.stats.commands}</p>
              </div>
              <div className="p-6 text-center">
                <p className="text-3xl font-extrabold tracking-tight text-emerald-400 sm:text-4xl">99.98%</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">{c.stats.uptime}</p>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="w-full overflow-hidden border-y border-white/[0.06] bg-black/30 py-6">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Serveurs & Communautés propulsés par Etho
          </p>
          <div className="flex w-max gap-8 animate-none">
            <div className="flex gap-8">
              {PARTNER_SERVERS.concat(PARTNER_SERVERS).map((srv, idx) => (
                <div
                  key={`${srv.name}-${idx}`}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2"
                >
                  <span className="text-xl">{srv.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{srv.name}</p>
                    <p className="text-[11px] text-zinc-400">
                      {srv.members} membres · <span className="text-[#92C8D2]">{srv.tag}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="bento" className="mx-auto w-full max-w-6xl px-6 py-24 scroll-mt-20">
          <Reveal className="text-center">
            <Eyebrow>{c.bento.eyebrow}</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{c.bento.title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-400">{c.bento.subtitle}</p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Reveal className="sm:col-span-2">
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d15] p-7 transition-all hover:border-[#92C8D2]/40">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#92C8D2]/10 px-3 py-1 text-xs font-bold text-[#92C8D2]">
                    {c.bento.cards.shield.tag}
                  </span>
                  <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">{c.bento.cards.shield.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.bento.cards.shield.desc}</p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Anti-Spam", automodActive, () => setAutomodActive(!automodActive)],
                    ["Bouclier Owner", shieldActive, () => setShieldActive(!shieldActive)],
                    ["Anti-Nuke", antiNukeActive, () => setAntiNukeActive(!antiNukeActive)],
                    ["Pont Spotify", spotifyBridgeActive, () => setSpotifyBridgeActive(!spotifyBridgeActive)],
                  ].map(([label, active, toggle]) => (
                    <button
                      key={label as string}
                      type="button"
                      onClick={toggle as () => void}
                      className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                        active
                          ? "border-emerald-500/40 bg-emerald-500/10 text-white"
                          : "border-white/10 bg-white/[0.02] text-zinc-400"
                      }`}
                    >
                      <span className="text-xs font-semibold">{label as string}</span>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-400" : "bg-zinc-600"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d15] p-7 transition-all hover:border-[#1DB954]/40">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#1DB954]/10 px-3 py-1 text-xs font-bold text-[#1DB954]">
                    {c.bento.cards.spotify.tag}
                  </span>
                  <span className="text-2xl">🎵</span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">{c.bento.cards.spotify.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.bento.cards.spotify.desc}</p>
                <div className="mt-6 rounded-xl border border-white/[0.06] bg-black/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#1DB954]">/spotify vc</span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      Direct Vocal
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">
                    Diffuse la musique que tu écoutes en vocal sans configuration supplémentaire.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d15] p-7 transition-all hover:border-[#a78bfa]/40">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#a78bfa]/10 px-3 py-1 text-xs font-bold text-[#a78bfa]">
                    {c.bento.cards.fun.tag}
                  </span>
                  <span className="text-2xl">🎉</span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">{c.bento.cards.fun.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.bento.cards.fun.desc}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {["/lyrics", "/quote", "/image", "/reverseimage", "/game", "/movie"].map((cmd) => (
                    <span
                      key={cmd}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-xs text-zinc-300"
                    >
                      {cmd}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d15] p-7 transition-all hover:border-[#38bdf8]/40">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#38bdf8]/10 px-3 py-1 text-xs font-bold text-[#38bdf8]">
                    {c.bento.cards.automod.tag}
                  </span>
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">{c.bento.cards.automod.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.bento.cards.automod.desc}</p>
                <div className="mt-6 flex items-center gap-2">
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                    Anti-Discord Invite
                  </span>
                  <span className="rounded-md bg-cyan-500/20 px-2 py-0.5 text-xs font-bold text-cyan-300">
                    Ghost Ping 0s
                  </span>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d15] p-7 transition-all hover:border-[#facc15]/40">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#facc15]/10 px-3 py-1 text-xs font-bold text-[#facc15]">
                    {c.bento.cards.leveling.tag}
                  </span>
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">{c.bento.cards.leveling.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.bento.cards.leveling.desc}</p>
                <div className="mt-6 rounded-xl border border-white/[0.06] bg-black/40 p-3">
                  <div className="flex justify-between text-xs font-bold text-white">
                    <span>Niveau 14 · Rang #3</span>
                    <span className="text-[#facc15]">1,450 / 2,000 XP</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                    <div className="h-full w-[72%] rounded-full bg-[#facc15]" />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="steps" className="mx-auto w-full max-w-6xl px-6 py-20 scroll-mt-20">
          <Reveal className="text-center">
            <Eyebrow>{c.steps.eyebrow}</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{c.steps.title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-400">{c.steps.subtitle}</p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {c.steps.items.map((st, i) => (
              <Reveal key={st.step} delay={i * 0.1}>
                <div className="relative h-full rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-7 transition-all hover:border-white/20">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#92C8D2]/20 to-indigo-500/20 text-base font-extrabold text-[#92C8D2] ring-1 ring-[#92C8D2]/30">
                    {st.step}
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-white">{st.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{st.text}</p>
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
              <p className="mt-2 text-zinc-400">{c.commands.subtitleLive(numberFr(filteredCommands.length))}</p>
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
                      title={c.commands.copySyntax}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {copiedCmd === cmd.name ? "✓" : "Copier"}
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
                  {c.cta.text}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <a
                    href={INVITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-black shadow-xl shadow-white/10 transition-transform hover:scale-105"
                  >
                    <DiscordGlyph className="h-5 w-5" />
                    {c.cta.add}
                  </a>
                  <a
                    href={DASHBOARD_URL}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/[0.08]"
                  >
                    {c.cta.openDashboard}
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.07] bg-black/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-zinc-500 sm:flex-row">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ethone-icon-192.png" alt="" className="h-5 w-5 rounded-md opacity-80" />
            <p>© {new Date().getFullYear()} Etho · {c.footer.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a href={DASHBOARD_URL} className="transition-colors hover:text-white">
              {c.footer.dashboard}
            </a>
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
          </div>
        </div>
      </footer>
    </div>
  );
}
