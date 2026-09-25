import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { levelingStorage } from '../storage/levelingStorage.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';
import { container, separator, text, footer, progressBar, toneToColor } from '../../../utils/components.js';

export const leaderboardCommand: Command = {
  name: 'leaderboard',
  description: 'Affiche le classement des membres les plus actifs du serveur.',
  category: 'Leveling',
  slashData: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Affiche le classement des membres les plus actifs du serveur.'),

  async execute(ctx: CommandContext): Promise<void> {
    const t = getTranslation(ctx.guildConfig.language);
    const guild = ctx.guild;
    if (!guild) return;

    const config = levelingStorage.getConfig(guild.id);
    if (!config.enabled) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(t.leveling_module_disabled)],
        ephemeral: true,
      });
      return;
    }

    if (!config.leaderboardOnDiscord) {
      await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription('Le classement est désactivé sur Discord sur ce serveur.')], ephemeral: true });
      return;
    }

    const topUsers = levelingStorage.getLeaderboard(guild.id, undefined, 10);

    if (topUsers.length === 0) {
      await ctx.reply({
        embeds: [ctx.createEmbed('info').setDescription(t.leveling_leaderboard_empty)],
        ephemeral: true,
      });
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = topUsers.map((user, idx) => {
      const medal = medals[idx] || `**#${idx + 1}**`;
      const bar = progressBar(user.progressPercentage, 8);
      return `${medal} <@${user.userId}> — **${t.leveling_field_level} ${user.level}** · ${user.totalXp.toLocaleString('fr-FR')} XP\n\`${bar}\` ${user.progressPercentage}%`;
    });

    // Podium + barres de progression par membre, en Components V2 — même
    // accent ambré que le module Niveaux.
    const card = container(parseInt(config.accentColor.slice(1), 16), [
      text(`## 🏆 ${formatString(t.leveling_leaderboard_title, { guildName: guild.name })}`),
      separator(),
      text(lines.slice(0, 3).join('\n\n')),
      ...(lines.length > 3 ? [separator(false), text(lines.slice(3).join('\n\n'))] : []),
      separator(false),
      footer(t.leveling_leaderboard_footer),
    ]);

    await ctx.reply({ components: [card], componentsV2: true });
  },
};
