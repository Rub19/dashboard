"use client";

import React from "react";
import { Shield, Zap, ArrowRight, Music, Users } from "@/components/icons/ph";
import DiscordIcon from "@/components/DiscordIcon";
import { motion } from "framer-motion";
import { SPRING_PRESS } from "@/lib/ease";

interface Screen0WelcomeProps {
  onNext: () => void;
  onSkip: () => void;
}

export default function Screen0Welcome({ onNext, onSkip }: Screen0WelcomeProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto py-2 sm:py-6 px-4">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#92C8D2]/10 border border-[#92C8D2]/25 text-[#92C8D2] text-xs font-semibold tracking-wide mb-5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span>BIENVENUE SUR ETHO</span>
      </div>

      <div className="relative mb-5">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0c0d14] border border-white/10 flex items-center justify-center shadow-2xl shadow-black/80">
          <DiscordIcon className="w-9 h-9 sm:w-11 sm:h-11 text-[#92C8D2]" />
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
        ETHO <span className="bg-gradient-to-r from-[#92C8D2] to-emerald-400 bg-clip-text text-transparent">CONSOLE</span>
      </h2>
      <p className="text-xs sm:text-sm text-zinc-400 font-medium max-w-lg leading-relaxed mb-6">
        Sécurité chirurgicale, lecteur musique haute fidélité, pont vocal Spotify et gestion communautaire pour votre serveur Discord, réunis dans un dashboard fluide et sans superflu.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg mb-8 text-left">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-colors">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Anti-Raid 0.2s</p>
            <p className="text-[11px] text-zinc-400 truncate">Sanction immédiate & bouclier</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-colors">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-[#1DB954]/10 border border-[#1DB954]/20 grid place-items-center text-[#1DB954]">
            <Music className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Pont vocal Spotify</p>
            <p className="text-[11px] text-zinc-400 truncate">Diffusion directe en salon vocal</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-colors">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-[#92C8D2]/10 border border-[#92C8D2]/20 grid place-items-center text-[#92C8D2]">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Salons Compteurs</p>
            <p className="text-[11px] text-zinc-400 truncate">Server Stats dynamiques en direct</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-colors">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-cyan-500/10 border border-cyan-500/20 grid place-items-center text-cyan-400">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Zéro latence</p>
            <p className="text-[11px] text-zinc-400 truncate">Temps de réponse sub-15ms</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <motion.button
          whileTap={SPRING_PRESS}
          onClick={onNext}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold text-xs shadow-lg shadow-white/10 hover:bg-zinc-100 transition-all cursor-pointer"
        >
          <span>Découvrir les fonctionnalités</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          whileTap={SPRING_PRESS}
          onClick={onSkip}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer"
        >
          Passer l&apos;introduction
        </motion.button>
      </div>
    </div>
  );
}
