export interface InviteSnapshot {
  code: string;
  guildId: string;
  inviterId?: string;
  inviterTag?: string;
  uses: number;
  maxUses: number;
  expiresAt?: string | null;
  createdAt?: string;
  temporary: boolean;
  vanity: boolean;
  url?: string;
  lastSyncedAt: string;
}

export type ReferralStatus =
  | 'PENDING'
  | 'VALID'
  | 'SUSPICIOUS'
  | 'LEFT'
  | 'REWARDED'
  | 'INVALID';

export type RiskLevel = 'Safe' | 'Low Risk' | 'Suspicious' | 'High Risk' | 'Critical';

export interface RetentionStatus {
  h1: boolean;
  d1: boolean;
  d3: boolean;
  d7: boolean;
  d30: boolean;
}

export interface Referral {
  id: string;
  guildId: string;
  inviterId: string;
  inviterTag: string;
  invitedUserId: string;
  invitedUserTag: string;
  invitedUserAvatar?: string;
  inviteId?: string;
  inviteCode: string;
  source: 'invite_link' | 'vanity' | 'unknown';
  joinedAt: string;
  accountCreatedAt: string;
  accountAgeDays: number;
  status: ReferralStatus;
  suspicious: boolean;
  suspiciousReason?: string;
  riskScore: number;
  riskLevel: RiskLevel;
  leftAt?: string | null;
  retainedAt?: string | null;
  retentionStatus: RetentionStatus;
  rewardStatus: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface InviteLeaderboardEntry {
  rank: number;
  userId: string;
  userTag: string;
  userAvatar?: string;
  totalInvites: number;
  validInvites: number;
  leftMembers: number;
  suspiciousInvites: number;
  retentionRate: number; // 0 - 100 %
  rewardsEarned: number;
  lastInviteAt?: string | null;
}

export interface InviteRewardRule {
  id: string;
  guildId: string;
  name: string;
  requiredValidInvites: number;
  roleId?: string;
  roleName?: string;
  xpAmount?: number;
  rewardBadge?: string;
  message?: string;
  enabled: boolean;
  createdAt: string;
}

export interface ReferralCampaign {
  id: string;
  guildId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  inviteTarget: number;
  currentInvites: number;
  eligibleChannels?: string[];
  eligibleRoles?: string[];
  rewards: string[];
  minimumRetentionDays: number;
  minimumAccountAgeDays: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
}

export interface InviteTrackerSettings {
  enabled: boolean;
  trackBots: boolean;
  trackVanity: boolean;
  retentionTracking: boolean;
  riskSensitivity: 'low' | 'standard' | 'high';
  suspiciousThresholds: {
    minAccountAgeHours: number;
    burstMaxJoins: number;
    burstWindowSeconds: number;
  };
  rewardsEnabled: boolean;
  notificationChannel?: string;
  notificationEvents: {
    onValidJoin: boolean;
    onSuspiciousJoin: boolean;
    onReward: boolean;
    onLeave: boolean;
  };
  notificationMessageTemplate: string;
  dataRetentionDays: number;
}
