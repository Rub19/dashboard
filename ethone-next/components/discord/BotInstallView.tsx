"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Check,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  SkipForward,
  Home,
  LogOut,
  BookOpen,
  Sun,
  Moon,
  Search,
} from "@/components/icons/ph";
import ClientImage from "@/components/ClientImage";
import DiscordLanguageDropdown from "./DiscordLanguageDropdown";
import { useSettings } from "@/components/SettingsProvider";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useAccountProfile } from "@/lib/profile/account-profile";
import { fetchBotPresence, clearBotPresenceCache } from "@/lib/hooks/useBotGuildIds";
import { cn } from "@/lib/utils";
import { resolveTheme } from "@/lib/theme-engine";
import { getStoredDiscordUser, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useBotSessionUser } from "@/lib/hooks/useBotSessionUser";
import { motion } from "framer-motion";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { SPRING_PRESS } from "@/lib/ease";
import {
  useConsoleIntro,
  consoleSidebar,
  consoleSidebarItem,
  consoleBrandMark,
  consoleHeader,
  consoleStage,
  consoleReveal,
  consoleFadeUp,
  consoleCard,
  consoleStepRow,
} from "./consoleMotion";

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
  const i18n = useI18n();
  const { signOut } = useAuth();
  const { settings, update: updateSettings } = useSettings();
  const { success, info, error: showError } = useToast();
  const { profile: ethoneProfile } = useAccountProfile();

  const isDark = settings.darkMode && resolveTheme(settings.theme).dark !== false;

  const toggleTheme = useCallback(() => {
    const nextDark = !isDark;
    updateSettings({
      darkMode: nextDark,
      theme: nextDark ? "obsidian" : "arctic",
      colorScheme: nextDark ? "dark" : "light",
    });
  }, [isDark, updateSettings]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch {}
    router.push("/login");
  }, [signOut, router]);

  const [isChecking, setIsChecking] = useState(false);
  const [inviteOpened, setInviteOpened] = useState(false);
  const [detected, setDetected] = useState(false);
  const detectedRef = useRef(false);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { reduced } = useMotionPref();
  const playIntro = useConsoleIntro();

  useEffect(() => {
    return () => {
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    };
  }, []);

  const inviteHref = useMemo(() => {
    const base =
      botInviteUrl ||
      `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
    return `${base}&guild_id=${encodeURIComponent(guild.id)}&disable_guild_select=true`;
  }, [botInviteUrl, guild.id]);

  const checkPresence = useCallback(
    async (manual: boolean) => {
      if (detectedRef.current) return true;
      if (manual) setIsChecking(true);
      try {
        clearBotPresenceCache([guild.id]);
        const res = await fetchBotPresence([guild.id], true);
        if (res.present.includes(guild.id)) {
          if (detectedRef.current) return true;
          detectedRef.current = true;
          setDetected(true);
          success(
            "Bot détecté !",
            `${botName} a rejoint "${guild.name}". Ouverture de la configuration...`
          );
          if (manual || reduced) {
            onBotDetected(guild);
          } else {
            setTimeout(() => onBotDetected(guild), 700);
          }
          return true;
        } else if (manual) {
          info(
            "Bot non détecté",
            `${botName} n'a pas encore rejoint "${guild.name}". Assure-toi de valider l'invitation Discord.`
          );
        }
      } catch {
        if (manual) {
          showError(
            "Erreur de détection",
            "Impossible de joindre l'API Discord. Réessaie dans quelques instants."
          );
        }
      } finally {
        if (manual) setIsChecking(false);
      }
      return false;
    },
    [guild, botName, onBotDetected, success, info, showError, reduced]
  );

  useEffect(() => {
    let cancelled = false;
    let delay = 3000;
    let attempts = 0;
    const maxAttempts = 40;

    const poll = async () => {
      if (cancelled || detectedRef.current || attempts >= maxAttempts) return;
      attempts += 1;
      const found = await checkPresence(false);
      if (found || cancelled) return;
      if (attempts > 5) delay = 5000;
      if (attempts > 15) delay = 8000;
      detectTimerRef.current = setTimeout(poll, delay);
    };

    detectTimerRef.current = setTimeout(poll, 2500);

    return () => {
      cancelled = true;
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    };
  }, [checkPresence]);

  const storedUser = useMemo(() => getStoredDiscordUser(), []);
  const botUser = useBotSessionUser();
  const currentDisplayName =
    userName ||
    storedUser?.globalName ||
    storedUser?.displayName ||
    storedUser?.username ||
    ethoneProfile?.displayName ||
    ethoneProfile?.username ||
    "rub19";

  const currentAvatarUrl =
    botUser?.avatarUrl ||
    userAvatar ||
    storedUser?.avatarUrl ||
    storedUser?.avatarUrlSmall ||
    ethoneProfile?.avatarUrl ||
    null;

  const initials = useMemo(() => getGuildInitials(guild.name), [guild.name]);

  return (
    <div className="h-dvh min-h-dvh w-full bg-[var(--background)] text-[var(--text-primary)] flex flex-col md:flex-row antialiased overflow-hidden">
      <motion.aside
        variants={consoleSidebar}
        initial={!reduced && playIntro ? "initial" : false}
        animate="animate"
        className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[var(--panel-border)] bg-[var(--surface-raised)]/95 flex flex-col justify-between p-4 md:h-dvh md:max-h-dvh"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 px-2 pt-1">
            <motion.div
              variants={consoleBrandMark}
              whileHover={reduced ? undefined : { scale: 1.06 }}
              transition={SPRING_PRESS}
              className="relative flex h-8 w-8 items-center justify-center rounded-sm bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4 text-[var(--accent-primary)]" />
            </motion.div>
            <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">
              Etho
            </span>
          </div>

          <motion.div
            variants={consoleSidebarItem}
            className="rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] p-2.5 space-y-2"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {guild.icon ? (
                <ClientImage
                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`}
                  alt={guild.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-sm object-cover shrink-0"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[var(--panel-border)] font-bold text-xs text-[var(--text-primary)]">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-[var(--text-primary)]">
                  {guild.name}
                </span>
                <span className="block text-[10px] text-[var(--text-muted)]">
                  Etho absent
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={consoleSidebarItem}
            className="w-full flex items-center justify-between rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-muted)] select-none opacity-60"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>{i18n("dSearchPlaceholder", "Rechercher un réglage... Ctrl K")}</span>
            </div>
          </motion.div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[var(--panel-border)]">
          <motion.div variants={consoleSidebarItem} className="space-y-1 text-xs">
            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-primary)] hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer font-medium text-left"
            >
              <Home className="h-4 w-4" />
              <span>{i18n("dMyServers", "Mes serveurs")}</span>
            </button>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4" />
                <span>{i18n("dDocumentation", "Documentation")}</span>
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
                <span>{i18n("dSupport", "Support")}</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </a>
          </motion.div>

          <motion.div
            variants={consoleSidebarItem}
            className="pt-2 border-t border-[var(--panel-border)]"
          >
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 min-w-0">
                {currentAvatarUrl ? (
                  <ClientImage
                    src={currentAvatarUrl}
                    alt={currentDisplayName}
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-sm object-cover shrink-0 border border-[var(--panel-border)]"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-sm bg-[var(--panel-border)] flex items-center justify-center font-bold text-xs text-[var(--text-primary)] shrink-0">
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
                  title={i18n(isDark ? "dThemeToggleLight" : "dThemeToggleDark", isDark ? "Activer le mode clair" : "Activer le mode sombre")}
                  aria-label={i18n(isDark ? "dThemeToggleLight" : "dThemeToggleDark", isDark ? "Activer le mode clair" : "Activer le mode sombre")}
                >
                  {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
                </button>

                <DiscordLanguageDropdown align="right" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 rounded hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer"
                  title={i18n("dLogout", "Déconnexion")}
                  aria-label={i18n("dLogout", "Déconnexion")}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto h-full md:h-dvh">
        <motion.header
          variants={consoleHeader}
          initial={reduced ? false : "initial"}
          animate="animate"
          className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--panel-border)] px-4 sm:px-8 bg-[var(--surface-raised)]/40"
        >
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
            <span className="font-normal text-[var(--text-muted)]">{i18n("dAllSaved", "Tout est enregistré")}</span>
          </div>
        </motion.header>

        <motion.div
          variants={consoleStage}
          initial={reduced ? false : "initial"}
          animate="animate"
          className="flex-1 min-w-0 p-4 sm:p-8 lg:p-12 flex flex-col justify-center items-center"
        >
          <div className="w-full max-w-2xl space-y-8">
            <motion.h1
              variants={consoleReveal}
              className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] text-center"
            >
              {i18n("dInstallEthoOn", "Installer Etho sur")} {guild.name}
            </motion.h1>

            <motion.div
              variants={consoleCard}
              className="rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] shadow-2xl divide-y divide-[var(--panel-border)] overflow-hidden"
            >
              <motion.div variants={consoleStepRow} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border text-xs font-semibold transition-colors duration-300",
                      inviteOpened
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                        : "border-[var(--panel-border)] bg-[var(--background)] text-[var(--text-primary)]"
                    )}
                  >
                    {inviteOpened ? <Check className="h-3.5 w-3.5" /> : "1"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {i18n("dStepAddBot", "Ajoute Etho au serveur")}
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)] leading-relaxed">
                      {i18n("dStepAddBotDesc", "Discord s'ouvre dans un nouvel onglet. Garde toutes les permissions demandées.")}
                    </p>
                  </div>
                </div>

                <motion.a
                  href={inviteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setInviteOpened(true)}
                  whileHover={reduced ? undefined : { scale: 1.03 }}
                  whileTap={reduced ? undefined : { scale: 0.97 }}
                  transition={SPRING_PRESS}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 transition-all shadow-md"
                >
                  <span>{i18n("dAddEtho", "Ajouter Etho ↗")}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </motion.a>
              </motion.div>

              <motion.div variants={consoleStepRow} className="p-5 flex items-start gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[var(--panel-border)] bg-[var(--background)] text-xs font-semibold text-[var(--text-primary)]">
                  2
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {i18n("dStepPlaceRole", "Place son rôle tout en haut")}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)] leading-relaxed">
                    {i18n("dStepPlaceRoleDesc", "Paramètres du serveur, Rôles : glisse le rôle Etho au-dessus des autres pour qu'il puisse sanctionner et restaurer.")}
                  </p>
                </div>
              </motion.div>

              <motion.div variants={consoleStepRow} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border text-xs font-semibold transition-colors duration-300",
                      detected
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 animate-pulse"
                        : "border-[var(--panel-border)] bg-[var(--background)] text-[var(--text-primary)]"
                    )}
                  >
                    {detected ? <Check className="h-3.5 w-3.5" /> : "3"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {i18n("dStepComeBack", "Reviens ici")}
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)] leading-relaxed">
                      {i18n("dStepComeBackDesc", "La configuration s'ouvre dès qu'Etho est détecté.")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <motion.button
                    type="button"
                    onClick={() => checkPresence(true)}
                    disabled={isChecking}
                    whileHover={reduced || isChecking ? undefined : { scale: 1.03 }}
                    whileTap={reduced || isChecking ? undefined : { scale: 0.97 }}
                    transition={SPRING_PRESS}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw
                      className={cn(
                        "h-3.5 w-3.5",
                        isChecking && "animate-spin text-[var(--accent-primary)]"
                      )}
                    />
                    <span>{isChecking ? i18n("dSaving", "Vérification...") : i18n("dCheck", "Vérifier")}</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => onSkip(guild)}
                    whileHover={reduced ? undefined : { scale: 1.03 }}
                    whileTap={reduced ? undefined : { scale: 0.97 }}
                    transition={SPRING_PRESS}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                    title={i18n("dSkipWait", "Passer l'attente")}
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    <span>{i18n("dSkipWait", "Passer l'attente")}</span>
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              variants={consoleFadeUp}
              className="rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-4 py-3 text-center text-xs text-[var(--text-muted)]"
            >
              <span>{i18n("dDetectionDelay", "La détection peut prendre quelques secondes après l'ajout du bot.")}</span>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
