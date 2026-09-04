import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  AnySelectMenuInteraction,
  VoiceChannel,
  TextChannel,
} from 'discord.js';
import { TemporaryVoiceRoom, VoiceTrackerSettings } from '../types/index.js';
import { voiceRepository } from '../storage/voiceRepository.js';
import { VoiceOwnershipService } from '../services/voiceOwnershipService.js';
import { VoicePermissionService } from '../services/voicePermissionService.js';
import { TemporaryVoiceService } from '../services/temporaryVoiceService.js';
import { logger } from '../../../utils/logger.js';

export class DiscordVoicePanel {
  /**
   * Generates the permanent Creation Panel embed & buttons for the dedicated text channel.
   */
  public static buildCreatePanel(settings?: VoiceTrackerSettings) {
    const embed = new EmbedBuilder()
      .setColor(0x6366f1) // Indigo ETHONE
      .setTitle('🎛️ Salons Vocaux Personnalisés 2.0')
      .setDescription(
        'Créez et contrôlez instantanément votre propre salon vocal temporaire !\n\n' +
        '**Comment ça marche ?**\n' +
        '1️⃣ Cliquez sur **Créer mon salon** ci-dessous.\n' +
        '2️⃣ Votre salon vocal privé est généré automatiquement.\n' +
        '3️⃣ Gérez votre salon en toute liberté grâce au **Panneau de Contrôle** situé dans le chat de votre salon (verrouillage, whitelist, expulsion, limite de membres...).\n' +
        '4️⃣ Dès que tout le monde quitte le salon, il est nettoyé automatiquement.'
      )
      .addFields(
        {
          name: '🔒 Sécurité & Liberté',
          value: 'Verrouillez votre salon, ajoutez des amis en Whitelist ou bannissez des importuns en 1 clic.',
          inline: true,
        },
        {
          name: '⚙️ Préférences Enregistrées',
          value: 'Configurez votre nom par défaut et votre limite une seule fois, ils seront réutilisés à chaque création.',
          inline: true,
        }
      )
      .setFooter({ text: 'ETHONE Voice Engine 2.0 • 100% interactif, 0 commande requise' })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('voice_create_room')
        .setLabel('Créer mon salon')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('voice_user_prefs')
        .setLabel('Mes préférences')
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('voice_help')
        .setLabel('Comment ça marche')
        .setEmoji('📖')
        .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
  }

  /**
   * Generates the in-channel Room Control Panel embed & action rows.
   */
  public static buildControlPanel(room: TemporaryVoiceRoom) {
    const embed = new EmbedBuilder()
      .setColor(room.isLocked ? 0xef4444 : 0x10b981)
      .setTitle(`🎙️ Panneau de Contrôle — ${room.name}`)
      .setDescription('Gérez votre salon temporaire sans aucune commande. Tous les boutons ci-dessous sont instantanés.')
      .addFields(
        { name: '👑 Propriétaire', value: room.ownerId === 'ownerless' ? 'Aucun' : `<@${room.ownerId}>`, inline: true },
        { name: '👥 Limite', value: room.userLimit > 0 ? `${room.userLimit} personnes` : 'Illimitée', inline: true },
        {
          name: '🛡️ État',
          value: `${room.isLocked ? '🔒 Verrouillé' : '🔓 Ouvert'} • ${room.isHidden ? '👁️ Masqué' : 'Visible'}`,
          inline: true,
        },
        {
          name: '📋 Sécurité',
          value: `Whitelist: **${(room.allowedUserIds || []).length}** • Banlist: **${(room.blockedUserIds || []).length}**`,
          inline: true,
        },
        {
          name: '🎧 Qualité & Débit',
          value: `${Math.round((room.bitrate || 64000) / 1000)} kbps`,
          inline: true,
        }
      )
      .setFooter({ text: 'ETHONE Personal Voice • Réservé au propriétaire & admins' })
      .setTimestamp();

    // Row 1: Basic quick controls (Lock, Hide, Rename, Limit, Delete)
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`voice_toggle_lock:${room.id}`)
        .setLabel(room.isLocked ? 'Déverrouiller' : 'Verrouiller')
        .setEmoji(room.isLocked ? '🔓' : '🔒')
        .setStyle(room.isLocked ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_toggle_hide:${room.id}`)
        .setLabel(room.isHidden ? 'Révéler' : 'Masquer')
        .setEmoji(room.isHidden ? '👁️' : '🕶️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_rename:${room.id}`)
        .setLabel('Renommer')
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_limit:${room.id}`)
        .setLabel('Limite')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_delete:${room.id}`)
        .setLabel('Supprimer')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger)
    );

    // Row 2: Moderation & Security (Whitelist, Banlist, Mute, Kick, Transfer)
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`voice_whitelist_prompt:${room.id}`)
        .setLabel('Whitelist')
        .setEmoji('🛡️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_banlist_prompt:${room.id}`)
        .setLabel('Banlist')
        .setEmoji('⛔')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_mute_prompt:${room.id}`)
        .setLabel('Mute')
        .setEmoji('🔇')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_kick_prompt:${room.id}`)
        .setLabel('Expulser')
        .setEmoji('🚫')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_transfer_prompt:${room.id}`)
        .setLabel('Transférer')
        .setEmoji('👑')
        .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row1, row2] };
  }

  /**
   * Sends the control panel message into newly created voice room text chat.
   */
  public static async sendPanelMessage(channel: VoiceChannel, room: TemporaryVoiceRoom) {
    try {
      const panel = this.buildControlPanel(room);
      const msg = await channel.send(panel);
      room.controlPanelMessageId = msg.id;
      voiceRepository.saveRoom(room);
    } catch (err) {
      logger.warn(`[DiscordVoicePanel] Impossible d'envoyer le message de panel dans ${channel.name}:`, err);
    }
  }

  /**
   * Handles button interactions starting with "voice_"
   */
  public static async handleButton(interaction: ButtonInteraction): Promise<void> {
    const customId = interaction.customId;
    const guild = interaction.guild;
    if (!guild) return;

    // --- 1. Creation Panel Buttons ---
    if (customId === 'voice_create_room') {
      const member = await guild.members.fetch(interaction.user.id).catch(() => null);
      if (!member) {
        await interaction.reply({ content: '❌ Impossible de récupérer vos informations de membre.', ephemeral: true });
        return;
      }

      // Check if user already owns an active room
      const userRooms = voiceRepository.getRoomsByOwner(guild.id, member.id);
      if (userRooms.length > 0) {
        const existingRoom = userRooms[0];
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`voice_delete:${existingRoom.id}`)
            .setLabel('Supprimer mon salon')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
          content: `⚠️ Vous possédez déjà un salon vocal actif : <#${existingRoom.id}> (${existingRoom.name}) !\nVous ne pouvez posséder qu'un seul salon actif à la fois.`,
          components: [row],
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      const result = await TemporaryVoiceService.createPersonalVoiceRoom(member);

      if (!result.success || !result.channel) {
        await interaction.editReply({
          content: result.message || '❌ Impossible de créer le salon vocal actuellement.',
        });
        return;
      }

      await interaction.editReply({
        content: `🎉 Votre salon vocal **${result.channel.name}** (<#${result.channel.id}>) est prêt !\n` +
          `👉 Retrouvez le **Panneau de Contrôle** directement dans le chat textuel de votre salon vocal pour le gérer.`,
      });
      return;
    }

    if (customId === 'voice_user_prefs') {
      const prefs = voiceRepository.getUserPreferences(interaction.user.id);
      const modal = new ModalBuilder()
        .setCustomId('modal_voice_user_prefs')
        .setTitle('Mes préférences vocales 2.0');

      const nameInput = new TextInputBuilder()
        .setCustomId('pref_name')
        .setLabel('Modèle de nom par défaut')
        .setPlaceholder('ex: 🎮 Salon de {username}')
        .setValue(prefs?.defaultName || '')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const limitInput = new TextInputBuilder()
        .setCustomId('pref_limit')
        .setLabel('Limite de membres par défaut (0-99)')
        .setPlaceholder('0 pour illimité')
        .setValue(prefs?.defaultLimit !== undefined ? prefs.defaultLimit.toString() : '0')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const lockedInput = new TextInputBuilder()
        .setCustomId('pref_locked')
        .setLabel('Verrouillé par défaut ? (oui / non)')
        .setPlaceholder('non')
        .setValue(prefs?.defaultLocked ? 'oui' : 'non')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(lockedInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (customId === 'voice_help') {
      const helpEmbed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle('📖 Comment fonctionne les Salons Personnalisés 2.0 ?')
        .setDescription(
          '**1. Création simple et instantanée**\n' +
          'Cliquez sur **Créer mon salon**. Le bot crée immédiatement un salon vocal avec votre nom et vos préférences.\n\n' +
          '**2. Si vous êtes déjà en vocal**\n' +
          'Vous serez automatiquement transféré dans votre nouveau salon sans coupure audio.\n\n' +
          '**3. Panneau de Contrôle 100% interactif**\n' +
          'Dans le chat du salon vocal, un message interactif complet vous attend :\n' +
          '• 🔒 **Verrouiller / Déverrouiller** : empêche les membres non autorisés d\'entrer.\n' +
          '• 🛡️ **Whitelist** : autorise nominativement vos amis même si le salon est verrouillé.\n' +
          '• ⛔ **Banlist** : interdit l\'accès et expulse immédiatement l\'utilisateur indésirable.\n' +
          '• ✏️ **Renommer & Limite** : changez le nom ou le nombre de places.\n' +
          '• 🔇 **Mute & Expulsion** : gérez les membres présents.\n' +
          '• 👑 **Transférer** : cédez la gestion du salon à un autre membre.\n\n' +
          '**4. Nettoyage intelligent**\n' +
          'Dès que le salon est vide, un compte à rebours de sécurité se déclenche. Si personne ne revient, le salon est automatiquement supprimé.'
        )
        .setFooter({ text: 'ETHONE Discord Suite' });

      await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
      return;
    }

    // --- 2. Room Control Panel Buttons ---
    const parts = customId.split(':');
    const action = parts[0];
    const roomId = parts[1] || interaction.channelId;

    const room = voiceRepository.getRoomById(roomId);
    if (!room || room.status === 'DELETED') {
      await interaction.reply({ content: "❌ Ce salon temporaire n'existe plus ou a été supprimé.", ephemeral: true });
      return;
    }

    const member = interaction.member as any;
    if (!VoiceOwnershipService.canManageRoom(room, member)) {
      await interaction.reply({
        content: '🔒 Vous devez être le **propriétaire** de ce salon ou administrateur pour utiliser ce panneau.',
        ephemeral: true,
      });
      return;
    }

    const channel = guild.channels.cache.get(room.id) as VoiceChannel | undefined;

    if (action === 'voice_toggle_lock') {
      room.isLocked = !room.isLocked;
      voiceRepository.saveRoom(room);

      if (channel) {
        await VoicePermissionService.applyLock(channel, room.isLocked);
        if (room.allowedUserIds?.length) {
          await VoicePermissionService.applyWhitelist(channel, room.allowedUserIds);
        }
      }

      voiceRepository.addTimelineEvent({
        roomId: room.id,
        guildId: room.guildId,
        type: room.isLocked ? 'ROOM_LOCKED' : 'ROOM_UNLOCKED',
        actorId: member.id,
        actorTag: member.user?.tag || interaction.user.tag,
        details: room.isLocked ? 'Salon verrouillé' : 'Salon déverrouillé',
      });

      const updatedPanel = this.buildControlPanel(room);
      await interaction.update(updatedPanel);
      return;
    }

    if (action === 'voice_toggle_hide') {
      room.isHidden = !room.isHidden;
      voiceRepository.saveRoom(room);

      if (channel) {
        await VoicePermissionService.applyHide(channel, room.isHidden);
        if (room.allowedUserIds?.length) {
          await VoicePermissionService.applyWhitelist(channel, room.allowedUserIds);
        }
      }

      voiceRepository.addTimelineEvent({
        roomId: room.id,
        guildId: room.guildId,
        type: room.isHidden ? 'ROOM_HIDDEN' : 'ROOM_UNHIDDEN',
        actorId: member.id,
        actorTag: member.user?.tag || interaction.user.tag,
      });

      const updatedPanel = this.buildControlPanel(room);
      await interaction.update(updatedPanel);
      return;
    }

    if (action === 'voice_rename') {
      const modal = new ModalBuilder()
        .setCustomId(`modal_voice_rename:${room.id}`)
        .setTitle('Renommer votre salon vocal');

      const nameInput = new TextInputBuilder()
        .setCustomId('new_name')
        .setLabel('Nouveau nom du salon')
        .setStyle(TextInputStyle.Short)
        .setValue(room.name)
        .setMaxLength(100)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput));
      await interaction.showModal(modal);
      return;
    }

    if (action === 'voice_limit') {
      const modal = new ModalBuilder()
        .setCustomId(`modal_voice_limit:${room.id}`)
        .setTitle('Modifier la limite de membres');

      const limitInput = new TextInputBuilder()
        .setCustomId('new_limit')
        .setLabel('Limite (0 pour illimité, max 99)')
        .setStyle(TextInputStyle.Short)
        .setValue(room.userLimit.toString())
        .setMaxLength(2)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput));
      await interaction.showModal(modal);
      return;
    }

    if (action === 'voice_delete') {
      await interaction.reply({ content: '🗑️ Suppression immédiate de votre salon vocal...', ephemeral: true });
      await TemporaryVoiceService.deleteRoomChannel(guild, room.id, `Supprimé par ${interaction.user.tag}`);
      return;
    }

    // --- Sub-prompts: Whitelist, Banlist, Mute, Kick, Transfer ---
    if (action === 'voice_whitelist_prompt') {
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(`voice_whitelist_select:${room.id}`)
        .setPlaceholder('Sélectionnez un membre à ajouter en Whitelist')
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);
      await interaction.reply({
        content: '🛡️ **Gestion de la Whitelist** : Sélectionnez le membre à autoriser même si le salon est verrouillé.',
        components: [row],
        ephemeral: true,
      });
      return;
    }

    if (action === 'voice_banlist_prompt') {
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(`voice_banlist_select:${room.id}`)
        .setPlaceholder('Sélectionnez un membre à bannir du salon')
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);
      await interaction.reply({
        content: '⛔ **Gestion de la Banlist** : Sélectionnez le membre à interdire (il sera également expulsé immédiatement).',
        components: [row],
        ephemeral: true,
      });
      return;
    }

    if (action === 'voice_mute_prompt') {
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(`voice_mute_select:${room.id}`)
        .setPlaceholder('Sélectionnez un membre à rendre muet / rétablir la parole')
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);
      await interaction.reply({
        content: '🔇 **Gestion Audio** : Sélectionnez un membre connecté pour couper son micro.',
        components: [row],
        ephemeral: true,
      });
      return;
    }

    if (action === 'voice_kick_prompt') {
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(`voice_kick_select:${room.id}`)
        .setPlaceholder('Sélectionnez un membre à expulser du salon')
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);
      await interaction.reply({
        content: '🚫 **Expulsion** : Sélectionnez un membre connecté pour le déconnecter du salon.',
        components: [row],
        ephemeral: true,
      });
      return;
    }

    if (action === 'voice_transfer_prompt') {
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(`voice_transfer_select:${room.id}`)
        .setPlaceholder('Sélectionnez le nouveau propriétaire du salon')
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);
      await interaction.reply({
        content: '👑 **Transfert de Propriété** : Sélectionnez le membre à qui léguer le contrôle total du salon.',
        components: [row],
        ephemeral: true,
      });
      return;
    }
  }

  /**
   * Handles Select Menu interactions for Voice (Whitelist, Banlist, Mute, Kick, Transfer)
   */
  public static async handleSelectMenu(interaction: AnySelectMenuInteraction): Promise<void> {
    const customId = interaction.customId;
    const guild = interaction.guild;
    if (!guild) return;

    const parts = customId.split(':');
    const action = parts[0];
    const roomId = parts[1];

    const room = voiceRepository.getRoomById(roomId);
    if (!room || room.status === 'DELETED') {
      await interaction.reply({ content: '❌ Ce salon temporaire n\'existe plus.', ephemeral: true });
      return;
    }

    const member = interaction.member as any;
    if (!VoiceOwnershipService.canManageRoom(room, member)) {
      await interaction.reply({
        content: '🔒 Vous devez être le propriétaire de ce salon pour effectuer cette action.',
        ephemeral: true,
      });
      return;
    }

    const channel = guild.channels.cache.get(room.id) as VoiceChannel | undefined;
    const targetUserId = interaction.values[0];
    if (!targetUserId) {
      await interaction.reply({ content: '❌ Aucun membre sélectionné.', ephemeral: true });
      return;
    }

    if (action === 'voice_whitelist_select') {
      voiceRepository.addToWhitelist(room.id, targetUserId, interaction.user.id, interaction.user.tag);
      if (channel) {
        await VoicePermissionService.setUserAccess(channel, targetUserId, 'allow');
      }
      await interaction.reply({
        content: `✅ <@${targetUserId}> a été ajouté à la **Whitelist** de votre salon vocal.`,
        ephemeral: true,
      });
      return;
    }

    if (action === 'voice_banlist_select') {
      if (targetUserId === room.ownerId) {
        await interaction.reply({ content: '❌ Vous ne pouvez pas vous bannir vous-même !', ephemeral: true });
        return;
      }
      voiceRepository.addToBanlist(room.id, targetUserId, interaction.user.id, interaction.user.tag);
      if (channel) {
        await VoicePermissionService.setUserAccess(channel, targetUserId, 'block');
      }
      await interaction.reply({
        content: `⛔ <@${targetUserId}> a été **banni** de votre salon vocal et expulsé s'il était présent.`,
        ephemeral: true,
      });
      return;
    }

    if (action === 'voice_mute_select') {
      if (channel) {
        const targetMember = channel.members.get(targetUserId);
        if (!targetMember) {
          await interaction.reply({ content: '❌ Ce membre n\'est pas connecté dans votre salon vocal.', ephemeral: true });
          return;
        }
        const isMuted = targetMember.voice.serverMute;
        await VoicePermissionService.muteMember(channel, targetUserId, !isMuted);
        await interaction.reply({
          content: `🔊 <@${targetUserId}> a été **${!isMuted ? 'rendu muet' : 'démuté'}**.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({ content: '❌ Salon vocal introuvable sur Discord.', ephemeral: true });
      }
      return;
    }

    if (action === 'voice_kick_select') {
      if (targetUserId === room.ownerId) {
        await interaction.reply({ content: '❌ Vous ne pouvez pas vous expulser vous-même !', ephemeral: true });
        return;
      }
      if (channel) {
        const kicked = await VoicePermissionService.kickMember(channel, targetUserId, `Expulsé par ${interaction.user.tag}`);
        if (kicked) {
          voiceRepository.addTimelineEvent({
            roomId: room.id,
            guildId: room.guildId,
            type: 'USER_KICKED',
            actorId: interaction.user.id,
            actorTag: interaction.user.tag,
            targetId: targetUserId,
          });
          await interaction.reply({ content: `🚫 <@${targetUserId}> a été expulsé du salon vocal.`, ephemeral: true });
        } else {
          await interaction.reply({ content: '❌ Ce membre n\'est pas connecté dans votre salon vocal.', ephemeral: true });
        }
      } else {
        await interaction.reply({ content: '❌ Salon vocal introuvable.', ephemeral: true });
      }
      return;
    }

    if (action === 'voice_transfer_select') {
      if (targetUserId === room.ownerId) {
        await interaction.reply({ content: '❌ Vous êtes déjà le propriétaire de ce salon.', ephemeral: true });
        return;
      }
      const targetUser = await guild.members.fetch(targetUserId).catch(() => null);
      const targetTag = targetUser?.user.tag || `User_${targetUserId}`;

      VoiceOwnershipService.transferOwnership(
        room,
        { id: targetUserId, tag: targetTag },
        { id: interaction.user.id, tag: interaction.user.tag },
        'Transfert volontaire par le propriétaire'
      );

      // Re-apply channel permissions for new owner
      if (channel && targetUser) {
        await channel.permissionOverwrites.edit(targetUserId, {
          ViewChannel: true,
          Connect: true,
          Speak: true,
          Stream: true,
        });
      }

      await interaction.reply({
        content: `👑 La propriété de votre salon a été transmise avec succès à <@${targetUserId}> !`,
        ephemeral: true,
      });
      return;
    }
  }

  /**
   * Handles modal submissions starting with "modal_voice_"
   */
  public static async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    const customId = interaction.customId;
    const guild = interaction.guild;
    if (!guild) return;

    if (customId === 'modal_voice_user_prefs') {
      const defaultName = interaction.fields.getTextInputValue('pref_name')?.trim() || undefined;
      const rawLimit = interaction.fields.getTextInputValue('pref_limit')?.trim();
      const rawLocked = interaction.fields.getTextInputValue('pref_locked')?.trim().toLowerCase();

      let defaultLimit: number | undefined = undefined;
      if (rawLimit) {
        const parsed = parseInt(rawLimit, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 99) {
          defaultLimit = parsed;
        }
      }

      let defaultLocked: boolean | undefined = undefined;
      if (rawLocked === 'oui' || rawLocked === 'yes' || rawLocked === 'true' || rawLocked === '1') {
        defaultLocked = true;
      } else if (rawLocked === 'non' || rawLocked === 'no' || rawLocked === 'false' || rawLocked === '0') {
        defaultLocked = false;
      }

      voiceRepository.saveUserPreferences({
        userId: interaction.user.id,
        defaultName,
        defaultLimit,
        defaultLocked,
        updatedAt: new Date().toISOString(),
      });

      await interaction.reply({
        content: '✅ Vos préférences de salon vocal ont été enregistrées avec succès ! Elles seront appliquées lors de votre prochaine création.',
        ephemeral: true,
      });
      return;
    }

    const parts = customId.split(':');
    const action = parts[0];
    const roomId = parts[1];

    const room = voiceRepository.getRoomById(roomId);
    if (!room || room.status === 'DELETED') {
      await interaction.reply({ content: '❌ Salon introuvable ou supprimé.', ephemeral: true });
      return;
    }

    const channel = guild.channels.cache.get(room.id) as VoiceChannel | undefined;

    if (action === 'modal_voice_rename') {
      const newName = interaction.fields.getTextInputValue('new_name').trim();
      if (!newName) {
        await interaction.reply({ content: '❌ Nom invalide.', ephemeral: true });
        return;
      }

      room.name = newName;
      voiceRepository.saveRoom(room);

      if (channel) {
        await channel.setName(newName).catch((err) => {
          logger.warn(`[DiscordVoicePanel] Impossible de renommer sur Discord:`, err);
        });
      }

      voiceRepository.addTimelineEvent({
        roomId: room.id,
        guildId: room.guildId,
        type: 'ROOM_RENAMED',
        actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        details: `Nouveau nom: "${newName}"`,
      });

      await interaction.reply({ content: `✅ Salon renommé en **${newName}**.`, ephemeral: true });
      return;
    }

    if (action === 'modal_voice_limit') {
      const raw = interaction.fields.getTextInputValue('new_limit').trim();
      const limit = parseInt(raw, 10);
      if (isNaN(limit) || limit < 0 || limit > 99) {
        await interaction.reply({ content: '❌ Limite invalide (doit être un nombre entre 0 et 99).', ephemeral: true });
        return;
      }

      room.userLimit = limit;
      voiceRepository.saveRoom(room);

      if (channel) {
        await channel.setUserLimit(limit).catch(() => null);
      }

      voiceRepository.addTimelineEvent({
        roomId: room.id,
        guildId: room.guildId,
        type: 'LIMIT_CHANGED',
        actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        details: `Nouvelle limite: ${limit === 0 ? 'Illimitée' : limit}`,
      });

      await interaction.reply({
        content: `✅ Limite fixée à **${limit === 0 ? 'illimitée' : limit + ' personnes'}**.`,
        ephemeral: true,
      });
      return;
    }
  }
}
