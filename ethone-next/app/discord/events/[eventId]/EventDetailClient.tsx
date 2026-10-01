"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePathSegment } from "@/lib/hooks/usePathSegment";
import {
  Clock,
  Volume2,
  Users,
  CheckCircle2,
  Share2,
  Settings,
  BarChart2,
  ArrowLeft,
  Ticket,
  Sparkles,
  Check,
  Shield,
} from "@/components/icons/ph";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useToast } from "@/components/ToastProvider";
import { formatApiError, errorReason } from "@/lib/format-error";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

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

// Valeur neutre affichée tant que l'événement n'est pas chargé (ou s'il est introuvable) :
// aucun contenu inventé.
const DEFAULT_EVENT: EventDetailData = {
  id: "",
  title: "Événement introuvable",
  description: "Impossible de charger cet événement. Le bot n'est peut-être pas sur ce serveur, ou l'événement a été supprimé.",
  category: "OTHER",
  status: "SCHEDULED",
  startDate: new Date().toISOString(),
  endDate: new Date().toISOString(),
  location: {
    type: "VOICE",
    channelName: "—",
  },
  capacity: {
    unlimited: true,
    maxParticipants: 0,
    waitlistEnabled: false,
  },
  stats: {
    goingCount: 0,
    maybeCount: 0,
    notGoingCount: 0,
    waitlistCount: 0,
    attendedCount: 0,
  },
  emoji: "📅",
  organizer: {
    username: "—",
    avatarUrl: "",
  },
};

function mapEvent(raw: Record<string, any>, id: string): EventDetailData {
  return {
    id,
    title: raw.title || DEFAULT_EVENT.title,
    description: raw.description || "",
    category: raw.category || "GAMING",
    status: (raw.status as EventDetailData["status"]) || "SCHEDULED",
    startDate: raw.startDate || DEFAULT_EVENT.startDate,
    endDate: raw.endDate || DEFAULT_EVENT.endDate,
    location: {
      type: raw.location?.type || "VOICE",
      channelName: raw.location?.channelName || "Salon Discord",
      channelId: raw.location?.channelId,
    },
    capacity: {
      unlimited: Boolean(raw.capacity?.unlimited),
      maxParticipants: Number(raw.capacity?.maxParticipants) || 0,
      waitlistEnabled: Boolean(raw.capacity?.waitlistEnabled),
    },
    stats: {
      goingCount: Number(raw.stats?.goingCount) || 0,
      maybeCount: Number(raw.stats?.maybeCount) || 0,
      notGoingCount: Number(raw.stats?.notGoingCount) || 0,
      waitlistCount: Number(raw.stats?.waitlistCount) || 0,
      attendedCount: Number(raw.stats?.attendedCount) || 0,
    },
    imageUrl: raw.imageUrl || raw.thumbnailUrl,
    emoji: raw.emoji || "🎮",
    organizer: {
      username: raw.organizer?.username || "Staff",
      avatarUrl: raw.organizer?.avatarUrl || "",
    },
  };
}

export default function EventDetailClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const { error: showError } = useToast();
  const eventId = usePathSegment("events");
  const guildParam = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);
  const base = `${BOT_API_URL}/api/guilds/${guildParam}/events/${eventId}`;

  const [event, setEvent] = useState<EventDetailData>({
    ...DEFAULT_EVENT,
    id: eventId,
  });
  const [isDemo, setIsDemo] = useState(true);
  // « missing » : la réponse du bot dit que l'événement n'existe pas (ou le bot est injoignable) → page d'erreur, pas un faux événement.
  const [loadState, setLoadState] = useState<"loading" | "ok" | "missing">("loading");

  const [userRsvp, setUserRsvp] = useState<"GOING" | "MAYBE" | "NOT_GOING" | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rsvpPending, setRsvpPending] = useState(false);
  const [checkinPending, setCheckinPending] = useState(false);

  // Live countdown
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const loadEvent = useCallback(async () => {
    if (!BOT_API_URL) {
      setIsDemo(true);
      setLoadState("missing");
      return;
    }
    try {
      const res = await fetch(base, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.event) {
        setEvent(mapEvent(data.event, eventId));
        setIsDemo(false);
        setLoadState("ok");
      } else {
        setIsDemo(true);
        setLoadState("missing");
      }
    } catch {
      setIsDemo(true);
      setLoadState("missing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildParam, eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

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

  const handleRSVP = async (status: "GOING" | "MAYBE" | "NOT_GOING") => {
    const previousRsvp = userRsvp;
    const previousStats = event.stats;
    setUserRsvp(status);
    setEvent((prev) => {
      const stats = { ...prev.stats };
      if (status === "GOING") stats.goingCount++;
      if (status === "MAYBE") stats.maybeCount++;
      if (status === "NOT_GOING") stats.notGoingCount++;
      return { ...prev, stats };
    });

    if (isDemo || !profile?.user?.id) return;
    setRsvpPending(true);
    try {
      const res = await fetch(`${base}/participants/rsvp`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: profile.user.id,
          username: profile.user.username,
          displayName: profile.user.displayName || profile.user.globalName,
          avatarUrl: profile.user.avatarUrl,
          status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, ""));
      }
      await loadEvent();
    } catch (err) {
      // Roll back the optimistic update if the real RSVP didn't take.
      showError("Inscription impossible — réessaie.", errorReason(err));
      setUserRsvp(previousRsvp);
      setEvent((prev) => ({ ...prev, stats: previousStats }));
    } finally {
      setRsvpPending(false);
    }
  };

  const handleCheckin = async () => {
    setIsCheckedIn(true);
    setEvent((prev) => ({
      ...prev,
      stats: { ...prev.stats, attendedCount: prev.stats.attendedCount + 1 },
    }));

    if (isDemo || !profile?.user?.id) return;
    setCheckinPending(true);
    try {
      const res = await fetch(`${base}/participants/${profile.user.id}/checkin`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: profile.user.username,
          displayName: profile.user.displayName || profile.user.globalName,
          avatarUrl: profile.user.avatarUrl,
          method: "MANUAL_STAFF",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data?.error, ""));
      }
      await loadEvent();
    } catch (err) {
      showError("Présence non enregistrée", errorReason(err, "Le bot n'a pas répondu."));
      setIsCheckedIn(false);
      setEvent((prev) => ({
        ...prev,
        stats: { ...prev.stats, attendedCount: Math.max(0, prev.stats.attendedCount - 1) },
      }));
    } finally {
      setCheckinPending(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startDate = new Date(event.startDate);

  if (loadState === "loading") {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--text-muted)]">Chargement de l&apos;événement…</div>;
  }

  if (loadState === "missing") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Événement introuvable</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Cet événement n&apos;existe pas, a été supprimé, ou le bot n&apos;est pas joignable sur ce serveur.
          </p>
          <Link
            href={`/discord/events${guildParam ? `?guildId=${guildParam}` : ""}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] px-3 text-xs font-semibold normal-case tracking-normal text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux événements
          </Link>
        </div>
      </div>
    );
  }
  const fillRate = !event.capacity.unlimited && event.capacity.maxParticipants > 0
    ? Math.min(100, Math.round((event.stats.goingCount / event.capacity.maxParticipants) * 100))
    : 100;

  return (
    <div className="pb-8 text-[var(--text-primary)]">
      {/* Hero Banner Image */}
      <div className="relative h-72 sm:h-96 w-full bg-[var(--surface-raised)]/40 overflow-hidden">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover opacity-60 filter brightness-90"
          />
        ) : (
          <div className="w-full h-full bg-[var(--surface-raised)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/60 to-transparent" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-36">
        {/* Top bar back */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/discord/events"
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] px-3 text-xs font-semibold normal-case tracking-normal text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la liste
          </Link>

          {/* Direct module sub-links */}
          <div className="flex items-center gap-2">
            <Link
              href={`/discord/events/${eventId}/participants`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)]/80 hover:bg-[var(--bg-surface)] border border-[var(--panel-border)] text-xs font-semibold text-[var(--text-muted)] transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Participants ({event.stats.goingCount})
            </Link>

            <Link
              href={`/discord/events/${eventId}/analytics`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)]/80 hover:bg-[var(--bg-surface)] border border-[var(--panel-border)] text-xs font-semibold text-[var(--text-muted)] transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
              Analytics
            </Link>

            <Link
              href={`/discord/events/${eventId}/settings`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)]/80 hover:bg-[var(--bg-surface)] border border-[var(--panel-border)] text-xs font-semibold text-[var(--text-muted)] transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              Paramètres
            </Link>
          </div>
        </div>

        {/* Header Information Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  {event.emoji} {event.category}
                </span>

                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {event.status === "SCHEDULED" ? "Planifié sur Discord" : event.status}
                </span>

                <span className="text-xs text-[var(--text-muted)]">
                  Organisé par <strong className="text-[var(--text-primary)]">{event.organizer.username}</strong>
                </span>

                {isDemo && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Démo
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                {event.title}
              </h1>

              <div className="flex items-center gap-6 mt-4 text-xs font-semibold text-[var(--text-muted)] flex-wrap">
                <span className="flex items-center gap-2 text-emerald-300">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  {startDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} • {startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>

                <span className="flex items-center gap-2 text-cyan-300">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  {event.location.channelName}
                </span>
              </div>
            </div>

            {/* Countdown Box */}
            <div className="p-4 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] flex items-center gap-3 justify-center sm:justify-start">
              {[
                { label: "Jours", value: timeLeft.days },
                { label: "Heures", value: timeLeft.hours },
                { label: "Minutes", value: timeLeft.minutes },
                { label: "Secondes", value: timeLeft.seconds },
              ].map((item, i) => (
                <div key={i} className="text-center min-w-[55px]">
                  <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-mono">
                    {String(item.value).padStart(2, "0")}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] uppercase font-semibold">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-8 pt-6 border-t border-[var(--panel-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleRSVP("GOING")}
                disabled={rsvpPending}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                  userRsvp === "GOING"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Participer (Going)
              </button>

              <button
                onClick={() => handleRSVP("MAYBE")}
                disabled={rsvpPending}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60 ${
                  userRsvp === "MAYBE"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--panel-border)]"
                }`}
              >
                Peut-être
              </button>

              <button
                onClick={() => handleRSVP("NOT_GOING")}
                disabled={rsvpPending}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60 ${
                  userRsvp === "NOT_GOING"
                    ? "bg-red-500 text-white"
                    : "bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--panel-border)]"
                }`}
              >
                Refuser
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={handleCheckin}
                disabled={isCheckedIn || checkinPending}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-80 ${
                  isCheckedIn
                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 cursor-default"
                    : "bg-[var(--accent-primary)] hover:brightness-110 text-[var(--accent-contrast)] btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                }`}
              >
                <Ticket className="w-4 h-4" />
                {isCheckedIn ? "✅ Présence Confirmée" : "Valider ma Présence"}
              </button>

              <button
                onClick={handleCopyLink}
                className="p-2.5 rounded-xl bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--panel-border)] transition-colors"
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
            <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">À Propos de l'Événement</h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Règles & Accès
              </h2>
              <ul className="space-y-2.5 text-xs text-[var(--text-muted)]">
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
            <div className="p-5 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center justify-between">
                <span>Inscriptions</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </h3>

              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                <span>Places occupées</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {event.stats.goingCount} / {event.capacity.maxParticipants || "Illimité"}
                </span>
              </div>

              {!event.capacity.unlimited && (
                <div className="w-full h-2 rounded-full bg-[var(--surface-raised)]/80 overflow-hidden mb-3">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${fillRate}%` }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-center text-xs mt-4 pt-4 border-t border-[var(--panel-border)]">
                <div className="p-2 rounded-xl bg-[var(--surface-raised)]/40">
                  <span className="text-[var(--text-muted)] block text-xs">Peut-être</span>
                  <span className="text-[var(--text-primary)] font-bold">{event.stats.maybeCount}</span>
                </div>
                <div className="p-2 rounded-xl bg-[var(--surface-raised)]/40">
                  <span className="text-[var(--text-muted)] block text-xs">File d'attente</span>
                  <span className="text-amber-400 font-bold">{event.stats.waitlistCount}</span>
                </div>
              </div>
            </div>

            {/* Quick Bot Sync status */}
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-300">
                <Sparkles className="w-4 h-4" />
                Discord Bot Synchronisé
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Les commandes <code className="px-1.5 py-0.5 rounded bg-[var(--surface-raised)] text-emerald-300">/event info {event.id}</code> et <code className="px-1.5 py-0.5 rounded bg-[var(--surface-raised)] text-emerald-300">/event rsvp</code> sont actives sur votre serveur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
