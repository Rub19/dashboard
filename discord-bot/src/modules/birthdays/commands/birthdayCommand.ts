import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, TextChannel } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { birthdayStorage, daysUntil } from '../storage/birthdayStorage.js';

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function daysInMonth(month: number): number {
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 31;
}

export const birthdayCommand: Command = {
  name: 'birthday',
  description: 'Enregistre ton anniversaire',
  category: 'Utilitaires',
  slashData: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Anniversaires du serveur')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Enregistre ton anniversaire')
        .addIntegerOption((o) => o.setName('jour').setDescription('Jour (1-31)').setMinValue(1).setMaxValue(31).setRequired(true))
        .addIntegerOption((o) => o.setName('mois').setDescription('Mois (1-12)').setMinValue(1).setMaxValue(12).setRequired(true))
        .addIntegerOption((o) => o.setName('annee').setDescription('Année de naissance (optionnel, pour l\'âge)').setMinValue(1900).setMaxValue(new Date().getFullYear()))
    )
    .addSubcommand((sub) => sub.setName('remove').setDescription('Supprime ton anniversaire enregistré'))
    .addSubcommand((sub) => sub.setName('list').setDescription('Les anniversaires à venir (30 jours)'))
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('[Admin] Réglages du module anniversaires')
        .addChannelOption((o) =>
          o.setName('salon').setDescription('Salon d\'annonce').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addIntegerOption((o) => o.setName('heure').setDescription('Heure d\'annonce (0-23)').setMinValue(0).setMaxValue(23))
        .addRoleOption((o) => o.setName('role').setDescription('Rôle attribué le jour J (retiré le lendemain)'))
        .addStringOption((o) => o.setName('message').setDescription('Message. {user} {age} {date}').setMaxLength(500))
        .addBooleanOption((o) => o.setName('actif').setDescription('Activer / désactiver le module'))
    ),

  execute: async (ctx: CommandContext) => {
    const guildId = ctx.guild?.id;
    if (!guildId || !ctx.isSlash) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription('❌ Commande slash à utiliser sur un serveur.')],
        ephemeral: true,
      });
      return;
    }
    const sub = ctx.interaction!.options.getSubcommand();

    if (sub === 'set') {
      const day = ctx.interaction!.options.getInteger('jour', true);
      const month = ctx.interaction!.options.getInteger('mois', true);
      const year = ctx.interaction!.options.getInteger('annee');
      if (day > daysInMonth(month)) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(`❌ ${MONTHS_FR[month - 1]} n'a pas ${day} jours.`)],
          ephemeral: true,
        });
        return;
      }
      birthdayStorage.set({ guildId, userId: ctx.author.id, day, month, year: year ?? null });
      const days = daysUntil(day, month);
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setDescription(
              `🎂 Anniversaire enregistré : **${day} ${MONTHS_FR[month - 1]}**${year ? ` ${year}` : ''}.\n` +
                (days === 0 ? "C'est aujourd'hui ! 🎉" : `Dans **${days}** jour${days > 1 ? 's' : ''}.`)
            ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'remove') {
      const ok = birthdayStorage.delete(guildId, ctx.author.id);
      await ctx.reply({
        embeds: [ctx.createEmbed(ok ? 'success' : 'info').setDescription(ok ? '✅ Anniversaire supprimé.' : 'ℹ️ Tu n\'avais pas d\'anniversaire enregistré.')],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'list') {
      const ov = birthdayStorage.getOverview(guildId);
      const embed = ctx.createEmbed('default').setTitle('🎂 Anniversaires à venir');
      if (ov.today.length > 0) {
        embed.addFields({
          name: "🎉 Aujourd'hui",
          value: ov.today.map((t) => `<@${t.userId}>${t.age !== null ? ` (${t.age} ans)` : ''}`).join('\n'),
        });
      }
      if (ov.upcoming.length > 0) {
        embed.addFields({
          name: '📅 Prochains (30 j)',
          value: ov.upcoming
            .map((u) => `<@${u.userId}> — ${u.day} ${MONTHS_FR[u.month - 1]} *(dans ${u.inDays} j)*`)
            .join('\n'),
        });
      }
      if (ov.today.length === 0 && ov.upcoming.length === 0) {
        embed.setDescription('Aucun anniversaire dans les 30 prochains jours. `/birthday set` pour enregistrer le tien.');
      }
      await ctx.reply({ embeds: [embed] });
      return;
    }

    // config (admin)
    if (!ctx.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription('❌ Réservé aux gérants du serveur (`Gérer le serveur`).')],
        ephemeral: true,
      });
      return;
    }
    const patch: Record<string, unknown> = {};
    const channel = ctx.interaction!.options.getChannel('salon') as TextChannel | null;
    const hour = ctx.interaction!.options.getInteger('heure');
    const role = ctx.interaction!.options.getRole('role');
    const message = ctx.interaction!.options.getString('message');
    const active = ctx.interaction!.options.getBoolean('actif');
    if (channel) patch.announceChannelId = channel.id;
    if (hour !== null) patch.announceHour = hour;
    if (role) patch.birthdayRoleId = role.id;
    if (message) patch.message = message;
    if (active !== null) patch.enabled = active;

    if (Object.keys(patch).length === 0) {
      const c = birthdayStorage.getConfig(guildId);
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed(c.enabled ? 'default' : 'neutral')
            .setTitle('🎂 Configuration anniversaires')
            .addFields(
              { name: 'État', value: c.enabled ? '🟢 Actif' : '⚪ Inactif', inline: true },
              { name: 'Salon', value: c.announceChannelId ? `<#${c.announceChannelId}>` : '—', inline: true },
              { name: 'Heure', value: `${c.announceHour}h`, inline: true },
              { name: 'Rôle', value: c.birthdayRoleId ? `<@&${c.birthdayRoleId}>` : '—', inline: true },
              { name: 'Message', value: c.message }
            ),
        ],
        ephemeral: true,
      });
      return;
    }

    const updated = birthdayStorage.updateConfig(guildId, patch);
    await ctx.reply({
      embeds: [
        ctx
          .createEmbed('success')
          .setTitle('🎂 Configuration mise à jour')
          .setDescription(
            [
              `État : ${updated.enabled ? 'actif' : 'inactif'}`,
              `Salon : ${updated.announceChannelId ? `<#${updated.announceChannelId}>` : '—'}`,
              `Heure : ${updated.announceHour}h`,
              `Rôle : ${updated.birthdayRoleId ? `<@&${updated.birthdayRoleId}>` : '—'}`,
            ].join('\n')
          ),
      ],
      ephemeral: true,
    });
  },
};
