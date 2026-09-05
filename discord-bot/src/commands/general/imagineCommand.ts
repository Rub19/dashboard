import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { AIImageService } from '../../modules/ai/services/aiImageService.js';
import { aiRepository } from '../../modules/ai/storage/aiRepository.js';

export const imagineCommand: Command = {
  name: 'imagine',
  description: 'Génère une image par intelligence artificielle (Flux / Pollinations AI)',
  category: 'Général',
  aliases: ['image', 'draw', 'genimage'],
  slashData: new SlashCommandBuilder()
    .setName('imagine')
    .setDescription('Génère une image haute qualité via intelligence artificielle')
    .addStringOption((opt) =>
      opt
        .setName('prompt')
        .setDescription('Description détaillée de l\'image à générer')
        .setRequired(true)
    ),

  async execute(ctx: CommandContext): Promise<void> {
    const prompt = ctx.isSlash && ctx.interaction
      ? ctx.interaction.options.getString('prompt', true)
      : ctx.args.join(' ');

    if (!prompt || prompt.trim().length < 3) {
      await ctx.reply({
        content: '❌ Veuillez fournir une description d\'image valide (au moins 3 caractères).\n*Exemple : `/imagine un astronaute explorant une forêt de néon cyberpunk`*',
        ephemeral: true,
      });
      return;
    }

    // Vérifier si la génération d'image est activée sur ce serveur
    if (ctx.guildId) {
      const settings = aiRepository.getSettings(ctx.guildId);
      if (settings.allowImageGeneration === false) {
        await ctx.reply({
          content: '⚠️ La génération d\'images par IA a été désactivée par les administrateurs de ce serveur.',
          ephemeral: true,
        });
        return;
      }
    }

    await ctx.defer();

    const result = await AIImageService.generateImage({ prompt });

    if (!result.success || !result.imageUrl) {
      await ctx.reply({
        content: `❌ ${result.error || 'Une erreur est survenue lors de la génération de l\'image.'}`,
      });
      return;
    }

    const embed = AIImageService.buildImageEmbed({
      prompt: result.revisedPrompt || prompt,
      imageUrl: result.imageUrl,
      authorTag: ctx.author.tag,
    });

    await ctx.reply({ embeds: [embed] });
  },
};
