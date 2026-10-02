"use client";

import { motion } from "framer-motion";
import { confirmDialog } from "@/lib/confirmDialog";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Sparkles,
  Users,
  Plus,
  Trash2,
  Send,
  Hash,
  Tag,
  RefreshCw,
  Copy,
  Save,
  Edit3,
  ArrowLeft,
  Bot,
  AlertTriangle,
  X,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { cn } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import { CardSkeleton } from "@/components/ui/Skeleton";
import ChannelPicker from "@/components/discord/ChannelPicker";
import RolePicker from "@/components/discord/RolePicker";
import Select from "@/components/ui/Select";
import { formatApiError, errorReason } from "@/lib/format-error";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

// Mirrors discord-bot/src/modules/roles/types/{rolePanel,autoRoleConfig}.ts.
type ItemStyle = "Primary" | "Secondary" | "Success" | "Danger";
type GroupMode = "toggle" | "single_exclusive" | "multi_limit";

interface PanelItem {
  id: string;
  roleId: string;
  label: string;
  emoji: string | null;
  description: string | null;
  style: ItemStyle;
  prerequisiteRoleId: string | null;
  mutuallyExclusiveRoleIds: string[];
}

interface PanelGroup {
  id: string;
  name: string;
  mode: GroupMode;
  minSelect: number;
  maxSelect: number;
  itemIds: string[];
}

interface RolePanel {
  id: string;
  guildId: string;
  name: string;
  channelId: string | null;
  messageId: string | null;
  componentType: "buttons" | "select_menu";
  placeholder: string;
  title: string;
  description: string;
  color: string;
  footer: string;
  items: PanelItem[];
  groups: PanelGroup[];
  status: "active" | "draft" | "error";
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserRoleOverride {
  userId: string;
  roleIds: string[];
}

interface AutoRoleConfig {
  enabled: boolean;
  roleIds: string[];
  applyToHumans: boolean;
  applyToBots: boolean;
  waitForScreening: boolean;
  delaySeconds: number;
  lastSyncAt: string | null;
  useSeparateBotRoles: boolean;
  botRoleIds: string[];
  botDelaySeconds: number;
  excludeFromSyncRoleIds: string[];
  scheduledSyncEnabled: boolean;
  scheduledSyncIntervalHours: number;
  lastScheduledSyncAt: string | null;
  userOverrides: UserRoleOverride[];
  removeUserFromListAfterAssignment: boolean;
}

const AUTO_ROLE_DEFAULTS: AutoRoleConfig = {
  enabled: false,
  roleIds: [],
  applyToHumans: true,
  applyToBots: false,
  waitForScreening: false,
  delaySeconds: 0,
  lastSyncAt: null,
  useSeparateBotRoles: false,
  botRoleIds: [],
  botDelaySeconds: 0,
  excludeFromSyncRoleIds: [],
  scheduledSyncEnabled: false,
  scheduledSyncIntervalHours: 24,
  lastScheduledSyncAt: null,
  userOverrides: [],
  removeUserFromListAfterAssignment: true,
};

const STYLE_CLS: Record<ItemStyle, string> = {
  Primary: "bg-[#5865F2] text-white",
  Secondary: "bg-[#4E5058] text-white",
  Success: "bg-[#248046] text-white",
  Danger: "bg-[#DA373C] text-white",
};

const DEMO_PANELS: RolePanel[] = [];

const newItem = (n: number): PanelItem => ({ id: `item-${Date.now().toString(36)}-${n}`, roleId: "", label: `Rôle ${n}`, emoji: "⭐", description: null, style: "Secondary", prerequisiteRoleId: null, mutuallyExclusiveRoleIds: [] });

function relative(iso: string | null): string {
  if (!iso) return "jamais";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export default function RolesCenterClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const { success, error: toastError } = useToast();

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
        setSelectedGuild(match);
        return;
      }
    }
    if (!userSelectedRef.current && !queryGuildId) {
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
  }, [manageableGuilds, queryGuildId, selectedGuild, botGuildIds]);

  const currentGuildId = selectedGuild?.id || "";
  const isBotPresent = Boolean(selectedGuild && botGuildIds && botGuildIds.includes(selectedGuild.id));
  const base = `${BOT_API_URL}/api/guilds/${currentGuildId}/roles`;
  const isRealGuild = Boolean(BOT_API_URL) && Boolean(currentGuildId);

  const [activeTab, setActiveTab] = useState<"panels" | "builder" | "join_roles" | "hierarchy">("panels");
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [panels, setPanels] = useState<RolePanel[]>(DEMO_PANELS);
  const [autoRole, setAutoRole] = useState<AutoRoleConfig>(AUTO_ROLE_DEFAULTS);
  const [savingAutoRole, setSavingAutoRole] = useState(false);
  const [missingCount, setMissingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [autoRoleSubTab, setAutoRoleSubTab] = useState<"options" | "users" | "bots" | "sync">("options");
  const [overrideUserInput, setOverrideUserInput] = useState("");
  const [overrideRoleInput, setOverrideRoleInput] = useState("");
  const [busyPanelId, setBusyPanelId] = useState<string | null>(null);

  // Publish modal state
  const [publishingPanel, setPublishingPanel] = useState<RolePanel | null>(null);
  const [publishChannelId, setPublishChannelId] = useState("");

  // Builder (create or edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formChannelId, setFormChannelId] = useState("");
  const [formColor, setFormColor] = useState("#5865F2");
  const [formComponent, setFormComponent] = useState<"buttons" | "select_menu">("buttons");
  const [formMode, setFormMode] = useState<GroupMode>("toggle");
  const [formItems, setFormItems] = useState<PanelItem[]>([newItem(1)]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!selectedGuild) return;
    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      setIsDemo(false);
      setPanels([]);
      setAutoRole(AUTO_ROLE_DEFAULTS);
      setHasLoadedOnce(true);
      return;
    }
    if (!isRealGuild) {
      setIsDemo(true);
      setHasLoadedOnce(true);
      return;
    }
    setLoading(true);
    try {
      const [panelsRes, autoRes] = await Promise.all([
        fetch(`${base}/panels`, { credentials: "include" }),
        fetch(`${base}/autorole`, { credentials: "include" }),
      ]);
      const panelsData = await panelsRes.json().catch(() => null);
      const autoData = await autoRes.json().catch(() => null);
      if (!panelsRes.ok || !Array.isArray(panelsData?.panels)) {
        setIsDemo(true);
        return;
      }
      setIsDemo(false);
      setPanels(panelsData.panels);
      if (autoRes.ok && autoData?.config) setAutoRole(autoData.config);
      if (autoRes.ok && typeof autoData?.missingCount === "number") setMissingCount(autoData.missingCount);
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [base, isRealGuild, selectedGuild, botGuildIds]);

  useEffect(() => {
    load();
  }, [load]);

  const resetBuilder = () => {
    setEditingId(null);
    setFormName("");
    setFormTitle("");
    setFormDesc("");
    setFormChannelId("");
    setFormColor("#5865F2");
    setFormComponent("buttons");
    setFormMode("toggle");
    setFormItems([newItem(1)]);
  };

  const openEdit = (p: RolePanel) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormTitle(p.title);
    setFormDesc(p.description);
    setFormChannelId(p.channelId || "");
    setFormColor(p.color);
    setFormComponent(p.componentType);
    setFormMode(p.groups[0]?.mode || "toggle");
    setFormItems(p.items.length > 0 ? p.items : [newItem(1)]);
    setActiveTab("builder");
  };

  const handleSavePanel = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = formItems.filter((i) => i.label.trim());
    if (!formTitle.trim() || items.length === 0) {
      toastError("Titre et au moins un rôle requis.");
      return;
    }
    if (items.some((i) => !/^\d{15,22}$/.test(i.roleId))) {
      toastError("Chaque rôle doit avoir un rôle Discord valide sélectionné.");
      return;
    }
    const groupId = editingId ? panels.find((p) => p.id === editingId)?.groups[0]?.id || `grp-${Date.now().toString(36)}` : `grp-${Date.now().toString(36)}`;
    const payload = {
      id: editingId || undefined,
      name: formName.trim() || formTitle.trim().slice(0, 50),
      title: formTitle.trim(),
      description: formDesc.trim() || "Cliquez sur les boutons ci-dessous pour obtenir ou retirer vos rôles.",
      channelId: formChannelId.trim() || null,
      color: formColor,
      componentType: formComponent,
      items,
      groups: [{ id: groupId, name: "Principal", mode: formMode, minSelect: 0, maxSelect: formMode === "single_exclusive" ? 1 : items.length, itemIds: items.map((i) => i.id) }],
    };

    if (isDemo) {
      toastError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${base}/panels`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json", "x-idempotency-key": `panel-${Date.now()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.panel) throw new Error(formatApiError(data?.error, ""));
      setPanels((prev) => (prev.some((x) => x.id === data.panel.id) ? prev.map((x) => (x.id === data.panel.id ? data.panel : x)) : [data.panel, ...prev]));
      resetBuilder();
      setActiveTab("panels");
      success(editingId ? "Panneau mis à jour. Pense à le (re)publier." : "Panneau enregistré en brouillon — publie-le dans un salon.");
    } catch (err: any) {
      toastError(err?.message || "Échec de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const publishPanel = async (p: RolePanel, targetChannelId?: string) => {
    const channelId = targetChannelId || p.channelId;
    if (!channelId) {
      setPublishingPanel(p);
      setPublishChannelId("");
      return;
    }
    if (isDemo) {
      toastError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    setBusyPanelId(p.id);
    try {
      const res = await fetch(`${base}/panels/${p.id}/publish`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json", "x-idempotency-key": `publish-${p.id}-${Date.now()}` },
        body: JSON.stringify({ channelId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(formatApiError(data?.error, ""));
      success("Panneau publié sur Discord.");
      load();
    } catch (err: any) {
      toastError(err?.message || "Échec de la publication.");
    } finally {
      setBusyPanelId(null);
    }
  };

  const syncPanel = async (p: RolePanel) => {
    if (isDemo) {
      toastError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    setBusyPanelId(p.id);
    try {
      const res = await fetch(`${base}/panels/${p.id}/sync`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(formatApiError(data?.error, ""));
      success(data?.message || "Panneau synchronisé avec Discord.");
      load();
    } catch (err: any) {
      toastError(err?.message || "Échec de la synchronisation.");
    } finally {
      setBusyPanelId(null);
    }
  };

  const duplicatePanel = async (p: RolePanel) => {
    if (isDemo) {
      toastError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    try {
      const res = await fetch(`${base}/panels/${p.id}/duplicate`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.panel) throw new Error(formatApiError(data?.error, ""));
      setPanels((prev) => [data.panel, ...prev]);
      success("Panneau dupliqué (brouillon).");
    } catch (err: any) {
      toastError(err?.message || "Échec de la duplication.");
    }
  };

  const deletePanel = async (p: RolePanel) => {
    if (!(await confirmDialog(`Supprimer le panneau « ${p.name} » ?`))) return;
    // Deuxième choix, distinct : annuler la suppression n'est plus confondu avec « garder le message Discord ».
    const deleteMessage = p.messageId
      ? await confirmDialog("Supprimer aussi le message publié sur Discord ?", { title: "Message Discord", confirmLabel: "Supprimer le message", cancelLabel: "Le garder", tone: "danger" })
      : false;
    setPanels((prev) => prev.filter((x) => x.id !== p.id));
    if (isDemo) return;
    try {
      const res = await fetch(`${base}/panels/${p.id}?deleteMessage=${deleteMessage}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(formatApiError(errBody?.error, ""));
      }
      success("Panneau supprimé.");
    } catch (err) {
      toastError("Échec de la suppression — rechargez la page.", errorReason(err));
      load();
    }
  };

  const saveAutoRole = async (next: AutoRoleConfig) => {
    setAutoRole(next);
    if (isDemo) {
      toastError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    setSavingAutoRole(true);
    try {
      const res = await fetch(`${base}/autorole`, {
        method: "PATCH", credentials: "include", headers: { "content-type": "application/json", "x-idempotency-key": `autorole-${Date.now()}` },
        body: JSON.stringify(next),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.config) throw new Error(formatApiError(data?.error, ""));
      setAutoRole(data.config);
      success("Auto-rôles à l'arrivée enregistrés.");
    } catch (err: any) {
      toastError(err?.message || "Échec de l'enregistrement.");
    } finally {
      setSavingAutoRole(false);
    }
  };

  const handleSyncNow = async () => {
    if (isDemo) {
      toastError("Bot injoignable", "Rien n'a été synchronisé.");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch(`${base}/autorole/sync`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(formatApiError(data?.error, ""));
      success(
        "Synchronisation terminée",
        data.updated > 0 ? `${data.updated} membre(s) sur ${data.total} ont reçu les rôles manquants.` : "Tous les membres avaient déjà leurs rôles."
      );
      void load();
    } catch (err: any) {
      toastError(err?.message || "Échec de la synchronisation.");
    } finally {
      setSyncing(false);
    }
  };

  const [autoRoleInput, setAutoRoleInput] = useState("");
  const activePanels = panels.filter((p) => p.status === "active").length;
  const totalRoles = panels.reduce((a, p) => a + p.items.length, 0);

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-6 sm:px-6 text-[var(--text-primary)]">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/discord${currentGuildId ? `?guildId=${currentGuildId}` : ""}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] px-3 text-xs font-semibold normal-case tracking-normal text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Retour Discord</span>
            </Link>
            <div className="p-2.5 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] rounded-[var(--inset-radius)] border border-[var(--accent-primary)]/30 icon-pop">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Reaction Roles & Auto-Rôles</h1>
              <p className="text-xs text-[var(--text-muted)]">
                Panneaux boutons / menus publiés par le bot, et rôles automatiques à l'arrivée.
                {isDemo && isBotPresent && <span className="text-amber-400"> (bot temporairement injoignable)</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {manageableGuilds.length > 0 && selectedGuild && (
              <GuildSelector
                guilds={manageableGuilds}
                value={selectedGuild.id}
                onChange={(g: DiscordGuild) => {
                  userSelectedRef.current = true;
                  setSelectedGuild(g);
                }}
              />
            )}
            <button onClick={load} disabled={loading} className="px-3.5 py-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-raised)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4 text-[var(--accent-primary)]", loading && "animate-spin")} />
              Actualiser
            </button>
            <button onClick={() => { resetBuilder(); setActiveTab("builder"); }} className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] text-sm font-semibold flex items-center gap-2 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50">
              <Plus className="w-4 h-4" />
              Créer un panneau
            </button>
          </div>
        </div>

        {/* Bot non installé banner */}
        {selectedGuild && botGuildIds !== null && !botGuildIds.includes(selectedGuild.id) && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">Bot non présent sur ce serveur</p>
                <p className="text-xs text-amber-200/80">
                  Installe le bot sur <span className="font-semibold text-[var(--text-primary)]">{selectedGuild.name}</span> pour gérer les reaction roles et auto-rôles.
                </p>
              </div>
            </div>
            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black transition-all shrink-0 font-medium"
            >
              Inviter le bot
            </a>
          </div>
        )}

        {/* KPI réels */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Panneaux", value: panels.length, cls: "text-[var(--accent-primary)]", sub: `${activePanels} publié(s) · ${panels.length - activePanels} brouillon(s)` },
            { label: "Rôles proposés", value: totalRoles, cls: "text-[var(--text-primary)]", sub: "Boutons / options configurés" },
            { label: "Auto-rôles à l'arrivée", value: autoRole.roleIds.length, cls: "text-amber-400", sub: autoRole.enabled ? "Activé" : "Désactivé" },
            { label: "Dernière synchro", value: panels.reduce<string | null>((latest, p) => (p.lastSyncAt && (!latest || p.lastSyncAt > latest) ? p.lastSyncAt : latest), null), cls: "text-[var(--accent-primary)]", sub: "Message Discord ↔ config", isDate: true },
          ].map((k) => (
            <div key={k.label} className="bg-[var(--surface-raised)] border border-[var(--panel-border)] rounded-2xl p-4 space-y-1">
              <span className="text-xs text-[var(--text-muted)] font-medium">{k.label}</span>
              <p className={cn("text-2xl font-bold truncate", k.cls)}>{"isDate" in k ? relative(k.value as string | null) : (k.value as number).toLocaleString("fr-FR")}</p>
              <span className="text-xs text-[var(--text-muted)]">{k.sub}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--panel-border)] gap-2 overflow-x-auto pb-1">
          {[
            { id: "panels", label: `Panneaux (${panels.length})`, icon: Tag },
            { id: "builder", label: editingId ? "Modifier le panneau" : "Créateur", icon: Plus },
            { id: "join_roles", label: `Auto-rôles à l'arrivée (${autoRole.roleIds.length})`, icon: Users },
            { id: "hierarchy", label: "Hiérarchie & sécurité", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={cn("relative px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 active:scale-[0.97]", isActive ? "border-transparent text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}>
                {isActive && <motion.span layoutId="roles-tab" transition={{ type: "spring", stiffness: 450, damping: 35 }} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--accent-primary)]" />}
                <Icon className={cn("w-4 h-4", isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Panneaux */}
        {activeTab === "panels" && (
          <div className="stagger-children space-y-6">
            {!hasLoadedOnce ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CardSkeleton className="h-40" />
                <CardSkeleton className="h-40" />
              </div>
            ) : panels.length === 0 ? (
              <div className="bg-[var(--surface-raised)] border border-[var(--panel-border)] rounded-2xl p-10 text-center text-xs text-[var(--text-muted)]">Aucun panneau. Crée-en un pour laisser tes membres choisir leurs rôles.</div>
            ) : (
              <div className="stagger-children grid grid-cols-1 md:grid-cols-2 gap-6">
                {panels.map((pnl) => {
                  const mode = pnl.groups[0]?.mode || "toggle";
                  const busy = busyPanelId === pnl.id;
                  return (
                    <div key={pnl.id} className="bg-[var(--surface-raised)] border border-[var(--panel-border)] hover:border-[var(--accent-primary)]/30 rounded-2xl p-6 space-y-4 transition-all flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2 py-0.5 rounded text-xs font-mono text-[var(--text-muted)] bg-[var(--surface-raised)] border border-[var(--panel-border)] truncate">{pnl.channelId ? `#${pnl.channelId}` : "Aucun salon"}</span>
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-[var(--surface-raised)] text-[var(--text-muted)]">{pnl.componentType === "buttons" ? "Boutons" : "Menu"}</span>
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-[var(--surface-raised)] text-[var(--text-muted)]">{mode === "single_exclusive" ? "Choix unique" : mode === "multi_limit" ? "Multi limité" : "Libre"}</span>
                          </div>
                          <span className={cn("px-2 py-0.5 rounded text-xs font-bold border", pnl.status === "active" ? "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20" : pnl.status === "error" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                            {pnl.status === "active" ? "🟢 Publié" : pnl.status === "error" ? "🔴 Erreur" : "📝 Brouillon"}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[var(--text-primary)]">{pnl.name}</h3>
                        <div className="bg-[#2B2D31] rounded-xl p-4 space-y-3 border border-neutral-800/80 font-sans">
                          <div className="border-l-4 bg-[#1E1F22] rounded-r-xl p-3 space-y-1 text-xs" style={{ borderColor: pnl.color }}>
                            <span className="font-bold text-[var(--text-primary)] block">{pnl.title}</span>
                            <p className="text-[var(--text-muted)] text-xs whitespace-pre-wrap">{pnl.description}</p>
                            {pnl.footer && <p className="text-xs text-[var(--text-muted)] pt-1">{pnl.footer}</p>}
                          </div>
                          {pnl.componentType === "buttons" ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {pnl.items.map((opt) => (
                                <div key={opt.id} className={cn("px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow", STYLE_CLS[opt.style])}>
                                  {opt.emoji && <span>{opt.emoji}</span>}
                                  <span>{opt.label}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl bg-[#1E1F22] border border-[var(--panel-border)] px-3 py-2 text-xs text-[var(--text-muted)] flex items-center justify-between">
                              <span>{pnl.placeholder}</span>
                              <span className="text-[var(--text-muted)]">▾ {pnl.items.length} option(s)</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="pt-3 border-t border-[var(--panel-border)] flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs text-[var(--text-muted)]">{pnl.items.length} rôle(s) · synchro {relative(pnl.lastSyncAt)}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => publishPanel(pnl)} disabled={busy} className="px-2.5 py-1.5 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] text-sm font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50" title={pnl.status === "active" ? "Republier" : "Publier sur Discord"}>
                            <Send className="w-3 h-3" /> {pnl.status === "active" ? "Republier" : "Publier"}
                          </button>
                          {pnl.status === "active" && (
                            <button onClick={() => syncPanel(pnl)} disabled={busy} className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 cursor-pointer disabled:opacity-50" title="Vérifier / synchroniser le message Discord">
                              <RefreshCw className={cn("w-4 h-4", busy && "animate-spin")} />
                            </button>
                          )}
                          <button onClick={() => openEdit(pnl)} className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] cursor-pointer" title="Modifier"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => duplicatePanel(pnl)} className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 cursor-pointer" title="Dupliquer"><Copy className="w-4 h-4" /></button>
                          <button onClick={() => deletePanel(pnl)} className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Builder */}
        {activeTab === "builder" && (
          <form onSubmit={handleSavePanel} className="bg-[var(--surface-raised)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--accent-primary)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">{editingId ? "Modifier le panneau" : "Nouveau panneau de rôles"}</h3>
              </div>
              {editingId && <button type="button" onClick={resetBuilder} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">Annuler l'édition</button>}
            </div>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1">Nom interne</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Notifications" className="w-full h-10 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] px-3 text-xs text-[var(--text-primary)]" />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1">Salon de publication</label>
                  <ChannelPicker
                    value={formChannelId}
                    onChange={(id) => setFormChannelId(id)}
                    guildId={currentGuildId}
                    placeholder="Sélectionner un salon..."
                    size="sm"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[var(--text-muted)] mb-1">Titre de l'embed *</label>
                <input type="text" required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="🎮 Rôles de jeux & plateformes" className="w-full h-10 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] px-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/60" />
              </div>
              <div>
                <label className="block font-semibold text-[var(--text-muted)] mb-1">Description / consignes</label>
                <textarea rows={2} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Clique sur les boutons pour ajouter ou retirer un rôle..." className="w-full rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/60" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1">Composant</label>
                  <div className="flex gap-1.5">
                    {([["buttons", "Boutons"], ["select_menu", "Menu"]] as const).map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setFormComponent(v)} className={cn("flex-1 h-10 rounded-xl text-xs font-bold cursor-pointer", formComponent === v ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]" : "bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[var(--text-muted)]")}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1">Règle de sélection</label>
                  <Select
                    value={formMode}
                    onChange={(v) => setFormMode(v as GroupMode)}
                    options={[
                      { id: "toggle", label: "Libre (plusieurs rôles)" },
                      { id: "single_exclusive", label: "Choix unique (1 seul)" },
                      { id: "multi_limit", label: "Multi limité" },
                    ]}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1">Couleur</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="w-10 h-10 rounded-xl border-0 cursor-pointer bg-transparent" />
                    <input type="text" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="flex-1 h-10 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] px-3 text-xs text-[var(--text-primary)] font-mono" />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--panel-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5"><Tag className="w-4 h-4 text-[var(--accent-primary)]" /> Rôles ({formItems.length})</h4>
                  <button type="button" onClick={() => setFormItems((p) => [...p, newItem(p.length + 1)])} className="px-3 py-1.5 rounded-xl bg-[var(--surface-raised)] hover:bg-[var(--text-primary)]/20 text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Ajouter</button>
                </div>
                <div className="stagger-children space-y-2">
                  {formItems.map((opt, idx) => (
                    <div key={opt.id} className="grid grid-cols-12 items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)]">
                      <input type="text" value={opt.emoji || ""} onChange={(e) => setFormItems((p) => p.map((x, i) => (i === idx ? { ...x, emoji: e.target.value || null } : x)))} placeholder="⭐" className="col-span-2 sm:col-span-1 h-9 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] text-center text-xs" />
                      <input type="text" value={opt.label} onChange={(e) => setFormItems((p) => p.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))} placeholder="Libellé du bouton" className="col-span-10 sm:col-span-4 h-9 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] px-3 text-xs text-[var(--text-primary)]" />
                      <div className="col-span-8 sm:col-span-4">
                        <RolePicker
                          value={opt.roleId}
                          onChange={(id, r) =>
                            setFormItems((p) =>
                              p.map((x, i) =>
                                i === idx ? { ...x, roleId: id, label: x.label === `Rôle ${idx + 1}` && r ? r.name : x.label } : x
                              )
                            )
                          }
                          guildId={currentGuildId}
                          placeholder="Sélectionner un rôle..."
                          size="sm"
                        />
                      </div>
                      <Select
                        value={opt.style}
                        onChange={(v) => setFormItems((p) => p.map((x, i) => (i === idx ? { ...x, style: v as ItemStyle } : x)))}
                        size="sm"
                        className="col-span-3 sm:col-span-2"
                        aria-label="Couleur du bouton"
                        options={[
                          { id: "Primary", label: "Bleu" },
                          { id: "Secondary", label: "Gris" },
                          { id: "Success", label: "Vert" },
                          { id: "Danger", label: "Rouge" },
                        ]}
                      />
                      <button type="button" onClick={() => setFormItems((p) => p.filter((_, i) => i !== idx))} className="col-span-1 text-[var(--text-muted)] hover:text-rose-400 p-1 cursor-pointer justify-self-end"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <button type="submit" disabled={submitting} className="w-full h-11 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50">
                  <Save className="w-4 h-4" />
                  {editingId ? "Enregistrer les modifications" : "Enregistrer le panneau (brouillon)"}
                </button>
                <p className="text-xs text-[var(--text-muted)] text-center mt-2">Tu pourras ensuite le publier dans un salon depuis l'onglet Panneaux.</p>
              </div>
            </div>
          </form>
        )}

        {/* Auto-rôles */}
        {activeTab === "join_roles" && (
          <div className="stagger-children bg-[var(--surface-raised)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-5 max-w-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2"><Users className="w-5 h-5 text-amber-400" /> Rôles automatiques à l'arrivée</h3>
              <button onClick={() => saveAutoRole({ ...autoRole, enabled: !autoRole.enabled })} disabled={savingAutoRole} className={cn("px-3 py-1 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50", autoRole.enabled ? "bg-[var(--success)] text-white" : "bg-[var(--surface-raised)] text-[var(--text-muted)]")}>
                {autoRole.enabled ? "Activé" : "Désactivé"}
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">Attribués dès qu'un membre rejoint. Si la vérification anti-bot est active, ils ne sont donnés qu'après validation.</p>
            <div className="space-y-2">
              {autoRole.roleIds.length === 0 && <p className="text-xs text-[var(--text-muted)]">Aucun rôle configuré.</p>}
              {autoRole.roleIds.map((rid) => (
                <div key={rid} className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] flex items-center justify-between text-xs">
                  <span className="font-mono text-[var(--text-primary)]">@{rid}</span>
                  <button onClick={() => saveAutoRole({ ...autoRole, roleIds: autoRole.roleIds.filter((x) => x !== rid) })} className="text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <RolePicker
                  value={autoRoleInput}
                  onChange={(id) => setAutoRoleInput(id)}
                  guildId={currentGuildId}
                  placeholder="Sélectionner un rôle Discord à ajouter..."
                  size="sm"
                />
              </div>
              <button
                onClick={() => {
                  const id = autoRoleInput.trim();
                  if (!/^\d{15,22}$/.test(id)) {
                    toastError("Sélectionne un rôle valide.");
                    return;
                  }
                  if (autoRole.roleIds.includes(id)) return;
                  saveAutoRole({ ...autoRole, roleIds: [...autoRole.roleIds, id] });
                  setAutoRoleInput("");
                }}
                disabled={!autoRoleInput}
                className="px-4 h-9 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer flex items-center gap-1 disabled:opacity-50 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
            {/* Sous-onglets : Options / Rôles par utilisateur / Rôles des bots / Synchronisation */}
            <div className="flex gap-1 rounded-xl bg-[var(--panel-bg)] p-1 text-xs border-t border-[var(--panel-border)] mt-1">
              {([
                ["options", "Options"],
                ["users", "Rôles par utilisateur"],
                ["bots", "Rôles des bots"],
                ["sync", "Synchronisation"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setAutoRoleSubTab(id)}
                  className={cn(
                    "flex-1 rounded-lg px-2 py-1.5 font-semibold cursor-pointer transition-colors",
                    autoRoleSubTab === id ? "bg-[var(--surface-raised)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {autoRoleSubTab === "options" && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] cursor-pointer">
                  <span className="text-[var(--text-muted)]">Membres humains</span>
                  <input type="checkbox" checked={autoRole.applyToHumans} onChange={(e) => saveAutoRole({ ...autoRole, applyToHumans: e.target.checked })} className="w-4 h-4 rounded text-amber-500" />
                </label>
                <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] cursor-pointer">
                  <span className="text-[var(--text-muted)]">Attendre le filtrage des règles</span>
                  <input type="checkbox" checked={autoRole.waitForScreening} onChange={(e) => saveAutoRole({ ...autoRole, waitForScreening: e.target.checked })} className="w-4 h-4 rounded text-amber-500" />
                </label>
                <label className="col-span-2 flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)]">
                  <span className="text-[var(--text-muted)]">Délai avant attribution — membres humains (s)</span>
                  <input
                    type="number"
                    min={0}
                    max={86400}
                    value={autoRole.delaySeconds}
                    onChange={(e) => setAutoRole({ ...autoRole, delaySeconds: Number(e.target.value) })}
                    onBlur={() => saveAutoRole(autoRole)}
                    className="w-16 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] px-2 py-1 text-right font-mono text-[var(--text-primary)]"
                  />
                </label>
              </div>
            )}

            {autoRoleSubTab === "users" && (
              <div className="space-y-3 text-xs">
                <p className="text-[var(--text-muted)]">Attribue des rôles supplémentaires à des membres précis, en plus des rôles ci-dessus.</p>
                <div className="space-y-2">
                  {autoRole.userOverrides.length === 0 && <p className="text-[var(--text-muted)]">Aucun utilisateur ajouté.</p>}
                  {autoRole.userOverrides.map((o) => (
                    <div key={o.userId} className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[var(--text-primary)] block truncate">{o.userId}</span>
                        <span className="text-[var(--text-muted)] block truncate">{o.roleIds.map((r) => `@${r}`).join(", ")}</span>
                      </div>
                      <button
                        onClick={() => saveAutoRole({ ...autoRole, userOverrides: autoRole.userOverrides.filter((x) => x.userId !== o.userId) })}
                        className="shrink-0 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 rounded-xl border border-dashed border-[var(--panel-border)] p-3">
                  <input
                    type="text"
                    value={overrideUserInput}
                    onChange={(e) => setOverrideUserInput(e.target.value)}
                    placeholder="ID de l'utilisateur"
                    className="h-9 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 text-[var(--text-primary)] outline-none"
                  />
                  <RolePicker value={overrideRoleInput} onChange={(id) => setOverrideRoleInput(id)} guildId={currentGuildId} placeholder="Rôle à attribuer..." size="sm" />
                  <button
                    onClick={() => {
                      const uid = overrideUserInput.trim();
                      if (!/^\d{15,22}$/.test(uid) || !overrideRoleInput) {
                        toastError("Renseigne un ID utilisateur et un rôle valides.");
                        return;
                      }
                      const existing = autoRole.userOverrides.find((o) => o.userId === uid);
                      const nextOverrides = existing
                        ? autoRole.userOverrides.map((o) => (o.userId === uid ? { ...o, roleIds: [...new Set([...o.roleIds, overrideRoleInput])] } : o))
                        : [...autoRole.userOverrides, { userId: uid, roleIds: [overrideRoleInput] }];
                      saveAutoRole({ ...autoRole, userOverrides: nextOverrides });
                      setOverrideUserInput("");
                      setOverrideRoleInput("");
                    }}
                    className="w-full h-9 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>
                <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] cursor-pointer">
                  <span className="text-[var(--text-muted)]">Retirer de la liste une fois le rôle attribué</span>
                  <input type="checkbox" checked={autoRole.removeUserFromListAfterAssignment} onChange={(e) => saveAutoRole({ ...autoRole, removeUserFromListAfterAssignment: e.target.checked })} className="w-4 h-4 rounded text-amber-500" />
                </label>
              </div>
            )}

            {autoRoleSubTab === "bots" && (
              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] cursor-pointer">
                  <span className="text-[var(--text-muted)]">Attribuer les rôles automatiques aux bots</span>
                  <input type="checkbox" checked={autoRole.applyToBots} onChange={(e) => saveAutoRole({ ...autoRole, applyToBots: e.target.checked })} className="w-4 h-4 rounded text-amber-500" />
                </label>
                <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] cursor-pointer">
                  <span className="text-[var(--text-muted)]">Utiliser des rôles différents pour les bots</span>
                  <input type="checkbox" checked={autoRole.useSeparateBotRoles} onChange={(e) => saveAutoRole({ ...autoRole, useSeparateBotRoles: e.target.checked })} className="w-4 h-4 rounded text-amber-500" />
                </label>
                {autoRole.useSeparateBotRoles && (
                  <>
                    <div className="space-y-2">
                      {autoRole.botRoleIds.length === 0 && <p className="text-[var(--text-muted)]">Aucun rôle spécifique aux bots.</p>}
                      {autoRole.botRoleIds.map((rid) => (
                        <div key={rid} className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] flex items-center justify-between">
                          <span className="font-mono text-[var(--text-primary)]">@{rid}</span>
                          <button onClick={() => saveAutoRole({ ...autoRole, botRoleIds: autoRole.botRoleIds.filter((x) => x !== rid) })} className="text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                    <RolePicker
                      value=""
                      onChange={(id) => id && !autoRole.botRoleIds.includes(id) && saveAutoRole({ ...autoRole, botRoleIds: [...autoRole.botRoleIds, id] })}
                      guildId={currentGuildId}
                      placeholder="Ajouter un rôle pour les bots..."
                      size="sm"
                    />
                    <label className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)]">
                      <span className="text-[var(--text-muted)]">Délai avant attribution — bots (s)</span>
                      <input
                        type="number"
                        min={0}
                        max={86400}
                        value={autoRole.botDelaySeconds}
                        onChange={(e) => setAutoRole({ ...autoRole, botDelaySeconds: Number(e.target.value) })}
                        onBlur={() => saveAutoRole(autoRole)}
                        className="w-16 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] px-2 py-1 text-right font-mono text-[var(--text-primary)]"
                      />
                    </label>
                  </>
                )}
              </div>
            )}

            {autoRoleSubTab === "sync" && (
              <div className="space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)]">
                  <div className="text-[var(--text-muted)]">
                    {missingCount > 0 ? (
                      <span><span className="font-semibold text-amber-400">{missingCount}</span> membre(s) déjà présent(s) n&apos;ont pas encore ces rôles.</span>
                    ) : (
                      <span>Tous les membres concernés ont déjà leurs rôles.</span>
                    )}
                    {autoRole.lastSyncAt && (
                      <span className="block text-[10px] mt-0.5">Dernière synchro manuelle : {new Date(autoRole.lastSyncAt).toLocaleString("fr-FR")}</span>
                    )}
                  </div>
                  <button
                    onClick={() => void handleSyncNow()}
                    disabled={syncing || !autoRole.enabled || autoRole.roleIds.length === 0}
                    className="px-4 h-9 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] hover:border-amber-500/40 font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
                    {syncing ? "Synchronisation…" : "Synchroniser maintenant"}
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-[var(--text-primary)]">Exclure des rôles de la synchronisation</p>
                  <p className="text-[var(--text-muted)]">Ces rôles ne sont jamais rattrapés par "Sync now" ou la synchro programmée, même s&apos;ils sont configurés ci-dessus.</p>
                  <div className="flex flex-wrap gap-2">
                    {autoRole.excludeFromSyncRoleIds.map((rid) => (
                      <span key={rid} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2.5 py-1 font-mono">
                        @{rid}
                        <button onClick={() => saveAutoRole({ ...autoRole, excludeFromSyncRoleIds: autoRole.excludeFromSyncRoleIds.filter((x) => x !== rid) })} className="text-[var(--text-muted)] hover:text-rose-400 cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="max-w-xs">
                    <RolePicker
                      value=""
                      onChange={(id) => id && !autoRole.excludeFromSyncRoleIds.includes(id) && saveAutoRole({ ...autoRole, excludeFromSyncRoleIds: [...autoRole.excludeFromSyncRoleIds, id] })}
                      guildId={currentGuildId}
                      placeholder="Ajouter un rôle à exclure..."
                      size="sm"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] cursor-pointer">
                  <span>
                    <span className="block font-bold text-[var(--text-primary)]">Synchronisation programmée</span>
                    <span className="block text-[var(--text-muted)]">Relance "Sync now" automatiquement toutes les N heures.</span>
                  </span>
                  <input type="checkbox" checked={autoRole.scheduledSyncEnabled} onChange={(e) => saveAutoRole({ ...autoRole, scheduledSyncEnabled: e.target.checked })} className="w-4 h-4 rounded text-amber-500 shrink-0" />
                </label>
                {autoRole.scheduledSyncEnabled && (
                  <label className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)]">
                    <span className="text-[var(--text-muted)]">Intervalle (heures)</span>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={autoRole.scheduledSyncIntervalHours}
                      onChange={(e) => setAutoRole({ ...autoRole, scheduledSyncIntervalHours: Number(e.target.value) })}
                      onBlur={() => saveAutoRole(autoRole)}
                      className="w-16 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] px-2 py-1 text-right font-mono text-[var(--text-primary)]"
                    />
                  </label>
                )}
                {autoRole.lastScheduledSyncAt && (
                  <p className="text-[10px] text-[var(--text-muted)]">Dernière synchro programmée : {new Date(autoRole.lastScheduledSyncAt).toLocaleString("fr-FR")}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hiérarchie */}
        {activeTab === "hierarchy" && (
          <div className="stagger-children bg-[var(--surface-raised)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-4 max-w-2xl">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[var(--accent-primary)]" /> Hiérarchie des rôles</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Pour que le bot puisse attribuer un rôle sans erreur Discord (403), son rôle <strong className="text-[var(--text-primary)]">@Etho</strong> doit être placé <strong className="text-[var(--text-primary)]">au-dessus</strong> des rôles qu'il gère, avec la permission « Gérer les rôles ».
            </p>
            <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] space-y-2 text-xs">
              <p className="text-[var(--text-muted)] font-semibold">Comment vérifier :</p>
              <ol className="list-decimal list-inside text-[var(--text-muted)] space-y-1">
                <li>Publie un panneau, puis clique sur « Synchroniser » : le bot vérifie qu'il peut toujours gérer chaque rôle et remonte l'erreur exacte.</li>
                <li>Un panneau passe en statut <span className="text-rose-400 font-semibold">Erreur</span> si un rôle est supprimé ou inaccessible.</li>
                <li>Les rôles gérés par une intégration (bots, boosts) ne peuvent jamais être attribués manuellement.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Modal de publication de panneau */}
        {publishingPanel && (
          <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/70 p-4">
            <div className="bg-[var(--surface-raised)] border border-[var(--panel-border)] rounded-2xl p-6 max-w-md w-full space-y-4 ">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Send className="w-4 h-4 text-[var(--accent-primary)]" />
                  Publier « {publishingPanel.name} »
                </h3>
                <button onClick={() => setPublishingPanel(null)} className="p-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Choisis le salon Discord dans lequel envoyer le panneau de rôles :
              </p>
              <div>
                <ChannelPicker
                  value={publishChannelId}
                  onChange={(id) => setPublishChannelId(id)}
                  guildId={currentGuildId}
                  placeholder="Sélectionner le salon de destination..."
                  size="sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPublishingPanel(null)}
                  className="px-3 py-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 hover:bg-[var(--surface-raised)] text-xs font-semibold text-[var(--text-muted)] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!publishChannelId) {
                      toastError("Sélectionne un salon de destination.");
                      return;
                    }
                    const p = publishingPanel;
                    setPublishingPanel(null);
                    publishPanel(p, publishChannelId);
                  }}
                  disabled={!publishChannelId}
                  className="px-4 py-1.5 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] text-sm font-semibold disabled:opacity-50 cursor-pointer flex items-center gap-1.5 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                >
                  <Send className="w-3 h-3" />
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
