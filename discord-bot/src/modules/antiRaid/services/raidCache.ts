import { InvolvedMemberInfo } from '../types/antiRaid.js';

interface CachedJoin {
  timestamp: number;
  member: InvolvedMemberInfo;
}

interface CachedMessage {
  timestamp: number;
  userId: string;
  contentHash: string;
  mentionsCount: number;
  hasEveryoneOrHere: boolean;
}

interface CachedAuditAction {
  timestamp: number;
  userId?: string;
  targetId?: string;
  type: 'BAN' | 'KICK' | 'CHANNEL_CREATE' | 'CHANNEL_DELETE' | 'ROLE_CREATE' | 'ROLE_DELETE' | 'WEBHOOK_CREATE';
}

class RaidCache {
  // GuildId -> CachedJoins[]
  private joins = new Map<string, CachedJoin[]>();
  // GuildId -> CachedMessage[]
  private messages = new Map<string, CachedMessage[]>();
  // GuildId -> leaves timestamps[]
  private leaves = new Map<string, number[]>();
  // GuildId -> CachedAuditAction[]
  private auditActions = new Map<string, CachedAuditAction[]>();
  // GuildId -> Baseline stats (hourly rolling count)
  private joinBaselines = new Map<string, number[]>();

  // Cleanup interval
  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(() => this.pruneExpired(), 30000);
    this.cleanupTimer.unref(); // Avoid keeping node process awake
  }

  // --- RECORD EVENTS ---

  public recordJoin(guildId: string, memberInfo: InvolvedMemberInfo): void {
    const now = Date.now();
    const list = this.joins.get(guildId) || [];
    list.push({ timestamp: now, member: memberInfo });
    this.joins.set(guildId, list);

    // Baseline tracking
    const base = this.joinBaselines.get(guildId) || [];
    base.push(now);
    this.joinBaselines.set(guildId, base);
  }

  public recordLeave(guildId: string): void {
    const now = Date.now();
    const list = this.leaves.get(guildId) || [];
    list.push(now);
    this.leaves.set(guildId, list);
  }

  public recordMessage(
    guildId: string,
    userId: string,
    contentHash: string,
    mentionsCount: number,
    hasEveryoneOrHere: boolean
  ): void {
    const now = Date.now();
    const list = this.messages.get(guildId) || [];
    list.push({
      timestamp: now,
      userId,
      contentHash,
      mentionsCount,
      hasEveryoneOrHere,
    });
    this.messages.set(guildId, list);
  }

  public recordAuditAction(
    guildId: string,
    type: 'BAN' | 'KICK' | 'CHANNEL_CREATE' | 'CHANNEL_DELETE' | 'ROLE_CREATE' | 'ROLE_DELETE' | 'WEBHOOK_CREATE',
    userId?: string,
    targetId?: string
  ): void {
    const now = Date.now();
    const list = this.auditActions.get(guildId) || [];
    list.push({ timestamp: now, type, userId, targetId });
    this.auditActions.set(guildId, list);
  }

  // --- QUERY WINDOWS ---

  public getJoinsInWindow(guildId: string, seconds: number): number {
    const cutoff = Date.now() - seconds * 1000;
    const list = this.joins.get(guildId);
    if (!list) return 0;
    return list.filter((j) => j.timestamp >= cutoff).length;
  }

  public getRecentJoinMembers(guildId: string, seconds: number): InvolvedMemberInfo[] {
    const cutoff = Date.now() - seconds * 1000;
    const list = this.joins.get(guildId);
    if (!list) return [];
    return list.filter((j) => j.timestamp >= cutoff).map((j) => j.member);
  }

  public getLeavesInWindow(guildId: string, seconds: number): number {
    const cutoff = Date.now() - seconds * 1000;
    const list = this.leaves.get(guildId);
    if (!list) return 0;
    return list.filter((t) => t >= cutoff).length;
  }

  public getMessagesInWindow(guildId: string, seconds: number): number {
    const cutoff = Date.now() - seconds * 1000;
    const list = this.messages.get(guildId);
    if (!list) return 0;
    return list.filter((m) => m.timestamp >= cutoff).length;
  }

  public getUserMessageCountInWindow(guildId: string, userId: string, seconds: number): number {
    const cutoff = Date.now() - seconds * 1000;
    const list = this.messages.get(guildId);
    if (!list) return 0;
    return list.filter((m) => m.timestamp >= cutoff && m.userId === userId).length;
  }

  public getUserDuplicateMessageCount(
    guildId: string,
    userId: string,
    contentHash: string,
    seconds: number
  ): number {
    const cutoff = Date.now() - seconds * 1000;
    const list = this.messages.get(guildId);
    if (!list) return 0;
    return list.filter(
      (m) => m.timestamp >= cutoff && m.userId === userId && m.contentHash === contentHash
    ).length;
  }

  public getMentionsInWindow(guildId: string, seconds: number): number {
    const cutoff = Date.now() - seconds * 1000;
    const list = this.messages.get(guildId);
    if (!list) return 0;
    return list
      .filter((m) => m.timestamp >= cutoff)
      .reduce((sum, m) => sum + m.mentionsCount, 0);
  }

  public getUserMentionsInWindow(guildId: string, userId: string, seconds: number): number {
    const cutoff = Date.now() - seconds * 1000;
    const list = this.messages.get(guildId);
    if (!list) return 0;
    return list
      .filter((m) => m.timestamp >= cutoff && m.userId === userId)
      .reduce((sum, m) => sum + m.mentionsCount, 0);
  }

  public getAuditActionsCount(
    guildId: string,
    type: 'BAN' | 'KICK' | 'CHANNEL_CREATE' | 'CHANNEL_DELETE' | 'ROLE_CREATE' | 'ROLE_DELETE' | 'WEBHOOK_CREATE',
    seconds: number,
    userId?: string
  ): number {
    const cutoff = Date.now() - seconds * 1000;
    const list = this.auditActions.get(guildId);
    if (!list) return 0;
    return list.filter(
      (a) => a.timestamp >= cutoff && a.type === type && (!userId || a.userId === userId)
    ).length;
  }

  public getAuditActionsTotal(guildId: string, seconds: number): number {
    const cutoff = Date.now() - seconds * 1000;
    const list = this.auditActions.get(guildId);
    if (!list) return 0;
    return list.filter((a) => a.timestamp >= cutoff).length;
  }

  // --- ADAPTIVE BASELINE ---
  // Average joins per minute over past 60 minutes
  public getAverageJoinsPerMinute(guildId: string): number {
    const cutoff = Date.now() - 3600000; // 1 hour
    const list = this.joinBaselines.get(guildId);
    if (!list || list.length === 0) return 0.5; // default baseline: 0.5/min
    const active = list.filter((t) => t >= cutoff);
    const count = active.length;
    return Math.max(0.2, count / 60);
  }

  // --- PRUNE EXPIRED ---
  private pruneExpired(): void {
    const maxAgeMs = 5 * 60 * 1000; // Keep 5 minutes for analytics
    const baselineMaxAgeMs = 60 * 60 * 1000; // Keep 1 hour for baseline
    const now = Date.now();

    for (const [guildId, list] of this.joins.entries()) {
      const filtered = list.filter((j) => now - j.timestamp <= maxAgeMs);
      if (filtered.length === 0) this.joins.delete(guildId);
      else this.joins.set(guildId, filtered);
    }

    for (const [guildId, list] of this.messages.entries()) {
      const filtered = list.filter((m) => now - m.timestamp <= maxAgeMs);
      if (filtered.length === 0) this.messages.delete(guildId);
      else this.messages.set(guildId, filtered);
    }

    for (const [guildId, list] of this.leaves.entries()) {
      const filtered = list.filter((t) => now - t <= maxAgeMs);
      if (filtered.length === 0) this.leaves.delete(guildId);
      else this.leaves.set(guildId, filtered);
    }

    for (const [guildId, list] of this.auditActions.entries()) {
      const filtered = list.filter((a) => now - a.timestamp <= maxAgeMs);
      if (filtered.length === 0) this.auditActions.delete(guildId);
      else this.auditActions.set(guildId, filtered);
    }

    for (const [guildId, list] of this.joinBaselines.entries()) {
      const filtered = list.filter((t) => now - t <= baselineMaxAgeMs);
      if (filtered.length === 0) this.joinBaselines.delete(guildId);
      else this.joinBaselines.set(guildId, filtered);
    }
  }

  public clearGuild(guildId: string): void {
    this.joins.delete(guildId);
    this.messages.delete(guildId);
    this.leaves.delete(guildId);
    this.auditActions.delete(guildId);
    this.joinBaselines.delete(guildId);
  }
}

export const raidCache = new RaidCache();
