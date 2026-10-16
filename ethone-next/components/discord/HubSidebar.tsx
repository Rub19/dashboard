"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Search,
  Home,
  BookOpen,
  ExternalLink,
  Sun,
  Moon,
  LogOut,
} from "@/components/icons/ph";
import {
  Ban as LBan,
  BriefcaseBusiness as LBriefcaseBusiness,
  CalendarDays as LCalendarDays,
  Coins as LCoins,
  Filter as LFilter,
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
  Hand as LHand,
  Scale as LScale,
  ScrollText as LScrollText,
  Contact as LContact,
  ShieldAlert as LShieldAlert,
  ListChecks as LListChecks,
  Flag as LFlag,
  MailOpen as LMailOpen,
  ChartColumn as LChartColumn,
  MessageSquareText as LMessageSquareText,
} from "lucide-react";

type SidebarIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;
import ClientImage from "@/components/ClientImage";
import ServerSwitcher from "./console/ServerSwitcher";
import OwnerBotSection from "./OwnerBotSection";
import DiscordLanguageDropdown from "./DiscordLanguageDropdown";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useAuth } from "@/components/AuthProvider";
import { useAccountProfile } from "@/lib/profile/account-profile";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
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

export type ConsoleView = "settings" | "access" | "logs" | "whitelist" | "blacklist" | "members" | "commands" | "tools" | "protections" | "automod" | "welcome" | "autoroles" | "sanctions" | "warnings" | "presets" | "reports" | "appeals" | "modstats" | "sanctionmessages";
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
  onOpenView?: (view: ConsoleView, opts?: { logsTab?: "incidents" | "journal" | "channels" }) => void;
  logsTab?: "incidents" | "journal" | "channels";
  /** Modules actifs / total sur ce serveur (lus depuis le bot par la page). */
  activeModuleCount?: number;
  totalModuleCount?: number;
  onOpenScan?: () => void;
}

const SUPPORT_DISCORD_URL = "https://discord.gg/WvEcyBuP45";
const DOCS_URL = "/docs";

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
  logsTab = "incidents",
}: HubSidebarProps) {
  const router = useRouter();
  const i18n = useI18n();
  const { setOpen: openCommandPalette } = useCommandPalette();
  const { user, session, signOut } = useAuth();
  const { profile: ethoneProfile } = useAccountProfile();
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

  // Compteur « Protections actives / total » (comme Keeper), rechargé quand une protection est activée ou coupée.
  const [protCount, setProtCount] = useState<{ on: number; total: number } | null>(null);
  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
    if (!api || !selectedGuildId) return;
    let cancelled = false;
    const load = () =>
      fetch(`${api}/api/guilds/${selectedGuildId}/protections`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d?.settings) return;
          const all = Object.values(d.settings as Record<string, { enabled?: boolean }>);
          setProtCount({ on: all.filter((s) => s.enabled).length, total: all.length });
        })
        .catch(() => {});
    void load();
    window.addEventListener("etho:protections-changed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("etho:protections-changed", load);
    };
  }, [selectedGuildId]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch {}
    router.push("/login");
  }, [signOut, router]);

  const identity = useUserIdentity();
  const currentDisplayName =
    botUser?.globalName ||
    botUser?.username ||
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
    storedUser?.avatarUrl ||
    storedUser?.avatarUrlSmall ||
    ethoneProfile?.avatarUrl ||
    identity.avatarUrl ||
    null;

  const currentInitials = useMemo(() => {
    if (botUser?.globalName || botUser?.username || storedUser?.globalName || storedUser?.displayName || storedUser?.username) {
      const name = botUser?.globalName || botUser?.username || storedUser?.globalName || storedUser?.displayName || storedUser?.username || "";
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.slice(0, 2).toUpperCase() || "SV";
    }
    if (!identity.isGuest && identity.initials) return identity.initials;
    const parts = currentDisplayName.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
    return currentDisplayName.slice(0, 2).toUpperCase() || "CO";
  }, [botUser, storedUser, identity.isGuest, identity.initials, currentDisplayName]);


  const openView = (v: ConsoleView, fallback: string, opts?: { logsTab?: "incidents" | "journal" | "channels" }) =>
    onOpenView ? onOpenView(v, opts) : router.push(`/discord/?guildId=${selectedGuildId}&view=${v}${fallback}`);
  const viewItem = (v: ConsoleView, label: string, icon: SidebarIcon, badge?: React.ReactNode) => ({ key: v, label, icon, active: view === v, onClick: () => openView(v, ""), badge });
  const moduleItem = (id: string, label: string, icon: SidebarIcon) => ({ key: id, label, icon, active: activeId === id, onClick: () => (onSelect ? onSelect(id) : router.push(`/discord/${id}?guildId=${selectedGuildId}`)) });
  const sections: Array<{ title: string; items: Array<{ key: string; label: string; icon: SidebarIcon; active: boolean; onClick: () => void; badge?: React.ReactNode }> }> = [
    {
      title: i18n("dProtection", "Protection"),
      items: [
        viewItem(
          "protections",
          i18n("dProtections", "Protections"),
          LShield,
          protCount ? <span className={cn("ml-auto font-mono text-xs tabular-nums", protCount.on ? "text-emerald-400" : "text-[var(--text-muted)]")}>{protCount.on}/{protCount.total}</span> : undefined
        ),
        viewItem("automod", "AutoMod", LFilter),
        { key: "scan", label: i18n("dSecurityScan", "Scan de sécurité"), icon: LScanFace, active: view === "scan", onClick: () => (onOpenScan ? onOpenScan() : router.push(`/discord?guildId=${selectedGuildId}&view=scan`)) },
        { key: "logs-protection", label: "Logs de protection", icon: LHistory, active: view === "logs" && logsTab === "incidents", onClick: () => openView("logs", "", { logsTab: "incidents" }) },
        { key: "setup", label: i18n("dAssistedSetup", "Configuration assistée"), icon: LWandSparkles, active: view === "setup", onClick: () => (onOpenSetup ? onOpenSetup() : router.push(`/discord/setup?guildId=${selectedGuildId}`)) },
      ],
    },
    {
      title: "Accueil des membres",
      items: [viewItem("welcome", "Bienvenue et départs", LHand), viewItem("autoroles", "Rôles automatiques", LSquareUserRound)],
    },
    {
      title: "Sanctions",
      items: [
        viewItem("sanctions", "Sanctions", LScale),
        viewItem("warnings", "Avertissements et paliers", LShieldAlert),
        viewItem("presets", "Raisons prédéfinies", LListChecks),
        viewItem("reports", "Signalements", LFlag),
        viewItem("appeals", "Appels", LMailOpen),
        viewItem("modstats", "Statistiques", LChartColumn),
      ],
    },
    {
      title: "Modération",
      items: [viewItem("commands", i18n("dCommands", "Commandes"), LGavel), viewItem("sanctionmessages", "Messages de sanction", LMessageSquareText), viewItem("members", i18n("dRolesAndMembers", "Rôles et membres"), LContact)],
    },
    {
      title: "Accès",
      items: [viewItem("whitelist", i18n("dWhitelist", "Whitelist"), LUsersRound), viewItem("blacklist", i18n("dBlacklist", "Blacklist"), LBan), viewItem("access", "Owners Etho", LUserRoundCog)],
    },
    {
      title: i18n("dAnimation", "Animation"),
      items: [
        ...ANIMATION_LINKS.map(({ id, key, label, icon }) => moduleItem(id, i18n(key, label), icon)),
        ...(onAllModules ? [{ key: "all-modules", label: i18n("dAllModules", "Tous les modules"), icon: LLayoutGrid, active: view === "modules", onClick: onAllModules }] : []),
      ],
    },
    {
      title: i18n("dServer", "Serveur"),
      items: [
        { key: "logs-server", label: "Logs du serveur", icon: LScrollText, active: view === "logs" && logsTab !== "incidents", onClick: () => openView("logs", "", { logsTab: "journal" }) },
        viewItem("tools", i18n("dTools", "Outils"), LBriefcaseBusiness),
        viewItem("settings", i18n("dSettings", "Réglages"), LSettings),
      ],
    },
  ];

  const isOverviewActive = view === "home" && !activeId;

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
          "fixed inset-y-0 left-0 z-50 w-80 shrink-0 border-r border-[var(--panel-border)] bg-[var(--surface-raised)]/95 flex flex-col justify-between p-4.5 h-dvh max-h-dvh transition-transform duration-300 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-0.5 [scrollbar-width:none]">
          <div className="flex items-center gap-3 px-2 pt-1 pb-1">
            <motion.div
              variants={consoleBrandMark}
              whileHover={reduced ? undefined : { scale: 1.06 }}
              transition={SPRING_PRESS}
              className="relative flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 cursor-pointer shadow-xs"
            >
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </motion.div>
            <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
              Etho
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
            className="w-full flex items-center justify-between rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-sm text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Search className="h-4 w-4" />
              <span>{i18n("dSearchPlaceholder", "Rechercher un réglage... Ctrl K").replace(" Ctrl K", "")}</span>
            </div>
            <kbd className="rounded-md border border-[var(--panel-border)] bg-[var(--background)] px-2 py-0.5 text-xs font-mono text-[var(--text-muted)]">
              Ctrl K
            </kbd>
          </motion.button>

          <OwnerBotSection itemClass="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left" />

          <div className="space-y-0.5 text-sm">
            <button
              type="button"
              onClick={onHome}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 font-semibold text-sm transition-colors cursor-pointer text-left",
                isOverviewActive
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
              )}
            >
              <LLayoutGrid className="h-4.5 w-4.5 shrink-0" strokeWidth={1.75} />
              <span>{i18n("dOverview", "Vue d'ensemble")}</span>
            </button>
          </div>

          {sections.map((section) => (
            <div key={section.title} className="space-y-1.5 pt-2">
              <span className="block px-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{section.title}</span>
              <div className="space-y-1 text-sm">
                {section.items.map(({ key, label, icon: Icon, active, onClick, badge }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={onClick}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer text-left",
                      active ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <Icon strokeWidth={1.75} className="h-4.5 w-4.5 shrink-0" />
                    <span className="truncate">{label}</span>
                    {badge}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {totalModuleCount ? (
          <div className="px-2.5 pt-2.5 pb-1 space-y-2 text-xs text-[var(--text-muted)] shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{i18n("dActiveModules", "Modules actifs")}</span>
              <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                {activeModuleCount ?? 0}/{totalModuleCount}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--panel-border)] overflow-hidden">
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
                className="flex items-center gap-2 text-[11px] text-[var(--warning)] hover:underline"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--warning)]" />
                {logGap.length} sans salon de log
              </button>
            )}
          </div>
        ) : null}

        <div className="space-y-4 pt-3 border-t border-[var(--panel-border)] shrink-0">
          <motion.div variants={consoleSidebarItem} className="space-y-1 text-sm">
            <button
              type="button"
              onClick={onChangeGuild}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer font-medium text-left text-sm"
            >
              <Home className="h-4.5 w-4.5" />
              <span>{i18n("dMyServers", "Mes serveurs")}</span>
            </button>
            {hasEthoneOs && (
              <Link
                href="/dashboard"
                onClick={handleReturnToDashboard}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer font-medium text-left text-sm"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
                <span>{i18n("dReturnToDashboard", "Retour au dashboard")}</span>
              </Link>
            )}
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg px-3 py-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors text-sm"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-4.5 w-4.5" />
                <span>{i18n("dDocumentation", "Documentation")}</span>
              </div>
              <ExternalLink className="h-4 w-4 opacity-60" />
            </a>
            <a
              href={SUPPORT_DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg px-3 py-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors text-sm"
            >
              <div className="flex items-center gap-3">
                <LifeBuoyIcon className="h-4.5 w-4.5" />
                <span>{i18n("dSupport", "Support")}</span>
              </div>
              <ExternalLink className="h-4 w-4 opacity-60" />
            </a>
          </motion.div>

          <motion.div variants={consoleSidebarItem} className="pt-2 border-t border-[var(--panel-border)]">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-3 min-w-0">
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
                    width={36}
                    height={36}
                    fallback={
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--accent-primary)] font-bold text-xs border border-[var(--panel-border)] shrink-0">
                        {currentInitials}
                      </div>
                    }
                    className="h-8 w-8 rounded-full object-cover border border-[var(--panel-border)] shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--accent-primary)] font-bold text-xs border border-[var(--panel-border)] shrink-0">
                    {currentInitials}
                  </div>
                )}
                <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {currentDisplayName}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer"
                  title={i18n(isDark ? "dThemeToggleLight" : "dThemeToggleDark", isDark ? "Activer le mode clair" : "Activer le mode sombre")}
                  aria-label={i18n(isDark ? "dThemeToggleLight" : "dThemeToggleDark", isDark ? "Activer le mode clair" : "Activer le mode sombre")}
                >
                  {isDark ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5 text-amber-400" />}
                </button>

                <DiscordLanguageDropdown align="right" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-[var(--text-muted)] hover:text-rose-400 rounded-lg hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer"
                  title={i18n("dLogout", "Déconnexion")}
                  aria-label={i18n("dLogout", "Déconnexion")}
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
}
