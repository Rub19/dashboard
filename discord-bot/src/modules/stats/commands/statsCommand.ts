import { AttachmentBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { statsStorage } from '../storage/statsStorage.js';
import { statsQueries } from '../services/statsQueries.js';
import { renderBarChart, renderMemberCard, formatCompact } from '../images/statsImages.js';
import { emitConfigUpdated } from '../../../services/syncConfigEmitter.js';
import { RankedEntry } from '../types/stats.js';

const PERIODS = [7, 30, 60, 90, 365];
const MEDALS = ['🥇', '🥈', '🥉'];

const shortDay = (iso: string): string => {
  const [, m, d] = iso.split('-');
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
  return `${Number(d)} ${months[Number(m) - 1]}`;
};

const frDate = (d: Date | null | undefined): string | null =>
  d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;

function lines(entries: RankedEntry[], fmt: (e: RankedEntry) => string, unit: (v: number) => string): string {
  if (entries.length === 0) return 'Aucune donnée pour le moment.';
  return entries
    .slice(0, 5)
    .map((e, i) => `${MEDALS[i] ?? `**${i + 1}.**`} ${fmt(e)} — **${unit(e.value)}**`)
    .join('\n');
}

const msgs = (v: number) => `${formatCompact(v)} msg`;
const hrs = (v: number) => `${formatCompact(v)} h`;

/**
 * /stats — statistiques d'activité façon Statbot : server (graphique), member (fiche image), top (classements),
 * channel (graphique d'un salon). Les jours sont en UTC. Le module s'active avec /module stats ou depuis le dashboard.
 */
export const statsCommand: Command = {
  name: 'stats',
  aliases: ['activite', 'statistiques'],
  description: 'Statistiques d’activité : messages et vocal par jour, membres, salons, classements',
  category: 'Communauté',
  slashData: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Statistiques d’activité du serveur : messages, vocal, membres, classements')
    .addSubcommand((s) =>
      s
        .setName('server')
        .setDescription('Graphique et totaux du serveur')
        .addStringOption((o) =>
          o.setName('type').setDescription('Ce qu’on trace').addChoices({ name: 'Messages', value: 'messages' }, { name: 'Vocal (heures)', value: 'voice' }, { name: 'Membres', value: 'members' })
        )
        .addIntegerOption((o) => o.setName('jours').setDescription('Période en jours (défaut : 30)').addChoices(...PERIODS.map((p) => ({ name: `${p} jours`, value: p }))))
    )
    .addSubcommand((s) =>
      s
        .setName('member')
        .setDescription('Fiche d’un membre : rangs, messages, vocal, salons préférés')
        .addUserOption((o) => o.setName('membre').setDescription('Membre (toi par défaut)'))
    )
    .addSubcommand((s) =>
      s
        .setName('top')
        .setDescription('Classement des membres')
        .addStringOption((o) => o.setName('type').setDescription('Classement').addChoices({ name: 'Messages', value: 'messages' }, { name: 'Vocal', value: 'voice' }))
        .addIntegerOption((o) => o.setName('jours').setDescription('Période en jours (défaut : 30)').addChoices(...PERIODS.map((p) => ({ name: `${p} jours`, value: p }))))
    )
    .addSubcommand((s) =>
      s
        .setName('channel')
        .setDescription('Activité d’un salon')
        .addChannelOption((o) => o.setName('salon').setDescription('Salon (celui-ci par défaut)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement, ChannelType.GuildStageVoice))
        .addIntegerOption((o) => o.setName('jours').setDescription('Période en jours (défaut : 30)').addChoices(...PERIODS.map((p) => ({ name: `${p} jours`, value: p }))))
    )
    .addSubcommand((s) => s.setName('reset').setDescription('Efface toutes les statistiques de ce serveur (Gérer le serveur)')),

  async execute(ctx: CommandContext): Promise<void> {
    const guild = ctx.guild;
    if (!guild || !ctx.isSlash || !ctx.interaction) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('❌ Utilise la commande slash **/stats** sur un serveur.')], ephemeral: true });
      return;
    }
    const i = ctx.interaction;
    const sub = i.options.getSubcommand();
    const guildId = guild.id;
    const config = statsStorage.getConfig(guildId);

    if (sub === 'reset') {
      if (!ctx.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('⛔ Réservé aux membres qui ont la permission **Gérer le serveur**.')], ephemeral: true });
        return;
      }
      statsStorage.clearGuild(guildId);
      emitConfigUpdated('stats', guildId, statsStorage.getConfig(guildId), 'DISCORD_COMMAND', ctx.author.id);
      await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription('🧹 Toutes les statistiques de ce serveur ont été effacées.')], ephemeral: true });
      return;
    }

    if (!config.enabled) {
      await ctx.reply({
        embeds: [ctx.createEmbed('warning').setDescription('📊 Le module **Statistiques** n’est pas actif sur ce serveur. Un membre avec « Gérer le serveur » peut l’activer avec `/module nom:stats activer:True` ou depuis le dashboard : les données se collectent à partir de l’activation.')],
        ephemeral: true,
      });
      return;
    }

    await i.deferReply();
    const days = i.options.getInteger('jours') ?? 30;
    const since = config.startedAt ? `Données depuis le ${frDate(new Date(config.startedAt))}` : undefined;

    if (sub === 'server') {
      const type = i.options.getString('type') ?? 'messages';
      const summary = statsQueries.summary(guildId, days);
      const points = summary.series.map((p) => ({
        label: shortDay(p.day),
        value: type === 'voice' ? p.voiceHours : type === 'members' ? (p.members ?? 0) : p.messages,
      }));
      const title = type === 'voice' ? 'Activité vocale du serveur' : type === 'members' ? 'Membres du serveur' : 'Messages du serveur';
      const png = await renderBarChart({
        title,
        subtitle: `${guild.name} — ${days} derniers jours (UTC)`,
        data: points,
        kind: type === 'members' ? 'line' : 'bars',
        color: type === 'voice' ? '#f0559a' : type === 'members' ? '#3fd28a' : '#5aa9f6',
        unit: type === 'voice' ? 'h' : type === 'members' ? '' : 'messages',
      });
      const embed = ctx
        .createEmbed('info')
        .setTitle(`📊 ${guild.name}`)
        .setImage('attachment://stats.png')
        .addFields(
          { name: 'Messages', value: formatCompact(summary.totals.messages), inline: true },
          { name: 'Vocal', value: `${formatCompact(summary.totals.voiceHours)} h`, inline: true },
          { name: 'Membres actifs', value: formatCompact(summary.totals.activeUsers), inline: true },
          { name: 'Arrivées / départs', value: `+${summary.totals.joins} / −${summary.totals.leaves}`, inline: true },
          { name: 'Top membres', value: lines(summary.topMembersMessages, (e) => `<@${e.id}>`, msgs), inline: true },
          { name: 'Top salons', value: lines(summary.topChannelsMessages, (e) => `<#${e.id}>`, msgs), inline: true }
        );
      if (since) embed.setFooter({ text: since });
      await i.editReply({ embeds: [embed], files: [new AttachmentBuilder(png, { name: 'stats.png' })] });
      return;
    }

    if (sub === 'member') {
      const user = i.options.getUser('membre') ?? i.user;
      const member = await guild.members.fetch(user.id).catch(() => null);
      const stats = statsQueries.member(guildId, user.id);
      const nameOf = (id: string) => guild.channels.cache.get(id)?.name ?? 'salon supprimé';
      const topChannels = [
        ...stats.topChannels.slice(0, 2).map((e) => ({ label: `# ${nameOf(e.id)}`, value: `${formatCompact(e.value)} messages` })),
        ...stats.topVoiceChannels.slice(0, 2).map((e) => ({ label: `Vocal · ${nameOf(e.id)}`, value: `${formatCompact(e.value)} h` })),
      ];
      const png = await renderMemberCard({
        name: member?.displayName ?? user.username,
        avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
        createdOn: frDate(user.createdAt),
        joinedOn: frDate(member?.joinedAt),
        rankMessages: stats.rank.messages,
        rankVoice: stats.rank.voice,
        windows: stats.windows,
        topChannels,
        series: stats.series,
      });
      await i.editReply({ files: [new AttachmentBuilder(png, { name: `stats-${user.id}.png` })], content: since ?? '' });
      return;
    }

    if (sub === 'top') {
      const type = i.options.getString('type') ?? 'messages';
      const summary = statsQueries.summary(guildId, days, 10);
      const entries = type === 'voice' ? summary.topMembersVoice : summary.topMembersMessages;
      const body = entries.length
        ? entries.map((e, idx) => `${MEDALS[idx] ?? `**${idx + 1}.**`} <@${e.id}> — **${type === 'voice' ? hrs(e.value) : msgs(e.value)}**`).join('\n')
        : 'Aucune donnée sur cette période.';
      const embed = ctx.createEmbed('info').setTitle(`🏆 Top ${type === 'voice' ? 'vocal' : 'messages'} — ${days} jours`).setDescription(body);
      if (since) embed.setFooter({ text: since });
      await i.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
      return;
    }

    if (sub === 'channel') {
      const channel = i.options.getChannel('salon') ?? i.channel;
      if (!channel || !('id' in channel)) {
        await i.editReply({ embeds: [ctx.createEmbed('error').setDescription('❌ Salon introuvable.')] });
        return;
      }
      const stats = statsQueries.channel(guildId, channel.id, days);
      const isVoice = 'type' in channel && (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice);
      const png = await renderBarChart({
        title: `Activité de #${'name' in channel && channel.name ? channel.name : channel.id}`,
        subtitle: `${guild.name} — ${days} derniers jours (UTC)`,
        data: stats.series.map((p) => ({ label: shortDay(p.day), value: isVoice ? p.voiceHours : p.messages })),
        color: isVoice ? '#f0559a' : '#5aa9f6',
        unit: isVoice ? 'h' : 'messages',
      });
      const top = isVoice ? stats.topMembersVoice : stats.topMembersMessages;
      const embed = ctx
        .createEmbed('info')
        .setTitle(`📈 #${'name' in channel && channel.name ? channel.name : channel.id}`)
        .setImage('attachment://channel.png')
        .setDescription(isVoice ? `**${hrs(stats.totals.voiceHours)}** de vocal sur ${days} jours` : `**${formatCompact(stats.totals.messages)}** messages sur ${days} jours`)
        .addFields({ name: 'Membres les plus actifs', value: lines(top, (e) => `<@${e.id}>`, isVoice ? hrs : msgs) });
      if (since) embed.setFooter({ text: since });
      await i.editReply({ embeds: [embed], files: [new AttachmentBuilder(png, { name: 'channel.png' })], allowedMentions: { parse: [] } });
    }
  },
};

