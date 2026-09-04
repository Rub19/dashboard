import { Guild, GuildMember, VoiceChannel } from 'discord.js';
import { voiceRepository } from '../storage/voiceRepository.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class VoiceAutomationService {
  public static async dispatch(
    guild: Guild,
    trigger: 'USER_JOIN' | 'USER_LEAVE' | 'ROOM_CREATED' | 'ROOM_DELETED' | 'ROOM_EMPTY' | 'ROOM_FULL' | 'ROOM_LOCKED',
    context: {
      member?: GuildMember;
      channel?: VoiceChannel;
      roomName?: string;
      roomId?: string;
    }
  ): Promise<void> {
    const settings = voiceRepository.getSettings(guild.id);
    if (!settings.automationsEnabled || settings.automations.length === 0) return;
    const matchingRules = settings.automations.filter((r) => r.enabled && r.trigger === trigger);
    for (const rule of matchingRules) {
      try {
        if (rule.action === 'GIVE_ROLE' && rule.roleId && context.member) {
          const role = guild.roles.cache.get(rule.roleId);
          if (role && !context.member.roles.cache.has(role.id)) {
            await context.member.roles.add(role.id).catch(() => null);
            logger.info('[VoiceAuto] Rôle ' + role.name + ' donné à ' + context.member.user.tag);
          }
        } else if (rule.action === 'REMOVE_ROLE' && rule.roleId && context.member) {
          const role = guild.roles.cache.get(rule.roleId);
          if (role && context.member.roles.cache.has(role.id)) {
            await context.member.roles.remove(role.id).catch(() => null);
            logger.info('[VoiceAuto] Rôle ' + role.name + ' retiré de ' + context.member.user.tag);
          }
        } else if (rule.action === 'SEND_MESSAGE' && rule.targetChannelId && rule.messageTemplate) {
          const textChan = guild.channels.cache.get(rule.targetChannelId);
          if (textChan && 'send' in textChan) {
            const formatted = rule.messageTemplate
              .replace('{user}', context.member ? '<@' + context.member.id + '>' : 'Utilisateur')
              .replace('{username}', context.member?.user.username || 'Utilisateur')
              .replace('{room}', context.roomName || 'Salon vocal');
            await (textChan as any).send({ content: formatted }).catch(() => null);
          }
        } else if (rule.action === 'LOG_AUDIT') {
          logService.emit({
            guildId: guild.id,
            module: 'VOICE',
            type: 'AUTO_' + trigger,
            actor: {
              id: context.member?.id || 'system',
              tag: context.member?.user.tag || 'System',
            },
            channel: {
              id: context.roomId || 'voice',
              name: context.roomName || 'Voice Room',
              type: 'VOICE',
            },
            reason: 'Règle d\'automatisation: ' + rule.name,
          });
        }
      } catch (err) {
        logger.error('[VoiceAuto] Erreur règle ' + rule.name + ':', err);
      }
    }
  }
}