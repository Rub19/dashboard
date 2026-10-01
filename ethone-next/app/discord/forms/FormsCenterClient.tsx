"use client";

import { motion } from "framer-motion";
import { confirmDialog } from "@/lib/confirmDialog";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Select from "@/components/ui/Select";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Copy,
  TrendingUp,
  Settings,
  Sliders,
  Sparkles,
  Layers,
  ArrowLeft,
  ArrowRight,
  Trash2,
  RefreshCw,
  Bot,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";
import { formatApiError } from "@/lib/format-error";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { GuildSelector } from "@/components/GuildSelector";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

function mapForm(raw: Record<string, unknown>): FormItem {
  const r = raw as Record<string, any>;
  const sections = Array.isArray(r.sections) ? r.sections : [];
  const fields = sections.reduce((n: number, s: any) => n + (Array.isArray(s?.fields) ? s.fields.length : 0), 0);
  return {
    id: String(r.id ?? r.formId ?? ""),
    title: String(r.title ?? "Formulaire"),
    description: String(r.description ?? ""),
    category: String(r.category ?? "Général"),
    status: (r.status ?? "DRAFT") as FormItem["status"],
    version: Number(r.version ?? 1),
    sectionsCount: Number(r.sectionsCount ?? sections.length),
    fieldsCount: Number(r.fieldsCount ?? fields),
    responsesCount: Number(r.responsesCount ?? r.stats?.responsesCount ?? 0),
    pendingCount: Number(r.pendingCount ?? r.stats?.pendingCount ?? 0),
    completionRate: Number(r.completionRate ?? r.stats?.completionRate ?? 0),
    lastResponseAt: r.lastResponseAt ?? undefined,
    updatedAt: String(r.updatedAt ?? new Date().toISOString()),
  };
}

interface FormItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  version: number;
  sectionsCount: number;
  fieldsCount: number;
  responsesCount: number;
  pendingCount: number;
  completionRate: number;
  lastResponseAt?: string;
  updatedAt: string;
}

const DEMO_FORMS: FormItem[] = [];

const TEMPLATES = [
  {
    id: "staff",
    title: "Candidature Staff",
    category: "Modération",
    description: "Expérience, disponibilités, gestion de conflits et motivations.",
    fieldsCount: 6,
    icon: "🛡️",
  },
  {
    id: "partner",
    title: "Partenariat Discord",
    category: "Croissance",
    description: "Nom du serveur, nombre de membres actifs et proposition.",
    fieldsCount: 4,
    icon: "🤝",
  },
  {
    id: "whitelist",
    title: "Whitelist & Accès Privilège",
    category: "Sécurité",
    description: "Vérification d'identité, pseudo In-Game et acceptation du règlement.",
    fieldsCount: 5,
    icon: "🔑",
  },
  {
    id: "event",
    title: "Inscription Événement",
    category: "Animation",
    description: "Choix de créneaux, composition d'équipe et disponibilités.",
    fieldsCount: 5,
    icon: "🏆",
  },
  {
    id: "support",
    title: "Demande de Support Technique",
    category: "Helpdesk",
    description: "Description de bug, capture d'écran et logs d'erreur.",
    fieldsCount: 5,
    icon: "🛠️",
  },
  {
    id: "feedback",
    title: "Questionnaire de Satisfaction",
    category: "Communauté",
    description: "Notation par étoiles, points forts et axes d'amélioration.",
    fieldsCount: 6,
    icon: "⭐",
  },
];

export default function FormsCenterClient() {
  const searchParams = useSearchParams();
  const rawGuildId = searchParams.get("guildId");
  const { profile } = useDiscordOAuth();
  const { success, error: showError } = useToast();

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
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (rawGuildId && appliedQueryGuild.current !== rawGuildId) {
      const match = manageableGuilds.find((g) => g.id === rawGuildId);
      if (match) {
        appliedQueryGuild.current = rawGuildId;
        userSelectedRef.current = true;
        setSelectedGuild(match);
        return;
      }
    }
    if (!userSelectedRef.current && botGuildIds !== null) {
      const picked = pickBotGuild(manageableGuilds, botGuildIds);
      if (picked) setSelectedGuild(picked);
    } else if (!selectedGuild) {
      setSelectedGuild(manageableGuilds[0]);
    }
  }, [manageableGuilds, rawGuildId, selectedGuild, botGuildIds]);

  const currentGuildId = selectedGuild?.id || rawGuildId || "";
  const isBotPresent = Boolean(currentGuildId && botGuildIds && botGuildIds.includes(currentGuildId));

  const [forms, setForms] = useState<FormItem[]>(DEMO_FORMS);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const loadForms = useCallback(async () => {
    if (!BOT_API_URL || !currentGuildId || !isBotPresent) {
      setForms([]);
      setIsDemo(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${currentGuildId}/forms`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.forms)) {
        setForms(data.forms.map(mapForm));
        setIsDemo(false);
      } else {
        setIsDemo(true);
      }
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [currentGuildId, isBotPresent]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  // In demo mode this persists the local list; live, it's a no-op (the bot owns state).
  const saveFormsList = useCallback(
    (updated: FormItem[]) => {
      setForms(updated);
    },
    []
  );

  // Raison renvoyée par le bot lors du dernier échec de `formAction` (affichée dans le toast d'erreur).
  const actionError = useRef<string | undefined>(undefined);
  const formAction = useCallback(
    async (formId: string, path: string, method: "POST" | "DELETE" = "POST"): Promise<boolean> => {
      actionError.current = undefined;
      if (isDemo || !BOT_API_URL) return false;
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${currentGuildId}/forms/${formId}${path}`, {
          method,
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          actionError.current = formatApiError(data?.error, "") || undefined;
        }
        return res.ok;
      } catch {
        return false;
      }
    },
    [isDemo, currentGuildId]
  );

  // KPIs
  const stats = useMemo(() => {
    const total = forms.length;
    const active = forms.filter((f) => f.status === "PUBLISHED").length;
    const totalResp = forms.reduce((acc, f) => acc + f.responsesCount, 0);
    const pendingReviews = forms.reduce((acc, f) => acc + f.pendingCount, 0);
    const avgCompletion =
      forms.length > 0
        ? Math.round(
            forms.reduce((acc, f) => acc + (f.completionRate || 0), 0) / forms.length
          )
        : 0;

    return { total, active, totalResp, pendingReviews, avgCompletion };
  }, [forms]);

  // Filtering
  const filteredForms = useMemo(() => {
    return forms.filter((form) => {
      if (selectedStatus !== "ALL" && form.status !== selectedStatus) return false;
      if (selectedCategory !== "ALL" && form.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          form.title.toLowerCase().includes(q) ||
          form.description.toLowerCase().includes(q) ||
          form.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [forms, selectedStatus, selectedCategory, searchQuery]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    forms.forEach((f) => set.add(f.category));
    return Array.from(set);
  }, [forms]);

  // Actions
  const handleDuplicate = async (form: FormItem) => {
    if (isDemo || !BOT_API_URL) {
      showError("Bot injoignable : le formulaire n'a pas été dupliqué.");
      return;
    }
    const ok = await formAction(form.id, "/duplicate");
    if (!ok) return void showError("Impossible de dupliquer le formulaire.", actionError.current);
    success("Formulaire dupliqué", `"${form.title}" a été créé en brouillon.`);
    loadForms();
  };

  const handleTogglePublish = async (formId: string) => {
    const target = forms.find((f) => f.id === formId);
    if (!target) return;
    const willPublish = target.status !== "PUBLISHED";
    const nextStatus: FormItem["status"] = willPublish ? "PUBLISHED" : "CLOSED";
    saveFormsList(forms.map((f) => (f.id === formId ? { ...f, status: nextStatus, updatedAt: new Date().toISOString() } : f)));
    // The bot only exposes a publish action; "close" stays local for now.
    const ok = willPublish ? await formAction(formId, "/publish") : true;
    if (!ok) {
      saveFormsList(forms.map((f) => (f.id === formId ? { ...f, status: target.status } : f)));
      showError("Impossible de publier le formulaire.", actionError.current);
      return;
    }
    success(
      willPublish ? "Formulaire publié" : "Formulaire fermé",
      `Le statut est maintenant ${willPublish ? "Ouvert aux réponses" : "Fermé"}.`
    );
  };

  const handleDelete = async (formId: string) => {
    if (!await confirmDialog("Êtes-vous sûr de vouloir supprimer ce formulaire ? Toutes ses réponses seront archivées.")) return;
    const snapshot = forms;
    saveFormsList(forms.filter((f) => f.id !== formId));
    const ok = await formAction(formId, "", "DELETE");
    if (!ok) {
      saveFormsList(snapshot);
      showError("Impossible de supprimer le formulaire.", actionError.current);
      return;
    }
    success("Formulaire supprimé", "Le formulaire a été retiré.");
  };

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-6 sm:px-6 text-[var(--text-primary)] space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--panel-border)] pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/discord${currentGuildId ? `?guildId=${currentGuildId}` : ""}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] px-3 text-xs font-semibold normal-case tracking-normal text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Retour Discord</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--inset-radius)] bg-[var(--surface-raised)]/50 border border-[var(--panel-border)] text-[var(--text-muted)] icon-pop">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                <span>Formulaires</span>
                {isDemo && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Bot injoignable ou absent de ce serveur
                  </span>
                )}
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {isDemo
                  ? "Connecte un serveur pour gérer tes vrais formulaires depuis ici."
                  : "Formulaires et candidatures, synchronisés avec le bot."}
              </p>
            </div>
          </div>
          <button
            onClick={loadForms}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-2.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] disabled:opacity-50"
            title="Rafraîchir"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
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
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 px-3.5 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Templates</span>
          </button>
          <Link
            href={`/discord/forms/create?guildId=${currentGuildId}`}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-semibold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Créer un formulaire</span>
          </Link>
        </div>
      </div>

      {/* Bot non installé banner */}
      {selectedGuild && !isBotPresent && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Bot non installé sur ce serveur</p>
              <p className="text-xs text-amber-300/80">
                Invitez le bot ETHONE sur <strong>{selectedGuild.name}</strong> pour créer et synchroniser vos formulaires Discord.
              </p>
            </div>
          </div>
          <a
            href={BOT_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs shadow-sm transition-colors cursor-pointer shrink-0"
          >
            Inviter le bot
          </a>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
            <span className="text-xs font-medium">Total Formulaires</span>
            <Layers className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Créés sur ce serveur</p>
        </div>

        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
            <span className="text-xs font-medium">Formulaires Actifs</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.active}</div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Ouverts aux réponses</p>
        </div>

        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
            <span className="text-xs font-medium">Total Réponses</span>
            <FileText className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400">{stats.totalResp}</div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Soumissions Discord &amp; Web</p>
        </div>

        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
            <span className="text-xs font-medium">En Attente de Review</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{stats.pendingReviews}</div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">À traiter par le staff</p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
            <span className="text-xs font-medium">Taux de Complétion</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.avgCompletion}%</div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Moyenne globale</p>
        </div>
      </div>

      {/* Filters & Search Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "Tous" },
            { id: "PUBLISHED", label: "Publiés" },
            { id: "DRAFT", label: "Brouillons" },
            { id: "CLOSED", label: "Fermés" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={cn(
                "relative isolate h-8 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 active:scale-[0.97]",
                selectedStatus === tab.id
                  ? "text-[var(--accent-contrast)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70"
              )}
            >
              {selectedStatus === tab.id && <motion.span layoutId="forms-tab" transition={{ type: "spring", stiffness: 450, damping: 35 }} className="absolute inset-0 -z-10 rounded-[inherit] bg-[var(--accent-primary)] shadow-sm" />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Category dropdown */}
        <div className="flex items-center gap-2">
          {categories.length > 0 && (
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              aria-label="Filtrer par catégorie"
              size="sm"
              className="w-44 shrink-0"
              options={[{ id: "ALL", label: "Toutes catégories" }, ...categories.map((c) => ({ id: c, label: c }))]}
            />
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un formulaire..."
              className="h-8 w-full rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] pl-8 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--input-border-hover)]"
            />
          </div>
        </div>
      </div>

      {/* Forms Grid */}
      {filteredForms.length === 0 ? (
        <div className="pop-in flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-12 text-center">
          <FileText className="h-10 w-10 text-[var(--text-muted)] mb-3" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Aucun formulaire trouvé</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1">
            {searchQuery
              ? "Aucun formulaire ne correspond à vos filtres de recherche."
              : "Créez votre premier formulaire ou démarrez à partir de nos modèles prêts à l'emploi."}
          </p>
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="mt-4 flex h-8 items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 text-xs font-semibold text-[var(--accent-contrast)] shadow hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Découvrir les Templates</span>
          </button>
        </div>
      ) : (
        <div className="stagger-children grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map((form) => {
            const isPublished = form.status === "PUBLISHED";
            const isDraft = form.status === "DRAFT";
            const isClosed = form.status === "CLOSED";

            return (
              <div
                key={form.id}
                className="flex flex-col justify-between rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 hover:border-[var(--input-border-hover)] p-5 transition-all group"
              >
                <div>
                  {/* Card Header: Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--surface-raised)]/50 border border-[var(--panel-border)] px-2 py-0.5 rounded-lg truncate">
                      {form.category}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0",
                        isPublished && "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
                        isDraft && "bg-amber-500/10 text-amber-300 border-amber-500/30",
                        isClosed && "bg-[var(--surface-raised)]/60 text-[var(--text-muted)] border-[var(--panel-border)]"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isPublished && "bg-emerald-400",
                          isDraft && "bg-amber-400",
                          isClosed && "bg-[var(--surface-raised)]/60"
                        )}
                      />
                      <span>{isPublished ? "Actif" : isDraft ? "Brouillon" : "Fermé"}</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-emerald-300 transition-colors line-clamp-1">
                    {form.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                    {form.description || "Aucune description fournie pour ce formulaire."}
                  </p>

                  {/* Mini Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[var(--panel-border)] text-center">
                    <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] p-2 rounded-xl">
                      <span className="text-xs text-[var(--text-muted)] block">Réponses</span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">{form.responsesCount}</span>
                    </div>
                    <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] p-2 rounded-xl">
                      <span className="text-xs text-[var(--text-muted)] block">En attente</span>
                      <span className="text-xs font-bold text-amber-400">{form.pendingCount}</span>
                    </div>
                    <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] p-2 rounded-xl">
                      <span className="text-xs text-[var(--text-muted)] block">Champs</span>
                      <span className="text-xs font-bold text-emerald-400">{form.fieldsCount}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-3 border-t border-[var(--panel-border)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/discord/forms/${form.id}?guildId=${currentGuildId}`}
                      className="flex h-8 items-center gap-1 rounded-xl bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                      title="Ouvrir le Builder"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      <span>Builder</span>
                    </Link>

                    <Link
                      href={`/discord/forms/${form.id}/responses?guildId=${currentGuildId}`}
                      className="flex h-8 items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 px-2.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                      title="Voir les réponses"
                    >
                      <FileText className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Réponses</span>
                    </Link>

                    <Link
                      href={`/discord/forms/${form.id}/settings?guildId=${currentGuildId}`}
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                      title="Réglages et publication Discord"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(form)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70 transition-all cursor-pointer"
                      title="Dupliquer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleTogglePublish(form.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--surface-raised)]/70 transition-all cursor-pointer"
                      title={isPublished ? "Désactiver le formulaire" : "Publier"}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(form.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--surface-raised)]/70 transition-all cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Templates Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Bibliothèque de Templates Prêts à l&apos;Emploi</h3>
                  <p className="text-xs text-[var(--text-muted)]">Sélectionnez un modèle pour générer instantanément vos sections et champs.</p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 hover:border-[var(--input-border-hover)] hover:bg-emerald-500/15 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg">{tmpl.icon}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {tmpl.category}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">{tmpl.title}</h4>
                    <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{tmpl.description}</p>
                  </div>
                  <div className="mt-4 pt-2.5 border-t border-[var(--panel-border)] flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)]">{tmpl.fieldsCount} champs inclus</span>
                    <Link
                      href={`/discord/forms/create?template=${tmpl.id}&guildId=${currentGuildId}`}
                      className="flex h-7 items-center gap-1 px-3 rounded-lg bg-[var(--accent-primary)] text-xs font-semibold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                    >
                      <span>Utiliser</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--panel-border)] pt-3 flex justify-end">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="h-8 px-4 rounded-xl border border-[var(--panel-border)] text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 cursor-pointer"
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
