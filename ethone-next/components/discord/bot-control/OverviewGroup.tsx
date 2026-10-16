"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  Cpu,
  Server,
  Layers,
  Search,
  ArrowRight,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Scroll,
  Award,
  Ticket,
  Gamepad2,
  Music,
  Bot,
  Coins,
  Calendar,
  FileText,
  Star,
  Bell,
  Headphones,
  Terminal,
  Tag,
  Clock,
  Pin,
  Moon,
  BarChart3,
  Lock,
  Sliders,
  Archive,
  Tv,
  X,
  ListRestart,
} from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/Card";
import type { BotTab } from "@/app/discord/bot/BotControlClient";
import { SPRING_PILL } from "@/lib/ease";
import { pageStagger, staggerItem } from "@/lib/motion-variants";
import { tx } from "@/lib/tx";

interface OverviewGroupProps {
  activeTab: BotTab;
  handleTabChange: (tab: BotTab) => void;
  currentCfg: { label: string; dot: string; border: string; text: string };
  botCore: any;
  subsystems: any[];
  subsystemStatusConfig: Record<string, { label: string; dot: string; text: string }>;
  servers: any[];
  modules: any[];
  settingsGuildId: string;
  setSettingsGuildId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  modulesLoading: boolean;
  modulesError: string | null;
  loadModules: () => void;
  filteredModules: any[];
  MODULE_ICONS: Record<string, any>;
  togglingModuleId: string | null;
  handleToggleModule: (moduleId: string, nextEnabled: boolean) => void;
}

const CATEGORY_MAP: Record<string, string> = {
  security: "Sécurité & Anti-Raid",
  "anti-nuke": "Sécurité & Anti-Raid",
  automod: "Sécurité & Anti-Raid",
  moderation: "Modération & Sanctions",
  logs: "Modération & Sanctions",
  welcome: "Engagement & Communauté",
  roles: "Engagement & Communauté",
  leveling: "Engagement & Communauté",
  economy: "Engagement & Communauté",
  suggestions: "Engagement & Communauté",
  polls: "Engagement & Communauté",
  giveaways: "Engagement & Communauté",
  events: "Engagement & Communauté",
  forms: "Engagement & Communauté",
  invites: "Engagement & Communauté",
  starboard: "Engagement & Communauté",
  highlights: "Engagement & Communauté",
  birthdays: "Engagement & Communauté",
  games: "Engagement & Communauté",
  music: "Audio & Multimédia",
  voice: "Audio & Multimédia",
  streamers: "Audio & Multimédia",
  tickets: "Outils & Utilitaires",
  "custom-commands": "Outils & Utilitaires",
  tags: "Outils & Utilitaires",
  reminders: "Outils & Utilitaires",
  sticky: "Outils & Utilitaires",
  afk: "Outils & Utilitaires",
  counting: "Outils & Utilitaires",
  stats: "Outils & Utilitaires",
  reports: "Modération & Sanctions",
  secureroles: "Sécurité & Anti-Raid",
  statroles: "Outils & Utilitaires",
  "server-stats": "Outils & Utilitaires",
  ai: "Outils & Utilitaires",
  backups: "Sécurité & Anti-Raid",
};

const MODULE_CUSTOM_ICONS: Record<string, any> = {
  security: ShieldAlert,
  "anti-nuke": Shield,
  automod: Bot,
  moderation: ShieldCheck,
  logs: Scroll,
  welcome: UserPlus,
  roles: Award,
  leveling: Sparkles,
  economy: Coins,
  suggestions: FileText,
  polls: BarChart3,
  giveaways: Sparkles,
  events: Calendar,
  forms: FileText,
  invites: UserPlus,
  starboard: Star,
  highlights: Bell,
  birthdays: Calendar,
  music: Music,
  voice: Headphones,
  tickets: Ticket,
  "custom-commands": Terminal,
  tags: Tag,
  reminders: Clock,
  sticky: Pin,
  afk: Moon,
  counting: BarChart3,
  stats: BarChart3,
  reports: ShieldAlert,
  secureroles: Lock,
  statroles: Sliders,
  "server-stats": BarChart3,
  ai: Bot,
  backups: Archive,
  streamers: Tv,
  games: Gamepad2,
};

type ModuleCategoryFilter = "ALL" | "SECURITY" | "MODERATION" | "COMMUNITY" | "AUDIO" | "TOOLS";

export default function OverviewGroup({
  activeTab,
  handleTabChange,
  currentCfg,
  botCore,
  subsystems,
  subsystemStatusConfig,
  servers,
  modules,
  settingsGuildId,
  setSettingsGuildId,
  searchQuery,
  setSearchQuery,
  modulesLoading,
  modulesError,
  loadModules,
  filteredModules,
  togglingModuleId,
  handleToggleModule,
}: OverviewGroupProps) {
  const [categoryFilter, setCategoryFilter] = useState<ModuleCategoryFilter>("ALL");

  const displayedModules = useMemo(() => {
    return filteredModules.filter((m) => {
      if (categoryFilter === "ALL") return true;
      const cat = CATEGORY_MAP[m.id] || "Outils & Utilitaires";
      if (categoryFilter === "SECURITY") return cat === "Sécurité & Anti-Raid";
      if (categoryFilter === "MODERATION") return cat === "Modération & Sanctions";
      if (categoryFilter === "COMMUNITY") return cat === "Engagement & Communauté";
      if (categoryFilter === "AUDIO") return cat === "Audio & Multimédia";
      if (categoryFilter === "TOOLS") return cat === "Outils & Utilitaires";
      return true;
    });
  }, [filteredModules, categoryFilter]);

  const enabledCount = useMemo(() => {
    return modules.filter((m) => m.enabled).length;
  }, [modules]);

  const isOverview = activeTab === "overview";
  const isModulesTab = activeTab === "modules";

  return (
    <>
      {(isOverview || isModulesTab) && (
        <div className="space-y-6 sm:space-y-8">
          {isOverview && (
            <motion.div
              variants={pageStagger}
              initial="initial"
              animate="animate"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <motion.div variants={staggerItem}>
                  <Card
                    variant="default"
                    padding="none"
                    className="p-5 sm:p-6 space-y-4 hover:border-[var(--accent-primary)]/40 transition-all shadow-sm flex flex-col justify-between h-full group"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]">
                        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
                          {tx("Présence en Direct")}
                        </h3>
                        <Link
                          href="/discord/bot/presence"
                          className="text-xs text-[var(--accent-primary)] hover:underline font-semibold flex items-center gap-1 transition-all"
                        >
                          <span>{tx("Gérer")}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <div className="pt-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={botCore?.avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png"}
                              alt={botCore?.name || tx("Etho")}
                              className="w-12 h-12 rounded-2xl border border-[var(--panel-border)] object-cover bg-[var(--surface-raised)]"
                              onError={(e) => {
                                (e.target as any).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                              }}
                            />
                            <span
                              className={cn(
                                "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--bg-main)]",
                                currentCfg.dot
                              )}
                            />
                          </div>

                          <div className="min-w-0">
                            <span className="text-sm font-bold text-[var(--text-primary)] block truncate">
                              {botCore?.name || tx("Etho")}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] font-mono block">
                              {currentCfg.label} {" "}{tx("• Shard 0")}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                            <span>{tx("Activité en cours")}</span>
                            <span className="px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 font-mono text-[10px]">
                              {tx("WebSocket")}
                            </span>
                          </div>
                          {botCore?.activity ? (
                            <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                              <span className="text-[var(--accent-primary)] font-semibold uppercase text-[10px] mr-1.5">
                                {botCore.activity.type || tx("Playing")}
                              </span>
                              {botCore.activity.name || tx("Actif")}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)] italic">
                              {tx("Aucune activité définie")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--panel-border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{tx("Portée : Globale sur Gateway")}</span>
                      <Link
                        href="/discord/bot/presence"
                        className="text-[var(--accent-primary)] hover:underline font-medium"
                      >
                        {tx("Mode Streamer 🟣")}
                      </Link>
                    </div>
                  </Card>
                </motion.div>

                <motion.div variants={staggerItem}>
                  <Card
                    variant="default"
                    padding="none"
                    className="p-5 sm:p-6 space-y-4 hover:border-[var(--accent-primary)]/40 transition-all shadow-sm flex flex-col justify-between h-full group"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]">
                        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-[var(--accent-primary)]" />
                          {tx("Sous-Systèmes")}
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleTabChange("health")}
                          className="text-xs text-[var(--accent-primary)] hover:underline font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>{tx("Détails")}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="pt-4 space-y-2">
                        {subsystems.slice(0, 3).map((s) => {
                          const cfg = subsystemStatusConfig[s.status] || subsystemStatusConfig.operational;
                          return (
                            <div
                              key={s.id}
                              className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] flex items-center justify-between text-xs"
                            >
                              <span className="text-[var(--text-primary)] font-medium">{s.name}</span>
                              <span className={cn("font-mono font-bold flex items-center gap-1.5", cfg.text)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                                {cfg.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--panel-border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{tx("Latence :")}{" "} {botCore?.pingMs !== undefined && botCore?.pingMs !== null ? tx("{pingMs}ms", { pingMs: botCore.pingMs }) : "—"}</span>
                      <button
                        type="button"
                        onClick={() => handleTabChange("diagnostics")}
                        className="text-[var(--accent-primary)] hover:underline font-medium cursor-pointer"
                      >
                        {tx("Diagnostics 1-Clic")}
                      </button>
                    </div>
                  </Card>
                </motion.div>

                <motion.div variants={staggerItem}>
                  <Card
                    variant="default"
                    padding="none"
                    className="p-5 sm:p-6 space-y-4 hover:border-[var(--accent-primary)]/40 transition-all shadow-sm flex flex-col justify-between h-full group"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]">
                        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                          <Server className="w-4 h-4 text-[var(--accent-primary)]" />
                          {tx("Serveurs Actifs")}
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleTabChange("servers")}
                          className="text-xs text-[var(--accent-primary)] hover:underline font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>{tx("Explorer (")}{servers.length})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="pt-4 space-y-2">
                        {servers.slice(0, 3).map((g) => (
                          <div
                            key={g.id}
                            className="px-3.5 py-2 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-[var(--surface-raised)] border border-[var(--panel-border)] flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)] overflow-hidden shrink-0">
                                {g.icon ? (
                                  <img src={g.icon} alt={g.name} className="w-full h-full object-cover" />
                                ) : (
                                  g.name?.charAt(0) || "?"
                                )}
                              </div>
                              <span className="text-[var(--text-primary)] font-medium truncate max-w-[130px]">
                                {g.name}
                              </span>
                            </div>
                            <span className="text-[var(--text-muted)] font-mono text-[11px] shrink-0">
                              {g.memberCount} {" "}{tx("membres")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--panel-border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{tx("Total :")}{" "} {botCore?.userCount !== undefined && botCore?.userCount !== null ? Number(botCore.userCount).toLocaleString("fr-FR") : "—"} {" "}{tx("membres")}</span>
                      <span className="text-[var(--text-muted)] font-medium">{servers.length} {" "}{tx("serveur")}{servers.length > 1 ? "s" : ""}</span>
                    </div>
                  </Card>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/discord/bot/commands"
                  className="p-4 rounded-2xl bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-raised)] border border-[var(--panel-border)] hover:border-[var(--accent-primary)]/40 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                        {tx("Catalogue des Commandes")}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {tx("40 commandes Slash & simulateur Keeper")}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors shrink-0" />
                </Link>

                <Link
                  href="/discord/bot/jobs"
                  className="p-4 rounded-2xl bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-raised)] border border-[var(--panel-border)] hover:border-[var(--accent-primary)]/40 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                      <ListRestart className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                        {tx("Tâches Planifiées & Cron")}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {tx("15 jobs récurrents, files & déclencheur")}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors shrink-0" />
                </Link>

                <Link
                  href="/discord/bot/presence"
                  className="p-4 rounded-2xl bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-raised)] border border-[var(--panel-border)] hover:border-[var(--accent-primary)]/40 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                        {tx("Présence & Mode Streamer")}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {tx("Bascule 1-clic Streamer Twitch, DND, Invi")}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors shrink-0" />
                </Link>
              </div>
            </motion.div>
          )}

          <Card
            variant="default"
            padding="none"
            className="p-5 sm:p-6 space-y-5 hover:border-[var(--panel-border)] transition-all shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--panel-border)]">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[var(--accent-primary)]" />
                    {tx("Modules du Bot Discord (")}{modules.length})
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                    {enabledCount} / {modules.length} {" "}{tx("actifs")}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {tx("Activation et désactivation en temps réel par serveur, synchronisées avec la commande")}{" "}
                  <code className="text-[var(--text-primary)] font-mono">{tx("/module")}</code>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={settingsGuildId}
                  onChange={(e) => setSettingsGuildId(e.target.value)}
                  disabled={servers.length === 0}
                  aria-label={tx("Sélectionner un serveur Discord")}
                  className="px-3 py-1.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] disabled:opacity-50 cursor-pointer"
                >
                  {servers.length === 0 && <option value="">{tx("Aucun serveur détecté")}</option>}
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder={tx("Filtrer un module... (Appuyez sur '/')")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] w-52 sm:w-60"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-xs overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setCategoryFilter("ALL")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer relative",
                  categoryFilter === "ALL"
                    ? "text-[var(--accent-contrast)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {categoryFilter === "ALL" && (
                  <motion.span
                    layoutId="mod-cat-pill"
                    transition={SPRING_PILL}
                    className="absolute inset-0 rounded-lg bg-[var(--accent-primary)] -z-0"
                  />
                )}
                <span className="relative z-10">{tx("Tous (")}{modules.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter("SECURITY")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer relative",
                  categoryFilter === "SECURITY"
                    ? "text-[var(--accent-contrast)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {categoryFilter === "SECURITY" && (
                  <motion.span
                    layoutId="mod-cat-pill"
                    transition={SPRING_PILL}
                    className="absolute inset-0 rounded-lg bg-[var(--accent-primary)] -z-0"
                  />
                )}
                <span className="relative z-10">{tx("Sécurité & Anti-Raid")}</span>
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter("MODERATION")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer relative",
                  categoryFilter === "MODERATION"
                    ? "text-[var(--accent-contrast)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {categoryFilter === "MODERATION" && (
                  <motion.span
                    layoutId="mod-cat-pill"
                    transition={SPRING_PILL}
                    className="absolute inset-0 rounded-lg bg-[var(--accent-primary)] -z-0"
                  />
                )}
                <span className="relative z-10">{tx("Modération")}</span>
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter("COMMUNITY")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer relative",
                  categoryFilter === "COMMUNITY"
                    ? "text-[var(--accent-contrast)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {categoryFilter === "COMMUNITY" && (
                  <motion.span
                    layoutId="mod-cat-pill"
                    transition={SPRING_PILL}
                    className="absolute inset-0 rounded-lg bg-[var(--accent-primary)] -z-0"
                  />
                )}
                <span className="relative z-10">{tx("Engagement & Fun")}</span>
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter("AUDIO")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer relative",
                  categoryFilter === "AUDIO"
                    ? "text-[var(--accent-contrast)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {categoryFilter === "AUDIO" && (
                  <motion.span
                    layoutId="mod-cat-pill"
                    transition={SPRING_PILL}
                    className="absolute inset-0 rounded-lg bg-[var(--accent-primary)] -z-0"
                  />
                )}
                <span className="relative z-10">{tx("Audio & Musique")}</span>
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter("TOOLS")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer relative",
                  categoryFilter === "TOOLS"
                    ? "text-[var(--accent-contrast)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {categoryFilter === "TOOLS" && (
                  <motion.span
                    layoutId="mod-cat-pill"
                    transition={SPRING_PILL}
                    className="absolute inset-0 rounded-lg bg-[var(--accent-primary)] -z-0"
                  />
                )}
                <span className="relative z-10">{tx("Outils & Stats")}</span>
              </button>
            </div>

            {!settingsGuildId ? (
              <p className="text-xs text-[var(--text-muted)] italic pt-2">
                {tx("Sélectionne un serveur pour voir ses modules.")}
              </p>
            ) : modulesLoading && modules.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] h-24 animate-pulse"
                  />
                ))}
              </div>
            ) : modulesError ? (
              <div className="mt-2 flex flex-col items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-xs text-red-300">
                <span className="font-medium">{modulesError}</span>
                <button
                  onClick={() => loadModules()}
                  className="rounded-lg border border-red-500/30 px-2.5 py-1 font-semibold transition-all hover:bg-red-500/15 cursor-pointer active:scale-[0.97]"
                >
                  {tx("Réessayer")}
                </button>
              </div>
            ) : displayedModules.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[var(--surface-raised)]/30 border border-[var(--panel-border)] text-xs text-[var(--text-muted)] space-y-2">
                <p>{tx("Aucun module ne correspond aux critères de filtre sélectionnés.")}</p>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("ALL");
                    setSearchQuery("");
                  }}
                  className="text-[var(--accent-primary)] hover:underline font-semibold cursor-pointer"
                >
                  {tx("Réinitialiser les filtres")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {displayedModules.map((m) => {
                  const ModIcon = MODULE_CUSTOM_ICONS[m.id] || Layers;
                  const disabled = m.available === false || togglingModuleId === m.id;
                  const categoryTag = CATEGORY_MAP[m.id] || "Général";

                  return (
                    <motion.div
                      key={m.id}
                      whileHover={{ y: -2, transition: { duration: 0.15 } }}
                      className={cn(
                        "p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 group relative shadow-sm",
                        m.enabled
                          ? "bg-[var(--surface-raised)]/70 hover:bg-[var(--surface-raised)] border-[var(--panel-border)] hover:border-[var(--accent-primary)]/40"
                          : "bg-[var(--surface-raised)]/30 hover:bg-[var(--surface-raised)]/50 border-[var(--panel-border)]/60 opacity-80 hover:opacity-100"
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                                m.enabled
                                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                  : "bg-[var(--surface-raised)] border-[var(--panel-border)] text-[var(--text-muted)]"
                              )}
                            >
                              <ModIcon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {m.name}
                            </span>
                          </div>

                          {m.available === false ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--surface-base)] text-[var(--text-muted)] border border-[var(--panel-border)] shrink-0">
                              {tx("Bientôt disponible")}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleModule(m.id, !m.enabled)}
                              disabled={disabled}
                              title={m.enabled ? tx("Désactiver ce module") : tx("Activer ce module")}
                              className={cn(
                                "w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 disabled:opacity-50 cursor-pointer shadow-inner",
                                m.enabled ? "bg-emerald-500 shadow-emerald-500/20" : "bg-[var(--surface-raised)] border border-[var(--panel-border)]"
                              )}
                            >
                              <motion.span
                                layout
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className={cn(
                                  "block w-4.5 h-4.5 rounded-full bg-white transition-transform shadow-md",
                                  m.enabled ? "translate-x-4.5" : "translate-x-0"
                                )}
                              />
                            </button>
                          )}
                        </div>

                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                          {m.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[var(--panel-border)]/50 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                        <span className="font-mono">{categoryTag}</span>
                        {m.enabled && (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {tx("Actif")}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "presence" && (
        <Card variant="default" padding="none" className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{tx("Centre de Présence Dédié")}</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto mt-1">
              {tx("Gère la présence globale, le mode streamer Twitch en 1 clic, le mode Ne Pas Déranger, le mode invisible et la rotation des activités.")}
            </p>
          </div>
          <Link
            href="/discord/bot/presence"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-semibold text-xs transition-all shadow-md active:scale-[0.97]"
          >
            <span>{tx("Ouvrir la Console de Présence")}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>
      )}
    </>
  );
}
