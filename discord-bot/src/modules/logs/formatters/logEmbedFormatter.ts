import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { LogEntry } from '../types/logEvent.js';
import { baseEmbed } from '../../../utils/embeds.js';

export class LogEmbedFormatter {
  public static format(entry: LogEntry): {
    embed: EmbedBuilder;
    components?: ActionRowBuilder<ButtonBuilder>[];
  } {
    const embed = baseEmbed('default', {
      color: entry.color,
      footerText: `ID: ${entry.id} • ${entry.category.toUpperCase()}`,
      timestamp: new Date(entry.createdAt),
    })
      .setTitle(entry.title)
      .setDescription(entry.description || null);

    // Ajout des champs
    if (entry.fields && entry.fields.length > 0) {
      embed.addFields(
        entry.fields.map((f) => ({
          name: f.name,
          value: f.value || '—',
          inline: f.inline ?? true,
        }))
      );
    }

    const components: ActionRowBuilder<ButtonBuilder>[] = [];

    // Bouton pour sauter au message si URL fournie
    if (entry.messageUrl) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Accéder au message')
          .setStyle(ButtonStyle.Link)
          .setURL(entry.messageUrl)
      );
      components.push(row);
    }

    return {
      embed,
      components: components.length > 0 ? components : undefined,
    };
  }
}
