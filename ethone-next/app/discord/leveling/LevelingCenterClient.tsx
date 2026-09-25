"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Award,
  Zap,
  Trophy,
  Sliders,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Palette,
  Lock,
  X,
  Edit2,
  Eye,
  ArrowLeft,
  Bot,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { GuildSelector } from "@/components/GuildSelector";
import LevelingSettingsPanel, { type LevelingSettings } from "./LevelingSettingsPanel";
import LevelingBoostsPanel from "./LevelingBoostsPanel";
import ChannelPicker from "@/components/discord/ChannelPicker";
import RolePicker from "@/components/discord/RolePicker";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

// Mirrors discord-bot/src/modules/leveling/types/*.ts — this page reads and
// writes the real backend shape, not a made-up one.
interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalXp: number;
  level: number;
  messagesCount: number;
  rank: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercentage: number;
}

interface LevelReward {
  id: string;
  guildId: string;
  level: number;
  roleId: string;
  message: string | null;
  enabled: boolean;
}

interface XpBoost {
  id: string;
  guildId: string;
  name: string;
  multiplier: number;
  targetType: "role" | "channel" | "server" | "event";
  targetId: string | null;
  startTime: string | null;
  endTime: string | null;
  enabled: boolean;
}

type LevelingConfig = LevelingSettings;

const DEFAULT_CONFIG: LevelingConfig = {
  enabled: false,
  minXp: 15,
  maxXp: 30,
  cooldownSeconds: 60,
  minMessageLength: 5,
  levelUpChannelType: "same_channel",
  levelUpChannelId: null,
  levelUpMessage: "🎉 Félicitations {user} ! Vous venez d'atteindre le **niveau {level}** !",
  rewardType: "cumulative",
  excludedChannelIds: [],
  excludedRoleIds: [],
  allowBots: false,
  maxLevel: 0,
  xpInThreads: true,
  xpInForums: true,
  keepXpOnLeave: true,
  voiceXpEnabled: false,
  voiceXpPerMinute: 5,
  voiceXpIgnoreMuted: true,
  voiceXpMinMembers: 2,
  leaderboardPublic: false,
  leaderboardOnDiscord: true,
  accentColor: "#f59e0b",
  rewardAnnounceType: "with_levelup",
  rewardChannelId: null,
  rewardMessage: "🏅 {user}, tu obtiens le rôle **{role}** en atteignant le niveau **{level}** !",
};

export default function LevelingCenterClient() {
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
  const base = `${BOT_API_URL}/api/guilds/${currentGuildId}/leveling`;
  const isRealGuild = Boolean(BOT_API_URL) && Boolean(currentGuildId);

  const [activeTab, setActiveTab] = useState<
    "settings" | "leaderboard" | "card_designer" | "rewards" | "boosts" | "blacklist"
  >("settings");

  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const [overview, setOverview] = useState<{
    activeMembersCount: number;
    totalXpDistributed: number;
    totalLevels: number;
    topUser: { username: string; level: number } | null;
  }>({ activeMembersCount: 0, totalXpDistributed: 0, totalLevels: 0, topUser: null });

  const [config, setConfig] = useState<LevelingConfig>(DEFAULT_CONFIG);
  const [members, setMembers] = useState<LeaderboardEntry[]>([]);
  const [rewards, setRewards] = useState<LevelReward[]>([]);
  const [boosts, setBoosts] = useState<XpBoost[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    if (!isRealGuild || !isBotPresent) {
      setIsDemo(true);
      return;
    }
    setLoading(true);
    try {
      const [overviewRes, leaderboardRes, rewardsRes, boostsRes] = await Promise.all([
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/leaderboard`, { credentials: "include" }),
        fetch(`${base}/rewards`, { credentials: "include" }),
        fetch(`${base}/boosts`, { credentials: "include" }),
      ]);
      const overviewData = await overviewRes.json().catch(() => null);
      const leaderboardData = await leaderboardRes.json().catch(() => null);
      const rewardsData = await rewardsRes.json().catch(() => null);
      const boostsData = await boostsRes.json().catch(() => null);

      if (overviewRes.ok && overviewData?.config) {
        setConfig(overviewData.config);
        setOverview({
          activeMembersCount: overviewData.activeMembersCount ?? 0,
          totalXpDistributed: overviewData.totalXpDistributed ?? 0,
          totalLevels: overviewData.totalLevels ?? 0,
          topUser: overviewData.topUser,
        });
        setIsDemo(false);
      } else {
        setIsDemo(true);
        return;
      }
      if (leaderboardRes.ok && Array.isArray(leaderboardData?.leaderboard)) {
        setMembers(leaderboardData.leaderboard);
      }
      if (rewardsRes.ok && Array.isArray(rewardsData?.rewards)) {
        setRewards(rewardsData.rewards);
      }
      if (boostsRes.ok && Array.isArray(boostsData?.boosts)) {
        setBoosts(boostsData.boosts);
      }
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [base, isRealGuild, isBotPresent]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    return members.filter((m) => m.username.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [members, searchQuery]);

  const saveConfig = async (patch: Partial<LevelingConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    if (isDemo || !BOT_API_URL) {
      toastError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    setSavingConfig(true);
    try {
      const res = await fetch(`${base}/config`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      setConfig(data.config);
      success("Réglages du système de niveaux enregistrés.");
    } catch {
      toastError("Échec de l'enregistrement des réglages.");
    } finally {
      setSavingConfig(false);
    }
  };

  // Admin XP Adjust Modal
  const [selectedMember, setSelectedMember] = useState<LeaderboardEntry | null>(null);
  const [xpDelta, setXpDelta] = useState(100);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const handleAdjustXp = async (isAdd: boolean) => {
    if (!selectedMember) return;
    const delta = isAdd ? xpDelta : -xpDelta;
    if (isDemo || !BOT_API_URL) {
      toastError("Bot injoignable : l'XP n'a pas été modifiée.");
      return;
    }
    setAdjustSubmitting(true);
    try {
      const res = await fetch(`${base}/users/${selectedMember.userId}/adjust`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      if (!res.ok) throw new Error("adjust failed");
      const data = await res.json();
      setMembers((prev) =>
        prev
          .map((m) => (m.userId === selectedMember.userId ? { ...m, ...data.user } : m))
          .sort((a, b) => b.totalXp - a.totalXp)
          .map((m, idx) => ({ ...m, rank: idx + 1 }))
      );
      success(`XP de ${selectedMember.username} mis à jour (${isAdd ? "+" : "-"}${xpDelta} XP).`);
      setSelectedMember(null);
    } catch {
      toastError("Échec de la modification d'XP.");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Role Rewards
  const [newReward, setNewReward] = useState({ level: 10, roleId: "", message: "" });
  const addReward = async () => {
    if (!newReward.roleId.trim()) {
      toastError("ID de rôle requis.");
      return;
    }
    if (isDemo || !BOT_API_URL) {
      toastError("Bot injoignable : la récompense n'a pas été ajoutée.");
      return;
    }
    try {
      const res = await fetch(`${base}/rewards`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newReward),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      setRewards((prev) => [...prev, data.reward].sort((a, b) => a.level - b.level));
      setNewReward({ level: 10, roleId: "", message: "" });
      success("Rôle récompense ajouté.");
    } catch {
      toastError("Échec de l'ajout du rôle récompense.");
    }
  };

  const removeReward = async (id: string) => {
    const previous = rewards;
    setRewards((prev) => prev.filter((r) => r.id !== id));
    if (isDemo || !BOT_API_URL) return;
    try {
      await fetch(`${base}/rewards/${id}`, { method: "DELETE", credentials: "include" });
    } catch {
      setRewards(previous);
      toastError("Échec de la suppression — la récompense a été restaurée.");
    }
  };


  // Excluded channels/roles (blacklist) — plain ID inputs, same convention
  // as GiveawaysCenterClient's role fields: no live Discord role/channel
  // picker is wired on this page, so IDs are entered directly.
  const [newExcludedChannelId, setNewExcludedChannelId] = useState("");
  const [newExcludedRoleId, setNewExcludedRoleId] = useState("");

  const addExcludedChannel = () => {
    const id = newExcludedChannelId.trim();
    if (!id || config.excludedChannelIds.includes(id)) return;
    saveConfig({ excludedChannelIds: [...config.excludedChannelIds, id] });
    setNewExcludedChannelId("");
  };
  const removeExcludedChannel = (id: string) => {
    saveConfig({ excludedChannelIds: config.excludedChannelIds.filter((c) => c !== id) });
  };
  const addExcludedRole = () => {
    const id = newExcludedRoleId.trim();
    if (!id || config.excludedRoleIds.includes(id)) return;
    saveConfig({ excludedRoleIds: [...config.excludedRoleIds, id] });
    setNewExcludedRoleId("");
  };
  const removeExcludedRole = (id: string) => {
    saveConfig({ excludedRoleIds: config.excludedRoleIds.filter((r) => r !== id) });
  };

  // Card Designer — local preview only. /rank replies with a plain Discord
  // embed (see discord-bot/src/modules/leveling/commands/rank.ts), there is
  // no server-side rank card image renderer to save this design to, so no
  // "saved" claim is made here.
  const [cardAccentColor, setCardAccentColor] = useState("#D946EF");
  const [cardBgTheme, setCardBgTheme] = useState<"dark" | "cyber" | "sunset" | "neon">("cyber");

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-neutral-100 p-4 md:p-8 pb-44 md:pb-44">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
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
              <div className="p-2.5 bg-fuchsia-500/15 text-fuchsia-400 rounded-xl border border-fuchsia-500/30 shadow-sm">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  ETHONE Leveling & Rôles XP
                </h1>
                <p className="text-xs text-neutral-400">
                  Progression d'activité communautaire, classement dynamique et récompenses de rôles.
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
              onClick={() => setActiveTab("card_designer")}
              className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Palette className="w-4 h-4 text-fuchsia-400" />
              Rank Card Designer
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
                  Invitez le bot ETHONE sur <strong>{selectedGuild.name}</strong> pour activer le système d'XP et les rôles récompenses.
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

        {/* 4 Metric KPI Cards (real) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Membres Classés</span>
            <p className="text-2xl font-bold text-white">{overview.activeMembersCount.toLocaleString()}</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Niveau Max Atteint</span>
            <p className="text-2xl font-bold text-fuchsia-400">
              {overview.topUser ? `Lvl ${overview.topUser.level}` : "—"}
            </p>
            <span className="text-[11px] text-neutral-400">{overview.topUser?.username || "Aucun membre actif"}</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">XP Total Distribué</span>
            <p className="text-2xl font-bold text-purple-400">{overview.totalXpDistributed.toLocaleString()}</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Paliers de Rôles</span>
            <p className="text-2xl font-bold text-amber-400">{rewards.length}</p>
            <span className="text-[11px] text-neutral-400">{boosts.length} boost(s) actif(s)</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: "settings", label: "Paramètres", icon: Zap },
            { id: "leaderboard", label: "Classement & Leaderboard", icon: Trophy },
            { id: "card_designer", label: "Rank Card Designer", icon: Palette },
            { id: "rewards", label: "Rôles Récompenses", icon: Award },
            { id: "boosts", label: "Boosts & Réglages XP", icon: Zap },
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

        {/* Paramètres façon DraftBot (tout désactivé par défaut) */}
        {activeTab === "settings" && (
          <LevelingSettingsPanel
            guildId={currentGuildId}
            config={config}
            saving={savingConfig}
            disabled={isDemo}
            onSave={saveConfig}
            onOpenBoosts={() => setActiveTab("boosts")}
          />
        )}

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
                Affichage de {filteredMembers.length} membre(s)
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
              {filteredMembers.length === 0 ? (
                <p className="text-xs text-neutral-500 py-10 text-center">
                  Aucun membre n'a encore gagné d'XP sur ce serveur.
                </p>
              ) : (
                <div className="divide-y divide-neutral-800">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.userId}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 flex items-center justify-center font-bold font-mono">
                          {member.rank === 1 && <span className="text-xl">🥇</span>}
                          {member.rank === 2 && <span className="text-xl">🥈</span>}
                          {member.rank === 3 && <span className="text-xl">🥉</span>}
                          {member.rank > 3 && <span className="text-neutral-500 text-xs">#{member.rank}</span>}
                        </div>

                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.username}
                            className="w-10 h-10 rounded-full border border-neutral-700 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full border border-neutral-700 bg-neutral-800 flex items-center justify-center text-[11px] font-bold text-neutral-400">
                            {member.username.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <span className="text-sm font-bold text-white">{member.username}</span>
                          <p className="text-[11px] text-neutral-400">
                            {member.messagesCount.toLocaleString()} messages &bull; {member.totalXp.toLocaleString()} XP total
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="w-full md:w-56 space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-fuchsia-400 font-bold">Niveau {member.level}</span>
                            <span className="text-neutral-400">
                              {member.currentLevelXp} / {member.nextLevelXp} XP ({member.progressPercentage}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className="h-full bg-fuchsia-500 rounded-full transition-all duration-500"
                              style={{ width: `${member.progressPercentage}%` }}
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
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Rank Card Designer (local preview only, not persisted) */}
        {activeTab === "card_designer" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-fuchsia-400" />
                <h3 className="text-base font-bold text-white">Aperçu visuel de carte de rang</h3>
              </div>
              <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                Aperçu local uniquement — la commande /rank répond avec un embed Discord standard,
                il n'existe pas (encore) de rendu d'image de carte personnalisée côté bot à sauvegarder.
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Thème d'Arrière-Plan</label>
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
                            ? "border-fuchsia-500 shadow-sm bg-neutral-800"
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
                  <label className="block font-semibold text-neutral-300 mb-1.5">Couleur d'Accent</label>
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
              </div>
            </div>

            <div className="lg:col-span-6 space-y-3">
              <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-fuchsia-400" />
                Rendu indicatif (concept, pas le vrai /rank)
              </span>

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
              >
                <div className="relative z-10 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-extrabold text-white">
                        {overview.topUser?.username || "Membre"}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-2xl font-black font-mono"
                        style={{ color: cardAccentColor }}
                      >
                        Lvl {overview.topUser?.level ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden border border-[var(--panel-border)] p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: "60%", backgroundColor: cardAccentColor, boxShadow: `0 0 12px ${cardAccentColor}` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Role Rewards */}
        {activeTab === "rewards" && (
          <div className="space-y-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-white">Ajouter un rôle récompense</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="Niveau"
                  value={newReward.level}
                  onChange={(e) => setNewReward((p) => ({ ...p, level: Number(e.target.value) }))}
                  className="h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white"
                />
                <div className="sm:col-span-2">
                  <RolePicker
                    value={newReward.roleId}
                    onChange={(id) => setNewReward((p) => ({ ...p, roleId: id }))}
                    guildId={currentGuildId}
                    placeholder="Choisir un rôle récompense ou saisir un ID..."
                    size="sm"
                  />
                </div>
                <button
                  onClick={addReward}
                  className="h-10 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>
              <p className="text-[10px] text-neutral-500">
                Clic droit sur un rôle dans Discord (mode développeur activé) → Copier l'identifiant.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.length === 0 ? (
                <p className="text-xs text-neutral-500 col-span-full text-center py-6">
                  Aucun palier de rôle configuré.
                </p>
              ) : (
                rewards.map((rw) => (
                  <div key={rw.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 font-mono font-bold text-xs text-fuchsia-400">
                        Niveau {rw.level}+
                      </span>
                      <button
                        onClick={() => removeReward(rw.id)}
                        className="text-neutral-500 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs font-mono text-neutral-300">Rôle #{rw.roleId}</p>
                    {rw.message && <p className="text-[11px] text-neutral-500">{rw.message}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Boosts & XP Settings */}
        {activeTab === "boosts" && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-fuchsia-400" />
                Réglages des Gains d'XP & Cooldowns
              </h3>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div>
                    <span className="font-bold text-white block">XP par message (min / max)</span>
                    <span className="text-neutral-500 text-[11px]">Un montant aléatoire est tiré entre ces deux bornes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={config.minXp}
                      onChange={(e) => setConfig((p) => ({ ...p, minXp: Number(e.target.value) }))}
                      onBlur={() => saveConfig({ minXp: config.minXp })}
                      className="w-16 h-9 rounded-xl bg-neutral-900 border border-neutral-700 text-center text-xs font-bold text-fuchsia-400"
                    />
                    <span className="text-neutral-500">—</span>
                    <input
                      type="number"
                      min={5}
                      max={200}
                      value={config.maxXp}
                      onChange={(e) => setConfig((p) => ({ ...p, maxXp: Number(e.target.value) }))}
                      onBlur={() => saveConfig({ maxXp: config.maxXp })}
                      className="w-16 h-9 rounded-xl bg-neutral-900 border border-neutral-700 text-center text-xs font-bold text-fuchsia-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div>
                    <span className="font-bold text-white block">Cooldown Anti-Spam</span>
                    <span className="text-neutral-500 text-[11px]">Délai minimum en secondes entre deux gains d'XP</span>
                  </div>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={config.cooldownSeconds}
                    onChange={(e) => setConfig((p) => ({ ...p, cooldownSeconds: Number(e.target.value) }))}
                    onBlur={() => saveConfig({ cooldownSeconds: config.cooldownSeconds })}
                    className="w-20 h-9 rounded-xl bg-neutral-900 border border-neutral-700 text-center text-xs font-bold text-fuchsia-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Salon d'annonce de Level-Up</label>
                  <select
                    value={config.levelUpChannelType}
                    onChange={(e) => saveConfig({ levelUpChannelType: e.target.value as LevelingConfig["levelUpChannelType"] })}
                    className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white mb-2"
                  >
                    <option value="same_channel">Salon du message</option>
                    <option value="specific_channel">Salon spécifique</option>
                    <option value="dm">Message privé</option>
                    <option value="disabled">Désactivé</option>
                  </select>
                  {config.levelUpChannelType === "specific_channel" && (
                    <div className="mt-2">
                      <ChannelPicker
                        value={config.levelUpChannelId}
                        onChange={(id) => {
                          setConfig((p) => ({ ...p, levelUpChannelId: id || null }));
                          saveConfig({ levelUpChannelId: id || null });
                        }}
                        guildId={currentGuildId}
                        placeholder="Sélectionner un salon ou saisir un ID..."
                        allowClear
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div>
                    <span className="font-bold text-white block">Autoriser les bots à gagner de l'XP</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveConfig({ allowBots: !config.allowBots })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      config.allowBots ? "bg-fuchsia-500 text-white" : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {config.allowBots ? "Activé" : "Désactivé"}
                  </button>
                </div>
              </div>
              {savingConfig && <p className="text-[10px] text-neutral-500">Enregistrement...</p>}
            </div>

            <LevelingBoostsPanel guildId={currentGuildId} boosts={boosts} disabled={isDemo} onChanged={load} />
          </div>
        )}

        {/* TAB 5: Blacklist */}
        {activeTab === "blacklist" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400" />
                Salons Exemptés d'XP
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ChannelPicker
                    value={newExcludedChannelId}
                    onChange={(id) => setNewExcludedChannelId(id)}
                    guildId={currentGuildId}
                    placeholder="Choisir un salon à exclure..."
                    size="sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={addExcludedChannel}
                  disabled={!newExcludedChannelId.trim()}
                  className="px-3 h-8 rounded-xl bg-rose-600/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {config.excludedChannelIds.length === 0 ? (
                  <p className="text-[11px] text-neutral-500">Aucun salon exclu.</p>
                ) : (
                  config.excludedChannelIds.map((id) => (
                    <div key={id} className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                      <span className="font-mono text-neutral-300">#{id}</span>
                      <button onClick={() => removeExcludedChannel(id)} className="text-neutral-500 hover:text-rose-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400" />
                Rôles Exemptés d'XP
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <RolePicker
                    value={newExcludedRoleId}
                    onChange={(id) => setNewExcludedRoleId(id)}
                    guildId={currentGuildId}
                    placeholder="Choisir un rôle à exclure..."
                    size="sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={addExcludedRole}
                  disabled={!newExcludedRoleId.trim()}
                  className="px-3 h-8 rounded-xl bg-rose-600/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {config.excludedRoleIds.length === 0 ? (
                  <p className="text-[11px] text-neutral-500">Aucun rôle exclu.</p>
                ) : (
                  config.excludedRoleIds.map((id) => (
                    <div key={id} className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                      <span className="font-mono text-neutral-300">@{id}</span>
                      <button onClick={() => removeExcludedRole(id)} className="text-neutral-500 hover:text-rose-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Adjust XP Admin Modal */}
        {selectedMember && (
          <div className="fixed inset-0 z-[var(--z-modal)] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
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
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Quantité d'XP à ajuster</label>
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
                  disabled={adjustSubmitting}
                  onClick={() => handleAdjustXp(false)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  - Retirer {xpDelta} XP
                </button>
                <button
                  type="button"
                  disabled={adjustSubmitting}
                  onClick={() => handleAdjustXp(true)}
                  className="flex-1 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
