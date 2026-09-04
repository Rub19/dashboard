import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonInteraction,
  ModalSubmitInteraction,
  Client,
  ChatInputCommandInteraction,
} from 'discord.js';
import { DiscordForm, FormField, FormAnswer } from '../types/index.js';
import { formRepository } from '../storage/formRepository.js';
import { formService } from '../services/formService.js';
import { logger } from '../../../utils/logger.js';

export class DiscordFormPanel {
  private client: Client | null = null;

  public initialize(client: Client): void {
    this.client = client;
  }

  /**
   * Build the Discord Embed for a Form Panel.
   */
  public buildPanelEmbed(form: DiscordForm): EmbedBuilder {
    const config = form.panelConfig;
    const embed = new EmbedBuilder()
      .setTitle(config.embedTitle || form.title)
      .setDescription(
        config.embedDescription ||
          (form.description ? `${form.description}\n\n` : '') +
            `📋 **Catégorie :** ${form.category}\n⏱️ **Temps estimé :** ~3 minutes\n🔒 **Statut :** Ouvert`
      )
      .setColor((config.embedColor as any) || '#6366f1')
      .setFooter({
        text: config.footerText || 'ETHONE Application Center',
        iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png',
      })
      .setTimestamp();

    if (config.thumbnailUrl) {
      embed.setThumbnail(config.thumbnailUrl);
    }
    if (config.imageUrl) {
      embed.setImage(config.imageUrl);
    }

    return embed;
  }

  /**
   * Build Action Row button for the panel.
   */
  public buildPanelActionRow(form: DiscordForm): ActionRowBuilder<ButtonBuilder> {
    const config = form.panelConfig;
    let style = ButtonStyle.Primary;
    if (config.buttonStyle === 'SECONDARY') style = ButtonStyle.Secondary;
    if (config.buttonStyle === 'SUCCESS') style = ButtonStyle.Success;
    if (config.buttonStyle === 'DANGER') style = ButtonStyle.Danger;

    const button = new ButtonBuilder()
      .setCustomId(`form_open:${form.id}`)
      .setLabel(config.buttonText || 'Postuler maintenant')
      .setStyle(style);

    if (config.buttonEmoji) {
      button.setEmoji(config.buttonEmoji);
    }

    return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
  }

  /**
   * Check if a form qualifies for native Discord Modal (max 5 compatible text fields).
   */
  public canUseDiscordModal(form: DiscordForm): boolean {
    if (form.fields.length > 5) return false;
    const allowedModalTypes = ['SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'EMAIL', 'URL', 'YES_NO', 'SELECT'];
    return form.fields.every((f) => allowedModalTypes.includes(f.type));
  }

  /**
   * Create a native Discord Modal for a form.
   */
  public buildDiscordModal(form: DiscordForm): ModalBuilder {
    const modal = new ModalBuilder()
      .setCustomId(`form_modal_submit:${form.id}`)
      .setTitle(form.title.substring(0, 45));

    const fieldsToShow = form.fields.slice(0, 5);
    for (const field of fieldsToShow) {
      const isParagraph = field.type === 'LONG_TEXT';
      const input = new TextInputBuilder()
        .setCustomId(`field_${field.id}`)
        .setLabel(field.label.substring(0, 45))
        .setStyle(isParagraph ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(field.required)
        .setPlaceholder(field.placeholder.substring(0, 100) || '');

      if (field.minLength) input.setMinLength(field.minLength);
      if (field.maxLength) input.setMaxLength(field.maxLength);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
      modal.addComponents(row);
    }

    return modal;
  }

  /**
   * Handle Button interaction (when user clicks form button).
   */
  public async handleButton(interaction: ButtonInteraction): Promise<void> {
    const [action, formId] = interaction.customId.split(':');
    if (action !== 'form_open' || !formId || !interaction.guildId) return;

    const form = formRepository.getFormById(interaction.guildId, formId);
    if (!form) {
      await interaction.reply({
        content: '❌ Ce formulaire n\'existe plus ou a été désactivé.',
        ephemeral: true,
      });
      return;
    }

    if (form.status !== 'PUBLISHED') {
      await interaction.reply({
        content: '⚠️ Ce formulaire est actuellement fermé aux nouvelles réponses.',
        ephemeral: true,
      });
      return;
    }

    const mode = form.panelConfig.submissionMode || 'HYBRID';

    // If modal mode or (hybrid mode with compatible fields)
    if (mode === 'MODAL' || (mode === 'HYBRID' && this.canUseDiscordModal(form))) {
      const modal = this.buildDiscordModal(form);
      await interaction.showModal(modal);
      return;
    }

    // Web form link fallback
    const webUrl = `https://ethone.dev/discord/forms/${form.id}?guildId=${form.guildId}`;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Ouvrir le Formulaire Web')
        .setStyle(ButtonStyle.Link)
        .setURL(webUrl)
        .setEmoji('🌐')
    );

    await interaction.reply({
      content: `📝 **${form.title}**\n\nCe formulaire comportant plusieurs étapes et des options avancées, veuillez le remplir directement sur l'interface sécurisée ETHONE :`,
      components: [row],
      ephemeral: true,
    });
  }

  /**
   * Handle Modal submit interaction.
   */
  public async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const [action, formId] = interaction.customId.split(':');
    if (action !== 'form_modal_submit' || !formId || !interaction.guildId) return;

    await interaction.deferReply({ ephemeral: true });

    const form = formRepository.getFormById(interaction.guildId, formId);
    if (!form) {
      await interaction.editReply({ content: '❌ Formulaire introuvable.' });
      return;
    }

    const answers: FormAnswer[] = [];
    for (const field of form.fields.slice(0, 5)) {
      const val = interaction.fields.getTextInputValue(`field_${field.id}`);
      answers.push({
        fieldId: field.id,
        fieldLabel: field.label,
        fieldType: field.type,
        value: val,
      });
    }

    const member = interaction.member;
    const roles = member && 'roles' in member && Array.isArray(member.roles) ? (member.roles as string[]) : [];

    const result = await formService.submitResponse({
      guildId: form.guildId,
      formId: form.id,
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      userAvatar: interaction.user.displayAvatarURL(),
      answers,
      metadata: {
        accountAgeDays: Math.floor((Date.now() - interaction.user.createdTimestamp) / 86400000),
        guildMemberDays: interaction.member && 'joinedTimestamp' in interaction.member && interaction.member.joinedTimestamp
          ? Math.floor((Date.now() - Number(interaction.member.joinedTimestamp)) / 86400000)
          : 0,
        userRoleIds: roles,
      },
    });

    if (!result.success) {
      await interaction.editReply({ content: `❌ **Erreur de soumission :** ${result.error}` });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Candidature envoyée avec succès')
      .setDescription(
        `Votre réponse pour **${form.title}** a bien été enregistrée.\n\n` +
          `🆔 **Numéro de suivi :** \`#${result.response?.id}\`\n` +
          `📊 **Statut initial :** En attente d'examen par le staff\n\n` +
          `*Vous recevrez une notification privée dès qu'une décision sera prise.*`
      )
      .setColor('#10b981')
      .setFooter({ text: 'ETHONE Forms 2.0' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}

export const discordFormPanel = new DiscordFormPanel();
