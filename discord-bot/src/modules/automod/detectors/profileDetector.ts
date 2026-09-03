import { GuildMember } from 'discord.js';
import { AutoModConfig, DetectionResult } from '../types/autoMod.js';

export class ProfileDetector {
  public static check(member: GuildMember, config: AutoModConfig): DetectionResult {
    const profConf = config.profiles;
    if (!profConf.enabled || profConf.blockedWords.length === 0) {
      return { detectorName: 'ProfileDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    const username = member.user.username.toLowerCase();
    const displayName = (member.displayName || '').toLowerCase();
    const nickname = (member.nickname || '').toLowerCase();

    for (const word of profConf.blockedWords) {
      const term = word.trim().toLowerCase();
      if (!term) continue;

      let matched = false;
      if (profConf.scanUsername && username.includes(term)) matched = true;
      if (profConf.scanNickname && (displayName.includes(term) || nickname.includes(term))) matched = true;

      // Détection des liens/invites dans le pseudo
      const inviteInName = /(discord\.(gg|io|me)|discordapp\.com\/invite|discord\.com\/invite)\//i.test(
        `${username} ${displayName}`
      );
      if (inviteInName) {
        return {
          detectorName: 'ProfileDetector',
          triggered: true,
          riskPoints: 30,
          reason: `Lien ou invitation Discord dans le pseudo (${member.user.tag})`,
          matchedContent: member.user.tag,
          actions: ['WARN', 'LOG'],
        };
      }

      if (matched) {
        return {
          detectorName: 'ProfileDetector',
          triggered: true,
          riskPoints: 20,
          reason: `Mot interdit dans le pseudo ou surnom : "${term}"`,
          matchedContent: term,
          actions: profConf.actions,
        };
      }
    }

    return { detectorName: 'ProfileDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
  }
}
