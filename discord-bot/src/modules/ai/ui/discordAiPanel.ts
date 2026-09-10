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
import { baseEmbed } from '../../../utils/embeds.js';
import type { IntentCategory } from '../services/intentTypes.js';

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

    const embed = baseEmbed('primary', {
      footerText: `Demandé par ${userTag} • ETHONE AI 2.0`,
    })
      .setAuthor({
        name: personality.name,
        iconURL: personality.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
      })
      // La réponse du modèle n'est jamais garantie sous la limite de description d'un
      // embed Discord (4096 caractères) — sans troncature, une réponse trop longue fait
      // échouer silencieusement tout l'envoi (voir troncature équivalente sur le résumé
      // de salon un peu plus bas dans ce même fichier, `ai_summarize`).
      .setDescription(answer.length > 4096 ? `${answer.slice(0, 4093)}...` : answer);

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
   * Construit les boutons selon l'intent détecté.
   *
   * Prompt #18 §17-20 :
   * - Aucune action par défaut systématique.
   * - Message de conversation courte : pas de boutons support.
   * - Support : ouvrir ticket + diagnostiquer.
   * - Action : confirmer/annuler.
   * - Search : ouvrir / voir plus.
   */
  public static buildActionsForIntent(
    messageId: string,
    intent: IntentCategory = 'informational'
  ): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    const add = (...buttons: ButtonBuilder[]) => {
      row.addComponents(...buttons);
      return row;
    };

    switch (intent) {
      case 'conversation':
      case 'humor':
      case 'short_reply':
        return add(
          new ButtonBuilder()
            .setCustomId(`ai_helpful:${messageId}`)
            .setLabel('Utile')
            .setEmoji('👍')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`ai_unhelpful:${messageId}`)
            .setLabel('Pas utile')
            .setEmoji('👎')
            .setStyle(ButtonStyle.Secondary)
        );
      case 'informational':
      case 'ethone_info':
        return add(
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
            .setCustomId(`ai_summarize:${messageId}`)
            .setLabel('Résumer')
            .setEmoji('📝')
            .setStyle(ButtonStyle.Secondary)
        );
      case 'support':
        return add(
          new ButtonBuilder()
            .setCustomId(`ai_ticket:${messageId}`)
            .setLabel('Ouvrir un Ticket')
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`ai_diagnose:${messageId}`)
            .setLabel('Diagnostiquer')
            .setEmoji('🔧')
            .setStyle(ButtonStyle.Secondary)
        );
      case 'action':
        return add(
          new ButtonBuilder()
            .setCustomId(`ai_confirm_action:${messageId}`)
            .setLabel('Confirmer')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`ai_cancel_action:${messageId}`)
            .setLabel('Annuler')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Secondary)
        );
      case 'search':
        return add(
          new ButtonBuilder()
            .setCustomId(`ai_open_result:${messageId}`)
            .setLabel('Ouvrir')
            .setEmoji('📂')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`ai_summarize:${messageId}`)
            .setLabel('Voir plus')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Secondary)
        );
      case 'clarification':
      default:
        return add(
          new ButtonBuilder()
            .setCustomId(`ai_helpful:${messageId}`)
            .setLabel('Utile')
            .setEmoji('👍')
            .setStyle(ButtonStyle.Secondary)
        );
    }
  }

  /**
   * Compatibilité rétroactive avec le code existant.
   * Le project peut toujours appeler `buildActionRow()` si besoin, mais le flux
   * moderne passe par `buildActionsForIntent()`.
   */
  public static buildActionRow(messageId: string): ActionRowBuilder<ButtonBuilder> {
    return this.buildActionsForIntent(messageId, 'informational');
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
          embeds: [baseEmbed('success').setDescription('Merci pour votre retour positif ! 👍')],
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
          embeds: [baseEmbed('info').setDescription('Merci pour votre retour. Nous améliorons continuellement nos réponses ! 👎')],
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
            guild: interaction.guild,
            user: interaction.user,
          });
          await interaction.editReply({
            embeds: [baseEmbed('success').setDescription(`🎫 Votre ticket de support a été créé avec succès (**#${result.ticketId}**). L'équipe de modération a été notifiée !`)],
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
            await interaction.editReply({ embeds: [baseEmbed('info').setTitle('📝 Résumé du salon').setDescription(summary.slice(0, 4096))] });
            return;
          }
        }
        await interaction.editReply({ embeds: [baseEmbed('error').setDescription('Impossible de récupérer les messages pour le résumé.')] });
      }
    } catch (err: any) {
      logger.error('[DiscordAiPanel] Erreur traitement interaction bouton :', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [baseEmbed('error').setDescription('Une erreur est survenue lors de cette action.')], ephemeral: true }).catch(() => {});
      }
    }
  }
}
