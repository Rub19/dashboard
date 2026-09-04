import { GuildMember } from 'discord.js';
import { VoiceSession } from '../types/index.js';
import { voiceRepository } from '../storage/voiceRepository.js';

export class VoiceSessionService {
  public static recordJoin(member: GuildMember, channelId: string, roomName: string, hubId: string): VoiceSession {
    const session: VoiceSession = {
      id: 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      guildId: member.guild.id,
      channelId,
      roomName,
      hubId,
      userId: member.id,
      userTag: member.user.tag,
      joinedAt: new Date().toISOString(),
      leftAt: null,
      durationSeconds: 0,
    };
    voiceRepository.addSession(session);
    return session;
  }

  public static recordLeave(member: GuildMember, channelId: string): VoiceSession | null {
    return voiceRepository.closeSession(channelId, member.id);
  }

  public static getUserVoiceProfile(guildId: string, userId: string) {
    const sessions = voiceRepository.getUserSessions(guildId, userId);
    const totalDurationSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const sessionsCount = sessions.length;
    const averageSessionMinutes = sessionsCount > 0 ? Math.round(totalDurationSeconds / sessionsCount / 60) : 0;
    const hubCounts = new Map<string, number>();
    sessions.forEach((s) => {
      hubCounts.set(s.hubId, (hubCounts.get(s.hubId) || 0) + 1);
    });
    let topHubId: string | null = null;
    let maxCount = 0;
    hubCounts.forEach((cnt, hId) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        topHubId = hId;
      }
    });
    const topHub = topHubId ? voiceRepository.getHubById(topHubId)?.name || topHubId : 'Général';
    const lastSession = sessions.length > 0 ? sessions[0] : null;
    return {
      userId,
      totalVoiceMinutes: Math.round(totalDurationSeconds / 60),
      sessionsCount,
      averageSessionMinutes,
      favoriteHub: topHub,
      lastVoiceActivity: lastSession?.leftAt || lastSession?.joinedAt || null,
      recentSessions: sessions.slice(0, 10),
    };
  }
}