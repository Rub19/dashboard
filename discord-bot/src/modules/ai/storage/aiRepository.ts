import fs from 'node:fs';
import path from 'node:path';
import {
  AIAnalytics,
  AIConversation,
  AIFeedback,
  AIKnowledgeSource,
  AISettings,
} from '../types/index.js';
import { logger } from '../../../utils/logger.js';

export class AIRepository {
  private dataDir: string;
  private configsFile: string;
  private knowledgeFile: string;
  private conversationsFile: string;
  private analyticsFile: string;
  private feedbackFile: string;

  private configsCache: Map<string, AISettings> = new Map();
  private knowledgeCache: Map<string, AIKnowledgeSource[]> = new Map();
  private conversationsCache: Map<string, AIConversation[]> = new Map();
  private analyticsCache: Map<string, AIAnalytics> = new Map();
  private feedbackCache: Map<string, AIFeedback[]> = new Map();

  constructor() {
    this.dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.configsFile = path.join(this.dataDir, 'ai_configs.json');
    this.knowledgeFile = path.join(this.dataDir, 'ai_knowledge.json');
    this.conversationsFile = path.join(this.dataDir, 'ai_conversations.json');
    this.analyticsFile = path.join(this.dataDir, 'ai_analytics.json');
    this.feedbackFile = path.join(this.dataDir, 'ai_feedback.json');

    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.configsFile)) {
        const raw = fs.readFileSync(this.configsFile, 'utf-8');
        const list = JSON.parse(raw) as AISettings[];
        for (const c of list) this.configsCache.set(c.guildId, c);
      }

      if (fs.existsSync(this.knowledgeFile)) {
        const raw = fs.readFileSync(this.knowledgeFile, 'utf-8');
        const list = JSON.parse(raw) as AIKnowledgeSource[];
        for (const k of list) {
          const arr = this.knowledgeCache.get(k.guildId) || [];
          arr.push(k);
          this.knowledgeCache.set(k.guildId, arr);
        }
      }

      if (fs.existsSync(this.conversationsFile)) {
        const raw = fs.readFileSync(this.conversationsFile, 'utf-8');
        const list = JSON.parse(raw) as AIConversation[];
        for (const c of list) {
          const arr = this.conversationsCache.get(c.guildId) || [];
          arr.push(c);
          this.conversationsCache.set(c.guildId, arr);
        }
      }

      if (fs.existsSync(this.analyticsFile)) {
        const raw = fs.readFileSync(this.analyticsFile, 'utf-8');
        const obj = JSON.parse(raw) as Record<string, AIAnalytics>;
        for (const [gid, a] of Object.entries(obj)) this.analyticsCache.set(gid, a);
      }

      if (fs.existsSync(this.feedbackFile)) {
        const raw = fs.readFileSync(this.feedbackFile, 'utf-8');
        const list = JSON.parse(raw) as AIFeedback[];
        for (const f of list) {
          const arr = this.feedbackCache.get(f.guildId) || [];
          arr.push(f);
          this.feedbackCache.set(f.guildId, arr);
        }
      }
    } catch (err) {
      logger.error('[AIRepository] Erreur lors du chargement des fichiers :', err);
    }
  }

  private persistConfigs(): void {
    const list = Array.from(this.configsCache.values());
    fs.writeFileSync(this.configsFile, JSON.stringify(list, null, 2), 'utf-8');
  }

  private persistKnowledge(): void {
    const all: AIKnowledgeSource[] = [];
    for (const arr of this.knowledgeCache.values()) all.push(...arr);
    fs.writeFileSync(this.knowledgeFile, JSON.stringify(all, null, 2), 'utf-8');
  }

  private persistConversations(): void {
    const all: AIConversation[] = [];
    for (const arr of this.conversationsCache.values()) all.push(...arr);
    fs.writeFileSync(this.conversationsFile, JSON.stringify(all, null, 2), 'utf-8');
  }

  private persistAnalytics(): void {
    const obj: Record<string, AIAnalytics> = {};
    for (const [gid, a] of this.analyticsCache.entries()) obj[gid] = a;
    fs.writeFileSync(this.analyticsFile, JSON.stringify(obj, null, 2), 'utf-8');
  }

  private persistFeedback(): void {
    const all: AIFeedback[] = [];
    for (const arr of this.feedbackCache.values()) all.push(...arr);
    fs.writeFileSync(this.feedbackFile, JSON.stringify(all, null, 2), 'utf-8');
  }

  public getSettings(guildId: string): AISettings {
    const existing = this.configsCache.get(guildId);
    if (existing) return existing;

    const defaultSettings: AISettings = {
      guildId,
      enabled: true,
      defaultMode: 'MENTION_ONLY',
      personality: {
        name: 'ETHONE Assistant',
        description: 'Assistant intelligent officiel de la communauté.',
        tone: 'FRIENDLY',
        sliders: {
          friendly: 85,
          humor: 35,
          formality: 60,
          verbosity: 40,
          creativity: 60,
        },
        systemInstructions:
          "Tu es l'assistant IA officiel du serveur Discord. Tu réponds avec bienveillance, politesse et concision. Tu aides les membres sur les questions relatives au serveur, aux règles et aux tickets.",
        language: 'auto',
        replyInUserLanguage: true,
      },
      hallucinationMode: 'BALANCED',
      showSources: 'WHEN_USED',
      tools: {
        readKnowledge: true,
        readAllowedChannels: true,
        createThreads: true,
        sendMessages: true,
        ticketHandoff: true,
        summarizeChannels: true,
        moderationAssist: false,
      },
      memory: {
        enabled: true,
        contextLength: 20,
        retentionHours: 24,
        userCanForget: true,
      },
      allowedRoleIds: [],
      blockedRoleIds: [],
      allowedChannelIds: [],
      blockedChannelIds: [],
      channelRules: {},
      provider: 'BUILTIN',
      model: 'deepseek/deepseek-chat:free',
      dailyBudgetTokens: 100000,
      publishedVersion: 1,
      lastPublishedAt: new Date().toISOString(),
    };

    this.configsCache.set(guildId, defaultSettings);
    this.persistConfigs();
    return defaultSettings;
  }

  public saveSettings(guildId: string, patch: Partial<AISettings>): AISettings {
    const current = this.getSettings(guildId);
    const updated: AISettings = {
      ...current,
      ...patch,
      guildId,
      lastPublishedAt: new Date().toISOString(),
    };
    this.configsCache.set(guildId, updated);
    this.persistConfigs();
    return updated;
  }

  // --- KNOWLEDGE SOURCES ---
  public getKnowledgeSources(guildId: string): AIKnowledgeSource[] {
    return this.knowledgeCache.get(guildId) || [];
  }

  public getKnowledgeSourceById(guildId: string, id: string): AIKnowledgeSource | null {
    const list = this.getKnowledgeSources(guildId);
    return list.find((k) => k.id === id) || null;
  }

  public saveKnowledgeSource(source: AIKnowledgeSource): AIKnowledgeSource {
    const list = this.getKnowledgeSources(source.guildId);
    const idx = list.findIndex((k) => k.id === source.id);
    if (idx >= 0) {
      list[idx] = source;
    } else {
      list.push(source);
    }
    this.knowledgeCache.set(source.guildId, list);
    this.persistKnowledge();
    return source;
  }

  public deleteKnowledgeSource(guildId: string, id: string): boolean {
    const list = this.getKnowledgeSources(guildId);
    const filtered = list.filter((k) => k.id !== id);
    if (filtered.length !== list.length) {
      this.knowledgeCache.set(guildId, filtered);
      this.persistKnowledge();
      return true;
    }
    return false;
  }

  // --- CONVERSATIONS & MEMORY ---
  public getConversation(
    guildId: string,
    channelId: string,
    userId?: string
  ): AIConversation | null {
    const list = this.conversationsCache.get(guildId) || [];
    // Priorité conversation de thread ou salon récent
    return list.find((c) => c.channelId === channelId || (userId && c.userId === userId)) || null;
  }

  public saveConversation(conv: AIConversation): void {
    const list = this.conversationsCache.get(conv.guildId) || [];
    const idx = list.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      list[idx] = conv;
    } else {
      list.unshift(conv);
    }
    // Garder max 50 conversations actives
    this.conversationsCache.set(conv.guildId, list.slice(0, 50));
    this.persistConversations();
  }

  public forgetConversation(guildId: string, conversationId: string): boolean {
    const list = this.conversationsCache.get(guildId) || [];
    const filtered = list.filter((c) => c.id !== conversationId);
    this.conversationsCache.set(guildId, filtered);
    this.persistConversations();
    return true;
  }

  public forgetUserData(guildId: string, userId: string): number {
    const list = this.conversationsCache.get(guildId) || [];
    const filtered = list.filter((c) => c.userId !== userId);
    const removed = list.length - filtered.length;
    this.conversationsCache.set(guildId, filtered);
    this.persistConversations();
    return removed;
  }

  // --- FEEDBACK & ANALYTICS ---
  public saveFeedback(feedback: AIFeedback): void {
    const list = this.feedbackCache.get(feedback.guildId) || [];
    list.unshift(feedback);
    this.feedbackCache.set(feedback.guildId, list.slice(0, 100));
    this.persistFeedback();

    const analytics = this.getAnalytics(feedback.guildId);
    if (feedback.isHelpful) analytics.helpfulCount++;
    else analytics.unhelpfulCount++;
    this.saveAnalytics(feedback.guildId, analytics);
  }

  public getAnalytics(guildId: string): AIAnalytics {
    const existing = this.analyticsCache.get(guildId);
    if (existing) return existing;

    // Real guilds start at zero — the dashboard KPIs are only meaningful if
    // they reflect actual usage, not a seeded "42 requests" placeholder.
    const defaultAnalytics: AIAnalytics = {
      requestsToday: 0,
      activeConversations: 0,
      tokensConsumed: 0,
      helpfulCount: 0,
      unhelpfulCount: 0,
      handoffCount: 0,
      avgResponseTimeMs: 0,
    };
    this.analyticsCache.set(guildId, defaultAnalytics);
    this.persistAnalytics();
    return defaultAnalytics;
  }

  public saveAnalytics(guildId: string, a: AIAnalytics): void {
    this.analyticsCache.set(guildId, a);
  }
}

export const aiRepository = new AIRepository();
