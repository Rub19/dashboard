"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Volume2,
  Calendar,
  Clock,
  Download,
  Share2,
  Sparkles,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  RefreshCw,
  Hash,
  Crown,
  FileText,
  Sliders,
  ShieldCheck,
  X,
} from "lucide-react";

export default function AnalyticsCenterClient() {
  const [activeTab, setActiveTab] = useState<
    "messages" | "growth" | "heatmap" | "channels" | "reports"
  >("messages");

  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Mock message activity data (14 days)
  const messageData = [
    { day: "01/09", count: 4200 },
    { day: "02/09", count: 4800 },
    { day: "03/09", count: 5300 },
    { day: "04/09", count: 5100 },
    { day: "05/09", count: 6200 },
    { day: "06/09", count: 7400 },
    { day: "07/09", count: 6900 },
    { day: "08/09", count: 4900 },
    { day: "09/09", count: 5200 },
    { day: "10/09", count: 5800 },
    { day: "11/09", count: 6100 },
    { day: "12/09", count: 7800 },
    { day: "13/09", count: 8400 },
    { day: "14/09", count: 7900 },
  ];

  const maxMessages = Math.max(...messageData.map((d) => d.count));

  // Top Channels Data
  const topChannels = [
    { name: "général-1", messages: 48200, pct: 42, color: "bg-indigo-500" },
    { name: "gaming-tech", messages: 24100, pct: 21, color: "bg-purple-500" },
    { name: "médias-partage", messages: 16800, pct: 15, color: "bg-cyan-500" },
    { name: "entraide-dev", messages: 12400, pct: 11, color: "bg-emerald-500" },
    { name: "boîte-à-idées", messages: 7100, pct: 6, color: "bg-amber-500" },
    { name: "autres-salons", messages: 5800, pct: 5, color: "bg-neutral-600" },
  ];

  // Top Chatters
  const topMembers = [
    { rank: 1, name: "Nocturne#4412", messages: 7120, vocalHours: "48h", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80" },
    { rank: 2, name: "AlexDev#0001", messages: 5920, vocalHours: "62h", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80" },
    { rank: 3, name: "ShadowGamer#1337", messages: 4105, vocalHours: "34h", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80" },
    { rank: 4, name: "Sarah_T#2048", messages: 2670, vocalHours: "19h", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80" },
    { rank: 5, name: "Kylian_Gamer#9912", messages: 2060, vocalHours: "41h", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=60&auto=format&fit=crop&q=80" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  ETHONE Analytics & Server Insights 2.0
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    📊 Data Engine v2.4
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Métriques d'activité en direct, volume de messages, croissance des membres, heatmaps horaires et rétention communautaire.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Period Selector */}
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs font-semibold">
              {(["7d", "30d", "90d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    period === p
                      ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {p === "7d" ? "7 Jours" : p === "30d" ? "30 Jours" : "3 Mois"}
                </button>
              ))}
            </div>

            <button
              onClick={() => showToast("Export CSV des métriques du serveur généré !")}
              className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              Exporter CSV
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {toastMsg}
            </span>
            <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 6 Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Messages ({period})</span>
            <p className="text-2xl font-bold text-white">148,290</p>
            <span className="text-[11px] text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +18.4%
            </span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Membres Totaux</span>
            <p className="text-2xl font-bold text-cyan-400">5,412</p>
            <span className="text-[11px] text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +124 nets
            </span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Pic Simultané</span>
            <p className="text-2xl font-bold text-indigo-400">842</p>
            <span className="text-[11px] text-neutral-400">En ligne à 21h30</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Heures en Vocal</span>
            <p className="text-2xl font-bold text-purple-400">1,940 h</p>
            <span className="text-[11px] text-emerald-400">+12% vs m-1</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Appels Bot & Slash</span>
            <p className="text-2xl font-bold text-amber-400">24,180</p>
            <span className="text-[11px] text-neutral-400">Commandes & clics</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Score d'Engagement</span>
            <p className="text-2xl font-bold text-emerald-400">98.2 / 100</p>
            <span className="text-[11px] text-emerald-400">Excellente santé</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: "messages", label: "Activité des Messages", icon: MessageSquare },
            { id: "growth", label: "Croissance & Rétention", icon: TrendingUp },
            { id: "heatmap", label: "Heatmap Horaire", icon: Clock },
            { id: "channels", label: "Top Salons & Membres", icon: Users },
            { id: "reports", label: "Rapports Automatiques", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 text-white border-b-2 border-cyan-500"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-neutral-500"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Messages Chart */}
        {activeTab === "messages" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Volume Quotidien de Messages
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Distribution des 14 derniers jours d'activité textuelle
                  </p>
                </div>
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  Moyenne : 6,050 msg/jour
                </span>
              </div>

              {/* Bar Chart Visualization */}
              <div className="pt-6 pb-2">
                <div className="h-56 flex items-end gap-2 md:gap-3 w-full">
                  {messageData.map((item, idx) => {
                    const heightPct = Math.round((item.count / maxMessages) * 100);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-cyan-300 font-bold">
                          {item.count}
                        </div>
                        <div className="w-full bg-neutral-950 rounded-t-lg overflow-hidden h-44 flex items-end">
                          <div
                            className="w-full bg-gradient-to-t from-cyan-600 to-indigo-500 rounded-t-lg group-hover:from-cyan-400 group-hover:to-indigo-400 transition-all duration-300 shadow-lg shadow-cyan-500/10"
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {item.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Message Type Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
                <span className="text-xs text-neutral-400 font-medium">Messages Textuels</span>
                <p className="text-2xl font-bold text-white">82%</p>
                <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full w-[82%]" />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
                <span className="text-xs text-neutral-400 font-medium">Images & Vidéos (Médias)</span>
                <p className="text-2xl font-bold text-cyan-400">12%</p>
                <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full w-[12%]" />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
                <span className="text-xs text-neutral-400 font-medium">Liens & Intégrations</span>
                <p className="text-2xl font-bold text-purple-400">6%</p>
                <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full w-[6%]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Growth & Retention */}
        {activeTab === "growth" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Flux des Membres (30 jours)
                </h3>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs text-neutral-400">Nouveaux arrivants</span>
                    <p className="text-xl font-bold text-emerald-400">+194 membres</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    +6.4 / jour
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs text-neutral-400">Départs constatés</span>
                    <p className="text-xl font-bold text-rose-400">-70 départs</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                    -2.3 / jour
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs text-neutral-400">Croissance nette</span>
                    <p className="text-xl font-bold text-white">+124 membres</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                    Solde positif
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                Taux de Rétention Communautaire
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Pourcentage de nouveaux membres qui restent actifs après avoir rejoint :
              </p>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300 font-semibold">Rétention à 7 jours</span>
                    <span className="text-emerald-400 font-bold font-mono">74.2%</span>
                  </div>
                  <div className="h-2.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[74%]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300 font-semibold">Rétention à 30 jours</span>
                    <span className="text-cyan-400 font-bold font-mono">58.8%</span>
                  </div>
                  <div className="h-2.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full w-[59%]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300 font-semibold">Conversion Onboarding (Règles validées)</span>
                    <span className="text-purple-400 font-bold font-mono">91.5%</span>
                  </div>
                  <div className="h-2.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full w-[91%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Heatmap */}
        {activeTab === "heatmap" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Heatmap d'Affluence Horaire (Créneaux de Pointe)
                </h3>
                <p className="text-xs text-neutral-400">
                  Idéal pour planifier vos concours, annonces staff et sessions de jeu en direct.
                </p>
              </div>
              <span className="text-xs text-amber-300 font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                Pic maximal : 20h - 23h (Ven & Sam)
              </span>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto pt-2">
              <div className="min-w-[650px] space-y-2">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day, dayIdx) => (
                  <div key={day} className="flex items-center gap-2 text-xs">
                    <span className="w-10 font-bold text-neutral-400">{day}</span>
                    <div className="flex-1 grid grid-cols-12 gap-1.5">
                      {Array.from({ length: 12 }).map((_, slotIdx) => {
                        // Intensity logic
                        const isWeekend = dayIdx >= 4;
                        const isPrimeTime = slotIdx >= 8 && slotIdx <= 11;
                        let opacityClass = "bg-neutral-950 border border-neutral-800";
                        if (isPrimeTime && isWeekend) opacityClass = "bg-cyan-400 shadow-md shadow-cyan-400/20";
                        else if (isPrimeTime) opacityClass = "bg-cyan-600";
                        else if (slotIdx >= 6) opacityClass = "bg-cyan-800/70";
                        else if (slotIdx >= 3) opacityClass = "bg-cyan-950/60";

                        return (
                          <div
                            key={slotIdx}
                            className={`h-7 rounded-lg transition-transform hover:scale-105 ${opacityClass}`}
                            title={`${day} ${slotIdx * 2}h - ${slotIdx * 2 + 2}h`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono pt-2 pl-12">
                  <span>00h</span>
                  <span>04h</span>
                  <span>08h</span>
                  <span>12h</span>
                  <span>16h</span>
                  <span>20h</span>
                  <span>24h</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Top Channels & Members */}
        {activeTab === "channels" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Channels Share */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Hash className="w-5 h-5 text-indigo-400" />
                Part de Voix des Salons Textuels
              </h3>

              <div className="space-y-3">
                {topChannels.map((ch) => (
                  <div key={ch.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-white font-medium">#{ch.name}</span>
                      <span className="text-neutral-400 font-mono">
                        {ch.messages.toLocaleString()} msg ({ch.pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${ch.color}`}
                        style={{ width: `${ch.pct * 2}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Chatters */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                Membres les Plus Actifs (30j)
              </h3>

              <div className="divide-y divide-neutral-800">
                {topMembers.map((m) => (
                  <div key={m.rank} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-5 font-mono font-bold text-neutral-400">#{m.rank}</span>
                      <img
                        src={m.avatar}
                        alt={m.name}
                        className="w-8 h-8 rounded-full border border-neutral-700 object-cover"
                      />
                      <span className="font-bold text-white">{m.name}</span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] font-mono">
                      <span className="text-cyan-400 font-semibold">{m.messages} msg</span>
                      <span className="text-purple-400 font-semibold">{m.vocalHours} vocal</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Reports */}
        {activeTab === "reports" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 max-w-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Rapports & Digest Automatiques
            </h3>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Digest Hebdomadaire dans #staff-logs</span>
                  <span className="text-neutral-500 text-[11px]">
                    Envoi automatique d'un rapport complet chaque lundi à 09h00
                  </span>
                </div>
                <span className="text-emerald-400 font-bold">Actif</span>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Alerte de Baisse d'Activité (&gt;30%)</span>
                  <span className="text-neutral-500 text-[11px]">
                    Notifie immédiatement les administrateurs si l'affluence chute anormalement
                  </span>
                </div>
                <span className="text-emerald-400 font-bold">Actif</span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => showToast("Digest hebdomadaire envoyé immédiatement dans Discord !")}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
                >
                  Envoyer un rapport test sur Discord
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
