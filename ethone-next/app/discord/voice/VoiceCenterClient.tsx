"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Radio,
  Users,
  Clock,
  Flame,
  BarChart3,
  Layers,
  Plus,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Crown,
  ChevronRight,
  Settings,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Shield,
  Zap,
  Mic,
  MicOff,
  Tv,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Volume2,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

interface VoiceHub {
  id: string;
  name: string;
  categoryId?: string | null;
  channelId: string;
  type: "voice" | "stage";
  namingTemplate: string;
  userLimit: number;
  bitrate: number;
  accessMode: "public" | "locked" | "role_only" | "invite_only";
  autoNumbering: boolean;
  enabled: boolean;
}

interface TemporaryRoom {
  id: string;
  guildId: string;
  hubId: string;
  hubName: string;
  name: string;
  ownerId: string;
  ownerTag: string;
  userLimit: number;
  bitrate: number;
  isLocked: boolean;
  isHidden: boolean;
  createdAt: string;
  status: "ACTIVE" | "EMPTY_COUNTDOWN" | "DELETED";
  currentUsers: Array<{
    id: string;
    tag: string;
    avatar?: string | null;
    joinedAt: string;
    isMuted?: boolean;
    isDeafened?: boolean;
    isStreaming?: boolean;
  }>;
  peakUsers: number;
  totalSecondsActive: number;
}

interface VoiceSession {
  id: string;
  userId: string;
  userTag: string;
  roomName: string;
  hubId: string;
  joinedAt: string;
  leftAt?: string | null;
  durationSeconds: number;
}

interface VoiceOverviewData {
  kpis: {
    activeVoiceChannelsCount: number;
    usersInVoiceCount: number;
    temporaryChannelsCount: number;
    sessionsTodayCount: number;
    peakConcurrentUsers: number;
    totalVoiceTimeMinutes: number;
    averageSessionMinutes: number;
  };
  hubs: VoiceHub[];
  activeRooms: TemporaryRoom[];
}

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "http://localhost:3001";

export default function VoiceCenterClient() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guildId") || "1128633164290596884";
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "hubs" | "rooms" | "analytics" | "automations">("overview");
  const [data, setData] = useState<VoiceOverviewData | null>(null);
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter / Search
  const [roomSearch, setRoomSearch] = useState("");

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardCategory, setWizardCategory] = useState("🔊 SALONS VOCAUX");
  const [wizardHubName, setWizardHubName] = useState("➕ Créer votre salon");
  const [wizardTemplate, setWizardTemplate] = useState("🎮 {username}'s Room");
  const [wizardLimit, setWizardLimit] = useState(5);

  // New Hub Modal
  const [isNewHubOpen, setIsNewHubOpen] = useState(false);
  const [newHubName, setNewHubName] = useState("");
  const [newHubTemplate, setNewHubTemplate] = useState("💬 {displayName}'s Room");
  const [newHubLimit, setNewHubLimit] = useState(0);
  const [newHubMode, setNewHubMode] = useState<"public" | "locked" | "role_only">("public");

  // Fetch Voice Overview
  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/overview`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        return;
      }
    } catch {
      // Fallback
    }

    // Default Seed Data Fallback
    const now = Date.now();
    setData({
      kpis: {
        activeVoiceChannelsCount: 2,
        usersInVoiceCount: 5,
        temporaryChannelsCount: 2,
        sessionsTodayCount: 28,
        peakConcurrentUsers: 14,
        totalVoiceTimeMinutes: 1840,
        averageSessionMinutes: 42,
      },
      hubs: [
        {
          id: "hub_gaming",
          name: "Gaming Hub",
          channelId: "vc_create_gaming",
          type: "voice",
          namingTemplate: "🎮 {username}'s Room",
          userLimit: 5,
          bitrate: 96000,
          accessMode: "public",
          autoNumbering: true,
          enabled: true,
        },
        {
          id: "hub_chill",
          name: "Chill & Talk",
          channelId: "vc_create_chill",
          type: "voice",
          namingTemplate: "💬 Salon de {displayName}",
          userLimit: 10,
          bitrate: 64000,
          accessMode: "public",
          autoNumbering: true,
          enabled: true,
        },
        {
          id: "hub_ranked",
          name: "Ranked / Tryhard",
          channelId: "vc_create_ranked",
          type: "voice",
          namingTemplate: "🏆 Ranked #{number}",
          userLimit: 3,
          bitrate: 128000,
          accessMode: "public",
          autoNumbering: true,
          enabled: true,
        },
        {
          id: "hub_vip",
          name: "Salon VIP Privé",
          channelId: "vc_create_vip",
          type: "voice",
          namingTemplate: "👑 VIP — {username}",
          userLimit: 0,
          bitrate: 128000,
          accessMode: "role_only",
          autoNumbering: false,
          enabled: true,
        },
      ],
      activeRooms: [
        {
          id: "room_alex_gaming",
          guildId,
          hubId: "hub_gaming",
          hubName: "Gaming Hub",
          name: "🎮 Alex's Room #1",
          ownerId: "usr_alex",
          ownerTag: "Alex#0001",
          userLimit: 5,
          bitrate: 96000,
          isLocked: false,
          isHidden: false,
          createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
          status: "ACTIVE",
          currentUsers: [
            {
              id: "usr_alex",
              tag: "Alex#0001",
              joinedAt: new Date(now - 1000 * 60 * 45).toISOString(),
              isMuted: false,
              isDeafened: false,
              isStreaming: true,
            },
            {
              id: "usr_lucas",
              tag: "Lucas#1234",
              joinedAt: new Date(now - 1000 * 60 * 25).toISOString(),
              isMuted: false,
              isDeafened: false,
              isStreaming: false,
            },
            {
              id: "usr_sarah",
              tag: "Sarah#5678",
              joinedAt: new Date(now - 1000 * 60 * 12).toISOString(),
              isMuted: true,
              isDeafened: false,
              isStreaming: false,
            },
          ],
          peakUsers: 4,
          totalSecondsActive: 2700,
        },
        {
          id: "room_chill_lounge",
          guildId,
          hubId: "hub_chill",
          hubName: "Chill & Talk",
          name: "💬 Salon de Marie #1",
          ownerId: "usr_marie",
          ownerTag: "Marie#9999",
          userLimit: 10,
          bitrate: 64000,
          isLocked: true,
          isHidden: false,
          createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
          status: "ACTIVE",
          currentUsers: [
            {
              id: "usr_marie",
              tag: "Marie#9999",
              joinedAt: new Date(now - 1000 * 60 * 90).toISOString(),
              isMuted: false,
              isDeafened: false,
              isStreaming: false,
            },
            {
              id: "usr_thomas",
              tag: "Thomas#4321",
              joinedAt: new Date(now - 1000 * 60 * 40).toISOString(),
              isMuted: false,
              isDeafened: false,
              isStreaming: false,
            },
          ],
          peakUsers: 2,
          totalSecondsActive: 5400,
        },
      ],
    });

    setSessions([
      {
        id: "sess_1",
        userId: "usr_alex",
        userTag: "Alex#0001",
        roomName: "🎮 Alex's Room #1",
        hubId: "hub_gaming",
        joinedAt: new Date(now - 1000 * 60 * 45).toISOString(),
        durationSeconds: 2700,
      },
      {
        id: "sess_2",
        userId: "usr_lucas",
        userTag: "Lucas#1234",
        roomName: "🎮 Alex's Room #1",
        hubId: "hub_gaming",
        joinedAt: new Date(now - 1000 * 60 * 25).toISOString(),
        durationSeconds: 1500,
      },
      {
        id: "sess_3",
        userId: "usr_david",
        userTag: "David#7777",
        roomName: "🏆 Ranked #1",
        hubId: "hub_ranked",
        joinedAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        leftAt: new Date(now - 1000 * 60 * 60).toISOString(),
        durationSeconds: 7200,
      },
    ]);
  }, [guildId]);

  useEffect(() => {
    fetchOverview().finally(() => setLoading(false));
  }, [fetchOverview]);

  // Execute Room action
  const handleRoomAction = async (roomId: string, action: string) => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/rooms/${roomId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        success("Action exécutée !");
        await fetchOverview();
        return;
      }
    } catch {
      // Local fallback
    }

    if (!data) return;
    const updatedRooms = data.activeRooms.map((r) => {
      if (r.id === roomId) {
        if (action === "lock") return { ...r, isLocked: true };
        if (action === "unlock") return { ...r, isLocked: false };
      }
      return r;
    }).filter((r) => !(r.id === roomId && action === "delete"));

    setData({ ...data, activeRooms: updatedRooms });
    success("Action appliquée !");
  };

  // Run One-Click Setup Wizard
  const handleCompleteWizard = async () => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryName: wizardCategory,
          hubName: wizardHubName,
          template: wizardTemplate,
        }),
      });

      if (res.ok) {
        success("Salons vocaux configurés avec succès sur Discord !");
        setIsWizardOpen(false);
        await fetchOverview();
        return;
      }
    } catch {
      // Local demo fallback
    }

    // Local addition
    if (data) {
      const newHub: VoiceHub = {
        id: "hub_" + Date.now(),
        name: wizardHubName.replace("➕ ", "") + " Hub",
        channelId: "vc_new_" + Date.now(),
        type: "voice",
        namingTemplate: wizardTemplate,
        userLimit: wizardLimit,
        bitrate: 64000,
        accessMode: "public",
        autoNumbering: true,
        enabled: true,
      };
      setData({ ...data, hubs: [...data.hubs, newHub] });
    }

    success("Configuration terminée avec succès !");
    setIsWizardOpen(false);
  };

  // Add Hub
  const handleCreateHub = async () => {
    if (!newHubName.trim()) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/hubs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newHubName,
          namingTemplate: newHubTemplate,
          userLimit: newHubLimit,
          accessMode: newHubMode,
        }),
      });
      if (res.ok) {
        success("Hub vocal créé !");
        setIsNewHubOpen(false);
        await fetchOverview();
        return;
      }
    } catch {
      // Local fallback
    }

    if (data) {
      const hub: VoiceHub = {
        id: "hub_" + Date.now(),
        name: newHubName,
        channelId: "channel_" + Date.now(),
        type: "voice",
        namingTemplate: newHubTemplate,
        userLimit: newHubLimit,
        bitrate: 64000,
        accessMode: newHubMode,
        autoNumbering: true,
        enabled: true,
      };
      setData({ ...data, hubs: [...data.hubs, hub] });
    }

    success("Nouveau Hub ajouté !");
    setIsNewHubOpen(false);
  };

  // Delete Hub
  const handleDeleteHub = async (hubId: string) => {
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/hubs/${hubId}`, { method: "DELETE" });
    } catch {
      // Ignore
    }
    if (data) {
      setData({ ...data, hubs: data.hubs.filter((h) => h.id !== hubId) });
    }
    success("Hub supprimé");
  };

  if (loading || !data) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Chargement du Voice Center...</span>
        </div>
      </div>
    );
  }

  const filteredRooms = data.activeRooms.filter(
    (r) =>
      r.name.toLowerCase().includes(roomSearch.toLowerCase()) ||
      r.ownerTag.toLowerCase().includes(roomSearch.toLowerCase()) ||
      r.hubName.toLowerCase().includes(roomSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Radio className="h-4 w-4 animate-pulse" />
            <span className="uppercase tracking-wider">Voice Channels 2.0 • Live Hub</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            Gestion &amp; Salons Vocaux Temporaires
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Create, manage and automate your Discord voice experience.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setWizardStep(1);
              setIsWizardOpen(true);
            }}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Setup en 1 clic</span>
          </button>

          <Link
            href={`/discord/voice/settings?guildId=${guildId}`}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Paramètres</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Salons Actifs</span>
            <Radio className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{data.kpis.activeVoiceChannelsCount}</p>
          <span className="text-[10px] text-zinc-500">Salons vocaux ouverts</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">En Vocal</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-400 mt-2">{data.kpis.usersInVoiceCount}</p>
          <span className="text-[10px] text-zinc-500">Utilisateurs connectés</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Temporaires</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{data.kpis.temporaryChannelsCount}</p>
          <span className="text-[10px] text-zinc-500">Join-to-Create actifs</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sessions</span>
            <Clock className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400 mt-2">{data.kpis.sessionsTodayCount}</p>
          <span className="text-[10px] text-zinc-500">Aujourd&apos;hui</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pic Connectés</span>
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          <p className="text-2xl font-black text-orange-400 mt-2">{data.kpis.peakConcurrentUsers}</p>
          <span className="text-[10px] text-zinc-500">Simultanés maximum</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Moyenne</span>
            <BarChart3 className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-2">{data.kpis.averageSessionMinutes} min</p>
          <span className="text-[10px] text-zinc-500">Durée par session</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
            activeTab === "overview"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Radio className="h-3.5 w-3.5" />
          <span>Vue d&apos;Ensemble &amp; Live Map</span>
        </button>

        <button
          onClick={() => setActiveTab("hubs")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
            activeTab === "hubs"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Voice Hubs ({data.hubs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("rooms")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
            activeTab === "rooms"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Salons Actifs ({data.activeRooms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
            activeTab === "analytics"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Statistiques &amp; Sessions</span>
        </button>

        <button
          onClick={() => setActiveTab("automations")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
            activeTab === "automations"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Automatisations</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & LIVE VOICE MAP */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Live Voice Map */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 backdrop-blur-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-white/5">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live Voice Map — Salons Actifs en Temps Réel</span>
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Visualisation interactive des salons temporaires créés et des membres connectés.
                </p>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                Synchronisation Realtime : active
              </span>
            </div>

            {data.activeRooms.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                <Radio className="h-8 w-8 mx-auto mb-2 text-zinc-600 opacity-40" />
                <p className="font-semibold text-zinc-400">Aucun salon temporaire actif pour le moment.</p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  Rejoignez l&apos;un des salons Hub sur Discord pour déclencher la création automatique.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.activeRooms.map((room) => (
                  <div
                    key={room.id}
                    className={cn(
                      "rounded-2xl border p-4.5 transition-all",
                      room.isLocked
                        ? "border-red-500/20 bg-red-500/[0.03]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-4 w-4 text-emerald-400" />
                          <h3 className="text-xs font-bold text-white">{room.name}</h3>
                          {room.isLocked && <Lock className="h-3 w-3 text-red-400" />}
                          {room.isHidden && <EyeOff className="h-3 w-3 text-purple-400" />}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Hub : <span className="text-zinc-300 font-medium">{room.hubName}</span> • Créateur :{" "}
                          <strong className="text-amber-300">{room.ownerTag}</strong>
                        </p>
                      </div>

                      <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-mono font-bold text-zinc-300 border border-white/10">
                        {room.currentUsers.length} / {room.userLimit === 0 ? "∞" : room.userLimit}
                      </span>
                    </div>

                    {/* Capacity visual bar */}
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-3">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          room.userLimit > 0 && room.currentUsers.length >= room.userLimit
                            ? "bg-red-500"
                            : "bg-emerald-400"
                        )}
                        style={{
                          width: `${room.userLimit > 0 ? Math.min(100, (room.currentUsers.length / room.userLimit) * 100) : 40}%`,
                        }}
                      />
                    </div>

                    {/* Connected Users List */}
                    <div className="mt-3.5 pt-3 border-t border-white/5 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {room.currentUsers.map((user) => (
                          <div
                            key={user.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1 text-[11px] text-zinc-200"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>{user.tag}</span>
                            {user.isStreaming && <Tv className="h-2.5 w-2.5 text-purple-400 ml-0.5" />}
                            {user.isMuted && <MicOff className="h-2.5 w-2.5 text-red-400 ml-0.5" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-4 flex items-center justify-between pt-2">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Bitrate : {Math.round(room.bitrate / 1000)} kbps
                      </span>

                      <Link
                        href={`/discord/voice/rooms/${room.id}?guildId=${guildId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <span>Gérer ce salon</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VOICE HUBS */}
      {activeTab === "hubs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Hubs de Création Configurés</h2>
              <p className="text-[11px] text-zinc-400">
                Chaque Hub agit comme un salon déclencheur &quot;Join-to-Create&quot; avec ses propres règles.
              </p>
            </div>

            <button
              onClick={() => setIsNewHubOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 text-xs font-bold text-white hover:bg-emerald-600 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nouveau Hub</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.hubs.map((hub) => (
              <div
                key={hub.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-indigo-400" />
                      {hub.name}
                    </span>
                    <span className="rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {hub.accessMode}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-[11px] text-zinc-400">
                    <p>
                      Template : <code className="text-zinc-200 font-mono">{hub.namingTemplate}</code>
                    </p>
                    <p>
                      Capacité : <strong className="text-zinc-200">{hub.userLimit === 0 ? "Illimitée" : `${hub.userLimit} membres`}</strong>
                    </p>
                    <p>
                      Bitrate : <strong className="text-zinc-200">{Math.round(hub.bitrate / 1000)} kbps</strong>
                    </p>
                    <p>
                      Numérotation auto : <strong className="text-zinc-200">{hub.autoNumbering ? "Oui (#1, #2...)" : "Non"}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Actif
                  </span>

                  <button
                    onClick={() => handleDeleteHub(hub.id)}
                    className="text-zinc-500 hover:text-red-400 transition-colors text-xs font-semibold cursor-pointer"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE ROOMS LIST */}
      {activeTab === "rooms" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">Salons Temporaires Actifs</h2>
              <p className="text-[11px] text-zinc-400">
                Gérez en direct les salons créés par vos membres.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Rechercher un salon ou créateur..."
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.02] text-[11px] text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nom du Salon</th>
                  <th className="py-3 px-4">Hub Parent</th>
                  <th className="py-3 px-4">Créateur / Propriétaire</th>
                  <th className="py-3 px-4">Membres</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      Aucun salon temporaire correspondant.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => (
                    <tr key={room.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{room.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">{room.hubName}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-amber-300 flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          {room.ownerTag}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {room.currentUsers.length} / {room.userLimit === 0 ? "∞" : room.userLimit}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-bold border",
                            room.isLocked
                              ? "bg-red-500/15 text-red-300 border-red-500/30"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          )}
                        >
                          {room.isLocked ? "Verrouillé" : "Ouvert"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRoomAction(room.id, room.isLocked ? "unlock" : "lock")}
                            className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-zinc-300 cursor-pointer"
                            title={room.isLocked ? "Déverrouiller" : "Verrouiller"}
                          >
                            {room.isLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          </button>

                          <Link
                            href={`/discord/voice/rooms/${room.id}?guildId=${guildId}`}
                            className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            title="Gérer"
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </Link>

                          <button
                            onClick={() => handleRoomAction(room.id, "delete")}
                            className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ANALYTICS & SESSIONS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Hubs Ranking */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Hubs les plus utilisés</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="font-semibold text-white">🎮 Gaming Hub</span>
                  <span className="font-mono text-emerald-400 font-bold">42h d&apos;écoute</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="font-semibold text-white">💬 Chill &amp; Talk</span>
                  <span className="font-mono text-cyan-400 font-bold">31h d&apos;écoute</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="font-semibold text-white">🏆 Ranked Hub</span>
                  <span className="font-mono text-purple-400 font-bold">18h d&apos;écoute</span>
                </div>
              </div>
            </div>

            {/* Peak Hours Simulation */}
            <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Heures de pointe (Activité 24h)</h3>
              <div className="grid grid-cols-12 gap-1.5 pt-4">
                {[12, 18, 35, 60, 85, 95, 80, 45, 30, 20, 10, 5].map((val, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <div className="w-full bg-white/5 rounded-t-lg h-24 flex items-end">
                      <div
                        className="w-full bg-emerald-500 rounded-t-lg transition-all"
                        style={{ height: `${val}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500">{idx * 2}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Historical Sessions Table */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Dernières Sessions Vocales Enregistrées</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-[10px] text-zinc-400 uppercase font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Membre</th>
                    <th className="py-2.5 px-3">Salon</th>
                    <th className="py-2.5 px-3">Début</th>
                    <th className="py-2.5 px-3">Durée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-300">
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 px-3 font-semibold text-white">{s.userTag}</td>
                      <td className="py-2.5 px-3 text-zinc-400">{s.roomName}</td>
                      <td className="py-2.5 px-3 font-mono text-zinc-400">
                        {new Date(s.joinedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">
                        {Math.round(s.durationSeconds / 60)} min
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUTOMATIONS */}
      {activeTab === "automations" && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h2 className="text-sm font-bold text-white">Règles d&apos;Automatisation Vocales</h2>
              <p className="text-[11px] text-zinc-400">
                Attribuez automatiquement des rôles ou envoyez des messages lors d&apos;actions vocales.
              </p>
            </div>
            <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Module Actif
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Attribution du rôle @En Vocal</p>
                  <p className="text-[11px] text-zinc-400">
                    Déclencheur : <code className="text-cyan-300">USER_JOIN</code> ➔ Action : Donne le rôle et le retire à la déconnexion.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-400">🟢 Activé</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Journalisation Audit Center 2.0</p>
                  <p className="text-[11px] text-zinc-400">
                    Déclencheur : <code className="text-purple-300">ROOM_CREATED / ROOM_DELETED</code> ➔ Trace l&apos;événement dans les logs.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-400">🟢 Activé</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ONE-CLICK SETUP WIZARD */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900 p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Setup Vocal en 1 Clic</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">Étape {wizardStep} / 3</span>
            </div>

            {wizardStep === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-300">
                  Choisissez la catégorie Discord sous laquelle vos salons temporaires seront créés.
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Nom de la catégorie Discord</label>
                  <input
                    type="text"
                    value={wizardCategory}
                    onChange={(e) => setWizardCategory(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-300">
                  Définissez le salon déclencheur &quot;Join-to-Create&quot; et le modèle de nommage.
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Salon déclencheur</label>
                  <input
                    type="text"
                    value={wizardHubName}
                    onChange={(e) => setWizardHubName(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Modèle de nom des salons créés</label>
                  <input
                    type="text"
                    value={wizardTemplate}
                    onChange={(e) => setWizardTemplate(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-300">
                  Prévisualisation de votre architecture vocale avant application :
                </p>
                <div className="p-4 rounded-2xl border border-white/10 bg-black/40 font-mono text-xs space-y-1 text-zinc-300">
                  <p className="text-zinc-500">📁 {wizardCategory}</p>
                  <p className="pl-4 text-emerald-400">🔊 {wizardHubName}</p>
                  <p className="pl-8 text-zinc-400">↳ 🎮 Alex&apos;s Room (créé automatiquement)</p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-3 border-t border-white/10">
              <button
                onClick={() => {
                  if (wizardStep > 1) setWizardStep((p) => p - 1);
                  else setIsWizardOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {wizardStep === 1 ? "Annuler" : "Précédent"}
              </button>

              <button
                onClick={() => {
                  if (wizardStep < 3) setWizardStep((p) => p + 1);
                  else handleCompleteWizard();
                }}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-xs font-bold text-white hover:bg-emerald-600 transition-all cursor-pointer"
              >
                {wizardStep === 3 ? "Appliquer sur Discord" : "Suivant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NEW HUB */}
      {isNewHubOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Créer un nouveau Voice Hub</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Nom du Hub</label>
              <input
                type="text"
                placeholder="Ex: Study & Focus"
                value={newHubName}
                onChange={(e) => setNewHubName(e.target.value)}
                className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Modèle de nom</label>
              <input
                type="text"
                value={newHubTemplate}
                onChange={(e) => setNewHubTemplate(e.target.value)}
                className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Capacité (0 = illimitée)</label>
              <input
                type="number"
                min="0"
                max="99"
                value={newHubLimit}
                onChange={(e) => setNewHubLimit(parseInt(e.target.value, 10) || 0)}
                className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsNewHubOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateHub}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-xs font-bold text-white hover:bg-emerald-600 transition-all cursor-pointer"
              >
                Créer le Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
