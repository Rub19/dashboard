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
  MessageFlags,
  type MessageActionRowComponentBuilder,
  type ButtonInteraction,
  type MessageCreateOptions,
} from 'discord.js';
import { guildConfigService } from './guildConfigService.js';
import { SupportedLanguage } from '../utils/i18n.js';
import { logger } from '../utils/logger.js';
import { brandIcon } from '../utils/embeds.js';
import { container, separator, text } from '../utils/components.js';
import { icon } from '../utils/v2.js';

const SUPPORT_URL = 'https://discord.gg/WvEcyBuP45';

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

const CORE_PERMISSIONS = [
  PermissionFlagsBits.ViewAuditLog,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
];

export const guildJoinService = {
  buildJoinMessage(
    guild: Guild,
    inviterId?: string | null,
    targetChannelId?: string | null
  ): MessageCreateOptions {
    const conf = guildConfigService.getConfig(guild.id);
    const botName = conf.botName || guild.members.me?.displayName || 'Etho';
    const me = guild.members.me;
    const hasCorePerms = CORE_PERMISSIONS.every((flag) => me?.permissions.has(flag));
    const missing = PERMISSION_CHECKS.filter((item) => !me?.permissions.has(item.flag)).length;

    const currentLang = (conf.language || 'fr') as SupportedLanguage;

    const langSelectRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`guild_join:language:${guild.id}`)
        .addOptions([
          { label: 'Français', value: 'fr', emoji: '🇫🇷', default: currentLang === 'fr' },
          { label: 'English', value: 'en', emoji: '🇬🇧', default: currentLang === 'en' },
          { label: 'Español', value: 'es', emoji: '🇪🇸', default: currentLang === 'es' },
          { label: 'Deutsch', value: 'de', emoji: '🇩🇪', default: currentLang === 'de' },
        ])
    );
    const linksRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Dashboard du serveur')
        .setStyle(ButtonStyle.Link)
        .setURL('https:' + '/' + `/ethone.dev/discord/?guildId=${guild.id}`)
        .setEmoji('📊'),
      new ButtonBuilder()
        .setLabel('Serveur support')
        .setStyle(ButtonStyle.Link)
        .setURL(SUPPORT_URL)
        .setEmoji('🛟')
    );

    const channelMention = targetChannelId
      ? `<#${targetChannelId}>`
      : conf.systemChannelId
        ? `<#${conf.systemChannelId}>`
        : '#salon-systeme';

    const permissionsText = hasCorePerms
      ? 'toutes en place'
      : `${missing} manquante${missing > 1 ? 's' : ''}`;

    const card = container(hasCorePerms ? 0x10b981 : 0xf59e0b, [
      inviterId ? text(`<@${inviterId}>`) : null,
      text(`## ${icon('a_logo', '🛡️')} | ${botName} ajouté avec succès`),
      separator(),
      text(
        `Merci d'avoir ajouté **${botName}** à ton serveur.\n\n` +
          `> • **Permissions** : ${permissionsText}\n` +
          `> • **Rôle de ${botName}** : à placer tout en haut de la hiérarchie\n` +
          `> • **Salon système** : ${channelMention}, modifiable avec \`/setup\`\n` +
          `> • **Commandes** : \`/help\` · \`/setup\` · \`/verifier-permissions\``
      ),
      separator(),
      langSelectRow,
      separator(),
      linksRow,
    ]);

    return { components: [card], flags: MessageFlags.IsComponentsV2 } as MessageCreateOptions;
  },

  findBestStaffChannel(guild: Guild): any {
    const botId = guild.client.user?.id || '';
    const channels = Array.from(guild.channels.cache.values()).filter((c: any) => {
      if (c.type !== ChannelType.GuildText && c.type !== ChannelType.GuildAnnouncement) return false;
      const perms = c.permissionsFor?.(botId) ?? c.permissionsFor?.(guild.members.me ?? botId);
      return perms?.has?.([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]) ?? true;
    });

    if (channels.length === 0) return null;

    const staffKeywords = [
      'moderator',
      'modo',
      'mod',
      'staff',
      'admin',
      'gestion',
      'private',
      'prive',
      'lead',
      'equipe',
      'bureau',
      'bot',
      'log',
      'system',
      'securite',
    ];

    const isStaffNamed = (name: string) => {
      const lower = (name || '').toLowerCase();
      return staffKeywords.some((kw) => lower.includes(kw));
    };

    const isPrivate = (c: any) => {
      const everyoneOverwrite =
        c.permissionOverwrites?.cache?.get?.(guild.roles.everyone.id) ??
        c.permissionOverwrites?.find?.((o: any) => o.id === guild.roles.everyone.id);
      if (!everyoneOverwrite) return false;
      const denied = everyoneOverwrite.deny;
      if (typeof denied?.has === 'function') return denied.has(PermissionFlagsBits.ViewChannel);
      if (Array.isArray(denied)) return denied.includes(PermissionFlagsBits.ViewChannel);
      return false;
    };

    const privateStaff = channels.find((c: any) => isPrivate(c) && isStaffNamed(c.name));
    if (privateStaff) return privateStaff;

    const anyPrivate = channels.find((c: any) => isPrivate(c));
    if (anyPrivate) return anyPrivate;

    const anyStaff = channels.find((c: any) => isStaffNamed(c.name));
    if (anyStaff) return anyStaff;

    if (
      guild.systemChannel &&
      channels.some((c: any) => c.id === guild.systemChannel?.id)
    ) {
      return guild.systemChannel;
    }

    return channels[0] || null;
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

  async sendJoinWelcome(guild: Guild): Promise<void> {
    try {
      const inviterId = await this.resolveInviterId(guild);
      const targetChannel = this.findBestStaffChannel(guild);

      if (targetChannel) {
        guildConfigService.updateConfig(guild.id, {
          systemChannelId: targetChannel.id,
        });

        const payload = this.buildJoinMessage(guild, inviterId, targetChannel.id);
        await targetChannel.send(payload).catch((err: any) => {
          logger.warn(`[Join] Envoi du message d'accueil impossible dans #${targetChannel.name} :`, err);
        });
        logger.success(`[Join] Message d'accueil envoyé dans #${targetChannel.name} sur ${guild.name}`);
        return;
      }

      if (inviterId) {
        const user = await guild.client.users.fetch(inviterId).catch(() => null);
        if (user) {
          const payload = this.buildJoinMessage(guild, inviterId, null);
          await user.send(payload).catch((err) => {
            logger.warn(`[Join] Envoi en MP impossible à l'inviteur (${inviterId}) :`, err);
          });
          logger.info(`[Join] Aucun salon accessible sur ${guild.name} : message envoyé en MP à l'inviteur.`);
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
        .setFooter({
          text: 'ETHONE',
          iconURL:
            interaction.client?.user?.displayAvatarURL?.({ extension: 'png', size: 128 }) || brandIcon('ethone'),
        });

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
        .setFooter({
          text: 'ETHONE',
          iconURL:
            interaction.client?.user?.displayAvatarURL?.({ extension: 'png', size: 128 }) || brandIcon('ethone'),
        });

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

    if (interaction.customId.startsWith('guild_join:open_card:')) {
      const payload = this.buildJoinMessage(guild, interaction.user.id, interaction.channelId);
      await interaction.reply({
        ...payload,
        flags: ((payload.flags as number) || MessageFlags.IsComponentsV2) | MessageFlags.Ephemeral,
      } as any);
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
              id: interaction.client?.user?.id || me.id,
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
        .setFooter({
          text: 'ETHONE',
          iconURL:
            interaction.client?.user?.displayAvatarURL?.({ extension: 'png', size: 128 }) || brandIcon('ethone'),
        });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
