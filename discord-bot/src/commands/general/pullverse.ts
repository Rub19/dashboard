import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { PULLVERSE_URL } from '../../services/pullverseFeedService.js';
import { Command, CommandContext } from '../../types/command.js';
import { baseEmbed } from '../../utils/embeds.js';
import { trg } from '../../utils/tr.js';

const RARITY_EMOJI: Record<string, string> = { mythique: '🌈', legendaire: '🟧', epique: '🟪', rare: '🟦', commune: '⬜' };

interface PullverseSummary {
  user: { id: string; name: string; opened: number };
  unique: number;
  total: number;
  poolSize: number;
  byRarity: Record<string, number>;
  best: { n: string; s: string; i: string; r: string }[];
}

export const pullverseCommand: Command = {
  name: 'pullverse',
  description: 'Affiche la collection Pullverse d’un membre',
  category: 'Général',
  aliases: ['orbyx', 'packs', 'collection'],
  slashData: new SlashCommandBuilder()
    .setName('pullverse')
    .setDescription('Affiche la collection Pullverse d’un membre')
    .addUserOption((o) => o.setName('membre').setDescription('Membre à afficher').setRequired(false)),
  execute: async (ctx: CommandContext) => {
    const target = ctx.interaction?.options.getUser('membre') ?? ctx.message?.mentions.users.first() ?? ctx.author;
    await ctx.deferReply();
    const res = await fetch(`${PULLVERSE_URL}/api/summary/${target.id}`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(res?.ok ? `${PULLVERSE_URL}/#joueur/${target.id}` : PULLVERSE_URL).setLabel(trg(ctx, 'Ouvrir Pullverse'))
    );
    if (!res?.ok) {
      const embed = baseEmbed('info', { color: ctx.guildConfig.primaryColor || null })
        .setTitle('Pullverse')
        .setDescription(
          res?.status === 404
            ? trg(ctx, '{name} n’a pas encore de collection Pullverse. Connecte-toi avec Discord pour ouvrir tes premiers boosters.', { name: target.username })
            : trg(ctx, 'Pullverse ne répond pas pour le moment, réessaie dans un instant.')
        );
      await ctx.editReply({ embeds: [embed], components: [button] });
      return;
    }
    const data = (await res.json()) as PullverseSummary;
    const pct = ((data.unique / data.poolSize) * 100).toFixed(2);
    const rarities = ['mythique', 'legendaire', 'epique', 'rare', 'commune']
      .map((r) => `${RARITY_EMOJI[r]} ${data.byRarity[r] ?? 0}`)
      .join('  ');
    const embed = baseEmbed('info', { color: ctx.guildConfig.primaryColor || null })
      .setAuthor({ name: data.user.name, iconURL: target.displayAvatarURL() })
      .setTitle(trg(ctx, 'Collection Pullverse'))
      .setURL(`${PULLVERSE_URL}/#joueur/${target.id}`)
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

export const pullverseAnnouncementsCommand: Command = {
  name: 'pullverse-annonces',
  description: 'Annonce dans un salon les cartes Mythiques Pullverse obtenues par les membres',
  category: 'Administration',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('pullverse-annonces')
    .setDescription('Annonce dans un salon les cartes Mythiques Pullverse obtenues par les membres')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) => o.setName('salon').setDescription('Salon des annonces (vide = désactiver)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(false)),
  execute: async (ctx: CommandContext) => {
    if (!ctx.guild) return;
    const channel = ctx.interaction?.options.getChannel('salon') ?? ctx.message?.mentions.channels.first() ?? null;
    const embed = baseEmbed('success', { color: ctx.guildConfig.primaryColor || null }).setTitle('Pullverse');
    if (!channel) {
      guildConfigService.updateConfig(ctx.guild.id, { orbyxChannelId: null });
      await ctx.reply({ embeds: [embed.setDescription(trg(ctx, 'Annonces Mythiques Pullverse désactivées.'))] });
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
