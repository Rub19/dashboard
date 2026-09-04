"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
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
  BarChart3,
  Shield,
  MessageSquare,
  Download,
  Settings2,
  Zap,
  Tag,
  ArrowUpRight,
  Filter,
  Layers,
  Flame,
  Check,
  X,
  Lock,
  Unlock,
  Eye,
  Copy,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  UserPlus,
  UserMinus,
  Mail,
  HelpCircle,
  Link as LinkIcon,
  Smile,
} from "lucide-react";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:3001";

export interface EmbedField {
  id: string;
  name: string;
  value: string;
  inline: boolean;
}

export interface WelcomeButton {
  id: string;
  label: string;
  emoji?: string | null;
  style: "PRIMARY" | "SECONDARY" | "SUCCESS" | "DANGER" | "LINK";
  action: "URL" | "ROLE" | "VERIFY" | "RULES" | "CHANNEL" | "TICKET" | "CUSTOM";
  target: string;
}

export interface OnboardingStep {
  id: string;
  type: "WELCOME" | "RULES" | "ROLE_SELECTION" | "QUESTION" | "VERIFICATION" | "COMPLETION";
  title: string;
  description: string;
  required: boolean;
  order: number;
  roleChoices: Array<{ roleId: string; label: string; emoji?: string | null; description?: string | null }>;
  maxRoleSelections?: number;
  rulesList: string[];
  questionText?: string | null;
}

export interface OnboardingFlow {
  guildId: string;
  enabled: boolean;
  channelId?: string | null;
  completionRoleId?: string | null;
  sendDmOnCompletion: boolean;
  completionDmMessage: string;
  steps: OnboardingStep[];
}

export interface VerificationConfig {
  guildId: string;
  enabled: boolean;
  channelId?: string | null;
  verifiedRoleId?: string | null;
  unverifiedRoleId?: string | null;
  buttonLabel: string;
  buttonEmoji: string;
  verificationPrompt: string;
}

export interface ChannelItem {
  id: string;
  name: string;
  canSend: boolean;
  canEmbed: boolean;
  canAttach: boolean;
}

export interface RoleItem {
  id: string;
  name: string;
  color: string;
  position: number;
  manageable: boolean;
}

export function WelcomeCenterClient() {
  const searchParams = useSearchParams();
  const guildIdParam = searchParams.get("guildId");
  const tabParam = searchParams.get("tab");

  const { profile, loading: discordLoading } = useDiscordOAuth();
  const { success, error: showError, info } = useToast();

  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);
  const guilds: DiscordGuild[] = useMemo(() => profile?.guilds || [], [profile?.guilds]);

  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "builder"
    | "goodbye"
    | "dm"
    | "onboarding"
    | "verification"
    | "autoroles"
    | "templates"
    | "conditions"
    | "settings"
  >((tabParam as any) || "overview");

  // Données Live
  const [overview, setOverview] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [onboarding, setOnboarding] = useState<OnboardingFlow | null>(null);
  const [verification, setVerification] = useState<VerificationConfig | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [showTestModal, setShowTestModal] = useState(false);
  const [testType, setTestType] = useState<"welcome" | "goodbye">("welcome");
  const [testTarget, setTestTarget] = useState<"channel" | "dm">("channel");
  const [testRunning, setTestRunning] = useState(false);

  // Sélection automatique de la guilde
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
      const [cfgRes, ovRes, obRes, verRes, tplRes, chRes, roRes] = await Promise.all([
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/welcome`).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/welcome/overview`).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/welcome/onboarding`).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/welcome/verification`).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/welcome/templates`).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/welcome/channels`).catch(() => null),
        fetch(`${API_BASE}/api/guilds/${currentGuildId}/welcome/roles`).catch(() => null),
      ]);

      if (cfgRes && cfgRes.ok) {
        const d = await cfgRes.json();
        setConfig(d.config);
      }
      if (ovRes && ovRes.ok) {
        const d = await ovRes.json();
        setOverview(d);
      }
      if (obRes && obRes.ok) {
        const d = await obRes.json();
        setOnboarding(d.flow);
      }
      if (verRes && verRes.ok) {
        const d = await verRes.json();
        setVerification(d.verification);
      }
      if (tplRes && tplRes.ok) {
        const d = await tplRes.json();
        setTemplates(d.templates || []);
      }
      if (chRes && chRes.ok) {
        const d = await chRes.json();
        setChannels(d.channels || []);
      }
      if (roRes && roRes.ok) {
        const d = await roRes.json();
        setRoles(d.roles || []);
      }
    } catch (err: any) {
      console.error("Erreur chargement Welcome 2.0 :", err);
    } finally {
      setLoading(false);
    }
  }, [currentGuildId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Sauvegarde globale de la config Welcome & Goodbye
  const handleSaveConfig = async (partialUpdate?: any) => {
    try {
      setSaving(true);
      const payload = partialUpdate ? { ...config, ...partialUpdate } : config;
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/welcome`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Échec de la sauvegarde");
      const d = await res.json();
      setConfig(d.config);
      success("Modifications enregistrées", "La configuration de bienvenue a été synchronisée.");
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setSaving(false);
    }
  };

  // Sauvegarde de l'Onboarding
  const handleSaveOnboarding = async (flowData: OnboardingFlow) => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/welcome/onboarding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flowData),
      });
      if (!res.ok) throw new Error("Échec de sauvegarde onboarding");
      setOnboarding(flowData);
      success("Onboarding mis à jour", "Le parcours d'onboarding a été enregistré.");
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setSaving(false);
    }
  };

  // Sauvegarde de la Vérification
  const handleSaveVerification = async (verifData: VerificationConfig) => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/welcome/verification`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifData),
      });
      if (!res.ok) throw new Error("Échec de sauvegarde vérification");
      setVerification(verifData);
      success("Vérification enregistrée", "Les réglages de vérification ont été appliqués.");
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setSaving(false);
    }
  };

  // Appliquer un Template
  const handleApplyTemplate = async (templateId: string) => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/welcome/templates/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) throw new Error("Échec d'application du template");
      const d = await res.json();
      setConfig(d.config);
      success("Template appliqué", `Le modèle "${d.templateName}" est désormais actif.`);
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setSaving(false);
    }
  };

  // Envoi d'un message de test
  const handleRunTest = async () => {
    try {
      setTestRunning(true);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuildId}/welcome/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: testType, target: testTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec du test");
      success(
        "Test envoyé avec succès !",
        testTarget === "dm"
          ? "Un message privé a été envoyé sur votre compte Discord."
          : `Le message a été posté dans #${data.channelName}.`
      );
      setShowTestModal(false);
    } catch (err: any) {
      showError("Erreur du test", err.message);
    } finally {
      setTestRunning(false);
    }
  };

  // Simulation des variables pour la Live Preview
  const previewContext = {
    user: "@MembreExemple",
    username: "MembreExemple",
    displayName: "MembreExemple",
    userId: "1128633164290596884",
    server: selectedGuild?.name || "ETHONE Community",
    memberCount: "1 245",
    serverOwner: "Rub19",
    accountAge: "14 jours",
    channel: "#bienvenue",
  };

  const renderParsed = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\{user\}/gi, previewContext.user)
      .replace(/\{username\}/gi, previewContext.username)
      .replace(/\{displayname\}/gi, previewContext.displayName)
      .replace(/\{userid\}/gi, previewContext.userId)
      .replace(/\{server\}/gi, previewContext.server)
      .replace(/\{membercount\}/gi, previewContext.memberCount)
      .replace(/\{serverowner\}/gi, previewContext.serverOwner)
      .replace(/\{accountage\}/gi, previewContext.accountAge)
      .replace(/\{channel\}/gi, previewContext.channel);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white px-4 sm:px-8 py-6 pb-36">
      {/* Top Bar / Guild Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 shadow-lg shadow-teal-500/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Bienvenue & Onboarding 2.0</h1>
              <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-teal-300">
                Experience Designer
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Personnalisation complète de l&apos;accueil, Live Preview Discord, formulaires de rôles, vérification et entonnoir de conversion.
            </p>
          </div>
        </div>

        {/* Guild Selection & Test Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={currentGuildId}
            onChange={(e) => {
              const g = guilds.find((item: DiscordGuild) => item.id === e.target.value);
              if (g) setSelectedGuild(g);
            }}
            className="h-9 rounded-xl border border-white/10 bg-zinc-900/90 px-3 text-xs text-white outline-none focus:border-teal-500 cursor-pointer"
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
            title="Rafraîchir"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin text-teal-400")} />
          </button>

          <button
            onClick={() => setShowTestModal(true)}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-3.5 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:from-teal-500 hover:to-emerald-500 transition-all cursor-pointer"
          >
            <span>🧪 Tester l&apos;accueil</span>
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
        <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-zinc-900/50 to-zinc-900/80 p-4 shadow-lg shadow-teal-500/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Nouveaux Membres</span>
            <UserPlus className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{overview?.newMembersToday ?? 0}</p>
          <p className="text-[10px] text-teal-300/80 mt-1">Arrivées enregistrées aujourd&apos;hui</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-zinc-900/50 to-zinc-900/80 p-4 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Messages Envoyés</span>
            <MessageSquare className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{overview?.welcomeMessagesToday ?? 0}</p>
          <p className="text-[10px] text-emerald-300/80 mt-1">Salons + DMs délivrés</p>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-zinc-900/50 to-zinc-900/80 p-4 shadow-lg shadow-blue-500/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Taux de Vérification</span>
            <Shield className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{overview?.verificationRate || "78%"}</p>
          <p className="text-[10px] text-blue-300/80 mt-1">Membres ayant validé le règlement</p>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-zinc-900/50 to-zinc-900/80 p-4 shadow-lg shadow-purple-500/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Complétion Onboarding</span>
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{overview?.onboardingCompletionRate || "73%"}</p>
          <p className="text-[10px] text-purple-300/80 mt-1">Parcours terminé avec rôles</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-zinc-900/50 to-zinc-900/80 p-4 shadow-lg shadow-amber-500/5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Rôles Distribués</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{overview?.rolesDistributedToday ?? 0}</p>
          <p className="text-[10px] text-amber-300/80 mt-1">Auto-roles & choix onboarding</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/10 pb-2 mt-8 text-xs scrollbar-none">
        {[
          { id: "overview", label: "Vue d'Ensemble & Funnel", icon: BarChart3 },
          { id: "builder", label: "Welcome Message & Embed", icon: Sliders },
          { id: "goodbye", label: "Message de Départ (Goodbye)", icon: UserMinus },
          { id: "dm", label: "Message Privé (DM)", icon: Mail },
          { id: "onboarding", label: "Parcours Onboarding", icon: Users },
          { id: "verification", label: "Vérification & Règles", icon: Shield },
          { id: "autoroles", label: "Auto-Rôles", icon: Tag },
          { id: "templates", label: "Templates Prêts à l'Emploi", icon: Sparkles },
          { id: "conditions", label: "Conditions & Automations", icon: Zap },
          { id: "settings", label: "Paramètres & Salons", icon: Settings2 },
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
                  ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/20"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: VUE D'ENSEMBLE & FUNNEL */}
      {activeTab === "overview" && (
        <div className="space-y-6 mt-6">
          {/* System Status Toggles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <div>
                <p className="text-xs font-bold text-white">Système Welcome</p>
                <p className="text-[10px] text-zinc-400">Salons textuels d&apos;accueil</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  config?.welcome?.enabled
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-zinc-700/40 text-zinc-400 border border-zinc-600/30"
                )}
              >
                {config?.welcome?.enabled ? "Actif" : "Inactif"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <div>
                <p className="text-xs font-bold text-white">Système Goodbye</p>
                <p className="text-[10px] text-zinc-400">Notifications de départ</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  config?.goodbye?.enabled
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-zinc-700/40 text-zinc-400 border border-zinc-600/30"
                )}
              >
                {config?.goodbye?.enabled ? "Actif" : "Inactif"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <div>
                <p className="text-xs font-bold text-white">Vérification</p>
                <p className="text-[10px] text-zinc-400">Validation de règlement</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  verification?.enabled
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-zinc-700/40 text-zinc-400 border border-zinc-600/30"
                )}
              >
                {verification?.enabled ? "Actif" : "Inactif"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <div>
                <p className="text-xs font-bold text-white">Onboarding Flow</p>
                <p className="text-[10px] text-zinc-400">Parcours multi-étapes</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  onboarding?.enabled
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-zinc-700/40 text-zinc-400 border border-zinc-600/30"
                )}
              >
                {onboarding?.enabled ? "Actif" : "Inactif"}
              </span>
            </div>
          </div>

          {/* Onboarding Funnel Visualizer */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4 shadow-xl">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-400" />
                <span>Entonnoir de Conversion des Nouveaux Membres (Onboarding Funnel)</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Analysez le taux de rétention et identifiez à quelle étape les utilisateurs abandonnent le processus.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {overview?.funnel?.map((stage: any, idx: number) => (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-zinc-300">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-zinc-200">{stage.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400">{stage.count} membre(s)</span>
                      <span className="font-bold text-teal-300 w-12 text-right">{stage.percentage}%</span>
                    </div>
                  </div>

                  <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, stage.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Recent Events Stream */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-teal-400" />
              <span>Activité Récente de Bienvenue</span>
            </h3>

            <div className="divide-y divide-white/5">
              {overview?.recentEvents?.length > 0 ? (
                overview.recentEvents.map((evt: any) => (
                  <div key={evt.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-teal-400" />
                      <div>
                        <p className="font-semibold text-white">
                          {evt.userTag}{" "}
                          <span className="text-[10px] text-zinc-400 font-normal">({evt.type})</span>
                        </p>
                        <p className="text-[11px] text-zinc-400">{evt.detail || "Événement enregistré"}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(evt.timestamp).toLocaleTimeString("fr-FR")}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-4 italic">Aucun événement récent enregistré.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WELCOME MESSAGE & EMBED BUILDER */}
      {activeTab === "builder" && config && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* LEFT: BUILDER CONTROLS */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Message & Embed Builder</h2>
                <p className="text-xs text-zinc-400">Configurez le message texte, l&apos;embed et les boutons interactifs.</p>
              </div>
              <button
                onClick={() => handleSaveConfig()}
                disabled={saving}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 transition-all cursor-pointer"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>

            {/* Variable Helper Chips */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
              <p className="text-[10px] uppercase font-bold text-zinc-400">Variables Disponibles (Cliquez pour insérer)</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "{user}",
                  "{username}",
                  "{server}",
                  "{memberCount}",
                  "{accountAge}",
                  "{serverOwner}",
                  "{channel}",
                ].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(v);
                      info("Variable copiée", `${v} est dans votre presse-papiers.`);
                    }}
                    className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] font-mono text-teal-300 hover:bg-teal-500/20 transition-colors cursor-pointer"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* General Switch & Text */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-white">Activer le message de bienvenue</span>
                <input
                  type="checkbox"
                  checked={config.welcome.enabled}
                  onChange={(e) =>
                    setConfig((p: any) => ({
                      ...p,
                      welcome: { ...p.welcome, enabled: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded border-zinc-700 accent-teal-500"
                />
              </label>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Contenu texte (Hors embed)</label>
                <textarea
                  rows={2}
                  value={config.welcome.messageContent}
                  onChange={(e) =>
                    setConfig((p: any) => ({
                      ...p,
                      welcome: { ...p.welcome, messageContent: e.target.value },
                    }))
                  }
                  placeholder="👋 Bienvenue {user} sur **{server}** !"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900/90 p-2.5 text-xs text-white outline-none focus:border-teal-500 resize-none font-sans"
                />
              </div>
            </div>

            {/* Embed Builder */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.welcome.embed.enabled}
                    onChange={(e) =>
                      setConfig((p: any) => ({
                        ...p,
                        welcome: {
                          ...p.welcome,
                          embed: { ...p.welcome.embed, enabled: e.target.checked },
                        },
                      }))
                    }
                    className="h-4 w-4 rounded border-zinc-700 accent-teal-500"
                  />
                  <span className="text-xs font-bold text-white">Activer l&apos;Embed Discord</span>
                </label>

                {/* Color picker */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400">Couleur :</span>
                  <input
                    type="color"
                    value={config.welcome.embed.color || "#10B981"}
                    onChange={(e) =>
                      setConfig((p: any) => ({
                        ...p,
                        welcome: {
                          ...p.welcome,
                          embed: { ...p.welcome.embed, color: e.target.value },
                        },
                      }))
                    }
                    className="h-6 w-8 rounded border-0 bg-transparent cursor-pointer"
                  />
                </div>
              </div>

              {config.welcome.embed.enabled && (
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300">Titre de l&apos;embed</label>
                    <input
                      type="text"
                      value={config.welcome.embed.title}
                      onChange={(e) =>
                        setConfig((p: any) => ({
                          ...p,
                          welcome: {
                            ...p.welcome,
                            embed: { ...p.welcome.embed, title: e.target.value },
                          },
                        }))
                      }
                      className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300">Description</label>
                    <textarea
                      rows={3}
                      value={config.welcome.embed.description}
                      onChange={(e) =>
                        setConfig((p: any) => ({
                          ...p,
                          welcome: {
                            ...p.welcome,
                            embed: { ...p.welcome.embed, description: e.target.value },
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white outline-none focus:border-teal-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300">Auteur (Texte haut)</label>
                      <input
                        type="text"
                        value={config.welcome.embed.authorName || ""}
                        onChange={(e) =>
                          setConfig((p: any) => ({
                            ...p,
                            welcome: {
                              ...p.welcome,
                              embed: { ...p.welcome.embed, authorName: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300">Footer (Pied de page)</label>
                      <input
                        type="text"
                        value={config.welcome.embed.footer || ""}
                        onChange={(e) =>
                          setConfig((p: any) => ({
                            ...p,
                            welcome: {
                              ...p.welcome,
                              embed: { ...p.welcome.embed, footer: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Dynamic Fields List */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-zinc-300">Champs Personnalisés</label>
                      <button
                        type="button"
                        onClick={() => {
                          const newF = {
                            id: `f-${Date.now()}`,
                            name: "Titre du champ",
                            value: "Valeur du champ",
                            inline: true,
                          };
                          setConfig((p: any) => ({
                            ...p,
                            welcome: {
                              ...p.welcome,
                              embed: {
                                ...p.welcome.embed,
                                fields: [...(p.welcome.embed.fields || []), newF],
                              },
                            },
                          }));
                        }}
                        className="text-[10px] font-bold text-teal-400 hover:text-teal-300"
                      >
                        + Ajouter un champ
                      </button>
                    </div>

                    {config.welcome.embed.fields?.map((f: EmbedField, idx: number) => (
                      <div key={f.id} className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/40 p-2 text-xs">
                        <input
                          type="text"
                          value={f.name}
                          onChange={(e) => {
                            const updated = [...config.welcome.embed.fields];
                            updated[idx].name = e.target.value;
                            setConfig((p: any) => ({
                              ...p,
                              welcome: { ...p.welcome, embed: { ...p.welcome.embed, fields: updated } },
                            }));
                          }}
                          placeholder="Nom"
                          className="h-7 w-1/3 rounded-lg border border-white/10 bg-zinc-900 px-2 text-[11px] text-white"
                        />
                        <input
                          type="text"
                          value={f.value}
                          onChange={(e) => {
                            const updated = [...config.welcome.embed.fields];
                            updated[idx].value = e.target.value;
                            setConfig((p: any) => ({
                              ...p,
                              welcome: { ...p.welcome, embed: { ...p.welcome.embed, fields: updated } },
                            }));
                          }}
                          placeholder="Valeur"
                          className="h-7 flex-1 rounded-lg border border-white/10 bg-zinc-900 px-2 text-[11px] text-white"
                        />
                        <label className="flex items-center gap-1 text-[10px] text-zinc-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={f.inline}
                            onChange={(e) => {
                              const updated = [...config.welcome.embed.fields];
                              updated[idx].inline = e.target.checked;
                              setConfig((p: any) => ({
                                ...p,
                                welcome: { ...p.welcome, embed: { ...p.welcome.embed, fields: updated } },
                              }));
                            }}
                          />
                          <span>Inline</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = config.welcome.embed.fields.filter((_: any, i: number) => i !== idx);
                            setConfig((p: any) => ({
                              ...p,
                              welcome: { ...p.welcome, embed: { ...p.welcome.embed, fields: updated } },
                            }));
                          }}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Buttons Builder */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white">Boutons d&apos;Action Discord (Max 5)</p>
                <button
                  type="button"
                  onClick={() => {
                    const newBtn: WelcomeButton = {
                      id: `btn-${Date.now()}`,
                      label: "Nouveau Bouton",
                      emoji: "📜",
                      style: "PRIMARY",
                      action: "RULES",
                      target: "",
                    };
                    setConfig((p: any) => ({
                      ...p,
                      welcome: {
                        ...p.welcome,
                        buttons: [...(p.welcome.buttons || []), newBtn],
                      },
                    }));
                  }}
                  disabled={config.welcome.buttons?.length >= 5}
                  className="text-[10px] font-bold text-teal-400 hover:text-teal-300 disabled:opacity-40"
                >
                  + Ajouter un bouton
                </button>
              </div>

              <div className="space-y-2">
                {config.welcome.buttons?.map((btn: WelcomeButton, idx: number) => (
                  <div key={btn.id} className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={btn.label}
                        onChange={(e) => {
                          const updated = [...config.welcome.buttons];
                          updated[idx].label = e.target.value;
                          setConfig((p: any) => ({ ...p, welcome: { ...p.welcome, buttons: updated } }));
                        }}
                        placeholder="Label"
                        className="h-8 flex-1 rounded-lg border border-white/10 bg-zinc-900 px-2 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={btn.emoji || ""}
                        onChange={(e) => {
                          const updated = [...config.welcome.buttons];
                          updated[idx].emoji = e.target.value;
                          setConfig((p: any) => ({ ...p, welcome: { ...p.welcome, buttons: updated } }));
                        }}
                        placeholder="Emoji"
                        className="h-8 w-14 rounded-lg border border-white/10 bg-zinc-900 px-2 text-xs text-white text-center"
                      />
                      <select
                        value={btn.action}
                        onChange={(e) => {
                          const updated = [...config.welcome.buttons];
                          updated[idx].action = e.target.value as any;
                          setConfig((p: any) => ({ ...p, welcome: { ...p.welcome, buttons: updated } }));
                        }}
                        className="h-8 rounded-lg border border-white/10 bg-zinc-900 px-2 text-xs text-zinc-300"
                      >
                        <option value="RULES">📜 Règlement</option>
                        <option value="VERIFY">✅ Vérifier</option>
                        <option value="TICKET">🎫 Ticket Support</option>
                        <option value="URL">🔗 Lien Web</option>
                        <option value="ROLE">🎭 Donner Rôle</option>
                        <option value="CHANNEL">📍 Salon</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = config.welcome.buttons.filter((_: any, i: number) => i !== idx);
                          setConfig((p: any) => ({ ...p, welcome: { ...p.welcome, buttons: updated } }));
                        }}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {btn.action === "URL" && (
                      <input
                        type="url"
                        value={btn.target}
                        onChange={(e) => {
                          const updated = [...config.welcome.buttons];
                          updated[idx].target = e.target.value;
                          setConfig((p: any) => ({ ...p, welcome: { ...p.welcome, buttons: updated } }));
                        }}
                        placeholder="https://..."
                        className="h-7 w-full rounded-lg border border-white/10 bg-zinc-900 px-2 text-[11px] text-white"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE DISCORD PREVIEW */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="h-4 w-4 text-teal-400" />
                <span>Rendu Discord en Direct (Live Preview)</span>
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">Synchronisation instantanée</span>
            </div>

            {/* Discord Mock Screen */}
            <div className="rounded-2xl border border-zinc-800 bg-[#313338] p-4 text-zinc-200 font-sans shadow-2xl">
              {/* Message Header */}
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-teal-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md">
                  ETH
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm hover:underline cursor-pointer">
                      Ethone Bot
                    </span>
                    <span className="rounded bg-[#5865F2] px-1 py-0.2 text-[9px] font-bold text-white">
                      BOT
                    </span>
                    <span className="text-[10px] text-zinc-400">Aujourd&apos;hui à 14:32</span>
                  </div>

                  {/* Message Raw Text */}
                  {config.welcome.messageContent && (
                    <p className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {renderParsed(config.welcome.messageContent)}
                    </p>
                  )}

                  {/* Discord Embed */}
                  {config.welcome.embed.enabled && (
                    <div
                      className="mt-2 rounded border-l-4 bg-[#2B2D31] p-3.5 space-y-2 max-w-lg shadow-sm"
                      style={{ borderLeftColor: config.welcome.embed.color || "#10B981" }}
                    >
                      {/* Author */}
                      {config.welcome.embed.authorName && (
                        <p className="text-[11px] font-semibold text-zinc-300">
                          {renderParsed(config.welcome.embed.authorName)}
                        </p>
                      )}

                      {/* Title */}
                      {config.welcome.embed.title && (
                        <h4 className="text-sm font-bold text-white leading-snug">
                          {renderParsed(config.welcome.embed.title)}
                        </h4>
                      )}

                      {/* Description */}
                      {config.welcome.embed.description && (
                        <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                          {renderParsed(config.welcome.embed.description)}
                        </p>
                      )}

                      {/* Fields */}
                      {config.welcome.embed.fields && config.welcome.embed.fields.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {config.welcome.embed.fields.map((f: EmbedField) => (
                            <div key={f.id} className={cn(f.inline ? "col-span-1" : "col-span-2")}>
                              <p className="text-[10px] font-bold text-zinc-400 uppercase">{f.name}</p>
                              <p className="text-xs text-zinc-200">{renderParsed(f.value)}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer & Timestamp */}
                      <div className="flex items-center gap-2 pt-2 text-[10px] text-zinc-400 border-t border-white/5">
                        <span>{renderParsed(config.welcome.embed.footer || "ETHONE Guard")}</span>
                        {config.welcome.embed.showTimestamp && <span>• Aujourd&apos;hui à 14:32</span>}
                      </div>
                    </div>
                  )}

                  {/* Discord Buttons Row */}
                  {config.welcome.buttons && config.welcome.buttons.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {config.welcome.buttons.map((btn: WelcomeButton) => (
                        <button
                          key={btn.id}
                          type="button"
                          className={cn(
                            "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all",
                            btn.style === "SUCCESS"
                              ? "bg-[#248046] hover:bg-[#1a6334]"
                              : btn.style === "DANGER"
                              ? "bg-[#DA373C] hover:bg-[#a1282c]"
                              : btn.style === "SECONDARY"
                              ? "bg-[#4E5058] hover:bg-[#6D6F78]"
                              : btn.style === "LINK"
                              ? "bg-[#4E5058] text-blue-300 hover:underline"
                              : "bg-[#5865F2] hover:bg-[#4752C4]"
                          )}
                        >
                          {btn.emoji && <span>{btn.emoji}</span>}
                          <span>{btn.label}</span>
                          {btn.action === "URL" && <ExternalLink className="h-3 w-3 opacity-70" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GOODBYE SYSTEM */}
      {activeTab === "goodbye" && config && (
        <div className="space-y-5 mt-6 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-white">Message de Départ (Goodbye)</h2>
            <p className="text-xs text-zinc-400">
              Notifiez les départs dans un salon dédié pour garder une trace des membres qui quittent le serveur.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-white">Activer les messages de départ</span>
              <input
                type="checkbox"
                checked={config.goodbye.enabled}
                onChange={(e) =>
                  setConfig((p: any) => ({
                    ...p,
                    goodbye: { ...p.goodbye, enabled: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-zinc-700 accent-teal-500"
              />
            </label>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Salon de départ</label>
              <select
                value={config.goodbye.channelId || ""}
                onChange={(e) =>
                  setConfig((p: any) => ({
                    ...p,
                    goodbye: { ...p.goodbye, channelId: e.target.value || null },
                  }))
                }
                className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="">Sélectionner un salon...</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Message de départ</label>
              <textarea
                rows={3}
                value={config.goodbye.messageContent}
                onChange={(e) =>
                  setConfig((p: any) => ({
                    ...p,
                    goodbye: { ...p.goodbye, messageContent: e.target.value },
                  }))
                }
                placeholder="📤 Au revoir **{username}** ! Nous ne sommes plus que **{membercount}** membres."
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white outline-none focus:border-teal-500 resize-none font-sans"
              />
            </div>

            <button
              onClick={() => handleSaveConfig()}
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 transition-all cursor-pointer"
            >
              {saving ? "Enregistrement..." : "Enregistrer le système de départ"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: DM WELCOME */}
      {activeTab === "dm" && config && (
        <div className="space-y-5 mt-6 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-white">Message Privé d&apos;Accueil (DM Welcome)</h2>
            <p className="text-xs text-zinc-400">
              Envoyez automatiquement un message de bienvenue privé aux membres qui rejoignent votre serveur.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xs font-bold text-white">Activer le message privé en DM</p>
                <p className="text-[11px] text-zinc-400">Si un membre a fermé ses DMs, l&apos;envoi échouera sans bloquer l&apos;arrivée.</p>
              </div>
              <input
                type="checkbox"
                checked={config.welcome.dm?.enabled ?? false}
                onChange={(e) =>
                  setConfig((p: any) => ({
                    ...p,
                    welcome: {
                      ...p.welcome,
                      dm: { ...p.welcome.dm, enabled: e.target.checked },
                    },
                  }))
                }
                className="h-4 w-4 rounded border-zinc-700 accent-teal-500"
              />
            </label>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Message texte privé</label>
              <textarea
                rows={3}
                value={config.welcome.dm?.messageContent || ""}
                onChange={(e) =>
                  setConfig((p: any) => ({
                    ...p,
                    welcome: {
                      ...p.welcome,
                      dm: { ...p.welcome.dm, messageContent: e.target.value },
                    },
                  }))
                }
                placeholder="👋 Bonjour {user}, bienvenue sur **{server}** !"
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white outline-none focus:border-teal-500 resize-none font-sans"
              />
            </div>

            <button
              onClick={() => handleSaveConfig()}
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 transition-all cursor-pointer"
            >
              {saving ? "Enregistrement..." : "Enregistrer le DM Welcome"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: ONBOARDING FLOW */}
      {activeTab === "onboarding" && onboarding && (
        <div className="space-y-5 mt-6 max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Parcours d&apos;Onboarding Multi-Étapes</h2>
              <p className="text-xs text-zinc-400">
                Guidez les nouveaux membres : mot d&apos;accueil, acceptation des règles et sélection de rôles personnalisés.
              </p>
            </div>
            <button
              onClick={() => handleSaveOnboarding(onboarding)}
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 transition-all cursor-pointer"
            >
              {saving ? "Enregistrement..." : "Enregistrer le parcours"}
            </button>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 cursor-pointer">
            <div>
              <p className="text-xs font-bold text-white">Activer le flux d&apos;Onboarding</p>
              <p className="text-[11px] text-zinc-400">Déclenche automatiquement les étapes pour les nouveaux arrivants.</p>
            </div>
            <input
              type="checkbox"
              checked={onboarding.enabled}
              onChange={(e) => setOnboarding((p: any) => ({ ...p, enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-zinc-700 accent-teal-500"
            />
          </label>

          {/* Steps List */}
          <div className="space-y-3">
            {onboarding.steps.map((step, idx) => (
              <div
                key={step.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3 hover:border-teal-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/20 text-xs font-bold text-teal-300">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-white text-xs">{step.title}</span>
                    <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] uppercase font-bold text-zinc-300">
                      {step.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...onboarding.steps];
                          const tmp = updated[idx - 1];
                          updated[idx - 1] = updated[idx];
                          updated[idx] = tmp;
                          setOnboarding((p: any) => ({ ...p, steps: updated }));
                        }}
                        className="p-1 text-zinc-400 hover:text-white"
                        title="Monter"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                    )}
                    {idx < onboarding.steps.length - 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...onboarding.steps];
                          const tmp = updated[idx + 1];
                          updated[idx + 1] = updated[idx];
                          updated[idx] = tmp;
                          setOnboarding((p: any) => ({ ...p, steps: updated }));
                        }}
                        className="p-1 text-zinc-400 hover:text-white"
                        title="Descendre"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = onboarding.steps.filter((_, i) => i !== idx);
                        setOnboarding((p: any) => ({ ...p, steps: updated }));
                      }}
                      className="p-1 text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => {
                    const updated = [...onboarding.steps];
                    updated[idx].title = e.target.value;
                    setOnboarding((p: any) => ({ ...p, steps: updated }));
                  }}
                  className="h-8 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 text-xs text-white"
                />

                <textarea
                  rows={2}
                  value={step.description}
                  onChange={(e) => {
                    const updated = [...onboarding.steps];
                    updated[idx].description = e.target.value;
                    setOnboarding((p: any) => ({ ...p, steps: updated }));
                  }}
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 p-2 text-xs text-white resize-none"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                const newStep: OnboardingStep = {
                  id: `step-${Date.now()}`,
                  type: "ROLE_SELECTION",
                  title: "Choix de rôles supplémentaires",
                  description: "Sélectionnez vos badges et préférences.",
                  required: false,
                  order: onboarding.steps.length,
                  roleChoices: [],
                  rulesList: [],
                };
                setOnboarding((p: any) => ({ ...p, steps: [...p.steps, newStep] }));
              }}
              className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-dashed border-white/20 py-3 text-xs font-bold text-zinc-300 hover:border-teal-500 hover:text-teal-300 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter une étape au parcours</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: VÉRIFICATION & RÈGLES */}
      {activeTab === "verification" && verification && (
        <div className="space-y-5 mt-6 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-white">Vérification & Validation de Règlement</h2>
            <p className="text-xs text-zinc-400">
              Obligez les nouveaux membres à cliquer sur un bouton de vérification pour débloquer les salons du serveur.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-white">Activer le module de vérification</span>
              <input
                type="checkbox"
                checked={verification.enabled}
                onChange={(e) => setVerification((p: any) => ({ ...p, enabled: e.target.checked }))}
                className="h-4 w-4 rounded border-zinc-700 accent-teal-500"
              />
            </label>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Rôle attribué après vérification (Vérifié)</label>
              <select
                value={verification.verifiedRoleId || ""}
                onChange={(e) => setVerification((p: any) => ({ ...p, verifiedRoleId: e.target.value || null }))}
                className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="">Sélectionner un rôle...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    @{r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Texte d&apos;invitation à la vérification</label>
              <textarea
                rows={2}
                value={verification.verificationPrompt}
                onChange={(e) => setVerification((p: any) => ({ ...p, verificationPrompt: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white outline-none focus:border-teal-500 resize-none"
              />
            </div>

            <button
              onClick={() => handleSaveVerification(verification)}
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 transition-all cursor-pointer"
            >
              {saving ? "Enregistrement..." : "Enregistrer la vérification"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 7: TEMPLATES PRÊTS À L'EMPLOI */}
      {activeTab === "templates" && (
        <div className="space-y-5 mt-6">
          <div>
            <h2 className="text-base font-bold text-white">Templates Prêts à l&apos;Emploi</h2>
            <p className="text-xs text-zinc-400">
              Appliquez en un clic une configuration complète adaptée au thème de votre serveur Discord.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3 hover:border-teal-500/40 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white uppercase"
                      style={{ backgroundColor: tpl.previewColor || "#10B981" }}
                    >
                      {tpl.badge}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">{tpl.category}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm">{tpl.name}</h3>
                  <p className="text-xs text-zinc-400">{tpl.description}</p>
                </div>

                <button
                  onClick={() => handleApplyTemplate(tpl.id)}
                  disabled={saving}
                  className="w-full rounded-xl bg-white/5 border border-white/10 py-2 text-xs font-bold text-zinc-200 hover:bg-teal-600 hover:text-white hover:border-teal-500 transition-all cursor-pointer"
                >
                  Appliquer ce modèle
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: AUTO-RÔLES */}
      {activeTab === "autoroles" && config && (
        <div className="space-y-5 mt-6 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-white">Attribution Automatique de Rôles (Auto-Roles)</h2>
            <p className="text-xs text-zinc-400">
              Rôles Discord accordés instantanément au membre dès son entrée sur le serveur.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Rôles attribués à l&apos;arrivée</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {roles.map((r) => {
                  const isSelected = config.welcome.autoRoleIds?.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        const current = config.welcome.autoRoleIds || [];
                        const updated = isSelected
                          ? current.filter((id: string) => id !== r.id)
                          : [...current, r.id];
                        setConfig((p: any) => ({
                          ...p,
                          welcome: { ...p.welcome, autoRoleIds: updated },
                        }));
                      }}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all cursor-pointer",
                        isSelected
                          ? "border-teal-500 bg-teal-500/20 text-teal-200 font-bold"
                          : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                      )}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                      <span>@{r.name}</span>
                      {isSelected && <Check className="h-3 w-3 text-teal-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => handleSaveConfig()}
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 transition-all cursor-pointer"
            >
              {saving ? "Enregistrement..." : "Enregistrer les Auto-Roles"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 9: CONDITIONS & AUTOMATIONS */}
      {activeTab === "conditions" && config && (
        <div className="space-y-5 mt-6 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-white">Conditions d&apos;Éligibilité & Automatisations</h2>
            <p className="text-xs text-zinc-400">
              Définissez des règles pour filtrer ou adapter l&apos;accueil selon l&apos;ancienneté du compte Discord.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-white">Activer le filtrage conditionnel</span>
              <input
                type="checkbox"
                checked={config.welcome.conditions?.enabled ?? false}
                onChange={(e) =>
                  setConfig((p: any) => ({
                    ...p,
                    welcome: {
                      ...p.welcome,
                      conditions: { ...p.welcome.conditions, enabled: e.target.checked },
                    },
                  }))
                }
                className="h-4 w-4 rounded border-zinc-700 accent-teal-500"
              />
            </label>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Âge minimum du compte Discord (Jours)</label>
              <input
                type="number"
                min="0"
                max="365"
                value={config.welcome.conditions?.minAccountAgeDays || 0}
                onChange={(e) =>
                  setConfig((p: any) => ({
                    ...p,
                    welcome: {
                      ...p.welcome,
                      conditions: {
                        ...p.welcome.conditions,
                        minAccountAgeDays: parseInt(e.target.value, 10) || 0,
                      },
                    },
                  }))
                }
                className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-teal-500"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Si le compte est plus jeune, l&apos;accueil peut être différé ou restreint.</p>
            </div>

            <button
              onClick={() => handleSaveConfig()}
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 transition-all cursor-pointer"
            >
              {saving ? "Enregistrement..." : "Enregistrer les conditions"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 10: SETTINGS & SALONS */}
      {activeTab === "settings" && config && (
        <div className="space-y-5 mt-6 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-white">Paramètres Généraux & Salons de Destination</h2>
            <p className="text-xs text-zinc-400">
              Sélectionnez les salons Discord et vérifiez automatiquement les permissions requises pour le bot.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Salon de bienvenue (Welcome Channel)</label>
              <select
                value={config.welcome.channelId || ""}
                onChange={(e) =>
                  setConfig((p: any) => ({
                    ...p,
                    welcome: { ...p.welcome, channelId: e.target.value || null },
                  }))
                }
                className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="">Sélectionner un salon...</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name} {ch.canSend ? "✓" : "⚠️ Manque permission"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="flex items-center justify-between cursor-pointer text-xs">
                <span className="text-zinc-300">Mentionner le membre lors de l&apos;arrivée</span>
                <input
                  type="checkbox"
                  checked={config.welcome.mentionUser}
                  onChange={(e) =>
                    setConfig((p: any) => ({
                      ...p,
                      welcome: { ...p.welcome, mentionUser: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded border-zinc-700 accent-teal-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-xs">
                <span className="text-zinc-300">Ignorer les bots (ne pas envoyer de message de bienvenue)</span>
                <input
                  type="checkbox"
                  checked={!config.welcome.sendForBots}
                  onChange={(e) =>
                    setConfig((p: any) => ({
                      ...p,
                      welcome: { ...p.welcome, sendForBots: !e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded border-zinc-700 accent-teal-500"
                />
              </label>
            </div>

            <button
              onClick={() => handleSaveConfig()}
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 transition-all cursor-pointer"
            >
              {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: TEST WELCOME */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🧪 Tester l&apos;Accueil en Conditions Réelles</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Visualisez le rendu en envoyant un message de test sécurisé sans impacter les membres du serveur.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Type de message</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setTestType("welcome")}
                    className={cn(
                      "rounded-xl border py-2 text-xs font-bold transition-all",
                      testType === "welcome"
                        ? "border-teal-500 bg-teal-500/20 text-teal-300"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                    )}
                  >
                    👋 Bienvenue
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestType("goodbye")}
                    className={cn(
                      "rounded-xl border py-2 text-xs font-bold transition-all",
                      testType === "goodbye"
                        ? "border-teal-500 bg-teal-500/20 text-teal-300"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                    )}
                  >
                    📤 Départ
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Destination du test</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setTestTarget("channel")}
                    className={cn(
                      "rounded-xl border py-2 text-xs font-bold transition-all",
                      testTarget === "channel"
                        ? "border-teal-500 bg-teal-500/20 text-teal-300"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                    )}
                  >
                    Salon Textuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestTarget("dm")}
                    className={cn(
                      "rounded-xl border py-2 text-xs font-bold transition-all",
                      testTarget === "dm"
                        ? "border-teal-500 bg-teal-500/20 text-teal-300"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                    )}
                  >
                    Message Privé (DM)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRunTest}
                disabled={testRunning}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 transition-all disabled:opacity-50 cursor-pointer"
              >
                {testRunning ? "Envoi du test..." : "Envoyer le test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
