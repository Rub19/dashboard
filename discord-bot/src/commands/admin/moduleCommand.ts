import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { GuildModules } from '../../types/guildConfig.js';

/**
 * /module — Active/désactive un module entier du bot sur ce serveur (modération,
 * accueil, logs, rôles auto, tickets, fun, musique). Distinct de `/automod toggle`,
 * qui contrôle les détecteurs de l'AutoMod (spam, liens, etc.) — ceci contrôle les
 * grandes catégories de fonctionnalités du bot elles-mêmes.
 */
const MODULE_LABELS: Record<keyof GuildModules, { label: string; emoji: string; desc: string }> = {
  moderation: { label: 'Modération', emoji: '🛡️', desc: 'Commandes /warn, /ban, /kick, /timeout, etc.' },
  welcome: { label: "Messages d'Accueil", emoji: '👋', desc: 'Messages de bienvenue/départ automatiques.' },
  logging: { label: "Logs & Audit", emoji: '📋', desc: "Journal des actions de modération et d'audit du serveur." },
  autoRoles: { label: 'Rôles Automatiques', emoji: '🎭', desc: "Attribution automatique de rôles à l'arrivée." },
  tickets: { label: 'Tickets de Support', emoji: '🎫', desc: 'Système de tickets/support client.' },
  fun: { label: 'Fun & Divertissement', emoji: '🎉', desc: 'Commandes ludiques non essentielles.' },
  music: { label: 'Musique', emoji: '🎵', desc: 'Commandes /play, /queue, /skip, etc.' },
};

export const moduleCommand: Command = {
  name: 'module',
  description: 'Active ou désactive un module entier du bot sur ce serveur (modération, accueil, tickets, musique...)',
  category: 'Administration',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('module')
    .setDescription('Active ou désactive un module entier du bot sur ce serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName('nom')
        .setDescription('Module à activer/désactiver')
        .setRequired(false)
        .addChoices(
          ...(Object.keys(MODULE_LABELS) as (keyof GuildModules)[]).map((key) => ({
            name: `${MODULE_LABELS[key].emoji} ${MODULE_LABELS[key].label}`,
            value: key,
          }))
        )
    )
    .addBooleanOption((opt) =>
      opt.setName('activer').setDescription('Activer (True) ou Désactiver (False)').setRequired(false)
    ),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande est réservée aux serveurs.')], ephemeral: true });
      return;
    }

    const conf = ctx.guildConfig;
    let moduleKey: string | null = null;
    let active: boolean | null = null;

    if (ctx.isSlash && ctx.interaction) {
      moduleKey = ctx.interaction.options.getString('nom');
      active = ctx.interaction.options.getBoolean('activer');
    } else if (ctx.args.length > 0) {
      moduleKey = ctx.args[0];
      active = ctx.args[1]?.toLowerCase() === 'on' || ctx.args[1]?.toLowerCase() === 'true';
    }

    // Sans argument : affiche l'état de tous les modules
    if (!moduleKey || active === null) {
      const embed = ctx
        .createEmbed('info')
        .setTitle('🧩 Modules du Serveur')
        .setDescription(
          (Object.keys(MODULE_LABELS) as (keyof GuildModules)[])
            .map((key) => {
              const info = MODULE_LABELS[key];
              const on = conf.modules[key];
              return `${on ? '🟢' : '⚪'} ${info.emoji} **${info.label}** — ${info.desc}`;
            })
            .join('\n')
        )
        .setFooter({ text: 'Utilisation : /module nom:<module> activer:<True/False>' });
      await ctx.reply({ embeds: [embed] });
      return;
    }

    const info = MODULE_LABELS[moduleKey as keyof GuildModules];
    if (!info) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(`❌ Module inconnu : \`${moduleKey}\`.`)],
        ephemeral: true,
      });
      return;
    }

    guildConfigService.updateConfig(ctx.guild.id, {
      modules: { [moduleKey]: active } as Partial<GuildModules>,
    });

    await ctx.reply({
      embeds: [
        ctx.createEmbed('success').setDescription(
          `${active ? '🟢' : '⚪'} **${info.emoji} ${info.label}** ${active ? 'activé' : 'désactivé'} sur ce serveur.`
        ),
      ],
    });
  },
};
