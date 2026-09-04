"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Settings,
  ChevronRight,
  Save,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Archive,
  Eye,
  Sliders,
  ShieldCheck,
  Sparkles,
  Lock,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

export default function PollSettingsClient() {
  const params = useParams();
  const router = useRouter();
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

  const [title, setTitle] = useState(
    pollId === "staff-decision-01"
      ? "Décision Staff : Révision des Sanctions AutoMod 2.0"
      : "Sondage Communautaire : Soirée Jeux du Vendredi"
  );
  const [description, setDescription] = useState(
    "Consultation officielle pour organiser les activités du serveur."
  );
  const [category, setCategory] = useState(pollId === "staff-decision-01" ? "Décisions Staff" : "Communauté");
  const [anonymity, setAnonymity] = useState<"PUBLIC" | "ANONYMOUS" | "FULLY_ANONYMOUS">("PUBLIC");
  const [resultsVisibility, setResultsVisibility] = useState<"LIVE" | "AFTER_END" | "STAFF_ONLY">("LIVE");
  const [allowVoteChange, setAllowVoteChange] = useState(true);
  const [allowVoteRetract, setAllowVoteRetract] = useState(false);
  const [panelColor, setPanelColor] = useState("#8b5cf6");
  const [targetChannel, setTargetChannel] = useState("123456789012345688");

  const handleSaveSettings = () => {
    showToast("Paramètres du sondage mis à jour avec succès !", "success");
  };

  const handleResetVotes = () => {
    if (confirm("Êtes-vous sûr de vouloir réinitialiser TOUS les votes de ce scrutin ? Cette action est irréversible.")) {
      showToast("Tous les votes ont été réinitialisés.", "info");
    }
  };

  const handleDeletePoll = () => {
    if (confirm("Confirmez-vous la suppression définitive de ce sondage ?")) {
      showToast("Sondage supprimé avec succès.", "success");
      router.push(`/discord/polls?guildId=${guildParam}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
      {/* Top Glow Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-indigo-600 blur-[130px]" />
        <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-purple-600 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
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
            {title}
          </Link>
          <ChevronRight className="h-3 w-3 text-zinc-600" />
          <span className="text-zinc-200 font-medium">Paramètres</span>
        </div>

        {/* Top Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Paramètres du Sondage</h1>
            <p className="mt-1 text-xs text-zinc-400">
              Gérez les règles de vote, la confidentialité, le panneau Discord et les opérations sensibles.
            </p>
          </div>

          <button
            onClick={handleSaveSettings}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500"
          >
            <Save className="h-3.5 w-3.5" />
            Enregistrer les modifications
          </button>
        </div>

        <div className="space-y-6">
          {/* General Properties */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
            <h3 className="text-base font-bold text-white mb-4">Général</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Titre du Sondage
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Catégorie
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Voting Rules & Confidentiality */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
            <h3 className="text-base font-bold text-white mb-4">Règles & Confidentialité</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Niveau d'Anonymat
                </label>
                <select
                  value={anonymity}
                  onChange={(e) => setAnonymity(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="PUBLIC">Vote Public (identifiant enregistré)</option>
                  <option value="ANONYMOUS">Bulletin Secret (pseudonyme masqué)</option>
                  <option value="FULLY_ANONYMOUS">Anonymat Total (aucun traçage)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Visibilité des Résultats
                </label>
                <select
                  value={resultsVisibility}
                  onChange={(e) => setResultsVisibility(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="LIVE">En direct (visible par tous immédiatement)</option>
                  <option value="AFTER_END">Après la clôture du vote</option>
                  <option value="STAFF_ONLY">Réservé au Staff uniquement</option>
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-3 border-t border-zinc-800/80 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Autoriser la modification du vote
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Permet à un membre de changer d'avis avant la fin du scrutin
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={allowVoteChange}
                  onChange={(e) => setAllowVoteChange(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Autoriser le retrait de vote
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Permet d'annuler complètement son vote sans revoter
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={allowVoteRetract}
                  onChange={(e) => setAllowVoteRetract(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Discord Panel Configuration */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
            <h3 className="text-base font-bold text-white mb-4">Panneau Discord</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Couleur de l'Embed
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={panelColor}
                    onChange={(e) => setPanelColor(e.target.value)}
                    className="h-8 w-12 cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 p-1"
                  />
                  <input
                    type="text"
                    value={panelColor}
                    onChange={(e) => setPanelColor(e.target.value)}
                    className="w-32 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Salon Discord cible
                </label>
                <select
                  value={targetChannel}
                  onChange={(e) => setTargetChannel(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="123456789012345688"># sondages-communauté</option>
                  <option value="123456789012345689"># staff-privé</option>
                  <option value="123456789012345690"># annonces</option>
                </select>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-2 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              <h3 className="text-sm font-bold">Zone Dangereuse</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Les actions suivantes peuvent impacter irrémédiablement les données du scrutin.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleResetVotes}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-amber-400 hover:bg-zinc-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser les votes
              </button>

              <button
                onClick={handleDeletePoll}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/20 px-3.5 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer définitivement le sondage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
