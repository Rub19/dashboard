"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Server,
  Search,
  ShieldCheck,
  Check,
  Plus,
  ExternalLink,
  X,
  Eye,
  LayoutDashboard,
  ChevronRight,
  Home,
  BookOpen,
  Sun,
  Moon,
  LogOut,
} from "@/components/icons/ph";
import { useDiscordOAuth, canManageGuild, getStoredDiscordGuilds, getStoredDiscordUser, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds } from "@/lib/hooks/useBotGuildIds";
import { useAccountProfile } from "@/lib/profile/account-profile";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useAuth } from "@/components/AuthProvider";
import FlagIcon from "@/components/FlagIcon";
import ClientImage from "@/components/ClientImage";
import BotLanding from "@/components/botsite/BotLanding";
import BotInstallView from "@/components/discord/BotInstallView";

const SUPPORT_DISCORD_URL = "https://discord.gg/WvEcyBuP45";
const DOCS_URL = "https://ethone.dev/discord";

function getGuildInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "SV";
}

function CloudCheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      <path d="m9 13 2 2 4-4" />
    </svg>
  );
}

function LifeBuoyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
      <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
      <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
      <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
    </svg>
  );
}

export default function EthoProtectDashboard() {
  const router = useRouter();
  const { setOpen: openCommandPalette } = useCommandPalette();
  const { profile: discordProfile, loading: oauthLoading, connect: connectDiscord } = useDiscordOAuth();
  const { profile: ethoneProfile } = useAccountProfile();

  const [searchQuery, setSearchQuery] = useState("");
  const [installingGuild, setInstallingGuild] = useState<DiscordGuild | null>(null);
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

  const { settings, update: updateSettings } = useSettings();
  const { signOut } = useAuth();

  const toggleTheme = useCallback(() => {
    const nextDark = !settings.darkMode;
    updateSettings({
      darkMode: nextDark,
      theme: nextDark ? "obsidian" : "arctic",
    });
  }, [settings.darkMode, updateSettings]);

  const toggleLanguage = useCallback(() => {
    const nextLang = settings.language === "fr" ? "en" : "fr";
    updateSettings({ language: nextLang });
  }, [settings.language, updateSettings]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch {}
    router.push("/login");
  }, [signOut, router]);

  const storedGuilds = useMemo(() => getStoredDiscordGuilds(), []);
  const storedUser = useMemo(() => getStoredDiscordUser(), []);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const targetGuildId = params.get("guildId");
    if (!targetGuildId) return;

    const matched = userGuilds.find((g) => g.id === targetGuildId);
    if (matched && !installedGuildIdsSet.has(matched.id)) {
      setInstallingGuild(matched);
    }
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
    if (storedUser?.globalName) return storedUser.globalName;
    if (storedUser?.displayName) return storedUser.displayName;
    if (storedUser?.username) return storedUser.username;
    if (ethoneProfile?.displayName) return ethoneProfile.displayName;
    if (ethoneProfile?.username) return ethoneProfile.username;
    return "rub19";
  }, [discordProfile?.user, storedUser, ethoneProfile]);

  const userAvatar = useMemo(() => {
    return (
      discordProfile?.user?.avatarUrl ||
      discordProfile?.user?.avatarUrlSmall ||
      storedUser?.avatarUrl ||
      storedUser?.avatarUrlSmall ||
      ethoneProfile?.avatarUrl ||
      null
    );
  }, [discordProfile?.user, storedUser, ethoneProfile?.avatarUrl]);

  if (viewMode === "legacy") {
    return (
      <div className="relative min-h-screen bg-[var(--background)]">
        <div className="fixed top-4 right-4 z-50">
          <button
            type="button"
            onClick={() => setViewModeWithStorage("dashboard")}
            className="flex items-center gap-2 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)]/90 px-4 py-2 text-xs font-semibold text-[var(--accent-primary)] shadow-xl backdrop-blur-md hover:border-[var(--accent-primary)] transition-all cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard Serveurs</span>
          </button>
        </div>
        <BotLanding />
      </div>
    );
  }

  if (installingGuild) {
    return (
      <BotInstallView
        guild={installingGuild}
        onBack={() => setInstallingGuild(null)}
        onBotDetected={(g) => {
          setInstallingGuild(null);
          try {
            const stored = localStorage.getItem("ethone:discord:bot_guild_ids");
            const parsed = stored ? JSON.parse(stored) : [];
            if (Array.isArray(parsed) && !parsed.includes(g.id)) {
              localStorage.setItem("ethone:discord:bot_guild_ids", JSON.stringify([...parsed, g.id]));
            }
          } catch {}
          router.push(`/discord?guildId=${g.id}`);
        }}
        onSkip={(g) => {
          setInstallingGuild(null);
          try {
            const stored = sessionStorage.getItem("ethone:discord:skipped_install_guilds");
            const parsed = stored ? JSON.parse(stored) : [];
            if (Array.isArray(parsed) && !parsed.includes(g.id)) {
              sessionStorage.setItem("ethone:discord:skipped_install_guilds", JSON.stringify([...parsed, g.id]));
            }
          } catch {}
          router.push(`/discord?guildId=${g.id}`);
        }}
        userName={displayName}
        userAvatar={userAvatar}
        botName="Etho"
      />
    );
  }

  return (
    <div className="h-full min-h-dvh md:min-h-0 w-full bg-[var(--background)] text-[var(--text-primary)] flex flex-col md:flex-row antialiased overflow-hidden">
      <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[var(--panel-border)] bg-[var(--surface-raised)]/95 flex flex-col justify-between p-4 md:h-full md:max-h-full">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-sm bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30">
                <ShieldCheck className="h-4 w-4 text-[var(--accent-primary)]" />
              </div>
              <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">Etho</span>
            </div>
            <button
              type="button"
              onClick={() => setViewModeWithStorage("legacy")}
              className="md:hidden flex items-center gap-1 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2 py-1 text-[10px] text-[var(--text-muted)]"
            >
              <Eye className="h-3 w-3" />
              <span>Vitrine</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCommandPalette(true)}
            className="w-full flex items-center justify-between rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Rechercher réglage...</span>
            </div>
            <kbd className="rounded-sm border border-[var(--panel-border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">
              Ctrl K
            </kbd>
          </button>

          <div className="space-y-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setViewModeWithStorage("dashboard");
              }}
              className="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-primary)] hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer font-medium text-left"
            >
              <Home className="h-4 w-4" />
              <span>Mes serveurs</span>
            </button>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4" />
                <span>Documentation</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </a>
            <a
              href={SUPPORT_DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <LifeBuoyIcon className="h-4 w-4" />
                <span>Support</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </a>
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--panel-border)]">
          <div className="flex items-center justify-between p-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {userAvatar ? (
                <ClientImage
                  src={userAvatar}
                  alt={displayName}
                  width={30}
                  height={30}
                  fallback={
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--accent-primary)] font-bold text-xs border border-[var(--panel-border)] shrink-0">
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                  }
                  className="h-7 w-7 rounded-full object-cover border border-[var(--panel-border)] shrink-0"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--accent-primary)] font-bold text-xs border border-[var(--panel-border)] shrink-0">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="truncate text-xs font-bold text-[var(--text-primary)]">{displayName}</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer"
                title={settings.darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
                aria-label="Basculer le thème"
              >
                {settings.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={toggleLanguage}
                className="p-1 rounded hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer"
                title="Changer de langue"
                aria-label="Changer de langue"
              >
                <FlagIcon code={settings.language === "fr" ? "en" : "fr"} className="h-3.5 w-5 rounded-xs" />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 rounded hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer"
                title="Déconnexion"
                aria-label="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 md:p-8 lg:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-4">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-primary)]">Etho</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[var(--accent-primary)] font-medium">Mes serveurs</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--text-muted)] select-none">
                <CloudCheckIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                <span className="font-normal text-[var(--text-muted)]">Tout est enregistré</span>
              </div>
              <button
                type="button"
                onClick={() => setViewModeWithStorage("legacy")}
                className="flex items-center gap-1.5 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all cursor-pointer"
              >
                <Eye className="h-3 w-3" />
                <span>Voir l'ancienne vitrine</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
                Bonjour {displayName}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">
                Gérez vos serveurs protégés ou configurez Etho en quelques clics.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un serveur..."
                className="w-full rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/40 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {!discordProfile && (
              <div className="rounded-sm border border-[var(--accent-primary)]/30 bg-[var(--surface-raised)] p-5 text-center space-y-3">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-sm bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Connexion Discord requise</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Connectez votre compte Discord pour synchroniser et gérer vos serveurs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => connectDiscord()}
                  disabled={oauthLoading}
                  className="inline-flex items-center gap-2 rounded-sm bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 transition-all cursor-pointer"
                >
                  <span>Lier mon compte Discord</span>
                </button>
              </div>
            )}

            {filteredInstalled.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium px-1">
                  <span>Avec Etho · {filteredInstalled.length}</span>
                </div>
                <div className="space-y-1.5">
                  {filteredInstalled.map((guild) => (
                    <div
                      key={guild.id}
                      className="group flex items-center justify-between rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-4 py-3 hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-raised)] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {guild.iconUrl ? (
                          <ClientImage
                            src={guild.iconUrl}
                            alt={guild.name}
                            width={36}
                            height={36}
                            className="h-9 w-9 rounded-sm object-cover border border-[var(--panel-border)]"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[var(--surface-raised)] text-[var(--accent-primary)] font-bold text-xs border border-[var(--panel-border)]">
                            {getGuildInitials(guild.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                            {guild.name}
                          </h4>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => router.push(`/discord?guildId=${guild.id}`)}
                        className="flex items-center gap-1.5 rounded-sm border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 px-3 py-1.5 text-xs font-bold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--accent-contrast)] transition-all cursor-pointer"
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
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium px-1">
                <span>Sans Etho · {filteredUninstalled.length}</span>
              </div>

              {filteredUninstalled.length === 0 && userGuilds.length > 0 && (
                <div className="rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] p-8 text-center text-xs text-[var(--text-muted)]">
                  {searchQuery
                    ? "Aucun serveur ne correspond à votre recherche."
                    : "Etho est déjà installé sur l'ensemble de vos serveurs !"}
                </div>
              )}

              <div className="space-y-1.5">
                {filteredUninstalled.map((guild) => (
                  <div
                    key={guild.id}
                    onClick={() => setInstallingGuild(guild)}
                    className="group flex items-center justify-between rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-4 py-3 hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-raised)] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {guild.iconUrl ? (
                        <ClientImage
                          src={guild.iconUrl}
                          alt={guild.name}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-sm object-cover border border-[var(--panel-border)]"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[var(--surface-raised)] text-[var(--text-muted)] font-bold text-xs border border-[var(--panel-border)]">
                          {getGuildInitials(guild.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                          {guild.name}
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInstallingGuild(guild);
                      }}
                      className="flex items-center gap-1.5 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)] transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Installer</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
