import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { highlightStorage, MAX_KEYWORDS_PER_USER } from '../storage/highlightStorage.js';
import { HIGHLIGHT_KEYWORD_MAX_LENGTH, HIGHLIGHT_KEYWORD_MIN_LENGTH } from '../types/highlight.js';

function normKeyword(raw: string): string {
  return raw.trim();
}

export const highlightCommand: Command = {
  name: 'highlight',
  description: 'Sois notifié en DM quand un mot-clé est mentionné dans le serveur',
  category: 'Utilitaires',
  slashData: new SlashCommandBuilder()
    .setName('highlight')
    .setDescription('Mots-clés surveillés — Google Alerts pour ce serveur')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Surveille un nouveau mot-clé')
        .addStringOption((o) =>
          o
            .setName('mot-cle')
            .setDescription(`2-${HIGHLIGHT_KEYWORD_MAX_LENGTH} caractères`)
            .setMinLength(HIGHLIGHT_KEYWORD_MIN_LENGTH)
            .setMaxLength(HIGHLIGHT_KEYWORD_MAX_LENGTH)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Arrête de surveiller un mot-clé')
        .addStringOption((o) =>
          o.setName('mot-cle').setDescription('Mot-clé à retirer').setRequired(true).setAutocomplete(true)
        )
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('Tes mots-clés surveillés sur ce serveur'))
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Active ou coupe tous tes highlights sur ce serveur')
        .addBooleanOption((o) => o.setName('actif').setDescription('Activer les highlights').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('mute-channel')
        .setDescription("Ignore un salon (tu ne recevras plus de highlight venant de là)")
        .addChannelOption((o) =>
          o
            .setName('salon')
            .setDescription('Salon à ignorer')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('unmute-channel')
        .setDescription('Réactive les highlights pour un salon ignoré')
        .addChannelOption((o) =>
          o
            .setName('salon')
            .setDescription('Salon à réactiver')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread)
            .setRequired(true)
        )
    ),

  autocomplete: async (interaction) => {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.respond([]);
    const focused = interaction.options.getFocused().toLowerCase();
    // Un membre ne voit que ses PROPRES mots-clés en autocomplétion (jamais ceux des autres).
    const matches = highlightStorage
      .listForUser(guildId, interaction.user.id)
      .filter((k) => k.keyword.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((k) => ({ name: k.keyword, value: k.keyword }));
    await interaction.respond(matches);
  },

  execute: async (ctx: CommandContext) => {
    const guildId = ctx.guild?.id;
    if (!guildId || !ctx.isSlash) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription('❌ Commande slash à utiliser sur un serveur.')],
        ephemeral: true,
      });
      return;
    }
    const sub = ctx.interaction!.options.getSubcommand();
    const userId = ctx.author.id;

    if (sub === 'add') {
      const keyword = normKeyword(ctx.interaction!.options.getString('mot-cle', true));
      if (keyword.length < HIGHLIGHT_KEYWORD_MIN_LENGTH || keyword.length > HIGHLIGHT_KEYWORD_MAX_LENGTH) {
        await ctx.reply({
          embeds: [
            ctx
              .createEmbed('error')
              .setDescription(`❌ Le mot-clé doit faire entre ${HIGHLIGHT_KEYWORD_MIN_LENGTH} et ${HIGHLIGHT_KEYWORD_MAX_LENGTH} caractères.`),
          ],
          ephemeral: true,
        });
        return;
      }
      if (highlightStorage.has(guildId, userId, keyword)) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(`❌ Tu surveilles déjà \`${keyword}\`.`)],
          ephemeral: true,
        });
        return;
      }
      if (!highlightStorage.canAddMore(guildId, userId)) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(`❌ Limite de ${MAX_KEYWORDS_PER_USER} mots-clés atteinte.`)],
          ephemeral: true,
        });
        return;
      }
      highlightStorage.add({ guildId, userId, keyword });
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(`✅ Mot-clé \`${keyword}\` surveillé. Tu recevras un DM quand quelqu'un d'autre l'écrit.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'remove') {
      const keyword = normKeyword(ctx.interaction!.options.getString('mot-cle', true));
      const ok = highlightStorage.remove(guildId, userId, keyword);
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed(ok ? 'success' : 'error')
            .setDescription(ok ? `✅ Mot-clé \`${keyword}\` retiré.` : `❌ Tu ne surveilles pas \`${keyword}\`.`),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'list') {
      const keywords = highlightStorage.listForUser(guildId, userId);
      const config = highlightStorage.getConfig(guildId, userId);
      const embed = ctx.createEmbed('default').setTitle('👁️ Tes highlights');
      embed.addFields({ name: 'État', value: config.enabled ? '🟢 Actif' : '⚪ En pause', inline: true });
      embed.addFields({
        name: `Mots-clés (${keywords.length}/${MAX_KEYWORDS_PER_USER})`,
        value: keywords.length > 0 ? keywords.map((k) => `\`${k.keyword}\``).join(', ') : 'Aucun. `/highlight add` pour commencer.',
      });
      if (config.ignoredChannelIds.length > 0) {
        embed.addFields({
          name: 'Salons ignorés',
          value: config.ignoredChannelIds.map((id) => `<#${id}>`).join(', '),
        });
      }
      await ctx.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'toggle') {
      const active = ctx.interaction!.options.getBoolean('actif', true);
      highlightStorage.updateConfig(guildId, userId, { enabled: active });
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setDescription(active ? '🟢 Highlights réactivés.' : '⚪ Highlights mis en pause (tes mots-clés sont conservés).'),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'mute-channel') {
      const channel = ctx.interaction!.options.getChannel('salon', true);
      const config = highlightStorage.getConfig(guildId, userId);
      if (config.ignoredChannelIds.includes(channel.id)) {
        await ctx.reply({
          embeds: [ctx.createEmbed('info').setDescription(`ℹ️ <#${channel.id}> est déjà ignoré.`)],
          ephemeral: true,
        });
        return;
      }
      highlightStorage.updateConfig(guildId, userId, { ignoredChannelIds: [...config.ignoredChannelIds, channel.id] });
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(`✅ <#${channel.id}> ignoré — plus aucun highlight depuis ce salon.`)],
        ephemeral: true,
      });
      return;
    }

    // unmute-channel
    const channel = ctx.interaction!.options.getChannel('salon', true);
    const config = highlightStorage.getConfig(guildId, userId);
    if (!config.ignoredChannelIds.includes(channel.id)) {
      await ctx.reply({
        embeds: [ctx.createEmbed('info').setDescription(`ℹ️ <#${channel.id}> n'était pas ignoré.`)],
        ephemeral: true,
      });
      return;
    }
    highlightStorage.updateConfig(guildId, userId, {
      ignoredChannelIds: config.ignoredChannelIds.filter((id) => id !== channel.id),
    });
    await ctx.reply({
      embeds: [ctx.createEmbed('success').setDescription(`✅ <#${channel.id}> réactivé pour les highlights.`)],
      ephemeral: true,
    });
  },
};
