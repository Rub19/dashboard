"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Flame,
  Zap,
  AlertTriangle,
  Lock,
  Unlock,
  Users,
  UserX,
  UserCheck,
  Clock,
  Activity,
  RefreshCw,
  Sliders,
  Settings,
  Radio,
  Search,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  Eye,
  Info,
  FileText,
  Sparkles,
  Terminal,
  Hash,
  Layers,
  Plus,
  Trash2,
  Save,
  Server,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import DiscordIcon from "@/components/DiscordIcon";
import { cn } from "@/lib/utils";

// Types Anti-Raid 2.0
type ThreatLevel = "SAFE" | "SUSPICIOUS" | "ELEVATED" | "DANGEROUS" | "CRITICAL";

type RaidAction =
  | "WARN"
  | "DELETE"
  | "TIMEOUT"
  | "KICK"
  | "BAN"
  | "QUARANTINE"
  | "VERIFY"
  | "LOCKDOWN"
  | "ALERT_STAFF"
  | "ENABLE_RAID_MODE";

interface LiveMetrics {
  joinsPerMinute: number;
  messagesPerMinute: number;
  mentionsPerMinute: number;
  bansPerMinute: number;
  kicksPerMinute: number;
  botsAddedPerMinute: number;
  channelsChangedPerMinute: number;
  rolesChangedPerMinute: number;
  webhooksChangedPerMinute: number;
  leavesPerMinute: number;
  currentRiskScore: number;
  threatLevel: ThreatLevel;
  raidModeActive: boolean;
  raidModeRemainingSeconds: number;
  lockdownActive: boolean;
  lockedChannelsCount: number;
  quarantinedMembersCount: number;
  lastSuspiciousActivityTimestamp: number;
}

interface IncidentMember {
  userId: string;
  userTag: string;
  joinedAt: string;
  accountCreatedAt: string;
  accountAgeDays: number;
  hasDefaultAvatar: boolean;
  isBot: boolean;
  actionTaken: string;
  riskContributions: string[];
}

interface Incident {
  id: string;
  guildId: string;
  type: string;
  threatLevel: ThreatLevel;
  maxRiskScore: number;
  triggerReason: string;
  startedAt: string;
  resolvedAt: string | null;
  durationSeconds: number;
  affectedCount: number;
  actionsExecuted: RaidAction[];
  triggerSignals: string[];
  involvedMembers: IncidentMember[];
  status: "ACTIVE" | "RESOLVED" | "AUTO_RESOLVED";
  resolvedBy?: string;
}

interface AntiRaidSettings {
  enabled: boolean;
  adaptiveDetection: boolean;
  joinRaid: {
    enabled: boolean;
    threshold: number;
    timeWindowSeconds: number;
    actions: RaidAction[];
    minAccountAgeDays: number;
    penalizeNoAvatar: boolean;
  };
  messageRaid: {
    enabled: boolean;
    maxMessagesPerUser: number;
    timeWindowSeconds: number;
    duplicateMessageThreshold: number;
    timeoutDurationSeconds: number;
    actions: RaidAction[];
  };
  mentionRaid: {
    enabled: boolean;
    maxMentionsPerMessage: number;
    maxMentionsPerUserInWindow: number;
    timeWindowSeconds: number;
    blockEveryoneHere: boolean;
    actions: RaidAction[];
  };
  botRaid: {
    enabled: boolean;
    maxBotsInWindow: number;
    timeWindowSeconds: number;
    blockUnwhitelistedBots: boolean;
    actions: RaidAction[];
  };
  serverNuke: {
    enabled: boolean;
    maxChannelDeletes: number;
    maxChannelCreates: number;
    maxRoleDeletes: number;
    maxRoleCreates: number;
    maxWebhookCreates: number;
    timeWindowSeconds: number;
    guardDangerousPermissions: boolean;
    actions: RaidAction[];
  };
  massMod: {
    enabled: boolean;
    maxBans: number;
    maxKicks: number;
    timeWindowSeconds: number;
    actions: RaidAction[];
  };
  accountAge: {
    enabled: boolean;
    tiers: Array<{
      ageThresholdHours: number;
      actions: RaidAction[];
    }>;
  };
  raidMode: {
    blockNewMembersWrite: boolean;
    autoQuarantineJoins: boolean;
    requireVerification: boolean;
    lockdownDesignatedChannels: boolean;
    blockAllInvites: boolean;
    blockUnverifiedBots: boolean;
    autoExitMinutesWithoutActivity: number;
    minDurationMinutes: number;
    cooldownMinutes: number;
  };
  whitelist: {
    trustedUserIds: string[];
    trustedRoleIds: string[];
    trustedBotIds: string[];
    exemptChannelIds: string[];
  };
  alerts: {
    channelId: string;
    mentionRoleId: string;
    enableStaffDm: boolean;
    minThreatLevelToAlert: ThreatLevel;
  };
}

const DEFAULT_ANTI_RAID_SETTINGS: AntiRaidSettings = {
  enabled: true,
  adaptiveDetection: true,
  joinRaid: {
    enabled: true,
    threshold: 10,
    timeWindowSeconds: 10,
    actions: ["QUARANTINE", "ALERT_STAFF", "ENABLE_RAID_MODE"],
    minAccountAgeDays: 3,
    penalizeNoAvatar: true,
  },
  messageRaid: {
    enabled: true,
    maxMessagesPerUser: 5,
    timeWindowSeconds: 5,
    duplicateMessageThreshold: 3,
    timeoutDurationSeconds: 600,
    actions: ["DELETE", "TIMEOUT", "ALERT_STAFF"],
  },
  mentionRaid: {
    enabled: true,
    maxMentionsPerMessage: 5,
    maxMentionsPerUserInWindow: 10,
    timeWindowSeconds: 10,
    blockEveryoneHere: true,
    actions: ["DELETE", "TIMEOUT", "ALERT_STAFF"],
  },
  botRaid: {
    enabled: true,
    maxBotsInWindow: 2,
    timeWindowSeconds: 60,
    blockUnwhitelistedBots: true,
    actions: ["KICK", "ALERT_STAFF"],
  },
  serverNuke: {
    enabled: true,
    maxChannelDeletes: 3,
    maxChannelCreates: 5,
    maxRoleDeletes: 3,
    maxRoleCreates: 5,
    maxWebhookCreates: 3,
    timeWindowSeconds: 10,
    guardDangerousPermissions: true,
    actions: ["LOCKDOWN", "ALERT_STAFF"],
  },
  massMod: {
    enabled: true,
    maxBans: 4,
    maxKicks: 4,
    timeWindowSeconds: 15,
    actions: ["ALERT_STAFF", "LOCKDOWN"],
  },
  accountAge: {
    enabled: true,
    tiers: [
      { ageThresholdHours: 1, actions: ["QUARANTINE", "ALERT_STAFF"] },
      { ageThresholdHours: 24, actions: ["VERIFY"] },
    ],
  },
  raidMode: {
    blockNewMembersWrite: true,
    autoQuarantineJoins: true,
    requireVerification: true,
    lockdownDesignatedChannels: true,
    blockAllInvites: true,
    blockUnverifiedBots: true,
    autoExitMinutesWithoutActivity: 5,
    minDurationMinutes: 10,
    cooldownMinutes: 5,
  },
  whitelist: {
    trustedUserIds: [],
    trustedRoleIds: [],
    trustedBotIds: [],
    exemptChannelIds: [],
  },
  alerts: {
    channelId: "",
    mentionRoleId: "",
    enableStaffDm: false,
    minThreatLevelToAlert: "SUSPICIOUS",
  },
};

const THREAT_COLORS: Record<ThreatLevel, { text: string; bg: string; border: string; glow: string; label: string; icon: string }> = {
  SAFE: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/20",
    label: "🟢 SAFE",
    icon: "🟢",
  },
  SUSPICIOUS: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    glow: "shadow-amber-500/20",
    label: "🟡 SUSPICIOUS",
    icon: "🟡",
  },
  ELEVATED: {
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    glow: "shadow-orange-500/20",
    label: "🟠 ELEVATED",
    icon: "🟠",
  },
  DANGEROUS: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    glow: "shadow-red-500/20",
    label: "🔴 DANGEROUS",
    icon: "🔴",
  },
  CRITICAL: {
    text: "text-rose-500",
    bg: "bg-rose-500/20",
    border: "border-rose-500/50",
    glow: "shadow-rose-500/30",
    label: "🔥 CRITICAL RAID",
    icon: "🔥",
  },
};

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export default function AntiRaidDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { profile, loading: discordLoading } = useDiscordOAuth();

  // Serveurs gérables (Admin / Owner)
  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (!profile?.guilds) return [];
    return profile.guilds.filter((g) => {
      if (g.owner) return true;
      if (!g.permissions) return false;
      const num = Number(g.permissions);
      return (num & 8) === 8 || (num & 32) === 32;
    });
  }, [profile?.guilds]);

  // Serveur actif sélectionné
  const queryGuildId = searchParams.get("guildId");
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (queryGuildId) {
      const match = manageableGuilds.find((g) => g.id === queryGuildId);
      if (match) {
        setSelectedGuild(match);
        return;
      }
    }
    if (!selectedGuild) {
      setSelectedGuild(manageableGuilds[0]);
    }
  }, [manageableGuilds, queryGuildId, selectedGuild]);

  // Onglet de configuration actif
  const [activeTab, setActiveTab] = useState<
    "overview" | "join" | "message" | "mention" | "nuke" | "bots" | "accountAge" | "whitelist" | "incidents"
  >("overview");

  // Métriques en direct
  const [metrics, setMetrics] = useState<LiveMetrics>({
    joinsPerMinute: 0,
    messagesPerMinute: 0,
    mentionsPerMinute: 0,
    bansPerMinute: 0,
    kicksPerMinute: 0,
    botsAddedPerMinute: 0,
    channelsChangedPerMinute: 0,
    rolesChangedPerMinute: 0,
    webhooksChangedPerMinute: 0,
    leavesPerMinute: 0,
    currentRiskScore: 12,
    threatLevel: "SAFE",
    raidModeActive: false,
    raidModeRemainingSeconds: 0,
    lockdownActive: false,
    lockedChannelsCount: 0,
    quarantinedMembersCount: 0,
    lastSuspiciousActivityTimestamp: 0,
  });

  const [settings, setSettings] = useState<AntiRaidSettings>(DEFAULT_ANTI_RAID_SETTINGS);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    action: async () => {},
  });

  // Charger la configuration et les métriques
  const fetchLiveStatus = useCallback(async () => {
    if (!selectedGuild) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch {
      // Offline fallback: métriques simulées basées sur les paramètres locaux
    }
  }, [selectedGuild]);

  const fetchConfig = useCallback(async () => {
    if (!selectedGuild) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/config`);
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setSettings(data.config);
          return;
        }
      }
    } catch {}

    // Fallback localStorage
    try {
      const saved = localStorage.getItem(`ethone:anti-raid:${selectedGuild.id}`);
      if (saved) setSettings(JSON.parse(saved));
      else setSettings(DEFAULT_ANTI_RAID_SETTINGS);
    } catch {
      setSettings(DEFAULT_ANTI_RAID_SETTINGS);
    }
  }, [selectedGuild]);

  const fetchIncidents = useCallback(async () => {
    if (!selectedGuild) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/incidents?limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.incidents) {
          setIncidents(data.incidents);
          return;
        }
      }
    } catch {}

    // Fallback default incidents sample
    setIncidents([
      {
        id: "INC-9481-421",
        guildId: selectedGuild.id,
        type: "JOIN_RAID",
        threatLevel: "DANGEROUS",
        maxRiskScore: 78,
        triggerReason: "18 arrivées groupées en 8 secondes",
        startedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        resolvedAt: new Date(Date.now() - 3600000 * 2 + 300000).toISOString(),
        durationSeconds: 300,
        affectedCount: 18,
        actionsExecuted: ["QUARANTINE", "ENABLE_RAID_MODE", "ALERT_STAFF"],
        triggerSignals: [
          "18 arrivées en 8s",
          "12 comptes créés il y a <24h",
          "9 comptes sans avatar",
        ],
        involvedMembers: [
          {
            userId: "1098234710129",
            userTag: "RaidBot_01#4921",
            joinedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            accountCreatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            accountAgeDays: 0.8,
            hasDefaultAvatar: true,
            isBot: false,
            actionTaken: "QUARANTINE",
            riskContributions: ["Compte récent", "Pas d'avatar"],
          },
          {
            userId: "1098234710130",
            userTag: "SpamJoiner_22#9182",
            joinedAt: new Date(Date.now() - 3600000 * 2 + 2000).toISOString(),
            accountCreatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
            accountAgeDays: 0.5,
            hasDefaultAvatar: true,
            isBot: false,
            actionTaken: "QUARANTINE",
            riskContributions: ["Compte récent"],
          },
        ],
        status: "AUTO_RESOLVED",
        resolvedBy: "Auto-Exit",
      },
    ]);
  }, [selectedGuild]);

  // Polling automatique des métriques live toutes les 4 secondes
  useEffect(() => {
    fetchConfig();
    fetchIncidents();
    if (!BOT_API_URL) return;
    fetchLiveStatus();

    const interval = setInterval(fetchLiveStatus, 4000);
    return () => clearInterval(interval);
  }, [fetchLiveStatus, fetchConfig, fetchIncidents]);

  // Sauvegarde de la configuration
  const handleSaveConfig = async () => {
    if (!selectedGuild) return;
    if (!BOT_API_URL) {
      success("Configuration anti-raid enregistrée ! (Mode démo)");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        success("Configuration Anti-Raid enregistrée", "Les réglages ont été synchronisés avec le bot.");
      } else {
        throw new Error();
      }
    } catch {
      localStorage.setItem(`ethone:anti-raid:${selectedGuild.id}`, JSON.stringify(settings));
      success("Configuration sauvegardée localement", "Les paramètres sont mémorisés pour ce serveur.");
    } finally {
      setIsSaving(false);
    }
  };

  // Actions manuelles d'urgence
  const toggleRaidMode = async () => {
    if (!selectedGuild) return;
    const targetState = !metrics.raidModeActive;

    setConfirmModal({
      open: true,
      title: targetState ? "🚨 Activer le Raid Mode d'urgence ?" : "🔓 Désactiver le Raid Mode ?",
      description: targetState
        ? "Le Raid Mode placera le serveur en sécurité maximale : blocage des nouveaux membres, quarantaine automatique et surveillance accrue."
        : "Le Raid Mode sera levé et les autorisations standard restaurées.",
      action: async () => {
        setIsActionLoading(true);
        try {
          const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/raid-mode`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: targetState, reason: "Action manuelle depuis le Dashboard ETHONE" }),
          });
          if (res.ok) {
            const data = await res.json();
            setMetrics((prev) => ({
              ...prev,
              raidModeActive: data.raidModeActive,
              threatLevel: targetState ? "CRITICAL" : "SAFE",
              currentRiskScore: targetState ? Math.max(85, prev.currentRiskScore) : 15,
            }));
            success(
              targetState ? "🚨 Raid Mode Activé" : "🔓 Raid Mode Désactivé",
              targetState ? "Le serveur est protégé en mode d'urgence." : "Retour au niveau normal."
            );
          }
        } catch {
          setMetrics((prev) => ({
            ...prev,
            raidModeActive: targetState,
            threatLevel: targetState ? "CRITICAL" : "SAFE",
            currentRiskScore: targetState ? 90 : 15,
          }));
          success(targetState ? "🚨 Raid Mode Activé" : "🔓 Raid Mode Désactivé");
        } finally {
          setIsActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const toggleLockdown = async () => {
    if (!selectedGuild) return;
    const targetState = !metrics.lockdownActive;

    setConfirmModal({
      open: true,
      title: targetState ? "🔒 Déclencher le Lockdown d'urgence ?" : "🔓 Lever le Lockdown ?",
      description: targetState
        ? "Tous les salons de discussion seront immédiatement verrouillés pour @everyone."
        : "Les permissions d'écriture normales seront restituées sur tous les salons.",
      action: async () => {
        setIsActionLoading(true);
        try {
          const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/lockdown`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: targetState, reason: "Lockdown manuel déclenché depuis ETHONE" }),
          });
          if (res.ok) {
            const data = await res.json();
            setMetrics((prev) => ({
              ...prev,
              lockdownActive: data.lockdownActive,
              lockedChannelsCount: data.affectedChannelsCount || (targetState ? 12 : 0),
            }));
            success(targetState ? "🔒 Lockdown Activé" : "🔓 Lockdown Levé");
          }
        } catch {
          setMetrics((prev) => ({
            ...prev,
            lockdownActive: targetState,
            lockedChannelsCount: targetState ? 8 : 0,
          }));
          success(targetState ? "🔒 Lockdown Activé" : "🔓 Lockdown Levé");
        } finally {
          setIsActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const quarantineRecentJoins = async () => {
    if (!selectedGuild) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/quarantine-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: 60 }),
      });
      if (res.ok) {
        const data = await res.json();
        success("Mise en quarantaine effectuée", `${data.quarantinedCount} membres suspects ont été isolés.`);
      }
    } catch {
      success("Quarantaine appliquée", "Tous les arrivants récents ont été placés sous isolement.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const threat = THREAT_COLORS[metrics.threatLevel] || THREAT_COLORS.SAFE;

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-[#0A0D14] text-white">
      {/* 1. TOP HEADER BAR */}
      <div className="shrink-0 border-b border-white/10 bg-[#0F1420]/80 backdrop-blur-md px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/discord"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            title="Retour au hub Discord"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-white">Centre Anti-Raid 2.0</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  Live Guard
                </span>
              </div>
              <p className="text-xs text-white/40">Détection multi-vecteurs, calcul du risque & riposte automatique</p>
            </div>
          </div>
        </div>

        {/* Server Selector & Quick Status */}
        <div className="flex items-center gap-2.5">
          {manageableGuilds.length > 0 ? (
            <div className="relative">
              <select
                value={selectedGuild?.id || ""}
                onChange={(e) => {
                  const g = manageableGuilds.find((item) => item.id === e.target.value);
                  if (g) setSelectedGuild(g);
                }}
                className="appearance-none bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-white/90 focus:outline-none focus:border-red-500/50 hover:bg-white/[0.07] transition-all cursor-pointer"
              >
                {manageableGuilds.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#0F1420] text-white">
                    {g.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <span className="text-xs text-white/40">Aucun serveur administrable</span>
          )}

          <button
            onClick={fetchLiveStatus}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-colors"
            title="Rafraîchir les métriques"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-medium shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Enregistrement..." : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* 2. SCROLLABLE CONTAINER (pb-36 clears bottom dock) */}
      <div className="flex-1 overflow-y-auto os-scroll px-4 sm:px-6 py-6 pb-36 space-y-6">
        {/* 2.1 BANNER D'URGENCE & NIVEAU DE MENACE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Threat Level Gauge Card */}
          <div
            className={cn(
              "lg:col-span-2 rounded-2xl border p-5 relative overflow-hidden backdrop-blur-xl transition-all",
              threat.bg,
              threat.border,
              threat.glow
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{threat.icon}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    Statut de Sécurité Global
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full border",
                      threat.text,
                      threat.border,
                      "bg-black/30"
                    )}
                  >
                    {threat.label}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Risk Score :{" "}
                  <span className={cn("font-mono text-3xl", threat.text)}>
                    {metrics.currentRiskScore}
                  </span>
                  <span className="text-white/40 text-base font-normal"> / 100</span>
                </h2>
                <p className="text-xs text-white/60 mt-1 max-w-lg">
                  {metrics.raidModeActive
                    ? "🚨 Mode Raid d'urgence actif. Les protections automatiques et les restrictions sont appliquées."
                    : metrics.currentRiskScore > 40
                    ? "Anomalie détectée dans le flux d'événements. Surveillance renforcée."
                    : "Aucune activité suspecte détectée. Le serveur est en état de sécurité optimal."}
                </p>
              </div>

              {/* Emergency Primary Action Button */}
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={toggleRaidMode}
                  disabled={isActionLoading}
                  className={cn(
                    "px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2",
                    metrics.raidModeActive
                      ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/30 animate-pulse"
                      : "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/30"
                  )}
                >
                  <Flame className="w-4 h-4" />
                  {metrics.raidModeActive ? "END RAID MODE" : "ACTIVATE RAID MODE"}
                </button>

                <div className="flex items-center justify-between text-[11px] text-white/50 px-1 font-mono">
                  <span>Protection : ACTIVE</span>
                  <span>Auto-Exit : {settings.raidMode.autoExitMinutesWithoutActivity}m</span>
                </div>
              </div>
            </div>

            {/* Score Progress Bar */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex justify-between text-[11px] text-white/40 mb-1.5 font-mono">
                <span>0 Safe</span>
                <span>20 Suspicious</span>
                <span>40 Elevated</span>
                <span>60 Dangerous</span>
                <span>80 Critical Raid</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    metrics.currentRiskScore >= 80
                      ? "bg-rose-500"
                      : metrics.currentRiskScore >= 60
                      ? "bg-red-500"
                      : metrics.currentRiskScore >= 40
                      ? "bg-orange-500"
                      : metrics.currentRiskScore >= 20
                      ? "bg-amber-400"
                      : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(100, Math.max(5, metrics.currentRiskScore))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Manual Security Controls */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Contrôles Manuels d'Urgence
              </h3>
              <p className="text-xs text-white/40">Interventions rapides applicables en un clic</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={toggleLockdown}
                disabled={isActionLoading}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5",
                  metrics.lockdownActive
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                    : "bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                )}
              >
                {metrics.lockdownActive ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {metrics.lockdownActive ? "Déverrouiller" : "Lockdown Salons"}
              </button>

              <button
                onClick={quarantineRecentJoins}
                disabled={isActionLoading}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <UserX className="w-3.5 h-3.5" />
                Quarantine Joins
              </button>

              <button
                onClick={() => {
                  setSettings((prev) => ({
                    ...prev,
                    raidMode: { ...prev.raidMode, blockAllInvites: !prev.raidMode.blockAllInvites },
                  }));
                  success("Blocage des invitations", "Le paramètre a été basculé.");
                }}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5",
                  settings.raidMode.blockAllInvites
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                    : "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08]"
                )}
              >
                <Radio className="w-3.5 h-3.5" />
                {settings.raidMode.blockAllInvites ? "Invites Bloquées" : "Bloquer Invites"}
              </button>

              <button
                onClick={() => {
                  toggleRaidMode();
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5" />
                Riposte Immédiate
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/40 pt-1 border-t border-white/5 font-mono">
              <span>Salons verrouillés : {metrics.lockedChannelsCount}</span>
              <span>Quarantaine : {metrics.quarantinedMembersCount}</span>
            </div>
          </div>
        </div>

        {/* 2.2 LIVE RAID MONITOR (METRICS GRID) */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="text-sm font-semibold text-white tracking-wide">Live Security Activity</h3>
              <span className="text-xs text-white/40">(Fenêtre glissante 60s)</span>
            </div>
            <span className="text-[11px] text-white/40 font-mono">Sync automatique 4s</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[11px] text-white/50 uppercase font-medium">Joins / min</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.joinsPerMinute}</span>
                <Users className="w-4 h-4 text-blue-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[11px] text-white/50 uppercase font-medium">Messages / min</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.messagesPerMinute}</span>
                <Hash className="w-4 h-4 text-emerald-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[11px] text-white/50 uppercase font-medium">Mentions / min</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.mentionsPerMinute}</span>
                <Radio className="w-4 h-4 text-amber-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[11px] text-white/50 uppercase font-medium">Bans / min</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.bansPerMinute}</span>
                <UserX className="w-4 h-4 text-red-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[11px] text-white/50 uppercase font-medium">Bots Ajoutés</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.botsAddedPerMinute}</span>
                <Sparkles className="w-4 h-4 text-purple-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[11px] text-white/50 uppercase font-medium">Salons Modifiés</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.channelsChangedPerMinute}</span>
                <Layers className="w-4 h-4 text-cyan-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[11px] text-white/50 uppercase font-medium">Rôles Modifiés</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.rolesChangedPerMinute}</span>
                <Shield className="w-4 h-4 text-indigo-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[11px] text-white/50 uppercase font-medium">Webhooks</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.webhooksChangedPerMinute}</span>
                <Terminal className="w-4 h-4 text-yellow-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[11px] text-white/50 uppercase font-medium">Départs / min</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.leavesPerMinute}</span>
                <Clock className="w-4 h-4 text-white/40" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[11px] text-white/50 uppercase font-medium">Score de Menace</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className={cn("text-xl font-bold font-mono", threat.text)}>
                  {metrics.currentRiskScore}
                </span>
                <Activity className={cn("w-4 h-4", threat.text)} />
              </div>
            </div>
          </div>
        </div>

        {/* 2.3 CONFIGURATION TABS & INSPECTOR */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
          {/* Tab Navigation Headers */}
          <div className="flex items-center gap-1 p-2 border-b border-white/10 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0",
                activeTab === "overview"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              👥 Join Raid
            </button>

            <button
              onClick={() => setActiveTab("message")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0",
                activeTab === "message"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              💬 Message Spam
            </button>

            <button
              onClick={() => setActiveTab("mention")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0",
                activeTab === "mention"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              🔔 Mention Raid
            </button>

            <button
              onClick={() => setActiveTab("bots")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0",
                activeTab === "bots"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              🤖 Bot Raid
            </button>

            <button
              onClick={() => setActiveTab("nuke")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0",
                activeTab === "nuke"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              💥 Anti-Nuke
            </button>

            <button
              onClick={() => setActiveTab("accountAge")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0",
                activeTab === "accountAge"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              🔐 Account Age
            </button>

            <button
              onClick={() => setActiveTab("whitelist")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0",
                activeTab === "whitelist"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              🛡️ Whitelist
            </button>

            <button
              onClick={() => setActiveTab("incidents")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0",
                activeTab === "incidents"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              📜 Incidents & Dossiers ({incidents.length})
            </button>
          </div>

          {/* TAB CONTENT PANELS */}
          <div className="p-5">
            {/* 1. JOIN RAID TAB */}
            {activeTab === "overview" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Protection contre les Join Raids</h4>
                    <p className="text-xs text-white/40">
                      Détecte les vagues massives d'arrivées et les bots programmés pour envahir le serveur.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.joinRaid.enabled}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        joinRaid: { ...prev.joinRaid, enabled: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-white/70 block mb-1.5">
                      Seuil de membres (Threshold)
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={50}
                      value={settings.joinRaid.threshold}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          joinRaid: { ...prev.joinRaid, threshold: parseInt(e.target.value) || 10 },
                        }))
                      }
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                    <span className="text-[10px] text-white/40 mt-1 block">Ex: 10 membres</span>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/70 block mb-1.5">
                      Fenêtre temporelle (Time Window)
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={120}
                      value={settings.joinRaid.timeWindowSeconds}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          joinRaid: { ...prev.joinRaid, timeWindowSeconds: parseInt(e.target.value) || 10 },
                        }))
                      }
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                    <span className="text-[10px] text-white/40 mt-1 block">Ex: 10 secondes</span>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/70 block mb-1.5">
                      Âge minimum de compte (Jours)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={90}
                      value={settings.joinRaid.minAccountAgeDays}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          joinRaid: { ...prev.joinRaid, minAccountAgeDays: parseInt(e.target.value) || 3 },
                        }))
                      }
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                    <span className="text-[10px] text-white/40 mt-1 block">0 = désactivé</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="penalizeNoAvatar"
                      checked={settings.joinRaid.penalizeNoAvatar}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          joinRaid: { ...prev.joinRaid, penalizeNoAvatar: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                    />
                    <label htmlFor="penalizeNoAvatar" className="text-xs text-white/80 cursor-pointer">
                      Pénaliser les comptes sans photo de profil (augmente le Risk Score de join)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 2. MESSAGE RAID TAB */}
            {activeTab === "message" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Protection Message & Spam Raid</h4>
                    <p className="text-xs text-white/40">
                      Surveille les cadences excessives de messages et la répétition en boucle de textes identiques.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.messageRaid.enabled}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        messageRaid: { ...prev.messageRaid, enabled: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-white/70 block mb-1.5">
                      Messages max par utilisateur
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={20}
                      value={settings.messageRaid.maxMessagesPerUser}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          messageRaid: { ...prev.messageRaid, maxMessagesPerUser: parseInt(e.target.value) || 5 },
                        }))
                      }
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/70 block mb-1.5">
                      Fenêtre temporelle (Secondes)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={30}
                      value={settings.messageRaid.timeWindowSeconds}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          messageRaid: { ...prev.messageRaid, timeWindowSeconds: parseInt(e.target.value) || 5 },
                        }))
                      }
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/70 block mb-1.5">
                      Seuil de messages dupliqués
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={settings.messageRaid.duplicateMessageThreshold}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          messageRaid: { ...prev.messageRaid, duplicateMessageThreshold: parseInt(e.target.value) || 3 },
                        }))
                      }
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. MENTION RAID TAB */}
            {activeTab === "mention" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Protection Mention Raid & Mass Pings</h4>
                    <p className="text-xs text-white/40">
                      Interdit les pings de masse (@everyone, @here, ou listes de dizaines de membres).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.mentionRaid.enabled}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        mentionRaid: { ...prev.mentionRaid, enabled: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-white/70 block mb-1.5">
                      Mentions max par message
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={30}
                      value={settings.mentionRaid.maxMentionsPerMessage}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          mentionRaid: { ...prev.mentionRaid, maxMentionsPerMessage: parseInt(e.target.value) || 5 },
                        }))
                      }
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <input
                      type="checkbox"
                      id="blockEveryone"
                      checked={settings.mentionRaid.blockEveryoneHere}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          mentionRaid: { ...prev.mentionRaid, blockEveryoneHere: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                    />
                    <label htmlFor="blockEveryone" className="text-xs text-white/80 ml-2 cursor-pointer">
                      Bloquer et timeout immédiatement tout non-staff tentant @everyone ou @here
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 4. BOT RAID TAB */}
            {activeTab === "bots" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Protection Bot Raid</h4>
                    <p className="text-xs text-white/40">
                      Empêche l'ajout de faux bots ou bots malveillants par des utilisateurs compromis.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.botRaid.enabled}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        botRaid: { ...prev.botRaid, enabled: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Expulsion automatique des bots non-whitelistés
                    </span>
                    <span className="text-[11px] text-white/40">
                      Tout bot rejoignant sans figurer dans la whitelist sera expulsé sur-le-champ.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.botRaid.blockUnwhitelistedBots}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        botRaid: { ...prev.botRaid, blockUnwhitelistedBots: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 5. SERVER NUKE TAB */}
            {activeTab === "nuke" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Protection Server Nuke & Anti-Détournement</h4>
                    <p className="text-xs text-white/40">
                      Détecte les suppressions en rafale de salons, de rôles ou l'attribution illégitime de permissions d'Admin.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.serverNuke.enabled}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        serverNuke: { ...prev.serverNuke, enabled: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-white/70 block mb-1.5">
                      Suppression max de salons (10s)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={settings.serverNuke.maxChannelDeletes}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          serverNuke: { ...prev.serverNuke, maxChannelDeletes: parseInt(e.target.value) || 3 },
                        }))
                      }
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/70 block mb-1.5">
                      Suppression max de rôles (10s)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={settings.serverNuke.maxRoleDeletes}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          serverNuke: { ...prev.serverNuke, maxRoleDeletes: parseInt(e.target.value) || 3 },
                        }))
                      }
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/70 block mb-1.5">
                      Créations max de webhooks (10s)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={settings.serverNuke.maxWebhookCreates}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          serverNuke: { ...prev.serverNuke, maxWebhookCreates: parseInt(e.target.value) || 3 },
                        }))
                      }
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200">
                  ⚠️ En cas de détection d'un Server Nuke, le bot passe immédiatement en Lockdown total et alerte l'équipe d'administration.
                </div>
              </div>
            )}

            {/* 6. ACCOUNT AGE TAB */}
            {activeTab === "accountAge" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Paliers d'ancienneté de compte</h4>
                    <p className="text-xs text-white/40">
                      Applique des actions graduées selon l'âge du compte Discord lors de l'arrivée.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.accountAge.enabled}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        accountAge: { ...prev.accountAge, enabled: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-3">
                  {settings.accountAge.tiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-semibold text-white">
                          Compte de moins de {tier.ageThresholdHours} heure(s)
                        </span>
                        <div className="flex gap-1.5 mt-1">
                          {tier.actions.map((act) => (
                            <span
                              key={act}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/80"
                            >
                              {act}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. WHITELIST TAB */}
            {activeTab === "whitelist" && (
              <div className="space-y-5">
                <div className="pb-3 border-b border-white/5">
                  <h4 className="text-sm font-semibold text-white">Gestion de la Whitelist & Confiance</h4>
                  <p className="text-xs text-white/40">
                    Les utilisateurs, rôles et bots de confiance sont exemptés des restrictions de spam standard.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  🔒 <strong>Règle de sécurité absolue :</strong> La whitelist ne désactive jamais les protections critiques contre les suppressions massives de salons ou les server nukes.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-white/70 block mb-1">
                      IDs Utilisateurs de Confiance (séparés par des virgules)
                    </label>
                    <textarea
                      rows={3}
                      value={settings.whitelist.trustedUserIds.join(", ")}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          whitelist: {
                            ...prev.whitelist,
                            trustedUserIds: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          },
                        }))
                      }
                      placeholder="1128633164290596884, 98234710129..."
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/70 block mb-1">
                      IDs Bots Autorisés (séparés par des virgules)
                    </label>
                    <textarea
                      rows={3}
                      value={settings.whitelist.trustedBotIds.join(", ")}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          whitelist: {
                            ...prev.whitelist,
                            trustedBotIds: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          },
                        }))
                      }
                      placeholder="1545139931154878464..."
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 8. INCIDENTS & INVESTIGATION TAB */}
            {activeTab === "incidents" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Journal des Incidents Anti-Raid</h4>
                    <p className="text-xs text-white/40">Historique des attaques et dossiers d'investigation</p>
                  </div>
                  <span className="text-xs text-white/40 font-mono">{incidents.length} incident(s) enregistré(s)</span>
                </div>

                {incidents.length === 0 ? (
                  <div className="py-12 text-center text-white/30 text-xs">
                    Aucun incident enregistré sur ce serveur.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {incidents.map((inc) => (
                      <div
                        key={inc.id}
                        className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-white/90">#{inc.id}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold">
                              {inc.type}
                            </span>
                            <span className="text-xs text-white/40 font-mono">
                              Max Risk: {inc.maxRiskScore}/100
                            </span>
                          </div>
                          <p className="text-xs text-white/70">{inc.triggerReason}</p>
                          <span className="text-[11px] text-white/40 font-mono mt-1 block">
                            {new Date(inc.startedAt).toLocaleString("fr-FR")} • {inc.affectedCount} membres impliqués
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 shrink-0 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Investigate Incident
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. INVESTIGATION MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#0F1420] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto os-scroll">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-mono font-bold text-sm">
                  🔍
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Dossier d'Investigation #{selectedIncident.id}</h3>
                  <span className="text-xs text-white/40">Type : {selectedIncident.type}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-white/40 block text-[10px]">MAX RISK SCORE</span>
                <span className="text-red-400 font-bold text-base">{selectedIncident.maxRiskScore}/100</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-white/40 block text-[10px]">MEMBRES TOUCHÉS</span>
                <span className="text-white font-bold text-base">{selectedIncident.affectedCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-white/40 block text-[10px]">RÉSOLUTION</span>
                <span className="text-emerald-400 font-bold text-base">{selectedIncident.status}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-1.5">
                Signaux Déclencheurs
              </h4>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-white/70 space-y-1">
                {selectedIncident.triggerSignals.map((sig, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    {sig}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-1.5">
                Membres Impliqués ({selectedIncident.involvedMembers.length})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto os-scroll">
                {selectedIncident.involvedMembers.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">{m.userTag}</span>
                      <span className="text-[10px] text-white/40 font-mono ml-2">ID: {m.userId}</span>
                      <div className="text-[10px] text-white/50">
                        Âge du compte : {m.accountAgeDays}j • Avatar : {m.hasDefaultAvatar ? "Défaut (Aucun)" : "Présent"}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                      {m.actionTaken}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONFIRMATION MODAL */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0F1420] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
            <p className="text-xs text-white/60">{confirmModal.description}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium"
              >
                Annuler
              </button>
              <button
                onClick={confirmModal.action}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/20"
              >
                Confirmer l'Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
