import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { reminderStorage } from '../storage/reminderStorage.js';
import { parseDuration } from '../services/reminderService.js';

const MAX_PER_USER = 25;

export const reminderCommand: Command = {
  name: 'reminder',
  description: 'Programme un rappel personnel',
  category: 'Utilitaires',
  slashData: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('« Rappelle-moi » : programme un rappel personnel')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Ajoute un rappel')
        .addStringOption((opt) =>
          opt
            .setName('dans')
            .setDescription('Délai : 10m, 2h, 1d, 3j, 1w (combinable : 1h30m)')
            .setRequired(true)
            .setMaxLength(40)
        )
        .addStringOption((opt) =>
          opt.setName('message').setDescription('De quoi te rappeler ?').setRequired(true).setMaxLength(1500)
        )
        .addStringOption((opt) =>
          opt
            .setName('recurrence')
            .setDescription('Répéter le rappel')
            .addChoices(
              { name: 'Une seule fois', value: 'none' },
              { name: 'Tous les jours', value: 'daily' },
              { name: 'Toutes les semaines', value: 'weekly' }
            )
        )
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('Liste tes rappels en attente'))
    .addSubcommand((sub) =>
      sub
        .setName('cancel')
        .setDescription('Annule un rappel')
        .addStringOption((opt) => opt.setName('id').setDescription('ID du rappel (voir /reminder list)').setRequired(true))
    ),

  execute: async (ctx: CommandContext) => {
    const guildId = ctx.guild?.id;
    const channelId = ctx.channelId;
    const userId = ctx.author.id;
    if (!guildId || !channelId) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription('❌ À utiliser sur un serveur.')],
        ephemeral: true,
      });
      return;
    }
    if (!ctx.isSlash) {
      await ctx.reply({
        embeds: [ctx.createEmbed('info').setDescription('ℹ️ Utilise la commande slash `/reminder`.')],
        ephemeral: true,
      });
      return;
    }

    const sub = ctx.interaction!.options.getSubcommand();

    if (sub === 'add') {
      const durationRaw = ctx.interaction!.options.getString('dans', true);
      const message = ctx.interaction!.options.getString('message', true).trim();
      const recurrence = (ctx.interaction!.options.getString('recurrence') ?? 'none') as 'none' | 'daily' | 'weekly';

      const ms = parseDuration(durationRaw);
      if (ms === null) {
        await ctx.reply({
          embeds: [
            ctx
              .createEmbed('error')
              .setDescription('❌ Délai invalide. Exemples : `10m`, `2h`, `1d`, `1w`, `1h30m`. (max 1 an)'),
          ],
          ephemeral: true,
        });
        return;
      }
      if (ms < 30_000) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription('❌ Le délai minimum est de 30 secondes.')],
          ephemeral: true,
        });
        return;
      }

      const existing = reminderStorage.listForUser(guildId, userId);
      if (existing.length >= MAX_PER_USER) {
        await ctx.reply({
          embeds: [
            ctx.createEmbed('error').setDescription(`❌ Tu as déjà ${MAX_PER_USER} rappels en attente. Annules-en un d'abord.`),
          ],
          ephemeral: true,
        });
        return;
      }

      const remindAt = new Date(Date.now() + ms);
      const reminder = reminderStorage.create({
        guildId,
        channelId,
        userId,
        message,
        remindAt: remindAt.toISOString(),
        recurrence,
      });

      const unix = Math.floor(remindAt.getTime() / 1000);
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setTitle('⏰ Rappel programmé')
            .setDescription(`Je te rappellerai **<t:${unix}:R>** (<t:${unix}:F>).`)
            .addFields(
              { name: 'Message', value: message.slice(0, 1000) },
              { name: 'Récurrence', value: recurrence === 'none' ? 'Une fois' : recurrence === 'daily' ? 'Quotidien' : 'Hebdomadaire', inline: true },
              { name: 'ID', value: `\`${reminder.id}\``, inline: true }
            ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'list') {
      const list = reminderStorage.listForUser(guildId, userId);
      if (list.length === 0) {
        await ctx.reply({
          embeds: [ctx.createEmbed('neutral').setDescription('Aucun rappel en attente. `/reminder add` pour en créer un.')],
          ephemeral: true,
        });
        return;
      }
      const embed = ctx.createEmbed('default').setTitle(`⏰ Tes rappels (${list.length})`);
      for (const r of list.slice(0, 15)) {
        const unix = Math.floor(new Date(r.remindAt).getTime() / 1000);
        embed.addFields({
          name: `\`${r.id}\`${r.recurrence !== 'none' ? ` · 🔁 ${r.recurrence === 'daily' ? 'quotidien' : 'hebdo'}` : ''}`,
          value: `<t:${unix}:R> — ${r.message.slice(0, 120)}${r.message.length > 120 ? '…' : ''}`,
        });
      }
      await ctx.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // cancel
    const id = ctx.interaction!.options.getString('id', true).trim();
    const target = reminderStorage.get(id);
    if (!target || target.userId !== userId || target.guildId !== guildId) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription("❌ Rappel introuvable (ou il ne t'appartient pas).")],
        ephemeral: true,
      });
      return;
    }
    reminderStorage.delete(id);
    await ctx.reply({
      embeds: [ctx.createEmbed('success').setDescription(`✅ Rappel \`${id}\` annulé.`)],
      ephemeral: true,
    });
  },
};
