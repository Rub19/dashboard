import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  TextChannel,
  ThreadAutoArchiveDuration,
} from 'discord.js';
import { Suggestion, SuggestionStatus } from '../types/suggestion.js';
import { suggestionStorage } from '../storage/suggestionStorage.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class SuggestionService {
  /**
   * Retourne la couleur et le libellé associé au statut
   */
  public static getStatusMeta(status: SuggestionStatus): {
    label: string;
    emoji: string;
    color: `#${string}`;
  } {
    switch (status) {
      case 'pending':
        return { label: 'En attente', emoji: '🟡', color: '#FBBF24' };
      case 'under_review':
        return { label: "En cours d'étude", emoji: '🔵', color: '#3B82F6' };
      case 'planned':
        return { label: 'Planifiée', emoji: '🟣', color: '#8B5CF6' };
      case 'accepted':
        return { label: 'Acceptée', emoji: '🟢', color: '#10B981' };
      case 'in_progress':
        return { label: 'En développement', emoji: '🚧', color: '#F59E0B' };
      case 'completed':
        return { label: 'Réalisée', emoji: '✅', color: '#059669' };
      case 'rejected':
        return { label: 'Refusée', emoji: '🔴', color: '#EF4444' };
      case 'duplicate':
        return { label: 'Doublon', emoji: '⚫', color: '#6B7280' };
      case 'on_hold':
        return { label: 'En pause', emoji: '🟠', color: '#EA580C' };
    }
  }

  /**
   * Construit l'embed Discord représentatif de la suggestion
   */
  public static buildEmbed(suggestion: Suggestion): EmbedBuilder {
    const meta = this.getStatusMeta(suggestion.status);

    const embed = new EmbedBuilder()
      .setColor(meta.color)
      .setAuthor({
        name: `Suggestion #${suggestion.numericId} • Par ${suggestion.authorTag}`,
        iconURL: suggestion.authorAvatarUrl || undefined,
      })
      .setTitle(suggestion.title)
      .setDescription(suggestion.description)
      .addFields([
        {
          name: 'Statut',
          value: `${meta.emoji} **${meta.label}**`,
          inline: true,
        },
        {
          name: 'Catégorie',
          value: `📁 ${suggestion.category}`,
          inline: true,
        },
        {
          name: 'Score',
          value: `👍 ${suggestion.upvotesCount}  •  👎 ${suggestion.downvotesCount}  (Score: **${
            suggestion.score >= 0 ? `+${suggestion.score}` : suggestion.score
          }**)`,
          inline: true,
        },
      ]);

    if (suggestion.staffResponse) {
      embed.addFields([
        {
          name: `💬 Réponse du Staff (${suggestion.staffResponderTag || 'Modérateur'})`,
          value: suggestion.staffResponse,
          inline: false,
        },
      ]);
    }

    if (suggestion.duplicateOfId) {
      embed.addFields([
        {
          name: '🔗 Doublon',
          value: `Cette suggestion a été marquée comme doublon de la suggestion #${suggestion.duplicateOfId}.`,
          inline: false,
        },
      ]);
    }

    embed
      .setFooter({ text: `ID: ${suggestion.id} • ${suggestion.comments.length} commentaire(s)` })
      .setTimestamp(new Date(suggestion.createdAt));

    return embed;
  }

  /**
   * Construit la rangée de boutons Discord
   */
  public static buildActionRow(suggestion: Suggestion): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`sugg_up:${suggestion.id}`)
        .setLabel(`👍 (${suggestion.upvotesCount})`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`sugg_down:${suggestion.id}`)
        .setLabel(`👎 (${suggestion.downvotesCount})`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`sugg_comment:${suggestion.id}`)
        .setLabel(`💬 Commenter (${suggestion.comments.length})`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`sugg_follow:${suggestion.id}`)
        .setLabel(`🔔 Suivre (${suggestion.followerIds.length})`)
        .setStyle(ButtonStyle.Secondary)
    );
  }

  /**
   * Crée et publie une suggestion sur Discord
   */
  public static async createSuggestion(
    client: Client,
    data: {
      guildId: string;
      authorId: string;
      authorTag: string;
      authorAvatarUrl?: string | null;
      title: string;
      description: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<Suggestion> {
    const config = suggestionStorage.getConfig(data.guildId);
    if (!config.channelId) {
      throw new Error("Aucun salon de suggestions n'est configuré sur ce serveur.");
    }

    const suggestion = suggestionStorage.create({
      guildId: data.guildId,
      channelId: config.channelId,
      authorId: data.authorId,
      authorTag: data.authorTag,
      authorAvatarUrl: data.authorAvatarUrl || null,
      title: data.title,
      description: data.description,
      category: data.category || 'Général',
      tags: data.tags || [],
    });

    try {
      const channel = client.channels.cache.get(config.channelId) as TextChannel | undefined;
      if (channel && channel.type === ChannelType.GuildText) {
        const embed = this.buildEmbed(suggestion);
        const row = this.buildActionRow(suggestion);
        const message = await channel.send({ embeds: [embed], components: [row] });

        suggestion.messageId = message.id;

        // Création automatique de thread si activé
        if (config.autoThread) {
          try {
            const thread = await message.startThread({
              name: `Discussion #${suggestion.numericId} : ${suggestion.title.substring(0, 50)}`,
              autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
            });
            suggestion.threadId = thread.id;
          } catch (err) {
            logger.warn('Impossible de créer le thread de suggestion :', err);
          }
        }

        suggestionStorage.update(suggestion.id, {
          messageId: suggestion.messageId,
          threadId: suggestion.threadId,
        });
      }
    } catch (err) {
      logger.error('Erreur publication message suggestion Discord :', err);
    }

    // Log d'audit
    const guild = client.guilds.cache.get(data.guildId);
    if (guild) {
      await logService.log(guild, {
        category: 'server',
        type: 'SERVER_UPDATE',
        title: '💡 Nouvelle Suggestion',
        description: `**${data.authorTag}** a soumis une nouvelle suggestion : **${suggestion.title}** (#${suggestion.numericId})`,
        color: '#6366F1',
        userId: data.authorId,
        userTag: data.authorTag,
        fields: [
          { name: 'Titre', value: suggestion.title, inline: true },
          { name: 'Catégorie', value: suggestion.category, inline: true },
        ],
      });
    }

    return suggestion;
  }

  /**
   * Met à jour le message Discord d'une suggestion
   */
  public static async updateDiscordMessage(client: Client, suggestionId: string): Promise<void> {
    const suggestion = suggestionStorage.getById(suggestionId);
    if (!suggestion || !suggestion.messageId) return;

    try {
      const channel = client.channels.cache.get(suggestion.channelId) as TextChannel | undefined;
      if (channel) {
        const message = await channel.messages.fetch(suggestion.messageId).catch(() => null);
        if (message) {
          const embed = this.buildEmbed(suggestion);
          const row = this.buildActionRow(suggestion);
          await message.edit({ embeds: [embed], components: [row] });
        }
      }
    } catch (err) {
      logger.error('Erreur mise à jour message suggestion :', err);
    }
  }

  /**
   * Met à jour le statut et envoie les notifications
   */
  public static async updateStatus(
    client: Client,
    suggestionId: string,
    newStatus: SuggestionStatus,
    staffTag: string,
    staffResponse?: string
  ): Promise<Suggestion | null> {
    const suggestion = suggestionStorage.getById(suggestionId);
    if (!suggestion) return null;

    const meta = this.getStatusMeta(newStatus);
    const history = [...suggestion.history];
    history.push({
      timestamp: new Date().toISOString(),
      actorTag: staffTag,
      action: `Statut modifié en "${meta.label}"`,
      details: staffResponse || undefined,
    });

    const updated = suggestionStorage.update(suggestionId, {
      status: newStatus,
      staffResponse: staffResponse || suggestion.staffResponse,
      staffResponderTag: staffResponse ? staffTag : suggestion.staffResponderTag,
      history,
    });

    if (!updated) return null;

    // Mise à jour de l'affichage Discord
    await this.updateDiscordMessage(client, suggestionId);

    // Notification DM aux abonnés (Followers)
    const config = suggestionStorage.getConfig(suggestion.guildId);
    if (config.dmNotifications) {
      for (const followerId of updated.followerIds) {
        try {
          const user = await client.users.fetch(followerId).catch(() => null);
          if (user) {
            await user.send({
              content: `🔔 **Mise à jour de la suggestion #${updated.numericId}**\n` +
                `Titre : **${updated.title}**\n` +
                `Nouveau statut : ${meta.emoji} **${meta.label}**\n` +
                (staffResponse ? `Réponse officielle : *"${staffResponse}"*\n` : ''),
            });
          }
        } catch {
          // Ignorer silencieusement si DM fermés
        }
      }
    }

    return updated;
  }
}
