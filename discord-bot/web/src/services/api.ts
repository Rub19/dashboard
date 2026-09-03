import {
  AnalyticsOverview,
  AutoRoleConfig,
  ChannelDetailItem,
  ChannelItem,
  DiscordCategoryItem,
  DiscordUser,
  FullWelcomeConfig,
  Giveaway,
  GiveawayOverview,
  GiveawayParticipant,
  Guild,
  GuildConfig,
  GuildMemberItem,
  LeaderboardEntry,
  LevelingConfig,
  LevelingOverview,
  LevelReward,
  LogConfig,
  LogEntry,
  LogOverview,
  ModerationConfig,
  ModerationOverview,
  ModuleItem,
  OverviewData,
  RoleItem,
  RolePanel,
  Sanction,
  SanctionType,
  SecurityConfig,
  SecurityIncident,
  SecurityOverview,
  Suggestion,
  SuggestionConfig,
  SuggestionOverview,
  SuggestionPriority,
  SuggestionStatus,
  Ticket,
  TicketCategory,
  TicketGlobalConfig,
  TicketOverview,
  TicketPanel,
  TimeRangePeriod,
  XpBoost,
  CustomCommand,
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let errorMsg = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) errorMsg = body.error;
    } catch {
      // Ignorer
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Authentification
  getMe: () => request<{ user: DiscordUser }>('/auth/me'),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  // Serveurs
  getGuilds: () => request<{ guilds: Guild[] }>('/guilds'),
  getOverview: (guildId: string) => request<OverviewData>(`/guilds/${guildId}/overview`),

  // Paramètres
  getSettings: (guildId: string) => request<{ config: GuildConfig }>(`/guilds/${guildId}/settings`),
  updateSettings: (guildId: string, data: Partial<GuildConfig>) =>
    request<{ success: boolean; config: GuildConfig }>(`/guilds/${guildId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Modules
  getModules: (guildId: string) => request<{ modules: ModuleItem[] }>(`/guilds/${guildId}/modules`),
  updateModule: (guildId: string, moduleId: string, enabled: boolean) =>
    request<{ success: boolean; module: ModuleItem }>(`/guilds/${guildId}/modules/${moduleId}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),

  // Modération & AutoMod
  getModerationOverview: (guildId: string) =>
    request<ModerationOverview>(`/guilds/${guildId}/moderation/overview`),
  getSanctions: (guildId: string, params?: { userId?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.userId) query.set('userId', params.userId);
    if (params?.type) query.set('type', params.type);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ sanctions: Sanction[] }>(`/guilds/${guildId}/moderation/sanctions${qs}`);
  },
  createSanction: (
    guildId: string,
    payload: { userId: string; type: SanctionType; reason: string; durationSeconds?: number }
  ) =>
    request<{ success: boolean; sanction: Sanction }>(`/guilds/${guildId}/moderation/sanctions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  revokeSanction: (guildId: string, sanctionId: string) =>
    request<{ success: boolean }>(`/guilds/${guildId}/moderation/sanctions/${sanctionId}`, {
      method: 'DELETE',
    }),
  getModerationConfig: (guildId: string) =>
    request<{ config: ModerationConfig }>(`/guilds/${guildId}/moderation/config`),
  updateModerationConfig: (guildId: string, data: Partial<ModerationConfig>) =>
    request<{ success: boolean; config: ModerationConfig }>(`/guilds/${guildId}/moderation/config`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getChannels: (guildId: string) =>
    request<{ channels: ChannelItem[] }>(`/guilds/${guildId}/moderation/channels`),
  getRoles: (guildId: string) =>
    request<{ roles: RoleItem[] }>(`/guilds/${guildId}/moderation/roles`),

  // Gestion des Membres
  getMembers: (guildId: string) =>
    request<{ members: GuildMemberItem[] }>(`/guilds/${guildId}/moderation/members`),
  updateMemberNickname: (guildId: string, memberId: string, nickname: string | null) =>
    request<{ success: boolean; nickname: string | null }>(
      `/guilds/${guildId}/moderation/members/${memberId}/nickname`,
      { method: 'POST', body: JSON.stringify({ nickname }) }
    ),

  // Gestion des Salons
  getChannelsDetail: (guildId: string) =>
    request<{ channels: ChannelDetailItem[] }>(`/guilds/${guildId}/moderation/channels-detail`),
  updateChannelSlowmode: (guildId: string, channelId: string, seconds: number) =>
    request<{ success: boolean; slowmode: number }>(
      `/guilds/${guildId}/moderation/channels/${channelId}/slowmode`,
      { method: 'POST', body: JSON.stringify({ seconds }) }
    ),
  updateChannelLock: (guildId: string, channelId: string, locked: boolean, reason?: string) =>
    request<{ success: boolean; isLocked: boolean }>(
      `/guilds/${guildId}/moderation/channels/${channelId}/lock`,
      { method: 'POST', body: JSON.stringify({ locked, reason }) }
    ),
  clearChannelMessages: (guildId: string, channelId: string, amount: number) =>
    request<{ success: boolean; deletedCount: number }>(
      `/guilds/${guildId}/moderation/channels/${channelId}/clear`,
      { method: 'POST', body: JSON.stringify({ amount }) }
    ),

  // Welcome & Goodbye
  getWelcomeConfig: (guildId: string) =>
    request<{ config: FullWelcomeConfig }>(`/guilds/${guildId}/welcome`),
  updateWelcomeConfig: (guildId: string, data: Partial<FullWelcomeConfig>) =>
    request<{ success: boolean; config: FullWelcomeConfig }>(`/guilds/${guildId}/welcome`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  testWelcomeMessage: (guildId: string, type: 'welcome' | 'goodbye') =>
    request<{ success: boolean; channelName: string }>(`/guilds/${guildId}/welcome/test`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),

  // Tickets
  getTicketOverview: (guildId: string) =>
    request<TicketOverview>(`/guilds/${guildId}/tickets/overview`),
  getTickets: (guildId: string) =>
    request<{ tickets: Ticket[] }>(`/guilds/${guildId}/tickets/list`),
  getTicketCategories: (guildId: string) =>
    request<{ categories: TicketCategory[] }>(`/guilds/${guildId}/tickets/categories`),
  saveTicketCategory: (guildId: string, category: Partial<TicketCategory>) =>
    request<{ success: boolean; category: TicketCategory }>(`/guilds/${guildId}/tickets/categories`, {
      method: 'POST',
      body: JSON.stringify(category),
    }),
  deleteTicketCategory: (guildId: string, catId: string) =>
    request<{ success: boolean }>(`/guilds/${guildId}/tickets/categories/${catId}`, {
      method: 'DELETE',
    }),
  getTicketPanels: (guildId: string) =>
    request<{ panels: TicketPanel[] }>(`/guilds/${guildId}/tickets/panels`),
  saveTicketPanel: (guildId: string, panel: Partial<TicketPanel>) =>
    request<{ success: boolean; panel: TicketPanel }>(`/guilds/${guildId}/tickets/panels`, {
      method: 'POST',
      body: JSON.stringify(panel),
    }),
  publishTicketPanel: (guildId: string, panelId: string, channelId: string) =>
    request<{ success: boolean; messageId: string; channelName: string }>(
      `/guilds/${guildId}/tickets/panels/${panelId}/publish`,
      {
        method: 'POST',
        body: JSON.stringify({ channelId }),
      }
    ),
  getTicketConfig: (guildId: string) =>
    request<{ config: TicketGlobalConfig }>(`/guilds/${guildId}/tickets/config`),
  updateTicketConfig: (guildId: string, data: Partial<TicketGlobalConfig>) =>
    request<{ success: boolean; config: TicketGlobalConfig }>(`/guilds/${guildId}/tickets/config`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getDiscordCategories: (guildId: string) =>
    request<{ categories: DiscordCategoryItem[] }>(`/guilds/${guildId}/tickets/discord-categories`),

  // Logs & Audit
  getLogOverview: (guildId: string) =>
    request<LogOverview>(`/guilds/${guildId}/logs/overview`),
  getLogEvents: (
    guildId: string,
    params: {
      category?: string;
      type?: string;
      search?: string;
      period?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) => {
    const q = new URLSearchParams();
    if (params.category) q.set('category', params.category);
    if (params.type) q.set('type', params.type);
    if (params.search) q.set('search', params.search);
    if (params.period) q.set('period', params.period);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset) q.set('offset', String(params.offset));
    return request<{ total: number; entries: LogEntry[] }>(`/guilds/${guildId}/logs/events?${q.toString()}`);
  },
  getLogConfig: (guildId: string) =>
    request<{ config: LogConfig }>(`/guilds/${guildId}/logs/config`),
  updateLogConfig: (guildId: string, data: Partial<LogConfig>) =>
    request<{ success: boolean; config: LogConfig }>(`/guilds/${guildId}/logs/config`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Auto Roles & Role Panels
  getAutoRoleConfig: (guildId: string) =>
    request<{ config: AutoRoleConfig }>(`/guilds/${guildId}/roles/autorole`),
  updateAutoRoleConfig: (guildId: string, data: Partial<AutoRoleConfig>) =>
    request<{ success: boolean; config: AutoRoleConfig }>(`/guilds/${guildId}/roles/autorole`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getRolePanels: (guildId: string) =>
    request<{ panels: RolePanel[] }>(`/guilds/${guildId}/roles/panels`),
  saveRolePanel: (guildId: string, panel: Partial<RolePanel>) =>
    request<{ success: boolean; panel: RolePanel }>(`/guilds/${guildId}/roles/panels`, {
      method: 'POST',
      body: JSON.stringify(panel),
    }),
  publishRolePanel: (guildId: string, panelId: string, channelId: string) =>
    request<{ success: boolean; messageId: string; channelName: string }>(
      `/guilds/${guildId}/roles/panels/${panelId}/publish`,
      {
        method: 'POST',
        body: JSON.stringify({ channelId }),
      }
    ),
  syncRolePanel: (guildId: string, panelId: string) =>
    request<{ valid: boolean; errors: string[]; warnings: string[] }>(
      `/guilds/${guildId}/roles/panels/${panelId}/sync`,
      { method: 'POST' }
    ),
  duplicateRolePanel: (guildId: string, panelId: string) =>
    request<{ success: boolean; panel: RolePanel }>(
      `/guilds/${guildId}/roles/panels/${panelId}/duplicate`,
      { method: 'POST' }
    ),
  deleteRolePanel: (guildId: string, panelId: string, deleteMessage: boolean = false) =>
    request<{ success: boolean }>(
      `/guilds/${guildId}/roles/panels/${panelId}?deleteMessage=${deleteMessage}`,
      { method: 'DELETE' }
    ),

  // Security & Anti-Raid
  getSecurityOverview: (guildId: string) =>
    request<SecurityOverview>(`/guilds/${guildId}/security/overview`),
  getSecurityConfig: (guildId: string) =>
    request<{ config: SecurityConfig }>(`/guilds/${guildId}/security/config`),
  updateSecurityConfig: (guildId: string, data: Partial<SecurityConfig>) =>
    request<{ success: boolean; config: SecurityConfig }>(`/guilds/${guildId}/security/config`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  triggerLockdown: (guildId: string, durationMinutes: number = 15, reason?: string) =>
    request<{ success: boolean; lockedCount: number }>(`/guilds/${guildId}/security/lockdown`, {
      method: 'POST',
      body: JSON.stringify({ durationMinutes, reason }),
    }),
  releaseLockdown: (guildId: string) =>
    request<{ success: boolean; unlockedCount: number }>(
      `/guilds/${guildId}/security/release-lockdown`,
      { method: 'POST' }
    ),
  getSecurityIncidents: (guildId: string) =>
    request<{ incidents: SecurityIncident[] }>(`/guilds/${guildId}/security/incidents`),
  resolveSecurityIncident: (guildId: string, incidentId: string) =>
    request<{ success: boolean }>(`/guilds/${guildId}/security/incidents/${incidentId}/resolve`, {
      method: 'POST',
    }),

  // Leveling & XP
  getLevelingOverview: (guildId: string) =>
    request<LevelingOverview>(`/guilds/${guildId}/leveling/overview`),
  getLeaderboard: (guildId: string, search?: string, limit = 100) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    q.set('limit', String(limit));
    return request<{ leaderboard: LeaderboardEntry[] }>(
      `/guilds/${guildId}/leveling/leaderboard?${q.toString()}`
    );
  },
  getUserProfile: (guildId: string, userId: string) =>
    request<{ user: LeaderboardEntry }>(`/guilds/${guildId}/leveling/users/${userId}`),
  getLevelingConfig: (guildId: string) =>
    request<{ config: LevelingConfig }>(`/guilds/${guildId}/leveling/config`),
  updateLevelingConfig: (guildId: string, data: Partial<LevelingConfig>) =>
    request<{ success: boolean; config: LevelingConfig }>(`/guilds/${guildId}/leveling/config`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getLevelRewards: (guildId: string) =>
    request<{ rewards: LevelReward[] }>(`/guilds/${guildId}/leveling/rewards`),
  saveLevelReward: (guildId: string, data: Partial<LevelReward>) =>
    request<{ success: boolean; reward: LevelReward }>(`/guilds/${guildId}/leveling/rewards`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteLevelReward: (guildId: string, rewardId: string) =>
    request<{ success: boolean }>(`/guilds/${guildId}/leveling/rewards/${rewardId}`, {
      method: 'DELETE',
    }),
  getXpBoosts: (guildId: string) =>
    request<{ boosts: XpBoost[] }>(`/guilds/${guildId}/leveling/boosts`),
  saveXpBoost: (guildId: string, data: Partial<XpBoost>) =>
    request<{ success: boolean; boost: XpBoost }>(`/guilds/${guildId}/leveling/boosts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteXpBoost: (guildId: string, boostId: string) =>
    request<{ success: boolean }>(`/guilds/${guildId}/leveling/boosts/${boostId}`, {
      method: 'DELETE',
    }),
  resetXp: (guildId: string, targetUserId?: string) =>
    request<{ success: boolean; message: string }>(`/guilds/${guildId}/leveling/reset`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    }),

  // Giveaways & Events
  getGiveawaysOverview: (guildId: string) =>
    request<GiveawayOverview>(`/guilds/${guildId}/giveaways/overview`),
  getGiveawaysList: (guildId: string) =>
    request<{ giveaways: Giveaway[] }>(`/guilds/${guildId}/giveaways/list`),
  createGiveaway: (guildId: string, data: any) =>
    request<{ success: boolean; giveaway: Giveaway }>(`/guilds/${guildId}/giveaways/create`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  endGiveaway: (guildId: string, giveawayId: string) =>
    request<{ success: boolean; winners: string[] }>(`/guilds/${guildId}/giveaways/${giveawayId}/end`, {
      method: 'POST',
    }),
  rerollGiveaway: (guildId: string, giveawayId: string, count = 1) =>
    request<{ success: boolean; winners: string[] }>(`/guilds/${guildId}/giveaways/${giveawayId}/reroll`, {
      method: 'POST',
      body: JSON.stringify({ count }),
    }),
  cancelGiveaway: (guildId: string, giveawayId: string) =>
    request<{ success: boolean }>(`/guilds/${guildId}/giveaways/${giveawayId}/cancel`, {
      method: 'POST',
    }),
  extendGiveaway: (guildId: string, giveawayId: string, minutes: number = 1440) =>
    request<{ success: boolean }>(`/guilds/${guildId}/giveaways/${giveawayId}/extend`, {
      method: 'POST',
      body: JSON.stringify({ minutes }),
    }),
  getGiveawayParticipants: (guildId: string, giveawayId: string) =>
    request<{ participants: GiveawayParticipant[] }>(`/guilds/${guildId}/giveaways/${giveawayId}/participants`),
  removeGiveawayParticipant: (guildId: string, giveawayId: string, userId: string) =>
    request<{ success: boolean }>(`/guilds/${guildId}/giveaways/${giveawayId}/participants/${userId}`, {
      method: 'DELETE',
    }),

  // Analytics & Server Insights
  getAnalyticsOverview: (guildId: string, period: TimeRangePeriod = '7d') =>
    request<AnalyticsOverview>(`/guilds/${guildId}/analytics/overview?period=${period}`),
  exportAnalytics: (guildId: string, period: TimeRangePeriod = '7d', format: 'json' | 'csv' = 'json') =>
    `/api/guilds/${guildId}/analytics/export?period=${period}&format=${format}`,

  // Suggestions & Feedback
  getSuggestionsOverview: (guildId: string) =>
    request<SuggestionOverview>(`/guilds/${guildId}/suggestions/overview`),
  getSuggestionsList: (guildId: string) =>
    request<{ suggestions: Suggestion[] }>(`/guilds/${guildId}/suggestions/list`),
  getSuggestionDetail: (guildId: string, id: string) =>
    request<{ suggestion: Suggestion }>(`/guilds/${guildId}/suggestions/${id}`),
  createSuggestion: (guildId: string, data: any) =>
    request<{ success: boolean; suggestion: Suggestion }>(`/guilds/${guildId}/suggestions/create`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSuggestionStatus: (guildId: string, id: string, status: SuggestionStatus, staffResponse?: string) =>
    request<{ success: boolean; suggestion: Suggestion }>(`/guilds/${guildId}/suggestions/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, staffResponse }),
    }),
  addSuggestionComment: (guildId: string, id: string, content: string) =>
    request<{ success: boolean; suggestion: Suggestion }>(`/guilds/${guildId}/suggestions/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  updateSuggestionPriority: (guildId: string, id: string, priority: SuggestionPriority) =>
    request<{ success: boolean; suggestion: Suggestion }>(`/guilds/${guildId}/suggestions/${id}/priority`, {
      method: 'POST',
      body: JSON.stringify({ priority }),
    }),
  markSuggestionDuplicate: (guildId: string, id: string, originalId: string | number) =>
    request<{ success: boolean }>(`/guilds/${guildId}/suggestions/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ originalId }),
    }),
  deleteSuggestion: (guildId: string, id: string) =>
    request<{ success: boolean }>(`/guilds/${guildId}/suggestions/${id}`, {
      method: 'DELETE',
    }),
  getSuggestionConfig: (guildId: string) =>
    request<SuggestionConfig>(`/guilds/${guildId}/suggestions/config/settings`),
  saveSuggestionConfig: (guildId: string, data: Partial<SuggestionConfig>) =>
    request<{ success: boolean; config: SuggestionConfig }>(`/guilds/${guildId}/suggestions/config/settings`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Custom Commands & Command Builder
  getCustomCommands: (guildId: string) =>
    request<{ commands: CustomCommand[] }>(`/guilds/${guildId}/custom-commands/list`),
  getCustomCommandTemplates: (guildId: string) =>
    request<{ templates: Partial<CustomCommand>[] }>(`/guilds/${guildId}/custom-commands/templates`),
  getCustomCommand: (guildId: string, id: string) =>
    request<{ command: CustomCommand }>(`/guilds/${guildId}/custom-commands/${id}`),
  createCustomCommand: (guildId: string, data: Partial<CustomCommand>) =>
    request<{ success: boolean; command: CustomCommand }>(`/guilds/${guildId}/custom-commands/create`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createFromTemplate: (guildId: string, templateName: string) =>
    request<{ success: boolean; command: CustomCommand }>(`/guilds/${guildId}/custom-commands/from-template`, {
      method: 'POST',
      body: JSON.stringify({ templateName }),
    }),
  updateCustomCommand: (guildId: string, id: string, data: Partial<CustomCommand>) =>
    request<{ success: boolean; command: CustomCommand }>(`/guilds/${guildId}/custom-commands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  duplicateCustomCommand: (guildId: string, id: string) =>
    request<{ success: boolean; command: CustomCommand }>(`/guilds/${guildId}/custom-commands/${id}/duplicate`, {
      method: 'POST',
    }),
  toggleCustomCommand: (guildId: string, id: string) =>
    request<{ success: boolean; command: CustomCommand }>(`/guilds/${guildId}/custom-commands/${id}/toggle`, {
      method: 'POST',
    }),
  deleteCustomCommand: (guildId: string, id: string) =>
    request<{ success: boolean }>(`/guilds/${guildId}/custom-commands/${id}`, {
      method: 'DELETE',
    }),
  testCustomCommand: (guildId: string, id: string, args?: Record<string, any>) =>
    request<{ success: boolean; previews: any[] }>(`/guilds/${guildId}/custom-commands/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ args }),
    }),
};
