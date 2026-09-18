"use client";

import Link from "next/link";
import { Sparkles, Cpu, Server, Layers, Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/Card";
import type { BotTab } from "@/app/discord/bot/BotControlClient";

interface OverviewGroupProps {
  activeTab: BotTab;
  handleTabChange: (tab: BotTab) => void;
  currentCfg: { label: string; dot: string; border: string; text: string };
  botCore: any;
  subsystems: any[];
  subsystemStatusConfig: Record<string, { label: string; dot: string; text: string }>;
  servers: any[];
  modules: any[];
  settingsGuildId: string;
  setSettingsGuildId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  modulesLoading: boolean;
  modulesError: string | null;
  loadModules: () => void;
  filteredModules: any[];
  MODULE_ICONS: Record<string, any>;
  togglingModuleId: string | null;
  handleToggleModule: (moduleId: string, nextEnabled: boolean) => void;
}

export default function OverviewGroup({
  activeTab,
  handleTabChange,
  currentCfg,
  botCore,
  subsystems,
  subsystemStatusConfig,
  servers,
  modules,
  settingsGuildId,
  setSettingsGuildId,
  searchQuery,
  setSearchQuery,
  modulesLoading,
  modulesError,
  loadModules,
  filteredModules,
  MODULE_ICONS,
  togglingModuleId,
  handleToggleModule,
}: OverviewGroupProps) {
  return (
    <>
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Quick Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Presence summary card */}
            <Card variant="default" padding="none" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Présence en Direct
                </h3>
                <Link
                  href="/discord/bot/presence"
                  className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Gérer</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <Card variant="widget" padding="md" className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full", currentCfg.dot)} />
                  <span className="text-sm font-bold text-white">{currentCfg.label}</span>
                </div>
                <div className="text-xs text-zinc-300">
                  <span className="text-indigo-400 font-semibold">{botCore.activity.type}</span>{" "}
                  <strong>{botCore.activity.name}</strong>
                </div>
                <span className="text-[11px] text-zinc-400 block pt-1">
                  Portée : Globale sur la connexion Gateway
                </span>
              </Card>
            </Card>

            {/* Subsystems summary card */}
            <Card variant="default" padding="none" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  Sous-Systèmes
                </h3>
                <button
                  onClick={() => handleTabChange("health")}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Détails</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {subsystems.slice(0, 3).map((s) => {
                  const cfg = subsystemStatusConfig[s.status] || subsystemStatusConfig.operational;
                  return (
                    <Card
                      key={s.id}
                      variant="widget"
                      padding="none"
                      className="px-3 py-2 flex items-center justify-between text-xs"
                    >
                      <span className="text-zinc-300 font-medium">{s.name}</span>
                      <span className={cn("font-mono font-bold flex items-center gap-1.5", cfg.text)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                        {cfg.label}
                      </span>
                    </Card>
                  );
                })}
              </div>
            </Card>

            {/* Installed guilds summary card */}
            <Card variant="default" padding="none" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-4 h-4 text-purple-400" />
                  Serveurs Actifs
                </h3>
                <button
                  onClick={() => handleTabChange("servers")}
                  className="text-xs text-purple-400 hover:underline flex items-center gap-1"
                >
                  <span>Explorer</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {servers.map((g) => (
                  <Card
                    key={g.id}
                    variant="widget"
                    padding="none"
                    className="px-3 py-2 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">
                        {g.name.charAt(0)}
                      </div>
                      <span className="text-zinc-200 font-medium truncate max-w-[140px]">{g.name}</span>
                    </div>
                    <span className="text-zinc-400 font-mono text-[11px]">{g.memberCount} membres</span>
                  </Card>
                ))}
              </div>
            </Card>
          </div>

          {/* Modules Grid — real per-guild toggles, same data as /module on Discord */}
          <Card variant="default" padding="none" className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Modules du Bot Discord ({modules.length})
                </h3>
                <p className="text-xs text-zinc-400">
                  État réel par serveur, identique à la commande Discord <code className="text-zinc-300">/module</code>
                </p>
              </div>

              {/* Guild selector + search */}
              <div className="flex items-center gap-2.5">
                <select
                  value={settingsGuildId}
                  onChange={(e) => setSettingsGuildId(e.target.value)}
                  disabled={servers.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  {servers.length === 0 && <option value="">Aucun serveur détecté</option>}
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Filtrer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-40"
                  />
                </div>
              </div>
            </div>

            {!settingsGuildId ? (
              <p className="text-xs text-zinc-500 italic pt-2">Sélectionnez un serveur pour voir ses modules.</p>
            ) : modulesLoading && modules.length === 0 ? (
              <p className="text-xs text-zinc-500 italic pt-2">Chargement des modules…</p>
            ) : modulesError ? (
              <div className="mt-2 flex flex-col items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-xs text-red-300">
                <span className="font-medium">{modulesError}</span>
                <button
                  onClick={() => loadModules()}
                  className="rounded-lg border border-red-500/30 px-2.5 py-1 font-semibold transition-colors hover:bg-red-500/15 cursor-pointer"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {filteredModules.map((m) => {
                  const ModIcon = MODULE_ICONS[m.icon] || Layers;
                  const disabled = m.available === false || togglingModuleId === m.id;
                  return (
                    <Card
                      key={m.id}
                      variant="widget"
                      padding="md"
                      className="hover:border-[var(--accent-primary)]/20 transition-all flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <ModIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            {m.name}
                          </span>
                          {m.available === false ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-zinc-700/40 text-zinc-400 border border-zinc-600/30 shrink-0">
                              Bientôt disponible
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleModule(m.id, !m.enabled)}
                              disabled={disabled}
                              title={m.enabled ? "Désactiver ce module" : "Activer ce module"}
                              className={cn(
                                "w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 disabled:opacity-50",
                                m.enabled ? "bg-emerald-500" : "bg-zinc-700"
                              )}
                            >
                              <span
                                className={cn(
                                  "block w-4 h-4 rounded-full bg-white transition-transform",
                                  m.enabled ? "translate-x-4" : "translate-x-0"
                                )}
                              />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-2">{m.description}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "presence" && (
        <Card variant="default" padding="none" className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Bot Presence & Identity Center</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
              Le module complet de gestion de la présence globale, rotation d'activités, profils prédéfinis et studio d'identité est disponible dans sa console dédiée.
            </p>
          </div>
          <Link
            href="/discord/bot/presence"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md"
          >
            <span>Accéder au Centre de Présence</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>
      )}
    </>
  );
}
