"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Search,
  ShieldCheck,
  Crown,
  X,
  Home,
  BookOpen,
  Sun,
  Moon,
  LogOut,
} from "@/components/icons/ph";
import DiscordIcon from "@/components/DiscordIcon";
import ClientImage from "@/components/ClientImage";
import DiscordLanguageDropdown from "./DiscordLanguageDropdown";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useDayNightToggle } from "@/lib/hooks/useDayNightToggle";
import { useAccountProfile } from "@/lib/profile/account-profile";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { cn } from "@/lib/utils";
import { SPRING_PILL, SPRING_PRESS } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { getStoredDiscordUser, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useBotSessionUser } from "@/lib/hooks/useBotSessionUser";
import OwnerBotSection from "./OwnerBotSection";
import {
  useConsoleIntro,
  consoleSidebar,
  consoleSidebarItem,
  consoleBrandMark,
  consoleHeader,
  consoleStage,
  consoleReveal,
  consoleFadeUp,
  consoleList,
  consoleRow,
} from "./consoleMotion";
import { tx } from "@/lib/tx";

interface ServerPickerProps {
  guilds: DiscordGuild[];
  totalCount: number;
  botGuildIds: Set<string>;
  botPresenceKnown: boolean;
  inviteUrl: string;
  userName?: string;
  userAvatar?: string | null;
  isConnected: boolean;
  connecting: boolean;
  onConnect: () => void;
  onlyManageable: boolean;
  onToggleManageable: () => void;
  botAuthHref: string | null;
  onPick: (guild: DiscordGuild) => void;
}

const SUPPORT_DISCORD_URL = "https://discord.gg/WvEcyBuP45";
const DOCS_URL = "/docs";

function getGuildInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "SV";
}

function getGuildProtectionText(_guildId: string): string {
  return "Etho installé";
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

export default function ServerPicker({
  guilds,
  totalCount,
  botGuildIds,
  botPresenceKnown,
  inviteUrl,
  userName,
  userAvatar,
  isConnected,
  connecting,
  onConnect,
  onlyManageable,
  onToggleManageable,
  botAuthHref,
  onPick,
}: ServerPickerProps) {
  const { reduced } = useMotionPref();
  const playIntro = useConsoleIntro();
  const { setOpen: openCommandPalette } = useCommandPalette();
  const { profile: ethoneProfile } = useAccountProfile();
  const router = useRouter();
  const { user, session, signOut } = useAuth();
  const [hasEthoneOs, setHasEthoneOs] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isEthoneDomain = !window.location.hostname.startsWith("discord.");
    const hasToken = Boolean(
      localStorage.getItem("sb-bvgifyzhpzkbrwdjrqsg-auth-token") ||
      localStorage.getItem("ethone:session") ||
      localStorage.getItem("ethone:active-profile") ||
      localStorage.getItem("ethone:profiles")
    );
    if (user || session || ethoneProfile?.username || hasToken || isEthoneDomain) {
      setHasEthoneOs(true);
    }
  }, [user, session, ethoneProfile]);

  const handleReturnToDashboard = useCallback((e?: React.MouseEvent) => {
    try {
      sessionStorage.removeItem("ethone:discord:picked");
    } catch {}
    if (typeof window !== "undefined" && window.location.hostname.startsWith("discord.")) {
      if (e) e.preventDefault();
      window.location.assign("https://ethone.dev/dashboard");
    }
  }, []);

  const i18n = useI18n();
  const { isDark, toggle: toggleTheme } = useDayNightToggle();


  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch {}
    router.push("/login");
  }, [signOut, router]);

  const [query, setQuery] = useState("");
  const { installedGuilds, uninstalledGuilds } = useMemo(() => {
    const installed: DiscordGuild[] = [];
    const uninstalled: DiscordGuild[] = [];

    for (const g of guilds) {
      const isInstalled = botPresenceKnown && botGuildIds.has(g.id);
      if (isInstalled) {
        installed.push(g);
      } else {
        uninstalled.push(g);
      }
    }

    return { installedGuilds: installed, uninstalledGuilds: uninstalled };
  }, [guilds, botPresenceKnown, botGuildIds]);

  const filteredInstalled = useMemo(() => {
    if (!query.trim()) return installedGuilds;
    const q = query.toLowerCase();
    return installedGuilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [installedGuilds, query]);

  const filteredUninstalled = useMemo(() => {
    if (!query.trim()) return uninstalledGuilds;
    const q = query.toLowerCase();
    return uninstalledGuilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [uninstalledGuilds, query]);

  const storedUser = useMemo(() => getStoredDiscordUser(), []);
  const botSession = useBotSessionUser();
  const botUser = botSession && (!storedUser?.id || storedUser.id === botSession.id) ? botSession : null;
  const identity = useUserIdentity();
  const currentDisplayName =
    userName ||
    storedUser?.globalName ||
    storedUser?.displayName ||
    storedUser?.username ||
    (ethoneProfile?.displayName && ethoneProfile.displayName.trim()) ||
    (ethoneProfile?.username && ethoneProfile.username.trim()) ||
    (!identity.isGuest && identity.displayName && identity.displayName !== "Personnel" ? identity.displayName : "") ||
    (!identity.isGuest && identity.username && identity.username !== "utilisateur" ? identity.username : "") ||
    (identity.email ? identity.email.split("@")[0] : "") ||
    (!identity.isGuest ? identity.displayName : "") ||
    i18n("dAccount", "Compte");
  const currentAvatarUrl =
    botUser?.avatarUrl ||
    userAvatar ||
    storedUser?.avatarUrl ||
    storedUser?.avatarUrlSmall ||
    ethoneProfile?.avatarUrl ||
    identity.avatarUrl ||
    null;
  const currentInitials = useMemo(() => {
    if (userName || storedUser?.globalName || storedUser?.displayName || storedUser?.username) {
      const name = userName || storedUser?.globalName || storedUser?.displayName || storedUser?.username || "";
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.slice(0, 2).toUpperCase() || "SV";
    }
    if (!identity.isGuest && identity.initials) return identity.initials;
    const parts = currentDisplayName.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
    return currentDisplayName.slice(0, 2).toUpperCase() || "CO";
  }, [userName, storedUser, identity.isGuest, identity.initials, currentDisplayName]);

  return (
    <div className="h-dvh min-h-dvh w-full bg-[var(--background)] text-[var(--text-primary)] flex flex-col md:flex-row antialiased overflow-hidden">
      <motion.aside
        variants={consoleSidebar}
        initial={!reduced && playIntro ? "initial" : false}
        animate="animate"
        className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[var(--panel-border)] bg-[var(--surface-raised)]/95 flex flex-col justify-between p-4 md:h-dvh md:max-h-dvh"
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto [scrollbar-width:none]">
          <div className="flex items-center gap-2.5 px-2 pt-1">
            <motion.div
              variants={consoleBrandMark}
              whileHover={reduced ? undefined : { scale: 1.06 }}
              transition={SPRING_PRESS}
              className="relative flex h-8 w-8 items-center justify-center rounded-sm bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4 text-[var(--accent-primary)]" />
            </motion.div>
            <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">{tx("Etho")}</span>
          </div>

          <motion.button
            variants={consoleSidebarItem}
            type="button"
            onClick={() => openCommandPalette(true)}
            className="w-full flex items-center justify-between rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>{i18n("dSearchPlaceholder", "Rechercher réglage... Ctrl K")}</span>
            </div>
            <kbd className="rounded-sm border border-[var(--panel-border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">
              {tx("Ctrl K")}
            </kbd>
          </motion.button>

          <motion.div variants={consoleSidebarItem} className="space-y-1 text-xs">
            <button
              type="button"
              className="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-primary)] hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer font-medium text-left"
            >
              <Home className="h-4 w-4" />
              <span>{i18n("dMyServers", "Mes serveurs")}</span>
            </button>
            {hasEthoneOs && (
              <Link
                href="/dashboard"
                onClick={handleReturnToDashboard}
                className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors text-xs font-medium cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{i18n("dReturnToDashboard", "Retour au dashboard")}</span>
              </Link>
            )}
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

          <div className="text-xs">
            <OwnerBotSection itemClass="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left" />
          </div>
        </div>

        <motion.div variants={consoleSidebarItem} className="pt-3 border-t border-[var(--panel-border)]">
          <div className="flex items-center justify-between p-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentAvatarUrl ? (
                <ClientImage
                  candidates={[
                    currentAvatarUrl,
                    storedUser?.avatarUrl,
                    storedUser?.avatarUrlSmall,
                    ethoneProfile?.avatarUrl,
                    identity.avatarUrl,
                  ].filter(Boolean) as string[]}
                  src={currentAvatarUrl}
                  alt={currentDisplayName}
                  width={30}
                  height={30}
                  fallback={
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--accent-primary)] font-bold text-xs border border-[var(--panel-border)] shrink-0">
                      {currentInitials}
                    </div>
                  }
                  className="h-7 w-7 rounded-full object-cover border border-[var(--panel-border)] shrink-0"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--accent-primary)] font-bold text-xs border border-[var(--panel-border)] shrink-0">
                  {currentInitials}
                </div>
              )}
              <span className="truncate text-xs font-bold text-[var(--text-primary)]">{currentDisplayName}</span>
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
      </motion.aside>

      <main className="flex-1 min-w-0 p-4 md:p-8 lg:p-10 overflow-y-auto h-full md:h-dvh">
        <div className="max-w-6xl mx-auto space-y-6">
          <motion.div
            variants={consoleHeader}
            initial={reduced ? false : "initial"}
            animate="animate"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--panel-border)] pb-4"
          >
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-primary)]">{tx("Etho")}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[var(--accent-primary)] font-medium">{i18n("dMyServers", "Mes serveurs")}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{i18n("dAllSaved", "Tout est enregistré")}</span>
            </div>
          </motion.div>

          <motion.div
            variants={consoleStage}
            initial={reduced ? false : "initial"}
            animate="animate"
            className="space-y-6"
          >
            {botAuthHref && (
              <motion.a
                variants={consoleFadeUp}
                href={botAuthHref}
                className="group flex items-center gap-3 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-3 text-xs leading-relaxed text-[var(--text-muted)] transition-all hover:border-[#5865F2]/50 hover:bg-[#5865F2]/[0.16]"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#5865F2]/20 text-[#aab3ff]">
                  <DiscordIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block font-semibold text-[var(--text-primary)]">{tx("Connecte le bot à ton compte Discord")}</strong>
                  {tx("Permet d'accéder à tous les réglages et serveurs en temps réel.")}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]" />
              </motion.a>
            )}

            <motion.div variants={consoleReveal} className="flex items-center gap-3.5">
              {currentAvatarUrl ? (
                <ClientImage
                  candidates={[
                    currentAvatarUrl,
                    storedUser?.avatarUrl,
                    storedUser?.avatarUrlSmall,
                    ethoneProfile?.avatarUrl,
                    identity.avatarUrl,
                  ].filter(Boolean) as string[]}
                  src={currentAvatarUrl}
                  alt={currentDisplayName}
                  width={48}
                  height={48}
                  fallback={
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--accent-primary)] font-bold text-sm border border-[var(--panel-border)] shrink-0 shadow-sm">
                      {currentInitials}
                    </div>
                  }
                  className="h-12 w-12 rounded-full object-cover border border-[var(--panel-border)] shrink-0 shadow-sm"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--accent-primary)] font-bold text-sm border border-[var(--panel-border)] shrink-0 shadow-sm">
                  {currentInitials}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  {tx("Bienvenue,")}{" "} {currentDisplayName}
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm text-[var(--text-muted)]">
                  {tx("Sélectionne un serveur pour configurer Etho.")}
                </p>
              </div>
            </motion.div>

            <motion.div variants={consoleFadeUp} className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tx("Rechercher un serveur...")}
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/40 transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {totalCount > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 shrink-0">
                  <span className="text-xs text-[var(--text-muted)]">{tx("Gérables")}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={onlyManageable}
                    aria-label={tx("Uniquement les serveurs gérables")}
                    onClick={onToggleManageable}
                    className={cn(
                      "relative h-5 w-10 shrink-0 cursor-pointer rounded-full border border-[var(--panel-border)] outline-none transition-colors duration-300",
                      onlyManageable ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-raised)]"
                    )}
                  >
                    <motion.span
                      className="absolute left-0.5 top-0.5 h-3.5 w-4 rounded-full bg-white shadow"
                      initial={false}
                      animate={{ x: onlyManageable ? 18 : 0 }}
                      transition={SPRING_PILL}
                    />
                  </button>
                </div>
              )}
            </motion.div>

            {!isConnected && (
              <motion.div variants={consoleFadeUp} className="rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--surface-raised)] p-5 text-center space-y-3">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                  <DiscordIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{tx("Connexion Discord requise")}</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {tx("Connecte ton compte Discord pour synchroniser et gérer tes serveurs.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onConnect}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 transition-all cursor-pointer"
                >
                  <DiscordIcon className="h-4 w-4" />
                  <span>{tx("Lier mon compte Discord")}</span>
                </button>
              </motion.div>
            )}

            {isConnected && filteredInstalled.length === 0 && filteredUninstalled.length === 0 && (
              <motion.div variants={consoleFadeUp} className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{tx("Aucun serveur Discord gérable trouvé")}</p>
                <p className="text-xs text-[var(--text-muted)]">{tx("Il te faut la permission Administrateur ou Gérer le serveur.")}</p>
                {inviteUrl && (
                  <a
                    href={inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 transition-all cursor-pointer"
                  >
                    <span>{tx("Inviter le bot sur un serveur")}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </motion.div>
            )}

            {filteredInstalled.length > 0 && (
              <motion.div variants={consoleFadeUp} className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-0.5">
                  {tx("SERVEURS GÉRÉS (")}{filteredInstalled.length})
                </div>
                <motion.div variants={consoleList} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredInstalled.map((guild) => {
                    const protectionText = getGuildProtectionText(guild.id);
                    return (
                      <motion.div
                        key={guild.id}
                        variants={consoleRow}
                        whileHover={reduced ? undefined : { y: -2, scale: 1.01 }}
                        whileTap={reduced ? undefined : { scale: 0.985 }}
                        transition={SPRING_PRESS}
                        role="button"
                        tabIndex={0}
                        onClick={() => onPick(guild)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onPick(guild);
                          }
                        }}
                        className="group flex items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3.5 hover:border-emerald-500/40 hover:bg-[var(--surface-raised)] transition-all cursor-pointer shadow-xs gap-3 min-w-0"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {guild.iconUrl ? (
                            <ClientImage
                              src={guild.iconUrl}
                              alt={guild.name}
                              width={44}
                              height={44}
                              className="h-11 w-11 rounded-xl object-cover border border-[var(--panel-border)] shrink-0"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-raised)] text-emerald-400 font-bold text-xs border border-[var(--panel-border)] shrink-0">
                              {getGuildInitials(guild.name)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4 className="truncate text-sm font-bold text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
                                {guild.name}
                              </h4>
                              {guild.owner && (
                                <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                              )}
                            </div>
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] sm:text-[11px] font-semibold text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                                <span>{protectionText || tx("Bot installé")}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}

            <motion.div variants={consoleFadeUp} className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-0.5">
                {tx("INVITER SUR UN AUTRE SERVEUR (")}{filteredUninstalled.length})
              </div>

              {filteredUninstalled.length === 0 && guilds.length > 0 && (
                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-8 text-center text-xs text-[var(--text-muted)]">
                  {query
                    ? tx("Aucun serveur ne correspond à ta recherche.")
                    : tx("Etho est déjà installé sur l'ensemble de tes serveurs !")}
                </div>
              )}

              <motion.div variants={consoleList} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredUninstalled.map((guild) => (
                  <motion.div
                    key={guild.id}
                    variants={consoleRow}
                    whileHover={reduced ? undefined : { y: -2, scale: 1.01 }}
                    whileTap={reduced ? undefined : { scale: 0.985 }}
                    transition={SPRING_PRESS}
                    role="button"
                    tabIndex={0}
                    onClick={() => onPick(guild)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onPick(guild);
                      }
                    }}
                    className="group flex items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5 hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-raised)] transition-all cursor-pointer shadow-xs gap-3 min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {guild.iconUrl ? (
                        <ClientImage
                          src={guild.iconUrl}
                          alt={guild.name}
                          width={44}
                          height={44}
                          className="h-11 w-11 rounded-xl object-cover border border-[var(--panel-border)] shrink-0"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-raised)] text-[var(--text-muted)] font-bold text-xs border border-[var(--panel-border)] shrink-0">
                          {getGuildInitials(guild.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="truncate text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                            {guild.name}
                          </h4>
                          {guild.owner && (
                            <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <div>
                          <span className="text-[11px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] font-medium transition-colors">
                            {tx("Inviter le bot")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ExternalLink className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
