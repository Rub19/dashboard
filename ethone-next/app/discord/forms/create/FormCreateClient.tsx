"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface TemplateField {
  type: string;
  label: string;
  required: boolean;
  description?: string;
  options?: { label: string; value: string; points?: number }[];
}

// Templates are expanded client-side into real FormField objects (see
// discord-bot/src/modules/forms/types) and POSTed to the bot.
const TEMPLATES: { id: string; title: string; category: string; description: string; icon: string; fields: TemplateField[] }[] = [
  { id: "blank", title: "Formulaire vierge", category: "Personnalisé", description: "Pars d'une page blanche.", icon: "📄", fields: [] },
  {
    id: "staff", title: "Candidature Staff / Modérateur", category: "Staff & Modération", description: "Âge, expérience, disponibilités et motivations.", icon: "🛡️",
    fields: [
      { type: "NUMBER", label: "Quel est ton âge ?", required: true },
      { type: "YES_NO", label: "As-tu déjà été modérateur ?", required: true, options: [{ label: "Oui", value: "yes", points: 25 }, { label: "Non", value: "no", points: 5 }] },
      { type: "LONG_TEXT", label: "Décris ton expérience passée", required: false },
      { type: "SELECT", label: "Heures disponibles par semaine", required: true, options: [{ label: "< 5h", value: "lt5", points: 5 }, { label: "5–15h", value: "5_15", points: 15 }, { label: "15–25h", value: "15_25", points: 25 }, { label: "> 25h", value: "gt25", points: 30 }] },
      { type: "LONG_TEXT", label: "Tes motivations", required: true },
    ],
  },
  {
    id: "partner", title: "Demande de partenariat", category: "Partenariats", description: "Nom du serveur, invitation permanente, nombre de membres.", icon: "🤝",
    fields: [
      { type: "SHORT_TEXT", label: "Nom du serveur Discord", required: true },
      { type: "NUMBER", label: "Nombre de membres actifs", required: true },
      { type: "URL", label: "Lien d'invitation permanent", required: true },
      { type: "LONG_TEXT", label: "Proposition d'alliance ou d'événement", required: true },
    ],
  },
  {
    id: "whitelist", title: "Whitelist & recrutement VIP", category: "Whitelist", description: "Pseudo en jeu, acceptation des règles, présentation.", icon: "🔑",
    fields: [
      { type: "SHORT_TEXT", label: "Pseudo en jeu", required: true },
      { type: "YES_NO", label: "As-tu lu et accepté les règles ?", required: true, options: [{ label: "Oui", value: "yes", points: 10 }, { label: "Non", value: "no", points: 0 }] },
      { type: "LONG_TEXT", label: "Présentation de ton personnage / background", required: true },
    ],
  },
  {
    id: "support", title: "Demande de support technique", category: "Helpdesk", description: "Catégorie du bug, résumé, étapes pour reproduire.", icon: "🛠️",
    fields: [
      { type: "SELECT", label: "Catégorie du problème", required: true, options: [{ label: "Bot", value: "bot" }, { label: "Salons / permissions", value: "channels" }, { label: "Autre", value: "other" }] },
      { type: "SHORT_TEXT", label: "Résumé du problème", required: true },
      { type: "LONG_TEXT", label: "Étapes pour reproduire", required: true },
      { type: "URL", label: "Lien vers une capture / logs", required: false },
    ],
  },
  {
    id: "feedback", title: "Sondage & feedback communautaire", category: "Communauté", description: "Note globale, activité préférée, suggestions.", icon: "⭐",
    fields: [
      { type: "RATING", label: "Ta note globale sur le serveur (1 à 5)", required: true },
      { type: "SELECT", label: "Quelle activité préfères-tu ?", required: true, options: [{ label: "Événements", value: "events" }, { label: "Vocal", value: "voice" }, { label: "Discussions", value: "chat" }] },
      { type: "LONG_TEXT", label: "Qu'aimerais-tu voir ajouté ?", required: false },
    ],
  },
];

function expandFields(fields: TemplateField[]) {
  return fields.map((f, i) => ({
    id: `f-${Date.now().toString(36)}-${i}`,
    type: f.type,
    label: f.label,
    description: f.description || "",
    placeholder: "",
    required: f.required,
    options: (f.options || []).map((o, j) => ({ id: `opt-${i}-${j}`, label: o.label, value: o.value, points: o.points || 0 })),
    allowedFileTypes: [],
    maxFileSizeMb: 10,
    sectionId: "sec-1",
    order: i,
  }));
}

export default function FormCreateClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawGuildId = searchParams.get("guildId");
  const defaultTemplate = searchParams.get("template") || "blank";
  const { profile } = useDiscordOAuth();
  const { success, error: showError } = useToast();

  const activeGuild = useMemo(() => {
    if (rawGuildId && profile?.guilds) {
      return profile.guilds.find((g) => g.id === rawGuildId) || profile.guilds[0];
    }
    return profile?.guilds?.[0] || null;
  }, [rawGuildId, profile?.guilds]);
  const guildId = activeGuild?.id || rawGuildId || "";
  const isRealGuild = Boolean(BOT_API_URL) && Boolean(guildId);

  const [selectedTemplate, setSelectedTemplate] = useState<string>(defaultTemplate);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Staff & Modération");
  const [formDescription, setFormDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeTmpl = useMemo(() => TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0], [selectedTemplate]);

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

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      showError("Titre requis", "Donne un titre à ton formulaire.");
      return;
    }
    if (!isRealGuild) {
      showError("Serveur requis", "Connecte un serveur avec le bot pour créer un formulaire.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/forms`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          category: formCategory.trim() || "Général",
          sections: [{ id: "sec-1", title: "Informations générales", description: "", order: 0 }],
          fields: expandFields(activeTmpl.fields),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.form?.id) throw new Error(data?.error || "create failed");
      success("Formulaire créé", `« ${data.form.title} » est en brouillon — configure ses champs.`);
      router.push(`/discord/forms/${data.form.id}?guildId=${guildId}`);
    } catch (e: any) {
      showError("Création impossible", e?.message || "Le bot n'a pas répondu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-white p-4 sm:p-6 lg:p-8 pb-44 md:pb-44 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 border-b border-[var(--panel-border)] pb-4">
        <Link href={`/discord/forms?guildId=${guildId}`} className="flex h-9 w-9 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Nouveau formulaire</h1>
          <p className="text-xs text-zinc-400">Choisis un modèle, il sera créé en brouillon sur le bot puis ouvert dans le builder.{!isRealGuild && <span className="text-amber-400"> Connecte un serveur d'abord.</span>}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">1. Point de départ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate === tmpl.id;
            return (
              <div key={tmpl.id} onClick={() => handleSelectTemplate(tmpl.id)} className={cn("rounded-2xl border p-4 cursor-pointer transition-all duration-150 flex flex-col justify-between", isSelected ? "border-indigo-500 bg-indigo-500/10 shadow-sm ring-1 ring-indigo-500/50" : "border-[var(--panel-border)] bg-white/[0.02] hover:border-[var(--input-border-hover)] hover:bg-white/[0.04]")}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{tmpl.icon}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-400 fill-indigo-400/20" />}
                  </div>
                  <h3 className="text-sm font-bold text-white">{tmpl.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{tmpl.description}</p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-[var(--panel-border)] flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{tmpl.category}</span>
                  <span>{tmpl.fields.length} champs</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-5 sm:p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">2. Informations de base</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Titre *</label>
            <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex: Candidature Modérateur 2026" className="h-10 w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Catégorie</label>
            <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="Staff & Modération" className="h-10 w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Description publique</label>
          <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} placeholder="Objectif, critères, délai de réponse..." className="w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 p-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 resize-none" />
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--panel-border)]">
          <Link href={`/discord/forms?guildId=${guildId}`} className="h-9 px-4 rounded-[var(--inset-radius)] border border-[var(--panel-border)] text-xs font-semibold text-zinc-300 hover:bg-white/5 flex items-center transition-all cursor-pointer">Annuler</Link>
          <button onClick={handleCreate} disabled={isSubmitting || !formTitle.trim()} className="h-9 px-5 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95">
            <span>{isSubmitting ? "Création..." : "Créer et ouvrir le builder"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
