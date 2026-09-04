"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Calendar,
  Volume2,
  PieChart,
  Percent,
  Sparkles,
} from "lucide-react";

export default function EventAnalyticsClient() {
  const params = useParams();
  const eventId = (params?.eventId as string) || "evt-gaming-night";

  // Mock data for this event
  const stats = {
    title: "Friday Gaming Night — Valorant & Lethal Company",
    totalRegistrations: 28,
    goingCount: 22,
    maybeCount: 6,
    waitlistCount: 2,
    attendedCount: 19,
    attendanceRate: 86, // %
    noShowRate: 14, // %
    peakVoiceCount: 24,
    maxCapacity: 30,
    fillRate: 73,
    registrationTimeline: [
      { day: "J-5", count: 4 },
      { day: "J-4", count: 7 },
      { day: "J-3", count: 12 },
      { day: "J-2", count: 18 },
      { day: "J-1", count: 22 },
    ],
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 pb-20 selection:bg-indigo-500/30">
      {/* Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-1/4 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
              <Link href={`/discord/events/${eventId}`} className="hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour à l'événement
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-emerald-400" />
              Statistiques & Analytics de l'Événement
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Rapport complet de fréquentation, taux de conversion et engagement vocal pour <strong className="text-white">{stats.title}</strong>.
            </p>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Taux de Présence</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.attendanceRate}%</div>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              {stats.attendedCount} présents sur {stats.goingCount} confirmés
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Taux de No-Show</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.noShowRate}%</div>
            <span className="text-[11px] text-rose-400/80 mt-1 block">
              3 absents non excusés
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Pic Vocal Simultané</span>
              <Volume2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.peakVoiceCount}</div>
            <span className="text-[11px] text-cyan-400 mt-1 block">
              Membres connectés en même temps
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Remplissage Capacité</span>
              <Percent className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.fillRate}%</div>
            <span className="text-[11px] text-purple-400 mt-1 block">
              {stats.goingCount} places sur {stats.maxCapacity}
            </span>
          </div>
        </div>

        {/* 2-Column Analytics Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Timeline Bar Chart */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-6 flex items-center justify-between">
              <span>Évolution des Inscriptions Cumulées</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </h3>

            <div className="h-48 flex items-end justify-between gap-4 pt-6 px-2">
              {stats.registrationTimeline.map((item, i) => {
                const heightPercent = Math.round((item.count / stats.maxCapacity) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[11px] font-bold text-white">{item.count}</span>
                    <div className="w-full bg-white/5 rounded-t-lg h-36 flex items-end p-1">
                      <div
                        className="w-full bg-gradient-to-t from-indigo-600 to-purple-500 rounded-t-md transition-all duration-500"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribution Breakdown */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
                <span>Répartition des Réponses</span>
                <PieChart className="w-4 h-4 text-purple-400" />
              </h3>

              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-semibold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Confirmés (Going)
                    </span>
                    <span className="text-white font-bold">{stats.goingCount}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "70%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-semibold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Peut-être (Maybe)
                    </span>
                    <span className="text-white font-bold">{stats.maybeCount}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: "20%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-semibold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      File d'attente (Waitlist)
                    </span>
                    <span className="text-white font-bold">{stats.waitlistCount}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: "10%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 mt-6 text-xs text-slate-400">
              💡 <strong>Insight Automatique</strong> : Le rappel envoyé à <strong>J-1</strong> a converti 4 hésitants en inscrits fermes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
