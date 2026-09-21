"use client";

import { useState, useEffect, useCallback } from "react";
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
  Save,
  Send,
  Eye,
  Zap,
  Hash,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import ChannelPicker from "@/components/discord/ChannelPicker";

const BOT_API_URL =
  process.env.NEXT_PUBLIC_DISCORD_BOT_API_URL ||
  process.env.NEXT_PUBLIC_BOT_URL ||
  process.env.NEXT_PUBLIC_DISCORD_BOT_API ||
  "";

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

  const [activeTab, setActiveTab] = useState<"general" | "questions" | "eligibility" | "quorum" | "panel">("general");

  // General state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Communauté");
  const [pollType, setPollType] = useState<string>("SINGLE_CHOICE");
  const [durationHours, setDurationHours] = useState(48);

  // Channels state
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [targetChannel, setTargetChannel] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Roles state
  const [roles, setRoles] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load real guild text channels
  const fetchChannelsList = useCallback(
    async (notify = false) => {
      if (!guildParam || !BOT_API_URL) return;
      setChannelsLoading(true);
      try {
        let list: { id: string; name: string }[] = [];
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildParam}/polls/channels`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (Array.isArray(data?.channels) && data.channels.length > 0) {
            list = data.channels;
          }
        }
        if (list.length === 0) {
          const fallback = await fetch(`${BOT_API_URL}/api/guilds/${guildParam}/server/channels`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          if (Array.isArray(fallback?.channels)) {
            list = fallback.channels
              .filter((c: any) => c.type === 0 || c.type === "GUILD_TEXT" || !c.type)
              .map((c: any) => ({ id: String(c.id), name: String(c.name) }));
          }
        }
        setChannels(list);
        if (list.length > 0) {
          setTargetChannel((prev) => (prev ? prev : list[0].id));
        }
        if (notify) {
          showToast("Salons actualisés avec succès !", "success");
        }
      } catch {
        if (notify) showToast("Erreur lors de l'actualisation des salons.", "error");
      } finally {
        setChannelsLoading(false);
      }
    },
    [guildParam, showToast]
  );

  // Load real guild roles
  const fetchRolesList = useCallback(
    async (notify = false) => {
      if (!guildParam || !BOT_API_URL) return;
      setRolesLoading(true);
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildParam}/server/roles`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const rList = Array.isArray(data?.roles) ? data.roles : [];
          const formatted = rList
            .filter((r: any) => !r.managed && r.name !== "@everyone")
            .map((r: any) => ({ id: String(r.id), name: String(r.name), color: r.color }));
          setRoles(formatted);
          if (notify) {
            showToast("Rôles actualisés avec succès !", "success");
          }
        }
      } catch {
        if (notify) showToast("Erreur lors de l'actualisation des rôles.", "error");
      } finally {
        setRolesLoading(false);
      }
    },
    [guildParam, showToast]
  );

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchChannelsList(false), fetchRolesList(false)]);
    setIsRefreshing(false);
    showToast("Salons et rôles actualisés avec succès !", "success");
  };

  useEffect(() => {
    fetchChannelsList();
    fetchRolesList();
  }, [fetchChannelsList, fetchRolesList]);

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

  const handleSave = async (publish = false) => {
    if (!title.trim()) {
      showToast("Veuillez renseigner le titre du sondage.", "error");
      setActiveTab("general");
      return;
    }

    setIsSubmitting(true);
    try {
      if (BOT_API_URL && guildParam) {
        const payload = {
          title: title.trim(),
          description: description.trim(),
          category,
          pollType,
          status: publish ? "ACTIVE" : "DRAFT",
          endsAt: new Date(Date.now() + durationHours * 3600 * 1000).toISOString(),
          questions: questions.map((q) => ({
            title: q.title,
            description: q.description,
            required: q.required,
            minSelections: q.minSelections,
            maxSelections: q.maxSelections,
            options: q.options.map((o) => ({
              label: o.label,
              emoji: o.emoji,
              color: o.color,
              description: o.description,
              weight: o.weight,
            })),
          })),
          panelConfig: {
            channelId: targetChannel,
            color: panelColor,
          },
          eligibilityRules: {
            minAccountAgeDays,
            minGuildMembershipDays,
            roleWeights,
          },
          securityConfig: {
            anonymity,
            quorumEnabled,
            minParticipantsCount,
            approvalThreshold,
          },
        };

        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildParam}/polls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Erreur lors de la sauvegarde du sondage.");
        }

        const createdPollId = data.poll?.id || data.id;

        if (publish && createdPollId && targetChannel) {
          await fetch(`${BOT_API_URL}/api/guilds/${guildParam}/polls/${createdPollId}/panel/deploy`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ channelId: targetChannel }),
          }).catch((err) => console.warn("Deploy error:", err));
        }
      }

      showToast(
        publish
          ? "Sondage publié et déployé sur le salon avec succès !"
          : "Sondage enregistré comme brouillon.",
        "success"
      );
      router.push(`/discord/polls?guildId=${guildParam}`);
    } catch (err: any) {
      showToast(err?.message || "Une erreur est survenue lors de l'enregistrement.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-white selection:bg-indigo-500/30">
      {/* Top Background Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-44 md:pb-44">
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

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isRefreshing || channelsLoading || rolesLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-50"
              title="Rafraîchir les salons et rôles du serveur"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", (isRefreshing || channelsLoading || rolesLoading) && "animate-spin text-indigo-400")} />
              <span className="hidden sm:inline">Rafraîchir</span>
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Sauvegarder Brouillon
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? "Publication en cours..." : "Publier Immédiatement"}
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

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-indigo-400" />
                        Salon Discord de diffusion <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => fetchChannelsList(true)}
                        disabled={channelsLoading}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-indigo-400 transition-colors disabled:opacity-50"
                        title="Rafraîchir la liste des salons"
                      >
                        <RefreshCw className={cn("h-3 w-3", channelsLoading && "animate-spin text-indigo-400")} />
                        <span>Rafraîchir</span>
                      </button>
                    </div>
                    <ChannelPicker
                      value={targetChannel}
                      onChange={(id) => setTargetChannel(id)}
                      channels={channels}
                      guildId={guildParam}
                      placeholder="Sélectionner un salon ou saisir un ID..."
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Le salon textuel où le bot publiera le message interactif avec les boutons de vote.
                    </p>
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
                            ? "border-indigo-500 bg-indigo-500/10 text-white shadow-sm"
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
                    <span className="text-zinc-500">Salon de diffusion :</span>
                    <span className="font-semibold text-emerald-400">
                      {channels.find((c) => c.id === targetChannel)
                        ? `#${channels.find((c) => c.id === targetChannel)?.name}`
                        : targetChannel
                        ? `#${targetChannel}`
                        : "Non sélectionné"}
                    </span>
                  </div>
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-white">Pondération des Voix par Rôle</h3>
                <button
                  type="button"
                  onClick={() => fetchRolesList(true)}
                  disabled={rolesLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-indigo-400 transition-colors disabled:opacity-50"
                  title="Rafraîchir les rôles du serveur"
                >
                  <RefreshCw className={cn("h-3 w-3", rolesLoading && "animate-spin text-indigo-400")} />
                  <span>Rafraîchir les rôles</span>
                </button>
              </div>
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
                      <button
                        type="button"
                        onClick={() => setRoleWeights((prev) => prev.filter((_, i) => i !== index))}
                        className="text-zinc-500 hover:text-rose-400 p-1"
                        title="Retirer ce rôle"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {roles.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-2">
                  <select
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none"
                    defaultValue=""
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      const roleObj = roles.find((r) => r.id === selectedId);
                      if (roleObj && !roleWeights.some((rw) => rw.roleId === selectedId)) {
                        setRoleWeights((prev) => [
                          ...prev,
                          { roleId: roleObj.id, roleName: roleObj.name, weightMultiplier: 2 },
                        ]);
                        showToast(`Rôle @${roleObj.name} ajouté aux coefficients.`, "info");
                      }
                      e.target.value = "";
                    }}
                  >
                    <option value="">+ Ajouter un rôle du serveur...</option>
                    {roles
                      .filter((r) => !roleWeights.some((rw) => rw.roleId === r.id))
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          @{r.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-zinc-300">
                      Salon Discord par défaut
                    </label>
                    <button
                      type="button"
                      onClick={() => fetchChannelsList(true)}
                      disabled={channelsLoading}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-indigo-400 transition-colors disabled:opacity-50"
                      title="Rafraîchir la liste des salons"
                    >
                      <RefreshCw className={cn("h-3 w-3", channelsLoading && "animate-spin text-indigo-400")} />
                      <span>Rafraîchir</span>
                    </button>
                  </div>
                  <select
                    value={targetChannel}
                    onChange={(e) => setTargetChannel(e.target.value)}
                    disabled={channelsLoading}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-50"
                  >
                    {channelsLoading ? (
                      <option value="">Chargement des salons...</option>
                    ) : channels.length === 0 ? (
                      <option value="">Aucun salon textuel trouvé</option>
                    ) : (
                      channels.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          #{ch.name}
                        </option>
                      ))
                    )}
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
                    ETHONE Polls & Voting • Fin dans {durationHours}h
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
