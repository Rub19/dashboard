import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type Guild,
  type GuildMember,
  type ModalSubmitInteraction,
} from 'discord.js';
import { createCanvas } from '@napi-rs/canvas';
import { guildConfigService } from './guildConfigService.js';
import { baseEmbed, noticeEmbed } from '../utils/embeds.js';
import { FONT_STACK, registerCardFonts } from '../utils/cardFonts.js';
import { logger } from '../utils/logger.js';

/**
 * Captcha à l'arrivée (page « Outils » de la console) : le nouveau membre doit recopier un code affiché en image
 * dans le délai imparti, sinon il est expulsé, banni ou laissé sans accès. Réussite : rôles donnés et retirés.
 */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans I, L, O, 0, 1 (trop proches)

export function newCode(length = 5, rand: () => number = Math.random): string {
  return Array.from({ length }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join('');
}

export function renderCaptcha(code: string): Buffer {
  registerCardFonts();
  const w = 320;
  const h = 110;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#16181d';
  ctx.fillRect(0, 0, w, h);
  // Bruit : traits et points, pour gêner la lecture automatique sans gêner un humain.
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = `hsla(${Math.random() * 360}, 60%, 60%, 0.45)`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.bezierCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h);
    ctx.stroke();
  }
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  ctx.textBaseline = 'middle';
  const step = (w - 40) / code.length;
  [...code].forEach((ch, i) => {
    ctx.save();
    ctx.translate(28 + i * step + step / 2 - 14, h / 2 + (Math.random() - 0.5) * 18);
    ctx.rotate((Math.random() - 0.5) * 0.6);
    ctx.font = `bold ${44 + Math.floor(Math.random() * 10)}px ${FONT_STACK.mono}`;
    ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 75%)`;
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  return canvas.toBuffer('image/png');
}

type Pending = { code: string | null; attempts: number; deadline: number; timer: NodeJS.Timeout; joinMessage?: { channelId: string; messageId: string } };
// ponytail: en mémoire ; après un redémarrage, le délai repart quand le membre clique sur « Commencer » dans le salon.
const pending = new Map<string, Pending>();
const keyOf = (guildId: string, userId: string) => `${guildId}:${userId}`;

export function pendingCount(guildId: string): number {
  return [...pending.keys()].filter((k) => k.startsWith(`${guildId}:`)).length;
}

const cfgOf = (guildId: string) => guildConfigService.getConfig(guildId).captcha;

function startButton(userId?: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(userId ? `captcha_start:${userId}` : 'captcha_start')
      .setLabel('Commencer la vérification')
      .setStyle(ButtonStyle.Success)
  );
}

function track(guild: Guild, userId: string): Pending {
  const k = keyOf(guild.id, userId);
  const existing = pending.get(k);
  if (existing) return existing;
  const delayMs = cfgOf(guild.id).delayMinutes * 60_000;
  const entry: Pending = {
    code: null,
    attempts: 0,
    deadline: Date.now() + delayMs,
    timer: setTimeout(() => void fail(guild, userId, 'timeout'), delayMs),
  };
  pending.set(k, entry);
  return entry;
}

async function clear(guild: Guild, userId: string) {
  const entry = pending.get(keyOf(guild.id, userId));
  if (!entry) return;
  clearTimeout(entry.timer);
  pending.delete(keyOf(guild.id, userId));
  if (entry.joinMessage) {
    const ch = guild.channels.cache.get(entry.joinMessage.channelId);
    if (ch?.isTextBased()) await ch.messages.delete(entry.joinMessage.messageId).catch(() => null);
  }
}

async function log(guild: Guild, text: string, tone: 'success' | 'error') {
  const id = cfgOf(guild.id).logChannelId;
  const ch = id ? guild.channels.cache.get(id) : null;
  if (ch?.isTextBased()) await ch.send({ embeds: [noticeEmbed(tone, text, { title: 'Captcha' })] }).catch(() => null);
}

/** Arrivée d'un membre : il entre dans la file, avec une mention dans le salon de vérification si activée. */
export async function onMemberJoin(member: GuildMember): Promise<void> {
  const cfg = cfgOf(member.guild.id);
  if (!cfg.enabled || !cfg.channelId || member.user.bot) return;
  const entry = track(member.guild, member.id);
  if (!cfg.mentionOnJoin) return;
  const ch = member.guild.channels.cache.get(cfg.channelId);
  if (!ch?.isTextBased()) return;
  const msg = await ch
    .send({
      content: `<@${member.id}>`,
      embeds: [
        baseEmbed('info')
          .setTitle('Vérification')
          .setDescription(`Bienvenue ! Prouve que tu n'es pas un robot : clique sur le bouton et recopie le code. Tu as **${cfg.delayMinutes} minutes**.`),
      ],
      components: [startButton(member.id)],
      allowedMentions: { users: [member.id] },
    })
    .catch(() => null);
  if (msg) entry.joinMessage = { channelId: ch.id, messageId: msg.id };
}

function challenge(guild: Guild, userId: string, note?: string) {
  const cfg = cfgOf(guild.id);
  const entry = track(guild, userId);
  entry.code = newCode();
  const left = cfg.attempts - entry.attempts;
  return {
    embeds: [
      baseEmbed('info')
        .setTitle('Recopie ce code')
        .setDescription(
          `${note ? `${note}\n\n` : ''}Clique sur « Saisir le code » et recopie les ${entry.code.length} caractères (majuscules ou minuscules).\n` +
            `Essai${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''} : **${left}** · fin <t:${Math.floor(entry.deadline / 1000)}:R>`
        )
        .setImage('attachment://captcha.png'),
    ],
    files: [new AttachmentBuilder(renderCaptcha(entry.code), { name: 'captcha.png' })],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('captcha_answer').setLabel('Saisir le code').setStyle(ButtonStyle.Primary)
      ),
    ],
  };
}

export async function handleCaptchaButton(interaction: ButtonInteraction): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;
  const cfg = cfgOf(guild.id);
  if (!cfg.enabled) {
    await interaction.reply({ embeds: [noticeEmbed('warning', "Le captcha n'est plus actif sur ce serveur.")], flags: MessageFlags.Ephemeral });
    return;
  }
  if (interaction.customId === 'captcha_answer') {
    if (!pending.get(keyOf(guild.id, interaction.user.id))?.code) {
      await interaction.reply({ embeds: [noticeEmbed('warning', 'Clique d\'abord sur « Commencer la vérification ».')], flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.showModal(
      new ModalBuilder()
        .setCustomId('captcha_modal')
        .setTitle('Vérification')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId('code').setLabel('Code affiché sur l\'image').setStyle(TextInputStyle.Short).setMinLength(3).setMaxLength(10).setRequired(true)
          )
        )
    );
    return;
  }
  // captcha_start[:userId]
  const target = interaction.customId.split(':')[1];
  if (target && target !== interaction.user.id) {
    await interaction.reply({ embeds: [noticeEmbed('warning', "Ce bouton n'est pas pour toi : utilise celui du message épinglé du salon.")], flags: MessageFlags.Ephemeral });
    return;
  }
  const member = await guild.members.fetch(interaction.user.id).catch(() => null);
  const verified = member && cfg.givenRoles.length > 0 && cfg.givenRoles.every((r) => member.roles.cache.has(r));
  if (verified && !pending.has(keyOf(guild.id, interaction.user.id))) {
    await interaction.reply({ embeds: [noticeEmbed('success', 'Tu es déjà vérifié.')], flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply({ ...challenge(guild, interaction.user.id), flags: MessageFlags.Ephemeral });
}

export async function handleCaptchaModal(interaction: ModalSubmitInteraction): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;
  const cfg = cfgOf(guild.id);
  const entry = pending.get(keyOf(guild.id, interaction.user.id));
  if (!entry?.code) {
    await interaction.reply({ embeds: [noticeEmbed('warning', 'Clique d\'abord sur « Commencer la vérification ».')], flags: MessageFlags.Ephemeral });
    return;
  }
  const answer = interaction.fields.getTextInputValue('code').trim().toUpperCase();
  if (answer === entry.code) {
    await pass(guild, interaction.user.id);
    await interaction.reply({ embeds: [noticeEmbed('success', 'Vérification réussie, bienvenue !')], flags: MessageFlags.Ephemeral });
    return;
  }
  entry.attempts += 1;
  entry.code = null;
  if (entry.attempts >= cfg.attempts) {
    await interaction.reply({ embeds: [noticeEmbed('error', 'Code incorrect, plus aucun essai.')], flags: MessageFlags.Ephemeral });
    await fail(guild, interaction.user.id, 'attempts');
    return;
  }
  await interaction.reply({ ...challenge(guild, interaction.user.id, 'Code incorrect, voici un nouveau code.'), flags: MessageFlags.Ephemeral });
}

async function pass(guild: Guild, userId: string) {
  const cfg = cfgOf(guild.id);
  await clear(guild, userId);
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;
  const editable = (id: string) => guild.roles.cache.get(id)?.editable;
  const add = cfg.givenRoles.filter((r) => editable(r) && !member.roles.cache.has(r));
  const remove = cfg.removedRoles.filter((r) => editable(r) && member.roles.cache.has(r));
  if (add.length) await member.roles.add(add, 'Captcha réussi').catch((e) => logger.warn('[Captcha] Rôles non donnés :', e));
  if (remove.length) await member.roles.remove(remove, 'Captcha réussi').catch((e) => logger.warn('[Captcha] Rôles non retirés :', e));
  if (cfg.logSuccess) await log(guild, `<@${userId}> a réussi le captcha.`, 'success');
}

async function fail(guild: Guild, userId: string, why: 'timeout' | 'attempts') {
  const cfg = cfgOf(guild.id);
  await clear(guild, userId);
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return; // parti entre-temps
  const reason = why === 'timeout' ? 'délai dépassé' : 'trop d\'essais';
  let outcome = 'aucune sanction';
  if (cfg.failAction === 'kick' && member.kickable) {
    await member.send(`Tu as été expulsé de **${guild.name}** : captcha non validé (${reason}). Tu peux revenir et réessayer.`).catch(() => null);
    outcome = (await member.kick(`Captcha échoué (${reason})`).then(() => true).catch(() => false)) ? 'expulsé' : 'expulsion impossible';
  } else if (cfg.failAction === 'ban' && member.bannable) {
    outcome = (await member.ban({ reason: `Captcha échoué (${reason})` }).then(() => true).catch(() => false)) ? 'banni' : 'bannissement impossible';
  } else if (cfg.failAction !== 'none') {
    outcome = 'Etho n\'a pas la permission ou le rôle assez haut pour sanctionner';
  }
  await log(guild, `<@${userId}> a échoué au captcha (${reason}) : ${outcome}.`, 'error');
}

/** Message permanent avec le bouton « Commencer » : posté (ou reposté s'il a été supprimé) quand le captcha est réglé. */
export async function ensureCaptchaPanel(guild: Guild): Promise<void> {
  const cfg = cfgOf(guild.id);
  if (!cfg.enabled || !cfg.channelId) return;
  const ch = guild.channels.cache.get(cfg.channelId);
  if (!ch?.isTextBased()) return;
  if (cfg.panelMessageId && (await ch.messages.fetch(cfg.panelMessageId).catch(() => null))) return;
  const msg = await ch
    .send({
      embeds: [
        baseEmbed('info')
          .setTitle('Vérification')
          .setDescription('Pour accéder au serveur, clique sur le bouton et recopie le code affiché.'),
      ],
      components: [startButton()],
    })
    .catch((e) => {
      logger.warn('[Captcha] Panneau non posté :', e);
      return null;
    });
  if (msg) guildConfigService.updateConfig(guild.id, { captcha: { ...cfg, panelMessageId: msg.id } });
}
