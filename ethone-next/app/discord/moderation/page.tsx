"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
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
  RotateCcw,
  Calendar,
  BarChart3,
  TrendingUp,
  FileCheck,
  Download,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

// ==========================================
// TYPES MODERATION CENTER 2.0
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

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "http://localhost:3001";

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
    badge: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    icon: UserCheck,
  },
  SOFTBAN: {
    label: "Softban",
    badge: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
    icon: Trash2,
  },
  QUARANTINE: {
    label: "Quarantaine",
    badge: "text-indigo-400",
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/10",
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
  const router = useRouter();
  const searchParams = useSearchParams();
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
    "cases" | "timeline" | "analytics" | "staff" | "settings"
  >("cases");

  // Données
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [totalCasesCount, setTotalCasesCount] = useState(0);
  const [stats, setStats] = useState<OverviewStats>({
    totalCases: 0,
    casesToday: 0,
    activeSanctionsCount: 0,
    counts: { warnings: 0, timeouts: 0, kicks: 0, bans: 0, quarantines: 0 },
    sources: { manual: 0, automated: 0 },
  });
  const [isLoading, setIsLoading] = useState(false);

  // Recherche & Filtres
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
    setIsLoading(true);
    try {
      // 1. Overview stats
      const ovRes = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/overview`);
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
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  }, [selectedGuild, filterAction, filterStatus, filterSource, searchQuery]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Inspecter un profil utilisateur
  const handleInspectUser = async (userId: string) => {
    if (!selectedGuild || !userId) return;
    setInspectedUserId(userId);
    setIsLoadingProfile(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/users/${userId}/profile`);
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

    setIsSubmittingSanction(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/cases`, {
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
        showError("Échec de la sanction", errData.error || "Impossible d'appliquer la sanction.");
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

    setIsSubmittingRevert(true);
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/cases/${revertingCase.caseNumber}/revert`,
        {
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
        showError("Échec", err.error || "Impossible de révoquer la case.");
      }
    } catch {
      showError("Erreur réseau", "Impossible de contacter l'API.");
    } finally {
      setIsSubmittingRevert(false);
    }
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-orange-400 shadow-inner">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold tracking-tight text-white">
                    Moderation Center 2.0
                  </h1>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/30">
                    Case System
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Historique centralisé, sanctions automatiques & manuelles, suivi des dossiers membres.
                </p>
              </div>
            </div>
          </div>

          {/* Actions Header (Sélecteur, Actualiser, Nouvelle Sanction) */}
          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
            {manageableGuilds.length > 0 && (
              <div className="relative">
                <select
                  value={selectedGuild?.id || ""}
                  onChange={(e) => {
                    const g = manageableGuilds.find((item) => item.id === e.target.value);
                    if (g) setSelectedGuild(g);
                  }}
                  className="h-8 rounded-xl border border-white/10 bg-zinc-900/90 px-3 pr-8 text-xs font-medium text-white outline-none hover:border-white/20 focus:border-orange-500 appearance-none cursor-pointer"
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

            <button
              onClick={fetchOverview}
              disabled={isLoading}
              className="flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
              title="Rafraîchir les dossiers et sanctions"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-orange-400")} />
              <span className="hidden md:inline">Actualiser</span>
            </button>

            <button
              onClick={() => setIsNewSanctionOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-3.5 text-xs font-semibold text-white shadow-lg shadow-orange-500/10 hover:from-orange-500 hover:to-amber-500 transition-all active:scale-95"
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
            { id: "timeline", label: "Timeline Chronologique", icon: Clock },
            { id: "analytics", label: "Statistiques & Tendances", icon: BarChart3 },
            { id: "staff", label: "Activité Staff & Protection Abus", icon: Users },
            { id: "settings", label: "Rétention & Paramètres", icon: Settings },
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
                <Icon className={cn("h-3.5 w-3.5", isCurrent ? "text-orange-400" : "text-zinc-400")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* CONTENEUR PRINCIPAL SCROLLABLE */}
      <main className="flex-1 min-h-0 overflow-y-auto pb-36 px-4 sm:px-6 py-6 scrollbar-thin scrollbar-thumb-white/10">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* OVERVIEW STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-md">
              <span className="text-[11px] text-zinc-400 font-medium">Cases Aujourd'hui</span>
              <p className="text-2xl font-bold text-white mt-1 font-mono">{stats.casesToday}</p>
              <span className="text-[10px] text-zinc-500">{stats.totalCases} au total</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-md">
              <span className="text-[11px] text-zinc-400 font-medium">Sanctions Actives</span>
              <p className="text-2xl font-bold text-orange-400 mt-1 font-mono">
                {stats.activeSanctionsCount}
              </p>
              <span className="text-[10px] text-orange-400/80">En cours d'application</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-md">
              <span className="text-[11px] text-zinc-400 font-medium">Avertissements</span>
              <p className="text-2xl font-bold text-amber-400 mt-1 font-mono">{stats.counts.warnings}</p>
              <span className="text-[10px] text-zinc-500">Avis formels</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-md">
              <span className="text-[11px] text-zinc-400 font-medium">Timeouts</span>
              <p className="text-2xl font-bold text-orange-400 mt-1 font-mono">{stats.counts.timeouts}</p>
              <span className="text-[10px] text-zinc-500">Exclusions tempo</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-md">
              <span className="text-[11px] text-zinc-400 font-medium">Expulsions (Kicks)</span>
              <p className="text-2xl font-bold text-rose-400 mt-1 font-mono">{stats.counts.kicks}</p>
              <span className="text-[10px] text-zinc-500">Membres éjectés</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-md">
              <span className="text-[11px] text-zinc-400 font-medium">Bannissements</span>
              <p className="text-2xl font-bold text-red-400 mt-1 font-mono">{stats.counts.bans}</p>
              <span className="text-[10px] text-zinc-500">Bans permanents</span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* ONGLET 1: CASES TABLE (LISTE DES DOSSIERS)               */}
          {/* ======================================================== */}
          {activeTab === "cases" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* BARRE DE RECHERCHE & FILTRES */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Recherche par #Case, nom, ID utilisateur, modérateur, motif..."
                    className="h-9 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  {/* Filtre Action */}
                  <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="h-9 rounded-xl border border-white/10 bg-zinc-900 px-2.5 text-xs text-zinc-300 outline-none hover:border-white/20"
                  >
                    <option value="ALL">Toutes les actions</option>
                    <option value="WARN">Avertissements (WARN)</option>
                    <option value="TIMEOUT">Timeouts (TIMEOUT)</option>
                    <option value="KICK">Expulsions (KICK)</option>
                    <option value="BAN">Bannissements (BAN)</option>
                    <option value="UNBAN">Débannissements (UNBAN)</option>
                    <option value="QUARANTINE">Quarantaine</option>
                  </select>

                  {/* Filtre Statut */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-9 rounded-xl border border-white/10 bg-zinc-900 px-2.5 text-xs text-zinc-300 outline-none hover:border-white/20"
                  >
                    <option value="ALL">Tous les statuts</option>
                    <option value="ACTIVE">Actives</option>
                    <option value="EXPIRED">Expirées</option>
                    <option value="REVOKED">Révoquées / Pardonnées</option>
                  </select>

                  {/* Filtre Source */}
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="h-9 rounded-xl border border-white/10 bg-zinc-900 px-2.5 text-xs text-zinc-300 outline-none hover:border-white/20"
                  >
                    <option value="ALL">Toutes les sources</option>
                    <option value="MANUAL">Manuelle (Staff)</option>
                    <option value="AUTOMOD">AutoMod 2.0</option>
                    <option value="ANTI_RAID">Anti-Raid 2.0</option>
                  </select>
                </div>
              </div>

              {/* TABLEAU DES CASES */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden">
                {cases.length === 0 ? (
                  <div className="py-16 text-center text-zinc-500">
                    <FileCheck className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-zinc-300">Aucun dossier de modération trouvé</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Aucune sanction ne correspond à vos critères de recherche.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-semibold text-zinc-400">
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
                      <tbody className="divide-y divide-white/[0.04]">
                        {cases.map((c) => {
                          const conf = ACTION_CONFIG[c.action] || ACTION_CONFIG.WARN;
                          const Icon = conf.icon;
                          const isExpired = c.status === "EXPIRED";
                          const isRevoked = c.status === "REVOKED";

                          return (
                            <tr
                              key={c.id}
                              className="hover:bg-white/[0.02] transition-colors group"
                            >
                              {/* Case # */}
                              <td className="py-3 px-4 font-mono font-bold text-white">
                                #{c.caseNumber}
                              </td>

                              {/* Action badge */}
                              <td className="py-3 px-4">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase",
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
                                  className="font-semibold text-zinc-200 hover:text-white hover:underline flex items-center gap-1.5"
                                >
                                  <span>{c.userTag}</span>
                                </button>
                                <span className="text-[10px] font-mono text-zinc-500">
                                  {c.userId}
                                </span>
                              </td>

                              {/* Motif */}
                              <td className="py-3 px-4 max-w-xs">
                                <p className="text-zinc-300 line-clamp-1">{c.reason}</p>
                                <span className="text-[10px] text-zinc-500">
                                  {c.standardCategory || "Other"} • {new Date(c.createdAt).toLocaleDateString()}
                                </span>
                              </td>

                              {/* Modérateur & Source */}
                              <td className="py-3 px-4">
                                <span className="font-medium text-zinc-300">{c.moderatorTag}</span>
                                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                                  <span>Source :</span>
                                  <span className="font-mono text-zinc-400">{c.source}</span>
                                </div>
                              </td>

                              {/* Durée & Expiration */}
                              <td className="py-3 px-4 text-zinc-400">
                                {c.durationSeconds ? (
                                  <div>
                                    <span className="font-mono text-zinc-200">
                                      {Math.round(c.durationSeconds / 60)} min
                                    </span>
                                    {c.expiresAt && (
                                      <p className="text-[10px] text-zinc-500">
                                        Exp: {new Date(c.expiresAt).toLocaleTimeString()}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-zinc-500 italic">Permanent</span>
                                )}
                              </td>

                              {/* Statut */}
                              <td className="py-3 px-4">
                                <span
                                  className={cn(
                                    "text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border",
                                    isRevoked
                                      ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                      : isExpired
                                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
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
                                    className="flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
                                    title="Voir dossier complet"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>Détails</span>
                                  </Link>

                                  {c.status === "ACTIVE" && (
                                    <button
                                      onClick={() => setRevertingCase(c)}
                                      className="flex h-7 items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2 text-[11px] text-red-300 hover:bg-red-500/20 transition-all"
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
          {/* ONGLET 2: TIMELINE CHRONOLOGIQUE                         */}
          {/* ======================================================== */}
          {activeTab === "timeline" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md">
                <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4 text-orange-400" />
                  Timeline Chronologique des Sanctions
                </h2>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                  {cases.map((c) => {
                    const conf = ACTION_CONFIG[c.action] || ACTION_CONFIG.WARN;
                    const Icon = conf.icon;
                    return (
                      <div key={c.id} className="relative group">
                        <div className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[#07080A] bg-orange-500 group-hover:scale-125 transition-transform" />
                        <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3.5 hover:border-white/10 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white font-mono">
                                #{c.caseNumber}
                              </span>
                              <span
                                className={cn(
                                  "text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border",
                                  conf.bg,
                                  conf.badge,
                                  conf.border
                                )}
                              >
                                {c.action}
                              </span>
                              <span className="text-xs font-semibold text-zinc-200">
                                {c.userTag}
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                par {c.moderatorTag} ({c.source})
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300">{c.reason}</p>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <span className="text-[10px] font-mono text-zinc-500">
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
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Répartition Manuelle vs Automatisée */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Origine des Sanctions
                  </h3>
                  <div className="space-y-2 pt-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">Modération Manuelle (Staff)</span>
                        <span className="font-bold text-white">{stats.sources.manual}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
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
                        <span className="text-zinc-400">Automatisée (AutoMod / Anti-Raid)</span>
                        <span className="font-bold text-white">{stats.sources.automated}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
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
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Ventilation des Sanctions
                  </h3>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {Object.entries(stats.counts).map(([type, count]) => (
                      <div
                        key={type}
                        className="rounded-xl border border-white/5 bg-black/40 p-2.5 flex items-center justify-between"
                      >
                        <span className="text-xs text-zinc-400 capitalize">{type}</span>
                        <span className="text-sm font-bold text-white font-mono">{count}</span>
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
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      Protection Contre les Abus Staff (Staff Abuse Guard)
                    </h3>
                    <p className="text-[11px] text-zinc-300 mt-0.5">
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
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Politique de Conservation & Purge (Data Retention)
                </h3>
                <p className="text-xs text-zinc-400">
                  Définissez la durée de conservation des dossiers de modération. Les cas plus anciens sont archivés selon la politique choisie.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { label: "30 jours", value: 30 },
                    { label: "90 jours", value: 90 },
                    { label: "1 an", value: 365 },
                    { label: "Illimité (Forever)", value: 0 },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      className="h-10 rounded-xl border border-white/10 bg-white/[0.02] text-xs font-semibold hover:border-orange-500 hover:text-orange-400 transition-all"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL: NOUVELLE SANCTION MANUELLE                        */}
      {/* ======================================================== */}
      {isNewSanctionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0C0D12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">Appliquer une Sanction Disciplinaire</h3>
              </div>
              <button
                onClick={() => setIsNewSanctionOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSanction} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-zinc-300">Identifiant Utilisateur (User ID)</label>
                <input
                  type="text"
                  required
                  value={sanctionTargetId}
                  onChange={(e) => setSanctionTargetId(e.target.value)}
                  placeholder="Ex: 123456789012345678"
                  className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white font-mono outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-300">Action</label>
                  <select
                    value={sanctionAction}
                    onChange={(e) => setSanctionAction(e.target.value as CaseAction)}
                    className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none"
                  >
                    <option value="WARN">Avertissement (WARN)</option>
                    <option value="TIMEOUT">Exclusion (TIMEOUT)</option>
                    <option value="KICK">Expulsion (KICK)</option>
                    <option value="BAN">Bannissement (BAN)</option>
                    <option value="SOFTBAN">Softban (Purge 7j)</option>
                    <option value="QUARANTINE">Mise en Quarantaine</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-300">Catégorie standard</label>
                  <select
                    value={sanctionCategory}
                    onChange={(e) => setSanctionCategory(e.target.value)}
                    className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none"
                  >
                    {STANDARD_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {sanctionAction === "TIMEOUT" && (
                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-300">Durée de l'exclusion</label>
                  <select
                    value={sanctionDuration}
                    onChange={(e) => setSanctionDuration(e.target.value)}
                    className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none"
                  >
                    <option value="300">5 minutes</option>
                    <option value="600">10 minutes</option>
                    <option value="3600">1 heure</option>
                    <option value="86400">24 heures</option>
                    <option value="604800">7 jours</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-medium text-zinc-300">Motif détaillé</label>
                <textarea
                  rows={3}
                  value={sanctionReason}
                  onChange={(e) => setSanctionReason(e.target.value)}
                  placeholder="Précisez la raison de la sanction..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewSanctionOpen(false)}
                  className="h-8 rounded-xl border border-white/10 px-4 text-zinc-400 hover:text-white"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C0D12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">
                  Révoquer la Case #{revertingCase.caseNumber}
                </h3>
              </div>
              <button
                onClick={() => setRevertingCase(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Cette action lèvera la sanction sur Discord et marquera le dossier comme révoqué dans l'audit log.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Motif de levée / pardon</label>
              <textarea
                rows={2}
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="Ex: Excuses acceptées, erreur de manipulation..."
                className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-orange-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRevertingCase(null)}
                className="h-8 rounded-xl border border-white/10 px-4 text-xs font-medium text-zinc-400 hover:text-white"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0C0D12] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Users className="h-5 w-5 text-orange-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Dossier Modération Membre</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">{inspectedUserId}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setInspectedUserId(null);
                  setUserProfile(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingProfile ? (
              <div className="py-12 text-center text-zinc-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-orange-400" />
                <p className="text-xs">Chargement du profil...</p>
              </div>
            ) : userProfile ? (
              <div className="space-y-4">
                {/* Statistiques profil */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                    <span className="text-[10px] text-zinc-500">Total Sanctions</span>
                    <p className="text-xl font-bold text-white mt-1 font-mono">
                      {userProfile.stats.totalCases}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                    <span className="text-[10px] text-zinc-500">Sanctions Actives</span>
                    <p className="text-xl font-bold text-orange-400 mt-1 font-mono">
                      {userProfile.stats.activeSanctionsCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                    <span className="text-[10px] text-zinc-500">Score de Risque</span>
                    <p className="text-xl font-bold text-red-400 mt-1 font-mono">
                      {userProfile.calculatedRiskScore}/100
                    </p>
                  </div>
                </div>

                {/* Historique timeline */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-zinc-300">Historique des Dossiers</span>
                  {userProfile.timeline.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 italic">Aucune sanction au dossier.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {userProfile.timeline.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-lg border border-white/5 bg-black/40 p-2.5 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-white font-mono mr-2">#{c.caseNumber}</span>
                            <span className="text-zinc-300 font-medium">{c.action}</span>
                            <p className="text-[10px] text-zinc-500">
                              {c.reason} • {new Date(c.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono">
                            {c.status}
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
                      setUserProfile(null);
                    }}
                    className="h-8 rounded-xl bg-white/10 px-4 text-xs font-medium text-white hover:bg-white/20"
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
