import { ContainerBuilder, EmbedBuilder, Guild, MessageFlags, SectionBuilder, SeparatorBuilder, TextDisplayBuilder, ThumbnailBuilder, type BaseMessageOptions } from 'discord.js';
import { guildLang, tr } from '../../utils/tr.js';
import type { CaseAction, ModerationCase } from './types/case.js';
import type { MessageKey, MessageTemplate } from './sanctionConfig.js';

/** Commande de sanction → clé de message personnalisé. */
export const MESSAGE_KEY: Partial<Record<CaseAction, MessageKey>> = {
  WARN: 'warn',
  NOTE: 'note',
  BAN: 'ban',
  TEMPBAN: 'tempban',
  SOFTBAN: 'softban',
  KICK: 'kick',
  TIMEOUT: 'mute',
  UNTIMEOUT: 'unmute',
  UNBAN: 'unban',
};

export interface MessageVars {
  target: string;
  member: string;
  moderator: string;
  reason: string;
  case: string;
  warns: string;
  server: string;
  duration: string;
  points: string;
  type: string;
}

export const fill = (t: string, v: MessageVars) => t.replace(/\{(target|member|moderator|reason|case|warns|server|duration|points|type)\}/g, (_, k: keyof MessageVars) => v[k] ?? '');

/** Message personnalisé (Messages de sanction) en texte, embed ou container. */
export function renderTemplate(
  t: MessageTemplate,
  v: MessageVars,
  thumbs: { member?: string | null; moderator?: string | null; server?: string | null }
): BaseMessageOptions & { flags?: number } {
  const title = fill(t.title, v).slice(0, 256);
  const text = fill(t.text, v).slice(0, 4000);
  const footer = fill(t.footer, v).slice(0, 256);
  const thumb = t.thumb === 'none' ? null : (thumbs[t.thumb] ?? null);
  const color = parseInt(t.color.slice(1), 16);
  if (t.format === 'text') return { content: [title && `**${title}**`, text, footer && `-# ${footer}`].filter(Boolean).join('\n').slice(0, 2000) || '​' };
  if (t.format === 'embed') {
    const e = new EmbedBuilder().setColor(color);
    if (title) e.setTitle(title);
    if (text) e.setDescription(text);
    if (footer) e.setFooter({ text: footer });
    if (thumb) e.setThumbnail(thumb);
    if (!title && !text) e.setDescription('​');
    return { embeds: [e] };
  }
  const c = new ContainerBuilder().setAccentColor(color);
  const body = [title && `### ${title}`, text].filter(Boolean).join('\n') || '​';
  if (thumb) c.addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(body)).setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb)));
  else c.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  if (footer) c.addSeparatorComponents(new SeparatorBuilder()).addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footer}`));
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export function caseVars(guild: Guild, c: ModerationCase, label: string, warns: number, human: (s: number, lang?: string) => string): MessageVars {
  const lang = guildLang(guild.id);
  return {
    target: `<@${c.userId}>`,
    member: c.userTag,
    moderator: c.source === 'SYSTEM' ? 'Etho' : c.moderatorTag,
    reason: c.reason,
    case: `#${c.caseNumber}`,
    warns: String(warns),
    server: guild.name,
    duration: c.durationSeconds && c.action !== 'WARN' ? human(c.durationSeconds, lang) : '',
    points: c.points != null ? String(c.points) : '',
    type: tr(lang, label),
  };
}
