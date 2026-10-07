"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  Server,
  FileText,
  Headphones,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  SkipForward,
  ArrowUpRight,
  Code2,
  LogOut,
  Eye,
} from "@/components/icons/ph";
import ClientImage from "@/components/ClientImage";
import FlagIcon from "@/components/FlagIcon";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchBotPresence, clearBotPresenceCache } from "@/lib/hooks/useBotGuildIds";
import { cn } from "@/lib/utils";
import type { DiscordGuild } from "@/lib/hooks/useDiscordOAuth";

interface BotInstallViewProps {
  guild: DiscordGuild;
  onBack: () => void;
  onBotDetected: (guild: DiscordGuild) => void;
  onSkip: (guild: DiscordGuild) => void;
  userName?: string;
  userAvatar?: string | null;
  botInviteUrl?: string;
  botName?: string;
}

const BOT_CLIENT_ID = "1545139931154878464";
const SUPPORT_DISCORD_URL = "https://discord.gg/WvEcyBuP45";
const DOCS_URL = "https://ethone.dev/discord";

function getGuildInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "SV";
}

export default function BotInstallView({
  guild,
  onBack,
  onBotDetected,
  onSkip,
  userName = "rub19",
  userAvatar,
  botInviteUrl,
  botName = "Etho",
}: BotInstallViewProps) {
  const { setOpen: openCommandPalette } = useCommandPalette();
  const { settings, update: updateSettings } = useSettings();
  const { success, info, error: showError } = useToast();

  const [isChecking, setIsChecking] = useState(false);

  const inviteHref = useMemo(() => {
    const base =
      botInviteUrl ||
      `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
    return `${base}&guild_id=${guild.id}&disable_guild_select=true`;
  }, [botInviteUrl, guild.id]);

  const checkPresence = useCallback(
    async (manual: boolean) => {
      if (manual) setIsChecking(true);
      try {
        clearBotPresenceCache([guild.id]);
        const res = await fetchBotPresence([guild.id], true);
        if (res.present.includes(guild.id)) {
          success(
            "Bot détecté !",
            `${botName} a rejoint "${guild.name}". Ouverture de la configuration...`
          );
          onBotDetected(guild);
          return true;
        } else if (manual) {
          info(
            "Bot non détecté pour l'instant",
            `${botName} n'est pas encore présent sur "${guild.name}". Vérifiez l'invitation Discord ou cliquez sur « Passer l'attente ».`
          );
        }
      } catch {
        if (manual) {
          showError(
            "Vérification impossible",
            "Impossible de contacter le service de détection. Vous pouvez passer l'attente."
          );
        }
      } finally {
        if (manual) setIsChecking(false);
      }
      return false;
    },
    [guild, botName, success, info, showError, onBotDetected]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      checkPresence(false);
    }, 3500);
    return () => clearInterval(timer);
  }, [checkPresence]);

  const initials = useMemo(() => getGuildInitials(guild.name), [guild.name]);
  const userInitials = useMemo(
    () => (userName || "rub19").slice(0, 2).toUpperCase(),
    [userName]
  );

  return (
    <div className="min-h-[calc(100dvh-4rem)] w-full bg-[#050907] text-[#e6f4ed] flex flex-col md:flex-row antialiased">
      <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[#122118] bg-[#070e0a]/95 backdrop-blur-xl flex flex-col justify-between p-4 md:sticky md:top-0 md:h-[calc(100dvh-4rem)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <span className="block font-bold text-sm tracking-tight text-white">
                  Etho Protect
                </span>
                <span className="block text-[10px] text-emerald-400/80 font-mono uppercase tracking-wider">
                  Console Bot
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-[#16271e] bg-[#09120e] p-2.5">
            {guild.iconUrl ? (
              <ClientImage
                src={guild.iconUrl}
                alt={guild.name}
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg object-cover border border-[#1f3427] shrink-0"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#122319] text-emerald-400 font-bold text-xs border border-[#1f3427]">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-white">
                {guild.name}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-[#799987]">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
                <span>{botName} absent</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openCommandPalette(true)}
            className="w-full flex items-center justify-between rounded-xl border border-[#17271e] bg-[#0b1410] px-3 py-2 text-xs text-[#71917f] hover:border-emerald-500/40 hover:text-emerald-300 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Rechercher un réglage...</span>
            </div>
            <kbd className="rounded border border-[#1e3427] bg-[#101e16] px-1.5 py-0.5 text-[10px] font-mono text-[#8faea0]">
              Ctrl K
            </kbd>
          </button>
        </div>

        <div className="space-y-4 pt-4 border-t border-[#122118]">
          <div className="space-y-1 text-xs">
            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[#739281] hover:bg-[#0d1812] hover:text-[#d3e9dc] transition-colors cursor-pointer"
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

          <div className="flex items-center justify-between rounded-xl border border-[#16271e] bg-[#09120e] p-2">
            <div className="flex items-center gap-2 min-w-0">
              {userAvatar ? (
                <ClientImage
                  src={userAvatar}
                  alt={userName}
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full object-cover border border-emerald-500/30"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                  {userInitials}
                </div>
              )}
              <span className="truncate text-xs font-bold text-[#e6f4ed]">
                {userName}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const nextLang = settings.language === "fr" ? "en" : "fr";
                  updateSettings({ language: nextLang });
                }}
                className="p-1 rounded hover:bg-[#121f18] transition-colors cursor-pointer"
                title="Changer de langue"
              >
                <FlagIcon code={settings.language || "fr"} className="h-3.5 w-5" />
              </button>

              <button
                type="button"
                onClick={onBack}
                className="p-1 text-[#738f80] hover:text-emerald-400 rounded hover:bg-[#121f18] transition-colors cursor-pointer"
                title="Retour aux serveurs"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>

              <Link
                href="/login"
                className="p-1 text-[#738f80] hover:text-rose-400 rounded hover:bg-[#121f18] transition-colors"
                title="Déconnexion"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#122118] px-4 sm:px-8 bg-[#070e0a]/40">
          <div className="flex items-center gap-2 text-xs text-[#71917f]">
            <button
              type="button"
              onClick={onBack}
              className="font-semibold text-white hover:text-emerald-300 transition-colors cursor-pointer"
            >
              {guild.name}
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-[#3a5847]" />
            <span className="text-emerald-400 font-medium">Installation</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
            <Code2 className="h-3 w-3 shrink-0" />
            <span>Tout est enregistré</span>
          </div>
        </header>

        <div className="flex-1 min-w-0 p-4 sm:p-8 lg:p-12 flex flex-col justify-center items-center">
          <div className="w-full max-w-2xl space-y-8">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white text-center">
              Installer {botName} sur {guild.name}
            </h1>

            <div className="rounded-2xl border border-[#16271e] bg-[#09120e] shadow-2xl divide-y divide-[#132219] overflow-hidden">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xs font-semibold text-white/90">
                    1
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white">
                      Ajoute {botName} au serveur
                    </h3>
                    <p className="mt-0.5 text-xs text-[#71917f] leading-relaxed">
                      Discord s&apos;ouvre dans un nouvel onglet. Garde toutes les permissions demandées.
                    </p>
                  </div>
                </div>

                <a
                  href={inviteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#10b981] px-4 py-2 text-xs font-bold text-black hover:bg-[#059669] transition-all shadow-md shadow-emerald-500/20"
                >
                  <span>Ajouter {botName}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="p-5 flex items-start gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xs font-semibold text-white/90">
                  2
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white">
                    Place son rôle tout en haut
                  </h3>
                  <p className="mt-0.5 text-xs text-[#71917f] leading-relaxed">
                    Paramètres du serveur, Rôles : glisse le rôle {botName} au-dessus des autres pour qu&apos;il puisse sanctionner et restaurer.
                  </p>
                </div>
              </div>

              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xs font-semibold text-white/90">
                    3
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white">
                      Reviens ici
                    </h3>
                    <p className="mt-0.5 text-xs text-[#71917f] leading-relaxed">
                      La configuration s&apos;ouvre dès que {botName} est détecté.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => checkPresence(true)}
                    disabled={isChecking}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e3427] bg-[#0c1611] px-3.5 py-2 text-xs font-semibold text-[#c4ded0] hover:border-emerald-500/40 hover:bg-[#122319] hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw
                      className={cn(
                        "h-3.5 w-3.5",
                        isChecking && "animate-spin text-emerald-400"
                      )}
                    />
                    <span>{isChecking ? "Vérification..." : "Vérifier"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSkip(guild)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e3427] bg-[#0c1611]/60 px-3 py-2 text-xs font-semibold text-[#799987] hover:border-[#2f4f3c] hover:bg-[#101e16] hover:text-[#c4ded0] transition-all cursor-pointer"
                    title="Passer l'attente et accéder directement à la configuration"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    <span>Passer l&apos;attente</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#16271e] bg-[#08120d] px-4 py-3 text-center text-xs text-[#71917f]">
              <span>La détection peut prendre quelques secondes après l&apos;ajout du bot.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
