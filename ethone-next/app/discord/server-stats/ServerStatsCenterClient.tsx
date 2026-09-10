"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3, ArrowLeft, RefreshCw, Save, ChevronDown, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

const STAT_TYPES = [
  { value: "members", label: "Membres" },
  { value: "humans", label: "Humains" },
  { value: "bots", label: "Bots" },
  { value: "online", label: "En ligne" },
  { value: "boosts", label: "Boosts" },
  { value: "boostTier", label: "Niveau de boost" },
  { value: "roles", label: "Rôles" },
  { value: "channels", label: "Salons" },
  { value: "roleMembers", label: "Membres d'un rôle" },
] as const;

interface StatChannelRow {
  channelId: string;
  type: string;
  template: string;
  roleId: string | null;
  lastValue: number | null;
}

interface Overview {
  enabled: boolean;
  updateIntervalMinutes: number;
  channels: StatChannelRow[];
}

interface Target {
  id: string;
  name: string;
  type?: string;
}

export default function ServerStatsCenterClient() {
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const { profile, loading: discordLoading } = useDiscordOAuth();

  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (!profile?.guilds) return [];
    return profile.guilds.filter((g) => {
      if (g.owner) return true;
      if (!g.permissions) return false;
      const num = Number(g.permissions);
      return (num & 8) === 8 || (num & 32) === 32;
    });
  }, [profile?.guilds]);

  const queryGuildId = searchParams.get("guildId");
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (queryGuildId) {
      const m = manageableGuilds.find((g) => g.id === queryGuildId);
      if (m) {
        setSelectedGuild(m);
        return;
      }
    }
    if (!selectedGuild) setSelectedGuild(manageableGuilds[0]);
  }, [manageableGuilds, queryGuildId, selectedGuild]);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [channels, setChannels] = useState<Target[]>([]);
  const [roles, setRoles] = useState<Target[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [interval, setIntervalMin] = useState(15);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);

  // add form
  const [fChannel, setFChannel] = useState("");
  const [fType, setFType] = useState<string>("members");
  const [fTemplate, setFTemplate] = useState("👥 {count} membres");
  const [fRole, setFRole] = useState("");

  const load = useCallback(async () => {
    if (!selectedGuild) return;
    if (!BOT_API_URL) {
      setOffline(true);
      return;
    }
    setLoading(true);
    setOffline(false);
    try {
      const base = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/server-stats`;
      const [ovRes, tRes] = await Promise.all([
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/targets`, { credentials: "include" }),
      ]);
      if (!ovRes.ok) throw new Error("overview");
      const ov = await ovRes.json();
      setOverview(ov);
      setEnabled(ov.enabled);
      setIntervalMin(ov.updateIntervalMinutes);
      if (tRes.ok) {
        const t = await tRes.json();
        setChannels(t.channels ?? []);
        setRoles(t.roles ?? []);
      }
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [selectedGuild]);

  useEffect(() => {
    load();
  }, [load]);

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;
  const roleName = (id: string | null) => (id ? roles.find((r) => r.id === id)?.name ?? id : "");
  const usedChannels = new Set(overview?.channels.map((c) => c.channelId) ?? []);

  const saveConfig = async () => {
    if (!selectedGuild || !BOT_API_URL) return success("Enregistré (mode démo)", "");
    setSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/server-stats/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled, updateIntervalMinutes: interval }),
      });
      if (!res.ok) throw new Error();
      success("Réglages enregistrés", "");
      load();
    } catch {
      showError("Échec", "Impossible d'enregistrer.");
    } finally {
      setSaving(false);
    }
  };

  const addChannel = async () => {
    if (!selectedGuild) return;
    if (!fChannel) return showError("Choisis un salon", "Un salon vocal verrouillé est idéal.");
    if (fType === "roleMembers" && !fRole) return showError("Rôle requis", "Le type « Membres d'un rôle » a besoin d'un rôle.");
    if (!BOT_API_URL) return success("Ajouté (mode démo)", "");
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/server-stats/channels/${fChannel}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: fType, template: fTemplate, roleId: fType === "roleMembers" ? fRole : null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "");
      success("Salon compteur ajouté", `#${channelName(fChannel)} sera renommé toutes les ${interval} min.`);
      load();
    } catch (e) {
      showError("Échec", e instanceof Error && e.message ? e.message : "Impossible d'ajouter.");
    }
  };

  const removeChannel = async (channelId: string) => {
    if (!selectedGuild || !BOT_API_URL) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/server-stats/channels/${channelId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      success("Retiré", "");
      load();
    } catch {
      showError("Échec", "");
    }
  };

  const refreshNow = async () => {
    if (!selectedGuild || !BOT_API_URL) return;
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/server-stats/refresh`, { method: "POST", credentials: "include" });
      success("Compteurs rafraîchis", "");
      setTimeout(load, 1500);
    } catch {
      showError("Échec", "");
    }
  };

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-[var(--bg-main)] text-white">
      <div className="shrink-0 border-b border-white/10 bg-[var(--bg-surface-elevated)]/80 backdrop-blur-md px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <Link href="/discord" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors" title="Retour au hub Discord">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">Server Stats</h1>
              <p className="text-xs text-white/40">Salons compteurs : membres, boosts, en ligne…</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {manageableGuilds.length > 0 ? (
            <div className="relative">
              <select
                value={selectedGuild?.id || ""}
                onChange={(e) => {
                  const g = manageableGuilds.find((item) => item.id === e.target.value);
                  if (g) setSelectedGuild(g);
                }}
                className="appearance-none bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-white/90 focus:outline-none focus:border-[#5865F2]/50 hover:bg-white/[0.07] transition-all cursor-pointer"
              >
                {manageableGuilds.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[var(--bg-surface-elevated)] text-white">{g.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <span className="text-xs text-white/40">Aucun serveur administrable</span>
          )}
          <button onClick={load} className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-colors" title="Rafraîchir">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto os-scroll px-4 sm:px-6 py-6 pb-36 space-y-6 [overscroll-behavior:contain]">
        {!discordLoading && manageableGuilds.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-zinc-400">
            Connectez un serveur Discord où vous êtes administrateur.
          </div>
        )}

        {offline && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Le serveur du bot n&apos;est pas joignable ici. Utilise <code className="rounded bg-black/30 px-1">/serverstats add</code> sur Discord.</span>
          </div>
        )}

        {selectedGuild && (
          <>
            {/* Config */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => setEnabled((v) => !v)}
                className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", enabled ? "bg-emerald-500" : "bg-white/20")}
              >
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform", enabled ? "translate-x-5" : "translate-x-0.5")} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Module {enabled ? "actif" : "désactivé"}</p>
                <p className="text-xs text-white/50">Rafraîchissement toutes les {interval} min (Discord limite les renommages à 2 / 10 min).</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="range" min={10} max={60} value={interval} onChange={(e) => setIntervalMin(Number(e.target.value))} className="w-28 accent-[#5865F2]" />
                <span className="text-xs font-mono text-zinc-300 w-10">{interval}m</span>
                <button onClick={saveConfig} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-[#5865F2] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4752C4] transition-colors disabled:opacity-50 cursor-pointer">
                  <Save className="h-3.5 w-3.5" />{saving ? "…" : "OK"}
                </button>
              </div>
            </div>

            {/* Add */}
            <div className="rounded-2xl border border-[#5865F2]/30 bg-white/[0.02] p-4 sm:p-5 space-y-3">
              <p className="text-sm font-bold text-white flex items-center gap-2"><Plus className="h-4 w-4" />Nouveau compteur</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">Salon</label>
                  <select value={fChannel} onChange={(e) => setFChannel(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50 [&>option]:bg-[var(--bg-surface-elevated)]">
                    <option value="">— Choisir —</option>
                    {channels.filter((c) => !usedChannels.has(c.id)).map((c) => (
                      <option key={c.id} value={c.id}>{c.type === "voice" ? "🔊 " : c.type === "stage" ? "🎙️ " : "# "}{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">Statistique</label>
                  <select value={fType} onChange={(e) => setFType(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50 [&>option]:bg-[var(--bg-surface-elevated)]">
                    {STAT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                {fType === "roleMembers" && (
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-zinc-400">Rôle</label>
                    <select value={fRole} onChange={(e) => setFRole(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50 [&>option]:bg-[var(--bg-surface-elevated)]">
                      <option value="">— Choisir —</option>
                      {roles.map((r) => <option key={r.id} value={r.id}>@{r.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-zinc-400">Format — <code className="rounded bg-black/30 px-1">{"{count}"}</code> = la valeur</label>
                <div className="flex gap-2">
                  <input value={fTemplate} onChange={(e) => setFTemplate(e.target.value.slice(0, 80))} placeholder="👥 {count} membres" className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#5865F2]/50" />
                  <button onClick={addChannel} className="inline-flex items-center gap-1.5 rounded-xl bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4752C4] transition-colors cursor-pointer">Ajouter</button>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Compteurs ({overview?.channels.length ?? 0})</p>
                {overview && overview.channels.length > 0 && (
                  <button onClick={refreshNow} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-white/10 transition-colors cursor-pointer">
                    <RefreshCw className="h-3 w-3" /> Rafraîchir maintenant
                  </button>
                )}
              </div>
              {!overview || overview.channels.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-500">Aucun salon compteur.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {overview.channels.map((c) => (
                    <div key={c.channelId} className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          {STAT_TYPES.find((t) => t.value === c.type)?.label ?? c.type}
                          {c.roleId && <span className="ml-1 text-[11px] font-normal text-zinc-500">@{roleName(c.roleId)}</span>}
                          {c.lastValue !== null && <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono">{c.lastValue}</span>}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-400">#{channelName(c.channelId)} · <code className="text-zinc-500">{c.template}</code></p>
                      </div>
                      <button onClick={() => removeChannel(c.channelId)} title="Retirer" className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-colors cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
