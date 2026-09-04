"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Ticket,
  ArrowLeft,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  Shield,
  FileText,
  Download,
  Star,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Flame,
  Check,
  X,
  Lock,
  Unlock,
  CornerDownRight,
  Scale,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

function getDemoTicket(ticketId: string, guildId: string) {
  return {
    id: ticketId,
    guildId,
    channelId: "1128633164290596999",
    userId: "284729104817293810",
    userTag: "Alex_Dev#1337",
    userAvatar: null,
    categoryId: "cat-1",
    categoryName: "Support Technique",
    status: "OPEN",
    priority: "NORMAL",
    tags: ["Demo", "Support"],
    claimedBy: null,
    answers: {
      "Sujet de la demande": "Configuration et test de l'environnement ETHONE",
      "Description détaillée": "Démonstration du système de tickets temps réel ETHONE OS.",
      "Priorité ressentie": "Normale",
    },
    notes: [
      {
        id: "note-1",
        authorId: "admin-1",
        authorTag: "Staff ETHONE",
        content: "Ticket de démonstration initialisé.",
        createdAt: new Date().toISOString(),
      },
    ],
    activityTimeline: [
      {
        id: "act-1",
        type: "CREATED",
        actorTag: "Alex_Dev#1337",
        description: "Ouverture du ticket",
        timestamp: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function TicketDetailClient() {
  const params = useParams();
  const searchParams = useSearchParams();

  const ticketId = (params?.ticketId as string) || "1";
  const guildId = searchParams.get("guildId") || "1128633164290596884";

  const { success, error: showError, info } = useToast();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Notes internes
  const [noteContent, setNoteContent] = useState("");

  // Modals
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeReason, setCloseReason] = useState("Résolu via Dashboard");

  const [showLinkCaseModal, setShowLinkCaseModal] = useState(false);
  const [caseIdToLink, setCaseIdToLink] = useState("");

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");

  // Chargement du ticket
  const fetchTicket = useCallback(async () => {
    setLoading(true);
    if (!API_BASE) {
      setTicket(getDemoTicket(ticketId, guildId));
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}`);
      if (!res.ok) {
        throw new Error("Ticket introuvable");
      }
      const data = await res.json();
      setTicket(data.ticket || getDemoTicket(ticketId, guildId));
    } catch (err: any) {
      console.warn("API non joignable, fallback démo :", err);
      setTicket(getDemoTicket(ticketId, guildId));
    } finally {
      setLoading(false);
    }
  }, [guildId, ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // Actions
  const handleClaim = async () => {
    if (!API_BASE) {
      setTicket((prev: any) => (prev ? { ...prev, claimedBy: { id: "admin-dash", tag: "Staff ETHONE" } } : prev));
      success("Ticket pris en charge", "Mode démo : Vous êtes désormais assigné à ce ticket.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: "admin-dash",
          staffTag: "Staff ETHONE",
        }),
      });
      if (!res.ok) throw new Error("Échec de la prise en charge");
      success("Ticket pris en charge", "Vous êtes désormais assigné à ce ticket.");
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnclaim = async () => {
    if (!API_BASE) {
      setTicket((prev: any) => (prev ? { ...prev, claimedBy: null } : prev));
      info("Prise en charge abandonnée", "Mode démo : Le ticket est de nouveau ouvert à tous.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/unclaim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: "admin-dash",
          staffTag: "Staff ETHONE",
        }),
      });
      if (!res.ok) throw new Error("Échec de l'abandon de prise en charge");
      info("Prise en charge abandonnée", "Le ticket est de nouveau ouvert à tous.");
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    if (!API_BASE) {
      const newNote = {
        id: `note-${Date.now()}`,
        content: noteContent.trim(),
        authorId: "admin-dash",
        authorTag: "Staff ETHONE",
        createdAt: new Date().toISOString(),
      };
      setTicket((prev: any) => (prev ? { ...prev, notes: [...(prev.notes || []), newNote] } : prev));
      setNoteContent("");
      success("Note ajoutée", "Mode démo : Note enregistrée.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent.trim(),
          author: { id: "admin-dash", tag: "Staff ETHONE" },
        }),
      });
      if (!res.ok) throw new Error("Échec ajout de note");
      success("Note ajoutée", "La note interne a été enregistrée.");
      setNoteContent("");
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!API_BASE) {
      setTicket((prev: any) => (prev ? { ...prev, status: "CLOSED", closeReason } : prev));
      setShowCloseModal(false);
      success("Ticket clôturé", "Mode démo : Le ticket a été fermé avec succès.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closedBy: { id: "admin-dash", tag: "Staff ETHONE" },
          reason: closeReason,
        }),
      });
      if (!res.ok) throw new Error("Échec de la fermeture");
      success("Ticket clôturé", "Le ticket a été fermé avec succès.");
      setShowCloseModal(false);
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!API_BASE) {
      setTicket((prev: any) => (prev ? { ...prev, status: "OPEN" } : prev));
      success("Ticket réouvert", "Mode démo : Le ticket a été rouvert avec succès.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reopenedBy: { id: "admin-dash", tag: "Staff ETHONE" },
        }),
      });
      if (!res.ok) throw new Error("Échec de la réouverture");
      success("Ticket réouvert", "Le ticket a été rouvert avec succès.");
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLinkCase = async () => {
    if (!caseIdToLink.trim()) return;
    if (!API_BASE) {
      setTicket((prev: any) => (prev ? { ...prev, relatedCaseId: caseIdToLink.trim() } : prev));
      setShowLinkCaseModal(false);
      success("Cas de modération lié", `Mode démo : Liaison effectuée avec le Dossier #${caseIdToLink}.`);
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/link-case`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseIdToLink.trim(),
          staffUser: { id: "admin-dash", tag: "Staff ETHONE" },
        }),
      });
      if (!res.ok) throw new Error("Échec liaison avec le cas");
      success("Cas de modération lié", `Liaison effectuée avec le Dossier #${caseIdToLink}.`);
      setShowLinkCaseModal(false);
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!API_BASE) {
      setTicket((prev: any) => (prev ? { ...prev, priority: newPriority } : prev));
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/priority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: newPriority,
          performedBy: { id: "admin-dash", tag: "Staff ETHONE" },
        }),
      });
      if (!res.ok) throw new Error("Échec modification priorité");
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!API_BASE) {
      setTicket((prev: any) => (prev ? { ...prev, status: newStatus } : prev));
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          performedBy: { id: "admin-dash", tag: "Staff ETHONE" },
        }),
      });
      if (!res.ok) throw new Error("Échec modification statut");
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-xs text-zinc-400">Chargement des détails du ticket #{ticketId}...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4">
        <Ticket className="h-12 w-12 text-zinc-600 mb-3" />
        <h2 className="text-lg font-bold">Ticket introuvable</h2>
        <p className="text-xs text-zinc-400 mt-1">Le ticket #{ticketId} n&apos;existe pas ou a été purgé.</p>
        <Link
          href={`/discord/tickets?guildId=${guildId}`}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-all"
        >
          Retour au centre de tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white px-4 sm:px-8 py-6 pb-36">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/discord/tickets?guildId=${guildId}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono tracking-tight text-white">#{ticket.id}</h1>
              <span className="rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-xs font-semibold">
                {ticket.categoryName}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ouvert par <strong className="text-white">{ticket.userTag}</strong> ({ticket.userId}) le{" "}
              {new Date(ticket.createdAt).toLocaleString("fr-FR")}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priorité Selector */}
          <select
            value={ticket.priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            disabled={actionLoading}
            className="h-9 rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-zinc-200 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="LOW">💤 Priorité Faible</option>
            <option value="NORMAL">📌 Priorité Normale</option>
            <option value="HIGH">⚡ Priorité Élevée</option>
            <option value="URGENT">🔥 Priorité URGENTE</option>
          </select>

          {/* Statut Selector */}
          <select
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={actionLoading}
            className="h-9 rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-zinc-200 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="OPEN">🟢 Ouvert</option>
            <option value="WAITING_USER">🔵 En attente membre</option>
            <option value="WAITING_STAFF">🟠 En attente staff</option>
            <option value="PENDING">🟡 En cours</option>
            <option value="RESOLVED">🟣 Résolu</option>
            <option value="CLOSED">⚫ Clôturé</option>
          </select>

          {/* Prise en charge */}
          {ticket.claimedBy ? (
            <button
              onClick={handleUnclaim}
              disabled={actionLoading}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-800 px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-all cursor-pointer"
            >
              <span>Libérer la prise en charge</span>
            </button>
          ) : (
            <button
              onClick={handleClaim}
              disabled={actionLoading}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <User className="h-3.5 w-3.5" />
              <span>Prendre en charge</span>
            </button>
          )}

          {/* Transcript Download */}
          <a
            href={API_BASE ? `${API_BASE}/api/guilds/${guildId}/tickets/transcripts/${ticket.id}/download` : "#"}
            onClick={(e) => {
              if (!API_BASE) {
                e.preventDefault();
                info("Mode Démo", "Transcript simulé prêt.");
              }
            }}
            target={API_BASE ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Transcript</span>
          </a>

          {/* Fermer / Réouvrir */}
          {ticket.status === "CLOSED" ? (
            <button
              onClick={handleReopenTicket}
              disabled={actionLoading}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 text-xs font-bold text-white hover:bg-teal-500 transition-all cursor-pointer"
            >
              <Unlock className="h-3.5 w-3.5" />
              <span>Réouvrir</span>
            </button>
          ) : (
            <button
              onClick={() => setShowCloseModal(true)}
              disabled={actionLoading}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-rose-600/90 px-3.5 text-xs font-bold text-white hover:bg-rose-500 transition-all cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Fermer le ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2 Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Column (2/3): Request Info & Transcript */}
        <div className="lg:col-span-2 space-y-6">
          {/* Answers to Form Fields */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4 shadow-lg">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              <span>Formulaire de Demande Initiale</span>
            </h2>

            {ticket.answers && Object.keys(ticket.answers).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {Object.entries(ticket.answers).map(([key, val]) => (
                  <div key={key} className="rounded-xl border border-white/5 bg-black/40 p-3">
                    <p className="text-[11px] font-semibold text-zinc-400 capitalize">{key}</p>
                    <p className="text-xs font-medium text-zinc-100 mt-1 whitespace-pre-wrap">
                      {String(val) || "N/A"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">Aucune question spécifique configurée pour cette catégorie.</p>
            )}
          </div>

          {/* Quick Reply or Discord Channel Link */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-teal-400" />
                <span>Salon Discord Actif</span>
              </h2>
              <span className="font-mono text-xs text-zinc-400">ID: {ticket.channelId}</span>
            </div>
            <p className="text-xs text-zinc-300">
              Le salon Discord est ouvert et synchronisé. Les messages y sont archivés en continu dans le transcript.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href={`discord://discord.com/channels/${guildId}/${ticket.channelId}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-all"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Ouvrir dans l&apos;application Discord</span>
              </a>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-400" />
              <span>Chronologie d&apos;Activité & Traçabilité</span>
            </h2>

            <div className="space-y-3 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
              {ticket.activityTimeline && ticket.activityTimeline.length > 0 ? (
                ticket.activityTimeline.map((act: any) => (
                  <div key={act.id} className="relative text-xs space-y-0.5">
                    <span className="absolute -left-[19px] top-1 h-2 w-2 rounded-full bg-emerald-400" />
                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span className="font-semibold text-zinc-300">{act.actorTag}</span>
                      <span>{new Date(act.timestamp).toLocaleTimeString("fr-FR")}</span>
                    </div>
                    <p className="text-zinc-200">{act.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 italic">Aucun événement enregistré.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3): User Profile, Notes, Case Linking, Rating */}
        <div className="space-y-6">
          {/* User Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Demandeur</h2>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-emerald-400 text-sm border border-white/10 overflow-hidden">
                {ticket.userAvatar ? (
                  <img src={ticket.userAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  ticket.userTag.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <p className="font-bold text-white text-sm">{ticket.userTag}</p>
                <p className="text-xs text-zinc-400 font-mono">{ticket.userId}</p>
              </div>
            </div>
          </div>

          {/* Linked Moderation Case */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-orange-400" />
                <span>Dossier de Modération</span>
              </h2>
              {ticket.relatedCaseId && (
                <span className="rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-300 border border-orange-500/30">
                  Case #{ticket.relatedCaseId}
                </span>
              )}
            </div>

            {ticket.relatedCaseId ? (
              <div className="space-y-2">
                <p className="text-xs text-zinc-300">
                  Ce ticket est rattaché à une sanction ou une enquête dans le Centre de Modération 2.0.
                </p>
                <Link
                  href={`/discord/moderation/cases/${ticket.relatedCaseId}?guildId=${guildId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600/20 border border-orange-500/30 px-3 py-1.5 text-xs font-bold text-orange-300 hover:bg-orange-600/30 transition-all"
                >
                  <span>Consulter le Dossier #{ticket.relatedCaseId}</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">Aucun dossier de sanction associé à ce ticket.</p>
                <button
                  onClick={() => setShowLinkCaseModal(true)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  + Lier une Case #
                </button>
              </div>
            )}
          </div>

          {/* Private Internal Notes */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <span>Notes Internes Staff (Privé)</span>
            </h2>
            <p className="text-[11px] text-zinc-400">
              Visibles uniquement par les membres du staff autorisés. Non transmises au membre.
            </p>

            {/* Note form */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Ajouter une note d'investigation..."
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/90 p-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 resize-none"
              />
              <button
                type="submit"
                disabled={actionLoading || !noteContent.trim()}
                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all disabled:opacity-50 cursor-pointer"
              >
                Enregistrer la note
              </button>
            </form>

            {/* Notes List */}
            <div className="space-y-2.5 pt-2 border-t border-white/5">
              {ticket.notes && ticket.notes.length > 0 ? (
                ticket.notes.map((n: any) => (
                  <div key={n.id} className="rounded-xl border border-white/5 bg-black/40 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="font-bold text-amber-300">{n.authorTag}</span>
                      <span>{new Date(n.createdAt).toLocaleTimeString("fr-FR")}</span>
                    </div>
                    <p className="text-zinc-200">{n.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 italic">Aucune note interne pour le moment.</p>
              )}
            </div>
          </div>

          {/* Satisfaction Rating (CSAT) */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
              <span>Avis Membre (CSAT)</span>
            </h2>

            {ticket.rating ? (
              <div className="space-y-1.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        "h-4 w-4",
                        s <= ticket.rating.score
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-zinc-600"
                      )}
                    />
                  ))}
                  <span className="text-xs font-bold text-white ml-2">
                    {ticket.rating.score}/5
                  </span>
                </div>
                {ticket.rating.comment && (
                  <p className="text-xs text-zinc-300 italic">&ldquo;{ticket.rating.comment}&rdquo;</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">En attente de notation par l&apos;utilisateur après résolution.</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: FERMETURE */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Clôturer le Ticket #{ticket.id}</h3>
            <p className="text-xs text-zinc-400">
              La transcription complète sera générée et le salon Discord sera supprimé automatiquement.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Raison de fermeture</label>
              <input
                type="text"
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Ex: Problème résolu, question traitée..."
                className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCloseModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleCloseTicket}
                disabled={actionLoading}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-all cursor-pointer"
              >
                {actionLoading ? "Fermeture..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LIER CASE DE MODÉRATION */}
      {showLinkCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Lier un Dossier de Modération</h3>
            <p className="text-xs text-zinc-400">
              Rattachez ce ticket au Case System de Moderation Center 2.0 pour garder un suivi complet de la sanction.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Numéro du Dossier (Case #)</label>
              <input
                type="text"
                value={caseIdToLink}
                onChange={(e) => setCaseIdToLink(e.target.value)}
                placeholder="Ex: 1, 2, 1842..."
                className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-orange-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLinkCaseModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleLinkCase}
                disabled={actionLoading}
                className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-500 transition-all cursor-pointer"
              >
                Lier le Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
