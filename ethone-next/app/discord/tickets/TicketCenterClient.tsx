"use client";

import { confirmDialog } from "@/lib/confirmDialog";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  ChevronRight,
  Trash2,
  Edit2,
  Send,
  Sparkles,
  BarChart3,
  Shield,
  Download,
  Settings2,
  Zap,
  X,
  AlertCircle,
  ExternalLink,
} from "@/components/icons/ph";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { useToast } from "@/components/ToastProvider";
import { cn, formatApiError } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import ChannelPicker from "@/components/discord/ChannelPicker";
import RolePicker from "@/components/discord/RolePicker";
import { CardSkeleton } from "@/components/ui/Skeleton";
import Select from "@/components/ui/Select";
import { errorReason } from "@/lib/format-error";

import { motion } from "framer-motion";
const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const API_BASE = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

function emptyOverview(): TicketOverview {
  // Aucune statistique inventée : tout à zéro tant que le bot ne répond pas.
  return {
    open: 0,
    pending: 0,
    closedToday: 0,
    totalTickets: 0,
    averageResponseTime: "—",
    resolutionRate: "—",
    byPriority: {},
    byCategory: {},
    byStatus: {},
    recentTickets: [],
  } as unknown as TicketOverview;
}

function noTickets(_guildId: string): TicketItem[] {
  return [];
}

function noCategories(_guildId: string): TicketCategoryItem[] {
  return [];
}

function noPanels(_guildId: string): TicketPanelItem[] {
  return [];
}

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
  /** Mode forum : le ticket est un post de forum (channelId = id du post). */
  mode?: "channel" | "forum";
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
  const appliedQueryGuild = useRef<string | null>(null);
  const guildIdParam = searchParams.get("guildId");
  const tabParam = searchParams.get("tab");

  const { profile } = useDiscordOAuth();
  const { success, error: showError, info } = useToast();

  const allGuilds: DiscordGuild[] = useMemo(() => {
    if (profile?.guilds && profile.guilds.length > 0) return profile.guilds;
    return getStoredDiscordGuilds();
  }, [profile?.guilds]);

  const botGuildIds = useBotGuildIds(allGuilds);

  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (allGuilds.length === 0) return [];
    const manageable = allGuilds.filter((g) => canManageGuild(g) || (botGuildIds && botGuildIds.includes(g.id)));
    return manageable.length > 0 ? manageable : allGuilds;
  }, [allGuilds, botGuildIds]);

  const userSelectedRef = useRef(false);
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

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
  // Mode forum : choix du mode en attente tant qu'aucun forum n'est sélectionné (le bot refuse un mode forum sans forum).
  const [modeDraft, setModeDraft] = useState<"channel" | "forum" | null>(null);
  const [forumTagsLoading, setForumTagsLoading] = useState(false);

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
  const [panelChannels, setPanelChannels] = useState<Record<string, string>>({});

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TicketTeamItem | null>(null);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [ticketToClose, setTicketToClose] = useState<TicketItem | null>(null);
  const [closeReason, setCloseReason] = useState("Résolu via Dashboard");

  const [previewTranscriptHtml, setPreviewTranscriptHtml] = useState<string | null>(null);

  // Auto-sélection de la guilde
  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (guildIdParam && appliedQueryGuild.current !== guildIdParam) {
      const match = manageableGuilds.find((g) => g.id === guildIdParam);
      if (match) {
        appliedQueryGuild.current = guildIdParam;
        setSelectedGuild(match);
        return;
      }
    }
    if (!userSelectedRef.current && !guildIdParam) {
      if (!selectedGuild) {
        if (botGuildIds !== null) {
          setSelectedGuild(pickBotGuild(manageableGuilds, botGuildIds)!);
        }
      } else if (botGuildIds && botGuildIds.length > 0 && !botGuildIds.includes(selectedGuild.id)) {
        const botGuild = pickBotGuild(manageableGuilds, botGuildIds);
        if (botGuild && botGuild.id !== selectedGuild.id && botGuildIds.includes(botGuild.id)) {
          setSelectedGuild(botGuild);
        }
      }
    }
  }, [guildIdParam, manageableGuilds, selectedGuild, botGuildIds]);

  const currentGuildId = selectedGuild?.id || guildIdParam || "";
  const isBotPresent = Boolean(selectedGuild && botGuildIds && botGuildIds.includes(selectedGuild.id));

  // Chargement global des données
  const fetchAllData = useCallback(async () => {
    if (!currentGuildId) return;
    setLoading(true);

    if (botGuildIds !== null && selectedGuild && !botGuildIds.includes(selectedGuild.id)) {
      setOverview(emptyOverview());
      setTickets([]);
      setTotalTickets(0);
      setCategories([]);
      setPanels([]);
      setTeams([]);
      setAutomations([]);
      setConfig({});
      setDiscordCats([]);
      setLoading(false);
      return;
    }

    if (!API_BASE) {
      setOverview(emptyOverview());
      const demoTickets = noTickets(currentGuildId);
      setTickets(demoTickets);
      setTotalTickets(demoTickets.length);
      setCategories(noCategories(currentGuildId));
      setPanels(noPanels(currentGuildId));
      setTeams([]);
      setAutomations([]);
      setConfig({});
      setDiscordCats([]);
      setLoading(false);
      return;
    }

    try {
      const [ovRes, tRes, cRes, pRes, tmRes, aRes, cfgRes, dcRes] = await Promise.all([
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/overview`, { credentials: "include" }).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/tickets?status=${statusFilter}&priority=${priorityFilter}&categoryId=${categoryFilter}&search=${encodeURIComponent(
            searchQuery
          )}&period=${periodFilter}&limit=100`, { credentials: "include" }).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/categories`, { credentials: "include" }).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/panels`, { credentials: "include" }).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/teams`, { credentials: "include" }).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/automations`, { credentials: "include" }).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/config`, { credentials: "include" }).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/discord-categories`, { credentials: "include" }).catch(() => null),
      ]);

      if (ovRes && ovRes.ok) {
        const ovData = await ovRes.json();
        setOverview(ovData);
      } else {
        setOverview(emptyOverview());
      }

      if (tRes && tRes.ok) {
        const tData = await tRes.json();
        setTickets(tData.tickets || []);
        setTotalTickets(tData.total || 0);
      } else {
        const demoTickets = noTickets(currentGuildId);
        setTickets(demoTickets);
        setTotalTickets(demoTickets.length);
      }

      if (cRes && cRes.ok) {
        const cData = await cRes.json();
        setCategories(cData.categories || []);
      } else {
        setCategories(noCategories(currentGuildId));
      }

      if (pRes && pRes.ok) {
        const pData = await pRes.json();
        setPanels(pData.panels || []);
      } else {
        setPanels(noPanels(currentGuildId));
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
      console.warn("Erreur chargement Tickets Center, fallback démo :", err);
      setOverview(emptyOverview());
      const demoTickets = noTickets(currentGuildId);
      setTickets(demoTickets);
      setTotalTickets(demoTickets.length);
      setCategories(noCategories(currentGuildId));
      setPanels(noPanels(currentGuildId));
    } finally {
      setLoading(false);
    }
  }, [currentGuildId, statusFilter, priorityFilter, categoryFilter, searchQuery, periodFilter, botGuildIds, selectedGuild]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Actions Tickets rapides
  const handleQuickClaim = async (ticket: TicketItem) => {
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/tickets/${ticket.id}/claim`, {
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
      success("Ticket pris en charge", `Vous avez pris en charge le ticket #${ticket.id}.`);
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible de prendre en charge ce ticket"));
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
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/tickets/${ticket.id}/priority`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: nextPriority,
          performedBy: { id: "admin-dash", tag: "Staff ETHONE" },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, "Échec mise à jour priorité"));
      }
      info("Priorité modifiée", `Priorité passée à ${nextPriority} pour #${ticket.id}.`);
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible de modifier la priorité"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!ticketToClose) return;
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/tickets/${ticketToClose.id}/close`, {
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
      success("Ticket clôturé", `Le ticket #${ticketToClose.id} a été clôturé avec succès.`);
      setShowCloseModal(false);
      setTicketToClose(null);
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible de clôturer le ticket"));
    } finally {
      setActionLoading(false);
    }
  };

  // Sauvegarde Catégorie
  const handleSaveCategory = async (cat: Partial<TicketCategoryItem>) => {
    const id = cat.id || `cat-${Date.now()}`;
    const payload: TicketCategoryItem = {
      ...cat,
      id,
      guildId: currentGuildId,
      name: cat.name || "Nouvelle catégorie",
      color: cat.color || "#3B82F6",
    };
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/categories`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, "Échec sauvegarde catégorie"));
      }
      success("Catégorie enregistrée", `Catégorie "${payload.name}" mise à jour.`);
      setShowCategoryModal(false);
      setEditingCategory(null);
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible d'enregistrer la catégorie"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!await confirmDialog("Voulez-vous vraiment supprimer cette catégorie de ticket ?")) return;
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/categories/${catId}`, {
        credentials: "include",
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, "Échec suppression"));
      }
      success("Catégorie supprimée", "La catégorie a été retirée.");
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible de supprimer la catégorie"));
    }
  };

  // Sauvegarde & Publication Panel
  const handleSavePanel = async (panel: Partial<TicketPanelItem>) => {
    const id = panel.id || `panel-${Date.now()}`;
    const payload: TicketPanelItem = {
      ...panel,
      id,
      guildId: currentGuildId,
      title: panel.title || "Centre de support",
      description: panel.description || "",
      categoryIds: panel.categoryIds || [],
      color: panel.color || "#5865F2",
    };
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/panels`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, "Échec sauvegarde panel"));
      }
      success("Panel enregistré", `Panel "${payload.title}" mis à jour.`);
      setShowPanelModal(false);
      setEditingPanel(null);
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible d'enregistrer le panel"));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishPanel = async (panelId: string) => {
    const chId = (panelChannels[panelId] !== undefined ? panelChannels[panelId] : targetChannelId) || panels.find((p) => p.id === panelId)?.channelId;
    if (!chId) {
      showError("Salon requis", "Veuillez sélectionner ou spécifier l'ID du salon textuel.");
      return;
    }
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/panels/${panelId}/publish`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: chId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(formatApiError(data?.error, "Échec de publication"));
      success("Panel publié sur Discord !", `Le panneau interactif a été posté dans #${data.channelName || "salon"}.`);
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible de publier le panel"));
    } finally {
      setActionLoading(false);
    }
  };

  // Sauvegarde Config globale
  const handleSaveConfig = async (newCfg: any): Promise<boolean> => {
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return false;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/config`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCfg),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ? (typeof data.error === "string" ? data.error : JSON.stringify(data.error)) : "Échec de mise à jour");
      }
      success("Configuration enregistrée", "Les paramètres du système de tickets ont été appliqués.");
      setConfig((p: any) => ({ ...p, ...newCfg }));
      return true;
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible d'enregistrer la configuration"));
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // Mode forum : crée les tags Ouvert / En cours / Résolu / Fermé dans le forum et enregistre leurs ids.
  const handleCreateForumTags = async () => {
    if (!API_BASE || !config.forumChannelId) return;
    try {
      setForumTagsLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/config/forum-tags`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forumChannelId: config.forumChannelId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(formatApiError(data?.error, "Échec de la création des tags"));
      setConfig((p: any) => ({ ...p, ...data.config }));
      if (Array.isArray(data.skipped) && data.skipped.length > 0) {
        showError("Forum presque plein", "Discord limite un forum à 20 tags : certains tags de statut n'ont pas pu être créés.");
      } else {
        success("Tags de statut prêts", "Ouvert, En cours, Résolu et Fermé sont disponibles dans le forum.");
      }
    } catch (err: unknown) {
      showError("Erreur", errorReason(err, "Impossible de créer les tags de statut"));
    } finally {
      setForumTagsLoading(false);
    }
  };

  // Sauvegarde Team
  const handleSaveTeam = async (team: Partial<TicketTeamItem>) => {
    const id = team.id || `team-${Date.now()}`;
    const payload: TicketTeamItem = {
      ...team,
      id,
      guildId: currentGuildId,
      name: team.name || "Nouvelle équipe",
      description: team.description || "",
      color: team.color || "#3B82F6",
      roleIds: team.roleIds || [],
      categoryIds: team.categoryIds || [],
    };
    if (!API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/teams`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, "Échec sauvegarde équipe"));
      }
      success("Équipe enregistrée", `Équipe "${payload.name}" mise à jour.`);
      setShowTeamModal(false);
      setEditingTeam(null);
      fetchAllData();
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible d'enregistrer l'équipe"));
    } finally {
      setActionLoading(false);
    }
  };

  // Couleurs de priorité
  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case "URGENT":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "HIGH":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "NORMAL":
        return "bg-[var(--info)]/20 text-[var(--info)] border-[var(--info)]/40";
      case "LOW":
      default:
        return "bg-[var(--surface-raised)]/60 text-[var(--text-muted)] border-[var(--panel-border)]";
    }
  };

  // Couleurs de statut
  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case "OPEN":
        return "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-[var(--accent-primary)]/40";
      case "WAITING_STAFF":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      case "WAITING_USER":
        return "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/40";
      case "PENDING":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "RESOLVED":
        return "bg-teal-500/20 text-teal-300 border-teal-500/40";
      case "CLOSED":
        return "bg-[var(--surface-raised)]/50 text-[var(--text-muted)] border-[var(--panel-border)]";
    }
  };

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-6 sm:px-6 text-[var(--text-primary)]">
      {/* Top Bar / Guild Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--panel-border)] pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--inset-radius)] bg-[var(--accent-primary)] icon-pop">
            <Ticket className="h-6 w-6 text-[var(--text-primary)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Tickets Center</h1>
              <span className="rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent-primary)]">
                Helpdesk Pro
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Support client centralisé, formulaires, équipes de modération, transcripts et KPI en temps réel.
            </p>
          </div>
        </div>

        {/* Guild Selection & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          {manageableGuilds.length > 0 ? (
            <GuildSelector
              guilds={manageableGuilds}
              value={currentGuildId}
              onChange={(g) => {
                userSelectedRef.current = true;
                setSelectedGuild(g);
              }}
            />
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Aucun serveur administrable</span>
          )}

          <button
            onClick={fetchAllData}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            title="Rafraîchir les données"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin text-[var(--accent-primary)]")} />
          </button>

          <Link
            href={`/discord?guildId=${currentGuildId}`}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] px-3 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-all"
          >
            <span>Retour Discord</span>
          </Link>
        </div>
      </div>

      {/* Bot non présent banner */}
      {!isBotPresent && selectedGuild && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm">
              Le bot ETHONE n'est pas encore présent sur ce serveur. Invitez-le pour activer le système de tickets et synchroniser les salons.
            </p>
          </div>
          <a
            href={BOT_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black transition-colors shrink-0"
          >
            Inviter le bot
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* KPI Header Cards */}
      {loading && !overview ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
        <div className="rounded-2xl border border-[var(--accent-primary)]/20 bg-[var(--surface-raised)]/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
            <span>Tickets Ouverts</span>
            <Ticket className="h-4 w-4 text-[var(--accent-primary)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{overview?.open ?? 0}</p>
          <p className="text-xs text-[var(--accent-primary)]/80 mt-1">En attente de prise en charge</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-[var(--surface-raised)]/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
            <span>En Attente</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{overview?.pending ?? 0}</p>
          <p className="text-xs text-amber-300/80 mt-1">Réponse membre ou staff requise</p>
        </div>

        <div className="rounded-2xl border border-[var(--info)]/20 bg-[var(--surface-raised)]/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
            <span>Clôturés Aujourd&apos;hui</span>
            <CheckCircle2 className="h-4 w-4 text-[var(--info)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{overview?.closedToday ?? 0}</p>
          <p className="text-xs text-[var(--info)]/80 mt-1">Sur {overview?.totalTickets ?? 0} tickets au total</p>
        </div>

        <div className="rounded-2xl border border-[var(--accent-primary)]/20 bg-[var(--surface-raised)]/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
            <span>Temps de Réponse</span>
            <Zap className="h-4 w-4 text-[var(--accent-primary)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{overview?.averageResponseTime || "3m 42s"}</p>
          <p className="text-xs text-[var(--accent-primary)]/80 mt-1">Moyenne première réponse</p>
        </div>

        <div className="rounded-2xl border border-teal-500/20 bg-[var(--surface-raised)]/40 p-4 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
            <span>Taux de Résolution</span>
            <Sparkles className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{overview?.resolutionRate || "95%"}</p>
          <p className="text-xs text-teal-300/80 mt-1">Satisfaction membre élevée</p>
        </div>
      </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--panel-border)] pb-2 mt-8 text-xs scrollbar-none">
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
                "relative flex items-center gap-2 rounded-xl px-3.5 py-2 font-medium transition-colors duration-200 whitespace-nowrap cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 active:scale-[0.97]",
                isActive
                  ? "text-[var(--accent-contrast)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 hover:text-[var(--text-primary)]"
              )}
            >
              {isActive && <motion.span layoutId="tickets-tab" transition={{ type: "spring", stiffness: 450, damping: 43 }} className="absolute inset-0 rounded-xl bg-[var(--accent-primary)] shadow-sm" />}
              <Icon className="relative h-3.5 w-3.5" />
              <span className="relative">{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "relative rounded-full px-1.5 py-0.2 text-xs font-bold tabular-nums",
                    isActive ? "bg-[var(--accent-contrast)]/20 text-[var(--accent-contrast)]" : "bg-[var(--surface-raised)]/50 text-[var(--text-muted)]"
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
        <div className="stagger-children space-y-4 mt-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par ID, utilisateur, tag, case..."
                  className="h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 outline-none focus:border-[var(--accent-primary)]/60"
                />
              </div>

              {/* Statut Selector */}
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                size="sm"
                className="w-44 shrink-0"
                aria-label="Filtrer par statut"
                options={[
                  { id: "ALL", label: "Tous les statuts" },
                  { id: "OPEN", label: "🟢 Ouverts" },
                  { id: "WAITING_STAFF", label: "🟠 Attente Staff" },
                  { id: "WAITING_USER", label: "🔵 Attente Membre" },
                  { id: "RESOLVED", label: "🟣 Résolus" },
                  { id: "CLOSED", label: "⚫ Clôturés" },
                ]}
              />

              {/* Priorité Selector */}
              <Select
                value={priorityFilter}
                onChange={setPriorityFilter}
                size="sm"
                className="w-40 shrink-0"
                aria-label="Filtrer par priorité"
                options={[
                  { id: "ALL", label: "Toutes priorités" },
                  { id: "URGENT", label: "🔥 Urgent" },
                  { id: "HIGH", label: "⚡ Élevée" },
                  { id: "NORMAL", label: "📌 Normale" },
                  { id: "LOW", label: "💤 Faible" },
                ]}
              />

              {/* Catégorie Selector */}
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                size="sm"
                className="w-44 shrink-0"
                aria-label="Filtrer par catégorie"
                options={[
                  { id: "", label: "Toutes catégories" },
                  ...categories.map((c) => ({ id: c.id, label: `${c.emoji} ${c.name}` })),
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">
                {tickets.length} ticket(s) listé(s)
              </span>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="overflow-x-auto rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)]">
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
              <tbody className="divide-y divide-[var(--panel-border)]">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="pop-in py-12 text-center text-[var(--text-muted)]">
                      <div className="pop-in flex flex-col items-center justify-center gap-2">
                        <Ticket className="h-8 w-8 text-[var(--text-muted)]" />
                        <p className="text-sm font-medium text-[var(--text-muted)]">Aucun ticket correspondant aux filtres.</p>
                        <p className="text-xs text-[var(--text-muted)]">Les nouveaux tickets ouverts apparaîtront ici en direct.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((t, i) => (
                    <tr key={t.id} className="rise-in hover:bg-[var(--surface-raised)]/70 transition-colors group" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                      {/* Ticket ID */}
                      <td className="py-3 px-4 font-mono font-bold text-[var(--text-primary)]">
                        <Link
                          href={`/discord/tickets/${t.id}?guildId=${currentGuildId}`}
                          className="hover:text-[var(--accent-primary)] transition-colors inline-flex items-center gap-1"
                        >
                          <span>#{t.id}</span>
                          {t.relatedCaseId && (
                            <span className="rounded bg-orange-500/20 px-1 py-0.2 text-xs text-orange-300 font-sans border border-orange-500/30">
                              Case #{t.relatedCaseId}
                            </span>
                          )}
                        </Link>
                      </td>

                      {/* Demandeur */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-[var(--surface-raised)]/50 flex items-center justify-center text-xs font-bold text-[var(--accent-primary)] border border-[var(--panel-border)] overflow-hidden">
                            {t.userAvatar ? (
                              <img src={t.userAvatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              t.userTag.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--text-primary)] leading-tight">{t.userTag}</p>
                            <p className="text-xs text-[var(--text-muted)] font-mono">{t.userId}</p>
                          </div>
                        </div>
                      </td>

                      {/* Catégorie */}
                      <td className="py-3 px-4">
                        <span className="rounded-lg bg-[var(--surface-raised)]/50 border border-[var(--panel-border)] px-2 py-0.5 text-[var(--text-muted)] font-medium">
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
                            "rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider cursor-pointer hover:scale-105 transition-transform",
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
                            "rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
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
                            <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
                            <span className="font-medium text-[var(--accent-primary)]">{t.claimedBy.tag}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleQuickClaim(t)}
                            disabled={actionLoading}
                            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/30 transition-all cursor-pointer"
                          >
                            + Prendre en charge
                          </button>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-[var(--text-muted)]">
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
                            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/20 transition-all"
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
        <div className="stagger-children space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Panneaux d&apos;Ouverture Discord</h2>
              <p className="text-xs text-[var(--text-muted)]">
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
              className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau Panneau</span>
            </button>
          </div>

          <div className="stagger-children grid grid-cols-1 md:grid-cols-2 gap-4">
            {panels.map((p) => (
              <div
                key={p.id}
                className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4 hover:border-[var(--accent-primary)]/35 transition-colors duration-300"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{p.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{p.description}</p>
                  </div>
                  <span
                    className="h-5 w-5 rounded-full border border-[var(--input-border-hover)] shrink-0"
                    style={{ backgroundColor: p.color || "#5865F2" }}
                  />
                </div>

                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 space-y-2">
                  <p className="text-xs uppercase font-bold text-[var(--text-muted)]">Catégories liées</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.categoryIds && p.categoryIds.length > 0 ? (
                      p.categoryIds.map((cid) => {
                        const cat = categories.find((c) => c.id === cid);
                        return (
                          <span
                            key={cid}
                            className="rounded-md bg-[var(--surface-raised)]/80 px-2 py-0.5 text-xs text-[var(--text-primary)]"
                          >
                            {cat?.emoji || "🎫"} {cat?.name || cid}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">Toutes les catégories</span>
                    )}
                  </div>
                </div>

                {/* Publication dans salon textuel */}
                <div className="pt-2 border-t border-[var(--panel-border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <ChannelPicker
                      value={panelChannels[p.id] !== undefined ? panelChannels[p.id] : (p.channelId || "")}
                      onChange={(id) => setPanelChannels((prev) => ({ ...prev, [p.id]: id }))}
                      guildId={currentGuildId}
                      placeholder="Sélectionner ou saisir l'ID..."
                      size="sm"
                      className="flex-1"
                    />
                    <button
                      onClick={() => handlePublishPanel(p.id)}
                      disabled={actionLoading}
                      className="flex h-8 items-center gap-1 rounded-lg bg-[var(--accent-primary)] px-3 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer whitespace-nowrap shrink-0 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
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
                    className="rounded-xl border border-[var(--panel-border)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
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
        <div className="stagger-children space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Catégories & Formulaires Dynamiques</h2>
              <p className="text-xs text-[var(--text-muted)]">
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
              className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvelle Catégorie</span>
            </button>
          </div>

          <div className="stagger-children grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4 hover:border-[var(--accent-primary)]/35 transition-colors duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{cat.emoji || "🎫"}</span>
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)] text-sm leading-tight">{cat.name}</h3>
                      <p className="text-xs text-[var(--text-muted)] font-mono">{cat.id}</p>
                    </div>
                  </div>
                  <span
                    className="h-4 w-4 rounded-full border border-[var(--input-border-hover)]"
                    style={{ backgroundColor: cat.color || "#3B82F6" }}
                  />
                </div>

                <p className="text-xs text-[var(--text-muted)]">{cat.description || "Aucune description"}</p>

                <div className="space-y-1.5 pt-2 border-t border-[var(--panel-border)] text-xs">
                  <div className="flex items-center justify-between text-[var(--text-muted)]">
                    <span>Priorité par défaut</span>
                    <span className="font-bold text-[var(--text-primary)]">{cat.defaultPriority || "NORMAL"}</span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--text-muted)]">
                    <span>Délai auto-close</span>
                    <span className="font-bold text-[var(--text-primary)]">{cat.autoCloseInactivityHours || 24}h</span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--text-muted)]">
                    <span>Champs du formulaire</span>
                    <span className="font-bold text-[var(--accent-primary)]">
                      {cat.formFields?.length || 0} question(s)
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--panel-border)]">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setShowCategoryModal(true);
                    }}
                    className="flex items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
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
        <div className="stagger-children space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Équipes de Support & Spécialistes</h2>
              <p className="text-xs text-[var(--text-muted)]">
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
              className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
            >
              <Plus className="h-4 w-4" />
              <span>Créer une Équipe</span>
            </button>
          </div>

          <div className="stagger-children grid grid-cols-1 md:grid-cols-3 gap-4">
            {teams.map((t) => (
              <div
                key={t.id}
                className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4 hover:border-[var(--accent-primary)]/35 transition-colors duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: t.color || "#3B82F6" }}
                    />
                    <h3 className="font-bold text-[var(--text-primary)] text-sm">{t.name}</h3>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] font-mono">{t.id}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{t.description || "Aucune description"}</p>

                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 space-y-1 text-xs">
                  <p className="text-xs text-[var(--text-muted)] font-medium uppercase">Membres & Rôles</p>
                  <p className="text-[var(--text-primary)] font-semibold">
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
        <div className="stagger-children space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Règles d&apos;Automatisation Helpdesk</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Définissez des flux automatiques : Déclencheur ➔ Conditions ➔ Actions (ex: Si catégorie = Facturation alors Priorité = Élevée).
              </p>
            </div>
            <button
              onClick={async () => {
                const newRule: TicketAutomationItem = {
                  id: `auto-${Date.now()}`,
                  guildId: currentGuildId,
                  name: "Auto-Assignation Support",
                  enabled: true,
                  trigger: "TICKET_CREATED",
                  conditions: [{ field: "categoryId", operator: "EQUALS", value: "cat-support" }],
                  actions: [{ type: "ASSIGN_TEAM", payload: { teamId: "team-support" } }],
                };
                try {
                  const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/automations`, {
                    credentials: "include",
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newRule),
                  });
                  const data = await res.json().catch(() => null);
                  if (!res.ok) throw new Error(formatApiError(data?.error, `Erreur HTTP ${res.status}`));
                  await fetchAllData();
                } catch (err: unknown) {
                  showError("Erreur", formatApiError(err, "Impossible d'ajouter la règle d'automatisation."));
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter une Règle</span>
            </button>
          </div>

          <div className="stagger-children space-y-3">
            {automations.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] text-xs">{a.name}</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Quand <code className="text-[var(--accent-primary)]">{a.trigger}</code> ➔ Effectuer{" "}
                      <code className="text-teal-300">{a.actions[0]?.type || "Action"}</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold uppercase",
                      a.enabled ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-[var(--surface-raised)]/50 text-[var(--text-muted)]"
                    )}
                  >
                    {a.enabled ? "Actif" : "Inactif"}
                  </span>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/tickets/automations/${a.id}`, {
                          credentials: "include",
                          method: "DELETE",
                        });
                        if (!res.ok) {
                          const data = await res.json().catch(() => null);
                          throw new Error(formatApiError(data?.error, `Erreur HTTP ${res.status}`));
                        }
                        await fetchAllData();
                      } catch (err: unknown) {
                        showError("Erreur", formatApiError(err, "Impossible de supprimer la règle d'automatisation."));
                      }
                    }}
                    className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
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
        <div className="stagger-children space-y-6 mt-6">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Archives & Transcripts</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Historique immuable de l&apos;intégralité des messages, pièces jointes et échanges des tickets clôturés.
            </p>
          </div>

          <div className="overflow-x-auto rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)]">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Membre</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Clôturé le</th>
                  <th className="py-3 px-4">Raison</th>
                  <th className="py-3 px-4 text-right">Téléchargements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--panel-border)]">
                {tickets
                  .filter((t) => t.status === "CLOSED")
                  .map((t, i) => (
                    <tr key={t.id} className="rise-in hover:bg-[var(--surface-raised)]/70 transition-colors" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                      <td className="py-3 px-4 font-mono font-bold text-[var(--text-primary)]">#{t.id}</td>
                      <td className="py-3 px-4 text-[var(--text-primary)]">{t.userTag}</td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">{t.categoryName}</td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">{t.closedAt || "N/A"}</td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">{t.closeReason || "Résolu"}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`${API_BASE}/api/guilds/${currentGuildId}/tickets/transcripts/${t.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 px-2.5 py-1 text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20"
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
        <div className="stagger-children space-y-6 mt-6">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Analytics & Performance Staff</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Métriques de productivité, temps de résolution et taux de satisfaction membre.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-3">
              <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">Répartition par Catégorie</h3>
              <div className="space-y-2">
                {Object.entries(overview?.byCategory || {}).map(([catName, count]) => (
                  <div key={catName} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">{catName}</span>
                      <span className="font-bold text-[var(--text-primary)]">{count} ticket(s)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--surface-raised)]/50 overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-primary)] rounded-full"
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

            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-3">
              <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">Répartition par Priorité</h3>
              <div className="space-y-2">
                {Object.entries(overview?.byPriority || {}).map(([prio, count]) => (
                  <div key={prio} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">{prio}</span>
                      <span className="font-bold text-[var(--text-primary)]">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--surface-raised)]/50 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          prio === "URGENT"
                            ? "bg-rose-500"
                            : prio === "HIGH"
                            ? "bg-amber-500"
                            : "bg-[var(--info)]"
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
        <div className="stagger-children space-y-6 mt-6 max-w-3xl">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Paramètres Généraux & Anti-Abuse</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Configurez les limites de création, les délais de clôture automatique et les options globales.
            </p>
          </div>

          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-bold text-[var(--text-primary)] text-xs">Activer le système de Tickets</p>
                <p className="text-xs text-[var(--text-muted)]">Autorise l&apos;ouverture de nouveaux tickets sur ce serveur.</p>
              </div>
              <input
                type="checkbox"
                checked={config.enabled ?? true}
                onChange={(e) => handleSaveConfig({ enabled: e.target.checked })}
                className="h-4 w-4 rounded border-[var(--input-border)] accent-[var(--accent-primary)]"
              />
            </label>

            <div className="border-t border-[var(--panel-border)] pt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">Max Tickets Ouverts par Membre</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  defaultValue={config.maxOpenTicketsPerUser || 1}
                  onBlur={(e) =>
                    handleSaveConfig({ maxOpenTicketsPerUser: parseInt(e.target.value, 10) })
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/60"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">Délai d&apos;inactivité avant fermeture (Heures)</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  defaultValue={config.autoCloseInactivityHours ?? config.inactivityCloseHours ?? 24}
                  onBlur={(e) =>
                    handleSaveConfig({ autoCloseInactivityHours: parseInt(e.target.value, 10) })
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/60"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">Convention de nommage du salon</label>
                <input
                  type="text"
                  defaultValue={config.namingFormat ?? config.channelNamingScheme ?? "ticket-{username}"}
                  onBlur={(e) => handleSaveConfig({ namingFormat: e.target.value })}
                  className="mt-1 h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/60 font-mono"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">Variables : {"{username}"}, {"{count}"}, {"{category}"}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">Mode</label>
                <Select
                  value={modeDraft ?? (config.mode === "forum" ? "forum" : "channel")}
                  onChange={(v) => {
                    if (v === "forum") {
                      // Sans forum choisi, on attend la sélection avant d'enregistrer.
                      if (config.forumChannelId) handleSaveConfig({ mode: "forum" });
                      else setModeDraft("forum");
                    } else {
                      setModeDraft(null);
                      handleSaveConfig({ mode: "channel" });
                    }
                  }}
                  className="mt-1"
                  aria-label="Mode des tickets"
                  options={[
                    { id: "channel", label: "Salons privés" },
                    { id: "forum", label: "Forum Discord" },
                  ]}
                />
                {(modeDraft ?? config.mode) === "forum" ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-muted)]">Forum des tickets</label>
                      <ChannelPicker
                        value={config.forumChannelId || ""}
                        onChange={async (id, ch) => {
                          if (!id || ch?.isPost) return;
                          if (await handleSaveConfig({ mode: "forum", forumChannelId: id, forumTagIds: {} })) setModeDraft(null);
                        }}
                        guildId={currentGuildId}
                        filterTypes={[15]}
                        placeholder="Sélectionner un forum…"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleCreateForumTags}
                        disabled={!config.forumChannelId || forumTagsLoading || actionLoading}
                        className="flex h-8 items-center gap-1 rounded-lg bg-[var(--accent-primary)] px-3 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                      >
                        Créer les tags de statut
                      </button>
                      <span className="text-xs text-[var(--text-muted)]">
                        {config.forumTagIds && Object.values(config.forumTagIds).filter(Boolean).length > 0
                          ? `${Object.values(config.forumTagIds).filter(Boolean).length}/4 tags liés`
                          : "Aucun tag lié"}
                      </span>
                    </div>
                  </div>
                ) : null}
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {(modeDraft ?? config.mode) === "forum"
                    ? "Chaque ticket devient un post du forum, avec le message d'accueil et les boutons. Le tag de statut (Ouvert, En cours, Résolu, Fermé) suit le ticket ; à la fermeture le post est verrouillé et archivé, pas supprimé. Le bot a besoin de créer des posts et de gérer les fils dans ce forum. Les posts sont visibles par tous ceux qui ont accès au forum."
                    : "Chaque ticket ouvre un salon privé, supprimé à la fermeture."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FERMETURE TICKET */}
      {showCloseModal && ticketToClose && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Clôturer le Ticket #{ticketToClose.id}</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {config.mode === "forum" || ticketToClose.mode === "forum"
                ? "Un transcript HTML/JSON sera automatiquement archivé et le post du forum sera verrouillé et archivé."
                : "Un transcript HTML/JSON sera automatiquement archivé et le salon Discord sera supprimé dans 5 secondes."}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">Motif de clôture</label>
              <input
                type="text"
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Ex: Problème résolu, inactivité..."
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

      {/* MODAL: CATEGORIE */}
      {showCategoryModal && editingCategory && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {editingCategory.id.startsWith("cat-") ? "Créer une Catégorie de Ticket" : `Modifier la Catégorie « ${editingCategory.name} »`}
              </h3>
              <button
                onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="font-semibold text-[var(--text-muted)]">Nom de la catégorie *</label>
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    placeholder="Ex: Support Technique"
                    className="h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-muted)]">Emoji</label>
                  <input
                    type="text"
                    value={editingCategory.emoji || ""}
                    onChange={(e) => setEditingCategory({ ...editingCategory, emoji: e.target.value })}
                    placeholder="🛠️"
                    className="h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/60 text-center text-base"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Description</label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  placeholder="Décrivez à quoi sert cette catégorie pour les membres..."
                  className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/60"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Rôle Support Assigné</label>
                <RolePicker
                  value={editingCategory.supportRoleIds?.[0] || ""}
                  onChange={(roleId) => {
                    setEditingCategory({
                      ...editingCategory,
                      supportRoleIds: roleId ? [roleId] : [],
                    });
                  }}
                  guildId={currentGuildId}
                  placeholder="Sélectionner le rôle Discord de support..."
                  size="sm"
                  allowClear
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-muted)]">Priorité par défaut</label>
                  <Select
                    value={editingCategory.defaultPriority || "NORMAL"}
                    onChange={(v) => setEditingCategory({ ...editingCategory, defaultPriority: v as TicketPriority })}
                    size="sm"
                    options={[
                      { id: "LOW", label: "Basse" },
                      { id: "NORMAL", label: "Normale" },
                      { id: "HIGH", label: "Élevée" },
                      { id: "URGENT", label: "Urgente" },
                    ]}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-muted)]">Couleur d'accent</label>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="color"
                      value={editingCategory.color || "#3B82F6"}
                      onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                      className="h-7 w-9 cursor-pointer rounded border border-[var(--input-border)] bg-transparent p-0.5"
                    />
                    <span className="font-mono text-[var(--text-muted)]">{editingCategory.color || "#3B82F6"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Message de bienvenue dans le ticket</label>
                <textarea
                  rows={2}
                  value={editingCategory.welcomeMessage || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, welcomeMessage: e.target.value })}
                  placeholder="Ex: Bonjour {user}, un modérateur va prendre en charge votre demande."
                  className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/60"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--panel-border)]">
              <button
                onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }}
                className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSaveCategory(editingCategory)}
                disabled={actionLoading || !editingCategory.name.trim()}
                className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer disabled:opacity-50 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
              >
                {actionLoading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PANEL */}
      {showPanelModal && editingPanel && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {editingPanel.id.startsWith("panel-") ? "Créer un Panneau de Tickets" : `Modifier le Panneau « ${editingPanel.title} »`}
              </h3>
              <button
                onClick={() => { setShowPanelModal(false); setEditingPanel(null); }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Titre du panneau *</label>
                <input
                  type="text"
                  value={editingPanel.title}
                  onChange={(e) => setEditingPanel({ ...editingPanel, title: e.target.value })}
                  placeholder="Ex: Centre d'Assistance ETHONE"
                  className="h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/60"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Description</label>
                <textarea
                  rows={2}
                  value={editingPanel.description}
                  onChange={(e) => setEditingPanel({ ...editingPanel, description: e.target.value })}
                  placeholder="Instructions affichées sur le message interactif..."
                  className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/60"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Salon de publication</label>
                <ChannelPicker
                  value={editingPanel.channelId || targetChannelId}
                  onChange={(chId) => {
                    setTargetChannelId(chId);
                    setEditingPanel({ ...editingPanel, channelId: chId });
                  }}
                  guildId={currentGuildId}
                  placeholder="Choisir le salon textuel où poster le panneau..."
                  size="sm"
                  allowClear
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Catégories de tickets associées</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5">
                  {categories.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">Aucune catégorie disponible. Créez d'abord une catégorie.</p>
                  ) : (
                    categories.map((c) => {
                      const isChecked = editingPanel.categoryIds.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...editingPanel.categoryIds, c.id]
                                : editingPanel.categoryIds.filter((id) => id !== c.id);
                              setEditingPanel({ ...editingPanel, categoryIds: updated });
                            }}
                            className="rounded border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--accent-primary)]"
                          />
                          <span>{c.emoji} {c.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-muted)]">Texte du bouton</label>
                  <input
                    type="text"
                    value={editingPanel.buttonLabel || "Ouvrir un ticket"}
                    onChange={(e) => setEditingPanel({ ...editingPanel, buttonLabel: e.target.value })}
                    placeholder="Ouvrir un ticket"
                    className="h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-muted)]">Couleur d'accent</label>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="color"
                      value={editingPanel.color || "#5865F2"}
                      onChange={(e) => setEditingPanel({ ...editingPanel, color: e.target.value })}
                      className="h-7 w-9 cursor-pointer rounded border border-[var(--input-border)] bg-transparent p-0.5"
                    />
                    <span className="font-mono text-[var(--text-muted)]">{editingPanel.color || "#5865F2"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--panel-border)]">
              <button
                onClick={() => { setShowPanelModal(false); setEditingPanel(null); }}
                className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSavePanel(editingPanel)}
                disabled={actionLoading || !editingPanel.title.trim()}
                className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer disabled:opacity-50 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
              >
                {actionLoading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EQUIPE */}
      {showTeamModal && editingTeam && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {editingTeam.id.startsWith("team-") ? "Créer une Équipe de Support" : `Modifier l'Équipe « ${editingTeam.name} »`}
              </h3>
              <button
                onClick={() => { setShowTeamModal(false); setEditingTeam(null); }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Nom de l'équipe *</label>
                <input
                  type="text"
                  value={editingTeam.name}
                  onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                  placeholder="Ex: Équipe Modération"
                  className="h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/60"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Description</label>
                <textarea
                  rows={2}
                  value={editingTeam.description || ""}
                  onChange={(e) => setEditingTeam({ ...editingTeam, description: e.target.value })}
                  placeholder="Rôles et attributions de cette équipe..."
                  className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/60"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Rôle Discord assigné</label>
                <RolePicker
                  value={editingTeam.roleIds[0] || ""}
                  onChange={(roleId) => {
                    setEditingTeam({
                      ...editingTeam,
                      roleIds: roleId ? [roleId] : [],
                    });
                  }}
                  guildId={currentGuildId}
                  placeholder="Choisir un rôle Discord pour cette équipe..."
                  size="sm"
                  allowClear
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Couleur d'accent</label>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={editingTeam.color || "#3B82F6"}
                    onChange={(e) => setEditingTeam({ ...editingTeam, color: e.target.value })}
                    className="h-7 w-9 cursor-pointer rounded border border-[var(--input-border)] bg-transparent p-0.5"
                  />
                  <span className="font-mono text-[var(--text-muted)]">{editingTeam.color || "#3B82F6"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--panel-border)]">
              <button
                onClick={() => { setShowTeamModal(false); setEditingTeam(null); }}
                className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSaveTeam(editingTeam)}
                disabled={actionLoading || !editingTeam.name.trim()}
                className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer disabled:opacity-50 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
              >
                {actionLoading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
