"use client";

import { Cpu, Server, Activity, RefreshCw, CheckCircle2 } from "@/components/icons/ph";
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
        <div className="stagger-children space-y-6">
          <Card variant="default" padding="none" className="p-5 sm:p-6 space-y-5 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[var(--accent-primary)]" />
                Télémétrie des Sous-Systèmes ({subsystems.length})
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Surveillance en direct des couches critiques du bot (Gateway, REST, EventBus, Audio, Tâches)
              </p>
            </div>

            <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subsystems.map((sub) => {
                const cfg = subsystemStatusConfig[sub.status] || subsystemStatusConfig.operational;
                return (
                  <Card
                    key={sub.id}
                    variant="widget"
                    padding="md"
                    className="space-y-3 bg-[var(--bg-card)]/60 border-[var(--panel-border)]/80 hover:border-[var(--text-primary)]/13 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)] tracking-wide">{sub.name}</span>
                      <span className={cn("w-2 h-2 rounded-full", cfg.dot, sub.status === "operational" && "animate-pulse ring-2 ring-[var(--success)]/20")} />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--panel-border)]">
                      <span className="text-[var(--text-muted)]">Statut :</span>
                      <span className={cn("font-mono font-bold flex items-center gap-1.5", cfg.text)}>
                        {cfg.label}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "servers" && (
        <div className="stagger-children space-y-6">
          <Card variant="default" padding="none" className="p-5 sm:p-6 space-y-5 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Server className="w-5 h-5 text-[var(--accent-primary)]" />
                Serveurs Discord Installés ({servers.length})
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Guilds où le bot ETHONE est actuellement présent avec permission de diffusion
              </p>
            </div>

            <div className="stagger-children space-y-3">
              {servers.map((s) => (
                <Card
                  key={s.id}
                  variant="widget"
                  padding="md"
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-card)]/60 border-[var(--panel-border)]/80 hover:border-[var(--accent-primary)]/30 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[var(--text-primary)]/10 border border-[var(--text-primary)]/13 flex items-center justify-center font-bold text-[var(--text-primary)] overflow-hidden shrink-0 shadow-md">
                      {s.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.icon} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        s.name?.charAt(0) || "?"
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{s.name}</h4>
                      <span className="text-xs text-[var(--text-muted)] font-mono block">ID: {s.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-[var(--text-primary)]/85 font-mono font-medium">
                      {typeof s.memberCount === "number"
                        ? `${s.memberCount} membre${s.memberCount > 1 ? "s" : ""}`
                        : "—"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
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
        <div className="stagger-children space-y-6">
          <Card variant="default" padding="none" className="p-5 sm:p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--panel-border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[var(--accent-primary)]" />
                  Performances & Consommation Mémoire
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Métriques d'exécution du processus Node.js, Event Loop et allocations mémoire
                </p>
              </div>
              <button
                onClick={handleOptimizeMemory}
                disabled={optimizingMemory}
                className="px-4 py-2 rounded-xl bg-[var(--surface-raised)]/60 hover:bg-[var(--text-primary)]/10 border border-[var(--panel-border)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.97]"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-[var(--accent-primary)]", optimizingMemory && "animate-spin")} />
                <span>{optimizingMemory ? "Optimisation..." : "Optimiser le cache RAM"}</span>
              </button>
            </div>

            {/* Resource Micro Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Mémoire Heap Utilisée</span>
                  <span className="font-mono font-bold text-[var(--accent-primary)]">{perfMetrics.heapUsedMb} MB</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--surface-raised)]/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500"
                    style={{ width: `${(perfMetrics.heapUsedMb / perfMetrics.heapTotalMb) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono block">Allocation totale : {perfMetrics.heapTotalMb} MB</span>
              </div>

              <div className="p-5 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Mémoire Résidente (RSS)</span>
                  <span className="font-mono font-bold text-[var(--accent-primary)]">{perfMetrics.rssMb} MB</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--surface-raised)]/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500"
                    style={{ width: `${Math.min(100, (perfMetrics.rssMb / 256) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--text-muted)] block">Empreinte mémoire physique totale</span>
              </div>

              <div className="p-5 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Event Loop Lag</span>
                  <span className="font-mono font-bold text-[var(--accent-primary)]">{perfMetrics.eventLoopLagMs} ms</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--surface-raised)]/60 overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--accent-primary)] w-2" />
                </div>
                <span className="text-[10px] text-[var(--text-muted)] block">Réactivité de la boucle d'événements</span>
              </div>
            </div>

            {/* Audio and Network Stack */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[var(--text-primary)] block">Moteur audio (Lavalink)</span>
                  <span className="text-[var(--text-muted)] text-[11px]">Lecture musicale dans les salons vocaux</span>
                </div>
                <span className="font-mono font-semibold px-2.5 py-1 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                  {perfMetrics.activeAudioStreams} stream(s) actif(s)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[var(--text-primary)] block">Charge Processeur (CPU Process)</span>
                  <span className="text-[var(--text-muted)] text-[11px]">Consommation du thread principal</span>
                </div>
                <span className="font-mono font-semibold px-2.5 py-1 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                  {perfMetrics.cpuUsagePercent}% (Optimal)
                </span>
              </div>
            </div>

            {/* Live Throughput */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase font-mono">Événements Gateway</span>
                <span className="text-base font-bold font-mono text-[var(--text-primary)]">{perfMetrics.eventsPerMinute}/min</span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase font-mono">Commandes Exécutées</span>
                <span className="text-base font-bold font-mono text-[var(--text-primary)]">{perfMetrics.commandsPerMinute}/min</span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase font-mono">Lectures/Écritures IO</span>
                <span className="text-base font-bold font-mono text-[var(--text-primary)]">{perfMetrics.dbQueriesPerMinute}/min</span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase font-mono">Tokens IA Consommés</span>
                <span className="text-base font-bold font-mono text-[var(--text-primary)]">{perfMetrics.aiTokensPerMinute}/min</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "diagnostics" && (
        <div className="stagger-children space-y-6">
          <Card variant="default" padding="none" className="p-5 sm:p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--panel-border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                  Diagnostics & Auto-Check 1-Clic
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Vérifiez en temps réel l'intégrité de tous les sous-systèmes critiques du bot
                </p>
              </div>
              <button
                onClick={handleRunDiagnostics}
                disabled={diagnosticsRunning}
                className="px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)] text-[var(--accent-contrast)] text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-[color:var(--accent-primary)]/20 disabled:opacity-50 cursor-pointer active:scale-[0.97]"
              >
                <RefreshCw className={cn("w-4 h-4", diagnosticsRunning && "animate-spin")} />
                <span>{diagnosticsRunning ? "Vérification en cours..." : "Lancer un diagnostic complet"}</span>
              </button>
            </div>

            {/* Diagnostic Items List */}
            <div className="stagger-children space-y-3">
              {diagnosticChecks.map((item: any) => {
                const cfg = diagnosticStatusConfig[item.status] || diagnosticStatusConfig.passed;
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 hover:border-[var(--text-primary)]/13 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.chip)}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--text-primary)] block">{item.name}</span>
                        <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">{item.detail}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-xs font-mono text-[var(--text-muted)]">{item.latency}</span>
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-semibold border", cfg.badge)}>
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
