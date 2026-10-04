"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Select from "@/components/ui/Select";
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
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { formatApiError } from "@/lib/format-error";

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
  // Sondage natif Discord : message `poll` géré par Discord (simple : pas de quorum, pondération, vote secret…).
  const [nativeMode, setNativeMode] = useState(false);
  const [allowMultiselect, setAllowMultiselect] = useState(false);
  const NATIVE_MAX_HOURS = 768; // 32 jours
  const NATIVE_MAX_ANSWERS = 10;
  const DESTINATION_TYPES = [0, 5, 15, 16]; // texte, annonces, forum, média

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
  const [logicGate] = useState<"ANY" | "ALL">("ANY");
  const [minAccountAgeDays, setMinAccountAgeDays] = useState(0);
  const [minGuildMembershipDays, setMinGuildMembershipDays] = useState(0);
  const [roleWeights, setRoleWeights] = useState<{ roleId: string; roleName: string; weightMultiplier: number }[]>([]);

  // Quorum & Anonymity state
  const [quorumEnabled, setQuorumEnabled] = useState(false);
  const [minParticipantsCount, setMinParticipantsCount] = useState(10);
  const [approvalThreshold, setApprovalThreshold] = useState(50);
  const [anonymity, setAnonymity] = useState<"PUBLIC" | "ANONYMOUS" | "FULLY_ANONYMOUS">("PUBLIC");
  const [resultsVisibility] = useState<"LIVE" | "AFTER_VOTE" | "AT_END" | "STAFF_ONLY">("LIVE");
  const [allowVoteChange] = useState(true);

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
    if (nativeMode && (questions.find((q) => q.id === qId)?.options.length ?? 0) >= NATIVE_MAX_ANSWERS) {
      showToast(`Un sondage natif accepte ${NATIVE_MAX_ANSWERS} réponses au maximum.`, "error");
      return;
    }
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

    if (!BOT_API_URL || !guildParam) {
      showToast("Choisis d'abord un serveur où le bot est présent.", "error");
      return;
    }
    if (nativeMode) {
      const first = questions[0];
      if (!first || first.options.length < 2 || first.options.some((o) => !o.label.trim())) {
        showToast("Un sondage natif a besoin d'au moins 2 réponses non vides.", "error");
        setActiveTab("questions");
        return;
      }
      if (!targetChannel) {
        showToast("Choisis le salon où publier le sondage.", "error");
        setActiveTab("general");
        return;
      }
      if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > NATIVE_MAX_HOURS) {
        showToast(`La durée d'un sondage natif est comprise entre 1 et ${NATIVE_MAX_HOURS} heures.`, "error");
        setActiveTab("general");
        return;
      }
    }
    if (publish && !targetChannel) {
      showToast("Choisis le salon où publier le sondage.", "error");
      setActiveTab("general");
      return;
    }

    setIsSubmitting(true);
    const base = `${BOT_API_URL}/api/guilds/${guildParam}/polls`;
    const call = async (url: string, body: unknown) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(formatApiError(data?.error, `Erreur ${res.status}`));
      return data;
    };
    try {
      if (nativeMode) {
        // Publié tout de suite par le bot via le sondage natif Discord (pas de brouillon).
        const first = questions[0]!;
        await call(base, {
          native: true,
          title: title.trim(),
          type: allowMultiselect ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE",
          allowMultiselect,
          durationHours: Math.round(durationHours),
          channelId: targetChannel,
          questions: [
            {
              title: title.trim(),
              options: first.options.map((o) => ({ label: o.label.trim(), emoji: o.emoji })),
            },
          ],
        });
        showToast("Sondage natif publié dans Discord.", "success");
        router.push(`/discord/polls?guildId=${guildParam}`);
        return;
      }
      const created = await call(base, {
        title: title.trim(),
        description: description.trim(),
        category,
        type: pollType,
        anonymity,
        resultsVisibility,
        allowVoteChange,
        endsAt: new Date(Date.now() + durationHours * 3600 * 1000).toISOString(),
        questions: questions.map((q, i) => ({
          id: q.id,
          title: q.title,
          description: q.description,
          type: pollType,
          required: q.required,
          minSelections: q.minSelections,
          maxSelections: q.maxSelections,
          order: i,
          options: q.options.map((o) => ({
            id: o.id,
            label: o.label,
            emoji: o.emoji,
            color: o.color,
            description: o.description,
            weight: o.weight,
          })),
        })),
        eligibility: { minAccountAgeDays, minGuildMembershipDays, logicGate },
        roleWeights,
        quorum: { enabled: quorumEnabled, minParticipantsCount, approvalThresholdPercentage: approvalThreshold },
        panelConfig: { channelId: targetChannel, embedTitle: `📊 ${title.trim()}`, embedColor: panelColor },
      });
      const pollId = created.poll?.id;
      if (!pollId) throw new Error("Le bot n'a pas renvoyé d'identifiant de sondage.");

      if (!publish) {
        showToast("Sondage enregistré comme brouillon.", "success");
      } else {
        await call(`${base}/${encodeURIComponent(pollId)}/publish`, {});
        try {
          await call(`${base}/${encodeURIComponent(pollId)}/panel/deploy`, { channelId: targetChannel });
          showToast("Sondage publié dans le salon.", "success");
        } catch (err: any) {
          showToast(`Sondage créé et actif, mais le panneau n'a pas pu être publié : ${err?.message || "erreur inconnue"}`, "error");
        }
      }
      router.push(`/discord/polls?guildId=${guildParam}`);
    } catch (err: any) {
      showToast(err?.message || "Une erreur est survenue lors de l'enregistrement.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="text-[var(--text-primary)]">
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-44 md:pb-44">
        {/* Navigation Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Link href={`/discord?guildId=${guildParam}`} className="hover:text-[var(--text-primary)] transition-colors">
            Discord Center
          </Link>
          <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
          <Link href={`/discord/polls?guildId=${guildParam}`} className="hover:text-[var(--text-primary)] transition-colors">
            Sondages & Votes
          </Link>
          <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
          <span className="text-[var(--text-primary)] font-medium">Créateur de Sondage</span>
        </div>

        {/* Header Hero */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              Nouveau Sondage ou Vote
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Configurez le type de scrutin, les questions à choix multiples, les règles d'éligibilité et l'affichage Discord.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isRefreshing || channelsLoading || rolesLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] px-3 py-2.5 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-all disabled:opacity-50"
              title="Rafraîchir les salons et rôles du serveur"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", (isRefreshing || channelsLoading || rolesLoading) && "animate-spin text-[var(--accent-primary)]")} />
              <span className="hidden sm:inline">Rafraîchir</span>
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={isSubmitting || nativeMode}
              title={nativeMode ? "Un sondage natif est publié immédiatement (pas de brouillon)." : undefined}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-all disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Sauvegarder Brouillon
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? "Publication en cours..." : "Publier Immédiatement"}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex overflow-x-auto border-b border-[var(--panel-border)] pb-2">
          {[
            { id: "general", label: "Général & Scrutin", icon: Vote },
            { id: "questions", label: nativeMode ? "Réponses" : "Questions & Options", icon: Layers },
            { id: "eligibility", label: "Éligibilité & Pondération", icon: ShieldCheck },
            { id: "quorum", label: "Quorum & Confidentialité", icon: Sparkles },
            { id: "panel", label: "Panneau Discord & Preview", icon: Eye },
          ]
            .filter((tab) => !nativeMode || tab.id === "general" || tab.id === "questions")
            .map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "relative flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 active:scale-[0.97]",
                  isActive
                    ? "border-transparent text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {isActive && <motion.span layoutId="pollcreate-tab" transition={{ type: "spring", stiffness: 450, damping: 43 }} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--accent-primary)]" />}
                <Icon className={cn("h-4 w-4", isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: General Info */}
        {activeTab === "general" && (
          <div className="stagger-children grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border p-5 transition-colors",
                  nativeMode ? "border-[var(--info)]/50 bg-[var(--info)]/10" : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 hover:border-[var(--input-border-hover)]"
                )}
              >
                <input
                  type="checkbox"
                  checked={nativeMode}
                  onChange={(e) => {
                    setNativeMode(e.target.checked);
                    setActiveTab("general");
                    if (e.target.checked && durationHours > NATIVE_MAX_HOURS) setDurationHours(24);
                  }}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-sky-500"
                />
                <span>
                  <span className="block text-sm font-bold text-[var(--text-primary)]">Sondage natif Discord</span>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    Utilise le sondage intégré de Discord : simple et fiable, mais sans quorum, pondération, vote secret, éligibilité ni décisions automatiques (10 réponses max, 32 jours max).
                  </span>
                </span>
              </label>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Informations Générales</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                      {nativeMode ? "Question du sondage" : "Titre du Sondage"} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={nativeMode ? 300 : undefined}
                      placeholder={nativeMode ? "Ex: Quel jeu pour la soirée de vendredi ?" : "Ex: Élection du Représentant de Communauté 2026"}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:border-[var(--input-border-hover)] focus:outline-none"
                    />
                  </div>

                  {!nativeMode && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                      Description explicative
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Expliquez l'objectif de la consultation ou les consignes de vote..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:border-[var(--input-border-hover)] focus:outline-none"
                    />
                  </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {!nativeMode && (
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                        Catégorie
                      </label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--input-border-hover)] focus:outline-none"
                      />
                    </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                        Durée du scrutin (heures)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={nativeMode ? NATIVE_MAX_HOURS : undefined}
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value))}
                        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--input-border-hover)] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                        Salon Discord de diffusion <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => fetchChannelsList(true)}
                        disabled={channelsLoading}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors disabled:opacity-50"
                        title="Rafraîchir la liste des salons"
                      >
                        <RefreshCw className={cn("h-3 w-3", channelsLoading && "animate-spin text-[var(--accent-primary)]")} />
                        <span>Rafraîchir</span>
                      </button>
                    </div>
                    <ChannelPicker
                      value={targetChannel}
                      onChange={(id) => setTargetChannel(id)}
                      channels={channels}
                      guildId={guildParam}
                      filterTypes={DESTINATION_TYPES}
                      placeholder="Sélectionner un salon ou saisir un ID..."
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {nativeMode
                        ? "Le salon (texte, annonces, forum ou média) où le bot publiera le sondage natif."
                        : "Le salon textuel où le bot publiera le message interactif avec les boutons de vote."}
                    </p>
                  </div>
                </div>
              </div>

              {nativeMode && (
                <label className="flex cursor-pointer items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5">
                  <input
                    type="checkbox"
                    checked={allowMultiselect}
                    onChange={(e) => setAllowMultiselect(e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-sky-500"
                  />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Autoriser plusieurs réponses</span>
                </label>
              )}

              {/* Voting Type Selection */}
              {!nativeMode && (
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Mode de Scrutin & Mécanique de Vote</h3>
                <p className="text-xs text-[var(--text-muted)] mb-4">
                  Choisissez la règle mathématique utilisée pour déterminer le vainqueur et comptabiliser les suffrages.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { id: "SINGLE_CHOICE", label: "Choix Unique", desc: "1 seule réponse possible", icon: Vote },
                    { id: "MULTIPLE_CHOICE", label: "Choix Multiple", desc: "Plusieurs choix autorisés", icon: Layers },
                    { id: "APPROVAL", label: "Approbation / Rejet", desc: "Pour, Contre ou Abstention", icon: ShieldCheck },
                    { id: "RANKING", label: "Vote Préférentiel", desc: "Classement des options par ordre", icon: Award },
                    { id: "WEIGHTED_VOTE", label: "Pondéré Rôles", desc: "Multiplicateur de voix selon le rang", icon: Zap },
                    { id: "RATING", label: "Score & Notation", desc: "Évaluation sur 5 étoiles ou note", icon: Sparkles },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSel = pollType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPollType(item.id)}
                        className={cn(
                          "relative isolate flex flex-col items-start rounded-xl border p-4 text-left outline-none transition-[border-color,color,transform] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 active:scale-[0.98]",
                          isSel
                            ? "border-transparent text-[var(--text-primary)]"
                            : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:border-[var(--input-border-hover)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        {isSel && (
                          <motion.span
                            layoutId="poll-type-selected"
                            transition={{ type: "spring", stiffness: 420, damping: 41 }}
                            className="absolute inset-0 -z-10 rounded-[inherit] border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-sm"
                          />
                        )}
                        <div className={cn("p-2 rounded-lg mb-2 transition-colors duration-300", isSel ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]" : "bg-[var(--surface-raised)]/50 text-[var(--text-muted)]")}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-[var(--text-primary)]">{item.label}</span>
                        <span className="text-xs text-[var(--text-muted)] mt-1">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              )}
            </div>

            {/* Quick Summary Sidebar */}
            <div className="space-y-4">
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Résumé de Configuration
                </h4>
                <div className="space-y-2.5 text-xs text-[var(--text-muted)]">
                  <div className="flex justify-between border-b border-[var(--panel-border)] pb-2">
                    <span className="text-[var(--text-muted)]">Salon de diffusion :</span>
                    <span className="font-semibold text-[var(--accent-primary)]">
                      {channels.find((c) => c.id === targetChannel)
                        ? `#${channels.find((c) => c.id === targetChannel)?.name}`
                        : targetChannel
                        ? `#${targetChannel}`
                        : "Non sélectionné"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--panel-border)] pb-2">
                    <span className="text-[var(--text-muted)]">Type de scrutin :</span>
                    <span className="font-semibold text-[var(--accent-primary)]">{nativeMode ? "Natif Discord" : pollType}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--panel-border)] pb-2">
                    <span className="text-[var(--text-muted)]">Durée :</span>
                    <span className="font-semibold text-[var(--text-primary)]">{durationHours} heures</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--panel-border)] pb-2">
                    <span className="text-[var(--text-muted)]">Questions :</span>
                    <span className="font-semibold text-[var(--text-primary)]">{questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Anonymat :</span>
                    <span className="font-semibold text-[var(--text-primary)]">{anonymity}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Questions & Options Builder */}
        {activeTab === "questions" && (
          <div className="stagger-children space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{nativeMode ? "Réponses du sondage natif" : "Questions & Options du Sondage"}</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {nativeMode
                    ? `De 2 à ${NATIVE_MAX_ANSWERS} réponses (55 caractères max chacune, emoji facultatif). La question est le titre saisi dans l'onglet Général.`
                    : "Définissez l'intitulé des questions, le nombre minimal/maximal de choix et personnalisez chaque option."}
                </p>
              </div>
              {!nativeMode && (
              <button
                onClick={handleAddQuestion}
                className="group inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:brightness-110 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
              >
                <Plus className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90" />
                Ajouter une question
              </button>
              )}
            </div>

            {(nativeMode ? questions.slice(0, 1) : questions).map((q, qIndex) => (
              <div
                key={q.id}
                className="rise-in rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6"
              >
                {!nativeMode && (
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-xs font-bold text-[var(--accent-primary)]">
                      {qIndex + 1}
                    </span>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Question #{qIndex + 1}</h4>
                  </div>
                  <button
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="text-[var(--text-muted)] hover:text-rose-400 transition-colors p-1"
                    title="Supprimer la question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                )}

                {!nativeMode && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
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
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--input-border-hover)] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
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
                        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--input-border-hover)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
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
                        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--input-border-hover)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* Options List */}
                <div className="space-y-2 mb-4">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Options disponibles</span>
                  {q.options.map((opt, _optIndex) => (
                    <div
                      key={opt.id}
                      className="rise-in flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 transition-colors focus-within:border-[var(--accent-primary)]/40"
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
                        className="w-12 text-center rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] py-1 text-sm text-[var(--text-primary)] focus:outline-none"
                      />

                      <input
                        type="text"
                        placeholder="Libellé de l'option"
                        maxLength={nativeMode ? 55 : undefined}
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
                        className="flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1 text-sm text-[var(--text-primary)] focus:outline-none"
                      />

                      {!nativeMode && (
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
                        className="flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1 text-sm text-[var(--text-muted)] focus:outline-none"
                      />
                      )}

                      <button
                        onClick={() => handleRemoveOption(q.id, opt.id)}
                        className="text-[var(--text-muted)] hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleAddOption(q.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/50 px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
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
          <div className="stagger-children space-y-6">
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Conditions d'Accès & Éligibilité</h3>
              <p className="text-xs text-[var(--text-muted)] mb-6">
                Restreignez l'accès au vote selon les rôles Discord, l'ancienneté du compte ou du membre sur le serveur.
              </p>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Ancienneté minimale du compte Discord (jours)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minAccountAgeDays}
                    onChange={(e) => setMinAccountAgeDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--input-border-hover)] focus:outline-none"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Évite les raids de comptes fraîchement créés.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Ancienneté minimale sur le serveur (jours)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minGuildMembershipDays}
                    onChange={(e) => setMinGuildMembershipDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--input-border-hover)] focus:outline-none"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Exige que l'utilisateur soit membre depuis au moins X jours.</p>
                </div>
              </div>
            </div>

            {/* Role Weights Multiplier */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-[var(--text-primary)]">Pondération des Voix par Rôle</h3>
                <button
                  type="button"
                  onClick={() => fetchRolesList(true)}
                  disabled={rolesLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors disabled:opacity-50"
                  title="Rafraîchir les rôles du serveur"
                >
                  <RefreshCw className={cn("h-3 w-3", rolesLoading && "animate-spin text-[var(--accent-primary)]")} />
                  <span>Rafraîchir les rôles</span>
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Attribuez un coefficient multiplicateur aux votes exprimés par certains rôles (ex: Boosters 2x, Vétérans 2x, Staff 3x).
              </p>

              <div className="stagger-children space-y-3">
                {roleWeights.map((rw, index) => (
                  <div key={rw.roleId} className="flex items-center justify-between rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
                      <span className="text-xs font-bold text-[var(--text-primary)]">{rw.roleName}</span>
                      <span className="text-xs text-[var(--text-muted)]">({rw.roleId})</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--text-muted)]">Poids :</span>
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
                        className="w-16 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-sm text-center text-[var(--accent-primary)] font-bold focus:outline-none"
                      />
                      <span className="text-xs font-semibold text-[var(--accent-primary)]">x</span>
                      <button
                        type="button"
                        onClick={() => setRoleWeights((prev) => prev.filter((_, i) => i !== index))}
                        className="text-[var(--text-muted)] hover:text-rose-400 p-1"
                        title="Retirer ce rôle"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {roles.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--panel-border)] flex items-center gap-2">
                  <Select
                    className="flex-1"
                    value=""
                    placeholder="+ Ajouter un rôle du serveur..."
                    onChange={(selectedId) => {
                      if (!selectedId) return;
                      const roleObj = roles.find((r) => r.id === selectedId);
                      if (roleObj && !roleWeights.some((rw) => rw.roleId === selectedId)) {
                        setRoleWeights((prev) => [
                          ...prev,
                          { roleId: roleObj.id, roleName: roleObj.name, weightMultiplier: 2 },
                        ]);
                        showToast(`Rôle @${roleObj.name} ajouté aux coefficients.`, "info");
                      }
                    }}
                    options={roles
                      .filter((r) => !roleWeights.some((rw) => rw.roleId === r.id))
                      .map((r) => ({ id: r.id, label: `@${r.name}` }))}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Quorum & Security */}
        {activeTab === "quorum" && (
          <div className="stagger-children space-y-6">
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Quorum & Seuil de Décision</h3>
                  <p className="text-xs text-[var(--text-muted)]">
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
                  <div className="h-5 w-9 rounded-full bg-[var(--surface-raised)]/50 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--accent-primary)] peer-checked:after:translate-x-full peer-checked:after:border-white" />
                </label>
              </div>

              {quorumEnabled && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4 pt-4 border-t border-[var(--panel-border)]">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                      Nombre minimum de participants requis
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={minParticipantsCount}
                      onChange={(e) => setMinParticipantsCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--input-border-hover)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                      Majorité requise d'approbation (%)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={approvalThreshold}
                      onChange={(e) => setApprovalThreshold(Number(e.target.value))}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--input-border-hover)] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Anonymity Settings */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Confidentialité & Anonymat</h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
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
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                        : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <span className="text-xs font-bold text-[var(--text-primary)]">{item.label}</span>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Discord Panel & Preview */}
        {activeTab === "panel" && (
          <div className="stagger-children grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Personnalisation du Panneau Discord</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                    Couleur de l'Embed
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={panelColor}
                      onChange={(e) => setPanelColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] p-1"
                    />
                    <input
                      type="text"
                      value={panelColor}
                      onChange={(e) => setPanelColor(e.target.value)}
                      className="w-32 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[var(--text-muted)]">
                      Salon Discord par défaut
                    </label>
                    <button
                      type="button"
                      onClick={() => fetchChannelsList(true)}
                      disabled={channelsLoading}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors disabled:opacity-50"
                      title="Rafraîchir la liste des salons"
                    >
                      <RefreshCw className={cn("h-3 w-3", channelsLoading && "animate-spin text-[var(--accent-primary)]")} />
                      <span>Rafraîchir</span>
                    </button>
                  </div>
                  <ChannelPicker
                    value={targetChannel}
                    onChange={(id) => setTargetChannel(id)}
                    channels={channels}
                    placeholder="Sélectionner un salon..."
                    disabled={channelsLoading}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Live Discord Embed Mockup */}
            <div>
              <span className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">Aperçu Discord Direct</span>
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[#2b2d31] p-4 text-[#dbdee1]">
                <div
                  className="rounded-lg border-l-4 bg-[#1e1f22] p-4"
                  style={{ borderLeftColor: panelColor }}
                >
                  <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                    📊 {title || "Titre du Sondage"}
                  </h4>
                  <p className="text-xs text-[#b5bac1] mb-3 leading-relaxed">
                    {description || "Description du vote et instructions..."}
                  </p>

                  {questions[0] && (
                    <div className="space-y-1.5 border-t border-[var(--panel-border)] pt-2 mb-3">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        ❓ {questions[0].title}
                      </span>
                      <div className="stagger-children space-y-1">
                        {questions[0].options.map((opt) => (
                          <div key={opt.id} className="text-xs text-[#b5bac1]">
                            {opt.emoji} **{opt.label}** {opt.description ? `• *${opt.description}*` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-[var(--text-muted)] border-t border-[var(--panel-border)] pt-2">
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
