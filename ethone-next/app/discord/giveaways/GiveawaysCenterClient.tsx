"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
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
  Search,
  CalendarPlus,
  UserX,
  CheckCircle2,
  AlertTriangle,
  ImageIcon,
  ArrowLeft,
  Bot,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import ChannelPicker from "@/components/discord/ChannelPicker";
import RolePicker from "@/components/discord/RolePicker";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { GuildSelector } from "@/components/GuildSelector";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

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

interface GiveawayRerollEntry {
  date: string;
  previousWinnerIds: string[];
  newWinnerIds: string[];
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
  rerollHistory: GiveawayRerollEntry[];
  requireClaim: boolean;
  claimTimeoutHours: number;
  claimedWinnerIds: string[];
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

  const [activeTab, setActiveTab] = useState<"active" | "create" | "history" | "fairness">("active");
  const [overview, setOverview] = useState<GiveawayOverview | null>(null);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);

  // Search & filter states
  const [activeSearch, setActiveSearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "ended" | "cancelled">("all");
  const [historySearch, setHistorySearch] = useState("");

  const load = useCallback(async () => {
    if (!selectedGuild) return;

    // Si le bot n'est pas installé sur ce serveur
    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      setOffline(false);
      setGiveaways([]);
      setOverview(null);
      return;
    }

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
  }, [selectedGuild, botGuildIds]);

  useEffect(() => {
    setGiveaways([]);
    setOverview(null);
    load();
  }, [load]);

  // Create form state
  const [formPrize, setFormPrize] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formBannerUrl, setFormBannerUrl] = useState("");
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
  const [rerollCount, setRerollCount] = useState(1);
  const [rerollBusy, setRerollBusy] = useState(false);

  // Extend modal state
  const [extendTarget, setExtendTarget] = useState<Giveaway | null>(null);
  const [extendValue, setExtendValue] = useState(24);
  const [extendUnit, setExtendUnit] = useState<"h" | "d">("h");
  const [extendBusy, setExtendBusy] = useState(false);

  // Participants modal state
  const [participantsTarget, setParticipantsTarget] = useState<Giveaway | null>(null);
  const [participantsList, setParticipantsList] = useState<GiveawayParticipant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [disqualifyBusy, setDisqualifyBusy] = useState<string | null>(null);

  const activeGiveaways = useMemo(() => {
    let list = giveaways.filter((g) => g.status === "active");
    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase();
      list = list.filter((g) => g.prize.toLowerCase().includes(q) || g.description.toLowerCase().includes(q));
    }
    return list;
  }, [giveaways, activeSearch]);

  const pastGiveaways = useMemo(() => {
    let list = giveaways.filter((g) => g.status === "ended" || g.status === "cancelled");
    if (historyFilter !== "all") {
      list = list.filter((g) => g.status === historyFilter);
    }
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      list = list.filter((g) => g.prize.toLowerCase().includes(q) || g.hostedByTag.toLowerCase().includes(q));
    }
    return list;
  }, [giveaways, historyFilter, historySearch]);

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
          prize: formPrize.trim(),
          description: formDesc.trim(),
          winnerCount: formWinners,
          durationMinutes,
          bannerUrl: formBannerUrl.trim() || null,
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
      setFormBannerUrl("");
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
    if (!confirm(`Êtes-vous sûr de vouloir annuler le concours "${prize}" ?`)) return;
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

  async function handleExtendSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGuild || !extendTarget) return;
    const minutes = extendValue * (extendUnit === "h" ? 60 : 1440);
    if (minutes <= 0) {
      showError("Durée invalide", "Veuillez spécifier une durée supérieure à 0.");
      return;
    }
    setExtendBusy(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/giveaways/${extendTarget.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ minutes }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Échec de la prolongation");
      success(
        "Concours prolongé",
        `"${extendTarget.prize}" a été prolongé de ${extendValue} ${extendUnit === "h" ? "heure(s)" : "jour(s)"}.`
      );
      setExtendTarget(null);
      await load();
    } catch (err) {
      showError("Échec de la prolongation", err instanceof Error ? err.message : "Impossible de prolonger le concours.");
    } finally {
      setExtendBusy(false);
    }
  }

  async function openParticipantsModal(gw: Giveaway) {
    setParticipantsTarget(gw);
    setParticipantsLoading(true);
    setParticipantSearch("");
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild?.id}/giveaways/${gw.id}/participants`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Impossible de charger les participants");
      const data = await res.json();
      setParticipantsList(data.participants || []);
    } catch {
      setParticipantsList(gw.participants || []);
    } finally {
      setParticipantsLoading(false);
    }
  }

  async function handleDisqualifyParticipant(userId: string, username: string) {
    if (!selectedGuild || !participantsTarget) return;
    if (!confirm(`Voulez-vous vraiment retirer @${username} de ce concours ?`)) return;
    setDisqualifyBusy(userId);
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/giveaways/${participantsTarget.id}/participants/${userId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Échec de la disqualification");
      setParticipantsList((prev) => prev.filter((p) => p.userId !== userId));
      setGiveaways((prev) =>
        prev.map((g) =>
          g.id === participantsTarget.id
            ? { ...g, participants: g.participants.filter((p) => p.userId !== userId) }
            : g
        )
      );
      success("Participant retiré", `@${username} a été retiré du concours.`);
    } catch (err) {
      showError("Échec", err instanceof Error ? err.message : "Impossible de retirer ce participant.");
    } finally {
      setDisqualifyBusy(null);
    }
  }

  const filteredParticipants = useMemo(() => {
    if (!participantSearch.trim()) return participantsList;
    const q = participantSearch.toLowerCase();
    return participantsList.filter(
      (p) => p.username.toLowerCase().includes(q) || p.userId.includes(q)
    );
  }, [participantsList, participantSearch]);

  return (
    <div className="h-full overflow-y-auto os-scroll bg-[var(--bg-main)] text-[var(--text-primary)] p-4 md:p-8 pb-44 md:pb-44">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <Link
                href={`/discord${selectedGuild?.id ? `?guildId=${selectedGuild.id}` : ""}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
                title="Retour au hub Discord"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
                <span>Retour Discord</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/15 text-rose-400 rounded-[var(--inset-radius)] border border-rose-500/30">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Giveaways & Concours</h1>
                <p className="text-xs text-[var(--text-muted)]">
                  Concours Discord automatisés avec conditions d'entrée, tirage cryptographique, reroll, extension et modération.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveTab("create")}
              className="px-4 py-2 rounded-[var(--inset-radius)] bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
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

        {manageableGuilds.length > 0 && (
          <GuildSelector
            guilds={manageableGuilds}
            value={selectedGuild?.id || ""}
            onChange={(g) => {
              userSelectedRef.current = true;
              setSelectedGuild(g);
            }}
          />
        )}

        {selectedGuild && botGuildIds !== null && !botGuildIds.includes(selectedGuild.id) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs text-indigo-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Le bot ETHONE n&apos;est pas installé sur ce serveur</p>
                <p className="mt-0.5 text-zinc-300">
                  Invitez le bot sur « {selectedGuild.name} » pour gérer vos concours et tirages au sort.
                </p>
              </div>
            </div>
            <a
              href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors shrink-0"
            >
              Inviter le bot
            </a>
          </div>
        )}

        {offline && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <span>
              {!BOT_API_URL
                ? "Le serveur du bot n'est pas configuré ici."
                : "Impossible de joindre le bot Discord pour le moment."}
            </span>
          </div>
        )}

        {/* KPI tiles */}
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
            { id: "create", label: "Créer un concours", icon: Plus },
            { id: "history", label: `Historique (${pastGiveaways.length})`, icon: Trophy },
            { id: "fairness", label: "Tirage & Éligibilité", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-[var(--inset-radius)] transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[var(--surface-raised)] border-b-2 border-rose-500 text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
            {giveaways.filter((g) => g.status === "active").length > 3 && (
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Rechercher par lot ou description..."
                  value={activeSearch}
                  onChange={(e) => setActiveSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            {activeGiveaways.length === 0 && !loading && (
              <div className="py-16 text-center rounded-[var(--panel-radius)] border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/20 p-8">
                <Gift className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
                <p className="text-sm font-semibold text-[var(--text-muted)]">Aucun concours en cours</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Créez un nouveau tirage au sort pour récompenser les membres de votre communauté.
                </p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="mt-4 px-4 py-2 rounded-[var(--inset-radius)] bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Créer un concours
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGiveaways.map((gw) => {
                const channelName = channels.find((c) => c.id === gw.channelId)?.name;
                const requiredRoleNames = gw.requirements.requiredRoleIds.map(
                  (id) => roles.find((r) => r.id === id)?.name || id
                );
                return (
                  <div
                    key={gw.id}
                    className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] hover:border-rose-500/40 rounded-[var(--panel-radius)] p-5 space-y-4 transition-all flex flex-col justify-between overflow-hidden relative"
                  >
                    {gw.bannerUrl && (
                      <div className="relative h-28 -mx-5 -mt-5 mb-1 overflow-hidden border-b border-[var(--panel-border)] bg-neutral-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={gw.bannerUrl}
                          alt={gw.prize}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      </div>
                    )}

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
                        <h3 className="text-base font-bold text-[var(--text-primary)]">{gw.prize}</h3>
                        {gw.description && (
                          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1 leading-relaxed">
                            {gw.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[var(--panel-border)] grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">
                            Gagnants
                          </span>
                          <span className="font-semibold flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            {gw.winnerCount} place{gw.winnerCount > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">
                            Participants
                          </span>
                          <button
                            type="button"
                            onClick={() => openParticipantsModal(gw)}
                            className="font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 font-mono transition-colors cursor-pointer"
                            title="Voir et modérer les participants"
                          >
                            <Users className="w-3.5 h-3.5" />
                            {gw.participants.length}
                            <span className="text-[10px] text-[var(--text-muted)] font-sans underline ml-0.5">
                              (voir)
                            </span>
                          </button>
                        </div>
                      </div>

                      {requiredRoleNames.length > 0 && (
                        <div className="p-2 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] text-[11px] flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>
                            Requis : <strong className="text-indigo-300">{requiredRoleNames.join(", ")}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[var(--panel-border)] flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEndNow(gw.id)}
                          className="px-3 py-1.5 rounded-[var(--inset-radius)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-[var(--panel-border)]"
                          title="Clôturer immédiatement et tirer les gagnants"
                        >
                          <Trophy className="w-3 h-3 text-amber-400" />
                          Tirer
                        </button>
                        <button
                          onClick={() => setExtendTarget(gw)}
                          className="px-3 py-1.5 rounded-[var(--inset-radius)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-[var(--panel-border)]"
                          title="Prolonger la durée du concours"
                        >
                          <CalendarPlus className="w-3 h-3 text-indigo-400" />
                          Prolonger
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openParticipantsModal(gw)}
                          className="p-1.5 rounded-[var(--inset-radius)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                          title="Consulter la liste des participants"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCancel(gw.id, gw.prize)}
                          className="p-1.5 rounded-[var(--inset-radius)] text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Annuler le concours sans tirage"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      </div>
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
            <form
              onSubmit={handleCreate}
              className="lg:col-span-7 bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-[var(--panel-radius)] p-6 space-y-5"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold">Nouveau concours Discord</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Lot / récompense *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Discord Nitro 1 mois, Clé Steam Cyberpunk, 5000 Crédits..."
                  value={formPrize}
                  onChange={(e) => setFormPrize(e.target.value)}
                  className="w-full h-10 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3.5 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description / Règles</label>
                <textarea
                  rows={3}
                  placeholder="Détails du lot, consignes particulières, lien vers votre chaîne ou partenaire..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] p-3 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
                  URL de l'image / bannière (optionnel)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/banner.png"
                  value={formBannerUrl}
                  onChange={(e) => setFormBannerUrl(e.target.value)}
                  className="w-full h-10 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3.5 text-xs focus:outline-none focus:border-rose-500"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  L'image sera intégrée sous forme de bannière dans l'embed officiel Discord.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Salon de publication *</label>
                  <ChannelPicker
                    value={formChannelId}
                    onChange={(id) => setFormChannelId(id)}
                    channels={channels}
                    emptyLabel="Sélectionner un salon"
                  />
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
                          formWinners === cnt
                            ? "bg-rose-500 text-white"
                            : "bg-[var(--surface)] border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
                    max={365}
                    value={formDurationValue}
                    onChange={(e) => setFormDurationValue(Math.max(1, Number(e.target.value)))}
                    className="w-24 h-10 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3 text-xs text-center focus:outline-none focus:border-rose-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setFormDurationUnit("h")}
                    className={`flex-1 h-10 rounded-[var(--inset-radius)] text-xs font-semibold cursor-pointer transition-colors ${
                      formDurationUnit === "h"
                        ? "bg-[var(--surface-raised)] border border-rose-500/50 text-rose-300"
                        : "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--panel-border)]"
                    }`}
                  >
                    Heures
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormDurationUnit("d")}
                    className={`flex-1 h-10 rounded-[var(--inset-radius)] text-xs font-semibold cursor-pointer transition-colors ${
                      formDurationUnit === "d"
                        ? "bg-[var(--surface-raised)] border border-rose-500/50 text-rose-300"
                        : "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--panel-border)]"
                    }`}
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
                    <RolePicker
                      value={formRequiredRoleId}
                      onChange={(id) => setFormRequiredRoleId(id)}
                      roles={roles}
                      guildId={selectedGuild?.id}
                      emptyLabel="Aucun (ouvert à tous)"
                      placeholder="Sélectionner ou saisir un ID..."
                      allowClear
                      size="sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      Ancienneté min. du compte (jours)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formMinAge}
                      onChange={(e) => setFormMinAge(Math.max(0, Number(e.target.value)))}
                      className="w-full h-9 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">Niveau XP minimum</label>
                    <input
                      type="number"
                      min={0}
                      value={formMinLevel}
                      onChange={(e) => setFormMinLevel(Math.max(0, Number(e.target.value)))}
                      className="w-full h-9 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      Rôle automatique attribué au(x) gagnant(s)
                    </label>
                    <RolePicker
                      value={formRewardRoleId}
                      onChange={(id) => setFormRewardRoleId(id)}
                      roles={roles}
                      guildId={selectedGuild?.id}
                      emptyLabel="Aucun"
                      placeholder="Sélectionner ou saisir un ID..."
                      allowClear
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--panel-border)] space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRequireClaim}
                    onChange={(e) => setFormRequireClaim(e.target.checked)}
                    className="h-4 w-4 rounded accent-rose-500"
                  />
                  Le(s) gagnant(s) doivent cliquer pour réclamer leur lot
                </label>
                {formRequireClaim && (
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      Délai de réclamation imparti (heures)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={formClaimTimeoutHours}
                      onChange={(e) => setFormClaimTimeoutHours(Math.max(1, Number(e.target.value)))}
                      className="w-32 h-9 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-[var(--inset-radius)] bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-rose-600/20"
              >
                <Send className="w-4 h-4" />
                {saving ? "Publication sur Discord..." : "Publier le concours sur Discord"}
              </button>
            </form>

            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  Aperçu temps réel Discord
                </span>
              </div>
              <div className="bg-[#2B2D31] rounded-[var(--panel-radius)] p-4 space-y-3 border border-[var(--panel-border)] font-sans">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-xs">
                    ET
                  </div>
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
                  <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line">
                    {formDesc || "Cliquez sur le bouton ci-dessous pour participer au tirage au sort !"}
                  </p>
                  <div className="pt-2 border-t border-neutral-800 text-[11px] space-y-1 text-neutral-300">
                    <p>
                      🏆 <strong>Gagnants :</strong> {formWinners}
                    </p>
                    <p>
                      ⏳ <strong>Fin :</strong> Dans {formDurationValue} {formDurationUnit === "h" ? "heures" : "jours"}
                    </p>
                    {formRequiredRoleId && (
                      <p>
                        🔒 <strong>Rôle requis :</strong> {roles.find((r) => r.id === formRequiredRoleId)?.name}
                      </p>
                    )}
                    {formMinAge > 0 && (
                      <p>
                        🛡️ <strong>Ancienneté min. :</strong> {formMinAge} jours
                      </p>
                    )}
                    {formMinLevel > 0 && (
                      <p>
                        ⭐ <strong>Niveau min. :</strong> Niveau {formMinLevel}
                      </p>
                    )}
                  </div>
                  {formBannerUrl.trim() && (
                    <div className="pt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formBannerUrl.trim()}
                        alt="Aperçu bannière"
                        className="max-h-44 w-full object-cover rounded-md border border-neutral-700"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="w-full py-2 rounded bg-[#5865F2] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-default"
                >
                  🎉 Participer (0)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: History */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-[var(--surface-raised)]/40 p-1 rounded-[var(--inset-radius)] border border-[var(--panel-border)]">
                {[
                  { id: "all", label: `Tous (${giveaways.filter((g) => g.status !== "active").length})` },
                  { id: "ended", label: `Terminés (${giveaways.filter((g) => g.status === "ended").length})` },
                  { id: "cancelled", label: `Annulés (${giveaways.filter((g) => g.status === "cancelled").length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setHistoryFilter(f.id as typeof historyFilter)}
                    className={`px-3 py-1.5 rounded-[var(--inset-radius)] text-xs font-semibold transition-colors cursor-pointer ${
                      historyFilter === f.id
                        ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Filtrer par lot ou créateur..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-[var(--panel-radius)] overflow-hidden">
              {pastGiveaways.length === 0 && (
                <div className="py-12 text-center text-sm text-[var(--text-muted)]">
                  Aucun concours dans l'historique correspondant à ce filtre.
                </div>
              )}
              <div className="divide-y divide-[var(--panel-border)]">
                {pastGiveaways.map((gw) => {
                  const isEnded = gw.status === "ended";
                  const isCancelled = gw.status === "cancelled";
                  return (
                    <div
                      key={gw.id}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--surface-raised)]/20 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isEnded
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {isEnded ? "Terminé" : "Annulé"}
                          </span>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">{gw.prize}</h3>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          {gw.participants.length} participant{gw.participants.length > 1 ? "s" : ""} · Organisé par{" "}
                          <span className="font-semibold text-[var(--text-primary)]">{gw.hostedByTag}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {isEnded && gw.winnerIds.length > 0 && (
                          <div className="flex items-center gap-2 bg-[var(--surface)] px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)]">
                            <Crown className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-semibold text-amber-300">
                              {winnerNames(gw).join(", ")}
                            </span>
                            {gw.requireClaim && (
                              <span className="text-[10px] text-[var(--text-muted)] ml-1">
                                ({gw.claimedWinnerIds?.length || 0}/{gw.winnerIds.length} réclamé)
                              </span>
                            )}
                          </div>
                        )}

                        {isEnded && gw.winnerIds.length === 0 && (
                          <span className="text-xs text-[var(--text-muted)] italic">
                            Aucun gagnant (aucun participant éligible)
                          </span>
                        )}

                        <button
                          onClick={() => openParticipantsModal(gw)}
                          className="px-3 py-1.5 rounded-[var(--inset-radius)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--panel-border)] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          Participants
                        </button>

                        {isEnded && gw.participants.length > 0 && (
                          <button
                            onClick={() => {
                              setRerollTarget(gw);
                              setRerollCount(1);
                            }}
                            className="px-3 py-1.5 rounded-[var(--inset-radius)] bg-rose-600/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reroll
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Fairness */}
        {activeTab === "fairness" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-[var(--panel-radius)] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Dice5 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">Tirage au sort cryptographique</h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Chaque gagnant est sélectionné uniformément au hasard parmi les participants éligibles encore présents
                sur le serveur, via le générateur aléatoire cryptographiquement sécurisé de Node.js (
                <code className="text-emerald-400 bg-[var(--surface)] px-1 py-0.5 rounded font-mono">
                  crypto.randomInt
                </code>
                ), sans remise (un même membre ne peut pas être tiré deux fois pour le même concours).
              </p>
              <div className="p-3 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Pas de seed manipulable</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Le tirage est instantané et basé sur l'entropie du système d'exploitation hôte.
                </p>
              </div>
            </div>

            <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-[var(--panel-radius)] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold">Vérification d'éligibilité en direct</h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Au moment précis du tirage, chaque candidat est re-vérifié en direct sur Discord : rôle requis toujours
                possédé, aucun rôle banni/exclu, ancienneté de compte respectée et niveau XP suffisant.
              </p>
              <div className="p-3 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Modération et exclusion manuelle</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Les administrateurs peuvent à tout moment disqualifier un participant frauduleux directement depuis
                  l'onglet Participants du dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Prolongation / Extend */}
        {extendTarget && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--surface-raised)] border border-[var(--panel-border)] rounded-[var(--panel-radius)] max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <CalendarPlus className="w-4 h-4" />
                  <span>Prolonger le concours</span>
                </div>
                <button
                  onClick={() => setExtendTarget(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Ajouter du temps au concours <strong>"{extendTarget.prize}"</strong>. La nouvelle date de fin sera
                automatiquement recalculée et l'embed Discord mis à jour.
              </p>

              <form onSubmit={handleExtendSubmit} className="space-y-4 pt-1">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1.5 font-semibold">
                    Raccourcis rapides
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { v: 1, u: "h", l: "+1 h" },
                      { v: 6, u: "h", l: "+6 h" },
                      { v: 24, u: "h", l: "+24 h" },
                      { v: 3, u: "d", l: "+3 j" },
                    ].map((preset) => (
                      <button
                        key={preset.l}
                        type="button"
                        onClick={() => {
                          setExtendValue(preset.v);
                          setExtendUnit(preset.u as "h" | "d");
                        }}
                        className={`h-8 rounded-[var(--inset-radius)] text-xs font-semibold transition-all cursor-pointer ${
                          extendValue === preset.v && extendUnit === preset.u
                            ? "bg-indigo-600 text-white"
                            : "bg-[var(--surface)] border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {preset.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1 font-semibold">
                    Durée personnalisée
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={extendValue}
                      onChange={(e) => setExtendValue(Math.max(1, Number(e.target.value)))}
                      className="w-24 h-9 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] px-3 text-xs text-center font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setExtendUnit("h")}
                      className={`flex-1 h-9 rounded-[var(--inset-radius)] text-xs font-semibold cursor-pointer ${
                        extendUnit === "h"
                          ? "bg-[var(--surface-raised)] border border-indigo-500/50 text-indigo-300"
                          : "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--panel-border)]"
                      }`}
                    >
                      Heures
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtendUnit("d")}
                      className={`flex-1 h-9 rounded-[var(--inset-radius)] text-xs font-semibold cursor-pointer ${
                        extendUnit === "d"
                          ? "bg-[var(--surface-raised)] border border-indigo-500/50 text-indigo-300"
                          : "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--panel-border)]"
                      }`}
                    >
                      Jours
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--panel-border)]">
                  <button
                    type="button"
                    onClick={() => setExtendTarget(null)}
                    className="px-4 py-2 rounded-[var(--inset-radius)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface)] cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={extendBusy}
                    className="px-4 py-2 rounded-[var(--inset-radius)] text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    {extendBusy ? "Prolongation..." : "Valider la prolongation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Participants & Modération */}
        {participantsTarget && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--surface-raised)] border border-[var(--panel-border)] rounded-[var(--panel-radius)] max-w-xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <Users className="w-4 h-4" />
                  <span>Participants — {participantsTarget.prize}</span>
                </div>
                <button
                  onClick={() => setParticipantsTarget(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Filtrer par pseudo ou ID..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)] font-mono whitespace-nowrap">
                  {participantsList.length} inscrit{participantsList.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto os-scroll space-y-2 pr-1 min-h-[220px]">
                {participantsLoading && (
                  <div className="py-12 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Chargement des participants...
                  </div>
                )}

                {!participantsLoading && filteredParticipants.length === 0 && (
                  <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                    {participantSearch ? "Aucun participant ne correspond à la recherche." : "Aucun participant inscrit pour l'instant."}
                  </div>
                )}

                {!participantsLoading &&
                  filteredParticipants.map((p) => (
                    <div
                      key={p.userId}
                      className="p-2.5 rounded-[var(--inset-radius)] bg-[var(--surface)] border border-[var(--panel-border)] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatarUrl} alt={p.username} className="w-7 h-7 rounded-full shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-300 shrink-0">
                            {p.username.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{p.username}</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">{p.userId}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.isEligible
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {p.isEligible ? "Éligible" : "Non-éligible"}
                        </span>
                        {participantsTarget.status === "active" && (
                          <button
                            onClick={() => handleDisqualifyParticipant(p.userId, p.username)}
                            disabled={disqualifyBusy === p.userId}
                            className="p-1.5 rounded-[var(--inset-radius)] text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                            title="Disqualifier du concours"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="pt-2 border-t border-[var(--panel-border)] flex justify-end">
                <button
                  type="button"
                  onClick={() => setParticipantsTarget(null)}
                  className="px-4 py-2 rounded-[var(--inset-radius)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface)] cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Reroll */}
        {rerollTarget && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--surface-raised)] border border-[var(--panel-border)] rounded-[var(--panel-radius)] max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <RefreshCw className="w-4 h-4" />
                  <span>Reroll de gagnant(s)</span>
                </div>
                <button
                  onClick={() => setRerollTarget(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Un nouveau tirage au sort sera effectué pour <strong>"{rerollTarget.prize}"</strong> parmi les
                participants restants (les gagnants précédents sont automatiquement exclus).
              </p>

              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1 font-semibold">
                  Nombre de gagnants à tirer
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setRerollCount(cnt)}
                      className={`flex-1 h-9 rounded-[var(--inset-radius)] text-xs font-semibold transition-all cursor-pointer ${
                        rerollCount === cnt
                          ? "bg-rose-600 text-white"
                          : "bg-[var(--surface)] border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--panel-border)]">
                <button
                  onClick={() => setRerollTarget(null)}
                  className="px-4 py-2 rounded-[var(--inset-radius)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface)] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={() => executeReroll(rerollCount)}
                  disabled={rerollBusy}
                  className="px-4 py-2 rounded-[var(--inset-radius)] text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
