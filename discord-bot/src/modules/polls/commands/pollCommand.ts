import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { pollRepository } from '../storage/pollRepository.js';
import { pollService } from '../services/pollService.js';
import { pollResultService } from '../services/pollResultService.js';
import { discordPollPanel } from '../ui/discordPollPanel.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';
import { SLASH_DESTINATION_TYPES, isSendableTarget, sendToConfiguredChannel } from '../../../utils/channelSend.js';
import { nativePollService, nativeIncompatibilityError, toPollEmoji, validateNativeInput, NATIVE_MAX_HOURS } from '../services/nativePollService.js';
import { DiscordPollSchema } from '../types/index.js';

/** "🍕 Pizza; Burger; 🥗 Salade" -> réponses, l'emoji de tête (facultatif) est détecté. */
export function parseSlashAnswers(raw: string): Array<{ text: string; emoji?: string }> {
  return raw
    .split(/[;|]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\S+)\s+(.+)$/);
      return m && toPollEmoji(m[1]) ? { emoji: m[1], text: m[2]!.trim() } : { text: part };
    });
}

export const pollCommand: Command = {
  name: 'poll',
  description: 'Sondages, votes et décisions du serveur',
  category: 'Communauté',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Gestion avancée des sondages et votes communautaires')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Créer et publier un sondage (classique ou natif Discord)')
        .addStringOption((opt) => opt.setName('question').setDescription('Question du sondage').setMaxLength(300).setRequired(true))
        .addStringOption((opt) =>
          opt.setName('answers').setDescription('Réponses séparées par « ; » (2 à 10, emoji facultatif en tête : 🍕 Pizza; Burger)').setRequired(true)
        )
        .addBooleanOption((opt) =>
          opt.setName('natif').setDescription('Utiliser le sondage natif de Discord (simple, sans quorum ni pondération)').setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt.setName('duration').setDescription(`Durée en heures (1–${NATIVE_MAX_HOURS}, défaut 24)`).setMinValue(1).setMaxValue(NATIVE_MAX_HOURS).setRequired(false)
        )
        .addBooleanOption((opt) => opt.setName('multiselect').setDescription('Autoriser plusieurs réponses').setRequired(false))
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Salon de destination (défaut : ce salon)')
            .addChannelTypes(...SLASH_DESTINATION_TYPES)
            .setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt.setName('quorum').setDescription('Classique uniquement : nombre minimal de participants').setMinValue(1).setRequired(false)
        )
        .addBooleanOption((opt) => opt.setName('secret').setDescription('Classique uniquement : vote anonyme').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Publier un panneau de vote interactif dans un salon Discord')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('ID du sondage').setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Salon de destination')
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement,
              ChannelType.GuildForum,
              ChannelType.GuildMedia,
              ChannelType.PublicThread
            )
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('Clôturer immédiatement un sondage et exécuter les automatisations')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('ID du sondage à terminer').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('results')
        .setDescription("Afficher les résultats actuels ou finaux d'un sondage")
        .addStringOption((opt) =>
          opt.setName('id').setDescription('ID du sondage').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('Lister tous les sondages actifs de ce serveur')
    ),

  execute: async (ctx: CommandContext) => {
    const t = getTranslation(ctx.guildConfig.language);
    const guildId = ctx.guild?.id;
    if (!guildId) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)], ephemeral: true });
      return;
    }

    let subcommand = 'list';
    let pollId = '';

    if (ctx.isSlash && ctx.interaction) {
      subcommand = ctx.interaction.options.getSubcommand();
      pollId = ctx.interaction.options.getString('id') || '';
    } else {
      subcommand = ctx.args[0]?.toLowerCase() || 'list';
      pollId = ctx.args[1] || '';
    }

    // Différer immédiatement : la publication du panneau et la clôture d'un sondage (subcommandes
    // "panel"/"end" ci-dessous) peuvent dépasser la fenêtre de 3s de Discord et invalider le token
    // d'interaction ("Unknown interaction" / 10062) si on ne le fait pas.
    await ctx.deferReply();

    if (subcommand === 'create') {
      const i = ctx.isSlash ? ctx.interaction : null;
      if (!i) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Utilise la commande slash `/poll create`.')], ephemeral: true });
        return;
      }
      const question = i.options.getString('question', true).trim();
      const answers = parseSlashAnswers(i.options.getString('answers', true));
      const natif = i.options.getBoolean('natif') ?? false;
      const durationHours = i.options.getInteger('duration') ?? 24;
      const multiselect = i.options.getBoolean('multiselect') ?? false;
      const quorum = i.options.getInteger('quorum');
      const secret = i.options.getBoolean('secret') ?? false;
      const channel: any = i.options.getChannel('channel') || ctx.channel;
      const fail = (msg: string) => ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(msg)], ephemeral: true });

      if (!channel || !isSendableTarget(channel)) return void (await fail(t.poll_invalid_channel));
      const invalid = validateNativeInput({ question, answers, durationHours });
      if (invalid) return void (await fail(invalid));

      if (natif) {
        const conflict = nativeIncompatibilityError({ quorum: quorum !== null, secret });
        if (conflict) return void (await fail(conflict));
        const created = await nativePollService.create(ctx.client, {
          guildId,
          channelId: channel.id,
          question,
          answers,
          durationHours,
          multiselect,
          creatorId: ctx.user.id,
          creatorTag: ctx.user.username,
        });
        if (!created.success) return void (await fail(created.error || 'Erreur inconnue.'));
        await ctx.reply({
          embeds: [ctx.createEmbed('success').setDescription(`Sondage natif publié dans <#${created.poll!.channelId}> (ID \`${created.poll!.id}\`).`)],
          ephemeral: true,
        });
        return;
      }

      const now = new Date().toISOString();
      const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const type = multiselect ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE';
      const parsed = DiscordPollSchema.safeParse({
        id: uid('poll'),
        guildId,
        title: question.slice(0, 200),
        type,
        status: 'ACTIVE',
        creatorId: ctx.user.id,
        creatorTag: ctx.user.username,
        anonymity: secret ? 'ANONYMOUS' : 'PUBLIC',
        quorum: quorum ? { enabled: true, minParticipantsCount: quorum } : {},
        questions: [
          {
            id: uid('q'),
            title: question,
            type,
            maxSelections: multiselect ? answers.length : 1,
            options: answers.map((a) => ({ id: uid('opt'), label: a.text, emoji: a.emoji ?? '' })),
          },
        ],
        panelConfig: { channelId: channel.id, embedTitle: `📊 ${question}`.slice(0, 256) },
        startsAt: now,
        endsAt: new Date(Date.now() + durationHours * 3600_000).toISOString(),
        createdAt: now,
        updatedAt: now,
      });
      if (!parsed.success) return void (await fail(`Sondage invalide : ${parsed.error.issues[0]?.message}`));
      const poll = pollRepository.savePoll(parsed.data);
      const msg = await sendToConfiguredChannel(
        channel,
        { embeds: [discordPollPanel.buildPanelEmbed(poll)], components: discordPollPanel.buildPanelActionRows(poll) },
        { postTitle: poll.title }
      );
      poll.panelConfig.channelId = msg.channelId || channel.id;
      poll.panelConfig.messageId = msg.id;
      pollRepository.savePoll(poll);
      await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(`Sondage publié dans <#${poll.panelConfig.channelId}> (ID \`${poll.id}\`).`)], ephemeral: true });
      return;
    }

    if (subcommand === 'list') {
      const polls = pollRepository.getPolls(guildId);
      if (polls.length === 0) {
        await ctx.reply({
          embeds: [ctx.createEmbed('info').setDescription(t.poll_list_empty)],
          ephemeral: true,
        });
        return;
      }

      const embed = ctx
        .createEmbed('info')
        .setTitle(t.poll_list_title)
        .setDescription(
          polls
            .map((p) =>
              formatString(t.poll_list_item, {
                title: p.title,
                id: p.id,
                status: p.status,
                type: p.type,
                count: pollRepository.getVotes(guildId, p.id).length,
              })
            )
            .join('\n\n')
        )
        .setFooter({ text: 'ETHONE Sondages' });

      await ctx.reply({ embeds: [embed] });
      return;
    }

    if (!pollId) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(t.poll_missing_id)],
        ephemeral: true,
      });
      return;
    }

    const poll = pollRepository.getPollById(guildId, pollId);
    if (!poll) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(formatString(t.poll_not_found, { id: pollId }))],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'panel') {
      let channel: any = ctx.channel;
      if (ctx.isSlash && ctx.interaction) {
        channel = ctx.interaction.options.getChannel('channel') || ctx.channel;
      }

      if (!channel || !isSendableTarget(channel)) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.poll_invalid_channel)], ephemeral: true });
        return;
      }

      const embed = discordPollPanel.buildPanelEmbed(poll);
      const rows = discordPollPanel.buildPanelActionRows(poll);

      await sendToConfiguredChannel(channel, { embeds: [embed], components: rows }, { postTitle: poll.title });
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.poll_panel_published, { title: poll.title, channel: `<#${channel.id}>` }))],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'end') {
      const result = await pollService.endPoll(guildId, pollId, ctx.client);
      if (!result.success) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.poll_end_error, { error: result.error || '' }))], ephemeral: true });
        return;
      }

      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.poll_ended_success, { title: poll.title }))],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'results') {
      const results = pollResultService.calculateResults(guildId, pollId);
      if (!results) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.poll_results_calc_failed)], ephemeral: true });
        return;
      }

      const embed = ctx
        .createEmbed('success')
        .setTitle(formatString(t.poll_results_title, { title: poll.title }))
        .setDescription(poll.description || t.poll_results_default_desc)
        .addFields(
          { name: t.poll_field_total_voters, value: `${results.totalVoters}`, inline: true },
          { name: t.poll_field_total_weight, value: `${results.totalWeightedVotes}`, inline: true },
          { name: t.poll_field_quorum, value: `${results.quorumStatus} (${results.quorumPercentage.toFixed(1)}%)`, inline: true }
        );

      for (const q of results.questionResults) {
        const lines = q.optionResults.map(
          (opt: any) =>
            `• ${opt.text} : **${opt.voteCount}** votes (${opt.percentage.toFixed(1)}%) - ${opt.weightedScore} pts`
        );
        embed.addFields({
          name: `❓ ${q.title}`,
          value: lines.join('\n') || t.poll_no_votes,
          inline: false,
        });
      }

      await ctx.reply({ embeds: [embed] });
    }
  },
};
