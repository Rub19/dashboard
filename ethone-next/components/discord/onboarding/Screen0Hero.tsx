"use client";

import React from "react";
import { Sparkles, Shield, Zap, ArrowRight, Music, Bell } from "lucide-react";
import DiscordIcon from "@/components/DiscordIcon";

interface Screen0Props {
  onNext: () => void;
  onSkip: () => void;
}

export default function Screen0Hero({ onNext, onSkip }: Screen0Props) {
  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto py-4 sm:py-8 px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Top Floating Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-medium tracking-wide mb-6 shadow-sm shadow-indigo-500/10">
        <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
        <span>EXPÉRIENCE SAAS DISCORD 2.0</span>
      </div>

      {/* Main Bot Logo / Icon with glowing ring */}
      <div className="relative mb-6 group">
        <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-60 transition duration-700"></div>
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl overflow-hidden">
          <DiscordIcon className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-400" />
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
        ETHONE <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-teal-300 bg-clip-text text-transparent">BOT</span>
      </h2>
      <p className="text-base sm:text-lg text-zinc-300 font-medium mb-3">
        Your Discord server, automated.
      </p>

      {/* Description */}
      <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed mb-8">
        ETHONE Bot centralise la gestion de votre serveur Discord : modération automatisée, sécurité anti-raid IA, lecteur musique haute fidélité, tickets de support et analytics en temps réel.
      </p>

      {/* Feature Highlights Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-lg mb-8">
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-300">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Anti-Raid IA</span>
        </div>
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-300">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Automatisations</span>
        </div>
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-300">
          <Music className="w-3.5 h-3.5 text-violet-400" />
          <span>Audio Lossless</span>
        </div>
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-300">
          <Bell className="w-3.5 h-3.5 text-teal-400" />
          <span>Logs & Audit</span>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          onClick={onNext}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 cursor-pointer"
        >
          <span>Découvrir ETHONE Bot</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onSkip}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-sm font-medium border border-zinc-800 transition cursor-pointer"
        >
          Passer l'introduction
        </button>
      </div>
    </div>
  );
}
