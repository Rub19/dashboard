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
    if (!ctx.isSlash) {
      await ctx.reply({
        content: 'Veuillez utiliser la commande Slash `/suggest` pour proposer une idée.',
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
        content: '❌ Le système de suggestions est actuellement désactivé sur ce serveur.',
        ephemeral: true,
      });
      return;
    }

    if (!config.channelId) {
      await ctx.reply({
        content: "❌ Aucun salon de suggestions n'a été configuré par les administrateurs.",
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
          category: catOption || 'Général',
        });

        await ctx.reply({
          content: `✅ Votre suggestion **#${suggestion.numericId}** a bien été publiée dans <#${config.channelId}> !`,
          ephemeral: true,
        });
      } catch (err: any) {
        await ctx.reply({ content: `❌ Erreur : ${err.message}`, ephemeral: true });
      }
      return;
    }

    // Sinon, on ouvre le modal interactif
    const modal = new ModalBuilder()
      .setCustomId('modal_suggest_create')
      .setTitle('Proposer une Suggestion');

    const titleInput = new TextInputBuilder()
      .setCustomId('sugg_title')
      .setLabel('Titre de votre idée')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Ajouter un salon dédié au gaming...')
      .setRequired(true)
      .setMaxLength(100);

    const descInput = new TextInputBuilder()
      .setCustomId('sugg_description')
      .setLabel('Description détaillée')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Expliquez pourquoi cette idée serait utile et comment elle fonctionnerait...')
      .setRequired(true)
      .setMaxLength(1500);

    const catInput = new TextInputBuilder()
      .setCustomId('sugg_category')
      .setLabel('Catégorie (optionnel)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Général, Serveur, Bot, Événements...')
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
