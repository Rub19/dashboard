"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Clock,
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  ChevronDown,
  Repeat,
  Hash,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface ReminderRow {
  id: string;
  guildId: string;
  channelId: string;
  userId: string;
  message: string;
  remindAt: string;
  recurrence: "none" | "daily" | "weekly";
  delivered: boolean;
  deliveredCount: number;
  createdAt: string;
}

interface ReminderOverview {
  total: number;
  pending: number;
  recurring: number;
  delivered: number;
  nextDueAt: string | null;
}

interface GuildChannel {
  id: string;
  name: string;
}

function relative(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const label =
    mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} h` : `${Math.round(mins / 1440)} j`;
  return diff >= 0 ? `dans ${label}` : `il y a ${label}`;
}

export default function RemindersCenterClient() {
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
      const match = manageableGuilds.find((g) => g.id === queryGuildId);
      if (match) {
        setSelectedGuild(match);
        return;
      }
    }
    if (!selectedGuild) setSelectedGuild(manageableGuilds[0]);
  }, [manageableGuilds, queryGuildId, selectedGuild]);

  const [overview, setOverview] = useState<ReminderOverview | null>(null);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);

  // create form
  const [fChannel, setFChannel] = useState("");
  const [fDelay, setFDelay] = useState("2h");
  const [fMessage, setFMessage] = useState("");
  const [fRecurrence, setFRecurrence] = useState<"none" | "daily" | "weekly">("none");

  const load = useCallback(async () => {
    if (!selectedGuild) return;
    if (!BOT_API_URL) {
      setOffline(true);
      return;
    }
    setLoading(true);
    setOffline(false);
    try {
      const base = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/reminders`;
      const [ovRes, listRes, chRes] = await Promise.all([
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/list`, { credentials: "include" }),
        fetch(`${base}/channels`, { credentials: "include" }),
      ]);
      if (!ovRes.ok) throw new Error("overview");
      setOverview(await ovRes.json());
      if (listRes.ok) setReminders((await listRes.json()).reminders ?? []);
      if (chRes.ok) {
        const ch = (await chRes.json()).channels ?? [];
        setChannels(ch);
        if (!fChannel && ch[0]) setFChannel(ch[0].id);
      }
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [selectedGuild, fChannel]);

  useEffect(() => {
    setReminders([]);
    setOverview(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGuild]);

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  const handleCreate = async () => {
    if (!selectedGuild) return;
    if (!fChannel) return showError("Choisis un salon", "Où le rappel doit être posté.");
    if (!fMessage.trim()) return showError("Message vide", "Écris de quoi te rappeler.");
    if (!/\d+\s*(s|m|h|d|j|w)/i.test(fDelay)) return showError("Délai invalide", "Ex : 10m, 2h, 1d, 1h30m.");
    if (!BOT_API_URL) return success("Créé (mode démo)", "Le serveur du bot n'est pas joignable ici.");
    setSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ in: fDelay, message: fMessage, channelId: fChannel, recurrence: fRecurrence }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "");
      success("Rappel programmé", `Le bot te mentionnera dans #${channelName(fChannel)}.`);
      setFMessage("");
      load();
    } catch (e) {
      showError("Échec", e instanceof Error && e.message ? e.message : "Impossible de créer le rappel.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!selectedGuild || !BOT_API_URL) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/reminders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      success("Rappel annulé", "");
      load();
    } catch {
      showError("Échec", "Impossible d'annuler le rappel.");
    }
  };

  const pending = reminders.filter((r) => !r.delivered);

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-[var(--bg-main)] text-white">
      <div className="shrink-0 border-b border-white/10 bg-[var(--bg-surface-elevated)]/80 backdrop-blur-md px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <Link href="/discord" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors" title="Retour au hub Discord">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">Reminders</h1>
              <p className="text-xs text-white/40">« Rappelle-moi » — rappels personnels programmés</p>
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
            <span>
              Le serveur du bot n&apos;est pas joignable depuis cet environnement. Utilise{" "}
              <code className="rounded bg-black/30 px-1">/reminder add</code> sur Discord.
            </span>
          </div>
        )}

        {selectedGuild && (
          <>
            {overview && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "En attente", value: overview.pending },
                  { label: "Récurrents", value: overview.recurring },
                  { label: "Envoyés", value: overview.delivered },
                  { label: "Prochain", value: overview.nextDueAt ? relative(overview.nextDueAt) : "—" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                    <p className="text-[11px] text-zinc-400">{s.label}</p>
                    <p className="mt-1 text-lg font-bold text-white truncate">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Create */}
            <div className="rounded-2xl border border-[#5865F2]/30 bg-white/[0.02] p-4 sm:p-5 space-y-3">
              <p className="text-sm font-bold text-white flex items-center gap-2"><Plus className="h-4 w-4" />Nouveau rappel</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">Salon</label>
                  <select value={fChannel} onChange={(e) => setFChannel(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50 [&>option]:bg-[var(--bg-surface-elevated)]">
                    <option value="">—</option>
                    {channels.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">Délai</label>
                  <input value={fDelay} onChange={(e) => setFDelay(e.target.value)} placeholder="2h, 1d, 1h30m" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#5865F2]/50" />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">Récurrence</label>
                  <select value={fRecurrence} onChange={(e) => setFRecurrence(e.target.value as typeof fRecurrence)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50 [&>option]:bg-[var(--bg-surface-elevated)]">
                    <option value="none">Une fois</option>
                    <option value="daily">Tous les jours</option>
                    <option value="weekly">Toutes les semaines</option>
                  </select>
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <button onClick={handleCreate} disabled={saving} className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4752C4] transition-colors disabled:opacity-50 cursor-pointer">
                    {saving ? "…" : "Programmer"}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-zinc-400">Message ({fMessage.length}/1500)</label>
                <textarea value={fMessage} onChange={(e) => setFMessage(e.target.value.slice(0, 1500))} rows={2} placeholder="De quoi te rappeler ?" className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#5865F2]/50" />
              </div>
            </div>

            {/* List */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Rappels en attente ({pending.length})</p>
              </div>
              {pending.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-500">Aucun rappel en attente.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {pending.map((r) => (
                    <div key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">{relative(r.remindAt)}</span>
                          {r.recurrence !== "none" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-300"><Repeat className="h-3 w-3" />{r.recurrence === "daily" ? "quotidien" : "hebdo"}</span>
                          )}
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500"><Hash className="h-3 w-3" />{channelName(r.channelId)}</span>
                        </p>
                        <p className="mt-1 line-clamp-2 text-[12px] text-zinc-300">{r.message}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-600">par {r.userId === profile?.user?.id ? "toi" : `<@${r.userId}>`}</p>
                      </div>
                      <button onClick={() => handleCancel(r.id)} title="Annuler" className="shrink-0 self-start rounded-lg border border-white/10 bg-white/5 p-2 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-colors cursor-pointer">
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
