"use client";

import { Radio, Wifi, AlertCircle, RefreshCw, ListRestart, Terminal, Search } from "@/components/icons/ph";
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
        <div className="stagger-children space-y-6">
          <Card variant="default" padding="none" className="p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--panel-border)]/80">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Radio className="w-5 h-5 text-[var(--accent-primary)]" />
                  Flux d'Événements en Temps Réel (SSE)
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Diffusé en direct depuis le Sync Engine du bot Discord
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-xs font-mono self-start sm:self-auto">
                <span className={cn("w-2 h-2 rounded-full", connectionState === "connected" ? "bg-[var(--success)] animate-pulse" : "bg-rose-400")} />
                <span className={connectionState === "connected" ? "text-[var(--success)]" : "text-rose-400"}>
                  {connectionState === "connected" ? "Écoute active" : "Déconnecté"}
                </span>
              </div>
            </div>

            <div className="stagger-children space-y-2 max-h-96 overflow-y-auto font-mono text-xs pr-1">
              {recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 hover:border-[var(--text-primary)]/13 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 shrink-0 font-semibold">
                      {evt.source}
                    </span>
                    <span className="font-bold text-[var(--text-primary)] truncate">{evt.type}</span>
                    <span className="text-[var(--text-muted)] truncate text-[11px]">{evt.detail}</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] shrink-0 whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleTimeString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "integrations" && (
        <div className="stagger-children space-y-6">
          <Card variant="default" padding="none" className="p-5 sm:p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--panel-border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-[var(--accent-primary)]" />
                  Intégrations & Services Externes
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  État de connexion des services tiers utilisés par le bot (Discord REST, base de données, IA, stockage)
                </p>
              </div>
              <button
                onClick={loadIntegrations}
                disabled={integrationsLoading}
                className="px-4 py-2 rounded-xl bg-[var(--surface-raised)]/60 hover:bg-[var(--text-primary)]/10 border border-[var(--panel-border)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.97]"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-[var(--accent-primary)]", integrationsLoading && "animate-spin")} />
                <span>{integrationsLoading ? "Chargement..." : "Actualiser"}</span>
              </button>
            </div>

            {integrationsLoading && integrations.length === 0 ? (
              <div className="stagger-children grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1].map((i) => (
                  <div key={i} className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 h-24 animate-pulse" />
                ))}
              </div>
            ) : integrationsError ? (
              <div className="p-8 text-center rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto" />
                <p className="font-semibold">Impossible de charger les intégrations</p>
                <p className="text-rose-300/70">Le serveur du bot Discord est peut-être hors-ligne. Réessayez dans un instant.</p>
                <button
                  onClick={loadIntegrations}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-[color,background-color,border-color,transform] cursor-pointer active:scale-[0.97]"
                >
                  Réessayer
                </button>
              </div>
            ) : integrations.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[var(--bg-card)]/40 border border-[var(--panel-border)]/60 text-xs text-[var(--text-muted)] space-y-1">
                <Wifi className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="font-semibold text-[var(--text-primary)]">Aucune intégration détectée</p>
                <p>Le bot n'a signalé aucun service externe pour le moment.</p>
              </div>
            ) : (
              <div className="stagger-children grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map((item) => {
                  const healthy = item.status === "healthy";
                  const degraded = item.status === "degraded";
                  return (
                    <div key={item.id} className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 hover:border-[var(--text-primary)]/13 transition-all space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{item.name}</span>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1.5 shrink-0",
                            healthy
                              ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20"
                              : degraded
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", healthy ? "bg-[var(--success)]" : degraded ? "bg-amber-400" : "bg-rose-400")} />
                          {healthy ? "Opérationnel" : degraded ? "Dégradé" : "Hors-ligne"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{item.details}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--panel-border)] text-[11px]">
                        <code className="text-[var(--text-muted)] font-mono truncate max-w-[180px]">{item.endpointMasked}</code>
                        <span className="text-[var(--text-muted)] font-mono">{item.latencyMs}ms</span>
                      </div>
                      <button
                        onClick={() => handleTestIntegration(item.id)}
                        disabled={testingIntegrationId === item.id}
                        className="w-full py-2 rounded-xl bg-[var(--surface-raised)]/60 hover:bg-[var(--accent-primary)] border border-[var(--panel-border)] hover:border-[var(--accent-primary)] text-[var(--text-primary)]/85 hover:text-[var(--text-primary)] text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer active:scale-[0.97]"
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
        <div className="stagger-children space-y-6">
          <Card variant="default" padding="none" className="p-5 sm:p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--panel-border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <ListRestart className="w-5 h-5 text-[var(--accent-primary)]" />
                  Tâches Planifiées & Files d'Attente
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Tâches de fond récurrentes exécutées par le bot (nettoyage, sauvegardes, synchronisation)
                </p>
              </div>
              <button
                onClick={loadJobs}
                disabled={jobsLoading}
                className="px-4 py-2 rounded-xl bg-[var(--surface-raised)]/60 hover:bg-[var(--text-primary)]/10 border border-[var(--panel-border)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.97]"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-[var(--accent-primary)]", jobsLoading && "animate-spin")} />
                <span>{jobsLoading ? "Chargement..." : "Actualiser"}</span>
              </button>
            </div>

            {jobsLoading && jobs.length === 0 ? (
              <div className="stagger-children space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 h-16 animate-pulse" />
                ))}
              </div>
            ) : jobsError ? (
              <div className="p-8 text-center rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto" />
                <p className="font-semibold">Impossible de charger les tâches planifiées</p>
                <p className="text-rose-300/70">Le serveur du bot Discord est peut-être hors-ligne. Réessayez dans un instant.</p>
                <button
                  onClick={loadJobs}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-[color,background-color,border-color,transform] cursor-pointer active:scale-[0.97]"
                >
                  Réessayer
                </button>
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[var(--bg-card)]/40 border border-[var(--panel-border)]/60 text-xs text-[var(--text-muted)] space-y-1">
                <ListRestart className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="font-semibold text-[var(--text-primary)]">Aucune tâche planifiée</p>
                <p>Le bot n'a signalé aucune tâche de fond pour le moment.</p>
              </div>
            ) : (
              <div className="stagger-children space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 hover:border-[var(--text-primary)]/13 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                          job.status === "failed" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : job.status === "running" ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20" : "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20"
                        )}
                      >
                        <ListRestart className={cn("w-4 h-4", job.status === "running" && "animate-spin")} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[var(--text-primary)] block truncate">{job.name}</span>
                        <span className="text-[11px] text-[var(--text-muted)] block truncate mt-0.5">{job.description}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono block mt-0.5">
                          {job.intervalDescription} • {job.totalRuns} exécutions{job.failureCount > 0 ? ` • ${job.failureCount} échec(s)` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <span className="text-xs font-mono text-[var(--text-muted)]">{job.durationMs}ms</span>
                      <button
                        onClick={() => handleRunJob(job.id)}
                        disabled={runningJobId === job.id || job.status === "running"}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-raised)]/60 hover:bg-[var(--accent-primary)] border border-[var(--panel-border)] hover:border-[var(--accent-primary)] text-[var(--text-primary)]/85 hover:text-[var(--text-primary)] text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer active:scale-[0.97]"
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
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[var(--accent-primary)]" />
                Catalogue des Commandes Discord ({filteredCommands.length})
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Commandes Slash (/) et préfixes (!) supportées nativement par le bot
              </p>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Chercher une commande..."
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] w-48"
                />
              </div>

              <select
                value={commandCategory}
                onChange={(e) => setCommandCategory(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-xs text-[var(--text-primary)]/85 focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
              >
                {commandCategories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "Toutes catégories" : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs pt-2">
            {filteredCommands.map((cmd) => {
              const stat = commandStatsByKey.get(commandKeyFromCatalogName(cmd.name));
              return (
                <div
                  key={cmd.name}
                  className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 hover:border-[var(--accent-primary)]/30 hover:bg-[var(--surface-raised)]/30 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[var(--accent-primary)] font-mono font-bold text-xs">{cmd.name}</code>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-[var(--text-muted)] font-medium shrink-0">
                      {cmd.perm}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-2">{cmd.desc}</p>
                  <div className="pt-2 border-t border-[var(--panel-border)] flex items-center justify-between text-[10px]">
                    <span className="text-[var(--text-muted)] font-medium">{cmd.cat}</span>
                    {stat ? (
                      <span className="text-[var(--accent-primary)] font-mono font-semibold">
                        {stat.executions24h ?? 0}× / 24h · {stat.avgLatencyMs ?? 0}ms
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)] font-mono">Aucune exécution récente</span>
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
