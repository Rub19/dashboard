"use client";

import { Cpu, Server, Activity, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/Card";
import type { BotTab } from "@/app/discord/bot/BotControlClient";

interface HealthGroupProps {
  activeTab: BotTab;
  subsystems: any[];
  subsystemStatusConfig: Record<string, { label: string; dot: string; text: string }>;
  servers: any[];
  handleOptimizeMemory: () => void;
  optimizingMemory: boolean;
  perfMetrics: any;
  handleRunDiagnostics: () => void;
  diagnosticsRunning: boolean;
  diagnosticChecks: any[];
  diagnosticStatusConfig: Record<string, { label: string; icon: any; chip: string; badge: string }>;
}

export default function HealthGroup({
  activeTab,
  subsystems,
  subsystemStatusConfig,
  servers,
  handleOptimizeMemory,
  optimizingMemory,
  perfMetrics,
  handleRunDiagnostics,
  diagnosticsRunning,
  diagnosticChecks,
  diagnosticStatusConfig,
}: HealthGroupProps) {
  return (
    <>
      {activeTab === "health" && (
        <div className="space-y-6">
          <Card variant="default" padding="none" className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Télémétrie des Sous-Systèmes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subsystems.map((sub) => {
                const cfg = subsystemStatusConfig[sub.status] || subsystemStatusConfig.operational;
                return (
                  <Card key={sub.id} variant="widget" padding="md" className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{sub.name}</span>
                      <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-zinc-400">Statut :</span>
                      <span className={cn("font-mono font-bold", cfg.text)}>{cfg.label}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "servers" && (
        <div className="space-y-6">
          <Card variant="default" padding="none" className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" />
              Serveurs Discord Installés ({servers.length})
            </h3>

            <div className="space-y-3">
              {servers.map((s) => (
                <Card
                  key={s.id}
                  variant="widget"
                  padding="md"
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white overflow-hidden shrink-0">
                      {s.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.icon} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        s.name?.charAt(0) || "?"
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{s.name}</h4>
                      <span className="text-xs text-zinc-400 font-mono">ID: {s.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-zinc-300 font-mono">
                      {typeof s.memberCount === "number"
                        ? `${s.memberCount} membre${s.memberCount > 1 ? "s" : ""}`
                        : "—"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      Connecté
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="space-y-6">
          <Card variant="default" padding="none" className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Performances & Consommation Mémoire
                </h3>
                <p className="text-xs text-zinc-400">
                  Métriques d'exécution du processus Node/Bun, Event Loop et allocations mémoire
                </p>
              </div>
              <button
                onClick={handleOptimizeMemory}
                disabled={optimizingMemory}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-400", optimizingMemory && "animate-spin")} />
                <span>{optimizingMemory ? "Optimisation..." : "Optimiser le cache RAM"}</span>
              </button>
            </div>

            {/* Resource Micro Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Mémoire Heap Utilisée</span>
                  <span className="font-mono font-bold text-emerald-400">{perfMetrics.heapUsedMb} MB</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${(perfMetrics.heapUsedMb / perfMetrics.heapTotalMb) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">Allocation totale : {perfMetrics.heapTotalMb} MB</span>
              </div>

              <div className="p-5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Mémoire Résidente (RSS)</span>
                  <span className="font-mono font-bold text-indigo-300">{perfMetrics.rssMb} MB</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-400"
                    style={{ width: `${Math.min(100, (perfMetrics.rssMb / 256) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400">Empreinte mémoire physique totale</span>
              </div>

              <div className="p-5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Event Loop Lag</span>
                  <span className="font-mono font-bold text-emerald-400">{perfMetrics.eventLoopLagMs} ms</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400 w-2" />
                </div>
                <span className="text-[10px] text-zinc-400">Réactivité de la boucle d'événements</span>
              </div>
            </div>

            {/* Audio and Network Stack */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">Moteur Audio WebRTC / Opus</span>
                  <span className="text-zinc-400 text-[11px]">Canaux vocaux et streaming haute fidélité</span>
                </div>
                <span className="font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {perfMetrics.activeAudioStreams} stream(s) actif(s)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">Charge Processeur (CPU Process)</span>
                  <span className="text-zinc-400 text-[11px]">Consommation du thread principal</span>
                </div>
                <span className="font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {perfMetrics.cpuUsagePercent}% (Optimal)
                </span>
              </div>
            </div>

            {/* Live Throughput — events/commands come from real counters wired
                into the gateway/command dispatch; DB queries counts real
                fs.readFileSync/writeFileSync calls (this bot persists to JSON
                files, not a SQL database); AI tokens comes from the real
                per-request AI usage tracker. */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                <span className="text-[10px] text-zinc-400 block">Événements Gateway</span>
                <span className="text-sm font-bold font-mono text-white">{perfMetrics.eventsPerMinute}/min</span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                <span className="text-[10px] text-zinc-400 block">Commandes Exécutées</span>
                <span className="text-sm font-bold font-mono text-white">{perfMetrics.commandsPerMinute}/min</span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                <span className="text-[10px] text-zinc-400 block">Lectures/Écritures Fichiers</span>
                <span className="text-sm font-bold font-mono text-white">{perfMetrics.dbQueriesPerMinute}/min</span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                <span className="text-[10px] text-zinc-400 block">Tokens IA Consommés</span>
                <span className="text-sm font-bold font-mono text-white">{perfMetrics.aiTokensPerMinute}/min</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          <Card variant="default" padding="none" className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Diagnostics & Auto-Check 1-Clic
                </h3>
                <p className="text-xs text-zinc-400">
                  Vérifiez en temps réel l'intégrité de tous les sous-systèmes critiques du bot
                </p>
              </div>
              <button
                onClick={handleRunDiagnostics}
                disabled={diagnosticsRunning}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", diagnosticsRunning && "animate-spin")} />
                <span>{diagnosticsRunning ? "Vérification en cours..." : "Lancer un diagnostic complet"}</span>
              </button>
            </div>

            {/* Diagnostic Items List */}
            <div className="space-y-3">
              {diagnosticChecks.map((item: any) => {
                const cfg = diagnosticStatusConfig[item.status] || diagnosticStatusConfig.passed;
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.chip)}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{item.name}</span>
                        <span className="text-[11px] text-zinc-400 block">{item.detail}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-xs font-mono text-zinc-400">{item.latency}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", cfg.badge)}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
