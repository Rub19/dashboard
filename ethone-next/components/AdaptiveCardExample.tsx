"use client";

import React from "react";
import { Receipt, Calendar, Plus, ScanLine, ArrowUpRight } from "lucide-react";

export function AdaptiveInvoicesCard() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-2xl select-none transition-colors duration-200 dark:border-white/[0.08] dark:bg-zinc-950/70 dark:shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-emerald-600/20 bg-emerald-500/15 p-2 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Factures</h3>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-500">Gestion des dépenses</p>
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-xl font-bold tracking-tight text-zinc-900 dark:text-white">0,00 €</div>
          <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-500">0 à venir dans 30 jours</p>
        </div>
      </div>

      {/* Sous-bloc descriptif bien contrasté */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200/60 bg-zinc-100/80 p-3.5 dark:border-white/[0.04] dark:bg-white/[0.02]">
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Statut du mois</span>
        <span className="rounded-lg border border-emerald-600/20 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
          À jour
        </span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-600/20 bg-emerald-500/15 py-2.5 px-3 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-500/25 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200/60 bg-zinc-100/80 py-2.5 px-3 text-xs font-bold text-zinc-700 transition-all hover:bg-zinc-200/80 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
        >
          <ScanLine className="h-3.5 w-3.5" />
          Scanner
        </button>
      </div>

      {/* Liens secondaires */}
      <button
        type="button"
        className="group flex w-full items-center justify-between rounded-xl border border-zinc-200/60 bg-zinc-100/80 px-3 py-2.5 transition-all hover:bg-zinc-200/80 dark:border-white/[0.04] dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Historique mensuel</span>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-zinc-400" />
      </button>
    </div>
  );
}
