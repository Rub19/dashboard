"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldAlert,
  Shield,
  Zap,
  Lock,
  Users,
  Radio,
  ArrowLeft,
  ChevronRight,
  Bot,
  AlertTriangle,
  Flame,
  UserX,
  FileCode,
} from "lucide-react";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { GuildSelector } from "@/components/GuildSelector";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

export default function SecurityHubPage() {
  const searchParams = useSearchParams();
  const { profile, loading: discordLoading } = useDiscordOAuth();

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

  const isBotInstalled = Boolean(selectedGuild && botGuildIds?.includes(selectedGuild.id));
  const queryParam = selectedGuild ? `?guildId=${selectedGuild.id}` : "";

  return (
    <div className="h-full overflow-y-auto os-scroll bg-[var(--bg-main)] text-[var(--text-primary)] p-4 md:p-8 pb-44 md:pb-44">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <Link
                href={`/discord${queryParam}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
                title="Retour au hub Discord"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
                <span>Retour Discord</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/15 text-red-400 rounded-[var(--inset-radius)] border border-red-500/30">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Sécurité & Défense</h1>
                <p className="text-xs text-[var(--text-muted)]">
                  Protection active contre les raids de membres, les spams massifs et les attaques administratives (nukes).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Guild Selector */}
        {manageableGuilds.length > 0 ? (
          <GuildSelector
            guilds={manageableGuilds}
            value={selectedGuild?.id || ""}
            onChange={(g) => {
              userSelectedRef.current = true;
              setSelectedGuild(g);
            }}
          />
        ) : !discordLoading ? (
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 text-center text-sm text-[var(--text-muted)]">
            Connectez un serveur Discord où vous êtes administrateur.
          </div>
        ) : null}

        {/* Bot non installé banner */}
        {selectedGuild && botGuildIds !== null && !botGuildIds.includes(selectedGuild.id) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs text-indigo-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Le bot ETHONE n&apos;est pas installé sur ce serveur</p>
                <p className="mt-0.5 text-zinc-300">
                  Invitez le bot sur « {selectedGuild.name} » pour activer les protections Anti-Raid et Anti-Nuke.
                </p>
              </div>
            </div>
            <a
              href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors shrink-0"
            >
              Inviter le bot
            </a>
          </div>
        )}

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Anti-Raid */}
          <div className="group relative rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-950/20 to-zinc-950/40 p-6 backdrop-blur-sm transition-all hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Anti-Raid</h2>
                    <p className="text-xs text-zinc-400">Défense en temps réel contre les vagues d&apos;arrivées et le spam</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
                  Temps Réel
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Surveillance continue des métriques du serveur : détection des vagues de comptes récents, spams de mentions,
                flood de messages, verrouillage d&apos;urgence automatique (Lockdown) et isolation des attaquants.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Users className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Join Raid & Mass Join</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Flame className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Message & Mention Flood</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Lock className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Auto Lockdown & Captcha</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Radio className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Score de risque en direct</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href={`/discord/security/anti-raid${queryParam}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <span>Configurer l&apos;Anti-Raid</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card Anti-Nuke */}
          <div className="group relative rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-950/20 to-zinc-950/40 p-6 backdrop-blur-sm transition-all hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Anti-Nuke</h2>
                    <p className="text-xs text-zinc-400">Protection interne contre les comptes administrateurs compromis</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Haute Priorité
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Protection contre la destruction de serveur : seuils stricts sur les expulsions/bannissements en masse,
                suppression de salons ou rôles, création de webhooks malveillants, et quarantaine automatique des fautifs.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <UserX className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Limites Kicks & Bans</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <FileCode className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Suppression Salons & Rôles</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Quarantaine instantanée</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Alertes & Logs Staff</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href={`/discord/security/anti-nuke${queryParam}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <span>Configurer l&apos;Anti-Nuke</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
