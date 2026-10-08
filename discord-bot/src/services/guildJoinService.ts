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

/** Permissions sans lesquelles la protection ne fonctionne pas : elles décident de l'état « Opérationnel ». */
const CORE_PERMISSIONS = [
  PermissionFlagsBits.ViewAuditLog,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
];

export const guildJoinService = {
  buildJoinMessage(guild: Guild, inviterId?: string | null): MessageCreateOptions {
    const conf = guildConfigService.getConfig(guild.id);
    const botName = conf.botName || guild.members.me?.displayName || 'Etho';
    const me = guild.members.me;
    const ok = icon('a_check', '✅');
    const ko = icon('a_cross', '❌');

    const permsList = PERMISSION_CHECKS.map((item) => `${me?.permissions.has(item.flag) ? ok : ko} \`${item.name}\``);
    const hasCorePerms = CORE_PERMISSIONS.every((flag) => me?.permissions.has(flag));
    const missing = PERMISSION_CHECKS.filter((item) => !me?.permissions.has(item.flag)).length;

    const currentLang = (conf.language || 'fr') as SupportedLanguage;

    const channelSelectRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId(`guild_join:select_channel:${guild.id}`)
        .setPlaceholder('Choisir un salon existant…')
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
    );
    const createChannelRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`guild_join:create_channel:${guild.id}`)
        .setLabel('Créer le salon système')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Primary)
    );
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
      new ButtonBuilder().setLabel('Serveur support').setStyle(ButtonStyle.Link).setURL(SUPPORT_URL).setEmoji('🛟'),
      new ButtonBuilder()
        .setLabel('Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://ethone.dev/discord/?guildId=${guild.id}`)
        .setEmoji('📊')
    );

    // Components V2 : pas de `content`, la mention de l'inviteur est dans la carte (elle le notifie).
    const card = container(hasCorePerms ? 0x10b981 : 0xf59e0b, [
      inviterId ? text(`<@${inviterId}>`) : null,
      text(`## ${icon('a_logo', '🛡️')} | ${botName} ajouté avec succès`),
      separator(),
      text(`Merci d'avoir ajouté **${botName}** à votre serveur.`),
      text(
        `### 🪟 État actuel\n> **${hasCorePerms ? 'Opérationnel' : 'Permissions à compléter'}**\n> ${
          hasCorePerms
            ? 'Les permissions principales sont déjà en place.'
            : `${missing} permission${missing > 1 ? 's' : ''} recommandée${missing > 1 ? 's' : ''} manque${missing > 1 ? 'nt' : ''} au bot.`
        }`
      ),
      separator(),
      text(`### 🛡️ Permissions\n${permsList.map((l) => `> ${l}`).join('\n')}`),
      separator(),
      text(
        `### ${icon('a_warning', '⚠️')} Important\nPlace le rôle le plus haut de **${botName}** tout en haut de la hiérarchie pour qu'il puisse protéger, sanctionner et restaurer correctement le serveur.`
      ),
      separator(),
      text(
        `### ❔ Commandes utiles\n> \`/help\` · voir les commandes\n> \`/setup\` · configurer le bot\n> \`/language\` · changer la langue du bot`
      ),
      separator(),
      text(
        `### # Salon système ${botName}\nChoisis un salon existant ou crée-le automatiquement pour recevoir les messages importants du bot.`
      ),
      channelSelectRow,
      createChannelRow,
      separator(),
      text(
        `### ⚙️ Langue du bot\nChoisis la langue utilisée par ${botName} sur ce serveur. Les salons déjà créés ne sont pas renommés automatiquement.`
      ),
      langSelectRow,
      separator(),
      linksRow,
    ]);

    return { components: [card], flags: MessageFlags.IsComponentsV2 } as MessageCreateOptions;
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

  /**
   * Message d'arrivée visible uniquement par la personne qui a ajouté le bot : Discord ne permet pas de message
   * « éphémère » sans interaction, donc le bot crée un salon privé (seuls l'inviteur et le bot le voient ; les
   * administrateurs voient tous les salons par nature). Sans la permission « Gérer les salons », repli en message
   * privé à l'inviteur. Si l'inviteur est introuvable, rien n'est envoyé.
   */
  async sendJoinWelcome(guild: Guild): Promise<void> {
    try {
      const inviterId = await this.resolveInviterId(guild);
      if (!inviterId) return;
      const payload = this.buildJoinMessage(guild, inviterId);
      const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));

      if (me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
        const channel = await guild.channels
          .create({
            name: 'etho-bienvenue',
            type: ChannelType.GuildText,
            topic: `Configuration de ${me.displayName} : visible uniquement par la personne qui a ajouté le bot. Ce salon peut être supprimé.`,
            permissionOverwrites: [
              { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
              {
                id: inviterId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                deny: [PermissionFlagsBits.SendMessages],
              },
              {
                id: guild.client.user.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.EmbedLinks,
                  PermissionFlagsBits.ReadMessageHistory,
                ],
              },
            ],
            reason: "Message d'accueil privé pour la personne qui a ajouté le bot",
          })
          .catch((err) => {
            logger.warn(`[Join] Salon privé impossible sur ${guild.name} :`, err);
            return null;
          });
        if (channel) {
          await channel.send(payload);
          logger.success(`[Join] Message d'accueil privé envoyé sur ${guild.name} (#${channel.name})`);
          return;
        }
      }

      const user = await guild.client.users.fetch(inviterId).catch(() => null);
      if (user) {
        await user.send(payload).catch(() => null);
        logger.info(`[Join] Pas de salon privé possible sur ${guild.name} : message envoyé en MP à l'inviteur.`);
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
