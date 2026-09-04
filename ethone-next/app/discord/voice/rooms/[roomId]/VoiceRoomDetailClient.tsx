"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Edit2,
  Users,
  Crown,
  Trash2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Tv,
  Clock,
  Radio,
  Shield,
  UserX,
  UserCheck,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

interface RoomUser {
  id: string;
  tag: string;
  avatar?: string | null;
  joinedAt: string;
  isMuted?: boolean;
  isDeafened?: boolean;
  isStreaming?: boolean;
}

interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  actorId: string;
  actorTag: string;
  targetId?: string;
  targetTag?: string;
  details?: string;
}

interface TemporaryRoomDetail {
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
  allowedUserIds?: string[];
  blockedUserIds?: string[];
  whitelist?: string[];
  banlist?: string[];
  createdAt: string;
  status: "ACTIVE" | "EMPTY_COUNTDOWN" | "DELETED";
  currentUsers: RoomUser[];
  peakUsers: number;
  totalSecondsActive: number;
}

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export default function VoiceRoomDetailClient({ roomId }: { roomId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guildId") || "1128633164290596884";
  const { success, error: showError } = useToast();

  const [room, setRoom] = useState<TemporaryRoomDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "whitelist" | "banlist" | "timeline">("members");

  // Modals state
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isLimitOpen, setIsLimitOpen] = useState(false);
  const [newLimit, setNewLimit] = useState("5");

  // Whitelist / Banlist Add inputs
  const [targetUserId, setTargetUserId] = useState("");

  // Fetch room data
  const fetchData = useCallback(async () => {
    if (BOT_API_URL) {
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/rooms/${roomId}/details`);
        if (res.ok) {
          const data = await res.json();
          setRoom(data.room);
          setTimeline(data.timeline || []);
          return;
        }
      } catch {
        // Fallback
      }
    }

    // Demo fallback state
    const now = Date.now();
    setRoom({
      id: roomId,
      guildId,
      hubId: "personal_voice_2",
      hubName: "Personal Voice Rooms 2.0",
      name: "🎮 Salon de Test",
      ownerId: "usr_alex",
      ownerTag: "Alex#0001",
      userLimit: 5,
      bitrate: 96000,
      isLocked: false,
      isHidden: false,
      allowedUserIds: ["usr_lucas", "usr_sarah"],
      blockedUserIds: ["usr_troll"],
      whitelist: ["usr_lucas", "usr_sarah"],
      banlist: ["usr_troll"],
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
      ],
      peakUsers: 3,
      totalSecondsActive: 2700,
    });

    setTimeline([
      {
        id: "tl_1",
        type: "ROOM_CREATED",
        timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
        actorId: "usr_alex",
        actorTag: "Alex#0001",
        details: "Création via Panneau de Création 2.0",
      },
      {
        id: "tl_2",
        type: "USER_JOINED",
        timestamp: new Date(now - 1000 * 60 * 25).toISOString(),
        actorId: "usr_lucas",
        actorTag: "Lucas#1234",
      },
    ]);
  }, [guildId, roomId]);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  // Execute quick action
  const handleAction = async (action: string, value?: any, targetUser?: string) => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/rooms/${roomId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, value, targetUserId: targetUser }),
      });
      if (res.ok) {
        success("Action exécutée !");
        if (action === "delete" || action === "cleanup") {
          router.push(`/discord/voice?guildId=${guildId}`);
          return;
        }
        await fetchData();
        return;
      }
    } catch {
      // Local demo fallback
    }

    if (!room) return;
    if (action === "lock") setRoom({ ...room, isLocked: true });
    if (action === "unlock") setRoom({ ...room, isLocked: false });
    if (action === "rename" && typeof value === "string") setRoom({ ...room, name: value });
    if (action === "set_limit" && typeof value === "number") setRoom({ ...room, userLimit: value });
    if (action === "delete" || action === "cleanup") {
      router.push(`/discord/voice?guildId=${guildId}`);
    }
    success("Action exécutée (mode local) !");
  };

  // Whitelist manipulation
  const handleWhitelist = async (userId: string, action: "add" | "remove") => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/rooms/${roomId}/whitelist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        success(action === "add" ? "Membre ajouté à la Whitelist" : "Membre retiré de la Whitelist");
        setTargetUserId("");
        await fetchData();
        return;
      }
    } catch {
      // Fallback
    }

    if (!room) return;
    let list = [...(room.allowedUserIds || room.whitelist || [])];
    if (action === "add" && !list.includes(userId)) list.push(userId);
    if (action === "remove") list = list.filter((id) => id !== userId);
    setRoom({ ...room, allowedUserIds: list, whitelist: list });
    setTargetUserId("");
    success("Whitelist mise à jour !");
  };

  // Banlist manipulation
  const handleBanlist = async (userId: string, action: "add" | "remove") => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/rooms/${roomId}/banlist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        success(action === "add" ? "Membre banni et expulsé du salon" : "Membre débanni");
        setTargetUserId("");
        await fetchData();
        return;
      }
    } catch {
      // Fallback
    }

    if (!room) return;
    let list = [...(room.blockedUserIds || room.banlist || [])];
    if (action === "add" && !list.includes(userId)) list.push(userId);
    if (action === "remove") list = list.filter((id) => id !== userId);
    setRoom({
      ...room,
      blockedUserIds: list,
      banlist: list,
      currentUsers: room.currentUsers.filter((u) => u.id !== userId),
    });
    setTargetUserId("");
    success("Banlist mise à jour !");
  };

  if (loading) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Chargement du salon vocal...</span>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-12 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">Salon vocal introuvable</h3>
        <p className="text-xs text-zinc-400 mt-1 mb-4">Ce salon a peut-être été supprimé automatiquement à la fin de la session.</p>
        <Link
          href={`/discord/voice?guildId=${guildId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour aux Salons Vocaux</span>
        </Link>
      </div>
    );
  }

  const whitelist = room.allowedUserIds || room.whitelist || [];
  const banlist = room.blockedUserIds || room.banlist || [];

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Link
            href={`/discord/voice?guildId=${guildId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Retour aux Salons Vocaux</span>
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Radio className="h-6 w-6 text-emerald-400" />
              <span>{room.name}</span>
            </h1>
            {room.isLocked && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Lock className="h-3 w-3" />
                Verrouillé
              </span>
            )}
            {room.status === "EMPTY_COUNTDOWN" && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                <Clock className="h-3 w-3" />
                Compte à rebours de suppression
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Propriétaire : <span className="text-amber-400 font-semibold">{room.ownerTag}</span> • Hub : {room.hubName || "Personal Voice 2.0"} • Débit : {Math.round(room.bitrate / 1000)} kbps
          </p>
        </div>

        {/* Quick Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleAction(room.isLocked ? "unlock" : "lock")}
            className={cn(
              "flex h-9 px-3.5 items-center gap-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              room.isLocked
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
            )}
          >
            {room.isLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5 text-rose-400" />}
            <span>{room.isLocked ? "Déverrouiller" : "Verrouiller"}</span>
          </button>

          <button
            onClick={() => {
              setNewName(room.name);
              setIsRenameOpen(true);
            }}
            className="flex h-9 px-3.5 items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Renommer</span>
          </button>

          <button
            onClick={() => {
              setNewLimit(room.userLimit.toString());
              setIsLimitOpen(true);
            }}
            className="flex h-9 px-3.5 items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Limite ({room.userLimit > 0 ? room.userLimit : "∞"})</span>
          </button>

          <button
            onClick={() => handleAction("delete")}
            className="flex h-9 px-3.5 items-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Fermer le salon</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Membres Présents</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{room.currentUsers?.length || 0}</span>
            <span className="text-xs text-zinc-400">/ {room.userLimit > 0 ? room.userLimit : "illimité"}</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Whitelist</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{whitelist.length}</span>
            <span className="text-xs text-zinc-500">autorisés</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Banlist</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400">{banlist.length}</span>
            <span className="text-xs text-zinc-500">interdits</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Qualité Audio</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-400">{Math.round(room.bitrate / 1000)}</span>
            <span className="text-xs text-zinc-500">kbps</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
        <button
          onClick={() => setActiveTab("members")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeTab === "members" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
          )}
        >
          Participants ({room.currentUsers?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("whitelist")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeTab === "whitelist" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
          )}
        >
          Whitelist ({whitelist.length})
        </button>
        <button
          onClick={() => setActiveTab("banlist")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeTab === "banlist" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
          )}
        >
          Banlist ({banlist.length})
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeTab === "timeline" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
          )}
        >
          Historique & Timeline
        </button>
      </div>

      {/* TAB: Members */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 border-b border-zinc-800 text-zinc-400 font-semibold uppercase">
                <tr>
                  <th className="p-3.5">Membre</th>
                  <th className="p-3.5">Rôle dans le salon</th>
                  <th className="p-3.5">Rejoint</th>
                  <th className="p-3.5">Statut audio</th>
                  <th className="p-3.5 text-right">Modération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {(room.currentUsers || []).map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3.5 font-bold text-white flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>{user.tag}</span>
                    </td>
                    <td className="p-3.5">
                      {user.id === room.ownerId ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                          <Crown className="h-3 w-3" />
                          Propriétaire
                        </span>
                      ) : (
                        <span className="text-zinc-400">Participant</span>
                      )}
                    </td>
                    <td className="p-3.5 text-zinc-400">{new Date(user.joinedAt).toLocaleTimeString()}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        {user.isMuted ? (
                          <span className="text-rose-400 flex items-center gap-1"><MicOff className="h-3 w-3" /> Muet</span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1"><Mic className="h-3 w-3" /> Micro actif</span>
                        )}
                        {user.isStreaming && (
                          <span className="text-purple-400 flex items-center gap-1"><Tv className="h-3 w-3" /> En direct</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      {user.id !== room.ownerId && (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleAction("mute", !user.isMuted, user.id)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            {user.isMuted ? "Démuter" : "Muter"}
                          </button>
                          <button
                            onClick={() => handleAction("kick", undefined, user.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Expulser
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Whitelist */}
      {activeTab === "whitelist" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-500/20 bg-zinc-900/60 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span>Ajouter un membre en Whitelist</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Les membres en Whitelist peuvent toujours rejoindre le salon, même lorsqu'il est verrouillé.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="ID ou nom Discord de l'utilisateur"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="h-10 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 flex-1"
              />
              <button
                onClick={() => targetUserId.trim() && handleWhitelist(targetUserId.trim(), "add")}
                disabled={!targetUserId.trim()}
                className="flex h-10 px-5 items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter à la Whitelist</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Membres autorisés ({whitelist.length})
            </h4>
            {whitelist.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-2">Aucun membre dans la liste blanche.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {whitelist.map((id) => (
                  <div
                    key={id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs"
                  >
                    <span className="font-mono text-zinc-300 font-semibold">{id}</span>
                    <button
                      onClick={() => handleWhitelist(id, "remove")}
                      className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                      title="Retirer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Banlist */}
      {activeTab === "banlist" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-rose-500/20 bg-zinc-900/60 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserX className="h-4 w-4 text-rose-400" />
                <span>Bannir un membre du salon</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Bannit le membre du salon vocal et l'expulse instantanément s'il est déjà connecté.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="ID ou nom Discord de l'utilisateur"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="h-10 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 flex-1"
              />
              <button
                onClick={() => targetUserId.trim() && handleBanlist(targetUserId.trim(), "add")}
                disabled={!targetUserId.trim()}
                className="flex h-10 px-5 items-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                <UserX className="h-4 w-4" />
                <span>Bannir du salon</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Membres bannis ({banlist.length})
            </h4>
            {banlist.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-2">Aucun membre dans la liste noire.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {banlist.map((id) => (
                  <div
                    key={id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs"
                  >
                    <span className="font-mono text-rose-300 font-semibold">{id}</span>
                    <button
                      onClick={() => handleBanlist(id, "remove")}
                      className="text-zinc-500 hover:text-emerald-400 transition-colors p-1"
                      title="Débannir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Timeline */}
      {activeTab === "timeline" && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Événements du salon</h3>
          <div className="relative border-l border-zinc-800 ml-3 space-y-4 pl-4">
            {timeline.map((ev) => (
              <div key={ev.id} className="relative">
                <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <p className="text-xs text-white font-bold">{ev.type}</p>
                <p className="text-[11px] text-zinc-400">
                  Par <span className="text-zinc-300">{ev.actorTag}</span> • {new Date(ev.timestamp).toLocaleTimeString()}
                </p>
                {ev.details && <p className="text-xs text-zinc-500 mt-0.5">{ev.details}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {isRenameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Renommer le salon vocal</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nouveau nom"
              className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRenameOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  handleAction("rename", newName);
                  setIsRenameOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Limit Modal */}
      {isLimitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Modifier la limite de membres</h3>
            <input
              type="number"
              min={0}
              max={99}
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder="0 pour illimité, max 99"
              className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsLimitOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  handleAction("set_limit", parseInt(newLimit, 10) || 0);
                  setIsLimitOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
