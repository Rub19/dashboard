"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  RefreshCw,
  Server,
  Users,
  ShieldCheck,
  ShieldAlert,
  Music2,
  Ticket,
  Gift,
  DatabaseBackup,
  Activity,
  Plus,
  ChevronRight,
  Bot,
  ExternalLink,
} from "@/components/icons/ph";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { useGuildOverview } from "@/lib/hooks/useGuildOverview";
import { GuildSelector } from "@/components/GuildSelector";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

function formatUptime(ms: number): string {
  const s = Math.floor((ms || 0) / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "jamais";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

function OverviewCard({
  icon,
  color,
  title,
  href,
  children,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 transition-colors hover:border-[var(--accent-primary)]/30"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-[var(--inset-radius)] ${color}`}>
            {icon}
          </span>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        <ChevronRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
      </div>
      {children}
    </Link>
  );
}

function CardSkeleton() {
  return <div className="h-16 animate-pulse rounded-[var(--inset-radius)] bg-white/[0.03]" />;
}

function CardError({ message = "Indisponible pour le moment." }: { message?: string }) {
  return <p className="text-xs text-[var(--text-muted)]">{message}</p>;
}

export default function OverviewClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const allGuilds: DiscordGuild[] = useMemo(() => {
    if (profile?.guilds && profile.guilds.length > 0) return profile.guilds;
    return getStoredDiscordGuilds();
  }, [profile?.guilds]);

  const botGuildIds = useBotGuildIds(allGuilds);

  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (allGuilds.length === 0) return [];
    const manageable = allGuilds.filter((g) => canManageGuild(g) || (botGuildIds && botGuildIds.includes(g.id)));
    return manageable.length > 0 ? manageable : allGuilds;
  }, [allGuilds, botGuildIds]);

  // Le paramètre d'URL n'est appliqué qu'une fois par valeur : sinon il annule le choix fait dans le sélecteur.
  const appliedQueryGuild = useRef<string | null>(null);
  const userSelectedRef = useRef(false);
  const queryGuildId = searchParams.get("guildId");
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (queryGuildId && appliedQueryGuild.current !== queryGuildId) {
      const match = manageableGuilds.find((g) => g.id === queryGuildId);
      if (match) {
        appliedQueryGuild.current = queryGuildId;
        setSelectedGuild(match);
        return;
      }
    }
    if (!userSelectedRef.current && !queryGuildId) {
      if (!selectedGuild) {
        if (botGuildIds !== null) {
          setSelectedGuild(pickBotGuild(manageableGuilds, botGuildIds)!);
        }
      } else if (botGuildIds && botGuildIds.length > 0 && !botGuildIds.includes(selectedGuild.id)) {
        const botGuild = pickBotGuild(manageableGuilds, botGuildIds);
        if (botGuild && botGuild.id !== selectedGuild.id && botGuildIds.includes(botGuild.id)) {
          setSelectedGuild(botGuild);
        }
      }
    }
  }, [manageableGuilds, queryGuildId, selectedGuild, botGuildIds]);

  const isBotPresent = Boolean(selectedGuild && botGuildIds?.includes(selectedGuild.id));
  const { guild, botWide, moderation, music, tickets, giveaways, security, backups, refresh } = useGuildOverview(
    isBotPresent ? selectedGuild?.id || null : null
  );

  const anyLoading =
    guild.loading || botWide.loading || moderation.loading || music.loading || tickets.loading || giveaways.loading || security.loading || backups.loading;

  if (!BOT_API_URL) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-sm rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 text-center">
          <LayoutDashboard className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">Le serveur du bot n'est pas configuré ici.</p>
        </div>
      </div>
    );
  }

  const gid = selectedGuild?.id || "";

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] p-4 pb-44 text-[var(--text-primary)] md:p-8 md:pb-44">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-[var(--inset-radius)] border border-indigo-500/30 bg-indigo-500/15 p-2.5 text-indigo-400">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Vue d'ensemble</h1>
              <p className="text-xs text-[var(--text-muted)]">
                État en direct du bot, de la modération, de la musique et plus — pour ce serveur.
              </p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={anyLoading}
            className="flex items-center gap-2 self-start rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${anyLoading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>

        {manageableGuilds.length > 0 && (
          <GuildSelector
            guilds={manageableGuilds}
            value={selectedGuild?.id || ""}
            onChange={(g) => {
              userSelectedRef.current = true;
              setSelectedGuild(g);
            }}
          />
        )}

        {/* Bot Invitation Banner if absent */}
        {selectedGuild && botGuildIds !== null && !isBotPresent && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[var(--panel-radius)] border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs text-indigo-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Le bot ETHONE n&apos;est pas installé sur ce serveur</p>
                <p className="mt-0.5 text-zinc-300">
                  Invitez le bot sur « {selectedGuild.name} » pour activer la modération en temps réel, la musique, les tickets et les statistiques.
                </p>
              </div>
            </div>
            <a
              href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors shrink-0"
            >
              <span>Inviter le bot</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {!selectedGuild ? (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">
            Aucun serveur administrable trouvé — connecte Discord dans les réglages.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <OverviewCard icon={<Server className="h-4 w-4" />} color="bg-indigo-500/15 text-indigo-400" title="Statut" href="/discord/bot">
                {guild.loading ? (
                  <CardSkeleton />
                ) : !isBotPresent ? (
                  <CardError message="Bot non installé sur ce serveur." />
                ) : guild.error || !guild.data?.botStatus ? (
                  <CardError />
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${guild.data.botStatus.online ? "bg-emerald-400" : "bg-rose-400"}`} />
                      <span className="text-lg font-bold">{guild.data.botStatus.online ? "En ligne" : "Hors ligne"}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Uptime {formatUptime(guild.data.botStatus.uptimeMs)} · {guild.data.botStatus.pingMs} ms
                    </p>
                  </>
                )}
              </OverviewCard>

              <OverviewCard icon={<Users className="h-4 w-4" />} color="bg-cyan-500/15 text-cyan-400" title="Serveurs & Membres" href="/discord/bot">
                {guild.loading || botWide.loading ? (
                  <CardSkeleton />
                ) : !isBotPresent ? (
                  <CardError message="Bot non installé sur ce serveur." />
                ) : (
                  <>
                    <p className="text-lg font-bold">{guild.data?.guild?.memberCount ?? "—"} membres</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {botWide.data?.guildsCount ?? "—"} serveurs gérés au total
                    </p>
                  </>
                )}
              </OverviewCard>

              <OverviewCard icon={<ShieldCheck className="h-4 w-4" />} color="bg-blue-500/15 text-blue-400" title="Modération" href={`/discord/moderation?guildId=${gid}`}>
                {moderation.loading ? (
                  <CardSkeleton />
                ) : !isBotPresent ? (
                  <CardError message="Bot non installé sur ce serveur." />
                ) : moderation.error || !moderation.data ? (
                  <CardError />
                ) : (
                  <>
                    <p className="text-lg font-bold">{moderation.data.stats.casesToday} aujourd'hui</p>
                    <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                      {moderation.data.recentCases[0]
                        ? `${moderation.data.recentCases[0].type} — ${moderation.data.recentCases[0].targetTag || "membre"}`
                        : "Aucun cas récent"}
                    </p>
                  </>
                )}
              </OverviewCard>

              <OverviewCard icon={<ShieldAlert className="h-4 w-4" />} color="bg-rose-500/15 text-rose-400" title="Sécurité" href={`/discord/security?guildId=${gid}`}>
                {security.loading ? (
                  <CardSkeleton />
                ) : !isBotPresent ? (
                  <CardError message="Bot non installé sur ce serveur." />
                ) : security.error || !security.data ? (
                  <CardError />
                ) : (
                  <>
                    <p
                      className={`text-lg font-bold ${
                        security.data.status === "protected"
                          ? "text-emerald-400"
                          : security.data.status === "warning"
                            ? "text-amber-400"
                            : "text-rose-400"
                      }`}
                    >
                      {security.data.status === "protected" ? "Protégé" : security.data.status === "warning" ? "Suspect" : "Alerte"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {security.data.recentIncidents.length} incident(s) récent(s)
                    </p>
                  </>
                )}
              </OverviewCard>

              <OverviewCard icon={<Music2 className="h-4 w-4" />} color="bg-purple-500/15 text-purple-400" title="Musique" href={`/discord/music?guildId=${gid}`}>
                {music.loading ? (
                  <CardSkeleton />
                ) : !isBotPresent ? (
                  <CardError message="Bot non installé sur ce serveur." />
                ) : music.error || !music.data ? (
                  <CardError />
                ) : music.data.currentTrack && (music.data.status === "PLAYING" || music.data.status === "PAUSED") ? (
                  <>
                    <p className="truncate text-sm font-bold">{music.data.currentTrack.title}</p>
                    <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                      {music.data.currentTrack.artist || (music.data.status === "PAUSED" ? "En pause" : "En lecture")}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">Aucune lecture en cours.</p>
                )}
              </OverviewCard>

              <OverviewCard icon={<Ticket className="h-4 w-4" />} color="bg-amber-500/15 text-amber-400" title="Tickets" href={`/discord/tickets?guildId=${gid}`}>
                {tickets.loading ? (
                  <CardSkeleton />
                ) : !isBotPresent ? (
                  <CardError message="Bot non installé sur ce serveur." />
                ) : tickets.error || !tickets.data ? (
                  <CardError />
                ) : (
                  <>
                    <p className="text-lg font-bold">{tickets.data.openCount} ouverts</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{tickets.data.pendingCount} en attente</p>
                  </>
                )}
              </OverviewCard>

              <OverviewCard icon={<Gift className="h-4 w-4" />} color="bg-pink-500/15 text-pink-400" title="Giveaways" href={`/discord/giveaways?guildId=${gid}`}>
                {giveaways.loading ? (
                  <CardSkeleton />
                ) : !isBotPresent ? (
                  <CardError message="Bot non installé sur ce serveur." />
                ) : giveaways.error || !giveaways.data ? (
                  <CardError />
                ) : (
                  <>
                    <p className="text-lg font-bold">{giveaways.data.activeCount} actif(s)</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{giveaways.data.endedCount} terminé(s)</p>
                  </>
                )}
              </OverviewCard>

              <OverviewCard icon={<DatabaseBackup className="h-4 w-4" />} color="bg-emerald-500/15 text-emerald-400" title="Backups" href={`/discord/backups?guildId=${gid}`}>
                {backups.loading ? (
                  <CardSkeleton />
                ) : !isBotPresent ? (
                  <CardError message="Bot non installé sur ce serveur." />
                ) : backups.error || !backups.data ? (
                  <CardError />
                ) : (
                  <>
                    <p
                      className={`text-lg font-bold ${
                        backups.data.kpis.healthStatus === "HEALTHY"
                          ? "text-emerald-400"
                          : backups.data.kpis.healthStatus === "WARNING"
                            ? "text-amber-400"
                            : "text-rose-400"
                      }`}
                    >
                      {backups.data.kpis.healthStatus === "HEALTHY" ? "À jour" : backups.data.kpis.healthStatus === "WARNING" ? "À vérifier" : "Critique"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Dernière : {formatRelative(backups.data.kpis.lastBackupAt)}</p>
                  </>
                )}
              </OverviewCard>
            </div>

            {/* Recent Activity */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4 text-indigo-400" />
                Activité récente
              </h3>
              {guild.loading ? (
                <div className="space-y-2">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : !isBotPresent ? (
                <p className="text-xs text-[var(--text-muted)]">Bot non installé sur ce serveur.</p>
              ) : guild.error || !guild.data?.stats?.recentActivities?.length ? (
                <p className="text-xs text-[var(--text-muted)]">Aucune activité récente enregistrée.</p>
              ) : (
                <div className="space-y-1.5">
                  {guild.data.stats.recentActivities.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-3 py-2 text-xs">
                      <span className="truncate">
                        <span className="font-semibold text-[var(--text-primary)]">{a.userTag}</span>
                        <span className="text-[var(--text-muted)]"> a utilisé </span>
                        <span className="text-[var(--accent-primary)]">/{a.commandName}</span>
                      </span>
                      <span className="shrink-0 text-[var(--text-muted)]">{formatRelative(a.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
              <h3 className="mb-3 text-sm font-semibold">Actions rapides</h3>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/discord/tickets?guildId=${gid}`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)]"
                >
                  <Ticket className="h-3.5 w-3.5 text-amber-400" />
                  Voir les tickets
                </Link>
                <Link
                  href={`/discord/giveaways?guildId=${gid}&tab=create`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)]"
                >
                  <Plus className="h-3.5 w-3.5 text-pink-400" />
                  Lancer un giveaway
                </Link>
                <Link
                  href={`/discord/moderation?guildId=${gid}`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)]"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                  Voir la modération
                </Link>
                <Link
                  href={`/discord/backups?guildId=${gid}`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)]"
                >
                  <DatabaseBackup className="h-3.5 w-3.5 text-emerald-400" />
                  Gérer les sauvegardes
                </Link>
                <Link
                  href={`/discord/music?guildId=${gid}`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)]"
                >
                  <Music2 className="h-3.5 w-3.5 text-purple-400" />
                  Ouvrir la musique
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
