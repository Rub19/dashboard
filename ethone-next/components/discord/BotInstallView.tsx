"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  SkipForward,
  Home,
  LogOut,
  BookOpen,
  Sun,
  Moon,
} from "@/components/icons/ph";
import ClientImage from "@/components/ClientImage";
import FlagIcon from "@/components/FlagIcon";
import { useSettings } from "@/components/SettingsProvider";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useAccountProfile } from "@/lib/profile/account-profile";
import { fetchBotPresence, clearBotPresenceCache } from "@/lib/hooks/useBotGuildIds";
import { cn } from "@/lib/utils";
import { getStoredDiscordUser, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";

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
  const router = useRouter();
  const { signOut } = useAuth();
  const { settings, update: updateSettings } = useSettings();
  const { success, info, error: showError } = useToast();
  const { profile: ethoneProfile } = useAccountProfile();

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

  const [isChecking, setIsChecking] = useState(false);

  const inviteHref = useMemo(() => {
    const base =
      botInviteUrl ||
      `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
    return `${base}&guild_id=${encodeURIComponent(guild.id)}&disable_guild_select=true`;
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
  const storedUser = useMemo(() => getStoredDiscordUser(), []);
  const currentDisplayName =
    (userName && userName !== "rub19" ? userName : undefined) ||
    storedUser?.globalName ||
    storedUser?.displayName ||
    storedUser?.username ||
    ethoneProfile?.displayName ||
    ethoneProfile?.username ||
    userName ||
    "rub19";
  const currentAvatarUrl =
    userAvatar ||
    storedUser?.avatarUrl ||
    storedUser?.avatarUrlSmall ||
    ethoneProfile?.avatarUrl ||
    null;

  return (
    <div className="h-dvh min-h-dvh w-full bg-[var(--background)] text-[var(--text-primary)] flex flex-col md:flex-row antialiased overflow-hidden">
      <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[var(--panel-border)] bg-[var(--surface-raised)]/95 flex flex-col justify-between p-4 md:h-dvh md:max-h-dvh">
        <div className="space-y-4">
          <div className="flex items-center px-2 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-sm bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30">
                <ShieldCheck className="h-4 w-4 text-[var(--accent-primary)]" />
              </div>
              <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">
                Etho
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] p-2.5">
            {guild.iconUrl ? (
              <ClientImage
                src={guild.iconUrl}
                alt={guild.name}
                width={36}
                height={36}
                className="h-9 w-9 rounded-sm object-cover border border-[var(--panel-border)] shrink-0"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[var(--surface-raised)] text-[var(--accent-primary)] font-bold text-xs border border-[var(--panel-border)]">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">
                {guild.name}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <span className="h-1.5 w-1.5 rounded-sm bg-zinc-500" />
                <span>{botName} absent</span>
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-[var(--panel-border)]">
          <div className="space-y-1 text-xs">
            <button
              type="button"
              onClick={onBack}
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

          <div className="pt-3 border-t border-[var(--panel-border)]">
            <div className="flex items-center justify-between p-1.5">
              <div className="flex items-center gap-2.5 min-w-0">
                {currentAvatarUrl ? (
                  <ClientImage
                    candidates={[
                      currentAvatarUrl,
                      storedUser?.avatarUrl,
                      storedUser?.avatarUrlSmall,
                      ethoneProfile?.avatarUrl,
                    ].filter(Boolean) as string[]}
                    src={currentAvatarUrl}
                    alt={currentDisplayName}
                    width={30}
                    height={30}
                    fallback={
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--accent-primary)] font-bold text-xs border border-[var(--panel-border)] shrink-0">
                        {currentDisplayName.slice(0, 2).toUpperCase()}
                      </div>
                    }
                    className="h-7 w-7 rounded-full object-cover border border-[var(--panel-border)] shrink-0"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--accent-primary)] font-bold text-xs border border-[var(--panel-border)] shrink-0">
                    {currentDisplayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="truncate text-xs font-bold text-[var(--text-primary)]">
                  {currentDisplayName}
                </span>
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
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto h-full md:h-dvh">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--panel-border)] px-4 sm:px-8 bg-[var(--surface-raised)]/40">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <button
              type="button"
              onClick={onBack}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer font-medium"
            >
              {guild.name}
            </button>
            <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
            <span className="text-[var(--text-primary)] font-medium">Installation</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] select-none">
            <CloudCheckIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <span className="font-normal text-[var(--text-muted)]">Tout est enregistré</span>
          </div>
        </header>

        <div className="flex-1 min-w-0 p-4 sm:p-8 lg:p-12 flex flex-col justify-center items-center">
          <div className="w-full max-w-2xl space-y-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] text-center">
              Installer {botName} sur {guild.name}
            </h1>

            <div className="rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] shadow-2xl divide-y divide-[var(--panel-border)] overflow-hidden">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[var(--panel-border)] bg-[var(--background)] text-xs font-semibold text-[var(--text-primary)]">
                    1
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Ajoute {botName} au serveur
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)] leading-relaxed">
                      Discord s&apos;ouvre dans un nouvel onglet. Garde toutes les permissions demandées.
                    </p>
                  </div>
                </div>

                <a
                  href={inviteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 transition-all shadow-md"
                >
                  <span>Ajouter {botName}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="p-5 flex items-start gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[var(--panel-border)] bg-[var(--background)] text-xs font-semibold text-[var(--text-primary)]">
                  2
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Place son rôle tout en haut
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)] leading-relaxed">
                    Paramètres du serveur, Rôles : glisse le rôle {botName} au-dessus des autres pour qu&apos;il puisse sanctionner et restaurer.
                  </p>
                </div>
              </div>

              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[var(--panel-border)] bg-[var(--background)] text-xs font-semibold text-[var(--text-primary)]">
                    3
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Reviens ici
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)] leading-relaxed">
                      La configuration s&apos;ouvre dès que {botName} est détecté.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => checkPresence(true)}
                    disabled={isChecking}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw
                      className={cn(
                        "h-3.5 w-3.5",
                        isChecking && "animate-spin text-[var(--accent-primary)]"
                      )}
                    />
                    <span>{isChecking ? "Vérification..." : "Vérifier"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSkip(guild)}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                    title="Passer l'attente et accéder directement à la configuration"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    <span>Passer l&apos;attente</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-4 py-3 text-center text-xs text-[var(--text-muted)]">
              <span>La détection peut prendre quelques secondes après l&apos;ajout du bot.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
