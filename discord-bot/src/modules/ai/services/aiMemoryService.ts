import { AIConversation, AIMessage } from '../types/index.js';
import { aiRepository } from '../storage/aiRepository.js';

export class AIMemoryService {
  /**
   * Récupère ou crée une session de conversation pour un canal ou thread
   */
  public static getOrCreateConversation(params: {
    guildId: string;
    channelId: string;
    threadId?: string;
    userId: string;
    userTag: string;
  }): AIConversation {
    const { guildId, channelId, threadId, userId, userTag } = params;
    const existing = aiRepository.getConversation(guildId, threadId || channelId, userId);

    if (existing) {
      existing.lastActiveAt = new Date().toISOString();
      return existing;
    }

    const newConv: AIConversation = {
      id: `CONV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      guildId,
      channelId,
      threadId,
      userId,
      userTag,
      messages: [],
      startedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    aiRepository.saveConversation(newConv);
    return newConv;
  }

  /**
   * Ajoute un message à l'historique de conversation
   */
  public static appendMessage(
    conversation: AIConversation,
    role: 'user' | 'assistant',
    content: string,
    sources?: string[],
    maxContext = 20
  ): void {
    const msg: AIMessage = {
      role,
      content,
      timestamp: new Date().toISOString(),
      sources,
    };

    conversation.messages.push(msg);
    if (conversation.messages.length > maxContext) {
      conversation.messages = conversation.messages.slice(-maxContext);
    }
    conversation.lastActiveAt = new Date().toISOString();

    aiRepository.saveConversation(conversation);
  }

  /**
   * Oublie la conversation courante
   */
  public static forget(guildId: string, conversationId: string): boolean {
    return aiRepository.forgetConversation(guildId, conversationId);
  }

  /**
   * Supprime toutes les mémoires associées à un utilisateur (Conformité Confidentialité)
   */
  public static forgetUser(guildId: string, userId: string): number {
    return aiRepository.forgetUserData(guildId, userId);
  }
}
