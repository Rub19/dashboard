"use client";

import { confirmDialog } from "@/lib/confirmDialog";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

  const formAction = useCallback(
    async (formId: string, path: string, method: "POST" | "DELETE" = "POST"): Promise<boolean> => {
      if (isDemo || !BOT_API_URL) return false;
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${currentGuildId}/forms/${formId}${path}`, {
          method,
          credentials: "include",
        });
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
    if (!ok) return void success("Échec", "Impossible de dupliquer le formulaire.");
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
      success("Échec", "Impossible de publier le formulaire.");
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
      success("Échec", "Impossible de supprimer le formulaire.");
      return;
    }
    success("Formulaire supprimé", "Le formulaire a été retiré.");
  };

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-white p-4 sm:p-6 lg:p-8 pb-44 md:pb-44 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--panel-border)] pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/discord${currentGuildId ? `?guildId=${currentGuildId}` : ""}`}
            className="flex h-9 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 px-3 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour Discord</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.04] border border-[var(--panel-border)] text-zinc-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Formulaires</span>
                {isDemo && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Bot injoignable ou absent de ce serveur
                  </span>
                )}
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isDemo
                  ? "Connecte un serveur pour gérer tes vrais formulaires depuis ici."
                  : "Formulaires et candidatures, synchronisés avec le bot."}
              </p>
            </div>
          </div>
          <button
            onClick={loadForms}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 p-2.5 text-zinc-400 transition-colors hover:text-white hover:bg-white/10 disabled:opacity-50"
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
            className="flex h-9 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 px-3.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Templates</span>
          </button>
          <Link
            href={`/discord/forms/create?guildId=${currentGuildId}`}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white hover:bg-[#4752C4] transition-colors cursor-pointer"
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
              <p className="text-sm font-semibold text-white">Bot non installé sur ce serveur</p>
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
        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Total Formulaires</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.total}</div>
          <p className="text-[10px] text-zinc-500 mt-0.5">Créés sur ce serveur</p>
        </div>

        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Formulaires Actifs</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats.active}</div>
          <p className="text-[10px] text-zinc-500 mt-0.5">Ouverts aux réponses</p>
        </div>

        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Total Réponses</span>
            <FileText className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">{stats.totalResp}</div>
          <p className="text-[10px] text-zinc-500 mt-0.5">Soumissions Discord &amp; Web</p>
        </div>

        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">En Attente de Review</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{stats.pendingReviews}</div>
          <p className="text-[10px] text-zinc-500 mt-0.5">À traiter par le staff</p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Taux de Complétion</span>
            <TrendingUp className="h-4 w-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black text-violet-400">{stats.avgCompletion}%</div>
          <p className="text-[10px] text-zinc-500 mt-0.5">Moyenne globale</p>
        </div>
      </div>

      {/* Filters & Search Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
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

        {/* Search & Category dropdown */}
        <div className="flex items-center gap-2">
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filtrer par catégorie"
              className="h-8 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-2.5 text-xs text-zinc-300 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Toutes catégories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un formulaire..."
              className="h-8 w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/90 pl-8 pr-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Forms Grid */}
      {filteredForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--panel-border)] bg-white/[0.01] p-12 text-center">
          <FileText className="h-10 w-10 text-zinc-600 mb-3" />
          <h3 className="text-sm font-bold text-white">Aucun formulaire trouvé</h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1">
            {searchQuery
              ? "Aucun formulaire ne correspond à vos filtres de recherche."
              : "Créez votre premier formulaire ou démarrez à partir de nos modèles prêts à l'emploi."}
          </p>
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="mt-4 flex h-8 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Découvrir les Templates</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map((form) => {
            const isPublished = form.status === "PUBLISHED";
            const isDraft = form.status === "DRAFT";
            const isClosed = form.status === "CLOSED";

            return (
              <div
                key={form.id}
                className="flex flex-col justify-between rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.025] hover:border-[var(--input-border-hover)] p-5 transition-all group backdrop-blur-sm shadow-lg hover:shadow-indigo-500/5"
              >
                <div>
                  {/* Card Header: Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-white/5 border border-[var(--panel-border)] px-2 py-0.5 rounded-lg truncate">
                      {form.category}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0",
                        isPublished && "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
                        isDraft && "bg-amber-500/10 text-amber-300 border-amber-500/30",
                        isClosed && "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isPublished && "bg-emerald-400",
                          isDraft && "bg-amber-400",
                          isClosed && "bg-zinc-400"
                        )}
                      />
                      <span>{isPublished ? "Actif" : isDraft ? "Brouillon" : "Fermé"}</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {form.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {form.description || "Aucune description fournie pour ce formulaire."}
                  </p>

                  {/* Mini Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[var(--panel-border)] text-center">
                    <div className="bg-white/[0.02] border border-[var(--panel-border)] p-2 rounded-xl">
                      <span className="text-[10px] text-zinc-500 block">Réponses</span>
                      <span className="text-xs font-bold text-white">{form.responsesCount}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-[var(--panel-border)] p-2 rounded-xl">
                      <span className="text-[10px] text-zinc-500 block">En attente</span>
                      <span className="text-xs font-bold text-amber-400">{form.pendingCount}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-[var(--panel-border)] p-2 rounded-xl">
                      <span className="text-[10px] text-zinc-500 block">Champs</span>
                      <span className="text-xs font-bold text-indigo-400">{form.fieldsCount}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-3 border-t border-[var(--panel-border)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/discord/forms/${form.id}?guildId=${currentGuildId}`}
                      className="flex h-8 items-center gap-1 rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-500 transition-all cursor-pointer"
                      title="Ouvrir le Builder"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      <span>Builder</span>
                    </Link>

                    <Link
                      href={`/discord/forms/${form.id}/responses?guildId=${currentGuildId}`}
                      className="flex h-8 items-center gap-1 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 px-2.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                      title="Voir les réponses"
                    >
                      <FileText className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Réponses</span>
                    </Link>

                    <Link
                      href={`/discord/forms/${form.id}/settings?guildId=${currentGuildId}`}
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                      title="Réglages et publication Discord"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(form)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                      title="Dupliquer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleTogglePublish(form.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:text-emerald-400 hover:bg-white/5 transition-all cursor-pointer"
                      title={isPublished ? "Désactiver le formulaire" : "Publier"}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(form.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Bibliothèque de Templates Prêts à l&apos;Emploi</h3>
                  <p className="text-xs text-zinc-400">Sélectionnez un modèle pour générer instantanément vos sections et champs.</p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg">{tmpl.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        {tmpl.category}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{tmpl.title}</h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{tmpl.description}</p>
                  </div>
                  <div className="mt-4 pt-2.5 border-t border-[var(--panel-border)] flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500">{tmpl.fieldsCount} champs inclus</span>
                    <Link
                      href={`/discord/forms/create?template=${tmpl.id}&guildId=${currentGuildId}`}
                      className="flex h-7 items-center gap-1 px-3 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 transition-all cursor-pointer"
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
                className="h-8 px-4 rounded-[var(--inset-radius)] border border-[var(--panel-border)] text-xs font-semibold text-zinc-300 hover:bg-white/5 cursor-pointer"
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
