"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Search,
  Filter,
  User,
  Plus,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "http://localhost:3001";

interface ModerationReport {
  id: string;
  guildId: string;
  reportedUserId: string;
  reportedUserTag: string;
  reporterUserId: string;
  reporterUserTag: string;
  reason: string;
  category?: string;
  channelId?: string;
  messageId?: string;
  messageContent?: string;
  status: "NEW" | "REVIEWING" | "ACTIONED" | "DISMISSED" | "ESCALATED";
  assignedModerator?: { id: string; tag: string };
  caseNumber?: number;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<
  ModerationReport["status"],
  { label: string; bg: string; text: string; border: string }
> = {
  NEW: { label: "Nouveau", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  REVIEWING: { label: "En cours", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  ACTIONED: { label: "Sanctionné", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  DISMISSED: { label: "Classé sans suite", bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
  ESCALATED: { label: "Escaladé", bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
};

export default function ReportsCenterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const { profile, loading: discordLoading } = useDiscordOAuth();

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

  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Nouveau Signalement
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [newReportTargetId, setNewReportTargetId] = useState("");
  const [newReportReason, setNewReportReason] = useState("");
  const [newReportCategory, setNewReportCategory] = useState("Spam");
  const [isSubmittingNewReport, setIsSubmittingNewReport] = useState(false);

  // Modal Dismiss / Résolution
  const [dismissingReport, setDismissingReport] = useState<ModerationReport | null>(null);
  const [dismissReason, setDismissReason] = useState("");
  const [isSubmittingDismiss, setIsSubmittingDismiss] = useState(false);

  const fetchReports = useCallback(async () => {
    if (!selectedGuild) return;
    setIsLoading(true);
    try {
      let url = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/reports`;
      if (selectedStatus !== "ALL") url += `?status=${selectedStatus}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.reports) setReports(data.reports);
      }
    } catch {
      // Offline fallback
      setReports([
        {
          id: "REP-101",
          guildId: selectedGuild.id,
          reportedUserId: "456789012345678901",
          reportedUserTag: "TrollAccount#1337",
          reporterUserId: "123456789012345678",
          reporterUserTag: "VictimMember#0001",
          reason: "Harcèlement répété dans le salon #général et insultes par MP",
          category: "Harassment",
          status: "NEW",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGuild, selectedStatus]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Assignation à moi-même
  const handleAssignToMe = async (reportId: string) => {
    if (!selectedGuild) return;
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/reports/${reportId}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moderator: {
              id: profile?.user?.id || "admin-staff",
              tag: profile?.user?.username || "Staff ETHONE",
            },
          }),
        }
      );

      if (res.ok) {
        success("Pris en charge", "Le signalement vous a été assigné.");
        fetchReports();
      }
    } catch {
      showError("Erreur", "Impossible d'assigner le signalement.");
    }
  };

  // Classer sans suite (Dismiss)
  const handleDismissReport = async () => {
    if (!selectedGuild || !dismissingReport) return;
    setIsSubmittingDismiss(true);
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/reports/${dismissingReport.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "DISMISSED",
            resolutionNotes: dismissReason.trim() || "Aucune infraction constatée",
          }),
        }
      );

      if (res.ok) {
        success("Signalement classé", "Le dossier a été classé sans suite.");
        setDismissingReport(null);
        setDismissReason("");
        fetchReports();
      }
    } catch {
      showError("Erreur", "Impossible de classer le signalement.");
    } finally {
      setIsSubmittingDismiss(false);
    }
  };

  // Créer un nouveau signalement
  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuild || !newReportTargetId.trim() || !newReportReason.trim()) return;
    setIsSubmittingNewReport(true);
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/moderation/reports`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportedUserId: newReportTargetId.trim(),
            reason: newReportReason.trim(),
            category: newReportCategory,
          }),
        }
      );

      if (res.ok) {
        success("Signalement créé", "Le dossier a été transmis à la file de modération.");
        setIsNewReportOpen(false);
        setNewReportTargetId("");
        setNewReportReason("");
        fetchReports();
      }
    } catch {
      showError("Erreur", "Impossible de consigner le signalement.");
    } finally {
      setIsSubmittingNewReport(false);
    }
  };

  // Filtre de recherche
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.reportedUserTag.toLowerCase().includes(q) ||
        r.reportedUserId.includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    });
  }, [reports, searchQuery]);

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
                <span className="text-xs font-semibold text-amber-400">Reports Center</span>
              </div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>File des Signalements Membres</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNewReportOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Consigner un Signalement</span>
            </button>

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
        {/* BARRE DE FILTRES ET RECHERCHE */}
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            {["ALL", "NEW", "REVIEWING", "ACTIONED", "DISMISSED", "ESCALATED"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors whitespace-nowrap",
                  selectedStatus === st
                    ? "bg-white/10 text-white border border-white/10"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {st === "ALL" ? "Tous" : STATUS_CONFIG[st as ModerationReport["status"]].label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par id, membre, motif..."
              className="w-full bg-slate-800/80 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-ethone-accent"
            />
          </div>
        </div>

        {/* LISTE DES SIGNALEMENTS */}
        {filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReports.map((report) => {
              const stCfg = STATUS_CONFIG[report.status];
              return (
                <div
                  key={report.id}
                  className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-white/5">
                          {report.id}
                        </span>
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md border", stCfg.bg, stCfg.text, stCfg.border)}>
                          {stCfg.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(report.createdAt).toLocaleString("fr-FR")}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span>Membre signalé :</span>
                        <span className="font-bold text-white">{report.reportedUserTag}</span>
                        <span className="font-mono text-[10px] text-slate-500">({report.reportedUserId})</span>
                      </div>
                      <p className="text-sm text-slate-200 mt-2 font-medium">{report.reason}</p>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-white/5">
                      <span>Signalé par : @{report.reporterUserTag}</span>
                      {report.assignedModerator ? (
                        <span className="text-ethone-accent font-medium">Assigné à @{report.assignedModerator.tag}</span>
                      ) : (
                        <span className="text-slate-500 italic">Non assigné</span>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS MODÉRATEURS */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5 flex-wrap">
                    <Link
                      href={selectedGuild ? `/discord/moderation/users/${report.reportedUserId}?guildId=${selectedGuild.id}` : `/discord/moderation/users/${report.reportedUserId}`}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Profil Membre</span>
                    </Link>

                    <div className="flex items-center gap-2">
                      {report.status !== "ACTIONED" && report.status !== "DISMISSED" && (
                        <>
                          {!report.assignedModerator && (
                            <button
                              onClick={() => handleAssignToMe(report.id)}
                              className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-semibold transition-colors"
                            >
                              Prendre en charge
                            </button>
                          )}
                          <button
                            onClick={() => setDismissingReport(report)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                          >
                            Classer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-white/5 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">File de signalements vide</h3>
            <p className="text-xs text-slate-400">Aucun signalement ne requiert d'attention dans cette catégorie.</p>
          </div>
        )}
      </div>

      {/* MODALE CONSIGNER SIGNALEMENT */}
      {isNewReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleCreateReport} className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <span>Consigner un Signalement Staff</span>
              </h3>
              <button type="button" onClick={() => setIsNewReportOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">ID Discord du membre signalé</label>
                <input
                  type="text"
                  required
                  value={newReportTargetId}
                  onChange={(e) => setNewReportTargetId(e.target.value)}
                  placeholder="Ex : 123456789012345678"
                  className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-xl p-2.5 outline-none focus:border-ethone-accent"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Catégorie</label>
                <select
                  value={newReportCategory}
                  onChange={(e) => setNewReportCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-xl p-2.5 outline-none"
                >
                  <option value="Spam">Spam & Flood</option>
                  <option value="Harassment">Harcèlement</option>
                  <option value="Toxicity">Toxicitée</option>
                  <option value="NSFW">Contenu Inapproprié</option>
                  <option value="Scam">Arnaque / Phishing</option>
                  <option value="Other">Autre</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Description des faits</label>
                <textarea
                  required
                  rows={3}
                  value={newReportReason}
                  onChange={(e) => setNewReportReason(e.target.value)}
                  placeholder="Détaillez le comportement ou l'infraction constatée..."
                  className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-xl p-2.5 outline-none focus:border-ethone-accent resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewReportOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmittingNewReport}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50"
              >
                {isSubmittingNewReport ? "Création..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE CLASSER SANS SUITE */}
      {dismissingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Classer le signalement {dismissingReport.id}</h3>
              <button onClick={() => setDismissingReport(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Motif du classement</label>
              <input
                type="text"
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                placeholder="Ex : Preuves insuffisantes, malentendu..."
                className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-xl p-2.5 outline-none focus:border-ethone-accent"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDismissingReport(null)} className="px-4 py-2 rounded-xl text-xs text-slate-400">
                Annuler
              </button>
              <button
                onClick={handleDismissReport}
                disabled={isSubmittingDismiss}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
              >
                Confirmer le classement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
