"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, GitCompare, PlusCircle, AlertCircle, MinusCircle, CheckCircle2, Users, FolderTree, Shield, Sparkles, ArrowRight, RefreshCw, Layers } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

// Mirrors BackupDiffResult / DiffItem in discord-bot/src/modules/backup/types/index.ts.
type DiffStatus = "ADDED" | "MODIFIED" | "REMOVED" | "UNCHANGED";
interface DiffChange { field: string; before: unknown; after: unknown }
interface DiffItem { id: string; name: string; type: string; status: DiffStatus; changes?: DiffChange[]; details?: string }
interface DiffResult {
  backupAId: string;
  backupAName: string;
  backupBId: string;
  backupBName: string;
  summary: { added: number; modified: number; removed: number; unchanged: number };
  roles: DiffItem[];
  channels: DiffItem[];
  categories: DiffItem[];
  permissions: DiffItem[];
  ethone: DiffItem[];
}
interface SnapshotRef { backupId: string; name: string; createdAt: string; type: string }

type Component = "ALL" | "ROLES" | "CATEGORIES" | "CHANNELS" | "PERMISSIONS" | "ETHONE";

function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function relative(iso: string): string {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export default function BackupCompareClient() {
  const searchParams = useSearchParams();
  const rawGuildId = searchParams.get("guildId");
  const { profile } = useDiscordOAuth();
  const { error: toastError } = useToast();

  const activeGuild = useMemo(() => {
    if (rawGuildId && profile?.guilds) {
      return profile.guilds.find((g) => g.id === rawGuildId) || profile.guilds[0];
    }
    return profile?.guilds?.[0] || null;
  }, [rawGuildId, profile?.guilds]);

  const currentGuildId = activeGuild?.id || "123456789012345678";
  const base = `${BOT_API_URL}/api/guilds/${currentGuildId}/backups`;
  const isRealGuild = Boolean(BOT_API_URL) && currentGuildId !== "123456789012345678";
  const guildQuery = activeGuild ? `?guildId=${activeGuild.id}` : "";

  const [snapshots, setSnapshots] = useState<SnapshotRef[]>([]);
  const [backupA, setBackupA] = useState(searchParams.get("backupA") || "");
  const [backupB, setBackupB] = useState(searchParams.get("backupB") || "LIVE");
  const [result, setResult] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "CHANGES_ONLY">("CHANGES_ONLY");
  const [componentFilter, setComponentFilter] = useState<Component>("ALL");

  useEffect(() => {
    if (!isRealGuild) return;
    let cancelled = false;
    setLoading(true);
    fetch(base, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list: SnapshotRef[] = Array.isArray(d?.backups) ? d.backups : [];
        setSnapshots(list);
        setBackupA((cur) => cur || list[0]?.backupId || "");
      })
      .catch(() => { if (!cancelled) setError("Impossible de charger la liste des sauvegardes."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [base, isRealGuild]);

  const compare = useCallback(async () => {
    if (!isRealGuild || !backupA || !backupB) return;
    if (backupA === backupB) {
      setError("Choisis deux sources différentes.");
      return;
    }
    setComparing(true);
    setError(null);
    try {
      const res = await fetch(`${base}/compare`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ backupAId: backupA, backupBId: backupB }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.summary) throw new Error(data?.error || "compare failed");
      setResult(data);
    } catch (e: any) {
      setResult(null);
      setError(e?.message || "Échec de la comparaison.");
      toastError(e?.message || "Échec de la comparaison.");
    } finally {
      setComparing(false);
    }
  }, [base, isRealGuild, backupA, backupB, toastError]);

  useEffect(() => {
    compare();
  }, [compare]);

  const items = useMemo(() => {
    if (!result) return [];
    const tag = (arr: DiffItem[], component: Component) => arr.map((i) => ({ ...i, component }));
    return [
      ...tag(result.roles, "ROLES"),
      ...tag(result.categories, "CATEGORIES"),
      ...tag(result.channels, "CHANNELS"),
      ...tag(result.permissions, "PERMISSIONS"),
      ...tag(result.ethone, "ETHONE"),
    ].filter((i) => (filterType === "ALL" || i.status !== "UNCHANGED") && (componentFilter === "ALL" || i.component === componentFilter));
  }, [result, filterType, componentFilter]);

  const options = [...snapshots.map((s) => ({ id: s.backupId, label: `${s.name} (${relative(s.createdAt)})` })), { id: "LIVE", label: "⚡ Serveur live actuel" }];

  const STATUS_BADGE: Record<DiffStatus, string> = {
    ADDED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    MODIFIED: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    REMOVED: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    UNCHANGED: "bg-neutral-800 text-neutral-400 border-neutral-700",
  };
  const STATUS_LABEL: Record<DiffStatus, string> = { ADDED: "🟢 AJOUTÉ", MODIFIED: "🟡 MODIFIÉ", REMOVED: "🔴 SUPPRIMÉ", UNCHANGED: "⚪ INCHANGÉ" };

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href={`/discord/backups${guildQuery}`} className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour aux sauvegardes
          </Link>
          <span className="text-xs text-neutral-500 flex items-center gap-1.5"><GitCompare className="w-3.5 h-3.5 text-indigo-400" /> Comparateur de diff</span>
        </div>

        {!isRealGuild && (
          <div className="bg-neutral-900 border border-amber-500/30 rounded-2xl p-6 text-xs text-amber-300">
            Connecte un serveur avec le bot pour comparer des snapshots (aucune donnée de démonstration ici — un diff inventé n'aurait aucun sens).
          </div>
        )}

        {isRealGuild && (
          <>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="w-full md:w-5/12 space-y-2">
                  <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">Source A (référence / passé)</label>
                  <select value={backupA} onChange={(e) => setBackupA(e.target.value)} disabled={loading} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                    {snapshots.length === 0 && <option value="">Aucune sauvegarde</option>}
                    {options.filter((o) => o.id !== "LIVE").map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
                <button onClick={compare} disabled={comparing} className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 text-indigo-400 hover:bg-neutral-700 cursor-pointer disabled:opacity-50" title="Relancer la comparaison">
                  {comparing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                </button>
                <div className="w-full md:w-5/12 space-y-2">
                  <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">Cible B (comparaison / présent)</label>
                  <select value={backupB} onChange={(e) => setBackupB(e.target.value)} disabled={loading} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                    {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-neutral-800">
                {[
                  { icon: PlusCircle, label: "Ajoutés", value: result ? `+${result.summary.added}` : "—", cls: "bg-emerald-500/10 border-emerald-500/20", txt: "text-emerald-400" },
                  { icon: AlertCircle, label: "Modifiés", value: result ? `~${result.summary.modified}` : "—", cls: "bg-amber-500/10 border-amber-500/20", txt: "text-amber-400" },
                  { icon: MinusCircle, label: "Supprimés", value: result ? `-${result.summary.removed}` : "—", cls: "bg-rose-500/10 border-rose-500/20", txt: "text-rose-400" },
                  { icon: CheckCircle2, label: "Identiques", value: result ? String(result.summary.unchanged) : "—", cls: "bg-neutral-950 border-neutral-800", txt: "text-neutral-300" },
                ].map((k) => {
                  const Icon = k.icon;
                  return (
                    <div key={k.label} className={cn("border rounded-xl p-3 flex items-center gap-3", k.cls)}>
                      <Icon className={cn("w-5 h-5 shrink-0", k.txt)} />
                      <div>
                        <span className="text-xs text-neutral-400">{k.label}</span>
                        <p className={cn("text-lg font-bold", k.txt)}>{k.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {result && <p className="text-[11px] text-neutral-500">{result.backupAName} → {result.backupBName}</p>}
              {error && <p className="text-xs text-rose-300">{error}</p>}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {([
                  ["ALL", "Tous", Layers], ["ROLES", "Rôles", Users], ["CATEGORIES", "Catégories", FolderTree], ["CHANNELS", "Salons", FolderTree], ["PERMISSIONS", "Permissions", Shield], ["ETHONE", "ETHONE", Sparkles],
                ] as [Component, string, typeof Users][]).map(([id, label, Icon]) => (
                  <button key={id} onClick={() => setComponentFilter(id)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer", componentFilter === id ? "bg-indigo-600 text-white" : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white")}>
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Affichage :</span>
                {([["CHANGES_ONLY", "Changements"], ["ALL", "Tout"]] as const).map(([id, label]) => (
                  <button key={id} onClick={() => setFilterType(id)} className={cn("px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer", filterType === id ? "bg-neutral-800 text-white border border-neutral-700" : "text-neutral-400 hover:text-white")}>{label}</button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {comparing && <p className="text-xs text-neutral-500">Comparaison en cours{backupB === "LIVE" ? " (capture du serveur live)" : ""}...</p>}
              {!comparing && result && items.length === 0 && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center text-xs text-neutral-500">
                  {filterType === "CHANGES_ONLY" ? "Aucune différence pour ce filtre — les deux sources sont identiques." : "Aucun élément."}
                </div>
              )}
              {items.map((item) => (
                <div key={`${item.component}-${item.id}`} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 transition-all hover:border-neutral-700 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-bold border", STATUS_BADGE[item.status])}>{STATUS_LABEL[item.status]}</span>
                      <span className="font-semibold text-white text-sm">{item.name}</span>
                      <span className="text-xs text-neutral-500">({item.type})</span>
                    </div>
                    {item.details && <span className="text-xs text-neutral-400">{item.details}</span>}
                  </div>
                  {item.status === "MODIFIED" && item.changes && item.changes.length > 0 && (
                    <div className="space-y-1.5 pt-2 text-xs">
                      {item.changes.map((c, i) => (
                        <div key={i} className="grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] gap-2 items-start">
                          <span className="text-neutral-500 font-medium font-mono">{c.field}</span>
                          <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800/80 text-neutral-300 break-all">{fmtValue(c.before)}</div>
                          <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800/80 text-indigo-300 font-medium break-all">{fmtValue(c.after)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
