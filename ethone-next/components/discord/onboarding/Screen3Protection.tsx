"use client";

import React from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, Zap, Lock } from "lucide-react";
import DiscordIcon from "@/components/DiscordIcon";

export default function Screen3Protection() {
  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-2 sm:py-6 px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium mb-3">
          <ShieldAlert className="w-3 h-3 text-rose-400 animate-pulse" />
          <span>SÉCURITÉ TEMPS RÉEL</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
          Votre serveur n'est jamais laissé sans surveillance.
        </h3>
        <p className="text-sm text-zinc-400 max-w-lg mx-auto">
          AutoMod, Anti-Raid et l'IA de sécurité analysent en continu chaque événement pour neutraliser les attaques en quelques millisecondes.
        </p>
      </div>

      {/* Interactive Protection Centerpiece */}
      <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 mb-5 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          
          {/* Server Hub Icon with Shield */}
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-900/40 via-purple-900/30 to-emerald-950/40 border border-indigo-500/30 flex items-center justify-center relative shadow-xl">
              <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping opacity-30 pointer-events-none" />
              <DiscordIcon className="w-10 h-10 text-indigo-300" />
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-black shadow-md">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Orbiting threats intercepted list */}
          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/80 border border-rose-500/20 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="text-zinc-300 font-medium">Spam mass-mention (@everyone)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-mono font-bold">INTERCEPTÉ</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/80 border border-amber-500/20 text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-zinc-300 font-medium">Vague de bots suspects (14 joins/10s)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold">CAPTCHA ACTIF</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/80 border border-emerald-500/20 text-xs">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-zinc-300 font-medium">Lien phishing frauduleux</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">SUPPRIMÉ (8ms)</span>
            </div>
          </div>
        </div>

        {/* 3-Stage Reaction Pipeline */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80">
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-2 text-center">
            CYCLE DE PROTECTION AUTOMATISÉ
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-center">
              <div className="text-[11px] font-bold text-amber-400 mb-0.5">1. Détection</div>
              <div className="text-[10px] text-zinc-400 leading-tight">Analyse de signature en temps réel</div>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-center">
              <div className="text-[11px] font-bold text-indigo-400 mb-0.5">2. Évaluation</div>
              <div className="text-[10px] text-zinc-400 leading-tight">Calcul du Risk Score & sévérité</div>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-center">
              <div className="text-[11px] font-bold text-emerald-400 mb-0.5">3. Neutralisation</div>
              <div className="text-[10px] text-zinc-400 leading-tight">Sanction & journalisation d'audit</div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-zinc-400 text-center max-w-md bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/50">
        🛡️ Vos modérateurs n'ont plus à rester éveillés 24h/24 : ETHONE applique vos règles avec précision et constance.
      </div>
    </div>
  );
}
