import crypto from 'crypto';

interface CachedUserMessage {
  timestamp: number;
  contentHash: string;
  rawLength: number;
  channelId: string;
}

interface GhostPingRecord {
  messageId: string;
  guildId: string;
  authorId: string;
  authorTag: string;
  channelId: string;
  mentionedUserIds: string[];
  mentionedEveryone: boolean;
  content: string;
  timestamp: number;
}

class AutoModCache {
  // Key: `${guildId}:${userId}` -> CachedUserMessage[]
  private userMessages = new Map<string, CachedUserMessage[]>();

  // Key: messageId -> GhostPingRecord
  private ghostPings = new Map<string, GhostPingRecord>();

  // Compiled Regex Cache: patternString -> RegExp
  private regexCache = new Map<string, RegExp>();

  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(() => this.prune(), 30000);
    this.cleanupTimer.unref();
  }

  // ==========================================
  // 1. MESSAGE HISTORY & SPAM TRACKING
  // ==========================================
  public recordMessage(guildId: string, userId: string, channelId: string, content: string): void {
    const key = `${guildId}:${userId}`;
    const now = Date.now();
    const hash = crypto.createHash('md5').update(content.trim().toLowerCase()).digest('hex');

    const list = this.userMessages.get(key) || [];
    list.push({
      timestamp: now,
      contentHash: hash,
      rawLength: content.length,
      channelId,
    });
    this.userMessages.set(key, list);
  }

  public getUserMessagesInWindow(guildId: string, userId: string, seconds: number): CachedUserMessage[] {
    const key = `${guildId}:${userId}`;
    const list = this.userMessages.get(key);
    if (!list) return [];
    const cutoff = Date.now() - seconds * 1000;
    return list.filter((m) => m.timestamp >= cutoff);
  }

  public getUserDuplicateCount(guildId: string, userId: string, content: string, seconds: number): number {
    const hash = crypto.createHash('md5').update(content.trim().toLowerCase()).digest('hex');
    const recent = this.getUserMessagesInWindow(guildId, userId, seconds);
    return recent.filter((m) => m.contentHash === hash).length;
  }

  // ==========================================
  // 2. GHOST PING RECORDING & CHECK
  // ==========================================
  public recordPotentialGhostPing(record: GhostPingRecord): void {
    this.ghostPings.set(record.messageId, record);
  }

  public checkAndConsumeGhostPing(messageId: string, timeWindowSeconds = 30): GhostPingRecord | null {
    const record = this.ghostPings.get(messageId);
    if (!record) return null;

    this.ghostPings.delete(messageId);
    const ageSeconds = (Date.now() - record.timestamp) / 1000;
    if (ageSeconds <= timeWindowSeconds) {
      return record;
    }
    return null;
  }

  // ==========================================
  // 3. SAFE REGEX EXECUTION (ReDoS Protection)
  // ==========================================
  public safeTestRegex(pattern: string, flags = 'i', text: string): boolean {
    // 1. Vérification basique contre les quantificateurs imbriqués catastrophiques
    const evilPattern = /(\+|\*)\s*(\+|\*)|\([^\)]*(\+|\*)[^\)]*\)\s*(\+|\*)/;
    if (evilPattern.test(pattern)) {
      return false; // Rejeter les regex dangereuses à l'avance
    }

    try {
      const cacheKey = `${pattern}___${flags}`;
      let re = this.regexCache.get(cacheKey);
      if (!re) {
        re = new RegExp(pattern, flags);
        if (this.regexCache.size > 200) this.regexCache.clear();
        this.regexCache.set(cacheKey, re);
      }

      // Limiter la longueur du texte testé à 2000 caractères
      const safeText = text.slice(0, 2000);
      const start = Date.now();
      const matched = re.test(safeText);
      const elapsed = Date.now() - start;

      if (elapsed > 25) {
        // Temps d'exécution trop long : invalider
        this.regexCache.delete(cacheKey);
      }

      return matched;
    } catch {
      return false;
    }
  }

  // ==========================================
  // 4. NETTOYAGE PERIODIQUE
  // ==========================================
  private prune(): void {
    const now = Date.now();
    const maxAgeMs = 5 * 60 * 1000; // 5 minutes

    for (const [key, list] of this.userMessages.entries()) {
      const filtered = list.filter((m) => now - m.timestamp <= maxAgeMs);
      if (filtered.length === 0) this.userMessages.delete(key);
      else this.userMessages.set(key, filtered);
    }

    for (const [msgId, record] of this.ghostPings.entries()) {
      if (now - record.timestamp > 60000) {
        this.ghostPings.delete(msgId);
      }
    }
  }

  public clearGuild(guildId: string): void {
    for (const key of this.userMessages.keys()) {
      if (key.startsWith(`${guildId}:`)) {
        this.userMessages.delete(key);
      }
    }
  }
}

export const autoModCache = new AutoModCache();
