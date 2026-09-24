"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldAlert,
  Shield,
  Flame,
  Zap,
  Lock,
  Unlock,
  Users,
  UserX,
  Clock,
  Activity,
  RefreshCw,
  Radio,
  ArrowLeft,
  Eye,
  Sparkles,
  Terminal,
  Hash,
  Layers,
  Save,
  Bot,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { useDiscordSync } from "@/lib/useDiscordSync";
import { cn, formatApiError } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

// Types Anti-Raid
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

const ACTION_CHOICES: Array<{ id: RaidAction; label: string; hint: string }> = [
  { id: "DELETE", label: "Supprimer le message", hint: "Efface les messages détectés." },
  { id: "WARN", label: "Avertir", hint: "Ajoute un avertissement au membre." },
  { id: "TIMEOUT", label: "Timeout automatique", hint: "Réduit le membre au silence pour la durée choisie." },
  { id: "KICK", label: "Expulser", hint: "Expulse le membre du serveur." },
  { id: "BAN", label: "Bannir", hint: "Bannit le membre du serveur." },
  { id: "ALERT_STAFF", label: "Alerter le staff", hint: "Envoie une alerte dans le salon du staff." },
];

/** Choix des sanctions automatiques d'une protection. Tout peut être décoché : le bot détecte alors sans sanctionner. */
function ActionPicker({ actions, onChange }: { actions: RaidAction[]; onChange: (next: RaidAction[]) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-white/70">Actions automatiques</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ACTION_CHOICES.map((choice) => {
          const checked = actions.includes(choice.id);
          return (
            <label
              key={choice.id}
              className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                checked ? "border-white/20 bg-white/[0.06]" : "border-[var(--panel-border)] hover:bg-white/[0.03]"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked ? [...actions, choice.id] : actions.filter((x) => x !== choice.id))}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-red-500"
              />
              <span>
                <span className="block text-xs font-semibold text-white">{choice.label}</span>
                <span className="block text-[11px] text-white/60">{choice.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
      {actions.length === 0 && (
        <p className="mt-2 text-[11px] text-amber-300/90">Aucune action cochée : la protection détecte et journalise, sans sanctionner personne.</p>
      )}
    </div>
  );
}

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
    blockAllInvites: false,
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
  const searchParams = useSearchParams();
  const { success, error: showError, toggle } = useToast();
  const { profile } = useDiscordOAuth();
  const allGuilds: DiscordGuild[] = useMemo(() => {
    if (profile?.guilds && profile.guilds.length > 0) return profile.guilds;
    return getStoredDiscordGuilds();
  }, [profile?.guilds]);

  const botGuildIds = useBotGuildIds(allGuilds);

  // Serveurs gérables (Admin / Owner / Bot présent)
  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (allGuilds.length === 0) return [];
    const manageable = allGuilds.filter((g) => canManageGuild(g) || (botGuildIds && botGuildIds.includes(g.id)));
    return manageable.length > 0 ? manageable : allGuilds;
  }, [allGuilds, botGuildIds]);

  // Serveur actif sélectionné
  // Le paramètre d'URL n'est appliqué qu'une fois par valeur : sinon il annule le choix fait dans le sélecteur.
  const appliedQueryGuild = useRef<string | null>(null);
  const userSelectedRef = useRef(false);
  const queryGuildId = searchParams.get("guildId");
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (queryGuildId && appliedQueryGuild.current !== queryGuildId) {
      const match = manageableGuilds.find((g) => g.id === queryGuildId);
      if (match) {
        appliedQueryGuild.current = queryGuildId;
        setSelectedGuild(match);
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
    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/status`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch {
      // Bot injoignable : on garde les dernières métriques reçues, aucune valeur inventée.
    }
  }, [selectedGuild, botGuildIds]);

  const fetchConfig = useCallback(async () => {
    if (!selectedGuild) return;

    // Si le bot n'est pas installé, charger directement le cache local sans requête réseau
    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      try {
        const saved = localStorage.getItem(`ethone:anti-raid:${selectedGuild.id}`);
        if (saved) setSettings(JSON.parse(saved));
        else setSettings(DEFAULT_ANTI_RAID_SETTINGS);
      } catch {
        setSettings(DEFAULT_ANTI_RAID_SETTINGS);
      }
      return;
    }

    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/config`, { credentials: "include" });
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
  }, [selectedGuild, botGuildIds]);

  // Reflète en direct les changements faits via la commande Discord /antiraid
  // (ou un autre onglet dashboard) sans attendre un rechargement manuel.
  useDiscordSync({
    guildId: selectedGuild?.id,
    onConfigUpdated: (module, updatedConfig) => {
      if (module === "antiRaid" && updatedConfig) {
        setSettings((prev: any) => ({ ...prev, ...updatedConfig }));
      }
    },
  });

  const fetchIncidents = useCallback(async () => {
    if (!selectedGuild) return;
    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      setIncidents([]);
      return;
    }
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/incidents?limit=20`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.incidents) {
          setIncidents(data.incidents);
          return;
        }
      }
    } catch {}

    setIncidents([]);
  }, [selectedGuild, botGuildIds]);

  // Polling automatique des métriques live toutes les 4 secondes
  useEffect(() => {
    fetchConfig();
    fetchIncidents();
    if (!BOT_API_URL || (botGuildIds !== null && selectedGuild && !botGuildIds.includes(selectedGuild.id))) return;
    fetchLiveStatus();

    const interval = setInterval(fetchLiveStatus, 4000);
    return () => clearInterval(interval);
  }, [fetchLiveStatus, fetchConfig, fetchIncidents, selectedGuild, botGuildIds]);

  // Sauvegarde de la configuration
  const handleSaveConfig = async () => {
    if (!selectedGuild) return;
    if (!BOT_API_URL) {
      showError("Bot injoignable : la configuration anti-raid n'a pas été enregistrée.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/config`, {
        credentials: "include",
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
            credentials: "include",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: targetState, reason: "Action manuelle depuis le Dashboard ETHONE" }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
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
        } catch (err: unknown) {
          showError("Échec de l'action", formatApiError(err, "Impossible de modifier le Raid Mode. Vérifiez que le bot est en ligne."));
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
            credentials: "include",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: targetState, reason: "Lockdown manuel déclenché depuis ETHONE" }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
          setMetrics((prev) => ({
            ...prev,
            lockdownActive: data.lockdownActive,
            lockedChannelsCount: data.affectedChannelsCount || (targetState ? 12 : 0),
          }));
          success(targetState ? "🔒 Lockdown Activé" : "🔓 Lockdown Levé");
        } catch (err: unknown) {
          showError("Échec du Lockdown", formatApiError(err, "Impossible de modifier le statut de verrouillage. Vérifiez que le bot est en ligne."));
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
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: 60 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      success("Mise en quarantaine effectuée", `${data.quarantinedCount} membres suspects ont été isolés.`);
    } catch (err: unknown) {
      showError("Échec de la quarantaine", formatApiError(err, "Impossible d'isoler les membres récents."));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Forcer le déblocage de toutes les invitations (OFF)
  const handleForceUnblockInvites = async () => {
    if (!selectedGuild) return;
    const previous = settings.raidMode.blockAllInvites;
    setIsActionLoading(true);
    try {
      // 1. Mise à jour immédiate de l'état
      setSettings((prev) => ({
        ...prev,
        raidMode: { ...prev.raidMode, blockAllInvites: false },
      }));

      // 2. Appel API vers le bot
      if (BOT_API_URL) {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/unblock-invites`, {
          credentials: "include",
          method: "POST",
        });
        if (!res.ok) {
          const cfgRes = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/config`, {
            credentials: "include",
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              raidMode: {
                ...settings.raidMode,
                blockAllInvites: false,
              },
            }),
          });
          if (!cfgRes.ok) {
            const errData = await cfgRes.json().catch(() => null);
            throw new Error(errData?.error || `HTTP ${cfgRes.status}`);
          }
        }
      }

      // 3. Persistance localStorage
      try {
        const saved = localStorage.getItem(`ethone:anti-raid:${selectedGuild.id}`);
        const parsed = saved ? JSON.parse(saved) : settings;
        parsed.raidMode = { ...parsed.raidMode, blockAllInvites: false };
        localStorage.setItem(`ethone:anti-raid:${selectedGuild.id}`, JSON.stringify(parsed));
      } catch {}

      success(
        "Invitations débloquées",
        "Le blocage des invitations a été désactivé (OFF). Les liens d'invitation sont de nouveau actifs."
      );
    } catch (err: unknown) {
      setSettings((prev) => ({
        ...prev,
        raidMode: { ...prev.raidMode, blockAllInvites: previous },
      }));
      showError("Erreur lors du déblocage des invitations", formatApiError(err, "Impossible de débloquer les invitations sur le bot."));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleBlockInvites = async () => {
    if (!selectedGuild) return;
    const previous = settings.raidMode.blockAllInvites;
    const next = !previous;
    setSettings((prev) => ({
      ...prev,
      raidMode: { ...prev.raidMode, blockAllInvites: next },
    }));

    try {
      if (BOT_API_URL) {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-raid/config`, {
          credentials: "include",
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            raidMode: {
              ...settings.raidMode,
              blockAllInvites: next,
            },
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `HTTP ${res.status}`);
        }
      }

      try {
        const saved = localStorage.getItem(`ethone:anti-raid:${selectedGuild.id}`);
        const parsed = saved ? JSON.parse(saved) : settings;
        parsed.raidMode = { ...parsed.raidMode, blockAllInvites: next };
        localStorage.setItem(`ethone:anti-raid:${selectedGuild.id}`, JSON.stringify(parsed));
      } catch {}

      toggle(
        "Blocage des invitations",
        next,
        next
          ? "Activé — Toutes les invitations vers le serveur sont temporairement bloquées."
          : "Désactivé — Les invitations vers le serveur sont de nouveau actives."
      );
    } catch (err: unknown) {
      setSettings((prev) => ({
        ...prev,
        raidMode: { ...prev.raidMode, blockAllInvites: previous },
      }));
      showError("Erreur lors de la modification des invitations", formatApiError(err, "Impossible de mettre à jour le blocage des invitations sur le bot."));
    }
  };

  const threat = THREAT_COLORS[metrics.threatLevel] || THREAT_COLORS.SAFE;

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-[var(--bg-main)] text-white">
      {/* 1. TOP HEADER BAR */}
      <div className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--bg-surface-elevated)]/80 backdrop-blur-md px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <Link
            href={selectedGuild ? `/discord/security?guildId=${selectedGuild.id}` : "/discord/security"}
            className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/5 transition-colors"
            title="Retour au hub Sécurité"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[var(--panel-border)] flex items-center justify-center text-zinc-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-white">Centre Anti-Raid</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  Live Guard
                </span>
              </div>
              <p className="text-xs text-white/70">Détection multi-vecteurs, calcul du risque & riposte automatique</p>
            </div>
          </div>
        </div>

        {/* Server Selector & Quick Status */}
        <div className="flex items-center gap-2.5">
          {manageableGuilds.length > 0 ? (
            <GuildSelector
              guilds={manageableGuilds}
              value={selectedGuild?.id || ""}
              onChange={(g) => {
                userSelectedRef.current = true;
                setSelectedGuild(g);
              }}
            />
          ) : (
            <span className="text-xs text-white/70">Aucun serveur administrable</span>
          )}

          <button
            onClick={fetchLiveStatus}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--panel-border)] text-white/70 hover:text-white transition-colors"
            title="Rafraîchir les métriques"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Enregistrement..." : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* 2. SCROLLABLE CONTAINER (pb-36 clears bottom dock) */}
      <div className="flex-1 overflow-y-auto os-scroll px-4 sm:px-6 py-6 pb-36 space-y-6">
        {selectedGuild && botGuildIds !== null && !botGuildIds.includes(selectedGuild.id) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs text-indigo-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Le bot ETHONE n&apos;est pas installé sur ce serveur</p>
                <p className="mt-0.5 text-zinc-300">
                  Invitez le bot sur « {selectedGuild.name} » pour activer la surveillance et les protections Anti-Raid en temps réel.
                </p>
              </div>
            </div>
            <a
              href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors shrink-0"
            >
              Inviter le bot
            </a>
          </div>
        )}

        {/* 2.0 INTERRUPTEUR MAÎTRE */}
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-colors",
            settings.enabled ? "border-emerald-500/25 bg-emerald-500/[0.06]" : "border-[var(--panel-border)] bg-white/[0.02]"
          )}
        >
          <div>
            <p className="text-sm font-semibold text-white">Anti-Raid {settings.enabled ? "— actif" : "— désactivé"}</p>
            <p className="text-xs text-white/75">
              {settings.enabled
                ? "Tous les détecteurs cochés ci-dessous sont appliqués (join raid, spam messages, mentions, bots…)."
                : "Aucune détection ni sanction automatique. Les réglages sont conservés."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            onClick={() => {
              const next = !settings.enabled;
              setSettings((prev) => ({ ...prev, enabled: next }));
              toggle(
                "Protection Anti-Raid",
                next,
                next
                  ? "Activée — Les détecteurs configurés surveillent activement le serveur."
                  : "Désactivée — Surveillance en pause, aucune sanction automatique."
              );
            }}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 outline-none select-none",
              settings.enabled ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "bg-white/20 border border-white/10"
            )}
          >
            <span
              className={cn(
                "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200",
                settings.enabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

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
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/75">
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
                  <span className="text-white/70 text-base font-normal"> / 100</span>
                </h2>
                <p className="text-xs text-white/75 mt-1 max-w-lg">
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
                      ? "bg-amber-500 hover:bg-amber-400 text-black"
                      : "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:bg-red-500 text-white"
                  )}
                >
                  <Flame className="w-4 h-4" />
                  {metrics.raidModeActive ? "END RAID MODE" : "ACTIVATE RAID MODE"}
                </button>

                <div className="flex items-center justify-between text-[11px] text-white/75 px-1 font-mono">
                  <span>Protection : ACTIVE</span>
                  <span>Auto-Exit : {settings.raidMode.autoExitMinutesWithoutActivity}m</span>
                </div>
              </div>
            </div>

            {/* Score Progress Bar */}
            <div className="mt-4 pt-4 border-t border-[var(--panel-border)]">
              <div className="flex justify-between text-[11px] text-white/75 mb-1.5 font-mono">
                <span>0 Safe</span>
                <span>20 Suspicious</span>
                <span>40 Elevated</span>
                <span>60 Dangerous</span>
                <span>80 Critical Raid</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-[var(--panel-border)]">
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
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-5 backdrop-blur-xl flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/75 mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Contrôles Manuels d'Urgence
              </h3>
              <p className="text-xs text-white/70">Interventions rapides applicables en un clic</p>
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
                onClick={handleToggleBlockInvites}
                disabled={isActionLoading}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  settings.raidMode.blockAllInvites
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                )}
              >
                <Radio className="w-3.5 h-3.5" />
                {settings.raidMode.blockAllInvites ? "Invites Bloquées (ON)" : "Invites Actives (OFF)"}
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

            {/* Bouton d'urgence / statut du blocage des invitations */}
            {settings.raidMode.blockAllInvites ? (
              <div className="mt-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2 text-rose-200">
                  <Radio className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                  <span className="text-[11px] leading-tight">
                    <strong>Invites bloquées :</strong> Nouveaux arrivants rejetés.
                  </span>
                </div>
                <button
                  onClick={handleForceUnblockInvites}
                  disabled={isActionLoading}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/30 hover:bg-rose-500/40 border border-rose-500/50 text-rose-100 font-bold transition-all text-[11px] shrink-0 cursor-pointer flex items-center gap-1 shadow-sm"
                  title="Force immédiatement le déblocage de toutes les invitations (OFF)"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Tout Enlever (OFF)
                </button>
              </div>
            ) : (
              <button
                onClick={handleForceUnblockInvites}
                disabled={isActionLoading}
                className="mt-2 w-full py-1.5 px-3 rounded-xl border border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.06] text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Garantit que toutes les invitations sont actives et débloquées"
              >
                <Unlock className="w-3 h-3 text-emerald-400" />
                Forcer Invitations en OFF (Débloqué)
              </button>
            )}

            <div className="flex items-center justify-between text-[11px] text-white/75 pt-1 border-t border-[var(--panel-border)] font-mono mt-2">
              <span>Salons verrouillés : {metrics.lockedChannelsCount}</span>
              <span>Quarantaine : {metrics.quarantinedMembersCount}</span>
            </div>
          </div>
        </div>

        {/* 2.2 LIVE RAID MONITOR (METRICS GRID) */}
        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 sm:p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-semibold text-white tracking-wide">Live Security Activity</h3>
              <span className="text-xs text-white/70">(Fenêtre glissante 60s)</span>
            </div>
            <span className="text-[11px] text-white/75 font-mono">Sync automatique 4s</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] flex flex-col justify-between">
              <span className="text-[11px] text-white/75 uppercase font-medium">Joins / min</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.joinsPerMinute}</span>
                <Users className="w-4 h-4 text-blue-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] flex flex-col justify-between">
              <span className="text-[11px] text-white/75 uppercase font-medium">Messages / min</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.messagesPerMinute}</span>
                <Hash className="w-4 h-4 text-emerald-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] flex flex-col justify-between">
              <span className="text-[11px] text-white/75 uppercase font-medium">Mentions / min</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.mentionsPerMinute}</span>
                <Radio className="w-4 h-4 text-amber-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] flex flex-col justify-between">
              <span className="text-[11px] text-white/75 uppercase font-medium">Bans / min</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.bansPerMinute}</span>
                <UserX className="w-4 h-4 text-red-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] flex flex-col justify-between">
              <span className="text-[11px] text-white/75 uppercase font-medium">Bots Ajoutés</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.botsAddedPerMinute}</span>
                <Sparkles className="w-4 h-4 text-purple-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] flex flex-col justify-between">
              <span className="text-[11px] text-white/75 uppercase font-medium">Salons Modifiés</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.channelsChangedPerMinute}</span>
                <Layers className="w-4 h-4 text-cyan-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] flex flex-col justify-between">
              <span className="text-[11px] text-white/75 uppercase font-medium">Rôles Modifiés</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.rolesChangedPerMinute}</span>
                <Shield className="w-4 h-4 text-indigo-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] flex flex-col justify-between">
              <span className="text-[11px] text-white/75 uppercase font-medium">Webhooks</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.webhooksChangedPerMinute}</span>
                <Terminal className="w-4 h-4 text-yellow-400/60" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] flex flex-col justify-between">
              <span className="text-[11px] text-white/75 uppercase font-medium">Départs / min</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white font-mono">{metrics.leavesPerMinute}</span>
                <Clock className="w-4 h-4 text-white/40" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] flex flex-col justify-between">
              <span className="text-[11px] text-white/75 uppercase font-medium">Score de Menace</span>
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
        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
          {/* Tab Navigation Headers */}
          <div className="flex items-center gap-1 p-2 border-b border-[var(--panel-border)] overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0",
                activeTab === "overview"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/75 hover:text-white hover:bg-white/5"
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
                  : "text-white/75 hover:text-white hover:bg-white/5"
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
                  : "text-white/75 hover:text-white hover:bg-white/5"
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
                  : "text-white/75 hover:text-white hover:bg-white/5"
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
                  : "text-white/75 hover:text-white hover:bg-white/5"
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
                  : "text-white/75 hover:text-white hover:bg-white/5"
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
                  : "text-white/75 hover:text-white hover:bg-white/5"
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
                  : "text-white/75 hover:text-white hover:bg-white/5"
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
                <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Protection contre les Join Raids</h4>
                    <p className="text-xs text-white/70">
                      Détecte les vagues massives d'arrivées et les bots programmés pour envahir le serveur.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.joinRaid.enabled}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setSettings((prev) => ({
                        ...prev,
                        joinRaid: { ...prev.joinRaid, enabled: next },
                      }));
                      toggle("Détection Join Raid", next, next ? "Protection active." : "Protection désactivée.");
                    }}
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
                      className="w-full bg-white/[0.04] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                    <span className="text-[10px] text-white/75 mt-1 block">Ex: 10 membres</span>
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
                      className="w-full bg-white/[0.04] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                    <span className="text-[10px] text-white/75 mt-1 block">Ex: 10 secondes</span>
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
                      className="w-full bg-white/[0.04] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                    <span className="text-[10px] text-white/75 mt-1 block">0 = désactivé</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--panel-border)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="penalizeNoAvatar"
                      checked={settings.joinRaid.penalizeNoAvatar}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setSettings((prev) => ({
                          ...prev,
                          joinRaid: { ...prev.joinRaid, penalizeNoAvatar: next },
                        }));
                        toggle("Pénalité sans avatar", next, next ? "Pénalité active." : "Pénalité désactivée.");
                      }}
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
                <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Protection Message & Spam Raid</h4>
                    <p className="text-xs text-white/70">
                      Surveille les cadences excessives de messages et la répétition en boucle de textes identiques.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.messageRaid.enabled}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setSettings((prev) => ({
                        ...prev,
                        messageRaid: { ...prev.messageRaid, enabled: next },
                      }));
                      toggle("Détection Spam Messages", next, next ? "Protection active." : "Protection désactivée.");
                    }}
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
                      className="w-full bg-white/[0.04] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
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
                      className="w-full bg-white/[0.04] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
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
                      className="w-full bg-white/[0.04] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>

                <ActionPicker
                  actions={settings.messageRaid.actions}
                  onChange={(next) => setSettings((prev) => ({ ...prev, messageRaid: { ...prev.messageRaid, actions: next } }))}
                />

                {settings.messageRaid.actions.includes("TIMEOUT") && (
                  <div className="max-w-xs">
                    <label className="text-xs font-medium text-white/70 block mb-1.5">Durée du timeout automatique</label>
                    <select
                      value={settings.messageRaid.timeoutDurationSeconds}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, messageRaid: { ...prev.messageRaid, timeoutDurationSeconds: parseInt(e.target.value) || 600 } }))
                      }
                      className="w-full bg-white/[0.04] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    >
                      <option value={60}>1 minute</option>
                      <option value={300}>5 minutes</option>
                      <option value={600}>10 minutes</option>
                      <option value={3600}>1 heure</option>
                      <option value={86400}>1 jour</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* 3. MENTION RAID TAB */}
            {activeTab === "mention" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Protection Mention Raid & Mass Pings</h4>
                    <p className="text-xs text-white/70">
                      Interdit les pings de masse (@everyone, @here, ou listes de dizaines de membres).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.mentionRaid.enabled}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setSettings((prev) => ({
                        ...prev,
                        mentionRaid: { ...prev.mentionRaid, enabled: next },
                      }));
                      toggle("Détection Mass Mentions", next, next ? "Protection active." : "Protection désactivée.");
                    }}
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
                      className="w-full bg-white/[0.04] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <input
                      type="checkbox"
                      id="blockEveryone"
                      checked={settings.mentionRaid.blockEveryoneHere}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setSettings((prev) => ({
                          ...prev,
                          mentionRaid: { ...prev.mentionRaid, blockEveryoneHere: next },
                        }));
                        toggle("Blocage @everyone / @here", next, next ? "Protection active." : "Protection désactivée.");
                      }}
                      className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                    />
                    <label htmlFor="blockEveryone" className="text-xs text-white/80 ml-2 cursor-pointer">
                      Bloquer tout non-staff tentant @everyone ou @here (sanctions selon les actions ci-dessous)
                    </label>
                  </div>
                </div>

                <ActionPicker
                  actions={settings.mentionRaid.actions}
                  onChange={(next) => setSettings((prev) => ({ ...prev, mentionRaid: { ...prev.mentionRaid, actions: next } }))}
                />
              </div>
            )}

            {/* 4. BOT RAID TAB */}
            {activeTab === "bots" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Protection Bot Raid</h4>
                    <p className="text-xs text-white/70">
                      Empêche l'ajout de faux bots ou bots malveillants par des utilisateurs compromis.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.botRaid.enabled}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setSettings((prev) => ({
                        ...prev,
                        botRaid: { ...prev.botRaid, enabled: next },
                      }));
                      toggle("Protection Bot Raid", next, next ? "Protection active." : "Protection désactivée.");
                    }}
                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Expulsion automatique des bots non-whitelistés
                    </span>
                    <span className="text-[11px] text-white/75">
                      Tout bot rejoignant sans figurer dans la whitelist sera expulsé sur-le-champ.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.botRaid.blockUnwhitelistedBots}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setSettings((prev) => ({
                        ...prev,
                        botRaid: { ...prev.botRaid, blockUnwhitelistedBots: next },
                      }));
                      toggle("Expulsion des bots non-whitelistés", next, next ? "Expulsion auto active." : "Expulsion auto désactivée.");
                    }}
                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 5. SERVER NUKE TAB */}
            {activeTab === "nuke" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Protection Server Nuke & Anti-Détournement</h4>
                    <p className="text-xs text-white/70">
                      Détecte les suppressions en rafale de salons, de rôles ou l'attribution illégitime de permissions d'Admin.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.serverNuke.enabled}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setSettings((prev) => ({
                        ...prev,
                        serverNuke: { ...prev.serverNuke, enabled: next },
                      }));
                      toggle("Protection Anti-Nuke", next, next ? "Protection active." : "Protection désactivée.");
                    }}
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
                      className="w-full bg-white/[0.04] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
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
                      className="w-full bg-white/[0.04] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
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
                      className="w-full bg-white/[0.04] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
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
                <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Paliers d'ancienneté de compte</h4>
                    <p className="text-xs text-white/70">
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
                      className="p-3 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] flex items-center justify-between"
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
                <div className="pb-3 border-b border-[var(--panel-border)]">
                  <h4 className="text-sm font-semibold text-white">Gestion de la Whitelist & Confiance</h4>
                  <p className="text-xs text-white/70">
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
                      className="w-full bg-white/[0.04] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500/50"
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
                      className="w-full bg-white/[0.04] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 8. INCIDENTS & INVESTIGATION TAB */}
            {activeTab === "incidents" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-[var(--panel-border)] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Journal des Incidents Anti-Raid</h4>
                    <p className="text-xs text-white/70">Historique des attaques et dossiers d'investigation</p>
                  </div>
                  <span className="text-xs text-white/70 font-mono">{incidents.length} incident(s) enregistré(s)</span>
                </div>

                {incidents.length === 0 ? (
                  <div className="py-12 text-center text-white/70 text-xs">
                    Aucun incident enregistré sur ce serveur.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {incidents.map((inc) => (
                      <div
                        key={inc.id}
                        className="p-4 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] hover:border-[var(--input-border-hover)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-white/90">#{inc.id}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold">
                              {inc.type}
                            </span>
                            <span className="text-xs text-white/70 font-mono">
                              Max Risk: {inc.maxRiskScore}/100
                            </span>
                          </div>
                          <p className="text-xs text-white/70">{inc.triggerReason}</p>
                          <span className="text-[11px] text-white/75 font-mono mt-1 block">
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
          <div className="w-full max-w-2xl bg-[var(--bg-surface-elevated)] border border-[var(--panel-border)] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto os-scroll">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-mono font-bold text-sm">
                  🔍
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Dossier d'Investigation #{selectedIncident.id}</h3>
                  <span className="text-xs text-white/70">Type : {selectedIncident.type}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-[var(--panel-border)]">
                <span className="text-white/75 block text-[10px]">MAX RISK SCORE</span>
                <span className="text-red-400 font-bold text-base">{selectedIncident.maxRiskScore}/100</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-[var(--panel-border)]">
                <span className="text-white/75 block text-[10px]">MEMBRES TOUCHÉS</span>
                <span className="text-white font-bold text-base">{selectedIncident.affectedCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-[var(--panel-border)]">
                <span className="text-white/75 block text-[10px]">RÉSOLUTION</span>
                <span className="text-emerald-400 font-bold text-base">{selectedIncident.status}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/75 mb-1.5">
                Signaux Déclencheurs
              </h4>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-[var(--panel-border)] text-xs text-white/70 space-y-1">
                {selectedIncident.triggerSignals.map((sig, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    {sig}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/75 mb-1.5">
                Membres Impliqués ({selectedIncident.involvedMembers.length})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto os-scroll">
                {selectedIncident.involvedMembers.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white/[0.02] border border-[var(--panel-border)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">{m.userTag}</span>
                      <span className="text-[10px] text-white/75 font-mono ml-2">ID: {m.userId}</span>
                      <div className="text-[10px] text-white/75">
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

            <div className="pt-3 border-t border-[var(--panel-border)] flex justify-end">
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
          <div className="w-full max-w-md bg-[var(--bg-surface-elevated)] border border-[var(--panel-border)] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
            <p className="text-xs text-white/75">{confirmModal.description}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium"
              >
                Annuler
              </button>
              <button
                onClick={confirmModal.action}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-sm"
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
