"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Search,
  Home,
  BookOpen,
  ExternalLink,
  Sun,
  Moon,
  LogOut,
} from "@/components/icons/ph";
// Icônes de la console : les mêmes que Keeper (Lucide, trait fin).
import {
  Ban as LBan,
  BriefcaseBusiness as LBriefcaseBusiness,
  CalendarDays as LCalendarDays,
  Coins as LCoins,
  Gamepad2 as LGamepad2,
  Gavel as LGavel,
  Gift as LGift,
  History as LHistory,
  LayoutGrid as LLayoutGrid,
  Music as LMusic,
  ScanFace as LScanFace,
  Settings as LSettings,
  Shield as LShield,
  SquareUserRound as LSquareUserRound,
  Trophy as LTrophy,
  Tv as LTv,
  UserRoundCog as LUserRoundCog,
  UsersRound as LUsersRound,
  WandSparkles as LWandSparkles,
} from "lucide-react";
import ClientImage from "@/components/ClientImage";
import ServerSwitcher from "./console/ServerSwitcher";
import OwnerBotSection from "./OwnerBotSection";
import DiscordLanguageDropdown from "./DiscordLanguageDropdown";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useAuth } from "@/components/AuthProvider";
import { useAccountProfile } from "@/lib/profile/account-profile";
import { useBotSessionUser } from "@/lib/hooks/useBotSessionUser";
import { useDayNightToggle } from "@/lib/hooks/useDayNightToggle";
import { getStoredDiscordUser, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { useI18n } from "@/lib/hooks/useI18n";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import {
  consoleSidebar,
  consoleSidebarItem,
  consoleBrandMark,
} from "./consoleMotion";
import type { NavigatorCategory, NavigatorModule } from "./ModuleNavigator";

/** Pages de la console au format Keeper, affichées dans la console (même barre latérale). */
export type ConsoleView = "settings" | "access" | "logs" | "whitelist" | "blacklist" | "members" | "commands" | "tools" | "protections";
export type HubView = "home" | "modules" | "module" | "setup" | "scan" | ConsoleView;

interface HubSidebarProps {
  guildName: string;
  guildIconUrl?: string | null;
  guilds?: DiscordGuild[];
  selectedGuildId?: string;
  botGuildIds?: Set<string>;
  onSelectGuild?: (guild: DiscordGuild) => void;
  onChangeGuild?: () => void;
  botInviteUrl?: string;
  modules?: NavigatorModule[];
  categories?: NavigatorCategory[];
  view?: HubView;
  activeId?: string;
  status?: Record<string, boolean>;
  onHome?: () => void;
  onAllModules?: () => void;
  onSelect?: (id: string) => void;
  open?: boolean;
  onClose?: () => void;
  onOpenSetup?: () => void;
  /** Ouvre une page de la console (Réglages, Accès…) sans quitter la console. */
  onOpenView?: (view: ConsoleView, opts?: { logsTab?: "incidents" | "channels" }) => void;
  /** Modules actifs / total sur ce serveur (lus depuis le bot par la page). */
  activeModuleCount?: number;
  totalModuleCount?: number;
  onOpenScan?: () => void;
}

const SUPPORT_DISCORD_URL = "https://discord.gg/WvEcyBuP45";
const DOCS_URL = "https://ethone.dev/discord";

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

const ANIMATION_LINKS = [
  { id: "music", path: "/discord/music", key: "dMusic", label: "Musique", icon: LMusic },
  { id: "games", path: "/discord/games", key: "dGames", label: "Jeux et casino", icon: LGamepad2 },
  { id: "giveaways", path: "/discord/giveaways", key: "dGiveaways", label: "Giveaways", icon: LGift },
  { id: "events", path: "/discord/events", key: "dEvents", label: "Événements", icon: LCalendarDays },
  { id: "leveling", path: "/discord/leveling", key: "dLeveling", label: "Niveaux", icon: LTrophy },
  { id: "economy", path: "/discord/economy", key: "dEconomy", label: "Économie", icon: LCoins },
  { id: "streamers", path: "/discord/streamers", key: "dStreamers", label: "Alertes streamers", icon: LTv },
] as const;

export default function HubSidebar({
  guildName,
  guildIconUrl,
  selectedGuildId = "",
  onChangeGuild,
  guilds = [],
  botGuildIds,
  onSelectGuild,
  botInviteUrl,
  view = "home",
  activeId = "",
  onHome,
  open = false,
  onClose,
  onOpenSetup,
  onOpenScan,
  onOpenView,
  onSelect,
  onAllModules,
  activeModuleCount,
  totalModuleCount,
}: HubSidebarProps) {
  const router = useRouter();
  const i18n = useI18n();
  const { setOpen: openCommandPalette } = useCommandPalette();
  const { signOut } = useAuth();
  const { profile: ethoneProfile } = useAccountProfile();
  const botUser = useBotSessionUser();
  const storedUser = useMemo(() => getStoredDiscordUser(), []);
  const { reduced } = useMotionPref();

  const { isDark, toggle: toggleTheme } = useDayNightToggle();

  // Protections actives dont les alertes n'arrivent dans aucun salon (calcul du bot).
  const [logGap, setLogGap] = useState<string[]>([]);
  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
    if (!api || !selectedGuildId) return;
    let cancelled = false;
    fetch(`${api}/api/guilds/${selectedGuildId}/server/log-coverage`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && setLogGap(Array.isArray(d?.withoutChannel) ? d.withoutChannel : []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedGuildId]);


  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch {}
    router.push("/login");
  }, [signOut, router]);

  const currentDisplayName =
    botUser?.globalName ||
    botUser?.username ||
    storedUser?.globalName ||
    storedUser?.displayName ||
    storedUser?.username ||
    ethoneProfile?.displayName ||
    ethoneProfile?.username ||
    "Compte";

  const currentAvatarUrl =
    botUser?.avatarUrl ||
    storedUser?.avatarUrl ||
    storedUser?.avatarUrlSmall ||
    ethoneProfile?.avatarUrl ||
    null;


  const isOverviewActive = view === "home" && !activeId;
  const isSetupActive = view === "setup";
  const isScanActive = view === "scan";

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="hub-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.aside
        variants={consoleSidebar}
        initial={false}
        animate="animate"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-[var(--panel-border)] bg-[var(--surface-raised)]/95 flex flex-col justify-between p-4 h-dvh max-h-dvh transition-transform duration-300 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5 [scrollbar-width:none]">
          <div className="flex items-center gap-2.5 px-2 pt-1 pb-1">
            <motion.div
              variants={consoleBrandMark}
              whileHover={reduced ? undefined : { scale: 1.06 }}
              transition={SPRING_PRESS}
              className="relative flex h-8 w-8 items-center justify-center rounded-sm bg-emerald-500/10 border border-emerald-500/30 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </motion.div>
            <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">
              Etho Protect
            </span>
          </div>

          <motion.div variants={consoleSidebarItem}>
            <ServerSwitcher
              guildName={guildName}
              guildIconUrl={guildIconUrl ?? undefined}
              selectedGuildId={selectedGuildId}
              guilds={guilds}
              botGuildIds={botGuildIds}
              onSelectGuild={onSelectGuild}
              onAllServers={onChangeGuild}
              botInviteUrl={botInviteUrl}
              roleLabel={i18n("dOwnerEtho", "Owner Etho")}
            />
          </motion.div>

          <motion.button
            variants={consoleSidebarItem}
            type="button"
            onClick={() => openCommandPalette(true)}
            className="w-full flex items-center justify-between rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>{i18n("dSearchPlaceholder", "Rechercher un réglage... Ctrl K").replace(" Ctrl K", "")}</span>
            </div>
            <kbd className="rounded-sm border border-[var(--panel-border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">
              Ctrl K
            </kbd>
          </motion.button>

          <OwnerBotSection itemClass="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left" />

          <div className="space-y-0.5 text-xs">
            <button
              type="button"
              onClick={onHome}
              className={cn(
                "w-full flex items-center gap-2.5 rounded px-2.5 py-2 font-semibold transition-colors cursor-pointer text-left",
                isOverviewActive
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
              )}
            >
              <LLayoutGrid className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>{i18n("dOverview", "Vue d'ensemble")}</span>
            </button>
          </div>

          <div className="space-y-1 pt-2">
            <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {i18n("dProtection", "Protection")}
            </span>
            <div className="space-y-0.5 text-xs">
              <button
                type="button"
                onClick={() => (onOpenView ? onOpenView("protections") : router.push(`/discord/?guildId=${selectedGuildId}&view=protections`))}
                aria-current={view === "protections" ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left",
                  view === "protections" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                )}
              >
                <LShield strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                <span>{i18n("dProtections", "Protections")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenScan) {
                    onOpenScan();
                  } else {
                    router.push(`/discord?guildId=${selectedGuildId}&view=scan`);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left",
                  isScanActive
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                )}
              >
                <LScanFace strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                <span>{i18n("dSecurityScan", "Scan de sécurité")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenSetup) {
                    onOpenSetup();
                  } else {
                    router.push(`/discord/setup?guildId=${selectedGuildId}`);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left",
                  isSetupActive
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                )}
              >
                <LWandSparkles strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                <span>{i18n("dAssistedSetup", "Configuration assistée")}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {i18n("dMembers", "Membres")}
            </span>
            <div className="space-y-0.5 text-xs">
              <button
                type="button"
                onClick={() => (onOpenView ? onOpenView("whitelist") : router.push(`/discord/security?tab=whitelist&guildId=${selectedGuildId}`))}
                aria-current={view === "whitelist" ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left",
                  view === "whitelist" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                )}
              >
                <LUsersRound strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                <span>{i18n("dWhitelist", "Whitelist")}</span>
              </button>

              <button
                type="button"
                onClick={() => (onOpenView ? onOpenView("blacklist") : router.push(`/discord/security?tab=blacklist&guildId=${selectedGuildId}`))}
                aria-current={view === "blacklist" ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left",
                  view === "blacklist" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                )}
              >
                <LBan strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                <span>{i18n("dBlacklist", "Blacklist")}</span>
              </button>

              <button
                type="button"
                onClick={() => (onOpenView ? onOpenView("members") : router.push(`/discord/server/roles?guildId=${selectedGuildId}`))}
                aria-current={view === "members" ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left",
                  view === "members" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                )}
              >
                <LSquareUserRound strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                <span>{i18n("dRolesAndMembers", "Rôles et membres")}</span>
              </button>

              <button
                type="button"
                onClick={() => (onOpenView ? onOpenView("commands") : router.push(`/discord/?guildId=${selectedGuildId}&view=commands`))}
                aria-current={view === "commands" ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left",
                  view === "commands" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                )}
              >
                <LGavel strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                <span>{i18n("dCommands", "Commandes")}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {i18n("dAnimation", "Animation")}
            </span>
            <div className="space-y-0.5 text-xs">
              {ANIMATION_LINKS.map(({ id, path, key, label, icon: Icon }) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => (onSelect ? onSelect(id) : router.push(`${path}?guildId=${selectedGuildId}`))}
                  aria-current={activeId === id ? "page" : undefined}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left",
                    activeId === id ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                  <span>{i18n(key, label)}</span>
                </button>
              ))}
              {onAllModules && (
                <button
                  type="button"
                  onClick={onAllModules}
                  aria-current={view === "modules" ? "page" : undefined}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left",
                    view === "modules" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                  )}
                >
                  <LLayoutGrid strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                  <span>{i18n("dAllModules", "Tous les modules")}</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {i18n("dServer", "Serveur")}
            </span>
            <div className="space-y-0.5 text-xs">
              <button
                type="button"
                onClick={() => (onOpenView ? onOpenView("logs") : router.push(`/discord/logs?guildId=${selectedGuildId}`))}
                aria-current={view === "logs" ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left",
                  view === "logs" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                )}
              >
                <LHistory strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                <span>{i18n("dLogs", "Logs")}</span>
              </button>

              <button
                type="button"
                onClick={() => (onOpenView ? onOpenView("tools") : router.push(`/discord/?guildId=${selectedGuildId}&view=tools`))}
                aria-current={view === "tools" ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left",
                  view === "tools" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                )}
              >
                <LBriefcaseBusiness strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                <span>{i18n("dTools", "Outils")}</span>
              </button>

              <button
                type="button"
                onClick={() => (onOpenView ? onOpenView("settings") : router.push(`/discord/server/settings?guildId=${selectedGuildId}`))}
                aria-current={view === "settings" ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left",
                  view === "settings" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                )}
              >
                <LSettings strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                <span>{i18n("dSettings", "Réglages")}</span>
              </button>

              <button
                type="button"
                onClick={() => (onOpenView ? onOpenView("access") : router.push(`/discord/server/permissions?guildId=${selectedGuildId}`))}
                aria-current={view === "access" ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left",
                  view === "access" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                )}
              >
                <LUserRoundCog strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                <span>{i18n("dAccess", "Accès")}</span>
              </button>
            </div>
          </div>

        </div>

        {totalModuleCount ? (
          <div className="px-2 pt-2 pb-1 space-y-1.5 text-xs text-[var(--text-muted)] shrink-0">
            <div className="flex items-center justify-between text-[11px]">
              <span>{i18n("dActiveModules", "Modules actifs")}</span>
              <span className="font-mono text-[10px] text-[var(--text-primary)]">
                {activeModuleCount ?? 0}/{totalModuleCount}
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-[var(--panel-border)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[var(--success)]"
                initial={false}
                animate={{ width: `${Math.round(((activeModuleCount ?? 0) / totalModuleCount) * 100)}%` }}
                transition={SPRING_LAYOUT}
              />
            </div>
            {logGap.length > 0 && (
              <button
                type="button"
                onClick={() => (onOpenView ? onOpenView("logs", { logsTab: "channels" }) : router.push(`/discord/logs?guildId=${selectedGuildId}&tab=routing`))}
                title={logGap.join(", ")}
                className="flex items-center gap-1.5 text-[10px] text-[var(--warning)] hover:underline"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--warning)]" />
                {logGap.length} sans salon de log
              </button>
            )}
          </div>
        ) : null}

        <div className="space-y-4 pt-3 border-t border-[var(--panel-border)] shrink-0">
          <motion.div variants={consoleSidebarItem} className="space-y-0.5 text-xs">
            <button
              type="button"
              onClick={onChangeGuild}
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

          <motion.div variants={consoleSidebarItem} className="pt-2 border-t border-[var(--panel-border)]">
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
    </>
  );
}
