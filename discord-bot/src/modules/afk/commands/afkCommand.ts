import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { afkStorage } from '../storage/afkStorage.js';
import { afkService } from '../services/afkService.js';

export const afkCommand: Command = {
  name: 'afk',
  description: 'Marque-toi comme absent (AFK)',
  category: 'Utilitaires',
  slashData: new SlashCommandBuilder()
    .setName('afk')
    .setDescription("Marque-toi comme absent — le bot préviendra ceux qui te mentionnent")
    .addStringOption((opt) =>
      opt.setName('raison').setDescription('Pourquoi tu es absent (optionnel)').setMaxLength(500)
    ),

  execute: async (ctx: CommandContext) => {
    const guildId = ctx.guild?.id;
    if (!guildId) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription('❌ À utiliser sur un serveur.')],
        ephemeral: true,
      });
      return;
    }

    const config = afkStorage.getConfig(guildId);
    if (!config.enabled) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription('❌ Le module AFK est désactivé sur ce serveur.')],
        ephemeral: true,
      });
      return;
    }

    const reason =
      (ctx.isSlash ? ctx.interaction!.options.getString('raison') : ctx.args.join(' ')) || 'Absent';

    const already = afkStorage.get(guildId, ctx.author.id);
    await afkService.setAfk(ctx.message ?? null, guildId, ctx.author.id, reason);

    await ctx.reply({
      embeds: [
        ctx
          .createEmbed('success')
          .setDescription(
            already
              ? `💤 Ton statut AFK est mis à jour : *${reason}*`
              : `💤 Tu es maintenant AFK : *${reason}*\nJe préviendrai ceux qui te mentionnent, et je retirerai ton statut dès que tu reparleras.`
          ),
      ],
      ephemeral: true,
    });
  },
};
