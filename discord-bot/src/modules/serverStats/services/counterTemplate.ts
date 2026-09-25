import { ChannelType, Guild } from 'discord.js';
import { statsQueries } from '../../stats/services/statsQueries.js';
import { statsStorage } from '../../stats/storage/statsStorage.js';

/**
 * Moteur de modèles des salons compteurs. Un modèle est un texte libre (emojis compris) avec des jetons `{nom}` ou
 * `{nom:paramètre}` remplacés par la valeur du moment : membres, horloge, compte à rebours, activité sur N jours, membre ou
 * salon le plus actif… Ex. : « 🕐 {time12:UTC} UTC », « {members_until:next} avant le prochain palier », « Top : {top_member:7d} ».
 *
 * Discord limite le renommage d'un salon à 2 fois par 10 minutes : l'horloge s'affiche donc à la dizaine de minutes près.
 */

export interface TokenDoc {
  token: string;
  label: string;
  example: string;
  group: 'Serveur' | 'Heure' | 'Compte à rebours' | 'Activité' | 'Classements';
  /** Nécessite le module Statistiques (données d'activité). */
  needsStats?: boolean;
}

export const TOKEN_DOCS: TokenDoc[] = [
  { token: '{members}', label: 'Nombre de membres', example: '13855', group: 'Serveur' },
  { token: '{humans}', label: 'Membres (sans les bots)', example: '13802', group: 'Serveur' },
  { token: '{bots}', label: 'Nombre de bots', example: '53', group: 'Serveur' },
  { token: '{boosts}', label: 'Boosts du serveur', example: '14', group: 'Serveur' },
  { token: '{boost_tier}', label: 'Niveau de boost', example: '2', group: 'Serveur' },
  { token: '{roles}', label: 'Nombre de rôles', example: '31', group: 'Serveur' },
  { token: '{channels}', label: 'Nombre de salons', example: '46', group: 'Serveur' },
  { token: '{text_channels}', label: 'Salons textuels', example: '28', group: 'Serveur' },
  { token: '{voice_channels}', label: 'Salons vocaux', example: '9', group: 'Serveur' },
  { token: '{voice_now}', label: 'Membres en vocal maintenant', example: '12', group: 'Serveur' },
  { token: '{role:ID}', label: 'Membres ayant un rôle (identifiant du rôle)', example: '41', group: 'Serveur' },
  { token: '{time}', label: 'Heure (24 h) — fuseau : {time:Europe/Paris}', example: '14:30', group: 'Heure' },
  { token: '{time12}', label: 'Heure (12 h) — fuseau : {time12:UTC}', example: '9:00am', group: 'Heure' },
  { token: '{date}', label: 'Date — fuseau : {date:Europe/Paris}', example: '25/09/2026', group: 'Heure' },
  { token: '{members_until:15000}', label: 'Membres restants avant un objectif', example: '1145', group: 'Compte à rebours' },
  { token: '{members_until:next}', label: 'Membres restants avant le prochain palier rond', example: '145', group: 'Compte à rebours' },
  { token: '{members_next}', label: 'Prochain palier de membres', example: '15000', group: 'Compte à rebours' },
  { token: '{days_until:2026-12-31}', label: 'Jours restants avant une date', example: '97', group: 'Compte à rebours' },
  { token: '{msg:7d}', label: 'Messages sur N jours (1d à 365d)', example: '806', group: 'Activité', needsStats: true },
  { token: '{voice:7d}', label: 'Heures de vocal sur N jours', example: '52', group: 'Activité', needsStats: true },
  { token: '{joins:7d}', label: 'Arrivées sur N jours', example: '37', group: 'Activité', needsStats: true },
  { token: '{leaves:7d}', label: 'Départs sur N jours', example: '12', group: 'Activité', needsStats: true },
  { token: '{active:7d}', label: 'Membres actifs sur N jours', example: '244', group: 'Activité', needsStats: true },
  { token: '{top_member:7d}', label: 'Membre le plus actif à l’écrit', example: 'Lando', group: 'Classements', needsStats: true },
  { token: '{top_voice_member:7d}', label: 'Membre le plus actif en vocal', example: 'Rub19', group: 'Classements', needsStats: true },
  { token: '{top_channel:7d}', label: 'Salon textuel le plus actif', example: 'general', group: 'Classements', needsStats: true },
  { token: '{top_voice_channel:7d}', label: 'Salon vocal le plus fréquenté', example: 'Meetings', group: 'Classements', needsStats: true },
];

const MILESTONES = [50, 100, 250, 500, 1000, 2500, 5000, 10_000, 15_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

export function nextMilestone(members: number): number {
  return MILESTONES.find((m) => m > members) ?? Math.ceil((members + 1) / 1_000_000) * 1_000_000;
}

const TOKEN_RE = /\{([a-z0-9_]+)(?::([^{}]{1,64}))?\}/g;

/** Vrai si le modèle a besoin de la liste complète des membres (chargée une fois par rafraîchissement). */
export function needsMemberFetch(template: string): boolean {
  return /\{(humans|bots|role|top_member|top_voice_member)(?::[^}]*)?\}/.test(template);
}

function parseDays(arg: string | undefined): number | null {
  const m = /^(\d{1,3})d$/.exec(arg ?? '');
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 365 ? n : null;
}

function safeZone(arg: string | undefined): string | null {
  const zone = arg && arg.length > 0 ? arg : 'UTC';
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
    return zone;
  } catch {
    return null;
  }
}

const fmtInt = (n: number) => String(Math.round(n));
const fmtHours = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Heure « au dixième d'heure » : 9:07 s'affiche 9:00, en cohérence avec le rythme de rafraîchissement possible. */
function clock(now: Date, zone: string, hour12: boolean): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Math.floor(Number(parts.find((p) => p.type === 'minute')?.value ?? 0) / 10) * 10;
  const mm = String(m).padStart(2, '0');
  if (!hour12) return `${String(h).padStart(2, '0')}:${mm}`;
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${h % 12 === 0 ? 12 : h % 12}:${mm}${suffix}`;
}

function memberName(guild: Guild, id: string | undefined): string {
  if (!id) return 'personne';
  return guild.members.cache.get(id)?.displayName ?? 'membre inconnu';
}

function channelName(guild: Guild, id: string | undefined): string {
  if (!id) return 'aucun';
  return guild.channels.cache.get(id)?.name ?? 'salon supprimé';
}

export interface RenderResult {
  text: string;
  warnings: string[];
}

/** Remplace tous les jetons du modèle. Un jeton inconnu ou mal paramétré est laissé tel quel et signalé dans `warnings`. */
export function renderTemplate(guild: Guild, template: string, now = new Date()): RenderResult {
  const warnings: string[] = [];
  const cache = new Map<number, ReturnType<typeof statsQueries.summary>>();
  const summary = (days: number) => {
    let s = cache.get(days);
    if (!s) {
      s = statsQueries.summary(guild.id, days, 1, now);
      cache.set(days, s);
    }
    return s;
  };

  const text = template.replace(TOKEN_RE, (whole, name: string, arg: string | undefined) => {
    const bad = (why: string) => {
      warnings.push(`${whole} : ${why}`);
      return whole;
    };
    const members = guild.members.cache;
    switch (name) {
      case 'members':
        return fmtInt(guild.memberCount);
      case 'humans':
        return fmtInt(members.filter((m) => !m.user.bot).size);
      case 'bots':
        return fmtInt(members.filter((m) => m.user.bot).size);
      case 'boosts':
        return fmtInt(guild.premiumSubscriptionCount ?? 0);
      case 'boost_tier':
        return fmtInt(guild.premiumTier ?? 0);
      case 'roles':
        return fmtInt(guild.roles.cache.size - 1);
      case 'channels':
        return fmtInt(guild.channels.cache.filter((c) => c.type !== ChannelType.GuildCategory).size);
      case 'text_channels':
        return fmtInt(guild.channels.cache.filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement).size);
      case 'voice_channels':
        return fmtInt(guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice).size);
      case 'voice_now':
        return fmtInt(guild.voiceStates.cache.filter((v) => !!v.channelId).size);
      case 'role': {
        if (!arg || !/^\d{5,25}$/.test(arg)) return bad('indiquez l’identifiant du rôle');
        const role = guild.roles.cache.get(arg);
        return role ? fmtInt(role.members.size) : bad('rôle introuvable');
      }
      case 'time':
      case 'time12': {
        const zone = safeZone(arg);
        return zone ? clock(now, zone, name === 'time12') : bad('fuseau horaire inconnu (ex. UTC, Europe/Paris)');
      }
      case 'date': {
        const zone = safeZone(arg);
        return zone ? new Intl.DateTimeFormat('fr-FR', { timeZone: zone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(now) : bad('fuseau horaire inconnu');
      }
      case 'members_next':
        return fmtInt(nextMilestone(guild.memberCount));
      case 'members_until': {
        const target = arg === 'next' ? nextMilestone(guild.memberCount) : Number(arg);
        if (!Number.isFinite(target) || target <= 0) return bad('indiquez un objectif (ex. 15000) ou « next »');
        return fmtInt(Math.max(0, target - guild.memberCount));
      }
      case 'days_until': {
        if (!arg || !/^\d{4}-\d{2}-\d{2}$/.test(arg)) return bad('format de date AAAA-MM-JJ attendu');
        const end = new Date(`${arg}T00:00:00Z`).getTime();
        if (Number.isNaN(end)) return bad('date invalide');
        return fmtInt(Math.max(0, Math.ceil((end - now.getTime()) / 86_400_000)));
      }
      case 'msg':
      case 'voice':
      case 'joins':
      case 'leaves':
      case 'active': {
        const days = parseDays(arg);
        if (!days) return bad('période attendue : 1d à 365d');
        const t = summary(days).totals;
        return name === 'msg' ? fmtInt(t.messages) : name === 'voice' ? fmtHours(t.voiceHours) : name === 'joins' ? fmtInt(t.joins) : name === 'leaves' ? fmtInt(t.leaves) : fmtInt(t.activeUsers);
      }
      case 'top_member':
      case 'top_voice_member':
      case 'top_channel':
      case 'top_voice_channel': {
        const days = parseDays(arg);
        if (!days) return bad('période attendue : 1d à 365d');
        const s = summary(days);
        if (name === 'top_member') return memberName(guild, s.topMembersMessages[0]?.id);
        if (name === 'top_voice_member') return memberName(guild, s.topMembersVoice[0]?.id);
        if (name === 'top_channel') return channelName(guild, s.topChannelsMessages[0]?.id);
        return channelName(guild, s.topChannelsVoice[0]?.id);
      }
      default:
        return bad('jeton inconnu');
    }
  });

  if (/\{(msg|voice|joins|leaves|active|top_[a-z_]+):/.test(template) && !statsStorage.isEnabled(guild.id)) {
    warnings.push('Le module Statistiques est désactivé : les compteurs d’activité affichent 0 tant qu’il n’est pas activé.');
  }
  return { text: text.replace(/\s+/g, ' ').trim().slice(0, 100), warnings };
}
