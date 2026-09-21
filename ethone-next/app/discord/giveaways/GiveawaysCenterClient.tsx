"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Gift,
  Sparkles,
  Trophy,
  Clock,
  Users,
  RefreshCw,
  Plus,
  ShieldCheck,
  Send,
  Crown,
  Dice5,
  Eye,
  X,
  Ban,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { GuildSelector } from "@/components/GuildSelector";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

// Mirrors discord-bot/src/modules/giveaways/types/giveaway.ts's Giveaway/GiveawayRequirements/GiveawayParticipant —
// this dashboard reads and writes the real backend shape, not a made-up one.
type GiveawayStatus = "scheduled" | "active" | "paused" | "ended" | "cancelled";

interface GiveawayRequirements {
  requiredRoleIds: string[];
  roleMode: "all" | "any";
  excludedRoleIds: string[];
  minAccountAgeDays: number;
  minLevel: number;
}

interface GiveawayParticipant {
  userId: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: string;
  isEligible: boolean;
}

interface Giveaway {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string | null;
  prize: string;
  description: string;
  winnerCount: number;
  rewardRoleId: string | null;
  bannerUrl: string | null;
  status: GiveawayStatus;
  createdAt: string;
  endsAt: string;
  hostedById: string;
  hostedByTag: string;
  requirements: GiveawayRequirements;
  participants: GiveawayParticipant[];
  winnerIds: string[];
  requireClaim: boolean;
  claimTimeoutHours: number;
}

interface GiveawayOverview {
  activeCount: number;
  endedCount: number;
  totalParticipants: number;
  totalWinners: number;
}

interface GuildChannel {
  id: string;
  name: string;
}

interface GuildRole {
  id: string;
  name: string;
  color: string;
}

function relativeEndsAt(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Terminé";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `Dans ${mins} min`;
  if (mins < 1440) return `Dans ${Math.round(mins / 60)} h`;
  return `Dans ${Math.round(mins / 1440)} j`;
}

function winnerNames(gw: Giveaway): string[] {
  return gw.winnerIds.map((id) => gw.participants.find((p) => p.userId === id)?.username || id);
}

export default function GiveawaysCenterClient() {
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const { profile } = useDiscordOAuth();
  const botGuildIds = useBotGuildIds(profile?.guilds);

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
    if (!selectedGuild && botGuildIds !== null) setSelectedGuild(pickBotGuild(manageableGuilds, botGuildIds)!);
  }, [manageableGuilds, queryGuildId, selectedGuild, botGuildIds]);

  const [activeTab, setActiveTab] = useState<"active" | "create" | "history" | "fairness">("active");
  const [overview, setOverview] = useState<GiveawayOverview | null>(null);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    if (!selectedGuild) return;
    if (!BOT_API_URL) {
      setOffline(true);
      return;
    }
    setLoading(true);
    setOffline(false);
    try {
      const base = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/giveaways`;
      const [ovRes, listRes, chRes, roleRes] = await Promise.all([
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/list`, { credentials: "include" }),
        fetch(`${base}/channels`, { credentials: "include" }),
        fetch(`${base}/roles`, { credentials: "include" }),
      ]);
      if (!ovRes.ok) throw new Error("overview");
      setOverview(await ovRes.json());
      if (listRes.ok) setGiveaways((await listRes.json()).giveaways ?? []);
      if (chRes.ok) setChannels((await chRes.json()).channels ?? []);
      if (roleRes.ok) setRoles((await roleRes.json()).roles ?? []);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [selectedGuild]);

  useEffect(() => {
    setGiveaways([]);
    setOverview(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGuild]);

  // Create form state
  const [formPrize, setFormPrize] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formChannelId, setFormChannelId] = useState("");
  const [formWinners, setFormWinners] = useState(1);
  const [formDurationValue, setFormDurationValue] = useState(24);
  const [formDurationUnit, setFormDurationUnit] = useState<"h" | "d">("h");
  const [formRequiredRoleId, setFormRequiredRoleId] = useState("");
  const [formMinAge, setFormMinAge] = useState(0);
  const [formMinLevel, setFormMinLevel] = useState(0);
  const [formRewardRoleId, setFormRewardRoleId] = useState("");
  const [formRequireClaim, setFormRequireClaim] = useState(false);
  const [formClaimTimeoutHours, setFormClaimTimeoutHours] = useState(24);

  useEffect(() => {
    if (!formChannelId && channels[0]) setFormChannelId(channels[0].id);
  }, [channels, formChannelId]);

  // Reroll modal state
  const [rerollTarget, setRerollTarget] = useState<Giveaway | null>(null);
  const [rerollBusy, setRerollBusy] = useState(false);

  const activeGiveaways = useMemo(() => giveaways.filter((g) => g.status === "active"), [giveaways]);
  const endedGiveaways = useMemo(() => giveaways.filter((g) => g.status === "ended"), [giveaways]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGuild) return;
    if (!formPrize.trim() || !formChannelId) {
      showError("Champs manquants", "Le lot et le salon sont obligatoires.");
      return;
    }
    const durationMinutes = formDurationValue * (formDurationUnit === "h" ? 60 : 1440);
    setSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/giveaways/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          channelId: formChannelId,
          prize: formPrize,
          description: formDesc,
          winnerCount: formWinners,
          durationMinutes,
          rewardRoleId: formRewardRoleId || null,
          requirements: {
            requiredRoleIds: formRequiredRoleId ? [formRequiredRoleId] : [],
            roleMode: "any",
            excludedRoleIds: [],
            minAccountAgeDays: formMinAge,
            minLevel: formMinLevel,
          },
          requireClaim: formRequireClaim,
          claimTimeoutHours: formClaimTimeoutHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Échec de la création");
      setFormPrize("");
      setFormDesc("");
      setActiveTab("active");
      success("Concours publié", `"${formPrize}" a été publié sur Discord.`);
      await load();
    } catch (err) {
      showError("Échec", err instanceof Error ? err.message : "Impossible de créer le concours.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEndNow(gwId: string) {
    if (!selectedGuild) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/giveaways/${gwId}/end`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      success("Concours clôturé", "Le(s) gagnant(s) ont été tirés au sort.");
      await load();
    } catch (err) {
      showError("Échec", err instanceof Error ? err.message : "Impossible de clôturer le concours.");
    }
  }

  async function handleCancel(gwId: string, prize: string) {
    if (!selectedGuild) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/giveaways/${gwId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error);
      success("Concours annulé", `"${prize}" a été annulé.`);
      await load();
    } catch (err) {
      showError("Échec", err instanceof Error ? err.message : "Impossible d'annuler le concours.");
    }
  }

  async function executeReroll(count: number) {
    if (!selectedGuild || !rerollTarget) return;
    setRerollBusy(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/giveaways/${rerollTarget.id}/reroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      success("Nouveau tirage effectué", "Le(s) nouveau(x) gagnant(s) ont été annoncés sur Discord.");
      setRerollTarget(null);
      await load();
    } catch (err) {
      showError("Échec du reroll", err instanceof Error ? err.message : "Impossible de retirer un gagnant.");
    } finally {
      setRerollBusy(false);
    }
  }

  if (!BOT_API_URL || offline) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-sm rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 text-center">
          <Gift className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">
            {!BOT_API_URL
              ? "Le serveur du bot n'est pas configuré ici."
              : "Impossible de joindre le bot Discord pour le moment."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto os-scroll bg-[var(--bg-main)] text-[var(--text-primary)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/15 text-rose-400 rounded-[var(--inset-radius)] border border-rose-500/30">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Giveaways</h1>
              <p className="text-xs text-[var(--text-muted)]">
                Concours Discord avec conditions d'entrée, tirage aléatoire sécurisé, reroll et réclamation de lot.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveTab("create")}
              className="px-4 py-2 rounded-[var(--inset-radius)] bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Créer un concours
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="px-3.5 py-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] hover:bg-[var(--surface)] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>
        </div>

        {manageableGuilds.length > 1 && (
          <GuildSelector guilds={manageableGuilds} value={selectedGuild?.id || ""} onChange={setSelectedGuild} />
        )}

        {/* KPI tiles — only what's honestly computable from the real overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-[var(--panel-radius)] p-4 space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">Concours actifs</span>
            <p className="text-2xl font-bold text-rose-400">{overview?.activeCount ?? "—"}</p>
          </div>
          <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-[var(--panel-radius)] p-4 space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">Concours terminés</span>
            <p className="text-2xl font-bold">{overview?.endedCount ?? "—"}</p>
          </div>
          <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-[var(--panel-radius)] p-4 space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">Participations</span>
            <p className="text-2xl font-bold text-amber-400">{overview?.totalParticipants ?? "—"}</p>
          </div>
          <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-[var(--panel-radius)] p-4 space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">Gagnants tirés</span>
            <p className="text-2xl font-bold text-emerald-400">{overview?.totalWinners ?? "—"}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--panel-border)] gap-2 overflow-x-auto pb-1">
          {[
            { id: "active", label: `En cours (${activeGiveaways.length})`, icon: Gift },
            { id: "create", label: "Créer", icon: Plus },
            { id: "history", label: `Historique (${endedGiveaways.length})`, icon: Trophy },
            { id: "fairness", label: "Tirage & Éligibilité", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-[var(--inset-radius)] transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive ? "bg-[var(--surface-raised)] border-b-2 border-rose-500" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-rose-400" : "text-[var(--text-muted)]"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB: Active */}
        {activeTab === "active" && (
          <div className="space-y-4">
            {activeGiveaways.length === 0 && !loading && (
              <p className="py-10 text-center text-sm text-[var(--text-muted)]">Aucun concours en cours.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGiveaways.map((gw) => {
                const channelName = channels.find((c) => c.id === gw.channelId)?.name;
                const requiredRoleNames = gw.requirements.requiredRoleIds.map((id) => roles.find((r) => r.id === id)?.name || id);
                return (
                  <div key={gw.id} className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] hover:border-rose-500/40 rounded-[var(--panel-radius)] p-5 space-y-4 transition-all flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-[var(--inset-radius)] text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {relativeEndsAt(gw.endsAt)}
                        </span>
                        {channelName && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--panel-border)]">
                            #{channelName}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-bold">{gw.prize}</h3>
                        {gw.description && <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1">{gw.description}</p>}
                      </div>
                      <div className="pt-2 border-t border-[var(--panel-border)] grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">Gagnants</span>
                          <span className="font-semibold flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            {gw.winnerCount} place{gw.winnerCount > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">Participants</span>
                          <span className="font-semibold text-rose-400 flex items-center gap-1 font-mono">
                            <Users className="w-3.5 h-3.5" />
                            {gw.participants.length}
                          </span>
                        </div>
                      </div>
                      {requiredRoleNames.length > 0 && (
                        <div className="p-2 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] text-[11px] flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>Requis : <strong className="text-indigo-300">{requiredRoleNames.join(", ")}</strong></span>
                        </div>
                      )}
                    </div>
                    <div className="pt-3 border-t border-[var(--panel-border)] flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleEndNow(gw.id)}
                        className="px-3 py-1.5 rounded-[var(--inset-radius)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trophy className="w-3 h-3 text-amber-400" />
                        Tirer maintenant
                      </button>
                      <button
                        onClick={() => handleCancel(gw.id, gw.prize)}
                        className="p-1.5 rounded-[var(--inset-radius)] text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Annuler le concours"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: Create */}
        {activeTab === "create" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={handleCreate} className="lg:col-span-7 bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-[var(--panel-radius)] p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold">Nouveau concours Discord</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Lot / récompense *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Discord Nitro 1 mois, Clé de jeu Steam, Rôle VIP..."
                  value={formPrize}
                  onChange={(e) => setFormPrize(e.target.value)}
                  className="w-full h-10 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3.5 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Détails, conditions, liens..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] p-3 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Salon de publication *</label>
                  <select
                    value={formChannelId}
                    onChange={(e) => setFormChannelId(e.target.value)}
                    className="w-full h-10 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3 text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Sélectionner un salon</option>
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>#{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Nombre de gagnants</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 5].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setFormWinners(cnt)}
                        className={`flex-1 h-10 rounded-[var(--inset-radius)] text-xs font-semibold transition-all cursor-pointer ${
                          formWinners === cnt ? "bg-rose-500 text-white" : "bg-[var(--surface)] border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Durée du concours</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={formDurationValue}
                    onChange={(e) => setFormDurationValue(Number(e.target.value))}
                    className="w-24 h-10 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3 text-xs text-center focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setFormDurationUnit("h")}
                    className={`flex-1 h-10 rounded-[var(--inset-radius)] text-xs font-semibold cursor-pointer ${formDurationUnit === "h" ? "bg-[var(--surface-raised)] border border-[var(--panel-border)]" : "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--panel-border)]"}`}
                  >
                    Heures
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormDurationUnit("d")}
                    className={`flex-1 h-10 rounded-[var(--inset-radius)] text-xs font-semibold cursor-pointer ${formDurationUnit === "d" ? "bg-[var(--surface-raised)] border border-[var(--panel-border)]" : "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--panel-border)]"}`}
                  >
                    Jours
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--panel-border)] space-y-3">
                <h4 className="text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Conditions d'éligibilité
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">Rôle Discord requis</label>
                    <select
                      value={formRequiredRoleId}
                      onChange={(e) => setFormRequiredRoleId(e.target.value)}
                      className="w-full h-9 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3 text-xs"
                    >
                      <option value="">Aucun (tous les membres)</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">Ancienneté min. du compte (jours)</label>
                    <input
                      type="number"
                      min={0}
                      value={formMinAge}
                      onChange={(e) => setFormMinAge(Number(e.target.value))}
                      className="w-full h-9 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">Niveau XP minimum</label>
                    <input
                      type="number"
                      min={0}
                      value={formMinLevel}
                      onChange={(e) => setFormMinLevel(Number(e.target.value))}
                      className="w-full h-9 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">Rôle attribué au(x) gagnant(s)</label>
                    <select
                      value={formRewardRoleId}
                      onChange={(e) => setFormRewardRoleId(e.target.value)}
                      className="w-full h-9 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3 text-xs"
                    >
                      <option value="">Aucun</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--panel-border)] space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input type="checkbox" checked={formRequireClaim} onChange={(e) => setFormRequireClaim(e.target.checked)} className="h-4 w-4" />
                  Le(s) gagnant(s) doivent réclamer leur lot
                </label>
                {formRequireClaim && (
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">Délai de réclamation (heures)</label>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={formClaimTimeoutHours}
                      onChange={(e) => setFormClaimTimeoutHours(Number(e.target.value))}
                      className="w-32 h-9 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3 text-xs"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-[var(--inset-radius)] bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {saving ? "Publication..." : "Publier le concours sur Discord"}
              </button>
            </form>

            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  Aperçu du message Discord
                </span>
              </div>
              <div className="bg-[#2B2D31] rounded-[var(--panel-radius)] p-4 space-y-3 border border-[var(--panel-border)] font-sans">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-xs">ET</div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">ETHONE Bot</span>
                      <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1 rounded">BOT</span>
                    </div>
                  </div>
                </div>
                <div className="border-l-4 border-rose-500 bg-[#1E1F22] rounded-r-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                    <Gift className="w-4 h-4" />
                    <span>CONCOURS</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{formPrize || "Titre du lot à gagner"}</h4>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {formDesc || "Cliquez sur le bouton ci-dessous pour participer au tirage au sort !"}
                  </p>
                  <div className="pt-2 border-t border-neutral-800 text-[11px] space-y-1 text-neutral-300">
                    <p>🏆 <strong>Gagnants :</strong> {formWinners}</p>
                    <p>⏳ <strong>Fin :</strong> Dans {formDurationValue} {formDurationUnit === "h" ? "heures" : "jours"}</p>
                    {formRequiredRoleId && <p>🔒 <strong>Rôle requis :</strong> {roles.find((r) => r.id === formRequiredRoleId)?.name}</p>}
                  </div>
                </div>
                <button type="button" className="w-full py-2 rounded bg-[#5865F2] text-white text-xs font-bold flex items-center justify-center gap-1.5">
                  🎉 Participer (0)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: History */}
        {activeTab === "history" && (
          <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-[var(--panel-radius)] overflow-hidden">
            {endedGiveaways.length === 0 && (
              <p className="py-10 text-center text-sm text-[var(--text-muted)]">Aucun concours terminé pour l'instant.</p>
            )}
            <div className="divide-y divide-[var(--panel-border)]">
              {endedGiveaways.map((gw) => (
                <div key={gw.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold">{gw.prize}</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {gw.participants.length} participants · organisé par {gw.hostedByTag}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {gw.winnerIds.length > 0 && (
                      <div className="flex items-center gap-2 bg-[var(--surface)] px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)]">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-300">{winnerNames(gw).join(", ")}</span>
                      </div>
                    )}
                    <button
                      onClick={() => setRerollTarget(gw)}
                      className="px-3 py-1.5 rounded-[var(--inset-radius)] bg-rose-600/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reroll
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Fairness — honest description of what actually runs today */}
        {activeTab === "fairness" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-[var(--panel-radius)] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Dice5 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">Tirage au sort</h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Chaque gagnant est tiré uniformément au hasard parmi les participants éligibles encore présents sur le serveur,
                via le générateur aléatoire cryptographiquement sécurisé de Node.js (<code className="text-emerald-400">crypto.randomInt</code>),
                sans remise (un même membre ne peut pas être tiré deux fois pour le même concours). Le reroll exclut automatiquement
                les gagnants déjà tirés.
              </p>
            </div>
            <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-[var(--panel-radius)] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold">Conditions d'éligibilité</h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Au moment du tirage, chaque participant est revérifié : rôle requis toujours possédé, aucun rôle exclu, ancienneté
                de compte suffisante, et niveau d'XP minimum atteint si configuré. Un participant qui ne remplit plus une condition
                (ou qui a quitté le serveur) est exclu du tirage.
              </p>
            </div>
          </div>
        )}

        {/* Reroll Modal */}
        {rerollTarget && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--surface-raised)] border border-[var(--panel-border)] rounded-[var(--panel-radius)] max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <RefreshCw className="w-4 h-4" />
                  <span>Reroll de gagnant</span>
                </div>
                <button onClick={() => setRerollTarget(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs">
                Un nouveau gagnant sera tiré au sort pour <strong>{rerollTarget.prize}</strong> parmi les participants restants (les
                gagnants actuels sont exclus).
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setRerollTarget(null)} className="px-4 py-2 rounded-[var(--inset-radius)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface)]">
                  Annuler
                </button>
                <button
                  onClick={() => executeReroll(1)}
                  disabled={rerollBusy}
                  className="px-4 py-2 rounded-[var(--inset-radius)] text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Dice5 className="w-4 h-4" />
                  {rerollBusy ? "Tirage..." : "Tirer au sort"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
