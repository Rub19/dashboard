import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { SLASH_DESTINATION_TYPES } from '../../utils/channelSend.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { trg } from '../../utils/tr.js';
import { riotStorage } from './riotStorage.js';
import { MODE_FILTERS, rankName, riotService } from './riotService.js';
import { RiotModeFilter } from './riotStorage.js';

export const riotCommand: Command = {
  name: 'riot',
  description: 'Lie ton compte Riot et publie tes parties Valorant',
  category: 'Jeux',
  slashData: new SlashCommandBuilder()
    .setName('riot')
    .setDescription('Comptes Riot et récaps Valorant')
    .addSubcommand((sub) =>
      sub
        .setName('link')
        .setDescription('Lie ton Riot ID (ex. Pseudo#TAG)')
        .addStringOption((o) => o.setName('riot_id').setDescription('Ton Riot ID, ex. Pseudo#TAG').setRequired(true).setMaxLength(43))
    )
    .addSubcommand((sub) => sub.setName('unlink').setDescription('Retire ton compte Riot de ce serveur'))
    .addSubcommand((sub) => sub.setName('list').setDescription('Comptes Riot liés sur ce serveur'))
    .addSubcommand((sub) => sub.setName('last').setDescription('Publie le récap de ta dernière partie'))
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('[Admin] Salon des récaps et publication automatique')
        .addChannelOption((o) => o.setName('salon').setDescription('Salon où publier les récaps').addChannelTypes(...SLASH_DESTINATION_TYPES))
        .addBooleanOption((o) => o.setName('auto').setDescription('Publier automatiquement après chaque partie'))
        .addStringOption((o) =>
          o.setName('modes').setDescription('Quelles parties publier automatiquement').addChoices(
            ...Object.entries(MODE_FILTERS).map(([value, name]) => ({ name, value })),
          )
        )
        .addBooleanOption((o) => o.setName('actif').setDescription('Activer / désactiver le module'))
    ),

  execute: async (ctx: CommandContext) => {
    const guildId = ctx.guild?.id;
    if (!guildId || !ctx.isSlash) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(trg(guildId, '❌ Commande slash à utiliser sur un serveur.'))], ephemeral: true });
      return;
    }
    const options = ctx.interaction!.options;
    const sub = options.getSubcommand();
    const settings = riotStorage.getConfig(guildId);

    if (sub === 'config') {
      if (!ctx.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(trg(guildId, '❌ Il faut la permission « Gérer le serveur ».'))], ephemeral: true });
        return;
      }
      const channel = options.getChannel('salon');
      const auto = options.getBoolean('auto');
      const enabled = options.getBoolean('actif');
      const modes = options.getString('modes') as RiotModeFilter | null;
      const updated = riotStorage.updateConfig(guildId, {
        ...(channel ? { channelId: channel.id } : {}),
        ...(auto !== null ? { auto } : {}),
        ...(modes && modes in MODE_FILTERS ? { modes } : {}),
        ...(enabled !== null ? { enabled } : channel || auto !== null || modes ? { enabled: true } : {}),
      });
      emitConfigUpdated('riot', guildId, updated, 'DISCORD_COMMAND', ctx.author.id);
      await ctx.reply({
        embeds: [
          ctx.createEmbed('success').setTitle(trg(guildId, '🎮 Récaps Valorant')).addFields(
            { name: trg(guildId, 'Module'), value: updated.enabled ? trg(guildId, '✅ Actif') : trg(guildId, '⛔ Désactivé'), inline: true },
            { name: trg(guildId, 'Salon'), value: updated.channelId ? `<#${updated.channelId}>` : trg(guildId, 'Aucun'), inline: true },
            { name: trg(guildId, 'Automatique'), value: updated.auto ? trg(guildId, '✅ Après chaque partie') : trg(guildId, '❌ Non'), inline: true },
            { name: trg(guildId, 'Parties publiées'), value: trg(guildId, MODE_FILTERS[updated.modes]), inline: true },
          ).setDescription(trg(guildId, 'Les membres lient leur compte avec `/riot link Pseudo#TAG`.')),
        ],
        ephemeral: true,
      });
      return;
    }

    if (!settings.enabled) {
      await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription(trg(guildId, 'ℹ️ Les récaps Valorant ne sont pas activés ici. Un admin peut les activer avec `/riot config`.'))], ephemeral: true });
      return;
    }

    if (sub === 'link') {
      const raw = options.getString('riot_id', true).trim();
      const match = raw.match(/^(.{3,16})#([A-Za-z0-9]{2,5})$/u);
      if (!match) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(trg(guildId, '❌ Format attendu : `Pseudo#TAG`.'))], ephemeral: true });
        return;
      }
      await ctx.interaction!.deferReply({ ephemeral: true });
      try {
        const account = await riotService.sync({ name: match[1]!, tag: match[2]! }, true);
        if (!account) {
          await ctx.interaction!.editReply({ embeds: [ctx.createEmbed('error').setDescription(trg(guildId, '❌ Compte Riot introuvable. Vérifie le pseudo et le tag.'))] });
          return;
        }
        const latest = await riotService.latestMatch(account.puuid).catch(() => null);
        riotStorage.setLink({
          guildId, userId: ctx.author.id, name: account.name, tag: account.tag, puuid: account.puuid,
          region: account.region, lastMatchId: latest?.id ?? null, linkedAt: Date.now(),
        });
        const embed = ctx.createEmbed('success')
          .setDescription(trg(guildId, '✅ Compte lié : **{name}#{tag}**{rank}.', { name: account.name, tag: account.tag, rank: account.tier > 0 ? ` · ${rankName(account.tier)}` : '' }))
          .setFooter({ text: trg(guildId, 'Seules les données publiques du compte sont utilisées. Aucun mot de passe.') });
        if (account.card) embed.setThumbnail(`https://media.valorant-api.com/playercards/${account.card}/smallart.png`);
        if (settings.auto && settings.channelId) embed.addFields({ name: trg(guildId, 'Récaps'), value: trg(guildId, 'Tes prochaines parties seront publiées dans <#{channel}>.', { channel: settings.channelId }) });
        await ctx.interaction!.editReply({ embeds: [embed] });
      } catch {
        await ctx.interaction!.editReply({ embeds: [ctx.createEmbed('error').setDescription(trg(guildId, '❌ Service Riot indisponible pour le moment, réessaie plus tard.'))] });
      }
      return;
    }

    if (sub === 'unlink') {
      const removed = riotStorage.removeLink(guildId, ctx.author.id);
      await ctx.reply({ embeds: [ctx.createEmbed(removed ? 'success' : 'info').setDescription(removed ? trg(guildId, '✅ Compte Riot retiré.') : trg(guildId, 'ℹ️ Aucun compte Riot lié.'))], ephemeral: true });
      return;
    }

    if (sub === 'list') {
      const links = riotStorage.listLinks(guildId);
      await ctx.reply({
        embeds: [
          ctx.createEmbed('default').setTitle(trg(guildId, '🎮 Comptes Riot liés ({count})', { count: links.length }))
            .setDescription(links.length ? links.slice(0, 40).map((l) => `<@${l.userId}> — **${l.name}**#${l.tag}`).join('\n') : trg(guildId, 'Aucun compte. `/riot link Pseudo#TAG` pour lier le tien.')),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'last') {
      const link = riotStorage.getLink(guildId, ctx.author.id);
      if (!link) {
        await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription(trg(guildId, 'ℹ️ Lie d\'abord ton compte avec `/riot link Pseudo#TAG`.'))], ephemeral: true });
        return;
      }
      await ctx.interaction!.deferReply();
      try {
        await riotService.sync({ puuid: link.puuid }, true);
        const match = await riotService.latestMatch(link.puuid);
        const payload = match ? riotService.recap(match, link) : null;
        if (!payload) {
          await ctx.interaction!.editReply({ embeds: [ctx.createEmbed('info').setDescription(trg(guildId, 'ℹ️ Aucune partie trouvée pour ce compte.'))] });
          return;
        }
        await ctx.interaction!.editReply(payload);
      } catch {
        await ctx.interaction!.editReply({ embeds: [ctx.createEmbed('error').setDescription(trg(guildId, '❌ Service Riot indisponible pour le moment, réessaie plus tard.'))] });
      }
    }
  },
};
