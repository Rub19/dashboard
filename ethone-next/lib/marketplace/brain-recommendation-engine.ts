/**
 * ETHONE Marketplace Intelligence 2.0 — Brain Recommendation Engine
 *
 * Computes contextual match scores, detailed "Why this?" rationales, and parses
 * natural language user intent for smart search recommendations.
 */

import type { MarketplaceItem } from "./marketplace-registry";

export interface BrainMarketplaceContext {
  workspace: "personal" | "focus" | "studio" | "gaming" | string;
  hour?: number;
  period: "morning" | "work" | "evening" | "night";
  connectedServices: string[];
  installedItemIds: string[];
  focusActive?: boolean;
}

export interface BrainMatchResult {
  itemId: string;
  score: number;
  reasons: string[];
  compatibilityText: string;
  highlightedBenefit: string;
}

export interface SearchIntentResult {
  hasIntent: boolean;
  intentLabel?: string;
  targetCategory?: string;
  targetType?: string;
  suggestedTags: string[];
  matchedKeywords: string[];
}

export function getCurrentDayPeriod(h?: number): "morning" | "work" | "evening" | "night" {
  const hour = h !== undefined ? h : new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "work";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

/**
 * Computes a transparent, context-aware compatibility score with human-readable rationales.
 */
export function evaluateBrainMatch(
  item: MarketplaceItem,
  ctx: BrainMarketplaceContext
): BrainMatchResult {
  let score = item.baseMatchScore || 80;
  const reasons: string[] = [];

  // 1. Workspace Affinity
  const currentWs = ctx.workspace.toLowerCase();
  const fitsWorkspace =
    item.compatibility.workspaces.includes("all") ||
    item.compatibility.workspaces.includes(currentWs as any);

  if (fitsWorkspace && currentWs !== "all") {
    score += 6;
    if (currentWs === "studio" && (item.category === "development" || item.category === "ai")) {
      score += 4;
      reasons.push("✓ Votre Espace Studio / Dev est actif");
    } else if (currentWs === "gaming" && item.category === "gaming") {
      score += 5;
      reasons.push("✓ Votre Espace Gaming est actif");
    } else if (currentWs === "focus" && item.category === "productivity") {
      score += 5;
      reasons.push("✓ Votre Espace Focus est actif");
    } else {
      reasons.push(`✓ Optimisé pour votre Espace ${capitalize(currentWs)}`);
    }
  }

  // 2. Connected Integrations Synergy
  const connectedSet = new Set(ctx.connectedServices.map((s) => s.toLowerCase()));
  if (item.dependencies && item.dependencies.length > 0) {
    const allMet = item.dependencies.every((dep) => connectedSet.has(dep.id.toLowerCase()));
    if (allMet) {
      score += 5;
      reasons.push(`✓ Vos connexions requises (${item.dependencies.map((d) => d.name).join(", ")}) sont actives`);
    } else {
      score -= 3;
    }
  } else {
    // Check indirect synergy
    if (item.tags.some((tag) => connectedSet.has(tag))) {
      score += 3;
      reasons.push("✓ S'intègre naturellement avec vos services déjà connectés");
    }
  }

  // 3. Time of Day Context
  if (ctx.period === "morning") {
    if (item.id.includes("morning") || item.tags.includes("morning") || item.category === "productivity") {
      score += 5;
      reasons.push("✓ Idéal pour démarrer votre matinée avec clarté");
    }
  } else if (ctx.period === "work") {
    if (item.category === "development" || item.category === "productivity" || item.type === "brain") {
      score += 4;
      reasons.push("✓ Conçu pour vos créneaux de travail en journée");
    }
  } else if (ctx.period === "evening" || ctx.period === "night") {
    if (item.category === "gaming" || item.category === "media" || item.tags.includes("zen") || item.tags.includes("amoled")) {
      score += 4;
      reasons.push("✓ Parfait pour votre session du soir / détente");
    }
  }

  // 4. Focus session bonus
  if (ctx.focusActive && (item.category === "productivity" || item.tags.includes("focus") || item.tags.includes("zen"))) {
    score += 4;
    reasons.push("✓ Session Focus actuellement active");
  }

  // 5. Verified Tier bonus
  if (item.verification === "verified" || item.verification === "audited") {
    reasons.push("✓ Audité et certifié par ETHONE Core");
  }

  // Cap score between 70% and 99%
  const finalScore = Math.min(99, Math.max(70, Math.round(score)));

  let compatibilityText = "Excellente compatibilité (90%+)";
  if (finalScore < 80) compatibilityText = "Bonne compatibilité";
  else if (finalScore >= 95) compatibilityText = "Correspondance quasi-parfaite (95%+)";

  let highlightedBenefit = "Recommandé pour votre flux de travail actuel.";
  if (reasons.length > 0) {
    highlightedBenefit = reasons[0].replace("✓ ", "");
  }

  return {
    itemId: item.id,
    score: finalScore,
    reasons,
    compatibilityText,
    highlightedBenefit,
  };
}

/**
 * Parses user input in natural language to detect intention.
 */
export function parseNaturalLanguageIntent(query: string): SearchIntentResult {
  const q = query.toLowerCase().trim();
  if (!q) {
    return { hasIntent: false, suggestedTags: [], matchedKeywords: [] };
  }

  // Gaming Setup Intent
  if (
    q.includes("gaming") ||
    q.includes("jeu") ||
    q.includes("jeux") ||
    q.includes("setup gaming") ||
    q.includes("valorant") ||
    q.includes("jouer")
  ) {
    return {
      hasIntent: true,
      intentLabel: "Setup & Expérience Gaming",
      targetCategory: "gaming",
      suggestedTags: ["gaming", "discord", "spotify", "valorant", "cyber"],
      matchedKeywords: ["gaming", "valorant", "discord", "cyber-neon"],
    };
  }

  // Dev / Coding Intent
  if (
    q.includes("dev") ||
    q.includes("code") ||
    q.includes("coder") ||
    q.includes("programmation") ||
    q.includes("github") ||
    q.includes("développeur") ||
    q.includes("logiciel")
  ) {
    return {
      hasIntent: true,
      intentLabel: "Environnement Développeur",
      targetCategory: "development",
      suggestedTags: ["development", "github", "vscode", "dev", "architecture"],
      matchedKeywords: ["github", "vscode", "copilot", "developer"],
    };
  }

  // Focus & Productivity Intent
  if (
    q.includes("focus") ||
    q.includes("travailler") ||
    q.includes("concentration") ||
    q.includes("pomodoro") ||
    q.includes("productivité") ||
    q.includes("zen") ||
    q.includes("étude")
  ) {
    return {
      hasIntent: true,
      intentLabel: "Deep Work & Concentration",
      targetCategory: "productivity",
      suggestedTags: ["productivity", "focus", "zen", "pomodoro", "minimal"],
      matchedKeywords: ["focus", "pomodoro", "zen", "minimal"],
    };
  }

  // Media & Music Intent
  if (
    q.includes("musique") ||
    q.includes("musique 3d") ||
    q.includes("audio") ||
    q.includes("chanson") ||
    q.includes("spotify") ||
    q.includes("streaming")
  ) {
    return {
      hasIntent: true,
      intentLabel: "Audio & Ambiance Multimédia",
      targetCategory: "media",
      suggestedTags: ["media", "spotify", "music", "audio"],
      matchedKeywords: ["spotify", "audio", "nowplaying"],
    };
  }

  // AI & Brain Intent
  if (
    q.includes("ia") ||
    q.includes("ai") ||
    q.includes("brain") ||
    q.includes("copilot") ||
    q.includes("assistant") ||
    q.includes("synthèse")
  ) {
    return {
      hasIntent: true,
      intentLabel: "Intelligence Artificielle & Brain Labs",
      targetCategory: "ai",
      suggestedTags: ["ai", "brain", "copilot", "summaries"],
      matchedKeywords: ["brain", "copilot", "summary"],
    };
  }

  // Theme / Appearance Intent
  if (
    q.includes("thème") ||
    q.includes("theme") ||
    q.includes("couleur") ||
    q.includes("dark") ||
    q.includes("sombre") ||
    q.includes("amoled") ||
    q.includes("design")
  ) {
    return {
      hasIntent: true,
      intentLabel: "Personnalisation Visuelle & Thèmes",
      targetType: "theme",
      suggestedTags: ["theme", "amoled", "cyber", "minimal", "glass"],
      matchedKeywords: ["cyber-neon", "minimal", "aurora"],
    };
  }

  return { hasIntent: false, suggestedTags: [], matchedKeywords: [] };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
