"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import FlagIcon, { LANGUAGE_LABELS } from "@/components/FlagIcon";
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

/** Apparition douce au défilement. Le contenu reste visible sans JavaScript et avec « réduire les animations ». */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Ce qui est déjà à l'écran au chargement ne clignote pas : seul le contenu plus bas apparaît au défilement.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setHidden(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setHidden(false);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: hidden ? "0ms" : `${delay}ms` }}
      className={`transition-[opacity,transform] duration-700 ease-out ${hidden ? "translate-y-5 opacity-0" : "translate-y-0 opacity-100"} ${className}`}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-300/80">{children}</p>;
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

/** Sélecteur de langue : drapeau + code, menu de quatre langues. */
function LanguageSelect({ lang, onChange, label }: { lang: BotLang; onChange: (l: BotLang) => void; label: string }) {
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
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-white/10 px-3 text-xs font-semibold uppercase text-zinc-200 transition-colors hover:border-white/25 hover:text-white"
      >
        <FlagIcon code={lang} className="h-3 w-[18px]" />
        {lang}
        <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" aria-label={label} className="absolute right-0 top-[calc(100%+8px)] z-40 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#0e0f16] p-1 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)]">
          {BOT_LANGS.map((l) => (
            <li key={l} role="option" aria-selected={l === lang}>
              <button
                type="button"
                onClick={() => {
                  onChange(l);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06] ${l === lang ? "text-white" : "text-zinc-400"}`}
              >
                <FlagIcon code={l} className="h-3.5 w-5" />
                <span className="flex-1">{LANGUAGE_LABELS[l]}</span>
                {l === lang && <span className="text-indigo-300">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Aperçu de l'interface : liste de modules avec leurs interrupteurs + message d'accueil Discord (variables non remplacées). */
function ProductPreview({ c }: { c: BotCopy }) {
  return (
    <div className="relative mx-auto mt-16 w-full max-w-4xl">
      <div aria-hidden className="absolute -inset-x-6 -inset-y-8 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_40%,rgba(99,102,241,0.28),rgba(56,189,248,0.10)_55%,transparent_75%)] blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e15]/90 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.04] backdrop-blur">
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
                const on = PREVIEW_ON[idx];
                return (
                  <li key={name} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                    <span className="text-sm font-medium text-zinc-200">{name}</span>
                    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ${on ? "bg-emerald-500/12 text-emerald-300" : "bg-zinc-500/12 text-zinc-400"}`}>
                      <span className={`relative h-3.5 w-6 rounded-full ${on ? "bg-emerald-400/80" : "bg-zinc-600"}`}>
                        <span className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all ${on ? "left-[12px]" : "left-0.5"}`} />
                      </span>
                      {on ? "ON" : "OFF"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="bg-[#0d0e15] p-5 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{c.preview.welcomeTitle}</p>
            <div className="mt-4 flex gap-3 rounded-xl bg-[#131420] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/ethone-icon-192.png" alt="" width={38} height={38} className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  Ethone Bot <span className="rounded bg-[#5865f2] px-1.5 py-px text-[9px] font-bold uppercase text-white">App</span>
                </p>
                <div className="mt-2 rounded-md border-l-4 border-indigo-400 bg-[#1a1b28] p-3">
                  <p className="text-sm font-semibold text-white">{c.preview.embedTitle}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">{highlightVars(c.preview.embedBody)}</p>
                  <p className="mt-2 text-[11px] text-zinc-500">{c.preview.embedFooter}</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">{c.preview.note}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BotLanding() {
  const { stats, commands, commandsFailed } = useLiveData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  // Rendu initial en français (identique au HTML statique), puis langue enregistrée ou celle du navigateur.
  const [lang, setLang] = useState<BotLang>("fr");
  const c = BOT_COPY[lang];

  useEffect(() => {
    setLang(detectBotLang());
  }, []);

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
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const linkClass = "text-sm text-zinc-400 transition-colors hover:text-white";
  const primaryBtn =
    "inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-zinc-900 shadow-[0_8px_30px_-8px_rgba(255,255,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-zinc-100 hover:shadow-[0_12px_36px_-8px_rgba(255,255,255,0.45)]";
  const ghostBtn =
    "inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.02] px-6 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.06]";

  return (
    <div className="relative h-dvh w-full overflow-x-hidden overflow-y-auto scroll-smooth bg-[#090a0f] text-zinc-200 antialiased selection:bg-indigo-400/30">
      {/* Fond : quadrillage estompé + halos de couleur (purement décoratif) */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[900px] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent_75%)]" />
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute left-[8%] top-40 h-72 w-72 rounded-full bg-sky-500/10 blur-[100px]" />
        <div className="absolute right-[6%] top-56 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      {/* div et non <header> : la feuille de style globale habille les <header> du dashboard */}
      <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#090a0f]/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5">
          <a href="/bot" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ethone-icon-192.png" alt="" width={34} height={34} className="rounded-[10px]" />
            <span className="hidden text-[15px] font-bold tracking-[0.18em] text-white min-[420px]:inline">ETHONE</span>
          </a>
          <nav className="hidden items-center gap-8 md:flex" aria-label={c.nav.mainNav}>
            <a href="#fonctionnalites" onClick={scrollTo("fonctionnalites")} className={linkClass}>{c.nav.features}</a>
            <a href="#dashboard" onClick={scrollTo("dashboard")} className={linkClass}>{c.nav.dashboard}</a>
            <a href="#commandes" onClick={scrollTo("commandes")} className={linkClass}>{c.nav.commands}</a>
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>{c.nav.support}</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href={DASHBOARD_URL} className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/25 hover:text-white sm:inline-block">
              {c.nav.dashboard}
            </a>
            <a href={INVITE_URL} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200">
              {c.nav.invite}
            </a>
            <LanguageSelect lang={lang} onChange={changeLang} label={c.nav.language} />
            <button
              type="button"
              aria-label={menuOpen ? c.nav.closeMenu : c.nav.openMenu}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="ml-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 text-zinc-300 transition-colors hover:border-white/25 hover:text-white md:hidden"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                {menuOpen ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mx-auto flex w-full max-w-6xl flex-col gap-1 border-t border-white/[0.06] px-5 py-3 md:hidden" aria-label={c.nav.mobileMenu}>
            {[["fonctionnalites", c.nav.features], ["dashboard", c.nav.dashboard], ["commandes", c.nav.commands]].map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={scrollTo(id)} className="rounded-lg px-3 py-2.5 text-[15px] text-zinc-300 hover:bg-white/[0.04] hover:text-white">
                {label}
              </a>
            ))}
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-2.5 text-[15px] text-zinc-300 hover:bg-white/[0.04] hover:text-white">{c.nav.support}</a>
            <a href={DASHBOARD_URL} className="rounded-lg px-3 py-2.5 text-[15px] text-zinc-300 hover:bg-white/[0.04] hover:text-white">{c.hero.openDashboard}</a>
          </nav>
        )}
      </div>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto w-full max-w-5xl px-5 pb-20 pt-16 text-center sm:pt-24">
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-zinc-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {stats ? c.hero.badgeActive(stats.guilds, numberFr(stats.members)) : c.hero.badgeDefault}
          </div>
          <h1 className="text-[clamp(2.6rem,7.2vw,5.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em] text-white">
            {c.hero.titleTop}
            <br />
            {c.hero.titleBottom} <span className="bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">{c.hero.titleAccent}</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-zinc-400">
            {c.hero.subtitle}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a href={INVITE_URL} target="_blank" rel="noopener noreferrer" className={primaryBtn}>
              <DiscordGlyph className="h-5 w-5" />
              {c.hero.add}
            </a>
            <a href={DASHBOARD_URL} className={ghostBtn}>
              {c.hero.openDashboard}
            </a>
          </div>
          <ProductPreview c={c} />
        </section>

        {/* Chiffres réels (masqués si l'API du bot ne répond pas) */}
        {stats && (
          <section className="mx-auto w-full max-w-4xl px-5 pb-8">
            <Reveal>
              <dl className="grid grid-cols-3 divide-x divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-white/[0.02] py-6">
                {[
                  [numberFr(stats.guilds), stats.guilds > 1 ? c.stats.servers[1] : c.stats.servers[0]],
                  [numberFr(stats.members), c.stats.members],
                  [numberFr(stats.commands), c.stats.commands],
                ].map(([value, label]) => (
                  <div key={label} className="px-3 text-center">
                    <dt className="sr-only">{label}</dt>
                    <dd className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{value}</dd>
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
              <Reveal key={f.icon} delay={(i % 3) * 70} className={f.wide ? "lg:col-span-4" : "lg:col-span-2"}>
                <div
                  style={{ ["--tint" as string]: f.tint }}
                  className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0d13] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[color:color-mix(in_srgb,var(--tint)_45%,transparent)]"
                >
                  <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-0 blur-3xl transition-opacity duration-500 [background:var(--tint)] group-hover:opacity-[0.18]" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] [background:color-mix(in_srgb,var(--tint)_14%,#0c0d13)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/bot-icons/${f.icon}.png`} alt="" width={32} height={32} loading="lazy" className="h-8 w-8" />
                  </div>
                  <h3 className="relative mt-5 text-[16px] font-semibold text-white">{item.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-zinc-400">{item.text}</p>
                </div>
              </Reveal>
              );
            })}
          </div>
        </section>

        {/* Dashboard */}
        <section id="dashboard" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
            <Reveal>
              <Eyebrow>{c.dashboard.eyebrow}</Eyebrow>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{c.dashboard.title}</h2>
              <p className="mt-3 text-zinc-400">{c.dashboard.text}</p>
              <a href={DASHBOARD_URL} className={`${ghostBtn} mt-8`}>
                {c.dashboard.open}
              </a>
            </Reveal>
            <ol className="space-y-4">
              {c.dashboard.steps.map((s, i) => (
                <Reveal key={s.title} delay={i * 90}>
                  <li className="flex gap-4 rounded-2xl border border-white/[0.07] bg-[#0c0d13] p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-sky-500/30 text-sm font-bold text-white ring-1 ring-white/10">{i + 1}</span>
                    <div>
                      <h3 className="text-[15px] font-semibold text-white">{s.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{s.text}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
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
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={c.commands.search}
                aria-label={c.commands.search}
                className="h-11 w-full rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-indigo-400/60 focus:bg-white/[0.05] sm:w-72"
              />
            )}
          </Reveal>

          {commandsFailed && !commands && (
            <p className="mt-10 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
              {c.commands.unavailable[0]}<span className="font-mono text-zinc-300">/help</span>{c.commands.unavailable[1]}
            </p>
          )}

          {commands && (
            <>
              <div className="mt-8 flex flex-wrap gap-2">
                {[["", commands.length] as [string, number], ...categories].map(([name, count]) => (
                  <button
                    key={name || "all"}
                    type="button"
                    onClick={() => setCategory(name)}
                    className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      category === name ? "border-indigo-400/50 bg-indigo-400/15 text-white" : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {name || c.commands.all} <span className={category === name ? "text-indigo-200/70" : "text-zinc-600"}>{count}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((cmd) => (
                  <div key={cmd.name} className="rounded-xl border border-white/[0.07] bg-[#0c0d13] p-4 transition-colors hover:border-white/15 hover:bg-[#0f1018]">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-sm font-semibold text-white">/{cmd.name}</span>
                      <span className="shrink-0 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">{cmd.category}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{cmd.description}</p>
                    {cmd.subcommands.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {cmd.subcommands.map((s) => (
                          <span key={s.name} title={s.description} className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {visible.length === 0 && <p className="col-span-full py-10 text-center text-sm text-zinc-500">{c.commands.noMatch(query)}</p>}
              </div>
            </>
          )}
        </section>

        {/* Appel final */}
        <section className="mx-auto w-full max-w-5xl px-5 py-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0c0d13] px-6 py-16 text-center sm:px-12">
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(99,102,241,0.28),transparent_70%)]" />
              <div className="relative">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">{c.cta.title}</h2>
                <p className="mx-auto mt-4 max-w-md text-zinc-400">{c.cta.text}</p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <a href={INVITE_URL} target="_blank" rel="noopener noreferrer" className={primaryBtn}>
                    <DiscordGlyph className="h-5 w-5" />
                    {c.cta.add}
                  </a>
                  <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className={ghostBtn}>
                    {c.cta.support}
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.07]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-zinc-500 sm:flex-row">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ethone-icon-192.png" alt="" width={22} height={22} className="rounded-md opacity-80" />
            <p>© {new Date().getFullYear()} ETHONE · {c.footer.tagline}</p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label={c.nav.footerNav}>
            <a href={DASHBOARD_URL} className="transition-colors hover:text-white">{c.nav.dashboard}</a>
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">{c.nav.support}</a>
            <a href="/terms" className="transition-colors hover:text-white">{c.footer.terms}</a>
            <a href="/privacy" className="transition-colors hover:text-white">{c.footer.privacy}</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
