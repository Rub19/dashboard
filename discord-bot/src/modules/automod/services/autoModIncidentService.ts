import { GuildMember, User } from 'discord.js';
import { autoModRepository } from '../storage/autoModRepository.js';
import { AutoModIncident, UserModerationProfile } from '../types/autoMod.js';
import { sanctionService } from '../../moderation/sanctions/sanctionService.js';

export class AutoModIncidentService {
  public static addIncident(params: Omit<AutoModIncident, 'id' | 'timestamp'>): AutoModIncident {
    const id = `INC-AM-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`;
    const incident: AutoModIncident = {
      ...params,
      id,
      timestamp: new Date().toISOString(),
    };
    autoModRepository.addIncident(params.guildId, incident);
    return incident;
  }

  public static getIncidents(guildId: string, limit = 50): AutoModIncident[] {
    return autoModRepository.getIncidents(guildId, limit);
  }

  public static getUserProfile(guildId: string, memberOrUser: GuildMember | User): UserModerationProfile {
    const user = 'user' in memberOrUser ? memberOrUser.user : memberOrUser;
    const member = 'roles' in memberOrUser ? (memberOrUser as GuildMember) : null;

    const allStrikes = autoModRepository.getAllUserStrikesHistory(guildId, user.id);
    const activeStrikes = autoModRepository.getUserStrikes(guildId, user.id);
    const incidents = autoModRepository.getIncidents(guildId, 200).filter((i) => i.userId === user.id);

    // Récupérer les sanctions globales
    const sanctions = sanctionService.getUserSanctions(guildId, user.id);
    const warnings = sanctions.filter((s) => s.type === 'warn').length;
    const timeouts = sanctions.filter((s) => s.type === 'timeout').length;
    const kicks = sanctions.filter((s) => s.type === 'kick').length;
    const bans = sanctions.filter((s) => s.type === 'ban').length;

    // Calcul de l'âge du compte
    const ageDays = Math.round((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    // Calcul du niveau de confiance (0: Unknown, 1: New, 2: Trusted, 3: Staff, 4: Admin)
    let trustLevel = 2; // default Trusted
    if (ageDays < 1) trustLevel = 1; // New
    if (activeStrikes.length > 0) trustLevel = 0; // Suspect / Unknown
    if (member) {
      if (member.permissions.has('Administrator')) trustLevel = 4;
      else if (member.permissions.has('ManageGuild') || member.permissions.has('ModerateMembers')) trustLevel = 3;
    }

    return {
      userId: user.id,
      userTag: user.tag,
      accountAgeDays: ageDays,
      trustLevel,
      activeStrikes: activeStrikes.length,
      totalStrikesHistory: allStrikes.length,
      warningsCount: warnings,
      timeoutsCount: timeouts,
      kicksCount: kicks,
      bansCount: bans,
      recentDetections: incidents.slice(0, 15),
    };
  }
}
