"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Award,
  Zap,
  Trophy,
  Sliders,
  Users,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Crown,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Eye,
  Hash,
  RefreshCw,
  Image as ImageIcon,
  Palette,
  Volume2,
  MessageSquare,
  Lock,
  X,
  Edit2,
} from "lucide-react";

interface MemberRank {
  id: string;
  rank: number;
  username: string;
  avatar: string;
  level: number;
  currentXp: number;
  targetXp: number;
  totalXp: number;
  messagesCount: number;
  roleReward?: string;
}

interface RoleReward {
  level: number;
  roleName: string;
  roleColor: string;
  membersCount: number;
}

export default function LevelingCenterClient() {
  const [activeTab, setActiveTab] = useState<
    "leaderboard" | "card_designer" | "rewards" | "rates" | "blacklist"
  >("leaderboard");

  // Leaderboard Data
  const [members, setMembers] = useState<MemberRank[]>([
    {
      id: "usr-1",
      rank: 1,
      username: "Nocturne#4412",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80",
      level: 74,
      currentXp: 1840,
      targetXp: 2500,
      totalXp: 142500,
      messagesCount: 7120,
      roleReward: "Mythique",
    },
    {
      id: "usr-2",
      rank: 2,
      username: "AlexDev#0001",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80",
      level: 68,
      currentXp: 950,
      targetXp: 2300,
      totalXp: 118400,
      messagesCount: 5920,
      roleReward: "Légende",
    },
    {
      id: "usr-3",
      rank: 3,
      username: "ShadowGamer#1337",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80",
      level: 55,
      currentXp: 1200,
      targetXp: 1900,
      totalXp: 82100,
      messagesCount: 4105,
      roleReward: "Légende",
    },
    {
      id: "usr-4",
      rank: 4,
      username: "Sarah_T#2048",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80",
      level: 42,
      currentXp: 780,
      targetXp: 1500,
      totalXp: 53400,
      messagesCount: 2670,
      roleReward: "Vétéran",
    },
    {
      id: "usr-5",
      rank: 5,
      username: "Kylian_Gamer#9912",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=60&auto=format&fit=crop&q=80",
      level: 38,
      currentXp: 340,
      targetXp: 1350,
      totalXp: 41200,
      messagesCount: 2060,
      roleReward: "Vétéran",
    },
    {
      id: "usr-6",
      rank: 6,
      username: "Lucas92#4412",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&auto=format&fit=crop&q=80",
      level: 26,
      currentXp: 610,
      targetXp: 1100,
      totalXp: 24300,
      messagesCount: 1215,
      roleReward: "Habitué",
    },
    {
      id: "usr-7",
      rank: 7,
      username: "Elena_Design#0077",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&auto=format&fit=crop&q=80",
      level: 19,
      currentXp: 820,
      targetXp: 950,
      totalXp: 15800,
      messagesCount: 790,
      roleReward: "Initié",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");

  // Role Rewards
  const [roleRewards, setRoleRewards] = useState<RoleReward[]>([
    { level: 5, roleName: "Initié", roleColor: "#60A5FA", membersCount: 142 },
    { level: 15, roleName: "Habitué", roleColor: "#34D399", membersCount: 88 },
    { level: 30, roleName: "Vétéran", roleColor: "#F59E0B", membersCount: 34 },
    { level: 50, roleName: "Légende", roleColor: "#EC4899", membersCount: 12 },
    { level: 75, roleName: "Mythique", roleColor: "#8B5CF6", membersCount: 3 },
  ]);

  // Card Designer State
  const [cardAccentColor, setCardAccentColor] = useState("#D946EF");
  const [cardBgTheme, setCardBgTheme] = useState<"dark" | "cyber" | "sunset" | "neon">("cyber");
  const [cardShowBadge, setCardShowBadge] = useState(true);
  const [cardCustomBannerUrl, setCardCustomBannerUrl] = useState("");

  // XP Rates & Settings
  const [xpPerMessage, setXpPerMessage] = useState(20);
  const [xpCooldownSeconds, setXpCooldownSeconds] = useState(60);
  const [vocalXpPerMinute, setVocalXpPerMinute] = useState(10);
  const [boosterMultiplier, setBoosterMultiplier] = useState(1.5);
  const [levelUpChannel, setLevelUpChannel] = useState("niveaux-xp");
  const [levelUpMode, setLevelUpMode] = useState<"CHANNEL" | "CURRENT" | "DM">("CHANNEL");

  // Admin XP Edit Modal
  const [selectedMember, setSelectedMember] = useState<MemberRank | null>(null);
  const [xpDelta, setXpDelta] = useState(100);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    return members.filter((m) =>
      m.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [members, searchQuery]);

  const handleAdjustXp = (isAdd: boolean) => {
    if (!selectedMember) return;
    const change = isAdd ? xpDelta : -xpDelta;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === selectedMember.id) {
          const newTotal = Math.max(0, m.totalXp + change);
          const newLevel = Math.floor(Math.sqrt(newTotal / 25));
          return {
            ...m,
            totalXp: newTotal,
            level: newLevel,
            currentXp: Math.max(0, m.currentXp + change),
          };
        }
        return m;
      })
    );
    showToast(`XP de ${selectedMember.username} mis à jour (${isAdd ? "+" : "-"}${xpDelta} XP) !`);
    setSelectedMember(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-fuchsia-500/20 to-purple-500/20 text-fuchsia-400 rounded-xl border border-fuchsia-500/30 shadow-lg shadow-fuchsia-500/10">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  ETHONE Leveling & Rôles XP 2.0
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ⚡ Moteur XP v2.4
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Progression d'activité communautaire, classement dynamique, récompenses de rôles et carte de profil personnalisée.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveTab("card_designer")}
              className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Palette className="w-4 h-4 text-fuchsia-400" />
              Rank Card Designer
            </button>
            <button
              onClick={() => showToast("Classement synchronisé avec la base Discord en temps réel !")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-fuchsia-600/20 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Synchroniser Discord
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
            <span className="text-xs text-neutral-500 font-medium">Membres Classés</span>
            <p className="text-2xl font-bold text-white">1,420</p>
            <span className="text-[11px] text-emerald-400">Actifs dans le ranking</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Niveau Max Atteint</span>
            <p className="text-2xl font-bold text-fuchsia-400">Lvl 74</p>
            <span className="text-[11px] text-neutral-400">Nocturne#4412</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">XP Total Distribué</span>
            <p className="text-2xl font-bold text-purple-400">842.5k</p>
            <span className="text-[11px] text-emerald-400">+18% ce mois-ci</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Paliers de Rôles</span>
            <p className="text-2xl font-bold text-amber-400">{roleRewards.length}</p>
            <span className="text-[11px] text-neutral-400">Rôles configurés</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Gain / Message</span>
            <p className="text-2xl font-bold text-emerald-400">{xpPerMessage} XP</p>
            <span className="text-[11px] text-neutral-400">Cooldown: {xpCooldownSeconds}s</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Multiplicateur Boost</span>
            <p className="text-2xl font-bold text-cyan-400">{boosterMultiplier}x</p>
            <span className="text-[11px] text-cyan-400">Pour Nitro Boosters</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: "leaderboard", label: "Classement & Leaderboard", icon: Trophy },
            { id: "card_designer", label: "Rank Card Designer", icon: Palette },
            { id: "rewards", label: "Rôles Récompenses", icon: Award },
            { id: "rates", label: "Multiplicateurs & Gain XP", icon: Zap },
            { id: "blacklist", label: "Salons & Rôles Exclus", icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 text-white border-b-2 border-fuchsia-500"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-fuchsia-400" : "text-neutral-500"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Leaderboard */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Rechercher un membre par pseudo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 rounded-xl bg-neutral-900 border border-neutral-800 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              <span className="text-xs text-neutral-500 font-medium">
                Affichage des {filteredMembers.length} premiers membres
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="divide-y divide-neutral-800">
                {filteredMembers.map((member) => {
                  const progressPct = Math.min(
                    100,
                    Math.round((member.currentXp / member.targetXp) * 100)
                  );

                  return (
                    <div
                      key={member.id}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 flex items-center justify-center font-bold font-mono">
                          {member.rank === 1 && <span className="text-xl">🥇</span>}
                          {member.rank === 2 && <span className="text-xl">🥈</span>}
                          {member.rank === 3 && <span className="text-xl">🥉</span>}
                          {member.rank > 3 && (
                            <span className="text-neutral-500 text-xs">#{member.rank}</span>
                          )}
                        </div>

                        <img
                          src={member.avatar}
                          alt={member.username}
                          className="w-10 h-10 rounded-full border border-neutral-700 object-cover"
                        />

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{member.username}</span>
                            {member.roleReward && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                                {member.roleReward}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400">
                            {member.messagesCount.toLocaleString()} messages &bull;{" "}
                            {member.totalXp.toLocaleString()} XP total
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* XP Progress Bar */}
                        <div className="w-full md:w-56 space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-fuchsia-400 font-bold">Niveau {member.level}</span>
                            <span className="text-neutral-400">
                              {member.currentXp} / {member.targetXp} XP ({progressPct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedMember(member)}
                          className="px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-fuchsia-400" />
                          Gérer XP
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Rank Card Designer */}
        {activeTab === "card_designer" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Customizer Controls */}
            <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-fuchsia-400" />
                <h3 className="text-base font-bold text-white">Personnalisation de la Rank Card</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Thème d'Arrière-Plan
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "cyber", label: "Cyberpunk", bg: "bg-gradient-to-r from-purple-900 to-indigo-950" },
                      { id: "dark", label: "Onyx Minimal", bg: "bg-neutral-900" },
                      { id: "sunset", label: "Sunset Glow", bg: "bg-gradient-to-r from-rose-900 to-amber-950" },
                      { id: "neon", label: "Neon Emerald", bg: "bg-gradient-to-r from-emerald-950 to-teal-900" },
                    ].map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => setCardBgTheme(th.id as any)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          cardBgTheme === th.id
                            ? "border-fuchsia-500 shadow-lg shadow-fuchsia-500/20 bg-neutral-800"
                            : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <div className={`h-4 w-full rounded mb-1.5 ${th.bg}`} />
                        <span className="font-semibold text-[11px]">{th.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Couleur d'Accent / Barre de progression
                  </label>
                  <div className="flex items-center gap-2">
                    {["#D946EF", "#6366F1", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setCardAccentColor(col)}
                        style={{ backgroundColor: col }}
                        className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                          cardAccentColor === col ? "ring-2 ring-white scale-110" : "opacity-80 hover:opacity-100"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    URL d'Image de Bannière Personnalisée (Optionnel)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={cardCustomBannerUrl}
                    onChange={(e) => setCardCustomBannerUrl(e.target.value)}
                    className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div>
                    <span className="font-bold text-white block">Afficher les badges & distinctions</span>
                    <span className="text-neutral-500 text-[11px]">Badge VIP, Booster et Trophées</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCardShowBadge(!cardShowBadge)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      cardShowBadge ? "bg-fuchsia-500 text-white" : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {cardShowBadge ? "Activé" : "Désactivé"}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => showToast("Design de la Rank Card sauvegardé pour le serveur !")}
                    className="w-full h-10 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs shadow-lg shadow-fuchsia-600/20 transition-all cursor-pointer"
                  >
                    Enregistrer le modèle de carte
                  </button>
                </div>
              </div>
            </div>

            {/* Live Visual Preview of Rank Card */}
            <div className="lg:col-span-6 space-y-3">
              <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-fuchsia-400" />
                Rendu de la Carte Discord (/rank)
              </span>

              {/* Card Canvas Mockup */}
              <div
                className={`w-full rounded-2xl p-6 border border-neutral-700/80 shadow-2xl relative overflow-hidden font-sans ${
                  cardBgTheme === "cyber"
                    ? "bg-gradient-to-r from-purple-950 via-indigo-950 to-neutral-950"
                    : cardBgTheme === "sunset"
                    ? "bg-gradient-to-r from-rose-950 via-amber-950 to-neutral-950"
                    : cardBgTheme === "neon"
                    ? "bg-gradient-to-r from-emerald-950 via-teal-950 to-neutral-950"
                    : "bg-neutral-900"
                }`}
                style={
                  cardCustomBannerUrl
                    ? { backgroundImage: `url(${cardCustomBannerUrl})`, backgroundSize: "cover" }
                    : {}
                }
              >
                {/* Background overlay for readability */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] -z-0" />

                <div className="relative z-10 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                          alt="Avatar"
                          className="w-16 h-16 rounded-full border-2 border-white/20 object-cover shadow-xl"
                        />
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-neutral-950 rounded-full" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-extrabold text-white">Nocturne</h4>
                          <span className="text-xs text-neutral-400 font-semibold">#4412</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white border border-white/20">
                            👑 ETHONE VIP
                          </span>
                          {cardShowBadge && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                              💎 Booster
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-xs text-neutral-400 font-bold">RANG</span>
                        <span className="text-xl font-black text-amber-400 font-mono">#1</span>
                      </div>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-xs text-neutral-400 font-bold">NIVEAU</span>
                        <span
                          className="text-2xl font-black font-mono"
                          style={{ color: cardAccentColor }}
                        >
                          74
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar in Card */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono text-neutral-300">
                      <span>Progression Palier</span>
                      <span>
                        <strong>1,840</strong> / 2,500 XP
                      </span>
                    </div>
                    <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden border border-white/10 p-0.5">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: "73%",
                          backgroundColor: cardAccentColor,
                          boxShadow: `0 0 12px ${cardAccentColor}`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Role Rewards */}
        {activeTab === "rewards" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-fuchsia-400" />
                Rôles débloqués automatiquement par niveau ({roleRewards.length})
              </h2>
              <button
                onClick={() => {
                  const newLvl = (roleRewards[roleRewards.length - 1]?.level || 0) + 10;
                  setRoleRewards([
                    ...roleRewards,
                    { level: newLvl, roleName: `Palier ${newLvl}`, roleColor: "#A855F7", membersCount: 0 },
                  ]);
                  showToast(`Nouveau palier niveau ${newLvl} ajouté !`);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Ajouter un Rôle Récompense
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roleRewards.map((rw, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 font-mono font-bold text-xs text-fuchsia-400">
                      Niveau {rw.level}+
                    </span>
                    <button
                      onClick={() => {
                        setRoleRewards(roleRewards.filter((_, i) => i !== idx));
                        showToast(`Rôle ${rw.roleName} supprimé.`);
                      }}
                      className="text-neutral-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: rw.roleColor }}
                    />
                    <h3 className="text-base font-bold text-white">@{rw.roleName}</h3>
                  </div>

                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                    <span>Membres titulaires</span>
                    <span className="font-semibold text-white font-mono">{rw.membersCount} membres</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Rates & Settings */}
        {activeTab === "rates" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 max-w-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-fuchsia-400" />
              Réglages des Gains d'XP & Cooldowns
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div>
                  <span className="font-bold text-white block">XP par message</span>
                  <span className="text-neutral-500 text-[11px]">Points attribués pour chaque message textuel valide</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={xpPerMessage}
                    onChange={(e) => setXpPerMessage(Number(e.target.value))}
                    className="w-20 h-9 rounded-xl bg-neutral-900 border border-neutral-700 text-center text-xs font-bold text-fuchsia-400"
                  />
                  <span className="text-neutral-400">XP</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div>
                  <span className="font-bold text-white block">Cooldown Anti-Spam</span>
                  <span className="text-neutral-500 text-[11px]">Délai minimum en secondes entre deux gains d'XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={xpCooldownSeconds}
                    onChange={(e) => setXpCooldownSeconds(Number(e.target.value))}
                    className="w-20 h-9 rounded-xl bg-neutral-900 border border-neutral-700 text-center text-xs font-bold text-fuchsia-400"
                  />
                  <span className="text-neutral-400">sec</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div>
                  <span className="font-bold text-white block">XP Vocal par minute</span>
                  <span className="text-neutral-500 text-[11px]">Gain continu pour les membres actifs dans les salons vocaux</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={vocalXpPerMinute}
                    onChange={(e) => setVocalXpPerMinute(Number(e.target.value))}
                    className="w-20 h-9 rounded-xl bg-neutral-900 border border-neutral-700 text-center text-xs font-bold text-cyan-400"
                  />
                  <span className="text-neutral-400">XP/min</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Salon d'annonce de Level-Up
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={levelUpChannel}
                    onChange={(e) => setLevelUpChannel(e.target.value)}
                    placeholder="niveaux-xp"
                    className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 pl-9 pr-3 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => showToast("Paramètres d'XP sauvegardés avec succès !")}
                  className="px-5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Blacklist */}
        {activeTab === "blacklist" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 max-w-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400" />
              Salons & Rôles Exemptés d'XP
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Les messages envoyés dans ces salons ne rapporteront aucun point d'XP pour éviter le farming abusif.
            </p>

            <div className="space-y-2">
              {["#spam", "#bot-commands", "#publicité", "#compteur"].map((ch, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                >
                  <span className="font-mono text-neutral-300">{ch}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    XP Désactivé
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adjust XP Admin Modal */}
        {selectedMember && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-fuchsia-400" />
                  Modifier l'XP de {selectedMember.username}
                </h4>
                <button onClick={() => setSelectedMember(null)} className="text-neutral-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
                <p className="text-neutral-400">
                  Niveau actuel : <strong className="text-white">Lvl {selectedMember.level}</strong>
                </p>
                <p className="text-neutral-400">
                  XP Total : <strong className="text-fuchsia-400">{selectedMember.totalXp.toLocaleString()} XP</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Quantité d'XP à ajuster
                </label>
                <input
                  type="number"
                  min={10}
                  step={50}
                  value={xpDelta}
                  onChange={(e) => setXpDelta(Number(e.target.value))}
                  className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleAdjustXp(false)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  - Retirer {xpDelta} XP
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustXp(true)}
                  className="flex-1 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold shadow-lg shadow-fuchsia-600/20 transition-all cursor-pointer"
                >
                  + Ajouter {xpDelta} XP
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
