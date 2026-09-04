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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
          <Rocket className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>LANCEMENT IMMÉDIAT</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
          Prêt à configurer votre serveur ?
        </h3>
        <p className="text-sm text-zinc-400 max-w-lg mx-auto">
          Quelques minutes suffisent pour transformer votre serveur Discord en un espace plus sûr, plus organisé et plus automatisé.
        </p>
      </div>

      {/* 4 Steps Roadmap */}
      <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 mb-6 shadow-xl relative backdrop-blur-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.num} className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-start gap-3">
                <span className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 font-mono text-xs font-bold shrink-0">
                  {s.num}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">{s.title}</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{s.desc}</p>
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
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 cursor-pointer"
        >
          <span>Configurer mon serveur</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onExploreDashboard}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-sm font-medium border border-zinc-800 transition cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4 text-zinc-400" />
          <span>Explorer le dashboard</span>
        </button>
      </div>
    </div>
  );
}
