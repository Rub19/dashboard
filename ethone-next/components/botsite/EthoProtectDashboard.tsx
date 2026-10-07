"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Server,
  Crown,
  Sparkles,
  Search,
  ShieldCheck,
  Check,
  Plus,
  ExternalLink,
  FileText,
  LogOut,
  Headphones,
  X,
  ArrowUpRight,
  RefreshCw,
  Eye,
  LayoutDashboard,
  ChevronRight,
} from "@/components/icons/ph";
import { useDiscordOAuth, canManageGuild, getStoredDiscordGuilds, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds } from "@/lib/hooks/useBotGuildIds";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { useSettings } from "@/components/SettingsProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import FlagIcon from "@/components/FlagIcon";
import ClientImage from "@/components/ClientImage";
import BotLanding from "@/components/botsite/BotLanding";
import { cn } from "@/lib/utils";

const SUPPORT_DISCORD_URL = "https://discord.gg/WvEcyBuP45";
const DOCS_URL = "https://ethone.dev/discord";


function getGuildInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "SV";
}

export default function EthoProtectDashboard() {
  const router = useRouter();
  const { setOpen: openCommandPalette } = useCommandPalette();
  const { profile: discordProfile, loading: oauthLoading, connect: connectDiscord } = useDiscordOAuth();
  const identity = useUserIdentity();
  const { settings, update: updateSettings } = useSettings();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeNav, setActiveNav] = useState<"servers" | "premium">("servers");
  const [isPrivateBotModalOpen, setIsPrivateBotModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"dashboard" | "legacy">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ethone:bot_view_mode");
      if (saved === "legacy") return "legacy";
    }
    return "dashboard";
  });

  const setViewModeWithStorage = useCallback((mode: "dashboard" | "legacy") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("ethone:bot_view_mode", mode);
    }
  }, []);

  const storedGuilds = useMemo(() => getStoredDiscordGuilds(), []);

  const userGuilds: DiscordGuild[] = useMemo(() => {
    const raw = discordProfile?.guilds && discordProfile.guilds.length > 0 ? discordProfile.guilds : storedGuilds;
    return raw.filter((g) => canManageGuild(g));
  }, [discordProfile?.guilds, storedGuilds]);

  const botGuildIds = useBotGuildIds(userGuilds);

  const installedGuildIdsSet = useMemo(() => {
    return new Set(Array.isArray(botGuildIds) ? botGuildIds : []);
  }, [botGuildIds]);

  const { installed: installedGuilds, uninstalled: uninstalledGuilds } = useMemo(() => {
    const installed: DiscordGuild[] = [];
    const uninstalled: DiscordGuild[] = [];

    for (const g of userGuilds) {
      if (installedGuildIdsSet.has(g.id)) {
        installed.push(g);
      } else {
        uninstalled.push(g);
      }
    }

    return { installed, uninstalled };
  }, [userGuilds, installedGuildIdsSet]);

  const filteredInstalled = useMemo(() => {
    if (!searchQuery.trim()) return installedGuilds;
    const q = searchQuery.toLowerCase();
    return installedGuilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [installedGuilds, searchQuery]);

  const filteredUninstalled = useMemo(() => {
    if (!searchQuery.trim()) return uninstalledGuilds;
    const q = searchQuery.toLowerCase();
    return uninstalledGuilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [uninstalledGuilds, searchQuery]);

  const displayName = useMemo(() => {
    if (discordProfile?.user?.globalName) return discordProfile.user.globalName;
    if (discordProfile?.user?.displayName) return discordProfile.user.displayName;
    if (discordProfile?.user?.username) return discordProfile.user.username;
    if (identity.displayName && identity.displayName !== "Personnel") return identity.displayName;
    if (identity.username && identity.username !== "utilisateur") return identity.username;
    return "rub19";
  }, [discordProfile?.user, identity]);

  const userAvatar = useMemo(() => {
    return discordProfile?.user?.avatarUrlSmall || discordProfile?.user?.avatarUrl || identity.avatarUrl || null;
  }, [discordProfile?.user, identity.avatarUrl]);

  if (viewMode === "legacy") {
    return (
      <div className="relative min-h-screen">
        <div className="fixed top-4 right-4 z-50">
          <button
            type="button"
            onClick={() => setViewModeWithStorage("dashboard")}
            className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/80 px-4 py-2 text-xs font-semibold text-emerald-300 shadow-xl backdrop-blur-md hover:bg-emerald-900 transition-all cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Revenir au Dashboard Serveurs</span>
          </button>
        </div>
        <BotLanding />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#060b08] text-[#e6f4ed] font-sans antialiased selection:bg-emerald-500 selection:text-black">
      <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between border-r border-[#15231c] bg-[#070c09] p-4 select-none">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2 py-1">
            <Link href="/discord" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-base font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                Etho Protect
              </span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => openCommandPalette(true)}
            className="flex items-center justify-between rounded-xl border border-[#1b2b22] bg-[#0b130f] px-3 py-2 text-xs text-[#6e8a7b] hover:border-[#274033] hover:text-[#9bb7a8] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-[#526d5f]" />
              <span>Rechercher un réglage...</span>
            </div>
            <kbd className="rounded border border-[#1f3127] bg-[#0e1913] px-1.5 py-0.5 text-[10px] font-mono text-[#526d5f]">
              Ctrl K
            </kbd>
          </button>

          <nav className="flex flex-col gap-1 pt-1">
            <button
              type="button"
              onClick={() => setActiveNav("servers")}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer",
                activeNav === "servers"
                  ? "bg-[#10b981] text-[#051c11] shadow-lg shadow-emerald-500/20"
                  : "text-[#8ba395] hover:bg-[#0d1611] hover:text-white"
              )}
            >
              <Server className="h-4 w-4" />
              <span>Serveurs</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveNav("premium");
                setIsPrivateBotModalOpen(true);
              }}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer",
                activeNav === "premium"
                  ? "bg-[#10b981] text-[#051c11] shadow-lg shadow-emerald-500/20"
                  : "text-[#8ba395] hover:bg-[#0d1611] hover:text-white"
              )}
            >
              <Crown className="h-4 w-4 text-emerald-400" />
              <span>Premium</span>
            </button>
          </nav>
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-[#15231c]">
          <div className="flex flex-col gap-1 text-xs font-medium text-[#738f80]">
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:text-white hover:bg-[#0c1410] transition-colors cursor-pointer"
            >
              <Server className="h-3.5 w-3.5" />
              <span>Mes serveurs</span>
            </button>

            <a
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:text-white hover:bg-[#0c1410] transition-colors"
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
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:text-white hover:bg-[#0c1410] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Headphones className="h-3.5 w-3.5" />
                <span>Support</span>
              </div>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#16241c] bg-[#0a120e] p-2">
            <div className="flex items-center gap-2 min-w-0">
              {userAvatar ? (
                <ClientImage
                  src={userAvatar}
                  alt={displayName}
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full object-cover border border-emerald-500/30"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="truncate text-xs font-bold text-[#e6f4ed]">{displayName}</span>
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
                onClick={() => setViewModeWithStorage("legacy")}
                className="p-1 text-[#738f80] hover:text-emerald-400 rounded hover:bg-[#121f18] transition-colors cursor-pointer"
                title="Voir la vitrine classique"
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

      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <header className="h-14 shrink-0 border-b border-[#15231c] bg-[#070c09]/80 backdrop-blur-md px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-[#738f80]">
            <span className="hover:text-white transition-colors cursor-pointer">Etho</span>
            <ChevronRight className="h-3 w-3 opacity-40" />
            <span className="text-white font-semibold">Serveurs</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#738f80]">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>&lt;&gt; Tout est enregistré</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-6xl mx-auto flex gap-8 items-start">
            <div className="flex-1 min-w-0 space-y-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                  Bonjour {displayName}
                </h1>
              </div>

              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#526d5f]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un serveur"
                  className="w-full rounded-xl border border-[#1b2b22] bg-[#0b130f] pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#526d5f] outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#526d5f] hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {!discordProfile?.connected && userGuilds.length === 0 && (
                <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#0a1811] to-[#0c1611] p-6 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                    <Server className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Synchronisez vos serveurs Discord</h3>
                  <p className="max-w-md mx-auto text-xs text-[#738f80]">
                    Connectez votre compte Discord pour charger la liste de vos serveurs et configurer Etho Protect en un clic.
                  </p>
                  <button
                    type="button"
                    onClick={() => connectDiscord()}
                    disabled={oauthLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all cursor-pointer"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", oauthLoading && "animate-spin")} />
                    <span>Connecter Discord</span>
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
                        className="group flex items-center justify-between rounded-xl border border-[#16241c] bg-[#09110d] px-4 py-3 hover:border-emerald-500/30 hover:bg-[#0c1712] transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {guild.iconUrl ? (
                            <ClientImage
                              src={guild.iconUrl}
                              alt={guild.name}
                              width={36}
                              height={36}
                              className="h-9 w-9 rounded-full object-cover border border-[#1f3127]"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#122119] text-emerald-400 font-bold text-xs border border-[#1f3127]">
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
                          onClick={() => router.push(`/discord?guildId=${guild.id}`)}
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

                {filteredUninstalled.length === 0 && userGuilds.length > 0 && (
                  <div className="rounded-xl border border-[#16241c] bg-[#09110d] p-8 text-center text-xs text-[#738f80]">
                    {searchQuery
                      ? "Aucun serveur ne correspond à votre recherche."
                      : "Etho est déjà installé sur l'ensemble de vos serveurs !"}
                  </div>
                )}

                <div className="space-y-1.5">
                  {filteredUninstalled.map((guild) => (
                    <div
                      key={guild.id}
                      onClick={() => router.push(`/discord?guildId=${guild.id}`)}
                      className="group flex items-center justify-between rounded-xl border border-[#16241c] bg-[#09110d] px-4 py-3 hover:border-[#22392c] hover:bg-[#0c1611] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {guild.iconUrl ? (
                          <ClientImage
                            src={guild.iconUrl}
                            alt={guild.name}
                            width={36}
                            height={36}
                            className="h-9 w-9 rounded-full object-cover border border-[#1f3127]"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#122119] text-[#8ba395] font-bold text-xs border border-[#1f3127]">
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
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/discord?guildId=${guild.id}`);
                        }}
                        className="flex items-center gap-1 rounded-lg border border-[#1b2b22] px-3 py-1.5 text-xs font-semibold text-[#8ba395] hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Installer</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="hidden lg:block w-72 shrink-0 space-y-2 sticky top-6">
              <span className="text-xs font-semibold text-[#738f80] px-1">Bots privés</span>
              <div className="rounded-2xl border border-[#1c2e24] bg-[#09120e] p-5 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-2.5 relative z-10">
                  <h3 className="text-sm font-bold text-white leading-snug">
                    Ton propre bot de protection
                  </h3>
                  <p className="text-xs text-[#738f80] leading-relaxed">
                    Nom, avatar et protection premium comme le rollback, sur un bot à ton image.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPrivateBotModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors pt-1 cursor-pointer"
                  >
                    <span>En savoir plus</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {isPrivateBotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[#09120e] p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setIsPrivateBotModalOpen(false)}
              className="absolute top-4 right-4 text-[#738f80] hover:text-white p-1 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Crown className="h-5 w-5" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">Bot Privé & Protection Sur-Mesure</h2>
              <p className="text-xs text-[#738f80]">
                Déployez une instance exclusive d&apos;Etho Protect avec toutes les fonctionnalités avancées.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs text-[#a1bead]">
              <div className="flex items-start gap-2.5 rounded-xl border border-[#16241c] bg-[#0c1611] p-2.5">
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Nom & Avatar Personnalisés</p>
                  <p className="text-[11px] text-[#738f80]">Votre propre identité de bot présente sur vos serveurs.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-[#16241c] bg-[#0c1611] p-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Rollback Anti-Raid 1-Clic</p>
                  <p className="text-[11px] text-[#738f80]">Restaurez les salons, rôles et permissions instantanément.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-[#16241c] bg-[#0c1611] p-2.5">
                <Server className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Haute Disponibilité 99.9%</p>
                  <p className="text-[11px] text-[#738f80]">Ressources et workers Cloudflare dédiés sans file d&apos;attente.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <a
                href={SUPPORT_DISCORD_URL}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-black hover:bg-emerald-400 transition-all"
              >
                Commander une instance
              </a>
              <button
                type="button"
                onClick={() => setIsPrivateBotModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#1b2b22] text-xs font-semibold text-[#8ba395] hover:text-white transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
