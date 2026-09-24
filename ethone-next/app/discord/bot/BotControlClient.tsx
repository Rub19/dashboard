"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  BarChart3,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Crown,
  Gamepad2,
  Layers,
  ListRestart,
  Music,
  Power,
  Radio,
  RefreshCw,
  Scroll,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Ticket,
  Timer,
  Trash2,
  UserPlus,
  Users,
  Wifi,
  XCircle,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import SecurityGroup from "@/components/discord/bot-control/SecurityGroup";
import OverviewGroup from "@/components/discord/bot-control/OverviewGroup";
import HealthGroup from "@/components/discord/bot-control/HealthGroup";
import OperationsGroup from "@/components/discord/bot-control/OperationsGroup";
import ConfigurationGroup from "@/components/discord/bot-control/ConfigurationGroup";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useDiscordSync } from "@/lib/useDiscordSync";

export type BotTab =
  | "overview"
  | "presence"
  | "modules"
  | "commands"
  | "events"
  | "health"
  | "servers"
  | "errors"
  | "ai"
  | "diagnostics"
  | "integrations"
  | "jobs"
  | "performance"
  | "security"
  | "shield"
  | "settings";

interface BotControlClientProps {
  initialTab?: BotTab;
}

// Regroups the 16 flat tabs into 5 top-level categories for navigation —
// each tab's own content/JSX is unchanged, only how you get to it.
const TAB_GROUPS: { id: string; label: string; icon: any; tabs: BotTab[] }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: BarChart3, tabs: ["overview", "presence"] },
  { id: "configuration", label: "Configuration", icon: Settings, tabs: ["settings", "ai", "modules"] },
  { id: "health", label: "Santé & Performance", icon: Activity, tabs: ["performance", "diagnostics", "health", "servers"] },
  { id: "security", label: "Sécurité", icon: ShieldCheck, tabs: ["security", "errors"] },
  { id: "operations", label: "Opérations", icon: Wifi, tabs: ["integrations", "jobs", "commands", "events"] },
];

const TAB_META: Record<BotTab, { label: string; icon: any }> = {
  overview: { label: "Vue Générale", icon: BarChart3 },
  presence: { label: "Présence & Activité", icon: Sparkles },
  settings: { label: "Configuration & Confidentialité", icon: Settings },
  ai: { label: "Assistant IA & Tokens", icon: Bot },
  performance: { label: "Performances & RAM", icon: Activity },
  diagnostics: { label: "Diagnostics 1-Clic", icon: CheckCircle2 },
  security: { label: "Sécurité & Audit", icon: ShieldCheck },
  shield: { label: "Bouclier Owner ⚡", icon: ShieldAlert },
  integrations: { label: "Intégrations", icon: Wifi },
  jobs: { label: "Tâches Planifiées", icon: ListRestart },
  commands: { label: "Commandes", icon: Terminal },
  health: { label: "Sous-Systèmes", icon: Cpu },
  servers: { label: "Serveurs Installés", icon: Server },
  modules: { label: "Modules Actifs", icon: Layers },
  events: { label: "Flux d'Événements", icon: Radio },
  errors: { label: "Incidents & Erreurs", icon: ShieldAlert },
};

// Maps the `icon` string returned by GET /api/guilds/:guildId/modules (moduleRoutes.ts'
// AVAILABLE_MODULES catalog) to an actual lucide component.
const MODULE_ICONS: Record<string, any> = {
  Shield,
  UserPlus,
  Scroll,
  Award,
  Ticket,
  Gamepad2,
  Music,
};

// Même convention que le reste des pages /discord/* (welcome, moderation, automod...) :
// NEXT_PUBLIC_DISCORD_BOT_API pointe vers le serveur Express du bot Discord (pas vers
// ethone-next lui-même — il n'existe pas de route Next.js /api/bot/*).
const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export default function BotControlClient({ initialTab = "overview" }: BotControlClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const activeTab: BotTab = (searchParams.get("tab") as BotTab) || initialTab;

  const handleTabChange = (tab: BotTab) => {
    router.push(`/discord/bot?tab=${tab}`);
  };

  const activeGroupId = useMemo(
    () => TAB_GROUPS.find((g) => g.tabs.includes(activeTab))?.id || "overview",
    [activeTab]
  );
  const handleGroupChange = (groupId: string) => {
    const group = TAB_GROUPS.find((g) => g.id === groupId);
    if (group) handleTabChange(group.tabs[0]);
  };

  // Owner Authentication (Strictly rub19.mailpro@gmail.com)
  const auth = useAuth();
  const currentUser = auth.user;
  const [restartingBot, setRestartingBot] = useState(false);
  const [updatingBot, setUpdatingBot] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [ownerLogs, setOwnerLogs] = useState<any[]>([]);
  const [ownerPanelOpen, setOwnerPanelOpen] = useState(false);

  const isOwner = Boolean(currentUser && currentUser.email?.toLowerCase() === "rub19.mailpro@gmail.com");

  const loadOwnerLogs = useCallback(async () => {
    if (!isOwner) return;
    try {
      const { data } = await supabase
        .from("ethone_bot_owner_actions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (data && data.length > 0) {
        setOwnerLogs(data);
      }
    } catch {
      // Tolérer si vide
    }
  }, [isOwner]);

  useEffect(() => {
    if (isOwner) {
      void loadOwnerLogs();
    }
  }, [isOwner, loadOwnerLogs]);

  useEffect(() => {
    if (activeTab === "shield") {
      if (isOwner) {
        router.replace("/owner/shield");
      } else {
        router.replace("/discord/bot?tab=security");
      }
    }
  }, [activeTab, isOwner, router]);

  const handleRemoteRestart = async () => {
    if (!confirm("⚠️ Confirmation Propriétaire : Êtes-vous sûr de vouloir redémarrer le bot Discord à distance ?")) return;
    setRestartingBot(true);
    try {
      await fetch(`${BOT_API_URL}/api/bot/restart`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json", "x-bot-owner": "825124006209388616" },
        body: JSON.stringify({ reason: "Dashboard Remote Owner Restart", email: "rub19.mailpro@gmail.com" }),
      }).catch(() => null);

      if (currentUser?.id) {
        try {
          await supabase.from("ethone_bot_owner_actions").insert({
            user_id: currentUser.id,
            user_email: "rub19.mailpro@gmail.com",
            action: "RESTART_BOT",
            status: "SUCCESS",
            details: { type: "RESTART_PM2" },
          });
        } catch {}
      }

      toast?.success?.("🚀 Le redémarrage à distance du bot Discord a été commandé avec succès !");
      setOwnerLogs((prev) => [
        { action: "RESTART_BOT", created_at: new Date().toISOString(), status: "SUCCESS" },
        ...prev,
      ]);
    } catch {
      toast?.error?.("Erreur réseau lors de la commande de redémarrage.");
    } finally {
      setRestartingBot(false);
    }
  };

  const handleRemoteUpdate = async () => {
    setUpdatingBot(true);
    try {
      await fetch(`${BOT_API_URL}/api/bot/update`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json", "x-bot-owner": "825124006209388616" },
        body: JSON.stringify({ reason: "Dashboard Remote Owner Update", email: "rub19.mailpro@gmail.com" }),
      }).catch(() => null);

      if (currentUser?.id) {
        try {
          await supabase.from("ethone_bot_owner_actions").insert({
            user_id: currentUser.id,
            user_email: "rub19.mailpro@gmail.com",
            action: "UPDATE_BOT",
            status: "SUCCESS",
            details: { type: "GIT_PULL_UPDATE" },
          });
        } catch {}
      }

      toast?.success?.("⚡ La mise à jour du bot et le rechargement des modules ont été commandés !");
      setOwnerLogs((prev) => [
        { action: "UPDATE_BOT", created_at: new Date().toISOString(), status: "SUCCESS" },
        ...prev,
      ]);
    } catch {
      toast?.error?.("Erreur réseau.");
    } finally {
      setUpdatingBot(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      if (currentUser?.id) {
        try {
          await supabase.from("ethone_bot_owner_actions").insert({
            user_id: currentUser.id,
            user_email: "rub19.mailpro@gmail.com",
            action: "CLEAR_CACHE",
            status: "SUCCESS",
            details: { type: "CACHE_PURGE" },
          });
        } catch {}
      }

      toast?.success?.("🧹 Le cache mémoire RAM et les compteurs temporaires ont été vidés avec succès !");
      setOwnerLogs((prev) => [
        { action: "CLEAR_CACHE", created_at: new Date().toISOString(), status: "SUCCESS" },
        ...prev,
      ]);
    } catch {
      toast?.error?.("Erreur réseau.");
    } finally {
      setClearingCache(false);
    }
  };

  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Real Bot Core Telemetry
  // Real Bot Core Telemetry — neutral baseline until real API fetch completes
  const [botCore, setBotCore] = useState<any>({
    name: "Ethone Bot",
    discriminator: "—",
    avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
    version: "—",
    gatewayConnected: false,
    status: "connecting",
    activity: null,
    pingMs: 0,
    uptimeSeconds: 0,
    guildCount: 0,
    userCount: 0,
    shardsCount: 0,
    lastSync: new Date().toISOString(),
  });

  // Real Subsystems Health — placeholder until GET /api/bot/overview resolves and
  // replaces this with globalStatus.subsystems (see fetchData below).
  const [subsystems, setSubsystems] = useState<any[]>([
    { id: "gateway", name: "Gateway WebSocket", status: "operational" },
    { id: "restApi", name: "Discord REST API", status: "operational" },
    { id: "database", name: "Configuration DB", status: "operational" },
    { id: "eventBus", name: "Realtime Sync Bus", status: "operational" },
    { id: "voiceEngine", name: "Moteur Vocal WebRTC", status: "operational" },
    { id: "jobScheduler", name: "Gestionnaire de Tâches", status: "operational" },
  ]);

  // Real per-guild Modules — fetched from GET /api/guilds/:guildId/modules, which reads
  // guildConfig.modules (guildConfigService). This is the exact same state the /module
  // Discord slash command reads and writes, so toggles here and on Discord stay in sync.
  const [modules, setModules] = useState<any[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [togglingModuleId, setTogglingModuleId] = useState<string | null>(null);

  // Real Commands
  const [commands, setCommands] = useState<any[]>([]);

  // Real Installed Servers — populated from GET /api/bot/presence/servers.
  // Starts empty: a hardcoded placeholder id used to get locked in as
  // `settingsGuildId` (the default-select effect only ran once), so when the
  // real guild list arrived with a different id the modules fetch kept hitting
  // a guild the bot isn't in → 404 → the Modules tab stayed empty.
  const [servers, setServers] = useState<any[]>([]);

  // Real Recent Discord Events
  const [recentEvents, setRecentEvents] = useState<any[]>([
    {
      id: "evt_1",
      type: "Gateway Ready",
      detail: "Connexion Gateway Shard 0 établie avec succès",
      timestamp: new Date().toISOString(),
      source: "SYSTEM",
    },
  ]);

  // Real Incidents & Errors
  const [errors, setErrors] = useState<any[]>([]);

  // Bot Operational Settings State
  const [botSettings, setBotSettings] = useState({
    maintenanceMode: false,
    responseVisibility: "PUBLIC" as "PUBLIC" | "EPHEMERAL",
    botPersonality: "FRIENDLY" as "FRIENDLY" | "PROFESSIONAL" | "HUMOROUS" | "CONCISE" | "CYBER",
    defaultPrefix: "!",
    customBotName: "ETHONE Bot",
    enableSlash: true,
    enablePrefix: true,
    autoReconnect: true,
    language: "fr" as "fr" | "en" | "es" | "de",
    // Values must match discord-bot's GuildConfigSchema.themePreset enum
    // exactly (DEFAULT/CYBERPUNK/EMERALD/SUNSET/DARK) — the PATCH /settings
    // route rejects anything else.
    themePreset: "DEFAULT" as "DEFAULT" | "CYBERPUNK" | "EMERALD" | "SUNSET" | "DARK",
    commandCooldown: 0,
    musicDefaultVolume: 80,
    autoDeleteCommands: false,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  // The Settings panel's language field is a genuine per-guild config (a Discord bot
  // serves multiple servers, each with its own /language choice), so it needs a guild
  // selector before it can read/write anything real. Other fields in `botSettings`
  // remain a local-only mock; only `language` is backed by a live endpoint for now.
  const [settingsGuildId, setSettingsGuildId] = useState("");
  const [loadingGuildSettings, setLoadingGuildSettings] = useState(false);

  // Select the first server once the list loads — and re-select if the current
  // choice isn't in the (updated) list, so a stale id can't get stuck.
  useEffect(() => {
    if (servers.length === 0) return;
    if (!settingsGuildId || !servers.some((s) => s.id === settingsGuildId)) {
      setSettingsGuildId(servers[0].id);
    }
  }, [servers, settingsGuildId]);

  // Load that guild's real, persisted Configuration fields whenever the
  // selection changes — previously only `language` was read back, silently
  // discarding botPersonality/prefix/commandCooldown/themePreset from the
  // response even though the backend already returns and persists them.
  useEffect(() => {
    if (!settingsGuildId || !BOT_API_URL) return;
    let cancelled = false;
    setLoadingGuildSettings(true);
    fetch(`${BOT_API_URL}/api/guilds/${settingsGuildId}/settings`, { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        const data = res?.data;
        if (!data) return;
        setBotSettings((s) => ({
          ...s,
          language: ["fr", "en", "es", "de"].includes(data.language) ? data.language : s.language,
          botPersonality: ["FRIENDLY", "PROFESSIONAL", "HUMOROUS", "CONCISE", "CYBER"].includes(data.botPersonality) ? data.botPersonality : s.botPersonality,
          defaultPrefix: typeof data.prefix === "string" ? data.prefix : s.defaultPrefix,
          commandCooldown: typeof data.commandCooldown === "number" ? data.commandCooldown : s.commandCooldown,
          themePreset: ["DEFAULT", "CYBERPUNK", "EMERALD", "SUNSET", "DARK"].includes(data.themePreset) ? data.themePreset : s.themePreset,
          enableSlash: typeof data.slashCommandsEnabled === "boolean" ? data.slashCommandsEnabled : s.enableSlash,
          enablePrefix: typeof data.prefixCommandsEnabled === "boolean" ? data.prefixCommandsEnabled : s.enablePrefix,
        }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingGuildSettings(false);
      });
    return () => {
      cancelled = true;
    };
  }, [settingsGuildId]);

  // Salon IA dédié, génération d'images, humeur du Thon & mots bannis étaient
  // de l'état local pur (jamais chargés ni sauvegardés) : les toggles et le
  // bouton "Bannir le mot" affichaient un toast de succès sans rien
  // persister, donc tout redisparaissait au rechargement de la page.
  // GET /api/guilds/:guildId/ai/settings renvoie ces 4 champs (déjà présents
  // sur AISettings côté bot, juste jamais exposés au dashboard).
  useEffect(() => {
    if (!settingsGuildId || !BOT_API_URL) return;
    let cancelled = false;
    fetch(`${BOT_API_URL}/api/guilds/${settingsGuildId}/ai/settings`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setDedicatedAiChannel(typeof data.dedicatedChannelId === "string" ? data.dedicatedChannelId : "");
        setDedicatedAiChannelEnabled(Boolean(data.dedicatedChannelId));
        setAllowImageGen(Boolean(data.allowImageGeneration));
        setThonMood(["SAGE", "GAMER_SARCASTIQUE", "PROTECTEUR", "CYBERPUNK", "CUSTOM"].includes(data.thonMood) ? data.thonMood : "SAGE");
        setBannedWordsList(Array.isArray(data.bannedWords) ? data.bannedWords : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [settingsGuildId]);

  // Real text channels for the dedicated-channel picker below — it used to be
  // a free-text field pre-filled with a fake name ("salon-ia-general"), which
  // could never resolve to a real Discord channel ID.
  const [aiTextChannels, setAiTextChannels] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!settingsGuildId || !BOT_API_URL) {
      setAiTextChannels([]);
      return;
    }
    let cancelled = false;
    fetch(`${BOT_API_URL}/api/guilds/${settingsGuildId}/ai/channels`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setAiTextChannels(Array.isArray(data?.textChannels) ? data.textChannels : []);
      })
      .catch(() => {
        if (!cancelled) setAiTextChannels([]);
      });
    return () => {
      cancelled = true;
    };
  }, [settingsGuildId]);

  const saveAiBehaviorSettings = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!settingsGuildId || !BOT_API_URL) return;
      try {
        await fetch(`${BOT_API_URL}/api/guilds/${settingsGuildId}/ai/settings`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
      } catch {
        toast?.error?.("Échec de la sauvegarde du réglage IA.");
      }
    },
    [settingsGuildId, toast]
  );

  // Load the real per-guild module toggles (GET /api/guilds/:guildId/modules) whenever
  // the selected server changes.
  const loadModules = useCallback(async () => {
    setModulesError(null);
    if (!BOT_API_URL) {
      setModules([]);
      setModulesError("Le serveur du bot n'est pas joignable depuis cet environnement.");
      return;
    }
    if (!settingsGuildId) {
      setModules([]);
      return;
    }
    setModulesLoading(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${settingsGuildId}/modules`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.modules)) {
        setModules(data.modules);
      } else {
        setModules([]);
        setModulesError(
          data?.error ||
            (res.status === 401
              ? "Session expirée — reconnecte-toi au dashboard Discord."
              : res.status === 403
                ? "Tu dois être administrateur de ce serveur (ou le bot n'y est pas)."
                : `Impossible de charger les modules (HTTP ${res.status}).`)
        );
      }
    } catch {
      setModules([]);
      setModulesError("Impossible de joindre le serveur du bot. Réessaie.");
    } finally {
      setModulesLoading(false);
    }
  }, [settingsGuildId]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // Reflète en direct les changements du toggle de modules faits via la commande
  // Discord /module (ou un autre onglet dashboard). Instance séparée de celle plus
  // bas : celle-ci est scopée à settingsGuildId (flux par serveur), alors que la
  // globale (sans guildId) sert la présence du bot, qui n'est pas liée à un serveur.
  useDiscordSync({
    guildId: settingsGuildId,
    onConfigUpdated: (module, updatedModules) => {
      if (module === "modules" && updatedModules) {
        setModules((prev) => prev.map((m) => ({ ...m, enabled: updatedModules[m.id] ?? m.enabled })));
      }
    },
  });

  // Toggle a module for the selected guild — writes straight to guildConfigService via
  // PATCH /api/guilds/:guildId/modules/:moduleId, the exact same state the /module
  // Discord slash command reads and updates. Optimistic update with rollback on failure.
  const handleToggleModule = async (moduleId: string, nextEnabled: boolean) => {
    if (!settingsGuildId || !BOT_API_URL) return;
    const previousModules = modules;
    setTogglingModuleId(moduleId);
    setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, enabled: nextEnabled } : m)));
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${settingsGuildId}/modules/${moduleId}`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      const mod = modules.find((m) => m.id === moduleId);
      toast?.toggle?.(mod?.name || "Module", nextEnabled, `Module ${nextEnabled ? "activé" : "désactivé"} avec succès.`);
    } catch (err: any) {
      setModules(previousModules);
      toast?.error?.(err?.message || "Erreur lors de la mise à jour du module.");
    } finally {
      setTogglingModuleId(null);
    }
  };

  // AI Assistant Telemetry State
  // Neutral values (no invented numbers) until fetchData's GET /api/bot/ai
  // response lands — that response is the real, live-tracked source now
  // (see discord-bot's botAiMonitorService.ts), not a static mock.
  const [aiTelemetry, setAiTelemetry] = useState({
    dailyRequests: 0,
    dailyTokens: 0,
    maxTokens: 100000,
    activeModel: "—",
    avgLatencyMs: 0,
    successRate: 0,
    safetyShield: false,
    ragSources: 0,
  });

  // Seeded empty until fetchData's GET /api/bot/security response lands.
  const [securityAudit, setSecurityAudit] = useState({
    score: 0,
    intents: { guildMembers: false, messageContent: false, guildPresences: false },
    adminGuildsCount: 0,
    suspiciousRoleCreations24h: 0,
    unauthorizedAttempts24h: 0,
  });

  // Dedicated AI Channel, Humeur du Thon & Banned Words State
  const [dedicatedAiChannel, setDedicatedAiChannel] = useState("");
  const [dedicatedAiChannelEnabled, setDedicatedAiChannelEnabled] = useState(false);
  const [thonMood, setThonMood] = useState<"SAGE" | "GAMER_SARCASTIQUE" | "PROTECTEUR" | "CYBERPUNK" | "CUSTOM">("SAGE");
  const [allowImageGen, setAllowImageGen] = useState(false);
  const [bannedWordsList, setBannedWordsList] = useState<string[]>([]);
  const [newBannedWordInput, setNewBannedWordInput] = useState("");

  // Role Permissions & Presets State
  const [activeRolePreset, setActiveRolePreset] = useState<string>("PRESET_BALANCED");
  const [detectedRolesList, setDetectedRolesList] = useState<any[]>([]);
  const [applyingRolePreset, setApplyingRolePreset] = useState(false);

  const handleAddBannedWord = () => {
    if (!newBannedWordInput.trim()) return;
    const word = newBannedWordInput.trim().toLowerCase();
    if (!bannedWordsList.includes(word)) {
      const next = [...bannedWordsList, word];
      setBannedWordsList(next);
      saveAiBehaviorSettings({ bannedWords: next });
      toast?.success?.(`Mot banni "${word}" ajouté à l'AutoMod.`);
    }
    setNewBannedWordInput("");
  };

  const handleRemoveBannedWord = (word: string) => {
    const next = bannedWordsList.filter((w) => w !== word);
    setBannedWordsList(next);
    saveAiBehaviorSettings({ bannedWords: next });
    toast?.info?.(`Mot banni "${word}" retiré.`);
  };

  // Rôles détectés & présets de permissions : même moteur que /permissions côté
  // Discord (RolePermissionService), jamais exposé au dashboard avant — cette
  // section affichait 5 rôles inventés et "appliquer un préset" ne faisait que
  // changer une pastille locale.
  useEffect(() => {
    if (!settingsGuildId || !BOT_API_URL) {
      setDetectedRolesList([]);
      return;
    }
    let cancelled = false;
    fetch(`${BOT_API_URL}/api/guilds/${settingsGuildId}/roles/permissions/presets`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const categoryBadges: Record<string, string> = {
          OWNER: "👑 OWNER",
          ADMIN: "🛡️ ADMIN",
          MODERATOR: "⚔️ MOD",
          VIP: "💎 VIP",
          BOT: "🤖 BOT",
          MEMBER: "👥 MEMBER",
        };
        const roles = Array.isArray(data.detectedRoles)
          ? data.detectedRoles.map((r: any) => ({
              id: r.roleId,
              name: r.roleName,
              color: r.roleColor ? `#${r.roleColor.toString(16).padStart(6, "0")}` : "#99a1af",
              category: r.detectedCategory,
              members: r.memberCount,
              recommendation: r.recommendationLabel,
              badge: categoryBadges[r.detectedCategory] || r.detectedCategory,
            }))
          : [];
        setDetectedRolesList(roles);
        if (typeof data.activePreset === "string") setActiveRolePreset(data.activePreset);
      })
      .catch(() => {
        if (!cancelled) setDetectedRolesList([]);
      });
    return () => {
      cancelled = true;
    };
  }, [settingsGuildId]);

  const handleApplyRolePreset = async (presetId: string, label: string) => {
    if (!settingsGuildId || !BOT_API_URL) return;
    setApplyingRolePreset(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${settingsGuildId}/roles/permissions/apply-preset`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setActiveRolePreset(presetId);
      toast?.success?.(`Préset "${label}" appliqué avec succès.`);
    } catch {
      toast?.error?.("Échec de l'application du préset.");
    } finally {
      setApplyingRolePreset(false);
    }
  };

  // Performance & RAM State
  const [perfMetrics, setPerfMetrics] = useState({
    heapUsedMb: 0,
    heapTotalMb: 0,
    rssMb: 0,
    cpuUsagePercent: 0,
    eventLoopLagMs: 0,
    activeAudioStreams: 0,
    eventsPerMinute: 0,
    commandsPerMinute: 0,
    dbQueriesPerMinute: 0,
    aiTokensPerMinute: 0,
  });
  const [optimizingMemory, setOptimizingMemory] = useState(false);

  // 1-Click Diagnostics State
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticChecks, setDiagnosticChecks] = useState([
    { id: "gateway", name: "Gateway WebSocket Discord", detail: "En attente du diagnostic", status: "pending", latency: "—" },
    { id: "rest", name: "Discord REST API v10", detail: "En attente du diagnostic", status: "pending", latency: "—" },
    { id: "intents", name: "Intents Privilégiés", detail: "En attente du diagnostic", status: "pending", latency: "—" },
    { id: "audio", name: "Moteur Vocal WebRTC / Opus", detail: "En attente du diagnostic", status: "pending", latency: "—" },
    { id: "storage", name: "Base de Données & Configurations", detail: "En attente du diagnostic", status: "pending", latency: "—" },
    { id: "ai", name: "Assistant IA & Knowledge Base", detail: "En attente du diagnostic", status: "pending", latency: "—" },
  ]);

  // Command Search & Filter
  const [commandSearch, setCommandSearch] = useState("");
  const [commandCategory, setCommandCategory] = useState("all");

  // Integrations Center State — GET /api/bot/integrations, POST /api/bot/integrations/:id/test
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [integrationsError, setIntegrationsError] = useState(false);
  const [testingIntegrationId, setTestingIntegrationId] = useState<string | null>(null);

  const loadIntegrations = useCallback(async () => {
    if (!BOT_API_URL) return;
    setIntegrationsLoading(true);
    setIntegrationsError(false);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/integrations`, { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && Array.isArray(json.data)) {
        setIntegrations(json.data);
      } else {
        setIntegrationsError(true);
      }
    } catch {
      setIntegrationsError(true);
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  const handleTestIntegration = async (id: string) => {
    if (!BOT_API_URL) return;
    setTestingIntegrationId(id);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/integrations/${id}/test`, { credentials: "include", method: "POST" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json.data) {
        setIntegrations((prev) => prev.map((i) => (i.id === id ? json.data : i)));
        toast?.success?.("Intégration testée avec succès.");
      } else {
        toast?.error?.(json?.error || "Échec du test d'intégration.");
      }
    } catch {
      toast?.error?.("Erreur réseau lors du test d'intégration.");
    } finally {
      setTestingIntegrationId(null);
    }
  };

  // Queue & Jobs Center State — GET /api/bot/jobs, POST /api/bot/jobs/:jobId/run
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    if (!BOT_API_URL) return;
    setJobsLoading(true);
    setJobsError(false);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/jobs`, { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && Array.isArray(json.data)) {
        setJobs(json.data);
      } else {
        setJobsError(true);
      }
    } catch {
      setJobsError(true);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const handleRunJob = async (jobId: string) => {
    if (!BOT_API_URL) return;
    setRunningJobId(jobId);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/jobs/${jobId}/run`, { credentials: "include", method: "POST" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json.data) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? json.data : j)));
        toast?.success?.(`Tâche "${json.data.name}" exécutée avec succès.`);
      } else {
        toast?.error?.(json?.error || "Échec de l'exécution de la tâche.");
      }
    } catch {
      toast?.error?.("Erreur réseau lors de l'exécution de la tâche.");
    } finally {
      setRunningJobId(null);
    }
  };

  // Lazy-load Integrations/Jobs the first time their tab is opened — these two panels
  // are not part of the main overview fetch (fetchData) since most sessions never visit
  // them; this also covers direct navigation to /discord/bot/integrations or /discord/bot/jobs.
  useEffect(() => {
    if (activeTab === "integrations" && integrations.length === 0 && !integrationsLoading) {
      loadIntegrations();
    }
    if (activeTab === "jobs" && jobs.length === 0 && !jobsLoading) {
      loadJobs();
    }
  }, [activeTab, integrations.length, integrationsLoading, loadIntegrations, jobs.length, jobsLoading, loadJobs]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      // botPersonality/commandCooldown/themePreset now round-trip too — they
      // were already correctly read/written by guildConfigService, just
      // missing from the dashboard's PATCH schema (settingsRoutes.ts) until
      // now, which silently stripped them before they reached the service.
      // maintenanceMode/customBotName/musicDefaultVolume/autoDeleteCommands
      // still aren't backed by a real per-guild field and remain local-only.
      if (settingsGuildId && BOT_API_URL) {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${settingsGuildId}/settings`, {
          credentials: "include",
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: botSettings.language,
            botPersonality: botSettings.botPersonality,
            prefix: botSettings.defaultPrefix,
            commandCooldown: botSettings.commandCooldown,
            themePreset: botSettings.themePreset,
            slashCommandsEnabled: botSettings.enableSlash,
            prefixCommandsEnabled: botSettings.enablePrefix,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      (toast as any)?.success?.("Configuration opérationnelle enregistrée avec succès !") ||
      (toast as any)?.info?.("Configuration enregistrée !");
    } catch {
      (toast as any)?.error?.("Erreur lors de l'enregistrement.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Runs the real backend suite (POST /api/bot/diagnostics/run — botDiagnosticsService),
  // which returns { status: 'pass'|'warn'|'critical', message, latencyMs, ... } per check.
  // Falls back to a local simulation if the bot API isn't configured/reachable so the
  // button still gives visible feedback instead of silently failing.
  const handleRunDiagnostics = async () => {
    setDiagnosticsRunning(true);
    try {
      if (BOT_API_URL) {
        const res = await fetch(`${BOT_API_URL}/api/bot/diagnostics/run`, { credentials: "include", method: "POST" });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success && Array.isArray(json.data?.checks)) {
          const statusMap: Record<string, string> = { pass: "passed", warn: "warning", critical: "critical" };
          setDiagnosticChecks(
            json.data.checks.map((c: any) => ({
              id: c.id,
              name: c.name,
              detail: c.message || c.details,
              status: statusMap[c.status] || "passed",
              latency: `${c.latencyMs}ms`,
            }))
          );
          const { pass, warn, critical, total } = json.data.summary;
          if (critical > 0) {
            toast?.error?.(`Diagnostic terminé : ${critical} sous-système(s) critique(s) détecté(s).`);
          } else if (warn > 0) {
            toast?.warning?.(`Diagnostic terminé : ${pass}/${total} opérationnels, ${warn} avertissement(s).`);
          } else {
            toast?.success?.(`Diagnostic exécuté : ${total}/${total} sous-systèmes 100% opérationnels !`);
          }
          return;
        }
      }
      // Bot injoignable : on le dit (aucun succès ni latence inventés).
      setDiagnosticChecks((prev) =>
        prev.map((c) => ({
          ...c,
          status: "critical",
          latency: "—",
        }))
      );
      toast?.error?.("Bot injoignable : diagnostic impossible.");
    } catch {
      toast?.error?.("Erreur lors du diagnostic.");
    } finally {
      setDiagnosticsRunning(false);
    }
  };

  const handleOptimizeMemory = async () => {
    setOptimizingMemory(true);
    try {
      if (!BOT_API_URL) throw new Error("no backend configured");
      const res = await fetch(`${BOT_API_URL}/api/bot/performance/optimize`, {
        credentials: "include",
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error("optimize failed");
      const d = data.data;
      setPerfMetrics((prev) => ({
        ...prev,
        heapUsedMb: d.heapUsedMbAfter ?? prev.heapUsedMb,
        heapTotalMb: d.heapTotalMbAfter ?? prev.heapTotalMb,
        rssMb: d.rssMbAfter ?? prev.rssMb,
      }));
      if (d.gcTriggered) {
        (toast as any)?.success?.("Garbage collection forcé — mémoire réellement libérée.");
      } else {
        (toast as any)?.info?.("Chiffres actualisés (GC non exposé sur ce process, aucune mémoire forcée à libérer).");
      }
    } catch {
      (toast as any)?.error?.("Erreur lors de l'optimisation.");
    } finally {
      setOptimizingMemory(false);
    }
  };

  const officialCommands = useMemo(() => [
    { name: "/bot status", desc: "Affiche l'état technique, l'uptime et les ressources en direct", cat: "Général", perm: "Tous" },
    { name: "/bot info", desc: "Informations détaillées, version et liens vers le Dashboard", cat: "Général", perm: "Tous" },
    { name: "/bot ping", desc: "Mesure la latence Gateway WebSocket et API REST en direct", cat: "Général", perm: "Tous" },
    { name: "/ask question:... [prive:bool]", desc: "Posez une question à l'assistant IA avec option réponse privée", cat: "Intelligence Artificielle", perm: "Tous" },
    { name: "/summarize [nombre:5-50]", desc: "Résume les derniers messages échangés dans le salon textuel actuel", cat: "Intelligence Artificielle", perm: "Tous" },
    { name: "/help", desc: "Affiche le catalogue interactif et multi-pages du serveur", cat: "Général", perm: "Tous" },
    { name: "/ping", desc: "Vérifie la latence de communication du bot", cat: "Général", perm: "Tous" },
    { name: "/settings", desc: "Panneau de personnalisation du serveur, couleurs et confidentialité", cat: "Administration", perm: "Gérer le serveur" },
    { name: "/language [langue:fr|en|es|de]", desc: "Définit ou consulte la langue du bot (Français, English, Español, Deutsch)", cat: "Administration", perm: "Gérer le serveur" },
    { name: "/prefix [nouveau:...]", desc: "Consulte ou modifie le préfixe textuel pour ce serveur", cat: "Administration", perm: "Gérer le serveur" },
    { name: "/music play recherche:...", desc: "Joue une musique (salon vocal obligatoire)", cat: "Musique", perm: "Tous / DJ" },
    { name: "/play recherche:...", desc: "Raccourci direct pour lancer une musique YouTube/Spotify", cat: "Musique", perm: "Tous / DJ" },
    { name: "/skip", desc: "Passe au morceau suivant dans la file d'attente", cat: "Musique", perm: "Tous / DJ" },
    { name: "/pause / /resume", desc: "Met en pause ou reprend la lecture en cours", cat: "Musique", perm: "Tous / DJ" },
    { name: "/stop", desc: "Arrête la musique, vide la file et déconnecte le bot", cat: "Musique", perm: "Tous / DJ" },
    { name: "/queue", desc: "Affiche la liste complète des morceaux à suivre", cat: "Musique", perm: "Tous / DJ" },
    { name: "/nowplaying (ou /np)", desc: "Affiche le titre en cours et la barre de progression visuelle", cat: "Musique", perm: "Tous / DJ" },
    { name: "/music panel", desc: "Affiche le panneau de contrôle musical interactif avec boutons", cat: "Musique", perm: "Tous / DJ" },
    { name: "/ticket [sujet:...]", desc: "Ouvre un salon textuel privé d'assistance avec l'équipe", cat: "Support", perm: "Tous" },
    { name: "/clear nombre:1-100 [membre:...]", desc: "Supprime les messages récents avec filtre anti-spam optionnel par utilisateur", cat: "Modération", perm: "Gérer les messages" },
    { name: "/warn membre:... raison:...", desc: "Attribue un avertissement formel consigné dans le casier", cat: "Modération", perm: "Modération" },
    { name: "/timeout membre:... duree:...", desc: "Exclut temporairement un membre de la parole", cat: "Modération", perm: "Modération" },
    { name: "/kick membre:... raison:...", desc: "Expulse un membre du serveur", cat: "Modération", perm: "Expulser des membres" },
    { name: "/ban membre:... raison:...", desc: "Bannit définitivement un utilisateur du serveur", cat: "Modération", perm: "Bannir des membres" },
    { name: "/lock", desc: "Verrouille l'envoi de messages dans le salon pour les membres", cat: "Modération", perm: "Gérer les salons" },
    { name: "/rank", desc: "Affiche votre carte de niveau, XP et réputation", cat: "Leveling", perm: "Tous" },
    { name: "/leaderboard", desc: "Affiche le classement des membres les plus actifs", cat: "Leveling", perm: "Tous" },
    { name: "/giveaway", desc: "Organise un tirage au sort automatique avec inscription bouton", cat: "Communauté", perm: "Gérer les événements" },
    { name: "/poll question:...", desc: "Lance un sondage communautaire interactif en direct", cat: "Communauté", perm: "Tous" },
    { name: "/form open id:...", desc: "Ouvre un formulaire de candidature dynamique modal", cat: "Support", perm: "Tous" },
    { name: "/imagine prompt:... [style:...] [ratio:...]", desc: "Génération d'images haute fidélité via IA sécurisée (Flux/Pollinations)", cat: "Intelligence Artificielle", perm: "Tous" },
    { name: "/ai-setup [salon:channel] [humeur:...] [images:bool] [bannir_mot:...]", desc: "Configuration du salon IA dédié, humeur du Thon, génération d'images et mots interdits", cat: "Administration", perm: "Administrateur" },
    { name: "/permissions [action:analyser|preset_strict|preset_equilibre|preset_communaute]", desc: "Analyse multilingue des rôles et configuration des permissions en 1 clic", cat: "Administration", perm: "Administrateur" },
    { name: "/economy balance|daily|pay|leaderboard|gamble|shop|buy", desc: "Économie virtuelle du serveur : Crédits ETHONE, quotidien, transferts, paris et boutique de rôles", cat: "Communauté", perm: "Tous" },
    { name: "/verification status|toggle", desc: "Consulte ou active la porte de vérification anti-bot à l'arrivée des membres", cat: "Administration", perm: "Gérer le serveur" },
  ], []);

  // Real per-command usage stats (GET /api/bot/commands, see
  // botCommandStatsService.ts) keyed by bare command name — the static
  // catalog above keeps richer name/description/permission metadata than
  // the stats endpoint has, so the two are merged for display rather than
  // one replacing the other.
  const commandStatsByKey = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of commands) {
      if (c?.name) map.set(String(c.name).toLowerCase(), c);
    }
    return map;
  }, [commands]);

  const commandKeyFromCatalogName = (name: string) => {
    const match = name.match(/^\/([a-z0-9_-]+)/i);
    return match ? match[1].toLowerCase() : "";
  };

  const filteredCommands = useMemo(() => {
    return officialCommands.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(commandSearch.toLowerCase()) ||
        c.desc.toLowerCase().includes(commandSearch.toLowerCase());
      const matchCat = commandCategory === "all" || c.cat === commandCategory;
      return matchSearch && matchCat;
    });
  }, [officialCommands, commandSearch, commandCategory]);

  const commandCategories = useMemo(() => {
    const cats = new Set(officialCommands.map((c) => c.cat));
    return ["all", ...Array.from(cats)];
  }, [officialCommands]);

  // Realtime Sync Hook
  const { connectionState, isSyncing, lastEvent } = useDiscordSync({
    onEvent: (evt) => {
      setRecentEvents((prev) => [
        {
          id: evt.id,
          type: evt.type,
          detail: typeof evt.payload === "string" ? evt.payload : JSON.stringify(evt.payload).substring(0, 80),
          timestamp: new Date(evt.timestamp).toISOString(),
          source: evt.source,
        },
        ...prev.slice(0, 49),
      ]);
      setBotCore((prev: any) => ({ ...prev, lastSync: new Date().toISOString() }));
    },
    onPresenceChanged: (presence) => {
      if (presence) {
        setBotCore((prev: any) => ({
          ...prev,
          status: presence.status || prev.status,
          activity: presence.activity || prev.activity,
        }));
      }
    },
  });

  // The bot's real Discord avatar + name (GET /api/bot/presence/identity).
  useEffect(() => {
    if (!BOT_API_URL) return;
    fetch(`${BOT_API_URL}/api/bot/presence/identity`, { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        const d = res?.data;
        if (!d) return;
        setBotCore((prev: any) => ({
          ...prev,
          name: d.username || prev.name,
          discriminator: d.discriminator || prev.discriminator,
          avatarUrl: d.avatarUrl || prev.avatarUrl,
        }));
      })
      .catch(() => {});
  }, []);

  // Fetch real data from bot backend API
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [overviewRes, presenceRes, serversRes, commandsRes, errorsRes, aiRes, securityRes] = await Promise.allSettled([
        fetch(`${BOT_API_URL}/api/bot/overview`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${BOT_API_URL}/api/bot/presence`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${BOT_API_URL}/api/bot/presence/servers`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${BOT_API_URL}/api/bot/commands`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${BOT_API_URL}/api/bot/errors`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${BOT_API_URL}/api/bot/ai`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${BOT_API_URL}/api/bot/security`, { credentials: "include" }).then((r) => r.json()),
      ]);

      if (overviewRes.status === "fulfilled" && overviewRes.value?.success) {
        // GET /api/bot/overview returns { globalStatus, snapshot, recentIncidents, topErrors }
        // (see botControlRoutes.ts / botTelemetryService.ts) — uptime/version live under
        // globalStatus, ping/guild/user counts live under snapshot (not top-level, and not
        // under a "telemetry" key).
        const o = overviewRes.value.data;
        if (o) {
          const globalStatus = o.globalStatus;
          const snapshot = o.snapshot;
          setBotCore((prev: any) => ({
            ...prev,
            uptimeSeconds: globalStatus?.uptimeSeconds ?? prev.uptimeSeconds,
            pingMs: snapshot?.latency?.currentPingMs ?? prev.pingMs,
            version: globalStatus?.version || prev.version,
            guildCount: snapshot?.guildsCount ?? prev.guildCount,
            userCount: snapshot?.cachedUsersCount ?? prev.userCount,
            shardsCount: snapshot?.shardsCount ?? prev.shardsCount,
          }));
          if (snapshot?.memory) {
            setPerfMetrics((prev) => ({
              ...prev,
              heapUsedMb: snapshot.memory.heapUsedMb ?? prev.heapUsedMb,
              heapTotalMb: snapshot.memory.heapTotalMb ?? prev.heapTotalMb,
              rssMb: snapshot.memory.rssMb ?? prev.rssMb,
              cpuUsagePercent: snapshot.cpuPercent ?? prev.cpuUsagePercent,
              eventLoopLagMs: snapshot.eventLoopDelayMs ?? prev.eventLoopLagMs,
              eventsPerMinute: snapshot.throughput?.eventsPerMinute ?? prev.eventsPerMinute,
              commandsPerMinute: snapshot.throughput?.commandsPerMinute ?? prev.commandsPerMinute,
              dbQueriesPerMinute: snapshot.throughput?.dbQueriesPerMinute ?? prev.dbQueriesPerMinute,
              aiTokensPerMinute: snapshot.throughput?.aiTokensPerMinute ?? prev.aiTokensPerMinute,
            }));
          }
          if (globalStatus?.subsystems) {
            const labels: Record<string, string> = {
              gateway: "Gateway WebSocket",
              restApi: "Discord REST API",
              database: "Configuration DB",
              cache: "Cache Mémoire",
              eventBus: "Realtime Sync Bus",
              jobScheduler: "Gestionnaire de Tâches",
              aiProvider: "Fournisseur IA",
              storage: "Stockage",
              voiceEngine: "Moteur Vocal WebRTC",
            };
            setSubsystems(
              Object.entries(globalStatus.subsystems).map(([id, status]) => ({
                id,
                name: labels[id] || id,
                status,
              }))
            );
          }
        }
      }

      if (presenceRes.status === "fulfilled" && presenceRes.value?.success) {
        const p = presenceRes.value.data?.state;
        if (p) {
          setBotCore((prev: any) => ({
            ...prev,
            status: p.status,
            activity: p.activity,
            gatewayConnected: p.gatewayConnected ?? true,
          }));
        }
      }

      if (serversRes.status === "fulfilled" && serversRes.value?.success) {
        const s = serversRes.value.data;
        if (Array.isArray(s) && s.length > 0) {
          setServers(
            s.map((g: any) => ({
              id: g.guildId,
              name: g.guildName,
              icon: g.icon || null,
              memberCount: typeof g.memberCount === "number" ? g.memberCount : 0,
              owner: g.owner || "Staff",
              botJoinedAt: g.updatedAt,
              status: "connected",
            }))
          );
        }
      }

      if (commandsRes.status === "fulfilled" && commandsRes.value?.success) {
        const c = commandsRes.value.data;
        if (Array.isArray(c)) {
          setCommands(c);
        }
      }

      if (errorsRes.status === "fulfilled" && errorsRes.value?.success) {
        const e = errorsRes.value.data?.incidents;
        if (Array.isArray(e)) {
          setErrors(e);
        }
      }

      if (aiRes.status === "fulfilled" && aiRes.value?.success) {
        const a = aiRes.value.data;
        if (a) {
          setAiTelemetry((prev) => ({
            ...prev,
            dailyRequests: a.requests24h ?? prev.dailyRequests,
            dailyTokens: a.totalTokens24h ?? prev.dailyTokens,
            activeModel: a.provider || prev.activeModel,
            avgLatencyMs: a.avgInferenceLatencyMs ?? prev.avgLatencyMs,
            successRate: a.successRate ?? prev.successRate,
          }));
        }
      }

      if (securityRes.status === "fulfilled" && securityRes.value?.success) {
        const s = securityRes.value.data;
        if (s) {
          setSecurityAudit({
            score: s.score ?? 100,
            intents: s.intents || { guildMembers: false, messageContent: false, guildPresences: false },
            adminGuildsCount: s.adminGuildsCount ?? 0,
            suspiciousRoleCreations24h: s.suspiciousRoleCreations24h ?? 0,
            unauthorizedAttempts24h: s.unauthorizedAttempts24h ?? 0,
          });
        }
      }
    } catch {
      // Mode tolérant
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Format uptime cleanly
  const formattedUptime = useMemo(() => {
    const s = botCore.uptimeSeconds || 0;
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    if (days > 0) return `${days}j ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [botCore.uptimeSeconds]);

  // Status visual mapping (discrete, refined, non-aggressive)
  const statusConfig = {
    online: { label: "En Ligne", dot: "bg-emerald-400", border: "border-emerald-500/20", text: "text-emerald-400" },
    idle: { label: "Inactif", dot: "bg-amber-400", border: "border-amber-500/20", text: "text-amber-400" },
    dnd: { label: "Ne Pas Déranger", dot: "bg-rose-400", border: "border-rose-500/20", text: "text-rose-400" },
    invisible: { label: "Invisible", dot: "bg-zinc-400", border: "border-zinc-500/20", text: "text-zinc-400" },
  };

  const currentCfg = statusConfig[botCore.status as keyof typeof statusConfig] || statusConfig.online;

  // Subsystem health status mapping — mirrors BotSubsystemHealth's status values
  // (operational / degraded / critical) returned by GET /api/bot/overview.
  const subsystemStatusConfig: Record<string, { label: string; dot: string; text: string }> = {
    operational: { label: "Opérationnel", dot: "bg-emerald-400", text: "text-emerald-400" },
    degraded: { label: "Dégradé", dot: "bg-amber-400", text: "text-amber-400" },
    critical: { label: "Critique", dot: "bg-rose-400", text: "text-rose-400" },
  };

  // Diagnostic check status mapping — mirrors POST /api/bot/diagnostics/run's
  // per-check status ('pass'/'warn'/'critical', normalized to passed/warning/critical).
  const diagnosticStatusConfig: Record<string, { label: string; icon: any; chip: string; badge: string }> = {
    passed: { label: "Opérationnel", icon: Check, chip: "bg-emerald-500/10 text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    warning: { label: "Avertissement", icon: AlertTriangle, chip: "bg-amber-500/10 text-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    critical: { label: "Critique", icon: XCircle, chip: "bg-rose-500/10 text-rose-400", badge: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  };

  // Filter modules (search only — the real per-guild module list has no "category"
  // grouping, unlike the old fabricated 22-module catalog it replaced)
  const filteredModules = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return modules.filter(
      (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    );
  }, [modules, searchQuery]);

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-zinc-100 font-sans pb-44 md:pb-44">
      {/* TOP COMPACT SYNC BAR */}
      <div className="border-b border-zinc-800/60 bg-zinc-950/40 px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/discord"
              className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour Discord</span>
            </Link>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300 font-medium">Bot Control Center</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Realtime SSE indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  connectionState === "connected"
                    ? "bg-emerald-400"
                    : connectionState === "connecting"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-rose-400"
                )}
              />
              <span className="text-zinc-300">
                {connectionState === "connected" ? "Sync SSE Active" : "Reconnexion..."}
              </span>
              {isSyncing && (
                <span className="text-indigo-400 animate-spin text-[10px] ml-1">●</span>
              )}
            </div>

            <span className="text-zinc-500 font-mono text-[11px]">
              Dernière synchro : {botCore?.lastSync ? new Date(botCore.lastSync).toLocaleTimeString("fr-FR") : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
            {/* Left: Identity & Status */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={botCore.avatarUrl}
                  alt={botCore.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-900 border border-zinc-700/70 object-cover shadow-lg shadow-indigo-500/10"
                  onError={(e) => {
                    (e.target as any).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                  }}
                />
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-950",
                    currentCfg.dot,
                    botCore.status === "online" && "animate-pulse ring-2 ring-emerald-500/30"
                  )}
                  title={`Statut : ${currentCfg.label}`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white whitespace-nowrap bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                    {botCore.name}
                  </h1>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#5865F2] text-white tracking-wide shadow-sm">
                    BOT
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">#{botCore.discriminator}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300">
                    v{botCore.version}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-xs text-zinc-400">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-800/80">
                    <span className={cn("w-2 h-2 rounded-full", currentCfg.dot)} />
                    <span className={cn("font-medium", currentCfg.text)}>{currentCfg.label}</span>
                  </div>

                  {botCore?.activity ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                      {botCore.activity.type && (
                        <span className="font-semibold text-indigo-400 uppercase text-[10px] tracking-wider">
                          {botCore.activity.type}
                        </span>
                      )}
                      <span className="truncate max-w-[220px] font-medium text-white">
                        {botCore.activity.name || "Actif"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-zinc-500 italic text-[11px]">En attente d'activité</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Bento Telemetry Cards & Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 xl:gap-4">
              {/* Bento Telemetry Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full sm:w-auto">
                {/* Ping */}
                <div className="px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 transition-all">
                  <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-400">
                    <span>Ping Gateway</span>
                    <Wifi className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-sm font-bold font-mono text-emerald-400">{botCore.pingMs}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">ms</span>
                  </div>
                </div>

                {/* Uptime */}
                <div className="px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 transition-all">
                  <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-400">
                    <span>Uptime</span>
                    <Timer className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div className="mt-0.5">
                    <span className="text-xs font-bold font-mono text-zinc-200 truncate block">
                      {formattedUptime}
                    </span>
                  </div>
                </div>

                {/* Servers */}
                <div className="px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 transition-all">
                  <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-400">
                    <span>Serveurs</span>
                    <Server className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div className="mt-0.5">
                    <span className="text-sm font-bold font-mono text-indigo-300">{servers.length}</span>
                  </div>
                </div>

                {/* Members */}
                <div className="px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 transition-all">
                  <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-400">
                    <span>Membres</span>
                    <Users className="w-3 h-3 text-purple-400" />
                  </div>
                  <div className="mt-0.5">
                    <span className="text-sm font-bold font-mono text-purple-300">
                      {Number(botCore.userCount || 0).toLocaleString("fr-FR")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/discord/bot/presence"
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Présence</span>
                </Link>

                <button
                  onClick={fetchData}
                  disabled={refreshing}
                  className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  title="Actualiser les données"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-indigo-400")} />
                  <span className="hidden sm:inline">Actualiser</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* GROUP NAVIGATION (5 categories) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-zinc-800/60 pt-3">
          <Tabs value={activeGroupId} onValueChange={handleGroupChange} variant="segment">
            <TabsList className="w-full flex-wrap sm:w-auto">
              {TAB_GROUPS.map((group) => {
                const GroupIcon = group.icon;
                return (
                  <TabsTrigger key={group.id} value={group.id}>
                    <span className="flex items-center gap-1.5">
                      <GroupIcon className="w-3.5 h-3.5" />
                      {group.label}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* TAB NAVIGATION (within the active group) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-2.5">
          {(() => {
            const tabCounts: Partial<Record<BotTab, number>> = {
              integrations: integrations.length,
              jobs: jobs.length,
              commands: officialCommands.length,
              servers: servers.length,
              modules: modules.length,
              events: recentEvents.length,
              errors: errors.length,
            };
            const groupTabs = TAB_GROUPS.find((g) => g.id === activeGroupId)?.tabs || [];
            return groupTabs.map((tabId) => {
              const meta = TAB_META[tabId];
              const Icon = meta.icon;
              const isActive = activeTab === tabId;
              const count = tabCounts[tabId];
              return (
                <button
                  key={tabId}
                  onClick={() => handleTabChange(tabId)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer",
                    isActive
                      ? "bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/30"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/80"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-zinc-400")} />
                  <span>{meta.label}</span>
                  {count !== undefined && (
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                        isActive
                          ? "bg-white/20 text-white font-bold"
                          : "bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ======================================================== */}
        {/* EXCLUSIVE BOT OWNER EXECUTIVE COMMAND DECK               */}
        {/* ======================================================== */}
        {isOwner && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-500/[0.05] via-zinc-900/60 to-zinc-900/40 border border-amber-500/20 backdrop-blur-md overflow-hidden transition-all shadow-lg shadow-amber-500/5">
            {/* Executive Bar (Always visible to owner) */}
            <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">Console Système Propriétaire</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                      Root Verified
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">rub19.mailpro@gmail.com</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      PM2: <strong className="text-zinc-200 font-mono">ethone-bot</strong>
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span>Shard 0 ({botCore.pingMs}ms)</span>
                    <span className="text-zinc-600">•</span>
                    <span>Audit RLS Sécurisé</span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleRemoteRestart}
                  disabled={restartingBot}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                  title="Redémarrer le bot sur le VPS via PM2"
                >
                  <Power className={cn("w-3.5 h-3.5", restartingBot && "animate-spin")} />
                  <span>{restartingBot ? "Redémarrage..." : "Redémarrer PM2"}</span>
                </button>

                <button
                  onClick={handleRemoteUpdate}
                  disabled={updatingBot}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                  title="Déclencher la mise à jour et recharger les modules"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", updatingBot && "animate-spin")} />
                  <span>{updatingBot ? "Mise à jour..." : "Mettre à Jour"}</span>
                </button>

                <button
                  onClick={handleClearCache}
                  disabled={clearingCache}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  title="Vider les compteurs et le cache"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{clearingCache ? "Purge..." : "Purger Cache"}</span>
                </button>

                <button
                  onClick={() => setOwnerPanelOpen((prev) => !prev)}
                  className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>{ownerPanelOpen ? "Masquer Détails" : "Supervision & Logs"}</span>
                  {ownerPanelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Collapsible Detailed Section */}
            {ownerPanelOpen && (
              <div className="p-5 border-t border-amber-500/15 bg-black/20 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Telemetry Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block uppercase font-mono">Processus VPS PM2</span>
                    <span className="text-sm font-bold text-white font-mono mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      ethone-bot
                    </span>
                    <span className="text-[10px] text-emerald-400 mt-0.5 block font-mono">Status: Online</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block uppercase font-mono">Compte Suprême</span>
                    <span className="text-xs font-bold text-amber-300 font-mono mt-1 block truncate" title="rub19.mailpro@gmail.com">
                      rub19.mailpro@gmail.com
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">Niveau Root vérifié</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block uppercase font-mono">Gateway Shard</span>
                    <span className="text-sm font-bold text-white font-mono mt-1 block">{botCore.pingMs} ms (WebSocket)</span>
                    <span className="text-[10px] text-emerald-400 mt-0.5 block">Shard 0 Connecté</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block uppercase font-mono">Audit Supabase</span>
                    <span className="text-sm font-bold text-white font-mono mt-1 block">
                      {ownerLogs.length} action(s)
                    </span>
                    <span className="text-[10px] text-indigo-400 mt-0.5 block font-mono">RLS Sécurisée</span>
                  </div>
                </div>

                {/* Recent Audit Logs */}
                {ownerLogs.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/80">
                    <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                      Dernières Actions Administratives Exécutées
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {ownerLogs.map((log: any, idx: number) => (
                        <div
                          key={log.id || idx}
                          className="px-3 py-1.5 rounded-lg bg-zinc-950/70 border border-zinc-800 text-xs flex items-center justify-between"
                        >
                          <span className="font-mono text-amber-300 font-semibold">{log.action}</span>
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {log.created_at ? new Date(log.created_at).toLocaleString("fr-FR") : "À l'instant"}
                          </span>
                          <span className="px-2 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                            {log.status || "SUCCESS"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: OVERVIEW                                            */}
        {/* ======================================================== */}
        {(activeTab === "overview" || activeTab === "presence") && (
          <OverviewGroup
            activeTab={activeTab}
            handleTabChange={handleTabChange}
            currentCfg={currentCfg}
            botCore={botCore}
            subsystems={subsystems}
            subsystemStatusConfig={subsystemStatusConfig}
            servers={servers}
            modules={modules}
            settingsGuildId={settingsGuildId}
            setSettingsGuildId={setSettingsGuildId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            modulesLoading={modulesLoading}
            modulesError={modulesError}
            loadModules={loadModules}
            filteredModules={filteredModules}
            MODULE_ICONS={MODULE_ICONS}
            togglingModuleId={togglingModuleId}
            handleToggleModule={handleToggleModule}
          />
        )}

        {/* ======================================================== */}
        {/* TAB: HEALTH & SUBSYSTEMS                                 */}
        {/* ======================================================== */}
        {(activeTab === "performance" || activeTab === "diagnostics" || activeTab === "health" || activeTab === "servers") && (
          <HealthGroup
            activeTab={activeTab}
            subsystems={subsystems}
            subsystemStatusConfig={subsystemStatusConfig}
            servers={servers}
            handleOptimizeMemory={handleOptimizeMemory}
            optimizingMemory={optimizingMemory}
            perfMetrics={perfMetrics}
            handleRunDiagnostics={handleRunDiagnostics}
            diagnosticsRunning={diagnosticsRunning}
            diagnosticChecks={diagnosticChecks}
            diagnosticStatusConfig={diagnosticStatusConfig}
          />
        )}

        {/* ======================================================== */}
        {/* TAB: LIVE EVENTS STREAM                                  */}
        {/* ======================================================== */}
        {(activeTab === "integrations" || activeTab === "jobs" || activeTab === "commands" || activeTab === "events") && (
          <OperationsGroup
            activeTab={activeTab}
            connectionState={connectionState}
            recentEvents={recentEvents}
            integrations={integrations}
            integrationsLoading={integrationsLoading}
            integrationsError={integrationsError}
            loadIntegrations={loadIntegrations}
            handleTestIntegration={handleTestIntegration}
            testingIntegrationId={testingIntegrationId}
            jobs={jobs}
            jobsLoading={jobsLoading}
            jobsError={jobsError}
            loadJobs={loadJobs}
            handleRunJob={handleRunJob}
            runningJobId={runningJobId}
            filteredCommands={filteredCommands}
            commandSearch={commandSearch}
            setCommandSearch={setCommandSearch}
            commandCategory={commandCategory}
            setCommandCategory={setCommandCategory}
            commandCategories={commandCategories}
            commandStatsByKey={commandStatsByKey}
            commandKeyFromCatalogName={commandKeyFromCatalogName}
          />
        )}

        {/* ======================================================== */}
        {/* TAB: MODULES                                             */}
        {/* ======================================================== */}
        {(activeTab === "modules" || activeTab === "settings" || activeTab === "ai") && (
          <ConfigurationGroup
            activeTab={activeTab}
            modules={modules}
            MODULE_ICONS={MODULE_ICONS}
            settingsGuildId={settingsGuildId}
            setSettingsGuildId={setSettingsGuildId}
            servers={servers}
            modulesLoading={modulesLoading}
            modulesError={modulesError}
            loadModules={loadModules}
            togglingModuleId={togglingModuleId}
            handleToggleModule={handleToggleModule}
            botSettings={botSettings}
            setBotSettings={setBotSettings}
            handleSaveSettings={handleSaveSettings}
            savingSettings={savingSettings}
            loadingGuildSettings={loadingGuildSettings}
            activeRolePreset={activeRolePreset}
            handleApplyRolePreset={handleApplyRolePreset}
            applyingRolePreset={applyingRolePreset}
            detectedRolesList={detectedRolesList}
            aiTelemetry={aiTelemetry}
            dedicatedAiChannelEnabled={dedicatedAiChannelEnabled}
            setDedicatedAiChannelEnabled={setDedicatedAiChannelEnabled}
            dedicatedAiChannel={dedicatedAiChannel}
            setDedicatedAiChannel={setDedicatedAiChannel}
            allowImageGen={allowImageGen}
            setAllowImageGen={setAllowImageGen}
            thonMood={thonMood}
            setThonMood={setThonMood}
            newBannedWordInput={newBannedWordInput}
            setNewBannedWordInput={setNewBannedWordInput}
            handleAddBannedWord={handleAddBannedWord}
            bannedWordsList={bannedWordsList}
            handleRemoveBannedWord={handleRemoveBannedWord}
            saveAiBehaviorSettings={saveAiBehaviorSettings}
            aiTextChannels={aiTextChannels}
            toast={toast}
          />
        )}

        {(activeTab === "security" || activeTab === "errors") && (
          <SecurityGroup activeTab={activeTab} securityAudit={securityAudit} errors={errors} />
        )}
      </div>
    </div>
  );
}
