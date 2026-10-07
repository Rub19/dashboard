"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  AlertTriangle,
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
  onOpenSetup?: () => void;
}

interface CoverageItem {
  id: string;
  title: string;
  description: string;
  active: number;
  total: number;
  href: string;
}

const DEFAULT_COVERAGE: CoverageItem[] = [
  {
    id: "bans",
    title: "Sanctions en série",
    description: "Mute, expulsions et bannissements en masse par un même membre du staff.",
    active: 0,
    total: 3,
    href: "/discord/security/anti-nuke",
  },
  {
    id: "channels",
    title: "Salons",
    description: "Création, suppression et modification de salons.",
    active: 0,
    total: 3,
    href: "/discord/server/channels",
  },
  {
    id: "roles",
    title: "Rôles et permissions",
    description: "Rôles créés, supprimés, modifiés ou distribués.",
    active: 0,
    total: 6,
    href: "/discord/server/roles",
  },
  {
    id: "integrations",
    title: "Bots et intégrations",
    description: "Bots invités, webhooks et flux de discussion.",
    active: 0,
    total: 4,
    href: "/discord/bot/integrations",
  },
  {
    id: "voice",
    title: "Vocal",
    description: "Mutes, sourdines, déconnexions et déplacements forcés.",
    active: 0,
    total: 4,
    href: "/discord/voice",
  },
  {
    id: "server",
    title: "Serveur",
    description: "Nom, icône, emojis et réglages généraux.",
    active: 0,
    total: 1,
    href: "/discord/server/settings",
  },
  {
    id: "messages",
    title: "Messages",
    description: "Spam, liens, mentions, mots interdits et arnaques.",
    active: 1,
    total: 8,
    href: "/discord/moderation/automod",
  },
  {
    id: "joins",
    title: "Arrivées",
    description: "Comptes suspects qui rejoignent le serveur.",
    active: 0,
    total: 1,
    href: "/discord/welcome",
  },
];

function SegmentBar({ active, total }: { active: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5 sm:gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-2 sm:w-2.5 rounded-full transition-colors duration-300",
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
  onOpenSetup,
}: GuildOverviewScreenProps) {
  const router = useRouter();
  const { success, info } = useToast();
  const { reduced } = useMotionPref();

  const [raidMode, setRaidMode] = useState(false);
  const [antiNukeActive, setAntiNukeActive] = useState(false);
  const [rolePositionFixed, _setRolePositionFixed] = useState(false);
  const [logChannelSet, _setLogChannelSet] = useState(false);
  const [scanning, setScanning] = useState(false);

  const activeProtectionsCount = antiNukeActive ? 7 : 1;
  const issuesToFixCount =
    (rolePositionFixed ? 0 : 1) +
    (antiNukeActive ? 0 : 1) +
    (logChannelSet ? 0 : 1);

  const handleToggleRaidMode = useCallback(() => {
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
  }, [success, info]);

  const handleActivateAllAntiNuke = useCallback(() => {
    setAntiNukeActive(true);
    success(
      "Protections activées",
      "Anti-ban, Anti-kick, Anti-suppression et Anti-webhook sont désormais actifs."
    );
  }, [success]);

  const handleDiscordRoleHelp = useCallback(() => {
    info(
      "Hiérarchie des rôles",
      "Allez dans Paramètres du serveur > Rôles, puis glissez le rôle Etho au-dessus des autres rôles pour lui conférer la priorité."
    );
  }, [info]);

  const handleChooseLogChannel = useCallback(() => {
    router.push(`/discord/logs?guildId=${guild.id}`);
  }, [router, guild.id]);

  const handleStartScan = useCallback(() => {
    if (scanning) return;
    setScanning(true);
    info("Scan en cours...", "Analyse des rôles sensibles et permissions du serveur.");
    setTimeout(() => {
      setScanning(false);
      success("Scan terminé", "18 rôles sensibles analysés. Aucune vulnérabilité critique.");
    }, 1200);
  }, [scanning, info, success]);

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
            {activeProtectionsCount} protection active sur 30, {issuesToFixCount} points à régler
          </p>
        </div>

        <motion.button
          type="button"
          onClick={() => router.push(`/discord/security?guildId=${guild.id}`)}
          whileHover={reduced ? undefined : { scale: 1.03 }}
          whileTap={reduced ? undefined : { scale: 0.97 }}
          transition={SPRING_PRESS}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>Toutes les protections</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </motion.button>
      </motion.div>

      <motion.div
        variants={consoleCard}
        className="rounded-sm border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-[var(--surface-raised)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-sm">
            %
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Configure Etho en une minute
            </h3>
            <p className="mt-0.5 text-xs text-zinc-300 leading-relaxed">
              Trois questions sur ton serveur, un récapitulatif, et les bonnes protections sont en place.
            </p>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={onOpenSetup || (() => router.push(`/discord/setup?guildId=${guild.id}`))}
          whileHover={reduced ? undefined : { scale: 1.03 }}
          whileTap={reduced ? undefined : { scale: 0.97 }}
          transition={SPRING_PRESS}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 transition-all shadow-md cursor-pointer self-start sm:self-auto"
        >
          <span>Commencer</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <motion.div variants={consoleFadeUp} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                À régler
              </h2>
              <span className="rounded-sm bg-[var(--surface-raised)] border border-[var(--panel-border)] px-2 py-0.5 text-xs font-mono font-semibold text-[var(--text-muted)]">
                {issuesToFixCount}
              </span>
            </div>

            <div className="space-y-2">
              {!rolePositionFixed && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-sm border border-red-500/30 bg-red-950/15 p-3.5 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        Le rôle d&apos;Etho n&apos;est pas tout en haut
                      </h4>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)] leading-relaxed">
                        Dans Paramètres du serveur, puis Rôles, glisse le rôle Etho au-dessus de tous les autres. Sinon il ne pourra ni sanctionner ni restaurer.
                      </p>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleDiscordRoleHelp}
                    whileHover={reduced ? undefined : { scale: 1.04 }}
                    whileTap={reduced ? undefined : { scale: 0.96 }}
                    transition={SPRING_PRESS}
                    className="inline-flex shrink-0 items-center justify-center rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <span>Aide Discord</span>
                  </motion.button>
                </div>
              )}

              {!antiNukeActive && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-sm border border-amber-500/30 bg-amber-950/15 p-3.5 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        6 protections anti-nuke désactivées
                      </h4>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)] leading-relaxed">
                        Anti-ban, Anti-kick, Anti-suppression de salon, Anti-suppression de rôle, Anti-bot, Anti-webhook
                      </p>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleActivateAllAntiNuke}
                    whileHover={reduced ? undefined : { scale: 1.04 }}
                    whileTap={reduced ? undefined : { scale: 0.96 }}
                    transition={SPRING_PRESS}
                    className="inline-flex shrink-0 items-center justify-center rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <span>+ Tout activer</span>
                  </motion.button>
                </div>
              )}

              {!logChannelSet && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-sm border border-amber-500/30 bg-amber-950/15 p-3.5 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        1 protection active sans salon de log
                      </h4>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)] leading-relaxed">
                        Elles agissent, mais personne n&apos;est prévenu sur Discord.
                      </p>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleChooseLogChannel}
                    whileHover={reduced ? undefined : { scale: 1.04 }}
                    whileTap={reduced ? undefined : { scale: 0.96 }}
                    transition={SPRING_PRESS}
                    className="inline-flex shrink-0 items-center justify-center rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <span>Choisir un salon</span>
                  </motion.button>
                </div>
              )}

              {issuesToFixCount === 0 && (
                <div className="rounded-sm border border-emerald-500/30 bg-emerald-950/10 p-4 text-center text-xs text-emerald-400 font-medium">
                  Toutes les recommandations sont appliquées. Votre serveur est sécurisé.
                </div>
              )}
            </div>
          </motion.div>

          <motion.div variants={consoleFadeUp} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Couverture
              </h2>
              <span className="font-mono text-xs tabular-nums text-[var(--text-muted)] font-semibold">
                {activeProtectionsCount}/30
              </span>
            </div>

            <div className="space-y-1 rounded-sm border border-[var(--panel-border)] bg-[var(--surface-raised)] divide-y divide-[var(--panel-border)] overflow-hidden">
              {DEFAULT_COVERAGE.map((item) => {
                const currentActive =
                  item.id === "bans" && antiNukeActive
                    ? 3
                    : item.id === "messages"
                    ? 1
                    : item.active;

                return (
                  <div
                    key={item.id}
                    onClick={() => router.push(`${item.href}?guildId=${guild.id}`)}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                        {item.title}
                      </h4>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)] leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="shrink-0 self-end sm:self-auto">
                      <SegmentBar active={currentActive} total={item.total} />
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
                  aria-checked={raidMode}
                  aria-label="Activer ou désactiver le mode raid"
                  onClick={handleToggleRaidMode}
                  className={cn(
                    "relative h-5 w-10 shrink-0 cursor-pointer rounded-sm border border-[var(--panel-border)] outline-none transition-colors duration-300",
                    raidMode ? "bg-emerald-500" : "bg-[var(--surface-raised)]"
                  )}
                >
                  <motion.span
                    className="absolute left-0.5 top-0.5 h-3.5 w-4 rounded-sm bg-white shadow"
                    initial={false}
                    animate={{ x: raidMode ? 18 : 0 }}
                    transition={SPRING_PRESS}
                  />
                </button>
              </div>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {raidMode
                  ? "Actif. Le serveur bloque temporairement les arrivées suspectes."
                  : "Inactif. Etho active tout seul s'il détecte une attaque."}
              </p>
            </div>

            <div className="pt-3 border-t border-[var(--panel-border)] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Préfixe</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">+</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Ton accès</span>
                <span className="font-semibold text-amber-400">👑 Propriétaire</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Scan de sécurité</span>
                <button
                  type="button"
                  onClick={handleStartScan}
                  disabled={scanning}
                  className="font-semibold text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  {scanning ? "Scan en cours..." : "Lancer un scan →"}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Rôles sensibles</span>
                <span className="font-mono font-bold text-red-400">18</span>
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
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-sm bg-[var(--panel-border)]/50 text-[var(--text-muted)]">
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
