import { Client, Guild, GuildMember } from 'discord.js';
import { statrolesStorage } from '../storage/statrolesStorage.js';
import { statsQueries } from '../../stats/services/statsQueries.js';
import { statsStorage } from '../../stats/storage/statsStorage.js';
import { Condition, Operator, RulePreview, RunSummary, StatroleRule } from '../types/statroles.js';
import { logger } from '../../../utils/logger.js';

/** Plafond de changements de rôles par passage : évite une rafale (et des limites d'API) si une règle vient d'être créée. */
const MAX_CHANGES_PER_RUN = 250;
const DAY_MS = 86_400_000;

export function compare(op: Operator, actual: number, expected: number): boolean {
  switch (op) {
    case '>=':
      return actual >= expected;
    case '>':
      return actual > expected;
    case '<=':
      return actual <= expected;
    case '<':
      return actual < expected;
    default:
      return actual === expected;
  }
}

/** Données d'activité partagées par tous les membres d'un passage (un calcul par durée, pas par membre). */
export interface EvalContext {
  now: Date;
  totals(days: number): { messages: Record<string, number>; voiceHours: Record<string, number> };
}

export function makeContext(guildId: string, now = new Date()): EvalContext {
  const cache = new Map<number, ReturnType<typeof statsQueries.userTotals>>();
  return {
    now,
    totals(days) {
      let t = cache.get(days);
      if (!t) {
        t = statsQueries.userTotals(guildId, days, now);
        cache.set(days, t);
      }
      return t;
    },
  };
}

interface MemberFacts {
  id: string;
  joinedAt: number | null;
  createdAt: number;
  roleIds: ReadonlySet<string> | { has(id: string): boolean };
}

const factsOf = (m: GuildMember): MemberFacts => ({ id: m.id, joinedAt: m.joinedTimestamp ?? null, createdAt: m.user.createdTimestamp, roleIds: m.roles.cache });

/** Évalue un arbre de conditions pour un membre. Un groupe vide ne correspond à personne (jamais « tout le monde »). */
export function evaluate(node: Condition, m: MemberFacts, ctx: EvalContext): boolean {
  switch (node.kind) {
    case 'group': {
      if (node.children.length === 0) return false;
      return node.match === 'ALL' ? node.children.every((c) => evaluate(c, m, ctx)) : node.children.some((c) => evaluate(c, m, ctx));
    }
    case 'messages':
      return compare(node.op, ctx.totals(node.days).messages[m.id] ?? 0, node.value);
    case 'voice':
      return compare(node.op, ctx.totals(node.days).voiceHours[m.id] ?? 0, node.hours);
    case 'joinedAge':
      return compare(node.op, m.joinedAt ? Math.floor((ctx.now.getTime() - m.joinedAt) / DAY_MS) : 0, node.days);
    case 'accountAge':
      return compare(node.op, Math.floor((ctx.now.getTime() - m.createdAt) / DAY_MS), node.days);
    case 'hasRole':
      return m.roleIds.has(node.roleId) !== node.not;
    default:
      return false;
  }
}

/** Le bot peut-il attribuer ce rôle ? (permission « Gérer les rôles », rôle plus bas que le sien, pas un rôle géré). */
export function roleIssue(guild: Guild, roleId: string): string | null {
  const role = guild.roles.cache.get(roleId);
  if (!role) return 'rôle introuvable';
  if (role.managed) return 'rôle géré par une intégration';
  if (role.id === guild.id) return 'le rôle @everyone ne peut pas être attribué';
  if (!role.editable) return 'le rôle est au-dessus du rôle du bot (ou « Gérer les rôles » manque)';
  return null;
}

function needsStats(node: Condition): boolean {
  if (node.kind === 'messages' || node.kind === 'voice') return true;
  return node.kind === 'group' ? node.children.some(needsStats) : false;
}

class StatrolesEngine {
  private running = new Set<string>();
  private timer: NodeJS.Timeout | null = null;

  /** Un passage toutes les 10 minutes sur les serveurs où le module est actif. */
  public initialize(client: Client): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      for (const guildId of statrolesStorage.enabledGuildIds()) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) void this.run(guild).catch((err) => logger.warn(`[Statroles] Passage en échec sur ${guildId} :`, err));
      }
    }, 10 * 60_000);
    this.timer.unref?.();
  }

  public async preview(guild: Guild, rule: StatroleRule): Promise<RulePreview> {
    await guild.members.fetch().catch(() => undefined);
    const ctx = makeContext(guild.id);
    const warnings: string[] = [];
    if (needsStats(rule.root) && !statsStorage.isEnabled(guild.id)) warnings.push('Le module Statistiques est désactivé : les conditions de messages et de vocal comptent 0 tant qu’il n’est pas activé.');
    const issue = roleIssue(guild, rule.roleId);
    if (issue) warnings.push(`Rôle non attribuable : ${issue}.`);
    let matching = 0;
    let holders = 0;
    let toAdd = 0;
    let toRemove = 0;
    const sample: RulePreview['sample'] = [];
    for (const member of guild.members.cache.values()) {
      if (member.user.bot) continue;
      const ok = evaluate(rule.root, factsOf(member), ctx);
      const has = member.roles.cache.has(rule.roleId);
      if (ok) matching++;
      if (has) holders++;
      if (ok && !has) toAdd++;
      if (!ok && has && rule.removeWhenNotMatching) toRemove++;
      if (ok && sample.length < 10) sample.push({ id: member.id, name: member.displayName });
    }
    return { matching, holders, toAdd, toRemove, sample, warnings };
  }

  /** Applique toutes les règles actives du serveur. Un seul passage à la fois par serveur. */
  public async run(guild: Guild): Promise<RunSummary> {
    const summary: RunSummary = { added: 0, removed: 0, errors: 0, skipped: 0, issues: [] };
    if (this.running.has(guild.id)) return summary;
    const conf = statrolesStorage.getConfig(guild.id);
    if (!conf.enabled) return summary;
    this.running.add(guild.id);
    try {
      await guild.members.fetch().catch(() => undefined);
      const ctx = makeContext(guild.id);
      let changes = 0;
      for (const rule of conf.rules) {
        if (!rule.enabled) continue;
        const issue = roleIssue(guild, rule.roleId);
        if (issue) {
          summary.issues.push(`${rule.name} : ${issue}`);
          continue;
        }
        for (const member of guild.members.cache.values()) {
          if (member.user.bot) continue;
          const ok = evaluate(rule.root, factsOf(member), ctx);
          const has = member.roles.cache.has(rule.roleId);
          if (ok === has || (!ok && !rule.removeWhenNotMatching)) continue;
          if (changes >= MAX_CHANGES_PER_RUN) {
            summary.skipped++;
            continue;
          }
          try {
            if (ok) {
              await member.roles.add(rule.roleId, `Statrole « ${rule.name} » : conditions remplies`);
              summary.added++;
            } else {
              await member.roles.remove(rule.roleId, `Statrole « ${rule.name} » : conditions plus remplies`);
              summary.removed++;
            }
            changes++;
          } catch (err) {
            summary.errors++;
            logger.warn(`[Statroles] Impossible de modifier ${member.user.tag} (règle « ${rule.name} ») :`, err);
          }
        }
      }
      statrolesStorage.updateConfig(guild.id, { lastRunAt: new Date().toISOString(), lastRun: { added: summary.added, removed: summary.removed, errors: summary.errors, skipped: summary.skipped } });
      if (summary.added || summary.removed) logger.info(`[Statroles] ${guild.name} : +${summary.added} / −${summary.removed}`);
      return summary;
    } finally {
      this.running.delete(guild.id);
    }
  }

  /** Explique, règle par règle, pourquoi un membre a ou n'a pas droit au rôle (commande /statroles check). */
  public check(guild: Guild, member: GuildMember): Array<{ rule: StatroleRule; matches: boolean; hasRole: boolean }> {
    const ctx = makeContext(guild.id);
    return statrolesStorage.getConfig(guild.id).rules.map((rule) => ({ rule, matches: evaluate(rule.root, factsOf(member), ctx), hasRole: member.roles.cache.has(rule.roleId) }));
  }
}

export const statrolesEngine = new StatrolesEngine();
