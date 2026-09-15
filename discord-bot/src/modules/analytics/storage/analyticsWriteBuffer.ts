import { HourlyBucket } from '../types/analytics.js';
import { analyticsStorage } from './analyticsStorage.js';

class AnalyticsWriteBuffer {
  private activeBuckets = new Map<string, HourlyBucket>();
  private isDirty = false;
  private flushTimer: NodeJS.Timeout;

  constructor() {
    // Flush périodique toutes les 30 secondes
    this.flushTimer = setInterval(() => this.flushNow(), 30000);
    this.flushTimer.unref();

    process.on('SIGINT', () => this.flushNow());
    process.on('SIGTERM', () => this.flushNow());
    process.on('exit', () => this.flushNow());
  }

  private getHourIso(date = new Date()): string {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    return d.toISOString();
  }

  private getOrCreateBucket(guildId: string): HourlyBucket {
    const hourIso = this.getHourIso();
    const key = `${guildId}:${hourIso}`;

    let bucket = this.activeBuckets.get(key);
    if (!bucket) {
      // Vérifier si présent dans analyticsStorage
      const fromStorage = analyticsStorage.getAllBuckets().get(key);
      if (fromStorage) {
        bucket = { ...fromStorage };
        // Rétrocompatibilité : anciens buckets persistés avant l'ajout de ces champs
        bucket.textMessagesCount = bucket.textMessagesCount ?? 0;
        bucket.mediaMessagesCount = bucket.mediaMessagesCount ?? 0;
        bucket.linkMessagesCount = bucket.linkMessagesCount ?? 0;
        bucket.authorMessageCounts = bucket.authorMessageCounts ?? {};
      } else {
        bucket = {
          guildId,
          hourIso,
          messagesCount: 0,
          commandsCount: 0,
          joinsCount: 0,
          leavesCount: 0,
          voiceMinutes: 0,
          moderationActionsCount: 0,
          securityIncidentsCount: 0,
          ticketsCreatedCount: 0,
          activeUserIds: [],
          channelMessageCounts: {},
          commandCounts: {},
          textMessagesCount: 0,
          mediaMessagesCount: 0,
          linkMessagesCount: 0,
          authorMessageCounts: {},
        };
      }
      this.activeBuckets.set(key, bucket);
    }

    return bucket;
  }

  public flushNow() {
    if (!this.isDirty) return;
    const list = Array.from(this.activeBuckets.values());
    analyticsStorage.saveData(list);
    this.isDirty = false;
  }

  public recordMessage(
    guildId: string,
    channelId: string,
    userId: string,
    messageType: 'text' | 'media' | 'link' = 'text'
  ): void {
    const b = this.getOrCreateBucket(guildId);
    b.messagesCount += 1;
    b.channelMessageCounts[channelId] = (b.channelMessageCounts[channelId] || 0) + 1;
    b.authorMessageCounts[userId] = (b.authorMessageCounts[userId] || 0) + 1;
    if (messageType === 'media') b.mediaMessagesCount += 1;
    else if (messageType === 'link') b.linkMessagesCount += 1;
    else b.textMessagesCount += 1;
    if (!b.activeUserIds.includes(userId)) {
      b.activeUserIds.push(userId);
    }
    this.isDirty = true;
  }

  public recordCommand(guildId: string, commandName: string, userId: string): void {
    const b = this.getOrCreateBucket(guildId);
    b.commandsCount += 1;
    b.commandCounts[commandName] = (b.commandCounts[commandName] || 0) + 1;
    if (!b.activeUserIds.includes(userId)) {
      b.activeUserIds.push(userId);
    }
    this.isDirty = true;
  }

  public recordJoin(guildId: string, userId: string): void {
    const b = this.getOrCreateBucket(guildId);
    b.joinsCount += 1;
    if (!b.activeUserIds.includes(userId)) {
      b.activeUserIds.push(userId);
    }
    this.isDirty = true;
  }

  public recordLeave(guildId: string, userId: string): void {
    const b = this.getOrCreateBucket(guildId);
    b.leavesCount += 1;
    this.isDirty = true;
  }

  public recordVoiceMinutes(guildId: string, minutes: number, userId: string): void {
    const b = this.getOrCreateBucket(guildId);
    b.voiceMinutes += minutes;
    if (!b.activeUserIds.includes(userId)) {
      b.activeUserIds.push(userId);
    }
    this.isDirty = true;
  }

  public recordModerationAction(guildId: string): void {
    const b = this.getOrCreateBucket(guildId);
    b.moderationActionsCount += 1;
    this.isDirty = true;
  }

  public recordSecurityIncident(guildId: string): void {
    const b = this.getOrCreateBucket(guildId);
    b.securityIncidentsCount += 1;
    this.isDirty = true;
  }

  public recordTicketCreated(guildId: string): void {
    const b = this.getOrCreateBucket(guildId);
    b.ticketsCreatedCount += 1;
    this.isDirty = true;
  }

  public getBuckets(guildId: string, sinceIso?: string): HourlyBucket[] {
    // S'assurer que le buffer est synchronisé pour la requête
    this.flushNow();
    return analyticsStorage.getBuckets(guildId, sinceIso);
  }
}

export const analyticsWriteBuffer = new AnalyticsWriteBuffer();
