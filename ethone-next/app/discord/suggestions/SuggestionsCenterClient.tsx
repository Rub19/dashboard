"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Search,
  Sliders,
  Send,
  MessageSquare,
  Crown,
  Hash,
  RefreshCw,
  Kanban,
  Trash2,
  Plus,
  ArrowLeft,
  Bot,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { GuildSelector } from "@/components/GuildSelector";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { formatApiError } from "@/lib/format-error";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

// Mirrors discord-bot/src/modules/suggestions/types/suggestion.ts — this page
// reads and writes the real backend shape, not a made-up one.
type SuggestionStatus =
  | "pending"
  | "under_review"
  | "planned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "rejected"
  | "duplicate"
  | "on_hold";

type SuggestionPriority = "low" | "normal" | "high" | "critical";

interface SuggestionComment {
  id: string;
  userId: string;
  userTag: string;
  avatarUrl: string | null;
  content: string;
  isStaff: boolean;
  timestamp: string;
}

interface Suggestion {
  id: string;
  numericId: number;
  guildId: string;
  authorId: string;
  authorTag: string;
  authorAvatarUrl: string | null;
  title: string;
  description: string;
  category: string;
  tags: string[];
  status: SuggestionStatus;
  priority: SuggestionPriority;
  upvotesCount: number;
  downvotesCount: number;
  score: number;
  comments: SuggestionComment[];
  staffResponse: string | null;
  staffResponderTag: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SuggestionOverview {
  totalCount: number;
  pendingCount: number;
  underReviewCount: number;
  acceptedCount: number;
  completedCount: number;
  rejectedCount: number;
  totalVotes: number;
  totalComments: number;
  statusDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
}

interface SuggestionConfig {
  enabled: boolean;
  channelId: string | null;
  autoThread: boolean;
  categories: string[];
  cooldownMinutes: number;
  dmNotifications: boolean;
}

const STATUS_META: Record<SuggestionStatus, { label: string; cls: string }> = {
  pending: { label: "En attente", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  under_review: { label: "En discussion", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  planned: { label: "Planifiée", cls: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  accepted: { label: "Approuvée", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  in_progress: { label: "En développement", cls: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  completed: { label: "Réalisée", cls: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  rejected: { label: "Rejetée", cls: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  duplicate: { label: "Doublon", cls: "bg-neutral-500/10 text-neutral-300 border-neutral-500/20" },
  on_hold: { label: "En pause", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
};

const PRIORITY_META: Record<SuggestionPriority, { label: string; cls: string }> = {
  low: { label: "Basse", cls: "text-neutral-400" },
  normal: { label: "Normale", cls: "text-neutral-300" },
  high: { label: "Haute", cls: "text-amber-400" },
  critical: { label: "Critique", cls: "text-rose-400" },
};

const KANBAN_COLUMNS: Array<{ id: string; label: string; statuses: SuggestionStatus[] }> = [
  { id: "todo", label: "À examiner", statuses: ["pending", "under_review", "on_hold"] },
  { id: "doing", label: "Validées / En cours", statuses: ["planned", "accepted", "in_progress"] },
  { id: "done", label: "Réalisées", statuses: ["completed"] },
  { id: "closed", label: "Rejetées / Doublons", statuses: ["rejected", "duplicate"] },
];

const DEFAULT_CONFIG: SuggestionConfig = {
  enabled: true,
  channelId: null,
  autoThread: true,
  categories: ["Général", "Serveur", "Bot", "Événements", "Communauté"],
  cooldownMinutes: 5,
  dmNotifications: true,
};

const EMPTY_OVERVIEW: SuggestionOverview = {
  totalCount: 0,
  pendingCount: 0,
  underReviewCount: 0,
  acceptedCount: 0,
  completedCount: 0,
  rejectedCount: 0,
  totalVotes: 0,
  totalComments: 0,
  statusDistribution: {},
  categoryDistribution: {},
};

const DEMO_SUGGESTIONS: Suggestion[] = [];

function formatRelative(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function SuggestionsCenterClient() {
  const searchParams = useSearchParams();
  const rawGuildId = searchParams.get("guildId");
  const { profile } = useDiscordOAuth();
  const { success, error: toastError } = useToast();

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

  const appliedQueryGuild = useRef<string | null>(null);
  const userSelectedRef = useRef(false);
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (rawGuildId && appliedQueryGuild.current !== rawGuildId) {
      const match = manageableGuilds.find((g) => g.id === rawGuildId);
      if (match) {
        appliedQueryGuild.current = rawGuildId;
        userSelectedRef.current = true;
        setSelectedGuild(match);
        return;
      }
    }
    if (!userSelectedRef.current && botGuildIds !== null) {
      const picked = pickBotGuild(manageableGuilds, botGuildIds);
      if (picked) setSelectedGuild(picked);
    } else if (!selectedGuild) {
      setSelectedGuild(manageableGuilds[0]);
    }
  }, [manageableGuilds, rawGuildId, selectedGuild, botGuildIds]);

  const currentGuildId = selectedGuild?.id || rawGuildId || "";
  const isBotPresent = Boolean(currentGuildId && botGuildIds && botGuildIds.includes(currentGuildId));
  const activeGuild = selectedGuild;

  const base = `${BOT_API_URL}/api/guilds/${currentGuildId}/suggestions`;
  const isRealGuild = Boolean(BOT_API_URL) && Boolean(currentGuildId);

  const [activeTab, setActiveTab] = useState<"kanban" | "response_studio" | "hall_of_fame" | "settings">("kanban");
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(DEMO_SUGGESTIONS);
  const [overview, setOverview] = useState<SuggestionOverview>(EMPTY_OVERVIEW);
  const [config, setConfig] = useState<SuggestionConfig>(DEFAULT_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);

  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Studio de réponse
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [staffReplyText, setStaffReplyText] = useState("");
  const [newStatus, setNewStatus] = useState<SuggestionStatus>("accepted");
  const [newPriority, setNewPriority] = useState<SuggestionPriority>("normal");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Création depuis le dashboard
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("Général");

  const selected = useMemo(() => suggestions.find((s) => s.id === selectedId) || null, [suggestions, selectedId]);

  const computeOverview = useCallback((list: Suggestion[]): SuggestionOverview => {
    const statusDistribution: Record<string, number> = {};
    const categoryDistribution: Record<string, number> = {};
    let totalVotes = 0;
    let totalComments = 0;
    for (const s of list) {
      statusDistribution[s.status] = (statusDistribution[s.status] || 0) + 1;
      categoryDistribution[s.category] = (categoryDistribution[s.category] || 0) + 1;
      totalVotes += s.upvotesCount + s.downvotesCount;
      totalComments += s.comments.length;
    }
    return {
      totalCount: list.length,
      pendingCount: statusDistribution.pending || 0,
      underReviewCount: statusDistribution.under_review || 0,
      acceptedCount: statusDistribution.accepted || 0,
      completedCount: statusDistribution.completed || 0,
      rejectedCount: statusDistribution.rejected || 0,
      totalVotes,
      totalComments,
      statusDistribution,
      categoryDistribution,
    };
  }, []);

  const load = useCallback(async () => {
    if (!isRealGuild || !isBotPresent) {
      setIsDemo(true);
      setOverview(computeOverview(DEMO_SUGGESTIONS));
      return;
    }
    setLoading(true);
    try {
      const [listRes, overviewRes, configRes] = await Promise.all([
        fetch(`${base}/list`, { credentials: "include" }),
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/config/settings`, { credentials: "include" }),
      ]);
      const listData = await listRes.json().catch(() => null);
      const overviewData = await overviewRes.json().catch(() => null);
      const configData = await configRes.json().catch(() => null);
      if (!listRes.ok || !Array.isArray(listData?.suggestions)) {
        setIsDemo(true);
        return;
      }
      setIsDemo(false);
      setSuggestions(listData.suggestions);
      setOverview(overviewRes.ok && overviewData ? overviewData : computeOverview(listData.suggestions));
      if (configRes.ok && configData && typeof configData.enabled === "boolean") {
        setConfig({
          enabled: configData.enabled,
          channelId: configData.channelId ?? null,
          autoThread: configData.autoThread ?? true,
          categories: Array.isArray(configData.categories) ? configData.categories : DEFAULT_CONFIG.categories,
          cooldownMinutes: configData.cooldownMinutes ?? 5,
          dmNotifications: configData.dmNotifications ?? true,
        });
      }
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [base, isRealGuild, computeOverview]);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set<string>(config.categories);
    for (const s of suggestions) set.add(s.category);
    return Array.from(set);
  }, [config.categories, suggestions]);

  const filteredSuggestions = useMemo(() => {
    const q = searchFilter.toLowerCase();
    return suggestions.filter((s) => {
      const matchSearch =
        !q || s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.authorTag.toLowerCase().includes(q);
      const matchCat = categoryFilter === "ALL" || s.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [suggestions, searchFilter, categoryFilter]);

  const topIdeas = useMemo(() => [...suggestions].sort((a, b) => b.score - a.score).slice(0, 6), [suggestions]);

  const patchLocal = (id: string, patch: Partial<Suggestion>) => {
    setSuggestions((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s));
      setOverview(computeOverview(next));
      return next;
    });
  };

  const openStudio = (s: Suggestion) => {
    setSelectedId(s.id);
    setNewStatus(s.status);
    setNewPriority(s.priority);
    setStaffReplyText(s.staffResponse || "");
    setCommentText("");
    setActiveTab("response_studio");
  };

  const saveStatus = async () => {
    if (!selected) return;
    if (isDemo) {
      toastError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${base}/${selected.id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus, staffResponse: staffReplyText.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.suggestion) throw new Error(data?.error || "save failed");
      patchLocal(selected.id, data.suggestion);
      success(`Suggestion #${selected.numericId} : statut « ${STATUS_META[newStatus].label} » publié sur Discord.`);
    } catch (e: any) {
      toastError(formatApiError(e, "Échec de la mise à jour du statut."));
    } finally {
      setSubmitting(false);
    }
  };

  const savePriority = async (priority: SuggestionPriority) => {
    if (!selected) return;
    setNewPriority(priority);
    if (isDemo) {
      patchLocal(selected.id, { priority });
      return;
    }
    try {
      const res = await fetch(`${base}/${selected.id}/priority`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priority }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "priority failed");
      patchLocal(selected.id, { priority });
    } catch (e: any) {
      toastError(formatApiError(e, "Échec du changement de priorité."));
    }
  };

  const addComment = async () => {
    if (!selected || !commentText.trim()) return;
    if (isDemo) {
      patchLocal(selected.id, {
        comments: [
          ...selected.comments,
          { id: `c-${Date.now()}`, userId: "staff", userTag: "Staff", avatarUrl: null, content: commentText.trim(), isStaff: true, timestamp: new Date().toISOString() },
        ],
      });
      setCommentText("");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${base}/${selected.id}/comment`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.suggestion) throw new Error(data?.error || "comment failed");
      patchLocal(selected.id, data.suggestion);
      setCommentText("");
      success("Commentaire staff publié.");
    } catch (e: any) {
      toastError(formatApiError(e, "Échec de l'ajout du commentaire."));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSuggestion = async (s: Suggestion) => {
    if (!confirm(`Supprimer définitivement la suggestion #${s.numericId} ?`)) return;
    setSuggestions((prev) => {
      const next = prev.filter((x) => x.id !== s.id);
      setOverview(computeOverview(next));
      return next;
    });
    if (selectedId === s.id) setSelectedId(null);
    if (isDemo) return;
    try {
      const res = await fetch(`${base}/${s.id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "delete failed");
    } catch (e: any) {
      toastError(formatApiError(e, "Échec de la suppression — rechargez la page."));
    }
  };

  const createSuggestion = async () => {
    if (!newTitle.trim() || !newDescription.trim()) {
      toastError("Titre et description requis.");
      return;
    }
    if (isDemo) {
      toastError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${base}/create`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), description: newDescription.trim(), category: newCategory }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.suggestion) throw new Error(data?.error || "create failed");
      setSuggestions((prev) => {
        const next = [data.suggestion, ...prev];
        setOverview(computeOverview(next));
        return next;
      });
      setNewTitle("");
      setNewDescription("");
      success("Suggestion publiée dans le salon Discord.");
    } catch (e: any) {
      toastError(formatApiError(e, "Échec de la création."));
    } finally {
      setSubmitting(false);
    }
  };

  const saveConfig = async (patch: Partial<SuggestionConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    if (isDemo) {
      toastError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    setSavingConfig(true);
    try {
      const res = await fetch(`${base}/config/settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "save failed");
      success("Paramètres des suggestions enregistrés.");
    } catch (e: any) {
      toastError(formatApiError(e, "Échec de l'enregistrement des paramètres."));
    } finally {
      setSavingConfig(false);
    }
  };

  const adoptionRate = useMemo(() => {
    const decided = (overview.acceptedCount || 0) + (overview.completedCount || 0) + (overview.rejectedCount || 0) + (overview.statusDistribution.in_progress || 0) + (overview.statusDistribution.planned || 0);
    if (decided === 0) return null;
    const kept = decided - (overview.rejectedCount || 0);
    return Math.round((kept / decided) * 100);
  }, [overview]);

  const inProgressCount = (overview.statusDistribution.in_progress || 0) + (overview.statusDistribution.planned || 0) + (overview.acceptedCount || 0);

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-neutral-100 p-4 md:p-8 pb-44 md:pb-44">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <Link
                href={`/discord${currentGuildId ? `?guildId=${currentGuildId}` : ""}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
                title="Retour au hub Discord"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
                <span>Retour Discord</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/30 shadow-sm">
                <Lightbulb className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">ETHONE Boîte à Suggestions</h1>
                <p className="text-xs text-neutral-400">
                  Idées communautaires, votes Discord, Kanban de traitement et réponses officielles.
                  {isDemo && <span className="text-amber-400"> (bot injoignable ou absent de ce serveur)</span>}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {manageableGuilds.length > 0 && selectedGuild && (
              <GuildSelector
                guilds={manageableGuilds}
                value={selectedGuild.id}
                onChange={(g: DiscordGuild) => {
                  userSelectedRef.current = true;
                  setSelectedGuild(g);
                }}
              />
            )}
            <button
              onClick={() => setActiveTab("settings")}
              className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              Paramètres
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Bot non installé banner */}
        {selectedGuild && !isBotPresent && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Bot non installé sur ce serveur</p>
                <p className="text-xs text-amber-300/80">
                  Invitez le bot ETHONE sur <strong>{selectedGuild.name}</strong> pour activer la boîte à suggestions et les votes.
                </p>
              </div>
            </div>
            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs shadow-sm transition-colors cursor-pointer shrink-0"
            >
              Inviter le bot
            </a>
          </div>
        )}

        {/* KPI (réels) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Suggestions totales", value: overview.totalCount, cls: "text-white", sub: `${Object.keys(overview.categoryDistribution).length} catégorie(s)` },
            { label: "En attente staff", value: overview.pendingCount + overview.underReviewCount, cls: "text-amber-400", sub: "À examiner" },
            { label: "Approuvées / En cours", value: inProgressCount, cls: "text-emerald-400", sub: "Validées par le staff" },
            { label: "Réalisées", value: overview.completedCount, cls: "text-cyan-400", sub: "Livrées sur Discord" },
            { label: "Total votes", value: overview.totalVotes, cls: "text-purple-400", sub: "👍 / 👎 cumulés" },
            { label: "Taux d'adoption", value: adoptionRate === null ? "—" : `${adoptionRate}%`, cls: "text-rose-400", sub: adoptionRate === null ? "Aucune décision encore" : "Idées retenues" },
          ].map((k) => (
            <div key={k.label} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
              <span className="text-xs text-neutral-500 font-medium">{k.label}</span>
              <p className={cn("text-2xl font-bold", k.cls)}>{typeof k.value === "number" ? k.value.toLocaleString("fr-FR") : k.value}</p>
              <span className="text-[11px] text-neutral-400">{k.sub}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: "kanban", label: "Kanban & Suggestions", icon: Kanban },
            { id: "response_studio", label: "Réponse Staff", icon: MessageSquare },
            { id: "hall_of_fame", label: "Top Idées", icon: Sparkles },
            { id: "settings", label: "Paramètres & Anti-Spam", icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer",
                  isActive ? "bg-neutral-900 text-white border-b-2 border-amber-500" : "text-neutral-400 hover:text-white"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-amber-400" : "text-neutral-500")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB: Kanban */}
        {activeTab === "kanban" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Filtrer les idées..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full h-9 rounded-xl bg-neutral-900 border border-neutral-800 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs flex-wrap">
                  {["ALL", ...categories].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                        categoryFilter === cat ? "bg-amber-500 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                      )}
                    >
                      {cat === "ALL" ? "Toutes" : cat}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-xs text-neutral-500">{filteredSuggestions.length} suggestion(s)</span>
            </div>

            {/* Création rapide */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-4">
                <label className="text-[11px] text-neutral-400 block mb-1">Titre</label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nouvelle idée..." className="w-full h-9 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white" />
              </div>
              <div className="md:col-span-5">
                <label className="text-[11px] text-neutral-400 block mb-1">Description</label>
                <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Pourquoi, comment..." className="w-full h-9 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] text-neutral-400 block mb-1">Catégorie</label>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full h-9 rounded-xl bg-neutral-950 border border-neutral-800 px-2 text-xs text-white">
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={createSuggestion} disabled={submitting} className="md:col-span-1 h-9 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {filteredSuggestions.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 text-center text-xs text-neutral-500">
                Aucune suggestion pour ce filtre. Les membres peuvent en proposer sur Discord via <code className="text-neutral-300">/suggest</code>.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {KANBAN_COLUMNS.map((col) => {
                  const items = filteredSuggestions.filter((s) => col.statuses.includes(s.status));
                  return (
                    <div key={col.id} className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">{col.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">{items.length}</span>
                      </div>
                      {items.map((sug) => {
                        const meta = STATUS_META[sug.status];
                        const total = sug.upvotesCount + sug.downvotesCount;
                        const approval = total > 0 ? Math.round((sug.upvotesCount / total) * 100) : null;
                        return (
                          <div key={sug.id} className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/30 rounded-2xl p-4 space-y-3 transition-all shadow-lg">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-xs font-bold text-amber-400 shrink-0">#{sug.numericId}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700 truncate">{sug.category}</span>
                              </div>
                              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border shrink-0", meta.cls)}>{meta.label}</span>
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-white leading-snug">{sug.title}</h3>
                              <p className="text-xs text-neutral-400 line-clamp-3 mt-1.5 leading-relaxed">{sug.description}</p>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-neutral-400">
                              <span className="flex items-center gap-1.5 min-w-0">
                                {sug.authorAvatarUrl ? (
                                  <img src={sug.authorAvatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                  <span className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center text-[9px] font-bold">{sug.authorTag.slice(0, 2).toUpperCase()}</span>
                                )}
                                <span className="truncate">{sug.authorTag}</span>
                              </span>
                              <span>{formatRelative(sug.createdAt)}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="flex items-center gap-2">
                                  <span className="flex items-center gap-1 text-emerald-400"><ThumbsUp className="w-3 h-3" />{sug.upvotesCount}</span>
                                  <span className="flex items-center gap-1 text-rose-400"><ThumbsDown className="w-3 h-3" />{sug.downvotesCount}</span>
                                  {sug.comments.length > 0 && <span className="flex items-center gap-1 text-neutral-400"><MessageSquare className="w-3 h-3" />{sug.comments.length}</span>}
                                </span>
                                <span className={cn("font-semibold", PRIORITY_META[sug.priority].cls)}>{PRIORITY_META[sug.priority].label}</span>
                              </div>
                              {approval !== null && (
                                <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${approval}%` }} />
                                </div>
                              )}
                            </div>
                            {sug.staffResponse && (
                              <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-neutral-300">
                                <span className="font-bold text-amber-400 flex items-center gap-1 mb-1"><Crown className="w-3 h-3" />{sug.staffResponderTag || "Staff"}</span>
                                <p className="line-clamp-2">{sug.staffResponse}</p>
                              </div>
                            )}
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => openStudio(sug)} className="flex-1 py-1.5 rounded-xl bg-neutral-800 hover:bg-amber-600 text-neutral-200 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer">
                                Répondre / Statut
                              </button>
                              <button onClick={() => deleteSuggestion(sug)} className="px-2.5 py-1.5 rounded-xl border border-neutral-800 text-neutral-500 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer" title="Supprimer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: Studio de réponse */}
        {activeTab === "response_studio" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2 max-h-[70vh] overflow-y-auto">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Sélectionner une suggestion</span>
              {suggestions.length === 0 && <p className="text-xs text-neutral-500">Aucune suggestion.</p>}
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openStudio(s)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-colors cursor-pointer",
                    selectedId === s.id ? "bg-amber-500/10 border-amber-500/40" : "bg-neutral-950 border-neutral-800 hover:border-neutral-700"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">#{s.numericId} · {s.title}</span>
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0", STATUS_META[s.status].cls)}>{STATUS_META[s.status].label}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">{s.authorTag} · 👍 {s.upvotesCount} 👎 {s.downvotesCount}</span>
                </button>
              ))}
            </div>

            <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
              {!selected ? (
                <p className="text-xs text-neutral-500">Choisis une suggestion à gauche pour publier une réponse officielle, changer son statut ou sa priorité.</p>
              ) : (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-amber-400">#{selected.numericId}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">{selected.category}</span>
                    </div>
                    <h3 className="text-base font-bold text-white">{selected.title}</h3>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{selected.description}</p>
                    <p className="text-[11px] text-neutral-500 mt-2">par {selected.authorTag} · {formatRelative(selected.createdAt)} · 👍 {selected.upvotesCount} / 👎 {selected.downvotesCount}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Nouveau statut</label>
                      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as SuggestionStatus)} className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white">
                        {(Object.keys(STATUS_META) as SuggestionStatus[]).map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Priorité interne</label>
                      <div className="flex gap-1.5">
                        {(Object.keys(PRIORITY_META) as SuggestionPriority[]).map((p) => (
                          <button key={p} onClick={() => savePriority(p)} className={cn("flex-1 h-10 rounded-xl border text-[11px] font-semibold cursor-pointer transition-colors", newPriority === p ? "bg-amber-500/15 border-amber-500 text-white" : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white")}>
                            {PRIORITY_META[p].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Réponse officielle (visible sur Discord)</label>
                    <textarea value={staffReplyText} onChange={(e) => setStaffReplyText(e.target.value)} rows={4} placeholder="Explique la décision au membre..." className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-white resize-none" />
                  </div>

                  <button onClick={saveStatus} disabled={submitting} className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                    <Send className="w-4 h-4" />
                    Publier le statut & la réponse
                  </button>

                  <div className="pt-4 border-t border-neutral-800 space-y-3">
                    <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Commentaires ({selected.comments.length})</span>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {selected.comments.length === 0 && <p className="text-[11px] text-neutral-500">Aucun commentaire.</p>}
                      {selected.comments.map((c) => (
                        <div key={c.id} className={cn("p-2.5 rounded-xl border text-[11px]", c.isStaff ? "bg-amber-500/5 border-amber-500/20" : "bg-neutral-950 border-neutral-800")}>
                          <span className="font-bold text-white">{c.userTag}</span>
                          {c.isStaff && <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-300">STAFF</span>}
                          <span className="text-neutral-500 ml-2">{formatRelative(c.timestamp)}</span>
                          <p className="text-neutral-300 mt-1">{c.content}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Ajouter un commentaire staff..." className="flex-1 h-9 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white" />
                      <button onClick={addComment} disabled={submitting || !commentText.trim()} className="px-3 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer">Envoyer</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB: Top idées */}
        {activeTab === "hall_of_fame" && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /> Les idées les mieux notées (score = 👍 − 👎)</h2>
            {topIdeas.length === 0 ? (
              <p className="text-xs text-neutral-500">Pas encore de suggestion votée.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topIdeas.map((s, i) => (
                  <div key={s.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{["🥇", "🥈", "🥉"][i] || `#${i + 1}`}</span>
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", STATUS_META[s.status].cls)}>{STATUS_META[s.status].label}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{s.title}</h3>
                    <p className="text-[11px] text-neutral-400">{s.authorTag} · score <span className="text-emerald-400 font-bold">{s.score}</span> · 👍 {s.upvotesCount} / 👎 {s.downvotesCount}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Paramètres */}
        {activeTab === "settings" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5 max-w-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2"><Sliders className="w-4 h-4 text-amber-400" /> Salon, anti-spam & notifications</h3>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div>
                <span className="font-bold text-white text-xs block">Module activé</span>
                <span className="text-neutral-500 text-[11px]">Autorise /suggest et les votes sur Discord</span>
              </div>
              <button onClick={() => saveConfig({ enabled: !config.enabled })} className={cn("px-3 py-1 rounded-lg text-xs font-bold cursor-pointer", config.enabled ? "bg-amber-500 text-white" : "bg-neutral-800 text-neutral-400")}>
                {config.enabled ? "Activé" : "Désactivé"}
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Salon des suggestions</label>
              <ChannelPicker
                guildId={currentGuildId}
                value={config.channelId || ""}
                onChange={(channelId) => {
                  const val = channelId || null;
                  setConfig((p) => ({ ...p, channelId: val }));
                  saveConfig({ channelId: val });
                }}
                placeholder="Sélectionner un salon de suggestions..."
                allowClear
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div>
                <span className="font-bold text-white text-xs block">Cooldown entre deux suggestions</span>
                <span className="text-neutral-500 text-[11px]">Minutes minimum par membre (anti-spam)</span>
              </div>
              <input type="number" min={0} max={1440} value={config.cooldownMinutes} onChange={(e) => setConfig((p) => ({ ...p, cooldownMinutes: Number(e.target.value) }))} onBlur={() => saveConfig({ cooldownMinutes: config.cooldownMinutes })} className="w-20 h-9 rounded-xl bg-neutral-900 border border-neutral-700 text-center text-xs font-bold text-amber-400" />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div>
                <span className="font-bold text-white text-xs block">Fil de discussion automatique</span>
                <span className="text-neutral-500 text-[11px]">Crée un thread sous chaque suggestion</span>
              </div>
              <button onClick={() => saveConfig({ autoThread: !config.autoThread })} className={cn("px-3 py-1 rounded-lg text-xs font-bold cursor-pointer", config.autoThread ? "bg-amber-500 text-white" : "bg-neutral-800 text-neutral-400")}>
                {config.autoThread ? "Activé" : "Désactivé"}
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div>
                <span className="font-bold text-white text-xs block">Notifier l'auteur en MP</span>
                <span className="text-neutral-500 text-[11px]">À chaque changement de statut</span>
              </div>
              <button onClick={() => saveConfig({ dmNotifications: !config.dmNotifications })} className={cn("px-3 py-1 rounded-lg text-xs font-bold cursor-pointer", config.dmNotifications ? "bg-amber-500 text-white" : "bg-neutral-800 text-neutral-400")}>
                {config.dmNotifications ? "Activé" : "Désactivé"}
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Catégories (séparées par des virgules)</label>
              <input
                type="text"
                value={config.categories.join(", ")}
                onChange={(e) => setConfig((p) => ({ ...p, categories: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) }))}
                onBlur={() => saveConfig({ categories: config.categories })}
                className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white"
              />
            </div>
            {savingConfig && <p className="text-[10px] text-neutral-500">Enregistrement...</p>}
          </div>
        )}
      </div>
    </div>
  );
}
