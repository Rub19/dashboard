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
  allowedUserIds: string[];
  blockedUserIds: string[];
  createdAt: string;
  status: "ACTIVE" | "EMPTY_COUNTDOWN" | "DELETED";
  currentUsers: RoomUser[];
  peakUsers: number;
  totalSecondsActive: number;
}

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "http://localhost:3001";

export default function VoiceRoomDetailClient({ roomId }: { roomId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guildId") || "1128633164290596884";
  const { success, error: showError } = useToast();

  const [room, setRoom] = useState<TemporaryRoomDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isLimitOpen, setIsLimitOpen] = useState(false);
  const [newLimit, setNewLimit] = useState("5");
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferTargetTag, setTransferTargetTag] = useState("");

  // Allow / Block inputs
  const [newAllowedId, setNewAllowedId] = useState("");
  const [newBlockedId, setNewBlockedId] = useState("");

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/rooms/${roomId}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);
        setTimeline(data.timeline || []);
        return;
      }
    } catch {
      // Fallback demo room
    }

    // Demo fallback state
    setRoom({
      id: roomId,
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
      allowedUserIds: ["usr_vip_friend"],
      blockedUserIds: ["usr_troll_1"],
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      status: "ACTIVE",
      currentUsers: [
        {
          id: "usr_alex",
          tag: "Alex#0001",
          joinedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          isMuted: false,
          isDeafened: false,
          isStreaming: true,
        },
        {
          id: "usr_lucas",
          tag: "Lucas#1234",
          joinedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
          isMuted: false,
          isDeafened: false,
          isStreaming: false,
        },
        {
          id: "usr_sarah",
          tag: "Sarah#5678",
          joinedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          isMuted: true,
          isDeafened: false,
          isStreaming: false,
        },
      ],
      peakUsers: 4,
      totalSecondsActive: 2700,
    });

    setTimeline([
      {
        id: "tl_1",
        type: "ROOM_CREATED",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        actorId: "usr_alex",
        actorTag: "Alex#0001",
        details: "Création automatique via Join-to-Create (Gaming Hub)",
      },
      {
        id: "tl_2",
        type: "USER_JOINED",
        timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        actorId: "usr_lucas",
        actorTag: "Lucas#1234",
      },
      {
        id: "tl_3",
        type: "USER_JOINED",
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        actorId: "usr_sarah",
        actorTag: "Sarah#5678",
      },
    ]);
  }, [guildId, roomId]);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  // Execute room action
  const handleAction = async (action: string, value?: any, targetUserId?: string, targetUserTag?: string) => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/rooms/${roomId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, value, targetUserId, targetUserTag }),
      });

      if (res.ok) {
        success("Action exécutée avec succès");
        if (action === "delete") {
          router.push(`/discord/voice?guildId=${guildId}`);
          return;
        }
        await fetchData();
        return;
      }
    } catch {
      // Local demo fallback
    }

    // Local state fallback for preview
    if (!room) return;
    const updated = { ...room };
    if (action === "lock") updated.isLocked = true;
    if (action === "unlock") updated.isLocked = false;
    if (action === "hide") updated.isHidden = true;
    if (action === "unhide") updated.isHidden = false;
    if (action === "rename" && value) updated.name = value;
    if (action === "set_limit" && value !== undefined) updated.userLimit = parseInt(value, 10);
    if (action === "transfer" && targetUserId) {
      updated.ownerId = targetUserId;
      updated.ownerTag = targetUserTag || targetUserId;
    }
    if (action === "kick" && targetUserId) {
      updated.currentUsers = updated.currentUsers.filter((u) => u.id !== targetUserId);
    }
    if (action === "delete") {
      success("Salon vocal supprimé");
      router.push(`/discord/voice?guildId=${guildId}`);
      return;
    }

    setRoom(updated);
    success("Action appliquée");
  };

  const handleAddAllowed = () => {
    if (!newAllowedId.trim() || !room) return;
    const updatedAllowed = [...room.allowedUserIds, newAllowedId.trim()];
    setRoom({ ...room, allowedUserIds: updatedAllowed });
    setNewAllowedId("");
    success(`Utilisateur ${newAllowedId} ajouté à la liste autorisée`);
  };

  const handleRemoveAllowed = (id: string) => {
    if (!room) return;
    setRoom({ ...room, allowedUserIds: room.allowedUserIds.filter((u) => u !== id) });
    success("Utilisateur retiré");
  };

  const handleAddBlocked = () => {
    if (!newBlockedId.trim() || !room) return;
    const updatedBlocked = [...room.blockedUserIds, newBlockedId.trim()];
    setRoom({ ...room, blockedUserIds: updatedBlocked });
    setNewBlockedId("");
    success(`Utilisateur ${newBlockedId} bloqué`);
  };

  const handleRemoveBlocked = (id: string) => {
    if (!room) return;
    setRoom({ ...room, blockedUserIds: room.blockedUserIds.filter((u) => u !== id) });
    success("Blocage levé");
  };

  if (loading || !room) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Chargement du salon vocal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/discord/voice?guildId=${guildId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Retour aux Salons Vocaux</span>
          </Link>
          <div className="flex items-center gap-2.5 mt-2">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{room.name}</span>
            </h1>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                room.isLocked
                  ? "bg-red-500/15 text-red-300 border-red-500/30"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              )}
            >
              {room.isLocked ? "Verrouillé" : "Ouvert"}
            </span>
            {room.isHidden && (
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                Masqué
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Hub source : <strong className="text-zinc-200">{room.hubName}</strong> • ID : <code className="text-zinc-400">{room.id}</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchData().finally(() => setRefreshing(false));
            }}
            disabled={refreshing}
            className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span>Actualiser</span>
          </button>

          <button
            onClick={() => handleAction("delete")}
            className="flex h-9 items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 text-xs font-bold text-red-300 hover:bg-red-500/20 transition-all cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Supprimer le salon</span>
          </button>
        </div>
      </div>

      {/* Control Strip & Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => handleAction(room.isLocked ? "unlock" : "lock")}
          className={cn(
            "flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer",
            room.isLocked
              ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
              : "border-white/10 bg-white/[0.02] text-zinc-300 hover:bg-white/5 hover:text-white"
          )}
        >
          <div className="flex items-center gap-2.5">
            {room.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4 text-emerald-400" />}
            <span className="text-xs font-bold">{room.isLocked ? "Déverrouiller" : "Verrouiller"}</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
        </button>

        <button
          onClick={() => handleAction(room.isHidden ? "unhide" : "hide")}
          className={cn(
            "flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer",
            room.isHidden
              ? "border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
              : "border-white/10 bg-white/[0.02] text-zinc-300 hover:bg-white/5 hover:text-white"
          )}
        >
          <div className="flex items-center gap-2.5">
            {room.isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-purple-400" />}
            <span className="text-xs font-bold">{room.isHidden ? "Rendre visible" : "Masquer salon"}</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
        </button>

        <button
          onClick={() => {
            setNewName(room.name);
            setIsRenameOpen(true);
          }}
          className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] text-zinc-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Edit2 className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold">Renommer</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
        </button>

        <button
          onClick={() => {
            setNewLimit(room.userLimit.toString());
            setIsLimitOpen(true);
          }}
          className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] text-zinc-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold">Limite ({room.userLimit === 0 ? "∞" : room.userLimit})</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
        </button>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Members & Access */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Members Card */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Radio className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Membres Actuellement Connectés</h2>
                  <p className="text-[11px] text-zinc-400">
                    {room.currentUsers.length} / {room.userLimit === 0 ? "illimité" : room.userLimit} membres
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Peak : {room.peakUsers} membres</span>
            </div>

            {room.currentUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                <Users className="h-8 w-8 mx-auto mb-2 text-zinc-600 opacity-50" />
                <p>Aucun utilisateur présent dans ce salon actuellement.</p>
                <p className="text-[11px] text-zinc-600 mt-1">Le salon sera supprimé automatiquement s&apos;il reste vide.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {room.currentUsers.map((user) => {
                  const isOwner = user.id === room.ownerId;
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 font-bold text-xs text-white overflow-hidden border border-white/10">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.tag} className="h-full w-full object-cover" />
                          ) : (
                            user.tag.slice(0, 2).toUpperCase()
                          )}
                          {isOwner && (
                            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] text-black shadow">
                              👑
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-white">{user.tag}</p>
                            {isOwner && (
                              <span className="rounded px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Propriétaire
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-400 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(user.joinedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {user.isStreaming && (
                              <span className="flex items-center gap-1 text-purple-400">
                                <Tv className="h-3 w-3" /> En Stream
                              </span>
                            )}
                            {user.isMuted ? (
                              <span className="flex items-center gap-1 text-red-400">
                                <MicOff className="h-3 w-3" /> Mute
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-emerald-400">
                                <Mic className="h-3 w-3" /> Micro actif
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isOwner && (
                          <button
                            onClick={() => {
                              setTransferTargetId(user.id);
                              setTransferTargetTag(user.tag);
                              setIsTransferOpen(true);
                            }}
                            className="flex h-7 items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
                          >
                            <Crown className="h-2.5 w-2.5" />
                            <span>Transférer</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleAction("kick", undefined, user.id)}
                          className="flex h-7 items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/5 px-2 text-[10px] font-semibold text-red-400 hover:bg-red-500/15 transition-all cursor-pointer"
                        >
                          <UserX className="h-2.5 w-2.5" />
                          <span>Expulser</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Access Control: Allowlist & Blocklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Allowlist */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Membres Autorisés (Whitelist)</h3>
              </div>
              <p className="text-[11px] text-zinc-400">Peuvent rejoindre même si le salon est verrouillé ou sur invitation.</p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ID ou tag Discord..."
                  value={newAllowedId}
                  onChange={(e) => setNewAllowedId(e.target.value)}
                  className="h-8 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500/50"
                />
                <button
                  onClick={handleAddAllowed}
                  className="flex h-8 items-center gap-1 rounded-xl bg-emerald-500 px-3 text-xs font-bold text-white hover:bg-emerald-600 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>

              <div className="space-y-1.5 pt-2">
                {room.allowedUserIds.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic">Aucun membre spécifiquement autorisé.</p>
                ) : (
                  room.allowedUserIds.map((id) => (
                    <div
                      key={id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-300"
                    >
                      <code className="text-[11px] text-emerald-300">{id}</code>
                      <button
                        onClick={() => handleRemoveAllowed(id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Blocklist */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl space-y-3">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Membres Bloqués (Blacklist)</h3>
              </div>
              <p className="text-[11px] text-zinc-400">Accès et connexion strictement interdits à ce salon.</p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ID ou tag Discord..."
                  value={newBlockedId}
                  onChange={(e) => setNewBlockedId(e.target.value)}
                  className="h-8 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-red-500/50"
                />
                <button
                  onClick={handleAddBlocked}
                  className="flex h-8 items-center gap-1 rounded-xl bg-red-500 px-3 text-xs font-bold text-white hover:bg-red-600 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Bloquer</span>
                </button>
              </div>

              <div className="space-y-1.5 pt-2">
                {room.blockedUserIds.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic">Aucun membre bloqué.</p>
                ) : (
                  room.blockedUserIds.map((id) => (
                    <div
                      key={id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-300"
                    >
                      <code className="text-[11px] text-red-300">{id}</code>
                      <button
                        onClick={() => handleRemoveBlocked(id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Metadata & Event Timeline */}
        <div className="space-y-6">
          {/* Room Specs Card */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Spécifications du Salon</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Propriétaire</span>
                <span className="font-semibold text-amber-300 flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  {room.ownerTag}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Créé le</span>
                <span className="font-mono text-zinc-300">
                  {new Date(room.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Bitrate</span>
                <span className="font-mono text-zinc-300">{Math.round(room.bitrate / 1000)} kbps</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Limite configurée</span>
                <span className="font-semibold text-zinc-200">
                  {room.userLimit === 0 ? "Illimitée" : `${room.userLimit} membres`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Hub parent</span>
                <span className="font-semibold text-indigo-400">{room.hubName}</span>
              </div>
            </div>
          </div>

          {/* Chronological Timeline Card */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                <span>Journal d&apos;Événements</span>
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">{timeline.length} logs</span>
            </div>

            <div className="relative pl-4 space-y-4 border-l border-white/10 mt-2">
              {timeline.map((event) => (
                <div key={event.id} className="relative text-xs space-y-0.5">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-emerald-400 shadow" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">{event.type.replace(/_/g, " ")}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(event.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Par <strong className="text-zinc-300">{event.actorTag}</strong>
                    {event.details && ` • ${event.details}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rename Modal */}
      {isRenameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Renommer le salon vocal</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none focus:border-cyan-400"
              placeholder="Ex: 🎮 Alex's Room"
            />
            <div className="flex justify-end gap-2 pt-2">
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
                className="px-4 py-2 rounded-xl bg-cyan-500 text-xs font-bold text-black hover:bg-cyan-400 transition-all cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Limit Modal */}
      {isLimitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Modifier la limite de membres</h3>
            <p className="text-xs text-zinc-400">Entrez 0 pour une capacité illimitée (max 99).</p>
            <input
              type="number"
              min="0"
              max="99"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none focus:border-amber-400"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsLimitOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  handleAction("set_limit", newLimit);
                  setIsLimitOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-xs font-bold text-black hover:bg-amber-400 transition-all cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Transférer la propriété du salon</h3>
            <p className="text-xs text-zinc-400">
              Êtes-vous sûr de vouloir transférer les droits de propriétaire à <strong className="text-amber-300">{transferTargetTag}</strong> ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsTransferOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  handleAction("transfer", undefined, transferTargetId, transferTargetTag);
                  setIsTransferOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-xs font-bold text-black hover:bg-amber-400 transition-all cursor-pointer"
              >
                Confirmer le transfert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
