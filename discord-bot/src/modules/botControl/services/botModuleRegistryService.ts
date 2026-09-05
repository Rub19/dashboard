import { BotModuleInfo } from '../types/index.js';

export class BotModuleRegistryService {
  private static instance: BotModuleRegistryService;
  private modules: Map<string, BotModuleInfo> = new Map();

  private constructor() {
    this.initializeModules();
  }

  public static getInstance(): BotModuleRegistryService {
    if (!BotModuleRegistryService.instance) {
      BotModuleRegistryService.instance = new BotModuleRegistryService();
    }
    return BotModuleRegistryService.instance;
  }

  private initializeModules() {
    const rawList: Omit<BotModuleInfo, 'uptimeSeconds' | 'errorCount24h' | 'memoryWeightMb'>[] = [
      {
        id: 'ai',
        name: 'AI Intelligence & Assistant',
        category: 'Intelligence',
        version: '2.3.0',
        enabled: true,
        status: 'healthy',
        description: 'Advanced contextual conversational AI, moderation analysis, and automatic smart ticket triage.',
        dependencies: ['logs', 'analytics'],
        commandCount: 4,
        eventCount: 2,
      },
      {
        id: 'analytics',
        name: 'Server Analytics & Telemetry',
        category: 'Observability',
        version: '2.1.0',
        enabled: true,
        status: 'healthy',
        description: 'High-speed event write-buffering, retention aggregations, voice tracking, and message metrics.',
        dependencies: ['database'],
        commandCount: 2,
        eventCount: 8,
      },
      {
        id: 'antiRaid',
        name: 'Anti-Raid Sentinel',
        category: 'Security',
        version: '2.4.0',
        enabled: true,
        status: 'healthy',
        description: 'Mass join detection, token raid mitigation, automated server lockdown, and panic triggers.',
        dependencies: ['moderation', 'logs'],
        commandCount: 5,
        eventCount: 3,
      },
      {
        id: 'automod',
        name: 'Auto-Moderation Engine',
        category: 'Security',
        version: '2.2.0',
        enabled: true,
        status: 'healthy',
        description: 'Rule-based spam, invite, link, bad word, and regex content inspection in real-time.',
        dependencies: ['moderation', 'logs'],
        commandCount: 3,
        eventCount: 4,
      },
      {
        id: 'backup',
        name: 'Server Snapshot & Backup',
        category: 'Management',
        version: '2.0.0',
        enabled: true,
        status: 'healthy',
        description: 'Encrypted guild snapshot creation, automated scheduled restores, and channel/role sync.',
        dependencies: ['storage', 'logs'],
        commandCount: 4,
        eventCount: 1,
      },
      {
        id: 'customCommands',
        name: 'Custom Commands Engine',
        category: 'Automation',
        version: '2.0.1',
        enabled: true,
        status: 'healthy',
        description: 'Dynamic server custom commands with variable substitution, embed builders, and cooldowns.',
        dependencies: ['database'],
        commandCount: 3,
        eventCount: 2,
      },
      {
        id: 'events',
        name: 'Community Events Scheduler',
        category: 'Engagement',
        version: '2.1.0',
        enabled: true,
        status: 'healthy',
        description: 'Discord scheduled events synchronization, RSVPs, automated reminders, and calendar webhooks.',
        dependencies: ['logs'],
        commandCount: 4,
        eventCount: 3,
      },
      {
        id: 'forms',
        name: 'Interactive Forms & Applications',
        category: 'Automation',
        version: '2.0.0',
        enabled: true,
        status: 'healthy',
        description: 'Custom modal application builder, review queues, acceptance/denial actions, and role rewards.',
        dependencies: ['roles', 'logs'],
        commandCount: 3,
        eventCount: 2,
      },
      {
        id: 'giveaways',
        name: 'Giveaways & Contests',
        category: 'Engagement',
        version: '2.0.0',
        enabled: true,
        status: 'healthy',
        description: 'Interactive button giveaways, role requirements, rerolls, and cryptographic winner selection.',
        dependencies: ['logs'],
        commandCount: 4,
        eventCount: 2,
      },
      {
        id: 'invites',
        name: 'Invite Tracker & Vanities',
        category: 'Engagement',
        version: '2.0.0',
        enabled: true,
        status: 'healthy',
        description: 'Real-time invite attribution, fake/leave detection, leaderboard tracking, and invite rewards.',
        dependencies: ['analytics', 'logs'],
        commandCount: 3,
        eventCount: 3,
      },
      {
        id: 'leveling',
        name: 'XP & Leveling System',
        category: 'Engagement',
        version: '2.2.0',
        enabled: true,
        status: 'healthy',
        description: 'Custom rank cards, voice XP multipliers, role rewards on level up, and leaderboard exports.',
        dependencies: ['analytics', 'roles'],
        commandCount: 4,
        eventCount: 3,
      },
      {
        id: 'logs',
        name: 'Enterprise Audit Logging',
        category: 'Observability',
        version: '2.3.0',
        enabled: true,
        status: 'healthy',
        description: 'Comprehensive Discord audit log subscriber, structured JSON storage, diffing, and multi-channel dispatch.',
        dependencies: ['database'],
        commandCount: 2,
        eventCount: 14,
      },
      {
        id: 'moderation',
        name: 'Moderation Suite',
        category: 'Security',
        version: '2.4.0',
        enabled: true,
        status: 'healthy',
        description: 'Warn, mute, kick, softban, ban, timeout, and mod-case management with DM notifications.',
        dependencies: ['logs'],
        commandCount: 12,
        eventCount: 4,
      },
      {
        id: 'music',
        name: 'High-Fidelity Music Engine',
        category: 'Entertainment',
        version: '2.0.0',
        enabled: true,
        status: 'healthy',
        description: 'Lavalink / voice stream player with queue management, bass boost filters, and DJ controls.',
        dependencies: ['voice'],
        commandCount: 10,
        eventCount: 2,
      },
      {
        id: 'polls',
        name: 'Live Polls & Voting',
        category: 'Engagement',
        version: '2.0.0',
        enabled: true,
        status: 'healthy',
        description: 'Single and multi-choice live interactive polls with anonymous voting and result charts.',
        dependencies: ['logs'],
        commandCount: 2,
        eventCount: 1,
      },
      {
        id: 'roles',
        name: 'Reaction & Self-Roles',
        category: 'Management',
        version: '2.1.0',
        enabled: true,
        status: 'healthy',
        description: 'Drop-down menus, button role assigners, sticky roles, and temporary role expiration.',
        dependencies: ['logs'],
        commandCount: 5,
        eventCount: 3,
      },
      {
        id: 'security',
        name: 'Security & 2FA Gatekeeper',
        category: 'Security',
        version: '2.3.0',
        enabled: true,
        status: 'healthy',
        description: 'Staff 2FA enforcement, suspicious link detection, token leak scanner, and bot quarantine.',
        dependencies: ['moderation', 'logs'],
        commandCount: 4,
        eventCount: 3,
      },
      {
        id: 'server',
        name: 'Server Management Core',
        category: 'Management',
        version: '2.4.0',
        enabled: true,
        status: 'healthy',
        description: 'Channel manager, role hierarchy manager, permissions debugger, emoji & sticker studio.',
        dependencies: ['logs'],
        commandCount: 8,
        eventCount: 6,
      },
      {
        id: 'suggestions',
        name: 'Community Suggestions Hub',
        category: 'Engagement',
        version: '2.0.0',
        enabled: true,
        status: 'healthy',
        description: 'Threaded community proposals with upvote/downvote buttons, approval pipeline, and status tags.',
        dependencies: ['logs'],
        commandCount: 3,
        eventCount: 2,
      },
      {
        id: 'tickets',
        name: 'Support Ticket System 2.0',
        category: 'Support',
        version: '2.3.0',
        enabled: true,
        status: 'healthy',
        description: 'Multi-category ticket modals, transcripts generation, staff claimed tickets, and satisfaction surveys.',
        dependencies: ['ai', 'logs'],
        commandCount: 6,
        eventCount: 4,
      },
      {
        id: 'voice',
        name: 'Personal Voice Rooms 2.0',
        category: 'Voice',
        version: '2.4.0',
        enabled: true,
        status: 'healthy',
        description: 'Click-to-create temporary dynamic voice channels with in-chat control panel buttons, lock, limit, and transfer.',
        dependencies: ['logs', 'analytics'],
        commandCount: 4,
        eventCount: 3,
      },
      {
        id: 'welcome',
        name: 'Welcome & Onboarding Suite',
        category: 'Engagement',
        version: '2.1.0',
        enabled: true,
        status: 'healthy',
        description: 'Dynamic canvas welcome cards, auto-roles on join, DM rules guide, and leave announcements.',
        dependencies: ['roles', 'logs'],
        commandCount: 3,
        eventCount: 2,
      },
    ];

    for (const item of rawList) {
      this.modules.set(item.id, {
        ...item,
        uptimeSeconds: 86400 * 3,
        errorCount24h: 0,
        memoryWeightMb: Math.round((Math.random() * 4 + 2) * 10) / 10,
      });
    }
  }

  public getAllModules(): BotModuleInfo[] {
    return Array.from(this.modules.values());
  }

  public getModule(id: string): BotModuleInfo | undefined {
    return this.modules.get(id);
  }

  public toggleModule(id: string, enabled: boolean): BotModuleInfo {
    const mod = this.modules.get(id);
    if (!mod) {
      throw new Error(`Module ${id} not found`);
    }
    mod.enabled = enabled;
    mod.status = enabled ? 'healthy' : 'disabled';
    this.modules.set(id, mod);
    return mod;
  }

  public recordModuleError(id: string, errorMsg: string) {
    const mod = this.modules.get(id);
    if (mod) {
      mod.errorCount24h++;
      mod.lastError = errorMsg;
      if (mod.errorCount24h > 5) {
        mod.status = 'degraded';
      }
      this.modules.set(id, mod);
    }
  }
}
