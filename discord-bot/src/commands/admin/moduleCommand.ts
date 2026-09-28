import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { MODULES, getModule, isModuleEnabled, setModuleEnabled } from '../../services/moduleRegistry.js';
import { noticeEmbed } from '../../utils/embeds.js';
import { formatString, getTranslation } from '../../utils/i18n.js';
import { guildConfigService } from '../../services/guildConfigService.js';

/**
 * /module — Active ou désactive un module entier du bot sur ce serveur. C'est le même interrupteur que celui du hub du
 * dashboard (registre central : services/moduleRegistry.ts) : un changement fait ici apparaît tout de suite dans le
 * dashboard, et inversement. Quand un module est désactivé, ses commandes répondent par un message d'erreur.
 * Distinct de `/automod toggle`, qui contrôle les détecteurs de l'AutoMod (spam, liens, etc.).
 */
function findModule(query: string) {
  const q = query.trim().toLowerCase();
  return MODULES.find((m) => m.id === q || m.label.toLowerCase() === q);
}

export const moduleCommand: Command = {
  name: 'module',
  description: 'Active ou désactive un module du bot sur ce serveur (modération, musique, tickets, sondages...)',
  category: 'Administration',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('module')
    .setDescription('Active ou désactive un module du bot sur ce serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) => opt.setName('nom').setDescription('Module à activer ou désactiver').setRequired(false).setAutocomplete(true))
    .addBooleanOption((opt) => opt.setName('activer').setDescription('Activer (True) ou désactiver (False)').setRequired(false)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const guildId = interaction.guildId;
    const t = getTranslation(guildConfigService.getConfig(guildId).language);
    const choices = MODULES.filter((m) => !focused || m.id.includes(focused) || m.label.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((m) => ({
        name: `${m.emoji} ${m.label}${guildId ? (isModuleEnabled(guildId, m.id) ? t.module_choice_enabled : t.module_choice_disabled) : ''}`.slice(0, 100),
        value: m.id,
      }));
    await interaction.respond(choices);
  },

  async execute(ctx: CommandContext): Promise<void> {
    const t = getTranslation(ctx.guildConfig.language);
    if (!ctx.guild) {
      await ctx.reply({ embeds: [noticeEmbed('error', t.guild_only_reserved)], ephemeral: true });
      return;
    }
    const guildId = ctx.guild.id;

    let moduleKey: string | null = null;
    let active: boolean | null = null;

    if (ctx.isSlash && ctx.interaction) {
      moduleKey = ctx.interaction.options.getString('nom');
      active = ctx.interaction.options.getBoolean('activer');
    } else if (ctx.args.length > 0) {
      moduleKey = ctx.args[0];
      const flag = ctx.args[1]?.toLowerCase();
      active = flag === undefined ? null : ['on', 'true', 'oui', 'activer', '1'].includes(flag) ? true : ['off', 'false', 'non', 'desactiver', 'désactiver', '0'].includes(flag) ? false : null;
    }

    // Sans argument (ou sans état demandé) : liste de tous les modules avec leur état
    if (!moduleKey || active === null) {
      const lines = MODULES.map((m) => `${isModuleEnabled(guildId, m.id) ? '🟢' : '⚫'} ${m.emoji} **${m.label}** \`${m.id}\``);
      const half = Math.ceil(lines.length / 2);
      const embed = ctx
        .createEmbed('info')
        .setTitle(t.module_list_title)
        .addFields(
          { name: '​', value: lines.slice(0, half).join('\n'), inline: true },
          { name: '​', value: lines.slice(half).join('\n'), inline: true }
        )
        .setFooter({ text: t.module_list_footer });
      await ctx.reply({ embeds: [embed] });
      return;
    }

    const info = findModule(moduleKey);
    if (!info) {
      await ctx.reply({ embeds: [noticeEmbed('error', formatString(t.module_unknown, { module: moduleKey }))], ephemeral: true });
      return;
    }

    setModuleEnabled(guildId, info.id, active, 'DISCORD_COMMAND', ctx.author.id);
    const def = getModule(info.id)!;

    await ctx.reply({
      embeds: [
        noticeEmbed(
          active ? 'success' : 'warning',
          formatString(t.module_toggled_desc, {
            emoji: def.emoji,
            label: def.label,
            state: active ? t.module_state_on : t.module_state_off,
            note: active ? '' : t.module_off_note,
          }),
          { title: active ? t.module_title_enabled : t.module_title_disabled }
        ),
      ],
    });
  },
};
