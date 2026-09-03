export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  globalName?: string | null;
}

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  botPresent: boolean;
  memberCount: number | null;
}

export interface GuildModules {
  moderation: boolean;
  welcome: boolean;
  logging: boolean;
  autoRoles: boolean;
  tickets: boolean;
  fun: boolean;
  music: boolean;
}

export interface GuildConfig {
  guildId: string;
  botName: string;
  primaryColor: string;
  secondaryColor: string;
  successColor: string;
  errorColor: string;
  infoColor: string;
  emojis: {
    success: string;
    error: string;
    info: string;
    loading: string;
    settings: string;
    prefix: string;
    slash: string;
  };
  prefix: string;
  prefixCommandsEnabled: boolean;
  slashCommandsEnabled: boolean;
  modules: GuildModules;
  language: 'fr' | 'en';
  timezone: string;
}

export interface OverviewData {
  guild: {
    id: string;
    name: string;
    icon: string | null;
    memberCount: number;
    channelsCount: number;
    rolesCount: number;
    botPresent: boolean;
  };
  botStatus: {
    online: boolean;
    uptimeMs: number;
    pingMs: number;
  };
  stats: {
    totalCommands: number;
    commandsToday: number;
    recentActivities: Array<{
      id: string;
      guildId: string;
      guildName: string;
      userTag: string;
      commandName: string;
      type: 'slash' | 'prefix';
      timestamp: string;
    }>;
  };
  config: GuildConfig;
}

export interface ModuleItem {
  id: keyof GuildModules;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  available: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// ==========================================
// Types Modération & AutoMod
// ==========================================
export type SanctionType = 'warn' | 'timeout' | 'untimeout' | 'kick' | 'ban' | 'unban';

export interface Sanction {
  id: string;
  guildId: string;
  userId: string;
  userTag: string;
  moderatorId: string;
  moderatorTag: string;
  type: SanctionType;
  reason: string;
  timestamp: string;
  durationSeconds: number | null;
  active: boolean;
}

export interface AutoModRule {
  enabled: boolean;
  action: 'delete' | 'warn' | 'timeout' | 'kick' | 'ban' | 'log';
  timeoutDurationSeconds: number;
}

export interface AutoModConfig {
  antiSpam: AutoModRule;
  antiInvites: AutoModRule;
  antiLinks: AutoModRule;
  antiMassMentions: AutoModRule;
  antiCaps: AutoModRule;
  wordFilter: AutoModRule & { words: string[] };
}

export interface WarningEscalation {
  enabled: boolean;
  threshold: number;
  action: 'timeout' | 'kick' | 'ban';
  durationSeconds: number;
}

export interface ModerationConfig {
  modLogChannelId: string | null;
  modRoleId: string | null;
  autoMod: AutoModConfig;
  warningEscalation: WarningEscalation;
}

export interface ModerationOverview {
  counts: {
    total: number;
    warnings: number;
    timeouts: number;
    kicks: number;
    bans: number;
  };
  recentSanctions: Sanction[];
}

export interface ChannelItem {
  id: string;
  name: string;
}

export interface RoleItem {
  id: string;
  name: string;
  color: string;
}

export interface GuildMemberItem {
  id: string;
  userTag: string;
  username: string;
  nickname: string | null;
  avatar: string;
  isBot: boolean;
  isOwner: boolean;
  manageable: boolean;
  isTimedOut: boolean;
  roles: RoleItem[];
}

export interface ChannelDetailItem {
  id: string;
  name: string;
  slowmode: number;
  isLocked: boolean;
}

// ==========================================
// Types Welcome & Goodbye
// ==========================================
export interface WelcomeEmbedConfig {
  enabled: boolean;
  title: string;
  description: string;
  color: string;
  authorName: string;
  footer: string;
  showTimestamp: boolean;
  showThumbnail: boolean;
}

export interface WelcomeImageConfig {
  enabled: boolean;
  template: 'default' | 'modern' | 'minimal' | 'gaming';
  titleText: string;
  subtitleText: string;
  tagText: string;
  accentColor: string;
}

export interface WelcomeMessageConfig {
  enabled: boolean;
  channelId: string | null;
  messageContent: string;
  mentionUser: boolean;
  sendForBots: boolean;
  embed: WelcomeEmbedConfig;
  image: WelcomeImageConfig;
  autoRoleIds: string[];
}

export interface GoodbyeMessageConfig {
  enabled: boolean;
  channelId: string | null;
  messageContent: string;
  sendForBots: boolean;
  embed: WelcomeEmbedConfig;
  image: WelcomeImageConfig;
}

export interface FullWelcomeConfig {
  welcome: WelcomeMessageConfig;
  goodbye: GoodbyeMessageConfig;
}

// ==========================================
// Types Tickets
// ==========================================
export type TicketStatus = 'open' | 'claimed' | 'closed';

export interface Ticket {
  id: string;
  guildId: string;
  channelId: string;
  userId: string;
  userTag: string;
  categoryId: string;
  categoryName: string;
  status: TicketStatus;
  claimedBy: { id: string; tag: string } | null;
  answers: Record<string, string>;
  createdAt: string;
  closedAt: string | null;
  closedBy: { id: string; tag: string } | null;
  transcriptPath: string | null;
}

export interface TicketFormField {
  id: string;
  label: string;
  placeholder: string;
  style: 'short' | 'paragraph';
  required: boolean;
}

export interface TicketCategory {
  id: string;
  guildId: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  discordCategoryId: string | null;
  supportRoleIds: string[];
  formFields: TicketFormField[];
  welcomeMessage: string;
}

export interface TicketPanel {
  id: string;
  guildId: string;
  channelId: string | null;
  messageId: string | null;
  title: string;
  description: string;
  color: string;
  buttonLabel: string;
  buttonEmoji: string;
  categoryIds: string[];
}

export interface TicketGlobalConfig {
  enabled: boolean;
  maxOpenTicketsPerUser: number;
  logChannelId: string | null;
  namingFormat: string;
}

export interface TicketOverview {
  totalCount: number;
  openCount: number;
  closedCount: number;
  recentTickets: Ticket[];
  staffLeaderboard: { name: string; count: number }[];
}

export interface DiscordCategoryItem {
  id: string;
  name: string;
}

// ==========================================
// Types Logs & Audit
// ==========================================
export type LogCategory =
  | 'members'
  | 'messages'
  | 'roles'
  | 'channels'
  | 'moderation'
  | 'tickets'
  | 'voice'
  | 'server';

export type LogType =
  | 'MEMBER_JOIN'
  | 'MEMBER_LEAVE'
  | 'MEMBER_BAN'
  | 'MEMBER_UNBAN'
  | 'MEMBER_TIMEOUT'
  | 'MEMBER_UPDATE'
  | 'MESSAGE_DELETE'
  | 'MESSAGE_DELETE_BULK'
  | 'MESSAGE_EDIT'
  | 'ROLE_CREATE'
  | 'ROLE_DELETE'
  | 'ROLE_UPDATE'
  | 'CHANNEL_CREATE'
  | 'CHANNEL_DELETE'
  | 'CHANNEL_UPDATE'
  | 'MOD_SANCTION'
  | 'AUTOMOD_ALERT'
  | 'TICKET_EVENT'
  | 'VOICE_JOIN'
  | 'VOICE_LEAVE'
  | 'VOICE_SWITCH'
  | 'VOICE_MUTE'
  | 'SERVER_UPDATE';

export interface LogField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface LogEntry {
  id: string;
  guildId: string;
  category: LogCategory;
  type: LogType;
  title: string;
  description: string;
  color: string;
  fields: LogField[];
  userId?: string | null;
  userTag?: string | null;
  moderatorId?: string | null;
  moderatorTag?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  messageUrl?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface CategoryConfig {
  enabled: boolean;
  channelId: string | null;
}

export interface LogConfig {
  enabled: boolean;
  useSingleChannel: boolean;
  singleChannelId: string | null;
  retentionDays: number;
  categories: Record<LogCategory, CategoryConfig>;
}

export interface LogOverview {
  todayTotal: number;
  deletedMessagesToday: number;
  modActionsToday: number;
  membersJoinedToday: number;
  membersLeftToday: number;
  categoryCounts: Record<string, number>;
  recentEvents: LogEntry[];
}

// ==========================================
// Types Auto Roles & Role Panels
// ==========================================
export interface AutoRoleConfig {
  enabled: boolean;
  roleIds: string[];
  applyToHumans: boolean;
  applyToBots: boolean;
}

export type RoleItemStyle = 'Primary' | 'Secondary' | 'Success' | 'Danger';
export type RoleGroupMode = 'toggle' | 'single_exclusive' | 'multi_limit';

export interface RolePanelItem {
  id: string;
  roleId: string;
  label: string;
  emoji: string | null;
  description: string | null;
  style: RoleItemStyle;
  prerequisiteRoleId: string | null;
  mutuallyExclusiveRoleIds: string[];
}

export interface RolePanelGroup {
  id: string;
  name: string;
  mode: RoleGroupMode;
  minSelect: number;
  maxSelect: number;
  itemIds: string[];
}

export interface RolePanel {
  id: string;
  guildId: string;
  name: string;
  channelId: string | null;
  messageId: string | null;
  componentType: 'buttons' | 'select_menu';
  placeholder: string;
  title: string;
  description: string;
  color: string;
  thumbnail: string | null;
  image: string | null;
  footer: string;
  items: RolePanelItem[];
  groups: RolePanelGroup[];
  status: 'active' | 'draft' | 'error';
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Types Security & Anti-Raid
// ==========================================
export type AntiRaidAction = 'alert' | 'kick' | 'ban' | 'timeout' | 'lockdown';
export type AntiNukeAction = 'alert' | 'strip_roles' | 'ban';
export type AntiSpamAction = 'warn' | 'delete' | 'timeout';

export interface SecurityConfig {
  antiRaid: {
    enabled: boolean;
    maxJoins: number;
    timeWindowSeconds: number;
    action: AntiRaidAction;
    minAccountAgeDays: number;
    blockUnwhitelistedBots: boolean;
    autoLockdownDurationMinutes: number;
  };
  antiNuke: {
    enabled: boolean;
    maxBans: number;
    maxKicks: number;
    maxChannelDeletes: number;
    maxChannelCreates: number;
    maxRoleDeletes: number;
    maxRoleCreates: number;
    timeWindowSeconds: number;
    action: AntiNukeAction;
    alertOnDangerousPermissions: boolean;
    blockUnknownWebhooks: boolean;
  };
  antiSpam: {
    enabled: boolean;
    maxMessages: number;
    timeWindowSeconds: number;
    action: AntiSpamAction;
    maxMentions: number;
    blockEveryoneHere: boolean;
    antiInvite: boolean;
    allowedInviteGuildIds: string[];
  };
  whitelist: {
    trustedUserIds: string[];
    trustedRoleIds: string[];
    trustedBotIds: string[];
    exemptChannelIds: string[];
  };
  lockdown: {
    active: boolean;
    reason: string | null;
    activatedAt: string | null;
    expiresAt: string | null;
  };
}

export type IncidentType =
  | 'MASS_JOIN'
  | 'MASS_BAN'
  | 'MASS_KICK'
  | 'MASS_CHANNEL_DELETE'
  | 'MASS_CHANNEL_CREATE'
  | 'MASS_ROLE_DELETE'
  | 'MASS_ROLE_CREATE'
  | 'SUSPICIOUS_BOT'
  | 'ACCOUNT_AGE'
  | 'MASS_MENTION'
  | 'INVITE_LINK'
  | 'SPAM_FLOOD'
  | 'DANGEROUS_PERMS'
  | 'LOCKDOWN_ACTIVATED';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SecurityStatus = 'protected' | 'warning' | 'attack';

export interface SecurityIncident {
  id: string;
  guildId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  perpetratorId: string | null;
  perpetratorTag: string | null;
  affectedCount: number;
  actionTaken: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt: string | null;
}

export interface SecurityOverview {
  status: SecurityStatus;
  score: number;
  raidModeActive: boolean;
  lockdownActive: boolean;
  joinsLastMinute: number;
  messagesLastMinute: number;
  recentIncidents: SecurityIncident[];
  stats: {
    totalIncidents: number;
    resolvedIncidents: number;
    raidsPrevented: number;
    nukesPrevented: number;
  };
}

// ==========================================
// Types Leveling & XP
// ==========================================
export type LevelUpChannelType = 'same_channel' | 'specific_channel' | 'dm' | 'disabled';
export type RewardDistributionType = 'cumulative' | 'progressive';

export interface LevelingConfig {
  enabled: boolean;
  minXp: number;
  maxXp: number;
  cooldownSeconds: number;
  minMessageLength: number;
  levelUpChannelType: LevelUpChannelType;
  levelUpChannelId: string | null;
  levelUpMessage: string;
  rewardType: RewardDistributionType;
  excludedChannelIds: string[];
  excludedRoleIds: string[];
  allowBots: boolean;
}

export interface UserXpData {
  userId: string;
  guildId: string;
  username: string;
  avatarUrl: string | null;
  totalXp: number;
  level: number;
  messagesCount: number;
  lastMessageAt: string;
  unlockedRewardRoleIds: string[];
}

export interface LeaderboardEntry extends UserXpData {
  rank: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercentage: number;
}

export interface LevelReward {
  id: string;
  guildId: string;
  level: number;
  roleId: string;
  message: string | null;
  enabled: boolean;
}

export type XpBoostTargetType = 'role' | 'channel' | 'server' | 'event';

export interface XpBoost {
  id: string;
  guildId: string;
  name: string;
  multiplier: number;
  targetType: XpBoostTargetType;
  targetId: string | null;
  startTime: string | null;
  endTime: string | null;
  enabled: boolean;
}

export interface LevelingOverview {
  enabled: boolean;
  activeMembersCount: number;
  totalXpDistributed: number;
  totalLevels: number;
  topUser: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    level: number;
    totalXp: number;
  } | null;
  config: LevelingConfig;
}

// ==========================================
// Types Giveaways & Events
// ==========================================
export type GiveawayStatus = 'scheduled' | 'active' | 'paused' | 'ended' | 'cancelled';

export interface GiveawayRequirements {
  requiredRoleIds: string[];
  roleMode: 'all' | 'any';
  excludedRoleIds: string[];
  minAccountAgeDays: number;
  minLevel: number;
}

export interface GiveawayParticipant {
  userId: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: string;
  isEligible: boolean;
}

export interface GiveawayRerollEntry {
  date: string;
  previousWinnerIds: string[];
  newWinnerIds: string[];
}

export interface Giveaway {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string | null;
  prize: string;
  description: string;
  winnerCount: number;
  rewardRoleId: string | null;
  bannerUrl: string | null;
  status: GiveawayStatus;
  createdAt: string;
  scheduledAt: string | null;
  startedAt: string;
  endsAt: string;
  hostedById: string;
  hostedByTag: string;
  requirements: GiveawayRequirements;
  participants: GiveawayParticipant[];
  winnerIds: string[];
  rerollHistory: GiveawayRerollEntry[];
  requireClaim: boolean;
  claimTimeoutHours: number;
  claimedWinnerIds: string[];
}

export interface GiveawayOverview {
  activeCount: number;
  endedCount: number;
  totalParticipants: number;
  totalWinners: number;
  activeGiveaways: Giveaway[];
}

// ==========================================
// Types Analytics & Server Insights
// ==========================================
export type TimeRangePeriod = '24h' | '7d' | '30d' | '90d';

export interface AnalyticsKPI {
  label: string;
  current: number;
  previous: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'neutral';
  unit?: string;
}

export interface ServerHealthScore {
  score: number;
  status: 'excellent' | 'good' | 'average' | 'critical';
  factors: Array<{
    label: string;
    impact: number;
    isPositive: boolean;
  }>;
}

export interface AutomaticInsight {
  id: string;
  type: 'growth' | 'activity' | 'peak' | 'moderation' | 'security' | 'support';
  text: string;
  trend: 'positive' | 'warning' | 'neutral';
}

export interface TopChannelStat {
  channelId: string;
  channelName: string;
  messageCount: number;
  percentage: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  messages: number;
  activeUsers: number;
  commands: number;
  joins: number;
  leaves: number;
  voiceHours: number;
}

export interface AnalyticsOverview {
  period: TimeRangePeriod;
  healthScore: ServerHealthScore;
  kpis: {
    members: AnalyticsKPI;
    activeUsers: AnalyticsKPI;
    messages: AnalyticsKPI;
    commands: AnalyticsKPI;
    voiceHours: AnalyticsKPI;
    moderationActions: AnalyticsKPI;
    tickets: AnalyticsKPI;
    securityIncidents: AnalyticsKPI;
  };
  insights: AutomaticInsight[];
  timeSeries: TimeSeriesPoint[];
  topChannels: TopChannelStat[];
  peakHeatmap: Array<{ day: number; hour: number; value: number }>;
  moderationBreakdown: Record<string, number>;
  topCommands: Array<{ command: string; count: number; percentage: number }>;
  botHealth: {
    uptimeSeconds: number;
    pingMs: number;
    memoryMb: number;
    status: 'healthy' | 'degraded' | 'critical';
  };
}

// ==========================================
// Types Suggestions & Feedback
// ==========================================
export type SuggestionStatus =
  | 'pending'
  | 'under_review'
  | 'planned'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'duplicate'
  | 'on_hold';

export type SuggestionPriority = 'low' | 'normal' | 'high' | 'critical';

export interface SuggestionVote {
  userId: string;
  type: 'up' | 'down';
  timestamp: string;
}

export interface SuggestionComment {
  id: string;
  userId: string;
  userTag: string;
  avatarUrl: string | null;
  content: string;
  isStaff: boolean;
  timestamp: string;
}

export interface SuggestionHistoryEntry {
  timestamp: string;
  actorTag: string;
  action: string;
  details?: string;
}

export interface Suggestion {
  id: string;
  numericId: number;
  guildId: string;
  channelId: string;
  messageId: string | null;
  threadId: string | null;
  authorId: string;
  authorTag: string;
  authorAvatarUrl: string | null;
  title: string;
  description: string;
  category: string;
  tags: string[];
  status: SuggestionStatus;
  priority: SuggestionPriority;
  votes: SuggestionVote[];
  upvotesCount: number;
  downvotesCount: number;
  score: number;
  comments: SuggestionComment[];
  followerIds: string[];
  history: SuggestionHistoryEntry[];
  staffResponse: string | null;
  staffResponderTag: string | null;
  duplicateOfId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestionConfig {
  guildId: string;
  enabled: boolean;
  channelId: string | null;
  autoThread: boolean;
  categories: string[];
  cooldownMinutes: number;
  dmNotifications: boolean;
}

export interface SuggestionOverview {
  totalCount: number;
  pendingCount: number;
  underReviewCount: number;
  acceptedCount: number;
  completedCount: number;
  rejectedCount: number;
  totalVotes: number;
  totalComments: number;
  statusDistribution: Record<SuggestionStatus, number>;
  categoryDistribution: Record<string, number>;
}

// ==========================================
// Types Custom Commands & Command Builder
// ==========================================
export type ArgumentType = 'string' | 'number' | 'boolean' | 'user' | 'role' | 'channel';
export type TriggerType = 'slash' | 'prefix' | 'both';

export interface CommandArgument {
  name: string;
  description: string;
  type: ArgumentType;
  required: boolean;
}

export interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export interface CustomEmbed {
  title?: string;
  description?: string;
  color: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  footerText?: string;
  fields: EmbedField[];
}

export interface CustomButton {
  label: string;
  url?: string;
  style: 'link' | 'primary' | 'secondary' | 'success' | 'danger';
  customId?: string;
}

export interface CommandResponseBlock {
  content?: string;
  embed?: CustomEmbed;
  buttons: CustomButton[];
}

export interface CommandCondition {
  type: 'has_role' | 'lacks_role' | 'is_admin' | 'channel_equals' | 'arg_equals' | 'arg_contains';
  targetId?: string;
  argName?: string;
  value?: string;
}

export interface CommandAction {
  type: 'send_response' | 'add_role' | 'remove_role' | 'delete_trigger' | 'send_dm';
  roleId?: string;
  response?: CommandResponseBlock;
}

export interface CommandConditionBlock {
  condition: CommandCondition;
  thenActions: CommandAction[];
  elseActions?: CommandAction[];
}

export interface CustomCommand {
  id: string;
  guildId: string;
  name: string;
  description: string;
  category: string;
  triggerType: TriggerType;
  enabled: boolean;
  cooldownSeconds: number;
  requiredRoleIds: string[];
  requiredPermission?: string;
  arguments: CommandArgument[];
  conditions: CommandConditionBlock[];
  defaultActions: CommandAction[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}









