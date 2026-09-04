"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Download,
  Filter,
  CheckCircle2,
  X,
  ExternalLink,
  Volume2,
  Trophy,
  Gamepad2,
  Eye,
  CalendarDays,
  List,
  Sparkles,
  Layers,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  category: "GAMING" | "TOURNAMENT" | "COMMUNITY" | "STAFF" | "WATCH_PARTY" | "GIVEAWAY" | "MEETING";
  status: "SCHEDULED" | "LIVE" | "COMPLETED";
  startDate: string;
  endDate: string;
  color: string;
  emoji: string;
  location: string;
  attendeesCount: number;
  maxCapacity?: number;
}

const DEMO_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "evt-gaming-night",
    title: "Friday Gaming Night — Valorant & Lethal Company",
    description: "Soirée jeux communautaires avec escouades vocales automatiques.",
    category: "GAMING",
    status: "SCHEDULED",
    startDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 2 + 3600000 * 3).toISOString(),
    color: "#8B5CF6",
    emoji: "🎮",
    location: "Vocal Gaming #1",
    attendeesCount: 22,
    maxCapacity: 30,
  },
  {
    id: "evt-rocket-tournament",
    title: "Tournoi Rocket League 2v2 Community Cup",
    description: "Championnat 2v2 avec cashprize et rôles exclusifs.",
    category: "TOURNAMENT",
    status: "SCHEDULED",
    startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 5 + 3600000 * 4).toISOString(),
    color: "#F59E0B",
    emoji: "🏆",
    location: "Scène Tournois",
    attendeesCount: 16,
    maxCapacity: 16,
  },
  {
    id: "evt-staff-sync",
    title: "Réunion Générale Staff & Modération",
    description: "Revue mensuelle et nouvelles règles Anti-Raid.",
    category: "STAFF",
    status: "SCHEDULED",
    startDate: new Date(Date.now() + 86400000 * 1).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 1 + 3600000 * 1.5).toISOString(),
    color: "#3B82F6",
    emoji: "🛡️",
    location: "Salon Staff Privé",
    attendeesCount: 12,
  },
  {
    id: "evt-watch-party",
    title: "Watch Party Solo Leveling Ép. 9-10",
    description: "Diffusion live communautaire et discussion anime.",
    category: "WATCH_PARTY",
    status: "COMPLETED",
    startDate: new Date(Date.now() - 86400000 * 1).toISOString(),
    endDate: new Date(Date.now() - 86400000 * 1 + 3600000 * 2).toISOString(),
    color: "#EC4899",
    emoji: "🍿",
    location: "Cinéma Communautaire",
    attendeesCount: 42,
  },
];

type ViewMode = "MONTH" | "WEEK" | "DAY" | "AGENDA";

export default function DiscordCalendarClient() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("MONTH");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeModalEvent, setActiveModalEvent] = useState<CalendarEvent | null>(null);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (selectedCategory === "ALL") return DEMO_CALENDAR_EVENTS;
    return DEMO_CALENDAR_EVENTS.filter((e) => e.category === selectedCategory);
  }, [selectedCategory]);

  // Date Navigation
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === "MONTH") next.setMonth(next.getMonth() - 1);
    else if (viewMode === "WEEK") next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === "MONTH") next.setMonth(next.getMonth() + 1);
    else if (viewMode === "WEEK") next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month Grid calculations
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: month - 1,
        year,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }

    // Next month padding to fill 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: month + 1,
        year,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return days;
  }, [currentDate]);

  // Export iCal .ics
  const handleExportICS = () => {
    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ETHONE//Discord Events 2.0//FR",
      "CALSCALE:GREGORIAN",
    ];

    filteredEvents.forEach((e) => {
      const start = new Date(e.startDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const end = new Date(e.endDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      icsLines.push("BEGIN:VEVENT");
      icsLines.push(`UID:${e.id}@ethone.app`);
      icsLines.push(`DTSTART:${start}`);
      icsLines.push(`DTEND:${end}`);
      icsLines.push(`SUMMARY:${e.emoji} ${e.title}`);
      icsLines.push(`DESCRIPTION:${e.description}`);
      icsLines.push(`LOCATION:${e.location}`);
      icsLines.push("END:VEVENT");
    });

    icsLines.push("END:VCALENDAR");
    const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ethone-calendar-${currentDate.getFullYear()}-${currentDate.getMonth() + 1}.ics`;
    link.click();
  };

  const monthLabel = currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 pb-20 selection:bg-indigo-500/30">
      {/* Glow Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-1/3 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
              <Link href="/discord/events" className="hover:underline flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5" />
                Événements Hub
              </Link>
              <span>/</span>
              <span className="text-slate-400">Calendrier Interactif</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 capitalize">
              {monthLabel}
            </h1>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleExportICS}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Exporter iCal (.ics)
            </button>

            <Link
              href="/discord/events/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md shadow-indigo-500/25 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Créer un Événement
            </Link>
          </div>
        </div>

        {/* Toolbar: Navigation & View Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-6 p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors"
            >
              Aujourd'hui
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-sm font-bold text-white sm:hidden capitalize">{monthLabel}</span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: "ALL", label: "Tous" },
              { id: "GAMING", label: "Gaming" },
              { id: "TOURNAMENT", label: "Tournois" },
              { id: "STAFF", label: "Staff" },
              { id: "WATCH_PARTY", label: "Watch Party" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedCategory(f.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === f.id
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "bg-white/5 hover:bg-white/10 text-slate-400"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* View Modes */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            {(["MONTH", "AGENDA"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === mode
                    ? "bg-indigo-500 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {mode === "MONTH" ? "Mois" : "Agenda"}
              </button>
            ))}
          </div>
        </div>

        {/* View 1: Month View */}
        {viewMode === "MONTH" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.01] backdrop-blur-xl overflow-hidden shadow-2xl">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.03] text-center text-xs font-bold text-slate-400 py-3">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 auto-rows-fr">
              {monthDays.map((cell, idx) => {
                const cellDateStr = cell.date.toISOString().slice(0, 10);
                const isToday = new Date().toISOString().slice(0, 10) === cellDateStr;

                const dayEvents = filteredEvents.filter((e) => e.startDate.slice(0, 10) === cellDateStr);

                return (
                  <div
                    key={idx}
                    className={`min-h-[120px] p-2 border-b border-r border-white/5 transition-colors flex flex-col justify-between ${
                      cell.isCurrentMonth ? "bg-transparent" : "bg-black/40 text-slate-600"
                    } hover:bg-white/[0.02]`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/50"
                            : cell.isCurrentMonth
                            ? "text-slate-300"
                            : "text-slate-600"
                        }`}
                      >
                        {cell.day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] text-indigo-400 font-semibold">
                          {dayEvents.length} évt
                        </span>
                      )}
                    </div>

                    {/* Events Pills in Cell */}
                    <div className="flex-1 space-y-1 overflow-y-auto max-h-[85px] scrollbar-none">
                      {dayEvents.map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => setActiveModalEvent(ev)}
                          className="w-full text-left p-1.5 rounded-lg text-xs font-semibold truncate flex items-center gap-1.5 transition-transform hover:scale-[1.02] border"
                          style={{
                            backgroundColor: `${ev.color}20`,
                            borderColor: `${ev.color}40`,
                            color: "#fff",
                          }}
                        >
                          <span>{ev.emoji}</span>
                          <span className="truncate">{ev.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View 2: Agenda View */}
        {viewMode === "AGENDA" && (
          <div className="space-y-4">
            {filteredEvents.map((ev) => {
              const start = new Date(ev.startDate);
              const end = new Date(ev.endDate);
              return (
                <div
                  key={ev.id}
                  onClick={() => setActiveModalEvent(ev)}
                  className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl hover:border-indigo-500/40 cursor-pointer transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3.5 rounded-2xl text-2xl flex items-center justify-center border"
                      style={{ backgroundColor: `${ev.color}15`, borderColor: `${ev.color}30` }}
                    >
                      {ev.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-300">
                          {ev.category}
                        </span>
                        <span className="text-xs text-indigo-400 font-semibold">
                          {start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} • {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{ev.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{ev.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                        {ev.location}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        {ev.attendeesCount} {ev.maxCapacity ? `/ ${ev.maxCapacity}` : "inscrits"}
                      </div>
                    </div>

                    <Link
                      href={`/discord/events/${ev.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Event Preview */}
        <AnimatePresence>
          {activeModalEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg rounded-2xl bg-[#0e111a] border border-white/15 p-6 shadow-2xl"
              >
                <button
                  onClick={() => setActiveModalEvent(null)}
                  className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl p-3 rounded-2xl bg-white/5 border border-white/10">
                    {activeModalEvent.emoji}
                  </span>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {activeModalEvent.category}
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">{activeModalEvent.title}</h3>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                  {activeModalEvent.description}
                </p>

                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-black/40 border border-white/5 mb-6 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Date & Heure</span>
                    <span className="text-slate-200 font-semibold">
                      {new Date(activeModalEvent.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Lieu Discord</span>
                    <span className="text-slate-200 font-semibold truncate block">
                      {activeModalEvent.location}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Participants</span>
                    <span className="text-slate-200 font-semibold">
                      {activeModalEvent.attendeesCount} confirmés
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Statut</span>
                    <span className="text-emerald-400 font-semibold uppercase">
                      {activeModalEvent.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/discord/events/${activeModalEvent.id}`}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold text-center shadow-lg shadow-indigo-500/25 transition-all"
                  >
                    Voir la Page Complète de l'Événement
                  </Link>
                  <button
                    onClick={() => setActiveModalEvent(null)}
                    className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
