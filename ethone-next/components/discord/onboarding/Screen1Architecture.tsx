"use client";

import React from "react";
import { LayoutDashboard, Cpu, Activity, ShieldCheck, Zap, Radio } from "lucide-react";
import DiscordIcon from "@/components/DiscordIcon";

export default function Screen1Architecture() {
  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-2 sm:py-6 px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-medium mb-3">
          <Radio className="w-3 h-3 text-teal-400 animate-pulse" />
          <span>ARCHITECTURE UNIFIÉE</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
          Votre serveur Discord, sous contrôle.
        </h3>
        <p className="text-sm text-zinc-400 max-w-lg mx-auto">
          ETHONE Bot est votre centre de contrôle pour automatiser, sécuriser et développer votre communauté depuis une seule interface haute performance.
        </p>
      </div>

      {/* Architecture Visual Diagram */}
      <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 3 Nodes Connected */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10 items-center">
          {/* Node 1: ETHONE Dashboard */}
          <div className="flex flex-col items-center text-center p-4 rounded-xl bg-zinc-950/80 border border-indigo-500/30 shadow-md shadow-indigo-500/5 group hover:border-indigo-500/60 transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">ETHONE Dashboard</h4>
            <p className="text-xs text-zinc-400">Interface Web & Configuration</p>
            <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-mono">
              Next.js 15 App
            </div>
          </div>

          {/* Node 2: ETHONE Bot Core (Center) */}
          <div className="flex flex-col items-center text-center p-4 rounded-xl bg-gradient-to-b from-indigo-950/40 to-zinc-950/90 border border-indigo-500/40 shadow-lg shadow-indigo-500/10 relative">
            <div className="absolute -top-2.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Online (18ms)</span>
            </div>

            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white mb-3 shadow-md">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">ETHONE Bot Engine</h4>
            <p className="text-xs text-zinc-400">Microservice WebSocket</p>
            <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 text-[10px] font-mono">
              Port 3001 • Fastify/REST
            </div>
          </div>

          {/* Node 3: Discord Server */}
          <div className="flex flex-col items-center text-center p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 shadow-md group hover:border-zinc-700 transition">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-indigo-400 mb-3">
              <DiscordIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">Serveur Discord</h4>
            <p className="text-xs text-zinc-400">Salons, Rôles & Membres</p>
            <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-mono">
              Gateway v10 API
            </div>
          </div>
        </div>

        {/* Live Metrics strip below diagram */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">SYNCHRONISATION</div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
              <Activity className="w-3 h-3" /> Temps Réel
            </div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">SÉCURITÉ</div>
            <div className="text-xs font-semibold text-indigo-300 flex items-center justify-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3" /> RBAC & TLS 1.3
            </div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">RÉACTIVITÉ</div>
            <div className="text-xs font-semibold text-amber-300 flex items-center justify-center gap-1 mt-0.5">
              <Zap className="w-3 h-3" /> &lt; 25ms Event loop
            </div>
          </div>
        </div>
      </div>

      {/* Value statement */}
      <div className="text-xs text-zinc-400 text-center max-w-md bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/50">
        💡 Plus besoin de taper des commandes complexes dans Discord : chaque modification effectuée sur ETHONE prend effet instantanément sur votre serveur.
      </div>
    </div>
  );
}
