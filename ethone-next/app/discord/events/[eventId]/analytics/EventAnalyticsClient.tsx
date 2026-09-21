"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Volume2,
  PieChart,
  Percent,
  RefreshCw,
} from "lucide-react";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

type Stats = {
  title: string;
  totalRegistrations: number;
  goingCount: number;
  maybeCount: number;
  waitlistCount: number;
  attendedCount: number;
  attendanceRate: number;
  noShowRate: number;
  peakVoiceCount: number;
  maxCapacity: number | null;
  fillRate: number | null;
  registrationTimeline: { day: string; count: number }[];
};

const DEMO_STATS: Stats = {
  title: "Événement",
  totalRegistrations: 0,
  goingCount: 0,
  maybeCount: 0,
  waitlistCount: 0,
  attendedCount: 0,
  attendanceRate: 0,
  noShowRate: 0,
  peakVoiceCount: 0,
  maxCapacity: 0,
  fillRate: 0,
  registrationTimeline: [],
};

export default function EventAnalyticsClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const eventId = (params?.eventId as string) || "evt-gaming-night";
  const guildParam = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);

  const [stats, setStats] = useState<Stats>(DEMO_STATS);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);

  const base = `${BOT_API_URL}/api/guilds/${guildParam}/events/${eventId}`;

  const loadAnalytics = useCallback(async () => {
    if (!BOT_API_URL) {
      setIsDemo(true);
      return;
    }
    setLoading(true);
    try {
      const [eventRes, analyticsRes] = await Promise.all([
        fetch(base, { credentials: "include" }),
        fetch(`${base}/analytics`, { credentials: "include" }),
      ]);
      const eventData = await eventRes.json().catch(() => null);
      const analyticsData = await analyticsRes.json().catch(() => null);

      if (eventRes.ok && analyticsRes.ok && analyticsData?.analytics) {
        const a = analyticsData.analytics;
        const s = a.stats || {};
        // The backend groups registrations by calendar day (not cumulative);
        // sum a running total here to keep the "cumulative growth" chart.
        const sortedTimeline = Array.isArray(a.timeline)
          ? [...a.timeline].sort((x, y) => String(x.date).localeCompare(String(y.date)))
          : [];
        let running = 0;
        const registrationTimeline = sortedTimeline.map((t) => {
          running += Number(t.count) || 0;
          return { day: String(t.date).slice(5), count: running };
        });

        setStats({
          title: eventData?.event?.title || DEMO_STATS.title,
          totalRegistrations: Number(a.totalRsvps) || 0,
          goingCount: Number(s.goingCount) || 0,
          maybeCount: Number(s.maybeCount) || 0,
          waitlistCount: Number(s.waitlistCount) || 0,
          attendedCount: Number(s.attendedCount) || 0,
          attendanceRate: Number(a.attendanceRate) || 0,
          noShowRate: Number(a.noShowRate) || 0,
          peakVoiceCount: Number(a.peakVoiceAttendance) || 0,
          maxCapacity: a.maxCapacity != null ? Number(a.maxCapacity) : null,
          fillRate: a.fillRate != null ? Number(a.fillRate) : null,
          registrationTimeline,
        });
        setIsDemo(false);
      } else {
        setIsDemo(true);
      }
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildParam, eventId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const totalResponses = stats.goingCount + stats.maybeCount + stats.waitlistCount;
  const pct = (n: number) => (totalResponses > 0 ? Math.round((n / totalResponses) * 100) : 0);
  const noShowCount = Math.max(0, stats.goingCount - stats.attendedCount);
  const timelineMax = Math.max(stats.maxCapacity || 0, ...stats.registrationTimeline.map((t) => t.count), 1);

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-slate-100 pb-44 selection:bg-indigo-500/30">
      {/* Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--panel-border)] mb-8">
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
              Rapport complet de fréquentation, taux de conversion et engagement vocal pour <strong className="text-white">{stats.title}</strong>
              {isDemo && <span className="text-amber-400"> (bot injoignable ou absent de ce serveur)</span>}.
            </p>
          </div>
          <button
            type="button"
            onClick={loadAnalytics}
            disabled={loading}
            className="flex items-center gap-1.5 self-start rounded-lg border border-[var(--panel-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Taux de Présence</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.attendanceRate}%</div>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              {stats.attendedCount} présents sur {stats.goingCount} confirmés
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Taux de No-Show</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.noShowRate}%</div>
            <span className="text-[11px] text-rose-400/80 mt-1 block">
              {noShowCount} absent{noShowCount > 1 ? "s" : ""} non excusé{noShowCount > 1 ? "s" : ""}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Pic Vocal Simultané</span>
              <Volume2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.peakVoiceCount}</div>
            <span className="text-[11px] text-cyan-400 mt-1 block">
              Membres connectés en même temps
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Remplissage Capacité</span>
              <Percent className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.fillRate != null ? `${stats.fillRate}%` : "—"}</div>
            <span className="text-[11px] text-purple-400 mt-1 block">
              {stats.maxCapacity != null ? `${stats.goingCount} places sur ${stats.maxCapacity}` : "Capacité illimitée"}
            </span>
          </div>
        </div>

        {/* 2-Column Analytics Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Timeline Bar Chart */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-6 flex items-center justify-between">
              <span>Évolution des Inscriptions Cumulées</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </h3>

            {stats.registrationTimeline.length === 0 ? (
              <p className="text-xs text-slate-500 py-12 text-center">Pas encore assez d'inscriptions pour afficher une tendance.</p>
            ) : (
              <div className="h-48 flex items-end justify-between gap-4 pt-6 px-2">
                {stats.registrationTimeline.map((item, i) => {
                  const heightPercent = Math.round((item.count / timelineMax) * 100);
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
            )}
          </div>

          {/* Distribution Breakdown */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] backdrop-blur-xl flex flex-col justify-between">
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
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct(stats.goingCount)}%` }} />
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
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct(stats.maybeCount)}%` }} />
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
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct(stats.waitlistCount)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
