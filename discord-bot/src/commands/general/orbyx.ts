import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { ORBYX_URL } from '../../services/orbyxFeedService.js';
import { Command, CommandContext } from '../../types/command.js';
import { baseEmbed } from '../../utils/embeds.js';
import { trg } from '../../utils/tr.js';

const RARITY_EMOJI: Record<string, string> = { mythique: '🌈', legendaire: '🟧', epique: '🟪', rare: '🟦', commune: '⬜' };

interface OrbyxSummary {
  user: { id: string; name: string; opened: number };
  unique: number;
  total: number;
  poolSize: number;
  byRarity: Record<string, number>;
  best: { n: string; s: string; i: string; r: string }[];
}

export const orbyxCommand: Command = {
  name: 'orbyx',
  description: 'Affiche la collection Orbyx d’un membre',
  category: 'Général',
  aliases: ['packs', 'collection'],
  slashData: new SlashCommandBuilder()
    .setName('orbyx')
    .setDescription('Affiche la collection Orbyx d’un membre')
    .addUserOption((o) => o.setName('membre').setDescription('Membre à afficher').setRequired(false)),
  execute: async (ctx: CommandContext) => {
    const target = ctx.interaction?.options.getUser('membre') ?? ctx.message?.mentions.users.first() ?? ctx.author;
    await ctx.deferReply();
    const res = await fetch(`${ORBYX_URL}/api/summary/${target.id}`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(res?.ok ? `${ORBYX_URL}/#joueur/${target.id}` : ORBYX_URL).setLabel(trg(ctx, 'Ouvrir Orbyx'))
    );
    if (!res?.ok) {
      const embed = baseEmbed('info', { color: ctx.guildConfig.primaryColor || null })
        .setTitle('Orbyx')
        .setDescription(
          res?.status === 404
            ? trg(ctx, '{name} n’a pas encore de collection Orbyx. Connecte-toi avec Discord pour ouvrir tes premiers boosters.', { name: target.username })
            : trg(ctx, 'Orbyx ne répond pas pour le moment, réessaie dans un instant.')
        );
      await ctx.editReply({ embeds: [embed], components: [button] });
      return;
    }
    const data = (await res.json()) as OrbyxSummary;
    const pct = ((data.unique / data.poolSize) * 100).toFixed(2);
    const rarities = ['mythique', 'legendaire', 'epique', 'rare', 'commune']
      .map((r) => `${RARITY_EMOJI[r]} ${data.byRarity[r] ?? 0}`)
      .join('  ');
    const embed = baseEmbed('info', { color: ctx.guildConfig.primaryColor || null })
      .setAuthor({ name: data.user.name, iconURL: target.displayAvatarURL() })
      .setTitle(trg(ctx, 'Collection Orbyx'))
      .setURL(`${ORBYX_URL}/#joueur/${target.id}`)
      .addFields(
        { name: trg(ctx, 'Persos'), value: `**${data.unique.toLocaleString('fr-FR')}** / ${data.poolSize.toLocaleString('fr-FR')} (${pct} %)`, inline: true },
        { name: trg(ctx, 'Boosters ouverts'), value: `**${data.user.opened}**`, inline: true },
        { name: trg(ctx, 'Cartes'), value: `**${data.total}**`, inline: true },
        { name: trg(ctx, 'Raretés'), value: rarities },
        {
          name: trg(ctx, 'Meilleures cartes'),
          value: data.best.length ? data.best.map((c) => `${RARITY_EMOJI[c.r]} **${c.n}** · ${c.s}`).join('\n') : trg(ctx, 'Aucune carte pour l’instant'),
        }
      );
    if (data.best[0]) embed.setThumbnail(data.best[0].i);
    await ctx.editReply({ embeds: [embed], components: [button] });
  },
};

export const orbyxAnnouncementsCommand: Command = {
  name: 'orbyx-annonces',
  description: 'Annonce dans un salon les cartes Mythiques Orbyx obtenues par les membres',
  category: 'Administration',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('orbyx-annonces')
    .setDescription('Annonce dans un salon les cartes Mythiques Orbyx obtenues par les membres')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) => o.setName('salon').setDescription('Salon des annonces (vide = désactiver)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(false)),
  execute: async (ctx: CommandContext) => {
    if (!ctx.guild) return;
    const channel = ctx.interaction?.options.getChannel('salon') ?? ctx.message?.mentions.channels.first() ?? null;
    const embed = baseEmbed('success', { color: ctx.guildConfig.primaryColor || null }).setTitle('Orbyx');
    if (!channel) {
      guildConfigService.updateConfig(ctx.guild.id, { orbyxChannelId: null });
      await ctx.reply({ embeds: [embed.setDescription(trg(ctx, 'Annonces Mythiques Orbyx désactivées.'))] });
      return;
    }
    const target = ctx.guild.channels.cache.get(channel.id);
    const me = ctx.guild.members.me;
    if (!target?.isTextBased() || !me || !target.permissionsFor(me)?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      await ctx.reply({ embeds: [baseEmbed('error').setDescription(trg(ctx, 'Je ne peux pas écrire dans {channel}. Donne-moi les permissions Envoyer des messages et Intégrer des liens.', { channel: `<#${channel.id}>` }))] });
      return;
    }
    guildConfigService.updateConfig(ctx.guild.id, { orbyxChannelId: channel.id });
    await ctx.reply({ embeds: [embed.setDescription(trg(ctx, 'Les cartes Mythiques obtenues par les membres du serveur seront annoncées dans {channel}.', { channel: `<#${channel.id}>` }))] });
  },
};
