import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { AIImageService } from '../../modules/ai/services/aiImageService.js';
import { aiRepository } from '../../modules/ai/storage/aiRepository.js';
import { baseEmbed } from '../../utils/embeds.js';
import { cooldownService } from '../../services/cooldownService.js';
import { formatString, getTranslation } from '../../utils/i18n.js';

const AI_COMMAND_COOLDOWN_SECONDS = 15;

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
    const t = getTranslation(ctx.guildConfig.language);
    const prompt = ctx.isSlash && ctx.interaction
      ? ctx.interaction.options.getString('prompt', true)
      : ctx.args.join(' ');

    if (!prompt || prompt.trim().length < 3) {
      await ctx.reply({
        embeds: [baseEmbed('error').setDescription(t.imagine_invalid_prompt)],
        ephemeral: true,
      });
      return;
    }

    const authorId = ctx.author?.id || ctx.interaction?.user?.id || '';
    const isStaffOrAdmin = Boolean(
      ctx.member?.permissions?.has('ManageGuild') || ctx.member?.permissions?.has('Administrator')
    );
    const { onCooldown, remainingSeconds } = cooldownService.checkAndApply(
      ctx.guild?.id || ctx.interaction?.guildId || 'dm',
      authorId,
      'ai-imagine',
      AI_COMMAND_COOLDOWN_SECONDS,
      isStaffOrAdmin
    );
    if (onCooldown) {
      await ctx.reply({
        embeds: [baseEmbed('warning').setDescription(formatString(t.imagine_cooldown, { seconds: remainingSeconds }))],
        ephemeral: true,
      });
      return;
    }

    // Vérifier si la génération d'image est activée sur ce serveur
    if (ctx.guildId) {
      const settings = aiRepository.getSettings(ctx.guildId);
      if (settings.allowImageGeneration === false) {
        await ctx.reply({
          embeds: [baseEmbed('warning').setDescription(t.imagine_disabled)],
          ephemeral: true,
        });
        return;
      }
    }

    await ctx.deferReply();

    const result = await AIImageService.generateImage({ prompt });

    if (!result.success || !result.imageUrl) {
      await ctx.reply({
        embeds: [baseEmbed('error').setDescription(`❌ ${result.error || t.imagine_error_fallback}`)],
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
