import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  Guild,
  GuildMember,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  type BaseMessageOptions,
  type Client,
  type User,
} from 'discord.js';
import { reportsStorage } from '../storage/reportsStorage.js';
import { sanctionConfig } from '../../moderation/sanctionConfig.js';
import { ACTION_LABEL, applySanction } from '../../moderation/services/sanctionPipeline.js';
import { ModerationService } from '../../moderation/services/moderationService.js';
import { moderationRepository } from '../../moderation/storage/moderationRepository.js';
import type { ModerationReport } from '../../moderation/types/report.js';
import type { CaseAction } from '../../moderation/types/case.js';
import { baseEmbed, noticeEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';
import { trg } from '../../../utils/tr.js';
import { isForumLike, isSendableTarget, sendToConfiguredChannel } from '../../../utils/channelSend.js';

const OPEN: ModerationReport['status'][] = ['NEW', 'REVIEWING', 'ESCALATED'];
const MAX_SHOWN = 4;

type Sanction = { label: string; description: string; action: CaseAction; seconds?: number; need: bigint };
const SANCTIONS: Record<string, Sanction> = {
  warn: { label: 'Avertir', description: 'Avertissement enregistré au dossier', action: 'WARN', need: PermissionFlagsBits.ModerateMembers },
  timeout_1h: { label: 'Exclure 1 heure', description: 'Exclusion temporaire (timeout)', action: 'TIMEOUT', seconds: 3600, need: PermissionFlagsBits.ModerateMembers },
  timeout_1d: { label: 'Exclure 1 jour', description: 'Exclusion temporaire (timeout)', action: 'TIMEOUT', seconds: 86_400, need: PermissionFlagsBits.ModerateMembers },
  kick: { label: 'Expulser', description: 'Retire le membre du serveur', action: 'KICK', need: PermissionFlagsBits.KickMembers },
  ban: { label: 'Bannir', description: 'Bannissement du serveur', action: 'BAN', need: PermissionFlagsBits.BanMembers },
};

const ts = (iso: string | number | Date, style: 'R' | 'F' = 'R') => `<t:${Math.floor(new Date(iso).getTime() / 1000)}:${style}>`;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
/** Neutralise les mentions et le balisage dans un texte saisi par un membre avant de l'afficher à l'équipe. */
const plain = (s: string) => s.replace(/[@`*_~|>]/g, (c) => `\\${c}`).replace(/\s+/g, ' ').trim();

export type SubmitResult = { ok: true; report: ModerationReport } | { ok: false; error: string };

class ReportsService {
  /** Peut traiter les signalements : rôle de l'équipe si défini, sinon « Exclure temporairement des membres ». */
  public canHandle(member: GuildMember | null | undefined, guildId: string): boolean {
    if (!member) return false;
    const conf = reportsStorage.getConfig(guildId);
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    if (conf.staffRoleId && member.roles.cache.has(conf.staffRoleId)) return true;
    if (conf.moderatorRoleIds.some((id) => member.roles.cache.has(id))) return true;
    return member.permissions.has(PermissionFlagsBits.ModerateMembers);
  }

  /** Fenêtre de saisie du motif (menus contextuels et /report). */
  public buildModal(target: { userId: string; channelId?: string; messageId?: string }, guildId?: string | null): ModalBuilder {
    const t = (s: string) => trg(guildId, s);
    const id = target.messageId && target.channelId ? `rep_modal:msg:${target.userId}:${target.channelId}:${target.messageId}` : `rep_modal:user:${target.userId}`;
    return new ModalBuilder()
      .setCustomId(id)
      .setTitle(t('Signaler'))
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId('reason').setLabel(t('Pourquoi signalez-vous ?')).setStyle(TextInputStyle.Paragraph).setMinLength(5).setMaxLength(500).setRequired(true).setPlaceholder(t('Décrivez le problème en quelques mots'))
        )
      );
  }

  /** Enregistre le signalement puis crée / met à jour le message de l'équipe. */
  public async submit(client: Client, guild: Guild, reporter: User, target: User, reason: string, where?: { channelId?: string; messageId?: string; messageContent?: string }): Promise<SubmitResult> {
    const t = (s: string, v?: Record<string, string | number>) => trg(guild.id, s, v);
    const conf = reportsStorage.getConfig(guild.id);
    if (!conf.enabled || !conf.channelId) return { ok: false, error: t('Le système de signalement n’est pas configuré sur ce serveur.') };
    if (target.id === reporter.id) return { ok: false, error: t('Tu ne peux pas te signaler toi-même.') };
    if (target.bot) return { ok: false, error: t('Les bots ne peuvent pas être signalés ici : préviens l’équipe directement.') };
    const channel = guild.channels.cache.get(conf.channelId);
    if (!channel || !isSendableTarget(channel)) return { ok: false, error: t('Le salon des signalements est introuvable : l’équipe doit le reconfigurer.') };
    const wait = reportsStorage.checkAndStamp(guild.id, reporter.id, conf.cooldownSeconds);
    if (wait > 0) return { ok: false, error: t('Patiente encore {wait} s avant un nouveau signalement.', { wait }) };

    const report = ModerationService.createReport({
      guildId: guild.id,
      reportedUserId: target.id,
      reportedUserTag: target.tag,
      reporterUserId: reporter.id,
      reporterUserTag: reporter.tag,
      reason: clip(reason.trim(), 500),
      category: where?.messageId ? 'Message' : 'Membre',
      channelId: where?.channelId,
      messageId: where?.messageId,
      messageContent: where?.messageContent ? clip(where.messageContent, 400) : undefined,
    });
    if (where?.messageId && where.channelId && conf.reactionEmoji) {
      const ch = guild.channels.cache.get(where.channelId);
      if (ch?.isTextBased()) await (await ch.messages.fetch(where.messageId).catch(() => null))?.react(conf.reactionEmoji).catch(() => null);
    }
    await this.post(guild, target.id, true).catch((err) => logger.warn('[Signalements] Envoi à l’équipe impossible :', err));
    return { ok: true, report };
  }

  /** Message unique de l'équipe pour un membre signalé : tous ses signalements ouverts, ses sanctions passées, les boutons. */
  public async render(guild: Guild, userId: string): Promise<BaseMessageOptions> {
    const t = (s: string, v?: Record<string, string | number>) => trg(guild.id, s, v);
    const all = moderationRepository.getReports(guild.id, { reportedUserId: userId }).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const open = all.filter((r) => OPEN.includes(r.status));
    const shown = open.length > 0 ? open : all.slice(-1);
    const member = await guild.members.fetch(userId).catch(() => null);
    const user = member?.user ?? (await guild.client.users.fetch(userId).catch(() => null));
    const cases = moderationRepository.getUserCases(guild.id, userId);
    const count = (a: CaseAction) => cases.filter((c) => c.action === a).length;

    const done = open.length === 0;
    const assigned = open.find((r) => r.assignedModerator)?.assignedModerator;
    const name = member?.displayName ?? user?.username ?? userId;
    const embed = baseEmbed(done ? 'success' : assigned ? 'warning' : 'error', { footerText: null })
      .setTitle(`🚨 ${t('Signalement contre {name}', { name: plain(name) })}${user ? ` (@${user.username})` : ''}`)
      .setThumbnail(user?.displayAvatarURL({ size: 128 }) ?? null);

    const lines: string[] = [];
    lines.push(t('Compte créé {created} · Arrivé sur le serveur {joined}', { created: user ? ts(user.createdAt) : '—', joined: member?.joinedAt ? ts(member.joinedAt) : '—' }));
    lines.push(`🔎 ${t('{timeouts} exclusion(s) · {warns} avertissement(s) · {kicks} expulsion(s) · {bans} bannissement(s)', { timeouts: count('TIMEOUT'), warns: count('WARN'), kicks: count('KICK'), bans: count('BAN') + count('SOFTBAN') })}`);
    lines.push('');
    for (const r of shown.slice(-MAX_SHOWN)) {
      const link = r.messageId && r.channelId ? ` · [${t('Message')}](https://discord.com/channels/${guild.id}/${r.channelId}/${r.messageId})` : '';
      lines.push(`${t('**Signalé par** {who}', { who: `<@${r.reporterUserId}>` })}${r.channelId ? ` ${t('dans {channel}', { channel: `<#${r.channelId}>` })}` : ''} ${ts(r.createdAt)}${link}`);
      lines.push(`> ${plain(clip(r.reason, 300))}`);
      if (r.messageContent) lines.push(`> 💬 « ${plain(clip(r.messageContent, 160))} »`);
    }
    if (shown.length > MAX_SHOWN) lines.push(t('… et {n} signalement(s) plus ancien(s).', { n: shown.length - MAX_SHOWN }));
    lines.push('');
    if (done) {
      const last = all[all.length - 1];
      lines.push(`✅ ${t(last?.status === 'DISMISSED' ? 'Rejeté' : 'Traité')}${last?.assignedModerator ? ` ${t('par {who}', { who: `<@${last.assignedModerator.id}>` })}` : ''}${last?.caseNumber ? ` · ${t('dossier n°{n}', { n: last.caseNumber })}` : ''}.`);
    } else if (assigned) {
      lines.push(`👀 ${t('Pris en charge par {who}.', { who: `<@${assigned.id}>` })}`);
    } else {
      lines.push(`⏳ ${t('En attente depuis {date}', { date: ts(open[0].createdAt, 'F') })} (${ts(open[0].createdAt)}).`);
    }
    embed.setDescription(lines.join('\n').slice(0, 4000));

    if (done) return { embeds: [embed], components: [], allowedMentions: { parse: [] } };

    const select = new StringSelectMenuBuilder()
      .setCustomId(`rep_sanction:${userId}`)
      .setPlaceholder(t('Sanctionner le membre'))
      .addOptions(this.sanctionOptions(guild.id));
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`rep_take:${userId}`).setLabel(t(assigned ? 'Reprendre en charge' : 'Prendre en charge')).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`rep_done:${userId}`).setLabel(t('Marquer comme traité')).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`rep_dismiss:${userId}`).setLabel(t('Rejeter')).setStyle(ButtonStyle.Secondary)
    );
    return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select), buttons], allowedMentions: { parse: [] } };
  }

  /** Raisons prédéfinies du serveur, puis les sanctions libres si « Sanctions personnalisées » est activé. */
  private sanctionOptions(guildId: string): StringSelectMenuOptionBuilder[] {
    const presets = sanctionConfig
      .get(guildId)
      .presets.reasons.slice(0, 15)
      .map((p) => new StringSelectMenuOptionBuilder().setLabel(p.name.slice(0, 100)).setValue(`preset:${p.id}`).setDescription(`${trg(guildId, ACTION_LABEL[p.action])}${p.category ? ` · ${p.category}` : ''}`.slice(0, 100)));
    const free =
      reportsStorage.getConfig(guildId).customSanctions || presets.length === 0
        ? Object.entries(SANCTIONS).map(([value, s]) => new StringSelectMenuOptionBuilder().setLabel(trg(guildId, s.label)).setValue(value).setDescription(trg(guildId, s.description)))
        : [];
    return [...presets, ...free].slice(0, 25);
  }

  /** À la clôture : prévient les signaleurs et range le résumé dans le fil de tri. */
  public async notifyClosed(guild: Guild, reports: ModerationReport[], outcome: 'ACTIONED' | 'DISMISSED', mod: { id: string; tag: string }, sanction?: string, caseNumber?: number): Promise<void> {
    const t = (s: string, v?: Record<string, string | number>) => trg(guild.id, s, v);
    const conf = reportsStorage.getConfig(guild.id);
    const label = t(outcome === 'DISMISSED' ? 'refusé' : sanction ? 'traité avec une sanction' : 'résolu');
    if (conf.notifyReporter) {
      for (const reporterId of new Set(reports.map((r) => r.reporterUserId))) {
        const user = await guild.client.users.fetch(reporterId).catch(() => null);
        await user
          ?.send({
            embeds: [
              noticeEmbed(
                outcome === 'DISMISSED' ? 'info' : 'success',
                `${t('Ton signalement sur **{server}** a été {label} par {mod}', { server: guild.name, label, mod: mod.tag })}${sanction ? ` · ${sanction}` : ''}${caseNumber ? ` (${t('dossier n°{n}', { n: caseNumber })})` : ''}.`
              ),
            ],
          })
          .catch(() => null);
      }
    }
    if (conf.triageThreads && conf.channelId) {
      const channel = guild.channels.cache.get(conf.channelId);
      if (channel && channel.type === ChannelType.GuildText) {
        const name = t(outcome === 'DISMISSED' ? 'Refusés' : sanction ? 'Sanctionnés' : 'Résolus');
        const active = await channel.threads.fetchActive().catch(() => null);
        const thread = active?.threads.find((t) => t.name === name) ?? (await channel.threads.create({ name, autoArchiveDuration: 10080 }).catch(() => null));
        const target = reports[0];
        await thread
          ?.send({
            content: `**${target?.reportedUserTag ?? '?'}** (<@${target?.reportedUserId}>) · ${t('{n} signalement(s)', { n: reports.length })} · ${label} ${t('par {who}', { who: `<@${mod.id}>` })}${caseNumber ? ` · ${t('dossier n°{n}', { n: caseNumber })}` : ''}`,
            allowedMentions: { parse: [] },
          })
          .catch(() => null);
      }
    }
    const posted = reports[0] ? reportsStorage.getThread(guild.id, reports[0].reportedUserId) : undefined;
    if (conf.threadPerReport && posted) {
      const thread = await guild.channels.fetch(posted.messageId).catch(() => null);
      if (thread?.isThread()) await thread.setArchived(true, `${t('Signalement')} ${label}`).catch(() => null);
    }
  }

  /** Publie ou met à jour le message de l'équipe. `isNew` : mentionne le rôle de l'équipe si le réglage est activé. */
  public async post(guild: Guild, userId: string, isNew = false): Promise<void> {
    const conf = reportsStorage.getConfig(guild.id);
    const channel = conf.channelId ? guild.channels.cache.get(conf.channelId) : null;
    if (!channel || !isSendableTarget(channel)) return;
    const payload = await this.render(guild, userId);
    let existing = reportsStorage.getThread(guild.id, userId);
    if (existing && isNew) {
      const open = this.openReports(guild.id, userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const previous = open[open.length - 2];
      if (!conf.groupWindow || !previous || Date.now() - Date.parse(previous.createdAt) > 15 * 60_000) existing = undefined;
    }
    const mentions = [...conf.mentionRoleIds, ...(conf.pingStaff && conf.staffRoleId ? [conf.staffRoleId] : [])];
    // Salon Forum/Média : chaque membre signalé a son propre post (existing.channelId = le post).
    let host: any = null;
    if (existing) {
      if (existing.channelId === channel.id) host = channel;
      else if (isForumLike(channel)) {
        const post = await guild.channels.fetch(existing.channelId).catch(() => null);
        if (post?.isThread() && post.parentId === channel.id) host = post;
      }
    }
    if (host && 'messages' in host) {
      const message = await host.messages.fetch(existing!.messageId).catch(() => null);
      if (message) {
        await message.edit(payload);
        if (isNew && mentions.length) await host.send({ content: `${mentions.map((id) => `<@&${id}>`).join(' ')} ${trg(guild.id, 'nouveau signalement ci-dessus.')}`, allowedMentions: { roles: mentions } }).catch(() => undefined);
        return;
      }
    }
    const content = isNew && mentions.length ? mentions.map((id) => `<@&${id}>`).join(' ') : undefined;
    const sent = await sendToConfiguredChannel(
      channel,
      { ...payload, content, allowedMentions: content ? { roles: mentions } : { parse: [] } },
      { postTitle: `${trg(guild.id, 'Signalement')} — ${guild.members?.cache?.get(userId)?.user?.tag ?? userId}` }
    );
    reportsStorage.setThread({ guildId: guild.id, reportedUserId: userId, channelId: sent.channelId ?? channel.id, messageId: sent.id });
    if (conf.threadPerReport && !isForumLike(channel) && typeof (sent as any).startThread === 'function') {
      await (sent as any).startThread({ name: `${trg(guild.id, 'Signalement')} · ${guild.members.cache.get(userId)?.user.username ?? userId}`.slice(0, 100) }).catch(() => null);
    }
  }

  private openReports(guildId: string, userId: string): ModerationReport[] {
    return moderationRepository.getReports(guildId, { reportedUserId: userId }).filter((r) => OPEN.includes(r.status));
  }

  /** Boutons de l'équipe : prendre en charge, marquer comme traité, rejeter. */
  public async handleButton(interaction: ButtonInteraction): Promise<void> {
    const [action, userId] = interaction.customId.split(':');
    const guild = interaction.guild;
    if (!guild || !this.canHandle(interaction.member as GuildMember, guild.id)) {
      await interaction.reply({ embeds: [noticeEmbed('denied', trg(interaction.guildId, 'Seule l’équipe de modération peut traiter les signalements.'))], flags: MessageFlags.Ephemeral });
      return;
    }
    const mod = { id: interaction.user.id, tag: interaction.user.tag };
    const status = action === 'rep_take' ? 'REVIEWING' : action === 'rep_dismiss' ? 'DISMISSED' : 'ACTIONED';
    const max = reportsStorage.getConfig(guild.id).maxClaims;
    if (status === 'REVIEWING' && max > 0) {
      const mine = new Set(
        moderationRepository
          .getReports(guild.id, {})
          .filter((r) => r.status === 'REVIEWING' && r.assignedModerator?.id === mod.id && r.reportedUserId !== userId)
          .map((r) => r.reportedUserId)
      );
      if (mine.size >= max) {
        await interaction.reply({ embeds: [noticeEmbed('denied', trg(guild.id, 'Tu as déjà {n} signalement(s) en cours (limite : {max}). Termine-les d’abord.', { n: mine.size, max }))], flags: MessageFlags.Ephemeral });
        return;
      }
    }
    const reports = this.openReports(guild.id, userId);
    if (reports.length === 0) {
      await interaction.reply({ embeds: [noticeEmbed('info', trg(guild.id, 'Ces signalements sont déjà traités.'))], flags: MessageFlags.Ephemeral });
      return;
    }
    for (const r of reports) {
      if (status === 'REVIEWING') ModerationService.assignReport(guild.id, r.id, mod);
      else ModerationService.updateReportStatus(guild.id, r.id, status, mod);
    }
    await interaction.update(await this.render(guild, userId));
    if (status !== 'REVIEWING') await this.notifyClosed(guild, reports, status, mod);
  }

  /** Menu « Sanctionner le membre » : applique la sanction via le module de modération (dossier créé) puis clôt les signalements. */
  public async handleSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const userId = interaction.customId.split(':')[1];
    const guild = interaction.guild;
    const picked = interaction.values[0];
    const preset = picked.startsWith('preset:') && guild ? sanctionConfig.get(guild.id).presets.reasons.find((p) => p.id === picked.slice(7)) : undefined;
    const sanction: Sanction | undefined = preset
      ? {
          label: preset.name,
          description: '',
          action: preset.action,
          seconds: preset.durationSeconds,
          need: ['BAN', 'TEMPBAN', 'SOFTBAN'].includes(preset.action) ? PermissionFlagsBits.BanMembers : preset.action === 'KICK' ? PermissionFlagsBits.KickMembers : PermissionFlagsBits.ModerateMembers,
        }
      : SANCTIONS[picked];
    if (!guild || !sanction || !this.canHandle(interaction.member as GuildMember, guild.id)) {
      await interaction.reply({ embeds: [noticeEmbed('denied', trg(interaction.guildId, 'Seule l’équipe de modération peut sanctionner depuis un signalement.'))], flags: MessageFlags.Ephemeral });
      return;
    }
    if (!interaction.memberPermissions?.has(sanction.need)) {
      await interaction.reply({ embeds: [noticeEmbed('denied', trg(guild.id, 'Il te manque la permission nécessaire pour « {label} ».', { label: preset ? sanction.label : trg(guild.id, sanction.label) }))], flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferUpdate();
    const reports = this.openReports(guild.id, userId);
    const reason = preset ? preset.memberReason || preset.name : `${trg(guild.id, 'Signalement')} : ${clip(reports[0]?.reason ?? trg(guild.id, 'sans motif'), 200)}`;
    const res = await applySanction(guild.client, {
      guildId: guild.id,
      userId,
      moderator: { id: interaction.user.id, tag: interaction.user.tag },
      action: sanction.action,
      reason,
      durationSeconds: sanction.seconds ?? null,
      severity: preset?.severity,
      points: preset?.points ?? undefined,
      expiryDays: preset?.expiryDays ?? undefined,
      presetId: preset?.id,
    });
    if (!res.ok) {
      await interaction.followUp({ embeds: [noticeEmbed('error', trg(guild.id, 'Sanction impossible : {error}.', { error: res.error }))], flags: MessageFlags.Ephemeral });
      return;
    }
    const mod = { id: interaction.user.id, tag: interaction.user.tag };
    const shownLabel = preset ? sanction.label : trg(guild.id, sanction.label);
    for (const r of reports) ModerationService.updateReportStatus(guild.id, r.id, 'ACTIONED', mod, shownLabel, res.case.caseNumber);
    await interaction.editReply(await this.render(guild, userId));
    await this.notifyClosed(guild, reports, 'ACTIONED', mod, shownLabel, res.case.caseNumber);
  }

  /** Fenêtre de motif validée par le membre. */
  public async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parts = interaction.customId.split(':');
    const kind = parts[1];
    const userId = parts[2];
    const guild = interaction.guild;
    if (!guild) return;
    const reason = interaction.fields.getTextInputValue('reason');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const target = await guild.client.users.fetch(userId).catch(() => null);
    if (!target) {
      await interaction.editReply({ embeds: [noticeEmbed('error', trg(guild.id, 'Membre introuvable.'))] });
      return;
    }
    let where: { channelId?: string; messageId?: string; messageContent?: string } | undefined;
    if (kind === 'msg') {
      const [channelId, messageId] = [parts[3], parts[4]];
      const channel = guild.channels.cache.get(channelId);
      const message = channel && channel.isTextBased() ? await channel.messages.fetch(messageId).catch(() => null) : null;
      where = { channelId, messageId, messageContent: message?.content };
    } else {
      where = { channelId: interaction.channelId ?? undefined };
    }
    const res = await this.submit(interaction.client, guild, interaction.user, target, reason, where);
    await interaction.editReply({
      embeds: [res.ok ? noticeEmbed('success', reportsStorage.getConfig(guild.id).confirmationMessage || trg(guild.id, 'Merci, ton signalement a bien été envoyé à l’équipe de modération.')) : noticeEmbed('error', res.error)],
    });
  }

  /**
   * Installation en un clic : salon privé pour l'équipe (créé au besoin) + activation. Le salon n'est visible que de
   * l'équipe (rôle choisi, ou rôles qui peuvent exclure des membres) et du bot.
   */
  public async setup(guild: Guild, opts: { channelId?: string | null; staffRoleId?: string | null }): Promise<{ channelId: string; created: boolean }> {
    let channelId = opts.channelId ?? null;
    let created = false;
    if (!channelId) {
      const me = guild.members.me;
      if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) throw new Error(trg(guild.id, 'Il me faut la permission « Gérer les salons » pour créer le salon.'));
      const staffRoles = opts.staffRoleId
        ? [opts.staffRoleId]
        : guild.roles.cache.filter((r) => !r.managed && r.id !== guild.id && (r.permissions.has(PermissionFlagsBits.ModerateMembers) || r.permissions.has(PermissionFlagsBits.Administrator))).map((r) => r.id);
      const allow = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory];
      const channel = await guild.channels.create({
        name: trg(guild.id, 'signalements'),
        type: ChannelType.GuildText,
        topic: trg(guild.id, 'Signalements des membres : traités par l’équipe de modération.'),
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: me.id, allow: [...allow, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages] },
          ...staffRoles.map((id) => ({ id, allow })),
        ],
        reason: 'Signalements : salon de l’équipe',
      });
      channelId = channel.id;
      created = true;
    } else if (!isSendableTarget(guild.channels.cache.get(channelId))) {
      throw new Error(trg(guild.id, 'Salon introuvable ou non textuel.'));
    }
    reportsStorage.updateConfig(guild.id, { enabled: true, channelId, ...(opts.staffRoleId !== undefined ? { staffRoleId: opts.staffRoleId } : {}) });
    return { channelId, created };
  }
}

export const reportsService = new ReportsService();
