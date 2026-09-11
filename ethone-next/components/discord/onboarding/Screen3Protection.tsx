"use client";

import React from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, Zap, Lock } from "lucide-react";
import DiscordIcon from "@/components/DiscordIcon";

export default function Screen3Protection() {
  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-2 sm:py-6 px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 text-[var(--accent-primary)] text-xs font-medium mb-3">
          <ShieldAlert className="w-3 h-3" />
          <span>SÉCURITÉ TEMPS RÉEL</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
          Votre serveur n'est jamais laissé sans surveillance.
        </h3>
        <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto">
          AutoMod, Anti-Raid et l'IA de sécurité analysent en continu chaque événement pour neutraliser les attaques en quelques millisecondes.
        </p>
      </div>

      {/* Interactive Protection Centerpiece */}
      <div className="v8-panel w-full p-5 mb-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          
          {/* Server Hub Icon with Shield */}
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 flex items-center justify-center relative">
              <DiscordIcon className="w-10 h-10 text-[var(--accent-primary)]" />
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[var(--success)] text-[var(--bg-main)]">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Orbiting threats intercepted list */}
          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--danger)]/20 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />
                <span className="text-[var(--text-muted)] font-medium">Spam mass-mention (@everyone)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[var(--danger)]/10 text-[var(--danger)] text-[10px] font-bold">INTERCEPTÉ</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--warning)]/20 text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
                <span className="text-[var(--text-muted)] font-medium">Vague de bots suspects (14 joins/10s)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[var(--warning)]/10 text-[var(--warning)] text-[10px] font-bold">CAPTCHA ACTIF</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--success)]/20 text-xs">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                <span className="text-[var(--text-muted)] font-medium">Lien phishing frauduleux</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] text-[10px] font-bold">SUPPRIMÉ (8ms)</span>
            </div>
          </div>
        </div>

        {/* 3-Stage Reaction Pipeline */}
        <div className="mt-5 pt-4 border-t border-[var(--panel-border)]">
          <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2 text-center">
            CYCLE DE PROTECTION AUTOMATISÉ
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--panel-border)] text-center">
              <div className="text-[11px] font-bold text-[var(--text-primary)] mb-0.5">1. Détection</div>
              <div className="text-[10px] text-[var(--text-muted)] leading-tight">Analyse de signature en temps réel</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--panel-border)] text-center">
              <div className="text-[11px] font-bold text-[var(--text-primary)] mb-0.5">2. Évaluation</div>
              <div className="text-[10px] text-[var(--text-muted)] leading-tight">Calcul du Risk Score & sévérité</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--panel-border)] text-center">
              <div className="text-[11px] font-bold text-[var(--text-primary)] mb-0.5">3. Neutralisation</div>
              <div className="text-[10px] text-[var(--text-muted)] leading-tight">Sanction & journalisation d'audit</div>
            </div>
          </div>
        </div>
      </div>

      <div className="v8-inset text-xs text-[var(--text-muted)] text-center max-w-md p-2.5">
        🛡️ Vos modérateurs n'ont plus à rester éveillés 24h/24 : ETHONE applique vos règles avec précision et constance.
      </div>
    </div>
  );
}
