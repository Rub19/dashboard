"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Ticket,
  Search,
  Plus,
  RefreshCw,
  Sliders,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  User,
  Hash,
  ExternalLink,
  Trash2,
  Edit2,
  Send,
  Sparkles,
  BarChart3,
  Shield,
  MessageSquare,
  Star,
  Download,
  Eye,
  Settings2,
  Zap,
  Tag,
  Scale,
  ArrowUpRight,
  Filter,
  Layers,
  Flame,
  Check,
  X,
  Play,
  Pause,
} from "lucide-react";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:3001";

export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type TicketStatus =
  | "OPEN"
  | "PENDING"
  | "WAITING_USER"
  | "WAITING_STAFF"
  | "RESOLVED"
  | "CLOSED";

export interface TicketItem {
  id: string;
  guildId: string;
  channelId: string;
  userId: string;
  userTag: string;
  userAvatar?: string | null;
  categoryId: string;
  categoryName: string;
  assignedTeamId?: string | null;
  claimedBy?: { id: string; tag: string; avatar?: string | null } | null;
  status: TicketStatus;
  priority: TicketPriority;
  tags?: string[];
  relatedCaseId?: number | string | null;
  answers?: Record<string, any>;
  notes?: Array<{
    id: string;
    authorId: string;
    authorTag: string;
    content: string;
    createdAt: string;
  }>;
  activityTimeline?: Array<{
    id: string;
    type: string;
    actorTag: string;
    description: string;
    timestamp: string;
  }>;
  rating?: {
    score: number;
    comment?: string;
    ratedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  closeReason?: string | null;
}

export interface TicketCategoryItem {
  id: string;
  guildId: string;
  name: string;
  emoji?: string;
  description?: string;
  color?: string;
  discordCategoryId?: string | null;
  supportRoleIds?: string[];
  assignedTeamId?: string;
  defaultPriority?: TicketPriority;
  autoCloseInactivityHours?: number;
  cooldownMinutes?: number;
  maxTicketsPerUser?: number;
  autoTranscript?: boolean;
  welcomeMessage?: string;
  formFields?: Array<{
    id: string;
    label: string;
    placeholder?: string;
    style: "short" | "paragraph";
    required: boolean;
  }>;
}

export interface TicketPanelItem {
  id: string;
  guildId: string;
  title: string;
  description: string;
  color: string;
  channelId?: string;
  messageId?: string;
  categoryIds: string[];
  buttonLabel?: string;
  createdAt?: string;
}

export interface TicketTeamItem {
  id: string;
  guildId: string;
  name: string;
  description?: string;
  color: string;
  roleIds: string[];
  categoryIds: string[];
  memberIds?: string[];
}

export interface TicketAutomationItem {
  id: string;
  guildId: string;
  name: string;
  enabled: boolean;
  trigger: "TICKET_CREATED" | "STATUS_CHANGED" | "PRIORITY_CHANGED" | "INACTIVITY_TRIGGER";
  conditions: Array<{
    field: string;
    operator: "EQUALS" | "CONTAINS" | "NOT_EQUALS";
    value: string;
  }>;
  actions: Array<{
    type: "ASSIGN_TEAM" | "SET_PRIORITY" | "ADD_TAG" | "SEND_MESSAGE" | "CLOSE_TICKET";
    payload: any;
  }>;
}

export interface TicketOverview {
  open: number;
  pending: number;
  closedToday: number;
  totalTickets: number;
  averageResponseTime: string;
  resolutionRate: string;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  recentTickets: TicketItem[];
}

export function TicketCenterClient() {
  const searchParams = useSearchParams();
  const guildIdParam = searchParams.get("guildId");
  const tabParam = searchParams.get("tab");

  const { profile, loading: discordLoading } = useDiscordOAuth();
  const { success, error: showError, info } = useToast();

  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  const guilds: DiscordGuild[] = useMemo(() => profile?.guilds || [], [profile?.guilds]);

  const [activeTab, setActiveTab] = useState<
    "explorer" | "panels" | "categories" | "teams" | "automations" | "transcripts" | "analytics" | "settings"
  >((tabParam as any) || "explorer");

  // Données Live
  const [overview, setOverview] = useState<TicketOverview | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [categories, setCategories] = useState<TicketCategoryItem[]>([]);
  const [panels, setPanels] = useState<TicketPanelItem[]>([]);
  const [teams, setTeams] = useState<TicketTeamItem[]>([]);
  const [automations, setAutomations] = useState<TicketAutomationItem[]>([]);
  const [config, setConfig] = useState<any>({});
  const [discordCats, setDiscordCats] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filtres Explorer
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  // Modals
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [newTicketCategory, setNewTicketCategory] = useState("");
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketDetails, setNewTicketDetails] = useState("");

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TicketCategoryItem | null>(null);

  const [showPanelModal, setShowPanelModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState<TicketPanelItem | null>(null);
  const [targetChannelId, setTargetChannelId] = useState("");

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TicketTeamItem | null>(null);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [ticketToClose, setTicketToClose] = useState<TicketItem | null>(null);
  const [closeReason, setCloseReason] = useState("Résolu via Dashboard");

  const [previewTranscriptHtml, setPreviewTranscriptHtml] = useState<string | null>(null);

  // Sélection automatique de la guilde passée dans l'URL
  useEffect(() => {
    if (guildIdParam && guilds.length > 0) {
      const match = guilds.find((g: DiscordGuild) => g.id === guildIdParam);
      if (match && selectedGuild?.id !== match.id) {
        setSelectedGuild(match);
      }
    } else if (guilds.length > 0 && !selectedGuild) {
      setSelectedGuild(guilds[0]);
    }
  }, [guildIdParam, guilds, selectedGuild]);

  const currentGuildId = selectedGuild?.id || guildIdParam || "1128633164290596884";

  // Chargement global des données
  const fetchAllData = useCallback(async () => {
    if (!currentGuildId) return;
    setLoading(true);
    try {
      const [ovRes, tRes, cRes, pRes, tmRes, aRes, cfgRes, dcRes] = await Promise.all([
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/overview`).catch(() => null),
        fetch(
          `${API_BASE}/api/guilds/${currentGuildId}/tickets/tickets?status=${statusFilter}&priority=${priorityFilter}&categoryId=${categoryFilter}&search=${encodeURIComponent(
            searchQuery
          )}&period=${periodFilter}&limit=100`
        ).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/categories`).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/panels`).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/teams`).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/automations`).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/config`).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/discord-categories`).catch(() => null),
      ]);

      if (ovRes && ovRes.ok) {
        const ovData = await ovRes.json();
        setOverview(ovData);
      }

      if (tRes && tRes.ok) {
        const tData = await tRes.json();
        setTickets(tData.tickets || []);
        setTotalTickets(tData.total || 0);
      }

      if (cRes && cRes.ok) {
        const cData = await cRes.json();
        setCategories(cData.categories || []);
      }

      if (pRes && pRes.ok) {
        const pData = await pRes.json();
        setPanels(pData.panels || []);
      }

      if (tmRes && tmRes.ok) {
        const tmData = await tmRes.json();
        setTeams(tmData.teams || []);
      }

      if (aRes && aRes.ok) {
        const aData = await aRes.json();
        setAutomations(aData.automations || []);
      }

      if (cfgRes && cfgRes.ok) {
        const cfgData = await cfgRes.json();
        setConfig(cfgData.config || {});
      }

      if (dcRes && dcRes.ok) {
        const dcData = await dcRes.json();
        setDiscordCats(dcData.categories || []);
      }
    } catch (err: any) {
      console.error("Erreur chargement Tickets Center 2.0 :", err);
    } finally {
      setLoading(false);
    }
  }, [currentGuildId, statusFilter, priorityFilter, categoryFilter, searchQuery, periodFilter]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Actions Tickets rapides
  const handleQuickClaim = async (ticket: TicketItem) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/tickets/${ticket.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: "admin-dash",
          staffTag: "Staff ETHONE",
        }),
      });
      if (!res.ok) throw new Error("Échec de la prise en charge");
      success("Ticket pris en charge", `Vous avez pris en charge le ticket #${ticket.id}.`);
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCyclePriority = async (ticket: TicketItem) => {
    const cycle: Record<TicketPriority, TicketPriority> = {
      LOW: "NORMAL",
      NORMAL: "HIGH",
      HIGH: "URGENT",
      URGENT: "LOW",
    };
    const nextPriority = cycle[ticket.priority] || "NORMAL";
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/tickets/${ticket.id}/priority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: nextPriority,
          performedBy: { id: "admin-dash", tag: "Staff ETHONE" },
        }),
      });
      if (!res.ok) throw new Error("Échec mise à jour priorité");
      info("Priorité modifiée", `Priorité passée à ${nextPriority} pour #${ticket.id}.`);
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!ticketToClose) return;
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/tickets/${ticketToClose.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closedBy: { id: "admin-dash", tag: "Staff ETHONE" },
          reason: closeReason,
        }),
      });
      if (!res.ok) throw new Error("Échec de la fermeture");
      success("Ticket clôturé", `Le ticket #${ticketToClose.id} a été clôturé avec succès.`);
      setShowCloseModal(false);
      setTicketToClose(null);
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Sauvegarde Catégorie
  const handleSaveCategory = async (cat: Partial<TicketCategoryItem>) => {
    try {
      setActionLoading(true);
      const id = cat.id || `cat-${Date.now()}`;
      const payload = {
        ...cat,
        id,
        guildId: currentGuildId,
        color: cat.color || "#3B82F6",
      };
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Échec sauvegarde catégorie");
      success("Catégorie enregistrée", `Catégorie "${payload.name}" mise à jour.`);
      setShowCategoryModal(false);
      setEditingCategory(null);
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette catégorie de ticket ?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/categories/${catId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Échec suppression");
      success("Catégorie supprimée", "La catégorie a été retirée.");
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", err.message);
    }
  };

  // Sauvegarde & Publication Panel
  const handleSavePanel = async (panel: Partial<TicketPanelItem>) => {
    try {
      setActionLoading(true);
      const id = panel.id || `panel-${Date.now()}`;
      const payload = {
        ...panel,
        id,
        guildId: currentGuildId,
        color: panel.color || "#5865F2",
      };
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/panels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Échec sauvegarde panel");
      success("Panel enregistré", `Panel "${payload.title}" mis à jour.`);
      setShowPanelModal(false);
      setEditingPanel(null);
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishPanel = async (panelId: string) => {
    if (!targetChannelId) {
      showError("Salon requis", "Veuillez spécifier l'ID du salon textuel.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/panels/${panelId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: targetChannelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de publication");
      success("Panel publié sur Discord !", `Le panneau interactif a été posté dans #${data.channelName}.`);
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Sauvegarde Config globale
  const handleSaveConfig = async (newCfg: any) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCfg),
      });
      if (!res.ok) throw new Error("Échec de mise à jour");
      success("Configuration enregistrée", "Les paramètres du système de tickets ont été appliqués.");
      setConfig((p: any) => ({ ...p, ...newCfg }));
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Couleurs de priorité
  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case "URGENT":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse";
      case "HIGH":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "NORMAL":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      case "LOW":
      default:
        return "bg-zinc-500/20 text-zinc-300 border-zinc-500/40";
    }
  };

  // Couleurs de statut
  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case "OPEN":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "WAITING_STAFF":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      case "WAITING_USER":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
      case "PENDING":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "RESOLVED":
        return "bg-teal-500/20 text-teal-300 border-teal-500/40";
      case "CLOSED":
        return "bg-zinc-700/40 text-zinc-400 border-zinc-600/40";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white px-4 sm:px-8 py-6 pb-36">
      {/* Top Bar / Guild Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-500/20">
            <Ticket className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Tickets Center 2.0</h1>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                Helpdesk Pro
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Support client centralisé, formulaires, équipes de modération, transcripts et KPI en temps réel.
            </p>
          </div>
        </div>

        {/* Guild Selection & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={currentGuildId}
            onChange={(e) => {
              const g = guilds.find((item: DiscordGuild) => item.id === e.target.value);
              if (g) setSelectedGuild(g);
            }}
            className="h-9 rounded-xl border border-white/10 bg-zinc-900/90 px-3 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
          >
            {guilds.length > 0 ? (
              guilds.map((g: DiscordGuild) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))
            ) : (
              <option value="1128633164290596884">Serveur Principal Discord</option>
            )}
          </select>

          <button
            onClick={fetchAllData}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/80 text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            title="Rafraîchir les données"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin text-emerald-400")} />
          </button>

          <Link
            href={`/discord?guildId=${currentGuildId}`}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 px-3 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
          >
            <span>Retour Discord</span>
          </Link>
        </div>
      </div>

      {/* KPI Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-zinc-900/50 to-zinc-900/80 p-4 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Tickets Ouverts</span>
            <Ticket className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{overview?.open ?? 0}</p>
          <p className="text-[10px] text-emerald-300/80 mt-1">En attente de prise en charge</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-zinc-900/50 to-zinc-900/80 p-4 shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>En Attente</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{overview?.pending ?? 0}</p>
          <p className="text-[10px] text-amber-300/80 mt-1">Réponse membre ou staff requise</p>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-zinc-900/50 to-zinc-900/80 p-4 shadow-lg shadow-blue-500/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Clôturés Aujourd&apos;hui</span>
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{overview?.closedToday ?? 0}</p>
          <p className="text-[10px] text-blue-300/80 mt-1">Sur {overview?.totalTickets ?? 0} tickets au total</p>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-zinc-900/50 to-zinc-900/80 p-4 shadow-lg shadow-indigo-500/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Temps de Réponse</span>
            <Zap className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{overview?.averageResponseTime || "3m 42s"}</p>
          <p className="text-[10px] text-indigo-300/80 mt-1">Moyenne première réponse</p>
        </div>

        <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-zinc-900/50 to-zinc-900/80 p-4 shadow-lg shadow-teal-500/5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Taux de Résolution</span>
            <Sparkles className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{overview?.resolutionRate || "95%"}</p>
          <p className="text-[10px] text-teal-300/80 mt-1">Satisfaction membre élevée</p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/10 pb-2 mt-8 text-xs scrollbar-none">
        {[
          { id: "explorer", label: "Tickets", icon: Ticket, count: totalTickets },
          { id: "panels", label: "Panels Discord", icon: Sliders, count: panels.length },
          { id: "categories", label: "Catégories & Formulaires", icon: Settings2, count: categories.length },
          { id: "teams", label: "Équipes de Support", icon: Users, count: teams.length },
          { id: "automations", label: "Automatisations", icon: Zap, count: automations.length },
          { id: "transcripts", label: "Transcripts", icon: FileText },
          { id: "analytics", label: "Analytics & Staff", icon: BarChart3 },
          { id: "settings", label: "Anti-Abuse & Réglages", icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-2 font-medium transition-all whitespace-nowrap cursor-pointer",
                isActive
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    isActive ? "bg-white/20 text-white" : "bg-white/5 text-zinc-400"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: TICKETS EXPLORER */}
      {activeTab === "explorer" && (
        <div className="space-y-4 mt-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par ID, utilisateur, tag, case..."
                  className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900/80 pl-9 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Statut Selector */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-white/10 bg-zinc-900/80 px-2.5 text-xs text-zinc-300 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="OPEN">🟢 Ouverts</option>
                <option value="WAITING_STAFF">🟠 Attente Staff</option>
                <option value="WAITING_USER">🔵 Attente Membre</option>
                <option value="RESOLVED">🟣 Résolus</option>
                <option value="CLOSED">⚫ Clôturés</option>
              </select>

              {/* Priorité Selector */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-9 rounded-xl border border-white/10 bg-zinc-900/80 px-2.5 text-xs text-zinc-300 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">Toutes priorités</option>
                <option value="URGENT">🔥 Urgent</option>
                <option value="HIGH">⚡ Élevée</option>
                <option value="NORMAL">📌 Normale</option>
                <option value="LOW">💤 Faible</option>
              </select>

              {/* Catégorie Selector */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-xl border border-white/10 bg-zinc-900/80 px-2.5 text-xs text-zinc-300 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">Toutes catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">
                {tickets.length} ticket(s) listé(s)
              </span>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.03] text-zinc-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Ticket ID</th>
                  <th className="py-3 px-4 font-semibold">Demandeur</th>
                  <th className="py-3 px-4 font-semibold">Catégorie</th>
                  <th className="py-3 px-4 font-semibold">Priorité</th>
                  <th className="py-3 px-4 font-semibold">Statut</th>
                  <th className="py-3 px-4 font-semibold">Staff Assigné</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Ticket className="h-8 w-8 text-zinc-600" />
                        <p className="text-sm font-medium text-zinc-400">Aucun ticket correspondant aux filtres.</p>
                        <p className="text-xs text-zinc-600">Les nouveaux tickets ouverts apparaîtront ici en direct.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Ticket ID */}
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        <Link
                          href={`/discord/tickets/${t.id}?guildId=${currentGuildId}`}
                          className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                        >
                          <span>#{t.id}</span>
                          {t.relatedCaseId && (
                            <span className="rounded bg-orange-500/20 px-1 py-0.2 text-[9px] text-orange-300 font-sans border border-orange-500/30">
                              Case #{t.relatedCaseId}
                            </span>
                          )}
                        </Link>
                      </td>

                      {/* Demandeur */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-emerald-400 border border-white/10 overflow-hidden">
                            {t.userAvatar ? (
                              <img src={t.userAvatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              t.userTag.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white leading-tight">{t.userTag}</p>
                            <p className="text-[10px] text-zinc-400 font-mono">{t.userId}</p>
                          </div>
                        </div>
                      </td>

                      {/* Catégorie */}
                      <td className="py-3 px-4">
                        <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-zinc-300 font-medium">
                          {t.categoryName || "Général"}
                        </span>
                      </td>

                      {/* Priorité (cliquable pour toggle rapide) */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleCyclePriority(t)}
                          disabled={actionLoading}
                          title="Cliquez pour changer la priorité"
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:scale-105 transition-transform",
                            getPriorityBadge(t.priority)
                          )}
                        >
                          {t.priority}
                        </button>
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            getStatusBadge(t.status)
                          )}
                        >
                          {t.status}
                        </span>
                      </td>

                      {/* Staff Assigné */}
                      <td className="py-3 px-4">
                        {t.claimedBy ? (
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="font-medium text-emerald-300">{t.claimedBy.tag}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleQuickClaim(t)}
                            disabled={actionLoading}
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-400 hover:text-white hover:bg-emerald-600/30 transition-all cursor-pointer"
                          >
                            + Prendre en charge
                          </button>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-zinc-400">
                        <span title={t.createdAt}>
                          {new Date(t.createdAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/discord/tickets/${t.id}?guildId=${currentGuildId}`}
                            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-300 hover:text-white hover:bg-emerald-600/20 transition-all"
                            title="Ouvrir le détail complet"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>

                          {t.status !== "CLOSED" && (
                            <button
                              onClick={() => {
                                setTicketToClose(t);
                                setShowCloseModal(true);
                              }}
                              className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
                              title="Clôturer le ticket"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PANELS BUILDER */}
      {activeTab === "panels" && (
        <div className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Panneaux d&apos;Ouverture Discord</h2>
              <p className="text-xs text-zinc-400">
                Créez des embeds interactifs contenant des boutons pour permettre aux membres d&apos;ouvrir des tickets en un clic.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPanel({
                  id: `panel-${Date.now()}`,
                  guildId: currentGuildId,
                  title: "🎫 Support & Assistance ETHONE",
                  description:
                    "Besoin d'aide, d'une question ou d'un signalement ? Choisissez l'une des catégories ci-dessous pour ouvrir un salon de discussion privé avec notre équipe.",
                  color: "#10B981",
                  categoryIds: categories.map((c) => c.id),
                  buttonLabel: "Ouvrir un ticket",
                });
                setShowPanelModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau Panneau</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {panels.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4 hover:border-emerald-500/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{p.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{p.description}</p>
                  </div>
                  <span
                    className="h-5 w-5 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: p.color || "#5865F2" }}
                  />
                </div>

                <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-2">
                  <p className="text-[10px] uppercase font-bold text-zinc-400">Catégories liées</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.categoryIds && p.categoryIds.length > 0 ? (
                      p.categoryIds.map((cid) => {
                        const cat = categories.find((c) => c.id === cid);
                        return (
                          <span
                            key={cid}
                            className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-zinc-200"
                          >
                            {cat?.emoji || "🎫"} {cat?.name || cid}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-zinc-400">Toutes les catégories</span>
                    )}
                  </div>
                </div>

                {/* Publication dans salon textuel */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="ID Salon textuel"
                      defaultValue={p.channelId || ""}
                      onChange={(e) => setTargetChannelId(e.target.value)}
                      className="h-8 w-36 rounded-lg border border-white/10 bg-zinc-900 px-2.5 text-[11px] text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handlePublishPanel(p.id)}
                      disabled={actionLoading}
                      className="flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-500 transition-all cursor-pointer"
                    >
                      <Send className="h-3 w-3" />
                      <span>Publier</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setEditingPanel(p);
                      setShowPanelModal(true);
                    }}
                    className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                    title="Modifier le panel"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CATÉGORIES & FORMULAIRES */}
      {activeTab === "categories" && (
        <div className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Catégories & Formulaires Dynamiques</h2>
              <p className="text-xs text-zinc-400">
                Définissez les motifs de support et les questions posées au membre dans le Modal Discord avant la création du salon.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCategory({
                  id: `cat-${Date.now()}`,
                  guildId: currentGuildId,
                  name: "Nouvelle Catégorie",
                  emoji: "🎫",
                  description: "Description de la catégorie...",
                  color: "#3B82F6",
                  defaultPriority: "NORMAL",
                  autoCloseInactivityHours: 24,
                  formFields: [
                    { id: "reason", label: "Motif principal", style: "short", required: true },
                    { id: "details", label: "Détails de la demande", style: "paragraph", required: true },
                  ],
                  welcomeMessage:
                    "Bonjour {user} ! Merci d'avoir contacté l'assistance {category}.\nUn membre de l'équipe {team} va prendre en charge votre ticket #{ticketId}.",
                });
                setShowCategoryModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvelle Catégorie</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4 hover:border-emerald-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{cat.emoji || "🎫"}</span>
                    <div>
                      <h3 className="font-bold text-white text-sm leading-tight">{cat.name}</h3>
                      <p className="text-[10px] text-zinc-400 font-mono">{cat.id}</p>
                    </div>
                  </div>
                  <span
                    className="h-4 w-4 rounded-full border border-white/20"
                    style={{ backgroundColor: cat.color || "#3B82F6" }}
                  />
                </div>

                <p className="text-xs text-zinc-300">{cat.description || "Aucune description"}</p>

                <div className="space-y-1.5 pt-2 border-t border-white/5 text-[11px]">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Priorité par défaut</span>
                    <span className="font-bold text-white">{cat.defaultPriority || "NORMAL"}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Délai auto-close</span>
                    <span className="font-bold text-white">{cat.autoCloseInactivityHours || 24}h</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Champs du formulaire</span>
                    <span className="font-bold text-emerald-400">
                      {cat.formFields?.length || 0} question(s)
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setShowCategoryModal(true);
                    }}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Modifier</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-1 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ÉQUIPES DE SUPPORT */}
      {activeTab === "teams" && (
        <div className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Équipes de Support & Spécialistes</h2>
              <p className="text-xs text-zinc-400">
                Organisez vos modérateurs et agents de support en équipes spécialisées (Support Général, Modération, Facturation).
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTeam({
                  id: `team-${Date.now()}`,
                  guildId: currentGuildId,
                  name: "Nouvelle Équipe",
                  description: "Missions de l'équipe...",
                  color: "#3B82F6",
                  roleIds: [],
                  categoryIds: [],
                });
                setShowTeamModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Créer une Équipe</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {teams.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4 hover:border-emerald-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: t.color || "#3B82F6" }}
                    />
                    <h3 className="font-bold text-white text-sm">{t.name}</h3>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">{t.id}</span>
                </div>
                <p className="text-xs text-zinc-300">{t.description || "Aucune description"}</p>

                <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1 text-xs">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase">Membres & Rôles</p>
                  <p className="text-white font-semibold">
                    {t.roleIds.length > 0 ? `${t.roleIds.length} rôle(s) Discord assigné(s)` : "Aucun rôle configuré"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: AUTOMATISATIONS */}
      {activeTab === "automations" && (
        <div className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Règles d&apos;Automatisation Helpdesk</h2>
              <p className="text-xs text-zinc-400">
                Définissez des flux automatiques : Déclencheur ➔ Conditions ➔ Actions (ex: Si catégorie = Facturation alors Priorité = Élevée).
              </p>
            </div>
            <button
              onClick={() => {
                const newRule: TicketAutomationItem = {
                  id: `auto-${Date.now()}`,
                  guildId: currentGuildId,
                  name: "Auto-Assignation Support",
                  enabled: true,
                  trigger: "TICKET_CREATED",
                  conditions: [{ field: "categoryId", operator: "EQUALS", value: "cat-support" }],
                  actions: [{ type: "ASSIGN_TEAM", payload: { teamId: "team-support" } }],
                };
                fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/automations`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(newRule),
                }).then(() => fetchAllData());
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter une Règle</span>
            </button>
          </div>

          <div className="space-y-3">
            {automations.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">{a.name}</h3>
                    <p className="text-[11px] text-zinc-400">
                      Quand <code className="text-emerald-300">{a.trigger}</code> ➔ Effectuer{" "}
                      <code className="text-teal-300">{a.actions[0]?.type || "Action"}</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      a.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-700/40 text-zinc-400"
                    )}
                  >
                    {a.enabled ? "Actif" : "Inactif"}
                  </span>
                  <button
                    onClick={() => {
                      fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/automations/${a.id}`, {
                        method: "DELETE",
                      }).then(() => fetchAllData());
                    }}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: TRANSCRIPTS */}
      {activeTab === "transcripts" && (
        <div className="space-y-6 mt-6">
          <div>
            <h2 className="text-base font-bold text-white">Archives & Transcripts</h2>
            <p className="text-xs text-zinc-400">
              Historique immuable de l&apos;intégralité des messages, pièces jointes et échanges des tickets clôturés.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.03] text-zinc-400">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Membre</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Clôturé le</th>
                  <th className="py-3 px-4">Raison</th>
                  <th className="py-3 px-4 text-right">Téléchargements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tickets
                  .filter((t) => t.status === "CLOSED")
                  .map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono font-bold text-white">#{t.id}</td>
                      <td className="py-3 px-4 text-zinc-200">{t.userTag}</td>
                      <td className="py-3 px-4 text-zinc-300">{t.categoryName}</td>
                      <td className="py-3 px-4 text-zinc-400">{t.closedAt || "N/A"}</td>
                      <td className="py-3 px-4 text-zinc-400">{t.closeReason || "Résolu"}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`${API_BASE}/api/guilds/${currentGuildId}/tickets/transcripts/${t.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-600/20"
                          >
                            <Download className="h-3 w-3" />
                            <span>HTML</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6 mt-6">
          <div>
            <h2 className="text-base font-bold text-white">Analytics & Performance Staff</h2>
            <p className="text-xs text-zinc-400">
              Métriques de productivité, temps de résolution et taux de satisfaction membre.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Répartition par Catégorie</h3>
              <div className="space-y-2">
                {Object.entries(overview?.byCategory || {}).map(([catName, count]) => (
                  <div key={catName} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">{catName}</span>
                      <span className="font-bold text-white">{count} ticket(s)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (count / Math.max(1, overview?.totalTickets || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Répartition par Priorité</h3>
              <div className="space-y-2">
                {Object.entries(overview?.byPriority || {}).map(([prio, count]) => (
                  <div key={prio} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">{prio}</span>
                      <span className="font-bold text-white">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          prio === "URGENT"
                            ? "bg-rose-500"
                            : prio === "HIGH"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                        )}
                        style={{
                          width: `${Math.min(
                            100,
                            (count / Math.max(1, overview?.totalTickets || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: SETTINGS & ANTI-ABUSE */}
      {activeTab === "settings" && (
        <div className="space-y-6 mt-6 max-w-3xl">
          <div>
            <h2 className="text-base font-bold text-white">Paramètres Généraux & Anti-Abuse</h2>
            <p className="text-xs text-zinc-400">
              Configurez les limites de création, les délais de clôture automatique et les options globales.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-bold text-white text-xs">Activer le système de Tickets</p>
                <p className="text-[11px] text-zinc-400">Autorise l&apos;ouverture de nouveaux tickets sur ce serveur.</p>
              </div>
              <input
                type="checkbox"
                checked={config.enabled ?? true}
                onChange={(e) => handleSaveConfig({ enabled: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-700 accent-emerald-500"
              />
            </label>

            <div className="border-t border-white/5 pt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Max Tickets Ouverts par Membre</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  defaultValue={config.maxOpenTicketsPerUser || 1}
                  onBlur={(e) =>
                    handleSaveConfig({ maxOpenTicketsPerUser: parseInt(e.target.value, 10) })
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Délai d&apos;inactivité avant fermeture (Heures)</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  defaultValue={config.inactivityCloseHours || 24}
                  onBlur={(e) =>
                    handleSaveConfig({ inactivityCloseHours: parseInt(e.target.value, 10) })
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Convention de nommage du salon</label>
                <input
                  type="text"
                  defaultValue={config.channelNamingScheme || "ticket-{username}"}
                  onBlur={(e) => handleSaveConfig({ channelNamingScheme: e.target.value })}
                  className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-zinc-400 mt-1">Variables : {"{username}"}, {"{count}"}, {"{category}"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FERMETURE TICKET */}
      {showCloseModal && ticketToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Clôturer le Ticket #{ticketToClose.id}</h3>
            <p className="text-xs text-zinc-400">
              Un transcript HTML/JSON sera automatiquement archivé et le salon Discord sera supprimé dans 5 secondes.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Motif de clôture</label>
              <input
                type="text"
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Ex: Problème résolu, inactivité..."
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
                onClick={handleConfirmClose}
                disabled={actionLoading}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-all cursor-pointer"
              >
                {actionLoading ? "Fermeture..." : "Confirmer la fermeture"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
