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
import { ModerationService } from '../../moderation/services/moderationService.js';
import { moderationRepository } from '../../moderation/storage/moderationRepository.js';
import type { ModerationReport } from '../../moderation/types/report.js';
import type { CaseAction } from '../../moderation/types/case.js';
import { baseEmbed, noticeEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';

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
    return member.permissions.has(PermissionFlagsBits.ModerateMembers);
  }

  /** Fenêtre de saisie du motif (menus contextuels et /report). */
  public buildModal(target: { userId: string; channelId?: string; messageId?: string }): ModalBuilder {
    const id = target.messageId && target.channelId ? `rep_modal:msg:${target.userId}:${target.channelId}:${target.messageId}` : `rep_modal:user:${target.userId}`;
    return new ModalBuilder()
      .setCustomId(id)
      .setTitle('Signaler')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId('reason').setLabel('Pourquoi signalez-vous ?').setStyle(TextInputStyle.Paragraph).setMinLength(5).setMaxLength(500).setRequired(true).setPlaceholder('Décrivez le problème en quelques mots')
        )
      );
  }

  /** Enregistre le signalement puis crée / met à jour le message de l'équipe. */
  public async submit(client: Client, guild: Guild, reporter: User, target: User, reason: string, where?: { channelId?: string; messageId?: string; messageContent?: string }): Promise<SubmitResult> {
    const conf = reportsStorage.getConfig(guild.id);
    if (!conf.enabled || !conf.channelId) return { ok: false, error: 'Le système de signalement n’est pas configuré sur ce serveur.' };
    if (target.id === reporter.id) return { ok: false, error: 'Tu ne peux pas te signaler toi-même.' };
    if (target.bot) return { ok: false, error: 'Les bots ne peuvent pas être signalés ici : préviens l’équipe directement.' };
    const channel = guild.channels.cache.get(conf.channelId);
    if (!channel || !channel.isTextBased()) return { ok: false, error: 'Le salon des signalements est introuvable : l’équipe doit le reconfigurer.' };
    const wait = reportsStorage.checkAndStamp(guild.id, reporter.id, conf.cooldownSeconds);
    if (wait > 0) return { ok: false, error: `Patiente encore ${wait} s avant un nouveau signalement.` };

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
    await this.post(guild, target.id, true).catch((err) => logger.warn('[Signalements] Envoi à l’équipe impossible :', err));
    return { ok: true, report };
  }

  /** Message unique de l'équipe pour un membre signalé : tous ses signalements ouverts, ses sanctions passées, les boutons. */
  public async render(guild: Guild, userId: string): Promise<BaseMessageOptions> {
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
      .setTitle(`🚨 Signalement contre ${plain(name)}${user ? ` (@${user.username})` : ''}`)
      .setThumbnail(user?.displayAvatarURL({ size: 128 }) ?? null);

    const lines: string[] = [];
    lines.push(`Compte créé ${user ? ts(user.createdAt) : '—'} · Arrivé sur le serveur ${member?.joinedAt ? ts(member.joinedAt) : '—'}`);
    lines.push(`🔎 ${count('TIMEOUT')} exclusion(s) · ${count('WARN')} avertissement(s) · ${count('KICK')} expulsion(s) · ${count('BAN') + count('SOFTBAN')} bannissement(s)`);
    lines.push('');
    for (const r of shown.slice(-MAX_SHOWN)) {
      const link = r.messageId && r.channelId ? ` · [Message](https://discord.com/channels/${guild.id}/${r.channelId}/${r.messageId})` : '';
      lines.push(`**Signalé par** <@${r.reporterUserId}>${r.channelId ? ` dans <#${r.channelId}>` : ''} ${ts(r.createdAt)}${link}`);
      lines.push(`> ${plain(clip(r.reason, 300))}`);
      if (r.messageContent) lines.push(`> 💬 « ${plain(clip(r.messageContent, 160))} »`);
    }
    if (shown.length > MAX_SHOWN) lines.push(`… et ${shown.length - MAX_SHOWN} signalement(s) plus ancien(s).`);
    lines.push('');
    if (done) {
      const last = all[all.length - 1];
      lines.push(`✅ ${last?.status === 'DISMISSED' ? 'Rejeté' : 'Traité'}${last?.assignedModerator ? ` par <@${last.assignedModerator.id}>` : ''}${last?.caseNumber ? ` · dossier n°${last.caseNumber}` : ''}.`);
    } else if (assigned) {
      lines.push(`👀 Pris en charge par <@${assigned.id}>.`);
    } else {
      lines.push(`⏳ En attente depuis ${ts(open[0].createdAt, 'F')} (${ts(open[0].createdAt)}).`);
    }
    embed.setDescription(lines.join('\n').slice(0, 4000));

    if (done) return { embeds: [embed], components: [], allowedMentions: { parse: [] } };

    const select = new StringSelectMenuBuilder()
      .setCustomId(`rep_sanction:${userId}`)
      .setPlaceholder('Sanctionner le membre')
      .addOptions(Object.entries(SANCTIONS).map(([value, s]) => new StringSelectMenuOptionBuilder().setLabel(s.label).setValue(value).setDescription(s.description)));
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`rep_take:${userId}`).setLabel(assigned ? 'Reprendre en charge' : 'Prendre en charge').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`rep_done:${userId}`).setLabel('Marquer comme traité').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`rep_dismiss:${userId}`).setLabel('Rejeter').setStyle(ButtonStyle.Secondary)
    );
    return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select), buttons], allowedMentions: { parse: [] } };
  }

  /** Publie ou met à jour le message de l'équipe. `isNew` : mentionne le rôle de l'équipe si le réglage est activé. */
  public async post(guild: Guild, userId: string, isNew = false): Promise<void> {
    const conf = reportsStorage.getConfig(guild.id);
    const channel = conf.channelId ? guild.channels.cache.get(conf.channelId) : null;
    if (!channel || !channel.isTextBased()) return;
    const payload = await this.render(guild, userId);
    const existing = reportsStorage.getThread(guild.id, userId);
    if (existing && existing.channelId === channel.id) {
      const message = await channel.messages.fetch(existing.messageId).catch(() => null);
      if (message) {
        await message.edit(payload);
        if (isNew && conf.pingStaff && conf.staffRoleId) await channel.send({ content: `<@&${conf.staffRoleId}> nouveau signalement ci-dessus.`, allowedMentions: { roles: [conf.staffRoleId] } }).catch(() => undefined);
        return;
      }
    }
    const content = isNew && conf.pingStaff && conf.staffRoleId ? `<@&${conf.staffRoleId}>` : undefined;
    const sent = await channel.send({ ...payload, content, allowedMentions: content ? { roles: [conf.staffRoleId!] } : { parse: [] } });
    reportsStorage.setThread({ guildId: guild.id, reportedUserId: userId, channelId: channel.id, messageId: sent.id });
  }

  private openReports(guildId: string, userId: string): ModerationReport[] {
    return moderationRepository.getReports(guildId, { reportedUserId: userId }).filter((r) => OPEN.includes(r.status));
  }

  /** Boutons de l'équipe : prendre en charge, marquer comme traité, rejeter. */
  public async handleButton(interaction: ButtonInteraction): Promise<void> {
    const [action, userId] = interaction.customId.split(':');
    const guild = interaction.guild;
    if (!guild || !this.canHandle(interaction.member as GuildMember, guild.id)) {
      await interaction.reply({ embeds: [noticeEmbed('denied', 'Seule l’équipe de modération peut traiter les signalements.')], flags: MessageFlags.Ephemeral });
      return;
    }
    const mod = { id: interaction.user.id, tag: interaction.user.tag };
    const status = action === 'rep_take' ? 'REVIEWING' : action === 'rep_dismiss' ? 'DISMISSED' : 'ACTIONED';
    const reports = this.openReports(guild.id, userId);
    if (reports.length === 0) {
      await interaction.reply({ embeds: [noticeEmbed('info', 'Ces signalements sont déjà traités.')], flags: MessageFlags.Ephemeral });
      return;
    }
    for (const r of reports) {
      if (status === 'REVIEWING') ModerationService.assignReport(guild.id, r.id, mod);
      else ModerationService.updateReportStatus(guild.id, r.id, status, mod);
    }
    await interaction.update(await this.render(guild, userId));
  }

  /** Menu « Sanctionner le membre » : applique la sanction via le module de modération (dossier créé) puis clôt les signalements. */
  public async handleSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const userId = interaction.customId.split(':')[1];
    const guild = interaction.guild;
    const sanction = SANCTIONS[interaction.values[0]];
    if (!guild || !sanction || !this.canHandle(interaction.member as GuildMember, guild.id)) {
      await interaction.reply({ embeds: [noticeEmbed('denied', 'Seule l’équipe de modération peut sanctionner depuis un signalement.')], flags: MessageFlags.Ephemeral });
      return;
    }
    if (!interaction.memberPermissions?.has(sanction.need)) {
      await interaction.reply({ embeds: [noticeEmbed('denied', `Il te manque la permission nécessaire pour « ${sanction.label} ».`)], flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferUpdate();
    const reports = this.openReports(guild.id, userId);
    const reason = `Signalement : ${clip(reports[0]?.reason ?? 'sans motif', 200)}`;
    const target = await guild.client.users.fetch(userId).catch(() => null);
    const res = await ModerationService.executeSanction({
      guildId: guild.id,
      userId,
      userTag: target?.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: sanction.action,
      reason,
      durationSeconds: sanction.seconds ?? null,
      source: 'MANUAL',
    });
    if (!res.success) {
      await interaction.followUp({ embeds: [noticeEmbed('error', `Sanction impossible : ${res.error ?? 'raison inconnue'}.`)], flags: MessageFlags.Ephemeral });
      return;
    }
    const mod = { id: interaction.user.id, tag: interaction.user.tag };
    for (const r of reports) ModerationService.updateReportStatus(guild.id, r.id, 'ACTIONED', mod, `${sanction.label}`, res.case?.caseNumber);
    await interaction.editReply(await this.render(guild, userId));
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
      await interaction.editReply({ embeds: [noticeEmbed('error', 'Membre introuvable.')] });
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
    await interaction.editReply({ embeds: [res.ok ? noticeEmbed('success', 'Merci, ton signalement a été transmis à l’équipe de modération.') : noticeEmbed('error', res.error)] });
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
      if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) throw new Error('Il me faut la permission « Gérer les salons » pour créer le salon.');
      const staffRoles = opts.staffRoleId
        ? [opts.staffRoleId]
        : guild.roles.cache.filter((r) => !r.managed && r.id !== guild.id && (r.permissions.has(PermissionFlagsBits.ModerateMembers) || r.permissions.has(PermissionFlagsBits.Administrator))).map((r) => r.id);
      const allow = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory];
      const channel = await guild.channels.create({
        name: 'signalements',
        type: ChannelType.GuildText,
        topic: 'Signalements des membres : traités par l’équipe de modération.',
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: me.id, allow: [...allow, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages] },
          ...staffRoles.map((id) => ({ id, allow })),
        ],
        reason: 'Signalements : salon de l’équipe',
      });
      channelId = channel.id;
      created = true;
    } else if (!guild.channels.cache.get(channelId)?.isTextBased()) {
      throw new Error('Salon introuvable ou non textuel.');
    }
    reportsStorage.updateConfig(guild.id, { enabled: true, channelId, ...(opts.staffRoleId !== undefined ? { staffRoleId: opts.staffRoleId } : {}) });
    return { channelId, created };
  }
}

export const reportsService = new ReportsService();
