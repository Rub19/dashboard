import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, GuildChannel } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { serverStatsStorage, MAX_STAT_CHANNELS } from '../storage/serverStatsStorage.js';
import { serverStatsService, computeStat, renderName } from '../services/serverStatsService.js';
import { StatType } from '../types/serverStats.js';

const TYPE_LABELS: Record<StatType, string> = {
  members: 'Membres', humans: 'Humains', bots: 'Bots', online: 'En ligne',
  boosts: 'Boosts', boostTier: 'Niveau de boost', roles: 'Rôles',
  channels: 'Salons', roleMembers: "Membres d'un rôle",
};

export const serverStatsCommand: Command = {
  name: 'serverstats',
  description: 'Salons compteurs (membres, boosts, en ligne…)',
  category: 'Utilitaires',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('serverstats')
    .setDescription('Salons compteurs de statistiques du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Transforme un salon en compteur')
        .addChannelOption((o) =>
          o.setName('salon').setDescription('Salon à utiliser (vocal verrouillé recommandé)').setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('type')
            .setDescription('Statistique à afficher')
            .setRequired(true)
            .addChoices(
              { name: 'Membres', value: 'members' },
              { name: 'Humains', value: 'humans' },
              { name: 'Bots', value: 'bots' },
              { name: 'En ligne', value: 'online' },
              { name: 'Boosts', value: 'boosts' },
              { name: 'Niveau de boost', value: 'boostTier' },
              { name: 'Rôles', value: 'roles' },
              { name: 'Salons', value: 'channels' },
              { name: "Membres d'un rôle", value: 'roleMembers' }
            )
        )
        .addStringOption((o) => o.setName('format').setDescription('Ex : « 👥 {count} membres » ({count} = valeur)').setMaxLength(80))
        .addRoleOption((o) => o.setName('role').setDescription('Rôle à compter (type « Membres d\'un rôle »)'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Retire un salon compteur')
        .addChannelOption((o) => o.setName('salon').setDescription('Salon compteur').setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('Liste les salons compteurs'))
    .addSubcommand((sub) => sub.setName('refresh').setDescription('Rafraîchit tous les compteurs maintenant'))
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('Réglages du module')
        .addBooleanOption((o) => o.setName('actif').setDescription('Activer / désactiver'))
        .addIntegerOption((o) =>
          o.setName('intervalle').setDescription('Minutes entre chaque rafraîchissement (10–360)').setMinValue(10).setMaxValue(360)
        )
    ),

  execute: async (ctx: CommandContext) => {
    const guild = ctx.guild;
    if (!guild || !ctx.isSlash) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription('❌ Commande slash à utiliser sur un serveur.')],
        ephemeral: true,
      });
      return;
    }
    const sub = ctx.interaction!.options.getSubcommand();

    if (sub === 'add') {
      const channel = ctx.interaction!.options.getChannel('salon', true);
      const type = ctx.interaction!.options.getString('type', true) as StatType;
      const format = ctx.interaction!.options.getString('format') ?? undefined;
      const role = ctx.interaction!.options.getRole('role');

      if (channel.type === ChannelType.GuildCategory) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('❌ Une catégorie ne peut pas être un compteur.')], ephemeral: true });
        return;
      }
      if (type === 'roleMembers' && !role) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('❌ Le type « Membres d\'un rôle » nécessite l\'option `role`.')], ephemeral: true });
        return;
      }
      if (!serverStatsStorage.get(guild.id, channel.id) && !serverStatsStorage.canAddMore(guild.id)) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(`❌ Limite de ${MAX_STAT_CHANNELS} salons compteurs atteinte.`)], ephemeral: true });
        return;
      }
      const me = guild.members.me;
      const gc = channel as GuildChannel;
      if (me && !gc.permissionsFor(me)?.has(PermissionFlagsBits.ManageChannels)) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('❌ Il me faut la permission **Gérer les salons** sur ce salon.')], ephemeral: true });
        return;
      }

      const stat = serverStatsStorage.upsert({
        guildId: guild.id,
        channelId: channel.id,
        type,
        template: format ?? '{count}',
        roleId: role?.id ?? null,
        lastValue: null,
      });
      await serverStatsService.forceRefresh(guild).catch(() => {});
      const preview = renderName(stat, computeStat(guild, type, role?.id ?? null));
      await ctx.reply({
        embeds: [
          ctx.createEmbed('success').setTitle('📊 Salon compteur ajouté').setDescription(`<#${channel.id}> → **${preview}**\nMise à jour toutes les ${serverStatsStorage.getConfig(guild.id).updateIntervalMinutes} min.`),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'remove') {
      const channel = ctx.interaction!.options.getChannel('salon', true);
      const ok = serverStatsStorage.delete(guild.id, channel.id);
      await ctx.reply({
        embeds: [ctx.createEmbed(ok ? 'success' : 'info').setDescription(ok ? `✅ <#${channel.id}> n'est plus un compteur.` : 'ℹ️ Ce salon n\'était pas un compteur.')],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'list') {
      const list = serverStatsStorage.getGuild(guild.id);
      if (list.length === 0) {
        await ctx.reply({ embeds: [ctx.createEmbed('neutral').setDescription('Aucun salon compteur. `/serverstats add` pour en créer.')], ephemeral: true });
        return;
      }
      const embed = ctx.createEmbed('default').setTitle(`📊 Salons compteurs (${list.length})`);
      for (const s of list) {
        embed.addFields({
          name: TYPE_LABELS[s.type] + (s.roleId ? ` (<@&${s.roleId}>)` : ''),
          value: `<#${s.channelId}> · format \`${s.template}\`${s.lastValue !== null ? ` · actuel : ${s.lastValue}` : ''}`,
        });
      }
      await ctx.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'refresh') {
      await ctx.deferReply({ ephemeral: true });
      await serverStatsService.forceRefresh(guild).catch(() => {});
      await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription('✅ Compteurs rafraîchis.')] });
      return;
    }

    // config
    const active = ctx.interaction!.options.getBoolean('actif');
    const interval = ctx.interaction!.options.getInteger('intervalle');
    const patch: Record<string, unknown> = {};
    if (active !== null) patch.enabled = active;
    if (interval !== null) patch.updateIntervalMinutes = interval;
    if (Object.keys(patch).length === 0) {
      const c = serverStatsStorage.getConfig(guild.id);
      await ctx.reply({
        embeds: [ctx.createEmbed(c.enabled ? 'default' : 'neutral').setDescription(`État : ${c.enabled ? '🟢 actif' : '⚪ inactif'}\nIntervalle : ${c.updateIntervalMinutes} min`)],
        ephemeral: true,
      });
      return;
    }
    const updated = serverStatsStorage.updateConfig(guild.id, patch);
    await ctx.reply({
      embeds: [ctx.createEmbed('success').setDescription(`✅ État : ${updated.enabled ? 'actif' : 'inactif'} · intervalle : ${updated.updateIntervalMinutes} min`)],
      ephemeral: true,
    });
  },
};
