import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ContainerBuilder,
  Message,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { config } from '../../../config.js';
import { PresenceService } from '../services/presenceService.js';
import { ActivityRotationEngine } from '../services/activityRotationEngine.js';
import { PresenceSchedulerService } from '../services/presenceSchedulerService.js';
import { SmartPresenceEngine } from '../services/smartPresenceEngine.js';
import { baseEmbed, BRAND_COLORS } from '../../../utils/embeds.js';
import { buttonRow, container, footer, separator, text, V2_FLAGS } from '../../../utils/components.js';
import type { DiscordActivityType, DiscordStatus } from '../types/index.js';

const ACTOR = 'Bot Owner (Discord DM)';

const STATUS_LABEL: Record<DiscordStatus, string> = {
  online: '🟢 En ligne',
  idle: '🌙 Inactif',
  dnd: '⛔ Ne pas déranger',
  invisible: '⚫ Invisible',
  streaming: '🟣 En direct',
};

const ACTIVITY_VERB: Record<DiscordActivityType, string> = {
  Playing: 'Joue à',
  Streaming: 'En direct :',
  Listening: 'Écoute',
  Watching: 'Regarde',
  Competing: 'Participe à',
};

const SOURCE_LABEL: Record<string, string> = {
  manual: 'manuel',
  rotation: 'rotation',
  schedule: 'planning',
  dynamic: 'automatique',
  maintenance: 'maintenance',
  preset: 'profil',
};

function button(id: string, label: string, emoji: string, style: ButtonStyle, active = false): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(`owner_presence_${id}`)
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(active ? ButtonStyle.Primary : style);
}

export class DiscordOwnerPanel {
  private static instance: DiscordOwnerPanel;

  public static getInstance(): DiscordOwnerPanel {
    if (!DiscordOwnerPanel.instance) {
      DiscordOwnerPanel.instance = new DiscordOwnerPanel();
    }
    return DiscordOwnerPanel.instance;
  }

  public buildPanel(notice?: string): ContainerBuilder[] {
    const current = PresenceService.getInstance().getCurrentState();
    const rotation = ActivityRotationEngine.getInstance().getConfig();
    const isStreaming = current.activity.type === 'Streaming';
    const inMaintenance = current.source === 'maintenance';
    const status = isStreaming ? 'streaming' : current.status;
    const color =
      status === 'streaming' ? 0x9146ff : status === 'dnd' ? BRAND_COLORS.error : status === 'idle' ? BRAND_COLORS.warning : BRAND_COLORS.success;
    const updatedAt = Math.floor(new Date(current.updatedAt).getTime() / 1000);
    const activityLine = `${ACTIVITY_VERB[current.activity.type] ?? current.activity.type} **${current.activity.name}**`;

    return [
      container(color, [
        text('## Présence d’Etho'),
        text(
          [
            `${STATUS_LABEL[status] ?? status}  ·  ${activityLine}`,
            current.activity.state ? `-# ${current.activity.state}` : null,
            isStreaming && current.activity.url ? `-# 🔗 ${current.activity.url}` : null,
          ]
            .filter(Boolean)
            .join('\n')
        ),
        footer(
          `Rotation ${rotation.enabled ? `active · toutes les ${rotation.intervalSeconds} s` : 'arrêtée'}  ·  source ${SOURCE_LABEL[current.source] ?? current.source}  ·  mise à jour <t:${updatedAt}:R>`
        ),
        notice ? text(notice) : null,
        separator(),
        text('**Statut**'),
        buttonRow(
          button('set_online', 'En ligne', '🟢', ButtonStyle.Secondary, status === 'online'),
          button('set_idle', 'Inactif', '🌙', ButtonStyle.Secondary, status === 'idle' && !inMaintenance),
          button('set_dnd', 'Ne pas déranger', '⛔', ButtonStyle.Secondary, status === 'dnd' && !inMaintenance),
          button('set_invisible', 'Invisible', '⚫', ButtonStyle.Secondary, status === 'invisible')
        ),
        separator(),
        text('**Activité**'),
        buttonRow(
          button('streamer', 'Mode streamer', '🟣', ButtonStyle.Secondary, isStreaming),
          button('custom', 'Activité perso', '✏️', ButtonStyle.Secondary),
          button('prof_gaming', 'Jeu', '🎮', ButtonStyle.Secondary),
          button('prof_music', 'Musique', '🎧', ButtonStyle.Secondary),
          button('prof_watch', 'Communauté', '👀', ButtonStyle.Secondary)
        ),
        buttonRow(
          button('toggle_rot', rotation.enabled ? 'Arrêter la rotation' : 'Lancer la rotation', '🔄', ButtonStyle.Secondary, rotation.enabled),
          button('toggle_maint', inMaintenance ? 'Quitter la maintenance' : 'Maintenance', '🛠️', inMaintenance ? ButtonStyle.Danger : ButtonStyle.Secondary)
        ),
      ]),
    ];
  }

  public async sendOwnerPanel(message: Message) {
    if (message.author.id !== config.botOwnerId) return;
    await message.reply({ components: this.buildPanel(), flags: V2_FLAGS });
  }

  private async refresh(interaction: ButtonInteraction | ModalSubmitInteraction, notice?: string) {
    const payload = { components: this.buildPanel(notice), flags: V2_FLAGS } as const;
    try {
      if (interaction.isButton() || (interaction.isModalSubmit() && interaction.isFromMessage())) await interaction.update(payload);
      else await interaction.reply({ ...payload, flags: V2_FLAGS | MessageFlags.Ephemeral });
    } catch {
      await interaction.reply({ ...payload, flags: V2_FLAGS | MessageFlags.Ephemeral }).catch(() => null);
    }
  }

  private applyActivity(type: DiscordActivityType, name: string, url?: string): string | undefined {
    ActivityRotationEngine.getInstance().stopRotation();
    const presence = PresenceService.getInstance();
    const result = presence.updatePresence(
      presence.getCurrentState().status === 'invisible' ? 'online' : presence.getCurrentState().status,
      { type, name, url },
      ACTOR
    );
    if (result.rateLimited) return '⏳ Trop de changements d’affilée : réessaie dans une minute.';
    if (type === 'Streaming' && result.state.activity.type !== 'Streaming') return '⚠️ Lien refusé : il faut une adresse http(s) valide.';
    return undefined;
  }

  public async handleButton(interaction: ButtonInteraction): Promise<void> {
    if (interaction.user.id !== config.botOwnerId) {
      await interaction.reply({
        embeds: [baseEmbed('error').setDescription('⛔ Accès refusé : cette action est réservée au propriétaire du bot.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const presence = PresenceService.getInstance();
    const rotation = ActivityRotationEngine.getInstance();
    const scheduler = PresenceSchedulerService.getInstance();
    const id = interaction.customId.replace('owner_presence_', '');

    if (id === 'streamer' || id === 'custom') {
      const current = presence.getCurrentState().activity;
      const modal = new ModalBuilder()
        .setCustomId(`owner_presence_modal_${id}`)
        .setTitle(id === 'streamer' ? 'Mode streamer' : 'Activité personnalisée');
      const title = new TextInputBuilder()
        .setCustomId('name')
        .setLabel(id === 'streamer' ? 'Titre affiché' : 'Texte (affiché après « Joue à »)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(120)
        .setRequired(true)
        .setValue(current.name.slice(0, 120));
      const rows = [new ActionRowBuilder<TextInputBuilder>().addComponents(title)];
      if (id === 'streamer') {
        rows.unshift(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('url')
              .setLabel('Lien de ta chaîne (Twitch ou YouTube)')
              .setPlaceholder('https://www.twitch.tv/ta-chaine')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setValue(current.type === 'Streaming' && current.url ? current.url : '')
          )
        );
      }
      modal.addComponents(...rows);
      await interaction.showModal(modal);
      return;
    }

    let notice: string | undefined;
    if (id.startsWith('set_')) {
      const status = id.slice(4) as DiscordStatus;
      const current = presence.getCurrentState();
      const activity = current.activity.type === 'Streaming' ? { ...current.activity, type: 'Playing' as DiscordActivityType, url: undefined } : current.activity;
      const result = presence.updatePresence(status, activity, ACTOR);
      if (result.rateLimited) notice = '⏳ Trop de changements d’affilée : réessaie dans une minute.';
      else if (current.source === 'maintenance' && rotation.getConfig().enabled) rotation.executeNextRotation();
    } else if (id === 'toggle_rot') {
      if (rotation.getConfig().enabled) rotation.stopRotation();
      else rotation.startRotation();
    } else if (id === 'prof_gaming') {
      scheduler.applyProfile('prof_gaming', ACTOR);
    } else if (id === 'prof_music') {
      scheduler.applyProfile('prof_music', ACTOR);
    } else if (id === 'prof_watch') {
      scheduler.applyProfile('prof_community', ACTOR);
    } else if (id === 'toggle_maint') {
      SmartPresenceEngine.getInstance().setMaintenanceMode(presence.getCurrentState().source !== 'maintenance');
    }

    await this.refresh(interaction, notice);
  }

  public async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    if (interaction.user.id !== config.botOwnerId) {
      await interaction.reply({ content: '⛔ Accès refusé.', flags: MessageFlags.Ephemeral });
      return;
    }
    const name = interaction.fields.getTextInputValue('name').trim();
    let notice: string | undefined;
    if (interaction.customId === 'owner_presence_modal_streamer') {
      const url = interaction.fields.getTextInputValue('url').trim();
      notice = /^https?:\/\/\S+$/.test(url)
        ? this.applyActivity('Streaming', name, url) ?? '🟣 Mode streamer activé (rotation arrêtée).'
        : '⚠️ Lien invalide : colle l’adresse complète de ta chaîne (https://…).';
    } else {
      notice = this.applyActivity('Playing', name) ?? '✏️ Activité mise à jour (rotation arrêtée).';
    }
    await this.refresh(interaction, notice);
  }
}

export const discordOwnerPanel = DiscordOwnerPanel.getInstance();
