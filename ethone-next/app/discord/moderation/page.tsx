"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Select from "@/components/ui/Select";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Users,
  UserX,
  UserCheck,
  Clock,
  RefreshCw,
  Settings,
  Search,
  ChevronRight,
  ArrowLeft,
  Eye,
  FileText,
  Plus,
  Trash2,
  Ban,
  VolumeX,
  AlertCircle,
  X,
  RotateCcw,
  BarChart3,
  FileCheck,
  Bot,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { cn } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import { formatApiError } from "@/lib/format-error";

// ==========================================
// TYPES MODERATION CENTER
// ==========================================
type CaseAction =
  | "WARN"
  | "TIMEOUT"
  | "KICK"
  | "BAN"
  | "UNBAN"
  | "SOFTBAN"
  | "QUARANTINE";

type CaseSource = "MANUAL" | "AUTOMOD" | "ANTI_RAID" | "SECURITY" | "SYSTEM";
type CaseStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

interface ModerationCase {
  id: string;
  caseNumber: number;
  guildId: string;
  userId: string;
  userTag: string;
  moderatorId: string;
  moderatorTag: string;
  action: CaseAction;
  reason: string;
  standardCategory?: string;
  durationSeconds?: number | null;
  createdAt: string;
  expiresAt?: string | null;
  status: CaseStatus;
  source: CaseSource;
  appealStatus: string;
  metadata?: {
    channelId?: string;
    channelName?: string;
    messageId?: string;
    messageContent?: string;
    incidentId?: string;
    ruleTriggered?: string;
    revertedAt?: string;
    revertedBy?: string;
    revertReason?: string;
  };
}

interface UserModerationProfile {
  userId: string;
  userTag: string;
  username: string;
  globalName?: string | null;
  avatarUrl?: string | null;
  accountCreatedAt?: string | null;
  joinedServerAt?: string | null;
  roles: Array<{ id: string; name: string; color: string }>;
  stats: {
    warnings: number;
    timeouts: number;
    kicks: number;
    bans: number;
    quarantines: number;
    totalCases: number;
    activeSanctionsCount: number;
  };
  calculatedRiskScore: number;
  trustLevel: "TRUSTED" | "NORMAL" | "SUSPICIOUS" | "DANGEROUS";
  activeSanctions: ModerationCase[];
  timeline: ModerationCase[];
}

interface OverviewStats {
  totalCases: number;
  casesToday: number;
  activeSanctionsCount: number;
  counts: {
    warnings: number;
    timeouts: number;
    kicks: number;
    bans: number;
    quarantines: number;
  };
  sources: {
    manual: number;
    automated: number;
  };
}

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

const ACTION_CONFIG: Record<
  CaseAction,
  { label: string; badge: string; border: string; bg: string; icon: any }
> = {
  WARN: {
    label: "Avertissement",
    badge: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    icon: AlertCircle,
  },
  TIMEOUT: {
    label: "Exclusion",
    badge: "text-orange-400",
    border: "border-orange-500/30",
    bg: "bg-orange-500/10",
    icon: VolumeX,
  },
  KICK: {
    label: "Expulsion",
    badge: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
    icon: UserX,
  },
  BAN: {
    label: "Bannissement",
    badge: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    icon: Ban,
  },
  UNBAN: {
    label: "Débannissement",
    badge: "text-[var(--accent-primary)]",
    border: "border-[var(--accent-primary)]/30",
    bg: "bg-[var(--accent-primary)]/10",
    icon: UserCheck,
  },
  SOFTBAN: {
    label: "Softban",
    badge: "text-[var(--accent-primary)]",
    border: "border-[var(--accent-primary)]/30",
    bg: "bg-[var(--accent-primary)]/10",
    icon: Trash2,
  },
  QUARANTINE: {
    label: "Quarantaine",
    badge: "text-[var(--accent-primary)]",
    border: "border-[var(--accent-primary)]/30",
    bg: "bg-[var(--accent-primary)]/10",
    icon: Lock,
  },
};

const STANDARD_REASONS = [
  "Spam",
  "Harassment",
  "Advertising",
  "Raid",
  "NSFW",
  "Scam",
  "Toxicity",
  "Rule violation",
  "Other",
];

export default function ModerationCenterPage() {
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const { profile } = useDiscordOAuth();
  const allGuilds: DiscordGuild[] = useMemo(() => {
    if (profile?.guilds && profile.guilds.length > 0) return profile.guilds;
    return getStoredDiscordGuilds();
  }, [profile?.guilds]);

  const botGuildIds = useBotGuildIds(allGuilds);

  // Filtrer les serveurs où l'utilisateur est admin ou propriétaire ou où le bot est présent
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
  }, [manageableGuilds, queryGuildId, selectedGuild, botGuildIds]);

  // Onglet principal
  const [activeTab, setActiveTab] = useState<
    "cases" | "workspace" | "timeline" | "analytics" | "staff" | "settings"
  >("cases");

  // Données
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [totalCasesCount, setTotalCasesCount] = useState(0);
  const [stats, setStats] = useState<OverviewStats & { pendingReports?: number }>({
    totalCases: 0,
    casesToday: 0,
    activeSanctionsCount: 0,
    counts: { warnings: 0, timeouts: 0, kicks: 0, bans: 0, quarantines: 0 },
    sources: { manual: 0, automated: 0 },
    pendingReports: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Réglages : rétention des dossiers et sanction automatique après N avertissements
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [escalation, setEscalation] = useState<{ enabled: boolean; threshold: number; action: "timeout" | "kick" | "ban"; durationSeconds: number } | null>(null);

  useEffect(() => {
    if (activeTab !== "settings" || !BOT_API_URL || !selectedGuild) return;
    let cancelled = false;
    const base = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation`;
    fetch(`${base}/settings`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.settings) setRetentionDays(Number(d.settings.retentionDays ?? 0));
      })
      .catch(() => {});
    fetch(`${base}/warning-escalation`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.escalation) setEscalation(d.escalation);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedGuild]);

  const saveRetention = async (days: number) => {
    if (!BOT_API_URL || !selectedGuild) return;
    const previous = retentionDays;
    setRetentionDays(days);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays: days }),
      });
      if (!res.ok) throw new Error();
      success("Conservation mise à jour", days === 0 ? "Les dossiers sont conservés sans limite." : `Les dossiers sont conservés ${days} jours.`);
    } catch {
      setRetentionDays(previous);
      showError("Échec", "Le bot n'a pas enregistré la durée de conservation.");
    }
  };

  const saveEscalation = async (patch: Partial<NonNullable<typeof escalation>>) => {
    if (!BOT_API_URL || !selectedGuild || !escalation) return;
    const previous = escalation;
    setEscalation({ ...escalation, ...patch });
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/warning-escalation`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      if (data?.escalation) setEscalation(data.escalation);
      success("Sanctions automatiques", "Réglage enregistré.");
    } catch {
      setEscalation(previous);
      showError("Échec", "Le bot n'a pas enregistré ce réglage.");
    }
  };

  // Recherche Rapide Membre (Staff Console)
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [isSearchingMember, setIsSearchingMember] = useState(false);

  useEffect(() => {
    if (!selectedGuild || !memberSearchQuery.trim()) {
      setMemberSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingMember(true);
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/search?q=${encodeURIComponent(memberSearchQuery.trim())}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setMemberSearchResults(data.results || []);
        }
      } catch {
        setMemberSearchResults([]);
      } finally {
        setIsSearchingMember(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedGuild, memberSearchQuery]);

  // Recherche & Filtres Cases
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterSource, setFilterSource] = useState<string>("ALL");

  // Profil Utilisateur sélectionné (Drawer)
  const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserModerationProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Modal Nouvelle Sanction
  const [isNewSanctionOpen, setIsNewSanctionOpen] = useState(false);
  const [sanctionTargetId, setSanctionTargetId] = useState("");
  const [sanctionAction, setSanctionAction] = useState<CaseAction>("WARN");
  const [sanctionCategory, setSanctionCategory] = useState("Rule violation");
  const [sanctionReason, setSanctionReason] = useState("");
  const [sanctionDuration, setSanctionDuration] = useState("600"); // 10 minutes par défaut
  const [isSubmittingSanction, setIsSubmittingSanction] = useState(false);

  // Modal Révocation (Pardon)
  const [revertingCase, setRevertingCase] = useState<ModerationCase | null>(null);
  const [revertReason, setRevertReason] = useState("");
  const [isSubmittingRevert, setIsSubmittingRevert] = useState(false);

  // Charger les données de la guilde
  const fetchOverview = useCallback(async () => {
    if (!selectedGuild) return;
    if (botGuildIds && !botGuildIds.includes(selectedGuild.id)) {
      setCases([]);
      setTotalCasesCount(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    if (BOT_API_URL) {
      try {
        // 1. Overview stats
        const ovRes = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/overview`, { credentials: "include" });
        if (ovRes.ok) {
          const data = await ovRes.json();
          if (data.stats) setStats(data.stats);
        }

        // 2. Cases avec filtres
        let url = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/cases?limit=100`;
        if (filterAction !== "ALL") url += `&action=${filterAction}`;
        if (filterStatus !== "ALL") url += `&status=${filterStatus}`;
        if (filterSource !== "ALL") url += `&source=${filterSource}`;
        if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

        const casesRes = await fetch(url);
        if (casesRes.ok) {
          const data = await casesRes.json();
          if (data.cases) {
            setCases(data.cases);
            setTotalCasesCount(data.total || data.cases.length);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Offline fallback
      }
    }
  }, [selectedGuild, botGuildIds, filterAction, filterStatus, filterSource, searchQuery]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Inspecter un profil utilisateur
  const handleInspectUser = async (userId: string) => {
    if (!selectedGuild || !userId) return;
    setInspectedUserId(userId);
    setIsLoadingProfile(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/users/${userId}/profile`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setUserProfile(data.profile);
          return;
        }
      }
      throw new Error("Erreur profil");
    } catch {
      // Profil de secours
      const userCases = cases.filter((c) => c.userId === userId);
      setUserProfile({
        userId,
        userTag: userCases[0]?.userTag || userId,
        username: userCases[0]?.userTag || userId,
        roles: [],
        stats: {
          warnings: userCases.filter((c) => c.action === "WARN").length,
          timeouts: userCases.filter((c) => c.action === "TIMEOUT").length,
          kicks: userCases.filter((c) => c.action === "KICK").length,
          bans: userCases.filter((c) => c.action === "BAN").length,
          quarantines: userCases.filter((c) => c.action === "QUARANTINE").length,
          totalCases: userCases.length,
          activeSanctionsCount: userCases.filter((c) => c.status === "ACTIVE").length,
        },
        calculatedRiskScore: Math.min(100, userCases.length * 20),
        trustLevel: userCases.length >= 3 ? "DANGEROUS" : userCases.length >= 1 ? "SUSPICIOUS" : "NORMAL",
        activeSanctions: userCases.filter((c) => c.status === "ACTIVE"),
        timeline: userCases,
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Créer une nouvelle sanction
  const handleCreateSanction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuild || !sanctionTargetId.trim()) return;
    if (!BOT_API_URL) {
      showError("Bot injoignable", "L'API du bot n'est pas configurée.");
      return;
    }

    setIsSubmittingSanction(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/cases`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: sanctionTargetId.trim(),
          action: sanctionAction,
          reason: sanctionReason || sanctionCategory,
          standardCategory: sanctionCategory,
          durationSeconds: sanctionAction === "TIMEOUT" ? Number(sanctionDuration) : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        success("Sanction appliquée", `Case #${data.case.caseNumber} enregistrée avec succès.`);
        setIsNewSanctionOpen(false);
        setSanctionTargetId("");
        setSanctionReason("");
        fetchOverview();
      } else {
        const errData = await res.json();
        showError("Échec de la sanction", formatApiError(errData.error, "Impossible d'appliquer la sanction."));
      }
    } catch {
      showError("Erreur", "Le serveur Discord ou le bot n'est pas accessible.");
    } finally {
      setIsSubmittingSanction(false);
    }
  };

  // Révoquer une sanction
  const handleRevertCase = async () => {
    if (!selectedGuild || !revertingCase) return;
    if (!BOT_API_URL) {
      showError("Bot injoignable", "L'API du bot n'est pas configurée.");
      return;
    }

    setIsSubmittingRevert(true);
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/cases/${revertingCase.caseNumber}/revert`,
        {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: revertReason || "Pardon accordé" }),
        }
      );

      if (res.ok) {
        success("Sanction révoquée", `La Case #${revertingCase.caseNumber} a été levée.`);
        setRevertingCase(null);
        setRevertReason("");
        fetchOverview();
      } else {
        const err = await res.json();
        showError("Échec", formatApiError(err.error, "Impossible de révoquer la case."));
      }
    } catch {
      showError("Erreur réseau", "Impossible de contacter l'API.");
    } finally {
      setIsSubmittingRevert(false);
    }
  };

  return (
    <div className="w-full text-[var(--text-primary)] font-sans">
      {/* HEADER FIXE */}
      <header className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-4 sm:px-6 py-3.5 z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Titre & Navigation Retour */}
          <div className="flex items-center gap-3">
            <Link
              href={selectedGuild ? `/discord?guildId=${selectedGuild.id}` : "/discord"}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-all active:scale-95"
              title="Retour au dashboard Discord"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-[var(--text-muted)] ">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                    Moderation Center 3.0
                  </h1>
                  <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/30">
                    Staff Console
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Console d'investigation, recherche rapide, dossiers disciplinaires & sanctions coordonnées.
                </p>
              </div>
            </div>
          </div>

          {/* Actions Header (Sélecteur, Signalements, Actualiser, Nouvelle Sanction) */}
          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
            {manageableGuilds.length > 0 && (
              <GuildSelector
                guilds={manageableGuilds}
                value={selectedGuild?.id || ""}
                onChange={(g) => {
                  userSelectedRef.current = true;
                  setSelectedGuild(g);
                }}
              />
            )}

            <Link
              href={selectedGuild ? `/discord/moderation/reports?guildId=${selectedGuild.id}` : "/discord/moderation/reports"}
              className="flex h-8 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-all active:scale-95"
              title="Centre des signalements membres"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Signalements ({(stats as any).pendingReports || 0})</span>
            </Link>

            <button
              onClick={fetchOverview}
              disabled={isLoading}
              className="flex h-8 items-center gap-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-all active:scale-95 disabled:opacity-50"
              title="Rafraîchir les dossiers et sanctions"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-orange-400")} />
              <span className="hidden md:inline">Actualiser</span>
            </button>

            <button
              onClick={() => setIsNewSanctionOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-500 transition-all active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nouvelle Sanction</span>
            </button>
          </div>
        </div>

        {/* BARRE D'ONGLETS */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {[
            { id: "cases", label: `Cases & Dossiers (${totalCasesCount})`, icon: FileText },
            { id: "workspace", label: "My Moderation (Espace Staff)", icon: ShieldAlert },
            { id: "timeline", label: "Activité Récente (Live Feed)", icon: Clock },
            { id: "analytics", label: "Statistiques & Tendances", icon: BarChart3 },
            { id: "staff", label: "Activité Staff & Protection Abus", icon: Users },
            { id: "settings", label: "Règles & Sanctions Progressives", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 active:scale-[0.97]",
                  isCurrent
                    ? "text-[var(--accent-contrast)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70"
                )}
              >
                {isCurrent && <motion.span layoutId="mod-tab" transition={{ type: "spring", stiffness: 450, damping: 43 }} className="absolute inset-0 rounded-xl bg-[var(--accent-primary)] shadow-sm" />}
                <Icon className="relative h-3.5 w-3.5" />
                <span className="relative">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* CONTENEUR PRINCIPAL SCROLLABLE */}
      <main className="px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* BANNIÈRE BOT NON INSTALLÉ */}
          {selectedGuild && botGuildIds && !botGuildIds.includes(selectedGuild.id) && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-200">
                    Bot non présent sur ce serveur
                  </p>
                  <p className="text-xs text-amber-300/80">
                    Pour accéder aux dossiers de modération, logs et sanctions pour <span className="font-semibold">{selectedGuild.name}</span>, invitez le bot avec les permissions requises.
                  </p>
                </div>
              </div>
              <a
                href={BOT_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shrink-0 transition-colors"
              >
                <Bot className="h-3.5 w-3.5" />
                Inviter le bot
              </a>
            </div>
          )}

          {/* 5 OVERVIEW KPI STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 ">
              <span className="text-xs text-[var(--text-muted)] font-semibold block">Active cases</span>
              <p className="text-2xl font-extrabold text-orange-400 mt-1 font-mono">{stats.activeSanctionsCount}</p>
              <span className="text-xs text-[var(--text-muted)]">Sanctions actives en cours</span>
            </div>

            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 ">
              <span className="text-xs text-[var(--text-muted)] font-semibold block">Warnings today</span>
              <p className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">{stats.counts.warnings}</p>
              <span className="text-xs text-[var(--text-muted)]">Avertissements émis</span>
            </div>

            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 ">
              <span className="text-xs text-[var(--text-muted)] font-semibold block">Timeouts today</span>
              <p className="text-2xl font-extrabold text-orange-400 mt-1 font-mono">{stats.counts.timeouts}</p>
              <span className="text-xs text-[var(--text-muted)]">Membres temporairement exclus</span>
            </div>

            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 ">
              <span className="text-xs text-[var(--text-muted)] font-semibold block">Bans today</span>
              <p className="text-2xl font-extrabold text-red-400 mt-1 font-mono">{stats.counts.bans}</p>
              <span className="text-xs text-[var(--text-muted)]">Bannissements enregistrés</span>
            </div>

            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 col-span-2 sm:col-span-1">
              <span className="text-xs text-[var(--text-muted)] font-semibold block">Reports pending</span>
              <p className="text-2xl font-extrabold text-blue-400 mt-1 font-mono">{(stats as any).pendingReports || 0}</p>
              <span className="text-xs text-[var(--text-muted)]">Signalements en attente</span>
            </div>
          </div>

          {/* 🔎 FAST MEMBER SEARCH BAR */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Recherche Membre (Staff Console)</span>
              </div>
              <span className="text-xs text-[var(--text-muted)] font-mono hidden sm:inline">
                Username, Display name, User ID, Mention &lt;@ID&gt;, Case #
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Rechercher immédiatement un membre (@pseudo, 123456789, #1842)..."
                className="h-10 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 pl-10 pr-4 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-orange-500 transition-colors"
              />
              {isSearchingMember && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                </div>
              )}
            </div>

            {/* RÉSULTATS RAPIDES RECHERCHE */}
            {memberSearchResults.length > 0 && (
              <div className="stagger-children grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {memberSearchResults.map((m) => (
                  <div
                    key={m.userId}
                    className="p-3.5 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] flex items-center justify-between gap-3 hover:border-[var(--input-border-hover)] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[var(--text-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--text-primary)]">
                          {m.username.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--text-primary)]">@{m.userTag || m.username}</span>
                          <span
                            className={cn(
                              "text-xs font-bold px-1.5 py-0.5 rounded border",
                              m.riskLevel === "DANGEROUS"
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : m.riskLevel === "SUSPICIOUS"
                                ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                : "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-[var(--accent-primary)]/30"
                            )}
                          >
                            RISK: {m.riskLevel || "LOW"}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                          <span>Cases: {m.casesCount}</span>
                          <span>•</span>
                          <span>Warns: {m.warningsCount}</span>
                          <span>•</span>
                          <span>Timeouts: {m.timeoutsCount}</span>
                          <span>•</span>
                          <span>Bans: {m.bansCount}</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={selectedGuild ? `/discord/moderation/users/${m.userId}?guildId=${selectedGuild.id}` : `/discord/moderation/users/${m.userId}`}
                      className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      Open moderation profile
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* ONGLET 1: CASES TABLE (LISTE DES DOSSIERS)               */}
          {/* ======================================================== */}
          {activeTab === "cases" && (
            <div className="stagger-children space-y-4 animate-in fade-in duration-200">
              {/* BARRE DE RECHERCHE & FILTRES */}
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Recherche par #Case, nom, ID utilisateur, modérateur, motif..."
                    className="h-9 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  {/* Filtre Action */}
                  <Select
                    value={filterAction}
                    onChange={setFilterAction}
                    size="sm"
                    className="w-48 shrink-0"
                    aria-label="Filtrer par action"
                    options={[
                      { id: "ALL", label: "Toutes les actions" },
                      { id: "WARN", label: "Avertissements (WARN)" },
                      { id: "TIMEOUT", label: "Timeouts (TIMEOUT)" },
                      { id: "KICK", label: "Expulsions (KICK)" },
                      { id: "BAN", label: "Bannissements (BAN)" },
                      { id: "UNBAN", label: "Débannissements (UNBAN)" },
                      { id: "QUARANTINE", label: "Quarantaine" },
                    ]}
                  />

                  {/* Filtre Statut */}
                  <Select
                    value={filterStatus}
                    onChange={setFilterStatus}
                    size="sm"
                    className="w-40 shrink-0"
                    aria-label="Filtrer par statut"
                    options={[
                      { id: "ALL", label: "Tous les statuts" },
                      { id: "ACTIVE", label: "Actives" },
                      { id: "EXPIRED", label: "Expirées" },
                      { id: "REVOKED", label: "Révoquées / Pardonnées" },
                    ]}
                  />

                  {/* Filtre Source */}
                  <Select
                    value={filterSource}
                    onChange={setFilterSource}
                    size="sm"
                    className="w-44 shrink-0"
                    aria-label="Filtrer par source"
                    options={[
                      { id: "ALL", label: "Toutes les sources" },
                      { id: "MANUAL", label: "Manuelle (Staff)" },
                      { id: "AUTOMOD", label: "AutoMod" },
                      { id: "ANTI_RAID", label: "Anti-Raid" },
                    ]}
                  />
                </div>
              </div>

              {/* TABLEAU DES CASES */}
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 overflow-hidden">
                {cases.length === 0 ? (
                  <div className="pop-in py-16 text-center text-[var(--text-muted)]">
                    <FileCheck className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-xs font-semibold text-[var(--text-muted)]">Aucun dossier de modération trouvé</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Aucune sanction ne correspond à vos critères de recherche.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-xs font-semibold text-[var(--text-muted)]">
                          <th className="py-3 px-4">Case #</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Utilisateur</th>
                          <th className="py-3 px-4">Motif</th>
                          <th className="py-3 px-4">Modérateur</th>
                          <th className="py-3 px-4">Durée / Expiration</th>
                          <th className="py-3 px-4">Statut</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="stagger-children divide-y divide-[var(--panel-border)]">
                        {cases.map((c, i) => {
                          const conf = ACTION_CONFIG[c.action] || ACTION_CONFIG.WARN;
                          const Icon = conf.icon;
                          const isExpired = c.status === "EXPIRED";
                          const isRevoked = c.status === "REVOKED";

                          return (
                            <tr
                              key={c.id}
                              className="rise-in hover:bg-[var(--surface-raised)]/70 transition-colors group"
                              style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                            >
                              {/* Case # */}
                              <td className="py-3 px-4 font-mono font-bold text-[var(--text-primary)]">
                                #{c.caseNumber}
                              </td>

                              {/* Action badge */}
                              <td className="py-3 px-4">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-bold uppercase",
                                    conf.bg,
                                    conf.badge,
                                    conf.border
                                  )}
                                >
                                  <Icon className="h-3 w-3" />
                                  <span>{c.action}</span>
                                </span>
                              </td>

                              {/* Utilisateur */}
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => handleInspectUser(c.userId)}
                                  className="font-semibold text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:underline flex items-center gap-1.5"
                                >
                                  <span>{c.userTag}</span>
                                </button>
                                <span className="text-xs font-mono text-[var(--text-muted)]">
                                  {c.userId}
                                </span>
                              </td>

                              {/* Motif */}
                              <td className="py-3 px-4 max-w-xs">
                                <p className="text-[var(--text-muted)] line-clamp-1">{c.reason}</p>
                                <span className="text-xs text-[var(--text-muted)]">
                                  {c.standardCategory || "Other"} • {new Date(c.createdAt).toLocaleDateString()}
                                </span>
                              </td>

                              {/* Modérateur & Source */}
                              <td className="py-3 px-4">
                                <span className="font-medium text-[var(--text-muted)]">{c.moderatorTag}</span>
                                <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                  <span>Source :</span>
                                  <span className="font-mono text-[var(--text-muted)]">{c.source}</span>
                                </div>
                              </td>

                              {/* Durée & Expiration */}
                              <td className="py-3 px-4 text-[var(--text-muted)]">
                                {c.durationSeconds ? (
                                  <div>
                                    <span className="font-mono text-[var(--text-primary)]">
                                      {Math.round(c.durationSeconds / 60)} min
                                    </span>
                                    {c.expiresAt && (
                                      <p className="text-xs text-[var(--text-muted)]">
                                        Exp: {new Date(c.expiresAt).toLocaleTimeString()}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[var(--text-muted)] italic">Permanent</span>
                                )}
                              </td>

                              {/* Statut */}
                              <td className="py-3 px-4">
                                <span
                                  className={cn(
                                    "text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border",
                                    isRevoked
                                      ? "bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--panel-border)]"
                                      : isExpired
                                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                      : "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20"
                                  )}
                                >
                                  {c.status}
                                </span>
                              </td>

                              {/* Actions rapides */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Link
                                    href={`/discord/moderation/cases/${c.caseNumber}?guildId=${c.guildId}`}
                                    className="flex h-7 items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-all"
                                    title="Voir dossier complet"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>Détails</span>
                                  </Link>

                                  {c.status === "ACTIVE" && (
                                    <button
                                      onClick={() => setRevertingCase(c)}
                                      className="flex h-7 items-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-2 text-xs text-red-300 hover:bg-red-500/20 transition-all"
                                      title="Révoquer / Pardonner cette sanction"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                      <span>Pardon</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ONGLET WORKSPACE: MY MODERATION (ESPACE STAFF)          */}
          {/* ======================================================== */}
          {activeTab === "workspace" && (
            <div className="stagger-children space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 space-y-1">
                  <span className="text-xs text-orange-300 font-semibold block">Dossiers Assignés</span>
                  <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">
                    {cases.filter((c: any) => c.assignedTo?.id === profile?.user?.id).length}
                  </p>
                  <span className="text-xs text-orange-300/80">Dossiers sous votre responsabilité</span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
                  <span className="text-xs text-blue-300 font-semibold block">Signalements en Attente</span>
                  <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">
                    {(stats as any).pendingReports || 0}
                  </p>
                  <Link
                    href={selectedGuild ? `/discord/moderation/reports?guildId=${selectedGuild.id}` : "/discord/moderation/reports"}
                    className="text-xs text-blue-300 hover:underline flex items-center gap-1 font-semibold mt-1"
                  >
                    <span>Ouvrir la file des signalements</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <span className="text-xs text-amber-300 font-semibold block">Membres Actuellement Exclus</span>
                  <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">
                    {cases.filter((c) => c.action === "TIMEOUT" && c.status === "ACTIVE").length}
                  </p>
                  <span className="text-xs text-amber-300/80">Exclusions actives temporaires</span>
                </div>
              </div>

              {/* LISTE DES DOSSIERS RÉCENTS NÉCESSITANT UNE ATTENTION */}
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-orange-400" />
                    <span>Dossiers Récents Nécessitant une Attention Modérateur</span>
                  </h3>
                </div>

                <div className="stagger-children divide-y divide-[var(--panel-border)]">
                  {cases.slice(0, 6).map((c) => (
                    <div key={c.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--text-primary)] font-mono">#{c.caseNumber}</span>
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[var(--text-primary)]/10 text-[var(--text-primary)]">
                            {c.action}
                          </span>
                          <span className="text-xs font-semibold text-[var(--text-muted)]">@{c.userTag}</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">{c.reason}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/discord/moderation/users/${c.userId}?guildId=${c.guildId}`}
                          className="px-3 py-1.5 rounded-xl bg-[var(--surface-raised)]/40 hover:bg-[var(--text-primary)]/10 text-xs font-semibold text-[var(--text-primary)] transition-colors"
                        >
                          Profil Membre
                        </Link>
                        <Link
                          href={`/discord/moderation/cases/${c.caseNumber}?guildId=${c.guildId}`}
                          className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white transition-colors"
                        >
                          Dossier #{c.caseNumber}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 2: TIMELINE CHRONOLOGIQUE                         */}
          {/* ======================================================== */}
          {activeTab === "timeline" && (
            <div className="stagger-children space-y-4 animate-in fade-in duration-200">
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 ">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4 text-orange-400" />
                  Timeline Chronologique des Sanctions
                </h2>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--text-primary)]/10">
                  {cases.map((c, i) => {
                    const conf = ACTION_CONFIG[c.action] || ACTION_CONFIG.WARN;
                    return (
                      <div key={c.id} className="rise-in relative group" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                        <div className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg-main)] bg-orange-500 group-hover:scale-125 transition-transform" />
                        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5 hover:border-[var(--input-border-hover)] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
                                #{c.caseNumber}
                              </span>
                              <span
                                className={cn(
                                  "text-xs uppercase font-bold px-1.5 py-0.2 rounded border",
                                  conf.bg,
                                  conf.badge,
                                  conf.border
                                )}
                              >
                                {c.action}
                              </span>
                              <span className="text-xs font-semibold text-[var(--text-primary)]">
                                {c.userTag}
                              </span>
                              <span className="text-xs text-[var(--text-muted)]">
                                par {c.moderatorTag} ({c.source})
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">{c.reason}</p>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <span className="text-xs font-mono text-[var(--text-muted)]">
                              {new Date(c.createdAt).toLocaleTimeString()} • {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                            <Link
                              href={`/discord/moderation/cases/${c.caseNumber}?guildId=${c.guildId}`}
                              className="text-xs text-orange-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <span>Ouvrir</span>
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 3: ANALYTICS & TENDANCES                          */}
          {/* ======================================================== */}
          {activeTab === "analytics" && (
            <div className="stagger-children space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Répartition Manuelle vs Automatisée */}
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Origine des Sanctions
                  </h3>
                  <div className="space-y-2 pt-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text-muted)]">Modération Manuelle (Staff)</span>
                        <span className="font-bold text-[var(--text-primary)]">{stats.sources.manual}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--surface-raised)]/40 overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{
                            width: `${
                              stats.totalCases > 0
                                ? (stats.sources.manual / stats.totalCases) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text-muted)]">Automatisée (AutoMod / Anti-Raid)</span>
                        <span className="font-bold text-[var(--text-primary)]">{stats.sources.automated}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--surface-raised)]/40 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${
                              stats.totalCases > 0
                                ? (stats.sources.automated / stats.totalCases) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ventilation par type de sanction */}
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Ventilation des Sanctions
                  </h3>
                  <div className="stagger-children grid grid-cols-2 gap-2 pt-1">
                    {Object.entries(stats.counts).map(([type, count]) => (
                      <div
                        key={type}
                        className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 flex items-center justify-between"
                      >
                        <span className="text-xs text-[var(--text-muted)] capitalize">{type}</span>
                        <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 4: STAFF ACTIVITY & ABUSE GUARD                   */}
          {/* ======================================================== */}
          {activeTab === "staff" && (
            <div className="stagger-children space-y-4 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/15 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">
                      Protection Contre les Abus Staff (Staff Abuse Guard)
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Surveillance continue de la cadence des sanctions par modérateur. En cas de vagues suspectes (ex: plus de 10 bans en 60s), le système déclenche une alerte de sécurité critique et prévient les administrateurs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 5: RETENTION & SETTINGS                           */}
          {/* ======================================================== */}
          {activeTab === "settings" && (
            <div className="stagger-children space-y-4 animate-in fade-in duration-200">
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Politique de Conservation & Purge (Data Retention)
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Définissez la durée de conservation des dossiers de modération. Les cas plus anciens sont archivés selon la politique choisie.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { label: "30 jours", value: 30 },
                    { label: "90 jours", value: 90 },
                    { label: "1 an", value: 365 },
                    { label: "Illimité", value: 0 },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => saveRetention(p.value)}
                      aria-pressed={retentionDays === p.value}
                      className={`h-10 cursor-pointer rounded-xl border text-xs font-semibold transition-all ${
                        retentionDays === p.value
                          ? "border-orange-500 bg-orange-500/10 text-orange-300"
                          : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 hover:border-orange-500 hover:text-orange-400"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Sanction automatique après plusieurs avertissements</h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Quand un membre atteint le nombre d&apos;avertissements actifs choisi, le bot applique lui-même une sanction. Désactivez-la si vous voulez décider à la main.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(escalation?.enabled)}
                    aria-label="Sanction automatique après avertissements"
                    disabled={!escalation}
                    onClick={() => escalation && saveEscalation({ enabled: !escalation.enabled })}
                    className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-40 ${escalation?.enabled ? "bg-[var(--accent-primary)]" : "bg-[var(--text-primary)]/15"}`}
                  >
                    <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${escalation?.enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
                {!escalation && <p className="text-xs text-[var(--text-muted)]">Réglage indisponible : bot injoignable ou serveur non sélectionné.</p>}
                {escalation && escalation.enabled && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Select
                      label="Après"
                      value={String(escalation.threshold)}
                      onChange={(v) => saveEscalation({ threshold: Number(v) })}
                      size="sm"
                      options={[2, 3, 4, 5, 6, 8, 10].map((n) => ({ id: String(n), label: `${n} avertissements` }))}
                    />
                    <Select
                      label="Sanction"
                      value={escalation.action}
                      onChange={(v) => saveEscalation({ action: v as "timeout" | "kick" | "ban" })}
                      size="sm"
                      options={[
                        { id: "timeout", label: "Timeout" },
                        { id: "kick", label: "Expulsion" },
                        { id: "ban", label: "Bannissement" },
                      ]}
                    />
                    {escalation.action === "timeout" && (
                      <Select
                        label="Durée du timeout"
                        value={String(escalation.durationSeconds)}
                        onChange={(v) => saveEscalation({ durationSeconds: Number(v) })}
                        size="sm"
                        options={[
                          { id: "600", label: "10 minutes" },
                          { id: "3600", label: "1 heure" },
                          { id: "86400", label: "1 jour" },
                          { id: "604800", label: "7 jours" },
                        ]}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL: NOUVELLE SANCTION MANUELLE                        */}
      {/* ======================================================== */}
      {isNewSanctionOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/70 animate-in fade-in">
          <div className="w-full max-w-lg rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-orange-400" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Appliquer une Sanction Disciplinaire</h3>
              </div>
              <button
                onClick={() => setIsNewSanctionOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSanction} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-[var(--text-muted)]">Identifiant Utilisateur (User ID)</label>
                <input
                  type="text"
                  required
                  value={sanctionTargetId}
                  onChange={(e) => setSanctionTargetId(e.target.value)}
                  placeholder="Ex: 123456789012345678"
                  className="h-9 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 text-xs text-[var(--text-primary)] font-mono outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Action"
                  value={sanctionAction}
                  onChange={(v) => setSanctionAction(v as CaseAction)}
                  size="sm"
                  options={[
                    { id: "WARN", label: "Avertissement (WARN)" },
                    { id: "TIMEOUT", label: "Exclusion (TIMEOUT)" },
                    { id: "KICK", label: "Expulsion (KICK)" },
                    { id: "BAN", label: "Bannissement (BAN)" },
                    { id: "SOFTBAN", label: "Softban (Purge 7j)" },
                    { id: "QUARANTINE", label: "Mise en Quarantaine" },
                  ]}
                />

                <Select
                  label="Catégorie standard"
                  value={sanctionCategory}
                  onChange={setSanctionCategory}
                  size="sm"
                  options={STANDARD_REASONS.map((r) => ({ id: r, label: r }))}
                />
              </div>

              {sanctionAction === "TIMEOUT" && (
                <Select
                  label="Durée de l'exclusion"
                  value={sanctionDuration}
                  onChange={setSanctionDuration}
                  size="sm"
                  options={[
                    { id: "300", label: "5 minutes" },
                    { id: "600", label: "10 minutes" },
                    { id: "3600", label: "1 heure" },
                    { id: "86400", label: "24 heures" },
                    { id: "604800", label: "7 jours" },
                  ]}
                />
              )}

              <div className="space-y-1.5">
                <label className="font-medium text-[var(--text-muted)]">Motif détaillé</label>
                <textarea
                  rows={3}
                  value={sanctionReason}
                  onChange={(e) => setSanctionReason(e.target.value)}
                  placeholder="Précisez la raison de la sanction..."
                  className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-xs text-[var(--text-primary)] outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--panel-border)]">
                <button
                  type="button"
                  onClick={() => setIsNewSanctionOpen(false)}
                  className="h-8 rounded-xl border border-[var(--panel-border)] px-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSanction || !sanctionTargetId.trim()}
                  className="h-8 rounded-xl bg-orange-600 px-4 font-bold text-white hover:bg-orange-500 disabled:opacity-50"
                >
                  {isSubmittingSanction ? "Application..." : "Appliquer la Sanction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: RÉVOCATION / PARDON                                */}
      {/* ======================================================== */}
      {revertingCase && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/70 animate-in fade-in">
          <div className="w-full max-w-md rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-orange-400" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Révoquer la Case #{revertingCase.caseNumber}
                </h3>
              </div>
              <button
                onClick={() => setRevertingCase(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Cette action lèvera la sanction sur Discord et marquera le dossier comme révoqué dans l'audit log.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Motif de levée / pardon</label>
              <textarea
                rows={2}
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="Ex: Excuses acceptées, erreur de manipulation..."
                className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-orange-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--panel-border)]">
              <button
                type="button"
                onClick={() => setRevertingCase(null)}
                className="h-8 rounded-xl border border-[var(--panel-border)] px-4 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRevertCase}
                disabled={isSubmittingRevert}
                className="h-8 rounded-xl bg-orange-600 px-4 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-50"
              >
                {isSubmittingRevert ? "Révocation..." : "Confirmer le Pardon"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER: PROFIL MODÉRATION DU MEMBRE                      */}
      {/* ======================================================== */}
      {inspectedUserId && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/70 animate-in fade-in">
          <div className="w-full max-w-xl rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <Users className="h-5 w-5 text-orange-400" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Dossier Modération Membre</h3>
                  <p className="text-xs text-[var(--text-muted)] font-mono">{inspectedUserId}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setInspectedUserId(null);
                  setUserProfile(null);
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingProfile ? (
              <div className="py-12 text-center text-[var(--text-muted)]">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-orange-400" />
                <p className="text-xs">Chargement du profil...</p>
              </div>
            ) : userProfile ? (
              <div className="space-y-4">
                {/* Statistiques profil */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-center">
                    <span className="text-xs text-[var(--text-muted)]">Total Sanctions</span>
                    <p className="text-xl font-bold text-[var(--text-primary)] mt-1 font-mono">
                      {userProfile.stats.totalCases}
                    </p>
                  </div>
                  <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-center">
                    <span className="text-xs text-[var(--text-muted)]">Sanctions Actives</span>
                    <p className="text-xl font-bold text-orange-400 mt-1 font-mono">
                      {userProfile.stats.activeSanctionsCount}
                    </p>
                  </div>
                  <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-center">
                    <span className="text-xs text-[var(--text-muted)]">Score de Risque</span>
                    <p className="text-xl font-bold text-red-400 mt-1 font-mono">
                      {userProfile.calculatedRiskScore}/100
                    </p>
                  </div>
                </div>

                {/* Historique timeline */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Historique des Dossiers</span>
                  {userProfile.timeline.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] italic">Aucune sanction au dossier.</p>
                  ) : (
                    <div className="stagger-children space-y-1.5 max-h-48 overflow-y-auto">
                      {userProfile.timeline.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-[var(--text-primary)] font-mono mr-2">#{c.caseNumber}</span>
                            <span className="text-[var(--text-muted)] font-medium">{c.action}</span>
                            <p className="text-xs text-[var(--text-muted)]">
                              {c.reason} • {new Date(c.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-xs uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--text-primary)]/10 text-[var(--text-muted)] font-mono">
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-[var(--panel-border)]">
                  <button
                    type="button"
                    onClick={() => {
                      setInspectedUserId(null);
                      setUserProfile(null);
                    }}
                    className="h-8 rounded-xl bg-[var(--text-primary)]/10 px-4 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--text-primary)]/15"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
