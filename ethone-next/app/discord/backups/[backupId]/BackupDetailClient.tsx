"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePathSegment } from "@/lib/hooks/usePathSegment";
import { ArrowLeft, ShieldCheck, Download, RotateCcw, GitCompare, Lock, Unlock, CheckCircle2, AlertTriangle, FileCode, FolderTree, Users, Shield, Sparkles, Copy, Check, Server, Hash, Volume2, Calendar, RefreshCw } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

// Mirrors BackupSnapshot in discord-bot/src/modules/backup/types/index.ts.
interface Overwrite { id: string; targetName?: string; type: "role" | "member"; allow: string; deny: string }
interface Snapshot {
  backupId: string;
  guildId: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: { id: string; tag: string; avatar?: string };
  type: string;
  status: string;
  isProtected: boolean;
  sizeBytes: number;
  checksum: string;
  schemaVersion: number;
  includedComponents: string[];
  objectCounts: { categories: number; channels: number; roles: number; permissions: number; emojis: number; ethoneModules: number };
  data: {
    guild: Record<string, unknown>;
    roles: { id: string; name: string; color: number; hoist: boolean; position: number; permissions: string; mentionable: boolean; managed: boolean; isEveryone?: boolean }[];
    categories: { id: string; name: string; position: number; permissionOverwrites: Overwrite[] }[];
    channels: { id: string; name: string; type: number; typeName?: string; topic?: string | null; parentId?: string | null; parentName?: string | null; position: number; rateLimitPerUser?: number; bitrate?: number; userLimit?: number; permissionOverwrites: Overwrite[] }[];
    emojis?: { id: string; name: string }[];
    ethoneConfig?: Record<string, unknown>;
  };
}
interface Integrity { valid: boolean; computedChecksum: string; expectedChecksum: string; schemaValid: boolean; reason?: string }

const VOICE_TYPES = new Set([2, 13]);
const GUILD_LABELS: Record<string, string> = {
  name: "Nom", description: "Description", afkChannelId: "Salon AFK", afkTimeout: "Délai AFK (s)", systemChannelId: "Salon système",
  defaultMessageNotifications: "Notifications par défaut", explicitContentFilter: "Filtre de contenu", verificationLevel: "Niveau de vérification", icon: "Icône",
};

function roleColor(c: number): string {
  return c ? `#${c.toString(16).padStart(6, "0")}` : "#99aab5";
}

export default function BackupDetailClient() {
  const searchParams = useSearchParams();
  const backupId = usePathSegment("backups");
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
  const guildAmp = activeGuild ? `&guildId=${activeGuild.id}` : "";

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [integrity, setIntegrity] = useState<Integrity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"channels" | "roles" | "permissions" | "server" | "ethone" | "raw">("channels");

  const load = useCallback(async () => {
    if (!isRealGuild || !backupId) {
      setLoading(false);
      setError(isRealGuild ? "Identifiant de sauvegarde manquant." : "Connecte un serveur avec le bot pour consulter un snapshot.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${base}/${backupId}`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.snapshot) throw new Error(data?.error || "Sauvegarde introuvable");
      setSnapshot(data.snapshot);
      setIntegrity(data.integrity || null);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger la sauvegarde.");
    } finally {
      setLoading(false);
    }
  }, [base, backupId, isRealGuild]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleProtect = async () => {
    if (!snapshot) return;
    const next = !snapshot.isProtected;
    setSnapshot({ ...snapshot, isProtected: next });
    try {
      const res = await fetch(`${base}/${snapshot.backupId}/protect`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ isProtected: next }) });
      if (!res.ok) throw new Error();
      success(next ? "Snapshot protégé." : "Protection retirée.");
    } catch {
      setSnapshot({ ...snapshot, isProtected: !next });
      toastError("Échec du changement de protection.");
    }
  };

  const copyChecksum = () => {
    if (!snapshot) return;
    navigator.clipboard.writeText(snapshot.checksum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const permissionRows = useMemo(() => {
    if (!snapshot) return [];
    const rows: { channel: string; ow: Overwrite }[] = [];
    for (const c of snapshot.data.categories) for (const ow of c.permissionOverwrites || []) rows.push({ channel: `📁 ${c.name}`, ow });
    for (const c of snapshot.data.channels) for (const ow of c.permissionOverwrites || []) rows.push({ channel: `${VOICE_TYPES.has(c.type) ? "🔊" : "#"}${c.name}`, ow });
    return rows;
  }, [snapshot]);

  const ethoneModules = useMemo(() => Object.entries(snapshot?.data.ethoneConfig || {}), [snapshot]);
  const orphanChannels = useMemo(() => (snapshot?.data.channels || []).filter((c) => !c.parentId && c.type !== 4), [snapshot]);

  if (loading) {
    return <div className="h-full flex items-center justify-center text-xs text-neutral-400"><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Chargement du snapshot...</div>;
  }
  if (error || !snapshot) {
    return (
      <div className="h-full bg-[var(--bg-main)] p-8">
        <Link href={`/discord/backups${guildQuery}`} className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white"><ArrowLeft className="w-4 h-4" /> Retour aux sauvegardes</Link>
        <div className="mt-6 bg-neutral-900 border border-rose-500/30 rounded-2xl p-6 text-xs text-rose-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>
      </div>
    );
  }

  const valid = integrity?.valid ?? snapshot.status === "COMPLETED";

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href={`/discord/backups${guildQuery}`} className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> Retour aux sauvegardes</Link>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={toggleProtect} className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer", snapshot.isProtected ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20" : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white")}>
              {snapshot.isProtected ? <><Lock className="w-3.5 h-3.5" /> Protégé</> : <><Unlock className="w-3.5 h-3.5" /> Non protégé</>}
            </button>
            <a href={`${base}/${snapshot.backupId}/download`} className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-medium text-neutral-300 flex items-center gap-1.5 transition-colors">
              <Download className="w-3.5 h-3.5" /> Télécharger .ethone-backup
            </a>
            <Link href={`/discord/backups/compare?backupA=${snapshot.backupId}&backupB=LIVE${guildAmp}`} className="px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-medium text-indigo-300 flex items-center gap-1.5 transition-colors">
              <GitCompare className="w-3.5 h-3.5" /> Comparer avec le live
            </Link>
            <Link href={`/discord/backups${guildQuery}`} className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all">
              <RotateCcw className="w-3.5 h-3.5" /> Restaurer (depuis la liste)
            </Link>
          </div>
        </div>

        {/* En-tête */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">{snapshot.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">{snapshot.type}</span>
                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1", valid ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30")}>
                  {valid ? <><CheckCircle2 className="w-3 h-3" /> Intégrité vérifiée</> : <><AlertTriangle className="w-3 h-3" /> {integrity?.reason || "Intégrité invalide"}</>}
                </span>
              </div>
              {snapshot.description && <p className="text-sm text-neutral-400">{snapshot.description}</p>}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400 pt-1">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-neutral-500" />{new Date(snapshot.createdAt).toLocaleString("fr-FR")}</span>
                <span>Créé par <strong className="text-neutral-200">{snapshot.createdBy.tag}</strong></span>
                <span>Taille <strong className="text-neutral-200">{(snapshot.sizeBytes / 1024).toFixed(0)} Ko</strong></span>
                <span>Schéma v{snapshot.schemaVersion}</span>
                <span>{snapshot.includedComponents.length} composant(s)</span>
              </div>
            </div>
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3 w-full md:max-w-md space-y-1 shrink-0">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1 text-emerald-400 font-medium"><ShieldCheck className="w-3.5 h-3.5" /> SHA-256</span>
                <button onClick={copyChecksum} className="text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer">
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}{copied ? "Copié" : "Copier"}
                </button>
              </div>
              <p className="font-mono text-[11px] text-neutral-300 truncate">{snapshot.checksum}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6 pt-6 border-t border-neutral-800/80">
            {[
              ["Catégories", snapshot.objectCounts.categories, "text-white"], ["Salons", snapshot.objectCounts.channels, "text-indigo-400"], ["Rôles", snapshot.objectCounts.roles, "text-amber-400"],
              ["Permissions", snapshot.objectCounts.permissions, "text-rose-400"], ["Emojis", snapshot.objectCounts.emojis, "text-teal-400"], ["Modules ETHONE", snapshot.objectCounts.ethoneModules, "text-emerald-400"],
            ].map(([l, v, c]) => (
              <div key={String(l)} className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/50">
                <span className="text-xs text-neutral-500">{l}</span>
                <p className={cn("text-lg font-bold", String(c))}>{v as number}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: "channels", label: `Salons (${snapshot.data.channels.length})`, icon: FolderTree, c: "text-indigo-400" },
            { id: "roles", label: `Rôles (${snapshot.data.roles.length})`, icon: Users, c: "text-amber-400" },
            { id: "permissions", label: `Permissions (${permissionRows.length})`, icon: Shield, c: "text-rose-400" },
            { id: "server", label: "Serveur", icon: Server, c: "text-cyan-400" },
            { id: "ethone", label: `Modules ETHONE (${ethoneModules.length})`, icon: Sparkles, c: "text-emerald-400" },
            { id: "raw", label: "JSON", icon: FileCode, c: "text-neutral-400" },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)} className={cn("px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer", activeTab === t.id ? "bg-neutral-900 text-white border-b-2 border-indigo-500" : "text-neutral-400 hover:text-white")}>
                <Icon className={cn("w-4 h-4", t.c)} /> {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === "channels" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Arborescence sauvegardée</h3>
            {[...snapshot.data.categories].sort((a, b) => a.position - b.position).map((cat) => (
              <div key={cat.id} className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40">
                <div className="px-4 py-2.5 bg-neutral-900/80 border-b border-neutral-800 flex items-center justify-between text-xs font-bold text-neutral-300">
                  <span className="flex items-center gap-2"><FolderTree className="w-3.5 h-3.5 text-indigo-400" />{cat.name}</span>
                  <span className="text-neutral-500">#{cat.position}</span>
                </div>
                <div className="divide-y divide-neutral-800/40">
                  {snapshot.data.channels.filter((c) => c.parentId === cat.id).sort((a, b) => a.position - b.position).map((chan) => <ChannelRow key={chan.id} chan={chan} />)}
                </div>
              </div>
            ))}
            {orphanChannels.length > 0 && (
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40">
                <div className="px-4 py-2.5 bg-neutral-900/80 border-b border-neutral-800 text-xs font-bold text-neutral-400">Sans catégorie</div>
                <div className="divide-y divide-neutral-800/40">{orphanChannels.map((chan) => <ChannelRow key={chan.id} chan={chan} />)}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === "roles" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Hiérarchie des rôles</h3>
            <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden">
              {[...snapshot.data.roles].sort((a, b) => b.position - a.position).map((role) => (
                <div key={role.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-neutral-800/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: roleColor(role.color) }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{role.isEveryone ? "@everyone" : role.name}</span>
                        {role.hoist && <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400">Affiché séparément</span>}
                        {role.mentionable && <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400">Mentionnable</span>}
                        {role.managed && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400">Géré par intégration</span>}
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5 font-mono">position {role.position} · permissions {role.permissions}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-neutral-500">{roleColor(role.color)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "permissions" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Overwrites de permissions</h3>
            {permissionRows.length === 0 && <p className="text-xs text-neutral-500">Aucun overwrite dans ce snapshot.</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {permissionRows.map(({ channel, ow }, i) => (
                <div key={`${channel}-${ow.id}-${i}`} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-white">
                    <span className="text-indigo-400 truncate">{channel}</span>
                    <span className="font-normal text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 shrink-0">{ow.type === "role" ? "@" : "👤 "}{ow.targetName || ow.id}</span>
                  </div>
                  <div className="font-mono text-[11px] text-neutral-400 space-y-0.5">
                    <p><span className="text-emerald-400">allow</span> {ow.allow}</p>
                    <p><span className="text-rose-400">deny</span> {ow.deny}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "server" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Configuration serveur</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(snapshot.data.guild).map(([key, value]) => (
                <div key={key} className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex items-center justify-between gap-3">
                  <span className="text-sm text-neutral-400">{GUILD_LABELS[key] || key}</span>
                  <span className="text-sm font-semibold text-white truncate max-w-[60%] text-right">{value === null || value === undefined || value === "" ? "—" : String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "ethone" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-white">Configurations des modules ETHONE</h3>
              <p className="text-xs text-neutral-400">Restaurables indépendamment de la structure Discord.</p>
            </div>
            {ethoneModules.length === 0 && <p className="text-xs text-neutral-500">Aucune configuration ETHONE incluse dans ce snapshot.</p>}
            <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden">
              {ethoneModules.map(([mod, cfg]) => (
                <details key={mod} className="group">
                  <summary className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-800/30 text-sm">
                    <span className="font-semibold text-white">{mod}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{cfg && typeof cfg === "object" ? `${Object.keys(cfg as object).length} clé(s)` : "valeur"}</span>
                  </summary>
                  <pre className="px-4 pb-4 text-[11px] font-mono text-neutral-400 overflow-x-auto max-h-64">{JSON.stringify(cfg, null, 2)}</pre>
                </details>
              ))}
            </div>
          </div>
        )}

        {activeTab === "raw" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Fichier JSON canonique</h3>
              <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2)); success("JSON copié."); }} className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs text-neutral-300 transition-colors cursor-pointer">Copier tout</button>
            </div>
            <pre className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs font-mono text-neutral-300 max-h-96 overflow-auto">{JSON.stringify(snapshot, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelRow({ chan }: { chan: Snapshot["data"]["channels"][number] }) {
  const voice = VOICE_TYPES.has(chan.type);
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-neutral-900/40 text-sm transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {voice ? <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <Hash className="w-4 h-4 text-neutral-400 shrink-0" />}
        <span className="font-medium text-white truncate">{chan.name}</span>
        {chan.topic && <span className="text-xs text-neutral-500 truncate hidden sm:inline">— {chan.topic}</span>}
      </div>
      <div className="flex items-center gap-2 text-xs text-neutral-400 shrink-0">
        {chan.typeName && <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-500">{chan.typeName}</span>}
        {(chan.rateLimitPerUser || 0) > 0 && <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">Slowmode {chan.rateLimitPerUser}s</span>}
        {chan.bitrate && <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">{Math.round(chan.bitrate / 1000)} kbps</span>}
        {chan.userLimit ? <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">Limite {chan.userLimit}</span> : null}
      </div>
    </div>
  );
}
