import { AIMessage, AISettings } from '../types/index.js';
import { logger } from '../../../utils/logger.js';
import type { IntentResult } from './intentTypes.js';
import { detectIntent, pickShortReply } from './intentDetector.js';

export interface GenerateCompletionParams {
  settings: AISettings;
  systemPrompt: string;
  messages: AIMessage[];
  knowledgeContext?: string;
}

export interface GenerateWithIntentParams {
  settings: AISettings;
  baseSystemPrompt: string;
  messages: AIMessage[];
  knowledgeContext?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Active le fallback LLM (Gemini Flash / Llama 8B) si la confiance regex est basse */
  llmClassifier?: (text: string, lang: 'fr' | 'en' | 'es' | 'de') => Promise<{ intent: IntentResult['intent']; confidence: number } | null>;
}

export interface AICompletionResult {
  text: string;
  sourcesUsed: string[];
  tokensUsed: number;
  model: string;
  /** Intent détecté (Prompt #18 §34 — réponse structurée) */
  intent?: IntentResult['intent'];
  /** Confiance 0..1 */
  intentConfidence?: number;
  /** Actions contextuelles à proposer (Prompt #18 §21) */
  suggestedActions?: string[];
}

export class AIProviderService {
  /**
   * Génère une complétion via le provider configuré ou le moteur contextuel interne.
   *
   * DEPRECATED : préférer `generateWithIntent()` (Prompt #18). Conservé pour
   * rétrocompatibilité avec les call-sites existants (tests playground, etc.).
   */
  public static async generate(params: GenerateCompletionParams): Promise<AICompletionResult> {
    const { settings, systemPrompt, messages, knowledgeContext = '' } = params;
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    const openrouterKey = process.env.OPENROUTER_API_KEY || '';
    const openaiKey = process.env.OPENAI_API_KEY || '';
    const groqKey = process.env.GROQ_API_KEY || '';

    // 1. OpenRouter Provider
    if (settings.provider === 'OPENROUTER' && openrouterKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: settings.model || 'deepseek/deepseek-chat:free',
            messages: [
              { role: 'system', content: `${systemPrompt}\n\n${knowledgeContext}` },
              ...messages.map((m) => ({ role: m.role, content: m.content })),
            ],
            temperature: (settings.personality.sliders.creativity || 50) / 100,
            max_tokens: 800,
          }),
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = (await response.json()) as any;
          const text = data.choices?.[0]?.message?.content || '';
          if (text) {
            return {
              text,
              sourcesUsed: [],
              tokensUsed: data.usage?.total_tokens || 150,
              model: settings.model || 'openrouter-model',
            };
          }
        } else {
          const errText = await response.text().catch(() => '');
          logger.warn(`[AIProviderService] OpenRouter a retourné le code ${response.status}: ${errText}`);
        }
      } catch (err) {
        logger.warn('[AIProviderService] Échec appel OpenRouter, bascule sur Builtin Engine :', err);
      }
    }

    // 2. OpenAI Provider
    if (settings.provider === 'OPENAI' && openaiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: settings.model || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: `${systemPrompt}\n\n${knowledgeContext}` },
              ...messages.map((m) => ({ role: m.role, content: m.content })),
            ],
            temperature: (settings.personality.sliders.creativity || 50) / 100,
            max_tokens: 800,
          }),
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = (await response.json()) as any;
          const text = data.choices?.[0]?.message?.content || '';
          if (text) {
            return {
              text,
              sourcesUsed: [],
              tokensUsed: data.usage?.total_tokens || 150,
              model: settings.model || 'gpt-4o-mini',
            };
          }
        } else {
          const errText = await response.text().catch(() => '');
          logger.warn(`[AIProviderService] OpenAI a retourné le code ${response.status}: ${errText}`);
        }
      } catch (err) {
        logger.warn('[AIProviderService] Échec appel OpenAI, bascule sur Builtin Engine :', err);
      }
    }

    // 3. Groq Provider
    if (settings.provider === 'GROQ' && groqKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: settings.model || 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: `${systemPrompt}\n\n${knowledgeContext}` },
              ...messages.map((m) => ({ role: m.role, content: m.content })),
            ],
            temperature: (settings.personality.sliders.creativity || 50) / 100,
            max_tokens: 800,
          }),
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = (await response.json()) as any;
          const text = data.choices?.[0]?.message?.content || '';
          if (text) {
            return {
              text,
              sourcesUsed: [],
              tokensUsed: data.usage?.total_tokens || 150,
              model: settings.model || 'groq-llama',
            };
          }
        } else {
          const errText = await response.text().catch(() => '');
          logger.warn(`[AIProviderService] Groq a retourné le code ${response.status}: ${errText}`);
        }
      } catch (err) {
        logger.warn('[AIProviderService] Échec appel Groq, bascule sur Builtin Engine :', err);
      }
    }

    // Moteur contextuel intégré (Builtin Reasoning Engine)
    return this.generateBuiltinResponse(settings, lastUserMessage, knowledgeContext);
  }

  /**
   * Moteur contextuel intégré : analyse la question, les connaissances et génère une réponse fluide et précise
   */
  private static generateBuiltinResponse(
    settings: AISettings,
    userQuery: string,
    knowledgeContext: string
  ): AICompletionResult {
    const queryLower = userQuery.toLowerCase();
    const personality = settings.personality;
    const isStrict = settings.hallucinationMode === 'STRICT';

    let answer = '';
    const sourcesUsed: string[] = [];

    // 1. Détection de salutations courantes
    if (/^(bonjour|salut|hello|hi|hey|coucou|yo)/i.test(queryLower.trim())) {
      answer = `Bonjour ! Je suis **${personality.name}**, l'assistant du serveur. Comment puis-je vous aider aujourd'hui ? Vous pouvez me poser des questions sur les règles, les rôles, les tickets ou le fonctionnement de la communauté !`;
      return {
        text: answer,
        sourcesUsed: [],
        tokensUsed: 65,
        model: 'builtin-ethone-v2',
      };
    }

    // 2. Détection de questions sur les rôles et le VIP
    if (queryLower.includes('vip') || queryLower.includes('grade') || queryLower.includes('rôle') || queryLower.includes('role')) {
      if (knowledgeContext.includes('Guide des Rôles') || knowledgeContext.includes('VIP Elite')) {
        sourcesUsed.push('Guide des Rôles & Avantages VIP');
        answer = `Pour obtenir le statut **VIP Elite** sur notre serveur, vous pouvez inviter au moins 5 membres vérifiés ou soutenir le serveur avec un Nitro Boost !\n\nLes avantages incluent :\n- Accès aux salons vocaux haute fidélité (128 kbps)\n- Salons textuels et vocaux réservés aux VIP\n- Rôle doré mis en valeur dans la liste des membres\n\nTapez \`/rank\` pour consulter également votre niveau d'activité sur le serveur.`;
      } else {
        answer = `Les rôles s'obtiennent par votre activité sur le serveur (XP via les messages), par vos invitations de membres ou via les événements communautaires !`;
      }
    }
    // 3. Détection de questions sur le règlement ou sanctions
    else if (queryLower.includes('règle') || queryLower.includes('regle') || queryLower.includes('interdit') || queryLower.includes('ban') || queryLower.includes('warn') || queryLower.includes('spam')) {
      if (knowledgeContext.includes('Règlement Officiel') || knowledgeContext.includes('Respectez tous les membres')) {
        sourcesUsed.push('Règlement Officiel ETHONE');
        answer = `Voici les points essentiels de notre règlement :\n\n1. **Respect absolu** : Aucun harcèlement, provocation ou insulte n'est toléré.\n2. **Anti-Spam** : Pas de flood de messages ni de mentions inutiles.\n3. **Publicité** : Strictement interdite sans autorisation expresse du staff.\n4. **Vocaux** : Respectez le calme et la convivialité.\n\nTout comportement abusif fait l'objet d'avertissements automatiques ou de sanctions par l'équipe de modération.`;
      } else {
        answer = `Le serveur applique un règlement strict axé sur le respect mutuel et l'interdiction du spam et de la publicité.`;
      }
    }
    // 4. Détection de questions sur le support ou les tickets
    else if (queryLower.includes('ticket') || queryLower.includes('support') || queryLower.includes('problème') || queryLower.includes('probleme') || queryLower.includes('modérateur') || queryLower.includes('contact')) {
      if (knowledgeContext.includes('FAQ Support & Tickets')) {
        sourcesUsed.push('FAQ Support & Tickets');
      }
      answer = `Pour toute demande d'assistance personnalisée ou pour signaler un comportement, vous pouvez **ouvrir un ticket de support** :\n\n- Rendez-vous dans le salon **#support**\n- Ou cliquez sur le bouton **"🎫 Ouvrir un Ticket"** situé juste en bas de ce message !\n\nNotre équipe de modération vous répondra dans les plus brefs délais.`;
    }
    // 5. Détection de questions sur les commandes ou l'aide globale
    else if (queryLower.includes('commande') || queryLower.includes('help') || queryLower.includes('aide') || queryLower.includes('que peux-tu faire') || queryLower.includes('fonctionnalité')) {
      answer = `Voici les fonctionnalités et commandes principales disponibles sur le serveur :\n\n- \`/ask <question>\` : Me poser n'importe quelle question\n- \`/help\` : Afficher le catalogue complet des commandes\n- \`/rank\` & \`/leaderboard\` : Suivre votre niveau d'activité et XP\n- \`/ticket\` : Ouvrir un salon d'assistance avec l'équipe\n- \`/suggest\` : Soumettre une suggestion pour le serveur\n- \`/poll\` : Consulter et voter aux sondages en cours\n\nSi vous avez besoin d'une aide particulière, tapez votre question avec \`/ask\` !`;
    }
    // 6. Détection de questions sur l'XP ou les niveaux
    else if (queryLower.includes('xp') || queryLower.includes('niveau') || queryLower.includes('level') || queryLower.includes('classement')) {
      answer = `Le système d'expérience récompense votre activité sur le serveur :\n\n- Vous gagnez de l'**XP** en participant aux discussions textuelles et vocales\n- Tapez \`/rank\` pour voir votre carte de progression personnelle\n- Tapez \`/leaderboard\` pour voir les membres les plus actifs !`;
    }
    // 7. Réponse générique / Connaissances trouvées
    else if (knowledgeContext.length > 50) {
      sourcesUsed.push('Base de connaissances du serveur');
      answer = `D'après nos documents internes :\n\n${knowledgeContext.split('\n').filter((l) => l.trim() && !l.startsWith('###') && !l.startsWith('---')).slice(0, 4).join('\n')}\n\nN'hésitez pas à ouvrir un ticket si vous avez besoin de précisions supplémentaires !`;
    }
    // 8. Si strict et aucune information — message court, pas de template générique
    else if (isStrict) {
      answer = `Je n'ai pas d'information vérifiée sur ce sujet dans la base du serveur. Tu peux préciser ta question ou ouvrir un ticket si tu veux qu'un modérateur t'aide.`;
    }
    // 9. Cas par défaut — fallback court non-support (Prompt #18 §5, §25)
    else {
      answer = `Hmm, je ne suis pas sûr de bien saisir. Tu peux reformuler ou préciser ce que tu attends ?`;
    }

    return {
      text: answer,
      sourcesUsed,
      tokensUsed: Math.ceil(answer.length / 4) + 40,
      model: 'builtin-ethone-v2',
    };
  }

  /**
   * Prompt #18 — Génération contextuelle avec détection d'intention préalable.
   *
   * Flow :
   *   1. `detectIntent()` (regex + LLM fallback si activé) sur le dernier message user
   *   2. Si intent trivial (conversation/humor/short_reply) + confiance haute :
   *      → utilise `pickShortReply()` au lieu d'appeler le LLM
   *   3. Sinon : enrichit le system prompt avec les consignes d'intent, appelle le LLM,
   *      puis renvoie la réponse structurée { text, intent, confidence, suggestedActions }
   *
   * Avantages :
   *   - Pas de réponse générique support pour "comment tu vas ?"
   *   - Pas d'appel LLM inutile pour les salutations (économise tokens)
   *   - Contexte multi-tour respecté via `history`
   *   - Le système ne prétend jamais avoir effectué une action (Prompt #18 §30)
   */
  public static async generateWithIntent(
    params: GenerateWithIntentParams
  ): Promise<AICompletionResult> {
    const { settings, baseSystemPrompt, messages, knowledgeContext = '', history, llmClassifier } = params;
    const lastUserMessage = messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || '';

    // 1. Détection d'intent (hybride regex + LLM)
    const detected = await detectIntent(
      lastUserMessage,
      history || messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { enabled: !!llmClassifier, classify: llmClassifier }
    );

    // 2. Fast-track : intents triviaux avec confiance haute → réponse courte locale
    const TRIVIAL_INTENTS = ['conversation', 'humor', 'short_reply'] as const;
    if (
      (TRIVIAL_INTENTS as readonly string[]).includes(detected.intent) &&
      detected.confidence >= 0.8
    ) {
      const shortText = pickShortReply(detected.intent, detected.language);
      if (shortText) {
        return {
          text: shortText,
          sourcesUsed: [],
          tokensUsed: Math.ceil(shortText.length / 4),
          model: 'builtin-ethent-v3',
          intent: detected.intent,
          intentConfidence: detected.confidence,
          suggestedActions: [],
        };
      }
    }

    // 3. Enrichir le system prompt avec la conscience d'intent (Prompt #18 §6)
    const intentAwareSystemPrompt =
      `${baseSystemPrompt}\n\n` +
      `### CONSCIENCE D'INTENTION (Prompt #18)\n` +
      `- Intent détecté : ${detected.intent}\n` +
      `- Confiance : ${detected.confidence.toFixed(2)}\n` +
      `- Langue détectée : ${detected.language}\n` +
      (detected.entities.serviceHint
        ? `- Service évoqué : ${detected.entities.serviceHint}\n`
        : '') +
      (detected.entities.actionVerb
        ? `- Verbe d'action : ${detected.entities.actionVerb}\n`
        : '') +
      `\n` +
      `Règles strictes selon l'intent :\n` +
      `- conversation / humor / short_reply : réponse COURTE et naturelle (1-2 phrases max). ` +
      `Ne JAMAIS proposer une liste de fonctionnalités, de boutons support, ou un template générique d'aide.\n` +
      `- informational / ethone_info : réponse informative concise. Embed léger possible.\n` +
      `- support : empathie + actions concrètes (diagnostic, handoff ticket).\n` +
      `- action : confirme ce que tu vas faire et DEMANDE confirmation avant d'exécuter. ` +
      `Ne prétends JAMAIS avoir effectué une action (Prompt #18 §30).\n` +
      `- search : annonce que tu cherches et donne les résultats.\n` +
      `- clarification : demande une précision COURTE et pertinente.\n`;

    // 4. Délègue au moteur existant (qui gère les providers externes + builtin)
    const completion = await AIProviderService.generate({
      settings,
      systemPrompt: intentAwareSystemPrompt,
      messages,
      knowledgeContext,
    });

    // 5. Actions contextuelles (Prompt #18 §21)
    const suggestedActions = this.actionsForIntent(detected.intent);

    return {
      ...completion,
      intent: detected.intent,
      intentConfidence: detected.confidence,
      suggestedActions,
    };
  }

  /**
   * Actions contextuelles proposées par intent (Prompt #18 §21, §38).
   * Ces actions sont consommées par `DiscordAiPanel.buildActionsForIntent()`.
   */
  public static actionsForIntent(intent: IntentResult['intent']): string[] {
    switch (intent) {
      case 'conversation':
      case 'humor':
      case 'short_reply':
        return ['feedback_helpful', 'feedback_unhelpful'];
      case 'informational':
      case 'ethone_info':
        return ['feedback_helpful', 'feedback_unhelpful', 'summarize'];
      case 'support':
        return ['feedback_helpful', 'feedback_unhelpful', 'open_ticket', 'diagnose'];
      case 'action':
        return ['confirm_action', 'cancel_action'];
      case 'search':
        return ['open_result', 'feedback_helpful', 'feedback_unhelpful'];
      case 'clarification':
        return [];
      default:
        return ['feedback_helpful', 'feedback_unhelpful'];
    }
  }
}
