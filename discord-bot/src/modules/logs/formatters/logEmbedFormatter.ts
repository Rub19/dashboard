import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { LogEntry } from '../types/logEvent.js';

export class LogEmbedFormatter {
  public static format(entry: LogEntry): {
    embed: EmbedBuilder;
    components?: ActionRowBuilder<ButtonBuilder>[];
  } {
    const embed = new EmbedBuilder()
      .setColor(entry.color as `#${string}`)
      .setTitle(entry.title)
      .setDescription(entry.description || null)
      .setTimestamp(new Date(entry.createdAt));

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

    embed.setFooter({
      text: `ID: ${entry.id} • ${entry.category.toUpperCase()}`,
    });

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
