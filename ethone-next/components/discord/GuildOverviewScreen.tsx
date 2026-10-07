"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Radio,
  FileText,
} from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ToastProvider";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { useI18n } from "@/lib/hooks/useI18n";
import { SPRING_PRESS } from "@/lib/ease";
import {
  consoleCard,
  consoleFadeUp,
  consoleReveal,
  consoleStage,
} from "./consoleMotion";
import type { DiscordGuild } from "@/lib/hooks/useDiscordOAuth";

interface GuildOverviewScreenProps {
  guild: DiscordGuild;
  userName?: string;
  guildSettings?: {
    prefix?: string;
    antiRaidEnabled?: boolean;
    antiSpamEnabled?: boolean;
  };
  onToggleRaidMode?: () => void;
  moduleStatus?: Record<string, boolean>;
  activeModuleCount?: number;
  totalModuleCount?: number;
  onOpenSetup?: () => void;
  onOpenScan?: () => void;
  onSelectCategory?: (categoryId: string) => void;
  onAllModules?: () => void;
}

const CATEGORY_DEFINITIONS = [
  {
    id: "protect",
    labelKey: "dCatSecurity",
    hintKey: "dCatSecurityHint",
    defaultLabel: "Sécurité & modération",
    defaultHint: "Anti-raid, anti-spam, permissions et sauvegardes.",
    modules: ["security", "secureroles", "moderation", "automodnative", "logs", "backups"],
    href: "/discord/security",
  },
  {
    id: "community",
    labelKey: "dCatCommunity",
    hintKey: "dCatCommunityHint",
    defaultLabel: "Communauté & rôles",
    defaultHint: "Accueil des membres, attribution de rôles et sondages.",
    modules: ["welcome", "roles", "statroles", "leveling", "invites", "suggestions", "polls", "forms", "starboard", "highlights", "birthdays"],
    href: "/discord/welcome",
  },
  {
    id: "fun",
    labelKey: "dCatEntertainment",
    hintKey: "dCatEntertainmentHint",
    defaultLabel: "Animation & médias",
    defaultHint: "Musique, jeux, giveaways et événements.",
    modules: ["streamers", "games", "music", "giveaways", "economy", "counting", "events", "calendar", "voice"],
    href: "/discord/music",
  },
  {
    id: "tools",
    labelKey: "dCatDaily",
    hintKey: "dCatDailyHint",
    defaultLabel: "Outils du quotidien",
    defaultHint: "Tickets de support, commandes personnalisées et rappels.",
    modules: ["tickets", "commands", "tags", "reminders", "sticky", "afk", "serverstats"],
    href: "/discord/tickets",
  },
  {
    id: "manage",
    labelKey: "dCatManagement",
    hintKey: "dCatManagementHint",
    defaultLabel: "Gestion & intelligence",
    defaultHint: "Vue globale, paramètres du serveur et intelligence artificielle.",
    modules: ["overview", "server", "settings", "analytics", "stats", "ai", "bot"],
    href: "/discord/overview",
  },
];

function SegmentBar({ active, total }: { active: number; total: number }) {
  const safeTotal = Math.max(total, 1);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5 sm:gap-1">
        {Array.from({ length: safeTotal }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 sm:w-2 rounded-full transition-colors duration-300",
              i < active ? "bg-emerald-400" : "bg-[var(--panel-border)]"
            )}
          />
        ))}
      </div>
      <span className="ml-2 font-mono text-xs tabular-nums text-[var(--text-muted)] min-w-[2.2rem] text-right">
        {active}/{total}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-0.5" />
    </div>
  );
}

export default function GuildOverviewScreen({
  guild,
  userName: _userName = "rub19",
  guildSettings,
  onToggleRaidMode,
  moduleStatus,
  activeModuleCount,
  totalModuleCount,
  onOpenSetup,
  onOpenScan,
  onSelectCategory,
  onAllModules,
}: GuildOverviewScreenProps) {
  const router = useRouter();
  const i18n = useI18n();
  const { success, info } = useToast();
  const { reduced } = useMotionPref();

  const [raidMode, setRaidMode] = useState(false);
  const [wizardConfig, setWizardConfig] = useState<{
    activeProtectionsCount?: number;
    isConfigured?: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`ethone:discord:wizard:${guild.id}`);
      if (raw) {
        setWizardConfig(JSON.parse(raw));
      }
    } catch {}
  }, [guild.id]);

  const isRaidModeActive = guildSettings?.antiRaidEnabled ?? raidMode;

  const handleToggleRaid = useCallback(() => {
    if (onToggleRaidMode) {
      onToggleRaidMode();
      return;
    }
    setRaidMode((prev) => {
      const next = !prev;
      if (next) {
        success(
          "Mode Raid activé",
          "Protection d'urgence enclenchée sur l'ensemble du serveur."
        );
      } else {
        info("Mode Raid désactivé", "Le serveur fonctionne en mode standard.");
      }
      return next;
    });
  }, [onToggleRaidMode, success, info]);

  const categories = useMemo(
    () =>
      CATEGORY_DEFINITIONS.map((cat) => ({
        ...cat,
        label: i18n(cat.labelKey, cat.defaultLabel),
        hint: i18n(cat.hintKey, cat.defaultHint),
      })),
    [i18n]
  );

  const totalCount =
    totalModuleCount ??
    categories.reduce((acc, cat) => acc + cat.modules.length, 0);

  const activeCount =
    activeModuleCount ??
    categories.reduce(
      (acc, cat) =>
        acc + cat.modules.filter((id) => Boolean(moduleStatus?.[id])).length,
      0
    );

  const countToUse =
    wizardConfig?.isConfigured && wizardConfig.activeProtectionsCount
      ? wizardConfig.activeProtectionsCount
      : activeCount > 1
      ? activeCount
      : 1;

  const subtitleText = `${countToUse} ${i18n("dProtectionsActive", "protections actives sur 30.")}`;

  return (
    <motion.div
      variants={consoleStage}
      initial={reduced ? false : "initial"}
      animate="animate"
      className="space-y-6"
    >
      <motion.div
        variants={consoleReveal}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {i18n("dOverview", "Vue d'ensemble")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">
            {subtitleText}
          </p>
        </div>

        <motion.button
          type="button"
          onClick={onAllModules || (() => router.push(`/discord/security?guildId=${guild.id}`))}
          whileHover={reduced ? undefined : { scale: 1.03 }}
          whileTap={reduced ? undefined : { scale: 0.97 }}
          transition={SPRING_PRESS}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>{i18n("dAllProtections", "Toutes les protections >")}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </motion.button>
      </motion.div>

      <motion.div
        variants={consoleFadeUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-base">
            %
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {i18n("dBannerTitle", "Configure Etho en une minute")}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {i18n("dBannerSubtitle", "Trois questions sur ton serveur, un récapitulatif, et les bonnes protections sont en place.")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSetup || (() => router.push(`/discord/setup?guildId=${guild.id}`))}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <span>{i18n("dBannerButton", "Commencer →")}</span>
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <motion.div variants={consoleFadeUp} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                {i18n("dModuleCoverage", "Couverture des modules")}
              </h2>
              <span className="font-mono text-xs tabular-nums text-[var(--text-muted)] font-semibold">
                {activeCount}/{totalCount}
              </span>
            </div>

            <div className="space-y-1 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] divide-y divide-[var(--panel-border)] overflow-hidden">
              {categories.map((cat) => {
                const categoryActive = cat.modules.filter((id) =>
                  Boolean(moduleStatus?.[id])
                ).length;
                const categoryTotal = cat.modules.length;

                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      if (onSelectCategory) {
                        onSelectCategory(cat.id);
                      } else if (onAllModules) {
                        onAllModules();
                      } else {
                        router.push(`${cat.href}?guildId=${guild.id}`);
                      }
                    }}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                        {cat.label}
                      </h4>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)] leading-relaxed">
                        {cat.hint}
                      </p>
                    </div>

                    <div className="shrink-0 self-end sm:self-auto">
                      <SegmentBar active={categoryActive} total={categoryTotal} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <motion.div
            variants={consoleCard}
            className="rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] p-4 space-y-4 shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {i18n("dRaidMode", "Mode raid")}
                  </h3>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isRaidModeActive}
                  aria-label={i18n("dRaidMode", "Mode raid")}
                  onClick={handleToggleRaid}
                  className={cn(
                    "relative h-5 w-10 shrink-0 cursor-pointer rounded-sm border border-[var(--panel-border)] outline-none transition-colors duration-300",
                    isRaidModeActive ? "bg-emerald-500" : "bg-[var(--surface-raised)]"
                  )}
                >
                  <motion.span
                    className="absolute left-0.5 top-0.5 h-3.5 w-4 rounded-sm bg-white shadow"
                    initial={false}
                    animate={{ x: isRaidModeActive ? 18 : 0 }}
                    transition={SPRING_PRESS}
                  />
                </button>
              </div>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {isRaidModeActive
                  ? i18n("dRaidModeActive", "Actif. Le serveur bloque temporairement les arrivées suspectes.")
                  : i18n("dRaidModeInactive", "Inactif. Etho active tout seul s'il détecte une attaque.")}
              </p>
            </div>

            <div className="pt-3 border-t border-[var(--panel-border)] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">{i18n("dPrefix", "Préfixe")}</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">
                  {guildSettings?.prefix || "!"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">{i18n("dYourAccess", "Ton accès")}</span>
                <span className="font-semibold text-amber-400">
                  {guild.owner ? i18n("dOwner", "👑 Propriétaire") : i18n("dAdmin", "Administrateur")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">{i18n("dSecurityScan", "Scan de sécurité")}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenScan) {
                      onOpenScan();
                    } else {
                      router.push(`/discord?guildId=${guild.id}&view=scan`);
                    }
                  }}
                  className="font-semibold text-emerald-400 hover:underline cursor-pointer"
                >
                  {i18n("dRunScan", "Lancer un scan →")}
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={consoleCard}
            className="rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] p-4 space-y-3 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {i18n("dRecentActivity", "Activité récente")}
              </h3>
              <button
                type="button"
                onClick={() => router.push(`/discord/logs?guildId=${guild.id}`)}
                className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {i18n("dLogs", "Logs")}
              </button>
            </div>

            <div className="py-8 text-center space-y-2">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--panel-border)] bg-[var(--panel-border)]/20 text-[var(--text-muted)]">
                <FileText className="h-4 w-4" />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {i18n("dNoIncidents", "Aucun incident récent. Etho veille.")}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
