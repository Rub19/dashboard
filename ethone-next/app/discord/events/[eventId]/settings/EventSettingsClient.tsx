"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Settings,
  ArrowLeft,
  Save,
  Clock,
  Users,
  AlertTriangle,
  Check,
  FileText,
} from "lucide-react";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
function toTimeInput(iso: string): string {
  return new Date(iso).toISOString().slice(11, 16);
}
function combine(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function EventSettingsClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const eventId = (params?.eventId as string) || "evt-gaming-night";
  const guildParam = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);
  const base = `${BOT_API_URL}/api/guilds/${guildParam}/events/${eventId}`;
  const isDemo = !BOT_API_URL || !guildParam;

  const [title, setTitle] = useState("Friday Gaming Night — Valorant & Lethal Company");
  const [description, setDescription] = useState(
    "Rejoignez toute la communauté pour une session intense de 3 heures ! Escouades vocales automatiques."
  );
  const [startDate, setStartDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("20:00");
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10));
  const [endTime, setEndTime] = useState("23:00");
  const [channelName, setChannelName] = useState("🎮 Vocal Gaming #1");
  const [maxCapacity, setMaxCapacity] = useState(30);
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [savedToast, setSavedToast] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  // Fields we don't expose an editor for but must round-trip back on save,
  // since the backend's updateEvent() does a shallow Object.assign — sending
  // a partial location/capacity object would silently wipe the rest of it.
  const [rawLocation, setRawLocation] = useState<Record<string, any>>({ type: "VOICE" });
  const [rawCapacity, setRawCapacity] = useState<Record<string, any>>({ unlimited: false });

  const loadEvent = useCallback(async () => {
    if (isDemo) return;
    try {
      const res = await fetch(base, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.event) {
        const e = data.event;
        setTitle(e.title || "");
        setDescription(e.description || "");
        setStartDate(toDateInput(e.startDate));
        setStartTime(toTimeInput(e.startDate));
        setEndDate(toDateInput(e.endDate));
        setEndTime(toTimeInput(e.endDate));
        setChannelName(e.location?.channelName || "");
        setMaxCapacity(Number(e.capacity?.maxParticipants) || 0);
        setWaitlistEnabled(Boolean(e.capacity?.waitlistEnabled));
        setRawLocation(e.location || { type: "VOICE" });
        setRawCapacity(e.capacity || { unlimited: false });
      }
    } catch {
      // Keep the current (demo) values on failure.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildParam, eventId, isDemo]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleSave = async () => {
    setSaveError("");
    if (isDemo) {
      setSaveError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    try {
      const res = await fetch(base, {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          startDate: combine(startDate, startTime),
          endDate: combine(endDate, endTime),
          location: { ...rawLocation, channelName },
          capacity: { ...rawCapacity, maxParticipants: maxCapacity, waitlistEnabled },
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch {
      setSaveError("Échec de l'enregistrement. Réessayez.");
    }
  };

  const handleCancelEvent = async () => {
    setShowCancelModal(false);
    if (isDemo) {
      setSaveError("Bot injoignable : l'événement n'a pas été annulé.");
      return;
    }
    if (!isDemo) {
      try {
        await fetch(base, {
          method: "DELETE",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "Annulé depuis le Dashboard" }),
        });
      } catch {
        // Navigate away regardless — the event list will show the real state on reload.
      }
    }
    router.push("/discord/events");
  };

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-slate-100 pb-20 selection:bg-indigo-500/30">
      {/* Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--panel-border)] mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
              <Link href={`/discord/events/${eventId}`} className="hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour à l'événement
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <Settings className="w-7 h-7 text-indigo-400" />
              Paramètres de l'Événement
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Modifiez les horaires, les limites de participants et les options de diffusion Discord.
              {isDemo && <span className="text-amber-400"> (mode démonstration — rien n'est sauvegardé)</span>}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:brightness-110 text-white shadow-sm transition-all self-start sm:self-auto"
            >
              {savedToast ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              {savedToast ? "Modifications Enregistrées !" : "Enregistrer les modifications"}
            </button>
            {saveError && <span className="text-[11px] text-rose-400">{saveError}</span>}
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {/* Section 1: Informations Générales */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] backdrop-blur-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Informations Principales
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Titre de l'événement</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[var(--panel-border)] text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description & Règles</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[var(--panel-border)] text-xs text-white"
              />
            </div>
          </div>

          {/* Section 2: Reprogrammation */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] backdrop-blur-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Reprogrammer la Date & Heure
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Date Début</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[var(--panel-border)] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Heure Début</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[var(--panel-border)] text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Date Fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[var(--panel-border)] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Heure Fin</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[var(--panel-border)] text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Capacité & Rôles */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] backdrop-blur-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Capacité & Inscriptions
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Limite Max Participants</label>
                <input
                  type="number"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[var(--panel-border)] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Salon Discord Associé</label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[var(--panel-border)] text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-xs font-bold text-white block">Liste d'attente automatique</span>
                <span className="text-[11px] text-slate-400">Promouvoir automatiquement les membres en cas de désistement</span>
              </div>
              <input
                type="checkbox"
                checked={waitlistEnabled}
                onChange={(e) => setWaitlistEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-500"
              />
            </div>
          </div>

          {/* Section 4: Zone Dangereuse */}
          <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/20 backdrop-blur-xl space-y-4">
            <h2 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Zone Dangereuse
            </h2>
            <p className="text-xs text-slate-400">
              L'annulation d'un événement enverra une alerte dans le salon Discord et marquera l'événement comme annulé.
            </p>

            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-colors"
            >
              Annuler cet Événement
            </button>
          </div>
        </div>

        {/* Modal Confirm Cancel */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--panel-border)] shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white">Confirmer l'annulation ?</h3>
              <p className="text-xs text-slate-400">
                Êtes-vous sûr de vouloir annuler cet événement ? Les participants inscrits recevront une notification sur Discord.
              </p>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  Non, conserver
                </button>
                <button
                  onClick={handleCancelEvent}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white"
                >
                  Oui, annuler l'événement
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
