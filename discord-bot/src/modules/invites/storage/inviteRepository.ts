import fs from 'fs';
import path from 'path';
import {
  InviteSnapshot,
  Referral,
  InviteRewardRule,
  ReferralCampaign,
  InviteTrackerSettings,
  InviteLeaderboardEntry,
} from '../types/index.js';
import { logger } from '../../../utils/logger.js';

export const DEFAULT_SETTINGS: InviteTrackerSettings = {
  enabled: true,
  trackBots: false,
  trackVanity: true,
  retentionTracking: true,
  riskSensitivity: 'standard',
  suspiciousThresholds: {
    minAccountAgeHours: 24,
    burstMaxJoins: 5,
    burstWindowSeconds: 120,
  },
  rewardsEnabled: true,
  notificationChannel: 'annonces-invitations',
  notificationEvents: {
    onValidJoin: true,
    onSuspiciousJoin: true,
    onReward: true,
    onLeave: false,
  },
  notificationMessageTemplate: '🎉 Bienvenue {user} invité par {inviter} ({inviteCount} invitations valides) !',
  dataRetentionDays: 90,
};

export class InviteRepository {
  private dataDir = path.resolve(process.cwd(), 'data');
  private referralsPath = path.resolve(this.dataDir, 'referrals.json');
  private rewardsPath = path.resolve(this.dataDir, 'invite_rewards.json');
  private campaignsPath = path.resolve(this.dataDir, 'invite_campaigns.json');
  private settingsPath = path.resolve(this.dataDir, 'invite_settings.json');
  private snapshotsPath = path.resolve(this.dataDir, 'invite_snapshots.json');

  private referrals: Referral[] = [];
  private rewards: InviteRewardRule[] = [];
  private campaigns: ReferralCampaign[] = [];
  private settings = new Map<string, InviteTrackerSettings>();
  private snapshots = new Map<string, Map<string, InviteSnapshot>>(); // guildId -> (code -> snapshot)

  constructor() {
    this.ensureDir();
    this.loadData();
    this.seedDemoDataIfEmpty();
  }

  private ensureDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(this.referralsPath)) {
        this.referrals = JSON.parse(fs.readFileSync(this.referralsPath, 'utf8'));
      }
      if (fs.existsSync(this.rewardsPath)) {
        this.rewards = JSON.parse(fs.readFileSync(this.rewardsPath, 'utf8'));
      }
      if (fs.existsSync(this.campaignsPath)) {
        this.campaigns = JSON.parse(fs.readFileSync(this.campaignsPath, 'utf8'));
      }
      if (fs.existsSync(this.settingsPath)) {
        const raw = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
        Object.entries(raw).forEach(([gId, set]) => this.settings.set(gId, set as InviteTrackerSettings));
      }
      if (fs.existsSync(this.snapshotsPath)) {
        const raw = JSON.parse(fs.readFileSync(this.snapshotsPath, 'utf8'));
        Object.entries(raw).forEach(([gId, map]) => {
          const inner = new Map<string, InviteSnapshot>();
          Object.entries(map as Record<string, InviteSnapshot>).forEach(([code, snap]) => inner.set(code, snap));
          this.snapshots.set(gId, inner);
        });
      }
    } catch (e) {
      logger.error('[InviteRepository] Erreur lors du chargement des données:', e);
    }
  }

  private saveData() {
    try {
      this.ensureDir();
      fs.writeFileSync(this.referralsPath, JSON.stringify(this.referrals, null, 2), 'utf8');
      fs.writeFileSync(this.rewardsPath, JSON.stringify(this.rewards, null, 2), 'utf8');
      fs.writeFileSync(this.campaignsPath, JSON.stringify(this.campaigns, null, 2), 'utf8');

      const setObj: Record<string, any> = {};
      this.settings.forEach((v, k) => (setObj[k] = v));
      fs.writeFileSync(this.settingsPath, JSON.stringify(setObj, null, 2), 'utf8');

      const snapObj: Record<string, any> = {};
      this.snapshots.forEach((v, k) => {
        const inner: Record<string, any> = {};
        v.forEach((snap, code) => (inner[code] = snap));
        snapObj[k] = inner;
      });
      fs.writeFileSync(this.snapshotsPath, JSON.stringify(snapObj, null, 2), 'utf8');
    } catch (e) {
      logger.error('[InviteRepository] Erreur lors de la sauvegarde des données:', e);
    }
  }

  private seedDemoDataIfEmpty() {
    if (this.referrals.length === 0) {
      const demoGuild = '1128633164290596884';
      const now = Date.now();

      // Sample Referrals
      this.referrals = [
        {
          id: 'ref_1',
          guildId: demoGuild,
          inviterId: 'usr_alex',
          inviterTag: 'Alex#0001',
          invitedUserId: 'usr_lucas',
          invitedUserTag: 'Lucas#1234',
          inviteCode: 'ethone-dev',
          source: 'invite_link',
          joinedAt: new Date(now - 1000 * 60 * 30).toISOString(),
          accountCreatedAt: new Date(now - 1000 * 60 * 60 * 24 * 120).toISOString(),
          accountAgeDays: 120,
          status: 'VALID',
          suspicious: false,
          riskScore: 5,
          riskLevel: 'Safe',
          retentionStatus: { h1: true, d1: true, d3: true, d7: true, d30: false },
          rewardStatus: 'REWARDED',
          createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
        },
        {
          id: 'ref_2',
          guildId: demoGuild,
          inviterId: 'usr_alex',
          inviterTag: 'Alex#0001',
          invitedUserId: 'usr_emma',
          invitedUserTag: 'Emma#5678',
          inviteCode: 'ethone-dev',
          source: 'invite_link',
          joinedAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
          accountCreatedAt: new Date(now - 1000 * 60 * 60 * 24 * 350).toISOString(),
          accountAgeDays: 350,
          status: 'VALID',
          suspicious: false,
          riskScore: 2,
          riskLevel: 'Safe',
          retentionStatus: { h1: true, d1: true, d3: true, d7: true, d30: true },
          rewardStatus: 'PENDING',
          createdAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: 'ref_3',
          guildId: demoGuild,
          inviterId: 'usr_lucas',
          inviterTag: 'Lucas#1234',
          invitedUserId: 'usr_bot1',
          invitedUserTag: 'SuspiciousUser#9999',
          inviteCode: 'gaming-vip',
          source: 'invite_link',
          joinedAt: new Date(now - 1000 * 60 * 15).toISOString(),
          accountCreatedAt: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
          accountAgeDays: 0,
          status: 'SUSPICIOUS',
          suspicious: true,
          suspiciousReason: 'Compte créé il y a moins de 2 heures',
          riskScore: 85,
          riskLevel: 'High Risk',
          retentionStatus: { h1: false, d1: false, d3: false, d7: false, d30: false },
          rewardStatus: 'INELIGIBLE',
          createdAt: new Date(now - 1000 * 60 * 15).toISOString(),
        },
        {
          id: 'ref_4',
          guildId: demoGuild,
          inviterId: 'usr_emma',
          inviterTag: 'Emma#5678',
          invitedUserId: 'usr_leaver',
          invitedUserTag: 'DepartedMember#4321',
          inviteCode: 'welcome-hub',
          source: 'invite_link',
          joinedAt: new Date(now - 1000 * 60 * 60 * 24 * 4).toISOString(),
          accountCreatedAt: new Date(now - 1000 * 60 * 60 * 24 * 80).toISOString(),
          accountAgeDays: 80,
          status: 'LEFT',
          suspicious: false,
          riskScore: 12,
          riskLevel: 'Safe',
          leftAt: new Date(now - 1000 * 60 * 60 * 24 * 1).toISOString(),
          retentionStatus: { h1: true, d1: true, d3: false, d7: false, d30: false },
          rewardStatus: 'REVOKED',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 4).toISOString(),
        },
      ];

      // Sample Rewards
      this.rewards = [
        {
          id: 'rew_1',
          guildId: demoGuild,
          name: 'Rôle Bronze Initié',
          requiredValidInvites: 5,
          roleId: 'role_bronze',
          roleName: 'Bronze Supporter',
          xpAmount: 150,
          rewardBadge: '🥉 Bronze',
          message: 'Félicitations pour tes 5 invitations valides !',
          enabled: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'rew_2',
          guildId: demoGuild,
          name: 'Rôle Silver Recruteur',
          requiredValidInvites: 15,
          roleId: 'role_silver',
          roleName: 'Silver Recruteur',
          xpAmount: 500,
          rewardBadge: '🥈 Silver',
          message: 'Tu as dépassé 15 membres actifs invités !',
          enabled: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'rew_3',
          guildId: demoGuild,
          name: 'Rôle VIP Ambassadeur',
          requiredValidInvites: 30,
          roleId: 'role_vip',
          roleName: 'Ambassadeur VIP',
          xpAmount: 1500,
          rewardBadge: '👑 Ambassadeur',
          message: 'Accès au salon VIP débloqué !',
          enabled: true,
          createdAt: new Date().toISOString(),
        },
      ];

      // Sample Campaign
      this.campaigns = [
        {
          id: 'camp_1',
          guildId: demoGuild,
          name: 'Campagne de Croissance Printemps 2026',
          description: 'Aidez notre communauté à atteindre 2,000 membres et débloquez le grade VIP spécial.',
          startDate: new Date(now - 1000 * 60 * 60 * 24 * 10).toISOString(),
          endDate: new Date(now + 1000 * 60 * 60 * 24 * 20).toISOString(),
          inviteTarget: 500,
          currentInvites: 184,
          rewards: ['Rôle Saisonnier @Ambassadeur', '1,000 XP'],
          minimumRetentionDays: 3,
          minimumAccountAgeDays: 3,
          status: 'ACTIVE',
        },
      ];

      this.settings.set(demoGuild, DEFAULT_SETTINGS);
      this.saveData();
    }
  }

  // --- Snapshots ---
  getSnapshots(guildId: string): Map<string, InviteSnapshot> {
    if (!this.snapshots.has(guildId)) {
      this.snapshots.set(guildId, new Map());
    }
    return this.snapshots.get(guildId)!;
  }

  setSnapshots(guildId: string, map: Map<string, InviteSnapshot>) {
    this.snapshots.set(guildId, map);
    this.saveData();
  }

  // --- Referrals ---
  getAllReferrals(guildId: string): Referral[] {
    return this.referrals.filter((r) => r.guildId === guildId);
  }

  getReferralById(id: string): Referral | undefined {
    return this.referrals.find((r) => r.id === id);
  }

  getReferralsByUser(guildId: string, userId: string): Referral[] {
    return this.referrals.filter((r) => r.guildId === guildId && r.inviterId === userId);
  }

  getReferralByInvitedUser(guildId: string, invitedUserId: string): Referral | undefined {
    return this.referrals.find((r) => r.guildId === guildId && r.invitedUserId === invitedUserId);
  }

  saveReferral(referral: Referral): Referral {
    const idx = this.referrals.findIndex((r) => r.id === referral.id);
    if (idx >= 0) {
      this.referrals[idx] = referral;
    } else {
      this.referrals.unshift(referral);
    }
    this.saveData();
    return referral;
  }

  updateReferralStatus(
    id: string,
    status: Referral['status'],
    leftAt?: string,
    retentionStatus?: Referral['retentionStatus']
  ): Referral | null {
    const ref = this.getReferralById(id);
    if (!ref) return null;
    ref.status = status;
    if (leftAt) ref.leftAt = leftAt;
    if (retentionStatus) ref.retentionStatus = { ...ref.retentionStatus, ...retentionStatus };
    this.saveReferral(ref);
    return ref;
  }

  getStats(guildId: string) {
    const referrals = this.getAllReferrals(guildId);
    const totalInvites = referrals.length;
    const validInvites = referrals.filter((r) => r.status === 'VALID' || r.status === 'REWARDED').length;
    const fakeJoins = referrals.filter((r) => r.status === 'SUSPICIOUS').length;
    const leftMembers = referrals.filter((r) => r.status === 'LEFT').length;
    const retainedMembers = Math.max(0, validInvites - leftMembers);
    const retentionRate = validInvites > 0 ? Math.round((retainedMembers / validInvites) * 100) : 0;
    const leaderboard = this.getLeaderboard(guildId, 'all');
    const topInviter = leaderboard.length > 0 ? leaderboard[0] : null;
    const campaigns = this.getCampaigns(guildId);
    const activeCampaignsCount = campaigns.filter((c) => c.status === 'ACTIVE').length;

    return {
      totalInvited: totalInvites,
      validInvites,
      fakeJoins,
      leftMembers,
      retainedMembers,
      retentionRate,
      topInviter,
      activeCampaignsCount,
    };
  }

  // --- Leaderboard ---
  getLeaderboard(guildId: string, period: string = 'all'): InviteLeaderboardEntry[] {
    const refs = this.getAllReferrals(guildId);
    const now = Date.now();

    // Filter by period
    const filteredRefs = refs.filter((r) => {
      if (period === 'today') return now - new Date(r.joinedAt).getTime() <= 1000 * 60 * 60 * 24;
      if (period === '7d') return now - new Date(r.joinedAt).getTime() <= 1000 * 60 * 60 * 24 * 7;
      if (period === '30d') return now - new Date(r.joinedAt).getTime() <= 1000 * 60 * 60 * 24 * 30;
      if (period === '90d') return now - new Date(r.joinedAt).getTime() <= 1000 * 60 * 60 * 24 * 90;
      return true;
    });

    const userMap = new Map<string, InviteLeaderboardEntry>();

    for (const ref of filteredRefs) {
      if (!userMap.has(ref.inviterId)) {
        userMap.set(ref.inviterId, {
          rank: 0,
          userId: ref.inviterId,
          userTag: ref.inviterTag || 'Utilisateur',
          totalInvites: 0,
          validInvites: 0,
          leftMembers: 0,
          suspiciousInvites: 0,
          retentionRate: 100,
          rewardsEarned: 0,
          lastInviteAt: ref.joinedAt,
        });
      }

      const entry = userMap.get(ref.inviterId)!;
      entry.totalInvites++;
      if (ref.status === 'VALID' || ref.status === 'REWARDED') entry.validInvites++;
      if (ref.status === 'SUSPICIOUS') entry.suspiciousInvites++;
      if (ref.status === 'LEFT') entry.leftMembers++;

      if (new Date(ref.joinedAt).getTime() > new Date(entry.lastInviteAt || 0).getTime()) {
        entry.lastInviteAt = ref.joinedAt;
      }
    }

    // Compute retention rate & rewards
    const result = Array.from(userMap.values()).map((entry) => {
      const retained = entry.validInvites - entry.leftMembers;
      const rate = entry.validInvites > 0 ? Math.max(0, Math.round((retained / entry.validInvites) * 100)) : 0;
      return {
        ...entry,
        retentionRate: rate,
      };
    });

    // Sort by valid invites descending, then total invites
    result.sort((a, b) => b.validInvites - a.validInvites || b.totalInvites - a.totalInvites);

    // Assign rank
    result.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return result;
  }

  // --- Rewards ---
  getRewards(guildId: string): InviteRewardRule[] {
    return this.rewards.filter((r) => r.guildId === guildId);
  }

  saveReward(reward: InviteRewardRule): InviteRewardRule {
    const idx = this.rewards.findIndex((r) => r.id === reward.id);
    if (idx >= 0) {
      this.rewards[idx] = reward;
    } else {
      this.rewards.push(reward);
    }
    this.saveData();
    return reward;
  }

  deleteReward(guildId: string, rewardId: string): boolean {
    const prev = this.rewards.length;
    this.rewards = this.rewards.filter((r) => !(r.guildId === guildId && r.id === rewardId));
    this.saveData();
    return this.rewards.length < prev;
  }

  // --- Campaigns ---
  getCampaigns(guildId: string): ReferralCampaign[] {
    return this.campaigns.filter((c) => c.guildId === guildId);
  }

  saveCampaign(campaign: ReferralCampaign): ReferralCampaign {
    const idx = this.campaigns.findIndex((c) => c.id === campaign.id);
    if (idx >= 0) {
      this.campaigns[idx] = campaign;
    } else {
      this.campaigns.push(campaign);
    }
    this.saveData();
    return campaign;
  }

  // --- Settings ---
  getSettings(guildId: string): InviteTrackerSettings {
    if (!this.settings.has(guildId)) {
      this.settings.set(guildId, { ...DEFAULT_SETTINGS });
      this.saveData();
    }
    return this.settings.get(guildId)!;
  }

  updateSettings(guildId: string, newSettings: Partial<InviteTrackerSettings>): InviteTrackerSettings {
    const current = this.getSettings(guildId);
    const updated = { ...current, ...newSettings };
    this.settings.set(guildId, updated);
    this.saveData();
    return updated;
  }
}

export const inviteRepository = new InviteRepository();
