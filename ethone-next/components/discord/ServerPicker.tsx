"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ExternalLink, Plus, Search } from "@/components/icons/ph";
import DiscordIcon from "@/components/DiscordIcon";
import { cn } from "@/lib/utils";
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

function Avatar({ guild, dim }: { guild: DiscordGuild; dim?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-raised)] text-sm font-bold text-[var(--text-primary)]",
        dim && "grayscale"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {guild.iconUrl ? <img src={guild.iconUrl} alt="" className="h-full w-full object-cover" /> : initialsOf(guild.name)}
    </span>
  );
}

/** Première page du Bot Discord (façon Sapphire) : on choisit un serveur avant d'ouvrir son tableau de bord. */
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
  const [query, setQuery] = useState("");
  const showSearch = guilds.length > 6;
  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (q ? guilds.filter((g) => g.name.toLowerCase().includes(q)) : guilds), [guilds, q]);

  const rowClass = "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]";

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5865F2] text-white">
            <DiscordIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Etho</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {userName ? (
              <>
                Connecté en tant que <span className="font-semibold text-[var(--text-primary)]">{userName}</span>
              </>
            ) : (
              "Choisis un serveur à configurer"
            )}
          </p>
        </div>

        {botAuthHref && (
          <a
            href={botAuthHref}
            className="mb-4 block rounded-2xl border border-[var(--panel-border)] bg-[#5865F2]/10 px-4 py-3 text-xs leading-relaxed text-[var(--text-muted)] transition-colors hover:bg-[#5865F2]/20"
          >
            <strong className="font-semibold text-[var(--text-primary)]">Connecte le bot à ton compte Discord</strong>
            <br />
            Sans ça, le site ne voit ni les serveurs où le bot est actif, ni la musique en direct. Clique pour autoriser.
          </a>
        )}

        <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50">
          {showSearch && (
            <div className="flex items-center gap-2 border-b border-[var(--panel-border)] px-4">
              <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un serveur"
                aria-label="Rechercher un serveur"
                className="h-11 w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
          )}

          {guilds.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {totalCount === 0 && !isConnected ? "Compte non connecté" : "Aucun serveur trouvé"}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {totalCount === 0 && !isConnected
                  ? "Connectez votre compte Discord pour charger vos serveurs."
                  : "Aucun serveur Discord associé à ce compte."}
              </p>
              {!isConnected ? (
                <button
                  type="button"
                  onClick={onConnect}
                  disabled={connecting}
                  className="mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:opacity-50"
                >
                  <DiscordIcon className="h-3.5 w-3.5" />
                  Lier mon compte
                </button>
              ) : (
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4]"
                >
                  <DiscordIcon className="h-3.5 w-3.5" />
                  Inviter le bot
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : visible.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-[var(--text-muted)]">Aucun serveur ne correspond.</p>
          ) : (
            <ul className="max-h-[min(60vh,520px)] divide-y divide-[var(--panel-border)] overflow-y-auto">
              {visible.map((guild) => {
                const absent = botPresenceKnown && !botGuildIds.has(guild.id);
                return (
                  <li key={guild.id}>
                    {absent ? (
                      <a
                        href={`${inviteUrl}&guild_id=${guild.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Inviter le bot sur ce serveur"
                        className={cn(rowClass, "opacity-60 hover:opacity-100")}
                      >
                        <Avatar guild={guild} dim />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-muted)]">{guild.name}</span>
                        <Plus className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-label="Ajouter le bot" />
                      </a>
                    ) : (
                      <button type="button" onClick={() => onPick(guild)} className={cn(rowClass, "cursor-pointer")}>
                        <Avatar guild={guild} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">{guild.name}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                      </button>
                    )}
                  </li>
                );
              })}
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
                className={cn("relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors", onlyManageable ? "bg-emerald-500" : "bg-white/15")}
              >
                <span className={cn("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", onlyManageable ? "translate-x-5" : "translate-x-0")} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Inviter le bot sur un autre serveur
          </a>
        </div>
      </div>
    </div>
  );
}
