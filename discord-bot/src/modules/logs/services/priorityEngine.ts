import { AuditEvent, AuditModule, AuditSeverity } from '../types/auditEvent.js';

interface BurstTrackerItem {
  timestamp: number;
  type: string;
  actorId: string;
}

export class PriorityEngine {
  // Historique glissant pour détection de rafales (burst) par guilde
  private static burstHistory = new Map<string, BurstTrackerItem[]>();

  public static calculateSeverity(params: {
    guildId: string;
    module: AuditModule;
    type: string;
    actorId?: string;
    targetId?: string;
    metadata?: Record<string, any>;
  }): { severity: AuditSeverity; burstElevated: boolean } {
    const { guildId, module, type, actorId, metadata } = params;

    // 1. Sévérité de base selon le type d'événement
    let baseSeverity: AuditSeverity = 'INFO';

    // Règle CRITICAL
    if (
      type.includes('RAID_DETECTED') ||
      type.includes('LOCKDOWN') ||
      type.includes('NUKE_') ||
      type.includes('MASS_BAN') ||
      type.includes('MASS_KICK') ||
      type.includes('ADMIN_ROLE_GRANTED') ||
      type.includes('BOT_COMPROMISE') ||
      metadata?.isCritical === true
    ) {
      baseSeverity = 'CRITICAL';
    }
    // Règle HIGH
    else if (
      type.includes('BAN') ||
      type.includes('KICK') ||
      type.includes('WEBHOOK_CREATE') ||
      type.includes('WEBHOOK_DELETE') ||
      type.includes('STAFF_PERMISSION_CHANGED') ||
      (type.includes('AUTOMOD_') && (metadata?.action === 'TIMEOUT' || metadata?.action === 'BAN' || metadata?.action === 'KICK')) ||
      (metadata?.durationSeconds && metadata.durationSeconds >= 86400)
    ) {
      baseSeverity = 'HIGH';
    }
    // Règle MEDIUM
    else if (
      type.includes('TIMEOUT') ||
      type.includes('WARN') ||
      type.includes('ROLE_CREATE') ||
      type.includes('ROLE_DELETE') ||
      type.includes('ROLE_UPDATE') ||
      type.includes('CHANNEL_CREATE') ||
      type.includes('CHANNEL_DELETE') ||
      type.includes('CHANNEL_UPDATE') ||
      type.includes('MESSAGE_DELETE_BULK') ||
      type.includes('AUTOMOD_')
    ) {
      baseSeverity = 'MEDIUM';
    }
    // Règle LOW
    else if (
      type.includes('MESSAGE_DELETE') ||
      type.includes('MESSAGE_EDIT') ||
      type.includes('MEMBER_UPDATE') ||
      type.includes('MEMBER_LEAVE') ||
      type.includes('ROLE_ADD') ||
      type.includes('ROLE_REMOVE') ||
      type.includes('VOICE_MUTE')
    ) {
      baseSeverity = 'LOW';
    }

    // 2. Détection de Burst / Rafale anormale (30 secondes)
    const now = Date.now();
    let history = this.burstHistory.get(guildId) || [];
    // Purger les entrées de plus de 30 secondes
    history = history.filter((item) => now - item.timestamp < 30000);

    // Enregistrer l'événement actuel
    history.push({ timestamp: now, type, actorId: actorId || 'unknown' });
    this.burstHistory.set(guildId, history);

    // Analyse des pics
    const sameActorEvents = history.filter((item) => item.actorId === actorId);
    const channelDeletes = history.filter((item) => item.type === 'CHANNEL_DELETE').length;
    const roleDeletes = history.filter((item) => item.type === 'ROLE_DELETE').length;
    const kickBanEvents = history.filter((item) => item.type.includes('KICK') || item.type.includes('BAN')).length;

    let burstElevated = false;

    // Conditions d'escalade automatique
    if (channelDeletes >= 3 || roleDeletes >= 3 || kickBanEvents >= 5 || sameActorEvents.length >= 15) {
      if (baseSeverity !== 'CRITICAL') {
        baseSeverity = 'CRITICAL';
        burstElevated = true;
      }
    } else if (sameActorEvents.length >= 8 && (baseSeverity === 'INFO' || baseSeverity === 'LOW')) {
      baseSeverity = 'MEDIUM';
      burstElevated = true;
    }

    return { severity: baseSeverity, burstElevated };
  }
}
