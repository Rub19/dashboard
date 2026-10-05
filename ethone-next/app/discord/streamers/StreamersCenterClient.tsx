"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Radio,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  AlertTriangle,
  Bot,
  Bell,
  Users,
  Check,
  X,
  SlidersHorizontal,
  Search,
  ArrowLeft,
  Eye,
  Sliders,
  Flame,
  ShieldCheck,
  Play,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { confirmDialog } from "@/lib/confirmDialog";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { useDiscordSync } from "@/lib/useDiscordSync";
import { cn } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import ChannelPicker from "@/components/discord/ChannelPicker";
import RolePicker from "@/components/discord/RolePicker";
import { formatApiError } from "@/lib/format-error";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export type StreamPlatform = "twitch" | "youtube" | "kick";
export type StreamerPingMode = "default" | "none" | "here" | "everyone" | "role";

export interface StreamerItem {
  id: string;
  guildId: string;
  platform: StreamPlatform;
  username: string;
  displayName: string;
  channelId: string | null;
  pingMode: StreamerPingMode;
  pingRoleId: string | null;
  discordUserId: string | null;
  gameFilter: string | null;
  minViewers: number;
  customColor: string | null;
  paused: boolean;
  customMessage: string | null;
  isLive: boolean;
  title: string | null;
  game: string | null;
  viewers: number | null;
  thumbnailUrl: string | null;
  avatarUrl: string | null;
  streamUrl: string;
  lastAlertChannelId: string | null;
  lastAlertMessageId: string | null;
  lastLiveAt: string | null;
  lastStreamId: string | null;
  createdAt: string;
}

export interface StreamerConfig {
  guildId: string;
  enabled: boolean;
  // Salons
  defaultChannelId: string | null;
  twitchChannelId: string | null;
  youtubeChannelId: string | null;
  kickChannelId: string | null;
  // Pings
  defaultPing: "none" | "here" | "everyone" | "role";
  defaultRoleId: string | null;
  twitchRoleId: string | null;
  youtubeRoleId: string | null;
  kickRoleId: string | null;
  // Rôle @En Live
  liveRoleId: string | null;
  autoLiveRoleEnabled: boolean;
  // Apparence embed
  embedColor: string | null;
  showViewers: boolean;
  showGame: boolean;
  showThumbnail: boolean;
  customButtonText: string | null;
  offlineAction: "keep" | "delete" | "update_offline";
  cleanUpFinishedStreams: boolean;
  cooldownMinutes: number;
  defaultMessage: string;
  checkIntervalMinutes: number;
  updatedAt: string;
}

export interface StreamersOverview {
  enabled: boolean;
  defaultChannelId: string | null;
  twitchChannelId?: string | null;
  youtubeChannelId?: string | null;
  kickChannelId?: string | null;
  liveRoleId: string | null;
  autoLiveRoleEnabled: boolean;
  totalStreamers: number;
  liveCount: number;
  streamers: StreamerItem[];
}

interface Target {
  id: string;
  name: string;
  color?: string;
}

interface GuildMemberTarget {
  id: string;
  name: string;
  displayName: string;
  avatarUrl: string | null;
}

const DEFAULT_CONFIG: StreamerConfig = {
  guildId: "",
  enabled: true,
  defaultChannelId: null,
  twitchChannelId: null,
  youtubeChannelId: null,
  kickChannelId: null,
  defaultPing: "here",
  defaultRoleId: null,
  twitchRoleId: null,
  youtubeRoleId: null,
  kickRoleId: null,
  liveRoleId: null,
  autoLiveRoleEnabled: true,
  embedColor: null,
  showViewers: true,
  showGame: true,
  showThumbnail: true,
  customButtonText: "Regarder le live",
  offlineAction: "update_offline",
  cleanUpFinishedStreams: false,
  cooldownMinutes: 30,
  defaultMessage: "🔴 **{streamer}** est en direct sur **{platform}** !",
  checkIntervalMinutes: 2,
  updatedAt: new Date().toISOString(),
};

function TwitchLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
    </svg>
  );
}

function YouTubeLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function KickLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M1.333 0h8v5.333H6.667v2.667H4V16h2.667v2.667h2.666V24h-8zm13.334 5.333h2.666V0h-8v5.333h2.667v2.667h2.667zm2.666 2.667h2.667V5.333H20V0h-5.333v2.667H12v2.666h2.667v2.667zm2.667 2.667H24V8h-4zm0 2.666H24v-2.666h-4zm-2.667 2.667H20v-2.667h-2.667zm-2.666 2.667h2.666v-2.667h-2.666zm-2.667 2.666h2.667v-2.666H12zm0 2.667h8V24h-8z" />
    </svg>
  );
}

const PLATFORM_CONFIG: Record<
  StreamPlatform,
  {
    name: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    accent: string;
    hexColor: string;
    icon: typeof TwitchLogo;
    prefix: string;
    placeholder: string;
  }
> = {
  twitch: {
    name: "Twitch",
    badgeBg: "bg-[#9146FF]/15",
    badgeText: "text-[#A970FF]",
    border: "border-[#9146FF]/30",
    accent: "#9146FF",
    hexColor: "#9146FF",
    icon: TwitchLogo,
    prefix: "twitch.tv/",
    placeholder: "ex. gotaga, kamet0",
  },
  youtube: {
    name: "YouTube",
    badgeBg: "bg-[#FF0000]/15",
    badgeText: "text-[#FF4D4D]",
    border: "border-[#FF0000]/30",
    accent: "#FF0000",
    hexColor: "#FF0000",
    icon: YouTubeLogo,
    prefix: "youtube.com/@",
    placeholder: "ex. squeezie, inoxtag",
  },
  kick: {
    name: "Kick",
    badgeBg: "bg-[#53FC18]/15",
    badgeText: "text-[#53FC18]",
    border: "border-[#53FC18]/30",
    accent: "#53FC18",
    hexColor: "#53FC18",
    icon: KickLogo,
    prefix: "kick.com/",
    placeholder: "ex. aminematue, billy",
  },
};

const PRESET_EMBED_COLORS = [
  { name: "Plateforme", value: "" },
  { name: "Violet Twitch", value: "#9146FF" },
  { name: "Rouge YouTube", value: "#FF0000" },
  { name: "Vert Kick", value: "#53FC18" },
  { name: "Bleu Électrique", value: "#3B82F6" },
  { name: "Rose Néon", value: "#EC4899" },
  { name: "Ambre Chaud", value: "#F59E0B" },
  { name: "Cyan Fluide", value: "#06B6D4" },
];

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <span className="text-xs font-semibold text-[var(--text-primary)] block">{label}</span>
        {hint && <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">{hint}</span>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] cursor-pointer"
      />
    </div>
  );
}

export default function StreamersCenterClient() {
  const searchParams = useSearchParams();
  const rawGuildId = searchParams.get("guildId");
  const { success, error: showError, info: showInfo } = useToast();
  const { profile } = useDiscordOAuth();

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
      const m = manageableGuilds.find((g) => g.id === rawGuildId);
      if (m) {
        appliedQueryGuild.current = rawGuildId;
        setSelectedGuild(m);
        return;
      }
    }
    if (!userSelectedRef.current && !rawGuildId) {
      if (!selectedGuild) {
        if (botGuildIds !== null) {
          setSelectedGuild(pickBotGuild(manageableGuilds, botGuildIds)!);
        }
      } else if (botGuildIds && botGuildIds.length > 0 && !botGuildIds.includes(selectedGuild.id)) {
        const botGuild = pickBotGuild(manageableGuilds, botGuildIds);
        if (botGuild && botGuild.id !== selectedGuild.id && botGuildIds.includes(botGuild.id)) {
          setSelectedGuild(botGuild);
        }
      }
    }
  }, [manageableGuilds, rawGuildId, selectedGuild, botGuildIds]);

  const currentGuildId = selectedGuild?.id || rawGuildId || "";
  const isBotPresent = Boolean(currentGuildId && botGuildIds && botGuildIds.includes(currentGuildId));

  // State
  const [streamers, setStreamers] = useState<StreamerItem[]>([]);
  const [config, setConfig] = useState<StreamerConfig>(DEFAULT_CONFIG);
  const [_overview, setOverview] = useState<StreamersOverview | null>(null);
  const [channels, setChannels] = useState<Target[]>([]);
  const [roles, setRoles] = useState<Target[]>([]);
  const [members, setMembers] = useState<GuildMemberTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [offline, setOffline] = useState(false);

  // Tabs & filters
  const [mainTab, setMainTab] = useState<"streamers" | "settings" | "preview" | "simulator">("streamers");
  const [platformFilter, setPlatformFilter] = useState<"all" | "live" | "twitch" | "youtube" | "kick">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & testing
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStreamer, setEditingStreamer] = useState<StreamerItem | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Add Streamer Form State
  const [formPlatform, setFormPlatform] = useState<StreamPlatform>("twitch");
  const [formUsername, setFormUsername] = useState("");
  const [formChannelId, setFormChannelId] = useState<string>("");
  const [formPingMode, setFormPingMode] = useState<StreamerPingMode>("default");
  const [formPingRoleId, setFormPingRoleId] = useState<string | null>(null);
  const [formDiscordUserId, setFormDiscordUserId] = useState<string>("");
  const [formGameFilter, setFormGameFilter] = useState("");
  const [formMinViewers, setFormMinViewers] = useState<number>(0);
  const [formCustomColor, setFormCustomColor] = useState("");
  const [formCustomMessage, setFormCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Simulator State
  const [simPlatform, setSimPlatform] = useState<StreamPlatform>("twitch");
  const [simUsername, setSimUsername] = useState("Gotaga");
  const [simTitle, setSimTitle] = useState("🔴 GRAND TOURNOI ESPORT & MULTI-GAMING AVEC LE CHAT !");
  const [simGame, setSimGame] = useState("VALORANT");
  const [simViewers, setSimViewers] = useState<number>(14850);
  const [simTargetMemberId, setSimTargetMemberId] = useState("");
  const [simChannelId, setSimChannelId] = useState("");
  const [simAssignRole, setSimAssignRole] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedGuild) return;

    const localKey = `ethone:streamers:${selectedGuild.id}`;
    let savedLocal: StreamerConfig | null = null;
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) savedLocal = JSON.parse(raw);
    } catch {}

    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      setOffline(false);
      setConfig(savedLocal ? { ...DEFAULT_CONFIG, ...savedLocal, guildId: selectedGuild.id } : { ...DEFAULT_CONFIG, guildId: selectedGuild.id });
      setOverview(null);
      setStreamers([]);
      setChannels([]);
      setRoles([]);
      setMembers([]);
      return;
    }

    if (!BOT_API_URL) {
      setOffline(true);
      if (savedLocal) setConfig({ ...DEFAULT_CONFIG, ...savedLocal, guildId: selectedGuild.id });
      return;
    }

    setLoading(true);
    setOffline(false);
    try {
      const base = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/streamers`;
      const [listRes, cfgRes, ovRes, tRes] = await Promise.all([
        fetch(`${base}/list`, { credentials: "include" }),
        fetch(`${base}/config`, { credentials: "include" }),
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/targets`, { credentials: "include" }),
      ]);

      if (listRes.ok) {
        const lData = await listRes.json();
        setStreamers(lData.streamers || []);
      }
      if (cfgRes.ok) {
        const cData = await cfgRes.json();
        const merged = { ...DEFAULT_CONFIG, ...cData, guildId: selectedGuild.id };
        setConfig(merged);
        try {
          localStorage.setItem(localKey, JSON.stringify(merged));
        } catch {}
      }
      if (ovRes.ok) {
        setOverview(await ovRes.json());
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setChannels(tData.channels ?? []);
        setRoles(tData.roles ?? []);
        setMembers(tData.members ?? []);
      }
    } catch {
      setOffline(true);
      if (savedLocal) setConfig({ ...DEFAULT_CONFIG, ...savedLocal, guildId: selectedGuild.id });
    } finally {
      setLoading(false);
    }
  }, [selectedGuild, botGuildIds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time synchronization with Discord Bot
  useDiscordSync({
    guildId: selectedGuild?.id,
    onConfigUpdated: (module, payload) => {
      if (module === "streamers") {
        if (payload?.action === "added" && payload.streamer) {
          setStreamers((prev) => [payload.streamer, ...prev.filter((s) => s.id !== payload.streamer.id)]);
        } else if (payload?.action === "deleted" && payload.id) {
          setStreamers((prev) => prev.filter((s) => s.id !== payload.id));
        } else if (payload?.action === "updated" && payload.streamer) {
          setStreamers((prev) => prev.map((s) => (s.id === payload.streamer.id ? payload.streamer : s)));
        } else if (payload?.enabled !== undefined) {
          setConfig((prev) => ({ ...prev, ...payload }));
        }
      }
    },
  });

  const handleSaveConfig = async () => {
    if (!selectedGuild) return;
    const localKey = `ethone:streamers:${selectedGuild.id}`;

    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      try {
        localStorage.setItem(localKey, JSON.stringify(config));
      } catch {}
      success("Réglages enregistrés localement", "Les alertes streamers s'activeront dès que le bot aura rejoint ce serveur.");
      return;
    }

    if (!BOT_API_URL) {
      try {
        localStorage.setItem(localKey, JSON.stringify(config));
      } catch {}
      success("Enregistré hors-ligne", "Les réglages seront transmis au bot dès qu'il sera joignable.");
      return;
    }

    setSavingConfig(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/streamers/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Échec de la sauvegarde");
      const data = await res.json();
      if (data.config) setConfig((prev) => ({ ...prev, ...data.config }));
      try {
        localStorage.setItem(localKey, JSON.stringify(config));
      } catch {}
      success("Configuration enregistrée", "Toutes les options de personnalisation ont été synchronisées.");
    } catch (err) {
      showError("Erreur d'enregistrement", formatApiError(err));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddStreamer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuild) return;
    if (!formUsername.trim()) {
      showError("Champ requis", "Veuillez saisir un identifiant ou pseudo de streamer.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/streamers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          platform: formPlatform,
          username: formUsername.trim(),
          channelId: formChannelId || null,
          pingMode: formPingMode,
          pingRoleId: formPingMode === "role" ? formPingRoleId : null,
          discordUserId: formDiscordUserId.trim() || null,
          gameFilter: formGameFilter.trim() || null,
          minViewers: Number(formMinViewers) || 0,
          customColor: formCustomColor.trim() || null,
          customMessage: formCustomMessage.trim() || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Impossible d'ajouter ce streamer");
      }

      const data = await res.json();
      if (data.streamer) {
        setStreamers((prev) => [data.streamer, ...prev]);
        success("Streamer ajouté !", `${data.streamer.displayName || data.streamer.username} (${data.streamer.platform.toUpperCase()}) est maintenant surveillé.`);
      }
      setShowAddModal(false);
      setFormUsername("");
      setFormChannelId("");
      setFormPingMode("default");
      setFormPingRoleId(null);
      setFormDiscordUserId("");
      setFormGameFilter("");
      setFormMinViewers(0);
      setFormCustomColor("");
      setFormCustomMessage("");
    } catch (err) {
      showError("Échec de l'ajout", formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStreamer = async (streamer: StreamerItem) => {
    if (!selectedGuild) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/streamers/${streamer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          channelId: streamer.channelId,
          pingMode: streamer.pingMode,
          pingRoleId: streamer.pingRoleId,
          discordUserId: streamer.discordUserId,
          gameFilter: streamer.gameFilter,
          minViewers: streamer.minViewers,
          customColor: streamer.customColor,
          paused: streamer.paused,
          customMessage: streamer.customMessage,
        }),
      });

      if (!res.ok) throw new Error("Échec de la mise à jour");
      const data = await res.json();
      if (data.streamer) {
        setStreamers((prev) => prev.map((s) => (s.id === streamer.id ? data.streamer : s)));
        success("Modifications enregistrées", `Les réglages personnalisés de ${streamer.displayName} ont été actualisés.`);
      }
      setEditingStreamer(null);
    } catch (err) {
      showError("Erreur", formatApiError(err));
    }
  };

  const handleTogglePause = async (streamer: StreamerItem) => {
    const nextPaused = !streamer.paused;
    setStreamers((prev) => prev.map((s) => (s.id === streamer.id ? { ...s, paused: nextPaused } : s)));
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild?.id}/streamers/${streamer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paused: nextPaused }),
      });
      if (!res.ok) throw new Error();
      success(
        nextPaused ? "Alertes en pause" : "Alertes reprises",
        `La surveillance pour ${streamer.displayName || streamer.username} est ${nextPaused ? "suspendue" : "active"}.`
      );
    } catch {
      setStreamers((prev) => prev.map((s) => (s.id === streamer.id ? { ...s, paused: !nextPaused } : s)));
      showError("Erreur", "Impossible de mettre à jour le statut du streamer.");
    }
  };

  const handleDeleteStreamer = async (streamer: StreamerItem) => {
    const ok = await confirmDialog(
      `Le bot cessera de surveiller ses lives ${streamer.platform.toUpperCase()} et n'enverra plus d'alertes dans Discord.`,
      {
        title: `Supprimer ${streamer.displayName || streamer.username} ?`,
        confirmLabel: "Supprimer",
        tone: "danger",
      }
    );
    if (!ok || !selectedGuild) return;

    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/streamers/${streamer.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Impossible de supprimer");
      setStreamers((prev) => prev.filter((s) => s.id !== streamer.id));
      success("Streamer supprimé", `${streamer.displayName || streamer.username} a été retiré de la liste.`);
    } catch (err) {
      showError("Erreur", formatApiError(err));
    }
  };

  const handleTestAlert = async (streamer: StreamerItem) => {
    if (!selectedGuild) return;
    setTestingId(streamer.id);
    showInfo("Envoi du test...", `Génération de l'embed animé pour ${streamer.displayName || streamer.username}`);

    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/streamers/${streamer.id}/test`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Erreur lors de l'envoi de l'alerte test");
      const data = await res.json();
      if (data.alertDispatched) {
        success("Alerte envoyée !", `L'embed de live pour ${streamer.displayName} a été posté dans le salon Discord.`);
      } else {
        showInfo("Vérification terminée", `Statut détecté : ${data.liveStatus?.isLive ? "En direct" : "Hors ligne"}`);
      }
    } catch (err) {
      showError("Échec du test", formatApiError(err));
    } finally {
      setTestingId(null);
    }
  };

  const handleRunSimulation = async () => {
    if (!selectedGuild) return;
    setIsSimulating(true);
    showInfo("Simulation en cours...", "Envoi de l'embed animé et attribution du rôle dans Discord");

    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/streamers/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          platform: simPlatform,
          username: simUsername,
          displayName: simUsername,
          title: simTitle,
          game: simGame,
          viewers: simViewers,
          targetMemberId: simTargetMemberId || null,
          channelId: simChannelId || null,
          assignLiveRole: simAssignRole,
        }),
      });

      if (!res.ok) throw new Error("Erreur serveur lors de la simulation");
      const data = await res.json();
      if (data.success) {
        success(
          "Simulation Discord réussie !",
          `Embed live posté dans le salon avec succès${data.roleAssigned ? " et rôle @En Live attribué au membre" : ""}.`
        );
      } else {
        showError("Simulation échouée", "Le bot n'a pas pu envoyer le message dans le salon cible.");
      }
    } catch (err) {
      showError("Erreur de simulation", formatApiError(err));
    } finally {
      setIsSimulating(false);
    }
  };

  // Helper resolving targeted channel name for UI display
  const resolveStreamerChannelLabel = (streamer: StreamerItem) => {
    if (streamer.channelId) {
      return `#${channels.find((c) => c.id === streamer.channelId)?.name || streamer.channelId} (Dédié)`;
    }
    if (streamer.platform === "twitch" && config.twitchChannelId) {
      return `#${channels.find((c) => c.id === config.twitchChannelId)?.name || "twitch"} (Salon Twitch)`;
    }
    if (streamer.platform === "youtube" && config.youtubeChannelId) {
      return `#${channels.find((c) => c.id === config.youtubeChannelId)?.name || "youtube"} (Salon YouTube)`;
    }
    if (streamer.platform === "kick" && config.kickChannelId) {
      return `#${channels.find((c) => c.id === config.kickChannelId)?.name || "kick"} (Salon Kick)`;
    }
    if (config.defaultChannelId) {
      return `#${channels.find((c) => c.id === config.defaultChannelId)?.name || "général"} (Par défaut)`;
    }
    return "Aucun salon";
  };

  // Helper resolving targeted ping label for UI display
  const resolveStreamerPingLabel = (streamer: StreamerItem) => {
    const mode = streamer.pingMode || "default";
    if (mode === "none") return "Sans mention";
    if (mode === "here") return "@here";
    if (mode === "everyone") return "@everyone";
    if (mode === "role") {
      return `@${roles.find((r) => r.id === streamer.pingRoleId)?.name || "Rôle dédié"}`;
    }
    if (streamer.platform === "twitch" && config.twitchRoleId) {
      return `@${roles.find((r) => r.id === config.twitchRoleId)?.name || "Rôle Twitch"}`;
    }
    if (streamer.platform === "youtube" && config.youtubeRoleId) {
      return `@${roles.find((r) => r.id === config.youtubeRoleId)?.name || "Rôle YouTube"}`;
    }
    if (streamer.platform === "kick" && config.kickRoleId) {
      return `@${roles.find((r) => r.id === config.kickRoleId)?.name || "Rôle Kick"}`;
    }
    if (config.defaultPing === "everyone") return "@everyone";
    if (config.defaultPing === "here") return "@here";
    if (config.defaultPing === "role" && config.defaultRoleId) {
      return `@${roles.find((r) => r.id === config.defaultRoleId)?.name || "Rôle global"}`;
    }
    return "Sans mention";
  };

  // Filtered streamers list
  const filteredStreamers = useMemo(() => {
    return streamers.filter((s) => {
      if (platformFilter === "live" && !s.isLive) return false;
      if (platformFilter === "twitch" && s.platform !== "twitch") return false;
      if (platformFilter === "youtube" && s.platform !== "youtube") return false;
      if (platformFilter === "kick" && s.platform !== "kick") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.username.toLowerCase().includes(q) || s.displayName.toLowerCase().includes(q);
        const matchesGame = s.game?.toLowerCase().includes(q) || s.gameFilter?.toLowerCase().includes(q);
        const matchesTitle = s.title?.toLowerCase().includes(q);
        return matchesName || matchesGame || matchesTitle;
      }
      return true;
    });
  }, [streamers, platformFilter, searchQuery]);

  const liveCount = useMemo(() => streamers.filter((s) => s.isLive).length, [streamers]);
  const twitchCount = useMemo(() => streamers.filter((s) => s.platform === "twitch").length, [streamers]);
  const youtubeCount = useMemo(() => streamers.filter((s) => s.platform === "youtube").length, [streamers]);
  const kickCount = useMemo(() => streamers.filter((s) => s.platform === "kick").length, [streamers]);

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-[var(--text-primary)] pb-44">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--panel-border)]">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <Link
                href={`/discord${currentGuildId ? `?guildId=${currentGuildId}` : ""}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] px-3 text-xs font-semibold normal-case tracking-normal text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 cursor-pointer"
                title="Retour au hub Discord"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Retour Discord</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-3">
              <span className="icon-pop grid h-10 w-10 shrink-0 place-items-center rounded-[var(--inset-radius)] border border-purple-500/25 bg-purple-500/10 text-purple-400">
                <Radio className="h-5 w-5" />
              </span>
              Alertes Streamers — Twitch, YouTube & Kick
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Surveillance des diffusions en direct, notifications automatiques et rôle @En Live.
              {offline && <span className="text-amber-400"> (mode local / bot non joignable)</span>}
            </p>
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
              type="button"
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 hover:text-[var(--text-primary)] disabled:opacity-50 cursor-pointer transition-colors"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Actualiser
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] text-xs font-semibold cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nouveau Streamer</span>
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
                <p className="text-sm font-semibold text-[var(--text-primary)]">Bot non installé sur ce serveur</p>
                <p className="text-xs text-amber-300/80">
                  Invitez le bot ETHONE sur <strong>{selectedGuild.name}</strong> pour activer les alertes de stream et le rôle @En Live.
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

        {/* Offline banner */}
        {offline && selectedGuild && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Mode hors-ligne : la synchronisation en direct avec le bot Discord est temporairement indisponible. Les réglages sont stockés sur votre appareil.</span>
          </div>
        )}

        {/* 4 Metric KPI Cards (exact style of older pages) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-2xl p-4 space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">Streamers Suivis</span>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{streamers.length}</p>
            <span className="text-xs text-[var(--text-muted)]">Surveillance 24/7</span>
          </div>

          <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-2xl p-4 space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">En Direct</span>
            <p className="text-2xl font-bold text-rose-400">{liveCount}</p>
            <span className="text-xs text-[var(--text-muted)]">
              {liveCount > 0 ? `${liveCount} diffusion(s) active(s)` : "Aucun stream en cours"}
            </span>
          </div>

          <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-2xl p-4 space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">Plateformes</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#9146FF]/15 text-[#A970FF]">
                <TwitchLogo className="h-2.5 w-2.5" /> {twitchCount}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF0000]/15 text-[#FF4D4D]">
                <YouTubeLogo className="h-2.5 w-2.5" /> {youtubeCount}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#53FC18]/15 text-[#53FC18]">
                <KickLogo className="h-2.5 w-2.5" /> {kickCount}
              </span>
            </div>
            <span className="text-xs text-[var(--text-muted)] block mt-0.5">Routage indépendant</span>
          </div>

          <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-2xl p-4 space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">Rôle @En Live</span>
            <p className="text-sm font-bold text-purple-300 mt-1 truncate">
              {config.autoLiveRoleEnabled && config.liveRoleId
                ? `@${roles.find((r) => r.id === config.liveRoleId)?.name || "En Live"}`
                : "Désactivé"}
            </p>
            <span className="text-xs text-[var(--text-muted)]">Attribution instantanée</span>
          </div>
        </div>

        {/* Navigation Tabs (style matching Leveling / Welcome) */}
        <div className="flex border-b border-[var(--panel-border)] gap-2 overflow-x-auto pb-1">
          {[
            { id: "streamers", label: "Streamers suivis", icon: Users },
            { id: "settings", label: "Salons & Notifications", icon: SlidersHorizontal },
            { id: "preview", label: "Aperçu de l'Embed", icon: Eye },
            { id: "simulator", label: "Simulateur de Live", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = mainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id as any)}
                className={`relative px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer outline-none ${
                  isActive
                    ? "border-transparent text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="streamers-main-tab"
                    transition={{ type: "spring", stiffness: 450, damping: 43 }}
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--accent-primary)]"
                  />
                )}
                <Icon className={`w-4 h-4 ${isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1 : STREAMERS SUIVIS */}
        {mainTab === "streamers" && (
          <div className="space-y-6">
            {/* Filter and search bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "all", label: `Tous (${streamers.length})` },
                  { id: "live", label: `En direct (${liveCount})` },
                  { id: "twitch", label: `Twitch (${twitchCount})` },
                  { id: "youtube", label: `YouTube (${youtubeCount})` },
                  { id: "kick", label: `Kick (${kickCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPlatformFilter(f.id as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap",
                      platformFilter === f.id
                        ? "bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--text-primary)]"
                        : "border-[var(--panel-border)] bg-[var(--surface-raised)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrer streamer, jeu..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Streamers cards grid */}
            {filteredStreamers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/20 p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Radio className="h-8 w-8 text-[var(--text-muted)] opacity-60" />
                <div className="max-w-md">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {searchQuery ? "Aucun streamer ne correspond à votre recherche" : "Aucun streamer configuré"}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {searchQuery
                      ? "Essayez avec un autre terme de recherche ou changez de filtre."
                      : "Ajoutez vos créateurs favoris sur Twitch, YouTube ou Kick pour recevoir les notifications automatiques."}
                  </p>
                </div>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="mt-2 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--accent-primary)] text-white hover:opacity-95 shadow cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Ajouter un streamer</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStreamers.map((streamer) => {
                  const pConfig = PLATFORM_CONFIG[streamer.platform];
                  const PlatformIcon = pConfig.icon;
                  const isTesting = testingId === streamer.id;

                  return (
                    <div
                      key={streamer.id}
                      className={cn(
                        "rounded-2xl border bg-[var(--surface-raised)]/40 p-4 space-y-3 transition-colors",
                        streamer.isLive ? "border-rose-500/40 shadow-sm shadow-rose-500/5" : "border-[var(--panel-border)]"
                      )}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", pConfig.badgeBg, pConfig.badgeText, pConfig.border)}>
                            <PlatformIcon className="h-3 w-3" />
                            {pConfig.name}
                          </span>
                          {streamer.isLive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                              EN DIRECT
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)]">Hors-ligne</span>
                          )}
                        </div>

                        {/* Top action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleTogglePause(streamer)}
                            className={cn(
                              "p-1.5 rounded-lg border text-xs transition-colors cursor-pointer",
                              streamer.paused
                                ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                                : "border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            )}
                            title={streamer.paused ? "Reprendre les alertes" : "Mettre en pause"}
                          >
                            {streamer.paused ? <Play className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingStreamer(streamer)}
                            className="p-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            title="Modifier les réglages"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestAlert(streamer)}
                            disabled={isTesting}
                            className="p-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50"
                            title="Tester l'alerte sur Discord"
                          >
                            <Sparkles className={cn("h-3.5 w-3.5", isTesting && "animate-spin text-purple-400")} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStreamer(streamer)}
                            className="p-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                            title="Supprimer ce streamer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Streamer Info */}
                      <div className="flex items-start gap-3">
                        <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-[var(--surface-raised)] border border-[var(--panel-border)] shrink-0 flex items-center justify-center font-bold text-sm text-[var(--text-primary)]">
                          {streamer.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={streamer.avatarUrl} alt={streamer.displayName} className="h-full w-full object-cover" />
                          ) : (
                            streamer.displayName[0]?.toUpperCase() || streamer.username[0]?.toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <a
                            href={streamer.streamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-sm text-[var(--text-primary)] hover:underline flex items-center gap-1 truncate"
                          >
                            <span>{streamer.displayName || streamer.username}</span>
                            <ExternalLink className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
                          </a>
                          <span className="text-[11px] text-[var(--text-muted)] block truncate">@{streamer.username}</span>
                        </div>
                      </div>

                      {/* Live details if online */}
                      {streamer.isLive && streamer.title && (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
                          <p className="font-semibold text-rose-200 line-clamp-1">{streamer.title}</p>
                          <div className="flex items-center justify-between text-[11px] text-rose-300/80">
                            <span>{streamer.game || "Live"}</span>
                            <span>{streamer.viewers ? `${streamer.viewers.toLocaleString()} viewers` : ""}</span>
                          </div>
                        </div>
                      )}

                      {/* Routing labels */}
                      <div className="pt-2 border-t border-[var(--panel-border)] text-[11px] text-[var(--text-muted)] space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Salon :</span>
                          <span className="font-medium text-[var(--text-primary)] truncate max-w-[150px]">
                            {resolveStreamerChannelLabel(streamer)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Mention :</span>
                          <span className="font-medium text-[var(--text-primary)] truncate max-w-[150px]">
                            {resolveStreamerPingLabel(streamer)}
                          </span>
                        </div>
                        {streamer.discordUserId && (
                          <div className="flex items-center justify-between">
                            <span>Membre lié :</span>
                            <span className="font-medium text-purple-300 truncate max-w-[150px]">
                              @{members.find((m) => m.id === streamer.discordUserId)?.displayName || streamer.discordUserId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2 : SALONS & NOTIFICATIONS (SETTINGS) */}
        {mainTab === "settings" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Salons de diffusion */}
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[var(--accent-primary)]" />
                  Salons de Diffusion
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Définissez un salon par défaut et ciblez des salons distincts pour Twitch, YouTube ou Kick.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">Salon par défaut (Global)</label>
                    <ChannelPicker
                      value={config.defaultChannelId ?? ""}
                      onChange={(id) => setConfig((prev) => ({ ...prev, defaultChannelId: id || null }))}
                      channels={channels}
                      emptyLabel="— Sélectionner un salon par défaut —"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A970FF] flex items-center gap-1.5">
                      <TwitchLogo className="h-3.5 w-3.5" />
                      Salon dédié Twitch (optionnel)
                    </label>
                    <ChannelPicker
                      value={config.twitchChannelId ?? ""}
                      onChange={(id) => setConfig((prev) => ({ ...prev, twitchChannelId: id || null }))}
                      channels={channels}
                      emptyLabel="— Hériter du salon par défaut —"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#FF4D4D] flex items-center gap-1.5">
                      <YouTubeLogo className="h-3.5 w-3.5" />
                      Salon dédié YouTube (optionnel)
                    </label>
                    <ChannelPicker
                      value={config.youtubeChannelId ?? ""}
                      onChange={(id) => setConfig((prev) => ({ ...prev, youtubeChannelId: id || null }))}
                      channels={channels}
                      emptyLabel="— Hériter du salon par défaut —"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#53FC18] flex items-center gap-1.5">
                      <KickLogo className="h-3.5 w-3.5" />
                      Salon dédié Kick (optionnel)
                    </label>
                    <ChannelPicker
                      value={config.kickChannelId ?? ""}
                      onChange={(id) => setConfig((prev) => ({ ...prev, kickChannelId: id || null }))}
                      channels={channels}
                      emptyLabel="— Hériter du salon par défaut —"
                    />
                  </div>
                </div>
              </div>

              {/* Rôle @En Live & Mentions */}
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  Rôle @En Live & Mentions
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Attribuez automatiquement un rôle aux créateurs du serveur et gérez les alertes par mention.
                </p>

                <div className="space-y-3 pt-2">
                  <SwitchRow
                    label="Attribution automatique du rôle @En Live"
                    hint="Attribué au membre Discord dès le début du stream, et retiré automatiquement à la fin."
                    checked={config.autoLiveRoleEnabled}
                    onChange={(v) => setConfig((prev) => ({ ...prev, autoLiveRoleEnabled: v }))}
                  />

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">Rôle @En Live</label>
                    <RolePicker
                      value={config.liveRoleId}
                      onChange={(id) => setConfig((prev) => ({ ...prev, liveRoleId: id || null }))}
                      roles={roles}
                      guildId={selectedGuild?.id}
                      placeholder="Sélectionner le rôle @En Live..."
                      emptyLabel="— Aucun rôle —"
                      allowClear
                      size="sm"
                    />
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">Mention globale par défaut</label>
                    <select
                      value={config.defaultPing}
                      onChange={(e) => setConfig((prev) => ({ ...prev, defaultPing: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-primary)]"
                    >
                      <option value="none">Aucune mention (silencieux)</option>
                      <option value="here">@here (membres connectés)</option>
                      <option value="everyone">@everyone (tout le serveur)</option>
                      <option value="role">Rôle spécifique</option>
                    </select>
                  </div>

                  {config.defaultPing === "role" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-primary)]">Rôle global à mentionner</label>
                      <RolePicker
                        value={config.defaultRoleId}
                        onChange={(id) => setConfig((prev) => ({ ...prev, defaultRoleId: id || null }))}
                        roles={roles}
                        guildId={selectedGuild?.id}
                        placeholder="Sélectionner le rôle..."
                        emptyLabel="— Aucun —"
                        allowClear
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Personnalisation de l'Embed */}
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-amber-400" />
                  Apparence de l'Embed Discord
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Ajustez les éléments visuels affichés dans la notification de live.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">Couleur latérale de l'embed</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PRESET_EMBED_COLORS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, embedColor: c.value || null }))}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer",
                            config.embedColor === (c.value || null)
                              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)] font-bold"
                              : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)]"
                          )}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: c.value || "var(--accent-primary)" }}
                          />
                          <span className="truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <SwitchRow
                    label="Afficher le nombre de spectateurs"
                    checked={config.showViewers}
                    onChange={(v) => setConfig((prev) => ({ ...prev, showViewers: v }))}
                  />

                  <SwitchRow
                    label="Afficher le jeu / la catégorie"
                    checked={config.showGame}
                    onChange={(v) => setConfig((prev) => ({ ...prev, showGame: v }))}
                  />

                  <SwitchRow
                    label="Afficher la miniature du live en grand"
                    checked={config.showThumbnail}
                    onChange={(v) => setConfig((prev) => ({ ...prev, showThumbnail: v }))}
                  />

                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">Libellé du bouton Discord</label>
                    <input
                      type="text"
                      value={config.customButtonText || ""}
                      onChange={(e) => setConfig((prev) => ({ ...prev, customButtonText: e.target.value || null }))}
                      placeholder="Regarder le live"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              </div>

              {/* Règles & Cooldown */}
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Flame className="h-4 w-4 text-rose-400" />
                  Règles & Cooldown Anti-Spam
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Gérez la fin de diffusion et évitez le multi-ping en cas de brève déconnexion.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">Action à la fin du live</label>
                    <select
                      value={config.offlineAction}
                      onChange={(e) => setConfig((prev) => ({ ...prev, offlineAction: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-primary)]"
                    >
                      <option value="update_offline">Mettre à jour l'embed en « Hors-ligne » (Recommandé)</option>
                      <option value="delete">Supprimer le message d'alerte automatiquement</option>
                      <option value="keep">Conserver l'embed tel quel</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">Cooldown anti-spam (Minutes)</label>
                    <input
                      type="number"
                      min={5}
                      max={360}
                      value={config.cooldownMinutes}
                      onChange={(e) => setConfig((prev) => ({ ...prev, cooldownMinutes: parseInt(e.target.value, 10) || 30 }))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-primary)]"
                    />
                    <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                      Délai minimum avant de renvoyer une nouvelle alerte si le streamer relance son live.
                    </span>
                  </div>

                  <SwitchRow
                    label="Interrupteur maître du module Alertes Streamers"
                    hint="Active ou coupe l'ensemble des vérifications sur ce serveur."
                    checked={config.enabled}
                    onChange={(v) => setConfig((prev) => ({ ...prev, enabled: v }))}
                  />
                </div>
              </div>
            </div>

            {/* Bouton de sauvegarde */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={savingConfig}
                onClick={handleSaveConfig}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 btn-sheen"
              >
                {savingConfig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>{savingConfig ? "Enregistrement en cours..." : "Enregistrer la Configuration"}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3 : APERÇU DE L'EMBED */}
        {mainTab === "preview" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Rendu Fidèle de l'Alerte Discord</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Ce que vos membres voient dans leur salon textuel lors d'une notification de live.
                  </p>
                </div>
              </div>

              {/* Discord message wrapper */}
              <div className="rounded-xl border border-stone-800 bg-[#2b2d31] p-5 text-stone-200 max-w-xl shadow-xl font-sans text-xs">
                {/* Bot header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-500 to-rose-500 flex items-center justify-center font-bold text-[10px] text-white">
                    ETH
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-xs">ETHONE</span>
                    <span className="rounded bg-[#5865f2] px-1 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider">
                      BOT
                    </span>
                    <span className="text-[10px] text-stone-400">Aujourd&apos;hui à 20:15</span>
                  </div>
                </div>

                <p className="text-[#a9b2ff] text-xs font-semibold mb-2">
                  @here 🔴 Gotaga est en direct sur Twitch !
                </p>

                {/* Embed container */}
                <div
                  className="rounded-md bg-[#232428] p-4 border-l-4 space-y-3"
                  style={{ borderLeftColor: config.embedColor || "#9146FF" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      🔴 [FR] TOURNOI ESPORT & MULTI-GAMING AVEC LE CHAT !
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-stone-800 text-[11px]">
                    {config.showGame && (
                      <div>
                        <span className="text-stone-400 font-semibold block">Jeu / Catégorie</span>
                        <span className="text-white font-bold">VALORANT</span>
                      </div>
                    )}
                    {config.showViewers && (
                      <div>
                        <span className="text-stone-400 font-semibold block">Spectateurs</span>
                        <span className="text-rose-400 font-bold">14 850 viewers</span>
                      </div>
                    )}
                  </div>

                  {config.showThumbnail && (
                    <div className="rounded-lg overflow-hidden border border-stone-800 aspect-video bg-stone-900 flex items-center justify-center text-stone-500 font-bold text-xs">
                      Miniature live Twitch HD (1920x1080)
                    </div>
                  )}

                  <div className="pt-2 text-[10px] text-stone-400 flex items-center justify-between">
                    <span>{selectedGuild?.name || "Serveur Discord"} • Module Streamers</span>
                    <span>En direct sur Twitch</span>
                  </div>
                </div>

                {/* Discord Button */}
                <div className="mt-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded bg-[#4e5058] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#6d6f78] transition-colors"
                  >
                    <span>{config.customButtonText || "Regarder le live"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4 : SIMULATEUR DE LIVE */}
        {mainTab === "simulator" && (
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                Studio de Simulation de Live
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Générez un faux événement de début de live pour vérifier immédiatement la transmission des alertes dans vos salons et l'attribution du rôle @En Live.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">Plateforme</label>
                <select
                  value={simPlatform}
                  onChange={(e) => setSimPlatform(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-primary)]"
                >
                  <option value="twitch">Twitch</option>
                  <option value="youtube">YouTube</option>
                  <option value="kick">Kick</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">Pseudo du Streamer</label>
                <input
                  type="text"
                  value={simUsername}
                  onChange={(e) => setSimUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">Titre de la Diffusion</label>
                <input
                  type="text"
                  value={simTitle}
                  onChange={(e) => setSimTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">Jeu / Catégorie</label>
                <input
                  type="text"
                  value={simGame}
                  onChange={(e) => setSimGame(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">Spectateurs</label>
                <input
                  type="number"
                  value={simViewers}
                  onChange={(e) => setSimViewers(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">Salon cible (optionnel)</label>
                <ChannelPicker
                  value={simChannelId}
                  onChange={(id) => setSimChannelId(id || "")}
                  channels={channels}
                  emptyLabel="— Salon configuré par défaut —"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">Membre cible pour le rôle @En Live (optionnel)</label>
                <select
                  value={simTargetMemberId}
                  onChange={(e) => setSimTargetMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-primary)]"
                >
                  <option value="">— Aucun membre —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName} (@{m.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <SwitchRow
              label="Attribuer le rôle @En Live lors de la simulation"
              hint="Vérifie si le bot possède les permissions nécessaires pour gérer ce rôle."
              checked={simAssignRole}
              onChange={setSimAssignRole}
            />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={isSimulating}
                onClick={handleRunSimulation}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 text-white text-xs font-bold hover:brightness-110 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSimulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                <span>{isSimulating ? "Simulation en cours..." : "Lancer le Test de Direct Discord"}</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL AJOUT STREAMER */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-lg rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-[var(--accent-primary)]" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Ajouter un nouveau streamer</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleAddStreamer} className="space-y-4 text-xs">
                  {/* Platform selector */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Plateforme de diffusion</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["twitch", "youtube", "kick"] as StreamPlatform[]).map((p) => {
                        const pc = PLATFORM_CONFIG[p];
                        const PIcon = pc.icon;
                        const isSel = formPlatform === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setFormPlatform(p)}
                            className={cn(
                              "flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                              isSel ? `${pc.badgeBg} ${pc.badgeText} ${pc.border}` : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)]"
                            )}
                          >
                            <PIcon className="h-4 w-4" />
                            <span>{pc.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Identifiant ou pseudo du créateur</label>
                    <div className="flex rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] overflow-hidden">
                      <span className="px-3 py-2 text-[var(--text-muted)] bg-[var(--surface-raised)]/80 text-xs border-r border-[var(--panel-border)] shrink-0">
                        {PLATFORM_CONFIG[formPlatform].prefix}
                      </span>
                      <input
                        type="text"
                        required
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        placeholder={PLATFORM_CONFIG[formPlatform].placeholder}
                        className="w-full px-3 py-2 text-xs bg-transparent text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Dedicated channel */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Salon de notification dédié (optionnel)</label>
                    <ChannelPicker
                      value={formChannelId}
                      onChange={(id) => setFormChannelId(id || "")}
                      channels={channels}
                      emptyLabel="— Hériter du salon par défaut —"
                    />
                  </div>

                  {/* Ping mode */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Mode de mention</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { id: "default", label: "Hériter" },
                        { id: "none", label: "Aucune" },
                        { id: "here", label: "@here" },
                        { id: "everyone", label: "@everyone" },
                        { id: "role", label: "Rôle" },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setFormPingMode(m.id as any)}
                          className={cn(
                            "py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer text-center",
                            formPingMode === m.id
                              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)] font-bold"
                              : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)]"
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formPingMode === "role" && (
                    <div className="space-y-1.5">
                      <label className="font-semibold text-[var(--text-primary)]">Rôle spécifique à mentionner</label>
                      <RolePicker
                        value={formPingRoleId}
                        onChange={(id) => setFormPingRoleId(id || null)}
                        roles={roles}
                        guildId={selectedGuild?.id}
                        placeholder="Sélectionner le rôle à ping..."
                        emptyLabel="— Aucun —"
                        allowClear
                        size="sm"
                      />
                    </div>
                  )}

                  {/* Member link */}
                  <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 space-y-2">
                    <label className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-purple-400" />
                      Lier à un membre Discord (Rôle @En Live)
                    </label>
                    <select
                      value={formDiscordUserId}
                      onChange={(e) => setFormDiscordUserId(e.target.value)}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2 text-xs text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="">— Aucun membre lié —</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName} (@{m.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-primary)]">Filtre de jeu (optionnel)</label>
                      <input
                        type="text"
                        value={formGameFilter}
                        onChange={(e) => setFormGameFilter(e.target.value)}
                        placeholder="ex: GTA V"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-primary)]">Spectateurs min.</label>
                      <input
                        type="number"
                        min={0}
                        value={formMinViewers}
                        onChange={(e) => setFormMinViewers(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>

                  {/* Custom message */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Message personnalisé (optionnel)</label>
                    <input
                      type="text"
                      value={formCustomMessage}
                      onChange={(e) => setFormCustomMessage(e.target.value)}
                      placeholder="🔴 {streamer} est en direct sur {platform} !"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--panel-border)]">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !formUsername.trim()}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-95 cursor-pointer disabled:opacity-50 btn-sheen"
                    >
                      {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                      <span>Ajouter et surveiller</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL MODIFIER STREAMER */}
        <AnimatePresence>
          {editingStreamer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingStreamer(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-lg rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-[var(--accent-primary)]" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Modifier {editingStreamer.displayName || editingStreamer.username} ({editingStreamer.platform.toUpperCase()})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingStreamer(null)}
                    className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Salon de notification dédié</label>
                    <ChannelPicker
                      value={editingStreamer.channelId ?? ""}
                      onChange={(id) => setEditingStreamer({ ...editingStreamer, channelId: id || null })}
                      channels={channels}
                      emptyLabel="— Hériter du salon configuré —"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Mode de mention</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { id: "default", label: "Hériter" },
                        { id: "none", label: "Aucune" },
                        { id: "here", label: "@here" },
                        { id: "everyone", label: "@everyone" },
                        { id: "role", label: "Rôle" },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setEditingStreamer({ ...editingStreamer, pingMode: m.id as any })}
                          className={cn(
                            "py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer text-center",
                            editingStreamer.pingMode === m.id
                              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)] font-bold"
                              : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)]"
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {editingStreamer.pingMode === "role" && (
                    <div className="space-y-1.5">
                      <label className="font-semibold text-[var(--text-primary)]">Rôle spécifique à notifier</label>
                      <RolePicker
                        value={editingStreamer.pingRoleId}
                        onChange={(id) => setEditingStreamer({ ...editingStreamer, pingRoleId: id || null })}
                        roles={roles}
                        guildId={selectedGuild?.id}
                        placeholder="Sélectionner le rôle à ping..."
                        emptyLabel="— Aucun —"
                        allowClear
                        size="sm"
                      />
                    </div>
                  )}

                  <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 space-y-2">
                    <label className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-purple-400" />
                      Lier à un membre Discord (Rôle @En Live)
                    </label>
                    <select
                      value={editingStreamer.discordUserId || ""}
                      onChange={(e) => setEditingStreamer({ ...editingStreamer, discordUserId: e.target.value || null })}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2 text-xs text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="">— Aucun membre lié —</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName} (@{m.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-primary)]">Filtre de jeu / catégorie</label>
                      <input
                        type="text"
                        value={editingStreamer.gameFilter || ""}
                        onChange={(e) => setEditingStreamer({ ...editingStreamer, gameFilter: e.target.value || null })}
                        placeholder="ex: Valorant"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-primary)]">Spectateurs minimum</label>
                      <input
                        type="number"
                        min={0}
                        value={editingStreamer.minViewers || 0}
                        onChange={(e) => setEditingStreamer({ ...editingStreamer, minViewers: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Message d'annonce personnalisé</label>
                    <input
                      type="text"
                      value={editingStreamer.customMessage || ""}
                      onChange={(e) => setEditingStreamer({ ...editingStreamer, customMessage: e.target.value || null })}
                      placeholder="🔴 {streamer} est en direct sur {platform} !"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--panel-border)]">
                    <button
                      type="button"
                      onClick={() => setEditingStreamer(null)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStreamer(editingStreamer)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-95 cursor-pointer btn-sheen"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
