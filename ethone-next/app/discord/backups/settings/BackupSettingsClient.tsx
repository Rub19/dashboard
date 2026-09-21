"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Settings, Clock, Archive, Shield, Lock, Unlock, Save, Zap, Hash, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";

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
      if (!res.ok || typeof data?.enabled !== "boolean") throw new Error(data?.error || "save failed");
      setSettings({ ...DEFAULTS, ...data, notifyChannelId: data.notifyChannelId || "" });
      setDirty(false);
      success("Planification & rétention enregistrées.");
    } catch (e: any) {
      toastError(e?.message || "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnprotect = async (b: ProtectedBackup) => {
    if (!confirm(`Retirer la protection de « ${b.name} » ? Elle pourra être purgée par la rétention.`)) return;
    setProtectedBackups((prev) => prev.filter((x) => x.backupId !== b.backupId));
    if (isDemo) return;
    try {
      const res = await fetch(`${base}/${b.backupId}/protect`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ isProtected: false }) });
      if (!res.ok) throw new Error();
      success("Protection retirée.");
    } catch {
      toastError("Échec — rechargez la page.");
      load();
    }
  };

  const protectedBytes = protectedBackups.reduce((a, b) => a + b.sizeBytes, 0);

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-neutral-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Link href={`/discord/backups${guildQuery}`} className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour aux sauvegardes
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading} className="px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button onClick={handleSave} disabled={saving || !dirty} className={cn("px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50", dirty ? "bg-indigo-600 hover:bg-indigo-500" : "bg-neutral-800")}>
              <Save className="w-4 h-4" />
              {saving ? "Enregistrement..." : dirty ? "Enregistrer les paramètres" : "À jour"}
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-indigo-400" /> Paramètres de sauvegarde & rétention
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Planification automatique, conservation et garde-fous de restauration.
            {isDemo && <span className="text-amber-400"> (bot injoignable ou absent de ce serveur)</span>}
          </p>
        </div>

        {/* Planification */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20"><Clock className="w-5 h-5" /></div>
              <div>
                <h3 className="font-semibold text-white text-base">Sauvegardes automatiques</h3>
                <p className="text-xs text-neutral-400">Le bot capture un snapshot complet à intervalle régulier.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.enabled} onChange={(e) => patch({ enabled: e.target.checked })} className="sr-only peer" />
              <div className="w-11 h-6 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>
          {settings.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-neutral-800/80">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">Fréquence</label>
                <select value={settings.frequency} onChange={(e) => patch({ frequency: e.target.value as ScheduleSettings["frequency"] })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value="6h">Toutes les 6 heures</option>
                  <option value="12h">Toutes les 12 heures</option>
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">Heure préférée</label>
                <input type="time" value={settings.preferredTime} onChange={(e) => patch({ preferredTime: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">Fuseau horaire</label>
                <select value={settings.timezone} onChange={(e) => patch({ timezone: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Europe/Brussels">Europe/Bruxelles</option>
                  <option value="America/Montreal">America/Montréal</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New York</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Rétention */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20"><Archive className="w-5 h-5" /></div>
            <div>
              <h3 className="font-semibold text-white text-base">Conservation & purge</h3>
              <p className="text-xs text-neutral-400">Nettoyage automatique des sauvegardes non protégées.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-neutral-800/80">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Nombre maximum</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={100} value={settings.retentionCount} onChange={(e) => patch({ retentionCount: Number(e.target.value) || 1 })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white" />
                <span className="text-xs text-neutral-400">snapshots</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Âge maximal</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={365} value={settings.retentionDays} onChange={(e) => patch({ retentionDays: Number(e.target.value) || 1 })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white" />
                <span className="text-xs text-neutral-400">jours</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Quota de stockage</label>
              <div className="flex items-center gap-2">
                <input type="number" min={5} max={500} value={settings.maxStorageMb} onChange={(e) => patch({ maxStorageMb: Number(e.target.value) || 5 })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white" />
                <span className="text-xs text-neutral-400">MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sécurité */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20"><Shield className="w-5 h-5" /></div>
            <div>
              <h3 className="font-semibold text-white text-base">Sécurité & Disaster Recovery</h3>
              <p className="text-xs text-neutral-400">Snapshots de secours et garde-fous de restauration.</p>
            </div>
          </div>
          <div className="space-y-4 pt-3 border-t border-neutral-800/80">
            <div className="flex items-center justify-between p-3.5 bg-neutral-950 rounded-xl border border-neutral-800/80 gap-3">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Snapshot pré-changement automatique</span>
                <p className="text-xs text-neutral-400 max-w-lg">Sauvegarde automatique avant toute restauration ou opération majeure.</p>
              </div>
              <input type="checkbox" checked={settings.autoBackupBeforeMajorChanges} onChange={(e) => patch({ autoBackupBeforeMajorChanges: e.target.checked })} className="w-4 h-4 rounded text-indigo-600 bg-neutral-900 border-neutral-700" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">Mode de restauration par défaut</label>
                <select value={settings.defaultSafetyLevel} onChange={(e) => patch({ defaultSafetyLevel: e.target.value as ScheduleSettings["defaultSafetyLevel"] })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value="SAFE">🛡️ Sécurisé — ne supprime jamais rien</option>
                  <option value="STANDARD">⚖️ Standard — synchronise l'état exact</option>
                  <option value="DESTRUCTIVE">⚠️ Destructif — supprime l'absent (confirmation)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">Salon de notification (ID, optionnel)</label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input type="text" value={settings.notifyChannelId || ""} onChange={(e) => patch({ notifyChannelId: e.target.value })} placeholder="Résumé après chaque sauvegarde" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-mono" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Protégées */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20"><Lock className="w-5 h-5" /></div>
            <div>
              <h3 className="font-semibold text-white text-base">Sauvegardes protégées ({protectedBackups.length})</h3>
              <p className="text-xs text-neutral-400">Jamais purgées par la rétention · {(protectedBytes / 1024).toFixed(0)} Ko au total.</p>
            </div>
          </div>
          <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden">
            {protectedBackups.length === 0 && <p className="p-4 text-xs text-neutral-500">Aucune sauvegarde protégée{isDemo ? " (démo)" : ""}. Protège un snapshot depuis la liste principale.</p>}
            {protectedBackups.map((b) => (
              <div key={b.backupId} className="p-3.5 flex items-center justify-between gap-3 hover:bg-neutral-800/30 transition-colors">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/discord/backups/${b.backupId}${guildQuery}`} className="font-semibold text-sm text-white hover:text-indigo-400 truncate">{b.name}</Link>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0"><Lock className="w-2.5 h-2.5" /> PROTÉGÉ</span>
                  </div>
                  <span className="text-xs text-neutral-500 block truncate">{new Date(b.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} · {(b.sizeBytes / 1024).toFixed(0)} Ko · {b.backupId}</span>
                </div>
                <button onClick={() => handleUnprotect(b)} className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0">
                  <Unlock className="w-3.5 h-3.5" /> Retirer
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
