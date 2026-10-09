import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type AutocompleteInteraction,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { PROTECTIONS, PROTECTION_CATEGORIES, describeProtection, getProtection, type Punish } from './catalog.js';
import { protectionStore } from './protectionStore.js';
import { protectionEngine } from './protectionEngine.js';
import { syncAutomodRule } from './automodSync.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { baseEmbed } from '../../utils/embeds.js';
import { config } from '../../config.js';

const PUNISH_LABEL: Record<Punish, string> = { none: 'Aucune (alerte)', timeout: 'Timeout', derank: 'Retirer les rôles', kick: 'Expulser', ban: 'Bannir' };
const dur = (s: number) => (s % 86400 === 0 ? `${s / 86400} j` : s % 3600 === 0 ? `${s / 3600} h` : s % 60 === 0 ? `${s / 60} min` : `${s} s`);

/** Retrouve une protection par sa clé ou son nom (« anti-ban », « Anti-ban », « antiBan »). */
const find = (q: string | null | undefined) => {
  const v = (q ?? '').trim().toLowerCase();
  return PROTECTIONS.find((p) => p.key.toLowerCase() === v || p.label.toLowerCase() === v || p.label.toLowerCase().replace(/[^a-z0-9]/g, '') === v.replace(/[^a-z0-9]/g, ''));
};

const consoleButton = (guildId: string, key?: string) =>
  config.dashboardUrl
    ? [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Ouvrir dans la console')
            .setURL(`${config.dashboardUrl.replace(/\/$/, '')}/discord?guildId=${guildId}&view=protections${key ? `&p=${key}` : ''}`)
        ),
      ]
    : [];

export const protectionCommand: Command = {
  name: 'protection',
  description: 'Protections du serveur : liste, détails et réglages rapides',
  category: 'Sécurité',
  aliases: ['protections'],
  userPermissions: [PermissionFlagsBits.Administrator],
  slashData: new SlashCommandBuilder()
    .setName('protection')
    .setDescription('Protections du serveur (anti-ban, anti-spam, anti-lien…)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((s) => s.setName('liste').setDescription('Toutes les protections et leur état'))
    .addSubcommand((s) =>
      s
        .setName('voir')
        .setDescription("Ce que fait une protection et ses réglages")
        .addStringOption((o) => o.setName('protection').setDescription('Nom de la protection').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((s) =>
      s
        .setName('activer')
        .setDescription('Active une protection')
        .addStringOption((o) => o.setName('protection').setDescription('Nom de la protection').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((s) =>
      s
        .setName('desactiver')
        .setDescription('Désactive une protection')
        .addStringOption((o) => o.setName('protection').setDescription('Nom de la protection').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((s) =>
      s
        .setName('punition')
        .setDescription("Choisit la sanction appliquée à l'auteur")
        .addStringOption((o) => o.setName('protection').setDescription('Nom de la protection').setRequired(true).setAutocomplete(true))
        .addStringOption((o) =>
          o
            .setName('sanction')
            .setDescription('Sanction')
            .setRequired(true)
            .addChoices(
              { name: 'Aucune (alerte seulement)', value: 'none' },
              { name: 'Timeout', value: 'timeout' },
              { name: 'Retirer les rôles', value: 'derank' },
              { name: 'Expulser', value: 'kick' },
              { name: 'Bannir', value: 'ban' }
            )
        )
        .addIntegerOption((o) => o.setName('minutes').setDescription('Durée du timeout en minutes').setMinValue(1).setMaxValue(40320))
    )
    .addSubcommand((s) =>
      s
        .setName('seuil')
        .setDescription('Nombre d’actions tolérées et fenêtre de temps')
        .addStringOption((o) => o.setName('protection').setDescription('Nom de la protection').setRequired(true).setAutocomplete(true))
        .addIntegerOption((o) => o.setName('nombre').setDescription('Actions avant sanction').setRequired(true).setMinValue(1).setMaxValue(1000))
        .addIntegerOption((o) => o.setName('secondes').setDescription('En moins de… (secondes)').setRequired(true).setMinValue(1).setMaxValue(604800))
    )
    .addSubcommand((s) =>
      s
        .setName('salon')
        .setDescription("Salon où la protection envoie ses alertes")
        .addStringOption((o) => o.setName('protection').setDescription('Nom de la protection, ou « toutes »').setRequired(true).setAutocomplete(true))
        .addChannelOption((o) => o.setName('salon').setDescription('Salon de log').setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    )
    .addSubcommand((s) => s.setName('deverrouiller').setDescription('Rend aux rôles les permissions retirées par un verrouillage')),

  autocomplete: async (interaction: AutocompleteInteraction) => {
    const q = interaction.options.getFocused().toLowerCase();
    const sub = interaction.options.getSubcommand(false);
    const all = interaction.guildId ? protectionStore.all(interaction.guildId) : {};
    const choices = PROTECTIONS.filter((p) => !q || p.label.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .map((p) => ({ name: `${all[p.key]?.enabled ? '● ' : '○ '}${p.label} · ${p.category}`.slice(0, 100), value: p.key }));
    if (sub === 'salon' && (!q || 'toutes'.includes(q))) choices.unshift({ name: 'Toutes les protections actives', value: 'all' });
    await interaction.respond(choices.slice(0, 25));
  },

  execute: async (ctx: CommandContext) => {
    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Commande réservée aux serveurs.')], ephemeral: true });
      return;
    }
    const guild = ctx.guild;
    const it = ctx.interaction as ChatInputCommandInteraction | undefined;
    const sub = it ? it.options.getSubcommand() : ctx.args[0]?.toLowerCase() || 'liste';
    const def = find(it ? it.options.getString('protection') : ctx.args.slice(1).join(' '));
    const save = async (patch: Parameters<typeof protectionStore.update>[2]) => {
      const next = protectionStore.update(guild.id, def!.key, patch);
      emitConfigUpdated('protections', guild.id, { key: def!.key, ...next }, 'DISCORD_COMMAND', ctx.author.id);
      if (def!.key === 'antiLink' || def!.key === 'antiBadWord') await syncAutomodRule(guild, def!.key);
      return next;
    };

    if (sub === 'liste') {
      const all = protectionStore.all(guild.id);
      const active = PROTECTIONS.filter((p) => all[p.key].enabled).length;
      const incomplete = PROTECTIONS.filter((p) => all[p.key].enabled && !all[p.key].logChannelId && p.kind !== 'rollback').length;
      const embed = baseEmbed('default')
        .setAuthor({ name: `Protections — ${guild.name}`, iconURL: guild.iconURL({ size: 128 }) ?? undefined })
        .setDescription(
          `**${active}/${PROTECTIONS.length}** actives${incomplete ? ` · ⚠️ ${incomplete} sans salon de log` : ''}${protectionStore.getLockdown(guild.id) ? '\n🔒 **Serveur verrouillé** · `/protection deverrouiller`' : ''}`
        )
        .addFields(
          PROTECTION_CATEGORIES.map((cat) => {
            const list = PROTECTIONS.filter((p) => p.category === cat);
            const on = list.filter((p) => all[p.key].enabled).length;
            return { name: `${cat} · ${on}/${list.length}`, value: list.map((p) => `${all[p.key].enabled ? '🟢' : '⚫'} ${p.label}`).join('\n'), inline: true };
          })
        )
        .setFooter({ text: '/protection voir · activer · desactiver · punition · seuil · salon' });
      await ctx.reply({ embeds: [embed], components: consoleButton(guild.id) });
      return;
    }

    if (sub === 'deverrouiller') {
      const restored = await protectionEngine.liftLockdown(guild);
      await ctx.reply({
        embeds: [ctx.createEmbed(restored ? 'success' : 'info').setDescription(restored ? `🔓 Permissions rendues à ${restored} rôle${restored > 1 ? 's' : ''}.` : "Le serveur n'est pas verrouillé.")],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'salon' && it?.options.getString('protection') === 'all') {
      const channel = it.options.getChannel('salon', true);
      const all = protectionStore.all(guild.id);
      const keys = PROTECTIONS.filter((p) => all[p.key].enabled).map((p) => p.key);
      for (const key of keys) protectionStore.update(guild.id, key, { logChannelId: channel.id });
      await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(`📋 Alertes de ${keys.length} protection${keys.length > 1 ? 's' : ''} envoyées dans <#${channel.id}>.`)], ephemeral: true });
      return;
    }

    if (!def) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Protection introuvable. Tape `/protection liste` pour voir les noms.')], ephemeral: true });
      return;
    }
    const s = protectionStore.get(guild.id, def.key);

    if (sub === 'voir') {
      const lines = [
        `**${s.enabled ? '🟢 Activée' : '⚫ Désactivée'}** · ${def.category}`,
        def.description,
        '',
        `> ${describeProtection(def, s)}`,
        ...(def.aftermath ? [`> ✅ ${def.aftermath}`] : []),
      ];
      const fields = [
        ...(def.kind === 'quota' ? [{ name: 'Détection', value: `${s.quotaMax} en moins de ${dur(s.quotaSeconds ?? 60)}`, inline: true }] : []),
        ...(def.kind !== 'rollback' && def.kind !== 'reorder' ? [{ name: 'Punition', value: `${PUNISH_LABEL[s.punish]}${s.punish === 'timeout' ? ` · ${dur(s.timeoutSeconds)}` : ''}${s.lockdown ? ' + verrouillage' : ''}`, inline: true }] : []),
        { name: 'Salon de log', value: s.logChannelId ? `<#${s.logChannelId}>` : '⚠️ Aucun', inline: true },
        { name: 'Whitelist', value: [s.ignoreEthoOwners ? 'Owners Etho' : '', s.useGlobalWhitelist ? 'globale' : '', s.wlUsers.length ? `${s.wlUsers.length} membre(s)` : '', s.wlRoles.length ? `${s.wlRoles.length} rôle(s)` : ''].filter(Boolean).join(' · ') || 'Aucune', inline: false },
      ];
      await ctx.reply({ embeds: [baseEmbed(s.enabled ? 'success' : 'neutral').setTitle(def.label).setDescription(lines.join('\n')).addFields(fields)], components: consoleButton(guild.id, def.key) });
      return;
    }

    if (sub === 'activer' || sub === 'desactiver') {
      const next = await save({ enabled: sub === 'activer' });
      const warn = next.enabled && !next.logChannelId && def.kind !== 'rollback' ? '\n⚠️ Aucun salon de log : `/protection salon` pour recevoir les alertes.' : '';
      await ctx.reply({ embeds: [ctx.createEmbed(next.enabled ? 'success' : 'neutral').setDescription(`${next.enabled ? '🟢' : '⚫'} **${def.label}** ${next.enabled ? 'activée' : 'désactivée'}.${next.enabled ? `\n${describeProtection(def, next)}` : ''}${warn}`)], ephemeral: true });
      return;
    }

    if (sub === 'punition' && it) {
      const punish = it.options.getString('sanction', true) as Punish;
      const minutes = it.options.getInteger('minutes');
      const next = await save({ punish, ...(minutes ? { timeoutSeconds: minutes * 60 } : {}) });
      await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(`**${def.label}** · ${describeProtection(def, next)}`)], ephemeral: true });
      return;
    }

    if (sub === 'seuil' && it) {
      if (def.kind !== 'quota') {
        await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription(`**${def.label}** n'a pas de seuil : elle agit dès la première action.`)], ephemeral: true });
        return;
      }
      const next = await save({ quotaMax: it.options.getInteger('nombre', true), quotaSeconds: it.options.getInteger('secondes', true) });
      await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(`**${def.label}** · ${describeProtection(def, next)}`)], ephemeral: true });
      return;
    }

    if (sub === 'salon' && it) {
      const channel = it.options.getChannel('salon', true);
      await save({ logChannelId: channel.id });
      await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(`📋 **${def.label}** envoie ses alertes dans <#${channel.id}>.`)], ephemeral: true });
      return;
    }

    await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription('Usage : `/protection liste`, `voir`, `activer`, `desactiver`, `punition`, `seuil`, `salon`, `deverrouiller`.')], ephemeral: true });
  },
};
