import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  MessageFlags,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { RolePermissionService } from '../../modules/roles/services/rolePermissionService.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { successEmbed as buildSuccessEmbed, baseEmbed, errorEmbed } from '../../utils/embeds.js';
import { formatString, getTranslation } from '../../utils/i18n.js';

export const permissionsCommand: Command = {
  name: 'permissions',
  description: 'Gère les rôles du serveur, détection automatique multilingue et présets (Admin)',
  category: 'Administration',
  aliases: ['roles-config', 'perms', 'roles-setup', 'verifier-permissions', 'verifier_permissions'],
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
    const t = getTranslation(ctx.guildConfig.language);
    if (!ctx.guildId || !ctx.guild) {
      await ctx.reply({ embeds: [errorEmbed().setDescription(t.guild_only_plain)] });
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

        const successEmbed = buildSuccessEmbed({
          footerText: formatString(t.perms_footer_configured, { tag: ctx.author.tag }),
        })
          .setTitle(formatString(t.perms_applied_title, { name: selected.name }))
          .setDescription(formatString(t.perms_applied_desc_cmd, { description: selected.description }))
          .addFields(
            {
              name: t.perms_field_admins,
              value: selected.adminRoles.length > 0 ? selected.adminRoles.map((id) => `<@&${id}>`).join(' ') : t.perms_no_role_detected,
              inline: true,
            },
            {
              name: t.perms_field_mods,
              value: selected.modRoles.length > 0 ? selected.modRoles.map((id) => `<@&${id}>`).join(' ') : t.perms_no_role_detected,
              inline: true,
            },
            {
              name: t.perms_field_vip,
              value: selected.vipRoles.length > 0 ? selected.vipRoles.map((id) => `<@&${id}>`).join(' ') : t.perms_no_role_detected,
              inline: true,
            }
          );

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
      .map((r) => `${categoryEmojis[r.detectedCategory]} <@&${r.roleId}> → **${r.recommendationLabel}** ${formatString(t.perms_confidence, { confidence: r.confidence })}`)
      .join('\n');

    const embed = baseEmbed('primary', {
      footerText: t.perms_panel_footer,
    })
      .setTitle(t.perms_panel_title)
      .setDescription(
        formatString(t.perms_panel_desc, {
          count: detectedRoles.length,
          roles: rolesListFormatted || t.perms_no_roles_to_analyze,
          preset: conf.activePreset || 'PRESET_BALANCED',
        })
      )
      .addFields(
        {
          name: t.perms_field_strict,
          value: t.perms_field_strict_value,
          inline: true,
        },
        {
          name: t.perms_field_balanced,
          value: t.perms_field_balanced_value,
          inline: true,
        },
        {
          name: t.perms_field_community,
          value: t.perms_field_community_value,
          inline: true,
        }
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('apply_preset_strict')
        .setLabel(t.perms_btn_strict)
        .setEmoji('🛡️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('apply_preset_balanced')
        .setLabel(t.perms_btn_balanced)
        .setEmoji('⚖️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('apply_preset_community')
        .setLabel(t.perms_btn_community)
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
  const t = getTranslation(guildConfigService.getConfig(interaction.guildId).language);

  // Seuls les administrateurs peuvent cliquer sur ces boutons
  if (
    !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) &&
    interaction.user.id !== interaction.guild.ownerId
  ) {
    await interaction.reply({
      embeds: [errorEmbed().setDescription(t.perms_admin_only)],
      flags: MessageFlags.Ephemeral,
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

  const successEmbed = buildSuccessEmbed()
    .setTitle(formatString(t.perms_applied_title, { name: selected.name }))
    .setDescription(formatString(t.perms_applied_desc_btn, { description: selected.description }))
    .addFields(
      {
        name: t.perms_field_admins,
        value: selected.adminRoles.length > 0 ? selected.adminRoles.map((id) => `<@&${id}>`).join(' ') : t.perms_no_role,
        inline: true,
      },
      {
        name: t.perms_field_mods,
        value: selected.modRoles.length > 0 ? selected.modRoles.map((id) => `<@&${id}>`).join(' ') : t.perms_no_role,
        inline: true,
      },
      {
        name: t.perms_field_vip,
        value: selected.vipRoles.length > 0 ? selected.vipRoles.map((id) => `<@&${id}>`).join(' ') : t.perms_no_role,
        inline: true,
      }
    )
    .setTimestamp();

  await interaction.update({ embeds: [successEmbed], components: [] });
}
