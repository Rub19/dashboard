"use client";

import { Radio, Wifi, AlertCircle, RefreshCw, ListRestart, Terminal, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/Card";
import type { BotTab } from "@/app/discord/bot/BotControlClient";

interface OperationsGroupProps {
  activeTab: BotTab;
  // Events
  connectionState: string;
  recentEvents: any[];
  // Integrations
  integrations: any[];
  integrationsLoading: boolean;
  integrationsError: boolean;
  loadIntegrations: () => void;
  handleTestIntegration: (id: string) => void;
  testingIntegrationId: string | null;
  // Jobs
  jobs: any[];
  jobsLoading: boolean;
  jobsError: boolean;
  loadJobs: () => void;
  handleRunJob: (id: string) => void;
  runningJobId: string | null;
  // Commands
  filteredCommands: any[];
  commandSearch: string;
  setCommandSearch: (v: string) => void;
  commandCategory: string;
  setCommandCategory: (v: string) => void;
  commandCategories: string[];
  commandStatsByKey: Map<string, any>;
  commandKeyFromCatalogName: (name: string) => string;
}

export default function OperationsGroup({
  activeTab,
  connectionState,
  recentEvents,
  integrations,
  integrationsLoading,
  integrationsError,
  loadIntegrations,
  handleTestIntegration,
  testingIntegrationId,
  jobs,
  jobsLoading,
  jobsError,
  loadJobs,
  handleRunJob,
  runningJobId,
  filteredCommands,
  commandSearch,
  setCommandSearch,
  commandCategory,
  setCommandCategory,
  commandCategories,
  commandStatsByKey,
  commandKeyFromCatalogName,
}: OperationsGroupProps) {
  return (
    <>
      {activeTab === "events" && (
        <div className="space-y-6">
          <Card variant="default" padding="none" className="p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-indigo-400" />
                  Flux d'Événements en Temps Réel (SSE)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Diffusé en direct depuis le Sync Engine du bot Discord
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono self-start sm:self-auto">
                <span className={cn("w-2 h-2 rounded-full", connectionState === "connected" ? "bg-emerald-400 animate-pulse" : "bg-rose-400")} />
                <span className={connectionState === "connected" ? "text-emerald-400" : "text-rose-400"}>
                  {connectionState === "connected" ? "Écoute active" : "Déconnecté"}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs pr-1">
              {recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0 font-semibold">
                      {evt.source}
                    </span>
                    <span className="font-bold text-white truncate">{evt.type}</span>
                    <span className="text-zinc-400 truncate text-[11px]">{evt.detail}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 shrink-0 whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleTimeString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "integrations" && (
        <div className="space-y-6">
          <Card variant="default" padding="none" className="p-5 sm:p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-indigo-400" />
                  Intégrations & Services Externes
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  État de connexion des services tiers utilisés par le bot (Discord REST, base de données, IA, stockage)
                </p>
              </div>
              <button
                onClick={loadIntegrations}
                disabled={integrationsLoading}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-indigo-400", integrationsLoading && "animate-spin")} />
                <span>{integrationsLoading ? "Chargement..." : "Actualiser"}</span>
              </button>
            </div>

            {integrationsLoading && integrations.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1].map((i) => (
                  <div key={i} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 h-24 animate-pulse" />
                ))}
              </div>
            ) : integrationsError ? (
              <div className="p-8 text-center rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto" />
                <p className="font-semibold">Impossible de charger les intégrations</p>
                <p className="text-rose-300/70">Le serveur du bot Discord est peut-être hors-ligne. Réessayez dans un instant.</p>
                <button
                  onClick={loadIntegrations}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  Réessayer
                </button>
              </div>
            ) : integrations.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs text-zinc-400 space-y-1">
                <Wifi className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                <p className="font-semibold text-zinc-200">Aucune intégration détectée</p>
                <p>Le bot n'a signalé aucun service externe pour le moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map((item) => {
                  const healthy = item.status === "healthy";
                  const degraded = item.status === "degraded";
                  return (
                    <div key={item.id} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">{item.name}</span>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1.5 shrink-0",
                            healthy
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : degraded
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", healthy ? "bg-emerald-400" : degraded ? "bg-amber-400" : "bg-rose-400")} />
                          {healthy ? "Opérationnel" : degraded ? "Dégradé" : "Hors-ligne"}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{item.details}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-[11px]">
                        <code className="text-zinc-500 font-mono truncate max-w-[180px]">{item.endpointMasked}</code>
                        <span className="text-zinc-400 font-mono">{item.latencyMs}ms</span>
                      </div>
                      <button
                        onClick={() => handleTestIntegration(item.id)}
                        disabled={testingIntegrationId === item.id}
                        className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-indigo-600 border border-zinc-800 hover:border-indigo-500 text-zinc-300 hover:text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {testingIntegrationId === item.id ? "Test en cours..." : "Tester la connexion"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "jobs" && (
        <div className="space-y-6">
          <Card variant="default" padding="none" className="p-5 sm:p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ListRestart className="w-5 h-5 text-indigo-400" />
                  Tâches Planifiées & Files d'Attente
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Tâches de fond récurrentes exécutées par le bot (nettoyage, sauvegardes, synchronisation)
                </p>
              </div>
              <button
                onClick={loadJobs}
                disabled={jobsLoading}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-indigo-400", jobsLoading && "animate-spin")} />
                <span>{jobsLoading ? "Chargement..." : "Actualiser"}</span>
              </button>
            </div>

            {jobsLoading && jobs.length === 0 ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 h-16 animate-pulse" />
                ))}
              </div>
            ) : jobsError ? (
              <div className="p-8 text-center rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto" />
                <p className="font-semibold">Impossible de charger les tâches planifiées</p>
                <p className="text-rose-300/70">Le serveur du bot Discord est peut-être hors-ligne. Réessayez dans un instant.</p>
                <button
                  onClick={loadJobs}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  Réessayer
                </button>
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs text-zinc-400 space-y-1">
                <ListRestart className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                <p className="font-semibold text-zinc-200">Aucune tâche planifiée</p>
                <p>Le bot n'a signalé aucune tâche de fond pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                          job.status === "failed" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : job.status === "running" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        )}
                      >
                        <ListRestart className={cn("w-4 h-4", job.status === "running" && "animate-spin")} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">{job.name}</span>
                        <span className="text-[11px] text-zinc-400 block truncate mt-0.5">{job.description}</span>
                        <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                          {job.intervalDescription} • {job.totalRuns} exécutions{job.failureCount > 0 ? ` • ${job.failureCount} échec(s)` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <span className="text-xs font-mono text-zinc-400">{job.durationMs}ms</span>
                      <button
                        onClick={() => handleRunJob(job.id)}
                        disabled={runningJobId === job.id || job.status === "running"}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-indigo-600 border border-zinc-800 hover:border-indigo-500 text-zinc-300 hover:text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {runningJobId === job.id ? "Exécution..." : "Exécuter maintenant"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "commands" && (
        <Card variant="default" padding="none" className="p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                Catalogue des Commandes Discord ({filteredCommands.length})
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Commandes Slash (/) et préfixes (!) supportées nativement par le bot
              </p>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Chercher une commande..."
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-48"
                />
              </div>

              <select
                value={commandCategory}
                onChange={(e) => setCommandCategory(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {commandCategories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "Toutes catégories" : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs pt-2">
            {filteredCommands.map((cmd) => {
              const stat = commandStatsByKey.get(commandKeyFromCatalogName(cmd.name));
              return (
                <div
                  key={cmd.name}
                  className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-indigo-500/30 hover:bg-zinc-900/30 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-indigo-400 font-mono font-bold text-xs">{cmd.name}</code>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium shrink-0">
                      {cmd.perm}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">{cmd.desc}</p>
                  <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500 font-medium">{cmd.cat}</span>
                    {stat ? (
                      <span className="text-emerald-400 font-mono font-semibold">
                        {stat.executions24h ?? 0}× / 24h · {stat.avgLatencyMs ?? 0}ms
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-mono">Aucune exécution récente</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}
