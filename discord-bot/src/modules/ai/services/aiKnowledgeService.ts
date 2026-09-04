import { AIKnowledgeSource } from '../types/index.js';
import { aiRepository } from '../storage/aiRepository.js';

export interface RetrievedKnowledge {
  contextText: string;
  sources: Array<{ id: string; title: string; score: number }>;
}

export class AIKnowledgeService {
  /**
   * Recherche sémantique / mots-clés dans les sources autorisées pour le salon et l'utilisateur
   */
  public static retrieveContext(params: {
    guildId: string;
    query: string;
    channelId?: string;
    roleIds?: string[];
    maxSources?: number;
  }): RetrievedKnowledge {
    const { guildId, query, channelId, roleIds = [], maxSources = 3 } = params;
    const allSources = aiRepository.getKnowledgeSources(guildId);

    if (allSources.length === 0 || !query.trim()) {
      return { contextText: '', sources: [] };
    }

    const queryWords = query
      .toLowerCase()
      .replace(/[^\w\sàâéèêëîïôùûç]/gi, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const scoredSources: Array<{ source: AIKnowledgeSource; score: number }> = [];

    for (const src of allSources) {
      if (src.status !== 'READY') continue;

      // Vérification des scopes
      if (src.scope === 'CHANNEL' && channelId && src.allowedChannelIds) {
        if (!src.allowedChannelIds.includes(channelId)) continue;
      }
      if (src.scope === 'ROLE' && src.allowedRoleIds && src.allowedRoleIds.length > 0) {
        const hasRole = src.allowedRoleIds.some((r) => roleIds.includes(r));
        if (!hasRole) continue;
      }

      const contentLower = src.content.toLowerCase();
      const titleLower = src.title.toLowerCase();

      let score = 0;
      for (const word of queryWords) {
        if (titleLower.includes(word)) score += 5; // Poids fort sur le titre
        const occurrences = (contentLower.match(new RegExp(word, 'g')) || []).length;
        score += occurrences * 2;
      }

      if (score > 0) {
        scoredSources.push({ source: src, score });
      }
    }

    scoredSources.sort((a, b) => b.score - a.score);
    const top = scoredSources.slice(0, maxSources);

    if (top.length === 0) {
      return { contextText: '', sources: [] };
    }

    let contextText = '### DOCUMENTS ET CONNAISSANCES PERTINENTES DU SERVEUR :\n';
    for (const item of top) {
      contextText += `\n--- SOURCE : ${item.source.title} (${item.source.type}) ---\n${item.source.content}\n`;
    }

    return {
      contextText,
      sources: top.map((t) => ({ id: t.source.id, title: t.source.title, score: t.score })),
    };
  }

  /**
   * Estime le nombre de tokens d'un texte
   */
  public static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
