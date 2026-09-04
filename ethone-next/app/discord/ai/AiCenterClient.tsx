"use client";

import React, { useState } from "react";
import Link from "next/link";
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
  MessageSquare,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Ticket,
  Lock,
  Eye,
  RefreshCw,
  Zap,
  Globe,
  HelpCircle,
  FileText,
  AlertTriangle,
  ArrowRight,
  Hash,
  Volume2,
  X,
} from "lucide-react";

interface KnowledgeItem {
  id: string;
  title: string;
  type: "TEXT" | "FAQ" | "DOC" | "URL";
  scope: "GLOBAL" | "CHANNEL" | "ROLE";
  tokenCount: number;
  status: "READY" | "INDEXING";
  updatedAt: string;
}

interface ChannelRuleItem {
  channelId: string;
  channelName: string;
  categoryName: string;
  mode: "AUTOMATIC" | "MENTION_ONLY" | "COMMAND_ONLY" | "DISABLED";
  threadMode: boolean;
  historyLimit: number;
}

interface LiveConvItem {
  id: string;
  channelName: string;
  userName: string;
  messageCount: number;
  lastActive: string;
  duration: string;
}

export default function AiCenterClient() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "personality" | "knowledge" | "channels" | "tools" | "memory" | "analytics"
  >("overview");

  // Personality State
  const [assistantName, setAssistantName] = useState("ETHONE Assistant");
  const [assistantDesc, setAssistantDesc] = useState("Assistant intelligent officiel de la communauté.");
  const [assistantTone, setAssistantTone] = useState("FRIENDLY");
  const [friendlySlider, setFriendlySlider] = useState(85);
  const [humorSlider, setHumorSlider] = useState(35);
  const [formalitySlider, setFormalitySlider] = useState(60);
  const [verbositySlider, setVerbositySlider] = useState(40);
  const [creativitySlider, setCreativitySlider] = useState(60);
  const [systemPrompt, setSystemPrompt] = useState(
    "Tu es l'assistant IA officiel du serveur Discord ETHONE Gaming & Tech. Tu réponds avec bienveillance, politesse et concision. Tu aides les membres sur les questions relatives au serveur, aux règles et aux tickets."
  );
  const [replyInUserLang, setReplyInUserLang] = useState(true);

  // Playground State
  const [playQuery, setPlayQuery] = useState("");
  const [playAnswer, setPlayAnswer] = useState<string | null>(null);
  const [playSources, setPlaySources] = useState<string[]>([]);
  const [playContext, setPlayContext] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  // Versioning & Publish
  const [publishedVersion, setPublishedVersion] = useState(1);
  const [isPublished, setIsPublished] = useState(true);
  const [showPublishToast, setShowPublishToast] = useState(false);

  // Knowledge State
  const [showAddKnowledgeModal, setShowAddKnowledgeModal] = useState(false);
  const [newKnTitle, setNewKnTitle] = useState("");
  const [newKnType, setNewKnType] = useState<"TEXT" | "FAQ" | "DOC">("TEXT");
  const [newKnContent, setNewKnContent] = useState("");
  const [hallucinationMode, setHallucinationMode] = useState<"STRICT" | "BALANCED" | "CREATIVE">("BALANCED");
  const [showSourcesMode, setShowSourcesMode] = useState<"ALWAYS" | "WHEN_USED" | "NEVER">("WHEN_USED");

  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([
    {
      id: "kn-rules",
      title: "Règlement Officiel ETHONE",
      type: "TEXT",
      scope: "GLOBAL",
      tokenCount: 150,
      status: "READY",
      updatedAt: "Il y a 2h",
    },
    {
      id: "kn-vip",
      title: "Guide des Rôles & Avantages VIP",
      type: "DOC",
      scope: "GLOBAL",
      tokenCount: 120,
      status: "READY",
      updatedAt: "Hier",
    },
    {
      id: "kn-faq",
      title: "FAQ Support & Tickets",
      type: "FAQ",
      scope: "GLOBAL",
      tokenCount: 140,
      status: "READY",
      updatedAt: "Il y a 3 jours",
    },
  ]);

  // Channels State
  const [defaultChannelMode, setDefaultChannelMode] = useState<"AUTOMATIC" | "MENTION_ONLY" | "COMMAND_ONLY">("MENTION_ONLY");
  const [channelRules, setChannelRules] = useState<ChannelRuleItem[]>([
    {
      channelId: "c-ai",
      channelName: "ai-chat",
      categoryName: "💬 COMMUNAUTÉ",
      mode: "AUTOMATIC",
      threadMode: true,
      historyLimit: 20,
    },
    {
      channelId: "c-sup",
      channelName: "support",
      categoryName: "📢 INFORMATION",
      mode: "MENTION_ONLY",
      threadMode: false,
      historyLimit: 15,
    },
    {
      channelId: "c-gen",
      channelName: "general-chat",
      categoryName: "💬 COMMUNAUTÉ",
      mode: "DISABLED",
      threadMode: false,
      historyLimit: 0,
    },
  ]);

  // Tools State
  const [tools, setTools] = useState({
    readKnowledge: true,
    readAllowedChannels: true,
    createThreads: true,
    sendMessages: true,
    ticketHandoff: true,
    summarizeChannels: true,
    moderationAssist: false,
  });

  // Memory State
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [contextLength, setContextLength] = useState(20);
  const [retentionHours, setRetentionHours] = useState(24);
  const [userCanForget, setUserCanForget] = useState(true);
  const [userToForgetId, setUserToForgetId] = useState("");
  const [forgetToast, setForgetToast] = useState(false);

  const liveConversations: LiveConvItem[] = [
    {
      id: "conv-1",
      channelName: "#ai-chat",
      userName: "AlexDev#0001",
      messageCount: 8,
      lastActive: "Il y a 2m",
      duration: "14 min",
    },
    {
      id: "conv-2",
      channelName: "#support",
      userName: "ShadowGamer#1337",
      messageCount: 4,
      lastActive: "Il y a 6m",
      duration: "5 min",
    },
    {
      id: "conv-3",
      channelName: "Thread: Support Verification",
      userName: "Lucas92#4412",
      messageCount: 12,
      lastActive: "Il y a 18m",
      duration: "32 min",
    },
  ];

  const handlePlaygroundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playQuery.trim()) return;

    setIsPlaying(true);
    setPlayAnswer(null);

    setTimeout(() => {
      setIsPlaying(false);
      const q = playQuery.toLowerCase();
      if (q.includes("vip") || q.includes("grade")) {
        setPlayAnswer(
          "Pour obtenir le statut **VIP Elite** sur notre serveur, vous pouvez inviter au moins 5 membres vérifiés ou soutenir le serveur avec un Nitro Boost !\n\nLes avantages incluent :\n- Accès aux salons vocaux haute fidélité (128 kbps)\n- Salons textuels et vocaux réservés aux VIP\n- Rôle doré mis en valeur dans la liste des membres\n\nTapez `/rank` pour consulter également votre niveau d'activité sur le serveur."
        );
        setPlaySources(["Guide des Rôles & Avantages VIP"]);
        setPlayContext("Guide des Rôles: VIP Elite accessible avec 5 invitations ou Nitro Boost.");
      } else if (q.includes("règle") || q.includes("regle") || q.includes("interdit")) {
        setPlayAnswer(
          "Voici les points essentiels de notre règlement :\n\n1. **Respect absolu** : Aucun harcèlement, provocation ou insulte n'est toléré.\n2. **Anti-Spam** : Pas de flood de messages ni de mentions inutiles.\n3. **Publicité** : Strictement interdite sans autorisation expresse du staff.\n4. **Vocaux** : Respectez le calme et la convivialité."
        );
        setPlaySources(["Règlement Officiel ETHONE"]);
        setPlayContext("Règlement: Respect, anti-spam, publicité interdite, vocaux calmes.");
      } else if (q.includes("ticket") || q.includes("support")) {
        setPlayAnswer(
          "Pour toute demande d'assistance personnalisée ou pour signaler un problème, rendez-vous dans le salon **#support** et cliquez sur le bouton **'🎫 Ouvrir un Ticket'** !"
        );
        setPlaySources(["FAQ Support & Tickets"]);
        setPlayContext("FAQ Support: Ouvrir un ticket dans #support.");
      } else {
        setPlayAnswer(
          `Bonjour ! Je suis **${assistantName}**. Comment puis-je vous renseigner aujourd'hui ? Je peux vous expliquer les règles, vous détailler les rôles ou vous aider avec le support du serveur.`
        );
        setPlaySources([]);
        setPlayContext("Salutations générales / Assistance globale.");
      }
    }, 650);
  };

  const handlePublish = () => {
    setPublishedVersion((v) => v + 1);
    setIsPublished(true);
    setShowPublishToast(true);
    setTimeout(() => setShowPublishToast(false), 3000);
  };

  const handleAddKnowledge = () => {
    if (!newKnTitle || !newKnContent) return;
    const newItem: KnowledgeItem = {
      id: `kn-${Date.now().toString(36)}`,
      title: newKnTitle,
      type: newKnType,
      scope: "GLOBAL",
      tokenCount: Math.ceil(newKnContent.length / 4),
      status: "READY",
      updatedAt: "À l'instant",
    };
    setKnowledgeList((prev) => [newItem, ...prev]);
    setShowAddKnowledgeModal(false);
    setNewKnTitle("");
    setNewKnContent("");
    setIsPublished(false);
  };

  const handleDeleteKnowledge = (id: string) => {
    setKnowledgeList((prev) => prev.filter((k) => k.id !== id));
    setIsPublished(false);
  };

  const handleForgetUserData = () => {
    if (!userToForgetId.trim()) return;
    setForgetToast(true);
    setUserToForgetId("");
    setTimeout(() => setForgetToast(false), 3000);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  ETHONE AI Assistant 2.0
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    🟢 En Ligne
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Your server&apos;s intelligent assistant.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveTab("overview")}
              className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              Playground
            </button>

            <button
              onClick={handlePublish}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-all ${
                !isPublished
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 animate-pulse"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              }`}
            >
              <Check className="w-4 h-4 text-emerald-400" />
              Publier la version v{publishedVersion + (isPublished ? 0 : 1)}
            </button>
          </div>
        </div>

        {/* Publish Notification Toast */}
        {showPublishToast && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
            <span className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-400" />
              Configuration publiée avec succès sur le bot Discord en direct (v{publishedVersion}) !
            </span>
            <button onClick={() => setShowPublishToast(false)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 6 Key Metric KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Requêtes Aujourd&apos;hui</span>
            <p className="text-2xl font-bold text-white">142</p>
            <span className="text-[11px] text-emerald-400">+28% vs hier</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Conversations Actives</span>
            <p className="text-2xl font-bold text-indigo-400">12</p>
            <span className="text-[11px] text-neutral-400">Dans 3 salons</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Temps Réponse Moyen</span>
            <p className="text-2xl font-bold text-cyan-400">420 ms</p>
            <span className="text-[11px] text-neutral-400">Ultra fluide</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Taux de Satisfaction</span>
            <p className="text-2xl font-bold text-emerald-400">96% 👍</p>
            <span className="text-[11px] text-neutral-400">39 avis positifs</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Tokens Consommés</span>
            <p className="text-2xl font-bold text-purple-400">48.2k</p>
            <span className="text-[11px] text-neutral-400">Budget: 100k</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Connaissances RAG</span>
            <p className="text-2xl font-bold text-amber-400">{knowledgeList.length}</p>
            <span className="text-[11px] text-neutral-400">Indexées à 100%</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: "overview", label: "Vue d'ensemble & Playground", icon: Sparkles },
            { id: "personality", label: "Personnalité", icon: Sliders },
            { id: "knowledge", label: "Base de Connaissances (RAG)", icon: BookOpen },
            { id: "channels", label: "Salons & Règles", icon: FolderTree },
            { id: "tools", label: "Outils & Permissions", icon: Wrench },
            { id: "memory", label: "Mémoire & Confidentialité", icon: Brain },
            { id: "analytics", label: "Analytics & Qualité", icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? "bg-neutral-900 text-white border-b-2 border-indigo-500"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-neutral-500"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & PLAYGROUND */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Assistant Profile & Status */}
            <div className="space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg shrink-0">
                    🤖
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{assistantName}</h3>
                    <p className="text-xs text-neutral-400">{assistantDesc}</p>
                  </div>
                </div>

                <div className="divide-y divide-neutral-800/80 text-xs pt-2">
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Ton :</span>
                    <span className="font-semibold text-neutral-200">{assistantTone}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Mode par défaut :</span>
                    <span className="font-semibold text-indigo-400">{defaultChannelMode}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Modèle actif :</span>
                    <span className="font-semibold text-neutral-200 font-mono">deepseek-chat:free</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Version publiée :</span>
                    <span className="font-semibold text-emerald-400">v{publishedVersion}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab("personality")}
                    className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors"
                  >
                    Modifier la Personnalité
                  </button>
                </div>
              </div>

              {/* Live Conversations Feed */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center justify-between">
                  <span>Conversations Récentes</span>
                  <span className="text-[10px] text-neutral-500">Temps réel</span>
                </h3>

                <div className="space-y-2.5">
                  {liveConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/70 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-indigo-300">{conv.channelName}</span>
                        <span className="text-[10px] text-neutral-500">{conv.lastActive}</span>
                      </div>
                      <div className="flex items-center justify-between text-neutral-400">
                        <span>{conv.userName}</span>
                        <span className="text-[11px] font-mono">{conv.messageCount} msgs ({conv.duration})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Live Interactive Playground */}
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    AI Assistant Playground
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Testez les réponses de votre assistant avec vos connaissances RAG et votre prompt avant publication.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Mode Simulation Directe
                </span>
              </div>

              {/* Playground Form */}
              <form onSubmit={handlePlaygroundSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={playQuery}
                    onChange={(e) => setPlayQuery(e.target.value)}
                    placeholder="Ex: Comment obtenir le rôle VIP ? Quelles sont les règles ?"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-4 pr-24 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isPlaying || !playQuery.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Send className="w-3 h-3" />
                    Tester
                  </button>
                </div>

                {/* Quick suggestions pills */}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="text-neutral-500 py-1">Suggestions :</span>
                  {[
                    "Comment devenir VIP ?",
                    "Est-ce que le spam est interdit ?",
                    "Comment ouvrir un ticket ?",
                    "Bonjour !",
                  ].map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setPlayQuery(sugg)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 transition-colors"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </form>

              {/* Playground Response Area */}
              {isPlaying && (
                <div className="p-6 bg-neutral-950 rounded-xl border border-neutral-800 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-neutral-400">{assistantName} réfléchit...</p>
                </div>
              )}

              {playAnswer && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Assistant Embed Response */}
                  <div className="p-5 bg-neutral-950 border border-indigo-500/30 rounded-xl space-y-3 relative overflow-hidden">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">🤖</span>
                      <span className="font-bold text-sm text-white">{assistantName}</span>
                      <span className="text-[10px] text-neutral-500">Aujourd&apos;hui à 14:35</span>
                    </div>

                    <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-line">
                      {playAnswer}
                    </p>

                    {playSources.length > 0 && (
                      <div className="pt-2 border-t border-neutral-800 text-xs">
                        <span className="text-neutral-400 font-semibold block mb-1">
                          📚 Sources identifiées :
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {playSources.map((src) => (
                            <span
                              key={src}
                              className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px]"
                            >
                              • {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Context Debugger Inspector */}
                  <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800 text-xs space-y-2">
                    <span className="font-bold text-neutral-400 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-neutral-500" />
                      Contexte RAG extrait pour le LLM :
                    </span>
                    <p className="font-mono text-[11px] text-neutral-400 bg-neutral-900 p-2.5 rounded-lg">
                      {playContext || "Aucune source externe nécessaire pour cette question."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PERSONALITY BUILDER */}
        {activeTab === "personality" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Personality Builder</h3>
                <p className="text-xs text-neutral-400">
                  Ajustez précisément le ton, le caractère et les instructions de votre assistant.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Nom de l&apos;Assistant</label>
                  <input
                    type="text"
                    value={assistantName}
                    onChange={(e) => {
                      setAssistantName(e.target.value);
                      setIsPublished(false);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Ton Général</label>
                  <select
                    value={assistantTone}
                    onChange={(e) => {
                      setAssistantTone(e.target.value);
                      setIsPublished(false);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="FRIENDLY">Convivial &amp; Chaleureux (Friendly)</option>
                    <option value="PROFESSIONAL">Professionnel &amp; Posé</option>
                    <option value="CASUAL">Décontracté &amp; Gamer</option>
                    <option value="FUNNY">Humoristique &amp; Décalé</option>
                    <option value="CONCISE">Concis &amp; Rapide</option>
                    <option value="TECHNICAL">Technique &amp; Détaillé</option>
                  </select>
                </div>
              </div>

              {/* 5 Personality Sliders */}
              <div className="space-y-4 pt-2 border-t border-neutral-800">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Curseurs de Personnalité :
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Friendly */}
                  <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800/80">
                    <div className="flex justify-between font-semibold">
                      <span className="text-neutral-300">Convivialité (Friendly)</span>
                      <span className="text-indigo-400">{friendlySlider}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={friendlySlider}
                      onChange={(e) => {
                        setFriendlySlider(Number(e.target.value));
                        setIsPublished(false);
                      }}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Humor */}
                  <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800/80">
                    <div className="flex justify-between font-semibold">
                      <span className="text-neutral-300">Humour</span>
                      <span className="text-amber-400">{humorSlider}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={humorSlider}
                      onChange={(e) => {
                        setHumorSlider(Number(e.target.value));
                        setIsPublished(false);
                      }}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Formality */}
                  <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800/80">
                    <div className="flex justify-between font-semibold">
                      <span className="text-neutral-300">Formalité</span>
                      <span className="text-cyan-400">{formalitySlider}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formalitySlider}
                      onChange={(e) => {
                        setFormalitySlider(Number(e.target.value));
                        setIsPublished(false);
                      }}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  {/* Verbosity */}
                  <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800/80">
                    <div className="flex justify-between font-semibold">
                      <span className="text-neutral-300">Longueur / Verbosité</span>
                      <span className="text-purple-400">{verbositySlider}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={verbositySlider}
                      onChange={(e) => {
                        setVerbositySlider(Number(e.target.value));
                        setIsPublished(false);
                      }}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* System Instructions Editor */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Instructions Système Personnalisées
                  </label>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    🛡️ Prompt Injection Shield Actif
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => {
                    setSystemPrompt(e.target.value);
                    setIsPublished(false);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs font-mono text-neutral-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Language Settings */}
              <div className="flex items-center justify-between p-3.5 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-white flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    Répondre dans la langue de l&apos;utilisateur
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Détecte automatiquement si le membre parle en Français, Anglais, Espagnol...
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={replyInUserLang}
                  onChange={(e) => {
                    setReplyInUserLang(e.target.checked);
                    setIsPublished(false);
                  }}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-neutral-900 border-neutral-700"
                />
              </div>
            </div>

            {/* Right: Live Preview Box */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Aperçu de Présentation
              </h4>
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🤖</span>
                  <div>
                    <span className="font-bold text-white">{assistantName}</span>
                    <span className="text-[10px] text-neutral-500 block">Bot Officiel</span>
                  </div>
                </div>
                <p className="text-neutral-300 italic">
                  &quot;Bonjour ! Je suis {assistantName}, configuré en mode {assistantTone.toLowerCase()} ({friendlySlider}% convivial). Je suis prêt à vous guider sur le serveur !&quot;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: KNOWLEDGE BASE (RAG) */}
        {activeTab === "knowledge" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Base de Connaissances (RAG)</h3>
                <p className="text-xs text-neutral-400">
                  Ajoutez les règles, FAQ et guides internes que l&apos;IA doit utiliser pour répondre précisément.
                </p>
              </div>
              <button
                onClick={() => setShowAddKnowledgeModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Ajouter une Source
              </button>
            </div>

            {/* Knowledge Sources Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/70 border-b border-neutral-800 text-neutral-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Source</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Portée (Scope)</th>
                    <th className="px-4 py-3.5">Tokens</th>
                    <th className="px-4 py-3.5">Statut</th>
                    <th className="px-4 py-3.5">Dernière MàJ</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {knowledgeList.map((kn) => (
                    <tr key={kn.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="px-5 py-4 font-semibold text-white">{kn.title}</td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300">
                          {kn.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-neutral-400">{kn.scope}</td>
                      <td className="px-4 py-4 font-mono text-neutral-400">{kn.tokenCount}</td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ✓ {kn.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-neutral-500">{kn.updatedAt}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDeleteKnowledge(kn.id)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Anti-hallucination & Source display settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
                <label className="text-xs font-semibold text-white block">
                  Mode Anti-Hallucination
                </label>
                <select
                  value={hallucinationMode}
                  onChange={(e: any) => setHallucinationMode(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="STRICT">Strict (Refuse de répondre si l&apos;information est absente)</option>
                  <option value="BALANCED">Équilibré (Répond avec prudence et prévient)</option>
                  <option value="CREATIVE">Créatif (Réponse plus libre)</option>
                </select>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
                <label className="text-xs font-semibold text-white block">
                  Affichage des Sources dans Discord
                </label>
                <select
                  value={showSourcesMode}
                  onChange={(e: any) => setShowSourcesMode(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="WHEN_USED">Afficher uniquement si des documents sont cités</option>
                  <option value="ALWAYS">Toujours afficher les sources</option>
                  <option value="NEVER">Ne jamais afficher les sources</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CHANNELS & OVERRIDES */}
        {activeTab === "channels" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">Salons &amp; Verrouillage (Channel Lock)</h3>
                  <p className="text-xs text-neutral-400">
                    Définissez où et comment l&apos;IA a le droit d&apos;interagir avec les membres.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Mode Global :</span>
                  <select
                    value={defaultChannelMode}
                    onChange={(e: any) => setDefaultChannelMode(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="MENTION_ONLY">Mention Uniquement (@Bot)</option>
                    <option value="AUTOMATIC">Automatique partout</option>
                    <option value="COMMAND_ONLY">Commandes uniquement (/ask)</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden">
                {channelRules.map((rule) => (
                  <div
                    key={rule.channelId}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Hash className="w-4 h-4 text-indigo-400" />
                      <div>
                        <span className="font-semibold text-white text-sm">#{rule.channelName}</span>
                        <span className="text-xs text-neutral-500 block">{rule.categoryName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <select
                        value={rule.mode}
                        onChange={(e: any) => {
                          setChannelRules((prev) =>
                            prev.map((r) =>
                              r.channelId === rule.channelId ? { ...r, mode: e.target.value } : r
                            )
                          );
                          setIsPublished(false);
                        }}
                        className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="AUTOMATIC">🟢 Réponse Automatique</option>
                        <option value="MENTION_ONLY">🟡 Sur Mention (@Bot)</option>
                        <option value="DISABLED">🔴 Désactivé</option>
                      </select>

                      <label className="flex items-center gap-1.5 text-xs text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.threadMode}
                          onChange={(e) => {
                            setChannelRules((prev) =>
                              prev.map((r) =>
                                r.channelId === rule.channelId
                                  ? { ...r, threadMode: e.target.checked }
                                  : r
                              )
                            );
                            setIsPublished(false);
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 bg-neutral-900 border-neutral-700"
                        />
                        <span>Thread dédié</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TOOLS & PERMISSIONS */}
        {activeTab === "tools" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Outils &amp; Actions Autorisées</h3>
              <p className="text-xs text-neutral-400">
                Principe du moindre privilège : activez uniquement les fonctionnalités utiles à votre serveur.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {[
                {
                  key: "readKnowledge",
                  title: "Consulter la Base de Connaissances",
                  desc: "Autorise l'IA à chercher dans vos documents pour répondre.",
                },
                {
                  key: "readAllowedChannels",
                  title: "Lire les salons autorisés",
                  desc: "Permet de contextualiser avec les derniers messages du salon.",
                },
                {
                  key: "createThreads",
                  title: "Créer des threads de conversation",
                  desc: "Isole les échanges dans un thread privé pour éviter d'encombrer le salon principal.",
                },
                {
                  key: "ticketHandoff",
                  title: "Handoff Support vers Tickets",
                  desc: "Permet au membre de générer un ticket de support en 1 clic avec le résumé de l'IA.",
                },
                {
                  key: "summarizeChannels",
                  title: "Commande /summarize",
                  desc: "Autorise les membres à résumer les derniers échanges d'un salon.",
                },
                {
                  key: "moderationAssist",
                  title: "Assistant Modération (Conseil)",
                  desc: "Rédige des pré-rapports d'incidents (les sanctions restent manuelles par le staff).",
                },
              ].map((tool) => (
                <div
                  key={tool.key}
                  className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/80 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <span className="font-semibold text-white block">{tool.title}</span>
                    <p className="text-neutral-400">{tool.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={(tools as any)[tool.key]}
                    onChange={(e) => {
                      setTools((prev) => ({ ...prev, [tool.key]: e.target.checked }));
                      setIsPublished(false);
                    }}
                    className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 bg-neutral-900 border-neutral-700"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: MEMORY & PRIVACY */}
        {activeTab === "memory" && (
          <div className="max-w-4xl space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Mémoire de Conversation</h3>
                  <p className="text-xs text-neutral-400">
                    Conserve le contexte récent des échanges pour des conversations fluides.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={memoryEnabled}
                  onChange={(e) => {
                    setMemoryEnabled(e.target.checked);
                    setIsPublished(false);
                  }}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-neutral-900 border-neutral-700"
                />
              </div>

              {memoryEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-neutral-800 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-neutral-300">Taille de l&apos;historique (Messages)</label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={contextLength}
                      onChange={(e) => setContextLength(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-neutral-300">Rétention maximale (Heures)</label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={retentionHours}
                      onChange={(e) => setRetentionHours(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Privacy & RGPD compliance */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Confidentialité &amp; Droit à l&apos;Oubli (RGPD)
              </h3>
              <p className="text-xs text-neutral-400">
                Permet d&apos;effacer instantanément toute mémoire ou historique associé à un identifiant Discord spécifique.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="ID Discord de l'utilisateur (ex: 999888777666)"
                  value={userToForgetId}
                  onChange={(e) => setUserToForgetId(e.target.value)}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleForgetUserData}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                >
                  Oublier cet Utilisateur
                </button>
              </div>

              {forgetToast && (
                <p className="text-xs text-emerald-400 animate-fadeIn">
                  ✓ Toutes les mémoires de cet utilisateur ont été purgées avec succès.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: ANALYTICS & QUALITY */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Questions les plus fréquentes</h3>
              <div className="space-y-2.5 text-xs">
                {[
                  { q: "Comment obtenir le grade VIP ?", count: 64, tag: "Rôles" },
                  { q: "Quelles sont les règles du vocal ?", count: 38, tag: "Règlement" },
                  { q: "Comment ouvrir un ticket de support ?", count: 29, tag: "Helpdesk" },
                  { q: "À quelle heure sont les tournois ?", count: 18, tag: "Événements" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between"
                  >
                    <span className="font-semibold text-neutral-200">{item.q}</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px]">
                        {item.tag}
                      </span>
                      <span className="font-mono font-bold text-white">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Satisfaction &amp; Retours Membres</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <ThumbsUp className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-emerald-400">39</p>
                  <span className="text-xs text-neutral-400">Retours Utiles (96%)</span>
                </div>
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <ThumbsDown className="w-6 h-6 text-rose-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-rose-400">3</p>
                  <span className="text-xs text-neutral-400">Retours Inutiles (4%)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Add Knowledge Source */}
        {showAddKnowledgeModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 relative">
              <button
                onClick={() => setShowAddKnowledgeModal(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ajouter une Source de Connaissances</h3>
                  <p className="text-xs text-neutral-400">Cette information sera indexée pour le moteur RAG.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">Titre de la Source</label>
                  <input
                    type="text"
                    value={newKnTitle}
                    onChange={(e) => setNewKnTitle(e.target.value)}
                    placeholder="Ex: Procédure de recrutement Staff"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">Type de Source</label>
                  <select
                    value={newKnType}
                    onChange={(e: any) => setNewKnType(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="TEXT">Texte brut</option>
                    <option value="FAQ">Questions &amp; Réponses (FAQ)</option>
                    <option value="DOC">Documentation / Guide</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">Contenu</label>
                  <textarea
                    rows={5}
                    value={newKnContent}
                    onChange={(e) => setNewKnContent(e.target.value)}
                    placeholder="Collez ici les règles, questions/réponses ou procédures..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowAddKnowledgeModal(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAddKnowledge}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    Indexer la Source
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
