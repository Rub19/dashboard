"use client";

import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePathSegment } from "@/lib/hooks/usePathSegment";
import Select from "@/components/ui/Select";
import {
  Ticket,
  ArrowLeft,
  User,
  Clock,
  MessageSquare,
  FileText,
  Download,
  Star,
  ExternalLink,
  ChevronRight,
  Lock,
  Unlock,
  Scale,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";
import { formatApiError } from "@/lib/format-error";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

const API_BASE = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export default function TicketDetailClient() {
  const searchParams = useSearchParams();

  const ticketId = usePathSegment("tickets", "1");
  const { profile } = useDiscordOAuth();
  const guildId = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds) || "";

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


  // Chargement du ticket
  const fetchTicket = useCallback(async () => {
    setLoading(true);
    if (!API_BASE) {
      setTicket(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Ticket introuvable");
      }
      const data = await res.json();
      setTicket(data.ticket || null);
    } catch (err: any) {
      console.warn("Ticket illisible :", err);
      setTicket(null);
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
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/claim`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: "admin-dash",
          staffTag: "Staff ETHONE",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, "Échec de la prise en charge"));
      }
      success("Ticket pris en charge", "Vous êtes désormais assigné à ce ticket.");
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible de prendre en charge ce ticket"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnclaim = async () => {
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/unclaim`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: "admin-dash",
          staffTag: "Staff ETHONE",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, "Échec de l'abandon de prise en charge"));
      }
      info("Prise en charge abandonnée", "Le ticket est de nouveau ouvert à tous.");
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible d'abandonner la prise en charge"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/notes`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent.trim(),
          author: { id: "admin-dash", tag: "Staff ETHONE" },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, "Échec ajout de note"));
      }
      success("Note ajoutée", "La note interne a été enregistrée.");
      setNoteContent("");
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible d'ajouter la note"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/close`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closedBy: { id: "admin-dash", tag: "Staff ETHONE" },
          reason: closeReason,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, "Échec de la fermeture"));
      }
      success("Ticket clôturé", "Le ticket a été fermé avec succès.");
      setShowCloseModal(false);
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible de clôturer le ticket"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/reopen`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reopenedBy: { id: "admin-dash", tag: "Staff ETHONE" },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, "Échec de la réouverture"));
      }
      success("Ticket réouvert", "Le ticket a été rouvert avec succès.");
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible de rouvrir le ticket"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleLinkCase = async () => {
    if (!caseIdToLink.trim()) return;
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets/tickets/${ticketId}/link-case`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseIdToLink.trim(),
          staffUser: { id: "admin-dash", tag: "Staff ETHONE" },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, "Échec liaison avec le cas"));
      }
      success("Cas de modération lié", `Liaison effectuée avec le Dossier #${caseIdToLink}.`);
      setShowLinkCaseModal(false);
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible de lier le cas"));
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
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: newPriority,
          performedBy: { id: "admin-dash", tag: "Staff ETHONE" },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, "Échec modification priorité"));
      }
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible de modifier la priorité"));
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
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          performedBy: { id: "admin-dash", tag: "Staff ETHONE" },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, "Échec modification statut"));
      }
      fetchTicket();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible de modifier le statut"));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <ModuleSkeleton label={`Chargement du ticket #${ticketId}…`} />
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-[var(--text-primary)] p-4">
        <Ticket className="h-12 w-12 text-[var(--text-muted)] mb-3" />
        <h2 className="text-lg font-bold">Ticket introuvable</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Le ticket #{ticketId} n&apos;existe pas ou a été purgé.</p>
        <Link
          href={`/discord/tickets?guildId=${guildId}`}
          className="mt-4 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
        >
          Retour au centre de tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-6 sm:px-6 text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--panel-border)] pb-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/discord/tickets?guildId=${guildId}`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono tracking-tight text-[var(--text-primary)]">#{ticket.id}</h1>
              <span className="rounded-lg bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 px-2 py-0.5 text-xs font-semibold">
                {ticket.categoryName}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Ouvert par <strong className="text-[var(--text-primary)]">{ticket.userTag}</strong> ({ticket.userId}) le{" "}
              {new Date(ticket.createdAt).toLocaleString("fr-FR")}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priorité Selector */}
          <Select
            value={ticket.priority}
            onChange={handlePriorityChange}
            disabled={actionLoading}
            size="sm"
            className="w-48 shrink-0"
            aria-label="Priorité du ticket"
            options={[
              { id: "LOW", label: "💤 Priorité Faible" },
              { id: "NORMAL", label: "📌 Priorité Normale" },
              { id: "HIGH", label: "⚡ Priorité Élevée" },
              { id: "URGENT", label: "🔥 Priorité URGENTE" },
            ]}
          />

          {/* Statut Selector */}
          <Select
            value={ticket.status}
            onChange={handleStatusChange}
            disabled={actionLoading}
            size="sm"
            className="w-48 shrink-0"
            aria-label="Statut du ticket"
            options={[
              { id: "OPEN", label: "🟢 Ouvert" },
              { id: "WAITING_USER", label: "🔵 En attente membre" },
              { id: "WAITING_STAFF", label: "🟠 En attente staff" },
              { id: "PENDING", label: "🟡 En cours" },
              { id: "RESOLVED", label: "🟣 Résolu" },
              { id: "CLOSED", label: "⚫ Clôturé" },
            ]}
          />

          {/* Prise en charge */}
          {ticket.claimedBy ? (
            <button
              onClick={handleUnclaim}
              disabled={actionLoading}
              className="flex h-9 items-center gap-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-all cursor-pointer"
            >
              <span>Libérer la prise en charge</span>
            </button>
          ) : (
            <button
              onClick={handleClaim}
              disabled={actionLoading}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
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
                info("Bot injoignable", "Le transcript n'est pas disponible.");
              }
            }}
            target={API_BASE ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="flex h-9 items-center gap-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 px-3 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-all"
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
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--accent-primary)]" />
              <span>Formulaire de Demande Initiale</span>
            </h2>

            {ticket.answers && Object.keys(ticket.answers).length > 0 ? (
              <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {Object.entries(ticket.answers).map(([key, val]) => (
                  <div key={key} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3">
                    <p className="text-xs font-semibold text-[var(--text-muted)] capitalize">{key}</p>
                    <p className="text-xs font-medium text-[var(--text-primary)] mt-1 whitespace-pre-wrap">
                      {String(val) || "N/A"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] italic">Aucune question spécifique configurée pour cette catégorie.</p>
            )}
          </div>

          {/* Quick Reply or Discord Channel Link */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-teal-400" />
                <span>Salon Discord Actif</span>
              </h2>
              <span className="font-mono text-xs text-[var(--text-muted)]">ID: {ticket.channelId}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Le salon Discord est ouvert et synchronisé. Les messages y sont archivés en continu dans le transcript.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href={`discord://discord.com/channels/${guildId}/${ticket.channelId}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Ouvrir dans l&apos;application Discord</span>
              </a>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--accent-primary)]" />
              <span>Chronologie d&apos;Activité & Traçabilité</span>
            </h2>

            <div className="space-y-3 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
              {ticket.activityTimeline && ticket.activityTimeline.length > 0 ? (
                ticket.activityTimeline.map((act: any) => (
                  <div key={act.id} className="relative text-xs space-y-0.5">
                    <span className="absolute -left-[19px] top-1 h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
                    <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
                      <span className="font-semibold text-[var(--text-muted)]">{act.actorTag}</span>
                      <span>{new Date(act.timestamp).toLocaleTimeString("fr-FR")}</span>
                    </div>
                    <p className="text-[var(--text-primary)]">{act.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--text-muted)] italic">Aucun événement enregistré.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3): User Profile, Notes, Case Linking, Rating */}
        <div className="space-y-6">
          {/* User Card */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Demandeur</h2>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[var(--surface-raised)]/50 flex items-center justify-center font-bold text-[var(--accent-primary)] text-sm border border-[var(--panel-border)] overflow-hidden">
                {ticket.userAvatar ? (
                  <img src={ticket.userAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  ticket.userTag.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)] text-sm">{ticket.userTag}</p>
                <p className="text-xs text-[var(--text-muted)] font-mono">{ticket.userId}</p>
              </div>
            </div>
          </div>

          {/* Linked Moderation Case */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-orange-400" />
                <span>Dossier de Modération</span>
              </h2>
              {ticket.relatedCaseId && (
                <span className="rounded bg-orange-500/20 px-2 py-0.5 text-xs font-bold text-orange-300 border border-orange-500/30">
                  Case #{ticket.relatedCaseId}
                </span>
              )}
            </div>

            {ticket.relatedCaseId ? (
              <div className="space-y-2">
                <p className="text-xs text-[var(--text-muted)]">
                  Ce ticket est rattaché à une sanction ou une enquête dans le Centre de Modération.
                </p>
                <Link
                  href={`/discord/moderation/cases/${ticket.relatedCaseId}?guildId=${guildId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600/20 border border-orange-500/30 px-3 py-1.5 text-xs font-bold text-orange-300 hover:bg-orange-500/30 transition-all"
                >
                  <span>Consulter le Dossier #{ticket.relatedCaseId}</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-[var(--text-muted)]">Aucun dossier de sanction associé à ce ticket.</p>
                <button
                  onClick={() => setShowLinkCaseModal(true)}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  + Lier une Case #
                </button>
              </div>
            )}
          </div>

          {/* Private Internal Notes */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <span>Notes Internes Staff (Privé)</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Visibles uniquement par les membres du staff autorisés. Non transmises au membre.
            </p>

            {/* Note form */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Ajouter une note d'investigation..."
                rows={2}
                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] p-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 outline-none focus:border-[var(--accent-primary)]/60 resize-none"
              />
              <button
                type="submit"
                disabled={actionLoading || !noteContent.trim()}
                className="rounded-xl bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 disabled:opacity-50 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
              >
                Enregistrer la note
              </button>
            </form>

            {/* Notes List */}
            <div className="space-y-2.5 pt-2 border-t border-[var(--panel-border)]">
              {ticket.notes && ticket.notes.length > 0 ? (
                ticket.notes.map((n: any) => (
                  <div key={n.id} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span className="font-bold text-amber-300">{n.authorTag}</span>
                      <span>{new Date(n.createdAt).toLocaleTimeString("fr-FR")}</span>
                    </div>
                    <p className="text-[var(--text-primary)]">{n.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--text-muted)] italic">Aucune note interne pour le moment.</p>
              )}
            </div>
          </div>

          {/* Satisfaction Rating (CSAT) */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
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
                          : "text-[var(--text-muted)]"
                      )}
                    />
                  ))}
                  <span className="text-xs font-bold text-[var(--text-primary)] ml-2">
                    {ticket.rating.score}/5
                  </span>
                </div>
                {ticket.rating.comment && (
                  <p className="text-xs text-[var(--text-muted)] italic">&ldquo;{ticket.rating.comment}&rdquo;</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">En attente de notation par l&apos;utilisateur après résolution.</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: FERMETURE */}
      {showCloseModal && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Clôturer le Ticket #{ticket.id}</h3>
            <p className="text-xs text-[var(--text-muted)]">
              La transcription complète sera générée et le salon Discord sera supprimé automatiquement.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">Raison de fermeture</label>
              <input
                type="text"
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Ex: Problème résolu, question traitée..."
                className="h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/60"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCloseModal(false)}
                className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 cursor-pointer"
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
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Lier un Dossier de Modération</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Rattachez ce ticket au Case System de Moderation Center pour garder un suivi complet de la sanction.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">Numéro du Dossier (Case #)</label>
              <input
                type="text"
                value={caseIdToLink}
                onChange={(e) => setCaseIdToLink(e.target.value)}
                placeholder="Ex: 1, 2, 1842..."
                className="h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-orange-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLinkCaseModal(false)}
                className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 cursor-pointer"
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
