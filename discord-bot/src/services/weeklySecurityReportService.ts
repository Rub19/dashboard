import { EmbedBuilder, PermissionFlagsBits, type Client, type Guild } from 'discord.js';
import { guildConfigService } from './guildConfigService.js';
import { protectionStore } from '../modules/protections/protectionStore.js';
import { PROTECTIONS } from '../modules/protections/catalog.js';
import { securityStorage } from '../modules/security/storage/securityStorage.js';
import { logger } from '../utils/logger.js';

/**
 * « Rapport de sécurité hebdomadaire » (Réglages de la console, désactivé par défaut) : chaque lundi vers 9 h (UTC),
 * le propriétaire reçoit en MP le bilan des 7 derniers jours. Uniquement des données réelles du bot.
 */
const WEEK_MS = 7 * 24 * 3600_000;
const NEEDED: [keyof typeof PermissionFlagsBits, string][] = [
  ['ViewAuditLog', 'Voir les logs du serveur'],
  ['ManageRoles', 'Gérer les rôles'],
  ['ManageChannels', 'Gérer les salons'],
  ['ManageWebhooks', 'Gérer les webhooks'],
  ['BanMembers', 'Bannir des membres'],
  ['ModerateMembers', 'Exclure temporairement'],
];

export function buildWeeklyReport(guild: Guild, now = Date.now()): EmbedBuilder {
  const since = now - WEEK_MS;
  const incidents = securityStorage.getIncidents(guild.id).filter((i) => Date.parse(i.createdAt) >= since);
  const byTitle = new Map<string, number>();
  for (const i of incidents) byTitle.set(i.title, (byTitle.get(i.title) ?? 0) + 1);
  const top = [...byTitle.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const settings = protectionStore.all(guild.id);
  const active = PROTECTIONS.filter((p) => settings[p.key]?.enabled).length;

  const me = guild.members.me;
  const above = me ? guild.roles.cache.filter((r) => r.id !== guild.id && r.comparePositionTo(me.roles.highest) > 0).size : 0;
  const missing = me ? NEEDED.filter(([p]) => !me.permissions.has(PermissionFlagsBits[p])).map(([, l]) => l) : [];
  const adminRoles = guild.roles.cache.filter((r) => r.id !== guild.id && !r.managed && r.permissions.has(PermissionFlagsBits.Administrator)).map((r) => r.name);

  const todo: string[] = [];
  if (active === 0) todo.push('Aucune protection n’est activée.');
  if (above > 0) todo.push(`${above} rôle${above > 1 ? 's sont' : ' est'} au-dessus d’Etho : il ne pourra pas les retirer à un attaquant.`);
  if (missing.length) todo.push(`Permissions manquantes : ${missing.join(', ')}.`);

  return new EmbedBuilder()
    .setColor(todo.length ? 0xf59e0b : 0x22c55e)
    .setTitle(`🛡️ Rapport de sécurité — ${guild.name}`)
    .setDescription(
      [
        `**Incidents (7 jours) :** ${incidents.length}`,
        ...top.map(([t, n]) => `• ${t} : ${n}`),
        '',
        `**Protections actives :** ${active}/${PROTECTIONS.length}`,
        `**Rôles administrateurs :** ${adminRoles.length ? adminRoles.slice(0, 10).join(', ') : 'aucun'}`,
        '',
        todo.length ? `**À regarder :**\n${todo.map((t) => `• ${t}`).join('\n')}` : '✅ Rien à signaler.',
      ].join('\n')
    )
    .setFooter({ text: 'Désactivable dans la console Etho › Réglages' })
    .setTimestamp(now);
}

async function sendReport(guild: Guild): Promise<boolean> {
  try {
    const owner = await guild.fetchOwner();
    await owner.send({ embeds: [buildWeeklyReport(guild)] });
    return true;
  } catch (err) {
    logger.warn(`[WeeklyReport] MP au propriétaire impossible sur ${guild.name} :`, (err as Error)?.message);
    return false;
  }
}

/** Le lundi à partir de 9 h UTC, une fois par semaine et par serveur. */
export function isReportDue(lastAt: string | null | undefined, now = new Date()): boolean {
  if (now.getUTCDay() !== 1 || now.getUTCHours() < 9) return false;
  return !lastAt || now.getTime() - Date.parse(lastAt) >= WEEK_MS - 3600_000;
}

export function startWeeklySecurityReports(client: Client): void {
  const tick = async () => {
    for (const guild of client.guilds.cache.values()) {
      const conf = guildConfigService.getConfig(guild.id);
      if (!conf.weeklyReport || !isReportDue(conf.lastWeeklyReportAt)) continue;
      // Date notée avant l'envoi : un MP refusé ne doit pas être retenté toutes les heures.
      guildConfigService.updateConfig(guild.id, { lastWeeklyReportAt: new Date().toISOString() });
      await sendReport(guild);
    }
  };
  setInterval(() => void tick().catch(() => {}), 3600_000).unref();
  setTimeout(() => void tick().catch(() => {}), 2 * 60_000).unref();
}
