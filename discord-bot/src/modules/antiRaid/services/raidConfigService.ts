import { raidRepository } from '../storage/raidRepository.js';
import {
  AntiRaidConfig,
  JoinRaidConfig,
  MessageRaidConfig,
  MentionRaidConfig,
  BotRaidConfig,
  ServerNukeConfig,
  MassModConfig,
  AccountAgeConfig,
  RaidModeConfig,
  TrustWhitelist,
  RaidAlertConfig,
} from '../types/antiRaid.js';

class RaidConfigService {
  public getConfig(guildId: string): AntiRaidConfig {
    return raidRepository.getConfig(guildId);
  }

  public updateConfig(guildId: string, updates: Partial<AntiRaidConfig>): AntiRaidConfig {
    return raidRepository.updateConfig(guildId, updates);
  }

  public updateJoinRaidConfig(guildId: string, partial: Partial<JoinRaidConfig>): AntiRaidConfig {
    const current = this.getConfig(guildId);
    return raidRepository.updateConfig(guildId, {
      joinRaid: { ...current.joinRaid, ...partial },
    });
  }

  public updateMessageRaidConfig(guildId: string, partial: Partial<MessageRaidConfig>): AntiRaidConfig {
    const current = this.getConfig(guildId);
    return raidRepository.updateConfig(guildId, {
      messageRaid: { ...current.messageRaid, ...partial },
    });
  }

  public updateMentionRaidConfig(guildId: string, partial: Partial<MentionRaidConfig>): AntiRaidConfig {
    const current = this.getConfig(guildId);
    return raidRepository.updateConfig(guildId, {
      mentionRaid: { ...current.mentionRaid, ...partial },
    });
  }

  public updateBotRaidConfig(guildId: string, partial: Partial<BotRaidConfig>): AntiRaidConfig {
    const current = this.getConfig(guildId);
    return raidRepository.updateConfig(guildId, {
      botRaid: { ...current.botRaid, ...partial },
    });
  }

  public updateServerNukeConfig(guildId: string, partial: Partial<ServerNukeConfig>): AntiRaidConfig {
    const current = this.getConfig(guildId);
    return raidRepository.updateConfig(guildId, {
      serverNuke: { ...current.serverNuke, ...partial },
    });
  }

  public updateMassModConfig(guildId: string, partial: Partial<MassModConfig>): AntiRaidConfig {
    const current = this.getConfig(guildId);
    return raidRepository.updateConfig(guildId, {
      massMod: { ...current.massMod, ...partial },
    });
  }

  public updateAccountAgeConfig(guildId: string, partial: Partial<AccountAgeConfig>): AntiRaidConfig {
    const current = this.getConfig(guildId);
    return raidRepository.updateConfig(guildId, {
      accountAge: { ...current.accountAge, ...partial },
    });
  }

  public updateRaidModeConfig(guildId: string, partial: Partial<RaidModeConfig>): AntiRaidConfig {
    const current = this.getConfig(guildId);
    return raidRepository.updateConfig(guildId, {
      raidMode: { ...current.raidMode, ...partial },
    });
  }

  public updateWhitelist(guildId: string, partial: Partial<TrustWhitelist>): AntiRaidConfig {
    const current = this.getConfig(guildId);
    return raidRepository.updateConfig(guildId, {
      whitelist: { ...current.whitelist, ...partial },
    });
  }

  public updateAlerts(guildId: string, partial: Partial<RaidAlertConfig>): AntiRaidConfig {
    const current = this.getConfig(guildId);
    return raidRepository.updateConfig(guildId, {
      alerts: { ...current.alerts, ...partial },
    });
  }

  public isUserWhitelisted(guildId: string, userId: string): boolean {
    const config = this.getConfig(guildId);
    return config.whitelist.trustedUserIds.includes(userId);
  }

  public isRoleWhitelisted(guildId: string, roleIds: string[]): boolean {
    const config = this.getConfig(guildId);
    return roleIds.some((r) => config.whitelist.trustedRoleIds.includes(r));
  }

  public isBotWhitelisted(guildId: string, botId: string): boolean {
    const config = this.getConfig(guildId);
    return config.whitelist.trustedBotIds.includes(botId);
  }

  public isChannelExempt(guildId: string, channelId: string): boolean {
    const config = this.getConfig(guildId);
    return config.whitelist.exemptChannelIds.includes(channelId);
  }
}

export const raidConfigService = new RaidConfigService();
