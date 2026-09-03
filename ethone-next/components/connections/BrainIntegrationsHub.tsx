"use client";

import { useMemo } from "react";
import { Icon } from "@/lib/icons";
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrainIntegrationsHubProps {
  connectedCount: number;
  totalCount: number;
  configuredMap: Record<string, boolean>;
  onConnectPrompt?: (serviceId: string) => void;
}

export default function BrainIntegrationsHub({
  connectedCount,
  totalCount,
  configuredMap,
  onConnectPrompt,
}: BrainIntegrationsHubProps) {
  const activeCapabilities = useMemo(() => {
    return [
      { label: "Gestion des fichiers & Drive", icon: "folder", id: "google-drive", name: "Google Drive", active: !!configuredMap["google-drive"] },
      { label: "Contrôle Audio & Dynamic Island", icon: "music", id: "spotify", name: "Spotify", active: !!configuredMap["spotify"] },
      { label: "Planning & Rendez-vous", icon: "calendar", id: "google-calendar", name: "Google Calendar", active: !!configuredMap["google-calendar"] },
      { label: "Présence & Communauté", icon: "bell", id: "discord", name: "Discord", active: !!configuredMap["discord"] },
      { label: "Synchronisation de code", icon: "code", id: "github", name: "GitHub", active: !!configuredMap["github"] },
    ];
  }, [configuredMap]);

  // Next recommendation from Brain
  const brainSuggestion = useMemo(() => {
    if (!configuredMap["spotify"]) {
      return {
        id: "spotify",
        title: "Activer Spotify Audio",
        desc: "Connectez Spotify pour piloter votre musique directement depuis l'accueil et la Dynamic Island.",
      };
    }
    if (!configuredMap["google-calendar"]) {
      return {
        id: "google-calendar",
        title: "Synchroniser votre Agenda",
        desc: "Liez Google Calendar pour que Brain anticipe vos rendez-vous et prépare vos réunions.",
      };
    }
    if (!configuredMap["discord"]) {
      return {
        id: "discord",
        title: "Lier votre Présence Discord",
        desc: "Affichez votre statut d'activité en temps réel et débloquez la carte 3D interactive.",
      };
    }
    if (!configuredMap["github"]) {
      return {
        id: "github",
        title: "Connecter vos Dépôts GitHub",
        desc: "Suivez vos commits, pull requests et activez le contexte développeur dans Brain.",
      };
    }
    return {
      id: "all-set",
      title: "Écosystème optimisé",
      desc: "Vos services principaux sont tous connectés. ETHONE Brain fonctionne à plein potentiel.",
    };
  }, [configuredMap]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--accent-primary)]/25 bg-gradient-to-br from-[var(--surface-raised)]/90 via-[var(--surface-raised)]/70 to-[var(--accent-primary)]/10 p-5 shadow-xl backdrop-blur-2xl space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Brain Title & Ecosystem Stats */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] shadow-sm">
            <Icon name="brain" className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Centre d'Intégration Universel & Brain
              </h2>
              <span className="rounded-full bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 px-2.5 py-0.5 text-[10px] font-bold text-[var(--accent-primary)]">
                {connectedCount} / {totalCount} actifs
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-muted)] leading-relaxed">
              Vos services connectés alimentent la mémoire contextuelle, les cartes 3D d'accueil et le multitâche de la Dynamic Island.
            </p>
          </div>
        </div>

        {/* Right: Capabilities Pills */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {activeCapabilities.map((cap) => (
            <div
              key={cap.id}
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
              <span>{cap.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Proactive Brain Suggestion Card */}
      {brainSuggestion.id !== "all-set" && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
            <div>
              <span className="font-bold text-purple-200">{brainSuggestion.title} : </span>
              <span className="text-zinc-300">{brainSuggestion.desc}</span>
            </div>
          </div>
          {onConnectPrompt && (
            <button
              type="button"
              onClick={() => onConnectPrompt(brainSuggestion.id)}
              className="flex items-center gap-1 shrink-0 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition-all cursor-pointer shadow-xs"
            >
              <span>Connecter</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
