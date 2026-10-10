import { EmbedBuilder, PermissionFlagsBits, type Guild } from 'discord.js';
import { getProtection } from './catalog.js';
import { protectionStore } from './protectionStore.js';

/**
 * « Tester » une protection depuis la console : le propriétaire est toujours ignoré par les protections, il ne peut
 * donc pas les déclencher lui-même. Ce test vérifie ce qui ferait échouer une vraie réaction : permissions d'Etho pour
 * réparer et pour sanctionner, rôles au-dessus d'Etho, et envoi réel d'un message de test dans le salon de log.
 */
type Perm = keyof typeof PermissionFlagsBits;
export type CheckLine = { label: string; ok: boolean; detail?: string };

/** Permission nécessaire pour réparer (annuler l'action) selon la protection. */
function repairPerms(key: string): Perm[] {
  if (/^antiChannel|^rollback/.test(key)) return ['ManageChannels'];
  if (/^antiRole|^antiReorganisation/.test(key)) return ['ManageRoles'];
  if (/^antiWebhook/.test(key)) return ['ManageWebhooks'];
  if (key === 'antiThreadCreate') return ['ManageThreads'];
  if (key === 'antiBan' || key === 'antiBot') return ['BanMembers'];
  if (key === 'antiTimeout') return ['ModerateMembers'];
  if (key === 'antiMuteVoc') return ['MuteMembers'];
  if (key === 'antiSourdineVoc') return ['DeafenMembers'];
  if (key === 'antiDecoUser' || key === 'antiDeplUser') return ['MoveMembers'];
  if (/^antiEmoji|^antiExpression/.test(key)) return ['ManageGuildExpressions'];
  if (/^antiUpdateGuild|^antiServerRename|^antiIconUpdate|^antiInviteDelete/.test(key)) return ['ManageGuild'];
  if (key === 'antiAlt') return ['KickMembers'];
  return [];
}

const PUNISH_PERM: Record<string, Perm | null> = { none: null, timeout: 'ModerateMembers', derank: 'ManageRoles', kick: 'KickMembers', ban: 'BanMembers' };
const PERM_LABEL: Partial<Record<Perm, string>> = {
  ManageChannels: 'Gérer les salons',
  ManageRoles: 'Gérer les rôles',
  ManageWebhooks: 'Gérer les webhooks',
  ManageThreads: 'Gérer les fils',
  ManageMessages: 'Gérer les messages',
  BanMembers: 'Bannir des membres',
  KickMembers: 'Expulser des membres',
  ModerateMembers: 'Exclure temporairement',
  MuteMembers: 'Rendre muet',
  DeafenMembers: 'Mettre en sourdine',
  MoveMembers: 'Déplacer des membres',
  ManageGuildExpressions: 'Gérer les expressions',
  ManageGuild: 'Gérer le serveur',
  ViewAuditLog: 'Voir les logs du serveur',
};

export async function checkProtection(guild: Guild, key: string, sendLog = true): Promise<CheckLine[]> {
  const def = getProtection(key);
  const s = protectionStore.get(guild.id, key);
  const me = guild.members.me;
  if (!def || !me) return [{ label: 'Protection ou bot introuvable', ok: false }];
  const lines: CheckLine[] = [];
  lines.push({ label: s.enabled ? 'Protection activée' : 'Protection désactivée', ok: s.enabled, detail: s.enabled ? undefined : 'Elle ne réagira pas tant qu’elle est coupée.' });

  const has = (p: Perm) => me.permissions.has(PermissionFlagsBits[p]);
  const need = new Set<Perm>(repairPerms(key));
  if (def.deletesMessage) need.add('ManageMessages');
  if (def.category !== 'Messages' && key !== 'antiAlt') need.add('ViewAuditLog');
  for (const p of need) lines.push({ label: `Réparer : ${PERM_LABEL[p] ?? p}`, ok: has(p), detail: has(p) ? undefined : 'Permission manquante pour Etho.' });

  const punishPerm = PUNISH_PERM[s.punish ?? 'none'];
  if (punishPerm) lines.push({ label: `Sanctionner : ${PERM_LABEL[punishPerm] ?? punishPerm}`, ok: has(punishPerm), detail: has(punishPerm) ? undefined : 'Permission manquante pour Etho.' });
  if (s.lockdown) lines.push({ label: 'Verrouiller : Gérer les rôles', ok: has('ManageRoles') });

  if (s.punish === 'derank' || s.punish === 'timeout' || s.punish === 'kick' || s.lockdown) {
    const above = guild.roles.cache.filter((r) => r.id !== guild.id && r.comparePositionTo(me.roles.highest) > 0);
    lines.push({
      label: 'Place du rôle d’Etho',
      ok: above.size === 0,
      detail: above.size === 0 ? 'Tout en haut : il peut agir sur tous les rôles.' : `${above.size} rôle(s) au-dessus d’Etho (${above.map((r) => r.name).slice(0, 5).join(', ')}) : leurs membres échappent à la sanction.`,
    });
  }

  if (!s.logChannelId) {
    lines.push({ label: 'Salon de log', ok: false, detail: 'Aucun salon choisi : les alertes ne s’affichent que dans la console (Logs).' });
  } else {
    const ch = guild.channels.cache.get(s.logChannelId);
    const can = ch && ch.isTextBased() && ch.permissionsFor(me)?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]);
    let sent = false;
    if (can && sendLog && 'send' in ch) {
      sent = await ch
        .send({ embeds: [new EmbedBuilder().setColor(0x6b7280).setTitle(`🧪 Test — ${def.label}`).setDescription('Message de test envoyé depuis la console Etho : les alertes de cette protection arriveront ici.').setTimestamp()] })
        .then(() => true)
        .catch(() => false);
    }
    lines.push({ label: 'Salon de log', ok: Boolean(can) && (sent || !sendLog), detail: !ch ? 'Salon supprimé.' : !can ? 'Etho ne peut pas y écrire.' : sendLog ? 'Message de test envoyé.' : undefined });
  }
  return lines;
}
