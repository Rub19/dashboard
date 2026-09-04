import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ButtonInteraction,
} from 'discord.js';
import { AISettings } from '../types/index.js';
import { aiRepository } from '../storage/aiRepository.js';
import { AIToolService } from '../services/aiToolService.js';
import { logger } from '../../../utils/logger.js';

export class DiscordAiPanel {
  /**
   * Construit l'embed Discord de réponse IA
   */
  public static buildResponseEmbed(params: {
    settings: AISettings;
    answer: string;
    sourcesUsed: string[];
    userTag: string;
  }): EmbedBuilder {
    const { settings, answer, sourcesUsed, userTag } = params;
    const personality = settings.personality;

    const embed = new EmbedBuilder()
      .setColor(0x6366f1) // Indigo ETHONE
      .setAuthor({
        name: personality.name,
        iconURL: personality.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
      })
      .setDescription(answer)
      .setFooter({
        text: `Demandé par ${userTag} • ETHONE AI 2.0`,
      })
      .setTimestamp();

    if (settings.showSources !== 'NEVER' && sourcesUsed.length > 0) {
      embed.addFields({
        name: '📚 Sources utilisées',
        value: sourcesUsed.map((s) => `• \`${s}\``).join('\n'),
        inline: false,
      });
    }

    return embed;
  }

  /**
   * Construit les boutons d'actions et de feedback sous la réponse
   */
  public static buildActionRow(messageId: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ai_helpful:${messageId}`)
        .setLabel('Utile')
        .setEmoji('👍')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ai_unhelpful:${messageId}`)
        .setLabel('Pas utile')
        .setEmoji('👎')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ai_ticket:${messageId}`)
        .setLabel('Ouvrir un Ticket')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`ai_summarize:${messageId}`)
        .setLabel('Résumer')
        .setEmoji('📝')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  /**
   * Gère les clics sur les boutons IA
   */
  public static async handleButton(interaction: ButtonInteraction): Promise<void> {
    const customId = interaction.customId;
    const parts = customId.split(':');
    const action = parts[0];
    const refId = parts[1] || '';

    try {
      if (action === 'ai_helpful') {
        if (interaction.guildId) {
          aiRepository.saveFeedback({
            id: `FB-${Date.now()}`,
            guildId: interaction.guildId,
            userId: interaction.user.id,
            messageId: refId,
            isHelpful: true,
            createdAt: new Date().toISOString(),
          });
        }
        await interaction.reply({
          content: 'Merci pour votre retour positif ! 👍',
          ephemeral: true,
        });
      } else if (action === 'ai_unhelpful') {
        if (interaction.guildId) {
          aiRepository.saveFeedback({
            id: `FB-${Date.now()}`,
            guildId: interaction.guildId,
            userId: interaction.user.id,
            messageId: refId,
            isHelpful: false,
            createdAt: new Date().toISOString(),
          });
        }
        await interaction.reply({
          content: 'Merci pour votre retour. Nous améliorons continuellement nos réponses ! 👎',
          ephemeral: true,
        });
      } else if (action === 'ai_ticket') {
        await interaction.deferReply({ ephemeral: true });
        if (interaction.guildId) {
          const result = await AIToolService.executeTicketHandoff({
            guildId: interaction.guildId,
            userId: interaction.user.id,
            userTag: interaction.user.tag,
            summary: `Ticket ouvert suite à une conversation avec l'assistant IA`,
          });
          await interaction.editReply({
            content: `🎫 Votre ticket de support a été créé avec succès (**#${result.ticketId}**). L'équipe de modération a été notifiée !`,
          });
        }
      } else if (action === 'ai_summarize') {
        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.channel;
        if (channel && 'messages' in channel) {
          const messages = await channel.messages.fetch({ limit: 15 }).catch(() => null);
          if (messages) {
            const list = Array.from(messages.values())
              .reverse()
              .map((m) => ({ author: m.author.username, content: m.content }));
            const summary = AIToolService.summarizeMessages(list);
            await interaction.editReply({ content: summary });
            return;
          }
        }
        await interaction.editReply({ content: 'Impossible de récupérer les messages pour le résumé.' });
      }
    } catch (err: any) {
      logger.error('[DiscordAiPanel] Erreur traitement interaction bouton :', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Une erreur est survenue lors de cette action.', ephemeral: true }).catch(() => {});
      }
    }
  }
}
