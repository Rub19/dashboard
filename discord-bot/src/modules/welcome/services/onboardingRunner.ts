import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  GuildMember,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
  type Client,
} from 'discord.js';
import { welcomeRepository } from '../storage/welcomeRepository.js';
import { VerificationService } from './verificationService.js';
import { WelcomeCardGenerator } from '../images/welcomeCardGenerator.js';
import { VariableParser } from '../variables/variableParser.js';
import { WelcomeImageConfigSchema } from '../types/welcomeConfig.js';
import type { OnboardingFlow, OnboardingStep } from '../types/onboarding.js';
import type { VariableContext } from '../types/variables.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

/**
 * Moteur d'Onboarding : présente au membre, étape par étape, le parcours configuré sur le dashboard
 * (bienvenue, règlement, choix de rôles, question, vérification, salons, fin).
 *
 * Sans état côté bot : chaque bouton porte tout ce qu'il faut dans son `customId`
 *   onb:<action>:<serveur>:<membre>:<étape>
 * (les boutons survivent donc à un redémarrage, et marchent aussi bien en message privé que dans un
 * salon). Seul le membre concerné peut les utiliser.
 */

const PREFIX = 'onb';
const ACTIONS = ['next', 'ask', 'verify', 'done', 'roles'] as const;
type Action = (typeof ACTIONS)[number];

interface ParsedId {
  action: Action;
  guildId: string;
  userId: string;
  stepId: string;
}

export function isOnboardingId(customId: string): boolean {
  return customId.startsWith(`${PREFIX}:`) || customId.startsWith(`${PREFIX}_modal:`);
}

function makeId(action: Action, guildId: string, userId: string, stepId: string): string {
  return `${PREFIX}:${action}:${guildId}:${userId}:${stepId}`.slice(0, 100);
}

function parseId(customId: string): ParsedId | null {
  const [prefix, action, guildId, userId, ...rest] = customId.split(':');
  if ((prefix !== PREFIX && prefix !== `${PREFIX}_modal`) || !guildId || !userId || rest.length === 0) return null;
  const a = action === 'modal' ? 'ask' : action;
  if (!(ACTIONS as readonly string[]).includes(a)) return null;
  return { action: a as Action, guildId, userId, stepId: rest.join(':') };
}

function sortedSteps(flow: OnboardingFlow): OnboardingStep[] {
  return [...flow.steps].sort((a, b) => a.order - b.order);
}

function contextFor(member: GuildMember): VariableContext {
  const guild = member.guild;
  return {
    userId: member.id,
    username: member.user.username,
    displayName: member.displayName,
    userTag: member.user.tag,
    mentionUser: true,
    userCreatedAt: member.user.createdAt,
    guildId: guild.id,
    guildName: guild.name,
    memberCount: guild.memberCount,
    serverOwner: guild.members.cache.get(guild.ownerId)?.user.tag || 'Propriétaire',
  };
}

function colorFor(guild: Guild): number {
  const hex = guildConfigService.getConfig(guild.id).primaryColor || '#5865F2';
  const n = parseInt(String(hex).replace('#', ''), 16);
  return Number.isFinite(n) ? n : 0x5865f2;
}

const STEP_LABEL: Record<OnboardingStep['type'], { next: string; emoji: string }> = {
  WELCOME: { next: 'Commencer', emoji: '▶️' },
  RULES: { next: 'J’accepte le règlement', emoji: '✅' },
  ROLE_SELECTION: { next: 'Continuer', emoji: '➡️' },
  QUESTION: { next: 'Passer cette question', emoji: '⏭️' },
  VERIFICATION: { next: 'Valider mon entrée', emoji: '✅' },
  CHANNEL_SELECTION: { next: 'Continuer', emoji: '➡️' },
  COMPLETION: { next: 'Terminer', emoji: '🎉' },
};

type AnyInteraction = ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction;

/** Remplace le message d'origine (bouton, menu, formulaire ouvert depuis un message) ou répond à défaut. */
async function updateOrReply(interaction: AnyInteraction, payload: Record<string, unknown>): Promise<void> {
  const fromMessage = interaction.isModalSubmit() ? interaction.isFromMessage() : true;
  if (fromMessage) {
    await (interaction as ButtonInteraction | StringSelectMenuInteraction).update(payload as never);
  } else {
    await interaction.reply({ ...payload, ephemeral: true } as never);
  }
}

export interface StepMessage {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[];
  files: AttachmentBuilder[];
}

export class OnboardingRunner {
  /** Construit le message d'une étape (sans l'envoyer). `note` s'affiche en bas (ex. rôles choisis). */
  public static async buildStep(flow: OnboardingFlow, index: number, member: GuildMember, note?: string): Promise<StepMessage> {
    const steps = sortedSteps(flow);
    const step = steps[index];
    const guild = member.guild;
    const ctx = contextFor(member);
    const isLast = index === steps.length - 1;

    const embed = new EmbedBuilder()
      .setColor(colorFor(guild))
      .setTitle(VariableParser.parse(step.title, ctx).slice(0, 256))
      .setFooter({ text: `Étape ${index + 1}/${steps.length} • ${guild.name}`, iconURL: guild.iconURL() || undefined });

    let description = VariableParser.parse(step.description, ctx);
    if (step.type === 'RULES' && step.rulesList.length > 0) {
      description +=
        '\n\n' + step.rulesList.map((r, i) => `**${i + 1}.** ${VariableParser.parse(r.replace(/^\d+\.\s*/, ''), ctx)}`).join('\n');
    }
    embed.setDescription(description.slice(0, 4000));
    if (note) embed.addFields({ name: 'Ton choix', value: note.slice(0, 1024) });

    const files: AttachmentBuilder[] = [];
    if (index === 0) {
      // Carte « BIENVENUE » en tête du parcours, avec le style d'image du serveur (ou celui par défaut).
      try {
        const saved = welcomeRepository.getConfig(guild.id).welcome.image;
        const image = saved?.enabled ? saved : WelcomeImageConfigSchema.parse({});
        const avatar = member.user.displayAvatarURL({ size: 256, extension: 'png' });
        const buffer = await WelcomeCardGenerator.generateCard(image, avatar, ctx);
        files.push(new AttachmentBuilder(buffer, { name: 'card.png' }));
        embed.setImage('attachment://card.png');
      } catch (err) {
        logger.warn('[Onboarding] Carte de bienvenue non générée :', err);
        embed.setThumbnail(guild.iconURL() || member.user.displayAvatarURL());
      }
    } else {
      embed.setThumbnail(guild.iconURL() || null);
    }

    const rows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

    if (step.type === 'ROLE_SELECTION' && step.roleChoices.length > 0) {
      const current = new Set(member.roles.cache.keys());
      const select = new StringSelectMenuBuilder()
        .setCustomId(makeId('roles', guild.id, member.id, step.id))
        .setPlaceholder('Choisis tes rôles…')
        .setMinValues(0)
        .setMaxValues(Math.max(1, Math.min(step.maxRoleSelections || 1, step.roleChoices.length, 25)))
        .addOptions(
          step.roleChoices.slice(0, 25).map((c) => {
            const option: { label: string; value: string; description?: string; emoji?: string; default: boolean } = {
              label: c.label.slice(0, 100),
              value: c.roleId,
              default: current.has(c.roleId),
            };
            if (c.description) option.description = c.description.slice(0, 100);
            if (c.emoji) option.emoji = c.emoji;
            return option;
          })
        );
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
    }

    const buttons: ButtonBuilder[] = [];
    if (step.type === 'QUESTION' && step.questionText) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(makeId('ask', guild.id, member.id, step.id))
          .setLabel('Répondre')
          .setEmoji('✍️')
          .setStyle(ButtonStyle.Primary)
      );
    }
    if (step.type === 'VERIFICATION') {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(makeId('verify', guild.id, member.id, step.id))
          .setLabel(STEP_LABEL.VERIFICATION.next)
          .setEmoji(STEP_LABEL.VERIFICATION.emoji)
          .setStyle(ButtonStyle.Success)
      );
    } else {
      const label = STEP_LABEL[step.type];
      const skippable = step.type === 'QUESTION' && !step.required;
      // Une question obligatoire n'a pas de bouton « passer » : il faut répondre.
      if (!(step.type === 'QUESTION' && step.required)) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(makeId(isLast ? 'done' : 'next', guild.id, member.id, step.id))
            .setLabel(isLast ? 'Terminer' : skippable ? label.next : label.next)
            .setEmoji(isLast ? '🎉' : label.emoji)
            .setStyle(step.type === 'RULES' || isLast ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
      }
    }
    if (buttons.length > 0) rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons));

    return { embeds: [embed], components: rows, files };
  }

  /** Lance le parcours : message privé, ou salon configuré si les messages privés sont fermés. */
  public static async start(member: GuildMember, flow: OnboardingFlow): Promise<'dm' | 'channel' | 'none'> {
    if (member.user.bot || sortedSteps(flow).length === 0) return 'none';
    const payload = await this.buildStep(flow, 0, member);
    try {
      await member.send(payload);
      return 'dm';
    } catch {
      // Messages privés fermés : on retombe sur le salon d'onboarding s'il existe.
    }
    if (flow.channelId) {
      const channel = member.guild.channels.cache.get(flow.channelId);
      if (channel && channel.isTextBased() && 'send' in channel) {
        try {
          await channel.send({ ...payload, content: `<@${member.id}>`, allowedMentions: { users: [member.id] } });
          return 'channel';
        } catch (err) {
          logger.warn(`[Onboarding] Envoi dans le salon impossible (guild ${member.guild.id}) :`, err);
        }
      }
    }
    return 'none';
  }

  // ------------------------------------------------------------------ interactions

  private static async resolve(
    client: Client,
    interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
    parsed: ParsedId
  ): Promise<{ guild: Guild; member: GuildMember; flow: OnboardingFlow; steps: OnboardingStep[]; index: number } | null> {
    if (interaction.user.id !== parsed.userId) {
      await interaction.reply({ content: 'Ce parcours ne t’est pas destiné.', ephemeral: true }).catch(() => {});
      return null;
    }
    const guild = client.guilds.cache.get(parsed.guildId);
    const member = guild ? await guild.members.fetch(parsed.userId).catch(() => null) : null;
    if (!guild || !member) {
      await interaction.reply({ content: 'Je ne te trouve plus sur ce serveur.', ephemeral: true }).catch(() => {});
      return null;
    }
    const flow = welcomeRepository.getOnboardingFlow(guild.id);
    const steps = sortedSteps(flow);
    const index = steps.findIndex((s) => s.id === parsed.stepId);
    if (!flow.enabled || index < 0) {
      // Parcours modifié ou désactivé depuis l'envoi du message.
      await interaction
        .reply({ content: 'Ce parcours a été modifié : demande à un administrateur de le relancer.', ephemeral: true })
        .catch(() => {});
      return null;
    }
    return { guild, member, flow, steps, index };
  }

  private static async showStep(
    interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
    flow: OnboardingFlow,
    index: number,
    member: GuildMember,
    note?: string
  ): Promise<void> {
    const message = await this.buildStep(flow, index, member, note);
    const payload = { embeds: message.embeds, components: message.components, files: message.files, attachments: [] as never[] };
    await updateOrReply(interaction, payload);
  }

  private static async finish(
    interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
    member: GuildMember,
    flow: OnboardingFlow
  ): Promise<void> {
    try {
      const { OnboardingService } = await import('./onboardingService.js');
      await OnboardingService.completeOnboarding(member);
    } catch (err) {
      logger.error('[Onboarding] Finalisation impossible :', err);
    }
    const ctx = contextFor(member);
    const done = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🎉 Parcours terminé !')
      .setDescription(
        `Bienvenue vraiment sur **${member.guild.name}**, ${member.displayName} ! ` +
          (flow.completionRoleId ? 'Tes accès ont été débloqués.' : 'Profite bien de la communauté.') +
          `\n\n${VariableParser.parse('Tu es le **{membercount}ᵉ** membre.', ctx)}`
      )
      .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() || undefined });
    const payload = { embeds: [done], components: [], files: [], attachments: [] as never[] };
    await updateOrReply(interaction, payload);
  }

  public static async handleButton(interaction: ButtonInteraction): Promise<void> {
    const parsed = parseId(interaction.customId);
    if (!parsed) return;
    const ctx = await this.resolve(interaction.client, interaction, parsed);
    if (!ctx) return;
    const { member, flow, steps, index } = ctx;
    const step = steps[index];

    if (parsed.action === 'ask') {
      const modal = new ModalBuilder()
        .setCustomId(`${PREFIX}_modal:modal:${parsed.guildId}:${parsed.userId}:${parsed.stepId}`.slice(0, 100))
        .setTitle((step.questionText || 'Question').slice(0, 45))
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('answer')
              .setLabel((step.questionText || 'Ta réponse').slice(0, 45))
              .setPlaceholder((step.questionPlaceholder || '').slice(0, 100))
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(step.required)
              .setMaxLength(500)
          )
        );
      await interaction.showModal(modal);
      return;
    }

    if (parsed.action === 'verify') {
      await interaction.deferUpdate();
      const res = await VerificationService.verifyMember(member);
      if (!res.success) {
        await interaction.followUp({ content: `❌ ${res.message}`, ephemeral: true }).catch(() => {});
        return;
      }
    }

    if (step.type === 'RULES') {
      welcomeRepository.recordEvent({
        type: 'RULES_ACCEPTED',
        userId: member.id,
        userTag: member.user.tag,
        detail: 'Règlement accepté depuis le parcours d’onboarding.',
      });
    }

    // Choix de rôle obligatoire : on ne laisse pas passer sans avoir choisi.
    if (step.type === 'ROLE_SELECTION' && step.required && step.roleChoices.length > 0) {
      const has = step.roleChoices.some((c) => member.roles.cache.has(c.roleId));
      if (!has) {
        await interaction.reply({ content: 'Choisis au moins un rôle dans la liste avant de continuer.', ephemeral: true }).catch(() => {});
        return;
      }
    }

    const isLast = index === steps.length - 1;
    if (parsed.action === 'done' || isLast) {
      if (parsed.action === 'verify' && interaction.deferred) {
        // deferUpdate() a déjà accusé réception : on édite le message d'origine.
        await this.finishAfterDefer(interaction, member, flow);
        return;
      }
      await this.finish(interaction, member, flow);
      return;
    }

    if (parsed.action === 'verify' && interaction.deferred) {
      const message = await this.buildStep(flow, index + 1, member);
      await interaction.editReply({ embeds: message.embeds, components: message.components, files: message.files, attachments: [] });
      return;
    }
    await this.showStep(interaction, flow, index + 1, member);
  }

  private static async finishAfterDefer(interaction: ButtonInteraction, member: GuildMember, flow: OnboardingFlow): Promise<void> {
    try {
      const { OnboardingService } = await import('./onboardingService.js');
      await OnboardingService.completeOnboarding(member);
    } catch (err) {
      logger.error('[Onboarding] Finalisation impossible :', err);
    }
    const done = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🎉 Parcours terminé !')
      .setDescription(`Bienvenue vraiment sur **${member.guild.name}**, ${member.displayName} !` + (flow.completionRoleId ? ' Tes accès ont été débloqués.' : ''))
      .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() || undefined });
    await interaction.editReply({ embeds: [done], components: [], files: [], attachments: [] });
  }

  public static async handleSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const parsed = parseId(interaction.customId);
    if (!parsed) return;
    const ctx = await this.resolve(interaction.client, interaction, parsed);
    if (!ctx) return;
    const { guild, member, flow, steps, index } = ctx;
    const step = steps[index];

    const bot = guild.members.me;
    if (!bot || !bot.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({ content: '❌ Je n’ai pas la permission de gérer les rôles sur ce serveur.', ephemeral: true }).catch(() => {});
      return;
    }

    const chosen = new Set(interaction.values);
    const problems: string[] = [];
    for (const choice of step.roleChoices) {
      const role = guild.roles.cache.get(choice.roleId);
      if (!role) continue;
      if (role.managed || role.position >= bot.roles.highest.position) {
        if (chosen.has(choice.roleId)) problems.push(`@${role.name}`);
        continue;
      }
      const has = member.roles.cache.has(role.id);
      try {
        if (chosen.has(role.id) && !has) {
          await member.roles.add(role, 'Onboarding : rôle choisi');
          welcomeRepository.recordEvent({ type: 'ROLE_ASSIGNED', userId: member.id, userTag: member.user.tag, detail: `Rôle @${role.name} sélectionné.` });
        } else if (!chosen.has(role.id) && has) {
          await member.roles.remove(role, 'Onboarding : rôle retiré');
        }
      } catch {
        problems.push(`@${role.name}`);
      }
    }

    const names = step.roleChoices
      .filter((c) => chosen.has(c.roleId) && !problems.includes(`@${guild.roles.cache.get(c.roleId)?.name}`))
      .map((c) => `${c.emoji ? `${c.emoji} ` : ''}${c.label}`);
    let note = names.length > 0 ? names.join(' · ') : 'Aucun rôle choisi pour l’instant.';
    if (problems.length > 0) note += `\n⚠️ Je n’ai pas pu attribuer : ${problems.join(', ')} (hiérarchie ou permission).`;
    await this.showStep(interaction, flow, index, member, note);
  }

  public static async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = parseId(interaction.customId);
    if (!parsed) return;
    const ctx = await this.resolve(interaction.client, interaction, parsed);
    if (!ctx) return;
    const { guild, member, flow, steps, index } = ctx;
    const step = steps[index];
    const answer = interaction.fields.getTextInputValue('answer').trim().slice(0, 500);

    if (answer) {
      welcomeRepository.recordEvent({
        type: 'ONBOARDING_START',
        userId: member.id,
        userTag: member.user.tag,
        detail: `Réponse à « ${(step.questionText || 'question').slice(0, 80)} » : ${answer.slice(0, 200)}`,
      });
      logService.emit({
        guildId: guild.id,
        module: 'MEMBERS',
        type: 'ONBOARDING_ANSWER',
        actor: { id: member.id, tag: member.user.tag },
        target: { id: member.id, type: 'USER', name: member.user.tag },
        reason: `« ${(step.questionText || 'Question').slice(0, 100)} » — ${answer.slice(0, 300)}`,
      });
    }

    const isLast = index === steps.length - 1;
    if (isLast) await this.finish(interaction, member, flow);
    else await this.showStep(interaction, flow, index + 1, member);
  }
}
