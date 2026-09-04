import { DiscordPoll } from '../types/index.js';

export interface UserEligibilityContext {
  userId: string;
  accountAgeDays: number;
  guildMemberDays: number;
  userRoleIds: string[];
}

export class PollEligibilityService {
  /**
   * Verify if a member satisfies the poll's eligibility rules.
   */
  public checkEligibility(
    poll: DiscordPoll,
    userCtxOrId: UserEligibilityContext | string,
    userRoleIds?: string[],
    accountAgeDays?: number,
    guildMemberDays?: number
  ): { eligible: boolean; reason?: string } {
    let userCtx: UserEligibilityContext;
    if (typeof userCtxOrId === 'string') {
      userCtx = {
        userId: userCtxOrId,
        userRoleIds: userRoleIds || [],
        accountAgeDays: accountAgeDays || 0,
        guildMemberDays: guildMemberDays || 0,
      };
    } else {
      userCtx = userCtxOrId;
    }

    const el = poll.eligibility;
    if (!el) return { eligible: true };

    // 1. Whitelist of specific user IDs
    if (el.specificUserIds && el.specificUserIds.length > 0) {
      if (el.specificUserIds.includes(userCtx.userId)) {
        return { eligible: true };
      }
      return { eligible: false, reason: 'Ce sondage est réservé à une liste de membres spécifiques.' };
    }

    // 2. Forbidden roles
    if (el.forbiddenRoleIds && el.forbiddenRoleIds.length > 0) {
      const hasForbidden = el.forbiddenRoleIds.some((r) => userCtx.userRoleIds.includes(r));
      if (hasForbidden) {
        return { eligible: false, reason: 'L\'un de vos rôles Discord vous interdit de participer à ce vote.' };
      }
    }

    // 3. Min Account Age
    if (el.minAccountAgeDays && userCtx.accountAgeDays < el.minAccountAgeDays) {
      return {
        eligible: false,
        reason: `Votre compte Discord doit avoir au moins ${el.minAccountAgeDays} jours d'ancienneté pour voter.`,
      };
    }

    // 4. Min Guild Membership Days
    if (el.minGuildMembershipDays && userCtx.guildMemberDays < el.minGuildMembershipDays) {
      return {
        eligible: false,
        reason: `Vous devez être membre du serveur depuis au moins ${el.minGuildMembershipDays} jours pour voter.`,
      };
    }

    // 5. Allowed roles
    if (el.allowedRoleIds && el.allowedRoleIds.length > 0) {
      if (el.logicGate === 'ALL') {
        const hasAll = el.allowedRoleIds.every((r) => userCtx.userRoleIds.includes(r));
        if (!hasAll) {
          return { eligible: false, reason: 'Vous devez posséder tous les rôles requis pour participer à ce vote.' };
        }
      } else {
        const hasAny = el.allowedRoleIds.some((r) => userCtx.userRoleIds.includes(r));
        if (!hasAny) {
          return { eligible: false, reason: 'Vous ne possédez pas le rôle Discord requis pour voter.' };
        }
      }
    }

    return { eligible: true };
  }

  /**
   * Determine the vote weight multiplier based on user roles and poll configuration.
   */
  public getVoteWeight(poll: DiscordPoll, userRoleIds: string[]): number {
    if (!poll.roleWeights || poll.roleWeights.length === 0) return 1;

    let maxWeight = 1;
    for (const rw of poll.roleWeights) {
      if (userRoleIds.includes(rw.roleId)) {
        if (rw.weightMultiplier > maxWeight) {
          maxWeight = rw.weightMultiplier;
        }
      }
    }

    return maxWeight;
  }

  public calculateUserWeight(poll: DiscordPoll, userRoleIds: string[]): number {
    return this.getVoteWeight(poll, userRoleIds);
  }
}

export const pollEligibilityService = new PollEligibilityService();
