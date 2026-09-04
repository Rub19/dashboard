"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  Volume2,
  Users,
  Bell,
  Bot,
  Eye,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  Radio,
  FileText,
  AlertCircle,
  Save,
} from "lucide-react";

interface WizardFormState {
  title: string;
  description: string;
  category: "GAMING" | "TOURNAMENT" | "COMMUNITY" | "STAFF" | "WATCH_PARTY" | "GIVEAWAY" | "MEETING";
  emoji: string;
  imageUrl: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  recurrence: "NONE" | "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  locationType: "VOICE" | "STAGE" | "TEXT" | "EXTERNAL";
  channelName: string;
  externalUrl: string;
  unlimitedCapacity: boolean;
  maxParticipants: number;
  waitlistEnabled: boolean;
  announcementChannel: string;
  mentionType: "NONE" | "HERE" | "EVERYONE" | "ROLE";
  mentionRoleId: string;
  syncToDiscordScheduled: boolean;
  reminders: {
    at24h: boolean;
    at1h: boolean;
    at15m: boolean;
    atStart: boolean;
  };
  automations: {
    createDiscussionThread: boolean;
    assignRoleOnRSVP: boolean;
    roleIdToAssign: string;
    removeRoleAfterEvent: boolean;
  };
}

const DEFAULT_FORM: WizardFormState = {
  title: "",
  description: "",
  category: "GAMING",
  emoji: "🎮",
  imageUrl: "",
  startDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
  startTime: "20:00",
  endDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
  endTime: "23:00",
  timezone: "Europe/Paris",
  recurrence: "NONE",
  locationType: "VOICE",
  channelName: "🎮 Vocal Gaming #1",
  externalUrl: "",
  unlimitedCapacity: true,
  maxParticipants: 20,
  waitlistEnabled: true,
  announcementChannel: "#annonces-evenements",
  mentionType: "HERE",
  mentionRoleId: "",
  syncToDiscordScheduled: true,
  reminders: {
    at24h: true,
    at1h: true,
    at15m: true,
    atStart: true,
  },
  automations: {
    createDiscussionThread: true,
    assignRoleOnRSVP: true,
    roleIdToAssign: "role-event-participant",
    removeRoleAfterEvent: true,
  },
};

const STEPS = [
  { id: 1, title: "Informations", icon: FileText },
  { id: 2, title: "Date & Heure", icon: Clock },
  { id: 3, title: "Lieu Discord", icon: Volume2 },
  { id: 4, title: "Capacité", icon: Users },
  { id: 5, title: "Publication", icon: Radio },
  { id: 6, title: "Rappels", icon: Bell },
  { id: 7, title: "Automatisations", icon: Bot },
  { id: 8, title: "Vérification", icon: CheckCircle2 },
];

export default function EventCreateClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateParam = searchParams.get("template");

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardFormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Template prefill
  useEffect(() => {
    if (templateParam === "tpl-gaming") {
      setForm((prev) => ({
        ...prev,
        title: "Gaming Night Communautaire",
        description: "Soirée jeux entre membres sur Valorant, Minecraft et Lethal Company ! Groupes vocaux automatisés.",
        category: "GAMING",
        emoji: "🎮",
        unlimitedCapacity: false,
        maxParticipants: 25,
      }));
    } else if (templateParam === "tpl-tournament") {
      setForm((prev) => ({
        ...prev,
        title: "Tournoi Compétitif 2v2",
        description: "Tournoi officiel avec bracket, cashprize et points de classement saisonniers.",
        category: "TOURNAMENT",
        emoji: "🏆",
        locationType: "STAGE",
        channelName: "🏆 Scène Tournois",
        unlimitedCapacity: false,
        maxParticipants: 16,
        waitlistEnabled: true,
      }));
    } else if (templateParam === "tpl-meeting") {
      setForm((prev) => ({
        ...prev,
        title: "Session Questions / Réponses & Staff Sync",
        description: "Échange direct avec les responsables du serveur et questions libres des membres.",
        category: "MEETING",
        emoji: "🎙️",
        locationType: "STAGE",
        channelName: "🎙️ Scène Conférences",
        unlimitedCapacity: true,
      }));
    }
  }, [templateParam]);

  const updateForm = (key: keyof WizardFormState, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    // Simulate server POST
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/discord/events");
    }, 1200);
  };

  const handleSaveDraft = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 pb-20 selection:bg-indigo-500/30">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 right-10 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
              <Link href="/discord/events" className="hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour aux Événements
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Assistant de Création d'Événement 2.0
            </h1>
          </div>

          <button
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors self-start sm:self-auto"
          >
            <Save className="w-3.5 h-3.5 text-indigo-400" />
            {saveToast ? "Brouillon Sauvegardé !" : "Sauvegarder Brouillon"}
          </button>
        </div>

        {/* Wizard Stepper */}
        <div className="mb-10 overflow-x-auto pb-3 scrollbar-none">
          <div className="flex items-center justify-between min-w-[700px] relative">
            {/* Progress line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-white/10 z-0" />
            <div
              className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 z-0"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />

            {STEPS.map((s) => {
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;
              const Icon = s.icon;

              return (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  className="relative z-10 flex flex-col items-center group cursor-pointer"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                        : isCurrent
                        ? "bg-purple-600 text-white ring-4 ring-purple-500/20 shadow-lg"
                        : "bg-black/60 border border-white/10 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <span
                    className={`text-[11px] font-semibold mt-2 transition-colors ${
                      isCurrent ? "text-white" : isCompleted ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main 2-column Grid: Form vs Live Discord Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Step Form Area (7 Cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-white/[0.02] border border-white/10 p-6 backdrop-blur-xl shadow-xl">
            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  Informations Générales
                </h2>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Titre de l'événement *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    placeholder="Ex: Soirée Valorant Tournoi 5v5"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Catégorie
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => updateForm("category", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="GAMING">Gaming</option>
                      <option value="TOURNAMENT">Tournoi</option>
                      <option value="COMMUNITY">Communauté</option>
                      <option value="STAFF">Staff</option>
                      <option value="WATCH_PARTY">Watch Party</option>
                      <option value="GIVEAWAY">Tirage / Concours</option>
                      <option value="MEETING">Réunion / Conférence</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Emoji de l'événement
                    </label>
                    <input
                      type="text"
                      value={form.emoji}
                      onChange={(e) => updateForm("emoji", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Description & Programme
                  </label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    placeholder="Expliquez les détails, règles et horaires aux participants..."
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    URL de l'image de couverture (Bannière)
                  </label>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => updateForm("imageUrl", e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Date & Time */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  Date, Heure & Récurrence
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Date de début *
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => updateForm("startDate", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Heure de début *
                    </label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => updateForm("startTime", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Date de fin
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => updateForm("endDate", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Heure de fin
                    </label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => updateForm("endTime", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Fréquence de Récurrence
                  </label>
                  <select
                    value={form.recurrence}
                    onChange={(e) => updateForm("recurrence", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white"
                  >
                    <option value="NONE">Événement unique (Pas de récurrence)</option>
                    <option value="WEEKLY">Chaque semaine (Hebdomadaire)</option>
                    <option value="BIWEEKLY">Toutes les deux semaines</option>
                    <option value="MONTHLY">Chaque mois (Mensuel)</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 3: Location */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-indigo-400" />
                  Lieu sur Discord
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "VOICE", label: "Canal Vocal", icon: Volume2 },
                    { id: "STAGE", label: "Scène Conférence", icon: Radio },
                    { id: "TEXT", label: "Salon Textuel", icon: FileText },
                    { id: "EXTERNAL", label: "Lien Externe (Twitch...)", icon: Eye },
                  ].map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => updateForm("locationType", loc.id)}
                      className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        form.locationType === loc.id
                          ? "bg-indigo-500/20 border-indigo-500 text-white"
                          : "bg-black/30 border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      <loc.icon className="w-5 h-5 text-indigo-400" />
                      <span className="text-xs font-bold">{loc.label}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nom ou Sélecteur de Salon Discord
                  </label>
                  <input
                    type="text"
                    value={form.channelName}
                    onChange={(e) => updateForm("channelName", e.target.value)}
                    placeholder="Ex: 🎮 Vocal Gaming #1"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: Capacity */}
            {step === 4 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Capacité & Inscriptions
                </h2>

                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Capacité Illimitée</span>
                      <span className="text-[11px] text-slate-400">Tout le monde peut s'inscrire sans restriction</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.unlimitedCapacity}
                      onChange={(e) => updateForm("unlimitedCapacity", e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-500 focus:ring-0"
                    />
                  </div>

                  {!form.unlimitedCapacity && (
                    <div className="pt-3 border-t border-white/5">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Nombre Maximum de Participants
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="500"
                        value={form.maxParticipants}
                        onChange={(e) => updateForm("maxParticipants", parseInt(e.target.value, 10))}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-sm text-white"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div>
                      <span className="text-xs font-bold text-white block">Liste d'Attente Automatique</span>
                      <span className="text-[11px] text-slate-400">Si complet, place les nouveaux inscrits en file d'attente</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.waitlistEnabled}
                      onChange={(e) => updateForm("waitlistEnabled", e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-500 focus:ring-0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Publishing & Sync */}
            {step === 5 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-indigo-400" />
                  Publication Discord & Annonces
                </h2>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Salon d'Annonce de l'Événement
                  </label>
                  <input
                    type="text"
                    value={form.announcementChannel}
                    onChange={(e) => updateForm("announcementChannel", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mention lors de l'annonce
                  </label>
                  <select
                    value={form.mentionType}
                    onChange={(e) => updateForm("mentionType", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white"
                  >
                    <option value="NONE">Aucune mention</option>
                    <option value="HERE">@here (Membres connectés)</option>
                    <option value="EVERYONE">@everyone (Tout le serveur)</option>
                    <option value="ROLE">Rôle spécifique</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Synchronisation Discord Événement Natif</span>
                    <span className="text-[11px] text-indigo-300/80">Créera automatiquement l'événement officiel en tête de liste des salons</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.syncToDiscordScheduled}
                    onChange={(e) => updateForm("syncToDiscordScheduled", e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* STEP 6: Notifications & Reminders */}
            {step === 6 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-400" />
                  Rappels & Notifications Automatisés
                </h2>

                <p className="text-xs text-slate-400">
                  Le bot enverra un rappel automatique dans le salon d'annonce et/ou par message privé aux membres inscrits :
                </p>

                <div className="space-y-3">
                  {[
                    { key: "at24h", label: "24 Heures avant l'événement", sub: "Rappel J-1 pour confirmer les présences" },
                    { key: "at1h", label: "1 Heure avant l'événement", sub: "Alerte de préparation et de pointage" },
                    { key: "at15m", label: "15 Minutes avant l'événement", sub: "Lien direct d'accès au canal vocal" },
                    { key: "atStart", label: "Au démarrage exact", sub: "Notification 'L’événement commence maintenant !'" },
                  ].map((r) => (
                    <div
                      key={r.key}
                      className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">{r.label}</span>
                        <span className="text-[11px] text-slate-400">{r.sub}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={(form.reminders as any)[r.key]}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            reminders: { ...prev.reminders, [r.key]: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded text-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 7: Automations */}
            {step === 7 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-400" />
                  Automatisations & Rôles
                </h2>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Fil de discussion dédié</span>
                      <span className="text-[11px] text-slate-400">Créer un thread automatique sous l'annonce pour les questions</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.automations.createDiscussionThread}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          automations: { ...prev.automations, createDiscussionThread: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded text-indigo-500"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Rôle temporaire d'inscrit</span>
                      <span className="text-[11px] text-slate-400">Attribue automatiquement un rôle Discord lors du RSVP 'Going'</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.automations.assignRoleOnRSVP}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          automations: { ...prev.automations, assignRoleOnRSVP: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded text-indigo-500"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Nettoyage après l'événement</span>
                      <span className="text-[11px] text-slate-400">Retirer automatiquement le rôle temporaire une fois l'événement terminé</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.automations.removeRoleAfterEvent}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          automations: { ...prev.automations, removeRoleAfterEvent: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded text-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 8: Review & Publish */}
            {step === 8 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Vérification Finale
                </h2>

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  ✅ Votre événement est prêt à être programmé. Le bot ETHONE publiera l'encart interactif dans {form.announcementChannel}.
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs p-4 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <span className="text-slate-500 block">Titre</span>
                    <span className="text-white font-semibold">{form.emoji} {form.title || "Sans titre"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date</span>
                    <span className="text-white font-semibold">{form.startDate} à {form.startTime}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Lieu</span>
                    <span className="text-white font-semibold">{form.channelName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Capacité</span>
                    <span className="text-white font-semibold">{form.unlimitedCapacity ? "Illimitée" : `${form.maxParticipants} max`}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Form Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/10">
              <button
                type="button"
                disabled={step === 1}
                onClick={() => setStep((s) => s - 1)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${
                  step === 1
                    ? "opacity-30 cursor-not-allowed text-slate-500"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Précédent
              </button>

              {step < 8 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                >
                  Suivant
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePublish}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/25"
                >
                  {isSubmitting ? "Publication en cours..." : "Publier l'Événement"}
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right Area (5 Cols): Live Discord Embed Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                Aperçu Discord Interactif
              </span>
              <span className="text-[11px] text-slate-500">Mise à jour en temps réel</span>
            </div>

            {/* Discord Embed Mockup */}
            <div className="p-4 rounded-2xl bg-[#1e1f22] border-l-4 border-indigo-500 shadow-2xl font-sans">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-indigo-400">ETHONE Bot</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#5865F2] text-white font-bold">BOT</span>
              </div>

              <h4 className="text-base font-bold text-white mb-2">
                {form.emoji} {form.title || "Titre de votre événement"}
              </h4>

              <p className="text-xs text-slate-300 mb-4 whitespace-pre-wrap">
                {form.description || "Description de l'événement..."}
              </p>

              {form.imageUrl && (
                <div className="rounded-lg overflow-hidden mb-4 max-h-48">
                  <img src={form.imageUrl} alt="cover" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-black/30 text-xs mb-4">
                <div>
                  <span className="text-slate-400 block text-[11px]">📅 Date</span>
                  <span className="text-white font-semibold">
                    {form.startDate} à {form.startTime}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">📍 Lieu</span>
                  <span className="text-white font-semibold">{form.channelName}</span>
                </div>
              </div>

              {/* Action Buttons Mockup */}
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <button type="button" className="py-1.5 px-2 rounded bg-[#248046] text-white text-[11px] font-semibold text-center">
                    ✅ Participer
                  </button>
                  <button type="button" className="py-1.5 px-2 rounded bg-[#4e5058] text-white text-[11px] font-semibold text-center">
                    🤔 Peut-être
                  </button>
                  <button type="button" className="py-1.5 px-2 rounded bg-[#da373c] text-white text-[11px] font-semibold text-center">
                    ❌ Refuser
                  </button>
                </div>
                <button type="button" className="w-full py-1.5 px-2 rounded bg-[#5865f2] text-white text-[11px] font-semibold text-center">
                  🎟️ Pointage / Check-in
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
