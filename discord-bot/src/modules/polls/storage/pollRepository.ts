import fs from 'fs';
import path from 'path';
import {
  DiscordPoll,
  PollVote,
  PollOverviewKPIs,
  DiscordPollSchema,
  PollVoteSchema,
} from '../types/index.js';
import { logger } from '../../../utils/logger.js';

export class PollRepository {
  private pollsPath = path.resolve(process.cwd(), 'data', 'discord_polls.json');
  private votesPath = path.resolve(process.cwd(), 'data', 'discord_poll_votes.json');

  private polls: DiscordPoll[] = [];
  private votes: PollVote[] = [];

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.pollsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.pollsPath)) {
        const raw = fs.readFileSync(this.pollsPath, 'utf-8');
        this.polls = JSON.parse(raw);
      }
    } catch (err) {
      logger.error('Erreur chargement discord_polls.json :', err);
      this.polls = [];
    }

    try {
      if (fs.existsSync(this.votesPath)) {
        const raw = fs.readFileSync(this.votesPath, 'utf-8');
        this.votes = JSON.parse(raw);
      }
    } catch (err) {
      logger.error('Erreur chargement discord_poll_votes.json :', err);
      this.votes = [];
    }
  }

  private savePolls(): void {
    try {
      fs.writeFileSync(this.pollsPath, JSON.stringify(this.polls, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde discord_polls.json :', err);
    }
  }

  private saveVotes(): void {
    try {
      fs.writeFileSync(this.votesPath, JSON.stringify(this.votes, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde discord_poll_votes.json :', err);
    }
  }

  // --- POLLS CRUD ---
  public getPolls(guildId: string): DiscordPoll[] {
    return this.polls.filter((p) => p.guildId === guildId);
  }

  public getPollById(guildId: string, pollId: string): DiscordPoll | null {
    return this.polls.find((p) => p.guildId === guildId && p.id === pollId) || null;
  }

  public savePoll(poll: DiscordPoll): DiscordPoll {
    const validated = DiscordPollSchema.parse(poll);
    const index = this.polls.findIndex((p) => p.guildId === poll.guildId && p.id === poll.id);
    if (index >= 0) {
      this.polls[index] = { ...validated, updatedAt: new Date().toISOString() };
    } else {
      this.polls.push(validated);
    }
    this.savePolls();
    return index >= 0 ? this.polls[index] : validated;
  }

  public deletePoll(guildId: string, pollId: string): boolean {
    const initialLen = this.polls.length;
    this.polls = this.polls.filter((p) => !(p.guildId === guildId && p.id === pollId));
    if (this.polls.length !== initialLen) {
      this.savePolls();
      // Also delete associated votes
      this.votes = this.votes.filter((v) => !(v.guildId === guildId && v.pollId === pollId));
      this.saveVotes();
      return true;
    }
    return false;
  }

  public duplicatePoll(guildId: string, pollId: string, newTitle?: string): DiscordPoll | null {
    const original = this.getPollById(guildId, pollId);
    if (!original) return null;
    const newId = `poll-${Date.now().toString(36)}`;
    const duplicate: DiscordPoll = {
      ...original,
      id: newId,
      title: newTitle || `${original.title} (Copie)`,
      status: 'DRAFT',
      questions: original.questions.map((q) => ({
        ...q,
        options: q.options.map((o) => ({ ...o, votesCount: 0, points: 0 })),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startsAt: undefined,
      endsAt: undefined,
      endedAt: undefined,
    };
    this.polls.push(duplicate);
    this.savePolls();
    return duplicate;
  }

  // --- VOTES CRUD ---
  public getVotes(guildId: string, pollId?: string): PollVote[] {
    return this.votes.filter((v) => {
      if (v.guildId !== guildId) return false;
      if (pollId && v.pollId !== pollId) return false;
      return true;
    });
  }

  public getUserVote(guildId: string, pollId: string, userId: string, questionId: string): PollVote | null {
    return (
      this.votes.find(
        (v) => v.guildId === guildId && v.pollId === pollId && v.userId === userId && v.questionId === questionId
      ) || null
    );
  }

  public saveVote(vote: PollVote): PollVote {
    const validated = PollVoteSchema.parse(vote);
    const index = this.votes.findIndex(
      (v) =>
        v.guildId === vote.guildId &&
        v.pollId === vote.pollId &&
        v.userId === vote.userId &&
        v.questionId === vote.questionId
    );
    if (index >= 0) {
      this.votes[index] = validated;
    } else {
      this.votes.push(validated);
    }
    this.saveVotes();
    return index >= 0 ? this.votes[index] : validated;
  }

  public deleteUserVote(guildId: string, pollId: string, userId: string, questionId: string): boolean {
    const initialLen = this.votes.length;
    this.votes = this.votes.filter(
      (v) => !(v.guildId === guildId && v.pollId === pollId && v.userId === userId && v.questionId === questionId)
    );
    if (this.votes.length !== initialLen) {
      this.saveVotes();
      return true;
    }
    return false;
  }

  // --- KPIS ---
  public getKPIs(guildId: string): PollOverviewKPIs {
    const guildPolls = this.getPolls(guildId);
    const guildVotes = this.getVotes(guildId);

    const activePolls = guildPolls.filter((p) => p.status === 'ACTIVE').length;
    const completedPolls = guildPolls.filter((p) => p.status === 'ENDED').length;

    // Total votes summing across all options in guild polls
    let totalVotes = guildVotes.length;
    for (const poll of guildPolls) {
      for (const q of poll.questions) {
        for (const opt of q.options) {
          totalVotes += opt.votesCount;
        }
      }
    }

    const avgParticipation = guildPolls.length > 0 ? Math.round((totalVotes / guildPolls.length) * 10) / 10 : 0;
    const participationRate = 0;

    return {
      activePolls,
      totalVotes,
      participationRate,
      completedPolls,
      averageParticipation: avgParticipation,
    };
  }

  public getOverviewStats(guildId: string) {
    const kpis = this.getKPIs(guildId);
    const polls = this.getPolls(guildId);
    return {
      totalPolls: polls.length,
      ...kpis,
    };
  }
}

export const pollRepository = new PollRepository();
