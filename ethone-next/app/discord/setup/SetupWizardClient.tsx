"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "@/components/icons/ph";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import GuildAssistedSetup from "@/components/discord/GuildAssistedSetup";
import DiscordIcon from "@/components/DiscordIcon";

export default function SetupWizardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, connect } = useDiscordOAuth();
  const botGuildIds = useBotGuildIds(profile?.guilds);

  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  const manageableGuilds = useMemo(() => {
    const guilds = profile?.guilds || [];
    return guilds.filter((g) => {
      if (g.owner) return true;
      if (!g.permissions) return false;
      const p = Number(g.permissions);
      return (p & 8) === 8 || (p & 32) === 32;
    });
  }, [profile?.guilds]);

  const queryGuildId = searchParams.get("guildId");

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (queryGuildId) {
      const match = manageableGuilds.find((g) => g.id === queryGuildId);
      if (match) {
        setSelectedGuild(match);
        return;
      }
    }
    if (!selectedGuild && botGuildIds !== null) {
      const picked = pickBotGuild(manageableGuilds, botGuildIds);
      if (picked) setSelectedGuild(picked);
      else setSelectedGuild(manageableGuilds[0]);
    }
  }, [manageableGuilds, selectedGuild, botGuildIds, queryGuildId]);

  if (!profile?.connected) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <DiscordIcon className="w-12 h-12 text-[var(--accent-primary)] mx-auto" />
        <h1 className="text-xl font-bold">Connexion Discord requise</h1>
        <p className="text-xs text-[var(--text-muted)] max-w-sm">
          Connectez votre compte Discord pour configurer votre serveur.
        </p>
        <button
          onClick={() => connect()}
          className="px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] text-xs font-semibold cursor-pointer"
        >
          Se connecter avec Discord
        </button>
      </div>
    );
  }

  const currentGuild = selectedGuild || manageableGuilds[0];

  if (!currentGuild) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h1 className="text-xl font-bold">Aucun serveur administrable</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Vous devez posséder les permissions d&apos;administrateur sur au moins un serveur.
        </p>
        <Link
          href="/discord"
          className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-200"
        >
          Retour au dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto mb-6">
        <Link
          href={`/discord?guildId=${currentGuild.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Retour à {currentGuild.name}</span>
        </Link>
      </div>

      <GuildAssistedSetup
        guild={currentGuild}
        onCancel={() => router.push(`/discord?guildId=${currentGuild.id}`)}
        onManualSetup={() => router.push(`/discord/security?guildId=${currentGuild.id}`)}
        onFinish={() => router.push(`/discord?guildId=${currentGuild.id}`)}
      />
    </div>
  );
}
