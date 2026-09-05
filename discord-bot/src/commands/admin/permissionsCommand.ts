import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { RolePermissionService } from '../../modules/roles/services/rolePermissionService.js';
import { guildConfigService } from '../../services/guildConfigService.js';

export const permissionsCommand: Command = {
  name: 'permissions',
  description: 'Gère les rôles du serveur, détection automatique multilingue et présets (Admin)',
  category: 'Administration',
  aliases: ['roles-config', 'perms', 'roles-setup'],
  userPermissions: [PermissionFlagsBits.Administrator],
  slashData: new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Configuration des rôles et permissions avec détection auto et présets')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName('preset')
        .setDescription('Appliquer immédiatement un profil de préset recommandé')
        .addChoices(
          { name: '🛡️ Sécurité Maximale (Owner + Admins stricts)', value: 'PRESET_STRICT' },
          { name: '⚖️ Équilibré (Admins config, Modérateurs sanctions - Recommandé)', value: 'PRESET_BALANCED' },
          { name: '🎉 Communauté Dynamique (Permissions staff + VIP étendues)', value: 'PRESET_COMMUNITY' }
        )
        .setRequired(false)
    ),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guildId || !ctx.guild) {
      await ctx.reply({ content: 'Cette commande ne peut être exécutée que sur un serveur.' });
      return;
    }

    const conf = guildConfigService.getConfig(ctx.guildId);
    const presets = RolePermissionService.generatePresets(ctx.guild);
    const detectedRoles = RolePermissionService.analyzeGuildRoles(ctx.guild);

    let chosenPresetId = ctx.isSlash && ctx.interaction
      ? ctx.interaction.options.getString('preset')
      : null;

    if (chosenPresetId) {
      const selected = presets.find((p) => p.id === chosenPresetId);
      if (selected) {
        guildConfigService.updateConfig(ctx.guildId, {
          adminRoles: selected.adminRoles,
          modRoles: selected.modRoles,
          vipRoles: selected.vipRoles,
          activePreset: selected.id,
        });

        const successEmbed = new EmbedBuilder()
          .setColor(0x10b981) // Émeraude
          .setTitle(`✅ Préset de Permissions Appliqué : ${selected.name}`)
          .setDescription(`${selected.description}\n\nTous les contrôles de modération et d'administration ont été mis à jour instantanément.`)
          .addFields(
            {
              name: '👑 Rôles Administrateurs',
              value: selected.adminRoles.length > 0 ? selected.adminRoles.map((id) => `<@&${id}>`).join(' ') : '*Aucun rôle détecté*',
              inline: true,
            },
            {
              name: '⚔️ Rôles Modérateurs',
              value: selected.modRoles.length > 0 ? selected.modRoles.map((id) => `<@&${id}>`).join(' ') : '*Aucun rôle détecté*',
              inline: true,
            },
            {
              name: '💎 Rôles VIP',
              value: selected.vipRoles.length > 0 ? selected.vipRoles.map((id) => `<@&${id}>`).join(' ') : '*Aucun rôle détecté*',
              inline: true,
            }
          )
          .setFooter({ text: `Configuré par ${ctx.author.tag} • ETHONE Permissions 2.0` })
          .setTimestamp();

        await ctx.reply({ embeds: [successEmbed] });
        return;
      }
    }

    // Affichage du panneau interactif d'analyse des rôles
    const categoryEmojis: Record<string, string> = {
      OWNER: '👑',
      ADMIN: '🛡️',
      MODERATOR: '⚔️',
      VIP: '💎',
      BOT: '🤖',
      MEMBER: '👥',
    };

    const rolesListFormatted = detectedRoles
      .slice(0, 12)
      .map((r) => `${categoryEmojis[r.detectedCategory]} <@&${r.roleId}> → **${r.recommendationLabel}** *(Confiance: ${r.confidence})*`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x6366f1) // Indigo ETHONE
      .setTitle('🛡️ Gestionnaire de Rôles & Recommandations Automatiques')
      .setDescription(
        `L'intelligence de détection multilingue (FR, EN, ES, DE) a analysé les **${detectedRoles.length} rôles** du serveur.\n\n` +
        `**Rôles analysés et recommandations :**\n${rolesListFormatted || '*Aucun rôle à analyser*'}\n\n` +
        `**Préset actif actuellement :** \`${conf.activePreset || 'PRESET_BALANCED'}\``
      )
      .addFields(
        {
          name: '🛡️ Sécurité Maximale',
          value: 'Owner & Admins stricts uniquement.',
          inline: true,
        },
        {
          name: '⚖️ Équilibré (Recommandé)',
          value: 'Admins (config) + Modérateurs (sanctions).',
          inline: true,
        },
        {
          name: '🎉 Communauté Dynamique',
          value: 'Staff élargi et privilèges VIP.',
          inline: true,
        }
      )
      .setFooter({
        text: 'Cliquez sur un bouton ci-dessous pour appliquer un préset en 1 clic.',
      })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('apply_preset_strict')
        .setLabel('Sécurité Maximale')
        .setEmoji('🛡️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('apply_preset_balanced')
        .setLabel('Équilibré (Recommandé)')
        .setEmoji('⚖️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('apply_preset_community')
        .setLabel('Communauté')
        .setEmoji('🎉')
        .setStyle(ButtonStyle.Success)
    );

    await ctx.reply({ embeds: [embed], components: [row] });
  },
};

/**
 * Gestionnaire des clics sur les boutons de présets
 */
export async function handlePermissionPresetButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.guild) return;

  // Seuls les administrateurs peuvent cliquer sur ces boutons
  if (
    !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) &&
    interaction.user.id !== interaction.guild.ownerId
  ) {
    await interaction.reply({
      content: '⛔ Seuls les administrateurs du serveur peuvent modifier les présets de permissions.',
      ephemeral: true,
    });
    return;
  }

  const presetMapping: Record<string, string> = {
    apply_preset_strict: 'PRESET_STRICT',
    apply_preset_balanced: 'PRESET_BALANCED',
    apply_preset_community: 'PRESET_COMMUNITY',
  };

  const presetId = presetMapping[interaction.customId];
  if (!presetId) return;

  const presets = RolePermissionService.generatePresets(interaction.guild);
  const selected = presets.find((p) => p.id === presetId);
  if (!selected) return;

  guildConfigService.updateConfig(interaction.guildId, {
    adminRoles: selected.adminRoles,
    modRoles: selected.modRoles,
    vipRoles: selected.vipRoles,
    activePreset: selected.id,
  });

  const successEmbed = new EmbedBuilder()
    .setColor(0x10b981)
    .setTitle(`✅ Préset de Permissions Appliqué : ${selected.name}`)
    .setDescription(`${selected.description}\n\nConfiguration sauvegardée avec succès.`)
    .addFields(
      {
        name: '👑 Rôles Administrateurs',
        value: selected.adminRoles.length > 0 ? selected.adminRoles.map((id) => `<@&${id}>`).join(' ') : '*Aucun rôle*',
        inline: true,
      },
      {
        name: '⚔️ Rôles Modérateurs',
        value: selected.modRoles.length > 0 ? selected.modRoles.map((id) => `<@&${id}>`).join(' ') : '*Aucun rôle*',
        inline: true,
      },
      {
        name: '💎 Rôles VIP',
        value: selected.vipRoles.length > 0 ? selected.vipRoles.map((id) => `<@&${id}>`).join(' ') : '*Aucun rôle*',
        inline: true,
      }
    )
    .setTimestamp();

  await interaction.update({ embeds: [successEmbed], components: [] });
}
