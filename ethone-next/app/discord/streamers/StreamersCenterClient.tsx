"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Radio,
  Tv,
  Video,
  Play,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Bell,
  Users,
  Check,
  X,
  SlidersHorizontal,
  Search,
  Globe,
  Clock,
  Flame,
  ShieldCheck,
  Eye,
  Sliders,
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
import ModulePageTitle from "@/components/discord/ModulePageTitle";
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

function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5 text-left transition-colors hover:border-[var(--input-border-hover)] cursor-pointer"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-[var(--text-primary)]">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-[var(--text-muted)]">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative inline-flex mt-0.5 h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200",
          checked ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-raised)]/80"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </span>
    </button>
  );
}

export default function StreamersCenterClient() {
  const searchParams = useSearchParams();
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
  const queryGuildId = searchParams.get("guildId");
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (queryGuildId && appliedQueryGuild.current !== queryGuildId) {
      const m = manageableGuilds.find((g) => g.id === queryGuildId);
      if (m) {
        appliedQueryGuild.current = queryGuildId;
        setSelectedGuild(m);
        return;
      }
    }
    if (!userSelectedRef.current && !queryGuildId) {
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
  }, [manageableGuilds, queryGuildId, selectedGuild, botGuildIds]);

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

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"all" | "live" | "twitch" | "youtube" | "kick">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [configTab, setConfigTab] = useState<"channels" | "roles" | "embed" | "rules">("channels");

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
      setShowConfigDrawer(false);
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
      // rollback
      setStreamers((prev) => prev.map((s) => (s.id === streamer.id ? { ...s, paused: !nextPaused } : s)));
      showError("Erreur", "Impossible de mettre à jour le statut du streamer.");
    }
  };

  const handleDeleteStreamer = async (streamer: StreamerItem) => {
    const ok = await confirmDialog({
      title: `Supprimer ${streamer.displayName || streamer.username} ?`,
      message: `Le bot cessera de surveiller ses lives ${streamer.platform.toUpperCase()} et n'enverra plus d'alertes dans Discord.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
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
    // mode === "default"
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
      if (activeTab === "live" && !s.isLive) return false;
      if (activeTab === "twitch" && s.platform !== "twitch") return false;
      if (activeTab === "youtube" && s.platform !== "youtube") return false;
      if (activeTab === "kick" && s.platform !== "kick") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.username.toLowerCase().includes(q) || s.displayName.toLowerCase().includes(q);
        const matchesGame = s.game?.toLowerCase().includes(q) || s.gameFilter?.toLowerCase().includes(q);
        const matchesTitle = s.title?.toLowerCase().includes(q);
        return matchesName || matchesGame || matchesTitle;
      }
      return true;
    });
  }, [streamers, activeTab, searchQuery]);

  const liveCount = useMemo(() => streamers.filter((s) => s.isLive).length, [streamers]);
  const twitchCount = useMemo(() => streamers.filter((s) => s.platform === "twitch").length, [streamers]);
  const youtubeCount = useMemo(() => streamers.filter((s) => s.platform === "youtube").length, [streamers]);
  const kickCount = useMemo(() => streamers.filter((s) => s.platform === "kick").length, [streamers]);

  // Live embed preview color
  const livePreviewColor = useMemo(() => {
    return config.embedColor || "#9146FF";
  }, [config.embedColor]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Background ambient motion glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-full max-w-5xl bg-gradient-to-b from-purple-600/10 via-rose-600/5 to-transparent blur-3xl opacity-60" />

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--panel-border)] pb-5">
        <ModulePageTitle
          icon={<Radio className="h-5 w-5 text-purple-400" />}
          title="Alertes Streamers"
          subtitle="Twitch, YouTube & Kick en direct avec attribution @En Live et embeds ultra-fluides"
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
              Live Engine v2
            </span>
          }
        />

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <GuildSelector
            guilds={manageableGuilds}
            selectedGuild={selectedGuild}
            onSelect={(guild) => {
              userSelectedRef.current = true;
              setSelectedGuild(guild);
            }}
          />

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="group grid h-9 w-9 place-items-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--input-border-hover)] transition-all cursor-pointer"
            title="Rafraîchir les statuts"
          >
            <RefreshCw className={cn("h-4 w-4 transition-transform", loading && "animate-spin text-[var(--accent-primary)]")} />
          </button>

          <button
            type="button"
            onClick={() => setShowConfigDrawer(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--input-border-hover)] transition-all cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-purple-400" />
            <span>Options & Salons</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-[var(--inset-radius)] bg-[var(--accent-primary)] text-white hover:opacity-95 shadow-lg shadow-[var(--accent-primary)]/20 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ajouter un streamer</span>
          </button>
        </div>
      </div>

      {/* Offline banner if applicable */}
      {offline && selectedGuild && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Mode hors-ligne : la synchronisation en direct avec le bot Discord est temporairement indisponible. Les réglages sont stockés sur votre appareil.</span>
        </motion.div>
      )}

      {/* Bot invite banner if bot not in server */}
      {selectedGuild && botGuildIds !== null && !botGuildIds.includes(selectedGuild.id) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-4 py-3 text-xs text-[var(--text-primary)]"
        >
          <div className="flex items-center gap-2.5">
            <Bot className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
            <span>Le bot ETHONE n&apos;est pas encore présent sur ce serveur. Invitez-le pour activer les alertes stream et l&apos;attribution automatique des rôles.</span>
          </div>
          <a
            href={BOT_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            Inviter ETHONE
          </a>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 backdrop-blur-md p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Streamers suivis</span>
            <Users className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{streamers.length}</div>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Surveillance 24/7</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="rounded-[var(--panel-radius)] border border-rose-500/30 bg-rose-500/5 backdrop-blur-md p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-rose-300 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              En direct
            </span>
            <Flame className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-rose-200">{liveCount}</div>
            <p className="mt-0.5 text-[11px] text-rose-300/70">
              {liveCount > 0 ? "Diffusion active en ce moment" : "Aucun stream actif"}
            </p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 backdrop-blur-md p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Plateformes</span>
            <Globe className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#9146FF]/15 text-[#A970FF] border border-[#9146FF]/30">
              <TwitchLogo className="h-3 w-3" /> {twitchCount}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FF0000]/15 text-[#FF4D4D] border border-[#FF0000]/30">
              <YouTubeLogo className="h-3 w-3" /> {youtubeCount}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#53FC18]/15 text-[#53FC18] border border-[#53FC18]/30">
              <KickLogo className="h-3 w-3" /> {kickCount}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">Twitch • YouTube • Kick</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 backdrop-blur-md p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Rôle @En Live auto</span>
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              {config.autoLiveRoleEnabled && config.liveRoleId ? (
                <span className="text-purple-300 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  @{roles.find((r) => r.id === config.liveRoleId)?.name || "En Live"}
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">Non configuré</span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">Attribution instantanée</p>
          </div>
        </motion.div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-raised)]/50 border border-[var(--panel-border)] overflow-x-auto">
          {[
            { id: "all", label: `Tous (${streamers.length})` },
            {
              id: "live",
              label: (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {`En direct (${liveCount})`}
                </span>
              ),
            },
            {
              id: "twitch",
              label: (
                <span className="flex items-center gap-1.5">
                  <TwitchLogo className="h-3 w-3 text-[#A970FF]" />
                  {`Twitch (${twitchCount})`}
                </span>
              ),
            },
            {
              id: "youtube",
              label: (
                <span className="flex items-center gap-1.5">
                  <YouTubeLogo className="h-3 w-3 text-[#FF4D4D]" />
                  {`YouTube (${youtubeCount})`}
                </span>
              ),
            },
            {
              id: "kick",
              label: (
                <span className="flex items-center gap-1.5">
                  <KickLogo className="h-3 w-3 text-[#53FC18]" />
                  {`Kick (${kickCount})`}
                </span>
              ),
            },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap",
                  isSelected ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
              >
                {isSelected && (
                  <motion.span
                    layoutId="activeFilterStreamers"
                    className="absolute inset-0 rounded-lg bg-[var(--surface-raised)] border border-[var(--panel-border)] shadow-sm"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher streamer, jeu..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Streamer Cards Grid */}
      {filteredStreamers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[var(--panel-radius)] border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/20 p-12 text-center flex flex-col items-center justify-center space-y-3"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Radio className="h-6 w-6" />
          </div>
          <div className="max-w-sm">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {searchQuery ? "Aucun streamer ne correspond à votre recherche" : "Aucun streamer configuré"}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {searchQuery
                ? "Essayez avec un autre nom, plateforme ou mot-clé."
                : "Ajoutez vos créateurs favoris sur Twitch, YouTube ou Kick pour recevoir des alertes automatiques et attribuer le rôle @En Live."}
            </p>
          </div>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-[var(--inset-radius)] bg-[var(--accent-primary)] text-white hover:opacity-95 shadow transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter un premier streamer</span>
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredStreamers.map((streamer, idx) => {
              const plat = PLATFORM_CONFIG[streamer.platform];
              const IconComp = plat.icon;
              const isTesting = testingId === streamer.id;

              return (
                <motion.div
                  key={streamer.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-[var(--panel-radius)] border bg-[var(--surface-raised)]/40 backdrop-blur-xl p-5 transition-all duration-300 hover:shadow-xl hover:border-[var(--input-border-hover)]",
                    streamer.paused && "opacity-75 bg-[var(--surface-raised)]/20 border-dashed",
                    streamer.isLive && !streamer.paused
                      ? "border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)] bg-gradient-to-b from-rose-500/5 via-[var(--surface-raised)]/50 to-[var(--surface-raised)]/30"
                      : "border-[var(--panel-border)]"
                  )}
                >
                  {/* Top Bar: Platform pill + Live Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                        plat.badgeBg,
                        plat.badgeText,
                        plat.border
                      )}
                    >
                      <IconComp className="h-3 w-3" />
                      {plat.name}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {streamer.paused ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          ⏸️ En pause
                        </span>
                      ) : streamer.isLive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                          </span>
                          EN DIRECT
                          {streamer.viewers !== null && (
                            <span className="text-[11px] font-normal text-rose-200/80">
                              • {streamer.viewers.toLocaleString()}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-[var(--text-muted)] bg-[var(--surface-raised)]/80 border border-[var(--panel-border)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                          Hors ligne
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Profile Header */}
                  <div className="mt-4 flex items-center gap-3.5">
                    <div className="relative">
                      {streamer.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={streamer.avatarUrl}
                          alt={streamer.displayName}
                          className={cn(
                            "h-12 w-12 rounded-2xl object-cover border-2 shadow",
                            streamer.isLive ? "border-rose-500" : "border-[var(--panel-border)]"
                          )}
                        />
                      ) : (
                        <div
                          className={cn(
                            "h-12 w-12 rounded-2xl grid place-items-center font-bold text-base text-white border-2",
                            streamer.isLive ? "border-rose-500 bg-rose-600/30" : "border-[var(--panel-border)] bg-zinc-800"
                          )}
                        >
                          {(streamer.displayName || streamer.username).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={cn(
                          "absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-lg border border-[var(--panel-border)] p-0.5",
                          plat.badgeBg,
                          plat.badgeText
                        )}
                      >
                        <IconComp className="h-3 w-3" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="truncate text-sm font-bold text-[var(--text-primary)]">
                          {streamer.displayName || streamer.username}
                        </h4>
                        <a
                          href={streamer.streamUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          title="Voir sur la plateforme"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <p className="truncate text-xs text-[var(--text-muted)]">@{streamer.username}</p>
                    </div>
                  </div>

                  {/* Tags & Badges: Linked Discord Member & Game Filter */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {streamer.discordUserId && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        <Bot className="h-2.5 w-2.5" />
                        Lié : {members.find((m) => m.id === streamer.discordUserId)?.displayName || `@${streamer.discordUserId}`}
                      </span>
                    )}
                    {streamer.gameFilter && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
                        🎯 Jeu : {streamer.gameFilter}
                      </span>
                    )}
                    {streamer.minViewers > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                        👥 Min {streamer.minViewers}
                      </span>
                    )}
                  </div>

                  {/* Stream Details if Live */}
                  {streamer.isLive ? (
                    <div className="mt-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 space-y-1.5">
                      <p className="line-clamp-2 text-xs font-medium text-[var(--text-primary)]">
                        {streamer.title || "Titre de diffusion non communiqué"}
                      </p>
                      {streamer.game && (
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-300 font-semibold">
                          <span>🎮</span>
                          <span className="truncate">{streamer.game}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/20 p-2.5 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Dernier live
                      </span>
                      <span>
                        {streamer.lastLiveAt ? new Date(streamer.lastLiveAt).toLocaleDateString("fr-FR") : "Jamais détecté"}
                      </span>
                    </div>
                  )}

                  {/* Custom Notification Routing Info */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)] border-t border-[var(--panel-border)]/50 pt-2.5">
                    <span className="truncate max-w-[55%]">
                      Salon : <span className="font-semibold text-[var(--text-secondary)]">{resolveStreamerChannelLabel(streamer)}</span>
                    </span>
                    <span className="truncate max-w-[42%] text-right font-semibold text-[var(--text-secondary)]">
                      {resolveStreamerPingLabel(streamer)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center justify-between gap-1.5 border-t border-[var(--panel-border)] pt-3">
                    <button
                      type="button"
                      onClick={() => handleTestAlert(streamer)}
                      disabled={isTesting || streamer.paused}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-raised)]/80 hover:bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[var(--text-primary)] transition-all cursor-pointer disabled:opacity-40"
                      title="Envoie un aperçu d'alerte dans Discord"
                    >
                      {isTesting ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--accent-primary)]" />
                      ) : (
                        <Play className="h-3.5 w-3.5 text-rose-400" />
                      )}
                      <span>Tester</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePause(streamer)}
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-lg border text-xs transition-all cursor-pointer",
                        streamer.paused
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                          : "border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                      title={streamer.paused ? "Reprendre la surveillance" : "Mettre en pause"}
                    >
                      {streamer.paused ? "▶" : "⏸"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingStreamer(streamer)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                      title="Modifier les options de ce streamer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteStreamer(streamer)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-rose-400 transition-all cursor-pointer"
                      title="Supprimer ce streamer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Embed Live Mock / Visualizer */}
      <div className="mt-8 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 backdrop-blur-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Aperçu en direct du rendu Discord (Embed dynamique personnalisé)
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Voici exactement comment vos alertes s&apos;affichent sur votre serveur selon vos options de couleur, miniatures et pings.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
            Fidélité pixel Discord 100%
          </span>
        </div>

        {/* Mock Discord message */}
        <div className="rounded-2xl border border-[#2b2d31] bg-[#1e1f22] p-4 text-[#dbdee1] font-sans text-xs space-y-2">
          {/* Bot author line */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-purple-600 grid place-items-center font-bold text-white text-xs">
              E
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white">ETHONE</span>
                <span className="bg-[#5865f2] text-white text-[9px] font-bold px-1 rounded uppercase">BOT</span>
                <span className="text-[10px] text-[#949ba4]">Aujourd&apos;hui à 19:42</span>
              </div>
              <p className="mt-0.5 text-xs text-[#b5bac1]">
                {config.defaultPing !== "none" && (
                  <span className="text-[#5865f2] font-medium bg-[#5865f2]/15 px-1 py-0.5 rounded mr-1.5">
                    {config.defaultPing === "here"
                      ? "@here"
                      : config.defaultPing === "everyone"
                      ? "@everyone"
                      : config.defaultRoleId
                      ? `@${roles.find((r) => r.id === config.defaultRoleId)?.name || "Streamers"}`
                      : "@Notif"}
                  </span>
                )}
                {config.defaultMessage.replace("{streamer}", "Gotaga").replace("{platform}", "Twitch").replace("{url}", "https://twitch.tv/gotaga")}
              </p>
            </div>
          </div>

          {/* Discord Embed card */}
          <div
            className="ml-10 rounded-lg border-l-4 bg-[#2b2d31] p-3.5 max-w-lg space-y-2.5 transition-colors"
            style={{ borderLeftColor: livePreviewColor }}
          >
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <TwitchLogo className="h-3.5 w-3.5 text-[#A970FF]" />
                Gotaga est en direct sur Twitch !
              </div>
              <span className="bg-red-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded tracking-wider">
                LIVE
              </span>
            </div>

            <div>
              <a
                href="https://twitch.tv"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-bold text-[#00a8fc] hover:underline"
              >
                🔴 GRAND TOURNOI ESPORT & MULTI-GAMING AVEC LE CHAT !
              </a>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-[#949ba4]">
                {config.showGame !== false && <span>🎮 VALORANT</span>}
                {config.showViewers !== false && <span>👥 14 850 spectateurs</span>}
              </div>
            </div>

            {config.showThumbnail !== false && (
              <div className="relative aspect-video w-full rounded-md overflow-hidden bg-black/60 border border-[#35373c] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  EN DIRECT
                </div>
                <span className="text-white/40 text-xs font-mono">Miniature HD Stream</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                className="w-full py-1.5 px-3 rounded bg-[#35373c] hover:bg-[#404249] text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-[#404249]"
              >
                <span>📺</span>
                <span>{config.customButtonText || "Regarder sur Twitch"}</span>
              </button>
            </div>

            <div className="text-[10px] text-[#949ba4] pt-1 border-t border-[#35373c] flex items-center justify-between">
              <span>ETHONE Stream Engine • Détection instantanée</span>
              <span>twitch.tv/gotaga</span>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Modal with Tabs */}
      <AnimatePresence>
        {showConfigDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfigDrawer(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[var(--accent-primary)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Options & Personnalisation avancée des Streams
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigDrawer(false)}
                  className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Config Navigation Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-raised)]/50 border border-[var(--panel-border)] text-xs">
                {[
                  { id: "channels", label: "Salons & Routage" },
                  { id: "roles", label: "Pings & Rôles" },
                  { id: "embed", label: "Apparence de l'Embed" },
                  { id: "rules", label: "Anti-Spam & Règles" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setConfigTab(t.id as any)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer",
                      configTab === t.id
                        ? "bg-[var(--accent-primary)] text-white shadow-sm font-semibold"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab: Salons & Routage */}
              {configTab === "channels" && (
                <div className="space-y-4 text-xs">
                  <Switch
                    checked={config.enabled}
                    onChange={(v) => setConfig((c) => ({ ...c, enabled: v }))}
                    label="Module d'alertes actif"
                    hint="Active la détection périodique automatique et l'envoi d'embeds dans Discord."
                  />

                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Salon d&apos;annonce général par défaut</label>
                    <ChannelPicker
                      value={config.defaultChannelId ?? ""}
                      onChange={(id) => setConfig((c) => ({ ...c, defaultChannelId: id || null }))}
                      channels={channels}
                      emptyLabel="— Choisir un salon par défaut —"
                    />
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Utilisé si un streamer n&apos;a pas de salon dédié ou de salon par plateforme.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-3.5 space-y-3">
                    <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-purple-400" />
                      Salons dédiés par plateforme (Optionnel)
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Permet d&apos;acheminer automatiquement les alertes dans des salons séparés pour chaque plateforme.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-[#A970FF]">
                          <TwitchLogo className="h-3 w-3" /> Salon Twitch
                        </label>
                        <ChannelPicker
                          value={config.twitchChannelId ?? ""}
                          onChange={(id) => setConfig((c) => ({ ...c, twitchChannelId: id || null }))}
                          channels={channels}
                          emptyLabel="— Hériter du général —"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-[#FF4D4D]">
                          <YouTubeLogo className="h-3 w-3" /> Salon YouTube
                        </label>
                        <ChannelPicker
                          value={config.youtubeChannelId ?? ""}
                          onChange={(id) => setConfig((c) => ({ ...c, youtubeChannelId: id || null }))}
                          channels={channels}
                          emptyLabel="— Hériter du général —"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-[#53FC18]">
                          <KickLogo className="h-3 w-3" /> Salon Kick
                        </label>
                        <ChannelPicker
                          value={config.kickChannelId ?? ""}
                          onChange={(id) => setConfig((c) => ({ ...c, kickChannelId: id || null }))}
                          channels={channels}
                          emptyLabel="— Hériter du général —"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Pings & Rôles */}
              {configTab === "roles" && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Mention globale par défaut</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: "none", label: "Aucune" },
                        { id: "here", label: "@here" },
                        { id: "everyone", label: "@everyone" },
                        { id: "role", label: "Rôle dédié" },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setConfig((c) => ({ ...c, defaultPing: m.id as any }))}
                          className={cn(
                            "py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                            config.defaultPing === m.id
                              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)] font-bold"
                              : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)]"
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {config.defaultPing === "role" && (
                    <div className="space-y-1.5">
                      <label className="font-semibold text-[var(--text-primary)]">Rôle à notifier par défaut</label>
                      <RolePicker
                        value={config.defaultRoleId}
                        onChange={(id) => setConfig((c) => ({ ...c, defaultRoleId: id || null }))}
                        roles={roles}
                        guildId={selectedGuild?.id}
                        placeholder="Sélectionner le rôle à ping..."
                        emptyLabel="— Aucun rôle —"
                        allowClear
                        size="sm"
                      />
                    </div>
                  )}

                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-3.5 space-y-3">
                    <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5 text-purple-400" />
                      Rôles de notification par plateforme (Optionnel)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-[#A970FF]">
                          <TwitchLogo className="h-3 w-3" /> Notif Twitch
                        </label>
                        <RolePicker
                          value={config.twitchRoleId}
                          onChange={(id) => setConfig((c) => ({ ...c, twitchRoleId: id || null }))}
                          roles={roles}
                          guildId={selectedGuild?.id}
                          placeholder="— Rôle Twitch —"
                          emptyLabel="— Hériter —"
                          allowClear
                          size="sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-[#FF4D4D]">
                          <YouTubeLogo className="h-3 w-3" /> Notif YouTube
                        </label>
                        <RolePicker
                          value={config.youtubeRoleId}
                          onChange={(id) => setConfig((c) => ({ ...c, youtubeRoleId: id || null }))}
                          roles={roles}
                          guildId={selectedGuild?.id}
                          placeholder="— Rôle YouTube —"
                          emptyLabel="— Hériter —"
                          allowClear
                          size="sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-[#53FC18]">
                          <KickLogo className="h-3 w-3" /> Notif Kick
                        </label>
                        <RolePicker
                          value={config.kickRoleId}
                          onChange={(id) => setConfig((c) => ({ ...c, kickRoleId: id || null }))}
                          roles={roles}
                          guildId={selectedGuild?.id}
                          placeholder="— Rôle Kick —"
                          emptyLabel="— Hériter —"
                          allowClear
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        Rôle automatique @En Live pour les membres
                      </label>
                      <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                        Automatisé
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Attribué automatiquement au membre Discord lorsqu&apos;il lance son live et retiré dès la fin de diffusion.
                    </p>
                    <RolePicker
                      value={config.liveRoleId}
                      onChange={(id) => setConfig((c) => ({ ...c, liveRoleId: id || null }))}
                      roles={roles}
                      guildId={selectedGuild?.id}
                      placeholder="Choisir le rôle @En Live..."
                      emptyLabel="— Désactivé —"
                      allowClear
                      size="sm"
                    />
                    <Switch
                      checked={config.autoLiveRoleEnabled}
                      onChange={(v) => setConfig((c) => ({ ...c, autoLiveRoleEnabled: v }))}
                      label="Activer l'attribution automatique"
                      hint="Le rôle du bot doit être positionné au-dessus du rôle @En Live dans la hiérarchie Discord."
                    />
                  </div>
                </div>
              )}

              {/* Tab: Apparence de l'Embed */}
              {configTab === "embed" && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Couleur d&apos;accent de l&apos;embed</label>
                    <div className="flex flex-wrap items-center gap-2">
                      {PRESET_EMBED_COLORS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, embedColor: c.value || null }))}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                            config.embedColor === (c.value || null)
                              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-white font-bold"
                              : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)]"
                          )}
                        >
                          {c.value && (
                            <span className="h-3 w-3 rounded-full border border-black/30" style={{ backgroundColor: c.value }} />
                          )}
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <Switch
                      checked={config.showViewers}
                      onChange={(v) => setConfig((c) => ({ ...c, showViewers: v }))}
                      label="Nombre de spectateurs"
                      hint="Affiche le compteur de viewers en direct."
                    />
                    <Switch
                      checked={config.showGame}
                      onChange={(v) => setConfig((c) => ({ ...c, showGame: v }))}
                      label="Catégorie / Jeu"
                      hint="Affiche la catégorie ou le jeu joué."
                    />
                    <Switch
                      checked={config.showThumbnail}
                      onChange={(v) => setConfig((c) => ({ ...c, showThumbnail: v }))}
                      label="Miniature HD"
                      hint="Affiche la capture d'écran du stream."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Texte du bouton Discord</label>
                    <input
                      type="text"
                      value={config.customButtonText || ""}
                      onChange={(e) => setConfig((c) => ({ ...c, customButtonText: e.target.value || null }))}
                      placeholder="Regarder le live (par défaut)"
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Modèle de notification</label>
                    <textarea
                      rows={2}
                      value={config.defaultMessage}
                      onChange={(e) => setConfig((c) => ({ ...c, defaultMessage: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Variables : <code className="bg-white/5 px-1 py-0.5 rounded">{"{streamer}"}</code>,{" "}
                      <code className="bg-white/5 px-1 py-0.5 rounded">{"{platform}"}</code>,{" "}
                      <code className="bg-white/5 px-1 py-0.5 rounded">{"{url}"}</code>,{" "}
                      <code className="bg-white/5 px-1 py-0.5 rounded">{"{game}"}</code>
                    </p>
                  </div>
                </div>
              )}

              {/* Tab: Anti-Spam & Règles */}
              {configTab === "rules" && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">Action lorsque le live se termine</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "update_offline", label: "Mettre à jour l'embed", hint: "Affiche [TERMINÉ] et coupe les liens" },
                        { id: "delete", label: "Supprimer le message", hint: "Nettoie le salon automatiquement" },
                        { id: "keep", label: "Conserver tel quel", hint: "Laisse l'alerte d'origine" },
                      ].map((act) => (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => setConfig((c) => ({ ...c, offlineAction: act.id as any }))}
                          className={cn(
                            "flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer",
                            config.offlineAction === act.id
                              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)]"
                              : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)]"
                          )}
                        >
                          <span className="font-bold text-xs">{act.label}</span>
                          <span className="text-[10px] text-[var(--text-muted)] mt-0.5">{act.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text-primary)]">
                      Délai anti-reconnexion (Cooldown : {config.cooldownMinutes} min)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={120}
                      step={5}
                      value={config.cooldownMinutes}
                      onChange={(e) => setConfig((c) => ({ ...c, cooldownMinutes: Number(e.target.value) }))}
                      className="w-full accent-[var(--accent-primary)]"
                    />
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Évite d&apos;envoyer une seconde alerte si le créateur subit une brève déconnexion internet et relance son stream dans les {config.cooldownMinutes} minutes.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-[var(--panel-border)] pt-4">
                <button
                  type="button"
                  onClick={() => setShowConfigDrawer(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-95 cursor-pointer disabled:opacity-50"
                >
                  {savingConfig && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Enregistrer les options</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Streamer Modal */}
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
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Ajouter un créateur à surveiller</h3>
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
                {/* Platform Selector Cards */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--text-primary)]">Plateforme de streaming</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(["twitch", "youtube", "kick"] as StreamPlatform[]).map((p) => {
                      const cfg = PLATFORM_CONFIG[p];
                      const Icon = cfg.icon;
                      const isSel = formPlatform === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFormPlatform(p)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all cursor-pointer",
                            isSel
                              ? cn(cfg.border, cfg.badgeBg, cfg.badgeText, "font-bold ring-1", cfg.border)
                              : "border-[var(--panel-border)] bg-[var(--surface-raised)]/30 text-[var(--text-muted)] hover:border-[var(--input-border-hover)]"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs">{cfg.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Username Input */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Identifiant / Pseudo sur {PLATFORM_CONFIG[formPlatform].name}
                  </label>
                  <div className="relative flex items-center rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] overflow-hidden focus-within:border-[var(--accent-primary)]">
                    <span className="px-3 text-xs text-[var(--text-muted)] select-none border-r border-[var(--panel-border)] bg-[var(--surface-raised)]/50">
                      {PLATFORM_CONFIG[formPlatform].prefix}
                    </span>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder={PLATFORM_CONFIG[formPlatform].placeholder}
                      className="w-full px-3 py-2 text-xs text-[var(--text-primary)] bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Optional Custom Channel */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Salon de notification dédié (Optionnel)
                  </label>
                  <ChannelPicker
                    value={formChannelId}
                    onChange={(id) => setFormChannelId(id || "")}
                    channels={channels}
                    emptyLabel="— Hériter du salon configuré —"
                  />
                </div>

                {/* Mention Mode & Role */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--text-primary)]">Type de mention</label>
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
                    <label className="font-semibold text-[var(--text-primary)]">Rôle à notifier</label>
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

                {/* Linked Discord Member for @En Live */}
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 space-y-2">
                  <label className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-purple-400" />
                    Lier à un membre Discord (Rôle @En Live garanti)
                  </label>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Associe ce streamer au compte Discord d&apos;un membre de ce serveur. Le rôle @En Live lui sera donné même si ses pseudos diffèrent.
                  </p>
                  <select
                    value={formDiscordUserId}
                    onChange={(e) => setFormDiscordUserId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  >
                    <option value="">— Aucun membre lié (détection automatique par pseudo) —</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName} (@{m.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Content Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--text-primary)]">Filtre de jeu (Optionnel)</label>
                    <input
                      type="text"
                      value={formGameFilter}
                      onChange={(e) => setFormGameFilter(e.target.value)}
                      placeholder="ex: Valorant, GTA V"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--text-primary)]">Spectateurs minimum</label>
                    <input
                      type="number"
                      min={0}
                      value={formMinViewers}
                      onChange={(e) => setFormMinViewers(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0 (toujours alerter)"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                </div>

                {/* Custom Message */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Message personnalisé (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={formCustomMessage}
                    onChange={(e) => setFormCustomMessage(e.target.value)}
                    placeholder="Laisse vide pour utiliser le modèle général"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-[var(--panel-border)] pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formUsername.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-95 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>Ajouter et vérifier</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Streamer Modal */}
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
                    className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--text-primary)]">Spectateurs minimum</label>
                    <input
                      type="number"
                      min={0}
                      value={editingStreamer.minViewers || 0}
                      onChange={(e) => setEditingStreamer({ ...editingStreamer, minViewers: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--text-primary)]">Message d&apos;annonce personnalisé</label>
                  <input
                    type="text"
                    value={editingStreamer.customMessage || ""}
                    onChange={(e) =>
                      setEditingStreamer({ ...editingStreamer, customMessage: e.target.value || null })
                    }
                    placeholder="Laisse vide pour utiliser le modèle général"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[var(--panel-border)] pt-4">
                <button
                  type="button"
                  onClick={() => setEditingStreamer(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStreamer(editingStreamer)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-95 cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
