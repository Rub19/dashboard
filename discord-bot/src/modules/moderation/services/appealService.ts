import fs from 'node:fs';
import path from 'node:path';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
  type BaseMessageOptions,
} from 'discord.js';
import { moderationRepository } from '../storage/moderationRepository.js';
import { sanctionConfig } from '../sanctionConfig.js';
import { CaseService } from './caseService.js';
import { ACTION_LABEL, activeWarns, canModerate, human, isOpen } from './sanctionPipeline.js';
import { caseVars, renderTemplate } from '../sanctionMessages.js';
import { logger } from '../../../utils/logger.js';

export type Appeal = {
  id: string;
  guildId: string;
  caseNumber: number;
  userId: string;
  userTag: string;
  action: string;
  answer: string;
  status: 'pending' | 'accepted' | 'refused';
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  channelId?: string;
  messageId?: string;
};

const FILE = path.resolve(process.cwd(), 'data', 'appeals.json');
const STATUS_LABEL = { pending: 'En attente', accepted: 'Acceptée', refused: 'Refusée' } as const;

class AppealService {
  private list: Appeal[] = [];

  constructor() {
    try {
      if (fs.existsSync(FILE)) this.list = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
    } catch (err) {
      logger.error('Erreur chargement appeals.json :', err);
    }
  }

  private save() {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(this.list, null, 2), 'utf-8');
  }

  forGuild(guildId: string): Appeal[] {
    return this.list.filter((a) => a.guildId === guildId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  pendingCount(guildId: string): number {
    return this.list.filter((a) => a.guildId === guildId && a.status === 'pending').length;
  }

  private card(a: Appeal, note?: string): BaseMessageOptions {
    const c = moderationRepository.getCaseByNumber(a.guildId, a.caseNumber);
    const e = new EmbedBuilder()
      .setColor(a.status === 'pending' ? 0xf59e0b : a.status === 'accepted' ? 0x22c55e : 0xef4444)
      .setTitle(`📨 Appel · dossier n°${a.caseNumber}`)
      .setDescription(`<@${a.userId}> (${a.userTag}) conteste : **${ACTION_LABEL[(c?.action ?? a.action) as keyof typeof ACTION_LABEL] ?? a.action}**\n> ${(c?.reason ?? '').slice(0, 300)}`)
      .addFields({ name: sanctionConfig.get(a.guildId).appeals.question || 'Pourquoi lever cette sanction ?', value: a.answer.slice(0, 1024) || '—' })
      .setFooter({ text: a.status === 'pending' ? 'En attente de décision' : `${STATUS_LABEL[a.status]}${a.decidedBy ? ` par ${a.decidedBy}` : ''}` })
      .setTimestamp(new Date(a.createdAt));
    if (note) e.addFields({ name: 'Discussion', value: note });
    const components =
      a.status === 'pending'
        ? [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder().setCustomId(`appeal:accept:${a.id}`).setLabel('Accepter').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId(`appeal:refuse:${a.id}`).setLabel('Refuser').setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId(`appeal:discuss:${a.id}`).setLabel('En discuter').setStyle(ButtonStyle.Secondary)
            ),
          ]
        : [];
    return { embeds: [e], components, allowedMentions: { parse: [] } };
  }

  /** Peut-on encore faire appel de ce dossier ? Renvoie la raison du refus sinon. */
  private blocker(guildId: string, caseNumber: number, userId: string): string | null {
    const cfg = sanctionConfig.get(guildId).appeals;
    const c = moderationRepository.getCaseByNumber(guildId, caseNumber);
    if (!cfg.enabled || !cfg.channelId) return "Les appels sont fermés sur ce serveur.";
    if (!c || c.userId !== userId) return 'Dossier introuvable.';
    if (!(cfg.actions as string[]).includes(c.action)) return "Cette sanction ne peut pas faire l'objet d'un appel.";
    if (!isOpen(c)) return 'Cette sanction est déjà levée.';
    if (Date.now() - Date.parse(c.createdAt) > cfg.windowDays * 86400_000) return `Le délai pour faire appel (${cfg.windowDays} jours) est dépassé.`;
    if (this.list.some((a) => a.guildId === guildId && a.caseNumber === caseNumber)) return 'Tu as déjà fait appel de cette sanction.';
    return null;
  }

  async handleButton(interaction: ButtonInteraction): Promise<void> {
    const [, kind, ...rest] = interaction.customId.split(':');
    if (kind === 'open') {
      const [guildId, num] = rest;
      const why = this.blocker(guildId, Number(num), interaction.user.id);
      if (why) return void (await interaction.reply({ content: why, flags: MessageFlags.Ephemeral }));
      const question = sanctionConfig.get(guildId).appeals.question || 'Pourquoi lever cette sanction ?';
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId(`appeal:modal:${guildId}:${num}`)
          .setTitle(`Appel · dossier n°${num}`)
          .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('answer').setLabel(question.slice(0, 45)).setStyle(TextInputStyle.Paragraph).setMinLength(10).setMaxLength(1000).setRequired(true)))
      );
      return;
    }
    const appeal = this.list.find((a) => a.id === rest[0]);
    if (!appeal || !interaction.guild) return void (await interaction.reply({ content: 'Appel introuvable.', flags: MessageFlags.Ephemeral }));
    const cfg = sanctionConfig.get(appeal.guildId).appeals;
    const member = interaction.member as GuildMember | null;
    if (!canModerate(member) && !cfg.deciderRoleIds.some((id) => member?.roles.cache.has(id))) {
      return void (await interaction.reply({ content: 'Seuls les rôles qui décident peuvent traiter un appel.', flags: MessageFlags.Ephemeral }));
    }
    if (kind === 'discuss') {
      const thread = interaction.message.hasThread ? interaction.message.thread : await interaction.message.startThread({ name: `Appel n°${appeal.caseNumber}`.slice(0, 100) }).catch(() => null);
      return void (await interaction.reply({ content: thread ? `Discussion : <#${thread.id}>` : 'Impossible de créer le fil (permission « Créer des fils publics »).', flags: MessageFlags.Ephemeral }));
    }
    const res = await this.decide(interaction.client, appeal.guildId, appeal.id, kind === 'accept', { id: interaction.user.id, tag: interaction.user.tag });
    if (!res.ok) return void (await interaction.reply({ content: res.error, flags: MessageFlags.Ephemeral }));
    await interaction.update(this.card(res.appeal));
  }

  async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    const [, , guildId, num] = interaction.customId.split(':');
    const why = this.blocker(guildId, Number(num), interaction.user.id);
    if (why) return void (await interaction.reply({ content: why, flags: MessageFlags.Ephemeral }));
    const guild = interaction.client.guilds.cache.get(guildId);
    const cfg = sanctionConfig.get(guildId).appeals;
    const channel = guild && cfg.channelId ? guild.channels.cache.get(cfg.channelId) : null;
    if (!guild || !channel?.isSendable()) return void (await interaction.reply({ content: "Le salon des appels est introuvable : préviens l'équipe.", flags: MessageFlags.Ephemeral }));
    const c = moderationRepository.getCaseByNumber(guildId, Number(num))!;
    const appeal: Appeal = {
      id: `${guildId}-${num}-${Date.now().toString(36)}`,
      guildId,
      caseNumber: Number(num),
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      action: c.action,
      answer: interaction.fields.getTextInputValue('answer').trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const mentions = cfg.mentionRoleIds.map((id) => `<@&${id}>`).join(' ');
    const msg = await channel.send({ ...this.card(appeal), content: mentions || undefined, allowedMentions: { roles: cfg.mentionRoleIds } }).catch(() => null);
    if (!msg) return void (await interaction.reply({ content: "Envoi impossible dans le salon des appels : préviens l'équipe.", flags: MessageFlags.Ephemeral }));
    appeal.channelId = msg.channelId;
    appeal.messageId = msg.id;
    this.list.push(appeal);
    this.save();
    moderationRepository.updateCase(guildId, appeal.caseNumber, { appealStatus: 'PENDING' });
    await interaction.reply({ content: "Ton appel a bien été envoyé à l'équipe. Tu recevras sa réponse en message privé.", flags: MessageFlags.Ephemeral });
  }

  /** Accepte (lève la sanction) ou refuse un appel, depuis Discord ou le dashboard. */
  async decide(client: Client, guildId: string, id: string, accept: boolean, by: { id: string; tag: string }): Promise<{ ok: true; appeal: Appeal } | { ok: false; error: string }> {
    const appeal = this.list.find((a) => a.guildId === guildId && a.id === id);
    if (!appeal) return { ok: false, error: 'Appel introuvable.' };
    if (appeal.status !== 'pending') return { ok: false, error: 'Cet appel est déjà traité.' };
    if (accept) {
      const r = CaseService.revertCase(client, guildId, appeal.caseNumber, by, 'Appel accepté');
      if (!r.success && !/déjà/.test(r.error ?? '')) return { ok: false, error: r.error ?? 'Levée impossible.' };
    }
    appeal.status = accept ? 'accepted' : 'refused';
    appeal.decidedAt = new Date().toISOString();
    appeal.decidedBy = by.tag;
    this.save();
    moderationRepository.updateCase(guildId, appeal.caseNumber, { appealStatus: accept ? 'ACCEPTED' : 'REJECTED' });
    const guild = client.guilds.cache.get(guildId);
    const user = await client.users.fetch(appeal.userId).catch(() => null);
    const tpl = sanctionConfig.get(guildId).messages[accept ? 'appealAccepted' : 'appealRefused'];
    const appealedCase = moderationRepository.getCaseByNumber(guildId, appeal.caseNumber);
    if (tpl.enabled && guild && appealedCase) {
      await user?.send(renderTemplate(tpl, caseVars(guild, appealedCase, ACTION_LABEL[appealedCase.action], activeWarns(guildId, appeal.userId), human), { server: guild.iconURL({ size: 256 }) })).catch(() => null);
    } else await user
      ?.send({
        embeds: [
          new EmbedBuilder()
            .setColor(accept ? 0x22c55e : 0xef4444)
            .setAuthor({ name: guild?.name ?? 'Serveur', iconURL: guild?.iconURL() ?? undefined })
            .setDescription(accept ? `Ton appel du dossier n°${appeal.caseNumber} est **accepté** : la sanction est levée.` : `Ton appel du dossier n°${appeal.caseNumber} est **refusé** : la sanction est maintenue.`),
        ],
      })
      .catch(() => null);
    if (appeal.channelId && appeal.messageId && guild) {
      const ch = guild.channels.cache.get(appeal.channelId);
      if (ch?.isTextBased()) {
        const msg = await ch.messages.fetch(appeal.messageId).catch(() => null);
        await msg?.edit(this.card(appeal)).catch(() => null);
      }
    }
    return { ok: true, appeal };
  }
}

export const appealService = new AppealService();
