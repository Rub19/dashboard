"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { brainComplete } from "@/lib/brain/providers";
import { calculateMapAnalytics, calculateInsights } from "@/lib/valorant-analytics";
import { calculateAgentStats, type ValorantAccountProfile, type ValorantComputedStats } from "@/lib/valorant-provider";
import type { ValorantMatch } from "@/lib/valorant-tracker";
import { Bot, Sparkles, Loader2, Target, Swords, MapPin, CheckCircle2 } from "@/components/icons/ph";
import { cn } from "@/lib/utils";

export interface ValorantAiCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ValorantAccountProfile | null;
  stats: ValorantComputedStats | null;
  matches: ValorantMatch[];
  isEn?: boolean;
}

export default function ValorantAiCoachModal({
  isOpen,
  onClose,
  profile,
  stats,
  matches,
  isEn,
}: ValorantAiCoachModalProps) {
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string>("general");

  const isEnglish = typeof isEn === "boolean"
    ? isEn
    : (typeof window !== "undefined" ? (localStorage.getItem("ethone:tracker:language") ?? "en") !== "fr" : true);

  const runAnalysis = async (topic: string, promptTitle: string) => {
    setActiveTopic(topic);
    setLoading(true);
    setResponse(null);

    const mapStats = calculateMapAnalytics(matches);
    const agentStats = calculateAgentStats(matches);
    const insights = calculateInsights(matches);

    const facts = [
      `Joueur: ${profile?.name || "Inconnu"}#${profile?.tag || "TAG"}`,
      `Rang: ${profile?.currentTierPatched || "Non classé"}`,
      `Échantillon: ${matches.length} parties`,
      `Taux de victoire: ${stats?.winRate !== null && stats?.winRate !== undefined ? `${stats?.winRate}%` : "Non disponible"}`,
      `Ratio K/D: ${stats?.kdRatio !== null && stats?.kdRatio !== undefined ? stats?.kdRatio : "Non disponible"}`,
      `Précision Headshot: ${stats?.headshotPercentage !== null && stats?.headshotPercentage !== undefined ? `${stats?.headshotPercentage}%` : "Non disponible"}`,
      `Dégâts moyens / round: ${stats?.adr !== null && stats?.adr !== undefined ? `${stats?.adr} ADR` : "Non disponible"}`,
      `Agents les plus joués: ${agentStats.slice(0, 3).map((a) => `${a.agentName} (${a.matches} parties, ${a.winRate}% WR, ${a.kdRatio} KD)`).join(", ") || "Aucun"}`,
      `Cartes analysées: ${mapStats.slice(0, 3).map((m) => `${m.mapName} (${m.winRate}% WR, ${m.kdRatio} KD)`).join(", ") || "Aucune"}`,
      `Points forts factuels: ${insights.strengths.map((s) => `${s.title} (${s.metric})`).join("; ") || "Aucun détecté"}`,
      `Axes d'amélioration factuels: ${insights.improvements.map((i) => `${i.title} (${i.metric})`).join("; ") || "Aucun détecté"}`,
    ].join("\n");

    const systemPrompt = `Tu es le Coach Gaming IA d'ETHONE pour Valorant.
RÈGLES STRICTES:
1. Base ton analyse STRICTEMENT et UNIQUEMENT sur les faits télémétriques fournis ci-dessous.
2. Ne fabrique JAMAIS de résultats de matchs, d'adversaires imaginaires ou de statistiques inventées.
3. Distingue clairement les observations factuelles issues des données réelles des conseils d'entraînement méthodologiques.
4. Réponds en ${isEnglish ? "anglais (English)" : "français"}, avec un ton structuré, bienveillant et tactique.
5. Propose 3 objectifs concrets et mesurables pour les prochaines parties.

TÉLÉMÉTRIE JOUEUR :
${facts}`;

    const userQuery = isEnglish
      ? `Specific request: ${promptTitle}. Give me your personalized analysis and targeted training recommendations.`
      : `Demande spécifique : ${promptTitle}. Donne-moi ton analyse personnalisée et tes recommandations d'entraînement ciblées.`;

    try {
      const res = await brainComplete({
        provider: "cloudflare",
        fallback: "groq",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery },
        ],
      });

      const reply = res?.data?.content || res?.data?.text || res?.content || res?.text;
      if (typeof reply === "string" && reply.trim()) {
        setResponse(reply.trim());
      } else {
        throw new Error(isEnglish ? "Empty AI response" : "Réponse de l'assistant IA vide");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : (isEnglish ? "Error generating AI coaching" : "Erreur de génération du coaching IA"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEnglish ? "AI Gaming Coach — ETHONE Brain" : "Coach Gaming IA — ETHONE Brain"}
      description={isEnglish ? "Generate tactical recommendations and training routines based exclusively on your real match statistics." : "Générez des recommandations tactiques et des routines d'entraînement basées exclusivement sur vos statistiques réelles."}
      size="lg"
      hideFooter
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => runAnalysis("general", isEnglish ? "Overall performance diagnosis and key improvement areas" : "Bilan de performance global et axes de progression")}
            disabled={loading}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--panel-radius)] border p-3 text-left transition-all cursor-pointer",
              activeTopic === "general"
                ? "border-rose-500/50 bg-rose-500/10 text-[var(--text-primary)]"
                : "border-[var(--panel-border)] bg-[var(--surface-raised)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Sparkles className="h-4 w-4 text-rose-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">
                {isEnglish ? "Overall Review & Routine" : "Bilan Global & Routine"}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {isEnglish ? "Comprehensive diagnosis and action plan" : "Diagnostic complet et plan d'action"}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => runAnalysis("aim", isEnglish ? "Exercises for crosshair placement and shot accuracy" : "Exercices pour le placement de réticule et la précision de tir")}
            disabled={loading}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--panel-radius)] border p-3 text-left transition-all cursor-pointer",
              activeTopic === "aim"
                ? "border-cyan-500/50 bg-cyan-500/10 text-[var(--text-primary)]"
                : "border-[var(--panel-border)] bg-[var(--surface-raised)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Target className="h-4 w-4 text-cyan-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">
                {isEnglish ? "Precision & Duels" : "Précision & Duels"}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {isEnglish ? "Crosshair discipline and aiming routine" : "Entraînement réticule et discipline de tir"}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => runAnalysis("agent", isEnglish ? "Tactical mastery and impact with my primary agent" : "Maîtrise tactique et impact avec mon agent principal")}
            disabled={loading}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--panel-radius)] border p-3 text-left transition-all cursor-pointer",
              activeTopic === "agent"
                ? "border-emerald-500/50 bg-emerald-500/10 text-[var(--text-primary)]"
                : "border-[var(--panel-border)] bg-[var(--surface-raised)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Swords className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">
                {isEnglish ? "Agent Optimization" : "Optimisation d'Agent"}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {isEnglish ? "Utilities, space control, and trades" : "Utilitaires, prises d'espace et trades"}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => runAnalysis("map", isEnglish ? "Strategies to fix my weaknesses on my lowest win-rate maps" : "Stratégies pour corriger mes faiblesses sur mes pires cartes")}
            disabled={loading}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--panel-radius)] border p-3 text-left transition-all cursor-pointer",
              activeTopic === "map"
                ? "border-amber-500/50 bg-amber-500/10 text-[var(--text-primary)]"
                : "border-[var(--panel-border)] bg-[var(--surface-raised)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">
                {isEnglish ? "Map Adaptation" : "Adaptation Cartes"}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {isEnglish ? "Rotation timings and line control" : "Timings de rotation et contrôle de ligne"}
              </p>
            </div>
          </button>
        </div>

        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-4 min-h-[220px] max-h-[380px] overflow-y-auto os-scroll">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
              <p className="mt-3 text-xs font-bold text-[var(--text-primary)]">
                {isEnglish ? "Analyzing your telemetry..." : "Analyse de votre télémétrie en cours..."}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {isEnglish ? "Extracting key indicators and calculating tactical priorities" : "Extraction des indicateurs clés et calcul des priorités tactiques"}
              </p>
            </div>
          ) : response ? (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold pb-2 border-b border-[var(--panel-border)]/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{isEnglish ? "Training report generated" : "Rapport d'entraînement généré"}</span>
              </div>
              <div className="text-xs text-[var(--text-primary)]/90 leading-relaxed whitespace-pre-wrap font-sans">
                {response}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-muted)]">
              <Bot className="h-8 w-8 text-[var(--text-muted)]/60 mb-2" />
              <p className="text-xs font-bold text-[var(--text-primary)]">
                {isEnglish ? "Select a topic above" : "Sélectionnez une thématique ci-dessus"}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]/80 max-w-sm">
                {isEnglish
                  ? `The AI Coach will analyze your ${matches.length} recorded matches without hallucinating data.`
                  : `Le Coach IA analysera vos ${matches.length} parties enregistrées sans jamais inventer de données.`}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--panel-border)]">
          <span className="text-[10px] text-[var(--text-muted)]">
            {isEnglish
              ? "🔒 Factual telemetry only · Privacy respected"
              : "🔒 Télémétrie factuelle uniquement · Confidentialité respectée"}
          </span>
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            {isEnglish ? "Close" : "Fermer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
