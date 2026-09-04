import { GuildMember } from 'discord.js';
import { RiskLevel } from '../types/index.js';
import { inviteRepository } from '../storage/inviteRepository.js';

export interface RiskEvaluation {
  riskScore: number;
  riskLevel: RiskLevel;
  suspicious: boolean;
  reason?: string;
}

export class ReferralRiskService {
  public evaluateJoin(member: GuildMember, inviterId: string): RiskEvaluation {
    return this.evaluate({
      guildId: member.guild.id,
      inviterId,
      createdTimestamp: member.user.createdTimestamp,
    });
  }

  public evaluate(params: { guildId: string; inviterId: string; createdTimestamp: number }): RiskEvaluation {
    let score = 0;
    const reasons: string[] = [];

    const now = Date.now();
    const accountAgeMs = now - params.createdTimestamp;
    const accountAgeHours = accountAgeMs / (1000 * 60 * 60);
    const accountAgeDays = Math.floor(accountAgeHours / 24);

    // 1. Check account age
    if (accountAgeHours < 2) {
      score += 55;
      reasons.push(`Compte très récent (${Math.round(accountAgeHours * 60)} min)`);
    } else if (accountAgeHours < 24) {
      score += 35;
      reasons.push(`Compte créé il y a moins de 24h`);
    } else if (accountAgeDays < 7) {
      score += 15;
      reasons.push(`Compte créé il y a moins d'une semaine`);
    }

    // 2. Check burst joins for this inviter in the last 3 minutes
    const recentGuildRefs = inviteRepository.getAllReferrals(params.guildId);
    const windowMs = 180 * 1000;
    const recentByInviter = recentGuildRefs.filter(
      (r) => r.inviterId === params.inviterId && now - new Date(r.joinedAt).getTime() <= windowMs
    );

    if (recentByInviter.length >= 4) {
      score += 40;
      reasons.push(`Vague rapide d'invitations (${recentByInviter.length} joins en < 3 min)`);
    }

    // 3. Check inviter's churn history
    const allByInviter = recentGuildRefs.filter((r) => r.inviterId === params.inviterId);
    if (allByInviter.length >= 5) {
      const leftCount = allByInviter.filter((r) => r.status === 'LEFT').length;
      const leaveRate = leftCount / allByInviter.length;
      if (leaveRate >= 0.7) {
        score += 25;
        reasons.push(`Taux de désertion élevé de l'inviteur (${Math.round(leaveRate * 100)}% de départs)`);
      }
    }

    // Normalize score
    score = Math.min(100, Math.max(0, score));

    let riskLevel: RiskLevel = 'Safe';
    if (score >= 80) riskLevel = 'Critical';
    else if (score >= 60) riskLevel = 'High Risk';
    else if (score >= 35) riskLevel = 'Suspicious';
    else if (score >= 20) riskLevel = 'Low Risk';

    const suspicious = score >= 50;

    return {
      riskScore: score,
      riskLevel,
      suspicious,
      reason: reasons.length > 0 ? reasons.join(' • ') : undefined,
    };
  }
}

export const referralRiskService = new ReferralRiskService();
