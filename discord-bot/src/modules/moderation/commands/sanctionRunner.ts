import { ActionRowBuilder, AutocompleteInteraction, ButtonBuilder, ButtonStyle, GuildMember } from 'discord.js';
import { MESSAGE_KEY, caseVars, renderTemplate } from '../sanctionMessages.js';
import { CommandContext } from '../../../types/command.js';
import { checkHierarchy } from '../permissions/hierarchy.js';
import { buildSanctionCard } from '../utils/sanctionCard.js';
import { ACTION_LABEL, activeWarns, applySanction, human } from '../services/sanctionPipeline.js';
import { moderationRepository } from '../storage/moderationRepository.js';
import { sanctionConfig, type Preset, type Severity } from '../sanctionConfig.js';
import type { CaseAction } from '../types/case.js';

const CARD_TYPE: Partial<Record<CaseAction, string>> = { WARN: 'warn', TIMEOUT: 'timeout', UNTIMEOUT: 'untimeout', KICK: 'kick', BAN: 'ban', TEMPBAN: 'ban', UNBAN: 'unban', SOFTBAN: 'ban', NOTE: 'note' };
export const UNDO_SECONDS = 10;

/** Durée saisie (« 10m », « 2h », « 3d », « 45 » = minutes) en secondes, ou null. */
export function parseDuration(input: string | null | undefined): number | null {
  const m = String(input ?? '').trim().match(/^(\d+)\s*(s|m|min|h|d|j)?$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = (m[2] || 'm').toLowerCase();
  return unit === 's' ? n : unit === 'h' ? n * 3600 : unit === 'd' || unit === 'j' ? n * 86400 : n * 60;
}

/** Raison prédéfinie choisie dans l'autocomplétion (valeur « preset:<id> »). */
export function findPreset(guildId: string, value: string | null | undefined): Preset | null {
  if (!value?.startsWith('preset:')) return null;
  return sanctionConfig.get(guildId).presets.reasons.find((p) => p.id === value.slice(7)) ?? null;
}

/** Autocomplétion « raison » : raisons prédéfinies du serveur (filtrées par type si demandé), puis le texte tapé. */
export async function reasonAutocomplete(interaction: AutocompleteInteraction, actions?: CaseAction[]): Promise<void> {
  if (!interaction.guildId) return;
  const typed = String(interaction.options.getFocused() ?? '').trim();
  const q = typed.toLowerCase();
  const presets = sanctionConfig
    .get(interaction.guildId)
    .presets.reasons.filter((p) => (!actions || actions.includes(p.action)) && (!q || p.name.toLowerCase().includes(q)))
    .slice(0, 24)
    .map((p) => ({ name: `${p.name}${p.category ? ` · ${p.category}` : ''}`.slice(0, 100), value: `preset:${p.id}` }));
  await interaction.respond(typed && !typed.startsWith('preset:') ? [{ name: typed.slice(0, 100), value: typed.slice(0, 100) }, ...presets].slice(0, 25) : presets);
}

export interface RunOptions {
  action: CaseAction;
  targetId: string | undefined;
  reason: string | null;
  durationSeconds?: number | null;
  severity?: Severity | null;
}

/** Tronc commun des commandes /warn, /timeout, /kick, /ban, /unban, /untimeout et /mod. */
export async function runSanctionCommand(ctx: CommandContext, opts: RunOptions): Promise<void> {
  if (!ctx.guild || !ctx.member) {
    await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Commande utilisable sur un serveur seulement.')] });
    return;
  }
  const cfg = sanctionConfig.get(ctx.guild.id);
  const msgKey = MESSAGE_KEY[opts.action];
  const tpl = msgKey ? cfg.messages[msgKey].reply : null;
  await ctx.deferReply({ ephemeral: tpl?.enabled ? tpl.visibility === 'mod' : cfg.replies.hideReplies });
  const fail = (msg: string) => ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(`${ctx.guildConfig.emojis.error} ${msg}`)] });

  if (!opts.targetId) return void (await fail('Membre introuvable.'));
  const preset = findPreset(ctx.guild.id, opts.reason);
  let action = opts.action;
  let reason = preset ? preset.memberReason || preset.name : (opts.reason ?? '').trim();
  let duration = opts.durationSeconds ?? null;
  if (preset && opts.action !== 'WARN' && opts.action !== 'TIMEOUT' && opts.action !== 'KICK' && opts.action !== 'BAN') action = preset.action;
  if (preset && (action === 'TIMEOUT' || action === 'TEMPBAN') && !duration) duration = preset.durationSeconds;
  if (!reason && action === 'WARN' && cfg.replies.requireReason) return void (await fail('Une raison est obligatoire pour avertir sur ce serveur.'));
  if (!reason) reason = 'Aucune raison précisée';

  if (action !== 'UNBAN') {
    const target = await ctx.guild.members.fetch(opts.targetId).catch(() => null);
    if (target) {
      const check = checkHierarchy(ctx.member as GuildMember, target, ctx.guild.members.me!);
      if (!check.allowed) return void (await fail(check.reason ?? 'Action refusée.'));
      if (check.dryRun) return void (await ctx.reply({ embeds: [ctx.createEmbed('info').setDescription('🧪 Mode test : tu t’es ciblé toi-même, aucune sanction appliquée.')] }));
    } else if (action !== 'BAN' && action !== 'TEMPBAN' && action !== 'NOTE' && action !== 'WARN') {
      return void (await fail("Ce membre n'est pas sur le serveur."));
    }
  }

  const res = await applySanction(ctx.client, {
    guildId: ctx.guild.id,
    userId: opts.targetId,
    moderator: { id: ctx.author.id, tag: ctx.author.tag },
    action,
    reason,
    durationSeconds: duration,
    severity: opts.severity ?? preset?.severity ?? undefined,
    points: preset?.points ?? undefined,
    expiryDays: preset?.expiryDays ?? undefined,
    presetId: preset?.id,
  });
  if (!res.ok) return void (await fail(res.error));
  const c = res.case;
  const user = await ctx.client.users.fetch(c.userId).catch(() => null);
  const buttons: ButtonBuilder[] = [];
  if (cfg.replies.undoButton && ['WARN', 'TIMEOUT', 'BAN', 'TEMPBAN'].includes(action)) {
    buttons.push(new ButtonBuilder().setCustomId(`sanc_undo:${c.caseNumber}:${ctx.author.id}:${Math.floor(Date.now() / 1000) + UNDO_SECONDS}`).setLabel(`Annuler (${UNDO_SECONDS} s)`).setStyle(ButtonStyle.Danger));
  }
  if (cfg.replies.hideReplies && cfg.replies.publicByDefault) buttons.push(new ButtonBuilder().setCustomId(`sanc_show:${c.caseNumber}`).setLabel('Afficher').setStyle(ButtonStyle.Secondary));

  if (tpl?.enabled) {
    const out = renderTemplate(tpl, caseVars(ctx.guild, c, ACTION_LABEL[c.action], activeWarns(ctx.guild.id, c.userId), human), {
      member: user?.displayAvatarURL() ?? null,
      moderator: ctx.author.displayAvatarURL(),
      server: ctx.guild.iconURL({ size: 256 }),
    });
    const row = buttons.length ? [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)] : [];
    await ctx.reply({ ...out, components: [...((out.components as never[]) ?? []), ...row], componentsV2: Boolean(out.flags), allowedMentions: { parse: [] } } as never);
    if (tpl.deleteAfterSeconds && ctx.interaction) {
      const it = ctx.interaction;
      setTimeout(() => void it.deleteReply().catch(() => null), tpl.deleteAfterSeconds * 1000).unref();
    }
    return;
  }

  await ctx.reply({
    components: [
      buildSanctionCard({
        guildConfig: ctx.guildConfig,
        type: CARD_TYPE[action] ?? 'warn',
        label: action === 'TEMPBAN' ? 'Ban temporaire' : action === 'SOFTBAN' ? 'Softban' : undefined,
        sanctionId: c.caseNumber,
        targetTag: c.userTag,
        targetMention: `<@${c.userId}>`,
        targetAvatarUrl: user?.displayAvatarURL() ?? null,
        moderatorMention: ctx.author.toString(),
        reason: c.reason,
        durationSeconds: action === 'WARN' ? null : c.durationSeconds,
        totalSanctions: moderationRepository.getUserCases(ctx.guild.id, c.userId).length,
        extraNote:
          action === 'WARN' && c.points != null
            ? `⚖️ ${c.points} point${c.points > 1 ? 's' : ''}${c.expiresAt ? ` · expire <t:${Math.floor(Date.parse(c.expiresAt) / 1000)}:R>` : ''}`
            : action === 'TIMEOUT' && c.expiresAt
              ? `🔓 Fin du mute : <t:${Math.floor(Date.parse(c.expiresAt) / 1000)}:R>`
              : null,
        extraButtons: buttons,
      }),
    ],
    componentsV2: true,
  });
}
