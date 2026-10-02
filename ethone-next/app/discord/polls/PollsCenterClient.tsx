"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Select from "@/components/ui/Select";
import {
  Vote,
  Plus,
  Search,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Copy,
  ChevronRight,
  TrendingUp,
  Settings,
  Sparkles,
  Layers,
  BarChart3,
  Users,
  Award,
  ShieldCheck,
  Send,
  Calendar,
  Square,
  CopyPlus,
  ArrowLeft,
  RefreshCw,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";
import { formatApiError } from "@/lib/format-error";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import ChannelPicker from "@/components/discord/ChannelPicker";

const BOT_API_URL =
  process.env.NEXT_PUBLIC_DISCORD_BOT_API_URL ||
  process.env.NEXT_PUBLIC_BOT_URL ||
  process.env.NEXT_PUBLIC_DISCORD_BOT_API ||
  "";

function mapPoll(raw: Record<string, unknown>): PollSummary {
  const r = raw as Record<string, any>;
  // Sondage natif Discord : le décompte stocké par le bot (options[].votesCount) fait foi.
  const nativeAnswers = r.native
    ? ((r.questions?.[0]?.options ?? []) as any[]).map((o) => ({ label: String(o.label ?? ""), emoji: String(o.emoji ?? ""), votes: Number(o.votesCount ?? 0) }))
    : undefined;
  return {
    native: r.native === true,
    nativeAnswers,
    id: String(r.id ?? r.pollId ?? ""),
    title: String(r.title ?? "Sondage"),
    description: String(r.description ?? ""),
    category: String(r.category ?? "Communauté"),
    type: (r.type ?? "SINGLE_CHOICE") as PollSummary["type"],
    status: (r.status ?? "DRAFT") as PollSummary["status"],
    anonymity: (r.anonymity ?? "PUBLIC") as PollSummary["anonymity"],
    resultsVisibility: (r.resultsVisibility ?? "LIVE") as PollSummary["resultsVisibility"],
    totalVotes: nativeAnswers ? nativeAnswers.reduce((n, a) => n + a.votes, 0) : Number(r.totalVotes ?? r.stats?.totalVotes ?? 0),
    uniqueVoters: Number(r.uniqueVoters ?? r.stats?.uniqueVoters ?? 0),
    participationRate: Number(r.participationRate ?? r.stats?.participationRate ?? 0),
    questionsCount: Number(r.questionsCount ?? (Array.isArray(r.questions) ? r.questions.length : 0)),
    quorumMet: r.quorumMet ?? undefined,
    quorumPercentage: r.quorumPercentage ?? undefined,
    startsAt: r.startsAt ?? undefined,
    endsAt: r.endsAt ?? undefined,
    updatedAt: String(r.updatedAt ?? "récemment"),
  };
}

export interface PollSummary {
  /** Sondage natif Discord (vote géré par Discord, décompte rafraîchi par le bot). */
  native?: boolean;
  nativeAnswers?: { label: string; emoji: string; votes: number }[];
  id: string;
  title: string;
  description: string;
  category: string;
  type:
    | "SINGLE_CHOICE"
    | "MULTIPLE_CHOICE"
    | "RANKING"
    | "WEIGHTED_VOTE"
    | "ANONYMOUS_POLL"
    | "YES_NO"
    | "RATING"
    | "ELECTION"
    | "APPROVAL";
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" | "ARCHIVED";
  anonymity: "PUBLIC" | "ANONYMOUS" | "FULLY_ANONYMOUS";
  resultsVisibility: "LIVE" | "AFTER_VOTE" | "AT_END" | "STAFF_ONLY";
  totalVotes: number;
  uniqueVoters: number;
  participationRate: number;
  questionsCount: number;
  quorumMet?: boolean;
  quorumPercentage?: number;
  startsAt?: string;
  endsAt?: string;
  updatedAt: string;
}

const DEMO_POLLS: PollSummary[] = [];

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  SINGLE_CHOICE: { label: "Choix Unique", color: "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30", icon: Vote },
  MULTIPLE_CHOICE: { label: "Choix Multiple", color: "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/30", icon: Layers },
  RANKING: { label: "Vote Préférentiel", color: "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30", icon: Award },
  WEIGHTED_VOTE: { label: "Pondéré par Rôles", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: ShieldCheck },
  ANONYMOUS_POLL: { label: "Bulletin Secret", color: "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30", icon: Sparkles },
  YES_NO: { label: "Oui / Non", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30", icon: CheckCircle2 },
  RATING: { label: "Note Satisfaction", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: Sparkles },
  ELECTION: { label: "Élection", color: "bg-pink-500/10 text-pink-400 border-pink-500/30", icon: Calendar },
  APPROVAL: { label: "Approbation Staff", color: "bg-rose-500/10 text-rose-400 border-rose-500/30", icon: ShieldCheck },
};

export default function PollsCenterClient() {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const showToast = useCallback(
    (msg: string, type?: string) => {
      if (type === "error") toastError(msg);
      else if (type === "info") toastInfo(msg);
      else toastSuccess(msg);
    },
    [toastError, toastInfo, toastSuccess]
  );
  const { profile } = useDiscordOAuth();
  const searchParams = useSearchParams();
  const guildParam = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);

  const [polls, setPolls] = useState<PollSummary[]>(DEMO_POLLS);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [deployModalPoll, setDeployModalPoll] = useState<PollSummary | null>(null);
  const [targetChannelId, setTargetChannelId] = useState("");
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);

  // Fetch real guild text channels for deploy modal
  const fetchChannels = useCallback(
    async (notify = false) => {
      if (!guildParam || !BOT_API_URL) return;
      setChannelsLoading(true);

      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildParam}/polls/channels`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.channels) && data.channels.length > 0) {
            setChannels(data.channels);
            setTargetChannelId((prev) => prev || data.channels[0].id);
            setChannelsLoading(false);
            if (notify) showToast("Salons actualisés avec succès !", "success");
            return;
          }
        }
      } catch {}

      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildParam}/server/channels`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.channels) ? data.channels : (Array.isArray(data) ? data : []);
          const textChannels = list
            .filter((c: any) => c.type === 0 || c.type === "GUILD_TEXT" || !c.type)
            .map((c: any) => ({ id: String(c.id), name: String(c.name) }));
          if (textChannels.length > 0) {
            setChannels(textChannels);
            setTargetChannelId((prev) => prev || textChannels[0].id);
            if (notify) showToast("Salons actualisés avec succès !", "success");
          }
        }
      } catch {
        if (notify) showToast("Erreur lors de l'actualisation des salons.", "error");
      } finally {
        setChannelsLoading(false);
      }
    },
    [guildParam, showToast]
  );

  useEffect(() => {
    fetchChannels(false);
  }, [fetchChannels]);

  const categories = useMemo(() => {
    const set = new Set(polls.map((p) => p.category));
    return ["ALL", ...Array.from(set)];
  }, [polls]);

  const filteredPolls = useMemo(() => {
    return polls.filter((poll) => {
      if (selectedStatus !== "ALL" && poll.status !== selectedStatus) return false;
      if (selectedType !== "ALL" && poll.type !== selectedType) return false;
      if (selectedCategory !== "ALL" && poll.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          poll.title.toLowerCase().includes(q) ||
          poll.description.toLowerCase().includes(q) ||
          poll.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [polls, selectedStatus, selectedType, selectedCategory, searchQuery]);

  const kpis = useMemo(() => {
    const total = polls.length;
    const active = polls.filter((p) => p.status === "ACTIVE").length;
    const totalVotes = polls.reduce((acc, p) => acc + p.totalVotes, 0);
    const withVotes = polls.filter((p) => p.totalVotes > 0);
    const avgParticipation =
      withVotes.length > 0
        ? Math.round((withVotes.reduce((acc, p) => acc + p.participationRate, 0) / withVotes.length) * 10) / 10
        : null;
    const anonymous = polls.filter((p) => p.anonymity !== "PUBLIC").length;
    const hiddenResults = polls.filter((p) => p.resultsVisibility !== "LIVE").length;
    return { total, active, totalVotes, avgParticipation, withVotes: withVotes.length, anonymous, hiddenResults };
  }, [polls]);

  const loadPolls = useCallback(async () => {
    if (!BOT_API_URL || !guildParam) {
      setIsDemo(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildParam}/polls`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.polls)) {
        setPolls(data.polls.map(mapPoll));
        setIsDemo(false);
      } else {
        setIsDemo(true);
      }
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [guildParam]);

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([loadPolls(), fetchChannels(false)]);
    showToast("Sondages et salons actualisés avec succès !", "success");
  }, [loadPolls, fetchChannels, showToast]);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  // Envoie une action au bot pour un sondage. Bot injoignable : échec (jamais de faux succès local).
  // Raison renvoyée par le bot lors du dernier échec de `pollAction` (affichée dans le toast d'erreur).
  const actionError = useRef<string | undefined>(undefined);
  const pollAction = useCallback(
    async (poll: PollSummary, path: string, body?: Record<string, unknown>): Promise<boolean> => {
      actionError.current = undefined;
      if (isDemo || !BOT_API_URL) return false;
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildParam}/polls/${poll.id}/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          actionError.current = formatApiError(data?.error, "") || undefined;
        }
        return res.ok;
      } catch {
        return false;
      }
    },
    [isDemo, guildParam]
  );

  const handleCopyLink = (pollId: string) => {
    const url = `${window.location.origin}/discord/polls/${pollId}/vote?guildId=${guildParam}`;
    navigator.clipboard.writeText(url);
    showToast("Lien de vote copié dans le presse-papier !", "success");
  };

  const handleTogglePause = async (poll: PollSummary) => {
    const resume = poll.status !== "ACTIVE";
    const newStatus = resume ? "ACTIVE" : "PAUSED";
    setPolls((prev) => prev.map((p) => (p.id === poll.id ? { ...p, status: newStatus } : p)));
    const ok = await pollAction(poll, resume ? "resume" : "pause");
    if (!ok) {
      setPolls((prev) => prev.map((p) => (p.id === poll.id ? { ...p, status: poll.status } : p)));
      toastError("Action impossible — réessayez.", actionError.current);
      return;
    }
    showToast(resume ? `Sondage "${poll.title}" réactivé.` : `Sondage "${poll.title}" mis en pause.`, "info");
  };

  const handleClosePoll = async (poll: PollSummary) => {
    setPolls((prev) => prev.map((p) => (p.id === poll.id ? { ...p, status: "ENDED" } : p)));
    const ok = await pollAction(poll, "end");
    if (!ok) {
      setPolls((prev) => prev.map((p) => (p.id === poll.id ? { ...p, status: poll.status } : p)));
      toastError("Impossible de clôturer le sondage.", actionError.current);
      return;
    }
    showToast(`Sondage "${poll.title}" clôturé.`, "success");
    if (poll.native) void loadPolls(); // décompte final figé par le bot
  };

  const handleDuplicate = async (poll: PollSummary) => {
    if (isDemo || !BOT_API_URL) {
      showToast("Bot injoignable : le sondage n'a pas été dupliqué.", "error");
      return;
    }
    const ok = await pollAction(poll, "duplicate");
    if (!ok) {
      toastError("Impossible de dupliquer le sondage.", actionError.current);
      return;
    }
    showToast("Sondage dupliqué en brouillon !", "success");
    loadPolls();
  };

  const handleDeployConfirm = async () => {
    if (!deployModalPoll) return;
    if (!targetChannelId) {
      showToast("Veuillez sélectionner un salon Discord.", "error");
      return;
    }
    const ok = await pollAction(deployModalPoll, "panel/deploy", {
      channelId: targetChannelId,
    });
    if (!ok) {
      toastError("Échec du déploiement du panneau.", actionError.current);
      return;
    }
    const channelName = channels.find((c) => c.id === targetChannelId)?.name || targetChannelId;
    showToast(`Panneau de vote déployé sur Discord (#${channelName}).`, "success");
    setDeployModalPoll(null);
  };

  return (
    <div className="text-[var(--text-primary)]">
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-44 md:pb-44">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Link
            href={`/discord${guildParam ? `?guildId=${guildParam}` : ""}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] px-3 text-xs font-semibold normal-case tracking-normal text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Retour Discord</span>
          </Link>
          <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
          <span className="text-[var(--text-primary)] font-medium">Sondages & Votes</span>
        </div>

        {/* Header Hero Section */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent-primary)]">
                <Vote className="h-3.5 w-3.5" />
                Sondages & Votes
              </div>
              {isDemo && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                  Données de démonstration
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              Sondages & Votes
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)] max-w-2xl">
              {isDemo
                ? "Connecte un serveur (bouton Discord dans le hub) pour gérer tes vrais sondages depuis ici."
                : "Crée, met en pause, clôture et déploie tes sondages Discord — synchronisé avec le bot."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshAll}
              disabled={loading || channelsLoading}
              className="inline-flex items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] disabled:opacity-50"
              title="Rafraîchir les sondages et salons"
            >
              <RefreshCw className={cn("h-4 w-4", (loading || channelsLoading) && "animate-spin text-[var(--accent-primary)]")} />
            </button>
            <Link
              href={`/discord/polls/create?guildId=${guildParam}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 h-9 text-sm font-semibold text-[var(--accent-contrast)] hover:brightness-110 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
            >
              <Plus className="h-4 w-4" />
              Nouveau Sondage
            </Link>
          </div>
        </div>

        {/* KPI Metrics Strip */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">Sondages Totaux</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                <Vote className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">{kpis.total}</span>
              <span className="text-xs text-[var(--text-muted)]">configurés</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--accent-primary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" />
              {kpis.active} actifs actuellement
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">Suffrages Exprimés</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">{kpis.totalVotes}</span>
              <span className="text-xs text-[var(--text-muted)]">voix enregistrées</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--accent-primary)]">
              <TrendingUp className="h-3.5 w-3.5" />
              {kpis.total > 0 && kpis.totalVotes > 0
                ? `${(kpis.totalVotes / kpis.total).toFixed(1)} voix par sondage en moyenne`
                : "Aucun vote pour l'instant"}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">Participation Moyenne</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">{kpis.avgParticipation === null ? "—" : `${kpis.avgParticipation}%`}</span>
              <span className="text-xs text-[var(--text-muted)]">des membres éligibles</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--accent-primary)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {kpis.withVotes > 0 ? `Calculée sur ${kpis.withVotes} sondage${kpis.withVotes > 1 ? "s" : ""} avec des votes` : "Pas encore de données"}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">Confidentialité</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">{kpis.anonymous}</span>
              <span className="text-xs text-[var(--text-muted)]">anonyme{kpis.anonymous > 1 ? "s" : ""} sur {kpis.total}</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
              {kpis.hiddenResults} avec résultats masqués
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Rechercher un sondage, mot-clé, tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:border-[var(--input-border-hover)] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status filters */}
            <div className="inline-flex rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-1">
              {["ALL", "ACTIVE", "PAUSED", "ENDED", "DRAFT"].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={cn(
                    "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                    selectedStatus === st
                      ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {st === "ALL"
                    ? "Tous"
                    : st === "ACTIVE"
                    ? "En cours"
                    : st === "PAUSED"
                    ? "En pause"
                    : st === "ENDED"
                    ? "Clôturés"
                    : "Brouillons"}
                </button>
              ))}
            </div>

            {/* Type selector dropdown */}
            <Select
              value={selectedType}
              onChange={setSelectedType}
              size="sm"
              className="w-48 shrink-0"
              aria-label="Filtrer par type de vote"
              options={[
                { id: "ALL", label: "Tous types de vote" },
                ...Object.entries(TYPE_CONFIG).map(([key, val]) => ({ id: key, label: val.label })),
              ]}
            />

            {/* Category selector */}
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              size="sm"
              className="w-44 shrink-0"
              aria-label="Filtrer par catégorie"
              options={categories.map((c) => ({ id: c, label: c === "ALL" ? "Toutes catégories" : c }))}
            />
          </div>
        </div>

        {/* Polls Cards Grid */}
        {filteredPolls.length === 0 ? (
          <div className="pop-in flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/40 py-16 text-center">
            <Vote className="h-12 w-12 text-[var(--text-muted)] mb-3" />
            <h3 className="text-base font-medium text-[var(--text-primary)]">Aucun sondage trouvé</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1">
              Modifiez vos critères de recherche ou commencez par créer un premier vote communautaire.
            </p>
            <Link
              href={`/discord/polls/create?guildId=${guildParam}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:brightness-110 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
            >
              <Plus className="h-3.5 w-3.5" />
              Créer un sondage
            </Link>
          </div>
        ) : (
          <div className="stagger-children grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredPolls.map((poll) => {
              const typeCfg = TYPE_CONFIG[poll.type] || TYPE_CONFIG.SINGLE_CHOICE;
              const TypeIcon = typeCfg.icon;

              return (
                <div
                  key={poll.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 transition-all duration-300 hover:border-[var(--input-border-hover)] hover:bg-[var(--surface-raised)]/70"
                >
                  {/* Card Top badges */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            typeCfg.color
                          )}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {typeCfg.label}
                        </span>

                        {poll.native && (
                          <span
                            className="rounded-full border border-[var(--info)]/30 bg-[var(--info)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--info)]"
                            title="Sondage natif Discord : vote et affichage gérés par Discord"
                          >
                            Natif
                          </span>
                        )}
                        <span className="rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 px-2.5 py-0.5 text-xs text-[var(--text-muted)]">
                          {poll.category}
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div>
                        {poll.status === "ACTIVE" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent-primary)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" />
                            En cours
                          </span>
                        )}
                        {poll.status === "PAUSED" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                            <PauseCircle className="h-3 w-3" />
                            En pause
                          </span>
                        )}
                        {poll.status === "ENDED" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-raised)]/50 border border-[var(--panel-border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
                            <CheckCircle2 className="h-3 w-3" />
                            Clôturé
                          </span>
                        )}
                        {poll.status === "DRAFT" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent-primary)]">
                            Brouillon
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors line-clamp-1">
                      {poll.title}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {poll.description}
                    </p>

                    {/* Progress Bar / Stats */}
                    {poll.native ? (
                      <div className="mt-4 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)] font-medium flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-[var(--info)]" />
                            Votes Discord
                          </span>
                          <span className="font-bold text-[var(--text-primary)]">{poll.totalVotes}</span>
                        </div>
                        {(poll.nativeAnswers ?? []).map((a, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                            <span className="truncate">{a.emoji} {a.label}</span>
                            <span className="font-semibold text-[var(--text-primary)]">{a.votes}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                    <div className="mt-4 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[var(--text-muted)] font-medium flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                          Participation
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {poll.totalVotes} voix ({poll.participationRate}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]/50">
                        <div
                          className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500"
                          style={{ width: `${Math.min(100, poll.participationRate)}%` }}
                        />
                      </div>

                      {/* Quorum status if applicable */}
                      {poll.quorumPercentage !== undefined && (
                        <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)] border-t border-[var(--panel-border)] pt-1.5">
                          <span>Quorum statut :</span>
                          <span
                            className={cn(
                              "font-semibold",
                              poll.quorumMet ? "text-[var(--accent-primary)]" : "text-amber-400"
                            )}
                          >
                            {poll.quorumMet ? "✅ Atteint" : "⏳ En attente"} ({poll.quorumPercentage}%)
                          </span>
                        </div>
                      )}
                    </div>
                    )}
                  </div>

                  {/* Card Bottom Meta & Actions */}
                  <div className="mt-5 border-t border-[var(--panel-border)] pt-3">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-3">
                      <span>{poll.endsAt || `Modifié ${poll.updatedAt}`}</span>
                      <span>ID : {poll.id.slice(0, 10)}...</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/discord/polls/${poll.id}/results?guildId=${guildParam}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                      >
                        <BarChart3 className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                        Résultats
                      </Link>

                      <Link
                        href={`/discord/polls/${poll.id}?guildId=${guildParam}`}
                        className="inline-flex items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
                        title="Configurer le sondage"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Link>

                      {!poll.native && (
                      <button
                        onClick={() => handleCopyLink(poll.id)}
                        className="inline-flex items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
                        title="Copier le lien public de vote"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      )}

                      {!poll.native && (
                      <button
                        onClick={() => setDeployModalPoll(poll)}
                        className="inline-flex items-center justify-center rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-2 text-[var(--success)] hover:brightness-110 hover:text-[var(--text-primary)] btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                        title="Déployer sur Discord"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                      )}

                      {poll.status !== "ENDED" && !poll.native && (
                        <button
                          onClick={() => handleTogglePause(poll)}
                          className="inline-flex items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2 text-[var(--text-muted)] hover:text-amber-400 hover:bg-[var(--surface-raised)]"
                          title={poll.status === "ACTIVE" ? "Mettre en pause" : "Reprendre"}
                        >
                          {poll.status === "ACTIVE" ? (
                            <PauseCircle className="h-3.5 w-3.5" />
                          ) : (
                            <PlayCircle className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {poll.status !== "ENDED" && poll.status !== "DRAFT" && (
                        <button
                          onClick={() => handleClosePoll(poll)}
                          className="inline-flex items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2 text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--surface-raised)]"
                          title="Clôturer le sondage"
                        >
                          <Square className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDuplicate(poll)}
                        className="inline-flex items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
                        title="Dupliquer en brouillon"
                      >
                        <CopyPlus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deploy to Discord Modal */}
      {deployModalPoll && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-md rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                  <Send className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Déployer sur Discord</h3>
              </div>
              <button
                onClick={() => setDeployModalPoll(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] mb-4">
              Sélectionnez le salon textuel Discord dans lequel le bot ETHONE publiera le panneau interactif
              pour le sondage <strong className="text-[var(--text-primary)]">"{deployModalPoll.title}"</strong>.
            </p>

            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  Salon Discord de destination
                </label>
                <button
                  type="button"
                  onClick={() => fetchChannels(true)}
                  disabled={channelsLoading}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors disabled:opacity-50"
                  title="Rafraîchir les salons"
                >
                  <RefreshCw className={cn("h-3 w-3", channelsLoading && "animate-spin text-[var(--accent-primary)]")} />
                  <span>Rafraîchir</span>
                </button>
              </div>
              <ChannelPicker
                value={targetChannelId}
                onChange={(id) => setTargetChannelId(id)}
                channels={channels}
                placeholder="Sélectionner un salon..."
                disabled={channelsLoading}
                size="sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeployModalPoll(null)}
                className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Annuler
              </button>
              <button
                onClick={handleDeployConfirm}
                className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:brightness-110 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
              >
                Envoyer le panneau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
