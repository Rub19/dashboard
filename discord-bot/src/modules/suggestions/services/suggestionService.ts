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
import { guildConfigService } from '../../../services/guildConfigService.js';
import { formatString, getTranslation, SupportedLanguage } from '../../../utils/i18n.js';

export class SuggestionService {
  /**
   * Retourne la couleur et le libellé associé au statut
   */
  public static getStatusMeta(
    status: SuggestionStatus,
    language: SupportedLanguage = 'fr'
  ): {
    label: string;
    emoji: string;
    color: `#${string}`;
  } {
    const t = getTranslation(language);
    switch (status) {
      case 'pending':
        return { label: t.suggest_status_pending, emoji: '🟡', color: '#FBBF24' };
      case 'under_review':
        return { label: t.suggest_status_under_review, emoji: '🔵', color: '#3B82F6' };
      case 'planned':
        return { label: t.suggest_status_planned, emoji: '🟣', color: '#8B5CF6' };
      case 'accepted':
        return { label: t.suggest_status_accepted, emoji: '🟢', color: '#10B981' };
      case 'in_progress':
        return { label: t.suggest_status_in_progress, emoji: '🚧', color: '#F59E0B' };
      case 'completed':
        return { label: t.suggest_status_completed, emoji: '✅', color: '#059669' };
      case 'rejected':
        return { label: t.suggest_status_rejected, emoji: '🔴', color: '#EF4444' };
      case 'duplicate':
        return { label: t.suggest_status_duplicate, emoji: '⚫', color: '#6B7280' };
      case 'on_hold':
        return { label: t.suggest_status_on_hold, emoji: '🟠', color: '#EA580C' };
    }
  }

  /**
   * Construit l'embed Discord représentatif de la suggestion
   */
  public static buildEmbed(suggestion: Suggestion, language: SupportedLanguage = 'fr'): EmbedBuilder {
    const t = getTranslation(language);
    const meta = this.getStatusMeta(suggestion.status, language);

    const embed = new EmbedBuilder()
      .setColor(meta.color)
      .setAuthor({
        name: formatString(t.suggest_embed_author, { numericId: suggestion.numericId, authorTag: suggestion.authorTag }),
        iconURL: suggestion.authorAvatarUrl || undefined,
      })
      .setTitle(suggestion.title)
      .setDescription(suggestion.description)
      .addFields([
        {
          name: t.suggest_field_status,
          value: `${meta.emoji} **${meta.label}**`,
          inline: true,
        },
        {
          name: t.suggest_field_category,
          value: `📁 ${suggestion.category}`,
          inline: true,
        },
        {
          name: t.suggest_field_score,
          value: formatString(t.suggest_score_value, {
            up: suggestion.upvotesCount,
            down: suggestion.downvotesCount,
            score: suggestion.score >= 0 ? `+${suggestion.score}` : suggestion.score,
          }),
          inline: true,
        },
      ]);

    if (suggestion.staffResponse) {
      embed.addFields([
        {
          name: formatString(t.suggest_staff_response_field, { responderTag: suggestion.staffResponderTag || t.suggest_default_moderator }),
          value: suggestion.staffResponse,
          inline: false,
        },
      ]);
    }

    if (suggestion.duplicateOfId) {
      embed.addFields([
        {
          name: `🔗 ${t.suggest_status_duplicate}`,
          value: formatString(t.suggest_duplicate_field_value, { dupId: suggestion.duplicateOfId }),
          inline: false,
        },
      ]);
    }

    embed
      .setFooter({ text: formatString(t.suggest_embed_footer, { id: suggestion.id, count: suggestion.comments.length }) })
      .setTimestamp(new Date(suggestion.createdAt));

    return embed;
  }

  /**
   * Construit la rangée de boutons Discord
   */
  public static buildActionRow(suggestion: Suggestion, language: SupportedLanguage = 'fr'): ActionRowBuilder<ButtonBuilder> {
    const t = getTranslation(language);
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
        .setLabel(formatString(t.suggest_btn_comment, { count: suggestion.comments.length }))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`sugg_follow:${suggestion.id}`)
        .setLabel(formatString(t.suggest_btn_follow, { count: suggestion.followerIds.length }))
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
    const language = guildConfigService.getConfig(data.guildId).language;
    const t = getTranslation(language);

    const config = suggestionStorage.getConfig(data.guildId);
    if (!config.channelId) {
      throw new Error(t.suggest_no_channel_error);
    }

    const suggestion = suggestionStorage.create({
      guildId: data.guildId,
      channelId: config.channelId,
      authorId: data.authorId,
      authorTag: data.authorTag,
      authorAvatarUrl: data.authorAvatarUrl || null,
      title: data.title,
      description: data.description,
      category: data.category || t.suggest_default_category,
      tags: data.tags || [],
    });

    try {
      const channel = client.channels.cache.get(config.channelId) as TextChannel | undefined;
      if (channel && channel.type === ChannelType.GuildText) {
        const embed = this.buildEmbed(suggestion, language);
        const row = this.buildActionRow(suggestion, language);
        const message = await channel.send({ embeds: [embed], components: [row] });

        suggestion.messageId = message.id;

        // Création automatique de thread si activé
        if (config.autoThread) {
          try {
            const thread = await message.startThread({
              name: formatString(t.suggest_thread_name, { numericId: suggestion.numericId, title: suggestion.title.substring(0, 50) }),
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
      const language = guildConfigService.getConfig(suggestion.guildId).language;
      const channel = client.channels.cache.get(suggestion.channelId) as TextChannel | undefined;
      if (channel) {
        const message = await channel.messages.fetch(suggestion.messageId).catch(() => null);
        if (message) {
          const embed = this.buildEmbed(suggestion, language);
          const row = this.buildActionRow(suggestion, language);
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

    const language = guildConfigService.getConfig(suggestion.guildId).language;
    const t = getTranslation(language);
    const meta = this.getStatusMeta(newStatus, language);
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
              content: formatString(t.suggest_dm_update, {
                numericId: updated.numericId,
                title: updated.title,
                emoji: meta.emoji,
                label: meta.label,
                responseLine: staffResponse ? formatString(t.suggest_dm_response_line, { response: staffResponse }) : '',
              }),
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
