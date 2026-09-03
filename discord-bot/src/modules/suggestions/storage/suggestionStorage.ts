import fs from 'fs';
import path from 'path';
import {
  Suggestion,
  SuggestionConfig,
  SuggestionConfigSchema,
  SuggestionOverview,
  SuggestionSchema,
  SuggestionStatus,
} from '../types/suggestion.js';
import { logger } from '../../../utils/logger.js';

class SuggestionStorage {
  private suggestionsFilePath = path.resolve(process.cwd(), 'data', 'suggestions.json');
  private configsFilePath = path.resolve(process.cwd(), 'data', 'suggestion_configs.json');

  private suggestions = new Map<string, Suggestion>(); // key: id (e.g. sugg_xxx)
  private configs = new Map<string, SuggestionConfig>(); // key: guildId

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory() {
    const dir = path.dirname(this.suggestionsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(this.suggestionsFilePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.suggestionsFilePath, 'utf-8'));
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const res = SuggestionSchema.safeParse(item);
            if (res.success) {
              this.suggestions.set(res.data.id, res.data);
            }
          }
        }
      }

      if (fs.existsSync(this.configsFilePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.configsFilePath, 'utf-8'));
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const res = SuggestionConfigSchema.safeParse(item);
            if (res.success) {
              this.configs.set(res.data.guildId, res.data);
            }
          }
        }
      }
    } catch (err) {
      logger.error('Erreur chargement suggestions.json / suggestion_configs.json :', err);
    }
  }

  private saveSuggestions() {
    try {
      const list = Array.from(this.suggestions.values());
      fs.writeFileSync(this.suggestionsFilePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde suggestions.json :', err);
    }
  }

  private saveConfigs() {
    try {
      const list = Array.from(this.configs.values());
      fs.writeFileSync(this.configsFilePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde suggestion_configs.json :', err);
    }
  }

  public getConfig(guildId: string): SuggestionConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = SuggestionConfigSchema.parse({ guildId });
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, update: Partial<SuggestionConfig>): SuggestionConfig {
    const current = this.getConfig(guildId);
    const valid = SuggestionConfigSchema.parse({ ...current, ...update });
    this.configs.set(guildId, valid);
    this.saveConfigs();
    return valid;
  }

  public getSuggestions(guildId: string): Suggestion[] {
    return Array.from(this.suggestions.values())
      .filter((s) => s.guildId === guildId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getById(id: string): Suggestion | undefined {
    return this.suggestions.get(id);
  }

  public create(
    data: Partial<Suggestion> & {
      guildId: string;
      channelId: string;
      authorId: string;
      authorTag: string;
      title: string;
      description: string;
    }
  ): Suggestion {
    const guildSuggestions = this.getSuggestions(data.guildId);
    const numericId = guildSuggestions.length + 1;
    const id = `sugg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const initialHistory = [
      {
        timestamp: new Date().toISOString(),
        actorTag: data.authorTag,
        action: 'Suggestion soumise',
      },
    ];

    const valid = SuggestionSchema.parse({
      ...data,
      id,
      numericId,
      history: initialHistory,
      votes: [],
      comments: [],
      followerIds: [data.authorId],
    });

    this.suggestions.set(id, valid);
    this.saveSuggestions();
    return valid;
  }

  public update(id: string, update: Partial<Suggestion>): Suggestion | null {
    const existing = this.suggestions.get(id);
    if (!existing) return null;

    const valid = SuggestionSchema.parse({
      ...existing,
      ...update,
      updatedAt: new Date().toISOString(),
    });

    this.suggestions.set(id, valid);
    this.saveSuggestions();
    return valid;
  }

  public delete(id: string): boolean {
    const deleted = this.suggestions.delete(id);
    if (deleted) this.saveSuggestions();
    return deleted;
  }

  public getOverview(guildId: string): SuggestionOverview {
    const list = this.getSuggestions(guildId);

    const statusDistribution: Record<SuggestionStatus, number> = {
      pending: 0,
      under_review: 0,
      planned: 0,
      accepted: 0,
      in_progress: 0,
      completed: 0,
      rejected: 0,
      duplicate: 0,
      on_hold: 0,
    };

    const categoryDistribution: Record<string, number> = {};
    let totalVotes = 0;
    let totalComments = 0;

    for (const s of list) {
      statusDistribution[s.status] = (statusDistribution[s.status] || 0) + 1;
      categoryDistribution[s.category] = (categoryDistribution[s.category] || 0) + 1;
      totalVotes += s.votes.length;
      totalComments += s.comments.length;
    }

    return {
      totalCount: list.length,
      pendingCount: statusDistribution.pending,
      underReviewCount: statusDistribution.under_review,
      acceptedCount: statusDistribution.accepted,
      completedCount: statusDistribution.completed,
      rejectedCount: statusDistribution.rejected,
      totalVotes,
      totalComments,
      statusDistribution,
      categoryDistribution,
    };
  }
}

export const suggestionStorage = new SuggestionStorage();
