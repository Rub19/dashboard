import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { countingStorage } from '../storage/countingStorage.js';
import { emitConfigUpdated } from '../../../services/syncConfigEmitter.js';
import { trg } from '../../../utils/tr.js';

/**
 * /counting — status (tout le monde), setup et reset (réservés à « Gérer le serveur »).
 * L'activation générale du module passe par /module counting ou le dashboard, comme les autres modules.
 */
export const countingCommand: Command = {
  name: 'counting',
  aliases: ['comptage'],
  description: 'Jeu de comptage : état du compteur, salon et remise à zéro',
  category: 'Communauté',
  slashData: new SlashCommandBuilder()
    .setName('counting')
    .setDescription('Jeu de comptage : état du compteur, salon et remise à zéro')
    .addSubcommand((s) => s.setName('status').setDescription('Affiche le nombre actuel, le record et le classement'))
    .addSubcommand((s) =>
      s
        .setName('setup')
        .setDescription('Choisit le salon de comptage et active le jeu (Gérer le serveur)')
        .addChannelOption((o) => o.setName('salon').setDescription('Salon où l’on compte').addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand((s) => s.setName('reset').setDescription('Remet le compteur à zéro (Gérer le serveur)')),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(trg(ctx, '❌ À utiliser sur un serveur.'))], ephemeral: true });
      return;
    }
    const guildId = ctx.guild.id;
    const sub = ctx.isSlash ? ctx.interaction!.options.getSubcommand(false) ?? 'status' : (ctx.args[0] ?? 'status').toLowerCase();
    const isStaff = ctx.member?.permissions.has(PermissionFlagsBits.ManageGuild) ?? false;

    if ((sub === 'setup' || sub === 'reset') && !isStaff) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(trg(guildId, '⛔ Réservé aux membres qui ont la permission **Gérer le serveur**.'))], ephemeral: true });
      return;
    }

    if (sub === 'setup') {
      const channel = ctx.isSlash ? ctx.interaction!.options.getChannel('salon', true) : ctx.message?.mentions.channels.first();
      if (!channel || !('id' in channel)) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(trg(guildId, '❌ Indique le salon : `/counting setup salon:#comptage`.'))], ephemeral: true });
        return;
      }
      const updated = countingStorage.updateConfig(guildId, { channelId: channel.id, enabled: true, count: 0, lastUserId: null });
      emitConfigUpdated('counting', guildId, updated, 'DISCORD_COMMAND', ctx.author.id);
      await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(trg(guildId, '🔢 Le jeu de comptage est actif dans <#{id}>. Premier nombre : **1**.', { id: channel.id }))] });
      return;
    }

    if (sub === 'reset') {
      const updated = countingStorage.resetCount(guildId);
      emitConfigUpdated('counting', guildId, updated, 'DISCORD_COMMAND', ctx.author.id);
      await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(trg(guildId, '🔄 Compteur remis à zéro. Prochain nombre : **1**.'))] });
      return;
    }

    const { config, leaderboard } = countingStorage.getOverview(guildId);
    const board = leaderboard
      .slice(0, 5)
      .map((e, i) => `**${i + 1}.** <@${e.userId}> — ${e.correct} juste${e.correct > 1 ? 's' : ''}${e.mistakes ? `, ${e.mistakes} erreur${e.mistakes > 1 ? 's' : ''}` : ''}`);
    const embed = ctx
      .createEmbed('info')
      .setTitle(trg(guildId, '🔢 Comptage'))
      .setDescription(
        config.enabled && config.channelId
          ? trg(guildId, 'Salon : <#{channelId}>\nNombre actuel : **{count}** — prochain : **{v2}**', { channelId: config.channelId, count: config.count, v2: config.count + 1 })
          : trg(guildId, 'Le jeu n’est pas actif. Un membre avec « Gérer le serveur » peut le lancer : `/counting setup`.')
      )
      .addFields(
        { name: trg(guildId, '🏆 Record'), value: String(config.highScore), inline: true },
        { name: trg(guildId, '✅ Justes'), value: String(config.totalCorrect), inline: true },
        { name: trg(guildId, '❌ Erreurs'), value: String(config.totalMistakes), inline: true },
        { name: trg(guildId, 'Classement'), value: board.join('\n') || 'Personne n’a encore compté.' }
      );
    await ctx.reply({ embeds: [embed] });
  },
};
