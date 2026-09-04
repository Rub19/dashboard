"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Vote,
  Plus,
  Trash2,
  ChevronRight,
  Sparkles,
  Layers,
  Award,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Save,
  Send,
  Eye,
  Settings,
  HelpCircle,
  Clock,
  Zap,
  Sliders,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

interface OptionItem {
  id: string;
  label: string;
  emoji: string;
  color: string;
  weight: number;
  description: string;
}

interface QuestionItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: OptionItem[];
}

export default function PollCreateClient() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const showToast = (msg: string, type?: string) => {
    if (type === "error") toastError(msg);
    else if (type === "info") toastInfo(msg);
    else toastSuccess(msg);
  };
  const { profile } = useDiscordOAuth();
  const searchParams = useSearchParams();
  const guildParam = searchParams.get("guildId") || profile?.guilds?.[0]?.id || "123456789012345678";

  const [activeTab, setActiveTab] = useState<"general" | "questions" | "eligibility" | "quorum" | "panel">("general");

  // General state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Communauté");
  const [pollType, setPollType] = useState<string>("SINGLE_CHOICE");
  const [durationHours, setDurationHours] = useState(48);

  // Questions state
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: "q-1",
      title: "Quelle est votre option préférée ?",
      description: "Sélectionnez votre choix ci-dessous",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      options: [
        { id: "opt-1", label: "Option A", emoji: "🟢", color: "#10b981", weight: 1, description: "Première alternative" },
        { id: "opt-2", label: "Option B", emoji: "🔵", color: "#3b82f6", weight: 1, description: "Deuxième alternative" },
      ],
    },
  ]);

  // Eligibility & Weights state
  const [logicGate, setLogicGate] = useState<"ANY" | "ALL">("ANY");
  const [minAccountAgeDays, setMinAccountAgeDays] = useState(0);
  const [minGuildMembershipDays, setMinGuildMembershipDays] = useState(0);
  const [roleWeights, setRoleWeights] = useState([
    { roleId: "role-vip", roleName: "VIP", weightMultiplier: 2 },
    { roleId: "role-booster", roleName: "Server Booster", weightMultiplier: 2 },
  ]);

  // Quorum & Anonymity state
  const [quorumEnabled, setQuorumEnabled] = useState(false);
  const [minParticipantsCount, setMinParticipantsCount] = useState(10);
  const [approvalThreshold, setApprovalThreshold] = useState(50);
  const [anonymity, setAnonymity] = useState<"PUBLIC" | "ANONYMOUS" | "FULLY_ANONYMOUS">("PUBLIC");
  const [resultsVisibility, setResultsVisibility] = useState<"LIVE" | "AFTER_END" | "STAFF_ONLY">("LIVE");
  const [allowVoteChange, setAllowVoteChange] = useState(true);

  // Panel state
  const [panelColor, setPanelColor] = useState("#6366f1");
  const [targetChannel, setTargetChannel] = useState("123456789012345688");

  // Question manipulations
  const handleAddQuestion = () => {
    const newQ: QuestionItem = {
      id: `q-${Date.now().toString(36)}`,
      title: "Nouvelle Question",
      description: "",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      options: [
        { id: `opt-${Date.now()}-1`, label: "Oui", emoji: "✅", color: "#10b981", weight: 1, description: "" },
        { id: `opt-${Date.now()}-2`, label: "Non", emoji: "❌", color: "#f43f5e", weight: 1, description: "" },
      ],
    };
    setQuestions((prev) => [...prev, newQ]);
    showToast("Question ajoutée", "info");
  };

  const handleRemoveQuestion = (qId: string) => {
    if (questions.length <= 1) {
      showToast("Un sondage doit comporter au moins une question.", "error");
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  const handleAddOption = (qId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        const newOpt: OptionItem = {
          id: `opt-${Date.now().toString(36)}`,
          label: `Option ${q.options.length + 1}`,
          emoji: "🔹",
          color: "#6366f1",
          weight: 1,
          description: "",
        };
        return { ...q, options: [...q.options, newOpt] };
      })
    );
  };

  const handleRemoveOption = (qId: string, optId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        if (q.options.length <= 2) {
          showToast("Une question doit comporter au moins 2 options.", "error");
          return q;
        }
        return { ...q, options: q.options.filter((o) => o.id !== optId) };
      })
    );
  };

  const handleSave = (publish = false) => {
    if (!title.trim()) {
      showToast("Veuillez renseigner le titre du sondage.", "error");
      setActiveTab("general");
      return;
    }

    const pollId = `poll-${Date.now().toString(36)}`;
    showToast(
      publish
        ? "Sondage publié et déployé avec succès !"
        : "Sondage enregistré comme brouillon.",
      "success"
    );
    router.push(`/discord/polls?guildId=${guildParam}`);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
      {/* Top Background Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-indigo-600 blur-[130px]" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-purple-600 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2 text-xs text-zinc-400">
          <Link href={`/discord?guildId=${guildParam}`} className="hover:text-white transition-colors">
            Discord Center
          </Link>
          <ChevronRight className="h-3 w-3 text-zinc-600" />
          <Link href={`/discord/polls?guildId=${guildParam}`} className="hover:text-white transition-colors">
            Sondages & Votes
          </Link>
          <ChevronRight className="h-3 w-3 text-zinc-600" />
          <span className="text-zinc-200 font-medium">Créateur de Sondage</span>
        </div>

        {/* Header Hero */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Nouveau Sondage ou Vote
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Configurez le type de scrutin, les questions à choix multiples, les règles d'éligibilité et l'affichage Discord.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
            >
              <Save className="h-3.5 w-3.5" />
              Sauvegarder Brouillon
            </button>
            <button
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Send className="h-3.5 w-3.5" />
              Publier Immédiatement
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex overflow-x-auto border-b border-zinc-800 pb-2">
          {[
            { id: "general", label: "Général & Scrutin", icon: Vote },
            { id: "questions", label: "Questions & Options", icon: Layers },
            { id: "eligibility", label: "Éligibilité & Pondération", icon: ShieldCheck },
            { id: "quorum", label: "Quorum & Confidentialité", icon: Sparkles },
            { id: "panel", label: "Panneau Discord & Preview", icon: Eye },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all",
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

        {/* Tab 1: General Info */}
        {activeTab === "general" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
                <h3 className="text-base font-bold text-white mb-4">Informations Générales</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Titre du Sondage <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Élection du Représentant de Communauté 2026"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Description explicative
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Expliquez l'objectif de la consultation ou les consignes de vote..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Catégorie
                      </label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Durée du scrutin (heures)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value))}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Voting Type Selection */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
                <h3 className="text-base font-bold text-white mb-2">Mode de Scrutin & Mécanique de Vote</h3>
                <p className="text-xs text-zinc-400 mb-4">
                  Choisissez la règle mathématique utilisée pour déterminer le vainqueur et comptabiliser les suffrages.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { id: "SINGLE_CHOICE", label: "Choix Unique", desc: "1 seule réponse possible", icon: Vote },
                    { id: "MULTIPLE_CHOICE", label: "Choix Multiple", desc: "Plusieurs choix autorisés", icon: Layers },
                    { id: "APPROVAL", label: "Approbation / Rejet", desc: "Pour, Contre ou Abstention", icon: ShieldCheck },
                    { id: "RANKED_CHOICE", label: "Vote Préférentiel", desc: "Classement des options par ordre", icon: Award },
                    { id: "WEIGHTED_VOTING", label: "Pondéré Rôles", desc: "Multiplicateur de voix selon le rang", icon: Zap },
                    { id: "SATISFACTION_RATING", label: "Score & Notation", desc: "Évaluation sur 5 étoiles ou note", icon: Sparkles },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSel = pollType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPollType(item.id)}
                        className={cn(
                          "flex flex-col items-start rounded-xl border p-4 text-left transition-all",
                          isSel
                            ? "border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/10"
                            : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-white"
                        )}
                      >
                        <div className={cn("p-2 rounded-lg mb-2", isSel ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400")}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-white">{item.label}</span>
                        <span className="text-[11px] text-zinc-400 mt-1">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Summary Sidebar */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  Résumé de Configuration
                </h4>
                <div className="space-y-2.5 text-xs text-zinc-300">
                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Type de scrutin :</span>
                    <span className="font-semibold text-indigo-400">{pollType}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Durée :</span>
                    <span className="font-semibold text-white">{durationHours} heures</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Questions :</span>
                    <span className="font-semibold text-white">{questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Anonymat :</span>
                    <span className="font-semibold text-white">{anonymity}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Questions & Options Builder */}
        {activeTab === "questions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Questions & Options du Sondage</h3>
                <p className="text-xs text-zinc-400">
                  Définissez l'intitulé des questions, le nombre minimal/maximal de choix et personnalisez chaque option.
                </p>
              </div>
              <button
                onClick={handleAddQuestion}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une question
              </button>
            </div>

            {questions.map((q, qIndex) => (
              <div
                key={q.id}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
                      {qIndex + 1}
                    </span>
                    <h4 className="text-sm font-bold text-white">Question #{qIndex + 1}</h4>
                  </div>
                  <button
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                    title="Supprimer la question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Intitulé de la question
                    </label>
                    <input
                      type="text"
                      value={q.title}
                      onChange={(e) =>
                        setQuestions((prev) =>
                          prev.map((item) =>
                            item.id === q.id ? { ...item, title: e.target.value } : item
                          )
                        )
                      }
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Min Choix
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={q.minSelections}
                        onChange={(e) =>
                          setQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id
                                ? { ...item, minSelections: Number(e.target.value) }
                                : item
                            )
                          )
                        }
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Max Choix
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={q.maxSelections}
                        onChange={(e) =>
                          setQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id
                                ? { ...item, maxSelections: Number(e.target.value) }
                                : item
                            )
                          )
                        }
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Options List */}
                <div className="space-y-2 mb-4">
                  <span className="text-xs font-semibold text-zinc-400">Options disponibles</span>
                  {q.options.map((opt, optIndex) => (
                    <div
                      key={opt.id}
                      className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-black/40 p-2.5"
                    >
                      <input
                        type="text"
                        value={opt.emoji}
                        onChange={(e) =>
                          setQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id
                                ? {
                                    ...item,
                                    options: item.options.map((o) =>
                                      o.id === opt.id ? { ...o, emoji: e.target.value } : o
                                    ),
                                  }
                                : item
                            )
                          )
                        }
                        className="w-12 text-center rounded-lg border border-zinc-800 bg-zinc-900 py-1 text-sm text-white focus:outline-none"
                      />

                      <input
                        type="text"
                        placeholder="Libellé de l'option"
                        value={opt.label}
                        onChange={(e) =>
                          setQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id
                                ? {
                                    ...item,
                                    options: item.options.map((o) =>
                                      o.id === opt.id ? { ...o, label: e.target.value } : o
                                    ),
                                  }
                                : item
                            )
                          )
                        }
                        className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-white focus:outline-none"
                      />

                      <input
                        type="text"
                        placeholder="Description optionnelle"
                        value={opt.description}
                        onChange={(e) =>
                          setQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id
                                ? {
                                    ...item,
                                    options: item.options.map((o) =>
                                      o.id === opt.id ? { ...o, description: e.target.value } : o
                                    ),
                                  }
                                : item
                            )
                          )
                        }
                        className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 focus:outline-none"
                      />

                      <button
                        onClick={() => handleRemoveOption(q.id, opt.id)}
                        className="text-zinc-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleAddOption(q.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-700 bg-zinc-800/30 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  <Plus className="h-3 w-3" />
                  Ajouter une option
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Eligibility & Role Weights */}
        {activeTab === "eligibility" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
              <h3 className="text-base font-bold text-white mb-2">Conditions d'Accès & Éligibilité</h3>
              <p className="text-xs text-zinc-400 mb-6">
                Restreignez l'accès au vote selon les rôles Discord, l'ancienneté du compte ou du membre sur le serveur.
              </p>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Ancienneté minimale du compte Discord (jours)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minAccountAgeDays}
                    onChange={(e) => setMinAccountAgeDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Évite les raids de comptes fraîchement créés.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Ancienneté minimale sur le serveur (jours)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minGuildMembershipDays}
                    onChange={(e) => setMinGuildMembershipDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Exige que l'utilisateur soit membre depuis au moins X jours.</p>
                </div>
              </div>
            </div>

            {/* Role Weights Multiplier */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
              <h3 className="text-base font-bold text-white mb-2">Pondération des Voix par Rôle</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Attribuez un coefficient multiplicateur aux votes exprimés par certains rôles (ex: Boosters 2x, Vétérans 2x, Staff 3x).
              </p>

              <div className="space-y-3">
                {roleWeights.map((rw, index) => (
                  <div key={rw.roleId} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/40 p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-indigo-400" />
                      <span className="text-xs font-bold text-white">{rw.roleName}</span>
                      <span className="text-[10px] text-zinc-500">({rw.roleId})</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400">Poids :</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={rw.weightMultiplier}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRoleWeights((prev) =>
                            prev.map((item, i) => (i === index ? { ...item, weightMultiplier: val } : item))
                          );
                        }}
                        className="w-16 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-center text-indigo-400 font-bold focus:outline-none"
                      />
                      <span className="text-xs font-semibold text-indigo-400">x</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Quorum & Security */}
        {activeTab === "quorum" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Quorum & Seuil de Décision</h3>
                  <p className="text-xs text-zinc-400">
                    Définissez les conditions indispensables pour valider officiellement le résultat d'un vote.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={quorumEnabled}
                    onChange={(e) => setQuorumEnabled(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-zinc-800 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                </label>
              </div>

              {quorumEnabled && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4 pt-4 border-t border-zinc-800">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Nombre minimum de participants requis
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={minParticipantsCount}
                      onChange={(e) => setMinParticipantsCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Majorité requise d'approbation (%)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={approvalThreshold}
                      onChange={(e) => setApprovalThreshold(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Anonymity Settings */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
              <h3 className="text-base font-bold text-white mb-2">Confidentialité & Anonymat</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Contrôlez la visibilité des votes des membres et l'accès aux résultats en direct.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { id: "PUBLIC", label: "Vote Public", desc: "Le pseudo du votant est visible dans les logs" },
                  { id: "ANONYMOUS", label: "Bulletin Secret", desc: "Vote chiffré, pseudo masqué" },
                  { id: "FULLY_ANONYMOUS", label: "Anonymat Intégral", desc: "Aucun lien conservé entre membre et vote" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAnonymity(item.id as any)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all",
                      anonymity === item.id
                        ? "border-indigo-500 bg-indigo-500/10 text-white"
                        : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white"
                    )}
                  >
                    <span className="text-xs font-bold text-white">{item.label}</span>
                    <p className="text-[11px] text-zinc-400 mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Discord Panel & Preview */}
        {activeTab === "panel" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
              <h3 className="text-base font-bold text-white mb-4">Personnalisation du Panneau Discord</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Couleur de l'Embed
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={panelColor}
                      onChange={(e) => setPanelColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 p-1"
                    />
                    <input
                      type="text"
                      value={panelColor}
                      onChange={(e) => setPanelColor(e.target.value)}
                      className="w-32 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Salon Discord par défaut
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

            {/* Live Discord Embed Mockup */}
            <div>
              <span className="text-xs font-semibold text-zinc-400 mb-2 block">Aperçu Discord Direct</span>
              <div className="rounded-2xl border border-zinc-800 bg-[#2b2d31] p-4 text-[#dbdee1] shadow-2xl">
                <div
                  className="rounded-lg border-l-4 bg-[#1e1f22] p-4"
                  style={{ borderLeftColor: panelColor }}
                >
                  <h4 className="text-sm font-bold text-white mb-1">
                    📊 {title || "Titre du Sondage"}
                  </h4>
                  <p className="text-xs text-[#b5bac1] mb-3 leading-relaxed">
                    {description || "Description du vote et instructions..."}
                  </p>

                  {questions[0] && (
                    <div className="space-y-1.5 border-t border-zinc-800/80 pt-2 mb-3">
                      <span className="text-xs font-semibold text-white">
                        ❓ {questions[0].title}
                      </span>
                      <div className="space-y-1">
                        {questions[0].options.map((opt) => (
                          <div key={opt.id} className="text-xs text-[#b5bac1]">
                            {opt.emoji} **{opt.label}** {opt.description ? `• *${opt.description}*` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-2">
                    ETHONE Polls & Voting 2.0 • Fin dans {durationHours}h
                  </div>
                </div>

                {/* Simulated Discord Buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {questions[0]?.options.slice(0, 4).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="rounded bg-[#5865f2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4752c4]"
                    >
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="rounded bg-[#4e5058] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6d6f78]"
                  >
                    📊 Résultats en direct
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
