"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CalendarDays,
  Plus,
  Users,
  Clock,
  Sparkles,
  Search,
  Volume2,
  CheckCircle2,
  ChevronRight,
  Radio,
  BarChart3,
  Ticket,
  Copy,
  Check,
  CopyPlus,
  X,
  RefreshCw,
} from "lucide-react";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useToast } from "@/components/ToastProvider";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

function mapEvent(raw: Record<string, unknown>): EventItem {
  const r = raw as Record<string, any>;
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? "Événement"),
    description: String(r.description ?? ""),
    category: (r.category ?? "COMMUNITY") as EventItem["category"],
    status: (r.status ?? "SCHEDULED") as EventItem["status"],
    startDate: String(r.startDate ?? r.startsAt ?? new Date().toISOString()),
    endDate: String(r.endDate ?? r.endsAt ?? r.startDate ?? new Date().toISOString()),
    location: {
      type: (r.location?.type ?? "VOICE") as EventItem["location"]["type"],
      channelName: r.location?.channelName ?? undefined,
      details: r.location?.details ?? undefined,
    },
    capacity: {
      unlimited: Boolean(r.capacity?.unlimited ?? true),
      maxParticipants: Number(r.capacity?.maxParticipants ?? 0),
      waitlistEnabled: Boolean(r.capacity?.waitlistEnabled ?? false),
    },
    stats: {
      goingCount: Number(r.stats?.goingCount ?? 0),
      maybeCount: Number(r.stats?.maybeCount ?? 0),
      waitlistCount: Number(r.stats?.waitlistCount ?? 0),
      attendedCount: Number(r.stats?.attendedCount ?? 0),
    },
    emoji: r.emoji ?? undefined,
    imageUrl: r.imageUrl ?? undefined,
    organizer: {
      username: String(r.organizer?.username ?? "Staff"),
      avatarUrl: r.organizer?.avatarUrl ?? undefined,
    },
  };
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  category: "GAMING" | "TOURNAMENT" | "COMMUNITY" | "STAFF" | "WATCH_PARTY" | "GIVEAWAY" | "MEETING";
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
  startDate: string;
  endDate: string;
  location: {
    type: "VOICE" | "STAGE" | "TEXT" | "EXTERNAL";
    channelName?: string;
    details?: string;
  };
  capacity: {
    unlimited: boolean;
    maxParticipants: number;
    waitlistEnabled: boolean;
  };
  stats: {
    goingCount: number;
    maybeCount: number;
    waitlistCount: number;
    attendedCount: number;
  };
  emoji?: string;
  imageUrl?: string;
  organizer: {
    username: string;
    avatarUrl?: string;
  };
}

const INITIAL_EVENTS: EventItem[] = [
  {
    id: "evt-gaming-night",
    title: "Friday Gaming Night — Valorant & Lethal Company",
    description: "Rejoignez la communauté ce vendredi pour 3 heures de sessions gaming intenses ! Des salons vocaux dédiés seront créés pour chaque escouade.",
    category: "GAMING",
    status: "SCHEDULED",
    startDate: new Date(Date.now() + 86400000 * 2 + 3600000 * 3).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 2 + 3600000 * 6).toISOString(),
    location: { type: "VOICE", channelName: "🎮 Vocal Gaming #1" },
    capacity: { unlimited: false, maxParticipants: 30, waitlistEnabled: true },
    stats: { goingCount: 22, maybeCount: 6, waitlistCount: 2, attendedCount: 0 },
    emoji: "🎮",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
    organizer: { username: "ETHONE Staff", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60" },
  },
  {
    id: "evt-rocket-tournament",
    title: "Tournoi Rocket League 2v2 Community Cup",
    description: "Double élimination, cashprize de 100€ + rôles exclusifs Champion discord. Check-in obligatoire 30 minutes avant le premier match.",
    category: "TOURNAMENT",
    status: "SCHEDULED",
    startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 5 + 3600000 * 4).toISOString(),
    location: { type: "STAGE", channelName: "🏆 Scène Tournois" },
    capacity: { unlimited: false, maxParticipants: 16, waitlistEnabled: true },
    stats: { goingCount: 16, maybeCount: 4, waitlistCount: 5, attendedCount: 0 },
    emoji: "🏆",
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80",
    organizer: { username: "TournamentBot", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60" },
  },
  {
    id: "evt-staff-sync",
    title: "Réunion Générale Staff & Modération",
    description: "Revue mensuelle des métriques de modération, nouvelles règles Anti-Raid et planification des prochains concours du mois.",
    category: "STAFF",
    status: "SCHEDULED",
    startDate: new Date(Date.now() + 86400000 * 1).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 1 + 3600000 * 1.5).toISOString(),
    location: { type: "VOICE", channelName: "🔒 Salon Staff Privé" },
    capacity: { unlimited: true, maxParticipants: 0, waitlistEnabled: false },
    stats: { goingCount: 12, maybeCount: 2, waitlistCount: 0, attendedCount: 0 },
    emoji: "🛡️",
    organizer: { username: "Admin_Prime", avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60" },
  },
  {
    id: "evt-watch-party",
    title: "Watch Party Solo Leveling Épisodes 9-10",
    description: "Projection partagée en streaming avec salon de discussion direct et salon audio chill réservé aux spectateurs.",
    category: "WATCH_PARTY",
    status: "COMPLETED",
    startDate: new Date(Date.now() - 86400000 * 1).toISOString(),
    endDate: new Date(Date.now() - 86400000 * 1 + 3600000 * 2.5).toISOString(),
    location: { type: "VOICE", channelName: "🍿 Cinéma Communautaire" },
    capacity: { unlimited: true, maxParticipants: 0, waitlistEnabled: false },
    stats: { goingCount: 42, maybeCount: 8, waitlistCount: 0, attendedCount: 38 },
    emoji: "🍿",
    imageUrl: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80",
    organizer: { username: "CommunityLead", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60" },
  },
];

const TEMPLATES = [
  { id: "tpl-gaming", name: "Gaming Night", emoji: "🎮", category: "GAMING", desc: "Sessions jeux multijoueurs avec attribution vocale", color: "from-purple-500/20 to-indigo-500/10 border-purple-500/30" },
  { id: "tpl-tournament", name: "Tournoi Compétitif", emoji: "🏆", category: "TOURNAMENT", desc: "Tournoi avec jauge stricte et liste d'attente", color: "from-amber-500/20 to-orange-500/10 border-amber-500/30" },
  { id: "tpl-watchparty", name: "Watch Party Anime/Film", emoji: "🍿", category: "WATCH_PARTY", desc: "Projection live et synchronisation vocale", color: "from-pink-500/20 to-rose-500/10 border-pink-500/30" },
  { id: "tpl-meeting", name: "Réunion Staff / AMA", emoji: "🎙️", category: "MEETING", desc: "Scène conférence avec questions en direct", color: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30" },
];

export default function EventsCenterClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const { success, error: showError } = useToast();
  const guildParam =
    searchParams.get("guildId") || profile?.guilds?.[0]?.id || "123456789012345678";

  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!BOT_API_URL || !guildParam || guildParam === "123456789012345678") {
      setIsDemo(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildParam}/events`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.events)) {
        setEvents(data.events.map(mapEvent));
        setIsDemo(false);
      } else {
        setIsDemo(true);
      }
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [guildParam]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const eventAction = useCallback(
    async (eventId: string, path: string, method: "POST" | "DELETE" = "POST", body?: Record<string, unknown>): Promise<boolean> => {
      if (isDemo || !BOT_API_URL) return true;
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildParam}/events/${eventId}${path}`, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          credentials: "include",
          body: body ? JSON.stringify(body) : undefined,
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [isDemo, guildParam]
  );

  // Filtered list
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (selectedFilter === "ALL") return true;
      if (selectedFilter === "UPCOMING") return e.status === "SCHEDULED" || e.status === "LIVE";
      if (selectedFilter === "LIVE") return e.status === "LIVE";
      if (selectedFilter === "COMPLETED") return e.status === "COMPLETED";
      return e.category === selectedFilter;
    });
  }, [events, searchQuery, selectedFilter]);

  // KPIs
  const stats = useMemo(() => {
    const upcoming = events.filter((e) => e.status === "SCHEDULED" || e.status === "LIVE").length;
    const totalRegistrations = events.reduce((acc, e) => acc + e.stats.goingCount, 0);
    const active = events.filter((e) => e.status === "LIVE").length;
    return {
      total: events.length,
      upcoming,
      active,
      totalRegistrations,
      avgAttendance: "92%",
    };
  }, [events]);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/discord/events/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleQuickRSVP = async (eventId: string) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, stats: { ...ev.stats, goingCount: ev.stats.goingCount + 1 } } : ev))
    );
    if (isDemo || !BOT_API_URL) return;
    const u = profile?.user;
    if (!u?.id) {
      showError("Connecte ton compte Discord pour t'inscrire à un événement.");
      return;
    }
    const ok = await eventAction(eventId, "/participants/rsvp", "POST", {
      userId: u.id,
      username: u.username || u.displayName || "Membre",
      displayName: u.displayName || u.globalName || u.username,
      avatarUrl: u.avatarUrl,
      status: "GOING",
    });
    if (!ok) {
      setEvents((prev) =>
        prev.map((ev) => (ev.id === eventId ? { ...ev, stats: { ...ev.stats, goingCount: Math.max(0, ev.stats.goingCount - 1) } } : ev))
      );
      showError("Inscription impossible — réessaie.");
    } else {
      success("Inscription confirmée.");
    }
  };

  const handleDuplicateEvent = async (event: EventItem) => {
    const ok = await eventAction(event.id, "/duplicate");
    if (!ok) return void showError("Impossible de dupliquer l'événement.");
    success(`"${event.title}" dupliqué en brouillon.`);
    if (!isDemo) loadEvents();
  };

  const handleCancelEvent = async (event: EventItem) => {
    if (!confirm(`Annuler l'événement "${event.title}" ?`)) return;
    const snapshot = events;
    setEvents((prev) => prev.map((ev) => (ev.id === event.id ? { ...ev, status: "CANCELLED" } : ev)));
    const ok = await eventAction(event.id, "", "DELETE");
    if (!ok) {
      setEvents(snapshot);
      showError("Impossible d'annuler l'événement.");
    } else {
      success(`"${event.title}" annulé.`);
    }
  };

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-slate-100 pb-20 selection:bg-indigo-500/30">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Calendar className="w-3.5 h-3.5" />
                Événements
              </span>
              {isDemo ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Données de démonstration
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Synchronisé
                </span>
              )}
              <button
                onClick={loadEvents}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition-colors hover:text-white hover:bg-white/10 disabled:opacity-50"
                title="Rafraîchir"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Événements & Calendrier
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              {isDemo
                ? "Connecte un serveur pour planifier et gérer tes vrais événements Discord depuis ici."
                : "Planifie tes soirées gaming, tournois et réunions — synchronisé avec le bot."}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/discord/calendar"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-all hover:scale-[1.02]"
            >
              <CalendarDays className="w-4 h-4 text-cyan-400" />
              Vue Calendrier
            </Link>

            <Link
              href="/discord/events/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-600 text-white shadow-sm transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Créer un Événement
            </Link>
          </div>
        </div>

        {/* Top KPIs Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-8">
          <div className="relative p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden group hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Événements à Venir</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mt-3">{stats.upcoming}</div>
            <div className="text-xs text-indigo-400/80 mt-1 flex items-center gap-1 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              {stats.total} programmés au total
            </div>
          </div>

          <div className="relative p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Taux de Présence</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mt-3">{stats.avgAttendance}</div>
            <div className="text-xs text-emerald-400/80 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Pointages automatiques Discord
            </div>
          </div>

          <div className="relative p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden group hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Inscriptions Confirmées</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mt-3">{stats.totalRegistrations}</div>
            <div className="text-xs text-purple-400/80 mt-1 flex items-center gap-1 font-medium">
              <Ticket className="w-3.5 h-3.5" />
              Participants uniques
            </div>
          </div>

          <div className="relative p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden group hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Sessions Live</span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Radio className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mt-3">{stats.active}</div>
            <div className="text-xs text-cyan-400/80 mt-1 flex items-center gap-1 font-medium">
              <Volume2 className="w-3.5 h-3.5" />
              Synchronisation vocale active
            </div>
          </div>
        </div>

        {/* Quick Launch Templates */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Création Rapide avec Modèles
            </h2>
            <span className="text-xs text-slate-400">Pré-configurés avec rôles, canaux et règles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEMPLATES.map((tpl) => (
              <Link
                key={tpl.id}
                href={`/discord/events/create?template=${tpl.id}`}
                className={`group p-4 rounded-2xl bg-gradient-to-br ${tpl.color} border backdrop-blur-xl hover:scale-[1.02] transition-all flex flex-col justify-between`}
              >
                <div>
                  <div className="text-2xl mb-2">{tpl.emoji}</div>
                  <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{tpl.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-indigo-400">
                  <span>Utiliser ce template</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl mb-8">
          {/* Search bar */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par titre, jeu ou mot-clé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {[
              { id: "ALL", label: "Tous" },
              { id: "UPCOMING", label: "À Venir" },
              { id: "GAMING", label: "Gaming" },
              { id: "TOURNAMENT", label: "Tournois" },
              { id: "STAFF", label: "Staff" },
              { id: "WATCH_PARTY", label: "Watch Party" },
              { id: "COMPLETED", label: "Terminés" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedFilter === tab.id
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredEvents.map((event) => {
              const startDate = new Date(event.startDate);
              const isPast = event.status === "COMPLETED";
              const isLive = event.status === "LIVE";
              const maxCap = !event.capacity.unlimited && event.capacity.maxParticipants > 0 ? event.capacity.maxParticipants : null;
              const fillRate = maxCap ? Math.min(100, Math.round((event.stats.goingCount / maxCap) * 100)) : 100;

              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl overflow-hidden hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all flex flex-col justify-between"
                >
                  {/* Card Banner Image or Gradient */}
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/[0.03] flex items-center justify-center">
                        <span className="text-5xl">{event.emoji || "📅"}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090A0F] via-black/40 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center gap-1.5">
                        {event.emoji && <span>{event.emoji}</span>}
                        {event.category}
                      </span>

                      {isLive ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-500/90 text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-white" />
                          En Direct
                        </span>
                      ) : isPast ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-white/10">
                          Terminé
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-500/80 backdrop-blur-md text-white">
                          Planifié
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Date & Location */}
                      <div className="flex items-center gap-4 text-xs text-indigo-400 font-semibold mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {startDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} • {startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {event.location.channelName && (
                          <span className="text-slate-400 truncate flex items-center gap-1">
                            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                            {event.location.channelName}
                          </span>
                        )}
                      </div>

                      <Link href={`/discord/events/${event.id}`}>
                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                          {event.title}
                        </h3>
                      </Link>

                      <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    </div>

                    {/* Capacity Gauge & Attendees */}
                    <div className="mt-5 pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          {event.stats.goingCount} {maxCap ? `/ ${maxCap}` : "confirmés"}
                        </span>
                        {event.stats.waitlistCount > 0 && (
                          <span className="text-amber-400 font-semibold text-[11px]">
                            {event.stats.waitlistCount} en file d'attente
                          </span>
                        )}
                      </div>

                      {maxCap && (
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              fillRate >= 100
                                ? "bg-red-500"
                                : fillRate > 75
                                ? "bg-amber-500"
                                : "bg-indigo-500"
                            }`}
                            style={{ width: `${fillRate}%` }}
                          />
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => handleQuickRSVP(event.id)}
                          className="flex-1 py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Participer
                        </button>

                        <Link
                          href={`/discord/events/${event.id}`}
                          className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-colors flex items-center justify-center"
                        >
                          Détails
                        </Link>

                        <button
                          onClick={() => handleCopy(event.id)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
                          title="Copier le lien Discord"
                        >
                          {copiedId === event.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleDuplicateEvent(event)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
                          title="Dupliquer"
                        >
                          <CopyPlus className="w-3.5 h-3.5" />
                        </button>

                        {event.status !== "CANCELLED" && event.status !== "COMPLETED" && (
                          <button
                            onClick={() => handleCancelEvent(event)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors"
                            title="Annuler l'événement"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredEvents.length === 0 && (
          <div className="text-center py-16 bg-white/[0.01] rounded-2xl border border-white/10 my-8">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">Aucun événement trouvé</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Modifiez votre recherche ou vos filtres, ou créez un tout nouvel événement communautaire dès maintenant.
            </p>
            <Link
              href="/discord/events/create"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Créer un Événement
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
