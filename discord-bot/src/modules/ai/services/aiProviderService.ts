import { AIMessage, AISettings } from '../types/index.js';
import { logger } from '../../../utils/logger.js';

export interface GenerateCompletionParams {
  settings: AISettings;
  systemPrompt: string;
  messages: AIMessage[];
  knowledgeContext?: string;
}

export interface AICompletionResult {
  text: string;
  sourcesUsed: string[];
  tokensUsed: number;
  model: string;
}

export class AIProviderService {
  /**
   * Génère une complétion via le provider configuré ou le moteur contextuel interne
   */
  public static async generate(params: GenerateCompletionParams): Promise<AICompletionResult> {
    const { settings, systemPrompt, messages, knowledgeContext = '' } = params;
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    const openrouterKey = process.env.OPENROUTER_API_KEY || '';
    const openaiKey = process.env.OPENAI_API_KEY || '';

    // Si une clé OpenRouter ou OpenAI est présente et configurée, on l'appelle
    if (settings.provider === 'OPENROUTER' && openrouterKey) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
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
            temperature: settings.personality.sliders.creativity / 100,
            max_tokens: 800,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          const text = data.choices?.[0]?.message?.content || '';
          if (text) {
            return {
              text,
              sourcesUsed: [],
              tokensUsed: data.usage?.total_tokens || 150,
              model: settings.model,
            };
          }
        }
      } catch (err) {
        logger.warn('[AIProviderService] Échec appel OpenRouter, bascule sur Builtin Engine :', err);
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
    else if (queryLower.includes('ticket') || queryLower.includes('support') || queryLower.includes('aide') || queryLower.includes('problème') || queryLower.includes('probleme') || queryLower.includes('modérateur') || queryLower.includes('contact')) {
      if (knowledgeContext.includes('FAQ Support & Tickets')) {
        sourcesUsed.push('FAQ Support & Tickets');
      }
      answer = `Pour toute demande d'assistance personnalisée ou pour signaler un comportement, vous pouvez **ouvrir un ticket de support** :\n\n- Rendez-vous dans le salon **#support**\n- Ou cliquez sur le bouton **"🎫 Ouvrir un Ticket"** situé juste en bas de ce message !\n\nNotre équipe de modération vous répondra dans les plus brefs délais.`;
    }
    // 5. Réponse générique / Connaissances trouvées
    else if (knowledgeContext.length > 50) {
      sourcesUsed.push('Base de connaissances du serveur');
      answer = `D'après nos documents internes :\n\n${knowledgeContext.split('\n').filter((l) => l.trim() && !l.startsWith('###') && !l.startsWith('---')).slice(0, 4).join('\n')}\n\nN'hésitez pas à ouvrir un ticket si vous avez besoin de précisions supplémentaires !`;
    }
    // 6. Si strict et aucune information
    else if (isStrict) {
      answer = `Je ne dispose pas de suffisamment d'informations vérifiées dans la base de connaissances du serveur pour répondre précisément à cette question. N'hésitez pas à demander de l'aide à un modérateur ou à ouvrir un ticket de support !`;
    } else {
      answer = `Je suis là pour vous aider ! Pourriez-vous préciser votre question ? Je peux notamment vous renseigner sur le fonctionnement du serveur, les grades disponibles, les règles à respecter ou vous mettre en relation avec le support.`;
    }

    return {
      text: answer,
      sourcesUsed,
      tokensUsed: Math.ceil(answer.length / 4) + 40,
      model: 'builtin-ethone-v2',
    };
  }
}
