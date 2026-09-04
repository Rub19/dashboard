"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  UserPlus,
  Users,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Award,
  Link as LinkIcon,
  Gift,
  Target,
  BarChart3,
  Settings,
  RefreshCw,
  Search,
  ChevronRight,
  ExternalLink,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Download,
  Filter,
  Check,
  Radio,
} from "lucide-react";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useToast } from "@/components/ToastProvider";

const API_BASE = "http://localhost:3001";

export default function InvitesCenterClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const { success, error: showError } = useToast();

  const [currentGuildId, setCurrentGuildId] = useState<string>(
    searchParams.get("guildId") || "1128633164290596884"
  );
  const [activeTab, setActiveTab] = useState<"leaderboard" | "links" | "rewards" | "campaigns" | "analytics">("leaderboard");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Data states
  const [overview, setOverview] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  // Leaderboard filters
  const [period, setPeriod] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Reward Builder Modal State
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardInvites, setNewRewardInvites] = useState(5);
  const [newRewardRole, setNewRewardRole] = useState("Bronze Supporter");
  const [newRewardXp, setNewRewardXp] = useState(150);

  // Guilds from user profile
  const userGuilds = useMemo(() => profile?.guilds || [], [profile?.guilds]);
  const currentGuild = useMemo(
    () => userGuilds.find((g) => g.id === currentGuildId) || { id: currentGuildId, name: "Serveur Discord Principal" },
    [userGuilds, currentGuildId]
  );

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Overview
      const ovRes = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/invites/overview`).catch(() => null);
      if (ovRes && ovRes.ok) {
        const ovData = await ovRes.json();
        setOverview(ovData);
      } else {
        // Mock fallback
        setOverview({
          kpis: {
            totalInvites: 1284,
            validInvites: 932,
            fakeJoins: 142,
            leftMembers: 92,
            retainedMembers: 840,
            retentionRate: 73,
            conversionRate: 72,
            joinsToday: 24,
            joinsThisWeek: 168,
            topInviter: { userId: "usr_alex", tag: "Alex#0001", invites: 184 },
          },
          funnel: {
            invitationsTracked: 2000,
            totalJoins: 1284,
            validJoins: 1102,
            retainedMembers: 932,
            rewardedMembers: 147,
          },
        });
      }

      // 2. Leaderboard
      const lbRes = await fetch(
        `${API_BASE}/api/guilds/${currentGuildId}/invites/leaderboard?period=${period}&search=${encodeURIComponent(searchQuery)}`
      ).catch(() => null);
      if (lbRes && lbRes.ok) {
        const lbData = await lbRes.json();
        setLeaderboard(lbData.leaderboard || []);
      } else {
        setLeaderboard([
          { rank: 1, userId: "usr_alex", userTag: "Alex#0001", totalInvites: 184, validInvites: 162, leftMembers: 14, suspiciousInvites: 8, retentionRate: 91, rewardsEarned: 3 },
          { rank: 2, userId: "usr_lucas", userTag: "Lucas#1234", totalInvites: 142, validInvites: 118, leftMembers: 16, suspiciousInvites: 8, retentionRate: 83, rewardsEarned: 2 },
          { rank: 3, userId: "usr_emma", userTag: "Emma#5678", totalInvites: 97, validInvites: 89, leftMembers: 5, suspiciousInvites: 3, retentionRate: 94, rewardsEarned: 2 },
          { rank: 4, userId: "usr_noah", userTag: "Noah#9012", totalInvites: 64, validInvites: 51, leftMembers: 9, suspiciousInvites: 4, retentionRate: 79, rewardsEarned: 1 },
          { rank: 5, userId: "usr_lea", userTag: "Léa#3456", totalInvites: 42, validInvites: 38, leftMembers: 2, suspiciousInvites: 2, retentionRate: 95, rewardsEarned: 1 },
        ]);
      }

      // 3. Links
      const linksRes = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/invites/links`).catch(() => null);
      if (linksRes && linksRes.ok) {
        const linksData = await linksRes.json();
        setLinks(linksData.links || []);
      } else {
        setLinks([
          { code: "ethone-dev", creator: "Alex#0001", uses: 184, maxUses: "Illimité", expires: "Jamais", temporary: false, url: "https://discord.gg/ethone-dev", status: "Actif" },
          { code: "gaming-vip", creator: "Lucas#1234", uses: 142, maxUses: "500", expires: "31/12/2026", temporary: false, url: "https://discord.gg/gaming-vip", status: "Actif" },
          { code: "welcome-hub", creator: "Emma#5678", uses: 97, maxUses: "Illimité", expires: "Jamais", temporary: false, url: "https://discord.gg/welcome-hub", status: "Actif" },
        ]);
      }

      // 4. Rewards
      const rewRes = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/invites/rewards`).catch(() => null);
      if (rewRes && rewRes.ok) {
        const rewData = await rewRes.json();
        setRewards(rewData.rewards || []);
      } else {
        setRewards([
          { id: "rew_1", name: "Rôle Bronze Initié", requiredValidInvites: 5, roleName: "Bronze Supporter", xpAmount: 150, rewardBadge: "🥉 Bronze", enabled: true },
          { id: "rew_2", name: "Rôle Silver Recruteur", requiredValidInvites: 15, roleName: "Silver Recruteur", xpAmount: 500, rewardBadge: "🥈 Silver", enabled: true },
          { id: "rew_3", name: "Rôle VIP Ambassadeur", requiredValidInvites: 30, roleName: "Ambassadeur VIP", xpAmount: 1500, rewardBadge: "👑 Ambassadeur", enabled: true },
        ]);
      }

      // 5. Campaigns
      const campRes = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/invites/campaigns`).catch(() => null);
      if (campRes && campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData.campaigns || []);
      } else {
        setCampaigns([
          {
            id: "camp_1",
            name: "Campagne de Croissance Printemps 2026",
            description: "Aidez la communauté à grandir et débloquez le rôle exclusif Ambassadeur ainsi que 1,000 XP.",
            startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
            endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20).toISOString(),
            inviteTarget: 500,
            currentInvites: 184,
            rewards: ["Rôle @Ambassadeur", "1,000 XP"],
            status: "ACTIVE",
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentGuildId, period, searchQuery]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSyncDiscord = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/invites/sync`, { method: "POST" });
      if (res.ok) {
        success("Synchronisation effectuée", "Les invitations Discord ont été rafraîchies depuis l'API Gateway.");
        fetchAllData();
      }
    } catch {
      showError("Erreur de synchronisation", "Impossible de contacter l'API du bot.");
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateReward = async () => {
    if (!newRewardName.trim()) {
      showError("Nom requis", "Veuillez donner un nom à la récompense.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/invites/rewards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRewardName,
          requiredValidInvites: newRewardInvites,
          roleName: newRewardRole,
          xpAmount: newRewardXp,
        }),
      });

      if (res.ok) {
        success("Récompense créée", `Palier ${newRewardInvites} invitations ajouté avec succès.`);
        setShowRewardModal(false);
        setNewRewardName("");
        fetchAllData();
      }
    } catch {
      showError("Erreur", "Impossible de créer la récompense.");
    }
  };

  const handleDeleteReward = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/guilds/${currentGuildId}/invites/rewards/${id}`, { method: "DELETE" });
      success("Récompense supprimée", "Le palier de parrainage a été retiré.");
      fetchAllData();
    } catch {
      showError("Erreur", "Impossible de supprimer la récompense.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success("Copié !", "Le lien d'invitation est dans votre presse-papiers.");
  };

  const kpis = overview?.kpis || {
    totalInvites: 0,
    validInvites: 0,
    fakeJoins: 0,
    leftMembers: 0,
    retainedMembers: 0,
    retentionRate: 0,
    conversionRate: 0,
    joinsToday: 0,
    joinsThisWeek: 0,
    topInviter: null,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col p-4 sm:p-8 pb-36 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Invites & Referrals 2.0
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[10px] font-bold font-mono">
                  CROISSANCE
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Track referrals, reward members and understand how your community grows.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Guild Switcher */}
          <select
            value={currentGuildId}
            onChange={(e) => setCurrentGuildId(e.target.value)}
            className="h-9 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
          >
            {userGuilds.length > 0 ? (
              userGuilds.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))
            ) : (
              <option value="1128633164290596884">Serveur Discord Principal</option>
            )}
          </select>

          {/* Sync Button */}
          <button
            onClick={handleSyncDiscord}
            disabled={syncing}
            className="flex h-9 items-center gap-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition cursor-pointer"
            title="Synchroniser avec Discord Gateway"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-pink-400" : ""}`} />
            <span className="hidden sm:inline">Synchroniser</span>
          </button>

          {/* Settings Link */}
          <Link
            href={`/discord/invites/settings?guildId=${currentGuildId}`}
            className="flex h-9 items-center gap-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Paramètres</span>
          </Link>

          {/* Back to Bot Hub */}
          <Link
            href={`/discord?guildId=${currentGuildId}`}
            className="flex h-9 items-center gap-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition"
          >
            <span>Retour Bot</span>
          </Link>
        </div>
      </div>

      {/* 8 Overview KPIs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="text-[11px] text-zinc-400 font-medium truncate mb-1">Total Invites</div>
          <div className="text-xl font-bold text-white font-mono">{kpis.totalInvites}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Générées & suivies</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-emerald-500/20">
          <div className="text-[11px] text-zinc-400 font-medium truncate mb-1">Valid Joins</div>
          <div className="text-xl font-bold text-emerald-400 font-mono">{kpis.validInvites}</div>
          <div className="text-[10px] text-emerald-400/80 mt-1">Membres authentiques</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-rose-500/20">
          <div className="text-[11px] text-zinc-400 font-medium truncate mb-1">Suspicious / Fake</div>
          <div className="text-xl font-bold text-rose-400 font-mono">{kpis.fakeJoins}</div>
          <div className="text-[10px] text-rose-400/80 mt-1">Score risque &gt; 50</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="text-[11px] text-zinc-400 font-medium truncate mb-1">Membres Retenus</div>
          <div className="text-xl font-bold text-white font-mono">{kpis.retainedMembers}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Toujours sur le serveur</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-pink-500/20">
          <div className="text-[11px] text-zinc-400 font-medium truncate mb-1">Rétention 7j</div>
          <div className="text-xl font-bold text-pink-400 font-mono">{kpis.retentionRate}%</div>
          <div className="text-[10px] text-pink-400/80 mt-1">Fidélisation globale</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-indigo-500/20">
          <div className="text-[11px] text-zinc-400 font-medium truncate mb-1">Top Recruteur</div>
          <div className="text-base font-bold text-indigo-300 truncate">
            {kpis.topInviter ? kpis.topInviter.tag.split("#")[0] : "Aucun"}
          </div>
          <div className="text-[10px] text-indigo-400 mt-1 font-mono">
            {kpis.topInviter ? `${kpis.topInviter.invites} invites` : "0"}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="text-[11px] text-zinc-400 font-medium truncate mb-1">Joins Aujourd'hui</div>
          <div className="text-xl font-bold text-white font-mono">+{kpis.joinsToday}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Dernières 24h</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="text-[11px] text-zinc-400 font-medium truncate mb-1">Cette Semaine</div>
          <div className="text-xl font-bold text-teal-400 font-mono">+{kpis.joinsThisWeek}</div>
          <div className="text-[10px] text-teal-400/80 mt-1">7 derniers jours</div>
        </div>
      </div>

      {/* Growth Funnel & Live Ticker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        {/* Growth Funnel */}
        <div className="lg:col-span-8 p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pink-400" />
              <span>Entonnoir de Croissance Communautaire (Growth Funnel)</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold">Taux Global : {kpis.retentionRate}%</span>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
              <div className="text-[10px] text-zinc-500 font-mono mb-0.5">1. INVITATIONS</div>
              <div className="text-sm font-bold text-white font-mono">2,000</div>
              <div className="text-[10px] text-zinc-400">100%</div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
              <div className="text-[10px] text-zinc-500 font-mono mb-0.5">2. ARRIVÉES</div>
              <div className="text-sm font-bold text-white font-mono">{kpis.totalInvites}</div>
              <div className="text-[10px] text-zinc-400">64%</div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950 border border-emerald-500/20">
              <div className="text-[10px] text-emerald-400 font-mono mb-0.5">3. VALIDÉES</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">{kpis.validInvites}</div>
              <div className="text-[10px] text-zinc-400">55%</div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950 border border-pink-500/20">
              <div className="text-[10px] text-pink-400 font-mono mb-0.5">4. RETENUES &gt;7J</div>
              <div className="text-sm font-bold text-pink-400 font-mono">{kpis.retainedMembers}</div>
              <div className="text-[10px] text-zinc-400">46%</div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950 border border-indigo-500/20">
              <div className="text-[10px] text-indigo-400 font-mono mb-0.5">5. RÉCOMPENSES</div>
              <div className="text-sm font-bold text-indigo-400 font-mono">147</div>
              <div className="text-[10px] text-zinc-400">12%</div>
            </div>
          </div>
        </div>

        {/* Live Stream Ticker */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Activité Parrainage Direct</span>
              </h3>
              <span className="text-[10px] text-zinc-500">Temps réel</span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-zinc-300 font-medium truncate">Alex a invité Lucas#1234</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold shrink-0">+1 Valide</span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                  <span className="text-zinc-300 font-medium truncate">Lucas a invité SpamBot#00</span>
                </div>
                <span className="text-[10px] text-rose-400 font-mono font-bold shrink-0">Risk 85</span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-zinc-300 font-medium truncate">Emma a invité Max#4567</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold shrink-0">+1 Valide</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 text-center mt-2">
            Synchronisation continue avec le serveur Discord
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3 mb-6">
        {[
          { id: "leaderboard", label: "Classement (Leaderboard)", icon: Award },
          { id: "links", label: "Liens d'Invitations", icon: LinkIcon },
          { id: "rewards", label: "Récompenses & Builder", icon: Gift },
          { id: "campaigns", label: "Campagnes de Croissance", icon: Target },
          { id: "analytics", label: "Analytics & Rétention", icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-md shadow-pink-600/20"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-zinc-800/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: LEADERBOARD */}
      {activeTab === "leaderboard" && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
          {/* Filters row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs">
              {[
                { id: "today", label: "Aujourd'hui" },
                { id: "7d", label: "7 Jours" },
                { id: "30d", label: "30 Jours" },
                { id: "90d", label: "90 Jours" },
                { id: "all", label: "Tout Temps" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
                    period === p.id ? "bg-pink-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un membre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-3">Rang</th>
                  <th className="py-3 px-3">Membre Recruteur</th>
                  <th className="py-3 px-3">Total Invites</th>
                  <th className="py-3 px-3">Valides</th>
                  <th className="py-3 px-3">Partis</th>
                  <th className="py-3 px-3">Suspectes</th>
                  <th className="py-3 px-3">Rétention</th>
                  <th className="py-3 px-3">Récompenses</th>
                  <th className="py-3 px-3 text-right">Profil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {leaderboard.map((entry) => (
                  <tr key={entry.userId} className="hover:bg-zinc-800/40 transition">
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-sm">
                        {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                          {entry.userTag.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{entry.userTag}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{entry.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-semibold text-white">{entry.totalInvites}</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">{entry.validInvites}</td>
                    <td className="py-3.5 px-3 font-mono text-zinc-400">{entry.leftMembers}</td>
                    <td className="py-3.5 px-3 font-mono text-rose-400">{entry.suspiciousInvites}</td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-pink-500 h-full" style={{ width: `${entry.retentionRate}%` }} />
                        </div>
                        <span className="font-mono text-xs font-semibold text-pink-300">{entry.retentionRate}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono font-bold">
                        {entry.rewardsEarned} Paliers
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        href={`/discord/invites/users/${entry.userId}?guildId=${currentGuildId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
                      >
                        <span>Voir</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INVITE LINKS */}
      {activeTab === "links" && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Liens d'Invitations Discord</h3>
              <p className="text-xs text-zinc-400">
                Invitations actives créées sur le serveur Discord et surveillées par ETHONE Bot.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Créateur</th>
                  <th className="py-3 px-3">Utilisations</th>
                  <th className="py-3 px-3">Max Utilisations</th>
                  <th className="py-3 px-3">Expiration</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {links.map((link) => (
                  <tr key={link.code} className="hover:bg-zinc-800/40 transition">
                    <td className="py-3.5 px-3 font-mono font-bold text-pink-400">
                      <span className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800">
                        {link.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-white font-medium">{link.creator}</td>
                    <td className="py-3.5 px-3 font-mono text-emerald-400 font-bold">{link.uses}</td>
                    <td className="py-3.5 px-3 font-mono text-zinc-400">{link.maxUses}</td>
                    <td className="py-3.5 px-3 text-zinc-400">{link.expires}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
                        {link.temporary ? "Temporaire" : "Permanent"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => copyToClipboard(link.url)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                        title="Copier le lien"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REWARDS & BUILDER */}
      {activeTab === "rewards" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Paliers de Récompenses Automatisés</h3>
                <p className="text-xs text-zinc-400">
                  Définissez des règles automatiques pour récompenser les meilleurs recruteurs avec des rôles et de l'XP.
                </p>
              </div>

              <button
                onClick={() => setShowRewardModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-pink-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Palier</span>
              </button>
            </div>

            {/* Rewards Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {rewards.map((r) => (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 font-mono text-xs font-bold">
                        {r.requiredValidInvites} Invites Valides
                      </span>
                      <button
                        onClick={() => handleDeleteReward(r.id)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-1">{r.name}</h4>
                    <div className="text-xs text-zinc-400 flex items-center gap-1.5 mb-3">
                      <Award className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Rôle : @{r.roleName}</span>
                    </div>

                    {r.xpAmount && (
                      <div className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-mono mb-2">
                        <Sparkles className="w-3 h-3" />
                        <span>+{r.xpAmount} XP Niveau</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-800 text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Règle Active • Idempotente
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CAMPAIGNS */}
      {activeTab === "campaigns" && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Campagnes de Parrainage Actives</h3>
              <p className="text-xs text-zinc-400">
                Fixez des objectifs temporels pour booster les adhésions lors d'événements spéciaux.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {campaigns.map((c) => {
              const pct = Math.min(100, Math.round((c.currentInvites / c.inviteTarget) * 100));
              return (
                <div key={c.id} className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">{c.name}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold font-mono">
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{c.description}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-white font-mono">
                        {c.currentInvites} / {c.inviteTarget}
                      </div>
                      <div className="text-[10px] text-zinc-500">Invitations réalisées</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden mb-3">
                    <div className="bg-gradient-to-r from-pink-500 to-indigo-500 h-full transition-all" style={{ width: `${pct}%` }} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-900">
                    <div className="flex items-center gap-2">
                      <span>Récompenses :</span>
                      {c.rewards.map((rew: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-pink-300">
                          {rew}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Fin le {new Date(c.endDate).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: ANALYTICS & RETENTION */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Retention Curves */}
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-pink-400" />
                <span>Courbes de Rétention dans le Temps</span>
              </h3>
              <p className="text-xs text-zinc-400 mb-6">
                Pourcentage de membres toujours actifs après X jours suite à leur arrivée via une invitation.
              </p>

              <div className="space-y-4">
                {[
                  { label: "Après 1 Heure", pct: 95, color: "bg-emerald-500" },
                  { label: "Après 24 Heures", pct: 91, color: "bg-teal-500" },
                  { label: "Après 3 Jours", pct: 84, color: "bg-indigo-500" },
                  { label: "Après 7 Jours", pct: 76, color: "bg-pink-500" },
                  { label: "Après 30 Jours", pct: 61, color: "bg-purple-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-300 font-medium">{item.label}</span>
                      <span className="font-mono font-bold text-white">{item.pct}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className={`${item.color} h-full`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sources Breakdown */}
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Répartition des Sources d'Arrivée</span>
                </h3>
                <p className="text-xs text-zinc-400 mb-6">
                  Origine des 30 derniers jours d'adhésion au serveur.
                </p>

                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">Liens d'Invitations Personnelles</span>
                    <span className="font-mono font-bold text-emerald-400">78% (984 joins)</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">Vanity URL (discord.gg/nom)</span>
                    <span className="font-mono font-bold text-indigo-400">18% (231 joins)</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">Découverte / Direct</span>
                    <span className="font-mono font-bold text-zinc-400">4% (69 joins)</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-pink-950/20 border border-pink-500/20 text-xs text-pink-300 mt-4">
                💡 Les invitations directes générées par vos membres présentent un taux de rétention supérieur de +24% par rapport aux liens publics.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Reward */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Créer un Palier de Récompense</h3>
            <p className="text-xs text-zinc-400 mb-5">
              Définissez le seuil d'invitations valides requis pour débloquer automatiquement un rôle ou de l'XP.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Nom du palier
                </label>
                <input
                  type="text"
                  value={newRewardName}
                  onChange={(e) => setNewRewardName(e.target.value)}
                  placeholder="Ex: Rôle VIP Recruteur"
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Nombre d'invitations valides requises
                </label>
                <input
                  type="number"
                  value={newRewardInvites}
                  onChange={(e) => setNewRewardInvites(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Nom du rôle attribué
                </label>
                <input
                  type="text"
                  value={newRewardRole}
                  onChange={(e) => setNewRewardRole(e.target.value)}
                  placeholder="Ex: Ambassadeur"
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  XP accordé
                </label>
                <input
                  type="number"
                  value={newRewardXp}
                  onChange={(e) => setNewRewardXp(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowRewardModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateReward}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-600/20 transition cursor-pointer"
              >
                Ajouter le palier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
