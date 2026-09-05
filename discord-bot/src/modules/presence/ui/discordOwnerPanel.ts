import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  EmbedBuilder,
  Message,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import { config } from '../../../config.js';
import { PresenceService } from '../services/presenceService.js';
import { ActivityRotationEngine } from '../services/activityRotationEngine.js';
import { PresenceSchedulerService } from '../services/presenceSchedulerService.js';
import { SmartPresenceEngine } from '../services/smartPresenceEngine.js';
import { logger } from '../../../utils/logger.js';

export class DiscordOwnerPanel {
  private static instance: DiscordOwnerPanel;

  public static getInstance(): DiscordOwnerPanel {
    if (!DiscordOwnerPanel.instance) {
      DiscordOwnerPanel.instance = new DiscordOwnerPanel();
    }
    return DiscordOwnerPanel.instance;
  }

  public buildPanelEmbed(): EmbedBuilder {
    const presenceService = PresenceService.getInstance();
    const current = presenceService.getCurrentState();
    const rotationEngine = ActivityRotationEngine.getInstance();
    const rotConfig = rotationEngine.getConfig();

    const statusEmoji =
      current.status === 'online'
        ? '🟢 En Ligne'
        : current.status === 'idle'
        ? '🌙 Inactif'
        : current.status === 'dnd'
        ? '⛔ Ne Pas Déranger'
        : '⚫ Invisible';

    return new EmbedBuilder()
      .setTitle('🤖 ETHONE BOT CONTROL — PRESENCE & IDENTITY')
      .setDescription(
        'Panneau de contrôle exclusif du **Bot Owner**. Toute modification s\'applique instantanément sur la Gateway Discord globale.'
      )
      .setColor(current.status === 'dnd' ? 0xf43f5e : current.status === 'idle' ? 0xf59e0b : 0x10b981)
      .addFields(
        { name: 'Statut Actuel', value: statusEmoji, inline: true },
        { name: 'Activité', value: `${current.activity.type} **${current.activity.name}**`, inline: true },
        { name: 'Portée', value: '🌐 Global (Gateway)', inline: true },
        {
          name: 'Rotation Automatique',
          value: rotConfig.enabled
            ? `Activée (${rotConfig.order}, ${rotConfig.intervalSeconds}s)`
            : 'Désactivée',
          inline: true,
        },
        { name: 'Source', value: `\`${current.source}\``, inline: true },
        { name: 'Dernière Maj', value: `<t:${Math.floor(new Date(current.updatedAt).getTime() / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: `Bot Owner Authentifié : ${config.botOwnerId}` })
      .setTimestamp();
  }

  public buildActionRows(): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
    const rotationEngine = ActivityRotationEngine.getInstance();
    const isRotEnabled = rotationEngine.getConfig().enabled;

    // Ligne 1 : Boutons de statut
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('owner_presence_set_online')
        .setLabel('Online')
        .setEmoji('🟢')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('owner_presence_set_idle')
        .setLabel('Idle')
        .setEmoji('🌙')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('owner_presence_set_dnd')
        .setLabel('DND')
        .setEmoji('⛔')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('owner_presence_toggle_rot')
        .setLabel(isRotEnabled ? 'Stop Rotation' : 'Start Rotation')
        .setEmoji('🔄')
        .setStyle(isRotEnabled ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );

    // Ligne 2 : Profils rapides
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('owner_presence_prof_gaming')
        .setLabel('Gaming (Valorant)')
        .setEmoji('🎮')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('owner_presence_prof_music')
        .setLabel('Music (Spotify)')
        .setEmoji('🎧')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('owner_presence_prof_watch')
        .setLabel('Watch Servers')
        .setEmoji('👀')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('owner_presence_toggle_maint')
        .setLabel('Maintenance')
        .setEmoji('🛠️')
        .setStyle(ButtonStyle.Danger)
    );

    return [row1, row2];
  }

  public async sendOwnerPanel(message: Message) {
    if (message.author.id !== config.botOwnerId) {
      return;
    }

    const embed = this.buildPanelEmbed();
    const components = this.buildActionRows() as any;

    await message.reply({ embeds: [embed], components });
  }

  public async handleButton(interaction: ButtonInteraction): Promise<void> {
    if (interaction.user.id !== config.botOwnerId) {
      await interaction.reply({
        content: '⛔ Accès refusé : Cette action est réservée au Bot Owner autorisé.',
        ephemeral: true,
      });
      return;
    }

    const presenceService = PresenceService.getInstance();
    const rotationEngine = ActivityRotationEngine.getInstance();
    const scheduler = PresenceSchedulerService.getInstance();
    const smart = SmartPresenceEngine.getInstance();

    const customId = interaction.customId;

    if (customId === 'owner_presence_set_online') {
      const current = presenceService.getCurrentState();
      presenceService.updatePresence('online', current.activity, 'Bot Owner (Discord DM)');
    } else if (customId === 'owner_presence_set_idle') {
      const current = presenceService.getCurrentState();
      presenceService.updatePresence('idle', current.activity, 'Bot Owner (Discord DM)');
    } else if (customId === 'owner_presence_set_dnd') {
      const current = presenceService.getCurrentState();
      presenceService.updatePresence('dnd', current.activity, 'Bot Owner (Discord DM)');
    } else if (customId === 'owner_presence_toggle_rot') {
      const cfg = rotationEngine.getConfig();
      if (cfg.enabled) {
        rotationEngine.stopRotation();
      } else {
        rotationEngine.startRotation();
      }
    } else if (customId === 'owner_presence_prof_gaming') {
      scheduler.applyProfile('prof_gaming', 'Bot Owner (Discord DM)');
    } else if (customId === 'owner_presence_prof_music') {
      scheduler.applyProfile('prof_music', 'Bot Owner (Discord DM)');
    } else if (customId === 'owner_presence_prof_watch') {
      scheduler.applyProfile('prof_community', 'Bot Owner (Discord DM)');
    } else if (customId === 'owner_presence_toggle_maint') {
      const isDnd = presenceService.getCurrentState().status === 'dnd';
      smart.setMaintenanceMode(!isDnd);
    }

    const updatedEmbed = this.buildPanelEmbed();
    const updatedComponents = this.buildActionRows() as any;

    await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
  }
}

export const discordOwnerPanel = DiscordOwnerPanel.getInstance();
