"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  Users,
  UserX,
  UserCheck,
  Clock,
  Activity,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  VolumeX,
  Ban,
  Calendar,
  Layers,
  MessageSquare,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Link2,
  Save,
  Check,
  X,
  Search,
  Filter,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "http://localhost:3001";

const STANDARD_REASONS = [
  "Spam répétitif / Flood",
  "Harcèlement ou propos injurieux",
  "Contenu NSFW ou inapproprié",
  "Publicité non sollicitée (DM / Salons)",
  "Tentative de phishing / Arnaque",
  "Comportement toxique envers la communauté",
  "Participation à un raid",
  "Violation du règlement intérieur",
  "Autre motif",
];

export default function UserModerationProfileClient() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const { profile, loading: discordLoading } = useDiscordOAuth();

  const rawUserId = String(params?.userId || "");
  const queryUserId = searchParams.get("userId");
  const targetUserId = rawUserId && rawUserId !== "demo" ? rawUserId : queryUserId || "123456789012345678";

  // Guilds
  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (!profile?.guilds) return [];
    return profile.guilds.filter((g) => {
      if (g.owner) return true;
      if (!g.permissions) return false;
      const num = Number(g.permissions);
      return (num & 8) === 8 || (num & 32) === 32;
    });
  }, [profile?.guilds]);

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

  // Onglet actif
  const [activeTab, setActiveTab] = useState<
    "overview" | "cases" | "warnings" | "sanctions" | "notes" | "evidence" | "activity" | "reports"
  >("overview");

  // Données
  const [userProfile, setUserProfile] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtre timeline
  const [timelineFilter, setTimelineFilter] = useState<string>("ALL");

  // Note staff
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Modals d'actions rapides
  const [activeActionModal, setActiveActionModal] = useState<
    "WARN" | "TIMEOUT" | "KICK" | "BAN" | "UNBAN" | "QUARANTINE" | null
  >(null);

  const [actionReason, setActionReason] = useState("");
  const [actionStandardCategory, setActionStandardCategory] = useState(STANDARD_REASONS[0]);
  const [internalNote, setInternalNote] = useState("");
  const [sendDm, setSendDm] = useState(true);
  const [createCaseToggle, setCreateCaseToggle] = useState(true);
  const [timeoutDuration, setTimeoutDuration] = useState("3600"); // 1 hour default
  const [banDeleteDays, setBanDeleteDays] = useState("1"); // 1 jour
  const [confirmDangerous, setConfirmDangerous] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Modal Révocation
  const [revertingCase, setRevertingCase] = useState<any | null>(null);
  const [revertReason, setRevertReason] = useState("");
  const [isSubmittingRevert, setIsSubmittingRevert] = useState(false);

  // Charger profil, timeline et reports
  const fetchData = useCallback(async () => {
    if (!selectedGuild || !targetUserId) return;
    setIsLoading(true);
    try {
      // 1. Profil
      const profRes = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/users/${targetUserId}/profile`
      );
      if (profRes.ok) {
        const pData = await profRes.json();
        if (pData.profile) setUserProfile(pData.profile);
      }

      // 2. Timeline unifiée
      const timeRes = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/users/${targetUserId}/timeline`
      );
      if (timeRes.ok) {
        const tData = await timeRes.json();
        if (tData.timeline) setTimeline(tData.timeline);
      }

      // 3. Reports
      const repRes = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/reports?reportedUserId=${targetUserId}`
      );
      if (repRes.ok) {
        const rData = await repRes.json();
        if (rData.reports) setReports(rData.reports);
      }
    } catch {
      // Offline fallback mock
      setUserProfile({
        userId: targetUserId,
        userTag: "Utilisateur#0000",
        username: "Utilisateur",
        avatarUrl: null,
        joinedServerAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        accountCreatedAt: new Date(Date.now() - 365 * 86400000).toISOString(),
        roles: [{ id: "1", name: "Membre", color: "#10B981" }],
        stats: { warnings: 2, timeouts: 1, kicks: 0, bans: 0, quarantines: 0, totalCases: 3, activeSanctionsCount: 0 },
        calculatedRiskScore: 32,
        trustLevel: "LOW",
        riskBreakdown: { sanctions: 20, warnings: 20, autoModTriggers: 0, reportsCount: 0, recidivismPenalty: 0 },
        recentIncidentsCount: 0,
        activeSanctions: [],
        timeline: [],
        notes: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedGuild, targetUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calcul du label de risque
  const riskBadge = useMemo(() => {
    const score = userProfile?.calculatedRiskScore || 0;
    if (score >= 75) return { label: "CRITIQUE", bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" };
    if (score >= 40) return { label: "ÉLEVÉ", bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" };
    if (score >= 20) return { label: "MODÉRÉ", bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" };
    return { label: "FAIBLE", bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" };
  }, [userProfile?.calculatedRiskScore]);

  // Statut actuel
  const currentStatus = useMemo(() => {
    if (!userProfile) return { label: "Normal", color: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-500" };
    if (userProfile.stats?.bans > 0) return { label: "Banni", color: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-500" };
    if (userProfile.activeSanctions?.some((s: any) => s.action === "TIMEOUT"))
      return { label: "En Exclusion (Timeout)", color: "text-orange-400", bg: "bg-orange-500/10", dot: "bg-orange-500" };
    if (userProfile.activeSanctions?.some((s: any) => s.action === "QUARANTINE"))
      return { label: "Quarantaine", color: "text-indigo-400", bg: "bg-indigo-500/10", dot: "bg-indigo-500" };
    return { label: "Normal", color: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-500" };
  }, [userProfile]);

  // Calcul live de l'expiration du timeout
  const timeoutExpiryText = useMemo(() => {
    const secs = parseInt(timeoutDuration, 10);
    if (isNaN(secs) || secs <= 0) return "Durée indéterminée";
    const date = new Date(Date.now() + secs * 1000);
    return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  }, [timeoutDuration]);

  // Exécution d'une action rapide
  const handleExecuteAction = async () => {
    if (!selectedGuild || !activeActionModal) return;
    if ((activeActionModal === "BAN" || activeActionModal === "KICK") && !confirmDangerous) {
      showError("Confirmation requise", "Veuillez cocher la case de confirmation pour les actions destructives.");
      return;
    }

    setIsSubmittingAction(true);
    try {
      const reason = actionReason.trim() || actionStandardCategory;
      const durationSeconds = activeActionModal === "TIMEOUT" ? parseInt(timeoutDuration, 10) : null;

      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          userTag: userProfile?.userTag || targetUserId,
          action: activeActionModal,
          reason,
          standardCategory: actionStandardCategory,
          durationSeconds,
          metadata: {
            sendDm,
            internalNote: internalNote.trim() || undefined,
            banDeleteDays: activeActionModal === "BAN" ? banDeleteDays : undefined,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'application de la sanction");
      }

      const data = await res.json();
      success("Sanction appliquée", `Case #${data.case?.caseNumber || ""} enregistrée avec succès.`);
      setActiveActionModal(null);
      setActionReason("");
      setInternalNote("");
      setConfirmDangerous(false);
      fetchData();
    } catch (err: any) {
      showError("Échec de l'action", err.message || "Impossible d'appliquer la sanction.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Ajout de note staff
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuild || !newNoteContent.trim()) return;
    setIsSubmittingNote(true);
    try {
      const latestCase = userProfile?.timeline?.[0];
      const caseNumber = latestCase?.caseNumber || 1;
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/cases/${caseNumber}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newNoteContent.trim() }),
        }
      );

      if (res.ok) {
        success("Note enregistrée", "La note privée a été consignée pour ce membre.");
        setNewNoteContent("");
        fetchData();
      } else {
        throw new Error("Erreur serveur");
      }
    } catch {
      showError("Erreur", "Impossible d'enregistrer la note staff.");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Révocation d'une case
  const handleRevertCase = async () => {
    if (!selectedGuild || !revertingCase) return;
    setIsSubmittingRevert(true);
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/cases/${revertingCase.caseNumber}/revert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: revertReason.trim() || "Pardon accordé par le staff" }),
        }
      );

      if (res.ok) {
        success("Sanction révoquée", `La Case #${revertingCase.caseNumber} a été levée avec succès.`);
        setRevertingCase(null);
        setRevertReason("");
        fetchData();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Erreur révocation");
      }
    } catch (err: any) {
      showError("Échec du pardon", err.message || "Impossible de révoquer la sanction.");
    } finally {
      setIsSubmittingRevert(false);
    }
  };

  // Timeline filtrée
  const filteredTimeline = useMemo(() => {
    if (timelineFilter === "ALL") return timeline;
    return timeline.filter((item) => item.category === timelineFilter);
  }, [timeline, timelineFilter]);

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-200 pb-36 font-sans">
      {/* HEADER NAVIGATION */}
      <div className="border-b border-white/5 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={selectedGuild ? `/discord/moderation?guildId=${selectedGuild.id}` : "/discord/moderation"}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Staff Console</span>
                <span className="text-slate-600">/</span>
                <span className="text-xs font-semibold text-ethone-accent">Profil Modérateur</span>
              </div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{userProfile?.username || "Chargement..."}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400 font-mono">
                  {targetUserId}
                </span>
              </h1>
            </div>
          </div>

          {/* SÉLECTEUR GUILD & STATUT ACTUEL */}
          <div className="flex items-center gap-3">
            <div className={cn("px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-medium", currentStatus.bg, currentStatus.color, "border-current/20")}>
              <span className={cn("w-2 h-2 rounded-full animate-pulse", currentStatus.dot)} />
              <span>Statut : {currentStatus.label}</span>
            </div>

            {manageableGuilds.length > 0 && (
              <select
                value={selectedGuild?.id || ""}
                onChange={(e) => {
                  const g = manageableGuilds.find((item) => item.id === e.target.value);
                  if (g) setSelectedGuild(g);
                }}
                className="bg-slate-800/80 border border-white/10 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-ethone-accent"
              >
                {manageableGuilds.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        {/* CARD PROFIL & SCORE DE RISQUE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FICHE IDENTITÉ */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative">
                {userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt="Avatar"
                    className="w-20 h-20 rounded-2xl object-cover ring-2 ring-white/10"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-2xl font-bold text-white">
                    {userProfile?.username?.substring(0, 2).toUpperCase() || "??"}
                  </div>
                )}
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 w-5 h-5 rounded-full ring-2 ring-slate-900",
                    currentStatus.dot
                  )}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-extrabold text-white">{userProfile?.username}</h2>
                  {userProfile?.globalName && (
                    <span className="text-sm text-slate-400 font-medium">({userProfile.globalName})</span>
                  )}
                </div>
                <div className="text-xs font-mono text-slate-400 flex items-center gap-2 flex-wrap">
                  <span>ID: {targetUserId}</span>
                  <span>•</span>
                  <span>
                    Arrivée :{" "}
                    {userProfile?.joinedServerAt
                      ? new Date(userProfile.joinedServerAt).toLocaleDateString("fr-FR")
                      : "Inconnue"}
                  </span>
                  <span>•</span>
                  <span>
                    Création compte :{" "}
                    {userProfile?.accountCreatedAt
                      ? new Date(userProfile.accountCreatedAt).toLocaleDateString("fr-FR")
                      : "Inconnue"}
                  </span>
                </div>

                {/* RÔLES */}
                <div className="flex items-center gap-1.5 flex-wrap pt-2">
                  {userProfile?.roles?.length > 0 ? (
                    userProfile.roles.map((r: any) => (
                      <span
                        key={r.id}
                        className="text-[11px] px-2 py-0.5 rounded-md font-medium border"
                        style={{
                          backgroundColor: `${r.color || "#4F46E5"}15`,
                          borderColor: `${r.color || "#4F46E5"}40`,
                          color: r.color || "#818CF8",
                        }}
                      >
                        {r.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">Aucun rôle spécifique</span>
                  )}
                </div>
              </div>
            </div>

            {/* STATISTIQUES SANCTIONS DU MEMBRE */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 mt-6 border-t border-white/5">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 text-center">
                <span className="text-xs text-slate-400 block font-medium">Warnings</span>
                <span className="text-lg font-bold text-amber-400">{userProfile?.stats?.warnings || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 text-center">
                <span className="text-xs text-slate-400 block font-medium">Timeouts</span>
                <span className="text-lg font-bold text-orange-400">{userProfile?.stats?.timeouts || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 text-center">
                <span className="text-xs text-slate-400 block font-medium">Kicks</span>
                <span className="text-lg font-bold text-rose-400">{userProfile?.stats?.kicks || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 text-center">
                <span className="text-xs text-slate-400 block font-medium">Bans</span>
                <span className="text-lg font-bold text-red-400">{userProfile?.stats?.bans || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 text-center col-span-2 sm:col-span-1">
                <span className="text-xs text-slate-400 block font-medium">Cases Total</span>
                <span className="text-lg font-bold text-white">{userProfile?.stats?.totalCases || 0}</span>
              </div>
            </div>
          </div>

          {/* JAUGE DE SCORE DE RISQUE */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-ethone-accent" />
                  <span className="text-sm font-bold text-white">Score de Risque</span>
                </div>
                <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", riskBadge.bg, riskBadge.text, riskBadge.border)}>
                  {riskBadge.label}
                </span>
              </div>

              {/* JAUGE CIRCULAIRE / BARRE */}
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white tracking-tight">
                  {userProfile?.calculatedRiskScore || 0}
                </span>
                <span className="text-sm text-slate-400 font-semibold">/ 100</span>
              </div>

              {/* BARRE DE PROGRESSION */}
              <div className="w-full h-3 bg-slate-800/80 rounded-full mt-3 overflow-hidden p-0.5 ring-1 ring-white/5">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    (userProfile?.calculatedRiskScore || 0) >= 75
                      ? "bg-gradient-to-r from-orange-500 to-red-500"
                      : (userProfile?.calculatedRiskScore || 0) >= 40
                      ? "bg-gradient-to-r from-amber-500 to-orange-500"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500"
                  )}
                  style={{ width: `${userProfile?.calculatedRiskScore || 0}%` }}
                />
              </div>

              {/* FACTEURS DE RISQUE */}
              <div className="mt-4 space-y-1.5 text-xs text-slate-400 font-medium">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Sanctions directes</span>
                  <span className="text-slate-300 font-mono">+{userProfile?.riskBreakdown?.sanctions || 0} pts</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Avertissements (Warnings)</span>
                  <span className="text-slate-300 font-mono">+{userProfile?.riskBreakdown?.warnings || 0} pts</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Incidents AutoMod / Anti-Raid</span>
                  <span className="text-slate-300 font-mono">+{userProfile?.riskBreakdown?.autoModTriggers || 0} pts</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Signalements déposés</span>
                  <span className="text-slate-300 font-mono">+{userProfile?.riskBreakdown?.reportsCount || 0} pts</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Pénalité de récidive récente</span>
                  <span className="text-slate-300 font-mono">+{userProfile?.riskBreakdown?.recidivismPenalty || 0} pts</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Le score de risque est calculé pour guider vos modérateurs. Il ne prend aucune décision automatique sans accord humain.
              </span>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS TOOLBAR */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">Actions Rapides Staff :</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveActionModal("WARN")}
              className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Avertir (Warn)</span>
            </button>

            <button
              onClick={() => setActiveActionModal("TIMEOUT")}
              className="px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <VolumeX className="w-4 h-4" />
              <span>Exclure (Timeout)</span>
            </button>

            <button
              onClick={() => setActiveActionModal("KICK")}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <UserX className="w-4 h-4" />
              <span>Expulser (Kick)</span>
            </button>

            <button
              onClick={() => setActiveActionModal("BAN")}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Ban className="w-4 h-4" />
              <span>Bannir (Ban)</span>
            </button>

            <button
              onClick={() => setActiveActionModal("QUARANTINE")}
              className="px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span>Quarantaine</span>
            </button>

            <button
              onClick={() => setActiveTab("notes")}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une Note</span>
            </button>
          </div>
        </div>

        {/* ONGLETS SECTIONS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/5">
          {[
            { id: "overview", label: "Vue d'ensemble", count: null },
            { id: "cases", label: "Cases & Dossiers", count: userProfile?.stats?.totalCases },
            { id: "warnings", label: "Avertissements", count: userProfile?.stats?.warnings },
            { id: "sanctions", label: "Sanctions", count: (userProfile?.stats?.timeouts || 0) + (userProfile?.stats?.bans || 0) },
            { id: "notes", label: "Notes Staff Privées", count: userProfile?.notes?.length },
            { id: "evidence", label: "Preuves (Evidence)", count: null },
            { id: "activity", label: "Timeline Unifiée", count: timeline.length },
            { id: "reports", label: "Signalements (Reports)", count: reports.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2",
                activeTab === tab.id
                  ? "bg-white/10 text-white shadow-sm border border-white/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* CONTENU ONGLETS */}

        {/* 1. OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Sanctions Actives */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span>Sanctions Actives en Cours ({userProfile?.activeSanctions?.length || 0})</span>
              </h3>

              {userProfile?.activeSanctions?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userProfile.activeSanctions.map((sc: any) => (
                    <div key={sc.id} className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-orange-500/20 text-orange-400">
                            {sc.action}
                          </span>
                          <span className="text-xs font-bold text-white">Case #{sc.caseNumber}</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-2">{sc.reason}</p>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Par {sc.moderatorTag} • Expire : {sc.expiresAt ? new Date(sc.expiresAt).toLocaleString("fr-FR") : "Jamais"}
                        </span>
                      </div>
                      <button
                        onClick={() => setRevertingCase(sc)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                      >
                        Pardonner / Lever
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 rounded-xl bg-slate-800/20 border border-dashed border-white/10">
                  ✅ Aucune sanction active sur ce membre actuellement.
                </div>
              )}
            </div>

            {/* Dernières Notes Staff */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ethone-accent" />
                  <span>Dernières Notes Staff</span>
                </h3>
                <button
                  onClick={() => setActiveTab("notes")}
                  className="text-xs text-ethone-accent hover:underline font-semibold"
                >
                  Voir toutes ({userProfile?.notes?.length || 0})
                </button>
              </div>

              {userProfile?.notes?.length > 0 ? (
                <div className="space-y-3">
                  {userProfile.notes.slice(0, 3).map((n: any) => (
                    <div key={n.id} className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span className="font-semibold text-white">Ajouté par @{n.authorTag}</span>
                        <span className="text-[11px]">{new Date(n.createdAt).toLocaleDateString("fr-FR")}</span>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-line">{n.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Aucune note staff rédigée.</p>
              )}
            </div>
          </div>
        )}

        {/* 2. CASES */}
        {activeTab === "cases" && (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
            <h3 className="text-base font-bold text-white">Dossiers Disciplinaires (Cases)</h3>
            {userProfile?.timeline?.length > 0 ? (
              <div className="divide-y divide-white/5">
                {userProfile.timeline.map((c: any) => (
                  <div key={c.id} className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-white/10 text-white font-mono">
                          #{c.caseNumber}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-indigo-500/10 text-indigo-400">
                          {c.action}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(c.createdAt).toLocaleDateString("fr-FR")} à {new Date(c.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200 font-medium">{c.reason}</p>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>Modérateur : @{c.moderatorTag}</span>
                        <span>•</span>
                        <span>Source : {c.source || "MANUAL"}</span>
                        {c.status === "REVOKED" && (
                          <span className="text-xs text-amber-400 font-semibold">(RÉVOQUÉ)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/discord/moderation/cases/${c.caseNumber}`}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors"
                      >
                        Consulter
                      </Link>
                      {c.status !== "REVOKED" && (
                        <button
                          onClick={() => setRevertingCase(c)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition-colors"
                        >
                          Pardonner
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Aucune case enregistrée pour cet utilisateur.</p>
            )}
          </div>
        )}

        {/* 3. WARNINGS */}
        {activeTab === "warnings" && (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span>Historique des Avertissements (Warnings)</span>
            </h3>
            {userProfile?.timeline?.filter((c: any) => c.action === "WARN").length > 0 ? (
              <div className="divide-y divide-white/5">
                {userProfile.timeline
                  .filter((c: any) => c.action === "WARN")
                  .map((w: any) => (
                    <div key={w.id} className="py-3.5 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono">Case #{w.caseNumber}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(w.createdAt).toLocaleString("fr-FR")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 mt-1">{w.reason}</p>
                        <span className="text-xs text-slate-400">Par @{w.moderatorTag}</span>
                      </div>
                      {w.status !== "REVOKED" && (
                        <button
                          onClick={() => setRevertingCase(w)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Aucun avertissement consigné.</p>
            )}
          </div>
        )}

        {/* 4. SANCTIONS */}
        {activeTab === "sanctions" && (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
            <h3 className="text-base font-bold text-white">Sanctions Lourdes (Timeouts, Kicks, Bans)</h3>
            {userProfile?.timeline?.filter((c: any) => c.action !== "WARN").length > 0 ? (
              <div className="divide-y divide-white/5">
                {userProfile.timeline
                  .filter((c: any) => c.action !== "WARN")
                  .map((s: any) => (
                    <div key={s.id} className="py-3.5 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded font-bold bg-white/10 text-white">
                            {s.action}
                          </span>
                          <span className="text-xs font-bold text-white font-mono">Case #{s.caseNumber}</span>
                          <span className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleString("fr-FR")}</span>
                        </div>
                        <p className="text-sm text-slate-200 mt-1">{s.reason}</p>
                        <span className="text-xs text-slate-400">Par @{s.moderatorTag}</span>
                      </div>
                      {s.status !== "REVOKED" && (
                        <button
                          onClick={() => setRevertingCase(s)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-white hover:bg-white/20"
                        >
                          Lever
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Aucune sanction lourde consignée.</p>
            )}
          </div>
        )}

        {/* 5. NOTES STAFF */}
        {activeTab === "notes" && (
          <div className="space-y-6">
            {/* Formulaire ajout de note */}
            <form onSubmit={handleAddNote} className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Rédiger une Note Staff Privée</span>
              </h3>
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Renseignez une observation confidentielle (visible uniquement par le staff modération)..."
                rows={3}
                className="w-full bg-slate-800/80 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-ethone-accent resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingNote || !newNoteContent.trim()}
                  className="px-4 py-2 rounded-xl bg-ethone-accent hover:bg-ethone-accent/90 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmittingNote ? "Enregistrement..." : "Enregistrer la note"}
                </button>
              </div>
            </form>

            {/* Liste des notes */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
              <h4 className="text-sm font-bold text-white">Notes Privées Existantes ({userProfile?.notes?.length || 0})</h4>
              {userProfile?.notes?.length > 0 ? (
                <div className="space-y-3">
                  {userProfile.notes.map((n: any) => (
                    <div key={n.id} className="p-4 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">@{n.authorTag}</span>
                        <span className="text-slate-400">{new Date(n.createdAt).toLocaleString("fr-FR")}</span>
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-line">{n.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Aucune note rédigée pour le moment.</p>
              )}
            </div>
          </div>
        )}

        {/* 6. EVIDENCE */}
        {activeTab === "evidence" && (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
            <h3 className="text-base font-bold text-white">Preuves Archivées (Evidence Center)</h3>
            <p className="text-xs text-slate-400">
              Métadonnées et captures horodatées associées aux dossiers de cet utilisateur.
            </p>
            <div className="p-8 text-center text-xs text-slate-400 rounded-xl bg-slate-800/20 border border-dashed border-white/10">
              📁 Ouvrez une Case pour consulter ou attacher de nouvelles preuves (Message Discord, URL de capture, transcript).
            </div>
          </div>
        )}

        {/* 7. ACTIVITY TIMELINE */}
        {activeTab === "activity" && (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-ethone-accent" />
                <span>Timeline Chronologique Unifiée ({filteredTimeline.length})</span>
              </h3>

              {/* Filtres timeline */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {["ALL", "MODERATION", "AUTOMOD", "SECURITY", "REPORTS", "NOTES"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setTimelineFilter(f)}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors",
                      timelineFilter === f
                        ? "bg-white/10 text-white border border-white/10"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredTimeline.length > 0 ? (
              <div className="space-y-4 pt-2">
                {filteredTimeline.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-slate-800/30 border border-white/5 flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-white/5 text-slate-300 mt-0.5">
                      {item.type === "CASE" ? (
                        <Shield className="w-4 h-4 text-orange-400" />
                      ) : item.type === "REPORT" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between flex-wrap">
                        <span className="text-xs font-bold text-white">{item.title}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(item.timestamp).toLocaleString("fr-FR")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{item.description}</p>
                      <span className="text-[11px] text-slate-400 block">Auteur : @{item.author?.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Aucun événement dans cette catégorie.</p>
            )}
          </div>
        )}

        {/* 8. REPORTS */}
        {activeTab === "reports" && (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Signalements Visant ce Membre ({reports.length})</span>
            </h3>

            {reports.length > 0 ? (
              <div className="divide-y divide-white/5">
                {reports.map((r) => (
                  <div key={r.id} className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">{r.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-400">
                          {r.status}
                        </span>
                        <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString("fr-FR")}</span>
                      </div>
                      <p className="text-sm text-slate-200">{r.reason}</p>
                      <span className="text-xs text-slate-400">Signalé par @{r.reporterUserTag}</span>
                    </div>
                    <Link
                      href={selectedGuild ? `/discord/moderation/reports?guildId=${selectedGuild.id}` : "/discord/moderation/reports"}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors"
                    >
                      Inspecter le signalement
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Aucun signalement enregistré contre cet utilisateur.</p>
            )}
          </div>
        )}
      </div>

      {/* MODALE D'ACTION RAPIDE (WARN / TIMEOUT / KICK / BAN / QUARANTINE) */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-ethone-accent" />
                <h3 className="text-base font-bold text-white">
                  {activeActionModal === "WARN" && "Avertir le membre (Warn)"}
                  {activeActionModal === "TIMEOUT" && "Exclure temporairement (Timeout)"}
                  {activeActionModal === "KICK" && "Expulser du serveur (Kick)"}
                  {activeActionModal === "BAN" && "Bannir du serveur (Ban)"}
                  {activeActionModal === "QUARANTINE" && "Mettre en Quarantaine"}
                </h3>
              </div>
              <button
                onClick={() => setActiveActionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Catégorie / Motif standard */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Motif prédéfini</label>
                <select
                  value={actionStandardCategory}
                  onChange={(e) => {
                    setActionStandardCategory(e.target.value);
                    if (!actionReason) setActionReason(e.target.value);
                  }}
                  className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-xl p-2.5 outline-none"
                >
                  {STANDARD_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Raison personnalisée */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Raison détaillée</label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Expliquez la raison exacte..."
                  className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-xl p-2.5 outline-none focus:border-ethone-accent"
                />
              </div>

              {/* Spécifique TIMEOUT : Durée */}
              {activeActionModal === "TIMEOUT" && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Durée de l'exclusion</label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[
                      { l: "1 min", s: "60" },
                      { l: "5 min", s: "300" },
                      { l: "10 min", s: "600" },
                      { l: "1 heure", s: "3600" },
                      { l: "1 jour", s: "86400" },
                      { l: "1 semaine", s: "604800" },
                    ].map((d) => (
                      <button
                        key={d.s}
                        type="button"
                        onClick={() => setTimeoutDuration(d.s)}
                        className={cn(
                          "py-1.5 text-xs rounded-lg font-semibold border transition-colors",
                          timeoutDuration === d.s
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                            : "bg-slate-800 text-slate-300 border-white/5 hover:bg-slate-700"
                        )}
                      >
                        {d.l}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-orange-400 block">
                    Expire le : {timeoutExpiryText}
                  </span>
                </div>
              )}

              {/* Spécifique BAN : Supprimer messages */}
              {activeActionModal === "BAN" && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Supprimer l'historique des messages</label>
                  <select
                    value={banDeleteDays}
                    onChange={(e) => setBanDeleteDays(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-xl p-2.5 outline-none"
                  >
                    <option value="0">Ne pas supprimer</option>
                    <option value="1">Dernières 24 heures</option>
                    <option value="7">Derniers 7 jours</option>
                  </select>
                </div>
              )}

              {/* Note interne */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Note interne pour le staff (facultatif)</label>
                <input
                  type="text"
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Contexte supplémentaire..."
                  className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-xl p-2.5 outline-none focus:border-ethone-accent"
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 space-y-2 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendDm}
                    onChange={(e) => setSendDm(e.target.checked)}
                    className="rounded text-ethone-accent focus:ring-0"
                  />
                  <span>Avertir le membre en message privé (DM)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createCaseToggle}
                    onChange={(e) => setCreateCaseToggle(e.target.checked)}
                    className="rounded text-ethone-accent focus:ring-0"
                  />
                  <span>Générer automatiquement une Case de modération</span>
                </label>
              </div>

              {/* Confirmation pour les actions dangereuses */}
              {(activeActionModal === "BAN" || activeActionModal === "KICK") && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={confirmDangerous}
                      onChange={(e) => setConfirmDangerous(e.target.checked)}
                      className="rounded text-red-500 focus:ring-0"
                    />
                    <span>Je confirme l'exécution de cette action irréversible sur {userProfile?.username}</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={isSubmittingAction}
                className={cn(
                  "px-5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50",
                  activeActionModal === "BAN"
                    ? "bg-red-600 hover:bg-red-500"
                    : activeActionModal === "KICK"
                    ? "bg-rose-600 hover:bg-rose-500"
                    : activeActionModal === "TIMEOUT"
                    ? "bg-orange-600 hover:bg-orange-500"
                    : "bg-amber-600 hover:bg-amber-500"
                )}
              >
                {isSubmittingAction ? "Application..." : "Appliquer la sanction"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE PARDON / RÉVOCATION */}
      {revertingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <span>Pardonner la Case #{revertingCase.caseNumber}</span>
              </h3>
              <button onClick={() => setRevertingCase(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Cette action lèvera la sanction ({revertingCase.action}) sur Discord et marquera le dossier comme révoqué dans le journal d'audit.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Motif du pardon / de la révocation</label>
              <input
                type="text"
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="Ex : Erreur de manipulation, recours accepté..."
                className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-xl p-2.5 outline-none focus:border-ethone-accent"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRevertingCase(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={handleRevertCase}
                disabled={isSubmittingRevert}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50"
              >
                {isSubmittingRevert ? "Traitement..." : "Confirmer le pardon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
