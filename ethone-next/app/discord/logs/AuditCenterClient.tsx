"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Search,
  ShieldAlert,
  RefreshCw,
  Download,
  Clock,
  User,
  Hash,
  Layers,
  ArrowLeft,
  X,
  CheckCircle2,
  Zap,
  Sliders,
  Eye,
  Activity,
  Server,
  Pause,
  AlertOctagon,
  Scale,
  Bot,
} from "@/components/icons/ph";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { GuildSelector } from "@/components/GuildSelector";
import { useToast } from "@/components/ToastProvider";
import { useDiscordSync } from "@/lib/useDiscordSync";
import { cn } from "@/lib/utils";
import { formatApiError } from "@/lib/format-error";
import Select from "@/components/ui/Select";

const API_BASE = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

function emptyAuditOverview(): AuditOverview {
  // Aucune statistique inventée : tout à zéro tant que le bot ne répond pas.
  return {
    eventsToday: 0,
    securityToday: 0,
    moderationToday: 0,
    automodToday: 0,
    criticalToday: 0,
    totalEvents: 0,
    byModule: {},
    bySeverity: {},
    criticalEvents: [],
  } as unknown as AuditOverview;
}

function noAuditEvents(_guildId: string): AuditEvent[] {
  return [];
}

export type AuditSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AuditModule =
  | "MEMBERS"
  | "MESSAGES"
  | "ROLES"
  | "CHANNELS"
  | "SERVER"
  | "VOICE"
  | "WEBHOOKS"
  | "BOTS"
  | "MODERATION"
  | "AUTOMOD"
  | "SECURITY"
  | "SYSTEM";

export interface AuditActor {
  id: string;
  tag: string;
  username?: string;
  avatar?: string | null;
  isBot?: boolean;
}

export interface AuditTarget {
  id: string;
  type: string;
  name: string;
  tag?: string;
  avatar?: string | null;
}

export interface AuditChannel {
  id: string;
  name: string;
  type?: string;
}

export interface AuditEvent {
  id: string;
  guildId: string;
  module: AuditModule;
  type: string;
  severity: AuditSeverity;
  actor: AuditActor;
  target?: AuditTarget;
  channel?: AuditChannel;
  reason?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  diff?: { field: string; before: any; after: any }[];
  metadata?: Record<string, any>;
  caseId?: number | string;
  incidentId?: string;
  correlationId?: string;
  timestamp: string;
}

export interface AuditOverview {
  eventsToday: number;
  securityToday: number;
  moderationToday: number;
  automodToday: number;
  criticalToday: number;
  totalEvents: number;
  byModule: Record<string, number>;
  bySeverity: Record<string, number>;
  criticalEvents: AuditEvent[];
}

export interface InvestigationResult {
  targetEvent: AuditEvent;
  timeWindowStart: string;
  timeWindowEnd: string;
  relatedEvents: AuditEvent[];
  causalityChain: {
    step: number;
    eventId: string;
    timestamp: string;
    module: AuditModule;
    severity: AuditSeverity;
    summary: string;
    relation: "PARENT" | "TRIGGER" | "SANCTION" | "SAME_ACTOR" | "SAME_TARGET" | "BURST";
  }[];
  diffInspection?: {
    field: string;
    beforeDisplay: string;
    afterDisplay: string;
  }[];
}


const LOG_CATEGORIES: Array<{ key: string; label: string; icon: string; defaultName: string }> = [
  { key: "MODERATION", label: "Modération", icon: "👮", defaultName: "mod" },
  { key: "SECURITY", label: "Sécurité", icon: "🛡️", defaultName: "security" },
  { key: "RAID", label: "Anti-raid", icon: "🚨", defaultName: "anti-raid" },
  { key: "AUTOMOD", label: "AutoMod", icon: "⚡", defaultName: "automod" },
  { key: "VOICE", label: "Vocal", icon: "🔊", defaultName: "vocals" },
  { key: "MEMBERS", label: "Membres", icon: "👤", defaultName: "members" },
  { key: "MESSAGES", label: "Messages", icon: "💬", defaultName: "messages" },
  { key: "ROLES", label: "Rôles", icon: "🎭", defaultName: "roles" },
  { key: "CHANNELS", label: "Salons", icon: "📁", defaultName: "channels" },
  { key: "SERVER", label: "Serveur", icon: "🌐", defaultName: "server" },
  { key: "WEBHOOKS", label: "Webhooks", icon: "🔗", defaultName: "webhooks" },
  { key: "BOTS", label: "Bots", icon: "🤖", defaultName: "bots" },
  { key: "SYSTEM", label: "Système", icon: "⚙️", defaultName: "system" },
  { key: "EMOJIS", label: "Emojis", icon: "😀", defaultName: "emojis" },
  { key: "THREADS", label: "Fils", icon: "🧵", defaultName: "threads" },
  { key: "INVITES", label: "Invitations", icon: "📨", defaultName: "invites" },
];

import ChannelPicker from "@/components/discord/ChannelPicker";
import RolePicker from "@/components/discord/RolePicker";

/** Sélecteur universel de salon (liste déroulante ou saisie directe de l'ID). */
function ChannelSelect({
  value,
  onChange,
  channels,
  emptyLabel,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  channels: Array<{ id: string; name: string }>;
  emptyLabel: string;
  className?: string;
}) {
  return (
    <ChannelPicker
      value={value}
      onChange={onChange}
      channels={channels}
      emptyLabel={emptyLabel}
      inputClassName={className}
      size="sm"
    />
  );
}

export function AuditCenterClient() {
  const searchParams = useSearchParams();
  const guildParam = searchParams.get("guildId");
  const { profile } = useDiscordOAuth();
  const { success, error: showError } = useToast();

  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);
  const [activeTab, setActiveTab] = useState<"stream" | "critical" | "analytics" | "routing">("stream");

  // Données
  const [overview, setOverview] = useState<AuditOverview | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("24h");
  const [liveStreaming, setLiveStreaming] = useState(true);

  // Investigation Modal
  const [investigatingEventId, setInvestigatingEventId] = useState<string | null>(null);
  const [investigationData, setInvestigationData] = useState<InvestigationResult | null>(null);
  const [loadingInvestigation, setLoadingInvestigation] = useState(false);

  // Export Modal
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  // Configuration Routing
  const [configRouting, setConfigRouting] = useState({
    generalChannelId: "",
    generalThreshold: "ALL",
    moderationChannelId: "",
    moderationThreshold: "IMPORTANT",
    securityChannelId: "",
    securityThreshold: "IMPORTANT",
    automodChannelId: "",
    automodThreshold: "IMPORTANT",
    raidChannelId: "",
    raidThreshold: "CRITICAL_ONLY",
    retentionDays: 90,
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [textChannels, setTextChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [webhookNames, setWebhookNames] = useState<Record<string, string>>({});
  const [categoryChannels, setCategoryChannels] = useState<Record<string, string>>({});
  const [testingCategory, setTestingCategory] = useState<string | null>(null);
  const [useWebhooks, setUseWebhooks] = useState(true);
  const [ignoreChannelIds, setIgnoreChannelIds] = useState<string[]>([]);
  const [ignoreRoleIds, setIgnoreRoleIds] = useState<string[]>([]);
  const [ignoreUserIds, setIgnoreUserIds] = useState<string[]>([]);
  const [ignoreUserInput, setIgnoreUserInput] = useState("");

  // Résolution du serveur et détection bot
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

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (guildParam && appliedQueryGuild.current !== guildParam) {
      const match = manageableGuilds.find((g) => g.id === guildParam);
      if (match) {
        appliedQueryGuild.current = guildParam;
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
  }, [manageableGuilds, guildParam, selectedGuild, botGuildIds]);

  const isBotPresent = Boolean(selectedGuild?.id && botGuildIds && botGuildIds.includes(selectedGuild.id));

  // Charger les métriques d'aperçu
  const fetchOverview = useCallback(async () => {
    if (!selectedGuild || !isBotPresent) {
      setOverview(emptyAuditOverview());
      return;
    }
    if (!API_BASE) {
      setOverview(emptyAuditOverview());
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/logs/overview`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      } else {
        setOverview(emptyAuditOverview());
      }
    } catch {
      setOverview(emptyAuditOverview());
    }
  }, [selectedGuild, isBotPresent]);

  // Charger les événements filtrés
  const fetchEvents = useCallback(async () => {
    if (!selectedGuild || !isBotPresent) {
      const demo = selectedGuild ? noAuditEvents(selectedGuild.id) : [];
      setEvents(demo);
      setTotalCount(demo.length);
      setLoadingEvents(false);
      return;
    }
    setLoadingEvents(true);
    if (!API_BASE) {
      const demo = noAuditEvents(selectedGuild.id);
      setEvents(demo);
      setTotalCount(demo.length);
      setLoadingEvents(false);
      return;
    }
    try {
      const query = new URLSearchParams();
      if (selectedModule !== "ALL") query.set("module", selectedModule);
      if (selectedSeverity !== "ALL") query.set("severity", selectedSeverity);
      if (selectedPeriod !== "all") query.set("period", selectedPeriod);
      if (searchQuery.trim()) query.set("search", searchQuery.trim());
      query.set("limit", "100");

      const res = await fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/logs/events?${query.toString()}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTotalCount(data.total || 0);
      } else {
        const demo = noAuditEvents(selectedGuild.id);
        setEvents(demo);
        setTotalCount(demo.length);
      }
    } catch {
      const demo = noAuditEvents(selectedGuild.id);
      setEvents(demo);
      setTotalCount(demo.length);
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedGuild, isBotPresent, selectedModule, selectedSeverity, selectedPeriod, searchQuery]);

  // Charger la configuration de routage
  const fetchConfig = useCallback(async () => {
    if (!selectedGuild || !isBotPresent || !API_BASE) return;
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/logs/config`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfigRouting({
            generalChannelId: data.config.routing?.generalChannelId || "",
            generalThreshold: data.config.routing?.generalThreshold || "ALL",
            moderationChannelId: data.config.routing?.moderationChannelId || "",
            moderationThreshold: data.config.routing?.moderationThreshold || "IMPORTANT",
            securityChannelId: data.config.routing?.securityChannelId || "",
            securityThreshold: data.config.routing?.securityThreshold || "IMPORTANT",
            automodChannelId: data.config.routing?.automodChannelId || "",
            automodThreshold: data.config.routing?.automodThreshold || "IMPORTANT",
            raidChannelId: data.config.routing?.raidChannelId || "",
            raidThreshold: data.config.routing?.raidThreshold || "CRITICAL_ONLY",
            retentionDays: data.config.retentionDays ?? 90,
          });
          setWebhookNames(data.config.webhookNames || {});
          setCategoryChannels(
            Object.fromEntries(Object.entries(data.config.categoryChannels || {}).map(([k, v]) => [k, String(v || "")]))
          );
          setUseWebhooks(data.config.useWebhooks ?? true);
          setIgnoreChannelIds(data.config.ignoreChannelIds || []);
          setIgnoreRoleIds(data.config.ignoreRoleIds || []);
          setIgnoreUserIds(data.config.ignoreUserIds || []);
        }
      }
      // Vrais salons du serveur pour les listes déroulantes.
      const chRes = await fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/server/channels`, { credentials: "include" });
      if (chRes.ok) {
        const chData = await chRes.json();
        const all = [...(chData.categories || []).flatMap((c: { channels?: unknown[] }) => c.channels || []), ...(chData.orphanChannels || [])] as Array<{ id: string; name: string; type: number }>;
        setTextChannels(all.filter((c) => c.type === 0 || c.type === 5).map(({ id, name }) => ({ id, name })));
      }
    } catch {}
  }, [selectedGuild, isBotPresent]);

  // Reflète en direct les changements faits via la commande Discord /logs
  // (ou un autre onglet dashboard) sans attendre un rechargement manuel — même
  // mapping vers la forme locale aplatie que fetchConfig ci-dessus.
  useDiscordSync({
    guildId: selectedGuild?.id,
    onConfigUpdated: (module, updatedConfig: any) => {
      if (module !== "logs" || !updatedConfig) return;
      setConfigRouting({
        generalChannelId: updatedConfig.routing?.generalChannelId || "",
        generalThreshold: updatedConfig.routing?.generalThreshold || "ALL",
        moderationChannelId: updatedConfig.routing?.moderationChannelId || "",
        moderationThreshold: updatedConfig.routing?.moderationThreshold || "IMPORTANT",
        securityChannelId: updatedConfig.routing?.securityChannelId || "",
        securityThreshold: updatedConfig.routing?.securityThreshold || "IMPORTANT",
        automodChannelId: updatedConfig.routing?.automodChannelId || "",
        automodThreshold: updatedConfig.routing?.automodThreshold || "IMPORTANT",
        raidChannelId: updatedConfig.routing?.raidChannelId || "",
        raidThreshold: updatedConfig.routing?.raidThreshold || "CRITICAL_ONLY",
        retentionDays: updatedConfig.retentionDays ?? 90,
      });
      setWebhookNames(updatedConfig.webhookNames || {});
      setCategoryChannels(
        Object.fromEntries(Object.entries(updatedConfig.categoryChannels || {}).map(([k, v]) => [k, String(v || "")]))
      );
      setUseWebhooks(updatedConfig.useWebhooks ?? true);
      setIgnoreChannelIds(updatedConfig.ignoreChannelIds || []);
      setIgnoreRoleIds(updatedConfig.ignoreRoleIds || []);
      setIgnoreUserIds(updatedConfig.ignoreUserIds || []);
    },
  });

  // Chargement initial
  useEffect(() => {
    if (selectedGuild) {
      fetchOverview();
      fetchEvents();
      fetchConfig();
    }
  }, [selectedGuild, fetchOverview, fetchEvents, fetchConfig]);

  // Auto-refresh en direct (toutes les 4 secondes si activé)
  useEffect(() => {
    if (!liveStreaming || !selectedGuild || !API_BASE) return;
    const interval = setInterval(() => {
      fetchOverview();
      fetchEvents();
    }, 4000);
    return () => clearInterval(interval);
  }, [liveStreaming, selectedGuild, fetchOverview, fetchEvents]);

  // Déclencher une enquête sur un événement
  const handleInvestigate = async (eventId: string) => {
    if (!selectedGuild) return;
    setInvestigatingEventId(eventId);
    setLoadingInvestigation(true);
    if (!API_BASE) {
      showError("Bot injoignable : enquête indisponible.");
      setLoadingInvestigation(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/logs/events/${eventId}/investigate`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setInvestigationData(data);
      } else {
        showError("Impossible de charger les données d'investigation.");
      }
    } catch {
      showError("Erreur lors de la connexion au serveur d'audit.");
    } finally {
      setLoadingInvestigation(false);
    }
  };

  // Envoie un message de test pour une catégorie (enregistre d'abord pour tester la config affichée)
  const handleTestCategory = async (key: string) => {
    if (!selectedGuild) return;
    if (!API_BASE) {
      showError("Bot injoignable : aucun test possible.");
      return;
    }
    setTestingCategory(key);
    try {
      await handleSaveConfig();
      const res = await fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/logs/config/test`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: key }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        success(`Message de test envoyé par « ${data.name} »`, data.channelId ? "Regarde le salon choisi." : "");
      } else {
        showError(formatApiError(data?.error, "Le test a échoué."));
      }
    } catch (err: any) {
      showError(formatApiError(err, "Erreur réseau pendant le test."));
    } finally {
      setTestingCategory(null);
    }
  };

  // Sauvegarder la configuration de routage
  const handleSaveConfig = async () => {
    if (!selectedGuild) return;
    if (!API_BASE) {
      showError("Bot injoignable : la configuration n'a pas été enregistrée.");
      return;
    }
    setSavingConfig(true);
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/logs/config`, {
        credentials: "include",
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routing: {
            generalChannelId: configRouting.generalChannelId || null,
            generalThreshold: configRouting.generalThreshold,
            moderationChannelId: configRouting.moderationChannelId || null,
            moderationThreshold: configRouting.moderationThreshold,
            securityChannelId: configRouting.securityChannelId || null,
            securityThreshold: configRouting.securityThreshold,
            automodChannelId: configRouting.automodChannelId || null,
            automodThreshold: configRouting.automodThreshold,
            raidChannelId: configRouting.raidChannelId || null,
            raidThreshold: configRouting.raidThreshold,
          },
          retentionDays: configRouting.retentionDays,
          // Chaîne vide = retire le nom personnalisé / le salon dédié (le bot revient au défaut).
          webhookNames: Object.fromEntries(LOG_CATEGORIES.map((c) => [c.key, (webhookNames[c.key] || "").trim()])),
          categoryChannels: Object.fromEntries(LOG_CATEGORIES.map((c) => [c.key, categoryChannels[c.key] || null])),
          useWebhooks,
          ignoreChannelIds,
          ignoreRoleIds,
          ignoreUserIds,
        }),
      });
      if (res.ok) {
        success("Configuration des logs et routage Discord mise à jour !");
        fetchOverview();
      } else {
        const data = await res.json().catch(() => null);
        showError(formatApiError(data?.error, "Échec de la sauvegarde."));
      }
    } catch (err: any) {
      showError(formatApiError(err, "Erreur réseau."));
    } finally {
      setSavingConfig(false);
    }
  };

  // Télécharger l'export CSV / JSON
  const handleDownloadExport = () => {
    if (!selectedGuild) return;
    if (!API_BASE) {
      showError("Bot injoignable : aucun export disponible.");
      return;
    }
    const query = new URLSearchParams();
    query.set("format", exportFormat);
    if (selectedModule !== "ALL") query.set("module", selectedModule);
    if (selectedSeverity !== "ALL") query.set("severity", selectedSeverity);
    if (selectedPeriod !== "all") query.set("period", selectedPeriod);
    if (searchQuery.trim()) query.set("search", searchQuery.trim());

    const url = `${API_BASE}/api/guilds/${selectedGuild.id}/logs/export?${query.toString()}`;
    window.open(url, "_blank");
    setExportModalOpen(false);
    success(`Export ${exportFormat.toUpperCase()} généré.`);
  };

  // Couleurs et badges
  const getSeverityBadge = (severity: AuditSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "HIGH":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "MEDIUM":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "LOW":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "INFO":
      default:
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    }
  };

  const getModuleIcon = (module: AuditModule) => {
    switch (module) {
      case "SECURITY":
        return <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />;
      case "AUTOMOD":
        return <Zap className="h-3.5 w-3.5 text-amber-400" />;
      case "MODERATION":
        return <Scale className="h-3.5 w-3.5 text-orange-400" />;
      case "MEMBERS":
        return <User className="h-3.5 w-3.5 text-blue-400" />;
      case "MESSAGES":
        return <FileText className="h-3.5 w-3.5 text-emerald-400" />;
      case "ROLES":
        return <Sliders className="h-3.5 w-3.5 text-emerald-400" />;
      case "CHANNELS":
        return <Hash className="h-3.5 w-3.5 text-cyan-400" />;
      case "VOICE":
        return <Activity className="h-3.5 w-3.5 text-emerald-400" />;
      case "SERVER":
      case "SYSTEM":
      default:
        return <Server className="h-3.5 w-3.5 text-[var(--text-muted)]" />;
    }
  };

  return (
    <div className="pb-8 text-[var(--text-primary)] selection:bg-emerald-500 selection:text-white">
      {/* HEADER TOP BAR */}
      <div className="sticky top-0 z-40 border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/80 ">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href={selectedGuild ? `/discord?guildId=${selectedGuild.id}` : "/discord"}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--inset-radius)] bg-emerald-500 text-white icon-pop">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-tight text-[var(--text-primary)] sm:text-base">
                    Audit Center
                  </h1>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    Traçabilité Absolue
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {selectedGuild ? selectedGuild.name : "Sélectionnez un serveur"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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

            {/* Bouton Live Pause / Play */}
            <button
              type="button"
              onClick={() => setLiveStreaming(!liveStreaming)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                liveStreaming
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-sm"
                  : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {liveStreaming ? (
                <>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Flux Live</span>
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3" />
                  <span>En pause</span>
                </>
              )}
            </button>

            {/* Bouton Export */}
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 space-y-6">
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
                  Invitez le bot ETHONE sur <strong>{selectedGuild.name}</strong> pour activer la traçabilité des logs et de l'audit en direct.
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

        {/* KPI METRICS OVERVIEW BANNER */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4 ">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Événements (Auj.)</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text-primary)] font-mono">
              {overview?.eventsToday ?? 0}
            </p>
            <span className="text-xs text-[var(--text-muted)]">
              Total indexé : {overview?.totalEvents ?? 0}
            </span>
          </div>

          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4 ">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Sécurité & Raids</span>
              <ShieldAlert className="h-4 w-4 text-rose-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-rose-400 font-mono">
              {overview?.securityToday ?? 0}
            </p>
            <span className="text-xs text-[var(--text-muted)]">Menaces & verrouillages</span>
          </div>

          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4 ">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Modération</span>
              <Scale className="h-4 w-4 text-orange-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-orange-400 font-mono">
              {overview?.moderationToday ?? 0}
            </p>
            <span className="text-xs text-[var(--text-muted)]">Cases générées</span>
          </div>

          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4 ">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">AutoMod</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-amber-400 font-mono">
              {overview?.automodToday ?? 0}
            </p>
            <span className="text-xs text-[var(--text-muted)]">Détections intelligentes</span>
          </div>

          <div
            className={cn(
              "col-span-2 sm:col-span-1 rounded-2xl border p-4 transition-all",
              (overview?.criticalToday ?? 0) > 0
                ? "border-rose-500/40 bg-[var(--surface-raised)]/40 shadow-sm"
                : "border-[var(--panel-border)] bg-[var(--surface-raised)]/60"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Alertes Critiques</span>
              <AlertOctagon
                className={cn(
                  "h-4 w-4",
                  (overview?.criticalToday ?? 0) > 0 ? "text-rose-400" : "text-[var(--text-muted)]"
                )}
              />
            </div>
            <p
              className={cn(
                "mt-2 text-2xl font-extrabold tracking-tight font-mono",
                (overview?.criticalToday ?? 0) > 0 ? "text-rose-400" : "text-[var(--text-muted)]"
              )}
            >
              {overview?.criticalToday ?? 0}
            </p>
            <span className="text-xs text-[var(--text-muted)]">Gravité CRITICAL</span>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--panel-border)] pb-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("stream")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 transition-all cursor-pointer shrink-0",
              activeTab === "stream"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 hover:text-[var(--text-primary)]"
            )}
          >
            <Layers className="h-4 w-4" />
            <span>Flux d&apos;Événements & Filtres ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("critical")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 transition-all cursor-pointer shrink-0",
              activeTab === "critical"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 hover:text-[var(--text-primary)]"
            )}
          >
            <AlertOctagon className="h-4 w-4 text-rose-300" />
            <span>Zone Événements Critiques ({overview?.criticalEvents?.length ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 transition-all cursor-pointer shrink-0",
              activeTab === "analytics"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 hover:text-[var(--text-primary)]"
            )}
          >
            <Activity className="h-4 w-4" />
            <span>Analytique & Répartition</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("routing")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 transition-all cursor-pointer shrink-0",
              activeTab === "routing"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 hover:text-[var(--text-primary)]"
            )}
          >
            <Sliders className="h-4 w-4" />
            <span>Routage Salons Discord & Rétention</span>
          </button>
        </div>

        {/* TAB 1: FLUX D'ÉVÉNEMENTS & RECHERCHE */}
        {activeTab === "stream" && (
          <div className="stagger-children space-y-4">
            {/* BARRE DE FILTRES MULTI-CRITÈRES */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3.5 ">
              <div className="flex flex-1 items-center gap-2 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Recherche (acteur, cible, ID, Case #, salon, raison...)"
                    className="h-9 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--input-border-hover)]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filtre Module */}
                <Select
                  value={selectedModule}
                  onChange={(v) => setSelectedModule(v)}
                  size="sm"
                  className="w-auto"
                  aria-label="Filtrer par module"
                  options={[
                    { id: "ALL", label: "Tous les modules" },
                    { id: "SECURITY", label: "Sécurité & Raids" },
                    { id: "AUTOMOD", label: "AutoMod" },
                    { id: "MODERATION", label: "Modération (Cases)" },
                    { id: "MEMBERS", label: "Membres" },
                    { id: "MESSAGES", label: "Messages" },
                    { id: "ROLES", label: "Rôles" },
                    { id: "CHANNELS", label: "Salons" },
                    { id: "VOICE", label: "Vocal" },
                    { id: "SERVER", label: "Serveur" },
                    { id: "SYSTEM", label: "Système" },
                  ]}
                />

                {/* Filtre Sévérité */}
                <Select
                  value={selectedSeverity}
                  onChange={(v) => setSelectedSeverity(v)}
                  size="sm"
                  className="w-auto"
                  aria-label="Filtrer par sévérité"
                  options={[
                    { id: "ALL", label: "Toutes sévérités" },
                    { id: "CRITICAL", label: "🔥 CRITICAL" },
                    { id: "HIGH", label: "🔴 HIGH" },
                    { id: "MEDIUM", label: "🟡 MEDIUM" },
                    { id: "LOW", label: "🔵 LOW" },
                    { id: "INFO", label: "🟢 INFO" },
                  ]}
                />

                {/* Filtre Période */}
                <div className="flex items-center rounded-xl bg-[var(--surface-raised)]/80 p-0.5 border border-[var(--panel-border)]">
                  {["1h", "24h", "7d", "30d", "all"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPeriod(p)}
                      className={cn(
                        "rounded-xl px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                        selectedPeriod === p
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={fetchEvents}
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] transition-all hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] cursor-pointer"
                  title="Rafraîchir les logs"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", loadingEvents && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* TABLEAU DES LOGS */}
            <div className="overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 ">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--text-muted)]">
                  <FileText className="h-10 w-10 text-[var(--text-muted)] mb-2" />
                  <p className="text-sm font-semibold text-[var(--text-muted)]">Aucun événement ne correspond aux filtres</p>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1">
                    Les actions Discord, AutoMod, modérations et alertes de sécurité apparaîtront ici en temps réel.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-xs font-bold uppercase text-[var(--text-muted)]">
                      <tr>
                        <th className="px-4 py-3">Gravité</th>
                        <th className="px-4 py-3">Module & Type</th>
                        <th className="px-4 py-3">Acteur</th>
                        <th className="px-4 py-3">Cible / Salon</th>
                        <th className="px-4 py-3">Détails & Causalité</th>
                        <th className="px-4 py-3 text-right">Date / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--panel-border)]">
                      {events.map((evt) => (
                        <tr
                          key={evt.id}
                          className="group hover:bg-[var(--surface-raised)]/70 transition-colors"
                        >
                          {/* GRAVITÉ */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-extrabold uppercase font-mono tracking-wide",
                                getSeverityBadge(evt.severity)
                              )}
                            >
                              {evt.severity}
                            </span>
                          </td>

                          {/* MODULE & TYPE */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-xl bg-[var(--surface-raised)]/40">{getModuleIcon(evt.module)}</span>
                              <div>
                                <p className="font-bold text-[var(--text-primary)] tracking-tight text-xs">
                                  {evt.type.replace(/_/g, " ")}
                                </p>
                                <span className="text-xs text-[var(--text-muted)] font-mono">{evt.id}</span>
                              </div>
                            </div>
                          </td>

                          {/* ACTEUR */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[var(--text-primary)]">
                                {evt.actor.tag || evt.actor.id}
                              </span>
                              {evt.actor.isBot && (
                                <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-xs font-bold text-emerald-300">
                                  BOT
                                </span>
                              )}
                            </div>
                          </td>

                          {/* CIBLE / SALON */}
                          <td className="px-4 py-3">
                            {evt.target && (
                              <div className="text-[var(--text-muted)]">
                                <span className="font-medium text-[var(--text-primary)]">{evt.target.name || evt.target.id}</span>
                                <span className="text-xs text-[var(--text-muted)] block">Type: {evt.target.type}</span>
                              </div>
                            )}
                            {evt.channel && (
                              <span className="text-cyan-400 text-xs block">
                                #{evt.channel.name}
                              </span>
                            )}
                            {!evt.target && !evt.channel && (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </td>

                          {/* RAISON & LIENS (CASE / INCIDENT) */}
                          <td className="px-4 py-3 max-w-xs truncate">
                            <p className="text-[var(--text-muted)] truncate" title={evt.reason}>
                              {evt.reason || "Aucune raison spécifiée"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {evt.caseId && (
                                <Link
                                  href={`/discord/moderation?guildId=${selectedGuild?.id}&caseNumber=${evt.caseId}`}
                                  className="text-xs font-bold text-orange-400 hover:underline"
                                >
                                  Case #{evt.caseId}
                                </Link>
                              )}
                              {evt.incidentId && (
                                <span className="text-xs font-mono font-bold text-rose-400">
                                  {evt.incidentId}
                                </span>
                              )}
                              {evt.diff && evt.diff.length > 0 && (
                                <span className="rounded bg-[var(--surface-raised)]/40 px-1 text-xs text-[var(--text-muted)]">
                                  {evt.diff.length} modif(s)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* DATE & BOUTON ENQUÊTER */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="text-xs text-[var(--text-muted)]">
                              {new Date(evt.timestamp).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleInvestigate(evt.id)}
                              className="mt-1 inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300 hover:brightness-110 hover:text-[var(--text-primary)] cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Enquêter</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ZONE ÉVÉNEMENTS CRITIQUES */}
        {activeTab === "critical" && (
          <div className="stagger-children space-y-4">
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-rose-400" />
                <h3 className="font-bold text-[var(--text-primary)] text-sm">Centre de Commandement des Menaces Critiques</h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Cette vue isole strictement les raids, tentatives de nuke, vagues d&apos;expulsions massives et élévations de privilèges non autorisées.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {(overview?.criticalEvents || []).map((crit) => (
                <div
                  key={crit.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-500/30 bg-[var(--surface-raised)]/80 p-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-300 font-mono">
                        {crit.severity}
                      </span>
                      <span className="font-bold text-[var(--text-primary)] text-xs">{crit.type}</span>
                      <span className="text-xs text-[var(--text-muted)] font-mono">{crit.id}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{crit.reason || "Alerte de sécurité critique déclenchée."}</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] pt-1">
                      <span>👤 Par: <strong className="text-[var(--text-primary)]">{crit.actor.tag}</strong></span>
                      {crit.target && <span>🎯 Cible: <strong className="text-[var(--text-primary)]">{crit.target.name}</strong></span>}
                      {crit.incidentId && <span className="font-mono text-rose-400">Incident: {crit.incidentId}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleInvestigate(crit.id)}
                      className="flex h-9 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-rose-500 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Mode Enquête Approfondie</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTIQUE & RÉPARTITION */}
        {activeTab === "analytics" && (
          <div className="stagger-children grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RÉPARTITION PAR MODULE */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-5 space-y-4">
              <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                Répartition des Événements par Module
              </h3>
              <div className="space-y-2.5">
                {Object.entries(overview?.byModule || {}).map(([mod, count]) => {
                  const pct = Math.round((count / (overview?.totalEvents || 1)) * 100);
                  return (
                    <div key={mod} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)] font-medium">{mod}</span>
                        <span className="text-[var(--text-muted)] font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--surface-raised)]/40 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RÉPARTITION PAR SÉVÉRITÉ */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-5 space-y-4">
              <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                Distribution par Niveau de Sévérité
              </h3>
              <div className="space-y-2.5">
                {Object.entries(overview?.bySeverity || {}).map(([sev, count]) => {
                  const pct = Math.round((count / (overview?.totalEvents || 1)) * 100);
                  let barColor = "bg-emerald-500";
                  if (sev === "CRITICAL") barColor = "bg-rose-500";
                  if (sev === "HIGH") barColor = "bg-orange-500";
                  if (sev === "MEDIUM") barColor = "bg-amber-400";
                  if (sev === "LOW") barColor = "bg-blue-500";

                  return (
                    <div key={sev} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)] font-medium">{sev}</span>
                        <span className="text-[var(--text-muted)] font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--surface-raised)]/40 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", barColor)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ROUTAGE SALONS & RÉTENTION */}
        {activeTab === "routing" && (
          <div className="stagger-children max-w-4xl space-y-6">
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Routage vers Salons Discord</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Définissez les salons de destination et le seuil de sévérité requis pour l&apos;envoi des embeds.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{savingConfig ? "Sauvegarde..." : "Enregistrer"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Salon Général */}
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 space-y-2">
                  <span className="font-bold text-[var(--text-primary)]">Logs Généraux & Serveur</span>
                  <ChannelSelect
                    value={configRouting.generalChannelId}
                    onChange={(id) => setConfigRouting({ ...configRouting, generalChannelId: id })}
                    channels={textChannels}
                    emptyLabel="— Aucun (salon général) —"
                    className="h-9 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 px-3 text-[var(--text-primary)] outline-none focus:border-[var(--input-border-hover)]"
                  />
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Seuil de déclenchement :</span>
                    <Select
                      value={configRouting.generalThreshold}
                      onChange={(v) => setConfigRouting({ ...configRouting, generalThreshold: v })}
                      size="sm"
                      className="w-auto"
                      aria-label="Seuil de déclenchement (logs généraux)"
                      options={[
                        { id: "OFF", label: "OFF" },
                        { id: "ALL", label: "ALL (Tous)" },
                        { id: "IMPORTANT", label: "IMPORTANT (Med+)" },
                        { id: "CRITICAL_ONLY", label: "CRITICAL ONLY" },
                      ]}
                    />
                  </div>
                </div>

                {/* Salon Modération */}
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 space-y-2">
                  <span className="font-bold text-orange-400">Logs de Modération (Cases)</span>
                  <ChannelSelect
                    value={configRouting.moderationChannelId}
                    onChange={(id) => setConfigRouting({ ...configRouting, moderationChannelId: id })}
                    channels={textChannels}
                    emptyLabel="— Aucun (salon général) —"
                    className="h-9 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 px-3 text-[var(--text-primary)] outline-none focus:border-orange-500"
                  />
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Seuil de déclenchement :</span>
                    <Select
                      value={configRouting.moderationThreshold}
                      onChange={(v) => setConfigRouting({ ...configRouting, moderationThreshold: v })}
                      size="sm"
                      className="w-auto"
                      aria-label="Seuil de déclenchement (logs de modération)"
                      options={[
                        { id: "OFF", label: "OFF" },
                        { id: "ALL", label: "ALL (Tous)" },
                        { id: "IMPORTANT", label: "IMPORTANT (Med+)" },
                        { id: "CRITICAL_ONLY", label: "CRITICAL ONLY" },
                      ]}
                    />
                  </div>
                </div>

                {/* Salon Sécurité */}
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 space-y-2">
                  <span className="font-bold text-rose-400">Logs Sécurité & Anti-Raid</span>
                  <ChannelSelect
                    value={configRouting.securityChannelId}
                    onChange={(id) => setConfigRouting({ ...configRouting, securityChannelId: id })}
                    channels={textChannels}
                    emptyLabel="— Aucun (salon général) —"
                    className="h-9 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 px-3 text-[var(--text-primary)] outline-none focus:border-rose-500"
                  />
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Seuil de déclenchement :</span>
                    <Select
                      value={configRouting.securityThreshold}
                      onChange={(v) => setConfigRouting({ ...configRouting, securityThreshold: v })}
                      size="sm"
                      className="w-auto"
                      aria-label="Seuil de déclenchement (logs de sécurité)"
                      options={[
                        { id: "OFF", label: "OFF" },
                        { id: "ALL", label: "ALL (Tous)" },
                        { id: "IMPORTANT", label: "IMPORTANT (Med+)" },
                        { id: "CRITICAL_ONLY", label: "CRITICAL ONLY" },
                      ]}
                    />
                  </div>
                </div>

                {/* Salon AutoMod */}
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 space-y-2">
                  <span className="font-bold text-amber-400">Logs Détections AutoMod</span>
                  <ChannelSelect
                    value={configRouting.automodChannelId}
                    onChange={(id) => setConfigRouting({ ...configRouting, automodChannelId: id })}
                    channels={textChannels}
                    emptyLabel="— Aucun (salon général) —"
                    className="h-9 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 px-3 text-[var(--text-primary)] outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Seuil de déclenchement :</span>
                    <Select
                      value={configRouting.automodThreshold}
                      onChange={(v) => setConfigRouting({ ...configRouting, automodThreshold: v })}
                      size="sm"
                      className="w-auto"
                      aria-label="Seuil de déclenchement (logs AutoMod)"
                      options={[
                        { id: "OFF", label: "OFF" },
                        { id: "ALL", label: "ALL (Tous)" },
                        { id: "IMPORTANT", label: "IMPORTANT (Med+)" },
                        { id: "CRITICAL_ONLY", label: "CRITICAL ONLY" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* WEBHOOKS PAR CATÉGORIE */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-5 space-y-4">
              <div className="flex flex-col gap-3 border-b border-[var(--panel-border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Webhooks par catégorie</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Chaque catégorie de logs est envoyée par un webhook qui porte le nom que tu choisis (« vocals », « mod »…), dans son propre salon si tu en indiques un.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="flex items-center gap-2 self-start rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer disabled:opacity-60 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{savingConfig ? "Sauvegarde..." : "Enregistrer"}</span>
                </button>
              </div>

              <div className="space-y-2">
                {LOG_CATEGORIES.map((cat) => (
                  <div
                    key={cat.key}
                    className="grid grid-cols-1 items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 text-xs sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    <span className="font-bold text-[var(--text-primary)]">
                      <span className="mr-1.5">{cat.icon}</span>
                      {cat.label}
                    </span>
                    <input
                      type="text"
                      maxLength={80}
                      value={webhookNames[cat.key] || ""}
                      onChange={(e) => setWebhookNames({ ...webhookNames, [cat.key]: e.target.value })}
                      placeholder={`Nom du webhook (défaut : ${cat.defaultName})`}
                      className="h-9 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 px-3 text-[var(--text-primary)] outline-none focus:border-[var(--input-border-hover)]"
                    />
                    <ChannelSelect
                      value={categoryChannels[cat.key] || ""}
                      onChange={(id) => setCategoryChannels({ ...categoryChannels, [cat.key]: id })}
                      channels={textChannels}
                      emptyLabel="Salon par défaut (routage ci-dessus)"
                      className="h-9 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 px-2 text-[var(--text-primary)] outline-none focus:border-[var(--input-border-hover)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleTestCategory(cat.key)}
                      disabled={testingCategory !== null}
                      className="h-9 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] disabled:opacity-50 cursor-pointer"
                    >
                      {testingCategory === cat.key ? "Envoi…" : "Tester"}
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Discord n&apos;accepte pas les noms contenant « discord » ou « clyde » : ces mots sont retirés automatiquement. Un nom vide rétablit le nom par défaut.
              </p>
            </div>

            {/* RÉTENTION DES LOGS */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-5 space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Politique de Conservation & Purge (Rétention)</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Détermine combien de temps les logs sont conservés avant d&apos;être purgés automatiquement pour préserver l&apos;espace disque et le respect de la vie privée.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {[
                  { label: "7 jours", val: 7 },
                  { label: "30 jours", val: 30 },
                  { label: "90 jours (Standard)", val: 90 },
                  { label: "180 jours", val: 180 },
                  { label: "1 an", val: 365 },
                  { label: "Toujours (Illimité)", val: 0 },
                ].map((r) => (
                  <button
                    key={r.val}
                    type="button"
                    onClick={() => setConfigRouting({ ...configRouting, retentionDays: r.val })}
                    className={cn(
                      "rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer",
                      configRouting.retentionDays === r.val
                        ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                        : "border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* RÉGLAGES : WEBHOOKS + IGNORER */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Réglages</h3>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer disabled:opacity-60 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{savingConfig ? "Sauvegarde..." : "Enregistrer"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setUseWebhooks((v) => !v)}
                className="flex w-full items-start justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-left cursor-pointer hover:bg-[var(--surface-raised)]/70"
              >
                <span>
                  <span className="block text-xs font-bold text-[var(--text-primary)]">Utiliser des webhooks</span>
                  <span className="block text-xs text-[var(--text-muted)]">Si activé, ETHONE crée un webhook par salon pour envoyer les logs (nom personnalisable ci-dessus). Sinon, le bot poste directement.</span>
                </span>
                <span className={cn("relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors", useWebhooks ? "bg-emerald-500" : "bg-[var(--text-primary)]/15")}>
                  <span className={cn("block h-4 w-4 rounded-full bg-white shadow transition-transform", useWebhooks ? "translate-x-4" : "translate-x-0")} />
                </span>
              </button>

              <div className="space-y-2">
                <p className="text-xs font-bold text-[var(--text-primary)]">Ignorer des salons</p>
                <p className="text-xs text-[var(--text-muted)]">Aucune action dans ces salons n&apos;est journalisée.</p>
                <div className="flex flex-wrap gap-2">
                  {ignoreChannelIds.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-2.5 py-1 text-xs">
                      #{textChannels.find((c) => c.id === id)?.name || id}
                      <button type="button" onClick={() => setIgnoreChannelIds(ignoreChannelIds.filter((x) => x !== id))} className="text-[var(--text-muted)] hover:text-rose-400 cursor-pointer">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="max-w-xs">
                  <ChannelPicker
                    value={null}
                    guildId={selectedGuild?.id || ""}
                    onChange={(id) => id && !ignoreChannelIds.includes(id) && setIgnoreChannelIds([...ignoreChannelIds, id])}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-[var(--text-primary)]">Ignorer des rôles</p>
                <p className="text-xs text-[var(--text-muted)]">Aucune action d&apos;un membre ayant l&apos;un de ces rôles n&apos;est journalisée.</p>
                <div className="flex flex-wrap gap-2">
                  {ignoreRoleIds.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-2.5 py-1 text-xs">
                      @{id}
                      <button type="button" onClick={() => setIgnoreRoleIds(ignoreRoleIds.filter((x) => x !== id))} className="text-[var(--text-muted)] hover:text-rose-400 cursor-pointer">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="max-w-xs">
                  <RolePicker
                    value={null}
                    guildId={selectedGuild?.id || ""}
                    onChange={(id) => id && !ignoreRoleIds.includes(id) && setIgnoreRoleIds([...ignoreRoleIds, id])}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-[var(--text-primary)]">Ignorer des utilisateurs</p>
                <p className="text-xs text-[var(--text-muted)]">Aucune action de ces utilisateurs n&apos;est journalisée.</p>
                <div className="flex flex-wrap gap-2">
                  {ignoreUserIds.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-2.5 py-1 text-xs font-mono">
                      {id}
                      <button type="button" onClick={() => setIgnoreUserIds(ignoreUserIds.filter((x) => x !== id))} className="text-[var(--text-muted)] hover:text-rose-400 cursor-pointer">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex max-w-xs gap-2">
                  <input
                    type="text"
                    value={ignoreUserInput}
                    onChange={(e) => setIgnoreUserInput(e.target.value)}
                    placeholder="ID utilisateur"
                    className="h-9 flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--input-border-hover)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const id = ignoreUserInput.trim();
                      if (!/^\d{15,22}$/.test(id) || ignoreUserIds.includes(id)) return;
                      setIgnoreUserIds([...ignoreUserIds, id]);
                      setIgnoreUserInput("");
                    }}
                    className="h-9 shrink-0 rounded-xl bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL INVESTIGATION (MODE ENQUÊTE APPROFONDIE) */}
      {investigatingEventId && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] p-6 space-y-5 my-8">
            <button
              type="button"
              onClick={() => {
                setInvestigatingEventId(null);
                setInvestigationData(null);
              }}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--text-primary)]/10 text-[var(--text-muted)] hover:bg-[var(--text-primary)]/15 hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Mode Enquête & Causalité — Événement {investigatingEventId}
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Analyse contextuelle approfondie (Fenêtre temporelle de ±15 minutes)
                </p>
              </div>
            </div>

            {loadingInvestigation ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-transparent" />
                <p className="text-xs text-[var(--text-muted)]">Reconstitution de la chaîne de causalité...</p>
              </div>
            ) : investigationData ? (
              <div className="space-y-5 text-xs">
                {/* SYNTHÈSE "QUI, QUOI, QUAND, OÙ, POURQUOI" */}
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 p-4 space-y-3">
                  <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider text-emerald-400">
                    Fiche d&apos;Investigation
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-xs text-[var(--text-muted)] uppercase font-bold">QUI ? (Acteur)</span>
                      <p className="font-bold text-[var(--text-primary)] text-xs mt-0.5">
                        {investigationData.targetEvent.actor.tag}
                      </p>
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {investigationData.targetEvent.actor.id}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-[var(--text-muted)] uppercase font-bold">QUOI ? (Type d&apos;action)</span>
                      <p className="font-bold text-[var(--text-primary)] text-xs mt-0.5">
                        {investigationData.targetEvent.type}
                      </p>
                      <span
                        className={cn(
                          "inline-block text-xs font-bold px-1.5 py-0.2 rounded mt-0.5",
                          getSeverityBadge(investigationData.targetEvent.severity)
                        )}
                      >
                        {investigationData.targetEvent.severity}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-[var(--text-muted)] uppercase font-bold">QUAND ?</span>
                      <p className="font-mono text-[var(--text-muted)] text-xs mt-0.5">
                        {new Date(investigationData.targetEvent.timestamp).toLocaleString("fr-FR")}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-[var(--text-muted)] uppercase font-bold">OÙ ? (Salon / Serveur)</span>
                      <p className="font-bold text-cyan-400 text-xs mt-0.5">
                        {investigationData.targetEvent.channel
                          ? `#${investigationData.targetEvent.channel.name}`
                          : "Serveur Global"}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-[var(--text-muted)] uppercase font-bold">CIBLE</span>
                      <p className="font-bold text-[var(--text-primary)] text-xs mt-0.5">
                        {investigationData.targetEvent.target?.name || "Aucune"}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-[var(--text-muted)] uppercase font-bold">DOSSIER ASSOCIÉ</span>
                      <div className="mt-0.5">
                        {investigationData.targetEvent.caseId ? (
                          <span className="font-bold text-orange-400">Case #{investigationData.targetEvent.caseId}</span>
                        ) : investigationData.targetEvent.incidentId ? (
                          <span className="font-mono font-bold text-rose-400">
                            {investigationData.targetEvent.incidentId}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">Aucun</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {investigationData.targetEvent.reason && (
                    <div className="border-t border-[var(--panel-border)] pt-2">
                      <span className="text-xs text-[var(--text-muted)] uppercase font-bold">POURQUOI ? (Motif)</span>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 bg-[var(--surface-raised)]/40 p-2 rounded-xl">
                        {investigationData.targetEvent.reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* CHAÎNE DE CAUSALITÉ INTERACTIVE */}
                <div className="space-y-2">
                  <h3 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    Chronologie des Événements Connexes (Chaîne de Causalité)
                  </h3>
                  <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3 space-y-2 max-h-60 overflow-y-auto">
                    {investigationData.causalityChain.map((step) => (
                      <div
                        key={step.eventId}
                        className={cn(
                          "flex items-start gap-3 rounded-xl p-2.5 transition-all text-xs",
                          step.eventId === investigatingEventId
                            ? "border border-emerald-500/40 bg-emerald-500/30"
                            : "bg-[var(--surface-raised)]/40"
                        )}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--text-primary)]/10 font-mono text-xs font-bold text-[var(--text-muted)]">
                          {step.step}
                        </span>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--text-primary)]">{step.summary}</span>
                            <span className="text-xs font-mono uppercase px-1 rounded bg-[var(--surface-raised)]/40 text-[var(--text-muted)]">
                              {step.relation}
                            </span>
                          </div>
                          <span className="text-xs text-[var(--text-muted)] font-mono">
                            {new Date(step.timestamp).toLocaleTimeString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DIFF INSPECTION (AVANT / APRÈS) */}
                {investigationData.diffInspection && investigationData.diffInspection.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                      <Sliders className="h-4 w-4 text-amber-400" />
                      Différence d&apos;État Détectée (Avant / Après)
                    </h3>
                    <div className="overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-xs uppercase font-bold text-[var(--text-muted)]">
                          <tr>
                            <th className="px-3 py-2">Champ Modifié</th>
                            <th className="px-3 py-2 text-rose-400">État Avant (Previous)</th>
                            <th className="px-3 py-2 text-emerald-400">État Après (Current)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--panel-border)] font-mono text-xs">
                          {investigationData.diffInspection.map((d, i) => (
                            <tr key={i} className="hover:bg-[var(--surface-raised)]/70">
                              <td className="px-3 py-2 font-bold text-[var(--text-muted)]">{d.field}</td>
                              <td className="px-3 py-2 text-rose-300 bg-rose-500/5">{d.beforeDisplay}</td>
                              <td className="px-3 py-2 text-emerald-300 bg-emerald-500/5">{d.afterDisplay}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL EXPORT (CSV / JSON) */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-md rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] p-6 space-y-4">
            <button
              type="button"
              onClick={() => setExportModalOpen(false)}
              className="absolute right-5 top-5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-emerald-400" />
              <h3 className="font-bold text-[var(--text-primary)] text-sm">Exporter le Journal d&apos;Audit</h3>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Exportez l&apos;ensemble des événements actuellement filtrés pour archivage ou audit externe.
            </p>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-[var(--text-muted)]">Format d&apos;export :</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportFormat("csv")}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer",
                    exportFormat === "csv"
                      ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                      : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <span className="text-base">📊</span>
                  <span className="mt-1">CSV (Excel / Tableur)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat("json")}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer",
                    exportFormat === "json"
                      ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                      : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <span className="text-base">📦</span>
                  <span className="mt-1">JSON (Données brutes)</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDownloadExport}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-2.5 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
              >
                <Download className="h-4 w-4" />
                <span>Télécharger l&apos;export {exportFormat.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
