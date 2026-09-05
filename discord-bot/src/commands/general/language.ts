import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { aiRepository } from '../../modules/ai/storage/aiRepository.js';
import { getTranslation, SupportedLanguage } from '../../utils/i18n.js';
import { logger } from '../../utils/logger.js';

export const languageCommand: Command = {
  name: 'language',
  description: 'Change ou consulte la langue officielle du bot sur ce serveur (FR, EN, ES, DE)',
  category: 'Administration',
  aliases: ['lang', 'langue', 'idioma', 'sprache'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('language')
    .setDescription('Change ou consulte la langue officielle du bot sur ce serveur')
    .addStringOption((opt) =>
      opt
        .setName('langue')
        .setDescription('La langue souhaitée pour le bot')
        .setRequired(false)
        .addChoices(
          { name: '🇫🇷 Français (French)', value: 'fr' },
          { name: '🇬🇧 English (English)', value: 'en' },
          { name: '🇪🇸 Español (Spanish)', value: 'es' },
          { name: '🇩🇪 Deutsch (German)', value: 'de' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  execute: async (ctx: CommandContext) => {
    if (!ctx.guild) {
      await ctx.reply({ content: '❌ Cette commande doit être exécutée dans un serveur.', ephemeral: true });
      return;
    }

    const guildId = ctx.guild.id;
    const currentLang = (ctx.guildConfig.language || 'fr') as SupportedLanguage;
    const tCurrent = getTranslation(currentLang);

    // Récupérer la langue demandée
    let targetLang = '';
    if (ctx.isSlash && ctx.interaction) {
      targetLang = (ctx.interaction as any).options?.getString?.('langue') || '';
    } else if (ctx.args.length > 0) {
      targetLang = ctx.args[0].toLowerCase();
    }

    // Si aucune langue spécifiée, afficher l'état actuel avec boutons rapides
    if (!targetLang) {
      const embed = ctx
        .createEmbed('info')
        .setTitle(`${tCurrent.lang_flag} ${tCurrent.lang_name} • Langue Actuelle`)
        .setDescription(
          `La langue actuellement configurée sur **${ctx.guild.name}** est : **${tCurrent.lang_flag} ${tCurrent.lang_name}**.\n\n` +
          `Pour changer la langue, utilisez :\n` +
          `• \`/language langue:[fr | en | es | de]\`\n` +
          `• Ou cliquez sur l'un des boutons de sélection rapide ci-dessous :`
        )
        .setFooter({ text: `${ctx.guildConfig.botName} • Multilingual Support 2.0` });

      const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('set_lang_fr')
          .setLabel('Français')
          .setEmoji('🇫🇷')
          .setStyle(currentLang === 'fr' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('set_lang_en')
          .setLabel('English')
          .setEmoji('🇬🇧')
          .setStyle(currentLang === 'en' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('set_lang_es')
          .setLabel('Español')
          .setEmoji('🇪🇸')
          .setStyle(currentLang === 'es' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('set_lang_de')
          .setLabel('Deutsch')
          .setEmoji('🇩🇪')
          .setStyle(currentLang === 'de' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );

      await ctx.reply({ embeds: [embed], components: [buttonsRow] });
      return;
    }

    // Vérifier les permissions en mode préfixe
    if (!ctx.isSlash && ctx.member && !ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await ctx.reply({ content: tCurrent.no_permission, ephemeral: true });
      return;
    }

    // Valider la langue demandée
    const validLangs: SupportedLanguage[] = ['fr', 'en', 'es', 'de'];
    if (!validLangs.includes(targetLang as any)) {
      await ctx.reply({
        content: `❌ Langue invalide : \`${targetLang}\`. Choisissez parmi : \`fr\` (Français), \`en\` (English), \`es\` (Español), \`de\` (Deutsch).`,
        ephemeral: true,
      });
      return;
    }

    const selectedLang = targetLang as SupportedLanguage;

    // Mise à jour de la configuration du serveur
    const updated = guildConfigService.updateConfig(guildId, {
      language: selectedLang,
    });

    // Synchronisation de l'IA avec la langue choisie
    try {
      const aiSettings = aiRepository.getSettings(guildId);
      aiRepository.saveSettings(guildId, {
        persona: {
          ...aiSettings.persona,
          language: selectedLang,
          replyInUserLanguage: true,
        },
      });
    } catch (e) {
      logger.warn('Failed to sync AI settings language:', e);
    }

    const tNew = getTranslation(selectedLang);
    const embed = ctx
      .createEmbed('success')
      .setTitle(`${tNew.lang_flag} ${tNew.lang_changed_title}`)
      .setDescription(tNew.lang_changed_desc)
      .addFields({
        name: '🌐 Language / Idioma / Sprache',
        value: `**${tNew.lang_flag} ${tNew.lang_name}** (\`${selectedLang.toUpperCase()}\`)`,
        inline: true,
      })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  },
};
