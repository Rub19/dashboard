"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, RefreshCw, Scan, Shield } from "@/components/icons/ph";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { SPRING_LAYOUT, SPRING_PILL, SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";
import type { DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import ScoreRing from "./ScoreRing";
import ChannelPicker from "./ChannelPicker";
import {
  BOT_API_URL,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  failingChecks,
  fetchLastScan,
  scoreColor,
  sinceLabel,
  type AutoScanConfig,
  type ScanCategory,
  type ScanResult,
} from "@/lib/discord/security-scan";

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
  { id: "settings", label: "Réglages", key: "dTabSettings" },
];

const percentOk = (list: ScanResult["checks"]) => (list.length ? Math.round((list.filter((c) => c.ok).length / list.length) * 100) : 100);

/**
 * Scan de sécurité : chaque point est vérifié par le bot sur le vrai serveur. Le dernier résultat est gardé par le
 * bot (affiché à l'ouverture) et le scan automatique poste un rapport dans un salon, avec ce qui a changé.
 */
export default function GuildSecurityScan({ guild, onOpenProtections }: GuildSecurityScanProps) {
  const i18n = useI18n();
  const { error: toastError } = useToast();
  const reduced = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [filter, setFilter] = useState<ScanCategory | "all">("all");
  const [showSolid, setShowSolid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLastScan(guild.id)
      .then((r) => !cancelled && setResult(r))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [guild.id]);

  const runScan = useCallback(async () => {
    if (!BOT_API_URL || scanning) return;
    setScanning(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guild.id}/server/security-scan`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.checks) throw new Error(data?.error || `Erreur ${res.status}`);
      setResult(data);
    } catch (err) {
      toastError(i18n("dSecurityScan", "Scan de sécurité"), err instanceof Error ? err.message : "Bot injoignable");
    } finally {
      setScanning(false);
    }
  }, [guild.id, i18n, scanning, toastError]);

  const checks = useMemo(() => result?.checks ?? [], [result]);
  const issues = failingChecks(result).filter((c) => filter === "all" || c.category === filter);
  const solid = checks.filter((c) => c.ok && (filter === "all" || c.category === filter));
  const issueCount = checks.filter((c) => !c.ok).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
          {i18n("dSecurityScan", "Scan de sécurité")}
        </h1>
        <button
          type="button"
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", scanning && "animate-spin")} />
          {scanning ? i18n("dScanning", "Scan en cours...") : result ? i18n("dReRunScan", "Relancer le scan") : i18n("dRunScanBtn", "Lancer un scan")}
        </button>
      </div>

      {!result && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_LAYOUT}
          className="flex flex-col items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-12 text-center"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent-primary)]">
            {scanning || loading ? <RefreshCw className="h-6 w-6 animate-spin" /> : <Scan className="h-6 w-6" />}
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
            {scanning ? i18n("dScanning", "Scan en cours...") : loading ? "Chargement du dernier scan…" : i18n("dNoScanYet", "Aucun scan pour l'instant")}
          </h2>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--text-muted)]">
            Etho vérifie ses permissions, les rôles, les salons, les réglages de sécurité Discord, les autres bots et tes protections.
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
          <div className="space-y-6 lg:col-span-5">
            <div className="space-y-5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5">
              <div className="flex items-center gap-4">
                <ScoreRing key={result.scannedAt} score={result.score} />
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {issueCount === 0 ? i18n("dServerWellProtected", "Ton serveur est très bien protégé.") : `${issueCount} point${issueCount > 1 ? "s" : ""} à régler`}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    {sinceLabel(result.scannedAt)} · {result.memberCount} membres
                  </p>
                </div>
              </div>
              <div className="space-y-3 border-t border-[var(--panel-border)] pt-4">
                {CATEGORIES.map((cat) => {
                  const list = checks.filter((c) => c.category === cat.id);
                  if (list.length === 0) return null;
                  const p = percentOk(list);
                  return (
                    <button key={cat.id} type="button" onClick={() => setFilter(cat.id)} className="block w-full text-left">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-[var(--text-muted)]">{i18n(cat.key, cat.label)}</span>
                        <span className="font-mono text-[var(--text-primary)]">{p}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-border)]">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: scoreColor(p) }}
                          initial={reduced ? false : { width: 0 }}
                          animate={{ width: `${p}%` }}
                          transition={SPRING_LAYOUT}
                        />
                      </div>
                    </button>
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
            <AutoScanCard guildId={guild.id} />
          </div>

          <div className="space-y-4 lg:col-span-7">
            <div role="radiogroup" aria-label="Catégorie" className="flex flex-wrap gap-1.5">
              {(["all", ...CATEGORIES.map((c) => c.id)] as const).map((id) => {
                const active = filter === id;
                const cat = CATEGORIES.find((c) => c.id === id);
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setFilter(id)}
                    className={cn(
                      "relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97]",
                      active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {active && (
                      <motion.span layoutId="scan-filter-pill" transition={SPRING_PILL} className="absolute inset-0 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-hover)]" />
                    )}
                    <span className="relative">{cat ? i18n(cat.key, cat.label) : i18n("dAll", "Tout")}</span>
                  </button>
                );
              })}
            </div>

            {issues.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-4 text-xs text-[var(--text-primary)]">
                <Check className="h-4 w-4 text-[var(--success)]" />
                Rien à régler ici.
              </div>
            ) : (
              <ul className="space-y-2.5">
                {issues.map((c) => (
                  <li key={c.id} className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: SEVERITY_COLOR[c.severity] }} />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-[var(--text-primary)]">{c.title}</p>
                          <span className="rounded-md border border-[var(--panel-border)] px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: SEVERITY_COLOR[c.severity] }}>
                            {SEVERITY_LABEL[c.severity]}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">{i18n(CATEGORIES.find((x) => x.id === c.category)!.key, CATEGORIES.find((x) => x.id === c.category)!.label)}</span>
                        </div>
                        {c.why && <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">{c.why}</p>}
                        {c.fix && <p className="text-[11px] leading-relaxed text-[var(--text-primary)]">{c.fix}</p>}
                        {c.items && c.items.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {c.items.slice(0, 10).map((it) => (
                              <span key={it} className="rounded-md bg-[var(--surface-hover)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                                {it}
                              </span>
                            ))}
                            {c.items.length > 10 && (
                              <span className="px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]" title={c.items.slice(10).join(", ")}>
                                +{c.items.length - 10} autres
                              </span>
                            )}
                          </div>
                        )}
                      </div>
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
                  aria-expanded={showSolid}
                  className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-[var(--text-primary)]"
                >
                  <span>{solid.length} points solides</span>
                  <span className="text-[var(--text-muted)]">{showSolid ? "−" : "+"}</span>
                </button>
                <AnimatePresence initial={false}>
                  {showSolid && (
                    <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
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

/** Réglages du scan automatique, enregistrés sur le bot à chaque changement. */
function AutoScanCard({ guildId }: { guildId: string }) {
  const { error: toastError, success } = useToast();
  const [auto, setAuto] = useState<AutoScanConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!BOT_API_URL) return;
    let cancelled = false;
    const base = `${BOT_API_URL}/api/guilds/${guildId}/server`;
    Promise.all([
      fetch(`${base}/security-scan/auto`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([a]) => {
        if (!cancelled && a?.auto) setAuto(a.auto);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [guildId]);

  const save = async (patch: Partial<AutoScanConfig>) => {
    if (!auto) return;
    const next = { ...auto, ...patch };
    if (next.enabled && !next.channelId) {
      setAuto(next);
      return; // on attend le choix du salon avant d'enregistrer l'activation
    }
    const previous = auto;
    setAuto(next);
    setSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/server/security-scan/auto`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next.enabled, channelId: next.channelId, frequency: next.frequency }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
      setAuto(data.auto);
      if (patch.enabled === true || (patch.channelId && next.enabled)) success("Scan automatique activé", "Le premier rapport arrive dans le salon d'ici 15 minutes.");
    } catch (err) {
      setAuto(previous);
      toastError("Scan automatique", err instanceof Error ? err.message : "Bot injoignable");
    } finally {
      setSaving(false);
    }
  };

  if (!auto) return null;

  return (
    <div className="space-y-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Scan automatique</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
            Un rapport posté dans un salon, avec ce qui a changé depuis le précédent.
            {auto.lastRunAt ? ` Dernier rapport ${sinceLabel(auto.lastRunAt)}.` : ""}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={auto.enabled}
          aria-label="Activer le scan automatique"
          disabled={saving}
          onClick={() => save({ enabled: !auto.enabled })}
          className={cn(
            "relative h-5 w-10 shrink-0 rounded-full border border-[var(--panel-border)] transition-colors duration-200",
            auto.enabled ? "bg-[var(--success)]" : "bg-[var(--surface-hover)]"
          )}
        >
          <motion.span className="absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow" initial={false} animate={{ x: auto.enabled ? 20 : 0 }} transition={SPRING_PRESS} />
        </button>
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-[var(--text-muted)]">Salon du rapport</span>
        <ChannelPicker
          guildId={guildId}
          value={auto.channelId}
          onChange={(id) => save({ channelId: id || null })}
          filterTypes={[0, 5]}
          disabled={saving}
          placeholder="Choisir un salon"
        />
      </div>

      <div role="radiogroup" aria-label="Fréquence" className="flex gap-1.5">
        {(["day", "week"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={auto.frequency === f}
            disabled={saving}
            onClick={() => save({ frequency: f })}
            className={cn(
              "relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97]",
              auto.frequency === f ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {auto.frequency === f && (
              <motion.span layoutId={`autoscan-freq-${guildId}`} transition={SPRING_PILL} className="absolute inset-0 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-hover)]" />
            )}
            <span className="relative">{f === "day" ? "Chaque jour" : "Chaque semaine"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
