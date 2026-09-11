"use client";

import React from "react";
import { Rocket, ArrowRight, LayoutDashboard, CheckCircle2, ShieldCheck, Sparkles, Sliders } from "lucide-react";

interface Screen7Props {
  onStartSetup: () => void;
  onExploreDashboard: () => void;
}

export default function Screen7GettingStarted({ onStartSetup, onExploreDashboard }: Screen7Props) {
  const steps = [
    { num: "01", title: "Connecter votre serveur", desc: "Associez votre compte et sélectionnez le serveur à gérer.", icon: CheckCircle2 },
    { num: "02", title: "Configurer les permissions", desc: "Vérifiez les droits d'administration et les rôles du bot.", icon: ShieldCheck },
    { num: "03", title: "Activer vos premiers modules", desc: "Modération, Anti-Raid, Bienvenue et Journal d'Audit.", icon: Sparkles },
    { num: "04", title: "Personnaliser l'expérience", desc: "Ajustez les préfixes, formulaires et options avancées.", icon: Sliders },
  ];

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-2 sm:py-6 px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 text-[var(--accent-primary)] text-xs font-medium mb-3">
          <Rocket className="w-3 h-3" />
          <span>LANCEMENT IMMÉDIAT</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
          Prêt à configurer votre serveur ?
        </h3>
        <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto">
          Quelques minutes suffisent pour transformer votre serveur Discord en un espace plus sûr, plus organisé et plus automatisé.
        </p>
      </div>

      {/* 4 Steps Roadmap */}
      <div className="v8-panel w-full p-5 mb-6 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {steps.map((s) => {
            return (
              <div key={s.num} className="p-3 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--panel-border)] flex items-start gap-3">
                <span className="px-2 py-1 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-bold shrink-0">
                  {s.num}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">{s.title}</h4>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          onClick={onStartSetup}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-semibold text-sm transition-[filter] duration-200 hover:brightness-110 cursor-pointer"
        >
          <span>Configurer mon serveur</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onExploreDashboard}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm font-medium border border-[var(--panel-border)] transition cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4 text-[var(--text-muted)]" />
          <span>Explorer le dashboard</span>
        </button>
      </div>
    </div>
  );
}
