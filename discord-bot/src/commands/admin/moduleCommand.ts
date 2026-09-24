import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { MODULES, getModule, isModuleEnabled, setModuleEnabled } from '../../services/moduleRegistry.js';
import { noticeEmbed } from '../../utils/embeds.js';

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
    const choices = MODULES.filter((m) => !focused || m.id.includes(focused) || m.label.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((m) => ({
        name: `${m.emoji} ${m.label}${guildId ? (isModuleEnabled(guildId, m.id) ? ' · activé' : ' · désactivé') : ''}`.slice(0, 100),
        value: m.id,
      }));
    await interaction.respond(choices);
  },

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) {
      await ctx.reply({ embeds: [noticeEmbed('error', 'Cette commande est réservée aux serveurs.')], ephemeral: true });
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
        .setTitle('🧩 Modules du serveur')
        .addFields(
          { name: '​', value: lines.slice(0, half).join('\n'), inline: true },
          { name: '​', value: lines.slice(half).join('\n'), inline: true }
        )
        .setFooter({ text: 'Activer / désactiver : /module nom:<module> activer:True ou False' });
      await ctx.reply({ embeds: [embed] });
      return;
    }

    const info = findModule(moduleKey);
    if (!info) {
      await ctx.reply({ embeds: [noticeEmbed('error', `Module inconnu : \`${moduleKey}\`. Utilisez \`/module\` pour voir la liste.`)], ephemeral: true });
      return;
    }

    setModuleEnabled(guildId, info.id, active, 'DISCORD_COMMAND', ctx.author.id);
    const def = getModule(info.id)!;

    await ctx.reply({
      embeds: [
        noticeEmbed(
          active ? 'success' : 'warning',
          `${def.emoji} **${def.label}** est maintenant **${active ? 'activé' : 'désactivé'}** sur ce serveur.${
            active ? '' : '\nSes commandes répondront par un message « module désactivé » jusqu\'à sa réactivation.'
          }`,
          { title: active ? 'Module activé' : 'Module désactivé' }
        ),
      ],
    });
  },
};
