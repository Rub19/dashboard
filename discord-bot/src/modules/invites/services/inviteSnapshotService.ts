import { Guild, Invite } from 'discord.js';
import { InviteSnapshot } from '../types/index.js';
import { inviteRepository } from '../storage/inviteRepository.js';
import { logger } from '../../../utils/logger.js';

export interface InviteResolution {
  code: string;
  inviterId: string;
  inviterTag: string;
  source: 'invite_link' | 'vanity' | 'unknown';
}

export class InviteSnapshotService {
  public async primeGuildSnapshots(guild: Guild): Promise<void> {
    try {
      if (!guild.members.me?.permissions.has('ManageGuild')) {
        logger.warn(`[InviteSnapshot] Pas de permission ManageGuild sur ${guild.name}`);
        return;
      }

      const currentInvites = await guild.invites.fetch().catch(() => null);
      if (!currentInvites) return;

      const map = new Map<string, InviteSnapshot>();
      currentInvites.forEach((inv) => {
        map.set(inv.code, {
          code: inv.code,
          guildId: guild.id,
          inviterId: inv.inviter?.id,
          inviterTag: inv.inviter?.tag,
          uses: inv.uses || 0,
          maxUses: inv.maxUses || 0,
          expiresAt: inv.expiresAt ? inv.expiresAt.toISOString() : null,
          createdAt: inv.createdAt ? inv.createdAt.toISOString() : undefined,
          temporary: inv.temporary || false,
          vanity: false,
          url: inv.url,
          lastSyncedAt: new Date().toISOString(),
        });
      });

      inviteRepository.setSnapshots(guild.id, map);
      logger.info(`[InviteSnapshot] ${map.size} invitations chargées pour ${guild.name}`);
    } catch (err) {
      logger.error(`[InviteSnapshot] Erreur primeGuildSnapshots pour ${guild.id}:`, err);
    }
  }

  public async resolveUsedInvite(guild: Guild): Promise<InviteResolution | null> {
    try {
      const cached = inviteRepository.getSnapshots(guild.id);
      const current = await guild.invites.fetch().catch(() => null);

      if (!current) return null;

      let foundCode: string | null = null;
      let matchedInvite: Invite | null = null;

      // 1. Compare uses between cached snapshot and current live invites
      for (const [code, liveInv] of current.entries()) {
        const oldSnap = cached.get(code);
        if (oldSnap) {
          if ((liveInv.uses || 0) > oldSnap.uses) {
            foundCode = code;
            matchedInvite = liveInv;
            break;
          }
        } else if ((liveInv.uses || 0) > 0) {
          // Newly created invite that was used
          foundCode = code;
          matchedInvite = liveInv;
          break;
        }
      }

      // 2. Refresh cache
      await this.primeGuildSnapshots(guild);

      if (foundCode && matchedInvite) {
        return {
          code: foundCode,
          inviterId: matchedInvite.inviter?.id || 'system',
          inviterTag: matchedInvite.inviter?.tag || 'Discord System',
          source: 'invite_link',
        };
      }

      // 3. Check vanity url uses if server has vanity
      if (guild.vanityURLCode) {
        const vanityData = await guild.fetchVanityData().catch(() => null);
        if (vanityData) {
          return {
            code: vanityData.code,
            inviterId: 'vanity',
            inviterTag: 'Vanity URL',
            source: 'vanity',
          };
        }
      }

      return null;
    } catch (err) {
      logger.error('[InviteSnapshotService] Erreur resolveUsedInvite:', err);
      return null;
    }
  }

  public handleInviteCreate(invite: Invite): void {
    if (!invite.guild) return;
    const cached = inviteRepository.getSnapshots(invite.guild.id);
    cached.set(invite.code, {
      code: invite.code,
      guildId: invite.guild.id,
      inviterId: invite.inviter?.id,
      inviterTag: invite.inviter?.tag,
      uses: invite.uses || 0,
      maxUses: invite.maxUses || 0,
      expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
      createdAt: invite.createdAt ? invite.createdAt.toISOString() : undefined,
      temporary: invite.temporary || false,
      vanity: false,
      url: invite.url,
      lastSyncedAt: new Date().toISOString(),
    });
    inviteRepository.setSnapshots(invite.guild.id, cached);
  }

  public handleInviteDelete(invite: Invite): void {
    if (!invite.guild) return;
    const cached = inviteRepository.getSnapshots(invite.guild.id);
    cached.delete(invite.code);
    inviteRepository.setSnapshots(invite.guild.id, cached);
  }

  public diffSnapshots(
    cached: Map<string, InviteSnapshot>,
    live: Map<string, { code: string; uses: number; inviterId?: string; inviterTag?: string }>
  ): { code: string; inviterId: string; inviterTag: string } | null {
    for (const [code, liveInv] of live.entries()) {
      const oldSnap = cached.get(code);
      if (oldSnap) {
        if (liveInv.uses > oldSnap.uses) {
          return {
            code,
            inviterId: liveInv.inviterId || oldSnap.inviterId || 'system',
            inviterTag: liveInv.inviterTag || oldSnap.inviterTag || 'Discord System',
          };
        }
      } else if (liveInv.uses > 0) {
        return {
          code,
          inviterId: liveInv.inviterId || 'system',
          inviterTag: liveInv.inviterTag || 'Discord System',
        };
      }
    }
    return null;
  }
}

export const inviteSnapshotService = new InviteSnapshotService();
