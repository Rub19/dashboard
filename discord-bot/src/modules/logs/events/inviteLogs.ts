import { AuditLogEvent, Invite } from 'discord.js';
import { logService } from '../services/logService.js';
import { DiscordAuditAdapter } from '../services/discordAuditAdapter.js';

export async function handleInviteCreateLog(invite: Invite): Promise<void> {
  if (!invite.guild) return;
  // L'objet Invite porte déjà son créateur (invite.inviter) : pas besoin du journal d'audit ici.
  const actor = invite.inviter ? { id: invite.inviter.id, tag: invite.inviter.tag } : { id: 'unknown', tag: 'Membre Inconnu' };

  logService.emit({
    guildId: invite.guild.id,
    module: 'INVITES',
    type: 'INVITE_CREATE',
    actor,
    target: { id: invite.code, type: 'INVITE', name: invite.code },
    channel: invite.channel ? { id: invite.channel.id, name: 'name' in invite.channel ? invite.channel.name || 'salon' : 'salon' } : undefined,
    reason: `Invitation créée : ${invite.code}`,
    after: { code: invite.code, maxUses: invite.maxUses, maxAge: invite.maxAge },
    metadata: { code: invite.code },
  });
}

export async function handleInviteDeleteLog(invite: Invite): Promise<void> {
  if (!invite.guild || !('id' in invite.guild)) return;
  const auditRes = await DiscordAuditAdapter.resolveExecutor(invite.guild as any, AuditLogEvent.InviteDelete, invite.code);
  const actor = auditRes.actor || { id: 'unknown', tag: 'Système (expirée ou épuisée)' };

  logService.emit({
    guildId: invite.guild.id,
    module: 'INVITES',
    type: 'INVITE_DELETE',
    actor,
    target: { id: invite.code, type: 'INVITE', name: invite.code },
    reason: auditRes.reason || `Invitation supprimée : ${invite.code}`,
    before: { code: invite.code },
    metadata: { code: invite.code },
  });
}
