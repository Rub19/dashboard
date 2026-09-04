"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap,
  Cpu,
  Activity,
  Sparkles,
  RefreshCw,
  Trash2,
  Rocket,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Sliders,
  Server,
  ArrowRight,
  HardDrive,
  Gauge,
  Wifi,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

interface BoostClientProps {
  id?: string;
}

export default function BoostClient({ id }: BoostClientProps) {
  const { success, info } = useToast();

  const [turboActive, setTurboActive] = useState(id === "turbo");
  const [ramCleaned, setRamCleaned] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cpuUsage, setCpuUsage] = useState(24);
  const [ramUsage, setRamUsage] = useState(38);
  const [fps, setFps] = useState(144);
  const [latency, setLatency] = useState(14);

  useEffect(() => {
    const timer = setInterval(() => {
      setCpuUsage((prev) => Math.min(95, Math.max(12, prev + (Math.random() * 6 - 3))));
      setLatency((prev) => Math.min(45, Math.max(8, Math.round(prev + (Math.random() * 4 - 2)))));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const handleCleanRam = () => {
    setCleaning(true);
    setTimeout(() => {
      setCleaning(false);
      setRamCleaned(true);
      setRamUsage((prev) => Math.max(18, prev - 14));
      success("Nettoyage réussi !", "2.4 Go de mémoire RAM libérés & cache purgé.");
    }, 900);
  };

  const handleToggleTurbo = () => {
    const nextState = !turboActive;
    setTurboActive(nextState);
    if (nextState) {
      setFps(240);
      setCpuUsage((prev) => Math.max(10, prev - 8));
      success("Mode Turbo Activé", "Priorité GPU/CPU maximale, latence minimale activée.");
    } else {
      setFps(144);
      info("Mode Équilibré", "Ressources système rétablies en consommation normale.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white p-4 sm:p-8 pb-32">
      {/* Top Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/20">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">ETHONE Boost Hub</h1>
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-orange-400">
                {id ? `Profil : ${id}` : "Performance & Gaming"}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Accélération matérielle, nettoyage dynamique de la mémoire et gestion des perks Discord Boost.
            </p>
          </div>
        </div>

        {/* Quick actions top bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleCleanRam}
            disabled={cleaning}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Trash2 className={cn("h-3.5 w-3.5", cleaning && "animate-spin text-amber-400")} />
            <span>{cleaning ? "Nettoyage..." : "Purger la RAM"}</span>
          </button>
          <button
            onClick={handleToggleTurbo}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-md cursor-pointer",
              turboActive
                ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-orange-500/30 animate-pulse"
                : "bg-white/10 text-white hover:bg-white/15"
            )}
          >
            <Rocket className="h-3.5 w-3.5" />
            <span>{turboActive ? "Turbo Actif (240 FPS)" : "Activer Mode Turbo"}</span>
          </button>
        </div>
      </div>

      {/* Real-time Performance Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Charge Processeur (CPU)</span>
            <Cpu className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{Math.round(cpuUsage)}%</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.round(cpuUsage)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Mémoire Système (RAM)</span>
            <HardDrive className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{Math.round(ramUsage)}%</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.round(ramUsage)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Taux de Rafraîchissement</span>
            <Gauge className="h-4 w-4 text-orange-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{fps} FPS</p>
          <p className="text-[10px] text-zinc-400 mt-1">
            {turboActive ? "⚡ Synchronisation Ultra-Low Latency" : "Fluidité standard"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Latence Passerelle</span>
            <Wifi className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{latency} ms</p>
          <p className="text-[10px] text-teal-300 mt-1">Connexion optimale</p>
        </div>
      </div>

      {/* Preset Profiles switcher */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-lg">
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-orange-400" />
          <span>Profils d&apos;Optimisation Dédiés</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            {
              slug: "demo",
              title: "Profil Démo",
              desc: "Test des métriques et des seuils sans altérer le matériel.",
              icon: Activity,
              active: id === "demo",
            },
            {
              slug: "test-123",
              title: "Diagnostic Test-123",
              desc: "Suite de validation stress test et intégrité mémoire.",
              icon: ShieldCheck,
              active: id === "test-123",
            },
            {
              slug: "turbo",
              title: "Profil Turbo",
              desc: "Overclock virtuel de rendu, priorisation des threads.",
              icon: Flame,
              active: id === "turbo" || (!id && turboActive),
            },
            {
              slug: "system",
              title: "Système & Cache",
              desc: "Purge des buffers V8, GC forcé et libération RAM.",
              icon: HardDrive,
              active: id === "system",
            },
          ].map((profile) => {
            const Icon = profile.icon;
            return (
              <Link
                key={profile.slug}
                href={`/boost/${profile.slug}`}
                className={cn(
                  "flex flex-col justify-between rounded-xl border p-4 transition-all hover:scale-[1.02]",
                  profile.active
                    ? "border-orange-500/50 bg-orange-500/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:text-white"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-5 w-5 text-orange-400" />
                    {profile.active && (
                      <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[9px] font-bold text-orange-300">
                        ACTIF
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold">{profile.title}</h3>
                  <p className="text-[11px] text-zinc-400 mt-1">{profile.desc}</p>
                </div>
                <div className="mt-3 flex items-center text-[10px] font-bold text-orange-400">
                  <span>Ouvrir profil</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Discord Server Boost Overview Section */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Avantages Discord Server Boost</h2>
              <p className="text-xs text-zinc-400">Statut du serveur principal : Niveau 3 débloqué (14 Boosts)</p>
            </div>
          </div>
          <span className="self-start sm:self-auto rounded-full border border-purple-500/30 bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300">
            NIVEAU 3 MAX
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.01] p-4">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-200 mb-2">
              <span>Niveau 1 (2 Boosts)</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <ul className="text-xs text-zinc-400 space-y-1.5">
              <li>• +50 Emotes personnalisés</li>
              <li>• Qualité audio à 128 Kbps</li>
              <li>• Streams 720p 60 FPS</li>
              <li>• Icône de serveur animée</li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.01] p-4">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-200 mb-2">
              <span>Niveau 2 (7 Boosts)</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <ul className="text-xs text-zinc-400 space-y-1.5">
              <li>• +150 Emotes personnalisés</li>
              <li>• Qualité audio à 256 Kbps</li>
              <li>• Streams 1080p 60 FPS</li>
              <li>• Bannière de serveur statique</li>
              <li>• Limite d&apos;upload à 50 Mo</li>
            </ul>
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 shadow-sm shadow-purple-500/10">
            <div className="flex items-center justify-between text-xs font-bold text-purple-200 mb-2">
              <span>Niveau 3 (14 Boosts)</span>
              <CheckCircle2 className="h-4 w-4 text-purple-400" />
            </div>
            <ul className="text-xs text-zinc-300 space-y-1.5">
              <li>• +250 Emotes personnalisés</li>
              <li>• Qualité audio studio à 384 Kbps</li>
              <li>• Bannière de serveur animée</li>
              <li>• URL d&apos;invitation personnalisée (Vanity)</li>
              <li>• Limite d&apos;upload étendue à 100 Mo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
