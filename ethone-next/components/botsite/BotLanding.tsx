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
import LightBorder from "@/components/ui/LightBorder";
import { EASE_SNAP, SPRING_MOUSE, SPRING_PILL } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { BOT_COPY, BOT_LANGS, BOT_LANG_KEY, detectBotLang, type BotCopy, type BotLang } from "./botLandingI18n";

/**
 * Page vitrine publique du bot Discord (discord.ethone.dev / ethone.dev/bot). Aucune donnée inventée : les compteurs et
 * la liste des commandes viennent de l'API publique du bot ; si elle ne répond pas, ces blocs sont simplement masqués.
 * L'aperçu du hero illustre l'interface (noms de modules réels, message d'accueil avec ses variables) sans aucun chiffre.
 */

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const BOT_CLIENT_ID = "1545139931154878464";
const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const SUPPORT_URL = "https://discord.gg/WvEcyBuP45";
const DASHBOARD_URL = "https://ethone.dev/discord";

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

const FEATURE_META: Array<{ icon: string; tint: string; wide?: boolean }> = [
  { icon: "moderation", tint: "#f43f5e", wide: true },
  { icon: "security", tint: "#f59e0b" },
  { icon: "logs", tint: "#38bdf8" },
  { icon: "welcome", tint: "#34d399", wide: true },
  { icon: "level", tint: "#a78bfa" },
  { icon: "economy", tint: "#facc15" },
  { icon: "music", tint: "#ec4899" },
  { icon: "ticket", tint: "#22d3ee" },
  { icon: "giveaway", tint: "#fb923c" },
  { icon: "reminder", tint: "#94a3b8" },
];

/** État ON/OFF des six modules montrés dans l'aperçu (mêmes noms que dans le dictionnaire). */
const PREVIEW_ON = [true, true, true, true, false, true];

/** Palette Etho, exposée en variables pour que les composants partagés (LightBorder) s'y accordent. */
const ETHO_VARS = {
  "--bg-main": "#090a0f",
  "--bg-card": "#0d0e15",
  "--panel-border": "rgba(255,255,255,0.08)",
  "--etho-light": "#818cf8",
} as CSSProperties;

function useLiveData() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [commands, setCommands] = useState<PublicCommand[] | null>(null);
  const [commandsFailed, setCommandsFailed] = useState(false);

  useEffect(() => {
    if (!BOT_API_URL) {
      setCommandsFailed(true);
      return;
    }
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
        if (data && Array.isArray(data.commands)) setCommands(data.commands as PublicCommand[]);
        else setCommandsFailed(true);
      })
      .catch(() => {
        if (!cancelled) setCommandsFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, commands, commandsFailed };
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

/** Apparition au défilement (une seule fois). Sans animation si « réduire les animations ». */
function Reveal({ children, delay = 0, className = "", y = 24 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const { reduced } = useMotionPref();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.75, ease: EASE_SNAP, delay }}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-300/80">
      <span className="h-px w-6 bg-gradient-to-r from-transparent to-indigo-300/70" />
      {children}
    </p>
  );
}

/** Nombre réel qui défile de 0 à sa valeur quand il entre à l'écran. */
function CountUp({ value }: { value: number }) {
  const { reduced } = useMotionPref();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduced) {
      el.textContent = numberFr(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.6,
      ease: EASE_SNAP,
      onUpdate: (v) => {
        el.textContent = numberFr(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, value, reduced]);

  return <span ref={ref}>{numberFr(reduced ? value : 0)}</span>;
}

/** Les variables du bot ({user}, {server}, {membercount}) sont surlignées comme une mention. */
function highlightVars(text: string): ReactNode[] {
  return text.split(/(\{[a-z]+\})/g).map((part, i) =>
    /^\{[a-z]+\}$/.test(part) ? (
      <span key={i} className="rounded bg-indigo-400/15 px-1 text-indigo-300">{part}</span>
    ) : (
      part
    )
  );
}

/** Titre révélé mot par mot ; le mot d'accent porte un dégradé qui glisse lentement. */
function HeroTitle({ c }: { c: BotCopy }) {
  const { reduced } = useMotionPref();
  const words = (s: string) => s.split(" ").filter(Boolean);
  const line = (text: string, offset: number) =>
    words(text).map((w, i) => (
      <motion.span
        key={`${w}-${i}`}
        className="inline-block"
        initial={reduced ? false : { opacity: 0, y: "0.45em", filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: EASE_SNAP, delay: 0.15 + (offset + i) * 0.07 }}
      >
        {w}
        {" "}
      </motion.span>
    ));
  const top = words(c.hero.titleTop).length;
  const bottom = words(c.hero.titleBottom).length;

  return (
    <h1 key={c.hero.titleTop} className="text-[clamp(2.6rem,7.2vw,5.6rem)] font-extrabold leading-[1] tracking-[-0.045em] text-white">
      {line(c.hero.titleTop, 0)}
      <br />
      {line(c.hero.titleBottom, top)}
      <motion.span
        className="inline-block"
        initial={reduced ? false : { opacity: 0, y: "0.45em", filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.9, ease: EASE_SNAP, delay: 0.15 + (top + bottom) * 0.07 }}
      >
        <motion.span
          className="inline-block bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(90deg,#a78bfa,#38bdf8,#34d399,#38bdf8,#a78bfa)", backgroundSize: "200% auto" }}
          animate={reduced ? undefined : { backgroundPosition: ["0% 50%", "100% 50%"] }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
        >
          {c.hero.titleAccent}
        </motion.span>
      </motion.span>
    </h1>
  );
}

/** Sélecteur de langue : drapeau + code, menu de quatre langues. */
function LanguageSelect({ lang, onChange, label }: { lang: BotLang; onChange: (l: BotLang) => void; label: string }) {
  const { reduced } = useMotionPref();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<BotLang | null>(null);
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
        className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] pl-1.5 pr-3 text-xs font-semibold uppercase text-zinc-200 outline-none transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-400/60"
      >
        <span className="relative h-6 w-6 overflow-hidden rounded-full ring-1 ring-white/10">
          <FlagIcon code={lang} className="absolute left-1/2 top-1/2 h-6 w-9 max-w-none -translate-x-1/2 -translate-y-1/2" />
        </span>
        {lang}
        <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={label}
            initial={reduced ? false : { opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: EASE_SNAP }}
            onMouseLeave={() => setHovered(null)}
            className="absolute right-0 top-[calc(100%+8px)] z-40 w-48 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-[#0e0f16]/95 p-1.5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] backdrop-blur-xl"
          >
            {BOT_LANGS.map((l, i) => (
              <motion.li
                key={l}
                role="option"
                aria-selected={l === lang}
                initial={reduced ? false : { opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, ease: EASE_SNAP, delay: 0.03 + i * 0.035 }}
              >
                <button
                  type="button"
                  onMouseEnter={() => setHovered(l)}
                  onClick={() => {
                    onChange(l);
                    setOpen(false);
                  }}
                  className={`relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm ${l === lang ? "text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  {(hovered ?? lang) === l && (
                    <motion.span layoutId="etho-lang-hl" transition={SPRING_PILL} className="absolute inset-0 rounded-xl bg-white/[0.06]" />
                  )}
                  <FlagIcon code={l} className="relative h-3.5 w-5" />
                  <span className="relative flex-1">{LANGUAGE_LABELS[l]}</span>
                  {l === lang && <span className="relative text-indigo-300">✓</span>}
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Aperçu de l'interface. Il se redresse en perspective pendant le défilement, s'incline légèrement sous le curseur ;
 * les modules s'allument un à un, puis Etho « écrit » et publie le message d'accueil (variables non remplacées).
 */
function ProductPreview({ c, scrollRef }: { c: BotCopy; scrollRef: RefObject<HTMLDivElement | null> }) {
  const { reduced } = useMotionPref();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [on, setOn] = useState<boolean[]>(() => PREVIEW_ON.map(() => false));
  const [phase, setPhase] = useState<"idle" | "typing" | "sent">("idle");

  const { scrollYProgress } = useScroll({ target: ref, container: scrollRef, offset: ["start end", "center center"] });
  const tiltScroll = useTransform(scrollYProgress, [0, 1], [18, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
  const hx = useMotionValue(0);
  const hy = useMotionValue(0);
  const sx = useSpring(hx, SPRING_MOUSE);
  const sy = useSpring(hy, SPRING_MOUSE);
  const rotateX = useTransform([tiltScroll, sy], ([a, b]: number[]) => a + b * -5);
  const rotateY = useTransform(sx, (v) => v * 6);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setOn(PREVIEW_ON);
      setPhase("sent");
      return;
    }
    const timers = PREVIEW_ON.map((value, i) => window.setTimeout(() => setOn((prev) => prev.map((p, j) => (j === i ? value : p))), 450 + i * 160));
    timers.push(window.setTimeout(() => setPhase("typing"), 700));
    timers.push(window.setTimeout(() => setPhase("sent"), 2100));
    return () => timers.forEach(clearTimeout);
  }, [inView, reduced]);

  const onMove = (e: React.PointerEvent) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    hx.set((e.clientX - r.left) / r.width - 0.5);
    hy.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    hx.set(0);
    hy.set(0);
  };

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: EASE_SNAP, delay: 0.75 }}
      className="relative mx-auto mt-16 w-full max-w-4xl"
      style={{ perspective: 1600 }}
    >
      <div aria-hidden className="absolute -inset-x-10 -inset-y-12 -z-10" style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.26), rgba(56,189,248,0.08) 55%, transparent)" }} />
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={reduced ? undefined : { rotateX, rotateY, scale, transformStyle: "preserve-3d" }}
        className="will-change-transform"
      >
        <LightBorder light="--etho-light" speed={8} radius="1rem" className="shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85)]" innerClassName="backdrop-blur">
          <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 truncate rounded-md bg-white/[0.04] px-3 py-1 text-[11px] text-zinc-500">ethone.dev/discord</span>
          </div>
          <div className="grid gap-px bg-white/[0.06] md:grid-cols-[1fr_1.15fr]">
            <div className="bg-[#0d0e15] p-5 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{c.preview.modulesTitle}</p>
              <ul className="mt-4 space-y-2">
                {c.preview.modules.map((name, idx) => {
                  const active = on[idx];
                  return (
                    <li key={name}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setOn((prev) => prev.map((p, j) => (j === idx ? !p : p)))}
                        className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-left transition-colors duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
                      >
                        <span className="text-sm font-medium text-zinc-200">{name}</span>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider transition-colors duration-300 ${active ? "bg-emerald-500/12 text-emerald-300" : "bg-zinc-500/12 text-zinc-400"}`}
                        >
                          <span className={`relative h-3.5 w-6 rounded-full transition-colors duration-300 ${active ? "bg-emerald-400/80" : "bg-zinc-600"}`}>
                            <motion.span
                              className="absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow"
                              initial={false}
                              animate={{ x: active ? 12 : 2 }}
                              transition={SPRING_PILL}
                            />
                          </span>
                          <span className="w-6 text-left">{active ? "ON" : "OFF"}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="bg-[#0d0e15] p-5 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{c.preview.welcomeTitle}</p>
              <div className="mt-4 flex min-h-[148px] gap-3 rounded-xl bg-[#131420] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/ethone-icon-192.png" alt="" width={38} height={38} className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    Etho <span className="rounded bg-[#5865f2] px-1.5 py-px text-[9px] font-bold uppercase text-white">App</span>
                  </p>
                  <AnimatePresence mode="wait" initial={false}>
                    {phase === "sent" ? (
                      <motion.div
                        key="embed"
                        initial={reduced ? false : { opacity: 0, y: 10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 320, damping: 26 }}
                        className="mt-2 origin-top-left rounded-md border-l-4 border-indigo-400 bg-[#1a1b28] p-3"
                      >
                        <p className="text-sm font-semibold text-white">{c.preview.embedTitle}</p>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">{highlightVars(c.preview.embedBody)}</p>
                        <p className="mt-2 text-[11px] text-zinc-500">{c.preview.embedFooter}</p>
                      </motion.div>
                    ) : phase === "typing" ? (
                      <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="mt-3 flex gap-1" aria-hidden>
                        {[0, 1, 2].map((d) => (
                          <motion.span
                            key={d}
                            className="h-1.5 w-1.5 rounded-full bg-zinc-400"
                            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15, ease: "easeInOut" }}
                          />
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">{c.preview.note}</p>
            </div>
          </div>
        </LightBorder>
      </motion.div>
    </motion.div>
  );
}

/** Carte de fonctionnalité : lumière teintée qui suit le curseur, icône qui se soulève. */
function FeatureCard({ tint, icon, title, text }: { tint: string; icon: string; title: string; text: string }) {
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div
      onPointerMove={onMove}
      style={{ ["--tint" as string]: tint }}
      className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0d13] p-6 transition-[transform,border-color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-[color:color-mix(in_srgb,var(--tint)_40%,transparent)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "radial-gradient(320px circle at var(--mx,50%) var(--my,0%), color-mix(in srgb, var(--tint) 14%, transparent), transparent 70%)" }}
      />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] transition-transform duration-500 [background:color-mix(in_srgb,var(--tint)_14%,#0c0d13)] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5 group-hover:-rotate-6 group-hover:scale-105">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/bot-icons/${icon}.png`} alt="" width={32} height={32} loading="lazy" className="h-8 w-8" />
      </div>
      <h3 className="relative mt-5 text-[16px] font-semibold text-white">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
    </div>
  );
}

/** Étapes du dashboard : un trait vertical se dessine au fil du défilement. */
function Steps({ c, scrollRef }: { c: BotCopy; scrollRef: RefObject<HTMLDivElement | null> }) {
  const { reduced } = useMotionPref();
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, container: scrollRef, offset: ["start 80%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <ol ref={ref} className="relative space-y-4">
      <span aria-hidden className="absolute bottom-6 left-[38px] top-6 w-px bg-white/[0.07]" />
      <motion.span
        aria-hidden
        className="absolute bottom-6 left-[38px] top-6 w-px origin-top bg-gradient-to-b from-violet-400 via-sky-400 to-emerald-400"
        style={{ scaleY: reduced ? 1 : progress }}
      />
      {c.dashboard.steps.map((s, i) => (
        <Reveal key={s.title} delay={i * 0.1} y={16}>
          <li className="relative flex gap-4 rounded-2xl border border-white/[0.07] bg-[#0c0d13]/90 p-5 backdrop-blur transition-colors duration-300 hover:border-white/[0.14]">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#11121b] text-sm font-bold text-white ring-1 ring-white/15">
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/35 to-sky-500/35" />
              <span className="relative">{i + 1}</span>
            </span>
            <div>
              <h3 className="text-[15px] font-semibold text-white">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{s.text}</p>
            </div>
          </li>
        </Reveal>
      ))}
    </ol>
  );
}

export default function BotLanding() {
  const { reduced } = useMotionPref();
  const { stats, commands, commandsFailed } = useLiveData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoverLink, setHoverLink] = useState<string | null>(null);
  // Rendu initial en français (identique au HTML statique), puis langue enregistrée ou celle du navigateur.
  const [lang, setLang] = useState<BotLang>("fr");
  const c = BOT_COPY[lang];
  const scrollRef = useRef<HTMLDivElement>(null);

  // Barre de progression de lecture + en-tête qui se densifie au défilement.
  const { scrollY, scrollYProgress } = useScroll({ container: scrollRef });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 12));

  // Lumières du fond : légère parallaxe au curseur et au défilement.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, SPRING_MOUSE);
  const smy = useSpring(my, SPRING_MOUSE);
  const lightX = useTransform(smx, (v) => v * 40);
  const lightY = useTransform([smy, scrollY], ([a, b]: number[]) => a * 30 + b * 0.25);

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

  useEffect(() => {
    document.documentElement.lang = lang;
    const applyMeta = () => {
      if (document.title !== c.meta.title) document.title = c.meta.title;
      document.querySelector('meta[name="description"]')?.setAttribute("content", c.meta.description);
    };
    applyMeta();
    // Le gestionnaire de titres du dashboard (et les métadonnées de Next) réécrivent le titre après coup : on le rétablit.
    const titleNode = document.querySelector("title");
    const observer = titleNode ? new MutationObserver(applyMeta) : null;
    if (titleNode) observer?.observe(titleNode, { childList: true, characterData: true, subtree: true });
    return () => observer?.disconnect();
  }, [lang, c]);

  const changeLang = (l: BotLang) => {
    setLang(l);
    try {
      localStorage.setItem(BOT_LANG_KEY, l);
    } catch {
      /* stockage indisponible : le choix vaut pour cette visite */
    }
  };

  const categories = useMemo(() => {
    if (!commands) return [];
    const counts = new Map<string, number>();
    for (const c of commands) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [commands]);

  const visible = useMemo(() => {
    if (!commands) return [];
    const q = fold(query.trim());
    return commands.filter((cmd) => {
      if (category && cmd.category !== category) return false;
      if (!q) return true;
      return fold(`${cmd.name} ${cmd.description} ${cmd.subcommands.map((s) => `${s.name} ${s.description}`).join(" ")}`).includes(q);
    });
  }, [commands, query, category]);

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0f]";
  const primaryBtn = `btn-sheen relative inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-zinc-900 shadow-[0_8px_30px_-8px_rgba(255,255,255,0.35)] transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-0.5 hover:bg-zinc-100 hover:shadow-[0_14px_40px_-10px_rgba(255,255,255,0.45)] active:translate-y-0 active:scale-[0.98] ${focusRing}`;
  const ghostBtn = `inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition-[transform,border-color,background-color] duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.07] active:translate-y-0 active:scale-[0.98] ${focusRing}`;
  const arrow = (
    <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );

  const navItems: Array<[string, string]> = [
    ["fonctionnalites", c.nav.features],
    ["dashboard", c.nav.dashboard],
    ["commandes", c.nav.commands],
  ];

  return (
    <div ref={scrollRef} style={ETHO_VARS} className="relative h-dvh w-full overflow-x-hidden overflow-y-auto bg-[#090a0f] text-zinc-200 antialiased selection:bg-indigo-400/30">
      {/* Fond : lumières diffuses qui se prolongent hors de l'écran (dégradés, sans flou ni quadrillage) */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[1400px] overflow-hidden">
        <motion.div className="absolute -inset-x-[25%] -top-[30%] bottom-0" style={reduced ? undefined : { x: lightX, y: lightY }}>
          <div
            className="auth-field absolute inset-0"
            style={{
              background: [
                "radial-gradient(34% 26% at 50% 12%, rgba(99,102,241,0.26), transparent)",
                "radial-gradient(22% 20% at 30% 30%, rgba(56,189,248,0.12), transparent)",
                "radial-gradient(22% 20% at 70% 34%, rgba(52,211,153,0.10), transparent)",
              ].join(","),
            }}
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#090a0f]" />
      </div>

      {/* div et non <header> : la feuille de style globale habille les <header> du dashboard */}
      <motion.div
        initial={reduced ? false : { y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE_SNAP }}
        className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-[background-color,border-color] duration-500 ${scrolled ? "border-white/[0.07] bg-[#090a0f]/80" : "border-transparent bg-[#090a0f]/30"}`}
      >
        <div className={`mx-auto flex w-full max-w-6xl items-center justify-between px-5 transition-[padding] duration-500 ${scrolled ? "py-2.5" : "py-4"}`}>
          <a href="/bot" className={`group flex items-center gap-2.5 rounded-xl ${focusRing}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ethone-icon-192.png" alt="" width={34} height={34} className="rounded-[10px] transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-105" />
            <span className="hidden text-[15px] font-bold tracking-[0.18em] text-white min-[420px]:inline">ETHO</span>
          </a>
          <nav className="hidden items-center gap-1 md:flex" aria-label={c.nav.mainNav} onMouseLeave={() => setHoverLink(null)}>
            {[...navItems.map(([id, label]) => ({ key: id, label, href: `#${id}`, onClick: scrollTo(id), external: false })), { key: "support", label: c.nav.support, href: SUPPORT_URL, onClick: undefined, external: true }].map((l) => (
              <a
                key={l.key}
                href={l.href}
                onClick={l.onClick}
                onMouseEnter={() => setHoverLink(l.key)}
                {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={`relative rounded-full px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white ${focusRing}`}
              >
                {hoverLink === l.key && <motion.span layoutId="etho-nav-hl" transition={SPRING_PILL} className="absolute inset-0 rounded-full bg-white/[0.06]" />}
                <span className="relative">{l.label}</span>
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a href={DASHBOARD_URL} className={`hidden rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/25 hover:text-white sm:inline-block ${focusRing}`}>
              {c.nav.dashboard}
            </a>
            <a href={INVITE_URL} target="_blank" rel="noopener noreferrer" className={`btn-sheen relative rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 ${focusRing}`}>
              {c.nav.invite}
            </a>
            <LanguageSelect lang={lang} onChange={changeLang} label={c.nav.language} />
            <button
              type="button"
              aria-label={menuOpen ? c.nav.closeMenu : c.nav.openMenu}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className={`ml-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 text-zinc-300 transition-colors hover:border-white/25 hover:text-white md:hidden ${focusRing}`}
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <motion.path initial={false} animate={{ d: menuOpen ? "M5 5L15 15" : "M3 7L17 7" }} transition={{ duration: 0.25, ease: EASE_SNAP }} />
                <motion.path initial={false} animate={{ d: menuOpen ? "M5 15L15 5" : "M3 13L17 13" }} transition={{ duration: 0.25, ease: EASE_SNAP }} />
              </svg>
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {menuOpen && (
            <motion.nav
              key="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_SNAP }}
              className="overflow-hidden border-t border-white/[0.06] md:hidden"
              aria-label={c.nav.mobileMenu}
            >
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-5 py-3">
                {[...navItems.map(([id, label]) => ({ key: id, label, href: `#${id}`, onClick: scrollTo(id), external: false })), { key: "support", label: c.nav.support, href: SUPPORT_URL, onClick: undefined, external: true }, { key: "dash", label: c.hero.openDashboard, href: DASHBOARD_URL, onClick: undefined, external: false }].map((l, i) => (
                  <motion.a
                    key={l.key}
                    href={l.href}
                    onClick={l.onClick}
                    {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    initial={reduced ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, ease: EASE_SNAP, delay: 0.04 + i * 0.04 }}
                    className="rounded-lg px-3 py-2.5 text-[15px] text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                  >
                    {l.label}
                  </motion.a>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
        {/* Progression de lecture */}
        <motion.div aria-hidden className="absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400" style={{ scaleX: reduced ? 0 : progress }} />
      </motion.div>

      <main className="relative z-10 overflow-x-clip">
        {/* Hero */}
        <section className="mx-auto w-full max-w-5xl px-5 pb-20 pt-16 text-center sm:pt-24">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
            className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={stats ? "live" : "default"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}>
                {stats ? c.hero.badgeActive(stats.guilds, numberFr(stats.members)) : c.hero.badgeDefault}
              </motion.span>
            </AnimatePresence>
          </motion.div>

          <HeroTitle c={c} />

          <motion.p
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_SNAP, delay: 0.55 }}
            className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-zinc-400"
          >
            {c.hero.subtitle}
          </motion.p>
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_SNAP, delay: 0.65 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <a href={INVITE_URL} target="_blank" rel="noopener noreferrer" className={`group ${primaryBtn}`}>
              <DiscordGlyph className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
              {c.hero.add}
            </a>
            <a href={DASHBOARD_URL} className={`group ${ghostBtn}`}>
              {c.hero.openDashboard}
              {arrow}
            </a>
          </motion.div>
          <ProductPreview c={c} scrollRef={scrollRef} />
        </section>

        {/* Chiffres réels (masqués si l'API du bot ne répond pas) */}
        {stats && (
          <section className="mx-auto w-full max-w-4xl px-5 pb-8">
            <Reveal>
              <dl className="grid grid-cols-3 divide-x divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-white/[0.02] py-7 backdrop-blur">
                {(
                  [
                    [stats.guilds, stats.guilds > 1 ? c.stats.servers[1] : c.stats.servers[0]],
                    [stats.members, c.stats.members],
                    [stats.commands, c.stats.commands],
                  ] as Array<[number, string]>
                ).map(([value, label]) => (
                  <div key={label} className="px-3 text-center">
                    <dt className="sr-only">{label}</dt>
                    <dd className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-3xl font-extrabold tabular-nums tracking-tight text-transparent sm:text-4xl">
                      <CountUp value={value} />
                    </dd>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
                  </div>
                ))}
              </dl>
            </Reveal>
          </section>
        )}

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20">
          <Reveal className="max-w-3xl">
            <Eyebrow>{c.features.eyebrow}</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{c.features.title}</h2>
            <p className="mt-3 text-zinc-400">{c.features.subtitle}</p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {FEATURE_META.map((f, i) => {
              const item = c.features.items[i];
              return (
                <Reveal key={f.icon} delay={(i % 3) * 0.08} className={f.wide ? "lg:col-span-4" : "lg:col-span-2"}>
                  <FeatureCard tint={f.tint} icon={f.icon} title={item.title} text={item.text} />
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Dashboard */}
        <section id="dashboard" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
            <Reveal className="lg:sticky lg:top-28">
              <Eyebrow>{c.dashboard.eyebrow}</Eyebrow>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{c.dashboard.title}</h2>
              <p className="mt-3 text-zinc-400">{c.dashboard.text}</p>
              <a href={DASHBOARD_URL} className={`group ${ghostBtn} mt-8`}>
                {c.dashboard.open}
                {arrow}
              </a>
            </Reveal>
            <Steps c={c} scrollRef={scrollRef} />
          </div>
        </section>

        {/* Commandes */}
        <section id="commandes" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20">
          <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>{c.commands.eyebrow}</Eyebrow>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{c.commands.title}</h2>
              <p className="mt-3 text-zinc-400">
                {commands ? c.commands.subtitleLive(numberFr(commands.length)) : c.commands.subtitleStatic}
              </p>
              {commands && c.commands.frenchNote && <p className="mt-1 text-xs text-zinc-600">{c.commands.frenchNote}</p>}
            </div>
            {commands && (
              <div className="group relative w-full sm:w-72">
                <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-indigo-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <circle cx="9" cy="9" r="5.5" />
                  <path d="m13.5 13.5 3 3" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={c.commands.search}
                  aria-label={c.commands.search}
                  className="h-11 w-full rounded-full border border-white/10 bg-white/[0.03] pl-11 pr-5 text-sm text-white outline-none transition-[border-color,background-color,box-shadow] duration-300 placeholder:text-zinc-500 focus:border-indigo-400/60 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(129,140,248,0.12)]"
                />
              </div>
            )}
          </Reveal>

          {commandsFailed && !commands && (
            <p className="mt-10 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
              {c.commands.unavailable[0]}<span className="font-mono text-zinc-300">/help</span>{c.commands.unavailable[1]}
            </p>
          )}

          {commands && (
            <>
              <Reveal y={12} className="mt-8 flex flex-wrap gap-2">
                {[["", commands.length] as [string, number], ...categories].map(([name, count]) => {
                  const active = category === name;
                  return (
                    <button
                      key={name || "all"}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setCategory(name)}
                      className={`relative cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-300 ${focusRing} ${
                        active ? "border-indigo-400/50 text-white" : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {active && <motion.span layoutId="etho-chip" transition={SPRING_PILL} className="absolute inset-0 rounded-full bg-indigo-400/15" />}
                      <span className="relative">
                        {name || c.commands.all} <span className={active ? "text-indigo-200/70" : "text-zinc-600"}>{count}</span>
                      </span>
                    </button>
                  );
                })}
              </Reveal>
              <motion.div layout={!reduced} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  {visible.map((cmd) => (
                    <motion.div
                      key={cmd.name}
                      layout={reduced ? false : "position"}
                      initial={reduced ? false : { opacity: 0, scale: 0.96, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={reduced ? undefined : { opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.35, ease: EASE_SNAP }}
                      className="group rounded-xl border border-white/[0.07] bg-[#0c0d13] p-4 transition-colors duration-300 hover:border-indigo-400/25 hover:bg-[#0f1018]"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-mono text-sm font-semibold text-white">
                          <span className="text-indigo-300/70 transition-colors group-hover:text-indigo-300">/</span>
                          {cmd.name}
                        </span>
                        <span className="shrink-0 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">{cmd.category}</span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{cmd.description}</p>
                      {cmd.subcommands.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {cmd.subcommands.map((s) => (
                            <span key={s.name} title={s.description} className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-zinc-400 transition-colors hover:bg-indigo-400/15 hover:text-indigo-200">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {visible.length === 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-10 text-center text-sm text-zinc-500">
                    {c.commands.noMatch(query)}
                  </motion.p>
                )}
              </motion.div>
            </>
          )}
        </section>

        {/* Appel final */}
        <section className="mx-auto w-full max-w-5xl px-5 py-20">
          <Reveal>
            <LightBorder light="--etho-light" speed={10} radius="1.5rem">
              <div className="relative overflow-hidden px-6 py-16 text-center sm:px-12">
                <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(99,102,241,0.28), transparent 70%)" }} />
                <div className="relative">
                  <motion.div
                    aria-hidden
                    className="mx-auto mb-7 w-fit"
                    animate={reduced ? undefined : { y: [0, -6, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/ethone-icon-192.png" alt="" width={56} height={56} className="h-14 w-14 rounded-2xl shadow-[0_20px_40px_-12px_rgba(99,102,241,0.55)] ring-1 ring-white/10" />
                  </motion.div>
                  <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">{c.cta.title}</h2>
                  <p className="mx-auto mt-4 max-w-md text-zinc-400">{c.cta.text}</p>
                  <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                    <a href={INVITE_URL} target="_blank" rel="noopener noreferrer" className={`group ${primaryBtn}`}>
                      <DiscordGlyph className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
                      {c.cta.add}
                    </a>
                    <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className={`group ${ghostBtn}`}>
                      {c.cta.support}
                      {arrow}
                    </a>
                  </div>
                </div>
              </div>
            </LightBorder>
          </Reveal>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.07]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-zinc-500 sm:flex-row">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ethone-icon-192.png" alt="" width={22} height={22} className="rounded-md opacity-80" />
            <p>© {new Date().getFullYear()} Etho · {c.footer.tagline}</p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label={c.nav.footerNav}>
            {[
              [DASHBOARD_URL, c.nav.dashboard, false],
              [SUPPORT_URL, c.nav.support, true],
              ["/terms", c.footer.terms, false],
              ["/privacy", c.footer.privacy, false],
            ].map(([href, label, external]) => (
              <a
                key={String(href)}
                href={String(href)}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={`rounded underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-200 hover:text-white hover:decoration-white/30 ${focusRing}`}
              >
                {String(label)}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
