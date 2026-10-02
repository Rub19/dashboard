"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePathSegment } from "@/lib/hooks/usePathSegment";
import {
  ArrowLeft,
  RotateCcw,
  FileText,
  Paperclip,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  X,
  AlertCircle,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";
import { formatApiError } from "@/lib/format-error";

interface CaseEvidence {
  id: string;
  type: string;
  url?: string;
  content?: string;
  addedBy: string;
  createdAt: string;
}

interface StaffNote {
  id: string;
  authorTag: string;
  content: string;
  createdAt: string;
}

interface ModerationCaseDetail {
  id: string;
  caseNumber: number;
  guildId: string;
  userId: string;
  userTag: string;
  moderatorId: string;
  moderatorTag: string;
  action: string;
  reason: string;
  standardCategory?: string;
  durationSeconds?: number | null;
  createdAt: string;
  expiresAt?: string | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  source: string;
  metadata?: {
    channelId?: string;
    channelName?: string;
    messageId?: string;
    messageContent?: string;
    revertedAt?: string;
    revertedBy?: string;
    revertReason?: string;
  };
}

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export default function CaseDetailClient() {
  const caseNumber = usePathSegment("cases", "1");
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guildId");
  const { success, error: showError } = useToast();

  const [modCase, setModCase] = useState<ModerationCaseDetail | null>(null);
  const [evidence, setEvidence] = useState<CaseEvidence[]>([]);
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [relatedCases, setRelatedCases] = useState<ModerationCaseDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Note
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // New Evidence
  const [newEvidenceType, setNewEvidenceType] = useState<"IMAGE" | "LINK" | "TEXT">("TEXT");
  const [newEvidenceUrl, setNewEvidenceUrl] = useState("");
  const [newEvidenceContent, setNewEvidenceContent] = useState("");
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);

  // Revert Modal
  const [isRevertOpen, setIsRevertOpen] = useState(false);
  const [revertReason, setRevertReason] = useState("");
  const [isSubmittingRevert, setIsSubmittingRevert] = useState(false);

  const fetchCaseDetails = useCallback(async () => {
    if (!guildId || !caseNumber) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      if (BOT_API_URL) {
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/moderation/cases/${caseNumber}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.case) {
            setModCase(data.case);
            setEvidence(data.evidence || []);
            setNotes(data.notes || []);
            setRelatedCases(data.relatedCases || []);
            return;
          }
        }
      } catch {
        // bot injoignable : voir plus bas
      }
    }
      // Dossier absent ou bot injoignable : la page affiche « Dossier introuvable ». Aucun dossier de démonstration n'est inventé.
      setModCase(null);
    } finally {
      setIsLoading(false);
    }
  }, [guildId, caseNumber]);

  useEffect(() => {
    fetchCaseDetails();
  }, [fetchCaseDetails]);

  // Ajouter note staff
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !guildId) return;

    setIsAddingNote(true);
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${guildId}/moderation/cases/${caseNumber}/notes`,
        {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newNoteContent.trim() }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setNotes((prev) => [data.note, ...prev]);
        setNewNoteContent("");
        success("Note ajoutée", "La note staff a été enregistrée.");
      } else {
        const errBody = await res.json().catch(() => null);
        showError("Erreur", formatApiError(errBody?.error, "Impossible d'ajouter la note."));
      }
    } catch {
      showError("Erreur", "Impossible d'ajouter la note.");
    } finally {
      setIsAddingNote(false);
    }
  };

  // Ajouter preuve
  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildId) return;

    setIsAddingEvidence(true);
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${guildId}/moderation/cases/${caseNumber}/evidence`,
        {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: newEvidenceUrl.trim() ? "SCREENSHOT_URL" : "NOTE",
            url: newEvidenceUrl.trim() || undefined,
            content: newEvidenceContent.trim() || undefined,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setEvidence((prev) => [...prev, data.evidence]);
        setNewEvidenceUrl("");
        setNewEvidenceContent("");
        success("Preuve ajoutée", "L'élément de preuve est rattaché au dossier.");
      } else {
        const errBody = await res.json().catch(() => null);
        showError("Erreur", formatApiError(errBody?.error, "Impossible d'ajouter la preuve."));
      }
    } catch {
      showError("Erreur", "Impossible d'ajouter la preuve.");
    } finally {
      setIsAddingEvidence(false);
    }
  };

  // Révoquer case
  const handleRevertCase = async () => {
    if (!guildId || !caseNumber) return;

    setIsSubmittingRevert(true);
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${guildId}/moderation/cases/${caseNumber}/revert`,
        {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: revertReason || "Pardon accordé" }),
        }
      );

      if (res.ok) {
        success("Sanction révoquée", `La Case #${caseNumber} a été levée avec succès.`);
        setIsRevertOpen(false);
        fetchCaseDetails();
      } else {
        const errBody = await res.json().catch(() => null);
        showError("Erreur", formatApiError(errBody?.error, "Échec de la révocation."));
      }
    } catch {
      showError("Erreur", "Échec de la révocation.");
    } finally {
      setIsSubmittingRevert(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-muted)]">
        <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
      </div>
    );
  }

  if (!modCase) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-[var(--text-muted)] gap-3">
        <AlertCircle className="h-8 w-8 text-rose-500" />
        <p>Dossier introuvable ou inexistant.</p>
        <Link
          href={`/discord/moderation?guildId=${guildId}`}
          className="text-xs text-orange-400 hover:underline"
        >
          Retour aux dossiers
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full text-[var(--text-primary)] font-sans">
      {/* HEADER */}
      <header className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-4 sm:px-6 py-3.5 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/discord/moderation?guildId=${guildId}`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[var(--text-primary)] font-mono">Case #{modCase.caseNumber}</h1>
                <span
                  className={cn(
                    "text-xs uppercase font-bold px-2 py-0.5 rounded-full border",
                    modCase.status === "ACTIVE"
                      ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30"
                      : modCase.status === "EXPIRED"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                      : "bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--panel-border)]"
                  )}
                >
                  {modCase.status}
                </span>
                <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20">
                  {modCase.action}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Appliqué sur {modCase.userTag} par {modCase.moderatorTag} ({modCase.source})
              </p>
            </div>
          </div>

          {modCase.status === "ACTIVE" && (
            <button
              onClick={() => setIsRevertOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Révoquer / Pardonner</span>
            </button>
          )}
        </div>
      </header>

      {/* CONTENU SCROLLABLE */}
      <main className="px-4 sm:px-6 py-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* FICHE RÉCAPITULATIVE */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Membre Sanctionné</span>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{modCase.userTag}</p>
              <p className="text-xs font-mono text-[var(--text-muted)]">{modCase.userId}</p>
            </div>

            <div>
              <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Modérateur</span>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{modCase.moderatorTag}</p>
              <p className="text-xs font-mono text-[var(--text-muted)]">{modCase.source}</p>
            </div>

            <div>
              <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Date d'Application</span>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                {new Date(modCase.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {new Date(modCase.createdAt).toLocaleTimeString()}
              </p>
            </div>

            <div>
              <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Durée & Expiration</span>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                {modCase.durationSeconds ? `${Math.round(modCase.durationSeconds / 60)} min` : "Permanent"}
              </p>
              {modCase.expiresAt && (
                <p className="text-xs text-[var(--text-muted)]">
                  Exp: {new Date(modCase.expiresAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {/* MOTIF & CONTEXTE DU MESSAGE */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Motif de la Sanction</h3>
            <p className="text-sm text-[var(--text-primary)] bg-[var(--surface-raised)]/40 p-3 rounded-xl border border-[var(--panel-border)] font-sans">
              {modCase.reason}
            </p>

            {modCase.metadata?.messageContent && (
              <div className="space-y-1 pt-2">
                <span className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  Contenu du message incriminé (#{modCase.metadata.channelName || "salon"}) :
                </span>
                <p className="text-xs font-mono text-amber-300/90 bg-[var(--surface-raised)]/40 p-3 rounded-xl border border-[var(--panel-border)] break-all">
                  {modCase.metadata.messageContent}
                </p>
              </div>
            )}

            {modCase.metadata?.revertedAt && (
              <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 p-3 text-xs space-y-1">
                <p className="font-bold text-[var(--accent-primary)]">Sanction Révoquée (Pardon)</p>
                <p className="text-[var(--text-muted)]">Par : {modCase.metadata.revertedBy}</p>
                <p className="text-[var(--text-muted)]">Motif de levée : {modCase.metadata.revertReason}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PREUVES (EVIDENCE) */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5 text-orange-400" />
                  Preuves Attachées ({evidence.length})
                </h3>
              </div>

              {/* Formulaire ajout preuve */}
              <form onSubmit={handleAddEvidence} className="space-y-2">
                <input
                  type="url"
                  value={newEvidenceUrl}
                  onChange={(e) => setNewEvidenceUrl(e.target.value)}
                  placeholder="Lien URL de capture ou preuve (https://...)"
                  className="h-8 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 text-xs text-[var(--text-primary)] outline-none focus:border-orange-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEvidenceContent}
                    onChange={(e) => setNewEvidenceContent(e.target.value)}
                    placeholder="Description ou note de preuve..."
                    className="h-8 flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 text-xs text-[var(--text-primary)] outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    disabled={isAddingEvidence || (!newEvidenceUrl.trim() && !newEvidenceContent.trim())}
                    className="h-8 px-3 rounded-xl bg-[var(--text-primary)]/10 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--text-primary)]/15 disabled:opacity-50 cursor-pointer"
                  >
                    Attacher
                  </button>
                </div>
              </form>

              {/* Liste des preuves */}
              <div className="space-y-2">
                {evidence.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic">Aucune preuve rattachée à cette case.</p>
                ) : (
                  evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-xs space-y-1"
                    >
                      {ev.url && (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-400 hover:underline flex items-center gap-1 font-mono break-all"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span>{ev.url}</span>
                        </a>
                      )}
                      {ev.content && <p className="text-[var(--text-muted)]">{ev.content}</p>}
                      <p className="text-xs text-[var(--text-muted)]">Par {ev.addedBy}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* NOTES INTERNES STAFF */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-amber-400" />
                  Notes Staff Privées ({notes.length})
                </h3>
              </div>

              {/* Formulaire ajout note */}
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Ajouter un commentaire staff interne..."
                  className="h-8 flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 text-xs text-[var(--text-primary)] outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  disabled={isAddingNote || !newNoteContent.trim()}
                  className="h-8 px-3 rounded-xl bg-orange-600 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-50 cursor-pointer"
                >
                  Ajouter
                </button>
              </form>

              {/* Liste des notes */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic">Aucune note staff pour ce dossier.</p>
                ) : (
                  notes.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-xs space-y-1"
                    >
                      <p className="text-[var(--text-primary)]">{n.content}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {n.authorTag} • {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* CASES ASSOCIÉES (HISTORIQUE DE L'UTILISATEUR) */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Autres Sanctions Récemment Reçues par {modCase.userTag} ({relatedCases.length})
            </h3>
            {relatedCases.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic">Aucune autre sanction au dossier de ce membre.</p>
            ) : (
              <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {relatedCases.map((rc) => (
                  <Link
                    key={rc.id}
                    href={`/discord/moderation/cases/${rc.caseNumber}?guildId=${rc.guildId}`}
                    className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 hover:border-[var(--input-border-hover)] transition-all space-y-1 block"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--text-primary)] font-mono">Case #{rc.caseNumber}</span>
                      <span className="text-xs uppercase font-bold text-orange-400">
                        {rc.action}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-1">{rc.reason}</p>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(rc.createdAt).toLocaleDateString()} • {rc.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* MODAL RÉVOCATION */}
      {isRevertOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/70 animate-in fade-in">
          <div className="w-full max-w-md rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Révoquer la Case #{modCase.caseNumber}</h3>
              <button onClick={() => setIsRevertOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Cette action annulera la sanction sur Discord et marquera le dossier comme révoqué avec traçabilité complète.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Motif de levée / pardon</label>
              <textarea
                rows={2}
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="Ex: Excuses sincères, sanction levée après vérification..."
                className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-orange-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--panel-border)]">
              <button
                type="button"
                onClick={() => setIsRevertOpen(false)}
                className="h-8 rounded-xl border border-[var(--panel-border)] px-4 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRevertCase}
                disabled={isSubmittingRevert}
                className="h-8 rounded-xl bg-orange-600 px-4 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingRevert ? "Révocation..." : "Confirmer le Pardon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
