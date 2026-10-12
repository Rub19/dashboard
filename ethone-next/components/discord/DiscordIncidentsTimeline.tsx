"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Filter,
  Search,
  CheckCircle2,
  Zap,
  Flame,
  UserX,
  X,
} from "@/components/icons/ph";
import { sinceLabel } from "@/lib/discord/security-scan";
import { cn } from "@/lib/utils";

export type IncidentCategory = "ALL" | "AUTOMOD" | "ANTI_RAID" | "SANCTION" | "DETECTION";
export type IncidentSeverity = "ALL" | "DANGER" | "WARNING" | "INFO";
export type IncidentStatus = "ALL" | "RESOLVED" | "IN_PROGRESS" | "SANCTIONED";

export interface DiscordIncident {
  id: string;
  category: "AUTOMOD" | "ANTI_RAID" | "SANCTION" | "DETECTION";
  severity: "DANGER" | "WARNING" | "INFO";
  status: "RESOLVED" | "IN_PROGRESS" | "SANCTIONED";
  title: string;
  description: string;
  actionTaken?: string;
  actor?: string;
  target?: string;
  timestamp: string;
}

interface DiscordIncidentsTimelineProps {
  events?: Array<{
    id: string;
    module: string;
    type: string;
    severity: string;
    actor?: { id: string; tag?: string };
    target?: { id: string; name?: string; tag?: string };
    reason?: string;
    action?: string;
    timestamp: string;
  }> | null;
  guildId?: string;
  readable?: (text: string) => string;
}

export default function DiscordIncidentsTimeline({
  events,
  readable = (t) => t,
}: DiscordIncidentsTimelineProps) {
  const [categoryFilter, setCategoryFilter] = useState<IncidentCategory>("ALL");
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity>("ALL");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const normalizedIncidents = useMemo<DiscordIncident[]>(() => {
    if (!events || events.length === 0) {
      return [];
    }

    return events.map((e) => {
      let category: DiscordIncident["category"] = "DETECTION";
      const upperType = e.type.toUpperCase();
      const upperMod = e.module.toUpperCase();

      if (upperType.includes("RAID") || upperMod.includes("RAID")) {
        category = "ANTI_RAID";
      } else if (upperType.includes("AUTOMOD") || upperMod.includes("AUTOMOD")) {
        category = "AUTOMOD";
      } else if (
        upperType.includes("SANCTION") ||
        upperType.includes("BAN") ||
        upperType.includes("KICK") ||
        upperType.includes("TIMEOUT") ||
        upperType.includes("MUTE")
      ) {
        category = "SANCTION";
      }

      let severity: DiscordIncident["severity"] = "INFO";
      const upperSev = (e.severity || "").toUpperCase();
      if (upperSev === "CRITICAL" || upperSev === "HIGH") {
        severity = "DANGER";
      } else if (upperSev === "MEDIUM") {
        severity = "WARNING";
      }

      let status: DiscordIncident["status"] = "RESOLVED";
      if (e.action && e.action.trim().length > 0) {
        status = "SANCTIONED";
      } else if (severity === "DANGER") {
        status = "IN_PROGRESS";
      }

      return {
        id: e.id,
        category,
        severity,
        status,
        title: readable(e.reason?.split(" : ")[0] || e.type.replace(/_/g, " ")),
        description: readable(e.reason || e.type.replace(/_/g, " ").toLowerCase()),
        actionTaken: e.action || undefined,
        actor: e.actor?.tag || "Système Etho",
        target: e.target?.tag || e.target?.name || undefined,
        timestamp: e.timestamp,
      };
    });
  }, [events, readable]);

  const filteredIncidents = useMemo(() => {
    return normalizedIncidents.filter((inc) => {
      if (categoryFilter !== "ALL" && inc.category !== categoryFilter) return false;
      if (severityFilter !== "ALL" && inc.severity !== severityFilter) return false;
      if (statusFilter !== "ALL" && inc.status !== statusFilter) return false;

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = inc.title.toLowerCase().includes(q);
        const inDesc = inc.description.toLowerCase().includes(q);
        const inActor = inc.actor?.toLowerCase().includes(q) ?? false;
        const inTarget = inc.target?.toLowerCase().includes(q) ?? false;
        const inAction = inc.actionTaken?.toLowerCase().includes(q) ?? false;
        if (!inTitle && !inDesc && !inActor && !inTarget && !inAction) return false;
      }

      return true;
    });
  }, [normalizedIncidents, categoryFilter, severityFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = normalizedIncidents.length;
    const danger = normalizedIncidents.filter((i) => i.severity === "DANGER").length;
    const sanctioned = normalizedIncidents.filter((i) => i.status === "SANCTIONED").length;
    const inProgress = normalizedIncidents.filter((i) => i.status === "IN_PROGRESS").length;
    return { total, danger, sanctioned, inProgress };
  }, [normalizedIncidents]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-3.5">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-medium">Total incidents</span>
            <AlertOctagon className="h-4 w-4" />
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-medium">Critiques / Danger</span>
            <Flame className="h-4 w-4" />
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-rose-400">
            {stats.danger}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-medium">Sanctions appliquées</span>
            <Zap className="h-4 w-4" />
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-emerald-400">
            {stats.sanctioned}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-medium">En cours d&apos;analyse</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-amber-400">
            {stats.inProgress}
          </p>
        </div>
      </div>

      {normalizedIncidents.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par auteur, cible, motif ou action..."
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised,transparent)] py-2 pl-9 pr-8 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)]/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="flex items-center gap-1 text-[var(--text-muted)]">
              <Filter className="h-3 w-3" /> Module:
            </span>
            {(
              [
                ["ALL", "Tous"],
                ["AUTOMOD", "AutoMod"],
                ["ANTI_RAID", "Anti-Raid"],
                ["SANCTION", "Sanctions"],
                ["DETECTION", "Détections"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setCategoryFilter(val)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-[0.97]",
                  categoryFilter === val
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                    : "bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)]">Sévérité:</span>
            {(
              [
                ["ALL", "Toutes"],
                ["DANGER", "Danger"],
                ["WARNING", "Warning"],
                ["INFO", "Info"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setSeverityFilter(val)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium transition-all active:scale-[0.97]",
                  severityFilter === val
                    ? "bg-[var(--text-primary)]/15 font-semibold text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                )}
              >
                {label}
              </button>
            ))}

            <span className="ml-2 text-[var(--text-muted)]">Statut:</span>
            {(
              [
                ["ALL", "Tous"],
                ["SANCTIONED", "Sanctionné"],
                ["RESOLVED", "Résolu"],
                ["IN_PROGRESS", "En cours"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setStatusFilter(val)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium transition-all active:scale-[0.97]",
                  statusFilter === val
                    ? "bg-[var(--text-primary)]/15 font-semibold text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-4">
        {events === null ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-muted)]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
            <p className="mt-3 text-xs font-medium">Chargement des incidents en cours…</p>
          </div>
        ) : normalizedIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-muted)]">
            <ShieldCheck className="h-9 w-9 text-emerald-400" />
            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              Aucun incident enregistré
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm">
              Tous les modules de sécurité (AutoMod, Anti-Raid, Sanctions) sont opérationnels. Aucun incident n&apos;a été détecté sur ce serveur.
            </p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-muted)]">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              Aucun incident correspondant aux filtres
            </p>
            <p className="mt-1 text-xs">
              Modifiez vos critères de recherche ou réinitialisez les filtres.
            </p>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("ALL");
                setSeverityFilter("ALL");
                setStatusFilter("ALL");
                setSearchQuery("");
              }}
              className="mt-4 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-[0.97]"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="relative pl-6">
            <div className="absolute bottom-3 left-2.5 top-3 w-0.5 bg-[var(--panel-border)]" />

            <div className="space-y-4">
              {filteredIncidents.map((inc) => {
                const isSelected = selectedIncidentId === inc.id;
                const isDanger = inc.severity === "DANGER";
                const isWarning = inc.severity === "WARNING";

                const dotColor = isDanger
                  ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                  : isWarning
                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                    : "bg-blue-400";

                const icon = isDanger ? (
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                ) : isWarning ? (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-blue-400" />
                );

                return (
                  <div key={inc.id} className="relative group">
                    <span
                      className={cn(
                        "absolute -left-6 top-3 h-3 w-3 -translate-x-[2px] rounded-full border-2 border-[var(--surface-base,var(--bg-main))] transition-transform group-hover:scale-125",
                        dotColor,
                      )}
                    />

                    <div
                      onClick={() => setSelectedIncidentId(isSelected ? null : inc.id)}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 transition-all",
                        isSelected
                          ? "border-[var(--accent-primary)]/50 bg-[var(--surface-raised)] shadow-md"
                          : "border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] hover:border-[var(--panel-border)]/80 hover:bg-[var(--surface-hover)]/30",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-raised)]">
                            {icon}
                          </span>
                          <span className="text-xs font-semibold text-[var(--text-primary)]">
                            {inc.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              isDanger
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                : isWarning
                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                  : "bg-blue-500/15 text-blue-400 border border-blue-500/30",
                            )}
                          >
                            {inc.severity}
                          </span>

                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              inc.status === "SANCTIONED"
                                ? "bg-purple-500/15 text-purple-300 border border-purple-500/25"
                                : inc.status === "RESOLVED"
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                                  : "bg-amber-500/15 text-amber-300 border border-amber-500/25",
                            )}
                          >
                            {inc.status === "SANCTIONED"
                              ? "Sanctionné"
                              : inc.status === "RESOLVED"
                                ? "Résolu"
                                : "En cours"}
                          </span>

                          <span className="text-[11px] text-[var(--text-muted)]">
                            {sinceLabel(inc.timestamp)}
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
                        {inc.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--panel-border)]/50 pt-2.5 text-[11px]">
                        {inc.actionTaken && (
                          <span className="flex items-center gap-1 font-semibold text-emerald-400">
                            <Zap className="h-3 w-3" /> Action : {inc.actionTaken}
                          </span>
                        )}

                        {inc.actor && (
                          <span className="text-[var(--text-muted)]">
                            Détecté par : <strong className="text-[var(--text-primary)]">{inc.actor}</strong>
                          </span>
                        )}

                        {inc.target && (
                          <span className="flex items-center gap-1 text-[var(--text-muted)]">
                            <UserX className="h-3 w-3 text-rose-400" /> Cible :{" "}
                            <strong className="text-[var(--text-primary)]">{inc.target}</strong>
                          </span>
                        )}
                      </div>

                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 border-t border-[var(--panel-border)] pt-3 text-[11px] text-[var(--text-muted)]"
                          >
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div>
                                <span className="font-semibold text-[var(--text-primary)]">Horodatage précis :</span>{" "}
                                {new Date(inc.timestamp).toLocaleString("fr-FR")}
                              </div>
                              <div>
                                <span className="font-semibold text-[var(--text-primary)]">Identifiant :</span>{" "}
                                <code className="font-mono text-[10px]">{inc.id}</code>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
