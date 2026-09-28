"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePathSegment } from "@/lib/hooks/usePathSegment";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  GripVertical,
  CheckCircle2,
  Settings,
  Smartphone,
  Monitor,
  ArrowLeft,
  Save,
  Sliders,
  Type,
  AlignLeft,
  ListFilter,
  CheckSquare,
  Hash,
  Star,
  User,
  Users,
  MessageSquare,
  Calendar,
  Clock,
  Upload,
  Link2,
  Mail,
  ToggleLeft,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";
import { formatApiError } from "@/lib/format-error";

// Field palette definitions
const FIELD_PALETTE = [
  {
    category: "Texte & Contenu",
    items: [
      { type: "SHORT_TEXT", label: "Texte court", icon: Type, desc: "Ligne unique (nom, pseudo, titre)" },
      { type: "LONG_TEXT", label: "Texte long", icon: AlignLeft, desc: "Paragraphe (motivation, description)" },
      { type: "EMAIL", label: "Adresse e-mail", icon: Mail, desc: "Validation email automatique" },
      { type: "URL", label: "Lien URL", icon: Link2, desc: "Lien Discord, site ou portfolio" },
    ],
  },
  {
    category: "Sélection & Choix",
    items: [
      { type: "SELECT", label: "Menu Déroulant", icon: ListFilter, desc: "Choix unique dans une liste" },
      { type: "RADIO", label: "Boutons Radio", icon: ToggleLeft, desc: "Choix unique visible" },
      { type: "MULTI_SELECT", label: "Choix Multiples", icon: CheckSquare, desc: "Plusieurs options sélectionnables" },
      { type: "YES_NO", label: "Oui / Non", icon: CheckCircle2, desc: "Interrupteur binaire rapide" },
    ],
  },
  {
    category: "Numérique & Évaluation",
    items: [
      { type: "NUMBER", label: "Nombre / Âge", icon: Hash, desc: "Chiffre avec min/max" },
      { type: "SLIDER", label: "Curseur", icon: Sliders, desc: "Sélection sur plage numérique" },
      { type: "RATING", label: "Note Étoiles", icon: Star, desc: "Évaluation de 1 à 5 étoiles" },
    ],
  },
  {
    category: "Données Discord",
    items: [
      { type: "DISCORD_USER", label: "Membre Discord", icon: User, desc: "Sélecteur de membre du serveur" },
      { type: "DISCORD_ROLE", label: "Rôle Discord", icon: Users, desc: "Sélecteur de rôle" },
      { type: "DISCORD_CHANNEL", label: "Salon Discord", icon: MessageSquare, desc: "Sélecteur de salon" },
    ],
  },
  {
    category: "Date & Fichiers",
    items: [
      { type: "DATE", label: "Date", icon: Calendar, desc: "Sélecteur de date" },
      { type: "DATE_TIME", label: "Date & Heure", icon: Clock, desc: "Créneau précis" },
      { type: "FILE_UPLOAD", label: "Fichier / Capture", icon: Upload, desc: "Upload de document ou log" },
    ],
  },
];

interface FormOption {
  id: string;
  label: string;
  value: string;
  points: number;
}

interface BuilderField {
  id: string;
  type: string;
  label: string;
  description: string;
  placeholder: string;
  required: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  options: FormOption[];
  sectionId: string;
}

interface BuilderSection {
  id: string;
  title: string;
  description: string;
}

interface FormCondition {
  id: string;
  sourceFieldId: string;
  operator: "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "CONTAINS";
  value: string;
  action: "SHOW_FIELD" | "HIDE_FIELD";
}

const DEFAULT_SECTIONS: BuilderSection[] = [
  { id: "sec-1", title: "Informations générales", description: "" },
];

export default function FormBuilderClient() {
  const searchParams = useSearchParams();
  const formId = usePathSegment("forms");
  const urlGuildId = searchParams.get("guildId");
  const { profile } = useDiscordOAuth();
  const { success, error: showError } = useToast();

  const activeGuild = useMemo(() => {
    if (urlGuildId && profile?.guilds) {
      return profile.guilds.find((g) => g.id === urlGuildId) || profile.guilds[0];
    }
    return profile?.guilds?.[0] || null;
  }, [urlGuildId, profile?.guilds]);
  const rawGuildId = activeGuild?.id || urlGuildId || "";
  const isRealGuild = Boolean(BOT_API_URL) && Boolean(rawGuildId);
  const formUrl = `${BOT_API_URL}/api/guilds/${rawGuildId}/forms/${formId}`;

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED">("DRAFT");
  const [formVersion, setFormVersion] = useState(1);
  const [sections, setSections] = useState<BuilderSection[]>(DEFAULT_SECTIONS);
  const [activeSectionId, setActiveSectionId] = useState<string>("sec-1");
  const [fields, setFields] = useState<BuilderField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [conditions, setConditions] = useState<FormCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // View mode
  const [previewMode, setPreviewMode] = useState<"edit" | "desktop" | "mobile" | "discord">("edit");
  const [isSaving, setIsSaving] = useState(false);

  // Real form from the bot. Every mutation below marks the builder dirty; the
  // header "Enregistrer" PUTs the whole structure back.
  const load = useCallback(async () => {
    if (!isRealGuild) {
      setLoading(false);
      setLoadError("Connecte un serveur avec le bot pour éditer un formulaire.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(formUrl, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.form) throw new Error(formatApiError(data?.error, "Formulaire introuvable"));
      const f = data.form;
      setFormTitle(f.title || "");
      setFormDescription(f.description || "");
      setFormStatus(f.status || "DRAFT");
      setFormVersion(f.version || 1);
      const secs: BuilderSection[] = Array.isArray(f.sections) && f.sections.length > 0
        ? [...f.sections].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((s: any) => ({ id: s.id, title: s.title, description: s.description || "" }))
        : DEFAULT_SECTIONS;
      setSections(secs);
      setActiveSectionId(secs[0].id);
      const flds: BuilderField[] = (Array.isArray(f.fields) ? [...f.fields] : [])
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map((x: any) => ({ id: x.id, type: x.type, label: x.label, description: x.description || "", placeholder: x.placeholder || "", required: Boolean(x.required), min: x.min, max: x.max, minLength: x.minLength, maxLength: x.maxLength, options: Array.isArray(x.options) ? x.options : [], sectionId: secs.some((s) => s.id === x.sectionId) ? x.sectionId : secs[0].id }));
      setFields(flds);
      setSelectedFieldId(flds[0]?.id || null);
      setConditions(Array.isArray(f.conditions) ? f.conditions : []);
      setDirty(false);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Impossible de charger le formulaire.");
    } finally {
      setLoading(false);
    }
  }, [formUrl, isRealGuild]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loading) setDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formTitle, formDescription, sections, fields, conditions]);

  // Selected Field
  const selectedField = useMemo(() => {
    return fields.find((f) => f.id === selectedFieldId) || null;
  }, [fields, selectedFieldId]);

  // Fields for the current section
  const currentSectionFields = useMemo(() => {
    return fields.filter((f) => f.sectionId === activeSectionId);
  }, [fields, activeSectionId]);

  // Add a field
  const handleAddField = (type: string, label: string) => {
    const newId = `f-${Date.now().toString(36)}`;
    const hasOptions = ["SELECT", "RADIO", "MULTI_SELECT", "YES_NO"].includes(type);
    const newField: BuilderField = {
      id: newId,
      type,
      label: label || "Nouveau champ",
      description: "",
      placeholder: "",
      required: false,
      options: hasOptions
        ? [
            { id: "opt-1", label: "Option 1", value: "opt_1", points: 10 },
            { id: "opt-2", label: "Option 2", value: "opt_2", points: 0 },
          ]
        : [],
      sectionId: activeSectionId,
    };

    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newId);
    success("Champ ajouté", `Le champ "${label}" a été inséré dans la section active.`);
  };

  // Duplicate a field
  const handleDuplicateField = (f: BuilderField) => {
    const newId = `f-${Date.now().toString(36)}`;
    const duplicate: BuilderField = {
      ...f,
      id: newId,
      label: `${f.label} (Copie)`,
    };
    setFields((prev) => [...prev, duplicate]);
    setSelectedFieldId(newId);
    success("Champ dupliqué", `"${duplicate.label}" a été ajouté.`);
  };

  // Delete a field
  const handleDeleteField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) {
      const remaining = fields.filter((f) => f.id !== id);
      setSelectedFieldId(remaining[0]?.id || null);
    }
  };

  // Move field order
  const handleMoveField = (index: number, direction: "up" | "down") => {
    const list = [...currentSectionFields];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    // Merge back into total fields
    const otherFields = fields.filter((f) => f.sectionId !== activeSectionId);
    setFields([...otherFields, ...list]);
  };

  // Add Section
  const handleAddSection = () => {
    const newSecId = `sec-${Date.now().toString(36)}`;
    const newSec: BuilderSection = {
      id: newSecId,
      title: `Étape ${sections.length + 1} : Titre`,
      description: "Description de cette étape",
    };
    setSections((prev) => [...prev, newSec]);
    setActiveSectionId(newSecId);
    success("Étape ajoutée", "Une nouvelle page multi-step a été créée.");
  };

  const buildPayload = () => ({
    title: formTitle.trim() || "Formulaire sans titre",
    description: formDescription,
    sections: sections.map((s, i) => ({ id: s.id, title: s.title, description: s.description, order: i })),
    fields: fields.map((f, i) => ({ ...f, order: i })),
    conditions,
  });

  // Save changes → PUT the whole structure to the bot.
  const handleSave = async (): Promise<boolean> => {
    if (!isRealGuild) {
      showError("Serveur requis", "Connecte un serveur avec le bot.");
      return false;
    }
    setIsSaving(true);
    try {
      const res = await fetch(formUrl, { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(buildPayload()) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.form) throw new Error(formatApiError(data?.error, "Le bot n'a pas répondu."));
      setFormVersion(data.form.version || formVersion);
      setDirty(false);
      success("Formulaire enregistré", `${fields.length} champ(s) sur ${sections.length} étape(s).`);
      return true;
    } catch (e: any) {
      showError("Échec de l'enregistrement", e?.message || "Le bot n'a pas répondu.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Publish: save first, then flip the status so members can submit.
  const handlePublish = async () => {
    if (fields.length === 0) {
      showError("Formulaire vide", "Ajoute au moins un champ avant de publier.");
      return;
    }
    const saved = await handleSave();
    if (!saved) return;
    try {
      const res = await fetch(`${formUrl}/publish`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.form) throw new Error(formatApiError(data?.error, "Le bot n'a pas répondu."));
      setFormStatus(data.form.status || "PUBLISHED");
      setFormVersion(data.form.version || formVersion);
      success("Formulaire publié", "Publie maintenant le panneau Discord depuis Paramètres & Discord.");
    } catch (e: any) {
      showError("Échec de la publication", e?.message || "Le bot n'a pas répondu.");
    }
  };

  if (loading) {
    return <div className="min-h-[50vh] text-xs text-[var(--text-muted)] flex items-center justify-center">Chargement du formulaire...</div>;
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-6xl w-full px-4 py-6 sm:px-6 text-[var(--text-primary)] space-y-4">
        <Link href={`/discord/forms?guildId=${rawGuildId}`} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"><ArrowLeft className="h-4 w-4" /> Retour aux formulaires</Link>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">{loadError}</div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col overflow-hidden">
      {/* Top Builder Navbar */}
      <header className="h-14 border-b border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] px-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/discord/forms?guildId=${rawGuildId}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--text-muted)] hidden sm:inline">Forms &gt;</span>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="bg-transparent text-sm font-bold text-[var(--text-primary)] border-b border-transparent hover:border-[var(--input-border-hover)] focus:border-[var(--input-border-hover)] outline-none px-1 py-0.5 rounded transition-colors"
            />
            <span className={cn("text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", formStatus === "PUBLISHED" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : formStatus === "DRAFT" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-[var(--surface-raised)]/50 text-[var(--text-muted)] border-[var(--panel-border)]")}>
              {formStatus === "PUBLISHED" ? "Publié" : formStatus === "DRAFT" ? "Brouillon" : formStatus === "CLOSED" ? "Fermé" : "Archivé"} v{formVersion}
            </span>
            {dirty && <span className="text-xs text-amber-400">• non enregistré</span>}
          </div>
        </div>

        {/* Center: View Switcher */}
        <div className="flex items-center gap-1 bg-[var(--surface-raised)]/50 border border-[var(--panel-border)] p-0.5 rounded-xl">
          <button
            onClick={() => setPreviewMode("edit")}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              previewMode === "edit" ? "bg-emerald-500 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-white"
            )}
          >
            <Sliders className="h-3 w-3" />
            <span>Éditeur</span>
          </button>
          <button
            onClick={() => setPreviewMode("desktop")}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              previewMode === "desktop" ? "bg-emerald-500 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-white"
            )}
          >
            <Monitor className="h-3 w-3" />
            <span className="hidden md:inline">Aperçu Web</span>
          </button>
          <button
            onClick={() => setPreviewMode("mobile")}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              previewMode === "mobile" ? "bg-emerald-500 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-white"
            )}
          >
            <Smartphone className="h-3 w-3" />
            <span className="hidden md:inline">Mobile</span>
          </button>
          <button
            onClick={() => setPreviewMode("discord")}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              previewMode === "discord" ? "bg-emerald-500 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-white"
            )}
          >
            <MessageSquare className="h-3 w-3 text-emerald-400" />
            <span className="hidden md:inline">Modal Discord</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/discord/forms/${formId}/settings?guildId=${rawGuildId}`}
            className="flex h-8 items-center gap-1.5 px-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Paramètres &amp; Discord</span>
          </Link>
          <button
            onClick={handleSave}
            disabled={isSaving || !dirty}
            className="flex h-8 items-center gap-1.5 px-3.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? "Sauvegarde..." : "Enregistrer"}</span>
          </button>
          {formStatus !== "PUBLISHED" && (
            <button
              onClick={handlePublish}
              disabled={isSaving}
              className="flex h-8 items-center gap-1.5 px-3.5 rounded-xl bg-emerald-500 text-xs font-bold text-white shadow hover:bg-emerald-600 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Publier</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      {previewMode === "edit" ? (
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PALETTE (Fields Library) */}
          <aside className="w-64 border-r border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-4 overflow-y-auto shrink-0 hidden md:block space-y-5 pb-44">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Bibliothèque de Champs</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Cliquez sur un élément pour l&apos;ajouter à l&apos;étape active.</p>
            </div>

            {FIELD_PALETTE.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <span className="text-xs font-bold text-[var(--text-muted)] tracking-wider block uppercase">
                  {cat.category}
                </span>
                <div className="grid grid-cols-1 gap-1">
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        onClick={() => handleAddField(item.type, item.label)}
                        className="flex items-center gap-2.5 p-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 hover:bg-emerald-500/15 hover:border-[var(--input-border-hover)] text-left transition-all cursor-pointer group"
                      >
                        <div className="h-7 w-7 rounded-lg bg-[var(--surface-raised)]/50 group-hover:bg-emerald-600 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] flex items-center justify-center shrink-0 transition-colors">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-primary)] block truncate">
                            {item.label}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] block truncate">{item.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          {/* CENTER CANVAS (Form Preview & Step Navigation) */}
          <main className="flex-1 overflow-y-auto os-scroll [overscroll-behavior:contain] p-4 sm:p-6 lg:p-8 pb-44 md:pb-44 bg-[var(--surface-raised)]/40 flex flex-col items-center">
            <div className="w-full max-w-2xl space-y-5">
              {/* Multi-step Header Navigation */}
              <div className="flex items-center justify-between gap-2 border-b border-[var(--panel-border)] pb-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {sections.map((sec, idx) => (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSectionId(sec.id)}
                      className={cn(
                        "h-8 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                        activeSectionId === sec.id
                          ? "bg-emerald-500 text-white shadow"
                          : "bg-[var(--surface-raised)]/50 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
                      )}
                    >
                      <span className="h-4 w-4 rounded-full bg-[var(--surface-raised)]/40 flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      <span>{sec.title}</span>
                    </button>
                  ))}
                  <button
                    onClick={handleAddSection}
                    className="h-8 px-2.5 rounded-xl border border-dashed border-[var(--input-border-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--input-border-hover)] text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Étape</span>
                  </button>
                </div>
              </div>

              {/* Active Step Card */}
              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4">
                <div className="border-b border-[var(--panel-border)] pb-3">
                  <input
                    type="text"
                    value={sections.find((s) => s.id === activeSectionId)?.title || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSections((prev) =>
                        prev.map((s) => (s.id === activeSectionId ? { ...s, title: val } : s))
                      );
                    }}
                    placeholder="Titre de l'étape..."
                    className="text-base font-bold text-[var(--text-primary)] bg-transparent outline-none w-full border-b border-transparent hover:border-[var(--input-border-hover)] focus:border-[var(--input-border-hover)]"
                  />
                  <input
                    type="text"
                    value={sections.find((s) => s.id === activeSectionId)?.description || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSections((prev) =>
                        prev.map((s) => (s.id === activeSectionId ? { ...s, description: val } : s))
                      );
                    }}
                    placeholder="Sous-titre ou consignes de l'étape..."
                    className="text-sm text-[var(--text-muted)] bg-transparent outline-none w-full mt-1"
                  />
                </div>

                {/* Fields List */}
                {currentSectionFields.length === 0 ? (
                  <div className="py-12 border border-dashed border-[var(--panel-border)] rounded-2xl text-center space-y-2">
                    <p className="text-xs text-[var(--text-muted)]">Aucun champ dans cette étape.</p>
                    <p className="text-xs text-[var(--text-muted)]">Cliquez sur la palette à gauche pour ajouter votre premier champ.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentSectionFields.map((field, index) => {
                      const isSelected = selectedFieldId === field.id;
                      return (
                        <div
                          key={field.id}
                          onClick={() => setSelectedFieldId(field.id)}
                          className={cn(
                            "rounded-2xl border p-4 transition-all cursor-pointer relative group",
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40 "
                              : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 hover:border-[var(--input-border-hover)] hover:bg-[var(--surface-raised)]/70"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="cursor-grab text-[var(--text-muted)] group-hover:text-[var(--text-muted)]">
                                <GripVertical className="h-4 w-4" />
                              </span>
                              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
                                <span>{field.label}</span>
                                {field.required && <span className="text-rose-400 font-bold">*</span>}
                              </span>
                            </div>

                            {/* Action mini bar */}
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveField(index, "up");
                                }}
                                disabled={index === 0}
                                className="h-6 w-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveField(index, "down");
                                }}
                                disabled={index === currentSectionFields.length - 1}
                                className="h-6 w-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateField(field);
                                }}
                                className="h-6 w-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteField(field.id);
                                }}
                                className="h-6 w-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {field.description && (
                            <p className="text-xs text-[var(--text-muted)] mb-2 pl-6">{field.description}</p>
                          )}

                          {/* Interactive Mock Input */}
                          <div className="pl-6">
                            {field.type === "SHORT_TEXT" && (
                              <input
                                type="text"
                                disabled
                                placeholder={field.placeholder || "Réponse courte..."}
                                className="h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--text-muted)]"
                              />
                            )}
                            {field.type === "LONG_TEXT" && (
                              <textarea
                                disabled
                                rows={2}
                                placeholder={field.placeholder || "Réponse détaillée..."}
                                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2.5 text-sm text-[var(--text-muted)] resize-none"
                              />
                            )}
                            {field.type === "NUMBER" && (
                              <input
                                type="number"
                                disabled
                                placeholder={field.placeholder || "0"}
                                className="h-9 w-36 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--text-muted)]"
                              />
                            )}
                            {field.type === "YES_NO" && (
                              <div className="flex gap-2">
                                <span className="px-3 py-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 text-xs text-[var(--text-muted)]">
                                  Oui
                                </span>
                                <span className="px-3 py-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 text-xs text-[var(--text-muted)]">
                                  Non
                                </span>
                              </div>
                            )}
                            {field.type === "SELECT" && (
                              <select
                                disabled
                                className="h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--text-muted)]"
                              >
                                <option>{field.placeholder || "Choisir une option..."}</option>
                                {field.options.map((o) => (
                                  <option key={o.id}>{o.label}</option>
                                ))}
                              </select>
                            )}
                            {field.type === "RATING" && (
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} className="h-5 w-5 text-amber-400 fill-amber-400/20" />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* RIGHT SIDEBAR (Field Settings & Logic) */}
          <aside className="w-72 border-l border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-4 overflow-y-auto shrink-0 hidden lg:block space-y-4 pb-44">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Configuration</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Propriétés et règles du champ sélectionné.</p>
            </div>

            {selectedField ? (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">Intitulé de la question *</label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFields((prev) =>
                        prev.map((f) => (f.id === selectedField.id ? { ...f, label: val } : f))
                      );
                    }}
                    className="h-8 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--input-border-hover)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">Description / Aide</label>
                  <textarea
                    rows={2}
                    value={selectedField.description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFields((prev) =>
                        prev.map((f) => (f.id === selectedField.id ? { ...f, description: val } : f))
                      );
                    }}
                    placeholder="Précisez les attentes..."
                    className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--input-border-hover)] resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">Placeholder</label>
                  <input
                    type="text"
                    value={selectedField.placeholder}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFields((prev) =>
                        prev.map((f) => (f.id === selectedField.id ? { ...f, placeholder: val } : f))
                      );
                    }}
                    placeholder="Ex: 18, Mon serveur..."
                    className="h-8 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--input-border-hover)]"
                  />
                </div>

                {/* Required Toggle */}
                <label className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 cursor-pointer">
                  <span className="font-semibold text-[var(--text-primary)]">Champ obligatoire</span>
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFields((prev) =>
                        prev.map((f) => (f.id === selectedField.id ? { ...f, required: checked } : f))
                      );
                    }}
                    className="rounded border-[var(--input-border)] accent-emerald-500 h-4 w-4 cursor-pointer"
                  />
                </label>

                {/* Options Editor (if has options) */}
                {selectedField.options.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[var(--panel-border)]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--text-primary)]">Choix &amp; Points</span>
                      <button
                        onClick={() => {
                          const newOpt: FormOption = {
                            id: `opt-${Date.now().toString(36)}`,
                            label: `Option ${selectedField.options.length + 1}`,
                            value: `val_${selectedField.options.length + 1}`,
                            points: 10,
                          };
                          setFields((prev) =>
                            prev.map((f) =>
                              f.id === selectedField.id
                                ? { ...f, options: [...f.options, newOpt] }
                                : f
                            )
                          );
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                      >
                        + Ajouter
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {selectedField.options.map((opt, oIdx) => (
                        <div key={opt.id} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFields((prev) =>
                                prev.map((f) =>
                                  f.id === selectedField.id
                                    ? {
                                        ...f,
                                        options: f.options.map((o, idx) =>
                                          idx === oIdx ? { ...o, label: val } : o
                                        ),
                                      }
                                    : f
                                )
                              );
                            }}
                            className="h-7 flex-1 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-sm text-[var(--text-primary)] outline-none"
                          />
                          <input
                            type="number"
                            title="Points attribués"
                            value={opt.points}
                            onChange={(e) => {
                              const pts = Number(e.target.value);
                              setFields((prev) =>
                                prev.map((f) =>
                                  f.id === selectedField.id
                                    ? {
                                        ...f,
                                        options: f.options.map((o, idx) =>
                                          idx === oIdx ? { ...o, points: pts } : o
                                        ),
                                      }
                                    : f
                                )
                              );
                            }}
                            className="h-7 w-12 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-1 text-sm text-amber-300 outline-none text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] py-8 text-center">Sélectionnez un champ sur le canevas pour modifier ses options.</p>
            )}
          </aside>
        </div>
      ) : (
        /* LIVE PREVIEW CANVAS (Desktop, Mobile, Discord Modal) */
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start bg-[var(--bg-surface-elevated)]">
          <div
            className={cn(
              "w-full transition-all duration-200",
              previewMode === "desktop" && "max-w-2xl rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 sm:p-8 ",
              previewMode === "mobile" && "max-w-sm rounded-[40px] border-4 border-[var(--panel-border)] bg-[var(--bg-main)] p-6 space-y-4",
              previewMode === "discord" && "max-w-md rounded-2xl border border-emerald-500/40 bg-[#313338] p-5 text-white"
            )}
          >
            {/* Discord Header */}
            {previewMode === "discord" && (
              <div className="border-b border-[var(--panel-border)] pb-3 mb-4">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">Modal Discord</span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{formTitle}</h3>
              </div>
            )}

            {/* Web Header */}
            {previewMode !== "discord" && (
              <div className="border-b border-[var(--panel-border)] pb-4 mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🛡️</span>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">{formTitle}</h2>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{formDescription}</p>
              </div>
            )}

            {/* Render Fields */}
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.id} className="space-y-1.5 text-xs">
                  <label className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
                    <span>{f.label}</span>
                    {f.required && <span className="text-rose-400">*</span>}
                  </label>
                  {f.description && <p className="text-xs text-[var(--text-muted)]">{f.description}</p>}

                  {f.type === "SHORT_TEXT" && (
                    <input
                      type="text"
                      placeholder={f.placeholder || "Votre réponse..."}
                      className="h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--input-border-hover)]"
                    />
                  )}
                  {f.type === "LONG_TEXT" && (
                    <textarea
                      rows={3}
                      placeholder={f.placeholder || "Votre réponse détaillée..."}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] p-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--input-border-hover)] resize-none"
                    />
                  )}
                  {f.type === "NUMBER" && (
                    <input
                      type="number"
                      placeholder={f.placeholder || "0"}
                      className="h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--input-border-hover)]"
                    />
                  )}
                  {f.type === "SELECT" && (
                    <select className="h-9 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--text-muted)] outline-none focus:border-[var(--input-border-hover)]">
                      <option>{f.placeholder || "Sélectionnez..."}</option>
                      {f.options.map((o) => (
                        <option key={o.id}>{o.label}</option>
                      ))}
                    </select>
                  )}
                  {f.type === "YES_NO" && (
                    <div className="flex gap-2 pt-1">
                      <button className="flex-1 h-8 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-raised)]">
                        Oui
                      </button>
                      <button className="flex-1 h-8 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-raised)]">
                        Non
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--panel-border)] flex justify-end">
              <button
                type="button"
                disabled
                title="Aperçu seulement — les membres répondent via le panneau Discord ou le portail web"
                className="h-9 px-4 rounded-xl bg-emerald-500/60 text-xs font-bold text-[var(--text-primary)] shadow cursor-not-allowed"
              >
                Envoyer (aperçu)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
