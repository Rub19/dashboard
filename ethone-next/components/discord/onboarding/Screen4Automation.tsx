"use client";

import React from "react";
import { Zap, UserPlus, Sparkles, UserCheck, ShieldCheck, Award, ArrowRight } from "lucide-react";

export default function Screen4Automation() {
  const steps = [
    {
      step: "01",
      title: "Arrivée d'un membre",
      desc: "Détection immédiate via l'événement GuildMemberAdd",
      icon: UserPlus,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      step: "02",
      title: "Message & Carte d'Accueil",
      desc: "Embed dynamique avec avatar et numéro de membre",
      icon: Sparkles,
      color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    },
    {
      step: "03",
      title: "Attribution Auto-Rôle",
      desc: "Rôle @Nouveau attribué instantanément sans lag",
      icon: UserCheck,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      step: "04",
      title: "Vérification des Règles",
      desc: "Validation interactive des conditions d'accès",
      icon: ShieldCheck,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      step: "05",
      title: "Suivi d'Expérience & XP",
      desc: "Accumulation automatique d'XP et paliers",
      icon: Award,
      color: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20",
    },
  ];

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-2 sm:py-6 px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-3">
          <Zap className="w-3 h-3 text-indigo-400 animate-pulse" />
          <span>FLUX AUTOMATISÉS</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
          Faites travailler le bot pour vous.
        </h3>
        <p className="text-sm text-zinc-400 max-w-lg mx-auto">
          Les modules d'ETHONE interagissent en synergie pour créer des parcours fluides et automatisés du premier clic au statut de vétéran.
        </p>
      </div>

      {/* Interactive Pipeline Sequence */}
      <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 mb-5 shadow-xl relative backdrop-blur-sm">
        <div className="space-y-3">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/70 hover:border-zinc-700 transition"
              >
                <div className={`p-2 rounded-xl border shrink-0 ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-zinc-500">{s.step}</span>
                    <span className="text-xs font-bold text-white truncate">{s.title}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">{s.desc}</div>
                </div>

                {idx < steps.length - 1 && (
                  <div className="hidden sm:flex text-zinc-600">
                    <ArrowRight className="w-4 h-4 rotate-90 sm:rotate-0" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Workflow Summary tag */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>Temps d'exécution moyen du workflow :</span>
          <span className="text-emerald-400 font-mono font-bold">&lt; 150 ms total</span>
        </div>
      </div>

      <div className="text-xs text-zinc-400 text-center max-w-md bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/50">
        ⚡ Chaque action est journalisée dans l'Audit Center pour une traçabilité totale.
      </div>
    </div>
  );
}
