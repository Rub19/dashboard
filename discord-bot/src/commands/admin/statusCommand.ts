import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { config } from '../../config.js';
import { PresenceService } from '../../modules/presence/services/presenceService.js';
import { discordOwnerPanel } from '../../modules/presence/ui/discordOwnerPanel.js';
import { DiscordStatus, DiscordActivityType } from '../../modules/presence/types/index.js';
import { errorEmbed, warningEmbed, successEmbed } from '../../utils/embeds.js';

/**
 * /status — Affiche ou modifie le statut Discord & l'activité globale du bot.
 *
 * La présence Discord (statut + activité) est appliquée une seule fois par
 * connexion Gateway et vaut donc pour TOUS les serveurs où le bot est présent —
 * elle n'est jamais spécifique à un serveur. C'est pourquoi cette commande est
 * strictement réservée au Bot Owner (comme le panneau de contrôle DM existant),
 * et non ouverte aux administrateurs de serveur comme /settings.
 */
export const statusCommand: Command = {
  name: 'status',
  description: "Affiche ou modifie le statut Discord et l'activité globale du bot (réservé au Bot Owner)",
  category: 'Administration',
  aliases: ['presence'],
  slashData: new SlashCommandBuilder()
    .setName('status')
    .setDescription("Affiche ou modifie le statut Discord global du bot (réservé au Bot Owner)")
    .addStringOption((opt) =>
      opt
        .setName('etat')
        .setDescription('Statut Discord du bot')
        .setRequired(false)
        .addChoices(
          { name: '🟢 En ligne', value: 'online' },
          { name: '🌙 Inactif', value: 'idle' },
          { name: '⛔ Ne pas déranger', value: 'dnd' },
          { name: '⚫ Invisible', value: 'invisible' }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName('activite')
        .setDescription("Type d'activité affichée")
        .setRequired(false)
        .addChoices(
          { name: 'Joue à…', value: 'Playing' },
          { name: 'En direct sur…', value: 'Streaming' },
          { name: 'Écoute…', value: 'Listening' },
          { name: 'Regarde…', value: 'Watching' },
          { name: 'Participe à…', value: 'Competing' }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName('texte')
        .setDescription("Texte de l'activité (ex : /help • ethone.dev)")
        .setRequired(false)
        .setMaxLength(128)
    )
    .addStringOption((opt) =>
      opt
        .setName('url')
        .setDescription('URL Twitch/YouTube (uniquement si activité = En direct sur)')
        .setRequired(false)
    ),

  execute: async (ctx: CommandContext) => {
    if (ctx.author.id !== config.botOwnerId) {
      await ctx.reply({
        embeds: [errorEmbed().setDescription('⛔ **Accès refusé** : cette commande est réservée au Bot Owner — le statut Discord du bot est global et partagé par tous les serveurs.')],
        ephemeral: true,
      });
      return;
    }

    const presenceService = PresenceService.getInstance();
    const current = presenceService.getCurrentState();

    let status: DiscordStatus | null = null;
    let activityType: DiscordActivityType | null = null;
    let activityText: string | null = null;
    let streamUrl: string | undefined;

    if (ctx.isSlash && ctx.interaction) {
      status = (ctx.interaction.options.getString('etat') as DiscordStatus | null) || null;
      activityType = (ctx.interaction.options.getString('activite') as DiscordActivityType | null) || null;
      activityText = ctx.interaction.options.getString('texte');
      streamUrl = ctx.interaction.options.getString('url') || undefined;
    }

    // Aucun paramètre fourni : affiche simplement le panneau interactif existant
    // (état actuel + boutons rapides), sans rien modifier.
    if (!status && !activityType && !activityText) {
      const embed = discordOwnerPanel.buildPanelEmbed();
      const components = discordOwnerPanel.buildActionRows() as any;
      await ctx.reply({ embeds: [embed], components, ephemeral: true });
      return;
    }

    const result = presenceService.updatePresence(
      status || current.status,
      {
        type: activityType || current.activity.type,
        name: activityText ?? current.activity.name,
        url: streamUrl,
      },
      ctx.author.username,
      ctx.author.id,
      'manual',
      'Modifié via /status'
    );

    if (result.rateLimited) {
      await ctx.reply({
        embeds: [warningEmbed().setDescription('⏳ Limite de mise à jour Gateway atteinte (max 5 changements/minute). Réessayez dans quelques instants.')],
        ephemeral: true,
      });
      return;
    }

    const embed = discordOwnerPanel.buildPanelEmbed();
    const components = discordOwnerPanel.buildActionRows() as any;
    const confirmEmbed = (result.success ? successEmbed() : warningEmbed()).setDescription(
      result.success
        ? '✅ Statut du bot mis à jour avec succès.'
        : '⚠️ Statut appliqué en mode de secours (vérifiez la connexion Gateway).'
    );
    await ctx.reply({
      embeds: [confirmEmbed, embed],
      components,
      ephemeral: true,
    });
  },
};
