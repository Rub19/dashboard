"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Trophy,
  Users,
  Download,
  CheckCircle2,
  AlertCircle,
  Share2,
  ChevronRight,
  RefreshCw,
  Clock,
  ShieldCheck,
  Vote,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

export default function PollResultsClient() {
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

  const isStaffPoll = pollId === "staff-decision-01";

  const results = {
    pollId,
    title: isStaffPoll
      ? "Décision Staff : Révision des Sanctions AutoMod 2.0"
      : "Sondage Communautaire : Soirée Jeux du Vendredi",
    status: "ACTIVE",
    totalVotes: isStaffPoll ? 11 : 128,
    totalVoters: isStaffPoll ? 11 : 114,
    participationRate: isStaffPoll ? 91.6 : 76.2,
    quorumStatus: isStaffPoll ? "PASSED" : "NOT_APPLICABLE",
    quorumPercentage: isStaffPoll ? 88.0 : 76.2,
    winningOption: isStaffPoll
      ? { label: "Approuver (Pour)", emoji: "✅", votes: 8, points: 8, percent: 72.7 }
      : { label: "Valorant (Custom 5v5)", emoji: "🎯", votes: 52, points: 64, percent: 40.6 },
    questions: [
      {
        id: "q1",
        title: isStaffPoll
          ? "Approuvez-vous la mise en place du barème AutoMod 2.0 ?"
          : "À quel jeu souhaitez-vous jouer ce vendredi ?",
        totalVotes: isStaffPoll ? 11 : 128,
        options: isStaffPoll
          ? [
              { id: "opt-1", label: "Approuver (Pour)", emoji: "✅", votes: 8, points: 8, percent: 72.7, isWinner: true },
              { id: "opt-2", label: "Rejeter (Contre)", emoji: "❌", votes: 2, points: 2, percent: 18.2, isWinner: false },
              { id: "opt-3", label: "Abstention", emoji: "⚪", votes: 1, points: 1, percent: 9.1, isWinner: false },
            ]
          : [
              { id: "opt-valo", label: "Valorant (Custom 5v5)", emoji: "🎯", votes: 52, points: 64, percent: 40.6, isWinner: true },
              { id: "opt-mc", label: "Minecraft (Bedwars)", emoji: "⛏️", votes: 41, points: 49, percent: 32.0, isWinner: false },
              { id: "opt-lethal", label: "Lethal Company", emoji: "👽", votes: 22, points: 25, percent: 17.2, isWinner: false },
              { id: "opt-rocket", label: "Rocket League", emoji: "⚽", votes: 13, points: 15, percent: 10.2, isWinner: false },
            ],
      },
    ],
  };

  const handleExportCsv = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Question,Option,Suffrages,Points,Pourcentage,Gagnant\n" +
      results.questions
        .flatMap((q) =>
          q.options.map(
            (o) => `"${q.title}","${o.label}",${o.votes},${o.points},${o.percent}%,${o.isWinner}`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `poll-${pollId}-results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Export CSV généré et téléchargé !", "success");
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(results, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `poll-${pollId}-results.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Export JSON généré et téléchargé !", "success");
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
      {/* Top Glow Background */}
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
          <Link href={`/discord/polls/${pollId}?guildId=${guildParam}`} className="hover:text-white transition-colors">
            {results.title}
          </Link>
          <ChevronRight className="h-3 w-3 text-zinc-600" />
          <span className="text-zinc-200 font-medium">Résultats & Statistiques</span>
        </div>

        {/* Top Header Card */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 mb-2">
              <BarChart3 className="h-3.5 w-3.5" />
              Dépouillement & Analyse des Suffrages
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Résultats : {results.title}
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Statistiques consolidées en temps réel avec calcul de quorum et pondération des rôles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </button>
          </div>
        </div>

        {/* Winner Highlight Banner */}
        {results.winningOption && (
          <div className="mb-8 relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-zinc-900/50 to-indigo-500/10 p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-lg shadow-amber-500/20">
                  <Trophy className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Option en Tête des Suffrages
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xl">{results.winningOption.emoji}</span>
                    <h2 className="text-xl font-bold text-white sm:text-2xl">
                      {results.winningOption.label}
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {results.winningOption.votes} votes obtenus ({results.winningOption.percent}% des suffrages exprimés)
                  </p>
                </div>
              </div>

              {/* Quorum Badge */}
              {results.quorumStatus !== "NOT_APPLICABLE" && (
                <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-right">
                  <span className="text-[11px] text-zinc-400 block">Statut du Quorum :</span>
                  <span
                    className={cn(
                      "text-sm font-bold",
                      results.quorumStatus === "PASSED" ? "text-emerald-400" : "text-amber-400"
                    )}
                  >
                    {results.quorumStatus === "PASSED" ? "✅ Quorum Atteint & Validé" : "⏳ En Attente de Quorum"}
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">
                    {results.quorumPercentage}% de participation
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results per Question */}
        <div className="space-y-6">
          {results.questions.map((q) => (
            <div
              key={q.id}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-5 border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Vote className="h-4 w-4 text-indigo-400" />
                  {q.title}
                </h3>
                <span className="text-xs text-zinc-400">
                  Total : <strong>{q.totalVotes}</strong> votes
                </span>
              </div>

              <div className="space-y-4">
                {q.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={cn(
                      "rounded-xl border p-4 transition-all",
                      opt.isWinner
                        ? "border-indigo-500/50 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                        : "border-zinc-800 bg-black/30"
                    )}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{opt.emoji}</span>
                        <span className="text-sm font-bold text-white">{opt.label}</span>
                        {opt.isWinner && (
                          <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                            🏆 Vainqueur
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-zinc-400 text-xs">
                          <strong className="text-white">{opt.votes}</strong> voix ({opt.points} pts)
                        </span>
                        <span className="text-sm font-extrabold text-indigo-400">{opt.percent}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          opt.isWinner
                            ? "bg-gradient-to-r from-amber-400 to-indigo-500"
                            : "bg-gradient-to-r from-indigo-500 to-purple-500"
                        )}
                        style={{ width: `${opt.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
