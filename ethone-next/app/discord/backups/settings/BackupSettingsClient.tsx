"use client";

import { confirmDialog } from "@/lib/confirmDialog";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Settings, Clock, Archive, Shield, Lock, Unlock, Save, Zap, Hash, RefreshCw } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn, formatApiError } from "@/lib/utils";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import ChannelPicker from "@/components/discord/ChannelPicker";
import Select from "@/components/ui/Select";
import { Switch } from "@/components/discord/SettingsUI";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_SNAP, DURATION_SLOW, DURATION_BASE } from "@/lib/ease";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

// Mirrors BackupScheduleSettings in discord-bot/src/modules/backup/types/index.ts.
interface ScheduleSettings {
  enabled: boolean;
  frequency: "6h" | "12h" | "daily" | "weekly";
  preferredTime: string;
  timezone: string;
  retentionCount: number;
  retentionDays: number;
  maxStorageMb: number;
  autoBackupBeforeMajorChanges: boolean;
  defaultSafetyLevel: "SAFE" | "STANDARD" | "DESTRUCTIVE";
  notifyChannelId?: string;
}

interface ProtectedBackup {
  backupId: string;
  name: string;
  createdAt: string;
  sizeBytes: number;
  isProtected: boolean;
}

const DEFAULTS: ScheduleSettings = {
  enabled: false,
  frequency: "daily",
  preferredTime: "03:00",
  timezone: "Europe/Paris",
  retentionCount: 7,
  retentionDays: 30,
  maxStorageMb: 50,
  autoBackupBeforeMajorChanges: true,
  defaultSafetyLevel: "SAFE",
  notifyChannelId: "",
};

export default function BackupSettingsClient() {
  const searchParams = useSearchParams();
  const rawGuildId = searchParams.get("guildId");
  const { profile } = useDiscordOAuth();
  const { success, error: toastError } = useToast();

  const activeGuild = useMemo(() => {
    if (rawGuildId && profile?.guilds) {
      return profile.guilds.find((g) => g.id === rawGuildId) || profile.guilds[0];
    }
    return profile?.guilds?.[0] || null;
  }, [rawGuildId, profile?.guilds]);

  const currentGuildId = useResolvedGuildId(rawGuildId, profile?.guilds);
  const base = `${BOT_API_URL}/api/guilds/${currentGuildId}/backups`;
  const isRealGuild = Boolean(BOT_API_URL) && Boolean(currentGuildId);
  const guildQuery = activeGuild ? `?guildId=${activeGuild.id}` : "";

  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [settings, setSettings] = useState<ScheduleSettings>(DEFAULTS);
  const [protectedBackups, setProtectedBackups] = useState<ProtectedBackup[]>([]);

  const patch = (p: Partial<ScheduleSettings>) => {
    setSettings((s) => ({ ...s, ...p }));
    setDirty(true);
  };

  const load = useCallback(async () => {
    if (!isRealGuild) {
      setIsDemo(true);
      return;
    }
    setLoading(true);
    try {
      const [settingsRes, listRes] = await Promise.all([
        fetch(`${base}/settings`, { credentials: "include" }),
        fetch(base, { credentials: "include" }),
      ]);
      const s = await settingsRes.json().catch(() => null);
      const l = await listRes.json().catch(() => null);
      if (!settingsRes.ok || typeof s?.enabled !== "boolean") {
        setIsDemo(true);
        return;
      }
      setIsDemo(false);
      setSettings({ ...DEFAULTS, ...s, notifyChannelId: s.notifyChannelId || "" });
      setProtectedBackups(Array.isArray(l?.backups) ? l.backups.filter((b: ProtectedBackup) => b.isProtected) : []);
      setDirty(false);
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [base, isRealGuild]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (isDemo) {
      toastError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    setSaving(true);
    try {
      const body = { ...settings, notifyChannelId: settings.notifyChannelId?.trim() || undefined };
      const res = await fetch(`${base}/settings`, { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.enabled !== "boolean") throw new Error(formatApiError(data?.error, ""));
      setSettings({ ...DEFAULTS, ...data, notifyChannelId: data.notifyChannelId || "" });
      setDirty(false);
      success("Planification & rétention enregistrées.");
    } catch (e: any) {
      toastError(formatApiError(e, "Échec de l'enregistrement."));
    } finally {
      setSaving(false);
    }
  };

  const handleUnprotect = async (b: ProtectedBackup) => {
    if (!await confirmDialog(`Retirer la protection de « ${b.name} » ? Elle pourra être purgée par la rétention.`)) return;
    const previous = protectedBackups;
    setProtectedBackups((prev) => prev.filter((x) => x.backupId !== b.backupId));
    if (isDemo) return;
    try {
      const res = await fetch(`${base}/${b.backupId}/protect`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ isProtected: false }) });
      if (!res.ok) throw new Error();
      success("Protection retirée.");
    } catch {
      setProtectedBackups(previous);
      toastError("Échec — la protection a été restaurée.");
    }
  };

  const protectedBytes = protectedBackups.reduce((a, b) => a + b.sizeBytes, 0);

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-6 sm:px-6 text-[var(--text-primary)]">
      <div className="stagger-children max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Link href={`/discord/backups${guildQuery}`} className="inline-flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] px-3 text-xs font-semibold normal-case tracking-normal text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour aux sauvegardes
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading} aria-label="Recharger les paramètres" title="Recharger" className="px-3 py-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-raised)]/70 text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 cursor-pointer transition-[background-color,transform] duration-150 active:scale-[0.95] disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button onClick={handleSave} disabled={saving || !dirty} className={cn("px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50", dirty ? "text-[var(--accent-contrast)] bg-[var(--accent-primary)] hover:brightness-110 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50" : "text-[var(--text-muted)] bg-[var(--surface-raised)]/40")}>
              <Save className="w-4 h-4" />
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={saving ? "saving" : dirty ? "dirty" : "clean"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: DURATION_BASE, ease: EASE_SNAP }}
                >
                  {saving ? "Enregistrement..." : dirty ? "Enregistrer les paramètres" : "À jour"}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <span className="icon-pop grid h-10 w-10 shrink-0 place-items-center rounded-[var(--inset-radius)] border border-current/25 bg-current/10 text-[var(--accent-primary)]"><Settings className="h-5 w-5" /></span> Paramètres de sauvegarde & rétention
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Planification automatique, conservation et garde-fous de restauration.
            {isDemo && <span className="text-amber-400"> (bot injoignable ou absent de ce serveur)</span>}
          </p>
        </div>

        {/* Planification */}
        <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-xl border border-[var(--accent-primary)]/30"><Clock className="w-5 h-5" /></div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] text-base">Sauvegardes automatiques</h3>
                <p className="text-xs text-[var(--text-muted)]">Le bot capture un snapshot complet à intervalle régulier.</p>
              </div>
            </div>
            <Switch checked={settings.enabled} onChange={(v) => patch({ enabled: v })} label="Sauvegardes automatiques" />
          </div>
          <AnimatePresence initial={false}>
          {settings.enabled && (
            <motion.div
              key="schedule"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: DURATION_SLOW, ease: EASE_SNAP }}
              className="overflow-hidden"
            >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[var(--panel-border)]">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-muted)]">Fréquence</label>
                <Select
                  value={settings.frequency}
                  onChange={(v) => patch({ frequency: v as ScheduleSettings["frequency"] })}
                  className="w-full"
                  aria-label="Fréquence"
                  options={[
                    { id: "6h", label: "Toutes les 6 heures" },
                    { id: "12h", label: "Toutes les 12 heures" },
                    { id: "daily", label: "Quotidienne" },
                    { id: "weekly", label: "Hebdomadaire" },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-muted)]">Heure préférée</label>
                <input type="time" value={settings.preferredTime} onChange={(e) => patch({ preferredTime: e.target.value })} className="w-full bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-border-hover)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-muted)]">Fuseau horaire</label>
                <Select
                  value={settings.timezone}
                  onChange={(v) => patch({ timezone: v })}
                  className="w-full"
                  aria-label="Fuseau horaire"
                  options={[
                    { id: "Europe/Paris", label: "Europe/Paris" },
                    { id: "Europe/Brussels", label: "Europe/Bruxelles" },
                    { id: "America/Montreal", label: "America/Montréal" },
                    { id: "UTC", label: "UTC" },
                    { id: "America/New_York", label: "America/New York" },
                  ]}
                />
              </div>
            </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Rétention */}
        <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20"><Archive className="w-5 h-5" /></div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] text-base">Conservation & purge</h3>
              <p className="text-xs text-[var(--text-muted)]">Nettoyage automatique des sauvegardes non protégées.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[var(--panel-border)]">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Nombre maximum</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={100} value={settings.retentionCount} onChange={(e) => patch({ retentionCount: Number(e.target.value) || 1 })} className="w-full bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)]" />
                <span className="text-xs text-[var(--text-muted)]">snapshots</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Âge maximal</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={365} value={settings.retentionDays} onChange={(e) => patch({ retentionDays: Number(e.target.value) || 1 })} className="w-full bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)]" />
                <span className="text-xs text-[var(--text-muted)]">jours</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Quota de stockage</label>
              <div className="flex items-center gap-2">
                <input type="number" min={5} max={500} value={settings.maxStorageMb} onChange={(e) => patch({ maxStorageMb: Number(e.target.value) || 5 })} className="w-full bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)]" />
                <span className="text-xs text-[var(--text-muted)]">MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sécurité */}
        <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-xl border border-[var(--accent-primary)]/20"><Shield className="w-5 h-5" /></div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] text-base">Sécurité & Disaster Recovery</h3>
              <p className="text-xs text-[var(--text-muted)]">Snapshots de secours et garde-fous de restauration.</p>
            </div>
          </div>
          <div className="space-y-4 pt-3 border-t border-[var(--panel-border)]">
            <div className="flex items-center justify-between p-3.5 bg-[var(--surface-raised)]/40 rounded-xl border border-[var(--panel-border)] gap-3">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Snapshot pré-changement automatique</span>
                <p className="text-xs text-[var(--text-muted)] max-w-lg">Sauvegarde automatique avant toute restauration ou opération majeure.</p>
              </div>
              <input type="checkbox" checked={settings.autoBackupBeforeMajorChanges} onChange={(e) => patch({ autoBackupBeforeMajorChanges: e.target.checked })} className="w-4 h-4 rounded text-[var(--accent-primary)] bg-[var(--surface-raised)]/40 border-[var(--panel-border)]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-muted)]">Mode de restauration par défaut</label>
                <Select
                  value={settings.defaultSafetyLevel}
                  onChange={(v) => patch({ defaultSafetyLevel: v as ScheduleSettings["defaultSafetyLevel"] })}
                  className="w-full"
                  aria-label="Mode de restauration par défaut"
                  options={[
                    { id: "SAFE", label: "🛡️ Sécurisé — ne supprime jamais rien" },
                    { id: "STANDARD", label: "⚖️ Standard — synchronise l'état exact" },
                    { id: "DESTRUCTIVE", label: "⚠️ Destructif — supprime l'absent (confirmation)" },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-muted)]">Salon de notification (optionnel)</label>
                <ChannelPicker
                  value={settings.notifyChannelId || ""}
                  onChange={(id) => patch({ notifyChannelId: id })}
                  guildId={currentGuildId}
                  placeholder="Résumé après chaque sauvegarde"
                  emptyLabel="— Aucun salon —"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Protégées */}
        <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20"><Lock className="w-5 h-5" /></div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] text-base">Sauvegardes protégées ({protectedBackups.length})</h3>
              <p className="text-xs text-[var(--text-muted)]">Jamais purgées par la rétention · {(protectedBytes / 1024).toFixed(0)} Ko au total.</p>
            </div>
          </div>
          <div className="divide-y divide-[var(--panel-border)] border border-[var(--panel-border)] rounded-xl overflow-hidden">
            {protectedBackups.length === 0 && <p className="p-4 text-xs text-[var(--text-muted)]">Aucune sauvegarde protégée{isDemo ? " (démo)" : ""}. Protège un snapshot depuis la liste principale.</p>}
            <AnimatePresence initial={false}>
            {protectedBackups.map((b) => (
              <motion.div
                key={b.backupId}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: DURATION_BASE, ease: EASE_SNAP }}
                className="overflow-hidden"
              >
              <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-[var(--surface-raised)]/70 transition-colors">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/discord/backups/${b.backupId}${guildQuery}`} className="font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--accent-primary)] truncate">{b.name}</Link>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0"><Lock className="w-2.5 h-2.5" /> PROTÉGÉ</span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] block truncate">{new Date(b.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} · {(b.sizeBytes / 1024).toFixed(0)} Ko · {b.backupId}</span>
                </div>
                <button onClick={() => handleUnprotect(b)} className="px-3 py-1 rounded bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-raised)]/70 text-xs font-medium text-[var(--text-muted)] flex items-center gap-1.5 transition-[background-color,transform] duration-150 active:scale-[0.96] cursor-pointer shrink-0">
                  <Unlock className="w-3.5 h-3.5" /> Retirer
                </button>
              </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
