import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { tagStorage, MAX_TAGS_PER_GUILD } from '../storage/tagStorage.js';
import { TAG_NAME_RE } from '../types/tag.js';

function normName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 32);
}

export const tagCommand: Command = {
  name: 'tag',
  description: 'Réponses réutilisables du serveur (FAQ, formats, liens…)',
  category: 'Utilitaires',
  slashData: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Réponses réutilisables du serveur')
    .addSubcommand((sub) =>
      sub
        .setName('get')
        .setDescription('Affiche un tag')
        .addStringOption((o) => o.setName('nom').setDescription('Nom du tag').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('[Gérer les messages] Crée un tag')
        .addStringOption((o) => o.setName('nom').setDescription('a-z 0-9 _ - (max 32)').setRequired(true))
        .addStringOption((o) => o.setName('contenu').setDescription('Le texte à afficher').setRequired(true).setMaxLength(2000))
    )
    .addSubcommand((sub) =>
      sub
        .setName('edit')
        .setDescription('[Gérer les messages] Modifie un tag')
        .addStringOption((o) => o.setName('nom').setDescription('Nom du tag').setRequired(true).setAutocomplete(true))
        .addStringOption((o) => o.setName('contenu').setDescription('Nouveau texte').setRequired(true).setMaxLength(2000))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('[Gérer les messages] Supprime un tag')
        .addStringOption((o) => o.setName('nom').setDescription('Nom du tag').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('Liste les tags du serveur'))
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription("Détails d'un tag (auteur, usages)")
        .addStringOption((o) => o.setName('nom').setDescription('Nom du tag').setRequired(true).setAutocomplete(true))
    ),

  autocomplete: async (interaction) => {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.respond([]);
    const focused = interaction.options.getFocused().toLowerCase();
    const matches = tagStorage
      .getGuild(guildId)
      .filter((t) => t.name.includes(focused))
      .slice(0, 25)
      .map((t) => ({ name: t.name, value: t.name }));
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
    const canManage = ctx.member?.permissions.has(PermissionFlagsBits.ManageMessages) ?? false;

    if (sub === 'get') {
      const name = normName(ctx.interaction!.options.getString('nom', true));
      const tag = tagStorage.get(guildId, name);
      if (!tag) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(`❌ Aucun tag \`${name}\`. \`/tag list\` pour les voir.`)],
          ephemeral: true,
        });
        return;
      }
      tagStorage.recordUse(guildId, name);
      await ctx.reply({ content: tag.content, allowedMentions: { parse: [] } });
      return;
    }

    if (sub === 'list') {
      const list = tagStorage.getGuild(guildId);
      if (list.length === 0) {
        await ctx.reply({
          embeds: [ctx.createEmbed('neutral').setDescription('Aucun tag. `/tag add` pour en créer un.')],
          ephemeral: true,
        });
        return;
      }
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('default')
            .setTitle(`Tags du serveur (${list.length})`)
            .setDescription(list.map((t) => `\`${t.name}\``).join(' · ')),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'info') {
      const name = normName(ctx.interaction!.options.getString('nom', true));
      const tag = tagStorage.get(guildId, name);
      if (!tag) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(`❌ Aucun tag \`${name}\`.`)], ephemeral: true });
        return;
      }
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('default')
            .setTitle(`Tag \`${tag.name}\``)
            .addFields(
              { name: 'Auteur', value: tag.createdBy ? `<@${tag.createdBy}>` : '—', inline: true },
              { name: 'Usages', value: `${tag.uses}`, inline: true },
              { name: 'Modifié', value: `<t:${Math.floor(new Date(tag.updatedAt).getTime() / 1000)}:R>`, inline: true },
              { name: 'Contenu', value: tag.content.slice(0, 1000) }
            ),
        ],
        ephemeral: true,
      });
      return;
    }

    // add / edit / remove — modération
    if (!canManage) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription('❌ Réservé aux membres avec `Gérer les messages`.')],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'add') {
      const name = normName(ctx.interaction!.options.getString('nom', true));
      const content = ctx.interaction!.options.getString('contenu', true).trim();
      if (!TAG_NAME_RE.test(name)) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription('❌ Nom invalide. Autorisé : `a-z`, `0-9`, `_`, `-` (max 32).')],
          ephemeral: true,
        });
        return;
      }
      if (tagStorage.get(guildId, name)) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(`❌ Le tag \`${name}\` existe déjà. Utilise \`/tag edit\`.`)],
          ephemeral: true,
        });
        return;
      }
      if (!tagStorage.canAddMore(guildId)) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(`❌ Limite de ${MAX_TAGS_PER_GUILD} tags atteinte.`)],
          ephemeral: true,
        });
        return;
      }
      tagStorage.set({ guildId, name, content, createdBy: ctx.author.id });
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(`✅ Tag \`${name}\` créé. \`/tag get ${name}\` pour l'afficher.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'edit') {
      const name = normName(ctx.interaction!.options.getString('nom', true));
      const content = ctx.interaction!.options.getString('contenu', true).trim();
      const existing = tagStorage.get(guildId, name);
      if (!existing) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(`❌ Aucun tag \`${name}\`.`)], ephemeral: true });
        return;
      }
      tagStorage.set({ guildId, name, content, createdBy: existing.createdBy });
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(`✅ Tag \`${name}\` modifié.`)],
        ephemeral: true,
      });
      return;
    }

    // remove
    const name = normName(ctx.interaction!.options.getString('nom', true));
    const ok = tagStorage.delete(guildId, name);
    await ctx.reply({
      embeds: [ctx.createEmbed(ok ? 'success' : 'error').setDescription(ok ? `✅ Tag \`${name}\` supprimé.` : `❌ Aucun tag \`${name}\`.`)],
      ephemeral: true,
    });
  },
};
