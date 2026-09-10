import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { aiRepository } from '../../modules/ai/storage/aiRepository.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';

// La valeur d'un champ d'embed Discord est plafonnée à 1024 caractères. La liste des
// mots bannis s'accumule au fil des appels successifs de `/ai-setup mots_bannis:...`
// (fusion sans limite dans `currentSettings.bannedWords`) : sans troncature ici, une
// liste devenue longue dépasse la limite et fait échouer silencieusement tout l'envoi
// de la commande (aucun message d'erreur visible, juste "l'interaction n'a pas répondu").
function formatBannedWordsFieldValue(words: string[] | undefined): string {
  if (!words || words.length === 0) {
    return '*Aucun mot banni spécifique configuré*';
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
    value += ` *(+${words.length - shown} autres)*`;
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
    if (!ctx.guildId || !ctx.guild) {
      await ctx.reply({ embeds: [errorEmbed().setDescription('Cette commande ne peut être exécutée que sur un serveur.')] });
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
        SAGE: '🐟 Sage & Bienveillant',
        GAMER_SARCASTIQUE: '🦈 Gamer Sarcastique',
        PROTECTEUR: '🛡️ Protecteur & Sérieux',
        CYBERPUNK: '⚡ Cyberpunk Futuriste',
        CUSTOM: '🎨 Personnalisé',
      };

      const embed = successEmbed({
        footerText: `Configuration par ${ctx.author.tag} • Conforme ToS Discord`,
      })
        .setTitle('⚙️ Configuration ETHONE AI & Salon Dédié')
        .setDescription(
          updated
            ? '✅ Les paramètres du salon IA et de sécurité ont été mis à jour avec succès !'
            : 'Voici la configuration actuelle de l\'intelligence artificielle sur ce serveur :'
        )
        .addFields(
          {
            name: '💬 Salon IA Public Dédié',
            value: currentSettings.dedicatedChannelId
              ? `<#${currentSettings.dedicatedChannelId}> *(Tous les membres peuvent discuter librement ici sans préfixe !)*`
              : '❌ *Aucun salon dédié configuré* (Utilisez `/ai-setup salon:#salon`)',
            inline: false,
          },
          {
            name: '🎭 Humeur du Thon',
            value: `**${moodLabels[currentSettings.thonMood || 'SAGE'] || '🐟 Sage & Bienveillant'}**`,
            inline: true,
          },
          {
            name: '🎨 Génération d\'images (/imagine)',
            value: currentSettings.allowImageGeneration !== false ? '🟢 **Activée** (Modèle Flux)' : '🔴 **Désactivée**',
            inline: true,
          },
          {
            name: '🛡️ Sécurité & Protection DLP',
            value: '🔒 **Filtre Anti-Leak actif** (Tokens bot, clés API, email propriétaire strictement bloqués)',
            inline: false,
          },
          {
            name: `🚫 Mots Bannis AutoMod (${(currentSettings.bannedWords || []).length})`,
            value: formatBannedWordsFieldValue(currentSettings.bannedWords),
            inline: false,
          }
        );

      await ctx.reply({ embeds: [embed] });
    } else {
      await ctx.reply({
        embeds: [infoEmbed().setDescription('Utilisez la commande Slash `/ai-setup` pour configurer le salon dédié, l\'humeur et les mots bannis.')],
      });
    }
  },
};
