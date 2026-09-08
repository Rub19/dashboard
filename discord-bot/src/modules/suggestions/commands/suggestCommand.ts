import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { SuggestionService } from '../services/suggestionService.js';
import { suggestionStorage } from '../storage/suggestionStorage.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export const suggestCommand: Command = {
  name: 'suggest',
  description: 'Propose une idée ou suggestion d’amélioration pour le serveur.',
  category: 'Communauté',
  slashData: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Propose une idée ou suggestion d’amélioration pour le serveur.')
    .addStringOption((opt) =>
      opt.setName('titre').setDescription('Titre court de votre idée').setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('description')
        .setDescription('Description détaillée de votre proposition')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('categorie').setDescription('Catégorie (ex: Général, Bot, Serveur)').setRequired(false)
    ),

  async execute(ctx: CommandContext): Promise<void> {
    const t = getTranslation(ctx.guildConfig.language);

    if (!ctx.isSlash) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(t.suggest_slash_only)],
        ephemeral: true,
      });
      return;
    }

    const interaction = ctx.interaction as ChatInputCommandInteraction;
    const guild = ctx.guild;
    if (!guild) return;

    const config = suggestionStorage.getConfig(guild.id);
    if (!config.enabled) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(t.suggest_module_disabled)],
        ephemeral: true,
      });
      return;
    }

    if (!config.channelId) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(t.suggest_no_channel_configured)],
        ephemeral: true,
      });
      return;
    }

    const titleOption = interaction.options.getString('titre');
    const descOption = interaction.options.getString('description');
    const catOption = interaction.options.getString('categorie');

    // Si les options sont déjà remplies, on publie directement
    if (titleOption && descOption) {
      await ctx.deferReply(true);

      try {
        const suggestion = await SuggestionService.createSuggestion(interaction.client, {
          guildId: guild.id,
          authorId: ctx.author.id,
          authorTag: ctx.author.tag,
          authorAvatarUrl: ctx.author.displayAvatarURL(),
          title: titleOption,
          description: descOption,
          category: catOption || t.suggest_default_category,
        });

        await ctx.reply({
          embeds: [ctx.createEmbed('success').setDescription(formatString(t.suggest_published_success, { numericId: suggestion.numericId, channelId: config.channelId }))],
          ephemeral: true,
        });
      } catch (err: any) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.suggest_generic_error, { error: err.message }))], ephemeral: true });
      }
      return;
    }

    // Sinon, on ouvre le modal interactif
    const modal = new ModalBuilder()
      .setCustomId('modal_suggest_create')
      .setTitle(t.suggest_modal_title);

    const titleInput = new TextInputBuilder()
      .setCustomId('sugg_title')
      .setLabel(t.suggest_modal_title_label)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(t.suggest_modal_title_placeholder)
      .setRequired(true)
      .setMaxLength(100);

    const descInput = new TextInputBuilder()
      .setCustomId('sugg_description')
      .setLabel(t.suggest_modal_desc_label)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(t.suggest_modal_desc_placeholder)
      .setRequired(true)
      .setMaxLength(1500);

    const catInput = new TextInputBuilder()
      .setCustomId('sugg_category')
      .setLabel(t.suggest_modal_category_label)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(t.suggest_modal_category_placeholder)
      .setRequired(false)
      .setMaxLength(50);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(catInput)
    );

    await interaction.showModal(modal);
  },
};
