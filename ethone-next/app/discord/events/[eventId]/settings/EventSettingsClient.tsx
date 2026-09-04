"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Settings,
  ArrowLeft,
  Save,
  Clock,
  Volume2,
  Users,
  Bell,
  Bot,
  AlertTriangle,
  Trash2,
  Check,
  Radio,
  FileText,
} from "lucide-react";

export default function EventSettingsClient() {
  const params = useParams();
  const router = useRouter();
  const eventId = (params?.eventId as string) || "evt-gaming-night";

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
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleCancelEvent = () => {
    setShowCancelModal(false);
    router.push("/discord/events");
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 pb-20 selection:bg-indigo-500/30">
      {/* Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-1/3 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
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
            </p>
          </div>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md shadow-indigo-500/25 transition-all self-start sm:self-auto"
          >
            {savedToast ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            {savedToast ? "Modifications Enregistrées !" : "Enregistrer les modifications"}
          </button>
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {/* Section 1: Informations Générales */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl space-y-4">
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
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description & Règles</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
              />
            </div>
          </div>

          {/* Section 2: Reprogrammation */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl space-y-4">
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
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Heure Début</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
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
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Heure Fin</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Capacité & Rôles */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl space-y-4">
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
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Salon Discord Associé</label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
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
            <div className="w-full max-w-md p-6 rounded-2xl bg-[#13151f] border border-white/10 shadow-2xl space-y-4">
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
