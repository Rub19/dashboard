"use client";

import React from "react";
import { LayoutDashboard, Cpu, Activity, ShieldCheck, Zap, Radio } from "lucide-react";
import DiscordIcon from "@/components/DiscordIcon";

export default function Screen1Architecture() {
  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-2 sm:py-6 px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 text-[var(--accent-primary)] text-xs font-medium mb-3">
          <Radio className="w-3 h-3" />
          <span>ARCHITECTURE UNIFIÉE</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
          Votre serveur Discord, sous contrôle.
        </h3>
        <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto">
          ETHONE Bot est votre centre de contrôle pour automatiser, sécuriser et développer votre communauté depuis une seule interface haute performance.
        </p>
      </div>

      {/* Architecture Visual Diagram */}
      <div className="v8-panel w-full p-4 sm:p-6 mb-6 relative overflow-hidden">
        {/* 3 Nodes Connected */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10 items-center">
          {/* Node 1: ETHONE Dashboard */}
          <div className="flex flex-col items-center text-center p-4 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--accent-primary)]/25 transition-colors hover:border-[var(--accent-primary)]/50">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 flex items-center justify-center text-[var(--accent-primary)] mb-3">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">ETHONE Dashboard</h4>
            <p className="text-xs text-[var(--text-muted)]">Interface Web & Configuration</p>
            <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[10px]">
              Next.js 15 App
            </div>
          </div>

          {/* Node 2: ETHONE Bot Core (Center) */}
          <div className="flex flex-col items-center text-center p-4 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/40 relative">
            <div className="absolute -top-2.5 px-2.5 py-0.5 rounded-full bg-[var(--success)]/15 border border-[var(--success)]/40 text-[var(--success)] text-[10px] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"></span>
              <span>Online (18ms)</span>
            </div>

            <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-contrast)] mb-3">
              <Cpu className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">ETHONE Bot Engine</h4>
            <p className="text-xs text-[var(--text-muted)]">Microservice WebSocket</p>
            <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] text-[10px]">
              Port 3001 • Fastify/REST
            </div>
          </div>

          {/* Node 3: Discord Server */}
          <div className="flex flex-col items-center text-center p-4 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--panel-border)] transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--panel-border)] flex items-center justify-center text-[var(--text-muted)] mb-3">
              <DiscordIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Serveur Discord</h4>
            <p className="text-xs text-[var(--text-muted)]">Salons, Rôles & Membres</p>
            <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] text-[10px] font-mono">
              Gateway v10 API
            </div>
          </div>
        </div>

        {/* Live Metrics strip below diagram */}
        <div className="mt-5 pt-4 border-t border-[var(--panel-border)] grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[11px] text-[var(--text-muted)] font-medium">SYNCHRONISATION</div>
            <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1 mt-0.5">
              <Activity className="w-3 h-3" /> Temps Réel
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--text-muted)] font-medium">SÉCURITÉ</div>
            <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3" /> RBAC & TLS 1.3
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--text-muted)] font-medium">RÉACTIVITÉ</div>
            <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1 mt-0.5">
              <Zap className="w-3 h-3" /> &lt; 25ms Event loop
            </div>
          </div>
        </div>
      </div>

      {/* Value statement */}
      <div className="v8-inset text-xs text-[var(--text-muted)] text-center max-w-md p-3">
        💡 Plus besoin de taper des commandes complexes dans Discord : chaque modification effectuée sur ETHONE prend effet instantanément sur votre serveur.
      </div>
    </div>
  );
}
