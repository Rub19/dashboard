import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, TextChannel } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { stickyStorage } from '../storage/stickyStorage.js';
import { stickyService } from '../services/stickyService.js';
import { emitConfigUpdated } from '../../../services/syncConfigEmitter.js';
import { trg } from '../../../utils/tr.js';

const HEX = /^#([0-9A-Fa-f]{6})$/;

export const stickyCommand: Command = {
  name: 'sticky',
  description: "Garde un message épinglé en bas d'un salon (Sticky Messages)",
  category: 'Communauté',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('sticky')
    .setDescription('Garde un message toujours visible en bas d\'un salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Crée ou remplace le sticky d\'un salon')
        .addChannelOption((opt) =>
          opt
            .setName('salon')
            .setDescription('Salon où fixer le message')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('contenu').setDescription('Texte du sticky (markdown supporté)').setRequired(true).setMaxLength(2000)
        )
        .addStringOption((opt) =>
          opt.setName('titre').setDescription("Titre de l'embed (défaut : « 📌 À lire »)").setMaxLength(256)
        )
        .addBooleanOption((opt) =>
          opt.setName('embed').setDescription('Afficher en embed (défaut : oui)')
        )
        .addStringOption((opt) =>
          opt.setName('couleur').setDescription('Couleur de l\'embed, hex #RRGGBB (défaut : #5865F2)')
        )
        .addIntegerOption((opt) =>
          opt
            .setName('anti_rebond')
            .setDescription('Délai en secondes entre 2 repositionnements (2–120, défaut : 6)')
            .setMinValue(2)
            .setMaxValue(120)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('retirer')
        .setDescription('Supprime le sticky d\'un salon')
        .addChannelOption((opt) =>
          opt.setName('salon').setDescription('Salon concerné').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('pause')
        .setDescription('Met en pause / réactive le sticky d\'un salon (sans perdre le contenu)')
        .addChannelOption((opt) =>
          opt.setName('salon').setDescription('Salon concerné').setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('liste').setDescription('Liste les stickies du serveur'))
    .addSubcommand((sub) =>
      sub
        .setName('apercu')
        .setDescription('Affiche la configuration du sticky d\'un salon')
        .addChannelOption((opt) =>
          opt.setName('salon').setDescription('Salon concerné').setRequired(true)
        )
    ),

  execute: async (ctx: CommandContext) => {
    const guild = ctx.guild;
    if (!guild) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(trg(ctx, '❌ Cette commande doit être utilisée sur un serveur.'))],
        ephemeral: true,
      });
      return;
    }
    if (!ctx.isSlash) {
      await ctx.reply({
        embeds: [ctx.createEmbed('info').setDescription(trg(ctx, 'ℹ️ Utilise la commande slash `/sticky`.'))],
        ephemeral: true,
      });
      return;
    }

    const sub = ctx.interaction!.options.getSubcommand();

    if (sub === 'set') {
      const channel = ctx.interaction!.options.getChannel('salon', true) as TextChannel;
      const content = ctx.interaction!.options.getString('contenu', true).trim();
      const title = ctx.interaction!.options.getString('titre') ?? undefined;
      const asEmbed = ctx.interaction!.options.getBoolean('embed');
      const colorRaw = ctx.interaction!.options.getString('couleur');
      const cooldown = ctx.interaction!.options.getInteger('anti_rebond') ?? undefined;

      if (colorRaw && !HEX.test(colorRaw.trim())) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(trg(ctx, '❌ Couleur invalide. Format attendu : `#RRGGBB`.'))],
          ephemeral: true,
        });
        return;
      }

      // Retirer l'ancien message posté avant de reconfigurer.
      await stickyService.clearPosted(guild, channel.id).catch(() => {});

      const stickyConfig = stickyStorage.upsert({
        guildId: guild.id,
        channelId: channel.id,
        content,
        ...(title !== undefined ? { title } : {}),
        ...(asEmbed !== null ? { asEmbed } : {}),
        ...(colorRaw ? { color: colorRaw.trim() } : {}),
        ...(cooldown ? { cooldownSeconds: cooldown } : {}),
        enabled: true,
        lastMessageId: null,
        createdBy: ctx.author.id,
      });
      emitConfigUpdated('stickyMessages', guild.id, stickyConfig, 'DISCORD_COMMAND', ctx.author.id);

      await stickyService.forceRepost(guild, channel.id).catch(() => {});

      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setTitle(trg(ctx, '📌 Sticky configuré'))
            .setDescription(trg(ctx, 'Le message restera en bas de <#{id}>.', { id: channel.id })),
        ],
      });
      return;
    }

    if (sub === 'retirer') {
      const channel = ctx.interaction!.options.getChannel('salon', true);
      const existing = stickyStorage.get(guild.id, channel.id);
      if (!existing) {
        await ctx.reply({
          embeds: [ctx.createEmbed('info').setDescription(trg(ctx, 'ℹ️ Aucun sticky sur <#{id}>.', { id: channel.id }))],
          ephemeral: true,
        });
        return;
      }
      await stickyService.clearPosted(guild, channel.id).catch(() => {});
      stickyStorage.delete(guild.id, channel.id);
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(trg(ctx, '✅ Sticky retiré de <#{id}>.', { id: channel.id }))],
      });
      return;
    }

    if (sub === 'pause') {
      const channel = ctx.interaction!.options.getChannel('salon', true);
      const existing = stickyStorage.get(guild.id, channel.id);
      if (!existing) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(trg(ctx, '❌ Aucun sticky sur <#{id}>.', { id: channel.id }))],
          ephemeral: true,
        });
        return;
      }
      const next = stickyStorage.upsert({ guildId: guild.id, channelId: channel.id, enabled: !existing.enabled });
      emitConfigUpdated('stickyMessages', guild.id, next, 'DISCORD_COMMAND', ctx.author.id);
      if (next.enabled) {
        await stickyService.forceRepost(guild, channel.id).catch(() => {});
      } else {
        await stickyService.clearPosted(guild, channel.id).catch(() => {});
      }
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed(next.enabled ? 'success' : 'neutral')
            .setDescription(next.enabled ? trg(ctx, '✅ Sticky réactivé sur <#{id}>.', { id: channel.id }) : trg(ctx, '⏸️ Sticky mis en pause sur <#{id}>.', { id: channel.id })),
        ],
      });
      return;
    }

    if (sub === 'liste') {
      const list = stickyStorage.getGuild(guild.id);
      if (list.length === 0) {
        await ctx.reply({
          embeds: [ctx.createEmbed('neutral').setDescription(trg(ctx, 'Aucun sticky configuré. Utilise `/sticky set`.'))],
          ephemeral: true,
        });
        return;
      }
      const embed = ctx.createEmbed('default').setTitle(trg(ctx, '📌 Stickies du serveur'));
      for (const s of list.slice(0, 20)) {
        embed.addFields({
          name: trg(ctx, '{v0} {v1} · {repostCount} repos.', { v0: s.enabled ? '🟢' : '⏸️', v1: s.asEmbed ? 'Embed' : 'Texte', repostCount: s.repostCount }),
          value: `<#${s.channelId}>\n> ${s.content.slice(0, 80)}${s.content.length > 80 ? '…' : ''}`,
        });
      }
      await ctx.reply({ embeds: [embed] });
      return;
    }

    // apercu
    const channel = ctx.interaction!.options.getChannel('salon', true);
    const sticky = stickyStorage.get(guild.id, channel.id);
    if (!sticky) {
      await ctx.reply({
        embeds: [ctx.createEmbed('info').setDescription(trg(ctx, 'ℹ️ Aucun sticky sur <#{id}>.', { id: channel.id }))],
        ephemeral: true,
      });
      return;
    }
    await ctx.reply({
      embeds: [
        ctx
          .createEmbed(sticky.enabled ? 'default' : 'neutral')
          .setTitle(trg(ctx, '📌 Sticky de #{name}', { name: channel.name }))
          .addFields(
            { name: trg(ctx, 'État'), value: sticky.enabled ? trg(ctx, '🟢 Actif') : trg(ctx, '⏸️ En pause'), inline: true },
            { name: trg(ctx, 'Format'), value: sticky.asEmbed ? trg(ctx, 'Embed ({color})', { color: sticky.color }) : trg(ctx, 'Texte simple'), inline: true },
            { name: trg(ctx, 'Anti-rebond'), value: `${sticky.cooldownSeconds}s`, inline: true },
            { name: trg(ctx, 'Repositionnements'), value: `${sticky.repostCount}`, inline: true },
            { name: trg(ctx, 'Contenu'), value: sticky.content.slice(0, 1000) || '—' }
          ),
      ],
      ephemeral: true,
    });
  },
};
