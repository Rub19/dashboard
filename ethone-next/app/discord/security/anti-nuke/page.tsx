"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bomb,
  ShieldCheck,
  ChevronDown,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Users,
  DoorOpen,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { useDiscordSync } from "@/lib/useDiscordSync";
import { cn } from "@/lib/utils";

type AntiNukeAction = "alert" | "strip_roles" | "ban";

interface AntiNukeConfig {
  enabled: boolean;
  maxBans: number;
  maxChannelDeletes: number;
  maxRoleDeletes: number;
  timeWindowSeconds: number;
  action: AntiNukeAction;
}

interface NukeIncident {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  perpetratorTag: string | null;
  actionTaken: string;
  status: "open" | "resolved";
  createdAt: string;
}

const DEFAULT_CONFIG: AntiNukeConfig = {
  enabled: true,
  maxBans: 4,
  maxChannelDeletes: 3,
  maxRoleDeletes: 3,
  timeWindowSeconds: 10,
  action: "strip_roles",
};

const ACTION_LABELS: Record<AntiNukeAction, { label: string; icon: string }> = {
  alert: { label: "Alerte seulement", icon: "🔔" },
  strip_roles: { label: "Retrait des rôles admin/modération", icon: "🎭" },
  ban: { label: "Bannissement immédiat", icon: "🔨" },
};

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export default function AntiNukePage() {
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const { profile } = useDiscordOAuth();
  const botGuildIds = useBotGuildIds(profile?.guilds);

  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (!profile?.guilds) return [];
    return profile.guilds.filter((g) => {
      if (g.owner) return true;
      if (!g.permissions) return false;
      const num = Number(g.permissions);
      return (num & 8) === 8 || (num & 32) === 32;
    });
  }, [profile?.guilds]);

  const queryGuildId = searchParams.get("guildId");
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (queryGuildId) {
      const match = manageableGuilds.find((g) => g.id === queryGuildId);
      if (match) {
        setSelectedGuild(match);
        return;
      }
    }
    if (!selectedGuild && botGuildIds !== null) setSelectedGuild(pickBotGuild(manageableGuilds, botGuildIds)!);
  }, [manageableGuilds, queryGuildId, selectedGuild, botGuildIds]);

  const [config, setConfig] = useState<AntiNukeConfig>(DEFAULT_CONFIG);
  const [incidents, setIncidents] = useState<NukeIncident[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (!selectedGuild || !BOT_API_URL) return;
    setIsLoading(true);
    try {
      const [overviewRes, configRes] = await Promise.all([
        fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-nuke/overview`, { credentials: "include" }),
        fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-nuke/config`, { credentials: "include" }),
      ]);
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setIncidents(data.recentIncidents || []);
        setOpenCount(data.openIncidents || 0);
      }
      if (configRes.ok) {
        const data = await configRes.json();
        if (data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config });
      }
    } catch {
      // Reflète simplement l'état par défaut si le Worker est injoignable.
    } finally {
      setIsLoading(false);
    }
  }, [selectedGuild]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Reflète en direct les changements faits via /antinuke sur Discord (ou un
  // autre onglet dashboard) sans attendre un rechargement manuel.
  useDiscordSync({
    guildId: selectedGuild?.id,
    onConfigUpdated: (module, updatedConfig) => {
      if (module === "antiNuke" && updatedConfig) {
        setConfig((prev) => ({ ...prev, ...updatedConfig }));
      }
    },
  });

  const saveConfig = async (patch: Partial<AntiNukeConfig>) => {
    if (!selectedGuild || !BOT_API_URL) return;
    const next = { ...config, ...patch };
    setConfig(next);
    setIsSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-nuke/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("save failed");
      success("Anti-Nuke mis à jour", "Configuration synchronisée avec le bot.");
    } catch {
      setConfig(config);
      showError("Erreur", "Impossible de synchroniser avec le bot.");
    } finally {
      setIsSaving(false);
    }
  };

  const resolveIncident = async (incidentId: string) => {
    if (!selectedGuild || !BOT_API_URL) return;
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-nuke/incidents/${incidentId}/resolve`,
        { method: "POST", credentials: "include" }
      );
      if (!res.ok) throw new Error("resolve failed");
      setIncidents((prev) => prev.map((i) => (i.id === incidentId ? { ...i, status: "resolved" } : i)));
      setOpenCount((c) => Math.max(0, c - 1));
      success("Incident résolu");
    } catch {
      showError("Erreur", "Impossible de résoudre cet incident.");
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-[var(--bg-main)] text-zinc-100 font-sans">
      <header className="shrink-0 border-b border-[var(--panel-border)] bg-black/40 backdrop-blur-xl px-4 sm:px-6 py-3.5 z-20">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={selectedGuild ? `/discord/security/anti-raid?guildId=${selectedGuild.id}` : "/discord"}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Retour"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-[var(--panel-border)] text-red-400 shadow-inner">
                <Bomb className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-white">Anti-Nuke</h1>
                <p className="text-xs text-zinc-400">Bannissements massifs, suppressions de salons et de rôles.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
            {manageableGuilds.length > 0 && (
              <div className="relative">
                <select
                  value={selectedGuild?.id || ""}
                  onChange={(e) => {
                    const g = manageableGuilds.find((item) => item.id === e.target.value);
                    if (g) setSelectedGuild(g);
                  }}
                  className="h-8 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/90 px-3 pr-8 text-xs font-medium text-white outline-none hover:border-[var(--input-border-hover)] focus:border-red-500 appearance-none cursor-pointer"
                >
                  {manageableGuilds.map((g) => (
                    <option key={g.id} value={g.id} className="bg-zinc-900 text-white">
                      {g.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              </div>
            )}
            <button
              onClick={fetchAllData}
              disabled={isLoading}
              className="flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 px-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-red-400")} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button
              onClick={() => saveConfig({ enabled: !config.enabled })}
              disabled={isSaving}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all active:scale-95",
                config.enabled
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
              )}
            >
              <div className={cn("h-2 w-2 rounded-full", config.enabled ? "bg-emerald-400" : "bg-red-500")} />
              <span>{config.enabled ? "Actif" : "En pause"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 scrollbar-thin scrollbar-thumb-white/10">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Stat tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 backdrop-blur-md">
              <span className="text-xs text-zinc-400 font-medium">Protection</span>
              <div className="mt-2 flex items-center gap-2">
                {config.enabled ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                )}
                <span className="text-lg font-bold text-white">{config.enabled ? "Active" : "Désactivée"}</span>
              </div>
            </div>
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 backdrop-blur-md">
              <span className="text-xs text-zinc-400 font-medium">Sanction configurée</span>
              <div className="mt-2 text-sm font-bold text-white">
                {ACTION_LABELS[config.action].icon} {ACTION_LABELS[config.action].label}
              </div>
            </div>
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 backdrop-blur-md">
              <span className="text-xs text-zinc-400 font-medium">Incidents ouverts</span>
              <div className="mt-2 text-2xl font-bold text-white">{openCount}</div>
            </div>
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 backdrop-blur-md">
              <span className="text-xs text-zinc-400 font-medium">Fenêtre de détection</span>
              <div className="mt-2 text-2xl font-bold text-white">{config.timeWindowSeconds}s</div>
            </div>
          </div>

          {/* Config panel */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-5 backdrop-blur-md space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Configuration</h2>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Sanction appliquée à l'auteur détecté</label>
              <select
                value={config.action}
                onChange={(e) => saveConfig({ action: e.target.value as AntiNukeAction })}
                className="w-full h-10 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-black/40 px-3 text-sm text-white outline-none focus:border-red-500 [&>option]:bg-zinc-900"
              >
                {(Object.entries(ACTION_LABELS) as [AntiNukeAction, { label: string; icon: string }][]).map(
                  ([value, { label, icon }]) => (
                    <option key={value} value={value}>
                      {icon} {label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Bannissements max</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={config.maxBans}
                  onChange={(e) => setConfig((c) => ({ ...c, maxBans: Number(e.target.value) }))}
                  onBlur={(e) => saveConfig({ maxBans: Number(e.target.value) })}
                  className="w-full h-10 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-black/40 px-3 text-sm text-white outline-none focus:border-red-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Suppressions de salons max</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={config.maxChannelDeletes}
                  onChange={(e) => setConfig((c) => ({ ...c, maxChannelDeletes: Number(e.target.value) }))}
                  onBlur={(e) => saveConfig({ maxChannelDeletes: Number(e.target.value) })}
                  className="w-full h-10 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-black/40 px-3 text-sm text-white outline-none focus:border-red-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Suppressions de rôles max</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={config.maxRoleDeletes}
                  onChange={(e) => setConfig((c) => ({ ...c, maxRoleDeletes: Number(e.target.value) }))}
                  onBlur={(e) => saveConfig({ maxRoleDeletes: Number(e.target.value) })}
                  className="w-full h-10 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-black/40 px-3 text-sm text-white outline-none focus:border-red-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">
              Ces seuils s'appliquent sur la fenêtre de {config.timeWindowSeconds}s. Le propriétaire du bot et les rôles/membres de confiance (configurés séparément) sont toujours exemptés.
            </p>
          </div>

          {/* Incidents */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-5 backdrop-blur-md space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Incidents récents ({incidents.length})</h2>
            {incidents.length === 0 ? (
              <div className="text-center py-10 text-zinc-500">
                <CheckCircle2 className="h-7 w-7 text-emerald-500/40 mx-auto mb-2" />
                <p className="text-xs font-medium text-zinc-300">Aucun incident détecté</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {incidents.map((inc) => {
                  const Icon = inc.type === "MASS_BAN" ? Users : inc.type === "MASS_CHANNEL_DELETE" ? DoorOpen : Trash2;
                  return (
                    <div key={inc.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <Icon className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white">{inc.title}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{inc.description}</p>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            {inc.perpetratorTag || "Inconnu"} · {inc.actionTaken} · {new Date(inc.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {inc.status === "open" ? (
                        <button
                          onClick={() => resolveIncident(inc.id)}
                          className="shrink-0 flex h-7 items-center gap-1 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 px-2 text-[11px] text-zinc-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                        >
                          Résoudre
                        </button>
                      ) : (
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Résolu
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
