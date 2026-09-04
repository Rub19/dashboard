"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Shield,
  Layers,
  HelpCircle,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    id: "blank",
    title: "Formulaire Vierge",
    category: "Personnalisé",
    description: "Partez d'une page blanche pour construire votre formulaire de A à Z.",
    icon: "📄",
    fields: [],
  },
  {
    id: "staff",
    title: "Candidature Staff / Modérateur",
    category: "Modération",
    description: "Vérification d'âge, expérience antérieure, disponibilités et motivations.",
    icon: "🛡️",
    fields: [
      { id: "f-1", type: "NUMBER", label: "Quel est votre âge ?", required: true },
      { id: "f-2", type: "YES_NO", label: "Avez-vous déjà été modérateur ?", required: true },
      { id: "f-3", type: "LONG_TEXT", label: "Décrivez votre expérience passée", required: false },
      { id: "f-4", type: "SELECT", label: "Heures par semaine disponibles", required: true },
      { id: "f-5", type: "LONG_TEXT", label: "Vos motivations pour le serveur", required: true },
    ],
  },
  {
    id: "partner",
    title: "Demande de Partenariat",
    category: "Partenariats",
    description: "Nom de serveur, lien d'invitation permanent et nombre de membres.",
    icon: "🤝",
    fields: [
      { id: "f-1", type: "SHORT_TEXT", label: "Nom du serveur Discord", required: true },
      { id: "f-2", type: "NUMBER", label: "Nombre de membres actifs", required: true },
      { id: "f-3", type: "URL", label: "Lien d'invitation permanent", required: true },
      { id: "f-4", type: "LONG_TEXT", label: "Proposition d'alliance ou d'événement", required: true },
    ],
  },
  {
    id: "whitelist",
    title: "Whitelist & Recrutement VIP",
    category: "Whitelist",
    description: "Validation de compte, pseudo en jeu et acceptation des règles de la communauté.",
    icon: "🔑",
    fields: [
      { id: "f-1", type: "SHORT_TEXT", label: "Pseudo en jeu (In-Game)", required: true },
      { id: "f-2", type: "DISCORD_USER", label: "Votre compte Discord", required: true },
      { id: "f-3", type: "YES_NO", label: "Avez-vous lu et accepté les règles ?", required: true },
      { id: "f-4", type: "LONG_TEXT", label: "Présentation de votre personnage / background", required: true },
    ],
  },
  {
    id: "support",
    title: "Demande de Support Technique",
    category: "Helpdesk",
    description: "Catégorie de bug, capture d'écran et explication du problème rencontré.",
    icon: "🛠️",
    fields: [
      { id: "f-1", type: "SELECT", label: "Catégorie du problème", required: true },
      { id: "f-2", type: "SHORT_TEXT", label: "Résumé du problème", required: true },
      { id: "f-3", type: "LONG_TEXT", label: "Étapes pour reproduire le bug", required: true },
      { id: "f-4", type: "FILE_UPLOAD", label: "Capture d'écran ou logs", required: false },
    ],
  },
  {
    id: "feedback",
    title: "Sondage & Feedback Communautaire",
    category: "Communauté",
    description: "Note générale, avis sur les animations et suggestions d'améliorations.",
    icon: "⭐",
    fields: [
      { id: "f-1", type: "RATING", label: "Votre note globale sur le serveur (1 à 5)", required: true },
      { id: "f-2", type: "SELECT", label: "Quelle activité préférez-vous ?", required: true },
      { id: "f-3", type: "LONG_TEXT", label: "Qu'aimeriez-vous voir ajouté ?", required: false },
    ],
  },
];

export default function FormCreateClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawGuildId = searchParams.get("guildId");
  const defaultTemplate = searchParams.get("template") || "blank";
  const { success, error: showError } = useToast();

  const [selectedTemplate, setSelectedTemplate] = useState<string>(defaultTemplate);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Staff & Modération");
  const [formDescription, setFormDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeTmpl = useMemo(() => {
    return TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
  }, [selectedTemplate]);

  // Autofill initial title based on template
  const handleSelectTemplate = (tmplId: string) => {
    setSelectedTemplate(tmplId);
    const tmpl = TEMPLATES.find((t) => t.id === tmplId);
    if (tmpl && tmpl.id !== "blank") {
      setFormTitle(tmpl.title);
      setFormCategory(tmpl.category);
      setFormDescription(tmpl.description);
    } else {
      setFormTitle("");
      setFormCategory("Général");
      setFormDescription("");
    }
  };

  const handleCreate = () => {
    if (!formTitle.trim()) {
      showError("Titre requis", "Veuillez donner un titre à votre formulaire.");
      return;
    }

    setIsSubmitting(true);
    const formId = `form-${Date.now().toString(36)}`;
    const guildId = rawGuildId || "123456789012345678";

    const newForm = {
      id: formId,
      guildId,
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory,
      status: "DRAFT" as const,
      version: 1,
      sectionsCount: 1,
      fieldsCount: activeTmpl.fields.length || 1,
      responsesCount: 0,
      pendingCount: 0,
      completionRate: 0,
      updatedAt: new Date().toISOString(),
    };

    // Save to localStorage list
    try {
      const existing = localStorage.getItem(`ethone:forms:${guildId}`);
      const list = existing ? JSON.parse(existing) : [];
      localStorage.setItem(`ethone:forms:${guildId}`, JSON.stringify([newForm, ...list]));
    } catch (e) {
      console.error(e);
    }

    success("Formulaire créé", `Votre formulaire "${newForm.title}" a été initialisé en brouillon.`);
    router.push(`/discord/forms/${formId}?guildId=${guildId}`);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <Link
          href={`/discord/forms?guildId=${rawGuildId || "123456789012345678"}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Nouveau Formulaire</h1>
          <p className="text-xs text-zinc-400">Sélectionnez un modèle ou configurez votre formulaire sur-mesure.</p>
        </div>
      </div>

      {/* Step 1: Template Picker */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">1. Choisissez un point de départ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate === tmpl.id;
            return (
              <div
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl.id)}
                className={cn(
                  "rounded-2xl border p-4 cursor-pointer transition-all duration-150 flex flex-col justify-between",
                  isSelected
                    ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{tmpl.icon}</span>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-indigo-400 fill-indigo-400/20" />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white">{tmpl.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{tmpl.description}</p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{tmpl.category}</span>
                  <span>{tmpl.fields.length} champs</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 2: Form Details */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">2. Informations de base</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Titre du Formulaire *</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Ex: Candidature Modérateur 2026"
              className="h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Catégorie</label>
            <input
              type="text"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              placeholder="Ex: Staff & Modération"
              className="h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Description publique</label>
          <textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            rows={3}
            placeholder="Expliquez l'objectif de ce formulaire, les critères recherchés et le délai de réponse estimé..."
            className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <Link
            href={`/discord/forms?guildId=${rawGuildId || "123456789012345678"}`}
            className="h-9 px-4 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 hover:bg-white/5 flex items-center transition-all cursor-pointer"
          >
            Annuler
          </Link>
          <button
            onClick={handleCreate}
            disabled={isSubmitting || !formTitle.trim()}
            className="h-9 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:to-cyan-500 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <span>Créer et Ouvrir le Builder</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
