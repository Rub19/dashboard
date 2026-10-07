"use client";

import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ExternalLink,
  Plus,
  Search,
  Server,
  Crown,
  Sparkles,
  ShieldCheck,
  Check,
  Headphones,
  FileText,
  Eye,
  Sliders,
  X,
  ArrowUpRight,
  LayoutDashboard,
} from "@/components/icons/ph";
import DiscordIcon from "@/components/DiscordIcon";
import LightBorder from "@/components/ui/LightBorder";
import ClientImage from "@/components/ClientImage";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { cn } from "@/lib/utils";
import { choreography, revealUp } from "@/lib/motion-variants";
import { EASE_SNAP, SPRING_PILL } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import type { DiscordGuild } from "@/lib/hooks/useDiscordOAuth";

interface ServerPickerProps {
  guilds: DiscordGuild[];
  totalCount: number;
  botGuildIds: Set<string>;
  botPresenceKnown: boolean;
  inviteUrl: string;
  userName?: string;
  isConnected: boolean;
  connecting: boolean;
  onConnect: () => void;
  onlyManageable: boolean;
  onToggleManageable: () => void;
  botAuthHref: string | null;
  onPick: (guild: DiscordGuild) => void;
}

const SUPPORT_DISCORD_URL = "https://discord.gg/WvEcyBuP45";
const DOCS_URL = "https://ethone.dev/discord";

function getGuildInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "SV";
}

function getGuildInviteUrl(baseInviteUrl: string, guildId: string) {
  return `${baseInviteUrl}&guild_id=${guildId}&disable_guild_select=true`;
}

function ClassicAvatar({ guild, dim, live }: { guild: DiscordGuild; dim?: boolean; live?: boolean }) {
  return (
    <span className="relative shrink-0">
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-raised)] text-sm font-bold text-[var(--text-primary)] ring-1 ring-[var(--panel-border)] transition-transform duration-300 [transition-timing-function:var(--ease-snap)] group-hover:scale-[1.06]",
          dim && "grayscale"
        )}
      >
        {guild.iconUrl ? (
          <ClientImage src={guild.iconUrl} alt={guild.name} width={44} height={44} className="h-full w-full object-cover" />
        ) : (
          getGuildInitials(guild.name)
        )}
      </span>
      {live && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--bg-card,var(--background))] bg-[var(--success)]"
          title="Bot installé"
          aria-label="Bot installé"
        />
      )}
    </span>
  );
}

export default function ServerPicker({
  guilds,
  totalCount,
  botGuildIds,
  botPresenceKnown,
  inviteUrl,
  userName,
  isConnected,
  connecting,
  onConnect,
  onlyManageable,
  onToggleManageable,
  botAuthHref,
  onPick,
}: ServerPickerProps) {
  const { reduced } = useMotionPref();
  const { setOpen: openCommandPalette } = useCommandPalette();

  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const [isPrivateBotModalOpen, setIsPrivateBotModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  const [viewMode, setViewMode] = useState<"modern" | "classic">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ethone:bot_picker_view");
      if (saved === "classic" || saved === "modern") return saved;
    }
    return "modern";
  });

  const setViewModeWithStorage = useCallback((mode: "modern" | "classic") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("ethone:bot_picker_view", mode);
    }
  }, []);

  const { installedGuilds, uninstalledGuilds } = useMemo(() => {
    const installed: DiscordGuild[] = [];
    const uninstalled: DiscordGuild[] = [];

    for (const g of guilds) {
      const isInstalled = botPresenceKnown && botGuildIds.has(g.id);
      if (isInstalled) {
        installed.push(g);
      } else {
        uninstalled.push(g);
      }
    }

    return { installedGuilds: installed, uninstalledGuilds: uninstalled };
  }, [guilds, botPresenceKnown, botGuildIds]);

  const filteredInstalled = useMemo(() => {
    if (!query.trim()) return installedGuilds;
    const q = query.toLowerCase();
    return installedGuilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [installedGuilds, query]);

  const filteredUninstalled = useMemo(() => {
    if (!query.trim()) return uninstalledGuilds;
    const q = query.toLowerCase();
    return uninstalledGuilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [uninstalledGuilds, query]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (q ? guilds.filter((g) => g.name.toLowerCase().includes(q)) : guilds), [guilds, q]);
  const showSearch = guilds.length > 6;

  const rowClass =
    "group relative flex w-full items-center gap-4 rounded-[var(--inset-radius)] px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50";
  const discordBtn =
    "btn-sheen relative mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-[var(--inset-radius)] bg-[#5865F2] px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#4752C4] active:translate-y-0 disabled:opacity-50";

  if (viewMode === "classic") {
    return (
      <div className="relative flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center overflow-x-clip px-4 py-10">
        <div className="fixed top-20 right-6 z-50">
          <button
            type="button"
            onClick={() => setViewModeWithStorage("modern")}
            className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/90 px-4 py-2 text-xs font-semibold text-emerald-300 shadow-xl backdrop-blur-md hover:bg-emerald-900 transition-all cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Vue Keeper Protect</span>
          </button>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[38%] h-[44rem] w-[44rem] max-w-[140vw] -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--accent-primary) 9%, transparent), transparent)" }}
        />

        <motion.div variants={choreography} initial={reduced ? "animate" : "initial"} animate="animate" className="relative w-full max-w-[460px]">
          <div className="mb-7 flex flex-col items-center text-center">
            <motion.div
              variants={{
                initial: { opacity: 0, scale: 0.6, filter: "blur(8px)" },
                animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE_SNAP } },
              }}
              className="relative h-24 w-24"
            >
              <motion.span
                aria-hidden
                className="absolute -inset-1 rounded-full"
                style={{ background: "conic-gradient(from 0deg, transparent 0deg, var(--accent-primary) 90deg, transparent 200deg, color-mix(in srgb, var(--accent-primary) 45%, transparent) 290deg, transparent 360deg)" }}
                animate={reduced ? undefined : { rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
              <ClientImage src="/branding/etho-avatar.gif" alt="Etho" width={96} height={96} className="relative h-24 w-24 rounded-full border-2 border-[var(--background)] object-cover" />
            </motion.div>
            <motion.h1 variants={revealUp} className="mt-5 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Etho
            </motion.h1>
            <motion.p variants={revealUp} className="mt-1.5 text-sm text-[var(--text-muted)]">
              {userName ? (
                <>
                  Connecté en tant que <span className="font-semibold text-[var(--text-primary)]">{userName}</span>
                </>
              ) : (
                "Choisis un serveur à configurer"
              )}
            </motion.p>
          </div>

          {botAuthHref && (
            <motion.a
              variants={revealUp}
              href={botAuthHref}
              className="group mb-4 flex items-center gap-3 rounded-[var(--panel-radius)] border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-3 text-xs leading-relaxed text-[var(--text-muted)] transition-[background-color,border-color] duration-300 hover:border-[#5865F2]/50 hover:bg-[#5865F2]/[0.16]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--inset-radius)] bg-[#5865F2]/20 text-[#aab3ff]">
                <DiscordIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block font-semibold text-[var(--text-primary)]">Connecte le bot à ton compte Discord</strong>
                Sans ça, le site ne voit ni les serveurs où le bot est actif, ni la musique en direct. Clique pour autoriser.
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]" />
            </motion.a>
          )}

          <motion.div variants={revealUp}>
            <LightBorder speed={10} className="shadow-[0_30px_80px_-30px_rgb(0_0_0/0.7)]" innerClassName="backdrop-blur-xl">
              {showSearch && (
                <div className="group flex items-center gap-2.5 border-b border-[var(--panel-border)] px-4">
                  <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--accent-primary)]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher un serveur"
                    aria-label="Rechercher un serveur"
                    className="h-12 w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  />
                </div>
              )}

              {guilds.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#5865F2]/15 text-[#aab3ff]">
                    <DiscordIcon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {totalCount === 0 && !isConnected ? "Compte non connecté" : "Aucun serveur trouvé"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {totalCount === 0 && !isConnected
                      ? "Connectez votre compte Discord pour charger vos serveurs."
                      : "Aucun serveur Discord associé à ce compte."}
                  </p>
                  {!isConnected ? (
                    <button type="button" onClick={onConnect} disabled={connecting} className={discordBtn}>
                      <DiscordIcon className="h-4 w-4" />
                      Lier mon compte
                    </button>
                  ) : (
                    <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className={discordBtn}>
                      <DiscordIcon className="h-4 w-4" />
                      Inviter le bot
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ) : visible.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-[var(--text-muted)]">Aucun serveur ne correspond.</p>
              ) : (
                <ul className="max-h-[min(60vh,520px)] space-y-0.5 overflow-y-auto p-2 [scrollbar-width:thin]" onMouseLeave={() => setHovered(null)}>
                  <AnimatePresence initial={!reduced} mode="popLayout">
                    {visible.map((guild, i) => {
                      const absent = botPresenceKnown && !botGuildIds.has(guild.id);
                      const live = botPresenceKnown && !absent;
                      const highlight = hovered === guild.id && (
                        <motion.span layoutId="picker-row" transition={SPRING_PILL} className="absolute inset-0 rounded-[var(--inset-radius)] bg-[var(--text-primary)]/[0.06]" />
                      );
                      return (
                        <motion.li
                          key={guild.id}
                          layout={reduced ? false : "position"}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_SNAP, delay: Math.min(i, 10) * 0.035 } }}
                          exit={{ opacity: 0, transition: { duration: 0.12 } }}
                          onMouseEnter={() => setHovered(guild.id)}
                        >
                          {absent ? (
                            <a
                              href={getGuildInviteUrl(inviteUrl, guild.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Inviter le bot sur ce serveur"
                              className={cn(rowClass, "opacity-50 transition-opacity duration-300 hover:opacity-100")}
                            >
                              {highlight}
                              <ClassicAvatar guild={guild} dim />
                              <span className="relative min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--text-muted)]">{guild.name}</span>
                              <Plus className="relative h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform duration-300 group-hover:rotate-90" aria-label="Ajouter le bot" />
                            </a>
                          ) : (
                            <button type="button" onClick={() => onPick(guild)} className={cn(rowClass, "cursor-pointer")}>
                              {highlight}
                              <ClassicAvatar guild={guild} live={live} />
                              <span className="relative min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--text-primary)]">{guild.name}</span>
                              <ChevronRight className="relative h-5 w-5 shrink-0 text-[var(--text-muted)] transition-[transform,color] duration-300 [transition-timing-function:var(--ease-snap)] group-hover:translate-x-1 group-hover:text-[var(--text-primary)]" />
                            </button>
                          )}
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}

              {totalCount > 0 && (
                <div className="flex items-center justify-between gap-3 border-t border-[var(--panel-border)] px-4 py-3">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Uniquement gérables</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={onlyManageable}
                    aria-label="Uniquement les serveurs gérables"
                    onClick={onToggleManageable}
                    className={cn(
                      "relative h-6 w-11 shrink-0 cursor-pointer rounded-full outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50",
                      onlyManageable ? "bg-[var(--accent-primary)]" : "bg-[var(--text-primary)]/15"
                    )}
                  >
                    <motion.span
                      className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow"
                      initial={false}
                      animate={{ x: onlyManageable ? 20 : 0 }}
                      transition={SPRING_PILL}
                    />
                  </button>
                </div>
              )}
            </LightBorder>
          </motion.div>

          <motion.div variants={revealUp} className="mt-5 text-center">
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
            >
              <Plus className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90" />
              Inviter le bot sur un autre serveur
            </a>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] w-full bg-[#050907] text-[#e6f4ed] flex flex-col md:flex-row antialiased">
      <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[#122118] bg-[#070e0a]/90 backdrop-blur-xl flex flex-col justify-between p-4 md:sticky md:top-0 md:h-[calc(100dvh-4rem)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <span className="block font-bold text-sm tracking-tight text-white">Etho Protect</span>
                <span className="block text-[10px] text-emerald-400/80 font-mono uppercase tracking-wider">Console Bot</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewModeWithStorage("classic")}
              className="md:hidden flex items-center gap-1 rounded-md border border-[#1b2f23] bg-[#0e1a14] px-2 py-1 text-[10px] text-[#8aa895]"
            >
              <Eye className="h-3 w-3" />
              <span>Classique</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCommandPalette(true)}
            className="w-full flex items-center justify-between rounded-xl border border-[#17271e] bg-[#0b1410] px-3 py-2 text-xs text-[#71917f] hover:border-emerald-500/40 hover:text-emerald-300 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Rechercher réglage...</span>
            </div>
            <kbd className="rounded border border-[#1e3427] bg-[#101e16] px-1.5 py-0.5 text-[10px] font-mono text-[#8faea0]">
              Ctrl K
            </kbd>
          </button>

          <nav className="space-y-1">
            <div className="flex items-center justify-between rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-300">
              <div className="flex items-center gap-2.5">
                <Server className="h-4 w-4 text-emerald-400" />
                <span>Serveurs</span>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                {installedGuilds.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsPremiumModalOpen(true)}
              className="w-full flex items-center justify-between rounded-xl border border-transparent px-3 py-2 text-xs font-semibold text-[#8caaa0] hover:border-emerald-500/20 hover:bg-[#0c1812] hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Crown className="h-4 w-4 text-amber-400" />
                <span>Premium</span>
              </div>
              <Sparkles className="h-3 w-3 text-amber-400/80" />
            </button>
          </nav>

          <div className="pt-2 border-t border-[#122118] space-y-1 text-xs">
            <button
              type="button"
              onClick={() => setQuery("")}
              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[#739281] hover:bg-[#0d1812] hover:text-[#d3e9dc] transition-colors"
            >
              <Server className="h-3.5 w-3.5" />
              <span>Mes serveurs</span>
            </button>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[#739281] hover:bg-[#0d1812] hover:text-[#d3e9dc] transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                <span>Documentation</span>
              </div>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
            <a
              href={SUPPORT_DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[#739281] hover:bg-[#0d1812] hover:text-[#d3e9dc] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Headphones className="h-3.5 w-3.5" />
                <span>Support</span>
              </div>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </div>
        </div>

        <div className="pt-4 border-t border-[#122118] space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-[#16271e] bg-[#09120e] p-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                {(userName || "rub19").slice(0, 2).toUpperCase()}
              </div>
              <span className="truncate text-xs font-bold text-[#e6f4ed]">{userName || "rub19"}</span>
            </div>

            <button
              type="button"
              onClick={() => setViewModeWithStorage("classic")}
              className="hidden md:flex items-center gap-1 rounded-md border border-[#1a2e22] bg-[#0c1611] px-2 py-1 text-[10px] text-[#789d88] hover:border-emerald-500/40 hover:text-white transition-all cursor-pointer"
              title="Basculer vers la vue classique"
            >
              <Eye className="h-3 w-3" />
              <span>Classique</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 md:p-8 lg:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#122118] pb-4">
            <div className="flex items-center gap-2 text-xs text-[#71917f]">
              <span className="font-semibold text-white">Etho</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-emerald-400 font-medium">Serveurs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Tout est enregistré</span>
              </div>
              <button
                type="button"
                onClick={() => setViewModeWithStorage("classic")}
                className="flex items-center gap-1.5 rounded-full border border-[#1b3124] bg-[#0c1812] px-3 py-1 text-[11px] font-medium text-[#88a896] hover:text-white hover:border-emerald-500/40 transition-all cursor-pointer"
              >
                <Sliders className="h-3 w-3" />
                <span>Vue classique</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Bonjour {userName || "rub19"}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-[#799987]">
                  Gérez vos serveurs protégés ou installez le bot Etho en un clic.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#688a77]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher un serveur..."
                    className="w-full rounded-xl border border-[#16271e] bg-[#0a1410] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-[#688a77] outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/40 transition-all"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71917f] hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {totalCount > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#16271e] bg-[#0a1410] px-3 py-2 shrink-0">
                    <span className="text-xs text-[#799987]">Gérables</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={onlyManageable}
                      aria-label="Uniquement les serveurs gérables"
                      onClick={onToggleManageable}
                      className={cn(
                        "relative h-5 w-9 shrink-0 cursor-pointer rounded-full outline-none transition-colors duration-300",
                        onlyManageable ? "bg-emerald-500" : "bg-[#182d21]"
                      )}
                    >
                      <motion.span
                        className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow"
                        initial={false}
                        animate={{ x: onlyManageable ? 16 : 0 }}
                        transition={SPRING_PILL}
                      />
                    </button>
                  </div>
                )}
              </div>

              {!isConnected && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center space-y-3">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <DiscordIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Connexion Discord requise</h3>
                    <p className="mt-1 text-xs text-[#7ea08d]">
                      Connectez votre compte Discord pour synchroniser et protéger vos serveurs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onConnect}
                    disabled={connecting}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400 transition-all cursor-pointer"
                  >
                    <DiscordIcon className="h-4 w-4" />
                    <span>Lier mon compte Discord</span>
                  </button>
                </div>
              )}

              {filteredInstalled.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#738f80] font-medium px-1">
                    <span>Avec Etho · {filteredInstalled.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {filteredInstalled.map((guild) => (
                      <div
                        key={guild.id}
                        className="group flex items-center justify-between rounded-xl border border-[#16271e] bg-[#09120e] px-4 py-3 hover:border-emerald-500/40 hover:bg-[#0c1813] transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {guild.iconUrl ? (
                            <ClientImage
                              src={guild.iconUrl}
                              alt={guild.name}
                              width={36}
                              height={36}
                              className="h-9 w-9 rounded-full object-cover border border-[#1f3427]"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#122319] text-emerald-400 font-bold text-xs border border-[#1f3427]">
                              {getGuildInitials(guild.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                              {guild.name}
                            </h4>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onPick(guild)}
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Gérer</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[#738f80] font-medium px-1">
                  <span>Sans Etho · {filteredUninstalled.length}</span>
                </div>

                {filteredUninstalled.length === 0 && guilds.length > 0 && (
                  <div className="rounded-xl border border-[#16271e] bg-[#09120e] p-8 text-center text-xs text-[#738f80]">
                    {query
                      ? "Aucun serveur ne correspond à votre recherche."
                      : "Etho est déjà installé sur l'ensemble de vos serveurs !"}
                  </div>
                )}

                <div className="space-y-1.5">
                  {filteredUninstalled.map((guild) => (
                    <div
                      key={guild.id}
                      className="group flex items-center justify-between rounded-xl border border-[#16271e] bg-[#09120e] px-4 py-3 hover:border-[#243c2e] hover:bg-[#0c1812] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {guild.iconUrl ? (
                          <ClientImage
                            src={guild.iconUrl}
                            alt={guild.name}
                            width={36}
                            height={36}
                            className="h-9 w-9 rounded-full object-cover border border-[#1f3427]"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#122319] text-[#8caaa0] font-bold text-xs border border-[#1f3427]">
                            {getGuildInitials(guild.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                            {guild.name}
                          </h4>
                        </div>
                      </div>

                      <a
                        href={getGuildInviteUrl(inviteUrl, guild.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-[#1e3427] bg-[#0f1d16] px-3 py-1.5 text-xs font-semibold text-[#8caaa0] hover:border-emerald-500/40 hover:text-white transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Installer</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="lg:col-span-4 hidden lg:block space-y-4">
              <div className="rounded-2xl border border-[#16271e] bg-gradient-to-b from-[#0c1813] to-[#07110c] p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Bots privés</span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white leading-snug">
                    Ton propre bot de protection
                  </h3>
                  <p className="text-xs text-[#738f80] leading-relaxed">
                    Déploie une instance Etho privée dédiée avec ton nom, ton logo et tes clés pour une protection anti-raid étanche.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPrivateBotModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all cursor-pointer"
                >
                  <span>En savoir plus</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="rounded-2xl border border-[#14231a] bg-[#070e0a] p-4 text-xs text-[#6e8b7b] space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Besoin d'aide ?</span>
                </div>
                <p className="leading-relaxed">
                  Notre équipe est disponible 24/7 sur le serveur Discord pour configurer votre serveur.
                </p>
                <a
                  href={SUPPORT_DISCORD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-400 font-medium hover:underline pt-1"
                >
                  <span>Rejoindre le support</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isPrivateBotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-2xl border border-[#182b20] bg-[#08120e] p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                  <h3 className="text-lg font-bold text-white">Etho Protect — Bot Privé</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrivateBotModalOpen(false)}
                  className="rounded-lg p-1 text-[#738f80] hover:text-white hover:bg-[#122319] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-[#8caaa0]">
                <div className="rounded-xl border border-[#16271e] bg-[#0a1610] p-3.5 space-y-1">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    Rollback anti-raid 1-clic
                  </h4>
                  <p className="text-xs text-[#71917f]">
                    Restauration automatique des salons, rôles et permissions en cas d'attaque ou de token leak.
                  </p>
                </div>

                <div className="rounded-xl border border-[#16271e] bg-[#0a1610] p-3.5 space-y-1">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    Nom & avatar personnalisés
                  </h4>
                  <p className="text-xs text-[#71917f]">
                    Le bot porte le nom et les couleurs de ta communauté avec une présence statut sur-mesure.
                  </p>
                </div>

                <div className="rounded-xl border border-[#16271e] bg-[#0a1610] p-3.5 space-y-1">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    Instance Cloud 99.9%
                  </h4>
                  <p className="text-xs text-[#71917f]">
                    Hébergement dédié haute disponibilité sans interruption ni dépendance aux serveurs tiers.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPrivateBotModalOpen(false)}
                  className="rounded-xl border border-[#16271e] bg-[#0b1610] px-4 py-2 text-xs font-semibold text-[#8caaa0] hover:text-white transition-colors"
                >
                  Fermer
                </button>
                <a
                  href={SUPPORT_DISCORD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400 transition-all"
                >
                  Contacter l'équipe
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPremiumModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#0c120e] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <Crown className="h-5 w-5" />
                  <h3 className="text-lg font-bold text-white">Etho Premium</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPremiumModalOpen(false)}
                  className="rounded-lg p-1 text-[#738f80] hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-[#8caaa0] leading-relaxed">
                Profitez des sauvegardes automatiques toutes les 6 heures, de la musique haute fidélité 320 kbps sans latence, et des logs d'audit illimités pour tous vos serveurs.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPremiumModalOpen(false)}
                  className="rounded-xl border border-[#16271e] bg-[#0b1610] px-4 py-2 text-xs font-semibold text-[#8caaa0] hover:text-white transition-colors"
                >
                  Fermer
                </button>
                <a
                  href={SUPPORT_DISCORD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 transition-all"
                >
                  Découvrir les offres
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
