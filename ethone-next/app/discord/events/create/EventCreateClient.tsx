"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  Check,
  Volume2,
  Users,
  Bell,
  Bot,
  Eye,
  CheckCircle2,
  Radio,
  FileText,
  Save,
} from "@/components/icons/ph";
import ChannelPicker from "@/components/discord/ChannelPicker";
import RolePicker from "@/components/discord/RolePicker";
import { formatApiError } from "@/lib/format-error";
import { useToast } from "@/components/ToastProvider";
import Select from "@/components/ui/Select";

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
    roleIdToAssign: "",
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

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

function combine(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function EventCreateClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const { error: showError } = useToast();
  const templateParam = searchParams.get("template");
  const guildParam = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);
  const isDemo = !BOT_API_URL || !guildParam;
  const eventsBase = `${BOT_API_URL}/api/guilds/${guildParam}/events`;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardFormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [draftEventId, setDraftEventId] = useState<string | null>(null);

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

  function buildEventPayload(status: "DRAFT" | "SCHEDULED") {
    const reminders = [
      form.reminders.at24h && { id: `rem-24h`, triggerMinutesBefore: 1440, channel: "DISCORD_CHANNEL" as const, executed: false },
      form.reminders.at1h && { id: `rem-1h`, triggerMinutesBefore: 60, channel: "DISCORD_CHANNEL" as const, executed: false },
      form.reminders.at15m && { id: `rem-15m`, triggerMinutesBefore: 15, channel: "DISCORD_CHANNEL" as const, executed: false },
      form.reminders.atStart && { id: `rem-start`, triggerMinutesBefore: 0, channel: "DISCORD_CHANNEL" as const, executed: false },
    ].filter(Boolean);

    const automations = [
      form.automations.createDiscussionThread && {
        id: "auto-thread",
        trigger: "ON_START" as const,
        actions: [{ type: "CREATE_THREAD" as const }],
        enabled: true,
      },
      form.automations.assignRoleOnRSVP && form.automations.roleIdToAssign && {
        id: "auto-assign-role",
        trigger: "ON_RSVP" as const,
        actions: [{ type: "ASSIGN_ROLE" as const, targetId: form.automations.roleIdToAssign }],
        enabled: true,
      },
      form.automations.assignRoleOnRSVP && form.automations.removeRoleAfterEvent && form.automations.roleIdToAssign && {
        id: "auto-remove-role",
        trigger: "ON_END" as const,
        actions: [{ type: "REMOVE_ROLE" as const, targetId: form.automations.roleIdToAssign }],
        enabled: true,
      },
    ].filter(Boolean);

    return {
      title: form.title,
      description: form.description,
      category: form.category,
      status,
      emoji: form.emoji,
      imageUrl: form.imageUrl || undefined,
      startDate: combine(form.startDate, form.startTime),
      endDate: combine(form.endDate, form.endTime),
      timezone: form.timezone,
      recurrence: form.recurrence === "NONE" ? undefined : { frequency: form.recurrence, endType: "NEVER" as const },
      location: {
        type: form.locationType,
        channelName: form.channelName,
        externalUrl: form.externalUrl || undefined,
      },
      capacity: {
        unlimited: form.unlimitedCapacity,
        maxParticipants: form.maxParticipants,
        waitlistEnabled: form.waitlistEnabled,
      },
      announcementChannel: form.announcementChannel,
      mentionType: form.mentionType,
      mentionRoleId: form.mentionType === "ROLE" ? form.mentionRoleId : undefined,
      eventRoleId: form.automations.assignRoleOnRSVP && form.automations.roleIdToAssign ? form.automations.roleIdToAssign : undefined,
      eventRoleAction: form.automations.assignRoleOnRSVP ? ("ASSIGN_ON_RSVP" as const) : ("NONE" as const),
      removeRoleAfterEvent: form.automations.removeRoleAfterEvent,
      reminders,
      automations,
      syncToDiscord: form.syncToDiscordScheduled,
    };
  }

  async function persistEvent(status: "DRAFT" | "SCHEDULED"): Promise<{ ok: boolean; error?: string }> {
    const payload = buildEventPayload(status);
    try {
      if (draftEventId) {
        const res = await fetch(`${eventsBase}/${draftEventId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (res.ok) return { ok: true };
        return { ok: false, error: data?.error };
      }
      const res = await fetch(eventsBase, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.event?.id) {
        setDraftEventId(data.event.id);
        return { ok: true };
      }
      return { ok: false, error: data?.error };
    } catch (err: any) {
      return { ok: false, error: err?.message };
    }
  }

  const handlePublish = async () => {
    if (!form.title.trim()) {
      setPublishError("Le titre de l'événement est requis.");
      return;
    }
    setPublishError("");
    setIsSubmitting(true);
    if (isDemo) {
      setIsSubmitting(false);
      setPublishError("Bot injoignable : l'événement n'a pas été publié.");
      showError("Publication impossible", "Bot injoignable : l'événement n'a pas été publié.");
      return;
    }
    const result = await persistEvent("SCHEDULED");
    setIsSubmitting(false);
    if (result.ok) {
      router.push("/discord/events");
    } else {
      const message = formatApiError(result.error, "Échec de la publication. Vérifiez les champs et réessayez.");
      setPublishError(message);
      showError("Publication impossible", message);
    }
  };

  const handleSaveDraft = async () => {
    if (isDemo) {
      setPublishError("Bot injoignable : le brouillon n'a pas été enregistré.");
      showError("Enregistrement impossible", "Bot injoignable : le brouillon n'a pas été enregistré.");
      return;
    }
    const result = await persistEvent("DRAFT");
    if (result.ok) {
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    } else {
      const message = formatApiError(result.error, "Échec de l'enregistrement du brouillon.");
      setPublishError(message);
      showError("Enregistrement impossible", message);
    }
  };

  return (
    <div className="pb-8 text-[var(--text-primary)]">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--panel-border)] mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <Link href="/discord/events" className="inline-flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] px-3 text-xs font-semibold normal-case tracking-normal text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour aux Événements
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              Assistant de Création d'Événement
            </h1>
          </div>

          <button
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[var(--text-muted)] transition-colors self-start sm:self-auto"
          >
            <Save className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            {saveToast ? "Brouillon Sauvegardé !" : "Sauvegarder Brouillon"}
          </button>
        </div>

        {/* Wizard Stepper */}
        <div className="mb-10 overflow-x-auto pb-3 scrollbar-none">
          <div className="flex items-center justify-between min-w-[700px] relative">
            {/* Progress line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-[var(--surface-raised)]/80 z-0" />
            <div
              className="absolute top-4 left-0 h-0.5 bg-[var(--accent-primary)] transition-[width] duration-500 ease-[var(--ease-snap)] z-0"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />

            {STEPS.map((s) => {
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;

              return (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  className="relative z-10 flex flex-col items-center group cursor-pointer outline-none"
                >
                  <div
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-[background-color,color,transform] duration-300 group-hover:scale-110 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-[var(--accent-primary)]/50 ${
                      isCompleted
                        ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                        : isCurrent
                        ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                        : "bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-[var(--text-muted)]"
                    }`}
                  >
                    {isCurrent && (
                      <motion.span
                        layoutId="event-step-ring"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="absolute -inset-1.5 rounded-full border-2 border-[var(--accent-primary)]/35"
                      />
                    )}
                    {isCompleted ? <Check className="pop-in w-4 h-4" /> : s.id}
                  </div>
                  <span
                    className={`text-xs font-semibold mt-2 transition-colors ${
                      isCurrent ? "text-[var(--text-primary)]" : isCompleted ? "text-[var(--text-muted)]" : "text-[var(--text-muted)]"
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
          <div className="lg:col-span-7 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] p-6">
            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div className="stagger-children space-y-5">
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[var(--accent-primary)]" />
                  Informations Générales
                </h2>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Titre de l'événement *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    placeholder="Ex: Soirée Valorant Tournoi 5v5"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-border-hover)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Catégorie
                    </label>
                    <Select
                      value={form.category}
                      onChange={(v) => updateForm("category", v)}
                      className="w-full"
                      aria-label="Catégorie"
                      options={[
                        { id: "GAMING", label: "Gaming" },
                        { id: "TOURNAMENT", label: "Tournoi" },
                        { id: "COMMUNITY", label: "Communauté" },
                        { id: "STAFF", label: "Staff" },
                        { id: "WATCH_PARTY", label: "Watch Party" },
                        { id: "GIVEAWAY", label: "Tirage / Concours" },
                        { id: "MEETING", label: "Réunion / Conférence" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Emoji de l'événement
                    </label>
                    <input
                      type="text"
                      value={form.emoji}
                      onChange={(e) => updateForm("emoji", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-border-hover)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Description & Programme
                  </label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    placeholder="Expliquez les détails, règles et horaires aux participants..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-border-hover)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    URL de l'image de couverture (Bannière)
                  </label>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => updateForm("imageUrl", e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-border-hover)]"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Date & Time */}
            {step === 2 && (
              <div className="stagger-children space-y-5">
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[var(--accent-primary)]" />
                  Date, Heure & Récurrence
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Date de début *
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => updateForm("startDate", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Heure de début *
                    </label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => updateForm("startTime", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Date de fin
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => updateForm("endDate", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Heure de fin
                    </label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => updateForm("endTime", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Fréquence de Récurrence
                  </label>
                  <Select
                    value={form.recurrence}
                    onChange={(v) => updateForm("recurrence", v)}
                    className="w-full"
                    aria-label="Fréquence de récurrence"
                    options={[
                      { id: "NONE", label: "Événement unique (Pas de récurrence)" },
                      { id: "WEEKLY", label: "Chaque semaine (Hebdomadaire)" },
                      { id: "BIWEEKLY", label: "Toutes les deux semaines" },
                      { id: "MONTHLY", label: "Chaque mois (Mensuel)" },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Location */}
            {step === 3 && (
              <div className="stagger-children space-y-5">
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-[var(--accent-primary)]" />
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
                          ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--text-primary)]"
                          : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] text-[var(--text-muted)] hover:border-[var(--input-border-hover)]"
                      }`}
                    >
                      <loc.icon className="w-5 h-5 text-[var(--accent-primary)]" />
                      <span className="text-xs font-bold">{loc.label}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Nom ou Sélecteur de Salon Discord
                  </label>
                  {form.locationType === "EXTERNAL" ? (
                    <input
                      type="text"
                      value={form.channelName}
                      onChange={(e) => updateForm("channelName", e.target.value)}
                      placeholder="Ex: Twitch / YouTube / Zoom"
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)]"
                    />
                  ) : (
                    <ChannelPicker
                      value={form.channelName}
                      onChange={(id, ch) => updateForm("channelName", ch ? ch.name : id)}
                      guildId={guildParam}
                      placeholder={form.locationType === "VOICE" ? "Choisir un salon vocal ou saisir un nom..." : "Choisir un salon ou saisir un nom..."}
                      allowClear
                    />
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Capacity */}
            {step === 4 && (
              <div className="stagger-children space-y-5">
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--accent-primary)]" />
                  Capacité & Inscriptions
                </h2>

                <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">Capacité Illimitée</span>
                      <span className="text-xs text-[var(--text-muted)]">Tout le monde peut s'inscrire sans restriction</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.unlimitedCapacity}
                      onChange={(e) => updateForm("unlimitedCapacity", e.target.checked)}
                      className="w-4 h-4 rounded text-[var(--accent-primary)] focus:ring-0"
                    />
                  </div>

                  {!form.unlimitedCapacity && (
                    <div className="pt-3 border-t border-[var(--panel-border)]">
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                        Nombre Maximum de Participants
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="500"
                        value={form.maxParticipants}
                        onChange={(e) => updateForm("maxParticipants", parseInt(e.target.value, 10))}
                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--input-border)] text-sm text-[var(--text-primary)]"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--panel-border)]">
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">Liste d'Attente Automatique</span>
                      <span className="text-xs text-[var(--text-muted)]">Si complet, place les nouveaux inscrits en file d'attente</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.waitlistEnabled}
                      onChange={(e) => updateForm("waitlistEnabled", e.target.checked)}
                      className="w-4 h-4 rounded text-[var(--accent-primary)] focus:ring-0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Publishing & Sync */}
            {step === 5 && (
              <div className="stagger-children space-y-5">
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Radio className="w-5 h-5 text-[var(--accent-primary)]" />
                  Publication Discord & Annonces
                </h2>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Salon d'Annonce de l'Événement
                  </label>
                  <ChannelPicker
                    value={form.announcementChannel}
                    onChange={(id, ch) => updateForm("announcementChannel", ch ? `#${ch.name}` : id)}
                    guildId={guildParam}
                    placeholder="Sélectionner un salon d'annonce ou saisir un ID..."
                    allowClear
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Mention lors de l'annonce
                  </label>
                  <Select
                    value={form.mentionType}
                    onChange={(v) => updateForm("mentionType", v)}
                    className="w-full"
                    aria-label="Mention lors de l'annonce"
                    options={[
                      { id: "NONE", label: "Aucune mention" },
                      { id: "HERE", label: "@here (Membres connectés)" },
                      { id: "EVERYONE", label: "@everyone (Tout le serveur)" },
                      { id: "ROLE", label: "Rôle spécifique" },
                    ]}
                  />
                </div>

                {form.mentionType === "ROLE" && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Rôle à mentionner
                    </label>
                    <RolePicker
                      value={form.mentionRoleId}
                      onChange={(roleId) => updateForm("mentionRoleId", roleId)}
                      guildId={guildParam}
                      placeholder="Sélectionner un rôle à mentionner..."
                      size="sm"
                      allowClear
                    />
                  </div>
                )}

                <div className="p-4 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)] block">Synchronisation Discord Événement Natif</span>
                    <span className="text-xs text-[var(--accent-primary)]/80">Créera automatiquement l'événement officiel en tête de liste des salons</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.syncToDiscordScheduled}
                    onChange={(e) => updateForm("syncToDiscordScheduled", e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--accent-primary)]"
                  />
                </div>
              </div>
            )}

            {/* STEP 6: Notifications & Reminders */}
            {step === 6 && (
              <div className="stagger-children space-y-5">
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[var(--accent-primary)]" />
                  Rappels & Notifications Automatisés
                </h2>

                <p className="text-xs text-[var(--text-muted)]">
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
                      className="p-3.5 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-[var(--text-primary)] block">{r.label}</span>
                        <span className="text-xs text-[var(--text-muted)]">{r.sub}</span>
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
                        className="w-4 h-4 rounded text-[var(--accent-primary)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 7: Automations */}
            {step === 7 && (
              <div className="stagger-children space-y-5">
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[var(--accent-primary)]" />
                  Automatisations & Rôles
                </h2>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">Fil de discussion dédié</span>
                      <span className="text-xs text-[var(--text-muted)]">Créer un thread automatique sous l'annonce pour les questions</span>
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
                      className="w-4 h-4 rounded text-[var(--accent-primary)]"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">Rôle temporaire d'inscrit</span>
                      <span className="text-xs text-[var(--text-muted)]">Attribue automatiquement un rôle Discord lors du RSVP 'Going'</span>
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
                      className="w-4 h-4 rounded text-[var(--accent-primary)]"
                    />
                  </div>

                  {form.automations.assignRoleOnRSVP && (
                    <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-2">
                      <label className="block text-xs font-semibold text-[var(--text-muted)]">
                        Rôle à attribuer aux participants
                      </label>
                      <RolePicker
                        value={form.automations.roleIdToAssign}
                        onChange={(roleId) =>
                          setForm((prev) => ({
                            ...prev,
                            automations: { ...prev.automations, roleIdToAssign: roleId },
                          }))
                        }
                        guildId={guildParam}
                        placeholder="Sélectionner un rôle pour les participants..."
                        size="sm"
                        allowClear
                      />
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">Nettoyage après l'événement</span>
                      <span className="text-xs text-[var(--text-muted)]">Retirer automatiquement le rôle temporaire une fois l'événement terminé</span>
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
                      className="w-4 h-4 rounded text-[var(--accent-primary)]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 8: Review & Publish */}
            {step === 8 && (
              <div className="stagger-children space-y-5">
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[var(--accent-primary)]" />
                  Vérification Finale
                </h2>

                <div className="p-4 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-xs text-[var(--accent-primary)]">
                  ✅ Votre événement est prêt à être programmé. Le bot ETHONE publiera l'encart interactif dans {form.announcementChannel}.
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
                  <div>
                    <span className="text-[var(--text-muted)] block">Titre</span>
                    <span className="text-[var(--text-primary)] font-semibold">{form.emoji} {form.title || "Sans titre"}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Date</span>
                    <span className="text-[var(--text-primary)] font-semibold">{form.startDate} à {form.startTime}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Lieu</span>
                    <span className="text-[var(--text-primary)] font-semibold">{form.channelName}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Capacité</span>
                    <span className="text-[var(--text-primary)] font-semibold">{form.unlimitedCapacity ? "Illimitée" : `${form.maxParticipants} max`}</span>
                  </div>
                </div>
              </div>
            )}

            {publishError && (
              <div className="mt-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {publishError}
              </div>
            )}

            {/* Bottom Form Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-[var(--panel-border)]">
              <button
                type="button"
                disabled={step === 1}
                onClick={() => setStep((s) => s - 1)}
                className={`group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-[background-color,transform] active:scale-[0.97] ${
                  step === 1
                    ? "opacity-30 cursor-not-allowed text-[var(--text-muted)]"
                    : "bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--panel-border)]"
                }`}
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                Précédent
              </button>

              {step < 8 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                >
                  Suivant
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePublish}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
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
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                Aperçu Discord Interactif
              </span>
              <span className="text-xs text-[var(--text-muted)]">Mise à jour en temps réel</span>
            </div>

            {/* Discord Embed Mockup */}
            <div className="p-4 rounded-2xl bg-[#1e1f22] border-l-4 border-[var(--accent-primary)] font-sans">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-[var(--accent-primary)]">Etho</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-[#5865F2] text-white font-bold">BOT</span>
              </div>

              <h4 className="text-base font-bold text-[var(--text-primary)] mb-2">
                {form.emoji} {form.title || "Titre de votre événement"}
              </h4>

              <p className="text-xs text-[var(--text-muted)] mb-4 whitespace-pre-wrap">
                {form.description || "Description de l'événement..."}
              </p>

              {form.imageUrl && (
                <div className="rounded-lg overflow-hidden mb-4 max-h-48">
                  <img src={form.imageUrl} alt="cover" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[var(--surface-raised)]/40 text-xs mb-4">
                <div>
                  <span className="text-[var(--text-muted)] block text-xs">📅 Date</span>
                  <span className="text-[var(--text-primary)] font-semibold">
                    {form.startDate} à {form.startTime}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-xs">📍 Lieu</span>
                  <span className="text-[var(--text-primary)] font-semibold">{form.channelName}</span>
                </div>
              </div>

              {/* Action Buttons Mockup */}
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <button type="button" className="py-1.5 px-2 rounded bg-[#248046] text-white text-xs font-semibold text-center">
                    ✅ Participer
                  </button>
                  <button type="button" className="py-1.5 px-2 rounded bg-[#4e5058] text-white text-xs font-semibold text-center">
                    🤔 Peut-être
                  </button>
                  <button type="button" className="py-1.5 px-2 rounded bg-[#da373c] text-white text-xs font-semibold text-center">
                    ❌ Refuser
                  </button>
                </div>
                <button type="button" className="w-full py-1.5 px-2 rounded bg-[#5865f2] text-white text-xs font-semibold text-center">
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
