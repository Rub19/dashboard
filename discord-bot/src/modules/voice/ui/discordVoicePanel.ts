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
  VoiceChannel,
} from 'discord.js';
import { TemporaryVoiceRoom } from '../types/index.js';
import { voiceRepository } from '../storage/voiceRepository.js';
import { VoiceOwnershipService } from '../services/voiceOwnershipService.js';
import { VoicePermissionService } from '../services/voicePermissionService.js';
import { logger } from '../../../utils/logger.js';

export class DiscordVoicePanel {
  /**
   * Generates the Discord embed and action rows for a voice room control panel.
   */
  public static buildPanel(room: TemporaryVoiceRoom) {
    const embed = new EmbedBuilder()
      .setColor(room.isLocked ? 0xef4444 : 0x10b981)
      .setTitle(`🎙️ Contrôle Vocal — ${room.name}`)
      .setDescription('Gérez votre salon temporaire directement depuis Discord.')
      .addFields(
        { name: '👑 Propriétaire', value: room.ownerId === 'ownerless' ? 'Aucun' : `<@${room.ownerId}>`, inline: true },
        { name: '👥 Capacité', value: room.userLimit > 0 ? `${room.userLimit} membres` : 'Illimitée', inline: true },
        {
          name: '🛡️ Accès',
          value: `${room.isLocked ? '🔒 Verrouillé' : '🔓 Ouvert'} • ${room.isHidden ? '👁️ Masqué' : 'Visible'}`,
          inline: true,
        }
      )
      .setFooter({ text: 'ETHONE Voice Engine 2.0 • Contrôle en temps réel' })
      .setTimestamp();

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`voice_rename:${room.id}`)
        .setLabel('Renommer')
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_toggle_lock:${room.id}`)
        .setLabel(room.isLocked ? 'Déverrouiller' : 'Verrouiller')
        .setEmoji(room.isLocked ? '🔓' : '🔒')
        .setStyle(room.isLocked ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_toggle_hide:${room.id}`)
        .setLabel(room.isHidden ? 'Rendre visible' : 'Masquer')
        .setEmoji(room.isHidden ? '👁️' : '🕶️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_limit:${room.id}`)
        .setLabel('Limite')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`voice_transfer:${room.id}`)
        .setLabel('Transférer')
        .setEmoji('👑')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_kick:${room.id}`)
        .setLabel('Expulser')
        .setEmoji('🚫')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`voice_delete:${room.id}`)
        .setLabel('Supprimer')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row1, row2] };
  }

  /**
   * Sends the control panel message into the newly created voice room text chat.
   */
  public static async sendPanelMessage(channel: VoiceChannel, room: TemporaryVoiceRoom) {
    try {
      const panel = this.buildPanel(room);
      await channel.send(panel);
    } catch (err) {
      logger.warn(`[DiscordVoicePanel] Impossible d'envoyer le message de panel dans ${channel.name}:`, err);
    }
  }

  /**
   * Handles button interactions starting with "voice_"
   */
  public static async handleButton(interaction: ButtonInteraction): Promise<void> {
    const parts = interaction.customId.split(':');
    const action = parts[0];
    const roomId = parts[1] || interaction.channelId;

    const room = voiceRepository.getRoomById(roomId);
    if (!room || room.status === 'DELETED') {
      await interaction.reply({ content: "❌ Ce salon temporaire n'existe plus.", ephemeral: true });
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

    const channel = interaction.guild?.channels.cache.get(room.id) as VoiceChannel | undefined;

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

    if (action === 'voice_toggle_lock') {
      room.isLocked = !room.isLocked;
      voiceRepository.saveRoom(room);

      if (channel) {
        await VoicePermissionService.applyLock(channel, room.isLocked);
      }

      voiceRepository.addTimelineEvent({
        roomId: room.id,
        guildId: room.guildId,
        type: room.isLocked ? 'ROOM_LOCKED' : 'ROOM_UNLOCKED',
        actorId: member.id,
        actorTag: member.user.tag,
        details: room.isLocked ? 'Salon verrouillé' : 'Salon déverrouillé',
      });

      const updatedPanel = this.buildPanel(room);
      await interaction.update(updatedPanel);
      return;
    }

    if (action === 'voice_toggle_hide') {
      room.isHidden = !room.isHidden;
      voiceRepository.saveRoom(room);

      if (channel) {
        await VoicePermissionService.applyHide(channel, room.isHidden);
      }

      voiceRepository.addTimelineEvent({
        roomId: room.id,
        guildId: room.guildId,
        type: room.isHidden ? 'ROOM_HIDDEN' : 'ROOM_UNHIDDEN',
        actorId: member.id,
        actorTag: member.user.tag,
      });

      const updatedPanel = this.buildPanel(room);
      await interaction.update(updatedPanel);
      return;
    }

    if (action === 'voice_delete') {
      await interaction.reply({ content: '🗑️ Suppression du salon en cours...', ephemeral: true });
      if (channel) {
        await channel.delete('Supprimé par le propriétaire via le Voice Panel').catch(() => null);
      }
      voiceRepository.deleteRoom(room.id);
      return;
    }

    if (action === 'voice_kick') {
      await interaction.reply({
        content: 'ℹ️ Pour expulser un membre, utilisez le dashboard ETHONE ou déplacez-le hors du salon.',
        ephemeral: true,
      });
      return;
    }

    if (action === 'voice_transfer') {
      await interaction.reply({
        content: '👑 Pour transférer la propriété, utilisez le dashboard ETHONE `/discord/voice`.',
        ephemeral: true,
      });
      return;
    }
  }

  /**
   * Handles modal submissions starting with "modal_voice_"
   */
  public static async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parts = interaction.customId.split(':');
    const action = parts[0];
    const roomId = parts[1];

    const room = voiceRepository.getRoomById(roomId);
    if (!room || room.status === 'DELETED') {
      await interaction.reply({ content: '❌ Salon introuvable ou supprimé.', ephemeral: true });
      return;
    }

    const channel = interaction.guild?.channels.cache.get(room.id) as VoiceChannel | undefined;

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
        content: `✅ Limite fixée à **${limit === 0 ? 'illimitée' : limit + ' membres'}**.`,
        ephemeral: true,
      });
      return;
    }
  }
}
