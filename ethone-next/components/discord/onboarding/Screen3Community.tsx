"use client";

import React from "react";
import { Sparkles, Users, Tag, Check, ArrowRight, ShieldCheck } from "@/components/icons/ph";
import { motion } from "framer-motion";
import { SPRING_PRESS } from "@/lib/ease";
import { tx } from "@/lib/tx";

interface Screen3CommunityProps {
  onFinish: () => void;
  onPrev?: () => void;
}

export default function Screen3Community({ onFinish }: Screen3CommunityProps) {
  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-2 sm:py-6 px-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{tx("OUTILS COMMUNAUTÉ & AUTOMATISATION")}</span>
        </div>
        <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
          {tx("Tout ce dont ton serveur a besoin.")}
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
          {tx("Configure tes salons compteurs en un instant, partage tes tags de réponses rapides et pilote tous tes serveurs depuis ton tableau de bord.")}
        </p>
      </div>

      <div className="w-full space-y-3 mb-6">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-cyan-500/30 transition-all text-left">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-cyan-500/10 border border-cyan-500/20 grid place-items-center text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white">{tx("Server Stats & Salons Compteurs")}</h4>
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                  {tx("/serverstats add")}
                </code>
              </div>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                {tx("Salons vocaux verrouillés affichant automatiquement le nombre de membres, en ligne, boosts et rôles de ton serveur avec rafraîchissement programmé.")}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 transition-all text-left">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 grid place-items-center text-indigo-400">
              <Tag className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white">{tx("Tags & Réponses Rapides")}</h4>
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-indigo-300">
                  {tx("/tag get <nom>")}
                </code>
              </div>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                {tx("Création et rappel instantané de messages types, FAQ et liens utiles par autocomplétion pour aider ta communauté sans te répéter.")}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/30 transition-all text-left">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white">{tx("AutoMod Natif & Rôles de Sécurité")}</h4>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  {tx("SYNCHRONISÉ")}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                {tx("Gestion des règles natives Discord, filtres anti-spam par canal, isolation des rôles à haut privilège et audits de conformité instantanés.")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full rounded-xl border border-white/[0.08] bg-black/40 p-4 text-center">
        <h4 className="text-sm font-bold text-white mb-1">
          {tx("Tu es prêt à prendre les commandes.")}
        </h4>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mb-4 leading-relaxed">
          {tx("Sélectionne un serveur dans la liste pour activer les modules désirés et ajuster les protections en temps réel.")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <motion.button
            whileTap={SPRING_PRESS}
            onClick={onFinish}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold text-xs shadow-xl shadow-white/10 hover:bg-zinc-100 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{tx("Accéder à mes serveurs")}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
