import { Message } from 'discord.js';
import { AutoModConfig, DetectionResult } from '../types/autoMod.js';

export class InviteDetector {
  public static check(message: Message, config: AutoModConfig): DetectionResult {
    const inviteConf = config.invites;
    if (!inviteConf.enabled) {
      return { detectorName: 'InviteDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    // Si le salon actuel est dans la whitelist des salons d'invites (ex: #partenaires)
    if (inviteConf.allowedChannelIds.includes(message.channel.id)) {
      return { detectorName: 'InviteDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    // Si l'utilisateur possède un rôle autorisé
    if (message.member && inviteConf.allowedRoleIds.some((r) => message.member!.roles.cache.has(r))) {
      return { detectorName: 'InviteDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    const content = message.content || '';
    const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9_-]+/gi;
    const matches = content.match(inviteRegex);

    if (matches && matches.length > 0) {
      return {
        detectorName: 'InviteDetector',
        triggered: true,
        riskPoints: 30,
        reason: `Invitation Discord non autorisée : ${matches[0]}`,
        matchedContent: matches[0],
        actions: inviteConf.actions,
      };
    }

    return { detectorName: 'InviteDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
  }
}
