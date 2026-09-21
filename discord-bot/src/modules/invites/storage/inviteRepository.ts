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
    this.purgeDemoData();
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

  /**
   * Anciennes versions du bot injectaient des invitations, récompenses et campagnes d'exemple
   * (usr_alex, usr_lucas…) dans le serveur réel. On retire ces entrées précises et on ne crée plus rien.
   */
  private purgeDemoData() {
    const before = this.referrals.length + this.rewards.length + this.campaigns.length;
    const refIds = new Set(['ref_1', 'ref_2', 'ref_3', 'ref_4']);
    const rewIds = new Set(['rew_1', 'rew_2', 'rew_3']);
    this.referrals = this.referrals.filter((r) => !(refIds.has(r.id) && String(r.inviterId).startsWith('usr_')));
    this.rewards = this.rewards.filter((r) => !rewIds.has(r.id));
    this.campaigns = this.campaigns.filter((c) => c.id !== 'camp_1');
    if (before !== this.referrals.length + this.rewards.length + this.campaigns.length) {
      logger.info("[InviteRepository] Données de démonstration retirées.");
      this.saveData();
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
