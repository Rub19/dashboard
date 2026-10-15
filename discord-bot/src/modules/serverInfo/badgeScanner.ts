import { Guild, GuildMember, UserFlags } from 'discord.js';
import { getAppEmoji } from '../../services/appEmojis.js';

const CDN = 'https://cdn.discordapp.com/badge-icons';

export interface BadgeDef {
  key: string;
  label: string;
  icon: string;
  flag?: number;
}

export const PROFILE_BADGES: BadgeDef[] = [
  { key: 'staff', label: 'Discord Staff', icon: '5e74e9b61934fc1f67c65515d1f7e60d', flag: UserFlags.Staff },
  { key: 'partner', label: 'Partenaire Discord', icon: '3f9748e53446a137a052f3454e2de41e', flag: UserFlags.Partner },
  { key: 'certifiedmod', label: 'Modérateur certifié (ancien)', icon: 'fee1624003e2fee35cb398e125dc479b', flag: UserFlags.CertifiedModerator },
  { key: 'hypesquad', label: 'HypeSquad Events', icon: 'bf01d1073931f921909045f3a39fd264', flag: UserFlags.Hypesquad },
  { key: 'bravery', label: 'HypeSquad Bravery', icon: '8a88d63823d8a71cd5e390baa45efa02', flag: UserFlags.HypeSquadOnlineHouse1 },
  { key: 'brilliance', label: 'HypeSquad Brilliance', icon: '011940fd013da3f7fb926e4a1cd2e618', flag: UserFlags.HypeSquadOnlineHouse2 },
  { key: 'balance', label: 'HypeSquad Balance', icon: '3aa41de486fa12454c3761e8e223442e', flag: UserFlags.HypeSquadOnlineHouse3 },
  { key: 'bughunter1', label: 'Bug Hunter', icon: '2717692c7dca7289b35297368a940dd0', flag: UserFlags.BugHunterLevel1 },
  { key: 'bughunter2', label: 'Bug Hunter Or', icon: '848f79194d4be5ff5f81505cbd0ce1e6', flag: UserFlags.BugHunterLevel2 },
  { key: 'earlysupporter', label: 'Early Supporter', icon: '7060786766c9c840eb3019e725d2b358', flag: UserFlags.PremiumEarlySupporter },
  { key: 'verifieddev', label: 'Développeur de bot vérifié', icon: '6df5892e0f35b051f8b61eace34f4967', flag: UserFlags.VerifiedDeveloper },
  { key: 'activedev', label: 'Développeur actif', icon: '6bdc42827a38498929a4920da12695d9', flag: UserFlags.ActiveDeveloper },
  { key: 'nitro', label: 'Nitro (avatar animé)', icon: '2ba85e8026a8614b640c2837bcdfe21b' },
];

export const BOOST_TIERS: Array<BadgeDef & { months: number }> = [
  { key: 'boost1', label: 'Boost · 1 mois', months: 1, icon: '51040c70d4f20a921ad6674ff86fc95c' },
  { key: 'boost2', label: 'Boost · 2 mois', months: 2, icon: '0e4080d1d333bc7ad29ef6528b6f2fb7' },
  { key: 'boost3', label: 'Boost · 3 mois', months: 3, icon: '72bed924410c304dbe3d00a6e593ff59' },
  { key: 'boost6', label: 'Boost · 6 mois', months: 6, icon: 'df199d2050d3ed4ebf84d64ae83989f8' },
  { key: 'boost9', label: 'Boost · 9 mois', months: 9, icon: '996b3e870e8a22ce519b3a50e6bdd52f' },
  { key: 'boost12', label: 'Boost · 1 an', months: 12, icon: '991c9f39ee33d7537d9f408c3e53141e' },
  { key: 'boost15', label: 'Boost · 15 mois', months: 15, icon: 'cb3ae83c15e970e8f3d410bc62cb8b99' },
  { key: 'boost18', label: 'Boost · 18 mois', months: 18, icon: '7142225d31238f6387d9f09efaa02759' },
  { key: 'boost24', label: 'Boost · 2 ans', months: 24, icon: 'ec92202290b48d0879b7413d2dde3bab' },
];

export interface BadgeCount {
  key: string;
  label: string;
  iconUrl: string;
  count: number;
}

export interface BadgeScan {
  scannedAt: string;
  humans: number;
  bots: number;
  withBadge: number;
  boosters: number;
  badges: BadgeCount[];
  boosts: BadgeCount[];
}

const MONTH_MS = 30.44 * 24 * 3600 * 1000;
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; scan: BadgeScan }>();
const inFlight = new Map<string, Promise<BadgeScan>>();

export const badgeIconUrl = (hash: string) => `${CDN}/${hash}.png`;
export const badgeEmoji = (key: string) => getAppEmoji(`etho_badge_${key}`) ?? '';

export function boostTier(premiumSince: Date, now = Date.now()) {
  const months = (now - premiumSince.getTime()) / MONTH_MS;
  return [...BOOST_TIERS].reverse().find((t) => months >= t.months) ?? BOOST_TIERS[0];
}

function memberBadges(member: GuildMember): string[] {
  const keys: string[] = [];
  const flags = member.user.flags?.bitfield ?? 0;
  for (const b of PROFILE_BADGES) if (b.flag !== undefined && (flags & b.flag) === b.flag) keys.push(b.key);
  if (member.user.avatar?.startsWith('a_')) keys.push('nitro');
  if (member.premiumSince) keys.push(boostTier(member.premiumSince).key);
  return keys;
}

async function runScan(guild: Guild): Promise<BadgeScan> {
  const members = await guild.members.fetch();
  const counts = new Map<string, number>();
  let humans = 0;
  let bots = 0;
  let withBadge = 0;
  let boosters = 0;
  for (const member of members.values()) {
    if (member.user.bot) {
      bots++;
      continue;
    }
    humans++;
    const keys = memberBadges(member);
    if (keys.length) withBadge++;
    if (member.premiumSince) boosters++;
    for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const toCount = (b: BadgeDef): BadgeCount => ({ key: b.key, label: b.label, iconUrl: badgeIconUrl(b.icon), count: counts.get(b.key) ?? 0 });
  return {
    scannedAt: new Date().toISOString(),
    humans,
    bots,
    withBadge,
    boosters,
    badges: PROFILE_BADGES.map(toCount),
    boosts: BOOST_TIERS.map(toCount),
  };
}

export async function scanBadges(guild: Guild, force = false): Promise<BadgeScan> {
  const hit = cache.get(guild.id);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.scan;
  const pending = inFlight.get(guild.id);
  if (pending) return pending;
  const job = runScan(guild)
    .then((scan) => {
      cache.set(guild.id, { at: Date.now(), scan });
      return scan;
    })
    .finally(() => inFlight.delete(guild.id));
  inFlight.set(guild.id, job);
  return job;
}
