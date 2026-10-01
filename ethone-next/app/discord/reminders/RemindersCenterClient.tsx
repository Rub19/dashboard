"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Select from "@/components/ui/Select";
import {
  Clock,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  Repeat,
  Hash,
  Bot,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { cn } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { errorReason } from "@/lib/format-error";
import { formatApiError } from "@/lib/format-error";

import ModulePageTitle from "@/components/discord/ModulePageTitle";
const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
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
  type?: number;
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
  const allGuilds: DiscordGuild[] = useMemo(() => {
    if (profile?.guilds && profile.guilds.length > 0) return profile.guilds;
    return getStoredDiscordGuilds();
  }, [profile?.guilds]);

  const botGuildIds = useBotGuildIds(allGuilds);

  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (allGuilds.length === 0) return [];
    const manageable = allGuilds.filter((g) => canManageGuild(g) || (botGuildIds && botGuildIds.includes(g.id)));
    return manageable.length > 0 ? manageable : allGuilds;
  }, [allGuilds, botGuildIds]);

  // Le paramètre d'URL n'est appliqué qu'une fois par valeur : sinon il annule le choix fait dans le sélecteur.
  const appliedQueryGuild = useRef<string | null>(null);
  const userSelectedRef = useRef(false);
  const queryGuildId = searchParams.get("guildId");
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (queryGuildId && appliedQueryGuild.current !== queryGuildId) {
      const match = manageableGuilds.find((g) => g.id === queryGuildId);
      if (match) {
        appliedQueryGuild.current = queryGuildId;
        setSelectedGuild(match);
        return;
      }
    }
    if (!userSelectedRef.current && !queryGuildId) {
      if (!selectedGuild) {
        if (botGuildIds !== null) {
          setSelectedGuild(pickBotGuild(manageableGuilds, botGuildIds)!);
        }
      } else if (botGuildIds && botGuildIds.length > 0 && !botGuildIds.includes(selectedGuild.id)) {
        const botGuild = pickBotGuild(manageableGuilds, botGuildIds);
        if (botGuild && botGuild.id !== selectedGuild.id && botGuildIds.includes(botGuild.id)) {
          setSelectedGuild(botGuild);
        }
      }
    }
  }, [manageableGuilds, queryGuildId, selectedGuild, botGuildIds]);

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

    // Si le bot n'est pas installé sur ce serveur
    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      setOffline(false);
      setOverview(null);
      setReminders([]);
      setChannels([]);
      return;
    }

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
  }, [selectedGuild, fChannel, botGuildIds]);

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
    if (!BOT_API_URL) return showError("Bot injoignable", "Rien n'a été enregistré.");
    setSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ in: fDelay, message: fMessage, channelId: fChannel, recurrence: fRecurrence }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.error, ""));
      success("Rappel programmé", `Le bot te mentionnera dans #${channelName(fChannel)}.`);
      setFMessage("");
      load();
    } catch (e) {
      showError("Échec", errorReason(e, "Impossible de créer le rappel."));
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
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(formatApiError(errBody?.error, ""));
      }
      success("Rappel annulé", "");
      load();
    } catch (err) {
      showError("Échec", errorReason(err, "Impossible d'annuler le rappel."));
    }
  };

  const pending = reminders.filter((r) => !r.delivered);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 text-[var(--text-primary)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ModulePageTitle icon={<Clock />} title="Reminders" subtitle="« Rappelle-moi » — rappels personnels programmés" />
        </div>

        <div className="flex items-center gap-2.5">
          {manageableGuilds.length > 0 ? (
            <GuildSelector
              guilds={manageableGuilds}
              value={selectedGuild?.id || ""}
              onChange={(g) => {
                userSelectedRef.current = true;
                setSelectedGuild(g);
              }}
            />
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Aucun serveur administrable</span>
          )}
          <button onClick={load} className="p-2 rounded-xl bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Rafraîchir">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {!discordLoading && manageableGuilds.length === 0 && (
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 text-center text-sm text-[var(--text-muted)]">
            Connectez un serveur Discord où vous êtes administrateur.
          </div>
        )}

        {selectedGuild && botGuildIds !== null && !botGuildIds.includes(selectedGuild.id) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-300 shrink-0 mt-0.5">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)] text-sm">Le bot ETHONE n&apos;est pas installé sur ce serveur</p>
                <p className="mt-0.5 text-[var(--text-muted)]">
                  Invitez le bot sur « {selectedGuild.name} » pour recevoir et gérer vos rappels sur Discord.
                </p>
              </div>
            </div>
            <a
              href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
            >
              Inviter le bot
            </a>
          </div>
        )}

        {offline && selectedGuild && (botGuildIds === null || botGuildIds.includes(selectedGuild.id)) && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Mode hors-ligne : le serveur du bot n&apos;est pas joignable depuis cet environnement. Utilise{" "}
              <code className="rounded bg-[var(--surface-raised)]/40 px-1">/reminder add</code> sur Discord.
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
                  <div key={s.label} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5">
                    <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
                    <p className="mt-1 text-lg font-bold text-[var(--text-primary)] truncate">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Create */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 sm:p-5 space-y-3">
              <p className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><Plus className="h-4 w-4" />Nouveau rappel</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Salon</label>
                  <ChannelPicker
                    value={fChannel}
                    onChange={(id) => setFChannel(id)}
                    channels={channels}
                    guildId={selectedGuild?.id}
                    placeholder="Sélectionner ou ID..."
                    allowClear
                    emptyLabel="— Choisir un salon —"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Délai</label>
                  <input value={fDelay} onChange={(e) => setFDelay(e.target.value)} placeholder="2h, 1d, 1h30m" className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-[var(--input-border-hover)]" />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Récurrence</label>
                  <Select
                    value={fRecurrence}
                    onChange={(v) => setFRecurrence(v as typeof fRecurrence)}
                    options={[
                      { id: "none", label: "Une fois" },
                      { id: "daily", label: "Tous les jours" },
                      { id: "weekly", label: "Toutes les semaines" },
                    ]}
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <button onClick={handleCreate} disabled={saving} className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 h-9 text-sm font-semibold text-[var(--accent-contrast)] hover:brightness-110 disabled:opacity-50 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50">
                    {saving ? "…" : "Programmer"}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Message ({fMessage.length}/1500)</label>
                <textarea value={fMessage} onChange={(e) => setFMessage(e.target.value.slice(0, 1500))} rows={2} placeholder="De quoi te rappeler ?" className="w-full resize-y rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-[var(--input-border-hover)]" />
              </div>
            </div>

            {/* List */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 overflow-hidden">
              <div className="border-b border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Rappels en attente ({pending.length})</p>
              </div>
              {pending.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Aucun rappel en attente.</p>
              ) : (
                <div className="divide-y divide-[var(--panel-border)]">
                  {pending.map((r) => (
                    <div key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-bold text-amber-300">{relative(r.remindAt)}</span>
                          {r.recurrence !== "none" && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300"><Repeat className="h-3 w-3" />{r.recurrence === "daily" ? "quotidien" : "hebdo"}</span>
                          )}
                          <span className="inline-flex items-center gap-0.5 text-xs text-[var(--text-muted)]"><Hash className="h-3 w-3" />{channelName(r.channelId)}</span>
                        </p>
                        <p className="mt-1 line-clamp-2 text-[12px] text-[var(--text-muted)]">{r.message}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">par {r.userId === profile?.user?.id ? "toi" : `<@${r.userId}>`}</p>
                      </div>
                      <button onClick={() => handleCancel(r.id)} title="Annuler" className="shrink-0 self-start rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-2 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-colors cursor-pointer">
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
