"use client";

import { useMemo } from "react";
import { Icon } from "@/lib/icons";
import { INTEGRATIONS } from "@/lib/integrations";
import { cn } from "@/lib/utils";

interface BrainIntegrationsHubProps {
  connectedCount: number;
  totalCount: number;
  configuredMap: Record<string, boolean>;
}

export default function BrainIntegrationsHub({
  connectedCount,
  totalCount,
  configuredMap,
}: BrainIntegrationsHubProps) {
  const activeCapabilities = useMemo(() => {
    const caps: { label: string; icon: string; service: string; active: boolean }[] = [
      { label: "Gestion des fichiers & Drive", icon: "folder", service: "Google Drive", active: !!configuredMap["google-drive"] },
      { label: "Contrôle Audio & Dynamic Island", icon: "music", service: "Spotify", active: !!configuredMap["spotify"] },
      { label: "Planning & Événements", icon: "calendar", service: "Google Calendar", active: !!configuredMap["google-calendar"] },
      { label: "Notifications & Présence", icon: "bell", service: "Discord", active: !!configuredMap["discord"] },
      { label: "Synchronisation de code", icon: "code", service: "GitHub", active: !!configuredMap["github"] },
    ];
    return caps;
  }, [configuredMap]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--accent-primary)]/20 bg-gradient-to-br from-[var(--surface-raised)]/90 via-[var(--surface-raised)]/60 to-[var(--accent-primary)]/5 p-4 sm:p-5 shadow-xl backdrop-blur-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Brain Title & Ecosystem Stats */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] shadow-sm">
            <Icon name="brain" className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Écosystème Connecté & ETHONE Brain
              </h2>
              <span className="rounded-full bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 px-2 py-0.5 text-[10px] font-bold text-[var(--accent-primary)]">
                {connectedCount} / {totalCount} actifs
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-muted)] leading-relaxed">
              Vos services connectés enrichissent la mémoire contextuelle, le multitâche de la Dynamic Island et les automatisations de Brain.
            </p>
          </div>
        </div>

        {/* Right: Quick Capabilities Pills */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {activeCapabilities.map((cap) => (
            <div
              key={cap.label}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-medium transition-all",
                cap.active
                  ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-semibold shadow-xs"
                  : "border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 text-[var(--text-muted)] opacity-60"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  cap.active ? "bg-[var(--accent-primary)] animate-pulse" : "bg-[var(--text-muted)]"
                )}
              />
              <Icon name={cap.icon} className="h-3 w-3" />
              <span>{cap.service}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
