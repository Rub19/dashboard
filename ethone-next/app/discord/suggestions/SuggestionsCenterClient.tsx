"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  Sliders,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Crown,
  ChevronRight,
  ShieldCheck,
  Eye,
  Hash,
  RefreshCw,
  AlertTriangle,
  Zap,
  Kanban,
  Check,
  X,
} from "lucide-react";

type SuggestionStatus =
  | "PENDING"
  | "DISCUSSION"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED";

interface SuggestionItem {
  id: string;
  number: number;
  title: string;
  description: string;
  author: {
    username: string;
    avatar: string;
  };
  category: "GÉNÉRAL" | "BOT" | "ÉVÉNEMENTS" | "VOCAL" | "RÈGLEMENT";
  status: SuggestionStatus;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  staffComment?: string;
  staffAuthor?: string;
}

export default function SuggestionsCenterClient() {
  const [activeTab, setActiveTab] = useState<
    "kanban" | "response_studio" | "settings" | "hall_of_fame"
  >("kanban");

  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([
    {
      id: "sug-1",
      number: 142,
      title: "Ajouter un salon vocal permanent pour le gaming nocturne",
      description: "Créer un salon 'Noctambules' avec un bitrate de 128 kbps et pas de limite de participants pour les sessions tardives.",
      author: {
        username: "AlexDev#0001",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80",
      },
      category: "VOCAL",
      status: "APPROVED",
      upvotes: 68,
      downvotes: 4,
      createdAt: "Il y a 2 jours",
      staffComment: "Excellente idée ! Le salon a été approuvé et sera configuré ce week-end par l'équipe d'administration.",
      staffAuthor: "Staff ETHONE",
    },
    {
      id: "sug-2",
      number: 143,
      title: "Tournoi mensuel Rocket League 2v2 avec récompense Nitro",
      description: "Organiser chaque premier samedi du mois un mini-tournoi avec tableau éliminatoire et cast en direct sur Discord.",
      author: {
        username: "Kylian_Gamer#9912",
        avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=60&auto=format&fit=crop&q=80",
      },
      category: "ÉVÉNEMENTS",
      status: "IN_PROGRESS",
      upvotes: 94,
      downvotes: 6,
      createdAt: "Il y a 3 jours",
      staffComment: "En cours d'organisation avec les animateurs pour la première édition le mois prochain.",
      staffAuthor: "Event Manager",
    },
    {
      id: "sug-3",
      number: 144,
      title: "Système de stickers personnalisés créés par la communauté",
      description: "Permettre aux membres d'envoyer leurs créations de stickers via un formulaire et voter chaque mois pour les 5 meilleurs.",
      author: {
        username: "Elena_Design#0077",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&auto=format&fit=crop&q=80",
      },
      category: "GÉNÉRAL",
      status: "COMPLETED",
      upvotes: 112,
      downvotes: 3,
      createdAt: "Il y a 1 semaine",
      staffComment: "Implémenté ! 5 nouveaux stickers créés par Elena ont été ajoutés sur le Discord.",
      staffAuthor: "Owner ETHONE",
    },
    {
      id: "sug-4",
      number: 145,
      title: "Intégrer une commande /spotify pour afficher ce qu'on écoute",
      description: "Permettre d'afficher la musique actuelle sous forme d'embed élégant avec la pochette d'album.",
      author: {
        username: "Sarah_T#2048",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80",
      },
      category: "BOT",
      status: "PENDING",
      upvotes: 35,
      downvotes: 8,
      createdAt: "Il y a 5 heures",
    },
    {
      id: "sug-5",
      number: 146,
      title: "Supprimer la restriction de lenteur (slowmode) dans #gaming",
      description: "Le slowmode de 10s casse le rythme des discussions lors des parties en direct.",
      author: {
        username: "Lucas92#4412",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&auto=format&fit=crop&q=80",
      },
      category: "RÈGLEMENT",
      status: "DISCUSSION",
      upvotes: 22,
      downvotes: 19,
      createdAt: "Hier",
      staffComment: "Débat en cours avec les modérateurs pour trouver un compromis (slowmode réduit à 3s).",
      staffAuthor: "Mod Lead",
    },
    {
      id: "sug-6",
      number: 147,
      title: "Autoriser les liens TikTok et Instagram dans le salon général",
      description: "Pouvoir partager des vidéos drôles directement sans passer par un salon média.",
      author: {
        username: "TrollMaster#9999",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80",
      },
      category: "RÈGLEMENT",
      status: "REJECTED",
      upvotes: 5,
      downvotes: 88,
      createdAt: "Il y a 4 jours",
      staffComment: "Refusé pour éviter le spam de contenu et préserver la clarté des discussions du salon général. Utilisez #médias.",
      staffAuthor: "Staff ETHONE",
    },
  ]);

  // Filters
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Response Studio Modal
  const [selectedSug, setSelectedSug] = useState<SuggestionItem | null>(null);
  const [staffReplyText, setStaffReplyText] = useState("");
  const [newStatus, setNewStatus] = useState<SuggestionStatus>("APPROVED");
  const [rewardAuthorXp, setRewardAuthorXp] = useState(true);

  // Settings State
  const [suggestionChannel, setSuggestionChannel] = useState("boîte-à-idées");
  const [cooldownMinutes, setCooldownMinutes] = useState(60);
  const [minChars, setMinChars] = useState(25);
  const [autoThread, setAutoThread] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      const matchSearch =
        s.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        s.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        s.author.username.toLowerCase().includes(searchFilter.toLowerCase());
      const matchCat = categoryFilter === "ALL" || s.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [suggestions, searchFilter, categoryFilter]);

  const handleOpenStaffReply = (sug: SuggestionItem) => {
    setSelectedSug(sug);
    setNewStatus(sug.status);
    setStaffReplyText(sug.staffComment || "");
  };

  const handleSaveStaffReply = () => {
    if (!selectedSug) return;
    setSuggestions((prev) =>
      prev.map((s) => {
        if (s.id === selectedSug.id) {
          return {
            ...s,
            status: newStatus,
            staffComment: staffReplyText.trim() || undefined,
            staffAuthor: "Staff ETHONE",
          };
        }
        return s;
      })
    );
    showToast(
      `Suggestion #${selectedSug.number} mise à jour en statut "${newStatus}" avec succès !`
    );
    setSelectedSug(null);
  };

  const getStatusBadge = (status: SuggestionStatus) => {
    switch (status) {
      case "PENDING":
        return { label: "En Attente", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
      case "DISCUSSION":
        return { label: "En Discussion", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
      case "APPROVED":
        return { label: "Approuvée", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case "IN_PROGRESS":
        return { label: "En Développement", bg: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
      case "COMPLETED":
        return { label: "Réalisée", bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" };
      case "REJECTED":
        return { label: "Rejetée", bg: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 rounded-xl border border-amber-500/30 shadow-lg shadow-amber-500/10">
                <Lightbulb className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  ETHONE Boîte à Suggestions 2.0
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    💡 Boîte Ouverte v2.4
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Idées communautaires, votes interactifs, Kanban de traitement staff et réponses officielles.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveTab("settings")}
              className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              Paramètres Salon & Embed
            </button>
            <button
              onClick={() => showToast("Synchronisation des votes Discord effectuée !")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser les Votes
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {toastMsg}
            </span>
            <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 6 Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Suggestions Totales</span>
            <p className="text-2xl font-bold text-white">156</p>
            <span className="text-[11px] text-emerald-400">+22 ce mois</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">En Attente Staff</span>
            <p className="text-2xl font-bold text-amber-400">18</p>
            <span className="text-[11px] text-amber-400">À examiner</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Approuvées / En Cours</span>
            <p className="text-2xl font-bold text-emerald-400">42</p>
            <span className="text-[11px] text-neutral-400">Validées par le staff</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Réalisées & Livrées</span>
            <p className="text-2xl font-bold text-cyan-400">64</p>
            <span className="text-[11px] text-cyan-400">En ligne sur Discord</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Total Votes</span>
            <p className="text-2xl font-bold text-purple-400">3,890</p>
            <span className="text-[11px] text-neutral-400">👍 / 👎 cumulés</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Taux d'Adoption</span>
            <p className="text-2xl font-bold text-rose-400">68%</p>
            <span className="text-[11px] text-emerald-400">Idées retenues</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: "kanban", label: "Tableau Kanban & Suggestions", icon: Kanban },
            { id: "response_studio", label: "Modération & Réponse Staff", icon: MessageSquare },
            { id: "hall_of_fame", label: "Top Idées & Hall of Fame", icon: Sparkles },
            { id: "settings", label: "Paramètres Salon & Anti-Spam", icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 text-white border-b-2 border-amber-500"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-neutral-500"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Kanban & Suggestions */}
        {activeTab === "kanban" && (
          <div className="space-y-4">
            {/* Filters */}
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

                <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
                  {["ALL", "GÉNÉRAL", "BOT", "ÉVÉNEMENTS", "VOCAL"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        categoryFilter === cat
                          ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      {cat === "ALL" ? "Tous" : cat}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-xs text-neutral-500">
                {filteredSuggestions.length} suggestions répertoriées
              </span>
            </div>

            {/* Suggestions Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuggestions.map((sug) => {
                const statusBadge = getStatusBadge(sug.status);
                const totalVotes = sug.upvotes + sug.downvotes;
                const approvalRate =
                  totalVotes > 0 ? Math.round((sug.upvotes / totalVotes) * 100) : 50;

                return (
                  <div
                    key={sug.id}
                    className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/30 rounded-2xl p-5 space-y-4 transition-all shadow-lg flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">
                            #{sug.number}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {sug.category}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.bg}`}
                        >
                          {statusBadge.label}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white leading-snug">
                          {sug.title}
                        </h3>
                        <p className="text-xs text-neutral-400 line-clamp-3 mt-1.5 leading-relaxed">
                          {sug.description}
                        </p>
                      </div>

                      {/* Staff official reply if present */}
                      {sug.staffComment && (
                        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Réponse officielle ({sug.staffAuthor}) :</span>
                          </div>
                          <p className="text-[11px] text-neutral-300 italic">
                            "{sug.staffComment}"
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-neutral-800 space-y-3">
                      {/* Upvotes & Author */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={sug.author.avatar}
                            alt={sug.author.username}
                            className="w-5 h-5 rounded-full border border-neutral-700 object-cover"
                          />
                          <span className="text-[11px] text-neutral-400 font-medium">
                            {sug.author.username}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold">
                          <span className="text-emerald-400 flex items-center gap-1">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {sug.upvotes}
                          </span>
                          <span className="text-rose-400 flex items-center gap-1">
                            <ThumbsDown className="w-3.5 h-3.5" />
                            {sug.downvotes}
                          </span>
                          <span className="text-neutral-500 font-mono text-[10px]">
                            ({approvalRate}%)
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenStaffReply(sug)}
                        className="w-full h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                        Gérer & Répondre (Staff)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Response Studio */}
        {activeTab === "response_studio" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 max-w-2xl">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                Studio de Traitement des Suggestions
              </h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Sélectionnez une suggestion depuis le tableau pour publier une décision officielle et mettre à jour le salon Discord en temps réel.
            </p>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-neutral-300">Suggestions en attente d'une décision staff :</span>
              <div className="divide-y divide-neutral-800 bg-neutral-950 rounded-xl border border-neutral-800 max-h-80 overflow-y-auto">
                {suggestions
                  .filter((s) => s.status === "PENDING" || s.status === "DISCUSSION")
                  .map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleOpenStaffReply(s)}
                      className="p-3 hover:bg-neutral-900/60 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-white">#{s.number} - {s.title}</span>
                        <p className="text-neutral-400 text-[11px] truncate max-w-md">{s.description}</p>
                      </div>
                      <span className="text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-[10px]">
                        Examiner
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Hall of Fame */}
        {activeTab === "hall_of_fame" && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              Top Suggestions Historiques les Plus Plébiscitées
            </h2>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
              <div className="divide-y divide-neutral-800">
                {[...suggestions]
                  .sort((a, b) => b.upvotes - a.upvotes)
                  .map((s, idx) => (
                    <div
                      key={s.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 font-mono font-bold text-amber-400 text-sm">
                          #{idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white">{s.title}</h4>
                          <span className="text-[11px] text-neutral-400">
                            Par {s.author.username} &bull; Catégorie {s.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {s.upvotes} upvotes
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                            getStatusBadge(s.status).bg
                          }`}
                        >
                          {getStatusBadge(s.status).label}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Settings */}
        {activeTab === "settings" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 max-w-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Configuration du Salon & Anti-Spam
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Salon Discord dédié aux suggestions
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={suggestionChannel}
                    onChange={(e) => setSuggestionChannel(e.target.value)}
                    placeholder="boîte-à-idées"
                    className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Délai entre deux suggestions (Cooldown)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={cooldownMinutes}
                    onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                    className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white"
                  />
                  <span className="text-[10px] text-neutral-500">En minutes (ex: 60 = 1 heure)</span>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Longueur minimale du texte
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={minChars}
                    onChange={(e) => setMinChars(Number(e.target.value))}
                    className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white"
                  />
                  <span className="text-[10px] text-neutral-500">Caractères minimums requis</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div>
                  <span className="font-bold text-white block">Créer un fil de discussion (Thread) automatique</span>
                  <span className="text-neutral-500 text-[11px]">Permet aux membres de débattre sous chaque suggestion</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoThread(!autoThread)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    autoThread ? "bg-amber-500 text-white" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {autoThread ? "Activé" : "Désactivé"}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => showToast("Paramètres des suggestions sauvegardés !")}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Staff Reply Modal */}
        {selectedSug && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Décision Staff - Suggestion #{selectedSug.number}</span>
                </div>
                <button onClick={() => setSelectedSug(null)} className="text-neutral-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
                <h4 className="font-bold text-white">{selectedSug.title}</h4>
                <p className="text-neutral-400 text-[11px]">{selectedSug.description}</p>
                <p className="text-[10px] text-neutral-500 pt-1">
                  Proposé par {selectedSug.author.username} &bull; {selectedSug.upvotes} 👍 / {selectedSug.downvotes} 👎
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Nouveau statut de la suggestion
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: "PENDING", label: "En Attente" },
                      { id: "DISCUSSION", label: "En Discussion" },
                      { id: "APPROVED", label: "Approuvée" },
                      { id: "IN_PROGRESS", label: "En Développement" },
                      { id: "COMPLETED", label: "Réalisée" },
                      { id: "REJECTED", label: "Rejetée" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setNewStatus(st.id as SuggestionStatus)}
                        className={`p-2 rounded-xl border text-center font-semibold text-xs transition-all cursor-pointer ${
                          newStatus === st.id
                            ? "bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/20"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Commentaire / Explication officielle du Staff
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Expliquez la décision pour la communauté (sera affiché dans l'embed Discord)..."
                    value={staffReplyText}
                    onChange={(e) => setStaffReplyText(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-neutral-300">Attribuer +50 XP bonus à l'auteur de l'idée</span>
                  <input
                    type="checkbox"
                    checked={rewardAuthorXp}
                    onChange={(e) => setRewardAuthorXp(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSug(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveStaffReply}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Publier la décision
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
