import { ApplicationCommandType, ChannelType, ContextMenuCommandBuilder, MessageContextMenuCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, UserContextMenuCommandInteraction } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { reportsStorage } from '../storage/reportsStorage.js';
import { reportsService } from '../services/reportsService.js';
import { noticeEmbed } from '../../../utils/embeds.js';
import { emitConfigUpdated } from '../../../services/syncConfigEmitter.js';

/**
 * /report — user (signaler un membre avec un motif), setup (installation en un clic, Gérer le serveur) et status. Les menus
 * contextuels « Signaler le message » / « Signaler le membre » (clic droit) ouvrent une fenêtre de motif.
 */
export const reportCommand: Command = {
  name: 'report',
  aliases: ['signaler', 'signalement'],
  description: 'Signaler un membre à l’équipe de modération',
  category: 'Modération',
  slashData: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Signaler un membre à l’équipe de modération')
    .addSubcommand((s) =>
      s
        .setName('user')
        .setDescription('Signaler un membre')
        .addUserOption((o) => o.setName('membre').setDescription('Le membre à signaler').setRequired(true))
        .addStringOption((o) => o.setName('motif').setDescription('Pourquoi ?').setRequired(true).setMinLength(5).setMaxLength(500))
    )
    .addSubcommand((s) =>
      s
        .setName('setup')
        .setDescription('Installe le système de signalement (Gérer le serveur)')
        .addChannelOption((o) => o.setName('salon').setDescription('Salon de l’équipe (créé si absent)').addChannelTypes(ChannelType.GuildText))
        .addRoleOption((o) => o.setName('equipe').setDescription('Rôle de l’équipe de modération'))
    )
    .addSubcommand((s) => s.setName('status').setDescription('Réglages actuels (Gérer le serveur)')),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.isSlash || !ctx.interaction) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('❌ Utilise la commande slash **/report** sur un serveur.')], ephemeral: true });
      return;
    }
    const i = ctx.interaction;
    const guild = ctx.guild;
    const sub = i.options.getSubcommand();

    if (sub === 'user') {
      await i.deferReply({ ephemeral: true });
      const target = i.options.getUser('membre', true);
      const res = await reportsService.submit(i.client, guild, i.user, target, i.options.getString('motif', true), { channelId: i.channelId });
      await i.editReply({ embeds: [res.ok ? noticeEmbed('success', 'Merci, ton signalement a été transmis à l’équipe de modération.') : noticeEmbed('error', res.error)] });
      return;
    }

    if (!ctx.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('⛔ Réservé aux membres qui ont la permission **Gérer le serveur**.')], ephemeral: true });
      return;
    }
    if (sub === 'status') {
      const c = reportsStorage.getConfig(guild.id);
      await ctx.reply({
        embeds: [ctx.createEmbed(c.enabled ? 'success' : 'warning').setTitle('🚨 Signalements').setDescription(c.enabled && c.channelId ? `Actif · salon <#${c.channelId}>${c.staffRoleId ? ` · équipe <@&${c.staffRoleId}>` : ''}` : 'Non configuré. `/report setup` l’installe en quelques secondes.')],
        ephemeral: true,
        allowedMentions: { parse: [] },
      });
      return;
    }
    await i.deferReply({ ephemeral: true });
    try {
      const channel = i.options.getChannel('salon');
      const role = i.options.getRole('equipe');
      const res = await reportsService.setup(guild, { channelId: channel?.id ?? null, staffRoleId: role?.id ?? undefined });
      emitConfigUpdated('reports', guild.id, reportsStorage.getConfig(guild.id), 'DISCORD_COMMAND', ctx.author.id);
      await i.editReply({ embeds: [noticeEmbed('success', `Signalements actifs dans <#${res.channelId}>${res.created ? ' (salon créé, visible de l’équipe seulement)' : ''}. Les membres peuvent utiliser **/report** ou le clic droit sur un message ou un membre.`)] });
    } catch (err) {
      await i.editReply({ embeds: [noticeEmbed('error', err instanceof Error ? err.message : 'Installation impossible.')] });
    }
  },
};

export interface ContextMenu {
  data: ContextMenuCommandBuilder;
  run(interaction: MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction): Promise<void>;
}

const enabledOrExplain = async (interaction: MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction): Promise<boolean> => {
  const conf = interaction.guildId ? reportsStorage.getConfig(interaction.guildId) : null;
  if (conf?.enabled && conf.channelId) return true;
  await interaction.reply({ embeds: [noticeEmbed('warning', 'Le système de signalement n’est pas activé sur ce serveur.')], flags: MessageFlags.Ephemeral });
  return false;
};

export const REPORT_CONTEXT_MENUS: ContextMenu[] = [
  {
    data: new ContextMenuCommandBuilder().setName('Signaler le message').setType(ApplicationCommandType.Message),
    async run(interaction) {
      if (!interaction.isMessageContextMenuCommand() || !(await enabledOrExplain(interaction))) return;
      const msg = interaction.targetMessage;
      await interaction.showModal(reportsService.buildModal({ userId: msg.author.id, channelId: msg.channelId, messageId: msg.id }));
    },
  },
  {
    data: new ContextMenuCommandBuilder().setName('Signaler le membre').setType(ApplicationCommandType.User),
    async run(interaction) {
      if (!interaction.isUserContextMenuCommand() || !(await enabledOrExplain(interaction))) return;
      await interaction.showModal(reportsService.buildModal({ userId: interaction.targetUser.id }));
    },
  },
];
