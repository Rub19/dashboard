"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Home,
  BookOpen,
  ExternalLink,
  Sun,
  Moon,
  LogOut,
  Users,
  Settings2,
  FileText,
  Sliders,
  Crown,
  Key,
  MoreHorizontal,
  Sparkles,
  Download,
  Upload,
  Copy,
  Check,
} from "@/components/icons/ph";
import ClientImage from "@/components/ClientImage";
import FlagIcon from "@/components/FlagIcon";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useAuth } from "@/components/AuthProvider";
import { useAccountProfile } from "@/lib/profile/account-profile";
import { useBotSessionUser } from "@/lib/hooks/useBotSessionUser";
import { getStoredDiscordUser, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { SPRING_PRESS } from "@/lib/ease";
import {
  consoleSidebar,
  consoleSidebarItem,
  consoleBrandMark,
} from "./consoleMotion";
import type { NavigatorCategory, NavigatorModule } from "./ModuleNavigator";

export type HubView = "home" | "modules" | "module";

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
  onOpenIntro?: () => void;
  onOpenSetup?: () => void;
  onExportConfig?: () => void;
  onImportConfig?: () => void;
  onCopyGuildId?: () => void;
  copiedId?: boolean;
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

function getGuildInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "SV";
}

export default function HubSidebar({
  guildName,
  guildIconUrl,
  selectedGuildId = "",
  onChangeGuild,
  view = "home",
  activeId = "",
  onHome,
  open = false,
  onClose,
  onOpenIntro,
  onOpenSetup,
  onExportConfig,
  onImportConfig,
  onCopyGuildId,
  copiedId = false,
}: HubSidebarProps) {
  const router = useRouter();
  const { setOpen: openCommandPalette } = useCommandPalette();
  const { settings, update: updateSettings } = useSettings();
  const { signOut } = useAuth();
  const { profile: ethoneProfile } = useAccountProfile();
  const botUser = useBotSessionUser();
  const storedUser = useMemo(() => getStoredDiscordUser(), []);
  const { reduced } = useMotionPref();
  const [serverMenuOpen, setServerMenuOpen] = useState(false);

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

  const currentDisplayName =
    botUser?.globalName ||
    botUser?.username ||
    storedUser?.globalName ||
    storedUser?.displayName ||
    storedUser?.username ||
    ethoneProfile?.displayName ||
    ethoneProfile?.username ||
    "rub19";

  const currentAvatarUrl =
    botUser?.avatarUrl ||
    storedUser?.avatarUrl ||
    storedUser?.avatarUrlSmall ||
    ethoneProfile?.avatarUrl ||
    null;

  const initials = useMemo(() => getGuildInitials(guildName), [guildName]);

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
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-[var(--panel-border)] bg-[var(--surface-raised)]/95 flex flex-col justify-between p-4 h-dvh max-h-dvh transition-transform duration-300 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="space-y-3 overflow-y-auto pr-0.5 [scrollbar-width:none]">
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

          <motion.div
            variants={consoleSidebarItem}
            className="flex items-center justify-between gap-2 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] p-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {guildIconUrl ? (
                <ClientImage
                  src={guildIconUrl}
                  alt={guildName}
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
                  {guildName}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                  <Crown className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="truncate">Owner Etho</span>
                </span>
              </div>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setServerMenuOpen((v) => !v)}
                aria-expanded={serverMenuOpen}
                aria-haspopup="menu"
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer"
                title="Options du serveur"
                aria-label="Options du serveur"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              <AnimatePresence>
                {serverMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setServerMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1.5 w-56 z-50 rounded border border-[var(--panel-border)] bg-[var(--surface-raised)] p-1 shadow-2xl space-y-0.5 text-xs font-medium"
                    >
                      {onChangeGuild && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setServerMenuOpen(false);
                            onChangeGuild();
                          }}
                          className="w-full flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors cursor-pointer"
                        >
                          <Home className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span>Changer de serveur</span>
                        </button>
                      )}
                      {onOpenIntro && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setServerMenuOpen(false);
                            onOpenIntro();
                          }}
                          className="w-full flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span>Découvrir le bot</span>
                        </button>
                      )}
                      {onOpenSetup && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setServerMenuOpen(false);
                            onOpenSetup();
                          }}
                          className="w-full flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors cursor-pointer"
                        >
                          <Sliders className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span>Setup assisté</span>
                        </button>
                      )}
                      {onExportConfig && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setServerMenuOpen(false);
                            onExportConfig();
                          }}
                          className="w-full flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span>Exporter la configuration</span>
                        </button>
                      )}
                      {onImportConfig && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setServerMenuOpen(false);
                            onImportConfig();
                          }}
                          className="w-full flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span>Importer une configuration</span>
                        </button>
                      )}
                      {onCopyGuildId && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setServerMenuOpen(false);
                            onCopyGuildId();
                          }}
                          className="w-full flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors cursor-pointer"
                        >
                          {copiedId ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          )}
                          <span>Copier l&apos;ID du serveur</span>
                        </button>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.button
            variants={consoleSidebarItem}
            type="button"
            onClick={() => openCommandPalette(true)}
            className="w-full flex items-center justify-between rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Rechercher un réglage...</span>
            </div>
            <kbd className="rounded-sm border border-[var(--panel-border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">
              Ctrl K
            </kbd>
          </motion.button>

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
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Vue d&apos;ensemble</span>
            </button>
          </div>

          <div className="space-y-1 pt-2">
            <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Protection
            </span>
            <div className="space-y-0.5 text-xs">
              <button
                type="button"
                onClick={() => router.push(`/discord/security?guildId=${selectedGuildId}`)}
                className="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
              >
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                <span>Protections</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/discord/server/health?guildId=${selectedGuildId}`)}
                className="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>Scan de sécurité</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/discord/setup?guildId=${selectedGuildId}`)}
                className="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
              >
                <Sliders className="h-3.5 w-3.5 shrink-0" />
                <span>Configuration assistée</span>
              </button>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Membres
            </span>
            <div className="space-y-0.5 text-xs">
              <button
                type="button"
                onClick={() => router.push(`/discord/security?tab=whitelist&guildId=${selectedGuildId}`)}
                className="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>Whitelist</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/discord/security?tab=blacklist&guildId=${selectedGuildId}`)}
                className="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
              >
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                <span>Blacklist</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/discord/server/roles?guildId=${selectedGuildId}`)}
                className="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
              >
                <Crown className="h-3.5 w-3.5 shrink-0" />
                <span>Rôles et membres</span>
              </button>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Serveur
            </span>
            <div className="space-y-0.5 text-xs">
              <button
                type="button"
                onClick={() => router.push(`/discord/logs?guildId=${selectedGuildId}`)}
                className="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span>Logs</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/discord/server?guildId=${selectedGuildId}`)}
                className="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
              >
                <Sliders className="h-3.5 w-3.5 shrink-0" />
                <span>Outils</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/discord/server/settings?guildId=${selectedGuildId}`)}
                className="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
              >
                <Settings2 className="h-3.5 w-3.5 shrink-0" />
                <span>Réglages</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/discord/server/permissions?guildId=${selectedGuildId}`)}
                className="w-full flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
              >
                <Key className="h-3.5 w-3.5 shrink-0" />
                <span>Accès</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-3 border-t border-[var(--panel-border)] shrink-0">
          <motion.div variants={consoleSidebarItem} className="space-y-0.5 text-xs">
            <button
              type="button"
              onClick={onChangeGuild}
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
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
}
