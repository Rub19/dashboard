"use client";

import { useState, useCallback } from "react";
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
  onSelectCategory?: (categoryId: string) => void;
  onAllModules?: () => void;
}

const DEFAULT_CATEGORIES = [
  {
    id: "protect",
    label: "Sécurité & modération",
    hint: "Anti-raid, anti-spam, permissions et sauvegardes.",
    modules: ["security", "secureroles", "moderation", "automodnative", "logs", "backups"],
    href: "/discord/security",
  },
  {
    id: "community",
    label: "Communauté & rôles",
    hint: "Accueil des membres, attribution de rôles et sondages.",
    modules: ["welcome", "roles", "statroles", "leveling", "invites", "suggestions", "polls", "forms", "starboard", "highlights", "birthdays"],
    href: "/discord/welcome",
  },
  {
    id: "fun",
    label: "Animation & médias",
    hint: "Musique, jeux, giveaways et événements.",
    modules: ["streamers", "games", "music", "giveaways", "economy", "counting", "events", "calendar", "voice"],
    href: "/discord/music",
  },
  {
    id: "tools",
    label: "Outils du quotidien",
    hint: "Tickets de support, commandes personnalisées et rappels.",
    modules: ["tickets", "commands", "tags", "reminders", "sticky", "afk", "serverstats"],
    href: "/discord/tickets",
  },
  {
    id: "manage",
    label: "Gestion & intelligence",
    hint: "Vue globale, paramètres du serveur et intelligence artificielle.",
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
              i < active ? "bg-emerald-400" : "bg-zinc-700/60"
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
  onOpenSetup: _onOpenSetup,
  onSelectCategory,
  onAllModules,
}: GuildOverviewScreenProps) {
  const router = useRouter();
  const { success, info } = useToast();
  const { reduced } = useMotionPref();

  const [raidMode, setRaidMode] = useState(false);

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

  const totalCount =
    totalModuleCount ??
    DEFAULT_CATEGORIES.reduce((acc, cat) => acc + cat.modules.length, 0);

  const activeCount =
    activeModuleCount ??
    DEFAULT_CATEGORIES.reduce(
      (acc, cat) =>
        acc + cat.modules.filter((id) => Boolean(moduleStatus?.[id])).length,
      0
    );

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
            Vue d&apos;ensemble
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">
            {activeCount} {activeCount > 1 ? "modules actifs" : "module actif"} sur {totalCount}
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
          <span>Tous les modules</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <motion.div variants={consoleFadeUp} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Couverture des modules
              </h2>
              <span className="font-mono text-xs tabular-nums text-[var(--text-muted)] font-semibold">
                {activeCount}/{totalCount}
              </span>
            </div>

            <div className="space-y-1 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] divide-y divide-[var(--panel-border)] overflow-hidden">
              {DEFAULT_CATEGORIES.map((cat) => {
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
                    Mode raid
                  </h3>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isRaidModeActive}
                  aria-label="Activer ou désactiver le mode raid"
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
                  ? "Actif. Le serveur bloque temporairement les arrivées suspectes."
                  : "Inactif. Etho active tout seul s'il détecte une attaque."}
              </p>
            </div>

            <div className="pt-3 border-t border-[var(--panel-border)] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Préfixe</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">
                  {guildSettings?.prefix || "!"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Ton accès</span>
                <span className="font-semibold text-amber-400">
                  {guild.owner ? "👑 Propriétaire" : "Administrateur"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Scan de sécurité</span>
                <button
                  type="button"
                  onClick={() => router.push(`/discord/server/health?guildId=${guild.id}`)}
                  className="font-semibold text-emerald-400 hover:underline cursor-pointer"
                >
                  Lancer un scan →
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
                Activité récente
              </h3>
              <button
                type="button"
                onClick={() => router.push(`/discord/logs?guildId=${guild.id}`)}
                className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Logs
              </button>
            </div>

            <div className="py-8 text-center space-y-2">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--panel-border)] bg-[var(--panel-border)]/20 text-[var(--text-muted)]">
                <FileText className="h-4 w-4" />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Aucun incident récent. Etho veille.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
