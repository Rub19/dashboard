"use client";

import React from "react";
import { Users, MessageSquare, ShieldCheck, Ticket, Activity, Music2 } from "lucide-react";

export default function Screen5ControlCenter() {
  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-2 sm:py-6 px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 text-[var(--accent-primary)] text-xs font-medium mb-3">
          <Activity className="w-3 h-3" />
          <span>VUE D'ENSEMBLE UNIFIÉE</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
          Un seul dashboard. Tout votre serveur.
        </h3>
        <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto">
          Fini les onglets éparpillés. Surveillez, configurez et animez votre communauté depuis une console unique connectée en direct.
        </p>
      </div>

      {/* Live Synced Metrics Grid */}
      <div className="v8-panel w-full p-5 mb-5 relative">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Card 1 */}
          <div className="p-3 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--panel-border)]">
            <div className="flex items-center justify-between mb-1.5">
              <Users className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[10px] text-[var(--success)] font-semibold">+14%</span>
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)] tracking-tight">1,284</div>
            <div className="text-[11px] text-[var(--text-muted)]">Membres totaux</div>
          </div>

          {/* Card 2 */}
          <div className="p-3 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--panel-border)]">
            <div className="flex items-center justify-between mb-1.5">
              <MessageSquare className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[10px] text-[var(--success)] font-semibold">Live</span>
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)] tracking-tight">32 msg/min</div>
            <div className="text-[11px] text-[var(--text-muted)]">Débit de discussion</div>
          </div>

          {/* Card 3 */}
          <div className="p-3 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--panel-border)]">
            <div className="flex items-center justify-between mb-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="px-1.5 py-0.2 rounded bg-[var(--success)]/20 text-[var(--success)] text-[9px] font-bold">OPTIMAL</span>
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)] tracking-tight">12 / 100</div>
            <div className="text-[11px] text-[var(--text-muted)]">Risk Score Global</div>
          </div>

          {/* Card 4 */}
          <div className="p-3 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--panel-border)]">
            <div className="flex items-center justify-between mb-1.5">
              <Ticket className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[10px] text-[var(--text-muted)]">4m moy.</span>
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)] tracking-tight">3 Actifs</div>
            <div className="text-[11px] text-[var(--text-muted)]">Tickets de Support</div>
          </div>

          {/* Card 5 */}
          <div className="p-3 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--panel-border)]">
            <div className="flex items-center justify-between mb-1.5">
              <Activity className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[10px] text-[var(--success)] font-semibold">Fort</span>
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)] tracking-tight">87%</div>
            <div className="text-[11px] text-[var(--text-muted)]">Taux d'activité</div>
          </div>

          {/* Card 6 */}
          <div className="p-3 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--panel-border)]">
            <div className="flex items-center justify-between mb-1.5">
              <Music2 className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)] truncate">Lofi Beats</div>
            <div className="text-[11px] text-[var(--text-muted)]">🔊 Vocal 1 • 2 auditeurs</div>
          </div>
        </div>

        {/* Live sync pill */}
        <div className="mt-4 pt-3 border-t border-[var(--panel-border)] flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
          <span>Synchronisation continue avec le serveur Discord</span>
        </div>
      </div>

      <div className="v8-inset text-xs text-[var(--text-muted)] text-center max-w-md p-2.5">
        📊 Les graphiques et rapports sont mis à jour en instantané dès qu'un message ou une action est effectuée.
      </div>
    </div>
  );
}
