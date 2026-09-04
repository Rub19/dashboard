"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Vote,
  BarChart3,
  Settings,
  Copy,
  ExternalLink,
  ChevronRight,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Clock,
  Users,
  ShieldCheck,
  Send,
  Calendar,
  Layers,
  Award,
  Zap,
  Sparkles,
  Search,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

interface PollVoteEntry {
  id: string;
  userId: string;
  userTag: string;
  userAvatar?: string;
  selectedOptionIds: string[];
  weight: number;
  votedAt: string;
}

export default function PollDetailClient() {
  const params = useParams();
  const pollId = (params?.pollId as string) || "community-game-night";
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const showToast = (msg: string, type?: string) => {
    if (type === "error") toastError(msg);
    else if (type === "info") toastInfo(msg);
    else toastSuccess(msg);
  };
  const { profile } = useDiscordOAuth();
  const searchParams = useSearchParams();
  const guildParam = searchParams.get("guildId") || profile?.guilds?.[0]?.id || "123456789012345678";

  const [activeTab, setActiveTab] = useState<"questions" | "voters" | "automations">("questions");
  const [pollStatus, setPollStatus] = useState<"ACTIVE" | "PAUSED" | "ENDED">("ACTIVE");
  const [searchVoters, setSearchVoters] = useState("");

  const poll = {
    id: pollId,
    title:
      pollId === "staff-decision-01"
        ? "Décision Staff : Révision des Sanctions AutoMod 2.0"
        : "Sondage Communautaire : Soirée Jeux du Vendredi",
    description:
      "Consultation officielle pour organiser les activités du serveur et récompenser les participants.",
    category: pollId === "staff-decision-01" ? "Décisions Staff" : "Communauté",
    type: pollId === "staff-decision-01" ? "APPROVAL" : "SINGLE_CHOICE",
    totalVotes: pollId === "staff-decision-01" ? 11 : 128,
    uniqueVoters: pollId === "staff-decision-01" ? 11 : 114,
    participationRate: pollId === "staff-decision-01" ? 91.6 : 76.2,
    anonymity: pollId === "staff-decision-01" ? "ANONYMOUS" : "PUBLIC",
    questions: [
      {
        id: "q1",
        title:
          pollId === "staff-decision-01"
            ? "Approuvez-vous la mise en place du barème AutoMod 2.0 ?"
            : "À quel jeu souhaitez-vous jouer ce vendredi ?",
        options:
          pollId === "staff-decision-01"
            ? [
                { id: "opt-1", label: "Approuver (Pour)", emoji: "✅", votes: 8, points: 8, percent: 72.7 },
                { id: "opt-2", label: "Rejeter (Contre)", emoji: "❌", votes: 2, points: 2, percent: 18.2 },
                { id: "opt-3", label: "Abstention", emoji: "⚪", votes: 1, points: 1, percent: 9.1 },
              ]
            : [
                { id: "opt-valo", label: "Valorant (Custom 5v5)", emoji: "🎯", votes: 52, points: 64, percent: 40.6 },
                { id: "opt-mc", label: "Minecraft (Bedwars)", emoji: "⛏️", votes: 41, points: 49, percent: 32.0 },
                { id: "opt-lethal", label: "Lethal Company", emoji: "👽", votes: 22, points: 25, percent: 17.2 },
                { id: "opt-rocket", label: "Rocket League", emoji: "⚽", votes: 13, points: 15, percent: 10.2 },
              ],
      },
    ],
  };

  const demoVotes: PollVoteEntry[] = [
    {
      id: "vote-1",
      userId: "123456789012345678",
      userTag: poll.anonymity === "PUBLIC" ? "Alexandre#1337" : "Votant Anonyme",
      selectedOptionIds: ["opt-valo"],
      weight: 2,
      votedAt: "Il y a 10 min",
    },
    {
      id: "vote-2",
      userId: "234567890123456789",
      userTag: poll.anonymity === "PUBLIC" ? "Sophie_Gamer#4242" : "Votant Anonyme",
      selectedOptionIds: ["opt-mc"],
      weight: 1,
      votedAt: "Il y a 25 min",
    },
    {
      id: "vote-3",
      userId: "345678901234567890",
      userTag: poll.anonymity === "PUBLIC" ? "ThomasDev#9999" : "Votant Anonyme",
      selectedOptionIds: ["opt-valo"],
      weight: 1,
      votedAt: "Il y a 45 min",
    },
  ];

  const filteredVotes = useMemo(() => {
    if (!searchVoters.trim()) return demoVotes;
    const q = searchVoters.toLowerCase();
    return demoVotes.filter((v) => v.userTag.toLowerCase().includes(q) || v.id.includes(q));
  }, [demoVotes, searchVoters]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/discord/polls/${poll.id}/vote?guildId=${guildParam}`;
    navigator.clipboard.writeText(url);
    showToast("Lien de vote copié !", "success");
  };

  const handleToggleStatus = () => {
    const next = pollStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setPollStatus(next);
    showToast(next === "ACTIVE" ? "Sondage réactivé." : "Sondage mis en pause.", "info");
  };

  const handleExtend = () => {
    showToast("Durée du sondage prolongée de 24 heures !", "success");
  };

  const handleEndNow = () => {
    setPollStatus("ENDED");
    showToast("Sondage clôturé avec succès. Les automatisations ont été exécutées.", "success");
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
          <Link href={`/discord/polls?guildId=${guildParam}`} className="hover:text-white transition-colors">
            Sondages & Votes
          </Link>
          <ChevronRight className="h-3 w-3 text-zinc-600" />
          <span className="text-zinc-200 font-medium">{poll.title}</span>
        </div>

        {/* Top Header Card */}
        <div className="mb-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full border border-zinc-800 bg-zinc-800/50 px-2.5 py-0.5 text-xs text-zinc-400">
                  {poll.category}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
                  <Vote className="h-3 w-3" />
                  {poll.type}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    pollStatus === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : pollStatus === "PAUSED"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  {pollStatus === "ACTIVE" ? "En cours" : pollStatus === "PAUSED" ? "En pause" : "Clôturé"}
                </span>
              </div>

              <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{poll.title}</h1>
              <p className="mt-1 text-xs text-zinc-400 max-w-2xl">{poll.description}</p>
            </div>

            {/* Actions button group */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/discord/polls/${poll.id}/results?guildId=${guildParam}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Résultats
              </Link>

              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800"
              >
                <Copy className="h-3.5 w-3.5" />
                Lien Public
              </button>

              <button
                onClick={handleToggleStatus}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-amber-400 hover:bg-zinc-800"
              >
                {pollStatus === "ACTIVE" ? (
                  <>
                    <PauseCircle className="h-3.5 w-3.5" />
                    Mettre en pause
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-3.5 w-3.5" />
                    Reprendre
                  </>
                )}
              </button>

              <button
                onClick={handleExtend}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800"
              >
                <Clock className="h-3.5 w-3.5" />
                +24h
              </button>

              <Link
                href={`/discord/polls/${poll.id}/settings?guildId=${guildParam}`}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Quick KPI stats row */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-zinc-800/80 pt-4">
            <div>
              <span className="text-[11px] text-zinc-500 block">Total Suffrages</span>
              <span className="text-lg font-bold text-white">{poll.totalVotes}</span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 block">Votants Uniques</span>
              <span className="text-lg font-bold text-white">{poll.uniqueVoters}</span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 block">Taux Participation</span>
              <span className="text-lg font-bold text-emerald-400">{poll.participationRate}%</span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 block">Mode Anonymat</span>
              <span className="text-lg font-bold text-indigo-400">{poll.anonymity}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex border-b border-zinc-800 pb-2">
          {[
            { id: "questions", label: "Questions & Réponses", icon: Layers },
            { id: "voters", label: "Émargement & Votants", icon: Users },
            { id: "automations", label: "Automatisations & Déclencheurs", icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all",
                  isActive
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-indigo-400" : "text-zinc-500")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Questions & Option breakdown */}
        {activeTab === "questions" && (
          <div className="space-y-6">
            {poll.questions.map((q) => (
              <div
                key={q.id}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl"
              >
                <h3 className="text-base font-bold text-white mb-4">❓ {q.title}</h3>
                <div className="space-y-3">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className="rounded-xl border border-zinc-800 bg-black/30 p-4"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{opt.emoji}</span>
                          <span className="font-bold text-white">{opt.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-400">
                            <strong>{opt.votes}</strong> voix ({opt.points} pts)
                          </span>
                          <span className="font-bold text-indigo-400">{opt.percent}%</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                          style={{ width: `${opt.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Voters Table */}
        {activeTab === "voters" && (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Registre des Votants</h3>
                <p className="text-xs text-zinc-400">
                  {poll.anonymity === "PUBLIC"
                    ? "Liste nominative des participants avec options choisies et pondération appliquée."
                    : "Sondage à bulletin secret : les pseudonymes sont automatiquement anonymisés."}
                </p>
              </div>

              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filtrer votant ou ID..."
                  value={searchVoters}
                  onChange={(e) => setSearchVoters(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase">
                  <tr>
                    <th className="pb-3">Votant</th>
                    <th className="pb-3">Choix sélectionné</th>
                    <th className="pb-3">Coefficient</th>
                    <th className="pb-3">Horodatage</th>
                    <th className="pb-3 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredVotes.map((v) => (
                    <tr key={v.id} className="hover:bg-zinc-800/30">
                      <td className="py-3 font-medium text-white flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-400 font-bold">
                          {v.userTag.slice(0, 2).toUpperCase()}
                        </div>
                        {v.userTag}
                      </td>
                      <td className="py-3 text-zinc-300">{v.selectedOptionIds.join(", ")}</td>
                      <td className="py-3">
                        <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-bold text-indigo-400">
                          {v.weight}x
                        </span>
                      </td>
                      <td className="py-3 text-zinc-500">{v.votedAt}</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Validé
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Automations */}
        {activeTab === "automations" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
              <h3 className="text-base font-bold text-white mb-2">Automatisations Liées au Scrutin</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Ces actions seront automatiquement exécutées par ETHONE dès que le vote sera clôturé.
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                      <Send className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Annonce automatique de l'option gagnante
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        Publication dans #annonces dès clôture du sondage
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                    Actif
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Attribution de rôle selon l'option votée
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        Attribue automatiquement le rôle de l'équipe du jeu sélectionné
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                    Actif
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
