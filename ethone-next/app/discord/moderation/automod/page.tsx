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
  Filter,
  Play,
  Check,
  Ban,
  VolumeX,
  MessageSquare,
  AtSign,
  Link2,
  Code,
  AlertCircle,
  HelpCircle,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import DiscordIcon from "@/components/DiscordIcon";
import { cn } from "@/lib/utils";

// ==========================================
// TYPES AUTOMOD 2.0
// ==========================================
type AutoModRiskLevel = "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type AutoModAction =
  | "DELETE"
  | "WARN"
  | "STRIKE"
  | "TIMEOUT"
  | "KICK"
  | "BAN"
  | "QUARANTINE"
  | "LOCK_CHANNEL"
  | "ALERT_STAFF"
  | "LOG";

type MatchLogic = "ALL" | "ANY" | "NOT";

type ConditionType =
  | "SPAM"
  | "FLOOD"
  | "LINK"
  | "INVITE"
  | "MENTION"
  | "GHOST_PING"
  | "CAPS"
  | "KEYWORD"
  | "REGEX"
  | "PROFILE"
  | "MIN_RISK_SCORE";

interface RuleCondition {
  id: string;
  type: ConditionType;
  negate?: boolean;
  minScore?: number;
  pattern?: string;
  exactMatch?: boolean;
}

interface CustomRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  logic: MatchLogic;
  conditions: RuleCondition[];
  exemptRoles: string[];
  exemptChannels: string[];
  exemptUsers: string[];
  actions: AutoModAction[];
  timeoutDurationSeconds?: number;
  addStrikesCount?: number;
  alertStaff: boolean;
  alertChannelId?: string;
}

interface ProgressiveSanctionStep {
  strikeCount: number;
  action: AutoModAction;
  durationSeconds?: number;
}

interface StrikeConfig {
  enabled: boolean;
  expirationDays: number;
  progressiveSteps: ProgressiveSanctionStep[];
}

interface AutoModConfig {
  enabled: boolean;
  smartMode: boolean;
  alertChannelId?: string;
  staffMentionRoleId?: string;
  exemptRoles: string[];
  exemptChannels: string[];
  exemptUsers: string[];
  spam: {
    enabled: boolean;
    maxDuplicates: number;
    timeWindowSeconds: number;
    similarityThreshold: number;
    actions: AutoModAction[];
  };
  flood: {
    enabled: boolean;
    maxMessagesPerWindow: number;
    timeWindowSeconds: number;
    actions: AutoModAction[];
  };
  links: {
    enabled: boolean;
    allowedDomains: string[];
    blockAllExceptAllowed: boolean;
    actions: AutoModAction[];
  };
  invites: {
    enabled: boolean;
    allowedGuildIds: string[];
    allowedInviteCodes: string[];
    actions: AutoModAction[];
  };
  mentions: {
    enabled: boolean;
    maxMentionsPerMessage: number;
    blockEveryoneHere: boolean;
    actions: AutoModAction[];
  };
  ghostPing: {
    enabled: boolean;
    windowSeconds: number;
    actions: AutoModAction[];
  };
  caps: {
    enabled: boolean;
    minPercentage: number;
    minMessageLength: number;
    actions: AutoModAction[];
  };
  keywords: {
    enabled: boolean;
    blacklistedWords: string[];
    wildcardsEnabled: boolean;
    actions: AutoModAction[];
  };
  regex: {
    enabled: boolean;
    patterns: string[];
    actions: AutoModAction[];
  };
  profiles: {
    enabled: boolean;
    blockDefaultAvatars: boolean;
    minAccountAgeDays: number;
    suspiciousNamePatterns: string[];
    actions: AutoModAction[];
  };
  strikes: StrikeConfig;
}

interface AutoModIncident {
  id: string;
  guildId: string;
  userId: string;
  userTag: string;
  channelId: string;
  channelName: string;
  messageContent?: string;
  triggeredRules: string[];
  triggeredDetectors: string[];
  totalRiskScore: number;
  riskLevel: AutoModRiskLevel;
  actionsTaken: AutoModAction[];
  strikesAdded?: number;
  timestamp: string;
}

interface UserStrikeRecord {
  id: string;
  guildId: string;
  userId: string;
  reason: string;
  addedBy: string;
  createdAt: string;
  expiresAt: string;
  active: boolean;
}

interface UserModerationProfile {
  userId: string;
  activeStrikesCount: number;
  activeStrikes: UserStrikeRecord[];
  strikeHistory: UserStrikeRecord[];
  incidentCount: number;
  recentIncidents: AutoModIncident[];
  currentCalculatedRisk: number;
  riskLevel: AutoModRiskLevel;
}

interface SandboxTestResult {
  matchedDetectors: string[];
  matchedCustomRules: string[];
  totalRiskScore: number;
  riskLevel: AutoModRiskLevel;
  actionsToExecute: AutoModAction[];
  wouldAddStrikes: number;
  explanation: string[];
}

// Configuration par défaut
const DEFAULT_AUTOMOD_CONFIG: AutoModConfig = {
  enabled: true,
  smartMode: true,
  alertChannelId: "",
  staffMentionRoleId: "",
  exemptRoles: [],
  exemptChannels: [],
  exemptUsers: [],
  spam: {
    enabled: true,
    maxDuplicates: 3,
    timeWindowSeconds: 10,
    similarityThreshold: 85,
    actions: ["DELETE", "WARN", "STRIKE"],
  },
  flood: {
    enabled: true,
    maxMessagesPerWindow: 5,
    timeWindowSeconds: 5,
    actions: ["DELETE", "TIMEOUT"],
  },
  links: {
    enabled: true,
    allowedDomains: ["youtube.com", "youtu.be", "twitter.com", "x.com", "github.com", "tenor.com", "giphy.com"],
    blockAllExceptAllowed: false,
    actions: ["DELETE", "WARN"],
  },
  invites: {
    enabled: true,
    allowedGuildIds: [],
    allowedInviteCodes: [],
    actions: ["DELETE", "WARN", "STRIKE"],
  },
  mentions: {
    enabled: true,
    maxMentionsPerMessage: 4,
    blockEveryoneHere: true,
    actions: ["DELETE", "WARN", "TIMEOUT"],
  },
  ghostPing: {
    enabled: true,
    windowSeconds: 15,
    actions: ["ALERT_STAFF", "WARN"],
  },
  caps: {
    enabled: true,
    minPercentage: 70,
    minMessageLength: 10,
    actions: ["DELETE", "WARN"],
  },
  keywords: {
    enabled: true,
    blacklistedWords: ["free nitro", "discord.gift", "steam gift", "airdrop", "crypto giveaway", "token grabber"],
    wildcardsEnabled: true,
    actions: ["DELETE", "WARN", "STRIKE"],
  },
  regex: {
    enabled: true,
    patterns: ["(discord\\.gg|discord\\.com\\/invite)\\/[a-zA-Z0-9]+", "https?:\\/\\/t\\.me\\/[a-zA-Z0-9_]+"],
    actions: ["DELETE", "TIMEOUT"],
  },
  profiles: {
    enabled: true,
    blockDefaultAvatars: false,
    minAccountAgeDays: 1,
    suspiciousNamePatterns: ["announcement", "moderator", "admin_help", "support_discord"],
    actions: ["QUARANTINE", "ALERT_STAFF"],
  },
  strikes: {
    enabled: true,
    expirationDays: 7,
    progressiveSteps: [
      { strikeCount: 1, action: "WARN" },
      { strikeCount: 2, action: "TIMEOUT", durationSeconds: 300 },
      { strikeCount: 3, action: "TIMEOUT", durationSeconds: 3600 },
      { strikeCount: 4, action: "TIMEOUT", durationSeconds: 86400 },
      { strikeCount: 5, action: "KICK" },
      { strikeCount: 6, action: "BAN" },
    ],
  },
};

const RISK_BADGES: Record<
  AutoModRiskLevel,
  { text: string; bg: string; border: string; label: string; icon: string }
> = {
  SAFE: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    label: "🟢 SAFE",
    icon: "🟢",
  },
  LOW: {
    text: "text-lime-400",
    bg: "bg-lime-500/10",
    border: "border-lime-500/30",
    label: "🟡 FAIBLE",
    icon: "🟡",
  },
  MEDIUM: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    label: "🟠 MOYEN",
    icon: "🟠",
  },
  HIGH: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    label: "🔴 ÉLEVÉ",
    icon: "🔴",
  },
  CRITICAL: {
    text: "text-rose-500",
    bg: "bg-rose-500/20",
    border: "border-rose-500/50",
    label: "🔥 CRITIQUE",
    icon: "🔥",
  },
};

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

const ALL_ACTIONS: { id: AutoModAction; label: string; desc: string; icon: any }[] = [
  { id: "DELETE", label: "Supprimer", desc: "Supprime le message enfreignant", icon: Trash2 },
  { id: "WARN", label: "Avertir", desc: "Envoie un avertissement en DM", icon: AlertCircle },
  { id: "STRIKE", label: "Ajouter Strike", desc: "Attribue un avertissement formel", icon: ShieldAlert },
  { id: "TIMEOUT", label: "Exclusion temporaire", desc: "Empêche l'utilisateur d'écrire", icon: VolumeX },
  { id: "QUARANTINE", label: "Mise en quarantaine", desc: "Isole l'utilisateur dans un salon restreint", icon: Lock },
  { id: "LOCK_CHANNEL", label: "Verrouiller salon", desc: "Gèle le salon temporairement", icon: Lock },
  { id: "KICK", label: "Expulser", desc: "Éjecte le membre du serveur", icon: UserX },
  { id: "BAN", label: "Bannir", desc: "Bannit le membre définitivement", icon: Ban },
  { id: "ALERT_STAFF", label: "Alerter Staff", desc: "Notifie les modérateurs dans le salon dédié", icon: AlertTriangle },
  { id: "LOG", label: "Journaliser", desc: "Enregistre dans les logs de modération", icon: FileText },
];

export default function AutoModCommandCenterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { profile, loading: discordLoading } = useDiscordOAuth();

  // Filtrer les serveurs où l'utilisateur est admin ou propriétaire
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

  // Onglet principal
  const [activeTab, setActiveTab] = useState<
    "overview" | "builder" | "detectors" | "strikes" | "tester"
  >("overview");

  // Détecteur actif dans l'onglet Detectors
  const [activeDetector, setActiveDetector] = useState<
    "spam" | "flood" | "links" | "invites" | "mentions" | "ghostPing" | "caps" | "keywords" | "regex" | "profiles"
  >("spam");

  // État des données
  const [config, setConfig] = useState<AutoModConfig>(DEFAULT_AUTOMOD_CONFIG);
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [incidents, setIncidents] = useState<AutoModIncident[]>([]);
  const [overviewMetrics, setOverviewMetrics] = useState({
    avgRiskScore: 12,
    riskLevel: "SAFE" as AutoModRiskLevel,
    rulesCount: 0,
    actionsCount: 0,
    strikesCount: 0,
    detectionsCount: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // État du Rule Builder
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);

  // État du Rule Tester Sandbox
  const [sandboxMessage, setSandboxMessage] = useState("Rejoins vite mon serveur discord.gg/cheat pour du free nitro !");
  const [sandboxUserId, setSandboxUserId] = useState("123456789012345678");
  const [sandboxChannelId, setSandboxChannelId] = useState("987654321098765432");
  const [sandboxResult, setSandboxResult] = useState<SandboxTestResult | null>(null);
  const [isTestingSandbox, setIsTestingSandbox] = useState(false);

  // État du User Profile Drawer
  const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);
  const [inspectedProfile, setInspectedProfile] = useState<UserModerationProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Nouveaux ajouts dans les listes (inputs temporaires)
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [newDomainInput, setNewDomainInput] = useState("");
  const [newRegexInput, setNewRegexInput] = useState("");

  // Récupérer les données depuis le serveur
  const fetchAllData = useCallback(async () => {
    if (!selectedGuild) return;
    setIsLoading(true);
    if (BOT_API_URL) {
      try {
        // 1. Overview
        const ovRes = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/automod/overview`);
        if (ovRes.ok) {
          const ovData = await ovRes.json();
          setOverviewMetrics({
            avgRiskScore: ovData.avgRiskScore || 10,
            riskLevel: ovData.riskLevel || "SAFE",
            rulesCount: ovData.rulesCount || 0,
            actionsCount: ovData.actionsCount || 0,
            strikesCount: ovData.strikesCount || 0,
            detectionsCount: ovData.detectionsCount || 0,
          });
        }

        // 2. Config
        const cfgRes = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/automod/config`);
        if (cfgRes.ok) {
          const cfgData = await cfgRes.json();
          if (cfgData.config) {
            setConfig(cfgData.config);
          }
        }

        // 3. Rules
        const rulesRes = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/automod/rules`);
        if (rulesRes.ok) {
          const rulesData = await rulesRes.json();
          if (rulesData.rules) {
            setRules(rulesData.rules);
          }
        }

        // 4. Incidents
        const incRes = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/automod/incidents?limit=25`);
        if (incRes.ok) {
          const incData = await incRes.json();
          if (incData.incidents) {
            setIncidents(incData.incidents);
          }
        }
        setIsLoading(false);
        return;
      } catch {
        // Fallback localStorage si bot local ou offline
      }
    }
    try {
      const savedCfg = localStorage.getItem(`ethone:automod:cfg:${selectedGuild.id}`);
      if (savedCfg) setConfig(JSON.parse(savedCfg));
      const savedRules = localStorage.getItem(`ethone:automod:rules:${selectedGuild.id}`);
      if (savedRules) setRules(JSON.parse(savedRules));
    } catch {}
    setIsLoading(false);
  }, [selectedGuild]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Sauvegarder la configuration
  const handleSaveConfig = async () => {
    if (!selectedGuild) return;
    if (!BOT_API_URL) {
      try {
        localStorage.setItem(`ethone:automod:cfg:${selectedGuild.id}`, JSON.stringify(config));
      } catch {}
      success("AutoMod mis à jour", "Mode démo : Les configurations ont été enregistrées localement.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/automod/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        success("AutoMod mis à jour", "Les configurations des détecteurs et strikes ont été synchronisées.");
      } else {
        showError("Erreur", "Impossible de synchroniser avec le bot, sauvegarde locale activée.");
      }
      localStorage.setItem(`ethone:automod:cfg:${selectedGuild.id}`, JSON.stringify(config));
    } catch (err: any) {
      localStorage.setItem(`ethone:automod:cfg:${selectedGuild.id}`, JSON.stringify(config));
      success("Sauvegarde locale effectuée", "Vos modifications sont conservées en local.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Global AutoMod
  const handleToggleGlobal = async () => {
    const nextState = !config.enabled;
    setConfig((prev) => ({ ...prev, enabled: nextState }));
    if (selectedGuild) {
      try {
        await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/automod/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: nextState }),
        });
      } catch {}
    }
    success(nextState ? "AutoMod activé" : "AutoMod désactivé", `La protection globale est désormais ${nextState ? "en fonction" : "en pause"}.`);
  };

  // Toggle Smart Mode
  const handleToggleSmartMode = async () => {
    const nextState = !config.smartMode;
    setConfig((prev) => ({ ...prev, smartMode: nextState }));
    if (selectedGuild) {
      try {
        await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/automod/smart-mode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ smartMode: nextState }),
        });
      } catch {}
    }
    success(nextState ? "Smart Mode activé" : "Smart Mode standard", nextState ? "La sensibilité s'ajuste automatiquement aux alertes Anti-Raid." : "Sensibilité fixe appliquée.");
  };

  // Exécuter le Rule Tester (Sandbox)
  const handleRunSandboxTest = async () => {
    if (!sandboxMessage.trim() || !selectedGuild) return;
    setIsTestingSandbox(true);
    setSandboxResult(null);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/automod/test-rule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageContent: sandboxMessage,
          userId: sandboxUserId || "123456789012345678",
          channelId: sandboxChannelId || "987654321098765432",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          setSandboxResult(data.result);
          success("Test de simulation terminé", `Score calculé : ${data.result.totalRiskScore}/100`);
          return;
        }
      }
      throw new Error("Erreur de test");
    } catch {
      // Simulation locale de secours
      const isInvite = /discord(?:\.gg|(?:app)?\.com\/invite)\/[a-zA-Z0-9]+/i.test(sandboxMessage);
      const isCaps = sandboxMessage.length > 8 && (sandboxMessage.replace(/[^A-Z]/g, "").length / sandboxMessage.length) > 0.7;
      const isLink = /https?:\/\//i.test(sandboxMessage);
      const matchedDetectors: string[] = [];
      const explanations: string[] = [];
      let score = 0;

      if (isInvite) {
        matchedDetectors.push("InviteDetector");
        explanations.push("InviteDetector : Invitation Discord non autorisée détectée");
        score += 35;
      }
      if (isCaps) {
        matchedDetectors.push("CapsDetector");
        explanations.push("CapsDetector : Taux de majuscules excessif (>70%)");
        score += 15;
      }
      if (isLink && !isInvite) {
        matchedDetectors.push("LinkDetector");
        explanations.push("LinkDetector : Lien externe non répertorié");
        score += 20;
      }

      setSandboxResult({
        matchedDetectors,
        matchedCustomRules: [],
        totalRiskScore: score,
        riskLevel: score >= 60 ? "HIGH" : score >= 35 ? "MEDIUM" : score > 0 ? "LOW" : "SAFE",
        actionsToExecute: score > 30 ? ["DELETE", "WARN", "STRIKE"] : score > 0 ? ["DELETE"] : [],
        wouldAddStrikes: score > 30 ? 1 : 0,
        explanation: explanations.length > 0 ? explanations : ["Aucune infraction détectée. Message propre."],
      });
      success("Simulation locale effectuée", "Résultats calculés en mode sandbox.");
    } finally {
      setIsTestingSandbox(false);
    }
  };

  // Inspecter un profil utilisateur
  const handleInspectUser = async (userId: string) => {
    if (!selectedGuild || !userId) return;
    setInspectedUserId(userId);
    setIsLoadingProfile(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/automod/incidents/user/${userId}/profile`);
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setInspectedProfile(data.profile);
          return;
        }
      }
      throw new Error("Profil indisponible");
    } catch {
      // Profil de secours
      const userIncidents = incidents.filter((i) => i.userId === userId);
      setInspectedProfile({
        userId,
        activeStrikesCount: 1,
        activeStrikes: [
          {
            id: "STRIKE-MOCK",
            guildId: selectedGuild.id,
            userId,
            reason: "Infraction répétée AutoMod",
            addedBy: "AUTOMOD",
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
            active: true,
          },
        ],
        strikeHistory: [],
        incidentCount: userIncidents.length,
        recentIncidents: userIncidents,
        currentCalculatedRisk: userIncidents.length * 20,
        riskLevel: userIncidents.length >= 3 ? "HIGH" : userIncidents.length >= 1 ? "MEDIUM" : "LOW",
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Révoquer les strikes d'un utilisateur (Pardon)
  const handleClearUserStrikes = async (userId: string) => {
    if (!selectedGuild) return;
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/automod/strikes/user/${userId}`, {
        method: "DELETE",
      });
      success("Strikes révoqués", `Tous les strikes actifs de ${userId} ont été effacés.`);
      handleInspectUser(userId);
    } catch {
      showError("Erreur", "Impossible de révoquer les strikes sur le bot.");
    }
  };

  // Gestion des Règles Personnalisées
  const handleSaveCustomRule = async (ruleToSave: CustomRule) => {
    if (!selectedGuild) return;
    try {
      const isExisting = rules.some((r) => r.id === ruleToSave.id);
      const url = isExisting
        ? `${BOT_API_URL}/api/guilds/${selectedGuild.id}/automod/rules/${ruleToSave.id}`
        : `${BOT_API_URL}/api/guilds/${selectedGuild.id}/automod/rules`;
      const method = isExisting ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleToSave),
      });

      if (res.ok) {
        const updatedRules = isExisting
          ? rules.map((r) => (r.id === ruleToSave.id ? ruleToSave : r))
          : [...rules, ruleToSave];
        setRules(updatedRules);
        localStorage.setItem(`ethone:automod:rules:${selectedGuild.id}`, JSON.stringify(updatedRules));
        success("Règle sauvegardée", `La règle « ${ruleToSave.name} » est opérationnelle.`);
        setEditingRule(null);
        setIsCreatingRule(false);
      } else {
        throw new Error("Échec API");
      }
    } catch {
      const updatedRules = rules.some((r) => r.id === ruleToSave.id)
        ? rules.map((r) => (r.id === ruleToSave.id ? ruleToSave : r))
        : [...rules, ruleToSave];
      setRules(updatedRules);
      localStorage.setItem(`ethone:automod:rules:${selectedGuild.id}`, JSON.stringify(updatedRules));
      success("Règle enregistrée en local", `Règle « ${ruleToSave.name} » mise à jour.`);
      setEditingRule(null);
      setIsCreatingRule(false);
    }
  };

  const handleDeleteCustomRule = async (ruleId: string) => {
    if (!selectedGuild) return;
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/automod/rules/${ruleId}`, {
        method: "DELETE",
      });
      const filtered = rules.filter((r) => r.id !== ruleId);
      setRules(filtered);
      localStorage.setItem(`ethone:automod:rules:${selectedGuild.id}`, JSON.stringify(filtered));
      success("Règle supprimée", "La règle a été retirée du moteur.");
    } catch {
      const filtered = rules.filter((r) => r.id !== ruleId);
      setRules(filtered);
      localStorage.setItem(`ethone:automod:rules:${selectedGuild.id}`, JSON.stringify(filtered));
      success("Règle supprimée en local", "La règle a été retirée.");
    }
  };

  const startNewRule = () => {
    const newRule: CustomRule = {
      id: `rule_${Date.now().toString(36)}`,
      name: "Nouvelle Règle",
      description: "Description de la protection",
      enabled: true,
      priority: rules.length + 1,
      logic: "ALL",
      conditions: [
        {
          id: `cond_${Date.now()}`,
          type: "KEYWORD",
          pattern: "scam, hack, token",
        },
      ],
      exemptRoles: [],
      exemptChannels: [],
      exemptUsers: [],
      actions: ["DELETE", "WARN", "STRIKE"],
      addStrikesCount: 1,
      alertStaff: true,
    };
    setEditingRule(newRule);
    setIsCreatingRule(true);
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-[#07080A] text-zinc-100 font-sans">
      {/* HEADER FIXE */}
      <header className="shrink-0 border-b border-white/[0.08] bg-black/40 backdrop-blur-xl px-4 sm:px-6 py-3.5 z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Titre & Navigation Retour */}
          <div className="flex items-center gap-3">
            <Link
              href={selectedGuild ? `/discord?guildId=${selectedGuild.id}` : "/discord"}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Retour au dashboard Discord"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 shadow-inner">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold tracking-tight text-white">AutoMod 2.0</h1>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Smart Engine
                  </span>
                  {config.smartMode && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> Anti-Raid Linked
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">
                  Détection intelligente, multi-conditions, sanctions progressives & sandbox de test.
                </p>
              </div>
            </div>
          </div>

          {/* Actions Header (Sélecteur de serveur, Synchro, Sauvegarde) */}
          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
            {/* Sélecteur de Serveur */}
            {manageableGuilds.length > 0 && (
              <div className="relative">
                <select
                  value={selectedGuild?.id || ""}
                  onChange={(e) => {
                    const g = manageableGuilds.find((item) => item.id === e.target.value);
                    if (g) setSelectedGuild(g);
                  }}
                  className="h-8 rounded-xl border border-white/10 bg-zinc-900/90 px-3 pr-8 text-xs font-medium text-white outline-none hover:border-white/20 focus:border-amber-500 appearance-none cursor-pointer"
                >
                  {manageableGuilds.map((g) => (
                    <option key={g.id} value={g.id} className="bg-zinc-900 text-white">
                      {g.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              </div>
            )}

            {/* Bouton Synchro */}
            <button
              onClick={fetchAllData}
              disabled={isLoading}
              className="flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
              title="Rafraîchir les métriques et configurations"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-amber-400")} />
              <span className="hidden md:inline">Actualiser</span>
            </button>

            {/* Bouton Toggle Global */}
            <button
              onClick={handleToggleGlobal}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all active:scale-95",
                config.enabled
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
              )}
            >
              <div className={cn("h-2 w-2 rounded-full", config.enabled ? "bg-emerald-400 animate-pulse" : "bg-red-500")} />
              <span>{config.enabled ? "Actif" : "En pause"}</span>
            </button>

            {/* Bouton Sauvegarde Principale */}
            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="flex h-8 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-3 text-xs font-semibold text-white shadow-lg shadow-amber-500/10 hover:from-amber-500 hover:to-orange-500 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? "Enregistrement..." : "Enregistrer"}</span>
            </button>
          </div>
        </div>

        {/* BARRE D'ONGLETS */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {[
            { id: "overview", label: "Vue d'ensemble & Monitor", icon: Activity },
            { id: "builder", label: `Rule Builder (${rules.length})`, icon: Layers },
            { id: "detectors", label: "10 Détecteurs Intégrés", icon: Sliders },
            { id: "strikes", label: "Paliers & Strikes", icon: ShieldAlert },
            { id: "tester", label: "Sandbox de Test", icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer",
                  isCurrent
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isCurrent ? "text-amber-400" : "text-zinc-400")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* CONTENEUR PRINCIPAL SCROLLABLE */}
      <main className="flex-1 min-h-0 overflow-y-auto pb-36 px-4 sm:px-6 py-6 scrollbar-thin scrollbar-thumb-white/10">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ======================================================== */}
          {/* ONGLET 1: OVERVIEW & LIVE MONITOR                        */}
          {/* ======================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* CARTES DE STATISTIQUES EN DIRECT */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Score Moyen de Risque */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium">Niveau de Menace</span>
                    <span className="text-xs">{RISK_BADGES[overviewMetrics.riskLevel].icon}</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      {overviewMetrics.avgRiskScore}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">/100</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                        RISK_BADGES[overviewMetrics.riskLevel].bg,
                        RISK_BADGES[overviewMetrics.riskLevel].text,
                        RISK_BADGES[overviewMetrics.riskLevel].border
                      )}
                    >
                      {RISK_BADGES[overviewMetrics.riskLevel].label}
                    </span>
                    <span className="text-[11px] text-zinc-400">sur les derniers messages</span>
                  </div>
                </div>

                {/* 2. Smart Mode & Anti-Raid Link */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium">Mode Intelligent</span>
                    <Sparkles className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                      {config.smartMode ? "Interconnecté" : "Standard"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400">
                      {config.smartMode ? "Sensibilité adaptative" : "Seuils manuels fixes"}
                    </span>
                    <button
                      onClick={handleToggleSmartMode}
                      className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 underline"
                    >
                      Basculer
                    </button>
                  </div>
                </div>

                {/* 3. Règles & Sanctions Exécutées */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium">Actions Exécutées</span>
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      {overviewMetrics.actionsCount}
                    </span>
                    <span className="text-xs text-zinc-500">sanctions</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <span>{rules.filter((r) => r.enabled).length} règles actives</span>
                  </div>
                </div>

                {/* 4. Strikes & Avertissements Actifs */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium">Strikes en Cours</span>
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      {overviewMetrics.strikesCount}
                    </span>
                    <span className="text-xs text-zinc-500">actifs</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <span>Expire après {config.strikes.expirationDays} jours</span>
                  </div>
                </div>
              </div>

              {/* BANNIÈRE PASSERELLE ANTI-RAID 2.0 */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-600/10 p-4 shadow-lg shadow-blue-500/5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      Synergie Bidirectionnelle avec le Centre Anti-Raid 2.0
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        EventBus Connecté
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
                      Si un membre accumule un score de risque AutoMod supérieur à 60, une alerte immédiate est transmise au moteur Anti-Raid. Inversement, en cas de raid détecté sur le serveur, AutoMod passe automatiquement en mode ultra-sensible.
                    </p>
                  </div>
                </div>
                <Link
                  href={selectedGuild ? `/discord/security/anti-raid?guildId=${selectedGuild.id}` : "/discord/security/anti-raid"}
                  className="flex h-8 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-500 transition-all active:scale-95"
                >
                  <span>Ouvrir Anti-Raid</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* FLUX DES INFRACTIONS & INCIDENTS EN DIRECT */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-400" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                      Journal des Infractions en Direct ({incidents.length})
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchAllData}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Rafraîchir</span>
                    </button>
                  </div>
                </div>

                {incidents.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mx-auto mb-2" />
                    <p className="text-xs font-medium text-zinc-300">Aucune infraction récente enregistrée</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Le serveur est calme et les messages sont conformes.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06] overflow-hidden">
                    {incidents.map((inc) => {
                      const badge = RISK_BADGES[inc.riskLevel] || RISK_BADGES.SAFE;
                      return (
                        <div
                          key={inc.id}
                          className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/[0.01] transition-colors rounded-lg px-2"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-base mt-0.5">{badge.icon}</span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-white">{inc.userTag}</span>
                                <span className="text-[10px] font-mono text-zinc-500">#{inc.channelName}</span>
                                <span
                                  className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                                    badge.bg,
                                    badge.text,
                                    badge.border
                                  )}
                                >
                                  Score : {inc.totalRiskScore}/100
                                </span>
                                {inc.strikesAdded && inc.strikesAdded > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    +{inc.strikesAdded} Strike
                                  </span>
                                )}
                              </div>
                              {inc.messageContent && (
                                <p className="text-xs text-zinc-300 font-mono bg-black/40 rounded px-2 py-1 mt-1.5 border border-white/5 line-clamp-1">
                                  {inc.messageContent}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500 flex-wrap">
                                <span>Règles/Détecteurs :</span>
                                {[...inc.triggeredDetectors, ...inc.triggeredRules].map((t, idx) => (
                                  <span key={idx} className="bg-white/5 text-zinc-300 px-1.5 py-0.2 rounded border border-white/5 font-mono">
                                    {t}
                                  </span>
                                ))}
                                <span>•</span>
                                <span>{new Date(inc.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions et Bouton inspection */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <div className="flex items-center gap-1">
                              {inc.actionsTaken.map((act) => (
                                <span
                                  key={act}
                                  className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/10"
                                >
                                  {act}
                                </span>
                              ))}
                            </div>
                            <button
                              onClick={() => handleInspectUser(inc.userId)}
                              className="flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] text-zinc-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                              title="Inspecter le dossier de ce membre"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Profil</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 2: RULE BUILDER (RÈGLES PERSONNALISÉES)           */}
          {/* ======================================================== */}
          {activeTab === "builder" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* En-tête de la section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white">Moteur de Règles Personnalisées</h2>
                  <p className="text-xs text-zinc-400">
                    Créez des chaînes de détection complexes avec opérateurs logiques (ALL, ANY, NOT), conditions multi-triggers et sanctions automatiques.
                  </p>
                </div>
                <button
                  onClick={startNewRule}
                  className="flex h-8 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-3.5 text-xs font-semibold text-white hover:from-amber-500 hover:to-orange-500 transition-all active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nouvelle Règle</span>
                </button>
              </div>

              {/* Formulaire d'Édition de Règle */}
              {(isCreatingRule || editingRule) && editingRule && (
                <div className="rounded-2xl border border-amber-500/30 bg-zinc-900/90 p-5 shadow-2xl shadow-amber-500/5 space-y-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-amber-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        {isCreatingRule ? "Création d'une nouvelle règle" : `Modifier la règle : ${editingRule.name}`}
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        setEditingRule(null);
                        setIsCreatingRule(false);
                      }}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Nom, Description, Priorité & Actif */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-zinc-300">Nom de la règle</label>
                      <input
                        type="text"
                        value={editingRule.name}
                        onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                        className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-amber-500"
                        placeholder="Ex: Bloquer arnaques Nitro"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Statut</label>
                      <button
                        type="button"
                        onClick={() => setEditingRule({ ...editingRule, enabled: !editingRule.enabled })}
                        className={cn(
                          "h-9 w-full rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                          editingRule.enabled
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-zinc-700 bg-zinc-800 text-zinc-400"
                        )}
                      >
                        <div className={cn("h-2 w-2 rounded-full", editingRule.enabled ? "bg-emerald-400" : "bg-zinc-500")} />
                        <span>{editingRule.enabled ? "Règle Active" : "Règle Désactivée"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Logique d'évaluation (ALL / ANY / NOT) */}
                  <div className="space-y-2 rounded-xl border border-white/5 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
                        Opérateur Logique
                      </label>
                      <div className="flex items-center gap-1 rounded-lg bg-white/5 p-0.5 border border-white/10">
                        {(["ALL", "ANY", "NOT"] as MatchLogic[]).map((logic) => (
                          <button
                            key={logic}
                            type="button"
                            onClick={() => setEditingRule({ ...editingRule, logic })}
                            className={cn(
                              "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer",
                              editingRule.logic === logic
                                ? "bg-amber-500 text-black shadow"
                                : "text-zinc-400 hover:text-white"
                            )}
                          >
                            {logic === "ALL" ? "ET (Toutes)" : logic === "ANY" ? "OU (Au moins une)" : "NON (Aucune)"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Détermine comment les conditions ci-dessous doivent être combinées pour déclencher la règle.
                    </p>
                  </div>

                  {/* Conditions List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-300">Conditions de déclenchement</label>
                      <button
                        type="button"
                        onClick={() => {
                          const newCond: RuleCondition = {
                            id: `cond_${Date.now()}`,
                            type: "KEYWORD",
                            pattern: "",
                          };
                          setEditingRule({
                            ...editingRule,
                            conditions: [...editingRule.conditions, newCond],
                          });
                        }}
                        className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Ajouter condition</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {editingRule.conditions.map((cond, index) => (
                        <div
                          key={cond.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-3"
                        >
                          <span className="text-[10px] font-mono text-zinc-500 w-6">#{index + 1}</span>
                          <select
                            value={cond.type}
                            onChange={(e) => {
                              const updated = [...editingRule.conditions];
                              updated[index].type = e.target.value as ConditionType;
                              setEditingRule({ ...editingRule, conditions: updated });
                            }}
                            className="h-8 rounded-lg border border-white/10 bg-zinc-800 px-2 text-xs text-white outline-none"
                          >
                            <option value="KEYWORD">Mots-clés / Blacklist</option>
                            <option value="REGEX">Pattern Regex</option>
                            <option value="LINK">Contient un lien externe</option>
                            <option value="INVITE">Invitation Discord</option>
                            <option value="MENTION">Nombre de mentions excessif</option>
                            <option value="SPAM">Répétition / Spam</option>
                            <option value="FLOOD">Vitesse / Flood</option>
                            <option value="CAPS">Majuscules excessives</option>
                            <option value="PROFILE">Profil suspect (avatar / nom)</option>
                            <option value="MIN_RISK_SCORE">Score de risque minimum</option>
                          </select>

                          {/* Détail pattern ou seuil */}
                          {cond.type === "MIN_RISK_SCORE" ? (
                            <input
                              type="number"
                              value={cond.minScore || 50}
                              onChange={(e) => {
                                const updated = [...editingRule.conditions];
                                updated[index].minScore = Number(e.target.value);
                                setEditingRule({ ...editingRule, conditions: updated });
                              }}
                              className="h-8 w-24 rounded-lg border border-white/10 bg-zinc-800 px-2 text-xs text-white outline-none"
                              placeholder="Seuil (0-100)"
                            />
                          ) : (
                            <input
                              type="text"
                              value={cond.pattern || ""}
                              onChange={(e) => {
                                const updated = [...editingRule.conditions];
                                updated[index].pattern = e.target.value;
                                setEditingRule({ ...editingRule, conditions: updated });
                              }}
                              className="h-8 flex-1 rounded-lg border border-white/10 bg-zinc-800 px-3 text-xs text-white outline-none"
                              placeholder="Valeur, mots-clés séparés par virgules, ou regex"
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const filtered = editingRule.conditions.filter((_, i) => i !== index);
                              setEditingRule({ ...editingRule, conditions: filtered });
                            }}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-white/5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions automatiques à appliquer */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-300">Actions à exécuter</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {ALL_ACTIONS.map((act) => {
                        const isSelected = editingRule.actions.includes(act.id);
                        return (
                          <button
                            key={act.id}
                            type="button"
                            onClick={() => {
                              const updatedActions = isSelected
                                ? editingRule.actions.filter((a) => a !== act.id)
                                : [...editingRule.actions, act.id];
                              setEditingRule({ ...editingRule, actions: updatedActions });
                            }}
                            className={cn(
                              "h-9 rounded-xl border px-2.5 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer",
                              isSelected
                                ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                                : "border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white"
                            )}
                          >
                            <span>{act.label}</span>
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Paramètres d'action supplémentaires (Strikes, Timeout) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {editingRule.actions.includes("STRIKE") && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-300">Nombre de strikes à ajouter</label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={editingRule.addStrikesCount || 1}
                          onChange={(e) => setEditingRule({ ...editingRule, addStrikesCount: Number(e.target.value) })}
                          className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                        />
                      </div>
                    )}
                    {editingRule.actions.includes("TIMEOUT") && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-300">Durée d'exclusion (secondes)</label>
                        <select
                          value={editingRule.timeoutDurationSeconds || 300}
                          onChange={(e) => setEditingRule({ ...editingRule, timeoutDurationSeconds: Number(e.target.value) })}
                          className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                        >
                          <option value={60}>1 minute</option>
                          <option value={300}>5 minutes</option>
                          <option value={600}>10 minutes</option>
                          <option value={3600}>1 heure</option>
                          <option value={86400}>24 heures</option>
                          <option value={604800}>7 jours</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Boutons validation */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRule(null);
                        setIsCreatingRule(false);
                      }}
                      className="h-8 rounded-xl border border-white/10 px-4 text-xs font-medium text-zinc-400 hover:text-white"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCustomRule(editingRule)}
                      className="h-8 rounded-xl bg-amber-500 px-4 text-xs font-bold text-black hover:bg-amber-400"
                    >
                      Enregistrer la Règle
                    </button>
                  </div>
                </div>
              )}

              {/* Liste des Règles Existantes */}
              <div className="space-y-3">
                {rules.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-zinc-500">
                    <Layers className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                    <p className="text-xs font-semibold text-zinc-300">Aucune règle personnalisée</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Les 10 détecteurs intégrés protègent déjà le serveur, mais vous pouvez ajouter des règles sur mesure.
                    </p>
                    <button
                      onClick={startNewRule}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:underline"
                    >
                      <Plus className="h-3 w-3" /> Créer une première règle
                    </button>
                  </div>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={cn(
                        "rounded-2xl border p-4 backdrop-blur-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
                        rule.enabled
                          ? "border-white/10 bg-white/[0.02]"
                          : "border-white/5 bg-white/[0.005] opacity-60"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{rule.name}</span>
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Logique : {rule.logic}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            {rule.conditions.length} condition(s)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] text-zinc-400">Actions :</span>
                          {rule.actions.map((a) => (
                            <span
                              key={a}
                              className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/5"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Contrôles règle */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => {
                            const updated = rules.map((r) =>
                              r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                            );
                            setRules(updated);
                            handleSaveCustomRule({ ...rule, enabled: !rule.enabled });
                          }}
                          className={cn(
                            "h-7 px-2.5 rounded-lg text-xs font-bold border transition-all",
                            rule.enabled
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-zinc-700 bg-zinc-800 text-zinc-400"
                          )}
                        >
                          {rule.enabled ? "Active" : "Désactivée"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setIsCreatingRule(false);
                          }}
                          className="h-7 px-2.5 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-300 hover:text-white"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteCustomRule(rule.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-red-400 hover:border-red-500/30"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 3: LES 10 DÉTECTEURS INTÉGRÉS                      */}
          {/* ======================================================== */}
          {activeTab === "detectors" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Menu horizontal des 10 détecteurs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-white/10">
                {[
                  { id: "spam", label: "Anti-Spam", icon: MessageSquare },
                  { id: "flood", label: "Anti-Flood", icon: Zap },
                  { id: "links", label: "Filtre Liens", icon: Link2 },
                  { id: "invites", label: "Invitations Discord", icon: ShieldAlert },
                  { id: "mentions", label: "Mentions Spammer", icon: AtSign },
                  { id: "ghostPing", label: "Ghost Ping", icon: AlertTriangle },
                  { id: "caps", label: "Caps Lock", icon: VolumeX },
                  { id: "keywords", label: "Mots Interdits", icon: FileText },
                  { id: "regex", label: "Safe Regex", icon: Code },
                  { id: "profiles", label: "Profile Guard", icon: Users },
                ].map((d) => {
                  const Icon = d.icon;
                  const isCurrent = activeDetector === d.id;
                  const isDetectorEnabled = (config as any)[d.id]?.enabled;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setActiveDetector(d.id as any)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer",
                        isCurrent
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{d.label}</span>
                      <div className={cn("h-1.5 w-1.5 rounded-full ml-0.5", isDetectorEnabled ? "bg-emerald-400" : "bg-zinc-600")} />
                    </button>
                  );
                })}
              </div>

              {/* PANELS DE CONFIGURATION DES DÉTECTEURS */}

              {/* 1. ANTI-SPAM */}
              {activeDetector === "spam" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Détecteur Anti-Spam (Messages identiques / similaires)</h3>
                      <p className="text-xs text-zinc-400">
                        Bloque la répétition d'un même message ou de messages très similaires par le même membre.
                      </p>
                    </div>
                    <button
                      onClick={() => setConfig({ ...config, spam: { ...config.spam, enabled: !config.spam.enabled } })}
                      className={cn(
                        "h-7 px-3 rounded-lg text-xs font-bold border transition-all",
                        config.spam.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {config.spam.enabled ? "Activé" : "Désactivé"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Répétitions max autorisées</label>
                      <input
                        type="number"
                        min={2}
                        max={10}
                        value={config.spam.maxDuplicates}
                        onChange={(e) => setConfig({ ...config, spam: { ...config.spam, maxDuplicates: Number(e.target.value) } })}
                        className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Fenêtre temporelle (secondes)</label>
                      <input
                        type="number"
                        min={3}
                        max={60}
                        value={config.spam.timeWindowSeconds}
                        onChange={(e) => setConfig({ ...config, spam: { ...config.spam, timeWindowSeconds: Number(e.target.value) } })}
                        className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Seuil de similarité (%)</label>
                      <input
                        type="number"
                        min={50}
                        max={100}
                        value={config.spam.similarityThreshold}
                        onChange={(e) => setConfig({ ...config, spam: { ...config.spam, similarityThreshold: Number(e.target.value) } })}
                        className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. ANTI-FLOOD */}
              {activeDetector === "flood" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Détecteur Anti-Flood (Rafale de messages)</h3>
                      <p className="text-xs text-zinc-400">
                        Limite la vitesse d'envoi de messages d'un même utilisateur, peu importe le contenu.
                      </p>
                    </div>
                    <button
                      onClick={() => setConfig({ ...config, flood: { ...config.flood, enabled: !config.flood.enabled } })}
                      className={cn(
                        "h-7 px-3 rounded-lg text-xs font-bold border transition-all",
                        config.flood.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {config.flood.enabled ? "Activé" : "Désactivé"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Nombre max de messages</label>
                      <input
                        type="number"
                        min={3}
                        max={20}
                        value={config.flood.maxMessagesPerWindow}
                        onChange={(e) => setConfig({ ...config, flood: { ...config.flood, maxMessagesPerWindow: Number(e.target.value) } })}
                        className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Dans un intervalle de (secondes)</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={config.flood.timeWindowSeconds}
                        onChange={(e) => setConfig({ ...config, flood: { ...config.flood, timeWindowSeconds: Number(e.target.value) } })}
                        className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. FILTRE DE LIENS */}
              {activeDetector === "links" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Filtre de Liens & Whitelist de Domaines</h3>
                      <p className="text-xs text-zinc-400">
                        Autorise uniquement les liens provenant de sites de confiance (ex: YouTube, Twitter, GitHub).
                      </p>
                    </div>
                    <button
                      onClick={() => setConfig({ ...config, links: { ...config.links, enabled: !config.links.enabled } })}
                      className={cn(
                        "h-7 px-3 rounded-lg text-xs font-bold border transition-all",
                        config.links.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {config.links.enabled ? "Activé" : "Désactivé"}
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-medium text-zinc-300">Domaines autorisés (Whitelist)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDomainInput}
                        onChange={(e) => setNewDomainInput(e.target.value)}
                        placeholder="Ex: reddit.com ou twitch.tv"
                        className="h-9 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newDomainInput.trim()) {
                            setConfig({
                              ...config,
                              links: {
                                ...config.links,
                                allowedDomains: [...config.links.allowedDomains, newDomainInput.trim().toLowerCase()],
                              },
                            });
                            setNewDomainInput("");
                          }
                        }}
                        className="h-9 px-4 rounded-xl bg-white/10 text-xs font-bold text-white hover:bg-white/20"
                      >
                        Ajouter
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {config.links.allowedDomains.map((dom) => (
                        <span
                          key={dom}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 font-mono"
                        >
                          <span>{dom}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setConfig({
                                ...config,
                                links: {
                                  ...config.links,
                                  allowedDomains: config.links.allowedDomains.filter((d) => d !== dom),
                                },
                              });
                            }}
                            className="text-zinc-500 hover:text-red-400"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. INVITATIONS DISCORD */}
              {activeDetector === "invites" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Bloqueur d'Invitations Discord Externes</h3>
                      <p className="text-xs text-zinc-400">
                        Interdit la publication de liens d'invitation discord.gg menant vers d'autres serveurs.
                      </p>
                    </div>
                    <button
                      onClick={() => setConfig({ ...config, invites: { ...config.invites, enabled: !config.invites.enabled } })}
                      className={cn(
                        "h-7 px-3 rounded-lg text-xs font-bold border transition-all",
                        config.invites.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {config.invites.enabled ? "Activé" : "Désactivé"}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Les invitations internes vers ce serveur Discord ({selectedGuild?.name}) sont automatiquement tolérées.
                  </p>
                </div>
              )}

              {/* 5. MENTIONS SPAMMER */}
              {activeDetector === "mentions" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Filtre de Mentions Massives</h3>
                      <p className="text-xs text-zinc-400">
                        Empêche les mentions répétées de membres ou de rôles dans un même message.
                      </p>
                    </div>
                    <button
                      onClick={() => setConfig({ ...config, mentions: { ...config.mentions, enabled: !config.mentions.enabled } })}
                      className={cn(
                        "h-7 px-3 rounded-lg text-xs font-bold border transition-all",
                        config.mentions.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {config.mentions.enabled ? "Activé" : "Désactivé"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Mentions max par message</label>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={config.mentions.maxMentionsPerMessage}
                        onChange={(e) => setConfig({ ...config, mentions: { ...config.mentions, maxMentionsPerMessage: Number(e.target.value) } })}
                        className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="flex items-center gap-2 text-xs text-white cursor-pointer h-9">
                        <input
                          type="checkbox"
                          checked={config.mentions.blockEveryoneHere}
                          onChange={(e) => setConfig({ ...config, mentions: { ...config.mentions, blockEveryoneHere: e.target.checked } })}
                          className="rounded border-zinc-700 accent-amber-500 h-4 w-4"
                        />
                        <span>Bloquer strictement @everyone et @here</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. GHOST PING */}
              {activeDetector === "ghostPing" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Détecteur de Ghost Ping</h3>
                      <p className="text-xs text-zinc-400">
                        Alerte le staff si un membre mentionne un utilisateur puis supprime aussitôt son message pour troller.
                      </p>
                    </div>
                    <button
                      onClick={() => setConfig({ ...config, ghostPing: { ...config.ghostPing, enabled: !config.ghostPing.enabled } })}
                      className={cn(
                        "h-7 px-3 rounded-lg text-xs font-bold border transition-all",
                        config.ghostPing.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {config.ghostPing.enabled ? "Activé" : "Désactivé"}
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-medium text-zinc-300">Fenêtre de détection de suppression (secondes)</label>
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={config.ghostPing.windowSeconds}
                      onChange={(e) => setConfig({ ...config, ghostPing: { ...config.ghostPing, windowSeconds: Number(e.target.value) } })}
                      className="h-9 w-48 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 7. CAPS LOCK */}
              {activeDetector === "caps" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Filtre Majuscules Excessives (Caps Lock)</h3>
                      <p className="text-xs text-zinc-400">
                        Supprime les messages criés en majuscules pour maintenir la lisibilité des salons.
                      </p>
                    </div>
                    <button
                      onClick={() => setConfig({ ...config, caps: { ...config.caps, enabled: !config.caps.enabled } })}
                      className={cn(
                        "h-7 px-3 rounded-lg text-xs font-bold border transition-all",
                        config.caps.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {config.caps.enabled ? "Activé" : "Désactivé"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Pourcentage min de majuscules (%)</label>
                      <input
                        type="number"
                        min={50}
                        max={100}
                        value={config.caps.minPercentage}
                        onChange={(e) => setConfig({ ...config, caps: { ...config.caps, minPercentage: Number(e.target.value) } })}
                        className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Longueur min du message (caractères)</label>
                      <input
                        type="number"
                        min={5}
                        max={50}
                        value={config.caps.minMessageLength}
                        onChange={(e) => setConfig({ ...config, caps: { ...config.caps, minMessageLength: Number(e.target.value) } })}
                        className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 8. MOTS INTERDITS */}
              {activeDetector === "keywords" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Liste Noire de Mots-Clés & Expressions</h3>
                      <p className="text-xs text-zinc-400">
                        Censure immédiate des insultes, arnaques et termes prohibés. Prise en charge des jokers *.
                      </p>
                    </div>
                    <button
                      onClick={() => setConfig({ ...config, keywords: { ...config.keywords, enabled: !config.keywords.enabled } })}
                      className={cn(
                        "h-7 px-3 rounded-lg text-xs font-bold border transition-all",
                        config.keywords.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {config.keywords.enabled ? "Activé" : "Désactivé"}
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newKeywordInput}
                        onChange={(e) => setNewKeywordInput(e.target.value)}
                        placeholder="Ex: free nitro*, grabber, token"
                        className="h-9 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newKeywordInput.trim()) {
                            setConfig({
                              ...config,
                              keywords: {
                                ...config.keywords,
                                blacklistedWords: [...config.keywords.blacklistedWords, newKeywordInput.trim().toLowerCase()],
                              },
                            });
                            setNewKeywordInput("");
                          }
                        }}
                        className="h-9 px-4 rounded-xl bg-white/10 text-xs font-bold text-white hover:bg-white/20"
                      >
                        Ajouter
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {config.keywords.blacklistedWords.map((kw) => (
                        <span
                          key={kw}
                          className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-300 font-mono"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setConfig({
                                ...config,
                                keywords: {
                                  ...config.keywords,
                                  blacklistedWords: config.keywords.blacklistedWords.filter((k) => k !== kw),
                                },
                              });
                            }}
                            className="text-red-400 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 9. SAFE REGEX */}
              {activeDetector === "regex" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Safe Regex (Expressions Régulières Protégées)</h3>
                      <p className="text-xs text-zinc-400">
                        Patterns réguliers avec sandbox et protection ReDoS (délai d'exécution max 25ms).
                      </p>
                    </div>
                    <button
                      onClick={() => setConfig({ ...config, regex: { ...config.regex, enabled: !config.regex.enabled } })}
                      className={cn(
                        "h-7 px-3 rounded-lg text-xs font-bold border transition-all",
                        config.regex.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {config.regex.enabled ? "Activé" : "Désactivé"}
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newRegexInput}
                        onChange={(e) => setNewRegexInput(e.target.value)}
                        placeholder="Ex: (https?:\\/\\/)?(t\\.me|telegram\\.me)\\/[a-zA-Z0-9_]+"
                        className="h-9 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newRegexInput.trim()) {
                            try {
                              new RegExp(newRegexInput.trim());
                              setConfig({
                                ...config,
                                regex: {
                                  ...config.regex,
                                  patterns: [...config.regex.patterns, newRegexInput.trim()],
                                },
                              });
                              setNewRegexInput("");
                            } catch {
                              showError("Regex Invalide", "Veuillez vérifier la syntaxe de votre expression régulière.");
                            }
                          }
                        }}
                        className="h-9 px-4 rounded-xl bg-white/10 text-xs font-bold text-white hover:bg-white/20"
                      >
                        Ajouter
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      {config.regex.patterns.map((pat) => (
                        <div
                          key={pat}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-mono text-zinc-300"
                        >
                          <span className="text-amber-300 break-all">{pat}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setConfig({
                                ...config,
                                regex: {
                                  ...config.regex,
                                  patterns: config.regex.patterns.filter((p) => p !== pat),
                                },
                              });
                            }}
                            className="text-zinc-500 hover:text-red-400 ml-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 10. PROFILE GUARD */}
              {activeDetector === "profiles" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Profile Guard (Noms, Comptes récents, Usurpation)</h3>
                      <p className="text-xs text-zinc-400">
                        Détecte les comptes essayant d'usurper le nom du staff (mod, admin, support) ou les comptes ultra-récents sans photo.
                      </p>
                    </div>
                    <button
                      onClick={() => setConfig({ ...config, profiles: { ...config.profiles, enabled: !config.profiles.enabled } })}
                      className={cn(
                        "h-7 px-3 rounded-lg text-xs font-bold border transition-all",
                        config.profiles.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {config.profiles.enabled ? "Activé" : "Désactivé"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Âge minimum du compte (jours)</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={config.profiles.minAccountAgeDays}
                        onChange={(e) => setConfig({ ...config, profiles: { ...config.profiles, minAccountAgeDays: Number(e.target.value) } })}
                        className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="flex items-center gap-2 text-xs text-white cursor-pointer h-9">
                        <input
                          type="checkbox"
                          checked={config.profiles.blockDefaultAvatars}
                          onChange={(e) => setConfig({ ...config, profiles: { ...config.profiles, blockDefaultAvatars: e.target.checked } })}
                          className="rounded border-zinc-700 accent-amber-500 h-4 w-4"
                        />
                        <span>Pénaliser les avatars Discord par défaut</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 4: STRIKES & SANCTIONS PROGRESSIVES               */}
          {/* ======================================================== */}
          {activeTab === "strikes" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white">Échelle Progressive des Sanctions (Strikes)</h2>
                  <p className="text-xs text-zinc-400">
                    Chaque infraction peut attribuer un ou plusieurs strikes. En accumulant des strikes, les sanctions s'intensifient automatiquement.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Expiration :</span>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={config.strikes.expirationDays}
                    onChange={(e) => setConfig({ ...config, strikes: { ...config.strikes, expirationDays: Number(e.target.value) } })}
                    className="h-8 w-16 rounded-lg border border-white/10 bg-zinc-900 text-center text-xs text-white font-mono outline-none"
                  />
                  <span className="text-xs text-zinc-400">jours</span>
                </div>
              </div>

              {/* Tableau de l'Échelle des Paliers */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">Paliers Configurés</span>
                  <button
                    type="button"
                    onClick={() => {
                      const maxStrike = config.strikes.progressiveSteps.reduce((max, s) => Math.max(max, s.strikeCount), 0);
                      const newStep: ProgressiveSanctionStep = {
                        strikeCount: maxStrike + 1,
                        action: "TIMEOUT",
                        durationSeconds: 3600,
                      };
                      setConfig({
                        ...config,
                        strikes: {
                          ...config.strikes,
                          progressiveSteps: [...config.strikes.progressiveSteps, newStep],
                        },
                      });
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Ajouter un palier</span>
                  </button>
                </div>

                <div className="divide-y divide-white/5">
                  {config.strikes.progressiveSteps
                    .sort((a, b) => a.strikeCount - b.strikeCount)
                    .map((step, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs font-mono">
                            {step.strikeCount}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">
                              {step.strikeCount} {step.strikeCount > 1 ? "Strikes cumulés" : "Strike"}
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              Sanction déclenchée : <span className="font-mono text-zinc-200">{step.action}</span>
                              {step.durationSeconds ? ` (${Math.round(step.durationSeconds / 60)} minutes)` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={step.action}
                            onChange={(e) => {
                              const updated = [...config.strikes.progressiveSteps];
                              updated[idx].action = e.target.value as AutoModAction;
                              setConfig({
                                ...config,
                                strikes: { ...config.strikes, progressiveSteps: updated },
                              });
                            }}
                            className="h-8 rounded-lg border border-white/10 bg-zinc-800 px-2 text-xs text-white outline-none"
                          >
                            <option value="WARN">Avertissement (WARN)</option>
                            <option value="TIMEOUT">Exclusion (TIMEOUT)</option>
                            <option value="QUARANTINE">Quarantaine</option>
                            <option value="KICK">Expulsion (KICK)</option>
                            <option value="BAN">Bannissement (BAN)</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              const filtered = config.strikes.progressiveSteps.filter((_, i) => i !== idx);
                              setConfig({
                                ...config,
                                strikes: { ...config.strikes, progressiveSteps: filtered },
                              });
                            }}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Recherche & Gestion des Strikes d'un Membre */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-amber-400" />
                  Consulter ou Révoquer les Strikes d'un Membre
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Entrez l'identifiant Discord du membre (User ID)"
                    className="h-9 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"
                  />
                  <button
                    onClick={() => handleInspectUser(userSearchQuery.trim())}
                    disabled={!userSearchQuery.trim() || isLoadingProfile}
                    className="h-9 px-4 rounded-xl bg-amber-500 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50"
                  >
                    Rechercher
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 5: RULE TESTER / SANDBOX SANS SANCTIONS           */}
          {/* ======================================================== */}
          {activeTab === "tester" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-600/10 p-4">
                <div className="flex items-start gap-3">
                  <Terminal className="h-5 w-5 text-amber-400 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-bold text-white">Sandbox de Test AutoMod (Dry-Run Simulator)</h2>
                    <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                      Testez vos règles et détecteurs en toute sécurité. La sandbox exécute le pipeline complet (10 détecteurs, calculateurs de risque et règles personnalisées) <strong>sans supprimer de message ni sanctionner personne</strong> sur votre serveur Discord.
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulaire de Test */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Message à simuler</label>
                  <textarea
                    rows={3}
                    value={sandboxMessage}
                    onChange={(e) => setSandboxMessage(e.target.value)}
                    placeholder="Saisissez un message suspect ou un exemple pour tester les filtres..."
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white font-mono outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">ID Utilisateur fictif</label>
                    <input
                      type="text"
                      value={sandboxUserId}
                      onChange={(e) => setSandboxUserId(e.target.value)}
                      className="h-8 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-xs text-zinc-300 font-mono outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">ID Salon fictif</label>
                    <input
                      type="text"
                      value={sandboxChannelId}
                      onChange={(e) => setSandboxChannelId(e.target.value)}
                      className="h-8 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-xs text-zinc-300 font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400">Exemples rapides :</span>
                    <button
                      type="button"
                      onClick={() => setSandboxMessage("Venez voir https://discord.gg/hacker rejoint vite")}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      [Invite]
                    </button>
                    <button
                      type="button"
                      onClick={() => setSandboxMessage("FREE NITRO CLAIM NOW HTTP://STEAM-COMMUNITY-GIFT.XYZ")}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      [Scam Caps]
                    </button>
                    <button
                      type="button"
                      onClick={() => setSandboxMessage("Bonjour à tous, comment allez-vous aujourd'hui ?")}
                      className="text-[10px] text-emerald-400 hover:underline"
                    >
                      [Propre]
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunSandboxTest}
                    disabled={isTestingSandbox || !sandboxMessage.trim()}
                    className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 text-xs font-bold text-black hover:from-amber-400 hover:to-orange-400 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Play className={cn("h-3.5 w-3.5 fill-black", isTestingSandbox && "animate-spin")} />
                    <span>{isTestingSandbox ? "Simulation..." : "Lancer la Simulation"}</span>
                  </button>
                </div>
              </div>

              {/* Résultat de Simulation */}
              {sandboxResult && (
                <div className="rounded-2xl border border-white/10 bg-zinc-900/90 p-5 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-amber-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">Résultat du Diagnostic Sandbox</h3>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                        RISK_BADGES[sandboxResult.riskLevel]?.bg,
                        RISK_BADGES[sandboxResult.riskLevel]?.text,
                        RISK_BADGES[sandboxResult.riskLevel]?.border
                      )}
                    >
                      {RISK_BADGES[sandboxResult.riskLevel]?.label} ({sandboxResult.totalRiskScore}/100)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
                      <span className="text-[11px] text-zinc-400">Détecteurs activés</span>
                      <p className="text-xs font-bold text-white">
                        {sandboxResult.matchedDetectors.length > 0
                          ? sandboxResult.matchedDetectors.join(", ")
                          : "Aucun détecteur déclenché"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
                      <span className="text-[11px] text-zinc-400">Règles personnalisées</span>
                      <p className="text-xs font-bold text-white">
                        {sandboxResult.matchedCustomRules.length > 0
                          ? sandboxResult.matchedCustomRules.join(", ")
                          : "Aucune règle satisfaite"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
                      <span className="text-[11px] text-zinc-400">Sanctions prévues</span>
                      <p className="text-xs font-bold text-amber-400">
                        {sandboxResult.actionsToExecute.length > 0
                          ? sandboxResult.actionsToExecute.join(" + ")
                          : "Aucune sanction"}
                      </p>
                    </div>
                  </div>

                  {/* Explications détaillées */}
                  <div className="rounded-xl border border-white/5 bg-black/30 p-3 space-y-2">
                    <span className="text-xs font-medium text-zinc-300">Raisonnement du Moteur :</span>
                    <ul className="space-y-1 text-xs text-zinc-400">
                      {sandboxResult.explanation.map((exp, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-400">•</span>
                          <span>{exp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ======================================================== */}
      {/* DRAWER / MODAL: PROFIL MODÉRATION DU MEMBRE              */}
      {/* ======================================================== */}
      {inspectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0C0D12] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Users className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Dossier Modération Membre</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">{inspectedUserId}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setInspectedUserId(null);
                  setInspectedProfile(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingProfile ? (
              <div className="py-12 text-center text-zinc-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-400" />
                <p className="text-xs">Chargement du profil...</p>
              </div>
            ) : inspectedProfile ? (
              <div className="space-y-4">
                {/* Métriques profil */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                    <span className="text-[10px] text-zinc-500">Strikes Actifs</span>
                    <p className="text-xl font-bold text-amber-400 mt-1 font-mono">
                      {inspectedProfile.activeStrikesCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                    <span className="text-[10px] text-zinc-500">Infractions Total</span>
                    <p className="text-xl font-bold text-white mt-1 font-mono">
                      {inspectedProfile.incidentCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                    <span className="text-[10px] text-zinc-500">Risque Calculé</span>
                    <p className="text-xl font-bold text-red-400 mt-1 font-mono">
                      {inspectedProfile.currentCalculatedRisk}/100
                    </p>
                  </div>
                </div>

                {/* Liste des strikes actifs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Détail des Strikes</span>
                    {inspectedProfile.activeStrikesCount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearUserStrikes(inspectedUserId)}
                        className="text-[11px] text-amber-400 hover:underline font-semibold"
                      >
                        Pardonner (Révoquer tout)
                      </button>
                    )}
                  </div>
                  {inspectedProfile.activeStrikes.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 italic">Aucun strike actif pour ce membre.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {inspectedProfile.activeStrikes.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-lg border border-white/5 bg-black/40 p-2.5 text-xs flex items-center justify-between"
                        >
                          <div>
                            <p className="font-semibold text-white">{s.reason}</p>
                            <p className="text-[10px] text-zinc-500">
                              Par {s.addedBy} • Expire le {new Date(s.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                            Actif
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setInspectedUserId(null);
                      setInspectedProfile(null);
                    }}
                    className="h-8 rounded-xl bg-white/10 px-4 text-xs font-medium text-white hover:bg-white/20"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500">
                <p className="text-xs">Aucune information trouvée pour cet identifiant.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
