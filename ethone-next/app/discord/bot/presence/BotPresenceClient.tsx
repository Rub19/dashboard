"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  ArrowLeft,
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
  Moon,
  EyeOff,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { formatApiError } from "@/lib/format-error";
import { cn } from "@/lib/utils";
import Select from "@/components/ui/Select";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";
import { SPRING_PILL } from "@/lib/ease";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || process.env.NEXT_PUBLIC_BOT_API_URL || "https://raspy-fog-bf5b.rub19-mailpro.workers.dev";

export type PresenceTab =
  | "overview"
  | "rotation"
  | "schedule"
  | "servers"
  | "identity"
  | "history";

export type DiscordStatus = "online" | "idle" | "dnd" | "invisible" | "streaming";
export type DiscordActivityType = "Playing" | "Streaming" | "Listening" | "Watching" | "Competing";

const ACTIVITY_VERB: Record<DiscordActivityType, string> = {
  Playing: "Playing",
  Streaming: "Streaming",
  Listening: "Listening to",
  Watching: "Watching",
  Competing: "Competing in",
};

interface BotPresenceClientProps {
  initialTab?: PresenceTab;
}

const DYNAMIC_VARIABLES = [
  { tag: "{guildCount}", desc: "Nombre total de serveurs installés" },
  { tag: "{userCount}", desc: "Membres servis par le bot" },
  { tag: "{ping}", desc: "Latence Gateway WebSocket (ex: 21ms)" },
  { tag: "{uptime}", desc: "Temps d'exécution en minutes" },
  { tag: "{version}", desc: "Version actuelle du bot (ex: v1.75.8)" },
  { tag: "{time}", desc: "Heure actuelle (ex: 14:30)" },
  { tag: "{date}", desc: "Date actuelle (ex: 12/10/2026)" },
];

const DEFAULT_ROTATION_ACTIVITIES: { id: string; type: DiscordActivityType; text: string; url?: string; weight: number }[] = [
  { id: "rot_3", type: "Watching" as DiscordActivityType, text: "{guildCount} serveurs • Anti-Raid 24/7", weight: 30 },
  { id: "rot_6", type: "Watching" as DiscordActivityType, text: "vos tickets d'assistance • /ticket", weight: 20 },
  { id: "rot_8", type: "Playing" as DiscordActivityType, text: "{userCount} membres servis • /bot info", weight: 20 },
];

const DEFAULT_PROFILES = [
  {
    id: "prof_streamer",
    name: "🟣 Mode Streamer (Twitch Live)",
    status: "streaming",
    description: "Pastille violette de diffusion Twitch avec lien direct vers le live",
    activity: { type: "Streaming", name: "🔴 En direct • /help", url: "" },
  },
  {
    id: "prof_dnd",
    name: "⛔ Mode DND Focus (Ne Pas Déranger)",
    status: "dnd",
    description: "Statut rouge Ne Pas Déranger pour périodes de maintenance ou pic de modération",
    activity: { type: "Watching", name: "🔒 Anti-Raid Strict • Mode DND" },
  },
  {
    id: "prof_invi",
    name: "👻 Mode Invisible (Fantôme)",
    status: "invisible",
    description: "Apparaît hors-ligne aux membres tout en restant pleinement fonctionnel",
    activity: { type: "Playing", name: "Veille Discrète" },
  },
  {
    id: "prof_online",
    name: "🟢 En Ligne - Actif",
    status: "online",
    description: "Présence standard disponible pour tous les serveurs",
    activity: { type: "Watching", name: "{guildCount} serveurs • /help" },
  },
  {
    id: "prof_spotify",
    name: "🎵 Spotify Vibes (Lo-Fi)",
    status: "online",
    description: "Activité d'écoute musicale avec lecteur audio actif",
    activity: { type: "Listening", name: "Spotify • Chill Lo-Fi Beats" },
  },
  {
    id: "prof_gaming",
    name: "🎮 Gaming Session (Minecraft)",
    status: "online",
    description: "Session de jeu communautaire",
    activity: { type: "Playing", name: "Minecraft • Serveur Communautaire" },
  },
  {
    id: "prof_shield",
    name: "🛡️ Bouclier Sécurité 24/7",
    status: "online",
    description: "Affichage des métriques de protection et anti-raid",
    activity: { type: "Watching", name: "{guildCount} serveurs sous haute protection" },
  },
  {
    id: "prof_night",
    name: "🌙 Nuit Calme (Inactif)",
    status: "idle",
    description: "Pastille ambre pour plages de repos nocturnes",
    activity: { type: "Listening", name: "Nuit paisible • Mode Veille" },
  },
];

export default function BotPresenceClient({ initialTab = "overview" }: BotPresenceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const activeTab: PresenceTab = (searchParams.get("tab") as PresenceTab) || initialTab;

  const handleTabChange = (tab: PresenceTab) => {
    router.push(`/discord/bot/presence?tab=${tab}`);
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowProfileByGuild, setRowProfileByGuild] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  const [currentStatus, setCurrentStatus] = useState<DiscordStatus>("online");
  const [activityType, setActivityType] = useState<DiscordActivityType>("Watching");
  const [activityName, setActivityName] = useState("your tickets • /ticket");
  const [streamUrl, setStreamUrl] = useState("");
  const [presenceSource, setPresenceSource] = useState("rotation");
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [rateLimited, setRateLimited] = useState(false);

  const [rotationConfig, setRotationConfig] = useState({
    enabled: true,
    intervalSeconds: 60,
    order: "sequential" as "sequential" | "random" | "weighted",
    activities: DEFAULT_ROTATION_ACTIVITIES,
    nextRotationAt: null as string | null,
  });

  const [profiles, setProfiles] = useState<any[]>(DEFAULT_PROFILES);

  const [guilds, setGuilds] = useState<any[]>([]);

  const [identity, setIdentity] = useState({
    botId: "825124886289388616",
    username: "Etho",
    discriminator: "9861",
    avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
    ownerId: "825124886289388616",
    avatarChangesRemaining: 2,
    avatarResetInSeconds: 0,
    usernameChangesRemaining: 2,
    usernameResetInSeconds: 0,
  });

  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  const [stats, setStats] = useState({
    totalChanges: 584,
    rotationsExecuted: 583,
    rateLimitHits: 0,
    failedUpdates: 0,
    currentUptimeHours: 24,
  });

  const [newRotType, setNewRotType] = useState<DiscordActivityType>("Playing");
  const [newRotText, setNewRotText] = useState("");
  const [newRotUrl, setNewRotUrl] = useState("");
  const [newRotWeight] = useState(20);

  const [editUsername, setEditUsername] = useState("Etho");
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const previewContext = useMemo(() => {
    const now = new Date();
    const totalUsers = guilds.reduce((acc, g) => acc + (g.memberCount || g.approximateMemberCount || 0), 0) || 18478;
    return {
      guildCount: guilds.length || 57,
      userCount: totalUsers,
      ping: 24,
      uptime: Math.round((stats.currentUptimeHours || 24) * 60),
      version: "v1.75.8",
      time: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      date: now.toLocaleDateString("fr-FR"),
    };
  }, [guilds, stats.currentUptimeHours]);

  const resolvedPreviewText = useMemo(() => {
    let text = activityName || "";
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

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/presence`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.success && json.data) {
          const { state, stats: s, rotationEnabled, nextRotationAt } = json.data;
          if (state) {
            if (state.status) {
              if (state.status === "streaming" || (state.status === "online" && state.activity?.type === "Streaming")) {
                setCurrentStatus("streaming");
              } else {
                setCurrentStatus(state.status);
              }
            }
            if (state.activity) {
              if (state.activity.type) setActivityType(state.activity.type);
              if (state.activity.name) setActivityName(state.activity.name);
              if (state.activity.url) setStreamUrl(state.activity.url);
            }
            if (state.source) setPresenceSource(state.source);
            if (state.updatedAt) setLastUpdated(state.updatedAt);
            if (state.rateLimited !== undefined) setRateLimited(Boolean(state.rateLimited));
          }
          if (s) setStats(s);
          if (rotationEnabled !== undefined) {
            setRotationConfig((prev) => ({
              ...prev,
              enabled: Boolean(rotationEnabled),
              nextRotationAt: nextRotationAt || null,
            }));
          }
        }
      }

      const profRes = await fetch(`${BOT_API_URL}/api/bot/presence/profiles`, { credentials: "include" });
      if (profRes.ok) {
        const pJson = await profRes.json().catch(() => null);
        if (pJson?.success && Array.isArray(pJson.data) && pJson.data.length > 0) {
          setProfiles(pJson.data);
        }
      }

      const srvRes = await fetch(`${BOT_API_URL}/api/bot/presence/servers`, { credentials: "include" });
      if (srvRes.ok) {
        const sJson = await srvRes.json().catch(() => null);
        if (sJson?.success && Array.isArray(sJson.data)) {
          setGuilds(sJson.data);
        }
      }

      const idRes = await fetch(`${BOT_API_URL}/api/bot/presence/identity`, { credentials: "include" });
      if (idRes.ok) {
        const idJson = await idRes.json().catch(() => null);
        if (idJson?.success && idJson.data) {
          setIdentity(idJson.data);
          if (idJson.data.username) setEditUsername(idJson.data.username);
        }
      }

      const histRes = await fetch(`${BOT_API_URL}/api/bot/presence/history`, { credentials: "include" });
      if (histRes.ok) {
        const hJson = await histRes.json().catch(() => null);
        if (hJson?.success && Array.isArray(hJson.data)) {
          setAuditHistory(hJson.data);
        }
      }
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const insertTag = (tag: string) => {
    setActivityName((prev) => `${prev} ${tag}`.trim());
    toast.info(`Variable ${tag} insérée`);
  };

  const handleApplyPresence = async (overrideStatus?: DiscordStatus, overrideActivity?: any, force = false) => {
    const targetStatus = overrideStatus || currentStatus;
    const targetActivity = overrideActivity || {
      type: activityType,
      name: activityName,
      url: activityType === "Streaming" ? streamUrl : undefined,
    };

    const streamTarget = targetStatus === "streaming" || targetActivity.type === "Streaming";
    const streamLink = targetActivity.url || streamUrl;
    if (streamTarget && !/^https?:\/\/\S+$/.test(streamLink || "")) {
      toast.error("Ajoute le lien de ta chaîne (Twitch ou YouTube) pour le Mode Streamer.");
      return;
    }

    if (targetStatus === "streaming") {
      targetActivity.type = "Streaming";
      targetActivity.url = targetActivity.url || streamUrl;
    }

    try {
      setSaving(true);
      setCurrentStatus(targetStatus);
      if (targetActivity.type) setActivityType(targetActivity.type);
      if (targetActivity.name) setActivityName(targetActivity.name);
      if (targetActivity.url) setStreamUrl(targetActivity.url);
      setLastUpdated(new Date().toISOString());
      setPresenceSource("manual");

      const payload = {
        status: targetStatus,
        activity: targetActivity,
        force,
      };

      const res = await fetch(`${BOT_API_URL}/api/bot/presence`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Présence mise à jour avec succès sur Discord !");
      } else {
        toast.info("Présence enregistrée localement.");
      }
    } catch {
      toast.info("Présence mise à jour (mode local).");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickMode = async (mode: "online" | "dnd" | "invisible" | "streamer") => {
    if (mode === "streamer") {
      await handleApplyPresence(
        "streaming",
        {
          type: "Streaming",
          name: "🔴 En direct sur Twitch • /help",
          url: streamUrl,
        },
        true
      );
      toast.success("Mode Streamer Twitch activé (Pastille violette) !");
    } else if (mode === "dnd") {
      await handleApplyPresence(
        "dnd",
        {
          type: "Watching",
          name: "🔒 Anti-Raid & Sécurité Focus (DND)",
        },
        true
      );
      toast.warning("Mode Ne Pas Déranger (DND) activé !");
    } else if (mode === "invisible") {
      await handleApplyPresence(
        "invisible",
        {
          type: "Playing",
          name: "Veille Discrète",
        },
        true
      );
      toast.info("Mode Invisible activé (Hors-ligne visuel) !");
    } else {
      await handleApplyPresence(
        "online",
        {
          type: "Watching",
          name: "{guildCount} serveurs • /help",
        },
        true
      );
      toast.success("Statut En Ligne activé !");
    }
  };

  const handleApplyProfile = async (profileId: string) => {
    try {
      setSaving(true);
      await fetch(`${BOT_API_URL}/api/bot/presence/profile/${profileId}`, {
        credentials: "include",
        method: "POST",
      });

      const p = profiles.find((prof) => prof.id === profileId);
      if (p) {
        setCurrentStatus(p.status);
        if (p.activity) {
          setActivityType(p.activity.type);
          setActivityName(p.activity.name);
          if (p.activity.url) setStreamUrl(p.activity.url);
        }
        setLastUpdated(new Date().toISOString());
        setPresenceSource(`profil:${p.name}`);
        toast.success(`Profil "${p.name}" activé.`);
      }
    } catch {
      toast.info("Profil appliqué.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRotation = async () => {
    const nextState = !rotationConfig.enabled;
    try {
      await fetch(`${BOT_API_URL}/api/bot/presence/rotation`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState }),
      });
      toast.success(nextState ? "Rotation automatique activée !" : "Rotation arrêtée.");
      setRotationConfig((prev) => ({ ...prev, enabled: nextState }));
    } catch {
      setRotationConfig((prev) => ({ ...prev, enabled: nextState }));
      toast.info(nextState ? "Rotation activée." : "Rotation désactivée.");
    }
  };

  const handleAddRotationItem = () => {
    if (!newRotText.trim()) {
      toast.error("Veuillez saisir un texte d'activité.");
      return;
    }
    if (newRotType === "Streaming" && !/^https?:\/\/\S+$/.test(newRotUrl || "")) {
      toast.error("Ajoute le lien de la chaîne pour une activité en direct.");
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

  const handleQuickAddRotationTemplate = (type: DiscordActivityType, text: string, url?: string) => {
    if (type === "Streaming" && !/^https?:\/\/\S+$/.test(url || "")) {
      toast.error("Renseigne d'abord le lien de ta chaîne dans le Mode Streamer.");
      return;
    }
    const newItem = {
      id: `rot_${Date.now()}`,
      type,
      text,
      url,
      weight: 20,
    };
    setRotationConfig((prev) => ({
      ...prev,
      activities: [...prev.activities, newItem],
    }));
    toast.success(`Activité "${text}" ajoutée à la rotation !`);
  };

  const handleRemoveRotationItem = (id: string) => {
    setRotationConfig((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id),
    }));
    toast.info("Activité retirée de la rotation.");
  };

  const handleSaveRotationConfig = async () => {
    try {
      setSaving(true);
      await fetch(`${BOT_API_URL}/api/bot/presence/rotation`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rotationConfig),
      });
      toast.success("Configuration de rotation enregistrée.");
    } catch {
      toast.info("Configuration de rotation enregistrée localement.");
    } finally {
      setSaving(false);
    }
  };

  const handleEmergencyMaintenance = async () => {
    const isMaint = currentStatus === "dnd" && activityName.toLowerCase().includes("maintenance");
    if (isMaint) {
      await handleApplyPresence("online", { type: "Watching", name: "{guildCount} serveurs • /help" }, true);
      toast.success("Mode normal rétabli !");
    } else {
      await handleApplyPresence(
        "dnd",
        { type: "Watching", name: "Maintenance technique ETHONE • DND" },
        true
      );
      toast.warning("Mode Maintenance (DND) activé en urgence !");
    }
  };

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
        toast.success("Nom d'utilisateur mis à jour !");
        setIdentity((prev) => ({ ...prev, username: editUsername.trim() }));
      } else {
        toast.error(formatApiError(json?.error, "Impossible de modifier le nom (limite Discord: 2/2h)."));
      }
    } catch {
      toast.info("Nom d'utilisateur mis à jour localement.");
      setIdentity((prev) => ({ ...prev, username: editUsername.trim() }));
    } finally {
      setSaving(false);
    }
  };

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
        toast.error(formatApiError(json?.error, "Impossible de changer l'avatar (limite Discord: 2/h)."));
      }
    } catch {
      toast.info("Avatar mis à jour localement.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const statusDotColor: Record<DiscordStatus, string> = {
    online: "bg-[var(--success)]",
    idle: "bg-amber-400",
    dnd: "bg-rose-500",
    invisible: "bg-neutral-500",
    streaming: "bg-purple-500",
  };

  const statusColorMap: Record<DiscordStatus, string> = {
    online: "text-[var(--success)]",
    idle: "text-amber-400",
    dnd: "text-rose-400",
    invisible: "text-neutral-400",
    streaming: "text-purple-400",
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans pb-32">
      <div className="border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/30 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/discord/bot"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] transition-all cursor-pointer active:scale-[0.97]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Centre de Contrôle</span>
            </Link>
            <span className="text-[var(--text-muted)]/50">•</span>
            <Link
              href="/discord"
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors truncate"
            >
              Hub Discord
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-xs font-mono text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Shard 0 • 24ms</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 text-xs font-semibold text-[var(--accent-primary)]">
              <ShieldCheck className="w-3 h-3" />
              <span>Owner {identity.ownerId.slice(0, 6)}…</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--panel-border)]"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[11px] font-mono font-semibold text-[var(--accent-primary)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PRESENCE & RICH ACTIVITIES</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Gestion de la Présence & Activités
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
              Pilotez en direct le statut visible du bot (En ligne, Ne Pas Déranger, Invisible), le mode streamer Twitch, les activités riches et la rotation automatique.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-end">
            <button
              type="button"
              onClick={handleEmergencyMaintenance}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-[0.97]",
                currentStatus === "dnd" && activityName.toLowerCase().includes("maintenance")
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30"
                  : "bg-[var(--surface-raised)]/60 hover:bg-rose-950/40 border-[var(--panel-border)] hover:border-rose-500/30 text-[var(--text-muted)] hover:text-rose-400"
              )}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>{currentStatus === "dnd" ? "Quitter DND" : "Mode DND Focus"}</span>
            </button>

            <button
              type="button"
              onClick={fetchData}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-[var(--surface-raised)]/60 hover:bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer active:scale-[0.97]"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-[var(--accent-primary)]")} />
              <span>Actualiser</span>
            </button>
          </div>
        </motion.div>

        <div className="py-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--panel-border)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5 mr-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Modes Rapides (1-Clic) :
            </span>
            <button
              type="button"
              onClick={() => handleQuickMode("online")}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.97]"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>En Ligne</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickMode("dnd")}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.97]"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Ne Pas Déranger (DND)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickMode("invisible")}
              className="px-3 py-1.5 rounded-xl bg-neutral-500/10 hover:bg-neutral-500/20 text-neutral-300 border border-neutral-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.97]"
            >
              <EyeOff className="w-3 h-3 text-neutral-400" />
              <span>Invisible (Invi)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickMode("streamer")}
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.97]"
            >
              <Video className="w-3 h-3 text-purple-400" />
              <span>Mode Streamer Twitch 🟣</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-3 border-b border-[var(--panel-border)]">
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
                type="button"
                onClick={() => handleTabChange(tab.id as PresenceTab)}
                className={cn(
                  "relative px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap outline-none cursor-pointer active:scale-[0.97]",
                  isActive
                    ? "text-[var(--accent-contrast)] font-bold shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/60"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="botpresence-tab"
                    transition={SPRING_PILL}
                    className="absolute inset-0 -z-10 rounded-xl bg-[var(--accent-primary)] shadow-sm"
                  />
                )}
                <Icon className={cn("w-4 h-4", isActive ? "text-[var(--accent-contrast)]" : "text-[var(--text-muted)]")} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                      isActive
                        ? "bg-[var(--accent-contrast)]/20 text-[var(--accent-contrast)] font-bold"
                        : "bg-[var(--surface-raised)] text-[var(--text-muted)]"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        {loading ? (
          <ModuleSkeleton compact className="px-0 sm:px-0" label="Chargement de la présence du bot…" />
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl border border-[var(--panel-border)] relative overflow-hidden bg-[var(--surface-raised)]/40 shadow-sm">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent-primary)]/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                      <div className="relative shrink-0">
                        <img
                          src={identity.avatarUrl}
                          alt={identity.username}
                          className="w-20 h-20 rounded-full bg-[var(--surface-raised)]/60 border-2 border-[var(--panel-border)] object-cover shadow-md"
                          onError={(e) => {
                            (e.target as any).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                          }}
                        />
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-[#07090E] flex items-center justify-center transition-all",
                            statusDotColor[currentStatus]
                          )}
                          title={`Statut : ${currentStatus}`}
                        >
                          {currentStatus === "dnd" && <span className="w-2 h-0.5 bg-white rounded-full" />}
                          {currentStatus === "idle" && <Moon className="w-2.5 h-2.5 text-[#07090E]" />}
                          {currentStatus === "invisible" && <EyeOff className="w-2.5 h-2.5 text-white" />}
                          {currentStatus === "streaming" && <Play className="w-2 h-2 text-white fill-white ml-0.5" />}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                            {identity.username}
                          </h2>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#5865f2] text-white tracking-wider uppercase">
                            BOT
                          </span>
                          <span className="text-xs text-[var(--text-muted)] font-mono">
                            #{identity.discriminator}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold border ml-1",
                              currentStatus === "online"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                : currentStatus === "streaming"
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/25"
                                : currentStatus === "dnd"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                                : currentStatus === "invisible"
                                ? "bg-neutral-500/10 text-neutral-300 border-neutral-500/25"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                            )}
                          >
                            {currentStatus === "online" ? "En Ligne" : currentStatus === "streaming" ? "Mode Streamer" : currentStatus === "dnd" ? "Ne Pas Déranger" : currentStatus === "invisible" ? "Invisible" : "Inactif"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5",
                              activityType === "Streaming"
                                ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                : "bg-[var(--surface-raised)] text-[var(--accent-primary)] border-[var(--panel-border)]"
                            )}
                          >
                            {activityType === "Playing" && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                            {activityType === "Streaming" && <Video className="w-3.5 h-3.5 text-purple-400" />}
                            {activityType === "Listening" && <Headphones className="w-3.5 h-3.5 text-cyan-400" />}
                            {activityType === "Watching" && <Tv className="w-3.5 h-3.5 text-indigo-400" />}
                            {activityType === "Competing" && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                            <span>{ACTIVITY_VERB[activityType]}</span>
                          </span>

                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {resolvedPreviewText || "Aucune activité en cours"}
                          </span>

                          {activityType === "Streaming" && streamUrl && (
                            <a
                              href={streamUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-xs font-semibold text-purple-300 hover:bg-purple-500/25 transition-all"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Regarder le Stream</span>
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)] pt-1">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                            <span>Portée Globale</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span>Origine : <code className="text-[var(--text-primary)] font-mono">{presenceSource}</code></span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span>Actualisé : {new Date(lastUpdated).toLocaleTimeString("fr-FR")}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] min-w-[240px] space-y-2">
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
                          Rate Limit Gateway
                        </span>
                        <span className="font-mono text-[var(--accent-primary)]">5 / 60s max</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--panel-border)] overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            rateLimited ? "bg-rose-500 w-full" : "bg-[var(--accent-primary)] w-1/5"
                          )}
                        />
                      </div>
                      <div className="text-xs text-[var(--text-muted)] flex items-center justify-between">
                        <span>État Gateway :</span>
                        <span className={rateLimited ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
                          {rateLimited ? "Protection Anti-Spam Active" : "Prêt pour mise à jour"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-6">
                    <div className="p-5 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                          <Radio className="w-4 h-4 text-[var(--accent-primary)]" />
                          1. Statut Visible sur Discord
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          Choisissez la pastille d&apos;état affichée sur le profil du bot
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {[
                          { id: "online", label: "En Ligne", dot: "bg-[var(--success)]", desc: "Disponible et actif" },
                          { id: "streaming", label: "Mode Streamer", dot: "bg-purple-500", desc: "Pastille violette live" },
                          { id: "idle", label: "Inactif", dot: "bg-amber-400", desc: "Absence temporaire" },
                          { id: "dnd", label: "Ne Pas Déranger", dot: "bg-rose-500", desc: "Maintenance / DND" },
                          { id: "invisible", label: "Invisible (Invi)", dot: "bg-neutral-500", desc: "Hors ligne visuel" },
                        ].map((s) => {
                          const isSelected = currentStatus === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setCurrentStatus(s.id as DiscordStatus);
                                if (s.id === "streaming") {
                                  setActivityType("Streaming");
                                  
                                } else if (activityType === "Streaming") {
                                  setActivityType("Watching");
                                }
                              }}
                              className={cn(
                                "p-3.5 rounded-xl border text-left transition-all relative cursor-pointer active:scale-[0.97]",
                                isSelected
                                  ? s.id === "streaming"
                                    ? "bg-[var(--surface-raised)] border-purple-500 ring-2 ring-purple-500/20 shadow-sm"
                                    : "bg-[var(--surface-raised)] border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20 shadow-sm"
                                  : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] hover:bg-[var(--surface-raised)]/80"
                              )}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={cn("w-3 h-3 rounded-full flex items-center justify-center shrink-0", s.dot)}>
                                  {s.id === "streaming" && (
                                    <Play className="w-1.5 h-1.5 text-white fill-white ml-0.5" />
                                  )}
                                </span>
                                <span className={cn("text-xs font-bold", isSelected ? (s.id === "streaming" ? "text-purple-400" : "text-[var(--text-primary)]") : "text-[var(--text-muted)]")}>
                                  {s.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">{s.desc}</p>
                              {isSelected && (
                                <span className={cn("absolute top-2.5 right-2.5", s.id === "streaming" ? "text-purple-400" : "text-[var(--accent-primary)]")}>
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-[var(--accent-primary)]" />
                            2. Type d&apos;Activité & Mode Streamer
                          </h3>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            Le verbe qui précède le texte sur le profil Discord
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentStatus("streaming");
                            setActivityType("Streaming");
                            
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                            activityType === "Streaming" || currentStatus === "streaming"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                              : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-purple-300 border border-[var(--panel-border)]"
                          )}
                        >
                          <Video className="w-3 h-3 text-purple-400" />
                          <span>Mode Streamer</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {[
                          { type: "Playing", label: ACTIVITY_VERB.Playing, icon: Flame, color: "text-orange-400" },
                          { type: "Streaming", label: ACTIVITY_VERB.Streaming, icon: Video, color: "text-purple-400" },
                          { type: "Listening", label: ACTIVITY_VERB.Listening, icon: Headphones, color: "text-cyan-400" },
                          { type: "Watching", label: ACTIVITY_VERB.Watching, icon: Tv, color: "text-indigo-400" },
                          { type: "Competing", label: ACTIVITY_VERB.Competing, icon: Trophy, color: "text-amber-400" },
                        ].map((item) => {
                          const Icon = item.icon;
                          const isSelected = activityType === item.type;
                          return (
                            <button
                              key={item.type}
                              type="button"
                              onClick={() => {
                                setActivityType(item.type as DiscordActivityType);
                                if (item.type === "Streaming") {
                                  setCurrentStatus("streaming");
                                  
                                } else if (currentStatus === "streaming") {
                                  setCurrentStatus("online");
                                }
                              }}
                              className={cn(
                                "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer active:scale-[0.97]",
                                isSelected
                                  ? "bg-[var(--surface-raised)] border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20 shadow-sm"
                                  : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] hover:bg-[var(--surface-raised)]/80"
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

                      {activityType === "Streaming" && (
                        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                          <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-purple-400" />
                            URL du Stream (Twitch ou YouTube obligatoire pour la pastille violette)
                          </label>
                          <input
                            type="url"
                            value={streamUrl}
                            onChange={(e) => setStreamUrl(e.target.value)}
                            placeholder="https://www.twitch.tv/ta-chaine"
                            className="w-full px-3.5 py-2 rounded-lg bg-[var(--surface-raised)] border border-purple-500/30 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-400 font-mono"
                          />
                          <p className="text-[11px] text-purple-300/80">
                            Discord diffuse la pastille violette « Streame » avec bouton « Regarder » vers ce lien.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-5 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
                          3. Texte de l&apos;Activité & Variables Dynamiques
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          Saisissez le texte ou cliquez sur une variable pour l&apos;insérer dynamiquement
                        </p>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={activityName}
                          onChange={(e) => setActivityName(e.target.value)}
                          placeholder="Ex: Valorant | {guildCount} serveurs"
                          maxLength={128}
                          className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
                          <span>Aperçu résolu : <strong className="text-[var(--text-primary)]">{resolvedPreviewText}</strong></span>
                          <span>{activityName.length} / 128 caractères</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-[var(--text-muted)] block mb-2">Variables disponibles :</span>
                        <div className="flex flex-wrap gap-2">
                          {DYNAMIC_VARIABLES.map((v) => (
                            <button
                              key={v.tag}
                              type="button"
                              onClick={() => insertTag(v.tag)}
                              title={v.desc}
                              className="px-2.5 py-1 rounded-lg bg-[var(--surface-raised)]/60 hover:bg-[var(--accent-primary)]/10 border border-[var(--panel-border)] hover:border-[var(--accent-primary)]/40 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-all cursor-pointer"
                            >
                              <span>+ {v.tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[var(--panel-border)] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleApplyPresence(currentStatus, { type: activityType, name: activityName, url: streamUrl }, false)}
                          disabled={saving}
                          className="px-6 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] font-semibold text-xs flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer active:scale-[0.97]"
                        >
                          <Save className="w-4 h-4" />
                          <span>{saving ? "Application en cours..." : "Appliquer Immédiatement sur Discord"}</span>
                        </button>

                        <span className="text-xs text-[var(--text-muted)] font-mono">
                          Mise à jour directe Gateway
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-6">
                    <div className="p-5 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400" />
                          Profils Rapides (1-Clic)
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Basculez instantanément vers un préréglage</p>
                      </div>

                      <div className="space-y-2 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
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
                                  ? "bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/40 shadow-sm"
                                  : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] hover:bg-[var(--surface-raised)]/80"
                              )}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "w-2.5 h-2.5 rounded-full shrink-0",
                                      statusDotColor[p.status as DiscordStatus] || "bg-[var(--success)]"
                                    )}
                                  />
                                  <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{p.name}</h4>
                                </div>
                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                                  {p.activity?.type} <strong>{p.activity?.name}</strong>
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleApplyProfile(p.id)}
                                disabled={saving}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer active:scale-[0.97]",
                                  isActive
                                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                                    : "bg-[var(--surface-raised)] hover:bg-[var(--accent-primary)] text-[var(--text-muted)] hover:text-[var(--accent-contrast)]"
                                )}
                              >
                                {isActive ? "Actif" : "Activer"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[var(--accent-primary)]" />
                        Statistiques de Présence
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)]">
                          <span className="text-xs text-[var(--text-muted)]">Total Changements</span>
                          <p className="text-lg font-bold text-[var(--text-primary)] font-mono mt-1">{stats.totalChanges}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)]">
                          <span className="text-xs text-[var(--text-muted)]">Rotations Exécutées</span>
                          <p className="text-lg font-bold text-[var(--accent-primary)] font-mono mt-1">{stats.rotationsExecuted}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)]">
                          <span className="text-xs text-[var(--text-muted)]">Rate Limits</span>
                          <p className="text-lg font-bold text-emerald-400 font-mono mt-1">{stats.rateLimitHits}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)]">
                          <span className="text-xs text-[var(--text-muted)]">Uptime Gateway</span>
                          <p className="text-lg font-bold text-[var(--accent-primary)] font-mono mt-1">{stats.currentUptimeHours}h</p>
                        </div>
                      </div>

                      <div className="pt-2 text-xs text-[var(--text-muted)] flex items-center justify-between border-t border-[var(--panel-border)]">
                        <span>Dernière synchronisation :</span>
                        <span className="font-mono text-[var(--text-primary)]">
                          {new Date(lastUpdated).toLocaleTimeString("fr-FR")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "rotation" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <ListRestart className="w-5 h-5 text-[var(--accent-primary)]" />
                        Moteur de Rotation Automatique d&apos;Activités
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Faites défiler plusieurs activités automatiquement (Streamer, Spotify, Anti-Raid, Gaming, etc.)
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleToggleRotation}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer active:scale-[0.97]",
                          rotationConfig.enabled
                            ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]/50 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/30"
                            : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        <RotateCcw className={cn("w-4 h-4", rotationConfig.enabled && "animate-spin text-[var(--success)]")} />
                        <span>{rotationConfig.enabled ? "Rotation Activée" : "Rotation Désactivée"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveRotationConfig}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.97]"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Sauvegarder</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--panel-border)]">
                    <div className="p-4 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] space-y-2">
                      <label className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
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
                        className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--panel-border)] text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                      <p className="text-[11px] text-[var(--text-muted)]">Minimum 30s (Protection anti-spam Discord)</p>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] space-y-2">
                      <label className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                        <Shuffle className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        Stratégie d&apos;ordonnancement
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
                      <p className="text-[11px] text-[var(--text-muted)]">Détermine le choix de la prochaine activité</p>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] space-y-2">
                      <label className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        Prochaine rotation
                      </label>
                      <div className="px-3 py-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--panel-border)] text-sm font-mono text-[var(--accent-primary)] flex items-center justify-between">
                        <span>{rotationConfig.enabled ? "Dans quelques secondes" : "En pause"}</span>
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">Horodatage précis synchronisé</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-3">
                  <span className="text-xs font-bold text-[var(--text-muted)] block">
                    Modèles d&apos;activités rapides à ajouter dans la rotation :
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickAddRotationTemplate("Streaming", "🔴 En direct • /help", streamUrl)}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>+ Mode Streamer Twitch</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddRotationTemplate("Listening", "Spotify • Chill Lo-Fi Beats & Synthwave")}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>+ Spotify Vibes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddRotationTemplate("Watching", "{guildCount} serveurs • Anti-Raid 24/7")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>+ Bouclier Anti-Raid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddRotationTemplate("Playing", "Visual Studio Code • Dashboard v1.75.8")}
                      className="px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>+ VS Code Dev</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddRotationTemplate("Playing", "Minecraft • Serveur Communautaire ETHONE")}
                      className="px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>+ Minecraft Gaming</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddRotationTemplate("Competing", "Tournoi Discord Arena & Rocket League")}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>+ Compétition Esports</span>
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-6">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[var(--accent-primary)]" />
                    Activités dans le Cycle ({rotationConfig.activities.length})
                  </h3>

                  <div className="space-y-3">
                    {rotationConfig.activities.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--accent-primary)]/40 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-[var(--surface-raised)] text-[var(--text-muted)] text-xs font-mono font-bold flex items-center justify-center shrink-0 border border-[var(--panel-border)]">
                            {index + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-xs font-bold border",
                                  item.type === "Streaming"
                                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                    : "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30"
                                )}
                              >
                                {item.type}
                              </span>
                              <span className="text-sm font-semibold text-[var(--text-primary)]">{item.text}</span>
                            </div>
                            {item.url && (
                              <span className="text-xs text-purple-300 font-mono mt-1 block">
                                Stream : {item.url}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {rotationConfig.order === "weighted" && (
                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                              <span>Poids :</span>
                              <span className="font-mono font-bold text-[var(--text-primary)]">{item.weight || 10}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveRotationItem(item.id)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Supprimer cette activité"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-dashed border-[var(--panel-border)] space-y-4">
                    <h4 className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                      Ajouter une activité personnalisée
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
                          className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--panel-border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddRotationItem}
                          className="w-full px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--accent-contrast)] text-xs font-semibold transition-all cursor-pointer active:scale-[0.97]"
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
                        placeholder="URL Twitch / YouTube (ex: https://www.twitch.tv/ta-chaine)"
                        className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)] border border-purple-500/30 text-xs text-[var(--text-primary)] font-mono"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "schedule" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" />
                      Profils de Présence Prédéfinis
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Des ambiances configurées d&apos;un clic pour le streaming, le gaming, la musique, la maintenance ou le mode invisible
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profiles.map((p) => (
                      <div
                        key={p.id}
                        className="p-5 rounded-2xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] flex flex-col justify-between gap-4 hover:border-[var(--accent-primary)]/40 transition-all shadow-sm"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[var(--text-primary)]">{p.name}</span>
                            <span
                              className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                statusDotColor[p.status as DiscordStatus] || "bg-[var(--success)]"
                              )}
                            />
                          </div>
                          <p className="text-xs text-[var(--text-muted)]">{p.description}</p>
                          <div className="p-2.5 rounded-lg bg-[var(--bg-main)]/60 border border-[var(--panel-border)] text-xs font-mono text-[var(--text-muted)] truncate">
                            <span className="text-[var(--accent-primary)] font-bold">{p.activity.type}</span> {p.activity.name}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplyProfile(p.id)}
                          disabled={saving}
                          className="w-full py-2 rounded-xl bg-[var(--surface-raised)] hover:bg-[var(--accent-primary)] text-[var(--text-primary)] hover:text-[var(--accent-contrast)] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.97]"
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
                        <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
                        Planning Hebdomadaire Automatique
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Définissez quel profil activer selon les plages horaires de la semaine
                      </p>
                    </div>
                    <span className="text-xs font-mono text-[var(--accent-primary)] px-2.5 py-1 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30">
                      Europe/Paris
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[var(--panel-border)]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--surface-raised)]/80 text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                        <tr className="border-b border-[var(--panel-border)]">
                          <th className="py-2.5 px-4">Créneau</th>
                          <th className="py-2.5 px-4">Lundi - Vendredi</th>
                          <th className="py-2.5 px-4">Samedi - Dimanche</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--panel-border)] text-[var(--text-muted)]">
                        <tr className="hover:bg-[var(--surface-hover)]/40">
                          <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">08:00 - 18:00 (Journée)</td>
                          <td className="py-3 px-4 text-[var(--accent-primary)] font-medium">Surveillance Communauté</td>
                          <td className="py-3 px-4 text-purple-300 font-medium">Mode Streamer Live</td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-[var(--accent-primary)] hover:underline cursor-pointer">Modifier</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-[var(--surface-hover)]/40">
                          <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">18:00 - 23:00 (Soirée)</td>
                          <td className="py-3 px-4 text-purple-300 font-medium">Mode Streamer Live</td>
                          <td className="py-3 px-4 text-cyan-400 font-medium">Spotify Vibes</td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-[var(--accent-primary)] hover:underline cursor-pointer">Modifier</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-[var(--surface-hover)]/40">
                          <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">23:00 - 08:00 (Nuit)</td>
                          <td className="py-3 px-4 text-amber-400 font-medium">Mode Nuit (Inactif)</td>
                          <td className="py-3 px-4 text-neutral-400 font-medium">Mode Invisible (Fantôme)</td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-[var(--accent-primary)] hover:underline cursor-pointer">Modifier</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "servers" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Server className="w-5 h-5 text-[var(--accent-primary)]" />
                      Serveurs Installés & Préférences Déclaratives
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Définissez le profil préféré pour chaque serveur Discord où Etho est installé
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[var(--panel-border)]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--surface-raised)]/80 text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                        <tr className="border-b border-[var(--panel-border)]">
                          <th className="py-3 px-4">Serveur Discord</th>
                          <th className="py-3 px-4">ID de Guilde</th>
                          <th className="py-3 px-4">Profil Préféré</th>
                          <th className="py-3 px-4">Dernière Maj</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--panel-border)] text-[var(--text-muted)]">
                        {guilds.map((g) => (
                          <tr key={g.guildId} className="hover:bg-[var(--surface-raised)]/70">
                            <td className="py-3.5 px-4 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[var(--surface-raised)] border border-[var(--panel-border)] flex items-center justify-center font-bold text-[var(--text-primary)]">
                                {g.guildName?.charAt(0) || "S"}
                              </div>
                              <div>
                                <span className="font-semibold text-[var(--text-primary)] block">{g.guildName}</span>
                                <span className="text-xs text-[var(--accent-primary)] flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
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
                                options={profiles.map((p) => ({ id: p.id, label: `${p.name}` }))}
                              />
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                              {new Date(g.updatedAt).toLocaleDateString("fr-FR")}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleApplyProfile(rowProfileByGuild[g.guildId] ?? g.preferredProfileId)}
                                className="px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-medium text-xs transition-all cursor-pointer active:scale-[0.97]"
                              >
                                Appliquer
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

            {activeTab === "identity" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <User className="w-5 h-5 text-[var(--accent-primary)]" />
                      Studio d&apos;Identité du Bot
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Gestion de l&apos;avatar et du nom d&apos;utilisateur du bot avec suivi strict des quotas Discord
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] space-y-4">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                        Avatar du Bot
                      </h3>

                      <div className="flex items-center gap-5">
                        <img
                          src={identity.avatarUrl}
                          alt={identity.username}
                          className="w-20 h-20 rounded-full border-2 border-[var(--panel-border)] object-cover bg-[var(--surface-raised)]"
                        />
                        <div>
                          <span className="text-xs text-[var(--text-muted)] block mb-1">Changements restants :</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold font-mono text-[var(--accent-primary)]">
                              {identity.avatarChangesRemaining} / 2
                            </span>
                            <span className="text-xs text-[var(--text-muted)] font-mono">(cycle de 60m)</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 space-y-2">
                        <label className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[var(--panel-border)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/10 text-xs text-[var(--text-muted)] flex items-center justify-center gap-2 cursor-pointer transition-all">
                          <Upload className="w-4 h-4 text-[var(--accent-primary)]" />
                          <span>{newAvatarFile ? newAvatarFile.name : "Téléverser un nouvel avatar (PNG/JPG)"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                setNewAvatarFile(e.target.files[0]);
                                toast.info("Image sélectionnée.");
                              }
                            }}
                          />
                        </label>
                        {newAvatarFile && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleUpdateAvatar}
                              disabled={uploadingAvatar || identity.avatarChangesRemaining <= 0}
                              className="flex-1 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.97]"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{uploadingAvatar ? "Envoi..." : "Appliquer l'avatar"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewAvatarFile(null)}
                              disabled={uploadingAvatar}
                              className="px-3 py-2 rounded-xl bg-[var(--surface-raised)] text-[var(--text-muted)] text-xs font-medium cursor-pointer"
                            >
                              Annuler
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] space-y-4">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <User className="w-4 h-4 text-[var(--accent-primary)]" />
                        Nom d&apos;Utilisateur
                      </h3>

                      <div>
                        <span className="text-xs text-[var(--text-muted)] block mb-1">Changements restants :</span>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg font-bold font-mono text-[var(--accent-primary)]">
                            {identity.usernameChangesRemaining} / 2
                          </span>
                          <span className="text-xs text-[var(--text-muted)] font-mono">(cycle de 2h)</span>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-[var(--text-muted)]">Modifier le pseudo Discord :</label>
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            placeholder="Etho"
                            maxLength={32}
                            className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleUpdateUsername}
                          disabled={saving || editUsername === identity.username}
                          className="mt-4 w-full py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] text-xs font-semibold disabled:opacity-50 cursor-pointer active:scale-[0.97]"
                        >
                          Enregistrer le nouveau nom
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-6">
                  <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <History className="w-5 h-5 text-[var(--accent-primary)]" />
                    Journal d&apos;Audit des Changements de Présence
                  </h2>

                  <div className="overflow-x-auto rounded-xl border border-[var(--panel-border)]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--surface-raised)]/80 text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                        <tr className="border-b border-[var(--panel-border)]">
                          <th className="py-3 px-3">Date & Heure</th>
                          <th className="py-3 px-3">Auteur / Source</th>
                          <th className="py-3 px-3">Transition Statut</th>
                          <th className="py-3 px-3">Activité Appliquée</th>
                          <th className="py-3 px-3">Raison</th>
                          <th className="py-3 px-3 text-right">Portée</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--panel-border)] text-[var(--text-muted)] font-mono">
                        {auditHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-[var(--surface-raised)]/70 font-sans">
                            <td className="py-3 px-3 text-[var(--text-muted)] whitespace-nowrap font-mono text-xs">
                              {new Date(item.timestamp).toLocaleString("fr-FR")}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--text-primary)] text-xs font-semibold">
                                {item.actor}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[var(--text-muted)] line-through text-xs">{item.previousStatus}</span>
                                <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                                <span className={cn("px-1.5 py-0.2 rounded text-xs font-bold", statusColorMap[item.newStatus as DiscordStatus] || "text-[var(--success)]")}>
                                  {item.newStatus}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-[var(--text-primary)]">
                              <span className="font-semibold text-[var(--accent-primary)]">{item.newActivity}</span>
                            </td>
                            <td className="py-3 px-3 text-[var(--text-muted)] text-xs">{item.reason || "Mise à jour"}</td>
                            <td className="py-3 px-3 text-right">
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
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
          </>
        )}
      </div>
    </div>
  );
}
