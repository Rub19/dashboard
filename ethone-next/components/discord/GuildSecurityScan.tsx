"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, RefreshCw, Scan, Shield } from "@/components/icons/ph";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { SPRING_LAYOUT, SPRING_PILL } from "@/lib/ease";
import { cn } from "@/lib/utils";
import type { DiscordGuild } from "@/lib/hooks/useDiscordOAuth";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

type ScanCategory = "bot" | "roles" | "channels" | "discord" | "bots" | "settings";
interface ScanCheck {
  id: string;
  category: ScanCategory;
  title: string;
  ok: boolean;
  detail?: string;
}
interface ScanResult {
  checks: ScanCheck[];
  scannedAt: string;
}

interface GuildSecurityScanProps {
  guild: DiscordGuild;
  onOpenProtections?: () => void;
  onBack?: () => void;
}

const CATEGORIES: Array<{ id: ScanCategory; label: string; key: string }> = [
  { id: "bot", label: "Etho", key: "dTabBot" },
  { id: "roles", label: "Rôles", key: "dTabRoles" },
  { id: "channels", label: "Salons", key: "dTabChannels" },
  { id: "discord", label: "Discord", key: "dTabDiscord" },
  { id: "bots", label: "Bots", key: "dTabBots" },
  { id: "settings", label: "Protections", key: "dTabSettings" },
];

const percent = (list: ScanCheck[]) => (list.length ? Math.round((list.filter((c) => c.ok).length / list.length) * 100) : 100);

/**
 * Scan de sécurité : chaque point est vérifié par le bot sur le vrai serveur (permissions, rôles, salons,
 * réglages Discord, bots tiers, modules de protection). Le score est la part des points conformes.
 */
export default function GuildSecurityScan({ guild, onOpenProtections }: GuildSecurityScanProps) {
  const i18n = useI18n();
  const { error: toastError } = useToast();
  const reduced = useReducedMotion();
  const [state, setState] = useState<"idle" | "scanning" | "done">("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [filter, setFilter] = useState<ScanCategory | "all">("all");
  const [showSolid, setShowSolid] = useState(false);

  const runScan = useCallback(async () => {
    if (!BOT_API_URL) return;
    setState("scanning");
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guild.id}/server/security-scan`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.checks) throw new Error(data?.error || `Erreur ${res.status}`);
      setResult(data);
      setState("done");
    } catch (err) {
      toastError(i18n("dSecurityScan", "Scan de sécurité"), err instanceof Error ? err.message : "Bot injoignable");
      setState(result ? "done" : "idle");
    }
  }, [guild.id, i18n, result, toastError]);

  const checks = useMemo(() => result?.checks ?? [], [result]);
  const score = percent(checks);
  const issues = checks.filter((c) => !c.ok && (filter === "all" || c.category === filter));
  const solid = checks.filter((c) => c.ok && (filter === "all" || c.category === filter));
  const tone = score >= 85 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--danger)";

  const scanButton = (
    <button
      type="button"
      onClick={runScan}
      disabled={state === "scanning"}
      className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", state === "scanning" && "animate-spin")} />
      {state === "scanning"
        ? i18n("dScanning", "Scan en cours...")
        : result
          ? i18n("dReRunScan", "Relancer le scan")
          : i18n("dRunScanBtn", "Lancer un scan")}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
          {i18n("dSecurityScan", "Scan de sécurité")}
        </h1>
        {scanButton}
      </div>

      {!result && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_LAYOUT}
          className="flex flex-col items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-12 text-center"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent-primary)]">
            {state === "scanning" ? <RefreshCw className="h-6 w-6 animate-spin" /> : <Scan className="h-6 w-6" />}
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
            {state === "scanning" ? i18n("dScanning", "Scan en cours...") : i18n("dNoScanYet", "Aucun scan pour l'instant")}
          </h2>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--text-muted)]">
            {i18n(
              "dScanRealDesc",
              "Etho vérifie ses permissions, les rôles, les salons, les réglages de sécurité Discord, les autres bots et tes protections."
            )}
          </p>
        </motion.div>
      )}

      {result && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_LAYOUT}
          className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12"
        >
          <div className="space-y-5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5 lg:col-span-5">
            <div className="flex items-center gap-4">
              <div
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-2"
                style={{ borderColor: tone }}
              >
                <span className="text-2xl font-bold leading-none tracking-tight text-[var(--text-primary)]">{score}</span>
                <span className="mt-1 text-[11px] font-medium leading-none text-[var(--text-muted)]">/100</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {issues.length === 0 && filter === "all"
                    ? i18n("dServerWellProtected", "Ton serveur est très bien protégé.")
                    : `${checks.filter((c) => !c.ok).length} ${i18n("dPointsToFix", "point(s) à corriger")}`}
                </h3>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {new Date(result.scannedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                  {checks.length} {i18n("dChecks", "vérifications")}
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t border-[var(--panel-border)] pt-4">
              {CATEGORIES.map((cat) => {
                const list = checks.filter((c) => c.category === cat.id);
                if (list.length === 0) return null;
                const p = percent(list);
                return (
                  <div key={cat.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">{i18n(cat.key, cat.label)}</span>
                      <span className="font-mono text-[var(--text-primary)]">{p}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-border)]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: p >= 85 ? "var(--success)" : p >= 60 ? "var(--warning)" : "var(--danger)" }}
                        initial={reduced ? false : { width: 0 }}
                        animate={{ width: `${p}%` }}
                        transition={SPRING_LAYOUT}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {onOpenProtections && (
              <button
                type="button"
                onClick={onOpenProtections}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-[background-color,transform] duration-150 hover:bg-[var(--surface-hover)] active:scale-[0.98]"
              >
                <Shield className="h-3.5 w-3.5" />
                {i18n("dOpenProtections", "Gérer les protections")}
              </button>
            )}
          </div>

          <div className="space-y-4 lg:col-span-7">
            <div className="flex flex-wrap gap-1.5">
              {(["all", ...CATEGORIES.map((c) => c.id)] as const).map((id) => {
                const active = filter === id;
                const label = id === "all" ? i18n("dAll", "Tout") : i18n(CATEGORIES.find((c) => c.id === id)!.key, CATEGORIES.find((c) => c.id === id)!.label);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={cn(
                      "relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97]",
                      active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="scan-filter-pill"
                        transition={SPRING_PILL}
                        className="absolute inset-0 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-hover)]"
                      />
                    )}
                    <span className="relative">{label}</span>
                  </button>
                );
              })}
            </div>

            {issues.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-4 text-xs text-[var(--text-primary)]">
                <Check className="h-4 w-4 text-[var(--success)]" />
                {i18n("dNothingToFix", "Rien à corriger ici.")}
              </div>
            ) : (
              <ul className="space-y-2">
                {issues.map((c) => (
                  <li key={c.id} className="flex gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{c.title}</p>
                      {c.detail && <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">{c.detail}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {solid.length > 0 && (
              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]">
                <button
                  type="button"
                  onClick={() => setShowSolid((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-[var(--text-primary)]"
                >
                  <span>
                    {solid.length} {i18n("dSolidPoints", "points solides")}
                  </span>
                  <span className="text-[var(--text-muted)]">{showSolid ? "−" : "+"}</span>
                </button>
                <AnimatePresence initial={false}>
                  {showSolid && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={SPRING_LAYOUT}
                      className="overflow-hidden"
                    >
                      {solid.map((c) => (
                        <li key={c.id} className="flex items-center gap-2.5 border-t border-[var(--panel-border)] px-4 py-2.5 text-xs text-[var(--text-primary)]">
                          <Check className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                          {c.title}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
