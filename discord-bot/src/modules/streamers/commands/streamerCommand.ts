import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { streamerStorage } from '../storage/streamerStorage.js';
import { streamerService } from '../services/streamerService.js';
import { StreamPlatform } from '../types/streamer.js';
import { getAppEmoji } from '../../../services/appEmojis.js';
import { BRAND_COLORS } from '../../../utils/embeds.js';
import { SLASH_DESTINATION_TYPES } from '../../../utils/channelSend.js';

export const streamerCommand: Command = {
  name: 'streamer',
  description: 'Gère les alertes de streaming en direct (Twitch, YouTube, Kick).',
  category: 'Communauté',
  aliases: ['stream', 'streams', 'live-alerts'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('streamer')
    .setDescription('Gère les alertes de streaming en direct (Twitch, YouTube, Kick).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Ajoute un streamer à surveiller pour les alertes de live')
        .addStringOption((opt) =>
          opt
            .setName('plateforme')
            .setDescription('La plateforme de diffusion')
            .setRequired(true)
            .addChoices(
              { name: 'Twitch (Twitch.tv)', value: 'twitch' },
              { name: 'YouTube (YouTube Live)', value: 'youtube' },
              { name: 'Kick (Kick.com)', value: 'kick' }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName('chaine')
            .setDescription('Pseudo ou nom de chaîne (ex: shroud, gotaga, zerator)')
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName('salon')
            .setDescription('Salon d\'alerte spécifique (laisser vide pour le salon par défaut)')
            .addChannelTypes(...SLASH_DESTINATION_TYPES)
            .setRequired(false)
        )
        .addRoleOption((opt) =>
          opt
            .setName('role_ping')
            .setDescription('Rôle à mentionner lors de la prise d\'antenne')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('Message personnalisé ({streamer}, {game}, {url})')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Retire un streamer de la liste de surveillance')
        .addStringOption((opt) =>
          opt
            .setName('plateforme')
            .setDescription('La plateforme de diffusion')
            .setRequired(true)
            .addChoices(
              { name: 'Twitch', value: 'twitch' },
              { name: 'YouTube', value: 'youtube' },
              { name: 'Kick', value: 'kick' }
            )
        )
        .addStringOption((opt) =>
          opt.setName('chaine').setDescription('Pseudo ou identifiant de la chaîne').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('Affiche la liste de tous les streamers configurés')
    )
    .addSubcommand((sub) =>
      sub
        .setName('check')
        .setDescription('Vérifie immédiatement le statut en direct d\'une chaîne et génère un aperçu')
        .addStringOption((opt) =>
          opt
            .setName('plateforme')
            .setDescription('Plateforme')
            .setRequired(true)
            .addChoices(
              { name: 'Twitch', value: 'twitch' },
              { name: 'YouTube', value: 'youtube' },
              { name: 'Kick', value: 'kick' }
            )
        )
        .addStringOption((opt) =>
          opt.setName('chaine').setDescription('Pseudo du créateur').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('Configure les options globales du module Streamers')
        .addBooleanOption((opt) =>
          opt.setName('activer').setDescription('Activer ou désactiver le module').setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName('salon_defaut')
            .setDescription('Salon d\'annonces par défaut')
            .addChannelTypes(...SLASH_DESTINATION_TYPES)
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('ping_defaut')
            .setDescription('Type de mention par défaut')
            .setRequired(false)
            .addChoices(
              { name: 'Aucun', value: 'none' },
              { name: '@here', value: 'here' },
              { name: '@everyone', value: 'everyone' },
              { name: 'Rôle dédié', value: 'role' }
            )
        )
        .addRoleOption((opt) =>
          opt.setName('role_defaut').setDescription('Rôle mentionné par défaut').setRequired(false)
        )
        .addRoleOption((opt) =>
          opt
            .setName('role_live')
            .setDescription('Rôle @En Live attribué automatiquement aux membres pendant leur stream')
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName('role_live_auto')
            .setDescription('Activer l\'attribution automatique du rôle @En Live')
            .setRequired(false)
        )
    ),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) return;
    const guildId = ctx.guild.id;

    if (!ctx.isSlash || !ctx.interaction) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription('Cette commande s\'utilise uniquement via `/streamer`.')],
        ephemeral: true,
      });
      return;
    }

    const interaction = ctx.interaction as ChatInputCommandInteraction;
    const sub = interaction.options.getSubcommand();
    const config = streamerStorage.getConfig(guildId);

    const checkEmoji = getAppEmoji('etho_a_check') || '✅';
    const errorEmoji = getAppEmoji('etho_a_cross') || '❌';
    const sparklesEmoji = getAppEmoji('etho_a_sparkles') || '✨';
    const onlineEmoji = getAppEmoji('etho_a_online') || '🔴';

    if (sub === 'add') {
      const platform = interaction.options.getString('plateforme', true) as StreamPlatform;
      const username = interaction.options.getString('chaine', true).trim();
      const channel = interaction.options.getChannel('salon');
      const role = interaction.options.getRole('role_ping');
      const message = interaction.options.getString('message');

      const existing = streamerStorage.getStreamers(guildId).find(
        (s) => s.platform === platform && s.username.toLowerCase() === username.toLowerCase()
      );
      if (existing) {
        await ctx.reply({
          embeds: [
            ctx
              .createEmbed('error')
              .setDescription(`${errorEmoji} La chaîne **${username}** sur **${platform.toUpperCase()}** est déjà enregistrée.`),
          ],
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      // Sonde initiale pour valider l'existence
      const probe = await streamerService.fetchLiveStatus(platform, username);

      const added = streamerStorage.addStreamer({
        guildId,
        platform,
        username,
        displayName: probe.displayName,
        channelId: channel ? channel.id : null,
        pingRoleId: role ? role.id : null,
        customMessage: message || null,
        isLive: probe.isLive,
        title: probe.title || null,
        game: probe.game || null,
        viewers: probe.viewers || null,
        thumbnailUrl: probe.thumbnailUrl || null,
        avatarUrl: probe.avatarUrl || null,
        streamUrl: probe.streamUrl,
        lastAlertChannelId: null,
        lastAlertMessageId: null,
        lastLiveAt: probe.isLive ? new Date().toISOString() : null,
        lastStreamId: probe.streamId || null,
      });

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.success)
        .setTitle(`${checkEmoji} Streamer ajouté avec succès`)
        .setDescription(
          `La chaîne **${added.displayName || added.username}** (${platform.toUpperCase()}) a été ajoutée aux alertes !\n\n` +
            `📍 **Salon d'annonce :** ${added.channelId ? `<#${added.channelId}>` : config.defaultChannelId ? `<#${config.defaultChannelId}> (défaut)` : '*Aucun salon configuré*'}\n` +
            `🔔 **Notification :** ${added.pingRoleId ? `<@&${added.pingRoleId}>` : config.defaultPing}\n` +
            `📡 **Statut actuel :** ${probe.isLive ? `${onlineEmoji} **EN DIRECT** (${probe.viewers} spectateurs)` : '⚫ Hors ligne'}`
        )
        .setThumbnail(probe.avatarUrl || null)
        .setFooter({ text: 'ETHONE Streamers · Alertes automatiques 24/7' });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'remove') {
      const platform = interaction.options.getString('plateforme', true) as StreamPlatform;
      const username = interaction.options.getString('chaine', true).trim();
      const id = `${guildId}:${platform}:${username.toLowerCase()}`;

      const deleted = streamerStorage.removeStreamer(guildId, id);
      if (!deleted) {
        await ctx.reply({
          embeds: [
            ctx
              .createEmbed('error')
              .setDescription(`${errorEmoji} Aucun streamer trouvé pour **${username}** sur **${platform.toUpperCase()}**.`),
          ],
          ephemeral: true,
        });
        return;
      }

      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setDescription(`${checkEmoji} La chaîne **${username}** (${platform.toUpperCase()}) a été retirée des alertes.`),
        ],
      });
      return;
    }

    if (sub === 'list') {
      const list = streamerStorage.getStreamers(guildId);
      if (list.length === 0) {
        await ctx.reply({
          embeds: [
            ctx
              .createEmbed('info')
              .setTitle('📡 Aucun streamer configuré')
              .setDescription(
                'Ajoutez votre premier créateur avec `/streamer add <plateforme> <chaine>` ou rendez-vous sur le Dashboard dans le module **Streamers** !'
              ),
          ],
          ephemeral: true,
        });
        return;
      }

      const lines = list.map((s) => {
        const platBadge = s.platform === 'twitch' ? '🟣 Twitch' : s.platform === 'youtube' ? '🔴 YouTube' : '🟢 Kick';
        const statusBadge = s.isLive ? `${onlineEmoji} **LIVE**` : '⚫ Hors ligne';
        const channelMention = s.channelId ? `<#${s.channelId}>` : config.defaultChannelId ? `<#${config.defaultChannelId}>` : '*Non défini*';
        return `• **[${s.displayName || s.username}](${s.streamUrl})** (${platBadge}) — ${statusBadge}\n  ↳ Salon : ${channelMention} | Pings : ${s.pingRoleId ? `<@&${s.pingRoleId}>` : config.defaultPing}`;
      });

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.primary)
        .setTitle(`📡 Streamers surveillés (${list.length})`)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `Module ${config.enabled ? 'Activé' : 'Désactivé'} · Surveillance toutes les 2 min` })
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'check') {
      const platform = interaction.options.getString('plateforme', true) as StreamPlatform;
      const username = interaction.options.getString('chaine', true).trim();

      await interaction.deferReply();
      const status = await streamerService.fetchLiveStatus(platform, username);

      const embed = new EmbedBuilder()
        .setColor(status.isLive ? 0x10b981 : 0x64748b)
        .setTitle(`${status.isLive ? onlineEmoji : '⚫'} ${status.displayName} (${platform.toUpperCase()})`)
        .setURL(status.streamUrl)
        .setDescription(
          status.isLive
            ? `🔥 **EN DIRECT ACTUELLEMENT !**\n\n` +
                `**Titre :** ${status.title || 'Non renseigné'}\n` +
                `🎮 **Jeu :** \`${status.game || 'Général'}\`\n` +
                `👥 **Spectateurs :** \`${status.viewers?.toLocaleString('fr-FR') || 0}\`\n\n` +
                `➡️ [Cliquez pour regarder le stream](${status.streamUrl})`
            : `Ce créateur est actuellement **hors ligne** sur **${platform.toUpperCase()}**.\n` +
                `L'alerte Discord sera automatiquement émise dès le début du live.`
        );

      if (status.thumbnailUrl) embed.setImage(status.thumbnailUrl);
      if (status.avatarUrl) embed.setThumbnail(status.avatarUrl);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'config') {
      const enabled = interaction.options.getBoolean('activer');
      const defaultChannel = interaction.options.getChannel('salon_defaut');
      const defaultPing = interaction.options.getString('ping_defaut');
      const defaultRole = interaction.options.getRole('role_defaut');
      const liveRole = interaction.options.getRole('role_live');
      const autoLiveRole = interaction.options.getBoolean('role_live_auto');

      const patch: any = {};
      if (enabled !== null) patch.enabled = enabled;
      if (defaultChannel !== null) patch.defaultChannelId = defaultChannel.id;
      if (defaultPing !== null) patch.defaultPing = defaultPing;
      if (defaultRole !== null) patch.defaultRoleId = defaultRole.id;
      if (liveRole !== null) patch.liveRoleId = liveRole.id;
      if (autoLiveRole !== null) patch.autoLiveRoleEnabled = autoLiveRole;

      const updated = streamerStorage.updateConfig(guildId, patch);

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.success)
        .setTitle(`${checkEmoji} Configuration Streamers mise à jour`)
        .setDescription(
          `• **Statut du module :** ${updated.enabled ? '✅ Activé' : '❌ Désactivé'}\n` +
            `• **Salon par défaut :** ${updated.defaultChannelId ? `<#${updated.defaultChannelId}>` : '*Aucun*'}\n` +
            `• **Mention par défaut :** \`${updated.defaultPing}\`${updated.defaultRoleId ? ` (<@&${updated.defaultRoleId}>)` : ''}\n` +
            `• **Rôle @En Live auto :** ${updated.autoLiveRoleEnabled && updated.liveRoleId ? `<@&${updated.liveRoleId}> (Actif)` : '*Désactivé*'}`
        );

      await ctx.reply({ embeds: [embed] });
    }
  },
};
