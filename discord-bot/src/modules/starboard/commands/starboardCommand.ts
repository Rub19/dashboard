import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, TextChannel } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { starboardStorage } from '../storage/starboardStorage.js';

/** Valide un emoji : unicode simple OU emoji custom `<:name:id>` / `<a:name:id>`. */
function normalizeEmoji(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const custom = value.match(/^<(a?):(\w+):(\d+)>$/);
  if (custom) return value;
  // Unicode : 1 à 3 code points (emoji + éventuels sélecteurs / ZWJ courts).
  if ([...value].length <= 4 && !/\s/.test(value)) return value;
  return null;
}

export const starboardCommand: Command = {
  name: 'starboard',
  description: "Configure le hall of fame des messages étoilés (Starboard)",
  category: 'Communauté',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Configure le Starboard : les messages les plus appréciés du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Active le starboard et choisit le salon de publication')
        .addChannelOption((opt) =>
          opt
            .setName('salon')
            .setDescription('Salon où republier les messages étoilés')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('seuil')
            .setDescription("Nombre d'étoiles requis (défaut : 3)")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('emoji').setDescription('Emoji déclencheur (défaut : ⭐)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('salon')
        .setDescription('Change le salon de publication du starboard')
        .addChannelOption((opt) =>
          opt
            .setName('salon')
            .setDescription('Nouveau salon')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('seuil')
        .setDescription("Change le nombre d'étoiles requis")
        .addIntegerOption((opt) =>
          opt.setName('valeur').setDescription('Entre 1 et 100').setMinValue(1).setMaxValue(100).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('emoji')
        .setDescription("Change l'emoji déclencheur")
        .addStringOption((opt) =>
          opt.setName('emoji').setDescription('Unicode (⭐) ou custom (<:nom:id>)').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('options')
        .setDescription('Règle les options fines du starboard')
        .addBooleanOption((opt) =>
          opt.setName('auto_etoile').setDescription("Autoriser l'auteur à s'auto-étoiler")
        )
        .addBooleanOption((opt) =>
          opt.setName('ignorer_bots').setDescription('Ne pas compter les réactions des bots')
        )
        .addBooleanOption((opt) =>
          opt.setName('autoriser_nsfw').setDescription('Republier aussi les salons NSFW')
        )
        .addBooleanOption((opt) =>
          opt
            .setName('retirer_sous_seuil')
            .setDescription("Retirer du starboard si le total repasse sous le seuil")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('ignorer')
        .setDescription("Ajoute ou retire un salon de la liste des salons ignorés")
        .addChannelOption((opt) =>
          opt.setName('salon').setDescription('Salon à basculer').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('toggle').setDescription('Active ou désactive le starboard sans perdre la config')
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Affiche la configuration et les statistiques du starboard')
    ),

  execute: async (ctx: CommandContext) => {
    const guildId = ctx.guild?.id;
    if (!guildId) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription('❌ Cette commande doit être utilisée sur un serveur.')],
        ephemeral: true,
      });
      return;
    }

    if (!ctx.isSlash) {
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('info')
            .setDescription('ℹ️ Utilise la commande slash `/starboard` pour configurer le starboard.'),
        ],
        ephemeral: true,
      });
      return;
    }

    const sub = ctx.interaction!.options.getSubcommand();

    if (sub === 'setup') {
      const channel = ctx.interaction!.options.getChannel('salon', true) as TextChannel;
      const threshold = ctx.interaction!.options.getInteger('seuil') ?? undefined;
      const emojiRaw = ctx.interaction!.options.getString('emoji');
      const emoji = emojiRaw ? normalizeEmoji(emojiRaw) : undefined;

      if (emojiRaw && !emoji) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription('❌ Emoji invalide. Donne un emoji unicode (⭐) ou custom `<:nom:id>`.')],
          ephemeral: true,
        });
        return;
      }

      const config = starboardStorage.updateConfig(guildId, {
        enabled: true,
        channelId: channel.id,
        ...(threshold ? { threshold } : {}),
        ...(emoji ? { emoji } : {}),
      });

      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setTitle('⭐ Starboard activé')
            .setDescription(
              `Les messages qui atteignent **${config.threshold}** ${config.emoji} seront republiés dans <#${channel.id}>.`
            ),
        ],
      });
      return;
    }

    if (sub === 'salon') {
      const channel = ctx.interaction!.options.getChannel('salon', true) as TextChannel;
      starboardStorage.updateConfig(guildId, { channelId: channel.id });
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(`✅ Salon du starboard : <#${channel.id}>.`)],
      });
      return;
    }

    if (sub === 'seuil') {
      const value = ctx.interaction!.options.getInteger('valeur', true);
      const config = starboardStorage.updateConfig(guildId, { threshold: value });
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(`✅ Seuil : **${config.threshold}** ${config.emoji}.`)],
      });
      return;
    }

    if (sub === 'emoji') {
      const emoji = normalizeEmoji(ctx.interaction!.options.getString('emoji', true));
      if (!emoji) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription('❌ Emoji invalide. Donne un emoji unicode (⭐) ou custom `<:nom:id>`.')],
          ephemeral: true,
        });
        return;
      }
      starboardStorage.updateConfig(guildId, { emoji });
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(`✅ Emoji déclencheur : ${emoji}.`)],
      });
      return;
    }

    if (sub === 'options') {
      const patch: Record<string, boolean> = {};
      const selfStar = ctx.interaction!.options.getBoolean('auto_etoile');
      const ignoreBots = ctx.interaction!.options.getBoolean('ignorer_bots');
      const allowNsfw = ctx.interaction!.options.getBoolean('autoriser_nsfw');
      const removeBelow = ctx.interaction!.options.getBoolean('retirer_sous_seuil');
      if (selfStar !== null) patch.selfStarAllowed = selfStar;
      if (ignoreBots !== null) patch.ignoreBots = ignoreBots;
      if (allowNsfw !== null) patch.allowNsfw = allowNsfw;
      if (removeBelow !== null) patch.removeBelowThreshold = removeBelow;

      if (Object.keys(patch).length === 0) {
        await ctx.reply({
          embeds: [ctx.createEmbed('info').setDescription('ℹ️ Aucune option fournie.')],
          ephemeral: true,
        });
        return;
      }

      const config = starboardStorage.updateConfig(guildId, patch);
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setTitle('⭐ Options mises à jour')
            .setDescription(
              [
                `Auto-étoile : ${config.selfStarAllowed ? 'autorisée' : 'refusée'}`,
                `Réactions des bots : ${config.ignoreBots ? 'ignorées' : 'comptées'}`,
                `Salons NSFW : ${config.allowNsfw ? 'inclus' : 'exclus'}`,
                `Retrait sous le seuil : ${config.removeBelowThreshold ? 'oui' : 'non'}`,
              ].join('\n')
            ),
        ],
      });
      return;
    }

    if (sub === 'ignorer') {
      const channel = ctx.interaction!.options.getChannel('salon', true);
      const config = starboardStorage.getConfig(guildId);
      const set = new Set(config.ignoredChannelIds);
      let added: boolean;
      if (set.has(channel.id)) {
        set.delete(channel.id);
        added = false;
      } else {
        set.add(channel.id);
        added = true;
      }
      starboardStorage.updateConfig(guildId, { ignoredChannelIds: Array.from(set) });
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setDescription(
              added
                ? `✅ <#${channel.id}> est désormais ignoré par le starboard.`
                : `✅ <#${channel.id}> n'est plus ignoré par le starboard.`
            ),
        ],
      });
      return;
    }

    if (sub === 'toggle') {
      const config = starboardStorage.getConfig(guildId);
      if (!config.channelId) {
        await ctx.reply({
          embeds: [
            ctx
              .createEmbed('error')
              .setDescription('❌ Configure d\'abord un salon avec `/starboard setup`.'),
          ],
          ephemeral: true,
        });
        return;
      }
      const next = starboardStorage.updateConfig(guildId, { enabled: !config.enabled });
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed(next.enabled ? 'success' : 'neutral')
            .setDescription(next.enabled ? '✅ Starboard activé.' : '⏸️ Starboard désactivé.'),
        ],
      });
      return;
    }

    // status
    const overview = starboardStorage.getOverview(guildId);
    const config = starboardStorage.getConfig(guildId);
    const embed = ctx
      .createEmbed(overview.enabled ? 'default' : 'neutral')
      .setTitle('⭐ Configuration du Starboard')
      .addFields(
        { name: 'État', value: overview.enabled ? '🟢 Actif' : '⚪ Inactif', inline: true },
        { name: 'Salon', value: overview.channelId ? `<#${overview.channelId}>` : '—', inline: true },
        { name: 'Emoji', value: overview.emoji, inline: true },
        { name: 'Seuil', value: `${overview.threshold} ⭐`, inline: true },
        { name: 'Messages étoilés', value: `${overview.postedEntries}`, inline: true },
        { name: '⭐ cumulées', value: `${overview.totalStars}`, inline: true },
        {
          name: 'Options',
          value: [
            `Auto-étoile : ${config.selfStarAllowed ? 'oui' : 'non'}`,
            `Bots ignorés : ${config.ignoreBots ? 'oui' : 'non'}`,
            `NSFW inclus : ${config.allowNsfw ? 'oui' : 'non'}`,
            `Retrait sous seuil : ${config.removeBelowThreshold ? 'oui' : 'non'}`,
            config.ignoredChannelIds.length
              ? `Salons ignorés : ${config.ignoredChannelIds.map((id) => `<#${id}>`).join(', ')}`
              : 'Salons ignorés : aucun',
          ].join('\n'),
        }
      );

    if (overview.topMessage && overview.channelId) {
      embed.addFields({
        name: 'Record',
        value: `${overview.topMessage.starCount} ⭐ sur un message`,
      });
    }

    await ctx.reply({ embeds: [embed] });
  },
};
