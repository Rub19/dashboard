"use client";

import { useState } from "react";
import {
  Sparkles,
  Brain,
  Sliders,
  Check,
  Shield,
  HelpCircle,
  Eye,
  Info,
  Code2,
  Gamepad2,
  Music,
  Zap,
  Bot,
  GraduationCap,
  Palette,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  UserInterest,
  InterfaceDensity,
  InferredPreference,
  PersonalizationPreferences,
} from "@/lib/personalization/personalization-store";

interface PersonalizationPanelProps {
  preferences: PersonalizationPreferences;
  inferredPreferences: InferredPreference[];
  onToggleInterest: (interest: UserInterest) => void;
  onSetDensity: (density: InterfaceDensity) => void;
  onTogglePrivacy: (key: keyof PersonalizationPreferences["privacy"]) => void;
}

const INTERESTS_CONFIG: Array<{ id: UserInterest; label: string; icon: any }> = [
  { id: "development", label: "Développement & Code", icon: Code2 },
  { id: "gaming", label: "Gaming & Compétition", icon: Gamepad2 },
  { id: "music", label: "Musique & Immersion", icon: Music },
  { id: "productivity", label: "Productivité & Deep Work", icon: Zap },
  { id: "ai", label: "Intelligence Artificielle", icon: Bot },
  { id: "study", label: "Études & Recherche", icon: GraduationCap },
  { id: "design", label: "Design & UX", icon: Palette },
  { id: "finance", label: "Finance & Marchés", icon: DollarSign },
];

export default function PersonalizationPanel({
  preferences,
  inferredPreferences,
  onToggleInterest,
  onSetDensity,
  onTogglePrivacy,
}: PersonalizationPanelProps) {
  const [showTransparencyInfo, setShowTransparencyInfo] = useState(false);

  return (
    <div className="space-y-6">
      {/* 1. Explicit Interests */}
      <div className="rounded-3xl border border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/60 p-5 sm:p-6 backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
              <span>Centres d'intérêt explicites</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Sélectionnez vos domaines de prédilection pour orienter vos widgets et suggestions Brain.
            </p>
          </div>
          <span className="text-xs font-semibold text-[var(--accent-primary)]">
            {preferences.interests.length} sélectionnés
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {INTERESTS_CONFIG.map((item) => {
            const isSelected = preferences.interests.includes(item.id);
            const IconComponent = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleInterest(item.id)}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border p-3 text-xs font-semibold transition-all cursor-pointer",
                  isSelected
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)] shadow-xs"
                    : "border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-hover)]"
                )}
              >
                <IconComponent className={cn("h-4 w-4 shrink-0", isSelected ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")} />
                <span className="truncate">{item.label}</span>
                {isSelected && <Check className="ml-auto h-3.5 w-3.5 text-[var(--accent-primary)] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Inferred Preferences by Brain */}
      <div className="rounded-3xl border border-purple-500/30 bg-purple-950/15 p-5 sm:p-6 backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-purple-100 flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-400" />
              <span>Préférences inférées par le Brain (Confiance cognitive)</span>
            </h3>
            <p className="text-xs text-purple-200/70 mt-0.5">
              Tendances détectées automatiquement d'après vos habitudes, widgets et temps d'utilisation réel.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowTransparencyInfo(!showTransparencyInfo)}
            className="flex items-center gap-1 text-xs font-medium text-purple-300 hover:text-white underline cursor-pointer"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Pourquoi ces choix ?</span>
          </button>
        </div>

        {/* Transparency note */}
        {showTransparencyInfo && (
          <div className="rounded-2xl border border-purple-500/30 bg-purple-900/30 p-3 text-xs text-purple-100/90 leading-relaxed space-y-1">
            <strong className="block font-bold">Transparence Algorithmique ETHONE :</strong>
            <p>
              Le moteur Brain analyse localement la fréquence d'utilisation de vos espaces, les types d'extensions installées et les intégrations connectées. Aucun profil publicitaire n'est créé et vos données ne quittent jamais votre environnement sécurisé.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {inferredPreferences.map((pref) => (
            <div
              key={pref.id}
              className="rounded-2xl border border-purple-500/20 bg-purple-950/30 p-3.5 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{pref.label}</span>
                <span className="rounded-full border border-purple-400/40 bg-purple-900/50 px-2 py-0.5 text-[10px] font-bold text-purple-200">
                  {pref.confidence}% confiance
                </span>
              </div>
              <p className="text-[11px] text-purple-200/70 leading-relaxed">
                {pref.reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Interface Density */}
      <div className="rounded-3xl border border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/60 p-5 sm:p-6 backdrop-blur-md space-y-3">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[var(--accent-primary)]" />
            <span>Densité d'affichage du Dashboard</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Ajuste l'espacement des grilles de widgets et la compacité des barres d'outils.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {[
            { id: "compact", label: "Compacte", desc: "Informations maximales, espacement réduit" },
            { id: "balanced", label: "Équilibrée", desc: "Configuration recommandée standard" },
            { id: "comfortable", label: "Confortable", desc: "Espacements larges et aérés" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSetDensity(item.id as InterfaceDensity)}
              className={cn(
                "rounded-2xl border p-3 text-left transition-all cursor-pointer",
                preferences.density === item.id
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 shadow-xs"
                  : "border-[var(--panel-border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">{item.label}</span>
                {preferences.density === item.id && (
                  <Check className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                )}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Privacy & Personalization Controls */}
      <div className="rounded-3xl border border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/60 p-5 sm:p-6 backdrop-blur-md space-y-3">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>Contrôles de confidentialité & Apprentissage</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Vous contrôlez précisément les signaux exploités par ETHONE pour adapter votre interface.
          </p>
        </div>

        <div className="space-y-2 pt-1">
          {[
            {
              key: "personalizedRecommendations" as const,
              label: "Recommandations personnalisées dans le Marketplace",
              desc: "Affiche le score de compatibilité Brain et les suggestions ciblées.",
            },
            {
              key: "contextAwareSuggestions" as const,
              label: "Suggestions sensibles au contexte",
              desc: "Adapte les outils proposés selon l'heure et l'espace de travail actif.",
            },
            {
              key: "behaviorBasedLearning" as const,
              label: "Apprentissage progressif des habitudes",
              desc: "Déduit vos centres d'intérêt réels à partir des widgets les plus utilisés.",
            },
            {
              key: "workspacePersonalization" as const,
              label: "Personnalisation dédiée par Workspace",
              desc: "Mémorise des agencements distincts entre Personnel, Studio et Gaming.",
            },
          ].map((toggle) => {
            const isEnabled = preferences.privacy[toggle.key];

            return (
              <div
                key={toggle.key}
                className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-3.5"
              >
                <div className="space-y-0.5 pr-4">
                  <span className="text-xs font-bold text-[var(--text-primary)]">{toggle.label}</span>
                  <p className="text-[11px] text-[var(--text-muted)]">{toggle.desc}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onTogglePrivacy(toggle.key)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    isEnabled ? "bg-[var(--accent-primary)]" : "bg-zinc-700"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
