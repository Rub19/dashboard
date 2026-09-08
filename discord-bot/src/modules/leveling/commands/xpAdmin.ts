import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { xpWriteBuffer } from '../storage/xpWriteBuffer.js';
import { LevelCalculator } from '../services/levelCalculator.js';
import { logService } from '../../logs/services/logService.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export const xpCommand: Command = {
  name: 'xp',
  description: 'Gère l’XP et les niveaux d’un membre (Admin).',
  category: 'Administration',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Gère l’XP et les niveaux d’un membre (Admin).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Ajoute de l’XP à un membre')
        .addUserOption((opt) =>
          opt.setName('membre').setDescription('Le membre cible').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('montant').setDescription('Montant d’XP à ajouter').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Retire de l’XP à un membre')
        .addUserOption((opt) =>
          opt.setName('membre').setDescription('Le membre cible').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('montant').setDescription('Montant d’XP à retirer').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Définit l’XP total d’un membre')
        .addUserOption((opt) =>
          opt.setName('membre').setDescription('Le membre cible').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('montant').setDescription('Nouveau total d’XP').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Réinitialise l’XP et le niveau d’un membre')
        .addUserOption((opt) =>
          opt.setName('membre').setDescription('Le membre cible').setRequired(true)
        )
    ),

  async execute(ctx: CommandContext): Promise<void> {
    const t = getTranslation(ctx.guildConfig.language);

    if (!ctx.isSlash) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.giveaway_slash_only)], ephemeral: true });
      return;
    }

    const guild = ctx.guild;
    if (!guild) return;

    const interaction = ctx.interaction as ChatInputCommandInteraction;
    const sub = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('membre', true);
    const amount = interaction.options.getInteger('montant') || 0;

    const user = xpWriteBuffer.getUser(guild.id, targetUser.id);
    const oldLevel = user.level;

    if (sub === 'add') {
      user.totalXp += amount;
      user.level = LevelCalculator.calculateLevel(user.totalXp);
      xpWriteBuffer.updateUser(user);
      xpWriteBuffer.flushNow();

      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.leveling_xp_add_success, { amount: amount.toLocaleString(), userId: targetUser.id, total: user.totalXp.toLocaleString(), level: user.level }))],
      });
    } else if (sub === 'remove') {
      user.totalXp = Math.max(0, user.totalXp - amount);
      user.level = LevelCalculator.calculateLevel(user.totalXp);
      xpWriteBuffer.updateUser(user);
      xpWriteBuffer.flushNow();

      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.leveling_xp_remove_success, { amount: amount.toLocaleString(), userId: targetUser.id, total: user.totalXp.toLocaleString(), level: user.level }))],
      });
    } else if (sub === 'set') {
      user.totalXp = Math.max(0, amount);
      user.level = LevelCalculator.calculateLevel(user.totalXp);
      xpWriteBuffer.updateUser(user);
      xpWriteBuffer.flushNow();

      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.leveling_xp_set_success, { userId: targetUser.id, total: user.totalXp.toLocaleString(), level: user.level }))],
      });
    } else if (sub === 'reset') {
      xpWriteBuffer.resetUser(guild.id, targetUser.id);
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.leveling_xp_reset_success, { userId: targetUser.id }))],
      });
    }

    await logService.log(guild, {
      category: 'moderation',
      type: 'MOD_SANCTION',
      title: '⭐ Modification Administrative d’XP',
      description: `L'XP de **${targetUser.tag}** a été modifié par **${ctx.author.tag}** (Action: \`${sub}\`).`,
      color: '#6366F1',
      moderatorId: ctx.author.id,
      moderatorTag: ctx.author.tag,
      userId: targetUser.id,
      userTag: targetUser.tag,
      fields: [
        { name: 'Membre', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
        { name: 'Action', value: sub, inline: true },
        { name: 'Niveau', value: `${user.level} (Ancien: ${oldLevel})`, inline: true },
      ],
    });
  },
};
