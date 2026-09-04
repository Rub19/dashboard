"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  GripVertical,
  CheckCircle2,
  Settings,
  Eye,
  Smartphone,
  Monitor,
  Sparkles,
  Layers,
  ArrowLeft,
  Save,
  HelpCircle,
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
  Split,
  Undo2,
  Redo2,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

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
  { id: "sec-1", title: "Étape 1 : Identité & Profil", description: "Informations de base" },
  { id: "sec-2", title: "Étape 2 : Compétences & Motivations", description: "Détaillez vos aptitudes" },
];

const DEFAULT_FIELDS: BuilderField[] = [
  {
    id: "f-age",
    type: "NUMBER",
    label: "Quel est votre âge ?",
    description: "Âge minimum requis : 16 ans",
    placeholder: "18",
    required: true,
    min: 14,
    max: 99,
    options: [],
    sectionId: "sec-1",
  },
  {
    id: "f-exp",
    type: "YES_NO",
    label: "Avez-vous déjà été modérateur sur un serveur Discord ?",
    description: "Expérience préalable sur un serveur de plus de 500 membres",
    placeholder: "",
    required: true,
    options: [
      { id: "opt-1", label: "Oui", value: "yes", points: 25 },
      { id: "opt-2", label: "Non", value: "no", points: 5 },
    ],
    sectionId: "sec-1",
  },
  {
    id: "f-exp-desc",
    type: "LONG_TEXT",
    label: "Décrivez votre expérience passée",
    description: "Précisez les types de serveurs et outils utilisés",
    placeholder: "J'ai modéré le serveur X pendant 8 mois...",
    required: false,
    minLength: 20,
    maxLength: 1000,
    options: [],
    sectionId: "sec-1",
  },
  {
    id: "f-hours",
    type: "SELECT",
    label: "Disponibilité hebdomadaire",
    description: "Temps moyen que vous pouvez consacrer au staff",
    placeholder: "Sélectionnez une tranche",
    required: true,
    options: [
      { id: "h-1", label: "Moins de 5h / sem", value: "less_5", points: 5 },
      { id: "h-2", label: "5 à 15h / sem", value: "5_15", points: 15 },
      { id: "h-3", label: "15 à 25h / sem", value: "15_25", points: 25 },
      { id: "h-4", label: "Plus de 25h / sem", value: "more_25", points: 30 },
    ],
    sectionId: "sec-2",
  },
  {
    id: "f-motivation",
    type: "LONG_TEXT",
    label: "Quelles sont vos motivations pour rejoindre ETHONE ?",
    description: "Ce que vous pouvez apporter à l'équipe",
    placeholder: "Je souhaite aider les membres et assurer la tranquillité...",
    required: true,
    minLength: 30,
    maxLength: 1500,
    options: [],
    sectionId: "sec-2",
  },
];

export default function FormBuilderClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = (params?.formId as string) || "demo";
  const rawGuildId = searchParams.get("guildId") || "123456789012345678";
  const { success, error: showError } = useToast();

  const [formTitle, setFormTitle] = useState("Candidature Modérateur / Staff 2026");
  const [formDescription, setFormDescription] = useState(
    "Rejoignez notre équipe de modération. Remplissez ce formulaire complet."
  );
  const [sections, setSections] = useState<BuilderSection[]>(DEFAULT_SECTIONS);
  const [activeSectionId, setActiveSectionId] = useState<string>("sec-1");
  const [fields, setFields] = useState<BuilderField[]>(DEFAULT_FIELDS);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>("f-age");
  const [conditions, setConditions] = useState<FormCondition[]>([
    {
      id: "c-1",
      sourceFieldId: "f-exp",
      operator: "EQUALS",
      value: "yes",
      action: "SHOW_FIELD",
    },
  ]);

  // View mode
  const [previewMode, setPreviewMode] = useState<"edit" | "desktop" | "mobile" | "discord">("edit");
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

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

  // Save changes
  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      success("Formulaire sauvegardé", "Toutes les modifications ont été enregistrées localement.");
    }, 400);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Builder Navbar */}
      <header className="h-14 border-b border-white/10 bg-zinc-950/90 backdrop-blur-md px-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/discord/forms?guildId=${rawGuildId}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 hidden sm:inline">Forms &gt;</span>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-white/20 focus:border-indigo-500 outline-none px-1 py-0.5 rounded transition-colors"
            />
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Brouillon v2
            </span>
          </div>
        </div>

        {/* Center: View Switcher */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-0.5 rounded-xl">
          <button
            onClick={() => setPreviewMode("edit")}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              previewMode === "edit" ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
            )}
          >
            <Sliders className="h-3 w-3" />
            <span>Éditeur</span>
          </button>
          <button
            onClick={() => setPreviewMode("desktop")}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              previewMode === "desktop" ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
            )}
          >
            <Monitor className="h-3 w-3" />
            <span className="hidden md:inline">Aperçu Web</span>
          </button>
          <button
            onClick={() => setPreviewMode("mobile")}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              previewMode === "mobile" ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
            )}
          >
            <Smartphone className="h-3 w-3" />
            <span className="hidden md:inline">Mobile</span>
          </button>
          <button
            onClick={() => setPreviewMode("discord")}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              previewMode === "discord" ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
            )}
          >
            <MessageSquare className="h-3 w-3 text-indigo-400" />
            <span className="hidden md:inline">Modal Discord</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/discord/forms/${formId}/settings?guildId=${rawGuildId}`}
            className="flex h-8 items-center gap-1.5 px-3 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Paramètres &amp; Discord</span>
          </Link>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex h-8 items-center gap-1.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-xs font-bold text-white shadow hover:from-indigo-500 hover:to-cyan-500 transition-all cursor-pointer active:scale-95"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? "Sauvegarde..." : "Publier"}</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      {previewMode === "edit" ? (
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PALETTE (Fields Library) */}
          <aside className="w-64 border-r border-white/10 bg-zinc-950/60 p-4 overflow-y-auto shrink-0 hidden md:block space-y-5">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Bibliothèque de Champs</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">Cliquez sur un élément pour l&apos;ajouter à l&apos;étape active.</p>
            </div>

            {FIELD_PALETTE.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-400 tracking-wider block uppercase">
                  {cat.category}
                </span>
                <div className="grid grid-cols-1 gap-1">
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        onClick={() => handleAddField(item.type, item.label)}
                        className="flex items-center gap-2.5 p-2 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-indigo-600/10 hover:border-indigo-500/40 text-left transition-all cursor-pointer group"
                      >
                        <div className="h-7 w-7 rounded-lg bg-white/5 group-hover:bg-indigo-600 text-zinc-400 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-zinc-200 group-hover:text-white block truncate">
                            {item.label}
                          </span>
                          <span className="text-[10px] text-zinc-500 block truncate">{item.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          {/* CENTER CANVAS (Form Preview & Step Navigation) */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-black/50 flex flex-col items-center">
            <div className="w-full max-w-2xl space-y-5">
              {/* Multi-step Header Navigation */}
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {sections.map((sec, idx) => (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSectionId(sec.id)}
                      className={cn(
                        "h-8 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                        activeSectionId === sec.id
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <span className="h-4 w-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{sec.title}</span>
                    </button>
                  ))}
                  <button
                    onClick={handleAddSection}
                    className="h-8 px-2.5 rounded-xl border border-dashed border-white/20 text-zinc-400 hover:text-white hover:border-white/40 text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Étape</span>
                  </button>
                </div>
              </div>

              {/* Active Step Card */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm space-y-4">
                <div className="border-b border-white/5 pb-3">
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
                    className="text-base font-black text-white bg-transparent outline-none w-full border-b border-transparent hover:border-white/20 focus:border-indigo-500"
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
                    className="text-xs text-zinc-400 bg-transparent outline-none w-full mt-1"
                  />
                </div>

                {/* Fields List */}
                {currentSectionFields.length === 0 ? (
                  <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center space-y-2">
                    <p className="text-xs text-zinc-400">Aucun champ dans cette étape.</p>
                    <p className="text-[11px] text-zinc-500">Cliquez sur la palette à gauche pour ajouter votre premier champ.</p>
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
                              ? "border-indigo-500 bg-indigo-500/[0.08] ring-1 ring-indigo-500/40 shadow-md"
                              : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.03]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="cursor-grab text-zinc-600 group-hover:text-zinc-400">
                                <GripVertical className="h-4 w-4" />
                              </span>
                              <span className="text-xs font-bold text-white flex items-center gap-1">
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
                                className="h-6 w-6 flex items-center justify-center rounded text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveField(index, "down");
                                }}
                                disabled={index === currentSectionFields.length - 1}
                                className="h-6 w-6 flex items-center justify-center rounded text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateField(field);
                                }}
                                className="h-6 w-6 flex items-center justify-center rounded text-zinc-400 hover:text-white cursor-pointer"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteField(field.id);
                                }}
                                className="h-6 w-6 flex items-center justify-center rounded text-zinc-400 hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {field.description && (
                            <p className="text-[11px] text-zinc-400 mb-2 pl-6">{field.description}</p>
                          )}

                          {/* Interactive Mock Input */}
                          <div className="pl-6">
                            {field.type === "SHORT_TEXT" && (
                              <input
                                type="text"
                                disabled
                                placeholder={field.placeholder || "Réponse courte..."}
                                className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-zinc-400"
                              />
                            )}
                            {field.type === "LONG_TEXT" && (
                              <textarea
                                disabled
                                rows={2}
                                placeholder={field.placeholder || "Réponse détaillée..."}
                                className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-zinc-400 resize-none"
                              />
                            )}
                            {field.type === "NUMBER" && (
                              <input
                                type="number"
                                disabled
                                placeholder={field.placeholder || "0"}
                                className="h-9 w-36 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-zinc-400"
                              />
                            )}
                            {field.type === "YES_NO" && (
                              <div className="flex gap-2">
                                <span className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-300">
                                  Oui
                                </span>
                                <span className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-300">
                                  Non
                                </span>
                              </div>
                            )}
                            {field.type === "SELECT" && (
                              <select
                                disabled
                                className="h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-zinc-400"
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
          <aside className="w-72 border-l border-white/10 bg-zinc-950/60 p-4 overflow-y-auto shrink-0 hidden lg:block space-y-4">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Configuration</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">Propriétés et règles du champ sélectionné.</p>
            </div>

            {selectedField ? (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-300">Intitulé de la question *</label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFields((prev) =>
                        prev.map((f) => (f.id === selectedField.id ? { ...f, label: val } : f))
                      );
                    }}
                    className="h-8 w-full rounded-xl border border-white/10 bg-zinc-900 px-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-300">Description / Aide</label>
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
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2 text-xs text-white outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-300">Placeholder</label>
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
                    className="h-8 w-full rounded-xl border border-white/10 bg-zinc-900 px-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Required Toggle */}
                <label className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer">
                  <span className="font-semibold text-zinc-200">Champ obligatoire</span>
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFields((prev) =>
                        prev.map((f) => (f.id === selectedField.id ? { ...f, required: checked } : f))
                      );
                    }}
                    className="rounded border-zinc-700 accent-indigo-500 h-4 w-4 cursor-pointer"
                  />
                </label>

                {/* Options Editor (if has options) */}
                {selectedField.options.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">Choix &amp; Points</span>
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
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
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
                            className="h-7 flex-1 rounded-lg border border-white/10 bg-zinc-900 px-2 text-[11px] text-white outline-none"
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
                            className="h-7 w-12 rounded-lg border border-white/10 bg-zinc-900 px-1 text-[11px] text-amber-300 outline-none text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 py-8 text-center">Sélectionnez un champ sur le canevas pour modifier ses options.</p>
            )}
          </aside>
        </div>
      ) : (
        /* LIVE PREVIEW CANVAS (Desktop, Mobile, Discord Modal) */
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start bg-zinc-950">
          <div
            className={cn(
              "w-full transition-all duration-200",
              previewMode === "desktop" && "max-w-2xl rounded-3xl border border-white/10 bg-black/60 p-6 sm:p-8 shadow-2xl backdrop-blur-xl",
              previewMode === "mobile" && "max-w-sm rounded-[40px] border-4 border-zinc-800 bg-black p-6 shadow-2xl space-y-4",
              previewMode === "discord" && "max-w-md rounded-2xl border border-indigo-500/40 bg-[#313338] p-5 shadow-2xl text-white"
            )}
          >
            {/* Discord Header */}
            {previewMode === "discord" && (
              <div className="border-b border-white/10 pb-3 mb-4">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">Modal Discord</span>
                <h3 className="text-base font-bold text-white">{formTitle}</h3>
              </div>
            )}

            {/* Web Header */}
            {previewMode !== "discord" && (
              <div className="border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🛡️</span>
                  <h2 className="text-lg font-bold text-white">{formTitle}</h2>
                </div>
                <p className="text-xs text-zinc-400">{formDescription}</p>
              </div>
            )}

            {/* Render Fields */}
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.id} className="space-y-1.5 text-xs">
                  <label className="font-semibold text-zinc-200 flex items-center gap-1">
                    <span>{f.label}</span>
                    {f.required && <span className="text-rose-400">*</span>}
                  </label>
                  {f.description && <p className="text-[11px] text-zinc-400">{f.description}</p>}

                  {f.type === "SHORT_TEXT" && (
                    <input
                      type="text"
                      placeholder={f.placeholder || "Votre réponse..."}
                      className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900/90 px-3 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  )}
                  {f.type === "LONG_TEXT" && (
                    <textarea
                      rows={3}
                      placeholder={f.placeholder || "Votre réponse détaillée..."}
                      className="w-full rounded-xl border border-white/10 bg-zinc-900/90 p-2.5 text-xs text-white outline-none focus:border-indigo-500 resize-none"
                    />
                  )}
                  {f.type === "NUMBER" && (
                    <input
                      type="number"
                      placeholder={f.placeholder || "0"}
                      className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900/90 px-3 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  )}
                  {f.type === "SELECT" && (
                    <select className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900/90 px-3 text-xs text-zinc-300 outline-none focus:border-indigo-500">
                      <option>{f.placeholder || "Sélectionnez..."}</option>
                      {f.options.map((o) => (
                        <option key={o.id}>{o.label}</option>
                      ))}
                    </select>
                  )}
                  {f.type === "YES_NO" && (
                    <div className="flex gap-2 pt-1">
                      <button className="flex-1 h-8 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300 hover:bg-white/10">
                        Oui
                      </button>
                      <button className="flex-1 h-8 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300 hover:bg-white/10">
                        Non
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => success("Simulation de soumission", "Test de formulaire exécuté sans impacter les analytics réelles.")}
                className="h-9 px-4 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 shadow cursor-pointer active:scale-95"
              >
                Envoyer la candidature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
