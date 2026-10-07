"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ExternalLink,
  Plus,
  Search,
  ShieldCheck,
  Check,
  Eye,
  Sliders,
  X,
  LayoutDashboard,
  Home,
  BookOpen,
  Sun,
  Moon,
  LogOut,
} from "@/components/icons/ph";
import DiscordIcon from "@/components/DiscordIcon";
import LightBorder from "@/components/ui/LightBorder";
import ClientImage from "@/components/ClientImage";
import FlagIcon from "@/components/FlagIcon";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useAuth } from "@/components/AuthProvider";
import { useAccountProfile } from "@/lib/profile/account-profile";
import { cn } from "@/lib/utils";
import { choreography, revealUp } from "@/lib/motion-variants";
import { EASE_SNAP, SPRING_PILL } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { getStoredDiscordUser, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";

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
const DOCS_URL = "https://ethone.dev/discord";

function getGuildInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "SV";
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

function ClassicAvatar({ guild, dim, live }: { guild: DiscordGuild; dim?: boolean; live?: boolean }) {
  return (
    <span className="relative shrink-0">
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center overflow-hidden rounded-sm bg-[var(--surface-raised)] text-sm font-bold text-[var(--text-primary)] ring-1 ring-[var(--panel-border)] transition-transform duration-300 [transition-timing-function:var(--ease-snap)] group-hover:scale-[1.06]",
          dim && "grayscale"
        )}
      >
        {guild.iconUrl ? (
          <ClientImage src={guild.iconUrl} alt={guild.name} width={44} height={44} className="h-full w-full object-cover" />
        ) : (
          getGuildInitials(guild.name)
        )}
      </span>
      {live && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-sm border-2 border-[var(--bg-card,var(--background))] bg-[var(--success)]"
          title="Bot installé"
          aria-label="Bot installé"
        />
      )}
    </span>
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
  const { setOpen: openCommandPalette } = useCommandPalette();
  const { profile: ethoneProfile } = useAccountProfile();
  const router = useRouter();
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

  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"modern" | "classic">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ethone:bot_picker_view");
      if (saved === "classic" || saved === "modern") return saved;
    }
    return "modern";
  });

  const setViewModeWithStorage = useCallback((mode: "modern" | "classic") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("ethone:bot_picker_view", mode);
    }
  }, []);

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

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (q ? guilds.filter((g) => g.name.toLowerCase().includes(q)) : guilds), [guilds, q]);
  const showSearch = guilds.length > 6;

  const storedUser = useMemo(() => getStoredDiscordUser(), []);
  const currentDisplayName =
    userName ||
    storedUser?.globalName ||
    storedUser?.displayName ||
    storedUser?.username ||
    ethoneProfile?.displayName ||
    ethoneProfile?.username ||
    "rub19";
  const currentAvatarUrl =
    userAvatar ||
    storedUser?.avatarUrl ||
    storedUser?.avatarUrlSmall ||
    ethoneProfile?.avatarUrl ||
    null;

  const rowClass =
    "group relative flex w-full items-center gap-4 rounded-sm px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50";
  const discordBtn =
    "btn-sheen relative mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-sm bg-[#5865F2] px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#4752C4] active:translate-y-0 disabled:opacity-50";

  if (viewMode === "classic") {
    return (
      <div className="relative flex min-h-dvh w-full items-center justify-center overflow-x-clip px-4 py-10 bg-[var(--background)]">
        <div className="fixed top-6 right-6 z-50">
          <button
            type="button"
            onClick={() => setViewModeWithStorage("modern")}
            className="flex items-center gap-2 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)]/95 px-4 py-2 text-xs font-semibold text-[var(--accent-primary)] shadow-xl backdrop-blur-md hover:border-[var(--accent-primary)] transition-all cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Vue principale</span>
          </button>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[38%] h-[44rem] w-[44rem] max-w-[140vw] -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--accent-primary) 9%, transparent), transparent)" }}
        />

        <motion.div variants={choreography} initial={reduced ? "animate" : "initial"} animate="animate" className="relative w-full max-w-[460px]">
          <div className="mb-7 flex flex-col items-center text-center">
            <motion.div
              variants={{
                initial: { opacity: 0, scale: 0.6, filter: "blur(8px)" },
                animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE_SNAP } },
              }}
              className="relative h-24 w-24"
            >
              <ClientImage src="/branding/etho-avatar.gif" alt="Etho" width={96} height={96} className="relative h-24 w-24 rounded-sm border-2 border-[var(--panel-border)] object-cover" />
            </motion.div>
            <motion.h1 variants={revealUp} className="mt-5 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Etho
            </motion.h1>
            <motion.p variants={revealUp} className="mt-1.5 text-sm text-[var(--text-muted)]">
              {currentDisplayName ? (
                <>
                  Connecté en tant que <span className="font-semibold text-[var(--text-primary)]">{currentDisplayName}</span>
                </>
              ) : (
                "Choisis un serveur à configurer"
              )}
            </motion.p>
          </div>

          {botAuthHref && (
            <motion.a
              variants={revealUp}
              href={botAuthHref}
              className="group mb-4 flex items-center gap-3 rounded-sm border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-3 text-xs leading-relaxed text-[var(--text-muted)] transition-[background-color,border-color] duration-300 hover:border-[#5865F2]/50 hover:bg-[#5865F2]/[0.16]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-[#5865F2]/20 text-[#aab3ff]">
                <DiscordIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block font-semibold text-[var(--text-primary)]">Connecte le bot à ton compte Discord</strong>
                Sans ça, le site ne voit ni les serveurs où le bot est actif, ni la musique en direct. Clique pour autoriser.
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]" />
            </motion.a>
          )}

          <motion.div variants={revealUp}>
            <LightBorder speed={10} className="shadow-[0_30px_80px_-30px_rgb(0_0_0/0.7)] rounded-sm" innerClassName="backdrop-blur-xl rounded-sm">
              {showSearch && (
                <div className="group flex items-center gap-2.5 border-b border-[var(--panel-border)] px-4">
                  <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--accent-primary)]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher un serveur"
                    aria-label="Rechercher un serveur"
                    className="h-12 w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  />
                </div>
              )}

              {guilds.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-sm bg-[#5865F2]/15 text-[#aab3ff]">
                    <DiscordIcon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {totalCount === 0 && !isConnected ? "Compte non connecté" : "Aucun serveur trouvé"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {totalCount === 0 && !isConnected
                      ? "Connectez votre compte Discord pour charger vos serveurs."
                      : "Aucun serveur Discord associé à ce compte."}
                  </p>
                  {!isConnected ? (
                    <button type="button" onClick={onConnect} disabled={connecting} className={discordBtn}>
                      <DiscordIcon className="h-4 w-4" />
                      Lier mon compte
                    </button>
                  ) : (
                    <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className={discordBtn}>
                      <DiscordIcon className="h-4 w-4" />
                      Inviter le bot
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ) : visible.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-[var(--text-muted)]">Aucun serveur ne correspond.</p>
              ) : (
                <ul className="max-h-[min(60vh,520px)] space-y-0.5 overflow-y-auto p-2 [scrollbar-width:thin]" onMouseLeave={() => setHovered(null)}>
                  <AnimatePresence initial={!reduced} mode="popLayout">
                    {visible.map((guild, i) => {
                      const absent = botPresenceKnown && !botGuildIds.has(guild.id);
                      const live = botPresenceKnown && !absent;
                      const highlight = hovered === guild.id && (
                        <motion.span layoutId="picker-row" transition={SPRING_PILL} className="absolute inset-0 rounded-sm bg-[var(--text-primary)]/[0.06]" />
                      );
                      return (
                        <motion.li
                          key={guild.id}
                          layout={reduced ? false : "position"}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_SNAP, delay: Math.min(i, 10) * 0.035 } }}
                          exit={{ opacity: 0, transition: { duration: 0.12 } }}
                          onMouseEnter={() => setHovered(guild.id)}
                        >
                          {absent ? (
                            <button
                              type="button"
                              onClick={() => onPick(guild)}
                              title="Installer le bot sur ce serveur"
                              className={cn(rowClass, "cursor-pointer opacity-70 transition-opacity duration-300 hover:opacity-100")}
                            >
                              {highlight}
                              <ClassicAvatar guild={guild} dim />
                              <span className="relative min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--text-muted)]">{guild.name}</span>
                              <Plus className="relative h-5 w-5 shrink-0 text-[var(--accent-primary)] transition-transform duration-300 group-hover:rotate-90" aria-label="Ajouter le bot" />
                            </button>
                          ) : (
                            <button type="button" onClick={() => onPick(guild)} className={cn(rowClass, "cursor-pointer")}>
                              {highlight}
                              <ClassicAvatar guild={guild} live={live} />
                              <span className="relative min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--text-primary)]">{guild.name}</span>
                              <ChevronRight className="relative h-5 w-5 shrink-0 text-[var(--text-muted)] transition-[transform,color] duration-300 [transition-timing-function:var(--ease-snap)] group-hover:translate-x-1 group-hover:text-[var(--text-primary)]" />
                            </button>
                          )}
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}

              {totalCount > 0 && (
                <div className="flex items-center justify-between gap-3 border-t border-[var(--panel-border)] px-4 py-3">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Uniquement gérables</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={onlyManageable}
                    aria-label="Uniquement les serveurs gérables"
                    onClick={onToggleManageable}
                    className={cn(
                      "relative h-5 w-10 shrink-0 cursor-pointer rounded-sm border border-[var(--panel-border)] outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50",
                      onlyManageable ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-raised)]"
                    )}
                  >
                    <motion.span
                      className="absolute left-0.5 top-0.5 h-3.5 w-4 rounded-sm bg-white shadow"
                      initial={false}
                      animate={{ x: onlyManageable ? 18 : 0 }}
                      transition={SPRING_PILL}
                    />
                  </button>
                </div>
              )}
            </LightBorder>
          </motion.div>

          <motion.div variants={revealUp} className="mt-5 text-center">
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-sm text-xs font-semibold text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
            >
              <Plus className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90" />
              Inviter le bot sur un autre serveur
            </a>
          </motion.div>
        </motion.div>
      </div>
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
              onClick={() => setViewModeWithStorage("classic")}
              className="md:hidden flex items-center gap-1 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2 py-1 text-[10px] text-[var(--text-muted)]"
            >
              <Eye className="h-3 w-3" />
              <span>Classique</span>
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
              <span className="truncate text-xs font-bold text-[var(--text-primary)]">{currentDisplayName}</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--panel-border)] pb-4">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-primary)]">Etho</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[var(--accent-primary)] font-medium">Mes serveurs</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewModeWithStorage("classic")}
                className="flex items-center gap-1.5 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all cursor-pointer"
              >
                <Sliders className="h-3 w-3" />
                <span>Vue classique</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
                Bonjour {currentDisplayName}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">
                Gérez vos serveurs ou configurez Etho en quelques clics.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un serveur..."
                  className="w-full rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/40 transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {totalCount > 0 && (
                <div className="flex items-center gap-2 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 shrink-0">
                  <span className="text-xs text-[var(--text-muted)]">Gérables</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={onlyManageable}
                    aria-label="Uniquement les serveurs gérables"
                    onClick={onToggleManageable}
                    className={cn(
                      "relative h-5 w-10 shrink-0 cursor-pointer rounded-sm border border-[var(--panel-border)] outline-none transition-colors duration-300",
                      onlyManageable ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-raised)]"
                    )}
                  >
                    <motion.span
                      className="absolute left-0.5 top-0.5 h-3.5 w-4 rounded-sm bg-white shadow"
                      initial={false}
                      animate={{ x: onlyManageable ? 18 : 0 }}
                      transition={SPRING_PILL}
                    />
                  </button>
                </div>
              )}
            </div>

            {!isConnected && (
              <div className="rounded-sm border border-[var(--accent-primary)]/30 bg-[var(--surface-raised)] p-5 text-center space-y-3">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-sm bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                  <DiscordIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Connexion Discord requise</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Connectez votre compte Discord pour synchroniser et gérer vos serveurs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onConnect}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 rounded-sm bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 transition-all cursor-pointer"
                >
                  <DiscordIcon className="h-4 w-4" />
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
                        onClick={() => onPick(guild)}
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

              {filteredUninstalled.length === 0 && guilds.length > 0 && (
                <div className="rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] p-8 text-center text-xs text-[var(--text-muted)]">
                  {query
                    ? "Aucun serveur ne correspond à votre recherche."
                    : "Etho est déjà installé sur l'ensemble de vos serveurs !"}
                </div>
              )}

              <div className="space-y-1.5">
                {filteredUninstalled.map((guild) => (
                  <div
                    key={guild.id}
                    onClick={() => onPick(guild)}
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
                        onPick(guild);
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
