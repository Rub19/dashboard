"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Select from "@/components/ui/Select";
import {
  Bomb,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Users,
  DoorOpen,
  Bot,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { useDiscordSync } from "@/lib/useDiscordSync";
import { cn } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import { formatApiError } from "@/lib/format-error";

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

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export default function AntiNukePage() {
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const { profile } = useDiscordOAuth();
  const allGuilds: DiscordGuild[] = useMemo(() => {
    if (profile?.guilds && profile.guilds.length > 0) return profile.guilds;
    return getStoredDiscordGuilds();
  }, [profile?.guilds]);

  const botGuildIds = useBotGuildIds(allGuilds);

  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (allGuilds.length === 0) return [];
    const manageable = allGuilds.filter((g) => canManageGuild(g) || (botGuildIds && botGuildIds.includes(g.id)));
    return manageable.length > 0 ? manageable : allGuilds;
  }, [allGuilds, botGuildIds]);

  // Le paramètre d'URL n'est appliqué qu'une fois par valeur : sinon il annule le choix fait dans le sélecteur.
  const appliedQueryGuild = useRef<string | null>(null);
  const userSelectedRef = useRef(false);
  const queryGuildId = searchParams.get("guildId");
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (queryGuildId && appliedQueryGuild.current !== queryGuildId) {
      const match = manageableGuilds.find((g) => g.id === queryGuildId);
      if (match) {
        appliedQueryGuild.current = queryGuildId;
        setSelectedGuild(match);
        return;
      }
    }
    if (!userSelectedRef.current && !queryGuildId) {
      if (!selectedGuild) {
        if (botGuildIds !== null) {
          setSelectedGuild(pickBotGuild(manageableGuilds, botGuildIds)!);
        }
      } else if (botGuildIds && botGuildIds.length > 0 && !botGuildIds.includes(selectedGuild.id)) {
        const botGuild = pickBotGuild(manageableGuilds, botGuildIds);
        if (botGuild && botGuild.id !== selectedGuild.id && botGuildIds.includes(botGuild.id)) {
          setSelectedGuild(botGuild);
        }
      }
    }
  }, [manageableGuilds, queryGuildId, selectedGuild, botGuildIds]);

  const [config, setConfig] = useState<AntiNukeConfig>(DEFAULT_CONFIG);
  const [incidents, setIncidents] = useState<NukeIncident[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (!selectedGuild) return;

    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      setIncidents([]);
      setOpenCount(0);
      return;
    }

    if (!BOT_API_URL) return;
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
  }, [selectedGuild, botGuildIds]);

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
    const clampedPatch = { ...patch };
    if (clampedPatch.maxBans !== undefined) {
      clampedPatch.maxBans = Math.max(2, Math.min(20, Number(clampedPatch.maxBans) || 2));
    }
    if (clampedPatch.maxChannelDeletes !== undefined) {
      clampedPatch.maxChannelDeletes = Math.max(2, Math.min(10, Number(clampedPatch.maxChannelDeletes) || 2));
    }
    if (clampedPatch.maxRoleDeletes !== undefined) {
      clampedPatch.maxRoleDeletes = Math.max(2, Math.min(10, Number(clampedPatch.maxRoleDeletes) || 2));
    }
    const next = { ...config, ...clampedPatch };
    setConfig(next);
    setIsSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/anti-nuke/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(clampedPatch),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(formatApiError(data?.error, ""));
      success("Anti-Nuke mis à jour", "Configuration synchronisée avec le bot.");
    } catch (err: any) {
      setConfig(config);
      showError("Erreur", formatApiError(err, "Impossible de synchroniser avec le bot."));
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
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(formatApiError(data?.error, ""));
      setIncidents((prev) => prev.map((i) => (i.id === incidentId ? { ...i, status: "resolved" } : i)));
      setOpenCount((c) => Math.max(0, c - 1));
      success("Incident résolu");
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible de résoudre cet incident."));
    }
  };

  return (
    <div className="w-full text-[var(--text-primary)] font-sans">
      <header className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-4 sm:px-6 py-3.5 z-20">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={selectedGuild ? `/discord/security?guildId=${selectedGuild.id}` : "/discord/security"}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-all active:scale-95"
              title="Retour au hub Sécurité"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-red-400 ">
                <Bomb className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Anti-Nuke</h1>
                <p className="text-xs text-[var(--text-muted)]">Bannissements massifs, suppressions de salons et de rôles.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
            {manageableGuilds.length > 0 && (
              <GuildSelector
                guilds={manageableGuilds}
                value={selectedGuild?.id || ""}
                onChange={(g) => {
                  userSelectedRef.current = true;
                  setSelectedGuild(g);
                }}
              />
            )}
            <button
              onClick={fetchAllData}
              disabled={isLoading}
              className="flex h-8 items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-all active:scale-95 disabled:opacity-50"
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

      <main className="px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {selectedGuild && botGuildIds !== null && !botGuildIds.includes(selectedGuild.id) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)] text-sm">Le bot ETHONE n&apos;est pas installé sur ce serveur</p>
                  <p className="mt-0.5 text-[var(--text-muted)]">
                    Invitez le bot sur « {selectedGuild.name} » pour activer la surveillance Anti-Nuke.
                  </p>
                </div>
              </div>
              <a
                href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors shrink-0"
              >
                Inviter le bot
              </a>
            </div>
          )}
          {/* Stat tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 ">
              <span className="text-xs text-[var(--text-muted)] font-medium">Protection</span>
              <div className="mt-2 flex items-center gap-2">
                {config.enabled ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                )}
                <span className="text-lg font-bold text-[var(--text-primary)]">{config.enabled ? "Active" : "Désactivée"}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 ">
              <span className="text-xs text-[var(--text-muted)] font-medium">Sanction configurée</span>
              <div className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                {ACTION_LABELS[config.action].icon} {ACTION_LABELS[config.action].label}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 ">
              <span className="text-xs text-[var(--text-muted)] font-medium">Incidents ouverts</span>
              <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{openCount}</div>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 ">
              <span className="text-xs text-[var(--text-muted)] font-medium">Fenêtre de détection</span>
              <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{config.timeWindowSeconds}s</div>
            </div>
          </div>

          {/* Config panel */}
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Configuration</h2>

            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-muted)]">Sanction appliquée à l'auteur détecté</label>
              <Select
                value={config.action}
                onChange={(v) => saveConfig({ action: v as AntiNukeAction })}
                options={(Object.entries(ACTION_LABELS) as [AntiNukeAction, { label: string; icon: string }][]).map(
                  ([value, { label, icon }]) => ({ id: value, label: `${icon} ${label}` })
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-muted)]">Bannissements max</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={config.maxBans}
                  onChange={(e) => setConfig((c) => ({ ...c, maxBans: Number(e.target.value) }))}
                  onBlur={(e) => saveConfig({ maxBans: Number(e.target.value) })}
                  className="w-full h-10 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 text-sm text-[var(--text-primary)] outline-none focus:border-red-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-muted)]">Suppressions de salons max</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={config.maxChannelDeletes}
                  onChange={(e) => setConfig((c) => ({ ...c, maxChannelDeletes: Number(e.target.value) }))}
                  onBlur={(e) => saveConfig({ maxChannelDeletes: Number(e.target.value) })}
                  className="w-full h-10 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 text-sm text-[var(--text-primary)] outline-none focus:border-red-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-muted)]">Suppressions de rôles max</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={config.maxRoleDeletes}
                  onChange={(e) => setConfig((c) => ({ ...c, maxRoleDeletes: Number(e.target.value) }))}
                  onBlur={(e) => saveConfig({ maxRoleDeletes: Number(e.target.value) })}
                  className="w-full h-10 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 text-sm text-[var(--text-primary)] outline-none focus:border-red-500"
                />
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Ces seuils s'appliquent sur la fenêtre de {config.timeWindowSeconds}s. Le propriétaire du bot et les rôles/membres de confiance (configurés séparément) sont toujours exemptés.
            </p>
          </div>

          {/* Incidents */}
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Incidents récents ({incidents.length})</h2>
            {incidents.length === 0 ? (
              <div className="text-center py-10 text-[var(--text-muted)]">
                <CheckCircle2 className="h-7 w-7 text-emerald-500/40 mx-auto mb-2" />
                <p className="text-xs font-medium text-[var(--text-muted)]">Aucun incident détecté</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--panel-border)]">
                {incidents.map((inc) => {
                  const Icon = inc.type === "MASS_BAN" ? Users : inc.type === "MASS_CHANNEL_DELETE" ? DoorOpen : Trash2;
                  return (
                    <div key={inc.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <Icon className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)]">{inc.title}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{inc.description}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {inc.perpetratorTag || "Inconnu"} · {inc.actionTaken} · {new Date(inc.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {inc.status === "open" ? (
                        <button
                          onClick={() => resolveIncident(inc.id)}
                          className="shrink-0 flex h-7 items-center gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-all active:scale-95"
                        >
                          Résoudre
                        </button>
                      ) : (
                        <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
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
