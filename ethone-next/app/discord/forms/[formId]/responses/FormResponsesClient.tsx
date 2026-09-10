"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Search,
  Download,
  ArrowLeft,
  Sliders,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

function mapResponse(raw: Record<string, unknown>): ResponseItem {
  const r = raw as Record<string, any>;
  return {
    id: String(r.id ?? r.responseId ?? ""),
    userId: String(r.userId ?? ""),
    userTag: String(r.userTag ?? r.username ?? "Membre"),
    userAvatar: String(r.userAvatar ?? r.avatarUrl ?? ""),
    submittedAt: String(r.submittedAt ?? r.createdAt ?? new Date().toISOString()),
    score: Number(r.score ?? 0),
    scoreLabel: (r.scoreLabel ?? "Medium") as ResponseItem["scoreLabel"],
    status: (r.status ?? "PENDING") as ResponseItem["status"],
    assignedReviewerTag: r.assignedReviewerTag ?? undefined,
    tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
    decisionReason: r.decisionReason ?? undefined,
    accountAgeDays: Number(r.accountAgeDays ?? 0),
    guildMemberDays: Number(r.guildMemberDays ?? 0),
    answers: Array.isArray(r.answers) ? r.answers : [],
    notes: Array.isArray(r.notes) ? r.notes : [],
  };
}

interface InternalNote {
  id: string;
  authorTag: string;
  content: string;
  createdAt: string;
}

interface FormAnswer {
  fieldId: string;
  fieldLabel: string;
  fieldType: string;
  value: any;
}

interface ResponseItem {
  id: string;
  userId: string;
  userTag: string;
  userAvatar: string;
  submittedAt: string;
  score: number;
  scoreLabel: "Low" | "Medium" | "High" | "Recommended";
  status: "PENDING" | "REVIEWING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "ARCHIVED" | "SPAM";
  assignedReviewerTag?: string;
  tags: string[];
  decisionReason?: string;
  accountAgeDays: number;
  guildMemberDays: number;
  answers: FormAnswer[];
  notes: InternalNote[];
}

const DEMO_RESPONSES: ResponseItem[] = [
  {
    id: "resp-101",
    userId: "987654321098765432",
    userTag: "Aurelien#1337",
    userAvatar: "https://cdn.discordapp.com/embed/avatars/0.png",
    submittedAt: "Il y a 2 heures",
    score: 85,
    scoreLabel: "High",
    status: "PENDING",
    assignedReviewerTag: "SeniorMod#0001",
    tags: ["Expérimenté", "Majeur", "Soirées"],
    accountAgeDays: 450,
    guildMemberDays: 60,
    answers: [
      { fieldId: "f-age", fieldLabel: "Quel est votre âge ?", fieldType: "NUMBER", value: 21 },
      { fieldId: "f-exp", fieldLabel: "Avez-vous déjà été modérateur sur un serveur Discord ?", fieldType: "YES_NO", value: "Oui" },
      { fieldId: "f-exp-desc", fieldLabel: "Décrivez votre expérience passée", fieldType: "LONG_TEXT", value: "Modérateur pendant 1 an sur un serveur eSport francophone de 3 200 membres. Gestion des tickets, litiges et AutoMod." },
      { fieldId: "f-hours", fieldLabel: "Disponibilité hebdomadaire", fieldType: "SELECT", value: "15 à 25h / sem" },
      { fieldId: "f-motivation", fieldLabel: "Quelles sont vos motivations pour rejoindre ETHONE ?", fieldType: "LONG_TEXT", value: "J'apprécie l'organisation et la rigueur du staff. Je souhaite m'investir sur le long terme pour aider la communauté." },
    ],
    notes: [
      {
        id: "n-1",
        authorTag: "SeniorMod#0001",
        content: "Profil très prometteur. Réponses complètes et score test situationnel au-dessus de la moyenne.",
        createdAt: "Il y a 1 heure",
      },
    ],
  },
  {
    id: "resp-102",
    userId: "555666777888999000",
    userTag: "Lucas_Dev#4040",
    userAvatar: "https://cdn.discordapp.com/embed/avatars/1.png",
    submittedAt: "Hier à 16:45",
    score: 70,
    scoreLabel: "High",
    status: "APPROVED",
    assignedReviewerTag: "SeniorMod#0001",
    tags: ["Majeur", "Entretien Validé"],
    decisionReason: "Candidature retenue après un excellent entretien vocal.",
    accountAgeDays: 620,
    guildMemberDays: 85,
    answers: [
      { fieldId: "f-age", fieldLabel: "Quel est votre âge ?", fieldType: "NUMBER", value: 19 },
      { fieldId: "f-exp", fieldLabel: "Avez-vous déjà été modérateur sur un serveur Discord ?", fieldType: "YES_NO", value: "Oui" },
      { fieldId: "f-exp-desc", fieldLabel: "Décrivez votre expérience passée", fieldType: "LONG_TEXT", value: "Animateur d'événements et modérateur sur un serveur communautaire RP." },
      { fieldId: "f-hours", fieldLabel: "Disponibilité hebdomadaire", fieldType: "SELECT", value: "5 à 15h / sem" },
      { fieldId: "f-motivation", fieldLabel: "Quelles sont vos motivations pour rejoindre ETHONE ?", fieldType: "LONG_TEXT", value: "Participer à la vie du serveur et aider aux heures de pointe." },
    ],
    notes: [
      {
        id: "n-2",
        authorTag: "SeniorMod#0001",
        content: "Entretien vocal passé le 03/09. Rôle Modérateur en test attribué.",
        createdAt: "Hier à 18:00",
      },
    ],
  },
  {
    id: "resp-103",
    userId: "333444555666777888",
    userTag: "NoobMaster#9999",
    userAvatar: "https://cdn.discordapp.com/embed/avatars/2.png",
    submittedAt: "Il y a 3 jours",
    score: 25,
    scoreLabel: "Low",
    status: "REJECTED",
    assignedReviewerTag: "SeniorMod#0001",
    tags: ["Mineur", "Non Retenu"],
    decisionReason: "Critère d'âge minimal de 16 ans non atteint et réponses trop succinctes.",
    accountAgeDays: 25,
    guildMemberDays: 2,
    answers: [
      { fieldId: "f-age", fieldLabel: "Quel est votre âge ?", fieldType: "NUMBER", value: 14 },
      { fieldId: "f-exp", fieldLabel: "Avez-vous déjà été modérateur sur un serveur Discord ?", fieldType: "YES_NO", value: "Non" },
      { fieldId: "f-hours", fieldLabel: "Disponibilité hebdomadaire", fieldType: "SELECT", value: "Moins de 5h / sem" },
      { fieldId: "f-motivation", fieldLabel: "Quelles sont vos motivations pour rejoindre ETHONE ?", fieldType: "LONG_TEXT", value: "Pour avoir les permissions et jouer avec mes amis." },
    ],
    notes: [],
  },
];

export default function FormResponsesClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const formId = (params?.formId as string) || "demo";
  const rawGuildId = searchParams.get("guildId") || profile?.guilds?.[0]?.id || "123456789012345678";
  const { success, error: showError } = useToast();

  const [responses, setResponses] = useState<ResponseItem[]>(DEMO_RESPONSES);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeResponse, setActiveResponse] = useState<ResponseItem | null>(null);

  const base = `${BOT_API_URL}/api/guilds/${rawGuildId}/forms/${formId}`;

  const loadResponses = useCallback(async () => {
    if (!BOT_API_URL || rawGuildId === "123456789012345678") {
      setIsDemo(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${base}/responses`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.responses)) {
        setResponses(data.responses.map(mapResponse));
        setIsDemo(false);
      } else {
        setIsDemo(true);
      }
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawGuildId, formId]);

  useEffect(() => {
    loadResponses();
  }, [loadResponses]);

  // Review interaction state
  const [newNote, setNewNote] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [newTag, setNewTag] = useState("");

  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.userTag.toLowerCase().includes(q) ||
          r.userId.includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [responses, selectedStatus, searchQuery]);

  // Review status update
  const handleUpdateStatus = async (
    newStatus: ResponseItem["status"],
    reason?: string
  ) => {
    if (!activeResponse) return;
    const rid = activeResponse.id;
    const prevStatus = activeResponse.status;
    setResponses((rs) => rs.map((r) => (r.id === rid ? { ...r, status: newStatus, decisionReason: reason || r.decisionReason } : r)));
    setActiveResponse((prev) => (prev ? { ...prev, status: newStatus, decisionReason: reason || prev.decisionReason } : null));

    if (!isDemo && BOT_API_URL) {
      try {
        const res = await fetch(`${base}/responses/${rid}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            reviewerId: profile?.user?.id,
            reviewerTag: profile?.user?.username,
            status: newStatus,
            decisionReason: reason,
          }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setResponses((rs) => rs.map((r) => (r.id === rid ? { ...r, status: prevStatus } : r)));
        setActiveResponse((prev) => (prev ? { ...prev, status: prevStatus } : null));
        showError("Impossible de mettre à jour le statut.");
        return;
      }
    }
    success("Statut mis à jour", `La candidature de ${activeResponse.userTag} est passée à "${newStatus}".`);
  };

  // Add internal note
  const handleAddNote = async () => {
    if (!activeResponse || !newNote.trim()) return;
    const rid = activeResponse.id;
    const content = newNote.trim();
    const noteObj: InternalNote = {
      id: `n-${Date.now()}`,
      authorTag: profile?.user?.username || "Modérateur",
      content,
      createdAt: "À l'instant",
    };
    setResponses((rs) => rs.map((r) => (r.id === rid ? { ...r, notes: [...r.notes, noteObj] } : r)));
    setActiveResponse((prev) => (prev ? { ...prev, notes: [...prev.notes, noteObj] } : null));
    setNewNote("");

    if (!isDemo && BOT_API_URL) {
      try {
        await fetch(`${base}/responses/${rid}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ authorId: profile?.user?.id, authorTag: profile?.user?.username, content }),
        });
      } catch {}
    }
    success("Note ajoutée", "Commentaire privé enregistré dans l'historique staff.");
  };

  // Add tag
  const handleAddTag = () => {
    if (!activeResponse || !newTag.trim()) return;
    const tagClean = newTag.trim();
    if (activeResponse.tags.includes(tagClean)) return;

    const updated = responses.map((r) => {
      if (r.id === activeResponse.id) {
        return { ...r, tags: [...r.tags, tagClean] };
      }
      return r;
    });

    setResponses(updated);
    setActiveResponse((prev) => (prev ? { ...prev, tags: [...prev.tags, tagClean] } : null));
    setNewTag("");
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["ResponseID", "UserTag", "UserID", "Score", "ScoreLabel", "Status", "SubmittedAt"];
    const rows = filteredResponses.map((r) => [
      r.id,
      r.userTag,
      r.userId,
      r.score,
      r.scoreLabel,
      r.status,
      r.submittedAt,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `form-${formId}-responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Export généré", "Le fichier CSV a été téléchargé avec succès.");
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/discord/forms?guildId=${rawGuildId}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">Réponses &amp; review</h1>
              {isDemo && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Démo
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Examinez les candidatures, prenez les décisions et gardez un historique staff.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadResponses}
            disabled={loading}
            className="flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
            title="Rafraîchir"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exporter CSV</span>
          </button>
          <Link
            href={`/discord/forms/${formId}?guildId=${rawGuildId}`}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Ouvrir Builder</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "Toutes" },
            { id: "PENDING", label: "En attente" },
            { id: "REVIEWING", label: "En cours" },
            { id: "APPROVED", label: "Approuvées" },
            { id: "REJECTED", label: "Rejetées" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                selectedStatus === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un candidat..."
            className="h-8 w-full rounded-xl border border-white/10 bg-zinc-900/90 pl-8 pr-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Responses Table */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="p-4">Candidat</th>
                <th className="p-4">Date de soumission</th>
                <th className="p-4">Score IA / Test</th>
                <th className="p-4">Statut</th>
                <th className="p-4">Reviewer assigné</th>
                <th className="p-4">Tags</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {filteredResponses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    Aucune réponse trouvée pour ces filtres.
                  </td>
                </tr>
              ) : (
                filteredResponses.map((resp) => {
                  const isPending = resp.status === "PENDING";
                  const isApproved = resp.status === "APPROVED";
                  const isRejected = resp.status === "REJECTED";
                  const isReviewing = resp.status === "REVIEWING";

                  return (
                    <tr
                      key={resp.id}
                      onClick={() => setActiveResponse(resp)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={resp.userAvatar}
                            alt={resp.userTag}
                            className="h-8 w-8 rounded-full border border-white/10 bg-zinc-800"
                          />
                          <div>
                            <span className="font-bold text-white group-hover:text-indigo-300 transition-colors block">
                              {resp.userTag}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">ID: {resp.userId}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-zinc-400">{resp.submittedAt}</td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{resp.score}/100</span>
                          <span
                            className={cn(
                              "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                              resp.score >= 70
                                ? "bg-emerald-500/20 text-emerald-400"
                                : resp.score >= 40
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-rose-500/20 text-rose-400"
                            )}
                          >
                            {resp.scoreLabel}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                            isPending && "bg-amber-500/10 text-amber-300 border-amber-500/30",
                            isReviewing && "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
                            isApproved && "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
                            isRejected && "bg-rose-500/10 text-rose-300 border-rose-500/30"
                          )}
                        >
                          {resp.status}
                        </span>
                      </td>

                      <td className="p-4 text-zinc-400">
                        {resp.assignedReviewerTag || <span className="text-zinc-600 italic">Non assigné</span>}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {resp.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[9px] font-medium bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-zinc-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveResponse(resp);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-indigo-600 hover:text-white text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
                        >
                          Examiner
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED RESPONSE REVIEW MODAL / DRAWER */}
      {activeResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={activeResponse.userAvatar}
                  alt={activeResponse.userTag}
                  className="h-10 w-10 rounded-full border border-white/20"
                />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{activeResponse.userTag}</span>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                        activeResponse.status === "APPROVED" && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                        activeResponse.status === "REJECTED" && "bg-rose-500/20 text-rose-400 border-rose-500/30",
                        activeResponse.status === "PENDING" && "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      )}
                    >
                      {activeResponse.status}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Compte créé il y a {activeResponse.accountAgeDays} jours • Sur le serveur depuis {activeResponse.guildMemberDays} jours
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveResponse(null)}
                className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Scrollable answers and review notes */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
              {/* Score Bar */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="text-base">📊</span>
                  <div>
                    <p className="text-xs font-bold text-white">Score Préliminaire de Candidature</p>
                    <p className="text-[11px] text-zinc-400">Évaluation automatique des réponses et critères</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-indigo-400">{activeResponse.score} / 100</span>
                  <span className="text-[10px] text-zinc-500 block">Niveau : {activeResponse.scoreLabel}</span>
                </div>
              </div>

              {/* Submitted Answers List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Réponses du Candidat</h4>
                <div className="space-y-3">
                  {activeResponse.answers.map((ans, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 space-y-1">
                      <span className="text-[11px] font-semibold text-zinc-400 block">{ans.fieldLabel}</span>
                      <p className="text-xs text-white font-medium whitespace-pre-wrap leading-relaxed">
                        {String(ans.value || "Non renseigné")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Internal Notes */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Notes Internes du Staff ({activeResponse.notes.length})
                </h4>

                {activeResponse.notes.map((note) => (
                  <div key={note.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="font-bold text-zinc-300">{note.authorTag}</span>
                      <span>{note.createdAt}</span>
                    </div>
                    <p className="text-zinc-300">{note.content}</p>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Ajouter une note privée staff..."
                    className="h-9 flex-1 rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddNote}
                    className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer Review Decisions */}
            <div className="border-t border-white/10 pt-4 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus("APPROVED", "Candidature acceptée")}
                  className="flex-1 sm:flex-initial h-9 px-4 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500 transition-all cursor-pointer shadow-sm"
                >
                  Approuver
                </button>
                <button
                  onClick={() => handleUpdateStatus("REJECTED", "Candidature refusée")}
                  className="flex-1 sm:flex-initial h-9 px-4 rounded-xl bg-rose-600/80 text-xs font-bold text-white hover:bg-rose-500 transition-all cursor-pointer"
                >
                  Rejeter
                </button>
                <button
                  onClick={() => handleUpdateStatus("CHANGES_REQUESTED", "Modifications demandées")}
                  className="flex-1 sm:flex-initial h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300 hover:bg-white/10"
                >
                  Demander révision
                </button>
              </div>

              <button
                onClick={() => setActiveResponse(null)}
                className="h-9 px-4 rounded-xl border border-white/10 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
