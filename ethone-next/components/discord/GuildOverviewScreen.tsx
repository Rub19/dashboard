"use client";

import { useEffect, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { Ban, BellRing, BriefcaseBusiness, CircleCheck, Gavel, History, ScanFace, Settings, ShieldAlert, ShieldCheck, Siren, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { useI18n } from "@/lib/hooks/useI18n";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { pageStagger, staggerItem } from "@/lib/motion-variants";
import { useRaidMode } from "@/lib/hooks/useRaidMode";
import { cleanLogText, failingChecks, fetchLastScan, scoreColor, sinceLabel, type ScanCheck, type ScanResult } from "@/lib/discord/security-scan";
import { protectionCount } from "./console/ConsoleProtections";
import type { ConsoleView } from "./HubSidebar";
import type { DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { tx } from "@/lib/tx";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface GuildOverviewScreenProps {
  guild: DiscordGuild;
  userName?: string;
  guildSettings?: { prefix?: string; antiRaidEnabled?: boolean; antiSpamEnabled?: boolean };
  moduleStatus?: Record<string, boolean>;
  activeModuleCount?: number;
  totalModuleCount?: number;
  onOpenSetup?: () => void;
  onOpenScan?: () => void;
  onAllModules?: () => void;
  /** Ouvre la page Logs de la console (salons de log). */
  onOpenLogs?: () => void;
  onOpenView?: (view: ConsoleView, opts?: { logsTab?: "incidents" | "journal" | "channels" }) => void;
}

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

const SHORTCUTS: Array<{ view: ConsoleView | "scan"; icon: Icon; title: string; text: string }> = [
  { view: "protections", icon: ShieldCheck, title: "Protections", text: "Activer et régler chaque protection." },
  { view: "commands", icon: Gavel, title: "Commandes", text: "Qui peut bannir, expulser, effacer." },
  { view: "whitelist", icon: UsersRound, title: "Whitelist", text: "Membres et rôles de confiance." },
  { view: "blacklist", icon: Ban, title: "Blacklist", text: "Bannis à chaque arrivée." },
  { view: "logs", icon: History, title: "Incidents & Logs", text: "Timeline des sanctions et alertes de sécurité." },
  { view: "scan", icon: ScanFace, title: "Scan de sécurité", text: "Les failles du serveur, par priorité." },
  { view: "tools", icon: BriefcaseBusiness, title: "Outils", text: "Captcha à l'arrivée, soutiens." },
  { view: "settings", icon: Settings, title: "Réglages", text: "Préfixe, salon système, alertes." },
];

export default function GuildOverviewScreen({ guild, guildSettings, onOpenScan, onOpenLogs, onOpenView }: GuildOverviewScreenProps) {
  const i18n = useI18n();
  const { reduced } = useMotionPref();
  const { active: raidMode, busy: raidBusy, toggle: toggleRaid } = useRaidMode(guild.id);

  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [logGap, setLogGap] = useState<string[]>([]);
  const [activity, setActivity] = useState<Array<{ id: string; title: string; createdAt: string; color?: string }> | null>(null);
  const [protections, setProtections] = useState<{ active: number; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLastScan(guild.id)
      .then((r) => !cancelled && setLastScan(r))
      .catch(() => {});
    if (!BOT_API_URL) return;
    const get = (path: string) =>
      fetch(`${BOT_API_URL}/api/guilds/${guild.id}${path}`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    get("/server/audit").then((d) => !cancelled && setActivity(Array.isArray(d?.logs) ? d.logs.slice(0, 5) : null));
    get("/server/log-coverage").then((d) => !cancelled && setLogGap(Array.isArray(d?.withoutChannel) ? d.withoutChannel : []));
    get("/protections").then((d) => {
      const c = protectionCount(d);
      if (!cancelled && c) setProtections(c);
    });
    return () => {
      cancelled = true;
    };
  }, [guild.id]);

  const open = (view: ConsoleView | "scan") => (view === "scan" ? onOpenScan?.() : onOpenView?.(view));

  // Bandeaux en tête (format Keeper) : points critiques ou à revoir du dernier scan, et protections sans salon de log.
  const banners: Array<{ id: string; tone: "danger" | "warning"; title: string; action: string; onClick: () => void }> = [
    ...failingChecks(lastScan)
      .filter((c: ScanCheck) => (c.severity === "important" || c.severity === "review") && c.id !== "protections-log-channel")
      .slice(0, 2)
      .map((c: ScanCheck) => ({ id: c.id, tone: c.severity === "important" ? ("danger" as const) : ("warning" as const), title: c.title, action: "Voir le détail", onClick: () => open("scan") })),
    ...(logGap.length
      ? [{ id: "log-gap", tone: "warning" as const, title: tx("{length} protection{v1} sans salon de log", { length: logGap.length, v1: logGap.length > 1 ? "s" : "" }), action: "Choisir un salon", onClick: () => onOpenLogs?.() }]
      : []),
  ];

  const tile = "rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]";

  return (
    <motion.div variants={pageStagger} initial={reduced ? false : "initial"} animate="animate" className="mx-auto w-full max-w-4xl space-y-5">
      <motion.h1 variants={staggerItem} className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
        {i18n("dOverview", "Vue d'ensemble")}
      </motion.h1>

      {banners.length > 0 && (
        <motion.div variants={staggerItem} className="space-y-2">
          {banners.map((b) => (
            <div
              key={b.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-2.5",
                b.tone === "danger" ? "border-[var(--danger)]/35 bg-[var(--danger)]/[0.07]" : "border-[var(--warning)]/35 bg-[var(--warning)]/[0.07]"
              )}
            >
              {b.tone === "danger" ? <ShieldAlert className="h-4 w-4 shrink-0 text-[var(--danger)]" strokeWidth={2} /> : <BellRing className="h-4 w-4 shrink-0 text-[var(--warning)]" strokeWidth={2} />}
              <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">{b.title}</p>
              <button type="button" onClick={b.onClick} className="shrink-0 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]">
                {b.action}
              </button>
            </div>
          ))}
        </motion.div>
      )}

      {/* Quatre indicateurs */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button type="button" onClick={() => open("protections")} className={cn(tile, "relative overflow-hidden p-4 text-left transition-colors hover:border-[var(--text-primary)]/15")}>
          <Head icon={ShieldCheck}>{tx("Protections actives")}</Head>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {protections ? protections.active : "—"}
            <span className="text-[var(--text-muted)]">/{protections?.total ?? "—"}</span>
          </p>
          <span className="absolute inset-x-0 bottom-0 h-1 bg-[var(--panel-border)]">
            <motion.span
              className="block h-full bg-[var(--success)]"
              initial={reduced ? false : { width: 0 }}
              animate={{ width: protections ? `${(protections.active / protections.total) * 100}%` : 0 }}
              transition={SPRING_LAYOUT}
            />
          </span>
        </button>
        <button type="button" onClick={() => open("scan")} className={cn(tile, "p-4 text-left transition-colors hover:border-[var(--text-primary)]/15")}>
          <Head icon={ScanFace}>{tx("Scan de sécurité")}</Head>
          {lastScan ? (
            <p className="mt-2 text-2xl font-bold tabular-nums" title={sinceLabel(lastScan.scannedAt)}>
              <span style={{ color: scoreColor(lastScan.score) }}>{lastScan.score}</span>
              <span className="text-[var(--text-muted)]">/100</span>
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{tx("Lancer un scan")}</p>
          )}
        </button>
        <div className={cn(tile, "p-4")}>
          <Head icon={Siren}>{tx("Mode raid")}</Head>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{raidMode === null ? "—" : raidMode ? tx("Actif") : tx("Inactif")}</p>
            <button
              type="button"
              role="switch"
              aria-checked={raidMode === true}
              aria-label={tx("Mode raid")}
              disabled={raidBusy || raidMode === null}
              onClick={toggleRaid}
              className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50", raidMode ? "bg-[var(--danger)]" : "bg-[var(--panel-border)]")}
            >
              <motion.span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" initial={false} animate={{ x: raidMode ? 16 : 0 }} transition={SPRING_PRESS} />
            </button>
          </div>
        </div>
        <button type="button" onClick={() => open("settings")} className={cn(tile, "p-4 text-left transition-colors hover:border-[var(--text-primary)]/15")}>
          <Head icon={Settings}>{tx("Préfixe")}</Head>
          <p className="mt-2 font-mono text-2xl font-bold text-[var(--text-primary)]">{guildSettings?.prefix || "!"}</p>
        </button>
      </motion.div>

      {/* Gérer le serveur */}
      <motion.section variants={staggerItem} className="space-y-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">{tx("Gérer le serveur")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SHORTCUTS.map(({ view, icon: Ico, title, text }) => (
            <motion.button
              key={view}
              type="button"
              onClick={() => open(view)}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              transition={SPRING_PRESS}
              className={cn(tile, "flex items-center gap-3 p-3.5 text-left transition-colors hover:border-[var(--text-primary)]/15 hover:bg-[var(--surface-hover)]")}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--success)]/12 text-[var(--success)]">
                <Ico className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-[var(--text-primary)]">{title}</span>
                <span className="block truncate text-[11px] text-[var(--text-muted)]">{text}</span>
              </span>
            </motion.button>
          ))}
        </div>
      </motion.section>

      <motion.div
        variants={staggerItem}
        className={cn(tile, "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/[0.04]")}
      >
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{tx("Timeline des Incidents en Direct")}</h3>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                {tx("Temps Réel")}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {tx("Historique visuel des événements de sécurité (sanctions auto-mod, détections anti-raid, alertes).")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => (onOpenView ? onOpenView("logs", { logsTab: "incidents" }) : onOpenLogs?.())}
          className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <History className="h-3.5 w-3.5" />
          <span>{tx("Consulter les incidents")}</span>
        </button>
      </motion.div>

      {/* Activité récente */}
      <motion.section variants={staggerItem} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">{i18n("dRecentActivity", "Activité récente")}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (onOpenView ? onOpenView("logs", { logsTab: "incidents" }) : onOpenLogs?.())}
              className="text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
            >
              {tx("Timeline incidents")}
            </button>
            <span className="text-[var(--text-muted)]">•</span>
            <button type="button" onClick={() => open("logs")} className="text-xs font-semibold text-[var(--success)] hover:underline cursor-pointer">
              {tx("Tout voir")}
            </button>
          </div>
        </div>
        <div className={tile}>
          {activity && activity.length > 0 ? (
            <ul>
              {activity.map((log) => (
                <li key={log.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-4 py-2.5 text-[13px] first:border-t-0">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: log.color || "var(--text-muted)" }} />
                  <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{cleanLogText(log.title)}</span>
                  <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{sinceLabel(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2.5 px-4 py-3 text-[13px] text-[var(--text-muted)]">
              <CircleCheck className="h-4 w-4 text-[var(--success)]" strokeWidth={2} />
              {activity === null ? tx("Logs indisponibles pour l'instant.") : tx("Rien à signaler. Etho veille.")}
            </p>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}

function Head({ icon: Ico, children }: { icon: Icon; children: string }) {
  return (
    <span className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
      {children}
      <Ico className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}
