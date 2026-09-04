"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Gift,
  Sparkles,
  Trophy,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Send,
  Calendar,
  Hash,
  Crown,
  ChevronRight,
  Filter,
  Check,
  Sliders,
  Award,
  Zap,
  Dice5,
  Eye,
  Info,
  X,
} from "lucide-react";

interface Giveaway {
  id: string;
  prize: string;
  description: string;
  channel: string;
  winnerCount: number;
  hostedBy: string;
  hostAvatar?: string;
  endsAt: string;
  createdAt: string;
  status: "ACTIVE" | "ENDED" | "CANCELLED";
  entriesCount: number;
  requiredRole?: string;
  minAccountAgeDays?: number;
  bonusBoosterEntries?: number;
  winners?: {
    id: string;
    username: string;
    avatar: string;
    claimed: boolean;
  }[];
  seed?: string;
}

export default function GiveawaysCenterClient() {
  const [activeTab, setActiveTab] = useState<
    "active" | "create" | "history" | "fairness" | "settings"
  >("active");

  const [giveaways, setGiveaways] = useState<Giveaway[]>([
    {
      id: "gw-1",
      prize: "Discord Nitro (1 An) + Rôle VIP",
      description: "Concours spécial célébration des 5,000 membres ! Tentez de remporter 1 an de Nitro complet et tous les avantages VIP.",
      channel: "🎉-giveaways",
      winnerCount: 2,
      hostedBy: "Staff ETHONE",
      endsAt: "Dans 2 jours (18h)",
      createdAt: "Il y a 1 jour",
      status: "ACTIVE",
      entriesCount: 342,
      requiredRole: "Membre Vérifié",
      minAccountAgeDays: 7,
      bonusBoosterEntries: 3,
      seed: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
    {
      id: "gw-2",
      prize: "Carte Cadeau Steam 50€",
      description: "Pour participer, ayez au moins le rôle Actif ou soyez Nitro Booster du serveur.",
      channel: "🎉-giveaways",
      winnerCount: 1,
      hostedBy: "AlexDev#0001",
      endsAt: "Dans 6 heures",
      createdAt: "Il y a 3 jours",
      status: "ACTIVE",
      entriesCount: 189,
      requiredRole: "Niveau 10+",
      minAccountAgeDays: 14,
      bonusBoosterEntries: 2,
      seed: "a4f5c2298bc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852c991",
    },
    {
      id: "gw-3",
      prize: "Clé de Jeu AAA : Cyberpunk 2077 Ultimate",
      description: "Offert par la communauté pour les membres du club Tech & Gaming.",
      channel: "🎮-jeux-concours",
      winnerCount: 1,
      hostedBy: "ShadowGamer#1337",
      endsAt: "Dans 4 jours",
      createdAt: "Il y a 4 heures",
      status: "ACTIVE",
      entriesCount: 94,
      requiredRole: "Gamer Club",
      seed: "f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
    },
    {
      id: "gw-4",
      prize: "Discord Nitro (1 Mois)",
      description: "Tirage flash du week-end !",
      channel: "🎉-giveaways",
      winnerCount: 1,
      hostedBy: "Staff ETHONE",
      endsAt: "Terminé hier",
      createdAt: "Il y a 3 jours",
      status: "ENDED",
      entriesCount: 260,
      winners: [
        {
          id: "usr-4412",
          username: "Kylian_Gamer#9912",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80",
          claimed: true,
        },
      ],
      seed: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
    },
    {
      id: "gw-5",
      prize: "Casque Audio HyperX Cloud II",
      description: "Grand concours anniversaire du serveur ETHONE.",
      channel: "🎉-giveaways",
      winnerCount: 1,
      hostedBy: "Owner ETHONE",
      endsAt: "Terminé le 28/08",
      createdAt: "Il y a 7 jours",
      status: "ENDED",
      entriesCount: 618,
      winners: [
        {
          id: "usr-9901",
          username: "Sarah_T#2048",
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80",
          claimed: true,
        },
      ],
      seed: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
    },
  ]);

  // Create Form State
  const [formPrize, setFormPrize] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formChannel, setFormChannel] = useState("giveaways");
  const [formWinners, setFormWinners] = useState(1);
  const [formDurationValue, setFormDurationValue] = useState(24);
  const [formDurationUnit, setFormDurationUnit] = useState<"h" | "d">("h");
  const [formReqRole, setFormReqRole] = useState("Tous les membres");
  const [formMinAge, setFormMinAge] = useState(0);
  const [formBoosterBonus, setFormBoosterBonus] = useState(2);
  const [formPingRole, setFormPingRole] = useState("@everyone");

  // Reroll Modal State
  const [rerollModalOpen, setRerollModalOpen] = useState(false);
  const [selectedGiveawayForReroll, setSelectedGiveawayForReroll] = useState<Giveaway | null>(null);
  const [rerollNewWinner, setRerollNewWinner] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPrize.trim()) return;

    const newGw: Giveaway = {
      id: `gw-${Date.now().toString(36)}`,
      prize: formPrize,
      description: formDesc || "Cliquez sur 🎉 pour participer au tirage au sort !",
      channel: formChannel.startsWith("#") ? formChannel : `#${formChannel}`,
      winnerCount: formWinners,
      hostedBy: "Vous (Administrateur)",
      endsAt: `Dans ${formDurationValue} ${formDurationUnit === "h" ? "heures" : "jours"}`,
      createdAt: "À l'instant",
      status: "ACTIVE",
      entriesCount: 0,
      requiredRole: formReqRole !== "Tous les membres" ? formReqRole : undefined,
      minAccountAgeDays: formMinAge > 0 ? formMinAge : undefined,
      bonusBoosterEntries: formBoosterBonus > 0 ? formBoosterBonus : undefined,
      seed: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    };

    setGiveaways([newGw, ...giveaways]);
    setFormPrize("");
    setFormDesc("");
    setActiveTab("active");
    showToast(`Le concours "${newGw.prize}" a été publié avec succès sur Discord !`);
  };

  const handleEndNow = (gwId: string) => {
    setGiveaways((prev) =>
      prev.map((g) => {
        if (g.id === gwId) {
          return {
            ...g,
            status: "ENDED",
            endsAt: "Terminé à l'instant",
            winners: [
              {
                id: "usr-lucky",
                username: "LuckyWinner#7721",
                avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80",
                claimed: false,
              },
            ],
          };
        }
        return g;
      })
    );
    showToast("Le concours a été clôturé et le gagnant a été tiré au sort !");
  };

  const handleTriggerReroll = (gw: Giveaway) => {
    setSelectedGiveawayForReroll(gw);
    setRerollNewWinner(null);
    setRerollModalOpen(true);
  };

  const executeReroll = () => {
    const candidates = [
      "Nocturne#4412",
      "Vortex_Gamer#1109",
      "Luna_Tech#8892",
      "Kévin99#3312",
      "Zephyr#0042",
    ];
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    setRerollNewWinner(picked);

    if (selectedGiveawayForReroll) {
      setGiveaways((prev) =>
        prev.map((g) => {
          if (g.id === selectedGiveawayForReroll.id) {
            return {
              ...g,
              winners: [
                {
                  id: `usr-${Date.now()}`,
                  username: picked,
                  avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=60&auto=format&fit=crop&q=80",
                  claimed: false,
                },
              ],
            };
          }
          return g;
        })
      );
    }
  };

  const activeGiveaways = useMemo(() => giveaways.filter((g) => g.status === "ACTIVE"), [giveaways]);
  const endedGiveaways = useMemo(() => giveaways.filter((g) => g.status === "ENDED"), [giveaways]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-rose-500/20 to-amber-500/20 text-rose-400 rounded-xl border border-rose-500/30 shadow-lg shadow-rose-500/10">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  ETHONE Giveaways & Tirages 2.0
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    🟢 Moteur Actif v2.4
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Concours automatisés, tirages cryptographiques vérifiables, conditions d'accès et distribution équitable.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveTab("create")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Créer un Concours
            </button>
            <button
              onClick={() => {
                if (endedGiveaways.length > 0) {
                  handleTriggerReroll(endedGiveaways[0]);
                } else {
                  showToast("Aucun concours terminé disponible pour un reroll.");
                }
              }}
              className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-rose-400" />
              Reroll Rapide
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {toastMessage}
            </span>
            <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 6 Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Concours Actifs</span>
            <p className="text-2xl font-bold text-rose-400">{activeGiveaways.length}</p>
            <span className="text-[11px] text-emerald-400">En cours sur Discord</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Lots Distribués</span>
            <p className="text-2xl font-bold text-white">48</p>
            <span className="text-[11px] text-neutral-400">Depuis le lancement</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Total Participations</span>
            <p className="text-2xl font-bold text-amber-400">2,840</p>
            <span className="text-[11px] text-emerald-400">+14% ce mois-ci</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Membres Uniques</span>
            <p className="text-2xl font-bold text-indigo-400">912</p>
            <span className="text-[11px] text-neutral-400">Participants distincts</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Valeur Cumulée</span>
            <p className="text-2xl font-bold text-emerald-400">1,450 €</p>
            <span className="text-[11px] text-neutral-400">Lots offerts</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Tirage Impartial</span>
            <p className="text-2xl font-bold text-cyan-400">100%</p>
            <span className="text-[11px] text-cyan-400">SHA-256 CSPRNG</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: "active", label: `En Cours (${activeGiveaways.length})`, icon: Gift },
            { id: "create", label: "Créateur de Concours", icon: Plus },
            { id: "history", label: `Historique & Reroll (${endedGiveaways.length})`, icon: Trophy },
            { id: "fairness", label: "Algorithme & Anti-Triche", icon: ShieldCheck },
            { id: "settings", label: "Paramètres & Templates", icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 text-white border-b-2 border-rose-500"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-rose-400" : "text-neutral-500"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: En Cours */}
        {activeTab === "active" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-rose-400" />
                Concours actuellement ouverts aux votes ({activeGiveaways.length})
              </h2>
              <span className="text-xs text-neutral-500">Mise à jour en temps réel via Discord Gateway</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGiveaways.map((gw) => (
                <div
                  key={gw.id}
                  className="bg-neutral-900 border border-neutral-800 hover:border-rose-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {gw.endsAt}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-neutral-400 bg-neutral-800 border border-neutral-700">
                        #{gw.channel}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors">
                        {gw.prize}
                      </h3>
                      <p className="text-xs text-neutral-400 line-clamp-2 mt-1">
                        {gw.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-neutral-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Gagnants</span>
                        <span className="font-semibold text-white flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          {gw.winnerCount} place{gw.winnerCount > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Participations</span>
                        <span className="font-semibold text-rose-400 flex items-center gap-1 font-mono">
                          <Users className="w-3.5 h-3.5 text-rose-400" />
                          {gw.entriesCount} entrées
                        </span>
                      </div>
                    </div>

                    {gw.requiredRole && (
                      <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Requis : <strong className="text-indigo-300">{gw.requiredRole}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleEndNow(gw.id)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trophy className="w-3 h-3 text-amber-400" />
                      Tirer maintenant
                    </button>
                    <button
                      onClick={() => {
                        setGiveaways((prev) => prev.filter((g) => g.id !== gw.id));
                        showToast(`Concours "${gw.prize}" annulé.`);
                      }}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Annuler le concours"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Créateur de Concours */}
        {activeTab === "create" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <form onSubmit={handleCreate} className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Nouveau Concours Discord</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Lot / Récompense à gagner *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Discord Nitro 1 Mois, Clé de Jeu Steam, Rôle VIP..."
                    value={formPrize}
                    onChange={(e) => setFormPrize(e.target.value)}
                    className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Description & Règles du tirage
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ajoutez des détails pour les participants, conditions, liens..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Salon Discord de publication
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        value={formChannel}
                        onChange={(e) => setFormChannel(e.target.value)}
                        placeholder="giveaways"
                        className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Nombre de gagnants
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 5].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setFormWinners(cnt)}
                          className={`flex-1 h-10 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            formWinners === cnt
                              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                              : "bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Durée du concours
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={formDurationValue}
                        onChange={(e) => setFormDurationValue(Number(e.target.value))}
                        className="w-24 h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white text-center focus:outline-none focus:border-rose-500"
                      />
                      <button
                        type="button"
                        onClick={() => setFormDurationUnit("h")}
                        className={`flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer ${
                          formDurationUnit === "h"
                            ? "bg-neutral-800 text-white border border-neutral-700"
                            : "bg-neutral-950 text-neutral-500 border border-neutral-800"
                        }`}
                      >
                        Heures
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormDurationUnit("d")}
                        className={`flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer ${
                          formDurationUnit === "d"
                            ? "bg-neutral-800 text-white border border-neutral-700"
                            : "bg-neutral-950 text-neutral-500 border border-neutral-800"
                        }`}
                      >
                        Jours
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Mention de notification
                    </label>
                    <div className="flex gap-2">
                      {["@everyone", "@here", "Aucun"].map((ping) => (
                        <button
                          key={ping}
                          type="button"
                          onClick={() => setFormPingRole(ping)}
                          className={`flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer ${
                            formPingRole === ping
                              ? "bg-rose-500 text-white"
                              : "bg-neutral-950 border border-neutral-800 text-neutral-400"
                          }`}
                        >
                          {ping}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    Conditions & Éligibilité des participants
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Rôle Discord obligatoire</label>
                      <input
                        type="text"
                        value={formReqRole}
                        onChange={(e) => setFormReqRole(e.target.value)}
                        placeholder="ex: Membre Vérifié, VIP"
                        className="w-full h-9 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Bonus Nitro Boosters (+ entrées)</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={formBoosterBonus}
                        onChange={(e) => setFormBoosterBonus(Number(e.target.value))}
                        className="w-full h-9 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Publier le concours sur Discord
                </button>
              </div>
            </form>

            {/* Live Discord Embed Preview */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  Aperçu en direct (Rendu Discord)
                </span>
                <span className="text-[11px] text-neutral-500 font-mono">#{formChannel || "giveaways"}</span>
              </div>

              <div className="bg-[#2B2D31] rounded-2xl p-4 space-y-3 border border-neutral-800/80 shadow-2xl font-sans">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-xs">
                    ET
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">ETHONE Bot</span>
                      <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1 rounded">BOT</span>
                    </div>
                    <span className="text-[10px] text-neutral-400">Aujourd'hui à 15:40</span>
                  </div>
                </div>

                {formPingRole !== "Aucun" && (
                  <p className="text-xs text-[#5865F2] font-semibold">{formPingRole}</p>
                )}

                {/* Discord Embed */}
                <div className="border-l-4 border-rose-500 bg-[#1E1F22] rounded-r-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                    <Gift className="w-4 h-4" />
                    <span>CONCOURS OFFICIEL</span>
                  </div>

                  <h4 className="text-sm font-bold text-white">
                    {formPrize || "Titre du lot à gagner"}
                  </h4>

                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {formDesc || "Cliquez sur le bouton ci-dessous pour participer au tirage au sort !"}
                  </p>

                  <div className="pt-2 border-t border-neutral-800 text-[11px] space-y-1 text-neutral-300">
                    <p>🏆 <strong>Gagnants :</strong> {formWinners}</p>
                    <p>⏳ <strong>Fin :</strong> Dans {formDurationValue} {formDurationUnit === "h" ? "heures" : "jours"}</p>
                    {formReqRole !== "Tous les membres" && (
                      <p>🔒 <strong>Rôle requis :</strong> @{formReqRole}</p>
                    )}
                    {formBoosterBonus > 0 && (
                      <p>💎 <strong>Boosters :</strong> +{formBoosterBonus} chances supplémentaires</p>
                    )}
                  </div>
                </div>

                {/* Discord Button */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 py-2 rounded bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                  >
                    <span>🎉 Participer (0)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Historique & Reroll */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Concours clôturés et historique des gagnants ({endedGiveaways.length})
              </h2>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
              <div className="divide-y divide-neutral-800">
                {endedGiveaways.map((gw) => (
                  <div key={gw.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
                          {gw.endsAt}
                        </span>
                        <h3 className="text-sm font-bold text-white">{gw.prize}</h3>
                      </div>
                      <p className="text-xs text-neutral-400">
                        {gw.entriesCount} participants &bull; #{gw.channel} &bull; Organisé par {gw.hostedBy}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      {gw.winners && gw.winners.length > 0 && (
                        <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
                          <Crown className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-semibold text-amber-300">
                            {gw.winners.map((w) => w.username).join(", ")}
                          </span>
                        </div>
                      )}

                      <button
                        onClick={() => handleTriggerReroll(gw)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reroll Gagnant
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Fairness & Anti-Cheat */}
        {activeTab === "fairness" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Preuve Cryptographique d'Impartialité (Fair Play)</h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                ETHONE utilise un générateur pseudo-aléatoire à sécurité cryptographique (CSPRNG). Chaque concours génère une graine (Seed) publique calculée par hachage SHA-256 avant le tirage, empêchant toute manipulation par les modérateurs ou le staff.
              </p>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <span className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider block">Dernière Graine de Tirage</span>
                <p className="font-mono text-xs text-emerald-400 break-all">
                  e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                </p>
              </div>

              <div className="pt-2 text-xs text-neutral-300 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Horodatage immuable sur la blockchain ou logs signés</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Validation publique accessible à tous les participants</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Protection Anti-Double Compte & Anti-Bot</h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Le filtre anti-triche disqualifie automatiquement les comptes douteux avant le tirage au sort :
              </p>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">Ancienneté Minimale Discord</span>
                    <span className="text-neutral-500 text-[11px]">Rejette les comptes créés depuis moins de 7 jours</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">Actif</span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">Vérification Téléphone / Email</span>
                    <span className="text-neutral-500 text-[11px]">Exige le badge vérifié Discord</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">Actif</span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">Détection de VPN & Proxy Suspects</span>
                    <span className="text-neutral-500 text-[11px]">Croisement avec la base anti-raid ETHONE</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">Actif</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Settings */}
        {activeTab === "settings" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 max-w-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-rose-400" />
              Réglages Généraux des Concours
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Message privé automatique au gagnant (DM)</label>
                <textarea
                  rows={3}
                  defaultValue="Félicitations {user} ! Vous avez remporté le concours '{prize}' sur le serveur ETHONE ! Veuillez contacter un administrateur sous 48h pour réclamer votre lot."
                  className="w-full rounded-xl bg-neutral-950 border border-neutral-800 p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Délai limite de réclamation du lot (Claim timeout)</label>
                <input
                  type="text"
                  defaultValue="48 heures"
                  className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => showToast("Paramètres des concours enregistrés !")}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Enregistrer les paramètres
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reroll Confirmation Modal */}
        {rerollModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <RefreshCw className="w-4 h-4" />
                  <span>Reroll de gagnant</span>
                </div>
                <button onClick={() => setRerollModalOpen(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-300">
                Vous vous apprêtez à tirer un nouveau gagnant pour le lot :{" "}
                <strong className="text-white">{selectedGiveawayForReroll?.prize}</strong>.
              </p>

              {rerollNewWinner ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                  <Crown className="w-6 h-6 text-amber-400 mx-auto" />
                  <p className="text-xs text-neutral-400">Nouveau gagnant tiré au sort :</p>
                  <p className="text-base font-bold text-emerald-400">{rerollNewWinner}</p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400">
                  L'ancien gagnant sera notifié de l'expiration de son lot et le nouveau gagnant sera immédiatement annoncé dans le salon Discord.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRerollModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800"
                >
                  Fermer
                </button>
                {!rerollNewWinner && (
                  <button
                    type="button"
                    onClick={executeReroll}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20 flex items-center gap-1.5"
                  >
                    <Dice5 className="w-4 h-4" />
                    Tirer au sort maintenant
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
