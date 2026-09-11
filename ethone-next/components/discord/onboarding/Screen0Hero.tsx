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
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 text-[var(--accent-primary)] text-xs font-medium tracking-wide mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        <span>BIENVENUE</span>
      </div>

      {/* Main Bot Logo / Icon */}
      <div className="relative mb-6">
        <div className="v8-panel relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center overflow-hidden">
          <DiscordIcon className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--accent-primary)]" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] mb-3">
        ETHONE <span className="text-[var(--accent-primary)]">BOT</span>
      </h2>
      <p className="text-base sm:text-lg text-[var(--text-muted)] font-medium mb-3">
        Your Discord server, automated.
      </p>

      {/* Description */}
      <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-xl leading-relaxed mb-8">
        ETHONE Bot centralise la gestion de votre serveur Discord : modération automatisée, sécurité anti-raid IA, lecteur musique haute fidélité, tickets de support et analytics en temps réel.
      </p>

      {/* Feature Highlights Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-lg mb-8">
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-muted)]">
          <Shield className="w-3.5 h-3.5" />
          <span>Anti-Raid IA</span>
        </div>
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-muted)]">
          <Zap className="w-3.5 h-3.5" />
          <span>Automatisations</span>
        </div>
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-muted)]">
          <Music className="w-3.5 h-3.5" />
          <span>Audio Lossless</span>
        </div>
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-muted)]">
          <Bell className="w-3.5 h-3.5" />
          <span>Logs & Audit</span>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          onClick={onNext}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-medium text-sm transition-[filter] duration-200 hover:brightness-110 cursor-pointer"
        >
          <span>Découvrir ETHONE Bot</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onSkip}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm font-medium border border-[var(--panel-border)] transition cursor-pointer"
        >
          Passer l'introduction
        </button>
      </div>
    </div>
  );
}
