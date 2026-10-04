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
} from "@/components/icons/ph";
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

  const queryParam = selectedGuild ? `?guildId=${selectedGuild.id}` : "";

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-6 sm:px-6 text-[var(--text-primary)]">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <Link
                href={`/discord${queryParam}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-all cursor-pointer shadow-sm"
                title="Retour au hub Discord"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span>Retour Discord</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/15 text-red-400 rounded-xl border border-red-500/30">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 p-4 text-xs text-[var(--accent-primary)]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] shrink-0 mt-0.5">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)] text-sm">Le bot ETHONE n&apos;est pas installé sur ce serveur</p>
                <p className="mt-0.5 text-[var(--text-muted)]">
                  Invitez le bot sur « {selectedGuild.name} » pour activer les protections Anti-Raid et Anti-Nuke.
                </p>
              </div>
            </div>
            <a
              href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:brightness-110 shrink-0 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
            >
              Inviter le bot
            </a>
          </div>
        )}

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Anti-Raid */}
          <div className="group relative rounded-2xl border border-red-500/20 bg-red-500/10 p-6 transition-all hover:border-red-500/40 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Anti-Raid</h2>
                    <p className="text-xs text-[var(--text-muted)]">Défense en temps réel contre les vagues d&apos;arrivées et le spam</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
                  Temps Réel
                </span>
              </div>

              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Surveillance continue des métriques du serveur : détection des vagues de comptes récents, spams de mentions,
                flood de messages, verrouillage d&apos;urgence automatique (Lockdown) et isolation des attaquants.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Users className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Join Raid & Mass Join</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Flame className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Message & Mention Flood</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Lock className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Auto Lockdown & Captcha</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Radio className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Score de risque en direct</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href={`/discord/security/anti-raid${queryParam}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
              >
                <span>Configurer l&apos;Anti-Raid</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card Anti-Nuke */}
          <div className="group relative rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 transition-all hover:border-amber-500/40 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Anti-Nuke</h2>
                    <p className="text-xs text-[var(--text-muted)]">Protection interne contre les comptes administrateurs compromis</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Haute Priorité
                </span>
              </div>

              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Protection contre la destruction de serveur : seuils stricts sur les expulsions/bannissements en masse,
                suppression de salons ou rôles, création de webhooks malveillants, et quarantaine automatique des fautifs.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <UserX className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Limites Kicks & Bans</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <FileCode className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Suppression Salons & Rôles</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Quarantaine instantanée</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Alertes & Logs Staff</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href={`/discord/security/anti-nuke${queryParam}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors"
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
