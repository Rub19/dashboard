import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, GuildChannel } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { serverStatsStorage, MAX_STAT_CHANNELS } from '../storage/serverStatsStorage.js';
import { serverStatsService, computeStat, renderName, computeName, COUNTER_PRESETS } from '../services/serverStatsService.js';
import { TOKEN_DOCS } from '../services/counterTemplate.js';
import { StatType } from '../types/serverStats.js';
import { emitConfigUpdated } from '../../../services/syncConfigEmitter.js';
import { trg } from '../../../utils/tr.js';

const TYPE_LABELS: Record<StatType, string> = {
  members: 'Membres', humans: 'Humains', bots: 'Bots', online: 'En ligne',
  boosts: 'Boosts', boostTier: 'Niveau de boost', roles: 'Rôles',
  channels: 'Salons', roleMembers: "Membres d'un rôle", custom: 'Modèle personnalisé',
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
              { name: "Membres d'un rôle", value: 'roleMembers' },
              { name: 'Modèle personnalisé (jetons : horloge, objectif, activité…)', value: 'custom' }
            )
        )
        .addStringOption((o) => o.setName('format').setDescription('Ex : « 👥 {count} membres » ou, en modèle : « 🕐 {time12:UTC} UTC »').setMaxLength(100))
        .addRoleOption((o) => o.setName('role').setDescription('Rôle à compter (type « Membres d\'un rôle »)'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Retire un salon compteur')
        .addChannelOption((o) => o.setName('salon').setDescription('Salon compteur').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Crée la catégorie « SERVER STATS » avec ses salons compteurs verrouillés')
        .addStringOption((o) =>
          o.setName('modele').setDescription('Ensemble de compteurs').setRequired(true).addChoices(...COUNTER_PRESETS.map((p) => ({ name: p.label, value: p.id })))
        )
    )
    .addSubcommand((sub) => sub.setName('tokens').setDescription('Liste des jetons utilisables dans un modèle personnalisé'))
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
        embeds: [ctx.createEmbed('error').setDescription(trg(ctx, '❌ Commande slash à utiliser sur un serveur.'))],
        ephemeral: true,
      });
      return;
    }
    const sub = ctx.interaction!.options.getSubcommand();

    if (sub === 'tokens') {
      const groups = new Map<string, string[]>();
      for (const t of TOKEN_DOCS) groups.set(t.group, [...(groups.get(t.group) ?? []), `\`${t.token}\` — ${t.label} (ex. ${t.example})`]);
      const embed = ctx.createEmbed('info').setTitle(trg(ctx, '🧩 Jetons des compteurs')).setDescription(trg(ctx, 'Mélangez texte, emojis et jetons : « 🕐 {time12:UTC} UTC », « {members_until:next} avant {members_next} ».'));
      for (const [group, lines] of groups) embed.addFields({ name: group, value: lines.join(String.fromCharCode(10)).slice(0, 1024) });
      await ctx.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'setup') {
      await ctx.deferReply({ ephemeral: true });
      try {
        const res = await serverStatsService.createCategory(guild, ctx.interaction!.options.getString('modele', true) as 'draftbot' | 'statbot');
        await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(trg(ctx, '📊 Catégorie créée avec {length} compteur(s) : {v1}', { length: res.channelIds.length, v1: res.channelIds.map((id) => `<#${id}>`).join(' ') }))] });
      } catch (err) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(`❌ ${err instanceof Error ? err.message : 'Création impossible.'}`)] });
      }
      return;
    }

    if (sub === 'add') {
      const channel = ctx.interaction!.options.getChannel('salon', true);
      const type = ctx.interaction!.options.getString('type', true) as StatType;
      const format = ctx.interaction!.options.getString('format') ?? undefined;
      const role = ctx.interaction!.options.getRole('role');

      if (channel.type === ChannelType.GuildCategory) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(trg(ctx, '❌ Une catégorie ne peut pas être un compteur.'))], ephemeral: true });
        return;
      }
      if (type === 'custom' && !format) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(trg(ctx, '❌ Le type « Modèle personnalisé » demande l’option `format` (voir `/serverstats tokens`).'))], ephemeral: true });
        return;
      }
      if (type === 'roleMembers' && !role) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(trg(ctx, '❌ Le type « Membres d\'un rôle » nécessite l\'option `role`.'))], ephemeral: true });
        return;
      }
      if (!serverStatsStorage.get(guild.id, channel.id) && !serverStatsStorage.canAddMore(guild.id)) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(trg(ctx, '❌ Limite de {MAX_STAT_CHANNELS} salons compteurs atteinte.', { MAX_STAT_CHANNELS }))], ephemeral: true });
        return;
      }
      const me = guild.members.me;
      const gc = channel as GuildChannel;
      if (me && !gc.permissionsFor(me)?.has(PermissionFlagsBits.ManageChannels)) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(trg(ctx, '❌ Il me faut la permission **Gérer les salons** sur ce salon.'))], ephemeral: true });
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
      const preview = computeName(guild, stat).name;
      await ctx.reply({
        embeds: [
          ctx.createEmbed('success').setTitle(trg(ctx, '📊 Salon compteur ajouté')).setDescription(trg(ctx, '<#{id}> → **{preview}**\nMise à jour toutes les {updateIntervalMinutes} min.', { id: channel.id, preview, updateIntervalMinutes: serverStatsStorage.getConfig(guild.id).updateIntervalMinutes })),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'remove') {
      const channel = ctx.interaction!.options.getChannel('salon', true);
      const ok = serverStatsStorage.delete(guild.id, channel.id);
      await ctx.reply({
        embeds: [ctx.createEmbed(ok ? 'success' : 'info').setDescription(ok ? trg(ctx, '✅ <#{id}> n\'est plus un compteur.', { id: channel.id }) : trg(ctx, 'ℹ️ Ce salon n\'était pas un compteur.'))],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'list') {
      const list = serverStatsStorage.getGuild(guild.id);
      if (list.length === 0) {
        await ctx.reply({ embeds: [ctx.createEmbed('neutral').setDescription(trg(ctx, 'Aucun salon compteur. `/serverstats add` pour en créer.'))], ephemeral: true });
        return;
      }
      const embed = ctx.createEmbed('default').setTitle(trg(ctx, '📊 Salons compteurs ({length})', { length: list.length }));
      for (const s of list) {
        embed.addFields({
          name: TYPE_LABELS[s.type] + (s.roleId ? ` (<@&${s.roleId}>)` : ''),
          value: trg(ctx, '<#{channelId}> · format `{template}`{v2}', { channelId: s.channelId, template: s.template, v2: s.lastValue !== null ? ` · actuel : ${s.lastValue}` : '' }),
        });
      }
      await ctx.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'refresh') {
      await ctx.deferReply({ ephemeral: true });
      await serverStatsService.forceRefresh(guild).catch(() => {});
      await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(trg(ctx, '✅ Compteurs rafraîchis.'))] });
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
        embeds: [ctx.createEmbed(c.enabled ? 'default' : 'neutral').setDescription(trg(ctx, 'État : {v0}\nIntervalle : {updateIntervalMinutes} min', { v0: c.enabled ? '🟢 actif' : '⚪ inactif', updateIntervalMinutes: c.updateIntervalMinutes }))],
        ephemeral: true,
      });
      return;
    }
    const updated = serverStatsStorage.updateConfig(guild.id, patch);
    emitConfigUpdated('serverStats', guild.id, updated, 'DISCORD_COMMAND', ctx.author.id);
    await ctx.reply({
      embeds: [ctx.createEmbed('success').setDescription(trg(ctx, '✅ État : {v0} · intervalle : {updateIntervalMinutes} min', { v0: updated.enabled ? 'actif' : 'inactif', updateIntervalMinutes: updated.updateIntervalMinutes }))],
      ephemeral: true,
    });
  },
};
