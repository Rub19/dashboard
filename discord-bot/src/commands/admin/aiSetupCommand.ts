import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { aiRepository } from '../../modules/ai/storage/aiRepository.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { formatString, getTranslation, type TranslationDictionary } from '../../utils/i18n.js';

// La valeur d'un champ d'embed Discord est plafonnée à 1024 caractères. La liste des
// mots bannis s'accumule au fil des appels successifs de `/ai-setup mots_bannis:...`
// (fusion sans limite dans `currentSettings.bannedWords`) : sans troncature ici, une
// liste devenue longue dépasse la limite et fait échouer silencieusement tout l'envoi
// de la commande (aucun message d'erreur visible, juste "l'interaction n'a pas répondu").
function formatBannedWordsFieldValue(words: string[] | undefined, t: TranslationDictionary): string {
  if (!words || words.length === 0) {
    return t.aisetup_banned_none;
  }

  const maxLength = 1024;
  let value = '';
  let shown = 0;
  for (const w of words) {
    const chunk = `${shown > 0 ? ', ' : ''}\`${w}\``;
    if (value.length + chunk.length > maxLength - 20) break;
    value += chunk;
    shown += 1;
  }

  if (shown < words.length) {
    value += formatString(t.aisetup_banned_more, { count: words.length - shown });
  }

  return value;
}

export const aiSetupCommand: Command = {
  name: 'ai-setup',
  description: 'Configure le salon public dédié à l\'IA, l\'humeur du Thon et les filtres de sécurité (Admin)',
  category: 'Administration',
  userPermissions: [PermissionFlagsBits.Administrator],
  slashData: new SlashCommandBuilder()
    .setName('ai-setup')
    .setDescription('Configuration du salon IA public, humeur du Thon et sécurité')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName('salon')
        .setDescription('Salon textuel public dédié où les membres peuvent discuter librement avec l\'IA')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('humeur')
        .setDescription('Personnalité & ton du Thon')
        .addChoices(
          { name: '🐟 Sage & Bienveillant (Poli, posé, pédagogue)', value: 'SAGE' },
          { name: '🦈 Gamer Sarcastique (Humour piquant, pop-culture, vif)', value: 'GAMER_SARCASTIQUE' },
          { name: '🛡️ Protecteur & Sérieux (Vigilant, axé sécurité)', value: 'PROTECTEUR' },
          { name: '⚡ Cyberpunk Futuriste (High-tech, percutant, néon)', value: 'CYBERPUNK' },
          { name: '🎨 Personnalisé (Instructions configurées)', value: 'CUSTOM' }
        )
        .setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt
        .setName('images')
        .setDescription('Autoriser la génération d\'images pour tous les membres dans le salon dédié')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('mots_bannis')
        .setDescription('Mots ou expressions interdits séparés par une virgule (ex: mot1, mot2, mot3)')
        .setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt
        .setName('desactiver_salon')
        .setDescription('Désactiver le salon dédié actuel')
        .setRequired(false)
    ),

  async execute(ctx: CommandContext): Promise<void> {
    const t = getTranslation(ctx.guildConfig.language);
    if (!ctx.guildId || !ctx.guild) {
      await ctx.reply({ embeds: [errorEmbed().setDescription(t.guild_only_plain)] });
      return;
    }

    const currentSettings = aiRepository.getSettings(ctx.guildId);

    if (ctx.isSlash && ctx.interaction) {
      const channel = ctx.interaction.options.getChannel('salon');
      const mood = ctx.interaction.options.getString('humeur') as any;
      const images = ctx.interaction.options.getBoolean('images');
      const bannedWordsInput = ctx.interaction.options.getString('mots_bannis');
      const disableChannel = ctx.interaction.options.getBoolean('desactiver_salon');

      let updated = false;

      if (disableChannel) {
        currentSettings.dedicatedChannelId = undefined;
        updated = true;
      } else if (channel) {
        currentSettings.dedicatedChannelId = channel.id;
        currentSettings.enabled = true;
        // S'assurer que le salon a une règle ACTIVE
        currentSettings.channelRules[channel.id] = {
          channelId: channel.id,
          channelName: ('name' in channel ? channel.name : null) || 'ai-channel',
          isCategory: false,
          mode: 'AUTOMATIC',
          knowledgeSourceIds: [],
          threadModeEnabled: false,
          maxHistoryMessages: 20,
        };
        updated = true;
      }

      if (mood) {
        currentSettings.thonMood = mood;
        updated = true;
      }

      if (images !== null && images !== undefined) {
        currentSettings.allowImageGeneration = images;
        updated = true;
      }

      if (bannedWordsInput) {
        const newWords = bannedWordsInput
          .split(',')
          .map((w) => w.trim().toLowerCase())
          .filter((w) => w.length > 1);
        const existing = currentSettings.bannedWords || [];
        const merged = Array.from(new Set([...existing, ...newWords]));
        currentSettings.bannedWords = merged;
        updated = true;
      }

      if (updated) {
        aiRepository.saveSettings(ctx.guildId, currentSettings);
      }

      const moodLabels: Record<string, string> = {
        SAGE: t.aisetup_mood_sage,
        GAMER_SARCASTIQUE: t.aisetup_mood_gamer,
        PROTECTEUR: t.aisetup_mood_protector,
        CYBERPUNK: t.aisetup_mood_cyberpunk,
        CUSTOM: t.aisetup_mood_custom,
      };

      const embed = successEmbed({
        footerText: formatString(t.aisetup_footer, { tag: ctx.author.tag }),
      })
        .setTitle(t.aisetup_title)
        .setDescription(updated ? t.aisetup_desc_updated : t.aisetup_desc_current)
        .addFields(
          {
            name: t.aisetup_field_channel,
            value: currentSettings.dedicatedChannelId
              ? formatString(t.aisetup_channel_value, { channelId: currentSettings.dedicatedChannelId })
              : t.aisetup_channel_none,
            inline: false,
          },
          {
            name: t.aisetup_field_mood,
            value: `**${moodLabels[currentSettings.thonMood || 'SAGE'] || t.aisetup_mood_sage}**`,
            inline: true,
          },
          {
            name: t.aisetup_field_images,
            value: currentSettings.allowImageGeneration !== false ? t.aisetup_images_on : t.aisetup_images_off,
            inline: true,
          },
          {
            name: t.aisetup_field_security,
            value: t.aisetup_security_value,
            inline: false,
          },
          {
            name: formatString(t.aisetup_field_banned, { count: (currentSettings.bannedWords || []).length }),
            value: formatBannedWordsFieldValue(currentSettings.bannedWords, t),
            inline: false,
          }
        );

      await ctx.reply({ embeds: [embed] });
    } else {
      await ctx.reply({
        embeds: [infoEmbed().setDescription(t.aisetup_slash_only)],
      });
    }
  },
};
