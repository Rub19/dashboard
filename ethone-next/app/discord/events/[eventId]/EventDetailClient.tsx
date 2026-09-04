"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Volume2,
  Users,
  CheckCircle2,
  AlertCircle,
  Share2,
  Settings,
  BarChart2,
  ArrowLeft,
  Ticket,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Shield,
  Layers,
} from "lucide-react";

interface EventDetailData {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
  startDate: string;
  endDate: string;
  location: {
    type: string;
    channelName: string;
    channelId?: string;
  };
  capacity: {
    unlimited: boolean;
    maxParticipants: number;
    waitlistEnabled: boolean;
  };
  stats: {
    goingCount: number;
    maybeCount: number;
    notGoingCount: number;
    waitlistCount: number;
    attendedCount: number;
  };
  imageUrl?: string;
  emoji: string;
  organizer: {
    username: string;
    avatarUrl: string;
  };
}

const DEFAULT_EVENT: EventDetailData = {
  id: "evt-gaming-night",
  title: "Friday Gaming Night — Valorant & Lethal Company",
  description: "Rejoignez toute la communauté pour une session intense de 3 heures ! Nous diviserons les salons en escouades de 5 joueurs pour Valorant et 4 joueurs pour Lethal Company. Rôles et canaux vocaux temporaires synchronisés par ETHONE Bot.",
  category: "GAMING",
  status: "SCHEDULED",
  startDate: new Date(Date.now() + 86400000 * 2 + 3600000 * 4).toISOString(),
  endDate: new Date(Date.now() + 86400000 * 2 + 3600000 * 7).toISOString(),
  location: {
    type: "VOICE",
    channelName: "🎮 Vocal Gaming #1",
    channelId: "1128633164290596884",
  },
  capacity: {
    unlimited: false,
    maxParticipants: 30,
    waitlistEnabled: true,
  },
  stats: {
    goingCount: 22,
    maybeCount: 6,
    notGoingCount: 1,
    waitlistCount: 2,
    attendedCount: 0,
  },
  imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80",
  emoji: "🎮",
  organizer: {
    username: "ETHONE Staff",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60",
  },
};

export default function EventDetailClient() {
  const params = useParams();
  const eventId = (params?.eventId as string) || "evt-gaming-night";

  const [event, setEvent] = useState<EventDetailData>({
    ...DEFAULT_EVENT,
    id: eventId,
  });

  const [userRsvp, setUserRsvp] = useState<"GOING" | "MAYBE" | "NOT_GOING" | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [copied, setCopied] = useState(false);

  // Live countdown
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(event.startDate).getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [event.startDate]);

  const handleRSVP = (status: "GOING" | "MAYBE" | "NOT_GOING") => {
    setUserRsvp(status);
    setEvent((prev) => {
      const stats = { ...prev.stats };
      if (status === "GOING") stats.goingCount++;
      if (status === "MAYBE") stats.maybeCount++;
      if (status === "NOT_GOING") stats.notGoingCount++;
      return { ...prev, stats };
    });
  };

  const handleCheckin = () => {
    setIsCheckedIn(true);
    setEvent((prev) => ({
      ...prev,
      stats: { ...prev.stats, attendedCount: prev.stats.attendedCount + 1 },
    }));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const fillRate = !event.capacity.unlimited && event.capacity.maxParticipants > 0
    ? Math.min(100, Math.round((event.stats.goingCount / event.capacity.maxParticipants) * 100))
    : 100;

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 pb-20 selection:bg-indigo-500/30">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[160px]" />
      </div>

      {/* Hero Banner Image */}
      <div className="relative h-72 sm:h-96 w-full bg-slate-900 overflow-hidden">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover opacity-60 filter brightness-90"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-900 to-purple-900 opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090A0F] via-[#090A0F]/60 to-transparent" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-36">
        {/* Top bar back */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/discord/events"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </Link>

          {/* Direct module sub-links */}
          <div className="flex items-center gap-2">
            <Link
              href={`/discord/events/${eventId}/participants`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-slate-300 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Participants ({event.stats.goingCount})
            </Link>

            <Link
              href={`/discord/events/${eventId}/analytics`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-slate-300 transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
              Analytics
            </Link>

            <Link
              href={`/discord/events/${eventId}/settings`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-slate-300 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              Paramètres
            </Link>
          </div>
        </div>

        {/* Header Information Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/15 backdrop-blur-2xl shadow-2xl mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {event.emoji} {event.category}
                </span>

                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {event.status === "SCHEDULED" ? "Planifié sur Discord" : event.status}
                </span>

                <span className="text-xs text-slate-400">
                  Organisé par <strong className="text-white">{event.organizer.username}</strong>
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {event.title}
              </h1>

              <div className="flex items-center gap-6 mt-4 text-xs font-semibold text-slate-300 flex-wrap">
                <span className="flex items-center gap-2 text-indigo-300">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  {startDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} • {startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>

                <span className="flex items-center gap-2 text-cyan-300">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  {event.location.channelName}
                </span>
              </div>
            </div>

            {/* Countdown Box */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-3 justify-center sm:justify-start">
              {[
                { label: "Jours", value: timeLeft.days },
                { label: "Heures", value: timeLeft.hours },
                { label: "Minutes", value: timeLeft.minutes },
                { label: "Secondes", value: timeLeft.seconds },
              ].map((item, i) => (
                <div key={i} className="text-center min-w-[55px]">
                  <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                    {String(item.value).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleRSVP("GOING")}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  userRsvp === "GOING"
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Participer (Going)
              </button>

              <button
                onClick={() => handleRSVP("MAYBE")}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  userRsvp === "MAYBE"
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                }`}
              >
                Peut-être
              </button>

              <button
                onClick={() => handleRSVP("NOT_GOING")}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  userRsvp === "NOT_GOING"
                    ? "bg-red-500 text-white"
                    : "bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10"
                }`}
              >
                Refuser
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={handleCheckin}
                disabled={isCheckedIn}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isCheckedIn
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 cursor-default"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                }`}
              >
                <Ticket className="w-4 h-4" />
                {isCheckedIn ? "✅ Présence Confirmée" : "Valider ma Présence"}
              </button>

              <button
                onClick={handleCopyLink}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                title="Partager"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Content Layout: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Description & Rules (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
              <h2 className="text-lg font-bold text-white mb-3">À Propos de l'Événement</h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                Règles & Accès
              </h2>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tous les membres du serveur avec le rôle @Membre peuvent participer.</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Casque et microphone recommandés pour les sessions vocales interactives.</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Le pointage (Check-in) est ouvert jusqu’à 30 minutes après le début de la session.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Sidebar Status (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Capacity Card */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                <span>Inscriptions</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </h3>

              <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                <span>Places occupées</span>
                <span className="font-bold text-white">
                  {event.stats.goingCount} / {event.capacity.maxParticipants || "Illimité"}
                </span>
              </div>

              {!event.capacity.unlimited && (
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${fillRate}%` }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-center text-xs mt-4 pt-4 border-t border-white/5">
                <div className="p-2 rounded-xl bg-black/40">
                  <span className="text-slate-400 block text-[10px]">Peut-être</span>
                  <span className="text-white font-bold">{event.stats.maybeCount}</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40">
                  <span className="text-slate-400 block text-[10px]">File d'attente</span>
                  <span className="text-amber-400 font-bold">{event.stats.waitlistCount}</span>
                </div>
              </div>
            </div>

            {/* Quick Bot Sync status */}
            <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-indigo-300">
                <Sparkles className="w-4 h-4" />
                Discord Bot Synchronisé
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Les commandes <code className="px-1.5 py-0.5 rounded bg-black/60 text-indigo-300">/event info {event.id}</code> et <code className="px-1.5 py-0.5 rounded bg-black/60 text-indigo-300">/event rsvp</code> sont actives sur votre serveur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
