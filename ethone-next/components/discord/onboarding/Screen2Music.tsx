"use client";

import React from "react";
import { Music, ArrowRight, Disc, Play } from "@/components/icons/ph";
import { motion } from "framer-motion";
import { SPRING_PRESS } from "@/lib/ease";

interface Screen2MusicProps {
  onNext?: () => void;
}

export default function Screen2Music({ onNext }: Screen2MusicProps) {
  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-2 sm:py-6 px-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/25 text-[#1DB954] text-xs font-semibold mb-3">
          <Music className="w-3.5 h-3.5" />
          <span>MUSIQUE & PONT VOCAL SPOTIFY</span>
        </div>
        <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
          Diffusion haute fidélité & intégrations directes.
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
          Partage tes morceaux en direct dans ton salon vocal, suis tes écoutes Last.fm et affiche les paroles instantanément sans la moindre coupure.
        </p>
      </div>

      <div className="w-full space-y-3 mb-6">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-[#1DB954]/30 transition-all text-left">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-[#1DB954]/10 border border-[#1DB954]/20 grid place-items-center text-[#1DB954]">
              <Disc className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white">Pont vocal Spotify direct</h4>
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                  /spotify vc
                </code>
              </div>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Connecte ton Spotify en un clic pour diffuser ton écoute en direct dans le salon vocal où tu te trouves, avec boutons de contrôle interactifs.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-[#ba0000]/30 transition-all text-left">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-[#ba0000]/10 border border-[#ba0000]/20 grid place-items-center text-red-400">
              <Play className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white">Scrobbles & Profils Last.fm</h4>
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-red-300">
                  /lastfm nowplaying
                </code>
              </div>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Affichage des écoutes en cours, de tes artistes les plus écoutés, de tes albums favoris et de tes compatibilités musicales avec les autres membres de ton serveur.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-[#a78bfa]/30 transition-all text-left">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-[#a78bfa]/10 border border-[#a78bfa]/20 grid place-items-center text-[#c084fc]">
              <Music className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white">Paroles Synchronisées en Direct</h4>
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-purple-300">
                  /lyrics query:&lt;titre&gt;
                </code>
              </div>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Recherche automatique des paroles complètes via le moteur LRCLib avec timestamps, durée et jaquette, sans quitter Discord ni ouvrir d&apos;application tierce.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full rounded-xl border border-white/[0.08] bg-[#0d1310] p-3 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#1DB954] animate-pulse" />
            <span className="text-xs font-bold text-white">Lecteur Musique Studio</span>
          </div>
          <span className="text-[10px] font-mono text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded-md border border-[#1DB954]/20">
            320 kbps Lossless
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
          <span className="truncate">Spotify · SoundCloud · YouTube</span>
        </div>
      </div>

      {onNext && (
        <div className="mt-6 flex justify-end w-full">
          <motion.button
            whileTap={SPRING_PRESS}
            onClick={onNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs shadow-lg shadow-white/10 hover:bg-zinc-100 transition-all cursor-pointer"
          >
            <span>Suivant : Outils & Démarrage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      )}
    </div>
  );
}
