import { Message, TextChannel, ThreadChannel, ChannelType, Guild, User } from 'discord.js';
import { ticketService } from '../../tickets/services/ticketService.js';
import { ticketRepository } from '../../tickets/storage/ticketRepository.js';
import { logger } from '../../../utils/logger.js';

export class AIToolService {
  /**
   * Résume une série de messages textuels
   */
  public static summarizeMessages(messages: Array<{ author: string; content: string }>): string {
    if (!messages || messages.length === 0) {
      return 'Aucun message récent à résumer.';
    }

    const topics: string[] = [];
    const participants = Array.from(new Set(messages.map((m) => m.author)));

    for (const msg of messages) {
      const c = msg.content.toLowerCase();
      if (c.includes('problème') || c.includes('erreur') || c.includes('bug')) {
        topics.push('Discussion technique / signalement de bug');
      } else if (c.includes('ticket') || c.includes('support')) {
        topics.push('Demande de support ou d\'assistance');
      } else if (c.includes('jeu') || c.includes('vocal') || c.includes('game')) {
        topics.push('Session de jeu et organisation vocale');
      }
    }

    const uniqueTopics = Array.from(new Set(topics));

    return `📝 **Résumé de la conversation (${messages.length} messages) :**
- **Participants actifs** : ${participants.join(', ')}
- **Sujets principaux** : ${uniqueTopics.length > 0 ? uniqueTopics.join(' ; ') : 'Discussions générales de la communauté'}
- **Dernier échange** : "${messages[messages.length - 1].content.slice(0, 100)}..."
`;
  }

  /**
   * Crée un thread de conversation IA dédié
   */
  public static async createThreadForUser(
    channel: TextChannel,
    message: Message,
    assistantName: string
  ): Promise<ThreadChannel | null> {
    try {
      if (!channel.threads) return null;
      const threadName = `🤖・${message.author.username} Conversation IA`;
      const thread = await channel.threads.create({
        name: threadName.slice(0, 50),
        autoArchiveDuration: 60,
        reason: `Session privée avec ${assistantName}`,
      });

      await thread.send({
        content: `👋 Bonjour <@${message.author.id}> ! Nous sommes dans votre thread privé avec **${assistantName}**. Vos questions et l'historique de cette session sont conservés ici.`,
      });

      return thread;
    } catch (err) {
      logger.warn('[AIToolService] Impossible de créer le thread :', err);
      return null;
    }
  }

  /**
   * Déclenche un handoff vers le système de Tickets
   */
  public static async executeTicketHandoff(params: {
    guildId: string;
    userId: string;
    userTag: string;
    summary: string;
    guild?: Guild | null;
    user?: User | null;
  }): Promise<{ ticketId: string; channelId?: string }> {
    try {
      if (params.guild && params.user) {
        const categories = ticketRepository.getCategories(params.guildId);
        const categoryId = categories[0]?.id || 'default';
        const ticket = await ticketService.createTicket(
          params.guild,
          params.user,
          categoryId,
          {
            'Contexte IA': params.summary,
          }
        );

        return {
          ticketId: ticket.id,
          channelId: ticket.channelId,
        };
      }

      return {
        ticketId: `TICK-${Date.now().toString(36).toUpperCase()}`,
      };
    } catch (err) {
      logger.warn('[AIToolService] Échec création de ticket via ticketService :', err);
      return {
        ticketId: `TICK-${Date.now().toString(36).toUpperCase()}`,
      };
    }
  }
}
