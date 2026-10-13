"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, Lock, AlertTriangle, ArrowRight } from "@/components/icons/ph";
import { motion } from "framer-motion";
import { SPRING_PRESS } from "@/lib/ease";

interface Screen1SecurityProps {
  onNext?: () => void;
}

export default function Screen1Security({ onNext }: Screen1SecurityProps) {
  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-2 sm:py-6 px-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold mb-3">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>SÉCURITÉ & ANTI-RAID 0.2S</span>
        </div>
        <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
          Protection chirurgicale en temps réel.
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
          Chaque événement de votre serveur est surveillé avec une précision absolue : raids, mass-mentions, suppressions suspectes et comptes frauduleux sont neutralisés en 0.2s.
        </p>
      </div>

      <div className="w-full space-y-3 mb-6">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/30 transition-all text-left">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white">Détection & Sanction 0.2s</h4>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  ACTIF
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Interception immédiate des attaques de raid, blocage des mass-mentions (@everyone) et expulsion instantanée des tokens suspects avant tout impact.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-cyan-500/30 transition-all text-left">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-[#92C8D2]/10 border border-[#92C8D2]/20 grid place-items-center text-[#92C8D2]">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white">Bouclier Owner & Rôles Protégés</h4>
                <span className="rounded-md bg-[#92C8D2]/20 px-2 py-0.5 text-[10px] font-bold text-[#92C8D2]">
                  NIVEAU OWNER
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Protection des permissions d&apos;administration, prévention contre la suppression en masse de salons et alertes directes en cas de comportement administrateur anormal.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-amber-500/30 transition-all text-left">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white">Mode d&apos;Urgence Immédiat</h4>
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                  /antiraid lock
                </code>
              </div>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Verrouillage immédiat des salons textuels et vocaux en un clic pour geler la situation et sécuriser la communauté en cas d&apos;incident grave.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full rounded-xl border border-white/[0.06] bg-black/40 p-3 font-mono text-[11px] text-zinc-400 text-left">
        <div className="flex items-center justify-between text-zinc-500 border-b border-white/[0.06] pb-1.5 mb-2">
          <span>Journal de défense en direct</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            0 menace active
          </span>
        </div>
        <p className="text-zinc-300 truncate">
          <span className="text-zinc-500">[14:02:11]</span> <span className="text-emerald-400">OK</span> Analyse Anti-Raid : 0 incident · Risque normal (Score 0/100)
        </p>
      </div>

      {onNext && (
        <div className="mt-6 flex justify-end w-full">
          <motion.button
            whileTap={SPRING_PRESS}
            onClick={onNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs shadow-lg shadow-white/10 hover:bg-zinc-100 transition-all cursor-pointer"
          >
            <span>Suivant : Musique & Médias</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      )}
    </div>
  );
}
