import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MessageActionRowComponentBuilder } from 'discord.js';
import { container, footer, sectionWithThumbnail, separator, statsLine, text, toneToColor } from '../../../utils/components.js';
import type { GuildConfig } from '../../../types/guildConfig.js';
import type { Sanction } from '../types/sanction.js';

const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png';

export const SANCTION_META: Record<string, { emoji: string; label: string; tone: 'success' | 'error' | 'warning' | 'info' | 'primary' }> = {
  warn: { emoji: '⚠️', label: 'Avertissement', tone: 'warning' },
  timeout: { emoji: '🔇', label: 'Sourdine (timeout)', tone: 'warning' },
  untimeout: { emoji: '🔊', label: 'Sourdine levée', tone: 'success' },
  kick: { emoji: '👢', label: 'Expulsion', tone: 'error' },
  ban: { emoji: '🔨', label: 'Bannissement', tone: 'error' },
  unban: { emoji: '🔓', label: 'Débannissement', tone: 'success' },
};

export function formatSanctionDuration(seconds?: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [d ? `${d} j` : null, h ? `${h} h` : null, m ? `${m} min` : null].filter(Boolean);
  return parts.length ? parts.join(' ') : `${seconds} s`;
}

/**
 * Carte de confirmation d'une sanction (réponse à /warn, /timeout, /kick,
 * /ban…) — même chrome V2 que /rank et /economy.
 */
export function buildSanctionCard(opts: {
  guildConfig: GuildConfig;
  type: string;
  sanctionId: string | number;
  targetTag: string;
  targetMention?: string | null;
  targetAvatarUrl?: string | null;
  moderatorMention: string;
  reason: string;
  durationSeconds?: number | null;
  totalSanctions?: number;
  escalation?: string | null;
  dryRun?: boolean;
  extraNote?: string | null;
}): ContainerBuilder {
  const meta = SANCTION_META[opts.type] || { emoji: '📋', label: opts.type.toUpperCase(), tone: 'info' as const };
  const hex = meta.tone === 'error' ? opts.guildConfig.errorColor : meta.tone === 'success' ? opts.guildConfig.successColor : meta.tone === 'info' ? opts.guildConfig.infoColor : null;
  const duration = formatSanctionDuration(opts.durationSeconds);

  return container(toneToColor(meta.tone, hex), [
    sectionWithThumbnail(
      [
        `## ${meta.emoji} ${meta.label} · #${opts.sanctionId}`,
        `**Membre :** ${opts.targetMention || opts.targetTag}${opts.targetMention ? ` (${opts.targetTag})` : ''}`,
        `**Modérateur :** ${opts.moderatorMention}`,
      ],
      opts.targetAvatarUrl || DEFAULT_AVATAR,
      opts.targetTag,
    ),
    text(`**Raison :** ${opts.reason}`),
    separator(),
    statsLine([
      duration ? `⏱️ ${duration}` : null,
      typeof opts.totalSanctions === 'number' ? `📋 ${opts.totalSanctions} sanction(s) au total` : null,
      `🕒 <t:${Math.floor(Date.now() / 1000)}:R>`,
    ]),
    opts.escalation ? text(`⚡ **Auto-escalade :** ${opts.escalation}`) : null,
    opts.extraNote ? text(opts.extraNote) : null,
    opts.dryRun ? text('🧪 **Mode test (God Mode)** — auto-ciblage : aperçu sans conséquence réelle.') : null,
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`mod_btn_history:${(opts.targetMention || '').replace(/[^0-9]/g, '') || '0'}`)
        .setLabel('Historique')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!opts.targetMention),
    ),
    footer(`${opts.guildConfig.botName} · Modération`),
  ]);
}

/** Historique des sanctions d'un membre (/warnings). */
export function buildSanctionHistoryCard(opts: {
  guildConfig: GuildConfig;
  targetTag: string;
  targetId: string;
  targetAvatarUrl?: string | null;
  sanctions: Sanction[];
}): ContainerBuilder {
  const { sanctions } = opts;
  const counts: Record<string, number> = {};
  for (const s of sanctions) counts[s.type] = (counts[s.type] || 0) + 1;
  const summary = Object.entries(counts)
    .map(([type, n]) => `${SANCTION_META[type]?.emoji || '📋'} ${n}`)
    .join('  ');

  const lines = sanctions.slice(0, 10).map((s) => {
    const meta = SANCTION_META[s.type] || { emoji: '📋', label: s.type };
    const ts = Math.floor(new Date(s.timestamp).getTime() / 1000);
    return `${meta.emoji} **#${s.id}** ${meta.label} — ${s.reason}\n-# par ${s.moderatorTag} · <t:${ts}:d>`;
  });

  return container(toneToColor(sanctions.length === 0 ? 'success' : 'primary', sanctions.length === 0 ? opts.guildConfig.successColor : opts.guildConfig.primaryColor), [
    sectionWithThumbnail(
      [
        `## 📋 Historique · ${opts.targetTag}`,
        sanctions.length === 0 ? 'Aucune sanction enregistrée — casier vierge ✅' : `**${sanctions.length}** sanction(s) · ${summary}`,
        `-# <@${opts.targetId}>`,
      ],
      opts.targetAvatarUrl || DEFAULT_AVATAR,
      opts.targetTag,
    ),
    sanctions.length > 0 ? separator() : null,
    sanctions.length > 0 ? text(lines.join('\n\n')) : null,
    sanctions.length > 10 ? text(`-# … et **${sanctions.length - 10}** autre(s)`) : null,
    footer(`${opts.guildConfig.botName} · Modération`),
  ]);
}
