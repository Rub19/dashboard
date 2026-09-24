"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Page vitrine publique du bot Discord (ethone.dev/bot). Aucune donnée inventée : les compteurs et la liste des
 * commandes viennent de l'API publique du bot ; si elle ne répond pas, ces blocs sont simplement masqués.
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

const FEATURES: Array<{ icon: string; title: string; text: string }> = [
  { icon: "moderation", title: "Modération", text: "Avertissements, mutes, expulsions, bannissements et historique des cas, en commande ou depuis le dashboard." },
  { icon: "security", title: "Anti-Raid & Anti-Nuke", text: "Détection des arrivées massives et des suppressions en série, avec verrouillage d'urgence du serveur." },
  { icon: "logs", title: "Journal d'audit", text: "Chaque action importante est enregistrée : messages, rôles, salons, sanctions. Recherchable et filtrable." },
  { icon: "welcome", title: "Bienvenue & vérification", text: "Messages d'accueil, rôles automatiques et vérification des nouveaux membres avant l'accès au serveur." },
  { icon: "level", title: "Niveaux & récompenses", text: "Expérience par messages, classement et rôles décernés automatiquement selon le niveau." },
  { icon: "economy", title: "Économie & boutique", text: "Monnaie du serveur, récompense quotidienne, boutique de rôles et classement des membres." },
  { icon: "music", title: "Musique", text: "Lecture dans les salons vocaux avec file d'attente, playlists et contrôles depuis le dashboard." },
  { icon: "ticket", title: "Tickets", text: "Un système de support par salons privés, avec équipes de staff, transcriptions et statistiques." },
  { icon: "giveaway", title: "Giveaways & événements", text: "Tirages au sort, sondages, événements avec inscriptions et rappels automatiques." },
  { icon: "reminder", title: "Outils du quotidien", text: "Rappels, anniversaires, messages épinglés, tags de réponse, statut AFK et salons compteurs." },
];

const DASHBOARD_POINTS: Array<{ title: string; text: string }> = [
  { title: "Tout se règle en ligne", text: "Chaque module possède sa page de configuration : salons, rôles, messages, seuils. Rien à taper en commande." },
  { title: "Synchronisé avec Discord", text: "Un rôle ou un salon créé sur Discord apparaît dans le dashboard sans recharger, et un réglage enregistré s'applique tout de suite." },
  { title: "Un état clair par module", text: "Le hub indique pour chaque module s'il est actif, et propose une configuration rapide ou la page complète." },
];

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

export default function BotLanding() {
  const { stats, commands, commandsFailed } = useLiveData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Toutes");

  const categories = useMemo(() => {
    if (!commands) return [];
    const counts = new Map<string, number>();
    for (const c of commands) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [commands]);

  const visible = useMemo(() => {
    if (!commands) return [];
    const q = fold(query.trim());
    return commands.filter((c) => {
      if (category !== "Toutes" && c.category !== category) return false;
      if (!q) return true;
      return fold(`${c.name} ${c.description} ${c.subcommands.map((s) => `${s.name} ${s.description}`).join(" ")}`).includes(q);
    });
  }, [commands, query, category]);

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const linkClass = "text-sm text-zinc-400 transition-colors hover:text-white";

  return (
    <div className="h-dvh w-full overflow-y-auto scroll-smooth bg-[#090a0f] text-zinc-200 antialiased">
      {/* Halo discret en haut de page : la seule décoration */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.16),transparent_70%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <a href="/bot" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/ethone-icon-192.png" alt="" width={34} height={34} className="rounded-[10px]" />
          <span className="text-[15px] font-bold tracking-[0.18em] text-white">ETHONE</span>
        </a>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navigation principale">
          <a href="#fonctionnalites" onClick={scrollTo("fonctionnalites")} className={linkClass}>Fonctionnalités</a>
          <a href="#dashboard" onClick={scrollTo("dashboard")} className={linkClass}>Dashboard</a>
          <a href="#commandes" onClick={scrollTo("commandes")} className={linkClass}>Commandes</a>
          <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>Support</a>
        </nav>
        <div className="flex items-center gap-2">
          <a href={DASHBOARD_URL} className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/25 hover:text-white sm:inline-block">
            Dashboard
          </a>
          <a href={INVITE_URL} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200">
            Inviter
          </a>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto w-full max-w-4xl px-5 pb-24 pt-20 text-center sm:pt-28">
          {stats && (
            <p className="mb-7 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
              Actif sur {numberFr(stats.guilds)} serveur{stats.guilds > 1 ? "s" : ""} · {numberFr(stats.members)} membres
            </p>
          )}
          <h1 className="text-[clamp(2.6rem,7.2vw,5.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em] text-white">
            Le bot qui gère
            <br />
            votre serveur, <span className="bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">vraiment.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-zinc-400">
            Modération, sécurité, musique, économie, tickets. Tout se configure depuis un dashboard synchronisé en direct avec Discord.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a href={INVITE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200">
              <DiscordGlyph className="h-5 w-5" />
              Ajouter à Discord
            </a>
            <a href={DASHBOARD_URL} className="rounded-full border border-white/10 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/[0.04]">
              Ouvrir le dashboard
            </a>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="mx-auto w-full max-w-6xl scroll-mt-6 px-5 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Ce que le bot fait pour vous</h2>
            <p className="mt-3 text-zinc-400">Des modules indépendants : activez seulement ce dont votre serveur a besoin.</p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-[#0c0d13] p-6 transition-colors hover:bg-[#10111a]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/bot-icons/${f.icon}.png`} alt="" width={40} height={40} loading="lazy" className="h-10 w-10" />
                <h3 className="mt-5 text-[15px] font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Dashboard */}
        <section id="dashboard" className="mx-auto w-full max-w-6xl scroll-mt-6 px-5 py-20">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Un vrai dashboard, pas une liste de commandes</h2>
              <p className="mt-3 text-zinc-400">Connectez-vous avec Discord et gérez chaque serveur dont vous êtes administrateur.</p>
              <a href={DASHBOARD_URL} className="mt-8 inline-flex rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/[0.04]">
                Ouvrir le dashboard
              </a>
            </div>
            <ul className="divide-y divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-[#0c0d13]">
              {DASHBOARD_POINTS.map((p) => (
                <li key={p.title} className="p-6">
                  <h3 className="text-[15px] font-semibold text-white">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{p.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Commandes */}
        <section id="commandes" className="mx-auto w-full max-w-6xl scroll-mt-6 px-5 py-20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Commandes</h2>
              <p className="mt-3 text-zinc-400">
                {commands ? `${numberFr(commands.length)} commandes slash, lues directement sur le bot.` : "La liste complète des commandes slash du bot."}
              </p>
            </div>
            {commands && (
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une commande"
                aria-label="Rechercher une commande"
                className="h-11 w-full rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-white/30 sm:w-72"
              />
            )}
          </div>

          {commandsFailed && !commands && (
            <p className="mt-10 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
              La liste des commandes n'est pas disponible pour le moment. Elle reste consultable avec <span className="font-mono text-zinc-300">/help</span> sur Discord.
            </p>
          )}

          {commands && (
            <>
              <div className="mt-8 flex flex-wrap gap-2">
                {[["Toutes", commands.length] as [string, number], ...categories].map(([name, count]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setCategory(name)}
                    className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      category === name ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {name} <span className="text-zinc-500">{count}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {visible.map((c) => (
                  <div key={c.name} className="rounded-xl border border-white/[0.07] bg-[#0c0d13] p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-sm font-semibold text-white">/{c.name}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-600">{c.category}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-zinc-400">{c.description}</p>
                    {c.subcommands.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {c.subcommands.map((s) => (
                          <span key={s.name} title={s.description} className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {visible.length === 0 && <p className="col-span-full py-10 text-center text-sm text-zinc-500">Aucune commande ne correspond à « {query} ».</p>}
              </div>
            </>
          )}
        </section>

        {/* Appel final */}
        <section className="mx-auto w-full max-w-4xl px-5 py-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">Prêt à l'essayer ?</h2>
          <p className="mx-auto mt-4 max-w-md text-zinc-400">L'invitation prend une minute. Vous choisissez ensuite les modules à activer.</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href={INVITE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200">
              <DiscordGlyph className="h-5 w-5" />
              Ajouter à Discord
            </a>
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/10 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/[0.04]">
              Rejoindre le support
            </a>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.07]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-zinc-500 sm:flex-row">
          <p>© {new Date().getFullYear()} ETHONE · projet indépendant</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Liens du pied de page">
            <a href={DASHBOARD_URL} className="transition-colors hover:text-white">Dashboard</a>
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">Support</a>
            <a href="/terms" className="transition-colors hover:text-white">Conditions</a>
            <a href="/privacy" className="transition-colors hover:text-white">Confidentialité</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
