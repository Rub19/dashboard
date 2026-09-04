"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Vote,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  PauseCircle,
  PlayCircle,
  Archive,
  Copy,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Settings,
  Eye,
  Sparkles,
  Layers,
  ArrowRight,
  Share2,
  Trash2,
  AlertCircle,
  BarChart3,
  Users,
  Award,
  ShieldCheck,
  Send,
  Calendar,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

export interface PollSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  type:
    | "SINGLE_CHOICE"
    | "MULTIPLE_CHOICE"
    | "RANKED_CHOICE"
    | "WEIGHTED_VOTING"
    | "ANONYMOUS"
    | "YES_NO"
    | "SATISFACTION_RATING"
    | "DATE_SELECTION"
    | "APPROVAL";
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";
  anonymity: "PUBLIC" | "ANONYMOUS" | "FULLY_ANONYMOUS";
  resultsVisibility: "LIVE" | "AFTER_END" | "STAFF_ONLY";
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

const DEMO_POLLS: PollSummary[] = [
  {
    id: "community-game-night",
    title: "Sondage Communautaire : Soirée Jeux du Vendredi",
    description: "Choix du jeu officiel pour le grand tournoi amical de la communauté ETHONE avec attribution automatique du rôle d'équipe.",
    category: "Communauté",
    type: "SINGLE_CHOICE",
    status: "ACTIVE",
    anonymity: "PUBLIC",
    resultsVisibility: "LIVE",
    totalVotes: 128,
    uniqueVoters: 114,
    participationRate: 76.2,
    questionsCount: 1,
    endsAt: "Dans 2 jours",
    updatedAt: "Il y a 10 min",
  },
  {
    id: "staff-decision-01",
    title: "Décision Staff : Révision des Sanctions AutoMod 2.0",
    description: "Vote confidentiel interne de l'équipe de modération pour valider le nouveau barème des avertissements et expulsions temporaires.",
    category: "Décisions Staff",
    type: "APPROVAL",
    status: "ACTIVE",
    anonymity: "ANONYMOUS",
    resultsVisibility: "STAFF_ONLY",
    totalVotes: 11,
    uniqueVoters: 11,
    participationRate: 91.6,
    questionsCount: 1,
    quorumMet: true,
    quorumPercentage: 88.0,
    endsAt: "Ce soir à 23h59",
    updatedAt: "Il y a 1 heure",
  },
  {
    id: "feedback-event-01",
    title: "Satisfaction & Retours : Tournoi PvP Saison 4",
    description: "Évaluation de l'arbitrage, de l'organisation et notation sur 5 étoiles de l'événement communautaire.",
    category: "Feedback",
    type: "SATISFACTION_RATING",
    status: "ENDED",
    anonymity: "FULLY_ANONYMOUS",
    resultsVisibility: "LIVE",
    totalVotes: 82,
    uniqueVoters: 82,
    participationRate: 64.0,
    questionsCount: 2,
    updatedAt: "Hier",
  },
];

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  SINGLE_CHOICE: { label: "Choix Unique", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30", icon: Vote },
  MULTIPLE_CHOICE: { label: "Choix Multiple", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: Layers },
  RANKED_CHOICE: { label: "Vote Préférentiel", color: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: Award },
  WEIGHTED_VOTING: { label: "Pondéré par Rôles", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: ShieldCheck },
  ANONYMOUS: { label: "Bulletin Secret", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: Sparkles },
  YES_NO: { label: "Oui / Non", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30", icon: CheckCircle2 },
  SATISFACTION_RATING: { label: "Note Satisfaction", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: Sparkles },
  DATE_SELECTION: { label: "Choix de Date", color: "bg-pink-500/10 text-pink-400 border-pink-500/30", icon: Calendar },
  APPROVAL: { label: "Approbation Staff", color: "bg-rose-500/10 text-rose-400 border-rose-500/30", icon: ShieldCheck },
};

export default function PollsCenterClient() {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const showToast = (msg: string, type?: string) => {
    if (type === "error") toastError(msg);
    else if (type === "info") toastInfo(msg);
    else toastSuccess(msg);
  };
  const { profile } = useDiscordOAuth();
  const searchParams = useSearchParams();
  const guildParam = searchParams.get("guildId") || profile?.guilds?.[0]?.id || "123456789012345678";

  const [polls, setPolls] = useState<PollSummary[]>(DEMO_POLLS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [deployModalPoll, setDeployModalPoll] = useState<PollSummary | null>(null);
  const [targetChannelId, setTargetChannelId] = useState("");

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
    const avgParticipation =
      total > 0
        ? Math.round((polls.reduce((acc, p) => acc + p.participationRate, 0) / total) * 10) / 10
        : 0;
    return { total, active, totalVotes, avgParticipation };
  }, [polls]);

  const handleCopyLink = (pollId: string) => {
    const url = `${window.location.origin}/discord/polls/${pollId}/vote?guildId=${guildParam}`;
    navigator.clipboard.writeText(url);
    showToast("Lien de vote copié dans le presse-papier !", "success");
  };

  const handleTogglePause = (poll: PollSummary) => {
    const newStatus = poll.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setPolls((prev) =>
      prev.map((p) => (p.id === poll.id ? { ...p, status: newStatus } : p))
    );
    showToast(
      newStatus === "ACTIVE"
        ? `Sondage "${poll.title}" réactivé.`
        : `Sondage "${poll.title}" mis en pause.`,
      "info"
    );
  };

  const handleClosePoll = (poll: PollSummary) => {
    setPolls((prev) =>
      prev.map((p) => (p.id === poll.id ? { ...p, status: "ENDED" } : p))
    );
    showToast(`Sondage "${poll.title}" clôturé. Résultats consolidés !`, "success");
  };

  const handleDuplicate = (poll: PollSummary) => {
    const clone: PollSummary = {
      ...poll,
      id: `poll-${Date.now().toString(36)}`,
      title: `${poll.title} (Copie)`,
      status: "DRAFT",
      totalVotes: 0,
      uniqueVoters: 0,
      participationRate: 0,
      updatedAt: "À l'instant",
    };
    setPolls((prev) => [clone, ...prev]);
    showToast(`Sondage dupliqué en brouillon !`, "success");
  };

  const handleDeployConfirm = () => {
    if (!deployModalPoll) return;
    showToast(
      `Panneau de vote déployé sur Discord avec succès (${targetChannelId || "#général"}) !`,
      "success"
    );
    setDeployModalPoll(null);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
      {/* Top Background Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-indigo-600 blur-[130px]" />
        <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-purple-600 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-zinc-400">
          <Link href={`/discord?guildId=${guildParam}`} className="hover:text-white transition-colors">
            Discord Center
          </Link>
          <ChevronRight className="h-3 w-3 text-zinc-600" />
          <span className="text-zinc-200 font-medium">Sondages & Votes 2.0</span>
        </div>

        {/* Header Hero Section */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 mb-3">
              <Vote className="h-3.5 w-3.5" />
              Sondages, Votes & Prise de Décision 2.0
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Polls & Voting Center
            </h1>
            <p className="mt-1 text-sm text-zinc-400 max-w-2xl">
              Créez des sondages démocratiques, des décisions d'équipe pondérées par les rôles Discord,
              des votes à bulletin secret ou des notations de satisfaction en temps réel.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/discord/polls/create?guildId=${guildParam}`}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Nouveau Sondage
            </Link>
          </div>
        </div>

        {/* KPI Metrics Strip */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Sondages Totaux</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <Vote className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{kpis.total}</span>
              <span className="text-xs text-zinc-500">configurés</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {kpis.active} actifs actuellement
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Suffrages Exprimés</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{kpis.totalVotes}</span>
              <span className="text-xs text-zinc-500">voix enregistrées</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-purple-400">
              <TrendingUp className="h-3.5 w-3.5" />
              +14% cette semaine
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Participation Moyenne</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{kpis.avgParticipation}%</span>
              <span className="text-xs text-zinc-500">des membres éligibles</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Excellent engagement
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Gouvernance & Sécurité</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">100%</span>
              <span className="text-xs text-zinc-500">anti-fraude</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
              Pondération rôles & secret
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Rechercher un sondage, mot-clé, tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 backdrop-blur focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status filters */}
            <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
              {["ALL", "ACTIVE", "PAUSED", "ENDED", "DRAFT"].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={cn(
                    "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                    selectedStatus === st
                      ? "bg-indigo-600 text-white shadow"
                      : "text-zinc-400 hover:text-white"
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
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">Tous types de vote</option>
              {Object.entries(TYPE_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>

            {/* Category selector */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "Toutes catégories" : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Polls Cards Grid */}
        {filteredPolls.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 py-16 text-center">
            <Vote className="h-12 w-12 text-zinc-600 mb-3" />
            <h3 className="text-base font-medium text-white">Aucun sondage trouvé</h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
              Modifiez vos critères de recherche ou commencez par créer un premier vote communautaire.
            </p>
            <Link
              href={`/discord/polls/create?guildId=${guildParam}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Créer un sondage
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredPolls.map((poll) => {
              const typeCfg = TYPE_CONFIG[poll.type] || TYPE_CONFIG.SINGLE_CHOICE;
              const TypeIcon = typeCfg.icon;

              return (
                <div
                  key={poll.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/50 hover:bg-zinc-900/70"
                >
                  {/* Card Top badges */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                            typeCfg.color
                          )}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {typeCfg.label}
                        </span>

                        <span className="rounded-full border border-zinc-800 bg-zinc-800/50 px-2.5 py-0.5 text-[10px] text-zinc-400">
                          {poll.category}
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div>
                        {poll.status === "ACTIVE" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            En cours
                          </span>
                        )}
                        {poll.status === "PAUSED" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                            <PauseCircle className="h-3 w-3" />
                            En pause
                          </span>
                        )}
                        {poll.status === "ENDED" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/80 border border-zinc-700 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Clôturé
                          </span>
                        )}
                        {poll.status === "DRAFT" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-purple-400">
                            Brouillon
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {poll.title}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {poll.description}
                    </p>

                    {/* Progress Bar / Stats */}
                    <div className="mt-4 rounded-xl border border-zinc-800/50 bg-black/30 p-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-indigo-400" />
                          Participation
                        </span>
                        <span className="font-bold text-white">
                          {poll.totalVotes} voix ({poll.participationRate}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, poll.participationRate)}%` }}
                        />
                      </div>

                      {/* Quorum status if applicable */}
                      {poll.quorumPercentage !== undefined && (
                        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/50 pt-1.5">
                          <span>Quorum statut :</span>
                          <span
                            className={cn(
                              "font-semibold",
                              poll.quorumMet ? "text-emerald-400" : "text-amber-400"
                            )}
                          >
                            {poll.quorumMet ? "✅ Atteint" : "⏳ En attente"} ({poll.quorumPercentage}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Meta & Actions */}
                  <div className="mt-5 border-t border-zinc-800/80 pt-3">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-3">
                      <span>{poll.endsAt || `Modifié ${poll.updatedAt}`}</span>
                      <span>ID : {poll.id.slice(0, 10)}...</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/discord/polls/${poll.id}/results?guildId=${guildParam}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-zinc-700 hover:text-white"
                      >
                        <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
                        Résultats
                      </Link>

                      <Link
                        href={`/discord/polls/${poll.id}?guildId=${guildParam}`}
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        title="Configurer le sondage"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Link>

                      <button
                        onClick={() => handleCopyLink(poll.id)}
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        title="Copier le lien public de vote"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => setDeployModalPoll(poll)}
                        className="inline-flex items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2 text-indigo-400 hover:bg-indigo-500 hover:text-white"
                        title="Déployer sur Discord"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleTogglePause(poll)}
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800"
                        title={poll.status === "ACTIVE" ? "Mettre en pause" : "Reprendre"}
                      >
                        {poll.status === "ACTIVE" ? (
                          <PauseCircle className="h-3.5 w-3.5" />
                        ) : (
                          <PlayCircle className="h-3.5 w-3.5" />
                        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Send className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-white">Déployer sur Discord</h3>
              </div>
              <button
                onClick={() => setDeployModalPoll(null)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-4">
              Sélectionnez le salon textuel Discord dans lequel le bot ETHONE publiera le panneau interactif
              pour le sondage <strong className="text-zinc-200">"{deployModalPoll.title}"</strong>.
            </p>

            <div className="space-y-3 mb-5">
              <label className="block text-xs font-medium text-zinc-300">
                Salon Discord de destination
              </label>
              <select
                value={targetChannelId}
                onChange={(e) => setTargetChannelId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value=""># annonces-officielles</option>
                <option value="123456789012345688"># sondages-communauté</option>
                <option value="123456789012345689"># staff-privé</option>
                <option value="123456789012345690"># général</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeployModalPoll(null)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={handleDeployConfirm}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/25"
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
