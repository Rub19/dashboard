"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Archive,
  Copy,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Settings,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  Share2,
  Trash2,
  AlertCircle,
  HelpCircle,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

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

const DEMO_FORMS: FormItem[] = [
  {
    id: "staff-app",
    title: "Candidature Modérateur / Staff 2026",
    description: "Recrutement officiel pour l'équipe de modération ETHONE. Questions situationnelles, expérience et disponibilités.",
    category: "Staff & Modération",
    status: "PUBLISHED",
    version: 2,
    sectionsCount: 3,
    fieldsCount: 5,
    responsesCount: 24,
    pendingCount: 4,
    completionRate: 92.5,
    lastResponseAt: "Il y a 2 heures",
    updatedAt: "2026-09-04T12:00:00Z",
  },
  {
    id: "partner-app",
    title: "Demande de Partenariat ETHONE",
    description: "Formulaire d'évaluation des serveurs Discord partenaires. Statistiques, communauté et engagements.",
    category: "Partenariats & Réseaux",
    status: "PUBLISHED",
    version: 1,
    sectionsCount: 1,
    fieldsCount: 4,
    responsesCount: 18,
    pendingCount: 2,
    completionRate: 88.0,
    lastResponseAt: "Hier à 18:30",
    updatedAt: "2026-09-03T10:00:00Z",
  },
  {
    id: "feedback-commu",
    title: "Feedback Communautaire & Boîte à Idées",
    description: "Questionnaire de satisfaction trimestriel et recueil de suggestions d'animations et événements.",
    category: "Communauté",
    status: "DRAFT",
    version: 1,
    sectionsCount: 2,
    fieldsCount: 6,
    responsesCount: 0,
    pendingCount: 0,
    completionRate: 0,
    updatedAt: "2026-09-04T08:15:00Z",
  },
  {
    id: "whitelist-event",
    title: "Inscription Tournoi eSport Inter-Serveurs",
    description: "Enregistrement des équipes, pseudos Discord, rangs compétitifs et capitaines.",
    category: "Événements & Tournois",
    status: "CLOSED",
    version: 3,
    sectionsCount: 2,
    fieldsCount: 7,
    responsesCount: 42,
    pendingCount: 0,
    completionRate: 98.2,
    lastResponseAt: "Il y a 3 jours",
    updatedAt: "2026-08-30T14:20:00Z",
  },
];

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

  const activeGuild = useMemo(() => {
    if (rawGuildId && profile?.guilds) {
      return profile.guilds.find((g) => g.id === rawGuildId) || profile.guilds[0];
    }
    return profile?.guilds?.[0] || null;
  }, [rawGuildId, profile?.guilds]);

  const currentGuildId = activeGuild?.id || "123456789012345678";

  const [forms, setForms] = useState<FormItem[]>(DEMO_FORMS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Persistence per guild
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ethone:forms:${currentGuildId}`);
      if (saved) {
        setForms(JSON.parse(saved));
      } else {
        setForms(DEMO_FORMS);
      }
    } catch {
      setForms(DEMO_FORMS);
    }
  }, [currentGuildId]);

  const saveFormsList = (updated: FormItem[]) => {
    setForms(updated);
    try {
      localStorage.setItem(`ethone:forms:${currentGuildId}`, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

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
  const handleDuplicate = (form: FormItem) => {
    const duplicated: FormItem = {
      ...form,
      id: `form-${Date.now().toString(36)}`,
      title: `${form.title} (Copie)`,
      status: "DRAFT",
      version: 1,
      responsesCount: 0,
      pendingCount: 0,
      completionRate: 0,
      updatedAt: new Date().toISOString(),
    };
    const updated = [duplicated, ...forms];
    saveFormsList(updated);
    success("Formulaire dupliqué", `"${duplicated.title}" a été créé en brouillon.`);
  };

  const handleTogglePublish = (formId: string) => {
    const updated = forms.map((f) => {
      if (f.id === formId) {
        const nextStatus = f.status === "PUBLISHED" ? ("CLOSED" as const) : ("PUBLISHED" as const);
        return { ...f, status: nextStatus, updatedAt: new Date().toISOString() };
      }
      return f;
    });
    saveFormsList(updated);
    const target = updated.find((f) => f.id === formId);
    success(
      target?.status === "PUBLISHED" ? "Formulaire publié" : "Formulaire fermé",
      `Le statut est maintenant ${target?.status === "PUBLISHED" ? "Ouvert aux réponses" : "Fermé"}.`
    );
  };

  const handleDelete = (formId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce formulaire ? Toutes ses réponses seront archivées.")) {
      const updated = forms.filter((f) => f.id !== formId);
      saveFormsList(updated);
      success("Formulaire supprimé", "Le formulaire a été retiré du dashboard.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Forms &amp; Applications 2.0</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  No-Code Builder
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Créez des formulaires sur-mesure, publiez-les sur Discord et pilotez les candidatures avec review et automations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Templates</span>
          </button>
          <Link
            href={`/discord/forms/create?guildId=${currentGuildId}`}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:to-cyan-500 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Créer un formulaire</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Total Formulaires</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.total}</div>
          <p className="text-[10px] text-zinc-500 mt-0.5">Créés sur ce serveur</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Formulaires Actifs</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats.active}</div>
          <p className="text-[10px] text-zinc-500 mt-0.5">Ouverts aux réponses</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Total Réponses</span>
            <FileText className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">{stats.totalResp}</div>
          <p className="text-[10px] text-zinc-500 mt-0.5">Soumissions Discord &amp; Web</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">En Attente de Review</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{stats.pendingReviews}</div>
          <p className="text-[10px] text-zinc-500 mt-0.5">À traiter par le staff</p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Taux de Complétion</span>
            <TrendingUp className="h-4 w-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black text-violet-400">{stats.avgCompletion}%</div>
          <p className="text-[10px] text-zinc-500 mt-0.5">Moyenne globale</p>
        </div>
      </div>

      {/* Filters & Search Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
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
              className="h-8 rounded-xl border border-white/10 bg-zinc-900 px-2.5 text-xs text-zinc-300 outline-none focus:border-indigo-500 cursor-pointer"
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
              className="h-8 w-full rounded-xl border border-white/10 bg-zinc-900/90 pl-8 pr-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Forms Grid */}
      {filteredForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
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
                className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.025] hover:border-white/20 p-5 transition-all group backdrop-blur-sm shadow-lg hover:shadow-indigo-500/5"
              >
                <div>
                  {/* Card Header: Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg truncate">
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
                          isPublished && "bg-emerald-400 animate-pulse",
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
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/5 text-center">
                    <div className="bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                      <span className="text-[10px] text-zinc-500 block">Réponses</span>
                      <span className="text-xs font-bold text-white">{form.responsesCount}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                      <span className="text-[10px] text-zinc-500 block">En attente</span>
                      <span className="text-xs font-bold text-amber-400">{form.pendingCount}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                      <span className="text-[10px] text-zinc-500 block">Champs</span>
                      <span className="text-xs font-bold text-indigo-400">{form.fieldsCount}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
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
                      className="flex h-8 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                      title="Voir les réponses"
                    >
                      <FileText className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Réponses</span>
                    </Link>

                    <Link
                      href={`/discord/forms/${form.id}/settings?guildId=${currentGuildId}`}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
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
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
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
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all flex flex-col justify-between"
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
                  <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between">
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

            <div className="border-t border-white/10 pt-3 flex justify-end">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="h-8 px-4 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 hover:bg-white/5 cursor-pointer"
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
