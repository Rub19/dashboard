"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Vote,
  CheckCircle2,
  Lock,
  Sparkles,
  ShieldCheck,
  Send,
  ExternalLink,
  ChevronRight,
  Clock,
  Award,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

export default function PollVoteClient() {
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

  const poll = {
    id: pollId,
    title: isStaffPoll
      ? "Décision Staff : Révision des Sanctions AutoMod 2.0"
      : "Sondage Communautaire : Soirée Jeux du Vendredi",
    description: isStaffPoll
      ? "Vote confidentiel interne de l'équipe de modération pour valider le barème des sanctions."
      : "Sélectionnez le jeu officiel auquel vous souhaitez participer ce vendredi soir !",
    anonymity: isStaffPoll ? "ANONYMOUS" : "PUBLIC",
    type: isStaffPoll ? "APPROVAL" : "SINGLE_CHOICE",
    questions: [
      {
        id: "q1",
        title: isStaffPoll
          ? "Approuvez-vous la mise en place du barème AutoMod 2.0 ?"
          : "À quel jeu souhaitez-vous jouer ce vendredi ?",
        minSelections: 1,
        maxSelections: 1,
        options: isStaffPoll
          ? [
              { id: "opt-approve", label: "Approuver (Pour)", emoji: "✅", desc: "Adopter la réforme immédiatement" },
              { id: "opt-reject", label: "Rejeter (Contre)", emoji: "❌", desc: "Conserver l'ancien barème" },
              { id: "opt-abstain", label: "Abstention", emoji: "⚪", desc: "Ne prend pas parti" },
            ]
          : [
              { id: "opt-valo", label: "Valorant (Custom 5v5)", emoji: "🎯", desc: "Tournoi amical inter-membres" },
              { id: "opt-mc", label: "Minecraft (Bedwars)", emoji: "⛏️", desc: "Serveur privé dédié" },
              { id: "opt-lethal", label: "Lethal Company", emoji: "👽", desc: "Escouades vocales de 4" },
              { id: "opt-rocket", label: "Rocket League", emoji: "⚽", desc: "Matches à élimination directe" },
            ],
      },
    ],
  };

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectOption = (qId: string, optId: string, maxChoices = 1) => {
    setSelectedOptions((prev) => {
      const current = prev[qId] || [];
      if (maxChoices === 1) {
        return { ...prev, [qId]: [optId] };
      }
      if (current.includes(optId)) {
        return { ...prev, [qId]: current.filter((id) => id !== optId) };
      }
      if (current.length >= maxChoices) {
        showToast(`Vous ne pouvez choisir que ${maxChoices} option(s).`, "error");
        return prev;
      }
      return { ...prev, [qId]: [...current, optId] };
    });
  };

  const handleSubmitVote = () => {
    // Validate that required questions have choices
    for (const q of poll.questions) {
      const chosen = selectedOptions[q.id] || [];
      if (chosen.length < q.minSelections) {
        showToast(`Veuillez sélectionner au moins ${q.minSelections} option(s).`, "error");
        return;
      }
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setHasVoted(true);
      showToast("Votre vote a été enregistré avec succès !", "success");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30 flex flex-col justify-between">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-25">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-indigo-600 blur-[140px]" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-purple-600 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        {/* Portal Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-400 mb-3">
            <Vote className="h-3.5 w-3.5" />
            Portail de Vote ETHONE
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {poll.title}
          </h1>
          <p className="mt-2 text-xs text-zinc-400 max-w-lg mx-auto leading-relaxed">
            {poll.description}
          </p>
        </div>

        {/* Anonymity Banner */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Lock className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {poll.anonymity === "PUBLIC"
                  ? "Scrutin Public"
                  : "Bulletin Secret & Confidentiel"}
              </span>
              <span className="text-[11px] text-zinc-400">
                {poll.anonymity === "PUBLIC"
                  ? "Votre participation est certifiée et associée à votre profil Discord."
                  : "Votre choix est entièrement dissocié de votre identité Discord."}
              </span>
            </div>
          </div>
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
        </div>

        {/* Voted Confirmation State */}
        {hasVoted ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 mb-4">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Vote Enregistré avec Succès !</h2>
            <p className="text-xs text-zinc-300 max-w-md mx-auto mb-6">
              Merci pour votre participation. Vos suffrages ont été pris en compte et consolidés dans
              le décompte officiel du serveur.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/discord/polls/${poll.id}/results?guildId=${guildParam}`}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/25"
              >
                Voir les Résultats en direct
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => setHasVoted(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Modifier mon vote
              </button>
            </div>
          </div>
        ) : (
          /* Voting Options Card */
          <div className="space-y-6">
            {poll.questions.map((q) => {
              const currentSelections = selectedOptions[q.id] || [];

              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl"
                >
                  <h3 className="text-sm font-bold text-white mb-4">❓ {q.title}</h3>

                  <div className="space-y-3">
                    {q.options.map((opt) => {
                      const isSelected = currentSelections.includes(opt.id);

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(q.id, opt.id, q.maxSelections)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-xl border p-4 text-left transition-all",
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/10 scale-[1.01]"
                              : "border-zinc-800 bg-black/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/40"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{opt.emoji}</span>
                            <div>
                              <span className="text-sm font-bold text-white block">{opt.label}</span>
                              {opt.desc && (
                                <span className="text-[11px] text-zinc-400 block mt-0.5">{opt.desc}</span>
                              )}
                            </div>
                          </div>

                          <div
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                              isSelected
                                ? "border-indigo-500 bg-indigo-600 text-white"
                                : "border-zinc-700 bg-zinc-800/50"
                            )}
                          >
                            {isSelected && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-zinc-500">
                Vote modifiable avant la fin du scrutin.
              </span>
              <button
                onClick={handleSubmitVote}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Valider mon vote
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <footer className="relative z-10 py-6 text-center text-xs text-zinc-600 border-t border-zinc-900">
        Propulsé par <strong className="text-zinc-400">ETHONE Discord Bot</strong> • Système de Vote Sécurisé
      </footer>
    </div>
  );
}
