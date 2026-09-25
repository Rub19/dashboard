import { Message } from 'discord.js';
import { AutoModConfig, DetectionResult } from '../types/autoMod.js';

/** Mentions interdites : des membres ou des rôles précis que personne ne doit mentionner (fondateur, staff…). */
export class PingDetector {
  public static check(message: Message, config: AutoModConfig): DetectionResult {
    const conf = config.pings;
    const none: DetectionResult = { detectorName: 'PingDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    if (!conf.enabled || (conf.userIds.length === 0 && conf.roleIds.length === 0)) return none;
    const users = conf.userIds.filter((id) => message.mentions.users.has(id) && id !== message.author.id);
    const roles = conf.roleIds.filter((id) => message.mentions.roles.has(id));
    if (users.length === 0 && roles.length === 0) return none;
    return {
      detectorName: 'PingDetector',
      triggered: true,
      riskPoints: 15,
      reason: 'Mention interdite',
      matchedContent: [...users.map((u) => `<@${u}>`), ...roles.map((r) => `<@&${r}>`)].join(' '),
      actions: conf.actions,
    };
  }
}
