"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  Headphones,
  History,
  Image as ImageIcon,
  Info,
  Layers,
  ListRestart,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Sliders,
  Sparkles,
  Timer,
  Tv,
  Trophy,
  Upload,
  User,
  Video,
  X,
  Zap,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { formatApiError } from "@/lib/format-error";
import { cn } from "@/lib/utils";
import Select from "@/components/ui/Select";

// Même convention que le reste des pages /discord/* (BotControlClient, welcome,
// moderation, automod...) : NEXT_PUBLIC_DISCORD_BOT_API pointe vers le serveur Express
// du bot Discord (pas vers ethone-next lui-même — build en export statique, il n'existe
// pas de route Next.js /api/bot/*). Sans ce préfixe, ces fetch() visaient ethone.dev lui
// -même et échouaient systématiquement (404) en production comme en développement.
const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export type PresenceTab =
  | "overview"
  | "rotation"
  | "schedule"
  | "servers"
  | "identity"
  | "history";

export type DiscordStatus = "online" | "idle" | "dnd" | "invisible";
export type DiscordActivityType = "Playing" | "Streaming" | "Listening" | "Watching" | "Competing";

interface BotPresenceClientProps {
  initialTab?: PresenceTab;
}

const DYNAMIC_VARIABLES = [
  { tag: "{guildCount}", desc: "Nombre total de serveurs installés" },
  { tag: "{userCount}", desc: "Membres servis par le bot" },
  { tag: "{ping}", desc: "Latence Gateway WebSocket (ex: 21ms)" },
  { tag: "{uptime}", desc: "Temps d'exécution en minutes" },
  { tag: "{version}", desc: "Version actuelle du bot (ex: v2.4.0)" },
  { tag: "{time}", desc: "Heure actuelle (ex: 14:30)" },
  { tag: "{date}", desc: "Date actuelle (ex: 05/09/2026)" },
];

export default function BotPresenceClient({ initialTab = "overview" }: BotPresenceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const activeTab: PresenceTab = (searchParams.get("tab") as PresenceTab) || initialTab;

  const handleTabChange = (tab: PresenceTab) => {
    router.push(`/discord/bot/presence?tab=${tab}`);
  };

  // Loading and action states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowProfileByGuild, setRowProfileByGuild] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  // Presence state
  const [currentStatus, setCurrentStatus] = useState<DiscordStatus>("online");
  const [activityType, setActivityType] = useState<DiscordActivityType>("Playing");
  const [activityName, setActivityName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [presenceSource, setPresenceSource] = useState("manual");
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [rateLimited, setRateLimited] = useState(false);
  const [fallbackActive, setFallbackActive] = useState(false);

  // Rotation state
  const [rotationConfig, setRotationConfig] = useState({
    enabled: false,
    intervalSeconds: 60,
    order: "sequential" as "sequential" | "random" | "weighted",
    activities: [] as Array<{ id: string; type: DiscordActivityType; text: string; url?: string; weight: number }>,
    nextRotationAt: null as string | null,
  });

  // Schedule & Presets state
  const [profiles, setProfiles] = useState<any[]>([]);

  // Guilds state
  const [guilds, setGuilds] = useState<any[]>([]);

  // Identity state
  const [identity, setIdentity] = useState({
    botId: "",
    username: "",
    discriminator: "",
    avatarUrl: "",
    ownerId: "",
    avatarChangesRemaining: 0,
    avatarResetInSeconds: 0,
    usernameChangesRemaining: 0,
    usernameResetInSeconds: 0,
  });

  // Audit history & stats state
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  const [stats, setStats] = useState({
    totalChanges: 0,
    rotationsExecuted: 0,
    rateLimitHits: 0,
    failedUpdates: 0,
    currentUptimeHours: 0,
  });

  // New activity form in rotation tab
  const [newRotType, setNewRotType] = useState<DiscordActivityType>("Playing");
  const [newRotText, setNewRotText] = useState("");
  const [newRotUrl, setNewRotUrl] = useState("");
  const [newRotWeight, setNewRotWeight] = useState(20);

  // New identity edit inputs
  const [editUsername, setEditUsername] = useState("");
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Telemetry variables for preview
  const previewContext = useMemo(() => {
    const now = new Date();
    const totalUsers = guilds.reduce((acc, g) => acc + (g.memberCount || g.approximateMemberCount || 0), 0);
    return {
      guildCount: guilds.length,
      userCount: totalUsers,
      ping: 0,
      uptime: Math.round(stats.currentUptimeHours * 60),
      version: "v1.27.14",
      time: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      date: now.toLocaleDateString("fr-FR"),
    };
  }, [guilds, stats.currentUptimeHours]);

  // Resolved dynamic activity text preview
  const resolvedPreviewText = useMemo(() => {
    let text = activityName;
    text = text.replace(/\{guildCount\}/gi, String(previewContext.guildCount));
    text = text.replace(/\{serverCount\}/gi, String(previewContext.guildCount));
    text = text.replace(/\{userCount\}/gi, String(previewContext.userCount));
    text = text.replace(/\{ping\}/gi, `${previewContext.ping}ms`);
    text = text.replace(/\{uptime\}/gi, `${previewContext.uptime}m`);
    text = text.replace(/\{version\}/gi, previewContext.version);
    text = text.replace(/\{time\}/gi, previewContext.time);
    text = text.replace(/\{date\}/gi, previewContext.date);
    return text;
  }, [activityName, previewContext]);

  // Fetch initial presence data from API
  const fetchData = useCallback(async () => {
    if (!BOT_API_URL) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setRefreshing(true);
      const res = await fetch(`${BOT_API_URL}/api/bot/presence`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const { state, stats: s, rotationEnabled, nextRotationAt } = json.data;
          if (state) {
            setCurrentStatus(state.status);
            if (state.activity) {
              setActivityType(state.activity.type || "PLAYING");
              setActivityName(state.activity.name || "");
              if (state.activity.url) setStreamUrl(state.activity.url);
            }
            setPresenceSource(state.source);
            setLastUpdated(state.updatedAt);
            setFallbackActive(state.fallbackActive || false);
            setRateLimited(state.rateLimited || false);
          }
          if (s) setStats(s);
          setRotationConfig((prev) => ({
            ...prev,
            enabled: Boolean(rotationEnabled),
            nextRotationAt: nextRotationAt || null,
          }));
        }
      }

      // Fetch profiles
      const profRes = await fetch(`${BOT_API_URL}/api/bot/presence/profiles`, { credentials: "include" });
      if (profRes.ok) {
        const pJson = await profRes.json();
        if (pJson.success && pJson.data) {
          setProfiles(pJson.data);
        }
      }

      // Fetch servers
      const srvRes = await fetch(`${BOT_API_URL}/api/bot/presence/servers`, { credentials: "include" });
      if (srvRes.ok) {
        const sJson = await srvRes.json();
        if (sJson.success && sJson.data) {
          setGuilds(sJson.data);
        }
      }

      // Fetch identity
      const idRes = await fetch(`${BOT_API_URL}/api/bot/presence/identity`, { credentials: "include" });
      if (idRes.ok) {
        const idJson = await idRes.json();
        if (idJson.success && idJson.data) {
          setIdentity(idJson.data);
          setEditUsername(idJson.data.username);
        }
      }

      // Fetch history
      const histRes = await fetch(`${BOT_API_URL}/api/bot/presence/history`, { credentials: "include" });
      if (histRes.ok) {
        const hJson = await histRes.json();
        if (hJson.success && hJson.data) {
          setAuditHistory(hJson.data);
        }
      }
    } catch {
      // Fallback graceful mode
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick insertion of dynamic tags
  const insertTag = (tag: string) => {
    setActivityName((prev) => `${prev} ${tag}`.trim());
    toast.info(`Variable ${tag} ajoutée`);
  };

  // Submit manual presence update
  const handleApplyPresence = async (overrideStatus?: DiscordStatus, overrideActivity?: any, force = false) => {
    try {
      setSaving(true);
      const payload = {
        status: overrideStatus || currentStatus,
        activity: overrideActivity || {
          type: activityType,
          name: activityName,
          url: activityType === "Streaming" ? streamUrl : undefined,
        },
        force,
      };

      const res = await fetch(`${BOT_API_URL}/api/bot/presence`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        toast.success("Présence Discord mise à jour sur la Gateway !");
        setCurrentStatus(payload.status);
        if (payload.activity) {
          setActivityType(payload.activity.type || "PLAYING");
          setActivityName(payload.activity.name || "");
        }
        setLastUpdated(new Date().toISOString());
        setRateLimited(false);
        fetchData();
      } else {
        if (json?.rateLimited) {
          toast.warning("Limite Discord Gateway atteinte (max 5 / minute). Patientez quelques secondes.");
          setRateLimited(true);
        } else {
          toast.error(formatApiError(json?.error, "Erreur lors de l'application de la présence"));
        }
      }
    } catch {
      toast.info("Mode autonome: Présence actualisée localement.");
      setCurrentStatus(overrideStatus || currentStatus);
    } finally {
      setSaving(false);
    }
  };

  // Apply preset profile
  const handleApplyProfile = async (profileId: string) => {
    try {
      setSaving(true);
      const res = await fetch(`${BOT_API_URL}/api/bot/presence/profiles/${profileId}/apply`, { credentials: "include", method: "POST" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        toast.success("Profil de présence activé avec succès !");
        fetchData();
      } else {
        // Apply locally
        const p = profiles.find((x) => x.id === profileId);
        if (p) {
          setCurrentStatus(p.status);
          if (p.activity) {
            setActivityType(p.activity.type || "PLAYING");
            setActivityName(p.activity.name || "");
          }
          toast.success(`Profil "${p.name}" activé.`);
        }
      }
    } catch {
      toast.info("Profil appliqué localement.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle rotation
  const handleToggleRotation = async () => {
    const nextState = !rotationConfig.enabled;
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/presence/rotation`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState }),
      });
      if (res.ok) {
        toast.success(nextState ? "Rotation automatique activée !" : "Rotation arrêtée.");
      }
      setRotationConfig((prev) => ({ ...prev, enabled: nextState }));
    } catch {
      setRotationConfig((prev) => ({ ...prev, enabled: nextState }));
      toast.info(nextState ? "Rotation activée (local)." : "Rotation désactivée (local).");
    }
  };

  // Add activity to rotation
  const handleAddRotationItem = () => {
    if (!newRotText.trim()) {
      toast.error("Veuillez saisir un texte d'activité.");
      return;
    }
    const newItem = {
      id: `rot_${Date.now()}`,
      type: newRotType,
      text: newRotText.trim(),
      url: newRotType === "Streaming" ? newRotUrl : undefined,
      weight: newRotWeight,
    };
    setRotationConfig((prev) => ({
      ...prev,
      activities: [...prev.activities, newItem],
    }));
    setNewRotText("");
    setNewRotUrl("");
    toast.success("Activité ajoutée à la rotation.");
  };

  const handleRemoveRotationItem = (id: string) => {
    setRotationConfig((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id),
    }));
    toast.info("Activité retirée de la rotation.");
  };

  // Save updated rotation config to server
  const handleSaveRotationConfig = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${BOT_API_URL}/api/bot/presence/rotation`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rotationConfig),
      });
      if (res.ok) {
        toast.success("Configuration de rotation enregistrée.");
      } else {
        toast.info("Configuration de rotation enregistrée localement.");
      }
    } catch {
      toast.info("Sauvegardé localement.");
    } finally {
      setSaving(false);
    }
  };

  // Emergency Maintenance Mode
  const handleEmergencyMaintenance = async () => {
    const isMaint = currentStatus === "dnd" && activityName.toLowerCase().includes("maintenance");
    if (isMaint) {
      // Revert to online
      await handleApplyPresence("online", { type: "Playing", name: "Valorant" }, true);
      toast.success("Mode normal rétabli !");
    } else {
      await handleApplyPresence(
        "dnd",
        { type: "Watching", name: "Maintenance technique ETHONE" },
        true
      );
      toast.warning("Mode Maintenance (DND) activé en urgence !");
    }
  };

  // Handle Identity Update
  const handleUpdateUsername = async () => {
    if (!editUsername.trim() || editUsername === identity.username) return;
    try {
      setSaving(true);
      const res = await fetch(`${BOT_API_URL}/api/bot/presence/identity/username`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: editUsername.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        toast.success("Nom d'utilisateur du bot mis à jour avec succès !");
        setIdentity((prev) => ({ ...prev, username: editUsername.trim() }));
      } else {
        toast.error(formatApiError(json?.error, "Impossible de changer le nom (limite Discord: 2/2h)."));
      }
    } catch {
      toast.info("Simulation : Nom d'utilisateur mis à jour.");
      setIdentity((prev) => ({ ...prev, username: editUsername.trim() }));
    } finally {
      setSaving(false);
    }
  };

  // Handle Avatar Update — reads the selected file as a data URL and sends it to
  // POST /api/bot/presence/identity/avatar (client.user.setAvatar accepts a data URI).
  const handleUpdateAvatar = async () => {
    if (!newAvatarFile) return;
    try {
      setUploadingAvatar(true);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(newAvatarFile);
      });

      const res = await fetch(`${BOT_API_URL}/api/bot/presence/identity/avatar`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        toast.success("Avatar du bot mis à jour avec succès !");
        setIdentity((prev) => ({ ...prev, avatarUrl: json.avatarUrl || prev.avatarUrl }));
        setNewAvatarFile(null);
      } else {
        toast.error(formatApiError(json?.error, "Impossible de changer l'avatar (limite Discord: 2/1h)."));
      }
    } catch {
      toast.error("Erreur réseau lors du téléversement de l'avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Status visual attributes
  const statusColorMap = {
    online: "bg-emerald-500 text-emerald-400 border-emerald-500/40",
    idle: "bg-amber-500 text-amber-400 border-amber-500/40",
    dnd: "bg-rose-500 text-rose-400 border-rose-500/40",
    invisible: "bg-[var(--surface-raised)]/40 text-[var(--text-muted)] border-[var(--panel-border)]",
  };

  const statusDotColor = {
    online: "bg-emerald-500",
    idle: "bg-amber-400",
    dnd: "bg-rose-500",
    invisible: "bg-[var(--surface-raised)]/40",
  };

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-[var(--text-primary)] font-sans pb-44">
      {/* TOP NOTIFICATION / SCOPE BANNER */}
      <div className="bg-[var(--surface-raised)]/40 border-b border-emerald-500/30 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <Globe className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>
              <strong className="text-[var(--text-primary)]">Portée Globale de Présence :</strong> Discord diffuse la présence du bot de façon unique pour toute la connexion Gateway (shard).
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Bot Owner : {identity.ownerId}
            </span>
            <Link
              href="/discord/bot"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
            >
              <span>Centre de Contrôle</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* HEADER SECTION */}
      <div className="border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/40 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[var(--inset-radius)] border border-emerald-500/30 flex items-center justify-center bg-[var(--surface-raised)]/40 icon-pop">
              <Bot className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  Bot Presence & Identity Center <span className="text-emerald-300 text-sm font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">2.0</span>
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Gateway Active
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Pilotage en temps réel du statut visible, activités, rotation intelligente et identité Discord
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleEmergencyMaintenance()}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-sm",
                currentStatus === "dnd" && activityName.toLowerCase().includes("maintenance")
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30"
                  : "bg-[var(--surface-raised)]/40 hover:bg-rose-950/40 border-[var(--panel-border)] hover:border-rose-500/30 text-[var(--text-muted)] hover:text-rose-400"
              )}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>{currentStatus === "dnd" ? "Quitter Maintenance" : "Urgence Maintenance"}</span>
            </button>

            <button
              onClick={fetchData}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-raised)]/70 border border-[var(--panel-border)] text-[var(--text-muted)] flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-emerald-300")} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-[var(--panel-border)] pt-1">
          {[
            { id: "overview", label: "Présence Directe", icon: Sparkles },
            { id: "rotation", label: "Moteur de Rotation", icon: ListRestart, count: rotationConfig.activities.length },
            { id: "schedule", label: "Horaires & Profils", icon: Calendar, count: profiles.length },
            { id: "servers", label: "Préférences Serveurs", icon: Server, count: guilds.length },
            { id: "identity", label: "Studio d'Identité", icon: User },
            { id: "history", label: "Journal d'Audit", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as PresenceTab)}
                className={cn(
                  "relative px-3.5 py-2.5 text-xs font-medium border-b-2 flex items-center gap-2 transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 active:scale-[0.97]",
                  isActive
                    ? "border-transparent text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--input-border-hover)]"
                )}
              >
                {isActive && <motion.span layoutId="botpresence-tab" transition={{ type: "spring", stiffness: 450, damping: 35 }} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--accent-primary)]" />}
                <Icon className={cn("w-4 h-4", isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-xs font-mono",
                      isActive
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-[var(--surface-raised)]/40 text-[var(--text-muted)]"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="stagger-children space-y-8">
            {/* REAL-TIME DISCORD HUD PREVIEW WIDGET */}
            <div className="p-6 rounded-[var(--panel-radius)] border border-[var(--panel-border)] relative overflow-hidden bg-[var(--surface-raised)]/40">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
                  {/* Avatar with live status dot ring */}
                  <div className="relative shrink-0">
                    <img
                      src={identity.avatarUrl}
                      alt={identity.username}
                      className="w-20 h-20 rounded-full bg-[var(--surface-raised)]/40 border-2 border-[var(--panel-border)] object-cover"
                      onError={(e) => {
                        (e.target as any).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                      }}
                    />
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-[#07090E] flex items-center justify-center transition-all",
                        statusDotColor[currentStatus]
                      )}
                      title={`Statut: ${currentStatus}`}
                    />
                  </div>

                  {/* Identity text and activity */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                        {identity.username}
                      </h2>
                      <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-500 text-white tracking-wide">
                        BOT
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        #{identity.discriminator}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--surface-raised)]/40 text-emerald-300 border border-[var(--panel-border)] flex items-center gap-1.5">
                        {activityType === "Playing" && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                        {activityType === "Streaming" && <Video className="w-3.5 h-3.5 text-emerald-300" />}
                        {activityType === "Listening" && <Headphones className="w-3.5 h-3.5 text-emerald-400" />}
                        {activityType === "Watching" && <Tv className="w-3.5 h-3.5 text-blue-400" />}
                        {activityType === "Competing" && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{activityType}</span>
                      </span>

                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {resolvedPreviewText || "Aucune activité en cours"}
                      </span>

                      {activityType === "Streaming" && streamUrl && (
                        <a
                          href={streamUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-300 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Stream URL</span>
                        </a>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Portée : Globale</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>Origine : <code className="text-[var(--text-muted)]">{presenceSource}</code></span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>Actualisé il y a quelques instants</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rate limit status card */}
                <div className="bg-[var(--surface-raised)]/40 p-4 rounded-xl border border-[var(--panel-border)] min-w-[240px]">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                    <span className="font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-300" />
                      Rate Limit Gateway
                    </span>
                    <span className="font-mono text-emerald-300">5 / 60s max</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--panel-border)] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        rateLimited ? "bg-rose-500 w-full" : "bg-emerald-500 w-1/5"
                      )}
                    />
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-muted)] flex items-center justify-between">
                    <span>État :</span>
                    <span className={rateLimited ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
                      {rateLimited ? "Protection Anti-Spam Active" : "Prêt pour mise à jour"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Discord API limit transparent disclaimer */}
              <div className="mt-5 pt-4 border-t border-[var(--panel-border)] flex items-start gap-2 text-xs text-[var(--text-muted)]">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-[var(--text-muted)]">Transparence Discord API :</strong> Les bots Discord ne supportent pas nativement les statuts personnalisés utilisateur (Custom Status bio textuelle avec emoji). Les activités officielles supportées par la Gateway sont <code className="text-emerald-300">Playing</code>, <code className="text-emerald-300">Streaming</code>, <code className="text-emerald-300">Listening</code>, <code className="text-emerald-300">Watching</code> et <code className="text-emerald-300">Competing</code>.
                </p>
              </div>
            </div>

            {/* STATUS & ACTIVITY EDITOR */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Status and Type */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Statut en ligne */}
                <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-300" />
                      1. Statut Visible sur Discord
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">Choisissez la pastille d'état affichée sur le profil du bot</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: "online", label: "En Ligne", color: "text-emerald-400", dot: "bg-emerald-500", desc: "Disponible et actif" },
                      { id: "idle", label: "Inactif", color: "text-amber-400", dot: "bg-amber-400", desc: "Absence temporaire" },
                      { id: "dnd", label: "Ne Pas Déranger", color: "text-rose-400", dot: "bg-rose-500", desc: "Maintenance / Busy" },
                      { id: "invisible", label: "Invisible", color: "text-[var(--text-muted)]", dot: "bg-[var(--surface-raised)]/40", desc: "Hors ligne visuel" },
                    ].map((s) => {
                      const isSelected = currentStatus === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setCurrentStatus(s.id as DiscordStatus)}
                          className={cn(
                            "p-3.5 rounded-xl border text-left transition-all relative",
                            isSelected
                              ? "bg-[var(--surface-raised)]/40 border-emerald-500/30 ring-1 ring-emerald-500/30"
                              : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] hover:bg-[var(--surface-raised)]/70 hover:border-[var(--input-border-hover)]"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={cn("w-3 h-3 rounded-full", s.dot)} />
                            <span className={cn("text-xs font-bold", isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
                              {s.label}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] line-clamp-1">{s.desc}</p>
                          {isSelected && (
                            <span className="absolute top-2 right-2 text-emerald-300">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Type d'activité */}
                <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-300" />
                      2. Type d'Activité
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">Le verbe qui précède le texte sur le profil Discord</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { type: "Playing", label: "Joue à", icon: Flame, color: "text-orange-400" },
                      { type: "Streaming", label: "Streame", icon: Video, color: "text-emerald-300" },
                      { type: "Listening", label: "Écoute", icon: Headphones, color: "text-emerald-400" },
                      { type: "Watching", label: "Regarde", icon: Tv, color: "text-blue-400" },
                      { type: "Competing", label: "Participe à", icon: Trophy, color: "text-amber-400" },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = activityType === item.type;
                      return (
                        <button
                          key={item.type}
                          onClick={() => setActivityType(item.type as DiscordActivityType)}
                          className={cn(
                            "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5",
                            isSelected
                              ? "bg-[var(--surface-raised)]/40 border-emerald-500/30 ring-1 ring-emerald-500/30"
                              : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] hover:bg-[var(--surface-raised)]/70 hover:border-[var(--input-border-hover)]"
                          )}
                        >
                          <Icon className={cn("w-5 h-5", item.color)} />
                          <span className={cn("text-xs font-semibold", isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Streaming URL field */}
                  {activityType === "Streaming" && (
                    <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                      <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-emerald-300" />
                        URL du Stream (Twitch ou YouTube obligatoire pour Discord)
                      </label>
                      <input
                        type="url"
                        value={streamUrl}
                        onChange={(e) => setStreamUrl(e.target.value)}
                        placeholder="https://www.twitch.tv/ethone"
                        className="w-full px-3.5 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-emerald-500/30 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--input-border-hover)] font-mono"
                      />
                      <p className="text-xs text-emerald-300">
                        * Discord exige une URL valide Twitch ou YouTube pour afficher la pastille violette "Streame".
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Texte d'activité et variables dynamiques */}
                <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-300" />
                      3. Texte de l'Activité & Variables Dynamiques
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Saisissez le texte ou cliquez sur une variable pour l'insérer dynamiquement
                    </p>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={activityName}
                      onChange={(e) => setActivityName(e.target.value)}
                      placeholder="Ex: Valorant | {guildCount} serveurs"
                      maxLength={128}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--input-border-hover)]"
                    />
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
                      <span>Aperçu résolu : <strong className="text-[var(--text-primary)]">{resolvedPreviewText}</strong></span>
                      <span>{activityName.length} / 128 caractères</span>
                    </div>
                  </div>

                  {/* Clickable dynamic variables */}
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-muted)] block mb-2">Variables disponibles :</span>
                    <div className="flex flex-wrap gap-2">
                      {DYNAMIC_VARIABLES.map((v) => (
                        <button
                          key={v.tag}
                          onClick={() => insertTag(v.tag)}
                          title={v.desc}
                          className="px-2.5 py-1 rounded-lg bg-[var(--surface-raised)]/40 hover:bg-emerald-500/10 border border-[var(--panel-border)] hover:border-emerald-500/40 text-xs font-mono text-[var(--text-muted)] hover:text-emerald-300 transition-all flex items-center gap-1.5"
                        >
                          <span>+ {v.tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Save Action */}
                  <div className="pt-4 border-t border-[var(--panel-border)] flex items-center justify-between">
                    <button
                      onClick={() => handleApplyPresence(currentStatus, { type: activityType, name: activityName, url: streamUrl }, false)}
                      disabled={saving}
                      className="px-6 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] font-semibold text-xs flex items-center gap-2 disabled:opacity-50 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? "Application sur Gateway..." : "Appliquer Immédiatement sur Discord"}</span>
                    </button>

                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      Mise à jour directe Gateway
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Quick Presets & Live Statistics */}
              <div className="lg:col-span-5 space-y-6">
                {/* 1-Click Quick Profiles */}
                <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Profils Rapides (1-Clic)
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">Basculez instantanément vers un préreglage</p>
                  </div>

                  <div className="stagger-children space-y-2.5">
                    {profiles.map((p) => {
                      const isActive =
                        currentStatus === p.status &&
                        activityName === p.activity?.name &&
                        activityType === p.activity?.type;

                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3",
                            isActive
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] hover:bg-[var(--surface-raised)]/70 hover:border-[var(--input-border-hover)]"
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "w-2.5 h-2.5 rounded-full shrink-0",
                                  statusDotColor[p.status as DiscordStatus] || "bg-emerald-500"
                                )}
                              />
                              <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{p.name}</h4>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                              {p.activity?.type} <strong>{p.activity?.name}</strong>
                            </p>
                          </div>

                          <button
                            onClick={() => handleApplyProfile(p.id)}
                            disabled={saving}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all",
                              isActive
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "bg-[var(--surface-raised)]/40 hover:bg-emerald-600 text-[var(--text-muted)] hover:text-white"
                            )}
                          >
                            {isActive ? "Actif" : "Activer"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Presence Metrics Card */}
                <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Statistiques de Présence
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
                      <span className="text-xs text-[var(--text-muted)]">Total Changements</span>
                      <p className="text-lg font-bold text-[var(--text-primary)] font-mono mt-1">{stats.totalChanges}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
                      <span className="text-xs text-[var(--text-muted)]">Rotations Exécutées</span>
                      <p className="text-lg font-bold text-emerald-300 font-mono mt-1">{stats.rotationsExecuted}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
                      <span className="text-xs text-[var(--text-muted)]">Rate Limits Rencontrés</span>
                      <p className="text-lg font-bold text-amber-400 font-mono mt-1">{stats.rateLimitHits}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
                      <span className="text-xs text-[var(--text-muted)]">Uptime Gateway</span>
                      <p className="text-lg font-bold text-emerald-400 font-mono mt-1">{stats.currentUptimeHours}h</p>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-[var(--text-muted)] flex items-center justify-between">
                    <span>Dernière synchronisation :</span>
                    <span className="font-mono text-[var(--text-muted)]">
                      {new Date(lastUpdated).toLocaleTimeString("fr-FR")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROTATION */}
        {activeTab === "rotation" && (
          <div className="stagger-children space-y-8">
            <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <ListRestart className="w-5 h-5 text-emerald-300" />
                    Moteur de Rotation Automatique d'Activités
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Faites défiler plusieurs messages d'activités automatiquement selon un intervalle et une stratégie configurable
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleRotation}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2",
                      rotationConfig.enabled
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30"
                        : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 hover:text-[var(--text-primary)]"
                    )}
                  >
                    <RotateCcw className={cn("w-4 h-4", rotationConfig.enabled && "animate-spin text-emerald-400")} />
                    <span>{rotationConfig.enabled ? "Rotation Activée" : "Rotation Désactivée"}</span>
                  </button>

                  <button
                    onClick={handleSaveRotationConfig}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] text-xs font-semibold flex items-center gap-1.5 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Sauvegarder</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--panel-border)]">
                <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-emerald-300" />
                    Intervalle de rotation (secondes)
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={3600}
                    value={rotationConfig.intervalSeconds}
                    onChange={(e) =>
                      setRotationConfig((prev) => ({
                        ...prev,
                        intervalSeconds: Math.max(30, parseInt(e.target.value) || 30),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--input-border-hover)]"
                  />
                  <p className="text-xs text-[var(--text-muted)]">Minimum 30s (Protection anti-spam Discord)</p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                    <Shuffle className="w-3.5 h-3.5 text-emerald-300" />
                    Stratégie d'ordonnancement
                  </label>
                  <Select
                    value={rotationConfig.order}
                    onChange={(v) =>
                      setRotationConfig((prev) => ({
                        ...prev,
                        order: v as any,
                      }))
                    }
                    className="w-full"
                    aria-label="Stratégie d'ordonnancement"
                    options={[
                      { id: "sequential", label: "Séquentiel (Cycle 1, 2, 3...)" },
                      { id: "random", label: "Aléatoire Pur (Random)" },
                      { id: "weighted", label: "Pondéré selon le Poids" },
                    ]}
                  />
                  <p className="text-xs text-[var(--text-muted)]">Détermine le choix de la prochaine activité</p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Prochaine rotation
                  </label>
                  <div className="px-3 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-sm font-mono text-emerald-400 flex items-center justify-between">
                    <span>{rotationConfig.enabled ? "Dans quelques secondes" : "En pause"}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Horodatage précis synchronisé</p>
                </div>
              </div>
            </div>

            {/* Rotation Activities List */}
            <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-300" />
                  Activités dans le Cycle ({rotationConfig.activities.length})
                </h3>
              </div>

              <div className="stagger-children space-y-3">
                {rotationConfig.activities.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--input-border-hover)] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[var(--surface-raised)]/40 text-[var(--text-muted)] text-xs font-mono font-bold flex items-center justify-center shrink-0 border border-[var(--panel-border)]">
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            {item.type}
                          </span>
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{item.text}</span>
                        </div>
                        {item.url && (
                          <span className="text-xs text-emerald-300 font-mono mt-1 block">
                            Stream: {item.url}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {rotationConfig.order === "weighted" && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                          <span>Poids:</span>
                          <span className="font-mono font-bold text-[var(--text-primary)]">{item.weight || 10}</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleRemoveRotationItem(item.id)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Supprimer cette activité"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Activity to Rotation Form */}
              <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-dashed border-[var(--panel-border)] space-y-4">
                <h4 className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  Ajouter une nouvelle activité à la rotation
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <Select
                      value={newRotType}
                      onChange={(v) => setNewRotType(v as DiscordActivityType)}
                      size="sm"
                      className="w-full"
                      aria-label="Type d'activité"
                      options={[
                        { id: "Playing", label: "Playing" },
                        { id: "Streaming", label: "Streaming" },
                        { id: "Listening", label: "Listening" },
                        { id: "Watching", label: "Watching" },
                        { id: "Competing", label: "Competing" },
                      ]}
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      value={newRotText}
                      onChange={(e) => setNewRotText(e.target.value)}
                      placeholder="Texte (ex: {guildCount} serveurs en ligne)"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-border-hover)]"
                    />
                  </div>

                  <div className="sm:col-span-3 flex items-center gap-2">
                    <button
                      onClick={handleAddRotationItem}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] text-xs font-semibold btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>

                {newRotType === "Streaming" && (
                  <input
                    type="url"
                    value={newRotUrl}
                    onChange={(e) => setNewRotUrl(e.target.value)}
                    placeholder="URL Twitch / YouTube (obligatoire pour Streaming)"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-emerald-500/30 text-xs text-[var(--text-primary)] font-mono"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SCHEDULE */}
        {activeTab === "schedule" && (
          <div className="stagger-children space-y-8">
            <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Profils de Présence Prédéfinis
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Des ambiances configurées d'un clic pour le gaming, la musique, la maintenance ou le mode nuit
                </p>
              </div>

              <div className="stagger-children grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] flex flex-col justify-between gap-4 hover:border-emerald-500/40 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-[var(--text-primary)]">{p.name}</span>
                        <span
                          className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            statusDotColor[p.status as DiscordStatus] || "bg-emerald-500"
                          )}
                        />
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">{p.description}</p>
                      <div className="mt-3 p-2.5 rounded-lg bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-xs font-mono text-[var(--text-muted)]">
                        <span className="text-emerald-300 font-bold">{p.activity.type}</span> {p.activity.name}
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyProfile(p.id)}
                      disabled={saving}
                      className="w-full py-2 rounded-lg bg-[var(--surface-raised)]/40 hover:bg-emerald-600 text-[var(--text-primary)] hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Appliquer ce profil</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-300" />
                    Planning Hebdomadaire Automatique
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Définissez quel profil activer selon les plages horaires de la semaine
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-300 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30">
                  Fuseau : Europe/Paris
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[var(--panel-border)] text-[var(--text-muted)]">
                      <th className="py-2.5 px-3">Créneau</th>
                      <th className="py-2.5 px-3">Lundi - Vendredi</th>
                      <th className="py-2.5 px-3">Samedi - Dimanche</th>
                      <th className="py-2.5 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--panel-border)] text-[var(--text-muted)]">
                    <tr>
                      <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">08:00 - 18:00 (Journée)</td>
                      <td className="py-3 px-3 text-emerald-400 font-medium">Surveillance Communauté</td>
                      <td className="py-3 px-3 text-emerald-300 font-medium">Gaming Session</td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-300 hover:underline cursor-pointer">Modifier</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">18:00 - 23:00 (Soirée)</td>
                      <td className="py-3 px-3 text-emerald-300 font-medium">Gaming Session</td>
                      <td className="py-3 px-3 text-blue-400 font-medium">Music Lounge</td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-300 hover:underline cursor-pointer">Modifier</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">23:00 - 08:00 (Nuit)</td>
                      <td className="py-3 px-3 text-amber-400 font-medium">Mode Nuit (Inactif)</td>
                      <td className="py-3 px-3 text-amber-400 font-medium">Mode Nuit (Inactif)</td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-300 hover:underline cursor-pointer">Modifier</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SERVERS */}
        {activeTab === "servers" && (
          <div className="stagger-children space-y-8">
            <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Server className="w-5 h-5 text-emerald-300" />
                  Serveurs Installés & Préférences Déclaratives
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Définissez le profil préféré pour chaque serveur Discord où ETHONE est installé
                </p>
              </div>

              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-start gap-3 text-xs text-blue-200">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[var(--text-primary)]">Précision Technique Discord Gateway</h4>
                  <p className="mt-0.5 text-blue-300/90">
                    L'architecture de Discord ne permet pas techniquement d'avoir une présence visuelle distincte par serveur (la présence est liée à la connexion Gateway WebSocket globale du bot). ETHONE enregistre ici le <strong>profil de référence préféré</strong> de chaque serveur pour les automatisations et les bascules contextuelles.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[var(--panel-border)] text-[var(--text-muted)]">
                      <th className="py-3 px-4">Serveur Discord</th>
                      <th className="py-3 px-4">ID de Guilde</th>
                      <th className="py-3 px-4">Profil Préféré</th>
                      <th className="py-3 px-4">Dernière Maj</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="stagger-children divide-y divide-[var(--panel-border)] text-[var(--text-muted)]">
                    {guilds.map((g) => (
                      <tr key={g.guildId} className="hover:bg-[var(--surface-raised)]/70">
                        <td className="py-3.5 px-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] flex items-center justify-center font-bold text-[var(--text-primary)]">
                            {g.guildName?.charAt(0) || "S"}
                          </div>
                          <div>
                            <span className="font-semibold text-[var(--text-primary)] block">{g.guildName}</span>
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Bot Installé
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">{g.guildId}</td>
                        <td className="py-3.5 px-4">
                          <Select
                            value={rowProfileByGuild[g.guildId] ?? g.preferredProfileId}
                            onChange={(v) => setRowProfileByGuild((prev) => ({ ...prev, [g.guildId]: v }))}
                            size="sm"
                            className="min-w-48"
                            aria-label={`Profil à appliquer pour ${g.guildName}`}
                            options={profiles.map((p) => ({ id: p.id, label: `${p.name} (${p.activity?.type || "Activité"})` }))}
                          />
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                          {new Date(g.updatedAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleApplyProfile(rowProfileByGuild[g.guildId] ?? g.preferredProfileId)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] font-medium text-xs btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                          >
                            Appliquer Profil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: IDENTITY */}
        {activeTab === "identity" && (
          <div className="stagger-children space-y-8">
            <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-300" />
                  Bot Identity Studio
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Gestion de l'avatar et du nom d'utilisateur du bot avec suivi strict des rate limits Discord
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[var(--text-primary)]">Quotas Discord Globaux pour l'Identité</h4>
                  <p className="mt-0.5 text-amber-300/90">
                    Discord applique des restrictions strictes sur les comptes Bot : <strong>maximum 2 changements d'avatar par heure</strong> et <strong>2 changements de nom d'utilisateur par tranche de 2 heures</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Avatar Studio */}
                <div className="p-6 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-300" />
                    Avatar du Bot
                  </h3>

                  <div className="flex items-center gap-5">
                    <img
                      src={identity.avatarUrl}
                      alt={identity.username}
                      className="w-20 h-20 rounded-full border-2 border-[var(--panel-border)] object-cover bg-[var(--surface-raised)]/40"
                    />
                    <div>
                      <span className="text-xs text-[var(--text-muted)] block mb-1">Changements restants :</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold font-mono text-emerald-400">
                          {identity.avatarChangesRemaining} / 2
                        </span>
                        <span className="text-xs text-[var(--text-muted)] font-mono">(ce cycle de 60m)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <label className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[var(--panel-border)] hover:border-emerald-500/40 hover:bg-emerald-500/10 text-xs text-[var(--text-muted)] flex items-center justify-center gap-2 cursor-pointer transition-all">
                      <Upload className="w-4 h-4 text-emerald-300" />
                      <span>{newAvatarFile ? newAvatarFile.name : "Téléverser un nouvel avatar (PNG/JPG)"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setNewAvatarFile(e.target.files[0]);
                            toast.info("Image sélectionnée. Cliquez sur \"Appliquer l'avatar\" pour confirmer.");
                          }
                        }}
                      />
                    </label>
                    {newAvatarFile && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleUpdateAvatar}
                          disabled={uploadingAvatar || identity.avatarChangesRemaining <= 0}
                          className="flex-1 py-2 rounded-lg bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{uploadingAvatar ? "Envoi en cours..." : "Appliquer l'avatar"}</span>
                        </button>
                        <button
                          onClick={() => setNewAvatarFile(null)}
                          disabled={uploadingAvatar}
                          className="px-3 py-2 rounded-lg bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-raised)]/70 text-[var(--text-muted)] text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                    {identity.avatarChangesRemaining <= 0 && (
                      <p className="text-xs text-amber-400">
                        Limite Discord atteinte : réessayez dans moins d'une heure.
                      </p>
                    )}
                  </div>
                </div>

                {/* Username Studio */}
                <div className="p-6 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-300" />
                    Nom d'Utilisateur
                  </h3>

                  <div>
                    <span className="text-xs text-[var(--text-muted)] block mb-1">Changements restants :</span>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg font-bold font-mono text-emerald-400">
                        {identity.usernameChangesRemaining} / 2
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-mono">(ce cycle de 2h)</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[var(--text-muted)]">Modifier le pseudo Discord :</label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        placeholder="Etho"
                        maxLength={32}
                        className="w-full px-3.5 py-2 rounded-lg bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-border-hover)]"
                      />
                    </div>

                    <button
                      onClick={handleUpdateUsername}
                      disabled={saving || editUsername === identity.username}
                      className="mt-3 w-full py-2 rounded-lg bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] text-xs font-semibold disabled:opacity-50 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                    >
                      Enregistrer le nouveau nom
                    </button>
                  </div>
                </div>
              </div>

              {/* Owner security badge */}
              <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Bot Owner Autorisé pour l'Identité :</span>
                  <code className="text-emerald-300 font-mono">{identity.ownerId}</code>
                </div>
                <span className="text-[var(--text-muted)] text-xs">Discord REST v10</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: HISTORY */}
        {activeTab === "history" && (
          <div className="stagger-children space-y-8">
            <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-300" />
                    Journal d'Audit des Changements de Présence
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Historique complet et traçabilité de toutes les modifications appliquées sur la Gateway
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[var(--panel-border)] text-[var(--text-muted)]">
                      <th className="py-3 px-3">Date & Heure</th>
                      <th className="py-3 px-3">Auteur / Source</th>
                      <th className="py-3 px-3">Transition Statut</th>
                      <th className="py-3 px-3">Activité Appliquée</th>
                      <th className="py-3 px-3">Raison</th>
                      <th className="py-3 px-3 text-right">Portée</th>
                    </tr>
                  </thead>
                  <tbody className="stagger-children divide-y divide-[var(--panel-border)] text-[var(--text-muted)] font-mono">
                    {auditHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--surface-raised)]/70 font-sans">
                        <td className="py-3 px-3 text-[var(--text-muted)] whitespace-nowrap font-mono text-xs">
                          {new Date(item.timestamp).toLocaleString("fr-FR")}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-[var(--surface-raised)]/40 text-[var(--text-primary)] text-xs font-semibold">
                            {item.actor}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[var(--text-muted)] line-through text-xs">{item.previousStatus}</span>
                            <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                            <span className={cn("px-1.5 py-0.2 rounded text-xs font-bold", statusColorMap[item.newStatus as DiscordStatus] || "text-emerald-400")}>
                              {item.newStatus}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[var(--text-primary)]">
                          <span className="font-semibold text-emerald-300">{item.newActivity}</span>
                        </td>
                        <td className="py-3 px-3 text-[var(--text-muted)] text-xs">{item.reason || "Mise à jour"}</td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            {item.scope || "global"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
