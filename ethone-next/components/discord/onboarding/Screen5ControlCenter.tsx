"use client";

import React from "react";
import { Users, MessageSquare, ShieldCheck, Ticket, Activity, Music2 } from "lucide-react";

export default function Screen5ControlCenter() {
  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-2 sm:py-6 px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-3">
          <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>VUE D'ENSEMBLE UNIFIÉE</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
          Un seul dashboard. Tout votre serveur.
        </h3>
        <p className="text-sm text-zinc-400 max-w-lg mx-auto">
          Fini les onglets éparpillés. Surveillez, configurez et animez votre communauté depuis une console unique connectée en direct.
        </p>
      </div>

      {/* Live Synced Metrics Grid */}
      <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 mb-5 shadow-xl relative backdrop-blur-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Card 1 */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] text-emerald-400 font-mono font-semibold">+14%</span>
            </div>
            <div className="text-lg font-bold text-white tracking-tight">1,284</div>
            <div className="text-[11px] text-zinc-400">Membres totaux</div>
          </div>

          {/* Card 2 */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <MessageSquare className="w-4 h-4 text-teal-400" />
              <span className="text-[10px] text-teal-400 font-mono font-semibold">Live</span>
            </div>
            <div className="text-lg font-bold text-white tracking-tight">32 msg/min</div>
            <div className="text-[11px] text-zinc-400">Débit de discussion</div>
          </div>

          {/* Card 3 */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">OPTIMAL</span>
            </div>
            <div className="text-lg font-bold text-white tracking-tight">12 / 100</div>
            <div className="text-[11px] text-zinc-400">Risk Score Global</div>
          </div>

          {/* Card 4 */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <Ticket className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] text-zinc-400 font-mono">4m moy.</span>
            </div>
            <div className="text-lg font-bold text-white tracking-tight">3 Actifs</div>
            <div className="text-[11px] text-zinc-400">Tickets de Support</div>
          </div>

          {/* Card 5 */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] text-cyan-400 font-mono font-semibold">Fort</span>
            </div>
            <div className="text-lg font-bold text-white tracking-tight">87%</div>
            <div className="text-[11px] text-zinc-400">Taux d'activité</div>
          </div>

          {/* Card 6 */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <Music2 className="w-4 h-4 text-violet-400" />
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            </div>
            <div className="text-sm font-bold text-white truncate">Lofi Beats</div>
            <div className="text-[11px] text-zinc-400">🔊 Vocal 1 • 2 auditeurs</div>
          </div>
        </div>

        {/* Live sync pill */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Synchronisation continue avec le serveur Discord</span>
        </div>
      </div>

      <div className="text-xs text-zinc-400 text-center max-w-md bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/50">
        📊 Les graphiques et rapports sont mis à jour en instantané dès qu'un message ou une action est effectuée.
      </div>
    </div>
  );
}
