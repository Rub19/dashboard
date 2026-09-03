import { GuildMember } from 'discord.js';
import { CommandCondition } from '../types/customCommand.js';

export class CommandConditionEngine {
  public static evaluate(
    condition: CommandCondition,
    member: GuildMember | null,
    channelId?: string,
    args?: Record<string, any>
  ): boolean {
    if (!member) return false;

    try {
      switch (condition.type) {
        case 'has_role':
          if (!condition.targetId) return false;
          return member.roles.cache.has(condition.targetId);

        case 'lacks_role':
          if (!condition.targetId) return true;
          return !member.roles.cache.has(condition.targetId);

        case 'is_admin':
          return member.permissions.has('Administrator');

        case 'channel_equals':
          if (!condition.targetId || !channelId) return false;
          return channelId === condition.targetId;

        case 'arg_equals':
          if (!condition.argName) return false;
          return String(args?.[condition.argName] ?? '') === (condition.value ?? '');

        case 'arg_contains':
          if (!condition.argName) return false;
          return String(args?.[condition.argName] ?? '')
            .toLowerCase()
            .includes((condition.value ?? '').toLowerCase());

        default:
          return false;
      }
    } catch {
      return false;
    }
  }
}
