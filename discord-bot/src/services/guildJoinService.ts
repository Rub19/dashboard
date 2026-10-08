import {
  ActionRowBuilder,
  AuditLogEvent,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextBasedChannel,
  type ButtonInteraction,
  type MessageCreateOptions,
} from 'discord.js';
import { guildConfigService } from './guildConfigService.js';
import { SupportedLanguage } from '../utils/i18n.js';
import { logger } from '../utils/logger.js';
import { brandIcon } from '../utils/embeds.js';

const PERMISSION_CHECKS = [
  { flag: PermissionFlagsBits.ViewAuditLog, name: 'VIEW_AUDIT_LOG' },
  { flag: PermissionFlagsBits.ManageGuild, name: 'MANAGE_GUILD' },
  { flag: PermissionFlagsBits.ManageRoles, name: 'MANAGE_ROLES' },
  { flag: PermissionFlagsBits.BanMembers, name: 'BAN_MEMBERS' },
  { flag: PermissionFlagsBits.KickMembers, name: 'KICK_MEMBERS' },
  { flag: PermissionFlagsBits.ModerateMembers, name: 'MODERATE_MEMBERS' },
  { flag: PermissionFlagsBits.ManageChannels, name: 'MANAGE_CHANNELS' },
  { flag: PermissionFlagsBits.ManageWebhooks, name: 'MANAGE_WEBHOOKS' },
  { flag: PermissionFlagsBits.ManageMessages, name: 'MANAGE_MESSAGES' },
  { flag: PermissionFlagsBits.ManageThreads, name: 'MANAGE_THREADS' },
  { flag: PermissionFlagsBits.CreateGuildExpressions, name: 'CREATE_GUILD_EXPRESSIONS' },
] as const;

export const guildJoinService = {
  buildJoinMessage(guild: Guild, inviterId?: string | null): MessageCreateOptions {
    const conf = guildConfigService.getConfig(guild.id);
    const botName = conf.botName || guild.members.me?.displayName || 'Ethone';
    const me = guild.members.me;

    const permsList = PERMISSION_CHECKS.map((item) => {
      const granted = me ? me.permissions.has(item.flag) : true;
      return `${granted ? '☑️' : '❌'} \`${item.name}\``;
    });

    const hasCorePerms = PERMISSION_CHECKS.filter((item) =>
      [
        PermissionFlagsBits.ViewAuditLog,
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.ModerateMembers,
      ].includes(item.flag)
    ).every((item) => (me ? me.permissions.has(item.flag) : true));

    const statusTitle = hasCorePerms ? 'Opérationnel' : 'Attention aux permissions';
    const statusSubtitle = hasCorePerms
      ? 'Les permissions principales sont déjà en place.'
      : 'Certaines permissions recommandées sont absentes du bot.';

    const descriptionParts = [
      `Merci d'avoir ajouté **${botName}** à votre serveur.`,
      '',
      `🪟 **État actuel**\n> **${statusTitle}**\n> ${statusSubtitle}`,
      '---',
      `🛡️ **Permissions**\n${permsList.join('\n')}`,
      '---',
      `⚠️ **Important**\nPlace le rôle le plus haut de **${botName}** tout en haut de la hiérarchie pour qu'il puisse protéger, sanctionner et restaurer correctement le serveur.`,
      '---',
      `❔ **Commandes utiles**\n> \`/aide\` · voir les commandes\n> \`/config\` · configurer les protections\n> \`/verifier-permissions\` · vérifier les permissions du bot\n> \`/langue\` · changer la langue du bot`,
      '---',
      `# **Salon système ${botName}**\nChoisis un salon existant ou crée le automatiquement pour recevoir les messages importants du bot.`,
      '---',
      `⚙️ **Langue du bot**\nChoisis la langue utilisée par ${botName} sur ce serveur. Les salons déjà créés ne sont pas renommés automatiquement.`,
    ];

    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle(`🛡️ | ${botName} ajouté avec succès`)
      .setDescription(descriptionParts.join('\n'))
      .setFooter({ text: 'ETHONE', iconURL: brandIcon('ethone') });

    const channelSelectRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId(`guild_join:select_channel:${guild.id}`)
        .setPlaceholder('Choisir un salon existant...')
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
    );

    const createChannelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`guild_join:create_channel:${guild.id}`)
        .setLabel('Créer le salon système')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Primary)
    );

    const currentLang = (conf.language || 'fr') as SupportedLanguage;
    const langSelectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`guild_join:language:${guild.id}`)
        .setPlaceholder(
          currentLang === 'fr'
            ? 'Français'
            : currentLang === 'en'
            ? 'English'
            : currentLang === 'es'
            ? 'Español'
            : 'Deutsch'
        )
        .addOptions([
          { label: 'Français', value: 'fr', emoji: '🇫🇷', default: currentLang === 'fr' },
          { label: 'English', value: 'en', emoji: '🇬🇧', default: currentLang === 'en' },
          { label: 'Español', value: 'es', emoji: '🇪🇸', default: currentLang === 'es' },
          { label: 'Deutsch', value: 'de', emoji: '🇩🇪', default: currentLang === 'de' },
        ])
    );

    const linksRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Serveur support')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/WvEcyBuP45')
        .setEmoji('🌐'),
      new ButtonBuilder()
        .setLabel('Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://ethone.dev/discord?guildId=${guild.id}`)
        .setEmoji('📊')
    );

    return {
      content: inviterId ? `<@${inviterId}>` : undefined,
      embeds: [embed],
      components: [channelSelectRow, createChannelRow, langSelectRow, linksRow],
    };
  },

  async resolveInviterId(guild: Guild): Promise<string> {
    try {
      const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
      if (me && me.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        const auditLogs = await guild.fetchAuditLogs({
          type: AuditLogEvent.BotAdd,
          limit: 5,
        });
        const botId = guild.client.user?.id;
        const entry = auditLogs.entries.find((item) => item.target?.id === botId);
        if (entry && entry.executor?.id) {
          return entry.executor.id;
        }
      }
    } catch (err) {
      logger.warn(`[Join] Audit log introuvable pour le serveur ${guild.id}:`, err);
    }
    return guild.ownerId;
  },

  findTargetChannel(guild: Guild): TextBasedChannel | null {
    const me = guild.members.me;
    if (!me) return null;

    const canSend = (c: any): boolean => {
      if (!c || typeof c.permissionsFor !== 'function') return false;
      const perms = c.permissionsFor(me);
      return Boolean(
        perms &&
          perms.has(PermissionFlagsBits.ViewChannel) &&
          perms.has(PermissionFlagsBits.SendMessages)
      );
    };

    if (guild.systemChannel && canSend(guild.systemChannel)) {
      return guild.systemChannel;
    }

    const preferred = ['general', 'discussion', 'bienvenue', 'welcome', 'annonces', 'chat', 'bot', 'config'];
    for (const name of preferred) {
      const found = guild.channels.cache.find(
        (c) => c.isTextBased() && !c.isThread() && c.name.toLowerCase().includes(name) && canSend(c)
      );
      if (found && found.isTextBased()) return found as TextBasedChannel;
    }

    const firstWritable = guild.channels.cache.find(
      (c) => c.isTextBased() && !c.isThread() && canSend(c)
    );
    if (firstWritable && firstWritable.isTextBased()) return firstWritable as TextBasedChannel;

    return null;
  },

  async sendJoinWelcome(guild: Guild): Promise<void> {
    try {
      const inviterId = await this.resolveInviterId(guild);
      const payload = this.buildJoinMessage(guild, inviterId);
      const targetChannel = this.findTargetChannel(guild);

      if (targetChannel && typeof (targetChannel as any).send === 'function') {
        await (targetChannel as any).send(payload);
        logger.success(`[Join] Message d'accueil envoyé avec succès sur ${guild.name} (#${(targetChannel as any).name})`);
        return;
      }

      if (inviterId) {
        const user = await guild.client.users.fetch(inviterId).catch(() => null);
        if (user) {
          await user.send(payload).catch(() => null);
          logger.info(`[Join] Aucun salon accessible sur ${guild.name}, message envoyé en MP à l'inviteur.`);
        }
      }
    } catch (err) {
      logger.error(`[Join] Erreur lors de l'envoi du message d'accueil pour ${guild.name}:`, err);
    }
  },

  async handleSelect(
    interaction: ChannelSelectMenuInteraction | StringSelectMenuInteraction
  ): Promise<void> {
    const guild = interaction.guild;
    if (!guild) return;

    const member = interaction.member as GuildMember | null;
    if (!member || !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: '❌ Seuls les membres ayant la permission **Gérer le serveur** peuvent modifier ces réglages.',
        ephemeral: true,
      });
      return;
    }

    if (interaction.customId.startsWith('guild_join:select_channel:')) {
      const channelId = interaction.values[0];
      if (!channelId) return;

      guildConfigService.updateConfig(guild.id, {
        systemChannelId: channelId,
      });

      const me = guild.members.me;
      if (me && me.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await guild.setSystemChannel(channelId).catch(() => null);
      }

      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle('✅ Salon système configuré')
        .setDescription(`Le salon <#${channelId}> a été défini comme salon système pour les alertes et notifications.`)
        .setFooter({ text: 'ETHONE', iconURL: brandIcon('ethone') });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (interaction.customId.startsWith('guild_join:language:')) {
      const lang = interaction.values[0] as SupportedLanguage;
      if (!['fr', 'en', 'es', 'de'].includes(lang)) return;

      guildConfigService.updateConfig(guild.id, { language: lang });

      const confirmationTexts: Record<SupportedLanguage, string> = {
        fr: '✅ La langue du bot a été définie sur **Français**.',
        en: '✅ Bot language has been set to **English**.',
        es: '✅ El idioma del bot ha sido cambiado a **Español**.',
        de: '✅ Die Bot-Sprache wurde auf **Deutsch** gesetzt.',
      };

      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle('⚙️ Langue mise à jour')
        .setDescription(confirmationTexts[lang] || confirmationTexts.fr)
        .setFooter({ text: 'ETHONE', iconURL: brandIcon('ethone') });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },

  async handleButton(interaction: ButtonInteraction): Promise<void> {
    const guild = interaction.guild;
    if (!guild) return;

    const member = interaction.member as GuildMember | null;
    if (!member || !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: '❌ Seuls les membres ayant la permission **Gérer le serveur** peuvent effectuer cette action.',
        ephemeral: true,
      });
      return;
    }

    if (interaction.customId.startsWith('guild_join:create_channel:')) {
      const me = guild.members.me;
      if (!me || !me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.reply({
          content: '❌ Le bot a besoin de la permission **Gérer les salons** pour créer automatiquement le salon système.',
          ephemeral: true,
        });
        return;
      }

      const existing = guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildText &&
          (c.name === 'ethone-system' || c.name === 'etho-system' || c.name === 'salon-systeme')
      );

      let targetChannel = existing;
      if (!targetChannel) {
        targetChannel = await guild.channels.create({
          name: 'ethone-system',
          type: ChannelType.GuildText,
          topic: 'Salon système et notifications importantes de sécurité ETHONE',
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.SendMessages],
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            },
            {
              id: interaction.client.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles,
              ],
            },
          ],
          reason: 'Création automatique du salon système ETHONE',
        });
      }

      guildConfigService.updateConfig(guild.id, {
        systemChannelId: targetChannel.id,
      });

      if (me.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await guild.setSystemChannel(targetChannel.id).catch(() => null);
      }

      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle('⚡ Salon système créé')
        .setDescription(`Le salon ${targetChannel} a été créé et défini comme salon système pour ETHONE.`)
        .setFooter({ text: 'ETHONE', iconURL: brandIcon('ethone') });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
