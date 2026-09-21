"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  Sparkles,
  Sliders,
  BookOpen,
  FolderTree,
  Wrench,
  Brain,
  BarChart3,
  Check,
  Send,
  Plus,
  Trash2,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Zap,
  Globe,
  Hash,
  X,
  RefreshCw,
  Save,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

// Mirrors discord-bot/src/modules/ai/types/index.ts.
type ResponseMode = "AUTOMATIC" | "MENTION_ONLY" | "COMMAND_ONLY" | "REPLY" | "HYBRID" | "DISABLED";
type Tone = "FRIENDLY" | "PROFESSIONAL" | "CASUAL" | "FUNNY" | "CONCISE" | "DETAILED" | "TECHNICAL" | "CUSTOM";
type KnowledgeType = "TEXT" | "FAQ" | "DOC" | "URL" | "DISCORD";

interface Personality {
  name: string;
  description: string;
  tone: Tone;
  sliders: { friendly: number; humor: number; formality: number; verbosity: number; creativity: number };
  systemInstructions: string;
  language: string;
  replyInUserLanguage: boolean;
}

interface ChannelRule {
  channelId: string;
  channelName: string;
  isCategory: boolean;
  mode: ResponseMode;
  knowledgeSourceIds: string[];
  threadModeEnabled: boolean;
  maxHistoryMessages: number;
}

interface KnowledgeItem {
  id: string;
  title: string;
  type: KnowledgeType;
  scope: string;
  tokenCount: number;
  status: "READY" | "INDEXING" | "ERROR";
  updatedAt: string;
}

interface Tools {
  readKnowledge: boolean;
  readAllowedChannels: boolean;
  createThreads: boolean;
  sendMessages: boolean;
  ticketHandoff: boolean;
  summarizeChannels: boolean;
  moderationAssist: boolean;
}

interface Memory {
  enabled: boolean;
  contextLength: number;
  retentionHours: number;
  userCanForget: boolean;
}

interface Analytics {
  requestsToday: number;
  activeConversations: number;
  tokensConsumed: number;
  helpfulCount: number;
  unhelpfulCount: number;
  handoffCount: number;
  avgResponseTimeMs: number;
}

interface Settings {
  enabled: boolean;
  defaultMode: ResponseMode;
  personality: Personality;
  hallucinationMode: "STRICT" | "BALANCED" | "CREATIVE";
  showSources: "ALWAYS" | "WHEN_USED" | "NEVER";
  tools: Tools;
  memory: Memory;
  channelRules: Record<string, ChannelRule>;
  provider: string;
  model: string;
  dailyBudgetTokens: number;
  publishedVersion: number;
  lastPublishedAt: string;
}

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  defaultMode: "MENTION_ONLY",
  personality: {
    name: "ETHONE Assistant",
    description: "Assistant intelligent officiel de la communauté.",
    tone: "FRIENDLY",
    sliders: { friendly: 85, humor: 35, formality: 60, verbosity: 40, creativity: 60 },
    systemInstructions: "Tu es l'assistant IA officiel du serveur. Tu réponds avec bienveillance et concision.",
    language: "auto",
    replyInUserLanguage: true,
  },
  hallucinationMode: "BALANCED",
  showSources: "WHEN_USED",
  tools: { readKnowledge: true, readAllowedChannels: true, createThreads: true, sendMessages: true, ticketHandoff: true, summarizeChannels: true, moderationAssist: false },
  memory: { enabled: true, contextLength: 20, retentionHours: 24, userCanForget: true },
  channelRules: {},
  provider: "BUILTIN",
  model: "builtin",
  dailyBudgetTokens: 100000,
  publishedVersion: 1,
  lastPublishedAt: new Date().toISOString(),
};

const EMPTY_ANALYTICS: Analytics = { requestsToday: 0, activeConversations: 0, tokensConsumed: 0, helpfulCount: 0, unhelpfulCount: 0, handoffCount: 0, avgResponseTimeMs: 0 };

function relative(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(min)) return "—";
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.round(h / 24)} j`;
}

export default function AiCenterClient() {
  const searchParams = useSearchParams();
  const rawGuildId = searchParams.get("guildId");
  const { profile } = useDiscordOAuth();
  const { success, error: toastError } = useToast();

  const activeGuild = useMemo(() => {
    if (rawGuildId && profile?.guilds) {
      return profile.guilds.find((g) => g.id === rawGuildId) || profile.guilds[0];
    }
    return profile?.guilds?.[0] || null;
  }, [rawGuildId, profile?.guilds]);

  const currentGuildId = useResolvedGuildId(rawGuildId, profile?.guilds);
  const base = `${BOT_API_URL}/api/guilds/${currentGuildId}/ai`;
  const isRealGuild = Boolean(BOT_API_URL) && Boolean(currentGuildId);

  const [activeTab, setActiveTab] = useState<"overview" | "personality" | "knowledge" | "channels" | "tools" | "memory" | "analytics">("overview");
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [analytics, setAnalytics] = useState<Analytics>(EMPTY_ANALYTICS);
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Playground
  const [playQuery, setPlayQuery] = useState("");
  const [playResult, setPlayResult] = useState<{ answer: string; sourcesUsed: string[]; retrievedContext: string; tokensUsed: number; model: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Knowledge modal
  const [showAddKnowledgeModal, setShowAddKnowledgeModal] = useState(false);
  const [newKnTitle, setNewKnTitle] = useState("");
  const [newKnType, setNewKnType] = useState<KnowledgeType>("TEXT");
  const [newKnContent, setNewKnContent] = useState("");

  // Channel rule add
  const [newRuleChannelId, setNewRuleChannelId] = useState("");
  const [newRuleChannelName, setNewRuleChannelName] = useState("");

  // Memory
  const [userToForgetId, setUserToForgetId] = useState("");

  const personality = settings.personality;
  const setPersonality = (patch: Partial<Personality>) => {
    setSettings((s) => ({ ...s, personality: { ...s.personality, ...patch } }));
    setDirty(true);
  };
  const setSlider = (key: keyof Personality["sliders"], value: number) => {
    setSettings((s) => ({ ...s, personality: { ...s.personality, sliders: { ...s.personality.sliders, [key]: value } } }));
    setDirty(true);
  };

  const load = useCallback(async () => {
    if (!isRealGuild) {
      setIsDemo(true);
      return;
    }
    setLoading(true);
    try {
      const [overviewRes, knRes] = await Promise.all([
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/knowledge`, { credentials: "include" }),
      ]);
      const overview = await overviewRes.json().catch(() => null);
      const kn = await knRes.json().catch(() => null);
      if (!overviewRes.ok || !overview?.settings) {
        setIsDemo(true);
        return;
      }
      setIsDemo(false);
      setSettings({ ...DEFAULT_SETTINGS, ...overview.settings, personality: { ...DEFAULT_SETTINGS.personality, ...overview.settings.personality } });
      setAnalytics(overview.analytics || EMPTY_ANALYTICS);
      setKnowledgeList(knRes.ok && Array.isArray(kn?.sources) ? kn.sources : []);
      setDirty(false);
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [base, isRealGuild]);

  useEffect(() => {
    load();
  }, [load]);

  const put = async (path: string, body: unknown) => {
    const res = await fetch(`${base}${path}`, { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  };

  /** Persists personality, tools, memory/behaviour settings in one go, then bumps the published version. */
  const handlePublish = async () => {
    if (isDemo) {
      toastError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    setSaving(true);
    try {
      await put("/personality", settings.personality);
      await put("/tools", settings.tools);
      await put("/settings", {
        enabled: settings.enabled,
        defaultMode: settings.defaultMode,
        hallucinationMode: settings.hallucinationMode,
        showSources: settings.showSources,
        memory: settings.memory,
        dailyBudgetTokens: settings.dailyBudgetTokens,
      });
      const res = await fetch(`${base}/publish`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.version !== "number") throw new Error(data?.error || "publish failed");
      setSettings((s) => ({ ...s, publishedVersion: data.version, lastPublishedAt: data.publishedAt }));
      setDirty(false);
      success(`Version v${data.version} publiée sur le bot.`);
    } catch (e: any) {
      toastError(e?.message || "Échec de la publication.");
    } finally {
      setSaving(false);
    }
  };

  const handlePlaygroundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playQuery.trim()) return;
    setIsPlaying(true);
    setPlayResult(null);
    if (isDemo) {
      toastError("Bot injoignable : le modèle ne peut pas répondre.");
      setIsPlaying(false);
      return;
    }
    try {
      const res = await fetch(`${base}/test`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: playQuery }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.answer !== "string") throw new Error(data?.error || "test failed");
      setPlayResult(data);
    } catch (err: any) {
      toastError(err?.message || "Le playground a échoué.");
    } finally {
      setIsPlaying(false);
    }
  };

  const handleAddKnowledge = async () => {
    if (!newKnTitle.trim() || !newKnContent.trim()) return;
    if (isDemo) {
      toastError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    try {
      const res = await fetch(`${base}/knowledge`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: newKnTitle, type: newKnType, content: newKnContent, scope: "GLOBAL" }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) throw new Error(data?.error || "create failed");
      setKnowledgeList((prev) => [data, ...prev]);
      setShowAddKnowledgeModal(false);
      setNewKnTitle("");
      setNewKnContent("");
      success("Source indexée pour le RAG.");
    } catch (e: any) {
      toastError(e?.message || "Échec de l'ajout de la source.");
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    setKnowledgeList((prev) => prev.filter((k) => k.id !== id));
    if (isDemo) return;
    try {
      const res = await fetch(`${base}/knowledge/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
    } catch {
      toastError("Échec de la suppression — rechargez la page.");
    }
  };

  const saveChannelRule = async (rule: ChannelRule) => {
    setSettings((s) => ({ ...s, channelRules: { ...s.channelRules, [rule.channelId]: rule } }));
    if (isDemo) return;
    try {
      await put("/channels", { rule });
    } catch (e: any) {
      toastError(e?.message || "Échec de l'enregistrement de la règle.");
    }
  };

  const addChannelRule = () => {
    const id = newRuleChannelId.trim();
    if (!/^\d{15,22}$/.test(id)) {
      toastError("ID de salon Discord invalide.");
      return;
    }
    saveChannelRule({ channelId: id, channelName: newRuleChannelName.trim() || id, isCategory: false, mode: "MENTION_ONLY", knowledgeSourceIds: [], threadModeEnabled: false, maxHistoryMessages: 15 });
    setNewRuleChannelId("");
    setNewRuleChannelName("");
  };

  const handleForgetUserData = async () => {
    const id = userToForgetId.trim();
    if (!id) return;
    if (isDemo) {
      toastError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    try {
      const res = await fetch(`${base}/memory/user/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      success(`${data?.removedCount ?? 0} conversation(s) supprimée(s) pour cet utilisateur.`);
      setUserToForgetId("");
    } catch (e: any) {
      toastError(e?.message || "Échec de la purge.");
    }
  };

  const channelRules = Object.values(settings.channelRules || {});
  const satisfaction = analytics.helpfulCount + analytics.unhelpfulCount > 0 ? Math.round((analytics.helpfulCount / (analytics.helpfulCount + analytics.unhelpfulCount)) * 100) : null;

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
              <div className="p-2.5 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/30 shadow-sm">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  ETHONE AI Assistant
                  <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold border", settings.enabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-neutral-800 text-neutral-400 border-neutral-700")}>
                    {settings.enabled ? "🟢 Activé" : "⚪ Désactivé"}
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Personnalité, base de connaissances RAG, règles par salon et playground branché sur le vrai modèle.
                  {isDemo && <span className="text-amber-400"> (bot injoignable ou absent de ce serveur)</span>}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button onClick={load} disabled={loading} className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4 text-indigo-400", loading && "animate-spin")} />
              Actualiser
            </button>
            <button onClick={handlePublish} disabled={saving} className={cn("px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50", dirty ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300")}>
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-emerald-400" />}
              {dirty ? `Publier v${settings.publishedVersion + 1}` : `v${settings.publishedVersion} publiée`}
            </button>
          </div>
        </div>

        {/* KPI réels */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Requêtes aujourd'hui", value: analytics.requestsToday.toLocaleString("fr-FR"), cls: "text-white", sub: `${analytics.handoffCount} handoff(s) ticket` },
            { label: "Conversations actives", value: String(analytics.activeConversations), cls: "text-indigo-400", sub: `${channelRules.length} règle(s) de salon` },
            { label: "Temps de réponse moyen", value: analytics.avgResponseTimeMs > 0 ? `${analytics.avgResponseTimeMs} ms` : "—", cls: "text-cyan-400", sub: settings.model },
            { label: "Satisfaction", value: satisfaction === null ? "—" : `${satisfaction}% 👍`, cls: "text-emerald-400", sub: `${analytics.helpfulCount} 👍 · ${analytics.unhelpfulCount} 👎` },
            { label: "Tokens consommés", value: analytics.tokensConsumed >= 1000 ? `${(analytics.tokensConsumed / 1000).toFixed(1)}k` : String(analytics.tokensConsumed), cls: "text-purple-400", sub: `Budget : ${(settings.dailyBudgetTokens / 1000).toFixed(0)}k / jour` },
            { label: "Sources RAG", value: String(knowledgeList.length), cls: "text-amber-400", sub: `${knowledgeList.reduce((a, k) => a + k.tokenCount, 0).toLocaleString("fr-FR")} tokens indexés` },
          ].map((k) => (
            <div key={k.label} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
              <span className="text-xs text-neutral-500 font-medium">{k.label}</span>
              <p className={cn("text-2xl font-bold truncate", k.cls)}>{k.value}</p>
              <span className="text-[11px] text-neutral-400 block truncate">{k.sub}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: "overview", label: "Playground", icon: Sparkles },
            { id: "personality", label: "Personnalité", icon: Sliders },
            { id: "knowledge", label: `Connaissances (${knowledgeList.length})`, icon: BookOpen },
            { id: "channels", label: "Salons & Règles", icon: FolderTree },
            { id: "tools", label: "Outils", icon: Wrench },
            { id: "memory", label: "Mémoire & RGPD", icon: Brain },
            { id: "analytics", label: "Qualité", icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={cn("px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer", isActive ? "bg-neutral-900 text-white border-b-2 border-indigo-500" : "text-neutral-400 hover:text-white")}>
                <Icon className={cn("w-4 h-4", isActive ? "text-indigo-400" : "text-neutral-500")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Playground */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-lg shrink-0">🤖</div>
                <div>
                  <h3 className="font-bold text-white text-base">{personality.name}</h3>
                  <p className="text-xs text-neutral-400">{personality.description}</p>
                </div>
              </div>
              <div className="divide-y divide-neutral-800/80 text-xs pt-2">
                <div className="py-2 flex justify-between"><span className="text-neutral-500">Ton</span><span className="font-semibold text-neutral-200">{personality.tone}</span></div>
                <div className="py-2 flex justify-between"><span className="text-neutral-500">Mode par défaut</span><span className="font-semibold text-indigo-400">{settings.defaultMode}</span></div>
                <div className="py-2 flex justify-between"><span className="text-neutral-500">Fournisseur / modèle</span><span className="font-semibold text-neutral-200 font-mono truncate max-w-[55%]">{settings.provider} · {settings.model}</span></div>
                <div className="py-2 flex justify-between"><span className="text-neutral-500">Version publiée</span><span className="font-semibold text-emerald-400">v{settings.publishedVersion} · {relative(settings.lastPublishedAt)}</span></div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs font-semibold text-white">Assistant activé</span>
                <input type="checkbox" checked={settings.enabled} onChange={(e) => { setSettings((s) => ({ ...s, enabled: e.target.checked })); setDirty(true); }} className="w-4 h-4 rounded text-indigo-600 bg-neutral-900 border-neutral-700" />
              </div>
              <button onClick={() => setActiveTab("personality")} className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors cursor-pointer">Modifier la personnalité</button>
            </div>

            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Playground</h3>
                  <p className="text-xs text-neutral-400">Teste une question : le bot applique ton prompt, tes sources RAG et le shield anti-injection, exactement comme sur Discord.</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{isDemo ? "Hors ligne" : "Modèle réel"}</span>
              </div>
              <form onSubmit={handlePlaygroundSubmit} className="space-y-3">
                <div className="relative">
                  <input type="text" value={playQuery} onChange={(e) => setPlayQuery(e.target.value)} placeholder="Ex: Comment obtenir le rôle VIP ? Quelles sont les règles ?" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-4 pr-24 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors" />
                  <button type="submit" disabled={isPlaying || !playQuery.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
                    <Send className="w-3 h-3" /> Tester
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="text-neutral-500 py-1">Suggestions :</span>
                  {["Comment devenir VIP ?", "Quelles sont les règles ?", "Comment ouvrir un ticket ?", "Bonjour !"].map((s) => (
                    <button key={s} type="button" onClick={() => setPlayQuery(s)} className="px-2.5 py-1 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 transition-colors cursor-pointer">{s}</button>
                  ))}
                </div>
              </form>
              {isPlaying && (
                <div className="p-6 bg-neutral-950 rounded-xl border border-neutral-800 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-neutral-400">{personality.name} réfléchit...</p>
                </div>
              )}
              {playResult && (
                <div className="space-y-4">
                  <div className="p-5 bg-neutral-950 border border-indigo-500/30 rounded-xl space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">🤖</span>
                      <span className="font-bold text-sm text-white">{personality.name}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">{playResult.model} · {playResult.tokensUsed} tokens</span>
                    </div>
                    <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-line">{playResult.answer}</p>
                    {playResult.sourcesUsed.length > 0 && (
                      <div className="pt-2 border-t border-neutral-800 text-xs">
                        <span className="text-neutral-400 font-semibold block mb-1">📚 Sources utilisées :</span>
                        <div className="flex flex-wrap gap-1.5">
                          {playResult.sourcesUsed.map((src) => <span key={src} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px]">• {src}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800 text-xs space-y-2">
                    <span className="font-bold text-neutral-400 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-neutral-500" /> Contexte RAG transmis au modèle :</span>
                    <p className="font-mono text-[11px] text-neutral-400 bg-neutral-900 p-2.5 rounded-lg whitespace-pre-wrap max-h-40 overflow-y-auto">{playResult.retrievedContext || "Aucune source n'a matché cette question."}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Personnalité */}
        {activeTab === "personality" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Personality Builder</h3>
                <p className="text-xs text-neutral-400">Les changements sont appliqués au bot au clic sur « Publier ».</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Nom de l'assistant</label>
                  <input type="text" value={personality.name} onChange={(e) => setPersonality({ name: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Ton général</label>
                  <select value={personality.tone} onChange={(e) => setPersonality({ tone: e.target.value as Tone })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="FRIENDLY">Convivial & chaleureux</option>
                    <option value="PROFESSIONAL">Professionnel & posé</option>
                    <option value="CASUAL">Décontracté & gamer</option>
                    <option value="FUNNY">Humoristique & décalé</option>
                    <option value="CONCISE">Concis & rapide</option>
                    <option value="DETAILED">Détaillé</option>
                    <option value="TECHNICAL">Technique</option>
                    <option value="CUSTOM">Personnalisé (instructions seules)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Description courte</label>
                <input type="text" value={personality.description} onChange={(e) => setPersonality({ description: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-4 pt-2 border-t border-neutral-800">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">Curseurs de personnalité</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {([
                    ["friendly", "Convivialité", "text-indigo-400", "accent-indigo-500"],
                    ["humor", "Humour", "text-amber-400", "accent-amber-500"],
                    ["formality", "Formalité", "text-cyan-400", "accent-cyan-500"],
                    ["verbosity", "Longueur des réponses", "text-purple-400", "accent-purple-500"],
                    ["creativity", "Créativité", "text-pink-400", "accent-pink-500"],
                  ] as [keyof Personality["sliders"], string, string, string][]).map(([key, label, txt, accent]) => (
                    <div key={key} className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800/80">
                      <div className="flex justify-between font-semibold"><span className="text-neutral-300">{label}</span><span className={txt}>{personality.sliders[key]}%</span></div>
                      <input type="range" min={0} max={100} value={personality.sliders[key]} onChange={(e) => setSlider(key, Number(e.target.value))} className={cn("w-full cursor-pointer", accent)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Instructions système</label>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🛡️ Shield anti-injection actif</span>
                </div>
                <textarea rows={5} value={personality.systemInstructions} onChange={(e) => setPersonality({ systemInstructions: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs font-mono text-neutral-200 focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex items-center justify-between p-3.5 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-white flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-indigo-400" /> Répondre dans la langue du membre</span>
                  <p className="text-[11px] text-neutral-400">Détecte français, anglais, espagnol...</p>
                </div>
                <input type="checkbox" checked={personality.replyInUserLanguage} onChange={(e) => setPersonality({ replyInUserLanguage: e.target.checked })} className="w-4 h-4 rounded text-indigo-600 bg-neutral-900 border-neutral-700" />
              </div>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Aperçu</h4>
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3 text-xs">
                <div className="flex items-center gap-2.5"><span className="text-lg">🤖</span><div><span className="font-bold text-white">{personality.name}</span><span className="text-[10px] text-neutral-500 block">Bot officiel</span></div></div>
                <p className="text-neutral-300 italic">« Bonjour ! Je suis {personality.name}, en mode {personality.tone.toLowerCase()} ({personality.sliders.friendly}% convivial). Prêt à t'aider sur le serveur ! »</p>
              </div>
              <div className="space-y-2 text-xs">
                <label className="font-semibold text-neutral-300 block">Budget quotidien (tokens)</label>
                <input type="number" min={1000} step={1000} value={settings.dailyBudgetTokens} onChange={(e) => { setSettings((s) => ({ ...s, dailyBudgetTokens: Number(e.target.value) || 0 })); setDirty(true); }} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Connaissances */}
        {activeTab === "knowledge" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Base de connaissances (RAG)</h3>
                <p className="text-xs text-neutral-400">Règles, FAQ et guides que l'IA cite pour répondre précisément.</p>
              </div>
              <button onClick={() => setShowAddKnowledgeModal(true)} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto cursor-pointer">
                <Plus className="w-4 h-4" /> Ajouter une source
              </button>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/70 border-b border-neutral-800 text-neutral-400 font-semibold uppercase tracking-wider">
                  <tr><th className="px-5 py-3.5">Source</th><th className="px-4 py-3.5">Type</th><th className="px-4 py-3.5">Portée</th><th className="px-4 py-3.5">Tokens</th><th className="px-4 py-3.5">Statut</th><th className="px-4 py-3.5">Mise à jour</th><th className="px-5 py-3.5 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {knowledgeList.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-neutral-500">Aucune source. Ajoute ton règlement ou ta FAQ pour que l'IA réponde avec tes vraies infos.</td></tr>}
                  {knowledgeList.map((kn) => (
                    <tr key={kn.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="px-5 py-4 font-semibold text-white">{kn.title}</td>
                      <td className="px-4 py-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300">{kn.type}</span></td>
                      <td className="px-4 py-4 text-neutral-400">{kn.scope}</td>
                      <td className="px-4 py-4 font-mono text-neutral-400">{kn.tokenCount}</td>
                      <td className="px-4 py-4"><span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", kn.status === "READY" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : kn.status === "ERROR" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>{kn.status}</span></td>
                      <td className="px-4 py-4 text-neutral-500">{relative(kn.updatedAt)}</td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => handleDeleteKnowledge(kn.id)} className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
                <label className="text-xs font-semibold text-white block">Mode anti-hallucination</label>
                <select value={settings.hallucinationMode} onChange={(e) => { setSettings((s) => ({ ...s, hallucinationMode: e.target.value as Settings["hallucinationMode"] })); setDirty(true); }} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                  <option value="STRICT">Strict — refuse si l'info est absente des sources</option>
                  <option value="BALANCED">Équilibré — répond avec prudence</option>
                  <option value="CREATIVE">Créatif — réponse libre</option>
                </select>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
                <label className="text-xs font-semibold text-white block">Affichage des sources sur Discord</label>
                <select value={settings.showSources} onChange={(e) => { setSettings((s) => ({ ...s, showSources: e.target.value as Settings["showSources"] })); setDirty(true); }} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                  <option value="WHEN_USED">Seulement si des documents sont cités</option>
                  <option value="ALWAYS">Toujours</option>
                  <option value="NEVER">Jamais</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Salons */}
        {activeTab === "channels" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Salons & règles</h3>
                <p className="text-xs text-neutral-400">Où et comment l'IA répond. Les règles par salon sont enregistrées immédiatement.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Mode global :</span>
                <select value={settings.defaultMode} onChange={(e) => { setSettings((s) => ({ ...s, defaultMode: e.target.value as ResponseMode })); setDirty(true); }} className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-indigo-500">
                  <option value="MENTION_ONLY">Mention uniquement (@Bot)</option>
                  <option value="AUTOMATIC">Automatique partout</option>
                  <option value="COMMAND_ONLY">Commandes uniquement (/ask)</option>
                  <option value="REPLY">Réponses aux messages du bot</option>
                  <option value="HYBRID">Hybride (mention + réponse)</option>
                  <option value="DISABLED">Désactivé</option>
                </select>
              </div>
            </div>
            <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden">
              {channelRules.length === 0 && <p className="p-4 text-xs text-neutral-500">Aucune règle spécifique — le mode global s'applique partout.</p>}
              {channelRules.map((rule) => (
                <div key={rule.channelId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-800/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Hash className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-semibold text-white text-sm block truncate">#{rule.channelName}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">{rule.channelId}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <select value={rule.mode} onChange={(e) => saveChannelRule({ ...rule, mode: e.target.value as ResponseMode })} className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                      <option value="AUTOMATIC">🟢 Automatique</option>
                      <option value="MENTION_ONLY">🟡 Sur mention</option>
                      <option value="HYBRID">🔵 Hybride</option>
                      <option value="COMMAND_ONLY">⚪ /ask seulement</option>
                      <option value="DISABLED">🔴 Désactivé</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-neutral-300 cursor-pointer">
                      <input type="checkbox" checked={rule.threadModeEnabled} onChange={(e) => saveChannelRule({ ...rule, threadModeEnabled: e.target.checked })} className="rounded text-indigo-600 bg-neutral-900 border-neutral-700" />
                      Thread dédié
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-neutral-300">
                      Historique
                      <input type="number" min={0} max={50} value={rule.maxHistoryMessages} onChange={(e) => saveChannelRule({ ...rule, maxHistoryMessages: Number(e.target.value) || 0 })} className="w-14 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-white" />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end pt-2 border-t border-neutral-800">
              <div className="sm:col-span-6">
                <label className="text-[11px] text-neutral-400 block mb-1">Salon Discord</label>
                <ChannelPicker
                  value={newRuleChannelId}
                  onChange={(id, channel) => {
                    setNewRuleChannelId(id);
                    if (channel && !newRuleChannelName) {
                      setNewRuleChannelName(channel.name);
                    }
                  }}
                  guildId={currentGuildId}
                  placeholder="Sélectionner ou saisir l'ID..."
                  size="sm"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="text-[11px] text-neutral-400 block mb-1">Nom (affichage)</label>
                <input value={newRuleChannelName} onChange={(e) => setNewRuleChannelName(e.target.value)} placeholder="ai-chat" className="w-full h-8 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white" />
              </div>
              <button onClick={addChannelRule} className="sm:col-span-2 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Règle</button>
            </div>
          </div>
        )}

        {/* Outils */}
        {activeTab === "tools" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Outils & actions autorisées</h3>
              <p className="text-xs text-neutral-400">Principe du moindre privilège : n'active que ce qui sert à ton serveur.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {([
                ["readKnowledge", "Consulter la base de connaissances", "Cherche dans tes documents pour répondre."],
                ["readAllowedChannels", "Lire les salons autorisés", "Contextualise avec les derniers messages du salon."],
                ["createThreads", "Créer des threads", "Isole les échanges pour ne pas encombrer le salon."],
                ["sendMessages", "Envoyer des messages", "Nécessaire pour répondre publiquement."],
                ["ticketHandoff", "Handoff vers Tickets", "Le membre peut ouvrir un ticket avec le résumé de l'IA."],
                ["summarizeChannels", "Commande /summarize", "Résume les derniers échanges d'un salon."],
                ["moderationAssist", "Assistant modération", "Pré-rapports d'incident (les sanctions restent manuelles)."],
              ] as [keyof Tools, string, string][]).map(([key, title, desc]) => (
                <div key={key} className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/80 flex items-start justify-between gap-3">
                  <div className="space-y-1"><span className="font-semibold text-white block">{title}</span><p className="text-neutral-400">{desc}</p></div>
                  <input type="checkbox" checked={settings.tools[key]} onChange={(e) => { setSettings((s) => ({ ...s, tools: { ...s.tools, [key]: e.target.checked } })); setDirty(true); }} className="w-4 h-4 mt-0.5 rounded text-indigo-600 bg-neutral-900 border-neutral-700" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mémoire */}
        {activeTab === "memory" && (
          <div className="max-w-4xl space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Mémoire de conversation</h3>
                  <p className="text-xs text-neutral-400">Contexte récent conservé pour des échanges fluides.</p>
                </div>
                <input type="checkbox" checked={settings.memory.enabled} onChange={(e) => { setSettings((s) => ({ ...s, memory: { ...s.memory, enabled: e.target.checked } })); setDirty(true); }} className="w-4 h-4 rounded text-indigo-600 bg-neutral-900 border-neutral-700" />
              </div>
              {settings.memory.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-neutral-800 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-neutral-300">Historique (messages)</label>
                    <input type="number" min={5} max={50} value={settings.memory.contextLength} onChange={(e) => { setSettings((s) => ({ ...s, memory: { ...s.memory, contextLength: Number(e.target.value) || 0 } })); setDirty(true); }} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-neutral-300">Rétention max (heures)</label>
                    <input type="number" min={1} max={168} value={settings.memory.retentionHours} onChange={(e) => { setSettings((s) => ({ ...s, memory: { ...s.memory, retentionHours: Number(e.target.value) || 0 } })); setDirty(true); }} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white" />
                  </div>
                  <label className="flex items-center gap-2 pt-5 text-neutral-300 cursor-pointer">
                    <input type="checkbox" checked={settings.memory.userCanForget} onChange={(e) => { setSettings((s) => ({ ...s, memory: { ...s.memory, userCanForget: e.target.checked } })); setDirty(true); }} className="rounded text-indigo-600 bg-neutral-900 border-neutral-700" />
                    Les membres peuvent /forget
                  </label>
                </div>
              )}
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400" /> Droit à l'oubli (RGPD)</h3>
              <p className="text-xs text-neutral-400">Efface immédiatement toutes les conversations mémorisées pour un identifiant Discord.</p>
              <div className="flex items-center gap-2">
                <input type="text" placeholder="ID Discord de l'utilisateur" value={userToForgetId} onChange={(e) => setUserToForgetId(e.target.value)} className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono" />
                <button onClick={handleForgetUserData} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer">Oublier cet utilisateur</button>
              </div>
            </div>
          </div>
        )}

        {/* Qualité */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Satisfaction & retours</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <ThumbsUp className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-emerald-400">{analytics.helpfulCount}</p>
                  <span className="text-xs text-neutral-400">Utiles{satisfaction !== null && ` (${satisfaction}%)`}</span>
                </div>
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <ThumbsDown className="w-6 h-6 text-rose-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-rose-400">{analytics.unhelpfulCount}</p>
                  <span className="text-xs text-neutral-400">Inutiles{satisfaction !== null && ` (${100 - satisfaction}%)`}</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-500">Les membres notent chaque réponse avec les boutons 👍 / 👎 sous les messages du bot.</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-3 text-xs">
              <h3 className="text-base font-bold text-white">Usage</h3>
              {[
                ["Requêtes aujourd'hui", analytics.requestsToday.toLocaleString("fr-FR")],
                ["Conversations actives", String(analytics.activeConversations)],
                ["Handoffs vers tickets", String(analytics.handoffCount)],
                ["Temps de réponse moyen", analytics.avgResponseTimeMs > 0 ? `${analytics.avgResponseTimeMs} ms` : "—"],
                ["Tokens consommés", analytics.tokensConsumed.toLocaleString("fr-FR")],
                ["Budget quotidien", settings.dailyBudgetTokens.toLocaleString("fr-FR")],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800"><span className="text-neutral-300">{l}</span><span className="font-mono font-bold text-white">{v}</span></div>
              ))}
              <div className="h-1.5 w-full rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, settings.dailyBudgetTokens > 0 ? (analytics.tokensConsumed / settings.dailyBudgetTokens) * 100 : 0)}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Modal source */}
        {showAddKnowledgeModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 relative">
              <button onClick={() => setShowAddKnowledgeModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20"><BookOpen className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-base font-bold text-white">Ajouter une source</h3>
                  <p className="text-xs text-neutral-400">Indexée immédiatement pour le moteur RAG.</p>
                </div>
              </div>
              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">Titre</label>
                  <input type="text" value={newKnTitle} onChange={(e) => setNewKnTitle(e.target.value)} placeholder="Ex: Procédure de recrutement staff" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">Type</label>
                  <select value={newKnType} onChange={(e) => setNewKnType(e.target.value as KnowledgeType)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="TEXT">Texte brut</option>
                    <option value="FAQ">Questions & réponses (FAQ)</option>
                    <option value="DOC">Documentation / guide</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">Contenu</label>
                  <textarea rows={6} value={newKnContent} onChange={(e) => setNewKnContent(e.target.value)} placeholder="Colle ici les règles, Q/R ou procédures..." className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500" />
                  <p className="text-[10px] text-neutral-500">≈ {Math.ceil(newKnContent.length / 4)} tokens</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowAddKnowledgeModal(false)} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition-colors cursor-pointer">Annuler</button>
                  <button onClick={handleAddKnowledge} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Indexer</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
