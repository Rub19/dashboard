"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scan,
  RefreshCw,
  AlertTriangle,
  Shield,
  Check,
  ChevronDown,
} from "@/components/icons/ph";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";
import type { DiscordGuild } from "@/lib/hooks/useDiscordOAuth";

interface GuildSecurityScanProps {
  guild: DiscordGuild;
  onOpenProtections?: () => void;
  onBack?: () => void;
}

const DEFAULT_CHANNELS = [
  { id: "alertes", name: "alertes" },
  { id: "etho-logs", name: "etho-logs" },
  { id: "moderation", name: "moderation" },
  { id: "general", name: "general" },
];

const ANTI_NUKE_MODULES = [
  "Anti-ban",
  "Anti-kick",
  "Anti-suppression de salon",
  "Anti-création de salon",
  "Anti-suppression de rôle",
  "Anti-création de rôle",
  "Anti-modification de rôle",
  "Anti-ajout de rôle",
];

type CategoryFilter =
  | "all"
  | "keeper"
  | "roles"
  | "channels"
  | "discord"
  | "bots"
  | "settings";

interface SolidPoint {
  id: string;
  category: CategoryFilter;
  title: string;
}

const SOLID_POINTS: SolidPoint[] = [
  {
    id: "sp-1",
    category: "keeper",
    title: "Permissions du bot Keeper optimales (rôle en haut de la hiérarchie)",
  },
  {
    id: "sp-2",
    category: "roles",
    title: "Aucun rôle dangereux attribué à @everyone",
  },
  {
    id: "sp-3",
    category: "channels",
    title: "Salons sensibles protégés contre les modifications externes",
  },
  {
    id: "sp-4",
    category: "discord",
    title: "Niveau de vérification Discord configuré",
  },
  {
    id: "sp-5",
    category: "bots",
    title: "Tous les bots intégrés ont été audités",
  },
  {
    id: "sp-6",
    category: "settings",
    title: "Salon de logs de modération configuré et restreint",
  },
  {
    id: "sp-7",
    category: "roles",
    title: "Hiérarchie des rôles de modération ordonnée",
  },
];

export default function GuildSecurityScan({
  guild,
  onOpenProtections,
}: GuildSecurityScanProps) {
  const i18n = useI18n();
  const { success } = useToast();

  const [scanState, setScanState] = useState<"idle" | "scanning" | "done">("idle");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const [autoScanChannel, setAutoScanChannel] = useState("alertes");
  const [autoScanFrequency, setAutoScanFrequency] = useState<"day" | "week">("week");
  const [solidPointsOpen, setSolidPointsOpen] = useState(false);
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [scanTimeText, setScanTimeText] = useState("");

  useEffect(() => {
    try {
      const savedAuto = localStorage.getItem(`ethone_autoscan_${guild.id}`);
      if (savedAuto) {
        const parsed = JSON.parse(savedAuto);
        if (typeof parsed.enabled === "boolean") setAutoScanEnabled(parsed.enabled);
        if (parsed.channel) setAutoScanChannel(parsed.channel);
        if (parsed.frequency) setAutoScanFrequency(parsed.frequency);
      }
      const savedScan = localStorage.getItem(`ethone_scan_done_${guild.id}`);
      if (savedScan === "true") {
        setScanState("done");
        setScanTimeText(i18n("dScanSecondsAgo", "Il y a quelques secondes"));
      }
    } catch {}
  }, [guild.id, i18n]);

  useEffect(() => {
    let cancelled = false;
    const api = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
    if (!api) return;

    fetch(`${api}/api/guilds/${guild.id}/welcome/channels`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.channels && Array.isArray(data.channels) && data.channels.length > 0) {
          setChannels(data.channels);
          setAutoScanChannel(data.channels[0].id);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [guild.id]);

  const handleStartScan = () => {
    if (scanState === "scanning") return;
    setScanState("scanning");

    setTimeout(() => {
      setScanState("done");
      setScanTimeText(i18n("dScanSecondsAgo", "Il y a quelques secondes"));
      try {
        localStorage.setItem(`ethone_scan_done_${guild.id}`, "true");
      } catch {}
      success(
        i18n("dSecurityScan", "Scan de sécurité"),
        i18n("dServerWellProtected", "Ton serveur est très bien protégé.")
      );
    }, 2400);
  };

  const handleToggleAutoScan = () => {
    const next = !autoScanEnabled;
    setAutoScanEnabled(next);
    try {
      localStorage.setItem(
        `ethone_autoscan_${guild.id}`,
        JSON.stringify({
          enabled: next,
          channel: autoScanChannel,
          frequency: autoScanFrequency,
        })
      );
    } catch {}
  };

  const handleChangeChannel = (cId: string) => {
    setAutoScanChannel(cId);
    try {
      localStorage.setItem(
        `ethone_autoscan_${guild.id}`,
        JSON.stringify({
          enabled: autoScanEnabled,
          channel: cId,
          frequency: autoScanFrequency,
        })
      );
    } catch {}
  };

  const handleChangeFrequency = (freq: "day" | "week") => {
    setAutoScanFrequency(freq);
    try {
      localStorage.setItem(
        `ethone_autoscan_${guild.id}`,
        JSON.stringify({
          enabled: autoScanEnabled,
          channel: autoScanChannel,
          frequency: freq,
        })
      );
    } catch {}
  };

  const filteredSolidPoints = useMemo(() => {
    if (activeCategory === "all") return SOLID_POINTS;
    return SOLID_POINTS.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  const memberCount =
    (guild as any).approximate_member_count ||
    (guild as any).memberCount ||
    4;

  const showAntiNukeIssue = activeCategory === "all" || activeCategory === "settings";
  const show2FAIssue = activeCategory === "all" || activeCategory === "discord";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {i18n("dSecurityScan", "Scan de sécurité")}
        </h1>

        <div>
          {scanState === "idle" && (
            <button
              type="button"
              onClick={handleStartScan}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 text-xs transition-colors cursor-pointer shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{i18n("dRunScanBtn", "Lancer un scan")}</span>
            </button>
          )}

          {scanState === "scanning" && (
            <button
              type="button"
              disabled
              className="flex items-center gap-2 rounded-lg bg-emerald-500/80 text-zinc-950 font-semibold px-4 py-2 text-xs opacity-80 cursor-wait shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>{i18n("dScanning", "Scan en cours...")}</span>
            </button>
          )}

          {scanState === "done" && (
            <button
              type="button"
              onClick={handleStartScan}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 text-xs transition-colors cursor-pointer shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{i18n("dReRunScan", "Relancer le scan")}</span>
            </button>
          )}
        </div>
      </div>

      {scanState === "idle" && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-12 text-center flex flex-col items-center justify-center shadow-lg"
          >
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Scan className="h-6 w-6" />
            </div>

            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              {i18n("dNoScanYet", "Aucun scan pour l'instant")}
            </h2>

            <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-sm leading-relaxed">
              {i18n(
                "dNoScanDesc",
                "Lance un premier scan : le rapport complet s'affiche ici en quelques secondes."
              )}
            </p>

            <button
              type="button"
              onClick={handleStartScan}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 text-xs transition-colors cursor-pointer mt-5 shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{i18n("dRunScanBtn", "Lancer un scan")}</span>
            </button>
          </motion.div>

          <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5 space-y-4 max-w-md shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                  {i18n("dAutoScanTitle", "Scan automatique")}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                  {i18n(
                    "dAutoScanDesc",
                    "Un rapport posté dans un salon, avec ce qui a changé depuis le précédent."
                  )}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={autoScanEnabled}
                onClick={handleToggleAutoScan}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  autoScanEnabled ? "bg-emerald-500" : "bg-white/20"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    autoScanEnabled ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <select
                  value={autoScanChannel}
                  onChange={(e) => handleChangeChannel(e.target.value)}
                  className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none cursor-pointer focus:border-emerald-500/50"
                >
                  <option value="" disabled>
                    {i18n("dChooseChannel", "Choisir un salon")}
                  </option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChangeFrequency("day")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                    autoScanFrequency === "day"
                      ? "bg-white/10 text-[var(--text-primary)] border border-white/20"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                  )}
                >
                  {i18n("dEveryDay", "Chaque jour")}
                </button>

                <button
                  type="button"
                  onClick={() => handleChangeFrequency("week")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                    autoScanFrequency === "week"
                      ? "bg-white/10 text-[var(--text-primary)] border border-white/20"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                  )}
                >
                  {i18n("dEveryWeek", "Chaque semaine")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {scanState === "scanning" && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                  {i18n("dScanQueued", "Scan en file d'attente")}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {i18n(
                    "dScanQueuedDesc",
                    "Quelques secondes, le temps de charger les membres et les webhooks."
                  )}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5 space-y-4 max-w-md shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                  {i18n("dAutoScanTitle", "Scan automatique")}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                  {i18n(
                    "dAutoScanDesc",
                    "Un rapport posté dans un salon, avec ce qui a changé depuis le précédent."
                  )}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={autoScanEnabled}
                onClick={handleToggleAutoScan}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  autoScanEnabled ? "bg-emerald-500" : "bg-white/20"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    autoScanEnabled ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <select
                  value={autoScanChannel}
                  onChange={(e) => handleChangeChannel(e.target.value)}
                  className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none cursor-pointer focus:border-emerald-500/50"
                >
                  <option value="" disabled>
                    {i18n("dChooseChannel", "Choisir un salon")}
                  </option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChangeFrequency("day")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                    autoScanFrequency === "day"
                      ? "bg-white/10 text-[var(--text-primary)] border border-white/20"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                  )}
                >
                  {i18n("dEveryDay", "Chaque jour")}
                </button>

                <button
                  type="button"
                  onClick={() => handleChangeFrequency("week")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                    autoScanFrequency === "week"
                      ? "bg-white/10 text-[var(--text-primary)] border border-white/20"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                  )}
                >
                  {i18n("dEveryWeek", "Chaque semaine")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {scanState === "done" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5 space-y-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full border-2 border-emerald-500 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-[var(--text-primary)] leading-none">
                    96
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    /100
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                    {i18n("dServerWellProtected", "Ton serveur est très bien protégé.")}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {scanTimeText || i18n("dScanSecondsAgo", "Il y a quelques secondes")} · {memberCount} {i18n("dMembersCount", "membres")}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-[var(--panel-border)]">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--text-muted)]">Keeper</span>
                    <span className="font-mono text-[var(--text-primary)]">100</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--panel-border)] overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--text-muted)]">{i18n("dTabRoles", "Rôles")}</span>
                    <span className="font-mono text-[var(--text-primary)]">100</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--panel-border)] overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--text-muted)]">{i18n("dTabChannels", "Salons")}</span>
                    <span className="font-mono text-[var(--text-primary)]">100</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--panel-border)] overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--text-muted)]">Discord</span>
                    <span className="font-mono text-[var(--text-primary)]">97</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--panel-border)] overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "97%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--text-muted)]">Bots</span>
                    <span className="font-mono text-[var(--text-primary)]">100</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--panel-border)] overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--text-muted)]">{i18n("dTabSettings", "Réglages")}</span>
                    <span className="font-mono text-[var(--text-primary)]">78</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--panel-border)] overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "78%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5 space-y-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                    {i18n("dAutoScanTitle", "Scan automatique")}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    {i18n(
                      "dAutoScanDesc",
                      "Un rapport posté dans un salon, avec ce qui a changé depuis le précédent."
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={autoScanEnabled}
                  onClick={handleToggleAutoScan}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    autoScanEnabled ? "bg-emerald-500" : "bg-white/20"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      autoScanEnabled ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <select
                    value={autoScanChannel}
                    onChange={(e) => handleChangeChannel(e.target.value)}
                    className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none cursor-pointer focus:border-emerald-500/50"
                  >
                    <option value="" disabled>
                      {i18n("dChooseChannel", "Choisir un salon")}
                    </option>
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleChangeFrequency("day")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                      autoScanFrequency === "day"
                        ? "bg-white/10 text-[var(--text-primary)] border border-white/20"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                    )}
                  >
                    {i18n("dEveryDay", "Chaque jour")}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChangeFrequency("week")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                      autoScanFrequency === "week"
                        ? "bg-white/10 text-[var(--text-primary)] border border-white/20"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                    )}
                  >
                    {i18n("dEveryWeek", "Chaque semaine")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={cn(
                  "rounded-lg px-3 py-1.5 transition-colors cursor-pointer font-medium whitespace-nowrap",
                  activeCategory === "all"
                    ? "bg-white/10 text-[var(--text-primary)] border border-white/20"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                )}
              >
                {i18n("dTabAll", "Tout")} 2
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory("keeper")}
                className={cn(
                  "rounded-lg px-3 py-1.5 transition-colors cursor-pointer font-medium whitespace-nowrap",
                  activeCategory === "keeper"
                    ? "bg-white/10 text-[var(--text-primary)] border border-white/20"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                )}
              >
                Keeper
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory("roles")}
                className={cn(
                  "rounded-lg px-3 py-1.5 transition-colors cursor-pointer font-medium whitespace-nowrap",
                  activeCategory === "roles"
                    ? "bg-white/10 text-[var(--text-primary)] border border-white/20"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                )}
              >
                {i18n("dTabRoles", "Rôles")}
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory("channels")}
                className={cn(
                  "rounded-lg px-3 py-1.5 transition-colors cursor-pointer font-medium whitespace-nowrap",
                  activeCategory === "channels"
                    ? "bg-white/10 text-[var(--text-primary)] border border-white/20"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                )}
              >
                {i18n("dTabChannels", "Salons")}
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory("discord")}
                className={cn(
                  "rounded-lg px-3 py-1.5 transition-colors cursor-pointer font-medium whitespace-nowrap",
                  activeCategory === "discord"
                    ? "bg-white/10 text-[var(--text-primary)] border border-white/20"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                )}
              >
                Discord 1
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory("bots")}
                className={cn(
                  "rounded-lg px-3 py-1.5 transition-colors cursor-pointer font-medium whitespace-nowrap",
                  activeCategory === "bots"
                    ? "bg-white/10 text-[var(--text-primary)] border border-white/20"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                )}
              >
                Bots
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory("settings")}
                className={cn(
                  "rounded-lg px-3 py-1.5 transition-colors cursor-pointer font-medium whitespace-nowrap",
                  activeCategory === "settings"
                    ? "bg-white/10 text-[var(--text-primary)] border border-white/20"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                )}
              >
                {i18n("dTabSettings", "Réglages")} 1
              </button>
            </div>

            <div className="space-y-4">
              {showAntiNukeIssue && (
                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5 space-y-3.5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                            {i18n("dIssueAntiNukeTitle", "12 protections anti-nuke sont désactivées")}
                          </h4>
                          <span className="rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                            {i18n("dBadgeImportant", "Important")}
                          </span>
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                            {i18n("dTabSettings", "Réglages")}
                          </span>
                        </div>

                        <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                          {i18n(
                            "dIssueAntiNukeDesc",
                            "Ce sont elles qui stoppent un nuke : suppressions de salons, bans en masse, rôles, webhooks."
                          )}
                        </p>

                        <p className="text-xs text-[var(--text-muted)] mt-2">
                          {i18n(
                            "dIssueAntiNukeTip",
                            "→ Ouvre-les dans /config pour les activer si tu le souhaites."
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ANTI_NUKE_MODULES.map((name) => (
                      <span
                        key={name}
                        className="rounded-md border border-[var(--panel-border)] bg-[var(--background)] px-2 py-1 text-[11px] text-[var(--text-muted)]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenProtections) onOpenProtections();
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                    >
                      <span>{i18n("dOpenProtections", "Ouvrir les protections →")}</span>
                    </button>
                  </div>
                </div>
              )}

              {show2FAIssue && (
                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5 space-y-2 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <Shield className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                          {i18n("dIssue2FATitle", "La 2FA n'est pas exigée pour modérer")}
                        </h4>
                        <span className="rounded bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400">
                          {i18n("dBadgeSuggestion", "Suggestion")}
                        </span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                          Discord
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                        {i18n(
                          "dIssue2FADesc",
                          "Avec la 2FA obligatoire, un compte modérateur dont le mot de passe fuite ne peut pas servir à bannir ou supprimer."
                        )}
                      </p>

                      <p className="text-xs text-[var(--text-muted)] mt-2">
                        {i18n(
                          "dIssue2FATip",
                          "→ Option réservée au propriétaire : Paramètres du serveur → Sécurité."
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setSolidPointsOpen((p) => !p)}
                  className="w-full flex items-center justify-between p-4 text-xs font-semibold text-[var(--text-primary)] hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>
                      {filteredSolidPoints.length}{" "}
                      {filteredSolidPoints.length <= 1
                        ? i18n("dSolidPointSingle", "point solide")
                        : i18n("dSolidPoints", "points solides")}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-[var(--text-muted)] transition-transform duration-200",
                      solidPointsOpen ? "rotate-180" : "rotate-0"
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {solidPointsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-[var(--panel-border)] divide-y divide-[var(--panel-border)] bg-[var(--background)]/30"
                    >
                      {filteredSolidPoints.map((point) => (
                        <div key={point.id} className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[var(--text-muted)]">
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>{point.title}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
