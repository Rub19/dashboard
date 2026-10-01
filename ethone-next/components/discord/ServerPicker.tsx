"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ExternalLink, Plus, Search } from "@/components/icons/ph";
import DiscordIcon from "@/components/DiscordIcon";
import LightBorder from "@/components/ui/LightBorder";
import { cn } from "@/lib/utils";
import { choreography, revealUp } from "@/lib/motion-variants";
import { EASE_SNAP, SPRING_PILL } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import type { DiscordGuild } from "@/lib/hooks/useDiscordOAuth";

interface ServerPickerProps {
  /** Serveurs à afficher, déjà filtrés (gérables) et triés (bot installé d'abord). */
  guilds: DiscordGuild[];
  /** Nombre total de serveurs du compte, avant filtre « gérables » (0 = rien de chargé). */
  totalCount: number;
  botGuildIds: Set<string>;
  /** Faux tant que la présence du bot n'est pas connue : tous les serveurs restent alors cliquables. */
  botPresenceKnown: boolean;
  inviteUrl: string;
  userName?: string;
  isConnected: boolean;
  connecting: boolean;
  onConnect: () => void;
  onlyManageable: boolean;
  onToggleManageable: () => void;
  /** Lien d'autorisation du compte bot quand le bot répond 401, sinon null. */
  botAuthHref: string | null;
  onPick: (guild: DiscordGuild) => void;
}

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function Avatar({ guild, dim, live }: { guild: DiscordGuild; dim?: boolean; live?: boolean }) {
  return (
    <span className="relative shrink-0">
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-raised)] text-sm font-bold text-[var(--text-primary)] ring-1 ring-[var(--panel-border)] transition-transform duration-300 [transition-timing-function:var(--ease-snap)] group-hover:scale-[1.06]",
          dim && "grayscale"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {guild.iconUrl ? <img src={guild.iconUrl} alt="" className="h-full w-full object-cover" /> : initialsOf(guild.name)}
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

/** Première page du Bot Discord : on choisit un serveur avant d'ouvrir son tableau de bord. */
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
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const showSearch = guilds.length > 6;
  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (q ? guilds.filter((g) => g.name.toLowerCase().includes(q)) : guilds), [guilds, q]);

  const rowClass =
    "group relative flex w-full items-center gap-4 rounded-[var(--inset-radius)] px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50";
  const discordBtn =
    "btn-sheen relative mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-[var(--inset-radius)] bg-[#5865F2] px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#4752C4] active:translate-y-0 disabled:opacity-50";

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center overflow-x-clip px-4 py-10">
      {/* Lumière douce derrière la composition, qui s'efface avant les bords */}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/etho-avatar.gif" alt="Etho" className="relative h-24 w-24 rounded-full border-2 border-[var(--background)] object-cover" />
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
                            href={`${inviteUrl}&guild_id=${guild.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Inviter le bot sur ce serveur"
                            className={cn(rowClass, "opacity-50 transition-opacity duration-300 hover:opacity-100")}
                          >
                            {highlight}
                            <Avatar guild={guild} dim />
                            <span className="relative min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--text-muted)]">{guild.name}</span>
                            <Plus className="relative h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform duration-300 group-hover:rotate-90" aria-label="Ajouter le bot" />
                          </a>
                        ) : (
                          <button type="button" onClick={() => onPick(guild)} className={cn(rowClass, "cursor-pointer")}>
                            {highlight}
                            <Avatar guild={guild} live={live} />
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
                    onlyManageable ? "bg-[var(--success)]" : "bg-[var(--text-primary)]/15"
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
